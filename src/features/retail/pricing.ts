import type { PriceList, PriceOverride, Product } from './api';

export function adjustedPrice(price: number, adjustment: number): number {
  // Integer cents/basis points mirror PostgreSQL numeric rounding, including large prices.
  const cents = BigInt(Math.round(price * 100));
  const factor = 10000n + BigInt(Math.round(adjustment * 100));
  return Math.max(0.01, Number((cents * factor + 5000n) / 10000n) / 100);
}

function productPriceResolver(lists: PriceList[], overrides: PriceOverride[]) {
  const byId = new Map(lists.map(list => [list.id, list]));
  const fixedPrices = new Map(overrides.map(o => [`${o.list_id}:${o.product_id}`, Number(o.price)]));
  return (product: Product, list: PriceList | undefined): number => {
  const resolve = (current: PriceList | undefined, visited: string[]): number => {
    if (product.sale_markup != null && !(product.cost > 0)) throw new Error('Falta el costo para calcular el precio principal.');
    if (!current) return Number(product.price);
    if (visited.includes(current.id) || visited.length >= 12) throw new Error('Revisá el origen de la lista: hay un ciclo o demasiados niveles.');
    const fixed = fixedPrices.get(`${current.id}:${product.id}`);
    if (fixed !== undefined) return fixed;
    let base: number;
    if (current.base_kind === 'cost') {
      if (!(product.cost > 0)) throw new Error('Falta cargar el costo para calcular esta lista.');
      base = Number(product.cost);
    } else if (current.base_kind === 'list') {
      const parent = byId.get(current.parent_id || '');
      if (!parent || parent.store_id !== current.store_id) throw new Error('El origen de esta lista no está disponible. Actualizá los datos con conexión.');
      if (parent.branch_id && parent.branch_id !== current.branch_id) throw new Error('El origen pertenece a otra sucursal. Revisá la lista.');
      base = resolve(parent, [...visited, current.id]);
    } else base = Number(product.price);
    let price = adjustedPrice(base, Number(current.adjustment));
    for (const scope of ['category', 'brand', 'product'] as const) {
      const target = scope === 'category' ? product.categoryId : scope === 'product' ? product.id : (product.brand || '').trim().toLowerCase();
      const rule = (current.pricing_rules || []).find(r => r.scope === scope && r.target === target);
      if (rule) price = adjustedPrice(price, Number(rule.adjustment));
    }
    if (!Number.isFinite(price) || price <= 0 || price >= 1e12) throw new Error('El precio calculado supera el límite permitido. Revisá los porcentajes.');
    return price;
  };
  return resolve(list, []);
  };
}

export function priceForProduct(product: Product, list: PriceList | undefined, overrides: PriceOverride[], lists: PriceList[] = []): number {
  return productPriceResolver(lists, overrides)(product, list);
}

export function productsForList(products: Product[], list: PriceList | undefined, overrides: PriceOverride[], lists: PriceList[] = []): Product[] {
  if (!list) return products;
  const resolve = productPriceResolver(lists, overrides);
  return products.map(product => {
    if (product.sellable === false) return product;
    try { return { ...product, price: resolve(product, list), pricingError: undefined }; }
    catch (error) { return { ...product, price: 0, pricingError: error instanceof Error ? error.message : 'Revisá la lista de precios.' }; }
  });
}

export function salesCsv(rows: import('../../types/kiosco').KioscoSale[]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
  };
  const fiscalStatusLabel = (status?: string) => {
    switch (status) {
      case 'authorized': return 'Autorizado (CAE)';
      case 'pending': return 'Pendiente CAE';
      case 'retry': return 'Reintentando';
      case 'error': return 'Error ARCA';
      default: return 'No fiscal';
    }
  };
  const cbteTipoLabel = (tipo?: number | null) => {
    switch (tipo) {
      case 1: return 'Factura A';
      case 6: return 'Factura B';
      case 11: return 'Factura C';
      default: return tipo ? String(tipo) : '';
    }
  };
  return '\uFEFF' + [
    ['ID', 'Ticket', 'Fecha', 'Sucursal', 'Caja', 'Lista', 'Registro', 'Estado fiscal ARCA', 'Tipo comprobante', 'Nro comprobante', 'CAE', 'Vto CAE', 'Estado de comprobante', 'Referencia externa', 'Medio', 'Total', 'Desglose de pagos'],
    ...rows.map(s => [
      s.id,
      s.ticketNumber,
      s.createdAt,
      s.branchName,
      s.registerName,
      s.priceListName,
      s.ledgerName,
      fiscalStatusLabel(s.billingStatus),
      cbteTipoLabel(s.cbteTipo),
      s.cbteNro ?? '',
      s.cae ?? '',
      s.caeVto ?? '',
      s.invoiceReference ? 'Con comprobante asociado' : 'Sin comprobante asociado',
      s.invoiceReference ?? '',
      s.paymentMethod,
      s.total.toFixed(2).replace('.', ','),
      (s.payments || [{ method: s.paymentMethod, amount: s.total }]).map(p => `${p.method}: ${p.amount.toFixed(2).replace('.', ',')}`).join(' / '),
    ]),
  ].map(row => row.map(cell).join(';')).join('\r\n');
}
