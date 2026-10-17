import type { KioscoSale, KioscoProduct, MarginGroup } from '../../types/kiosco';

export interface MarginTotals {
  revenue: number; cost: number; profit: number | null; marginPercent: number | null;
  tickets: number; averageTicket: number; units: number; missingCosts: number;
}
export interface MarginSummary {
  standard: MarginTotals; lowMargin: MarginTotals; totalRevenue: number; totalTickets: number;
  lowMarginContributionPercent: number | null; legacyItems: number;
}
type Item = KioscoSale['items'][number];
const cents = (value: number) => Math.round(value * 100);
const normalize = (name: string) => name.trim().toLowerCase();

export function marginSales(sales: KioscoSale[], products: KioscoProduct[], group: MarginGroup): KioscoSale[] {
  const byId = new Map(products.map(p => [p.id, p]));
  const byName = new Map(products.map(p => [normalize(p.name), p]));
  return sales.flatMap(sale => {
    let raw: Item[] = Array.isArray(sale.items) ? sale.items : [];
    if (typeof sale.items === 'string') { try { const parsed = JSON.parse(sale.items); if (Array.isArray(parsed)) raw = parsed; } catch { /* Legacy ticket with no line details. */ } }
    if (!raw.length && sale.total > 0) raw = [{ name: 'Venta sin detalle histórico', qty: 1, unitPrice: sale.total, subtotal: sale.total }];
    const items = raw.flatMap(item => {
      const product = item.productId ? byId.get(item.productId) : byName.get(normalize(item.name || ''));
      const classification = item.marginGroup ?? product?.margin_group ?? 'standard';
      if (classification !== group) return [];
      const unitCost = item.unitCost !== undefined ? item.unitCost : product?.cost && product.cost > 0 ? product.cost : null;
      return [{ ...item, marginGroup: classification, unitCost, subtotal: cents(Number(item.subtotal ?? item.qty * item.unitPrice) || 0) / 100 }];
    });
    if (!items.length) return [];
    const total = items.reduce((sum, i) => sum + cents(i.subtotal), 0) / 100;
    // Allocation is analytical only: a payment does not identify which product it paid for.
    return [{ ...sale, items, total, payments: sale.payments?.map(p => ({ ...p, amount: sale.total > 0 ? p.amount * total / sale.total : 0 })) }];
  });
}

function totals(sales: KioscoSale[]): MarginTotals {
  let revenue = 0, cost = 0, units = 0, missingCosts = 0;
  for (const sale of sales) {
    revenue += cents(sale.total);
    for (const item of sale.items) {
      units += Number(item.qty) || 0;
      if (item.unitCost == null || !Number.isFinite(item.unitCost)) missingCosts++;
      else cost += cents(item.unitCost * item.qty);
    }
  }
  const profit = missingCosts ? null : (revenue - cost) / 100;
  return { revenue: revenue / 100, cost: cost / 100, profit, marginPercent: profit === null ? null : revenue > 0 ? profit / (revenue / 100) * 100 : 0, tickets: sales.length, averageTicket: sales.length ? revenue / 100 / sales.length : 0, units, missingCosts };
}

export function summarizeMargins(sales: KioscoSale[], products: KioscoProduct[]): MarginSummary {
  const standard = totals(marginSales(sales, products, 'standard'));
  const lowMargin = totals(marginSales(sales, products, 'low_margin'));
  const profit = standard.profit !== null && lowMargin.profit !== null ? standard.profit + lowMargin.profit : null;
  return { standard, lowMargin, totalRevenue: (cents(standard.revenue) + cents(lowMargin.revenue)) / 100, totalTickets: sales.length,
    lowMarginContributionPercent: profit !== null && profit > 0 ? lowMargin.profit! / profit * 100 : null,
    legacyItems: sales.reduce((count, s) => count + (Array.isArray(s.items) ? s.items.filter(i => i.marginGroup == null).length : 1), 0) };
}

export function marginPrompt(summary: MarginSummary): string {
  return `Analizá el margen real del negocio excluyendo del cálculo principal los rubros de bajo margen (cigarrillos, cargas y similares) que pueden inflar la facturación. No supongas un porcentaje fijo ni costos faltantes.
Separación calculada por renglón, independiente del registro de ventas: ${JSON.stringify(summary)}.
La facturación, ticket promedio, ranking y margen principales son del grupo standard. Un ticket mixto cuenta una vez en cada grupo; no sumes sus contadores como si fueran tickets distintos. La contribución del bajo margen es su ganancia bruta dividida por la ganancia bruta total, no su margen sobre ventas.
Si profit o marginPercent son null, faltan costos: informá que no se puede determinar la rentabilidad, sin asumir costo cero. El margen observado del rubro bajo margen es ${summary.lowMargin.marginPercent === null ? 'no disponible por costos faltantes' : `${summary.lowMargin.marginPercent.toFixed(2)}%`}. Ganancia bruta no es ganancia neta.`;
}
