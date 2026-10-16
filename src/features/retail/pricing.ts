import type { PriceList, PriceOverride, Product } from './api';

export function productsForList(products: Product[], list: PriceList | undefined, overrides: PriceOverride[]): Product[] {
  if (!list) return products;
  const fixed = new Map(overrides.filter(o => o.list_id === list.id).map(o => [o.product_id, Number(o.price)]));
  return products.map(p => ({ ...p, price: fixed.get(p.id) ?? Math.max(0.01, Math.round(Math.round(p.price * 100) * (10000 + Math.round(Number(list.adjustment) * 100)) / 10000) / 100) }));
}

export function salesCsv(rows: import('../../types/kiosco').KioscoSale[]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [
    ['ID', 'Ticket', 'Fecha', 'Sucursal', 'Caja', 'Lista', 'Registro', 'Estado de comprobante', 'Referencia externa', 'Medio', 'Total', 'Desglose de pagos'],
    ...rows.map(s => [s.id, s.ticketNumber, s.createdAt, s.branchName, s.registerName, s.priceListName, s.ledgerName, s.invoiceReference ? 'Con comprobante asociado' : 'Sin comprobante asociado', s.invoiceReference, s.paymentMethod, s.total.toFixed(2).replace('.', ','), (s.payments || [{ method: s.paymentMethod, amount: s.total }]).map(p => `${p.method}: ${p.amount.toFixed(2).replace('.', ',')}`).join(' / ')]),
  ].map(row => row.map(cell).join(';')).join('\r\n');
}
