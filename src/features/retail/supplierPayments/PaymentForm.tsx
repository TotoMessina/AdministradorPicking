import { useEffect, useMemo, useRef, useState } from 'react';
import { NumberInput } from '../../../components/NumberInput';
import { retail, errorMessage, type PurchaseInvoice, type Supplier, type SupplierPayment, type SupplierPaymentMethod } from '../api';
import type { Run } from '../Management';
import { formatMoney } from '../../../services/purchaseInvoiceService';
import { formatCuit } from '../../../services/supplierInvoiceRules';
import { paymentUnapplied, todayIso } from '../../../services/supplierAccount';
import { randomUUID } from '../../../utils/uuid';
import { METHOD_LABELS, RETENTIONS, cents, amountOf, openDocuments, allocationList, type PaymentIntent, proposedAllocations } from './paymentHelpers';
import { AllocationFields } from './AllocationFields';

/** Registrar un pago a proveedor. */
export function PaymentForm({ storeId, suppliers, invoices, payments, busy, run, close, onSaved, intent }: {
  storeId: string; suppliers: Supplier[]; invoices: PurchaseInvoice[]; payments: SupplierPayment[]; busy: boolean; run: Run; close: () => void; onSaved: () => void; intent?: PaymentIntent;
}) {
  const [proposal] = useState(() => intent ? proposedAllocations(intent, invoices, payments) : null);
  const amountInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!intent) return;
    amountInput.current?.scrollIntoView({ block: 'center' });
    amountInput.current?.focus();
  }, [intent]);
  const accounts = useMemo(() => {
    const names = new Map<string, string>();
    for (const supplier of suppliers) if (supplier.cuit) names.set(supplier.cuit, supplier.name);
    for (const invoice of invoices) if (!names.has(invoice.issuer_cuit)) names.set(invoice.issuer_cuit, invoice.supplier_name);
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es-AR'));
  }, [suppliers, invoices]);
  const [cuit, setCuit] = useState(intent?.cuit ?? '');
  const [paidOn, setPaidOn] = useState(todayIso);
  const [method, setMethod] = useState<SupplierPaymentMethod>('transfer');
  const [amount, setAmount] = useState(proposal?.amount ?? '');
  const [retentions, setRetentions] = useState<Record<string, string>>({});
  const [certificate, setCertificate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState<Record<string, string>>(proposal?.values ?? {});
  const [shifts, setShifts] = useState<{ id: string; label: string }[]>([]);
  const [shift, setShift] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [request] = useState(randomUUID);
  const uploaded = useRef<{ file: File; url: string } | null>(null);

  useEffect(() => {
    if (method !== 'cash') return;
    let cancelled = false;
    void retail.openShifts(storeId).then(rows => {
      if (cancelled) return;
      setShifts(rows);
      if (rows.length === 1) setShift(rows[0].id);
    }, () => { if (!cancelled) setShifts([]); });
    return () => { cancelled = true; };
  }, [method, storeId]);

  const retentionTotal = cents(RETENTIONS.reduce((sum, item) => sum + amountOf(retentions[item.id]), 0));
  const total = cents(amountOf(amount) + retentionTotal);
  const allocations = allocationList(values);
  const applied = cents(allocations.reduce((sum, item) => sum + item.amount, 0));
  const documents = cuit ? openDocuments(cuit, invoices, payments) : [];
  const favor = cents(payments.filter(payment => payment.issuer_cuit === cuit).reduce((sum, payment) => sum + paymentUnapplied(payment), 0));
  const overBalance = allocations.some(item => item.amount > (documents.find(row => row.invoice.id === item.invoice_id)?.balance ?? 0) + 0.005);

  return <form className="retail-form payment-form" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    const problem = !cuit ? 'Elegí el proveedor.' : !paidOn ? 'Completá la fecha del pago.' : total <= 0 ? 'Completá el importe del pago.'
      : applied > total + 0.005 ? 'Lo asignado a facturas supera el total del pago.' : overBalance ? 'Un importe supera el saldo de su comprobante.'
        : method === 'cash' && !shift ? 'Elegí la caja de la que sale el efectivo.' : method === 'cash' && !file ? 'Adjuntá el comprobante del pago.'
          : method === 'cash' && amountOf(amount) <= 0 ? 'Completá el efectivo entregado.' : '';
    if (problem) { setError(problem); return; }
    setError('');
    const ok = await run(async () => {
      try {
        let voucherUrl: string | null = null;
        if (method === 'cash' && file) {
          voucherUrl = uploaded.current?.file === file ? uploaded.current.url : await retail.uploadVoucher(storeId, shift, file);
          uploaded.current = { file, url: voucherUrl };
        }
        await retail.saveSupplierPayment(storeId, request, {
          issuer_cuit: cuit, supplier_name: accounts.find(([value]) => value === cuit)?.[1] ?? formatCuit(cuit), paid_on: paidOn, method,
          amount: cents(amountOf(amount)), ...Object.fromEntries(RETENTIONS.map(item => [item.id, cents(amountOf(retentions[item.id]))])),
          retention_certificate: certificate, reference, notes, allocations,
          ...(method === 'cash' ? { shift_id: shift, voucher_url: voucherUrl } : {}),
        });
      } catch (e) { setError(errorMessage(e)); throw e; }
    }, 'Pago registrado');
    if (ok) { onSaved(); close(); }
  }}>
    <label>Proveedor
      <select value={cuit} disabled={busy} onChange={event => { setCuit(event.target.value); setValues({}); }}>
        <option value="">Elegí el proveedor</option>
        {accounts.map(([value, name]) => <option key={value} value={value}>{name} · {formatCuit(value)}</option>)}
      </select>
    </label>
    {!accounts.length && <p className="purchase-tracking-note">Hace falta un proveedor con CUIT o un comprobante registrado.</p>}
    <div className="payment-form-row">
      <label>Fecha<input type="date" value={paidOn} disabled={busy} onChange={event => setPaidOn(event.target.value)} /></label>
      <label>Medio de pago
        <select value={method} disabled={busy} onChange={event => setMethod(event.target.value as SupplierPaymentMethod)}>
          {Object.entries(METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>{method === 'cash' ? 'Efectivo entregado' : 'Importe pagado'}<NumberInput ref={amountInput} step="0.01" min="0" value={amount} disabled={busy} placeholder="0" onValueChange={setAmount} /></label>
    </div>
    {favor > 0.005 && <p className="purchase-tracking-note">Este proveedor tiene {formatMoney(favor)} a tu favor. Antes de pagar de más, usalo desde el detalle de ese pago.</p>}
    {!!proposal?.skipped && <p className="purchase-tracking-note">No se incluyó{proposal.skipped === 1 ? ' 1 comprobante' : `n ${proposal.skipped} comprobantes`} en revisión: agregalo{proposal.skipped === 1 ? '' : 's'} abajo si corresponde pagar{proposal.skipped === 1 ? 'lo' : 'los'}.</p>}
    {method === 'cash' && <>
      <label>Caja
        <select value={shift} disabled={busy} onChange={event => setShift(event.target.value)}>
          <option value="">Elegí la caja</option>
          {shifts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {!shifts.length && <p className="purchase-tracking-note">No hay cajas abiertas. Abrí una para pagar en efectivo, o elegí otro medio.</p>}
      <label>Comprobante del pago<input type="file" accept="image/*,application/pdf" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <p className="purchase-tracking-note">Se registra como retiro «Pago a proveedor» en esa caja, igual que desde Caja, y se descuenta al cerrar la caja.</p>
    </>}
    {method !== 'cash' && <label>Referencia (opcional)<input maxLength={120} value={reference} disabled={busy} onChange={event => setReference(event.target.value)} placeholder={method === 'check' ? 'Banco y número de cheque' : 'Número de operación'} /></label>}
    <details className="supplier-rules">
      <summary>Retenciones <small>{retentionTotal > 0 ? formatMoney(retentionTotal) : 'Si corresponden'}</small></summary>
      <p>Cancelan deuda aunque no sea dinero entregado.</p>
      <div className="payment-form-row">
        {RETENTIONS.map(item => <label key={item.id}>{item.label}<NumberInput step="0.01" min="0" value={retentions[item.id] ?? ''} disabled={busy} placeholder="0"
          onValueChange={value => setRetentions(previous => ({ ...previous, [item.id]: value }))} /></label>)}
      </div>
      <label>Número de certificado<input maxLength={60} value={certificate} disabled={busy} onChange={event => setCertificate(event.target.value)} /></label>
    </details>
    {cuit && <AllocationFields documents={documents} values={values} onChange={setValues} available={total} disabled={busy} />}
    <label>Notas (opcional)<input maxLength={300} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} /></label>
    {total > 0 && <p className="payment-summary" role="status">
      Total del pago {formatMoney(total)} · para facturas {formatMoney(applied)}{total - applied > 0.005 ? ` · queda a tu favor ${formatMoney(cents(total - applied))}` : ''}
    </p>}
    {error && <p role="alert">{error}</p>}
    <div className="button-row"><button className="primary-button" disabled={busy}>Registrar pago</button></div>
  </form>;
}
