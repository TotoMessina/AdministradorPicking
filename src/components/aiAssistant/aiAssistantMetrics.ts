import type { Product } from '../../features/retail/api';
import type { KioscoSale } from '../../types/kiosco';
import { marginSales, summarizeMargins, type MarginSummary as MarginSummaryData } from '../../features/retail/marginAnalytics';
import type { StockPrediction } from '../../services/stockPredictionService';

// Métricas que el asistente le pasa a la IA como contexto.
export function compactStockPredictions(predictions: StockPrediction[], products: Product[]) {
  type Entry = Record<string, string | number | boolean | null>;
  const costs = new Map(products.map(p => [p.id, p.cost]));
  const capital = (p: StockPrediction) => {
    const cost = costs.get(p.productId);
    return typeof cost === 'number' && Number.isFinite(cost) && cost >= 0
      ? Math.round(p.currentStock * cost * 100) / 100 : null;
  };
  const short = (value: string) => [...value].length > 48 ? [...value].slice(0, 47).join('') + '…' : value;
  const base = (p: StockPrediction): Entry => ({ id: p.productId, producto: short(p.productName) });
  const candidates = {
    criticos: predictions.filter(p => p.priority === 'critical' || p.priority === 'soon').slice(0, 10).map(p => ({
      ...base(p), proveedor: short(p.supplier || 'Sin proveedor'), quiebre: p.stockoutDate || null,
      unidades: p.suggestedOrderQty, ...(p.suggestedOrderPacks !== null ? { bultos: p.suggestedOrderPacks } : {}),
    } as Entry)),
    sobrestock: predictions.filter(p => p.priority === 'overstocked')
      .sort((a, b) => (capital(b) ?? -1) - (capital(a) ?? -1)).slice(0, 5)
      .map(p => ({ ...base(p), stock: p.currentStock, capital: capital(p), ...(p.dailyAvgSales === 0 ? { sinVentasObservadas: true } : {}) } as Entry)),
    tendenciasAlAlza: predictions.filter(p => p.trend === 'accelerating')
      .sort((a, b) => b.dailyAvgSales - a.dailyAvgSales).slice(0, 5)
      .map(p => ({ ...base(p), diarias: Math.round(p.dailyAvgSales * 100) / 100 } as Entry)),
  };
  const summary = { criticos: [] as Entry[], sobrestock: [] as Entry[], tendenciasAlAlza: [] as Entry[] };
  const keys = ['criticos', 'sobrestock', 'tendenciasAlAlza'] as const;
  const encoder = new TextEncoder();
  // Compact fields and a byte budget keep this addition small without a tokenizer dependency.
  // Round-robin reserves room for each nonempty category, prioritizing shortages on ties.
  for (let index = 0; index < 10; index++) {
    for (const key of keys) {
      const row = candidates[key][index];
      if (!row) continue;
      summary[key].push(row);
      if (encoder.encode(JSON.stringify(summary)).length > 1200) summary[key].pop();
    }
  }
  return summary;
}

export function extractDate(item: {
  date?: string;
  timestamp?: string;
  created_at?: string;
  createdAt?: string;
  opened_at?: string;
}): Date | null {
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  const anyItem = item as { created_at?: string };
  if (anyItem.created_at) {
    const d = new Date(anyItem.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.opened_at) {
    const d = new Date(item.opened_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.date) {
    if (item.date.includes("-")) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) return d;
    }
    if (item.date.includes("/")) {
      const parts = item.date.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.timestamp && (item.timestamp.includes("-") || item.timestamp.includes("T"))) {
    const d = new Date(item.timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function isSaleToday(s: KioscoSale, now: Date): boolean {
  const d = extractDate(s);
  if (d) {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  const todayIso = now.toISOString().split("T")[0];
  const todayAr = now.toLocaleDateString("es-AR");
  if (s.date === todayIso || s.date === todayAr) return true;
  return false;
}

interface PeriodMetrics {
  separation: MarginSummaryData;
  tickets: number;
  facturado: number;
  cmv: number;
  gananciaBruta: number | null;
  margenPct: number | null;
  unidadesVendidas: number;
  ticketPromedio: number;
  diasActivos: number;
  diasConVenta: {
    fechaIso: string;
    fecha: string;
    tickets: number;
    facturado: number;
    cmv: number;
    ganancia: number | null;
    margenPct: number | null;
  }[];
  topProductos: {
    nombre: string;
    unidades: number;
    facturado: number;
    ganancia: number | null;
    margenPct: number | null;
  }[];
  metodosPago: {
    metodo: string;
    tickets: number;
    total: number;
    pct: number;
  }[];
}

export function computeMetrics(salesList: KioscoSale[], products: Product[]): PeriodMetrics {
  const separation = summarizeMargins(salesList, products);
  salesList = marginSales(salesList, products, 'standard');
  let revenue = 0;
  let cmv = 0;
  let units = 0;
  const paymentMethods: Record<string, { count: number; amount: number }> = {};
  const productsAgg: Record<string, { name: string; qty: number; revenue: number; cost: number; missingCosts: number }> = {};
  const daysMap: Record<string, { date: string; dateObj: Date; tickets: number; revenue: number; cmv: number; profit: number; missingCosts: number }> = {};

  for (const s of salesList) {
    const total = Number(s.total) || 0;
    revenue += total;

    const pm = s.paymentMethod || "Efectivo";
    if (!paymentMethods[pm]) paymentMethods[pm] = { count: 0, amount: 0 };
    paymentMethods[pm].count += 1;
    paymentMethods[pm].amount += total;

    let saleCmv = 0;
    let missingCosts = 0;
    const rawItems = s.items;
    const items = Array.isArray(rawItems)
      ? rawItems
      : typeof rawItems === "string"
      ? (() => {
          try {
            return JSON.parse(rawItems);
          } catch {
            return [];
          }
        })()
      : [];

    for (const item of items) {
      const qty = Number(item.qty) || 0;
      units += qty;
      const unitCost = item.unitCost ?? 0;
      if (item.unitCost == null) missingCosts++;
      const itemCost = unitCost * qty;
      const itemSubtotal = Number(item.subtotal) || (qty * (Number(item.unitPrice) || 0));
      saleCmv += itemCost;

      const name = item.name ? item.name.trim() : "Sin nombre";
      if (!productsAgg[name]) productsAgg[name] = { name, qty: 0, revenue: 0, cost: 0, missingCosts: 0 };
      productsAgg[name].qty += qty;
      productsAgg[name].revenue += itemSubtotal;
      productsAgg[name].cost += itemCost;
      if (item.unitCost == null) productsAgg[name].missingCosts++;
    }
    cmv += saleCmv;

    const d = extractDate(s);
    const dayKey = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : (s.date || "Fecha no especificada");
    const displayDate = d
      ? d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })
      : (s.date || "Fecha no especificada");

    if (!daysMap[dayKey]) {
      daysMap[dayKey] = {
        date: displayDate,
        dateObj: d || new Date(0),
        tickets: 0,
        revenue: 0,
        cmv: 0,
        profit: 0,
        missingCosts: 0,
      };
    }
    daysMap[dayKey].tickets += 1;
    daysMap[dayKey].revenue += total;
    daysMap[dayKey].cmv += saleCmv;
    daysMap[dayKey].profit += (total - saleCmv);
    daysMap[dayKey].missingCosts += missingCosts;
  }

  const profit = separation.standard.profit;
  const marginPct = separation.standard.marginPercent;
  const avgTicket = salesList.length > 0 ? revenue / salesList.length : 0;

  const topProductos = Object.values(productsAgg)
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 8)
    .map((p) => ({
      nombre: p.name,
      unidades: p.qty,
      facturado: p.revenue,
      ganancia: p.missingCosts ? null : p.revenue - p.cost,
      margenPct: p.missingCosts ? null : p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0,
    }));

  const sortedDays = Object.entries(daysMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, data]) => ({
      fechaIso: key,
      fecha: data.date,
      tickets: data.tickets,
      facturado: data.revenue,
      cmv: data.cmv,
      ganancia: data.missingCosts ? null : data.profit,
      margenPct: data.missingCosts ? null : data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0,
    }));

  return {
    separation,
    tickets: salesList.length,
    facturado: revenue,
    cmv,
    gananciaBruta: profit,
    margenPct: marginPct === null ? null : Math.round(marginPct * 10) / 10,
    unidadesVendidas: units,
    ticketPromedio: Math.round(avgTicket),
    diasActivos: sortedDays.length,
    diasConVenta: sortedDays,
    topProductos,
    metodosPago: Object.entries(paymentMethods).map(([m, val]) => ({
      metodo: m,
      tickets: val.count,
      total: val.amount,
      pct: revenue > 0 ? Math.round((val.amount / revenue) * 100) : 0,
    })),
  };
}
