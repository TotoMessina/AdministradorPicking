import { supabase } from '../../lib/supabase';

export type Method = 'QR' | 'Debito' | 'Credito' | 'Transferencia';
export const methods: Method[] = ['QR', 'Debito', 'Credito', 'Transferencia'];
export const methodLabels: Record<Method, string> = { QR: 'QR / billeteras', Debito: 'Débito', Credito: 'Crédito', Transferencia: 'Transferencias' };
export interface MethodTotals { method: Method; total: number; sales: number; salesCount: number; refunds: number; refundsCount: number; collections: number; collectionsCount: number }
export interface DetailRow { kind: 'sale' | 'refund' | 'collection'; id: string; at: string; amount: number; total: number | null; ticket_number: number | null; mixed: boolean; return_status: string | null; register: string | null; actor: string | null; detail: string | null }

/** Retiros y movimientos de plata con su origen (202611040007). */
export interface MoneyRow {
  origin: 'shift' | 'fund'; id: string; at: string; kind: 'withdrawal' | 'income' | 'transfer'; amount: number;
  source: string | null; destination: string | null; source_kind: 'cash' | 'fund' | 'account'; note: string;
  category: string | null; supplier_name: string | null; actor: string | null; status: string | null;
}
export interface MoneyReportAccount { id: string; name: string; kind: 'bank' | 'wallet' | 'other'; active: boolean; methods: Method[]; collected: number; balance: number }
export interface MoneyReport { accounts: MoneyReportAccount[]; rows: MoneyRow[] }

export async function fetchMoneyReport(storeId: string, from: string, to: string): Promise<MoneyReport> {
  const { data, error } = await supabase.rpc('retail_money_movements_report', { p_store: storeId, p_from: from, p_to: to });
  if (error) throw error;
  const value = data as MoneyReport;
  return { accounts: value.accounts.map(row => ({ ...row, collected: Number(row.collected), balance: Number(row.balance) })), rows: value.rows.map(row => ({ ...row, amount: Number(row.amount) })) };
}
export const moneyKindLabels = (row: Pick<MoneyRow, 'origin' | 'kind' | 'category' | 'status'>) => row.origin === 'shift'
  ? (row.kind === 'withdrawal' ? (row.category === 'supplier_payment' ? 'Pago a proveedor (caja)' : 'Retiro de caja') : 'Ingreso a caja')
  : row.kind === 'withdrawal' ? 'Retiro o salida' : row.kind === 'income' ? 'Ingreso'
  : row.status === 'in_transit' ? 'Envío en camino' : row.status === 'returned' ? 'Envío devuelto' : 'Envío';

const zone = 'America/Argentina/Buenos_Aires';
const EXPORT_LIMIT = 20000;
const moneyFormat = '"$" #,##0.00;[Red]-"$" #,##0.00';
export const kindLabel = (row: Pick<DetailRow, 'kind' | 'return_status'>) => row.kind === 'sale'
  ? (row.return_status === 'voided' ? 'Venta anulada' : row.return_status === 'partial' ? 'Venta con devolución' : 'Venta')
  : row.kind === 'refund' ? (row.return_status === 'void' ? 'Anulación' : 'Devolución') : 'Cobro de fiado';
const dayKey = (at: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
const localDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
/** Fecha y hora de Argentina como valor de Excel (sin zona), para que el contador vea la hora local. */
const localDateTime = (at: string) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(at)).map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)));
};

async function excel() {
  const module = await import('exceljs');
  return ((module as unknown as { default?: typeof module }).default ?? module);
}

/**
 * Excel para el contador: Resumen por medio, totales Por día y todos los Movimientos del período.
 * Mismas reglas que la pantalla: ventas por medio (parte de cada medio en las mixtas), devoluciones y cobros de fiado.
 */
export async function downloadAccountantReport(storeId: string, from: string, to: string) {
  // Sin la actualización 202611040007 el Excel sale igual, sin las hojas de cuentas y retiros.
  const moneyReport = fetchMoneyReport(storeId, from, to).catch(() => null);
  const [ExcelJS, ...details] = await Promise.all([excel(), ...methods.map(async method => {
    const { data, error } = await supabase.rpc('retail_reconciliation_detail', { p_store: storeId, p_from: from, p_to: to, p_method: method, p_limit: EXPORT_LIMIT });
    if (error) throw error;
    const value = data as Record<string, unknown> & { rows: DetailRow[] };
    return { method, count: Number(value.count), total: Number(value.total), sales: Number(value.sales), salesCount: Number(value.sales_count), refunds: Number(value.refunds),
      refundsCount: Number(value.refunds_count), collections: Number(value.collections), collectionsCount: Number(value.collections_count),
      rows: value.rows.map(row => ({ ...row, amount: Number(row.amount), total: row.total === null ? null : Number(row.total) })) };
  })]);
  const book = new ExcelJS.Workbook();
  const period = `${localDate(from).toLocaleDateString('es-AR', { timeZone: 'UTC' })} al ${localDate(to).toLocaleDateString('es-AR', { timeZone: 'UTC' })}`;

  const summary = book.addWorksheet('Resumen');
  summary.addRow(['Cobros por QR, tarjetas y transferencias']).font = { bold: true, size: 14 };
  summary.addRow([`Período: ${period}`]);
  summary.addRow([`Generado: ${new Date().toLocaleString('es-AR', { timeZone: zone })}`]);
  summary.addRow([]);
  const header = summary.addRow(['Medio', 'Ventas (cant.)', 'Ventas', 'Devoluciones (cant.)', 'Devoluciones', 'Cobros de fiado (cant.)', 'Cobros de fiado', 'Total cobrado']);
  header.font = { bold: true };
  for (const row of details) summary.addRow([methodLabels[row.method], row.salesCount, row.sales, row.refundsCount, row.refunds, row.collectionsCount, row.collections, row.total]);
  const sum = (field: 'salesCount' | 'sales' | 'refundsCount' | 'refunds' | 'collectionsCount' | 'collections' | 'total') => details.reduce((acc, row) => acc + row[field], 0);
  summary.addRow(['Total', sum('salesCount'), sum('sales'), sum('refundsCount'), sum('refunds'), sum('collectionsCount'), sum('collections'), sum('total')]).font = { bold: true };
  summary.addRow([]);
  summary.addRow(['En una venta mixta se cuenta en cada medio solo su parte. Las devoluciones figuran en negativo. El efectivo no está incluido: se controla en el arqueo de cada caja.']);
  const truncated = details.filter(row => row.count > row.rows.length);
  if (truncated.length) summary.addRow([`Atención: ${truncated.map(row => methodLabels[row.method]).join(', ')} tiene más de ${EXPORT_LIMIT.toLocaleString('es-AR')} movimientos; la hoja Movimientos no los incluye todos. Exportá un período más corto.`]).font = { bold: true, color: { argb: 'FFB42318' } };
  summary.columns.forEach((column, index) => { column.width = index === 0 ? 22 : 18; if ([2, 4, 6, 7].includes(index)) column.numFmt = moneyFormat; });

  const byDay = book.addWorksheet('Por día', { views: [{ state: 'frozen', ySplit: 1 }] });
  byDay.addRow(['Fecha', ...methods.map(method => methodLabels[method]), 'Total']).font = { bold: true };
  const days = new Map<string, Record<Method, number>>();
  for (const detail of details) for (const row of detail.rows) {
    const key = dayKey(row.at);
    const entry = days.get(key) || { QR: 0, Debito: 0, Credito: 0, Transferencia: 0 };
    entry[detail.method] += row.amount; days.set(key, entry);
  }
  for (const [key, entry] of [...days].sort((a, b) => a[0].localeCompare(b[0]))) {
    byDay.addRow([localDate(key), ...methods.map(method => entry[method]), methods.reduce((acc, method) => acc + entry[method], 0)]);
  }
  byDay.getColumn(1).numFmt = 'dd/mm/yyyy'; byDay.getColumn(1).width = 14;
  for (let index = 2; index <= methods.length + 2; index++) { byDay.getColumn(index).numFmt = moneyFormat; byDay.getColumn(index).width = 18; }

  const moves = book.addWorksheet('Movimientos', { views: [{ state: 'frozen', ySplit: 1 }] });
  moves.addRow(['Fecha y hora', 'Medio', 'Tipo', 'Ticket', 'Caja', 'Importe por este medio', 'Total de la venta', 'Venta mixta', 'Quién', 'Detalle']).font = { bold: true };
  const all = details.flatMap(detail => detail.rows.map(row => ({ ...row, method: detail.method }))).sort((a, b) => a.at.localeCompare(b.at));
  for (const row of all) moves.addRow([localDateTime(row.at), methodLabels[row.method], kindLabel(row), row.ticket_number ? `T-${row.ticket_number}` : '', row.register ?? '',
    row.amount, row.total, row.kind === 'sale' ? (row.mixed ? 'Sí' : 'No') : '', row.actor ?? '', row.detail ?? '']);
  moves.getColumn(1).numFmt = 'dd/mm/yyyy hh:mm';
  [18, 16, 20, 10, 16, 18, 16, 11, 26, 36].forEach((width, index) => { moves.getColumn(index + 1).width = width; });
  moves.getColumn(6).numFmt = moneyFormat; moves.getColumn(7).numFmt = moneyFormat;
  moves.autoFilter = { from: 'A1', to: 'J1' };

  const report = await moneyReport;
  if (report) {
    const accounts = book.addWorksheet('Cuentas', { views: [{ state: 'frozen', ySplit: 1 }] });
    accounts.addRow(['Cuenta', 'Tipo', 'Cobra', 'Cobrado en el período', 'Saldo actual', 'Estado']).font = { bold: true };
    const kinds = { bank: 'Banco', wallet: 'Billetera virtual', other: 'Otra' } as const;
    for (const account of report.accounts) accounts.addRow([account.name, kinds[account.kind], account.methods.map(method => methodLabels[method]).join(', '),
      account.collected, account.balance, account.active ? 'Activa' : 'Archivada']);
    [26, 18, 30, 20, 18, 12].forEach((width, index) => { accounts.getColumn(index + 1).width = width; });
    accounts.getColumn(4).numFmt = moneyFormat; accounts.getColumn(5).numFmt = moneyFormat;

    const money = book.addWorksheet('Retiros y movimientos', { views: [{ state: 'frozen', ySplit: 1 }] });
    money.addRow(['Fecha y hora', 'Tipo', 'Sale de', 'Va a', 'Importe', 'Proveedor', 'Motivo', 'Quién']).font = { bold: true };
    for (const row of [...report.rows].sort((a, b) => a.at.localeCompare(b.at))) money.addRow([localDateTime(row.at), moneyKindLabels(row),
      row.source ?? 'Exterior', row.destination ?? 'Exterior', row.amount, row.supplier_name ?? '', row.note, row.actor ?? '']);
    money.getColumn(1).numFmt = 'dd/mm/yyyy hh:mm';
    [18, 22, 24, 24, 16, 22, 40, 26].forEach((width, index) => { money.getColumn(index + 1).width = width; });
    money.getColumn(5).numFmt = moneyFormat;
    money.autoFilter = { from: 'A1', to: 'H1' };
    summary.addRow(['Las hojas «Cuentas» y «Retiros y movimientos» detallan de dónde salió cada retiro: efectivo de una caja, fondo de sucursal o depósito, o una cuenta.']);
  }

  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url; link.download = `cobros_por_medio_${from}_al_${to}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}
