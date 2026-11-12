import type { PurchaseInvoice, SupplierPayment, SupplierPaymentMethod } from '../api';
import { CREDIT_NOTE_TYPES, documentAccount } from '../../../services/supplierAccount';

// Medios de pago, retenciones y cálculo de lo aplicado a cada comprobante.
export const METHOD_LABELS: Record<SupplierPaymentMethod, string> = { cash: 'Efectivo de caja', transfer: 'Transferencia', check: 'Cheque', other: 'Otro' };
export const RETENTIONS = [
  { id: 'ret_vat', label: 'Retención IVA' }, { id: 'ret_income', label: 'Retención Ganancias' },
  { id: 'ret_iibb', label: 'Retención IIBB' }, { id: 'ret_suss', label: 'Retención SUSS' },
] as const;
export const displayDate = (date: string) => date.split('-').reverse().join('/');
export const cents = (value: number) => Math.round(value * 100) / 100;
export const amountOf = (value: string | undefined) => { const number = Number(value); return value && Number.isFinite(number) ? number : 0; };
export const openDocuments = (cuit: string, invoices: PurchaseInvoice[], payments: SupplierPayment[]) => invoices
  .filter(invoice => invoice.issuer_cuit === cuit && !CREDIT_NOTE_TYPES.has(invoice.voucher_type))
  .map(invoice => ({ invoice, balance: documentAccount(invoice, invoices, payments).balance }))
  .filter(item => item.balance > 0.005)
  .sort((a, b) => (a.invoice.due_date ?? a.invoice.issue_date).localeCompare(b.invoice.due_date ?? b.invoice.issue_date));

/** Reparte el importe entre comprobantes; "Repartir" completa desde el más antiguo. */
export const allocationList = (values: Record<string, string>) => Object.entries(values)
  .map(([invoice_id, value]) => ({ invoice_id, amount: cents(amountOf(value)) })).filter(item => item.amount > 0);

/** Pedido de pago desde una cuenta o un comprobante: proveedor y, opcional, una factura puntual. */
export interface PaymentIntent { cuit: string; invoiceId?: string; key: number }

/** Lo que propone "Pagar": la factura elegida o todo el saldo, sin incluir lo que está en revisión. */
export function proposedAllocations(intent: PaymentIntent, invoices: PurchaseInvoice[], payments: SupplierPayment[]) {
  const documents = openDocuments(intent.cuit, invoices, payments);
  const chosen = intent.invoiceId ? documents.filter(item => item.invoice.id === intent.invoiceId)
    : documents.filter(item => documentAccount(item.invoice, invoices, payments).status !== 'review');
  return {
    values: Object.fromEntries(chosen.map(item => [item.invoice.id, String(item.balance)])),
    amount: chosen.length ? String(cents(chosen.reduce((sum, item) => sum + item.balance, 0))) : '',
    skipped: intent.invoiceId ? 0 : documents.length - chosen.length,
  };
}
