import type { PurchaseInvoice, SupplierPayment } from '../features/retail/api';
import { paymentApplied, paymentBreakdown, paymentRetentions, paymentTotal, paymentUnapplied, type LedgerEntry, type SupplierSummary } from './supplierAccount';
import { voucherLabel } from './purchaseInvoiceService';
import { formatCuit } from './supplierInvoiceRules';

// Planillas para Excel en español: separador ";", coma decimal y BOM para los acentos.
const cell = (value: unknown) => {
  const text = String(value ?? '');
  // Evita que Excel interprete un texto como fórmula.
  return '"' + (/^\s*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
};
const decimal = (value: number) => (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
const date = (iso: string) => iso.split('-').reverse().join('/');
const csv = (header: string[], rows: unknown[][]) =>
  '﻿' + [header, ...rows].map(row => row.map(value => typeof value === 'number' ? decimal(value) : cell(value)).join(';')).join('\r\n');
const byDate = (rows: PurchaseInvoice[]) => [...rows].sort((a, b) =>
  a.issue_date.localeCompare(b.issue_date) || a.issuer_cuit.localeCompare(b.issuer_cuit) || a.point_of_sale - b.point_of_sale || a.number - b.number);

/** Un renglón por comprobante, con el desglose del Libro IVA Compras. Importes positivos: el tipo indica las notas de crédito. */
export function purchaseVatBookCsv(rows: PurchaseInvoice[]): string {
  return csv([
    'Fecha', 'Código de comprobante', 'Comprobante', 'Punto de venta', 'Número', 'CUIT proveedor', 'Proveedor', 'CUIT receptor',
    'CAE/CAEA', 'Neto gravado 21%', 'IVA 21%', 'Neto gravado 10,5%', 'IVA 10,5%', 'Neto gravado 27%', 'IVA 27%',
    'No gravado / exento', 'Impuestos internos', 'Percepción IVA', 'Percepción IIBB', 'Otros tributos', 'Total', 'Estado', 'Verificado con QR',
  ], byDate(rows).map(row => [
    date(row.issue_date), String(row.voucher_type).padStart(3, '0'), voucherLabel(row.voucher_type),
    String(row.point_of_sale).padStart(5, '0'), String(row.number).padStart(8, '0'),
    formatCuit(row.issuer_cuit), row.supplier_name, row.receiver_cuit ? formatCuit(row.receiver_cuit) : '',
    row.authorization_code ? `${row.authorization_type === 'A' ? 'CAEA' : 'CAE'} ${row.authorization_code}` : '',
    row.net_21, row.vat_21, row.net_10_5, row.vat_10_5, row.net_27, row.vat_27,
    row.untaxed, row.internal_taxes, row.vat_perceptions, row.iibb_perceptions, row.other_taxes, row.total,
    row.balanced ? 'Cierra' : 'No cierra', row.qr_verified ? 'Sí' : 'No',
  ]));
}

/** Solo comprobantes con percepciones de IVA o IIBB, para la declaración jurada. */
export function purchasePerceptionsCsv(rows: PurchaseInvoice[]): string {
  return csv([
    'Fecha', 'Comprobante', 'Punto de venta', 'Número', 'CUIT agente de percepción', 'Proveedor', 'Percepción IVA', 'Percepción IIBB',
  ], byDate(rows).filter(row => row.vat_perceptions > 0 || row.iibb_perceptions > 0).map(row => [
    date(row.issue_date), voucherLabel(row.voucher_type), String(row.point_of_sale).padStart(5, '0'), String(row.number).padStart(8, '0'),
    formatCuit(row.issuer_cuit), row.supplier_name, row.vat_perceptions, row.iibb_perceptions,
  ]));
}

export function downloadCsv(content: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = fileName;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Cuenta corriente de un proveedor: movimientos con saldo acumulado. */
export function supplierLedgerCsv(entries: LedgerEntry[]): string {
  return csv(['Fecha', 'Concepto', 'Importe', 'Saldo adeudado', 'Observación'],
    entries.map(entry => [date(entry.date), entry.concept, entry.amount, entry.balance, entry.note]));
}

/** Saldos a la fecha, un renglón por proveedor. */
export function supplierBalancesCsv(rows: { name: string; summary: SupplierSummary }[]): string {
  return csv(['Proveedor', 'CUIT', 'Vencido', 'A 7 días', 'A 30 días', 'Más adelante', 'En revisión (incluido)', 'A favor', 'Saldo'],
    rows.map(({ name, summary }) => [name, formatCuit(summary.cuit), summary.overdue, summary.next7, summary.next30, summary.later, summary.inReview, summary.favor, summary.balance]));
}

const METHOD_LABELS: Record<SupplierPayment['method'], string> = { cash: 'Efectivo de caja', transfer: 'Transferencia', check: 'Cheque', other: 'Otro' };

/** Pagos del período con su desglose. Los anulados se listan marcados y con importe informativo. */
export function supplierPaymentsCsv(payments: SupplierPayment[], invoices: PurchaseInvoice[]): string {
  return csv(['Fecha', 'Proveedor', 'CUIT', 'Medio', 'Referencia', 'Importe pagado', 'Retenciones', 'Total', 'Aplicado', 'A favor', 'Neto aplicado', 'IVA aplicado', 'Internos aplicados', 'Percepciones y otros', 'Estado'],
    [...payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on)).map(payment => {
      const parts = paymentBreakdown(payment, invoices);
      return [date(payment.paid_on), payment.supplier_name, formatCuit(payment.issuer_cuit), METHOD_LABELS[payment.method], payment.reference ?? '',
        payment.amount, paymentRetentions(payment), paymentTotal(payment), paymentApplied(payment), paymentUnapplied(payment),
        parts.net, parts.vat, parts.internal, parts.other, payment.voided_at ? `Anulado: ${payment.void_reason ?? ''}` : 'Vigente'];
    }));
}

/** Retenciones practicadas en el período, sin pagos anulados. */
export function supplierRetentionsCsv(payments: SupplierPayment[]): string {
  return csv(['Fecha', 'Proveedor', 'CUIT', 'Certificado', 'Retención IVA', 'Retención Ganancias', 'Retención IIBB', 'Retención SUSS', 'Total retenido'],
    payments.filter(payment => !payment.voided_at && paymentRetentions(payment) > 0).sort((a, b) => a.paid_on.localeCompare(b.paid_on)).map(payment => [
      date(payment.paid_on), payment.supplier_name, formatCuit(payment.issuer_cuit), payment.retention_certificate ?? '',
      payment.ret_vat, payment.ret_income, payment.ret_iibb, payment.ret_suss, paymentRetentions(payment),
    ]));
}
