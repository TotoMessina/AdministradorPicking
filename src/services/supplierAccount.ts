import type { PurchaseInvoice, SupplierPayment } from '../features/retail/api';

/** Facturas (A, B, C, M), notas de débito y de crédito según el código de ARCA. */
export const INVOICE_TYPES = new Set([1, 6, 11, 51]);
export const DEBIT_NOTE_TYPES = new Set([2, 7, 12]);
export const CREDIT_NOTE_TYPES = new Set([3, 8, 13]);

export type DocumentStatus = 'pending' | 'overdue' | 'review' | 'cancelled' | 'credit_applied' | 'credit_available';

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pendiente', overdue: 'Vencida', review: 'En revisión', cancelled: 'Cancelada',
  credit_applied: 'Aplicada', credit_available: 'A favor',
};

export interface DocumentAccount {
  /** Lo que todavía se debe (facturas y notas de débito) o el crédito sin aplicar (notas de crédito). */
  balance: number;
  status: DocumentStatus;
  /** Notas de crédito vinculadas que restan a esta factura. */
  credits: number;
  /** Pagos aplicados a este comprobante. */
  paid: number;
  /** Días hasta el vencimiento (negativo si ya venció). */
  daysToDue: number;
  /** Motivo de "En revisión": el cargado a mano o la nota de débito sin aceptar. */
  reviewNote: string | null;
}

const cents = (value: number) => Math.round(value * 100) / 100;
const paidOn = (invoiceId: string, payments: SupplierPayment[]) => payments.reduce((sum, payment) =>
  sum + payment.allocations.filter(item => item.invoice_id === invoiceId).reduce((partial, item) => partial + item.amount, 0), 0);
const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86_400_000);
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Saldo y estado de un comprobante dentro de la cuenta corriente.
 * Facturas y notas de débito: total − notas de crédito vinculadas − pagos aplicados.
 * Estados: Cancelada (saldo 0) > En revisión (marcada o nota de débito sin aceptar) > Vencida > Pendiente.
 */
export function documentAccount(invoice: PurchaseInvoice, all: PurchaseInvoice[], payments: SupplierPayment[] = [], today = todayIso()): DocumentAccount {
  const daysToDue = dayDiff(today, invoice.due_date ?? invoice.issue_date);
  if (CREDIT_NOTE_TYPES.has(invoice.voucher_type)) {
    return {
      balance: invoice.applies_to ? 0 : invoice.total, credits: 0, paid: 0, daysToDue,
      status: invoice.applies_to ? 'credit_applied' : 'credit_available', reviewNote: invoice.review_reason,
    };
  }
  const credits = cents(all.filter(other => other.applies_to === invoice.id && CREDIT_NOTE_TYPES.has(other.voucher_type))
    .reduce((sum, other) => sum + other.total, 0));
  const paid = cents(paidOn(invoice.id, payments));
  const balance = Math.max(0, cents(invoice.total - credits - paid));
  const unacceptedDebit = DEBIT_NOTE_TYPES.has(invoice.voucher_type) && !invoice.accepted_at;
  const reviewNote = invoice.review_reason ?? (unacceptedDebit ? 'Nota de débito sin aceptar: revisá su respaldo antes de aceptarla.' : null);
  const status: DocumentStatus = balance <= 0.005 ? 'cancelled' : reviewNote ? 'review' : daysToDue < 0 ? 'overdue' : 'pending';
  return { balance, status, credits, paid, daysToDue, reviewNote };
}

/** Total de un pago: el dinero entregado más las retenciones, que también cancelan deuda. */
export const paymentTotal = (payment: SupplierPayment) => cents(payment.amount + paymentRetentions(payment));
export const paymentRetentions = (payment: SupplierPayment) => cents(payment.ret_vat + payment.ret_income + payment.ret_iibb + payment.ret_suss);
export const paymentApplied = (payment: SupplierPayment) => cents(payment.allocations.reduce((sum, item) => sum + item.amount, 0));
/** Lo que queda a favor (anticipo) hasta aplicarlo a un comprobante. */
export const paymentUnapplied = (payment: SupplierPayment) => payment.voided_at ? 0 : Math.max(0, cents(paymentTotal(payment) - paymentApplied(payment)));

/** Desglose de lo aplicado: cada comprobante aporta neto, IVA y otros impuestos en proporción a lo pagado. */
export function paymentBreakdown(payment: SupplierPayment, invoices: PurchaseInvoice[]) {
  const totals = { net: 0, vat: 0, internal: 0, other: 0 };
  for (const item of payment.allocations) {
    const invoice = invoices.find(row => row.id === item.invoice_id);
    if (!invoice || invoice.total <= 0) continue;
    const share = item.amount / invoice.total;
    totals.net += (invoice.net_21 + invoice.net_10_5 + invoice.net_27 + invoice.untaxed) * share;
    totals.vat += (invoice.vat_21 + invoice.vat_10_5 + invoice.vat_27) * share;
    totals.internal += invoice.internal_taxes * share;
    totals.other += (invoice.vat_perceptions + invoice.iibb_perceptions + invoice.other_taxes) * share;
  }
  return { net: cents(totals.net), vat: cents(totals.vat), internal: cents(totals.internal), other: cents(totals.other) };
}

export const dueLabel = (account: DocumentAccount) => account.status === 'cancelled' || account.status.startsWith('credit') ? ''
  : account.daysToDue < 0 ? `venció hace ${-account.daysToDue} día${account.daysToDue === -1 ? '' : 's'}`
    : account.daysToDue === 0 ? 'vence hoy' : `vence en ${account.daysToDue} día${account.daysToDue === 1 ? '' : 's'}`;

export interface LedgerEntry {
  id: string;
  date: string;
  concept: string;
  /** Positivo aumenta la deuda; negativo la reduce. */
  amount: number;
  /** Saldo acumulado después de este movimiento. */
  balance: number;
  note: string;
}

const METHOD_NAMES: Record<SupplierPayment['method'], string> = { cash: 'efectivo', transfer: 'transferencia', check: 'cheque', other: 'otro medio' };

/**
 * Cuenta corriente de un proveedor: facturas y notas de débito suman, notas de crédito y pagos restan.
 * Los pagos anulados no cuentan. El mismo día, primero los comprobantes y después los pagos.
 */
export function supplierLedger(cuit: string, invoices: PurchaseInvoice[], payments: SupplierPayment[], describe: (invoice: PurchaseInvoice) => string): LedgerEntry[] {
  const documents = invoices.filter(invoice => invoice.issuer_cuit === cuit).map(invoice => ({
    id: invoice.id, date: invoice.issue_date, order: 0, concept: describe(invoice),
    amount: CREDIT_NOTE_TYPES.has(invoice.voucher_type) ? -invoice.total : invoice.total,
    note: DEBIT_NOTE_TYPES.has(invoice.voucher_type) && !invoice.accepted_at ? 'Sin aceptar' : invoice.review_reason ? 'En revisión' : '',
  }));
  const paid = payments.filter(payment => payment.issuer_cuit === cuit && !payment.voided_at).map(payment => ({
    id: payment.id, date: payment.paid_on, order: 1, concept: `Pago por ${METHOD_NAMES[payment.method]}`,
    amount: -paymentTotal(payment),
    note: paymentRetentions(payment) > 0 ? `Incluye retenciones ${paymentRetentions(payment).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '',
  }));
  let balance = 0;
  return [...documents, ...paid].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order).map(({ order: _order, ...entry }) => {
    balance = cents(balance + entry.amount);
    return { ...entry, balance };
  });
}

export interface SupplierSummary {
  cuit: string;
  /** Saldo total: deuda menos créditos y anticipos a favor. */
  balance: number;
  overdue: number;
  /** A vencer en los próximos 7 días. */
  next7: number;
  /** A vencer entre 8 y 30 días. */
  next30: number;
  later: number;
  inReview: number;
  /** Notas de crédito sin vincular y pagos sin aplicar. */
  favor: number;
}

export function supplierSummaries(invoices: PurchaseInvoice[], payments: SupplierPayment[], today = todayIso()): SupplierSummary[] {
  const map = new Map<string, SupplierSummary>();
  const entry = (cuit: string) => {
    let item = map.get(cuit);
    if (!item) { item = { cuit, balance: 0, overdue: 0, next7: 0, next30: 0, later: 0, inReview: 0, favor: 0 }; map.set(cuit, item); }
    return item;
  };
  for (const invoice of invoices) {
    const account = documentAccount(invoice, invoices, payments, today);
    const item = entry(invoice.issuer_cuit);
    if (account.status === 'credit_available') { item.favor += account.balance; continue; }
    if (account.balance <= 0.005 || CREDIT_NOTE_TYPES.has(invoice.voucher_type)) continue;
    if (account.status === 'review') item.inReview += account.balance;
    if (account.daysToDue < 0) item.overdue += account.balance;
    else if (account.daysToDue <= 7) item.next7 += account.balance;
    else if (account.daysToDue <= 30) item.next30 += account.balance;
    else item.later += account.balance;
  }
  for (const payment of payments) {
    if (!payment.voided_at) entry(payment.issuer_cuit).favor += paymentUnapplied(payment);
  }
  return [...map.values()].map(item => ({
    ...item, overdue: cents(item.overdue), next7: cents(item.next7), next30: cents(item.next30), later: cents(item.later), inReview: cents(item.inReview), favor: cents(item.favor),
    balance: cents(item.overdue + item.next7 + item.next30 + item.later - item.favor),
  })).sort((a, b) => b.balance - a.balance);
}
