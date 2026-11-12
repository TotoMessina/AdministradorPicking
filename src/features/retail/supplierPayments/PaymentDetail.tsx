import { askConfirm } from '../../../components/ConfirmHost';
import { useState } from 'react';
import { retail, type PurchaseInvoice, type SupplierPayment } from '../api';
import type { Run } from '../Management';
import { formatMoney, voucherLabel, voucherNumber } from '../../../services/purchaseInvoiceService';
import { paymentBreakdown, paymentTotal, paymentUnapplied } from '../../../services/supplierAccount';
import { METHOD_LABELS, RETENTIONS, cents, openDocuments, allocationList } from './paymentHelpers';
import { AllocationFields } from './AllocationFields';

/** Detalle de un pago registrado. */
export function PaymentDetail({ payment, invoices, payments, storeId, busy, run, onSaved }: {
  payment: SupplierPayment; invoices: PurchaseInvoice[]; payments: SupplierPayment[]; storeId: string; busy: boolean; run: Run; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const unapplied = paymentUnapplied(payment);
  const breakdown = paymentBreakdown(payment, invoices);
  const documents = openDocuments(payment.issuer_cuit, invoices, payments);
  const allocations = allocationList(values);
  const applied = cents(allocations.reduce((sum, item) => sum + item.amount, 0));
  return <div className="purchase-list-detail">
    <dl>
      <div><dt>Medio</dt><dd>{METHOD_LABELS[payment.method]}</dd></div>
      <div><dt>Importe pagado</dt><dd>{formatMoney(payment.amount)}</dd></div>
      {RETENTIONS.filter(item => payment[item.id] > 0).map(item => <div key={item.id}><dt>{item.label}</dt><dd>{formatMoney(payment[item.id])}</dd></div>)}
      {payment.retention_certificate && <div><dt>Certificado</dt><dd>{payment.retention_certificate}</dd></div>}
      {payment.reference && <div><dt>Referencia</dt><dd>{payment.reference}</dd></div>}
      {payment.allocations.length > 0 && <>
        <div><dt>Neto aplicado</dt><dd>{formatMoney(breakdown.net)}</dd></div>
        <div><dt>IVA aplicado</dt><dd>{formatMoney(breakdown.vat)}</dd></div>
        {breakdown.internal > 0 && <div><dt>Impuestos internos</dt><dd>{formatMoney(breakdown.internal)}</dd></div>}
        {breakdown.other > 0 && <div><dt>Percepciones y otros</dt><dd>{formatMoney(breakdown.other)}</dd></div>}
      </>}
      {payment.actor_email && <div><dt>Registró</dt><dd>{payment.actor_email}</dd></div>}
    </dl>
    {payment.allocations.length > 0 && <p className="purchase-tracking-note">Aplicado a: {payment.allocations.map(item => {
      const invoice = invoices.find(row => row.id === item.invoice_id);
      return `${invoice ? `${voucherLabel(invoice.voucher_type)} ${voucherNumber(invoice.point_of_sale, invoice.number)}` : 'Comprobante'} (${formatMoney(item.amount)})`;
    }).join(', ')}.</p>}
    {payment.notes && <p className="purchase-tracking-note">{payment.notes}</p>}
    {payment.voided_at ? <p className="purchase-tracking-note">Anulado: {payment.void_reason}</p> : <>
      {unapplied > 0.005 && <div className="purchase-tracking">
        <h4>Usar lo que quedó a tu favor ({formatMoney(unapplied)})</h4>
        <AllocationFields documents={documents} values={values} onChange={setValues} available={unapplied} disabled={busy} />
        {documents.length > 0 && <button type="button" className="secondary-button" disabled={busy || !allocations.length || applied > unapplied + 0.005} onClick={async () => {
          if (await run(() => retail.applySupplierPayment(storeId, payment.id, allocations), 'Saldo a favor usado')) onSaved();
        }}>Usar {formatMoney(applied)}</button>}
      </div>}
      <div className="purchase-tracking-row">
        <label>Anular pago (motivo)<input maxLength={300} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Ej.: cargado por error" /></label>
        <button type="button" className="text-button danger-text" disabled={busy || !reason.trim()} onClick={async () => {
          const warning = payment.method === 'cash' ? ' El retiro de caja no se revierte: si el efectivo volvió, registrá un ingreso en la caja.' : '';
          if (!await askConfirm(`¿Anular este pago de ${formatMoney(paymentTotal(payment))}? Los comprobantes vuelven a tener saldo.${warning}`)) return;
          if (await run(() => retail.voidSupplierPayment(storeId, payment.id, reason.trim()), 'Pago anulado')) onSaved();
        }}>Anular pago</button>
      </div>
    </>}
  </div>;
}
