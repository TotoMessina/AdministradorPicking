import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { retail, errorMessage, type PurchaseInvoice, type Supplier, type SupplierPayment, type SupplierPaymentMethod } from './api';
import type { Run } from './Management';
import { SettingsEditor } from './SettingsEditor';
import { formatMoney, voucherLabel, voucherNumber } from '../../services/purchaseInvoiceService';
import { formatCuit } from '../../services/supplierInvoiceRules';
import {
  CREDIT_NOTE_TYPES, documentAccount, paymentApplied, paymentBreakdown, paymentRetentions, paymentTotal, paymentUnapplied, todayIso,
} from '../../services/supplierAccount';
import { randomUUID } from '../../utils/uuid';

const METHOD_LABELS: Record<SupplierPaymentMethod, string> = { cash: 'Efectivo de caja', transfer: 'Transferencia', check: 'Cheque', other: 'Otro' };
const RETENTIONS = [
  { id: 'ret_vat', label: 'Retención IVA' }, { id: 'ret_income', label: 'Retención Ganancias' },
  { id: 'ret_iibb', label: 'Retención IIBB' }, { id: 'ret_suss', label: 'Retención SUSS' },
] as const;
const displayDate = (date: string) => date.split('-').reverse().join('/');
const cents = (value: number) => Math.round(value * 100) / 100;
const amountOf = (value: string | undefined) => { const number = Number(value); return value && Number.isFinite(number) ? number : 0; };
const openDocuments = (cuit: string, invoices: PurchaseInvoice[], payments: SupplierPayment[]) => invoices
  .filter(invoice => invoice.issuer_cuit === cuit && !CREDIT_NOTE_TYPES.has(invoice.voucher_type))
  .map(invoice => ({ invoice, balance: documentAccount(invoice, invoices, payments).balance }))
  .filter(item => item.balance > 0.005)
  .sort((a, b) => (a.invoice.due_date ?? a.invoice.issue_date).localeCompare(b.invoice.due_date ?? b.invoice.issue_date));

/** Reparte el importe entre comprobantes; "Repartir" completa desde el más antiguo. */
function AllocationFields({ documents, values, onChange, available, disabled }: {
  documents: ReturnType<typeof openDocuments>; values: Record<string, string>; onChange: (values: Record<string, string>) => void; available: number; disabled: boolean;
}) {
  if (!documents.length) return <p className="purchase-tracking-note">Este proveedor no tiene comprobantes con saldo: el importe queda a tu favor como anticipo.</p>;
  return <div className="payment-allocations">
    <div className="payment-allocations-head">
      <strong>¿Qué factura estás pagando?</strong>
      <button type="button" className="text-button" disabled={disabled || available <= 0} onClick={() => {
        let left = available;
        const next: Record<string, string> = {};
        for (const { invoice, balance } of documents) {
          if (left <= 0.005) break;
          const value = cents(Math.min(left, balance));
          next[invoice.id] = String(value);
          left = cents(left - value);
        }
        onChange(next);
      }}>Completar desde la más antigua</button>
    </div>
    {documents.map(({ invoice, balance }) => <label key={invoice.id}>
      <span>{voucherLabel(invoice.voucher_type)} {voucherNumber(invoice.point_of_sale, invoice.number)} · vence {displayDate(invoice.due_date ?? invoice.issue_date)} · saldo {formatMoney(balance)}</span>
      <NumberInput step="0.01" min="0" max={balance} value={values[invoice.id] ?? ''} disabled={disabled} placeholder="0" aria-label={`Importe aplicado a ${voucherNumber(invoice.point_of_sale, invoice.number)}`}
        onValueChange={value => onChange({ ...values, [invoice.id]: value })} />
    </label>)}
  </div>;
}

const allocationList = (values: Record<string, string>) => Object.entries(values)
  .map(([invoice_id, value]) => ({ invoice_id, amount: cents(amountOf(value)) })).filter(item => item.amount > 0);

/** Pedido de pago desde una cuenta o un comprobante: proveedor y, opcional, una factura puntual. */
export interface PaymentIntent { cuit: string; invoiceId?: string; key: number }

/** Lo que propone "Pagar": la factura elegida o todo el saldo, sin incluir lo que está en revisión. */
function proposedAllocations(intent: PaymentIntent, invoices: PurchaseInvoice[], payments: SupplierPayment[]) {
  const documents = openDocuments(intent.cuit, invoices, payments);
  const chosen = intent.invoiceId ? documents.filter(item => item.invoice.id === intent.invoiceId)
    : documents.filter(item => documentAccount(item.invoice, invoices, payments).status !== 'review');
  return {
    values: Object.fromEntries(chosen.map(item => [item.invoice.id, String(item.balance)])),
    amount: chosen.length ? String(cents(chosen.reduce((sum, item) => sum + item.balance, 0))) : '',
    skipped: intent.invoiceId ? 0 : documents.length - chosen.length,
  };
}

function PaymentForm({ storeId, suppliers, invoices, payments, busy, run, close, onSaved, intent }: {
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
        : method === 'cash' && !shift ? 'Elegí el turno de caja del que sale el efectivo.' : method === 'cash' && !file ? 'Adjuntá el comprobante del pago.'
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
      <label>Turno de caja
        <select value={shift} disabled={busy} onChange={event => setShift(event.target.value)}>
          <option value="">Elegí el turno</option>
          {shifts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {!shifts.length && <p className="purchase-tracking-note">No hay turnos abiertos. Abrí un turno para pagar en efectivo, o elegí otro medio.</p>}
      <label>Comprobante del pago<input type="file" accept="image/*,application/pdf" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <p className="purchase-tracking-note">Se registra como retiro «Pago a proveedor» en ese turno, igual que desde Caja, y cuenta en el arqueo.</p>
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

function PaymentDetail({ payment, invoices, payments, storeId, busy, run, onSaved }: {
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
          const warning = payment.method === 'cash' ? ' El retiro de caja no se revierte: si el efectivo volvió, registrá un ingreso en el turno.' : '';
          if (!window.confirm(`¿Anular este pago de ${formatMoney(paymentTotal(payment))}? Los comprobantes vuelven a tener saldo.${warning}`)) return;
          if (await run(() => retail.voidSupplierPayment(storeId, payment.id, reason.trim()), 'Pago anulado')) onSaved();
        }}>Anular pago</button>
      </div>
    </>}
  </div>;
}

/** Pagos a proveedores aplicados a comprobantes, con retenciones y anticipos. Requiere conexión. */
export function SupplierPayments({ storeId, busy, run, active = true, version, onChanged, intent, onIntentDone }: {
  storeId: string; busy: boolean; run: Run; active?: boolean; version: number; onChanged: () => void; intent: PaymentIntent | null; onIntentDone: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [supplierRows, invoiceRows, paymentRows] = await Promise.all([retail.suppliers(storeId), retail.purchaseInvoices(storeId, '1900-01-01', '2999-12-31'), retail.supplierPayments(storeId)]);
      setSuppliers(supplierRows); setInvoices(invoiceRows); setPayments(paymentRows);
    } catch (e) { setError(`No se pudieron cargar los pagos. ${errorMessage(e)} Actualización necesaria: 202610300001.`); }
    finally { setLoading(false); }
  }, [storeId]);
  useEffect(() => { if (active) void load(); }, [active, load, version]);
  const advances = cents(payments.reduce((sum, payment) => sum + paymentUnapplied(payment), 0));
  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><HandCoins size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Pagos a proveedores</h3>
        <p>Registrá cada pago y qué facturas cubre. Si pagás de más, queda a tu favor como anticipo. Un pago no se borra: se anula con su motivo.</p>
      </div>
    </div>
    <div className="location-card-body">
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      {!error && intent && invoices.some(invoice => invoice.issuer_cuit === intent.cuit) && <div className="payment-intent">
        <PaymentForm key={intent.key} storeId={storeId} suppliers={suppliers} invoices={invoices} payments={payments} busy={busy} run={run} close={onIntentDone} onSaved={onChanged} intent={intent} />
        <button type="button" className="text-button" disabled={busy} onClick={onIntentDone}>Cancelar</button>
      </div>}
      {!error && !intent && <SettingsEditor label="Registrar pago" busy={busy || loading}>
        {close => <PaymentForm storeId={storeId} suppliers={suppliers} invoices={invoices} payments={payments} busy={busy} run={run} close={close} onSaved={onChanged} />}
      </SettingsEditor>}
      {advances > 0.005 && <div className="team-summary-badges"><span className="location-pill-badge active">A tu favor {formatMoney(advances)}</span></div>}
      {payments.slice(0, 50).map(payment => <SettingsEditor key={`${payment.id}:${payment.voided_at}:${paymentApplied(payment)}`} label="Ver detalle" busy={busy || loading}
        summary={<div className="category-summary-row supplier-summary-row">
          <strong>{payment.supplier_name}</strong>
          <span className="location-pill-badge">{displayDate(payment.paid_on)}</span>
          <span className="location-pill-badge">{METHOD_LABELS[payment.method]}</span>
          <span className="location-pill-badge active">{formatMoney(paymentTotal(payment))}</span>
          {paymentRetentions(payment) > 0 && <span className="location-pill-badge">Retenciones {formatMoney(paymentRetentions(payment))}</span>}
          {payment.voided_at ? <span className="location-pill-badge is-warning">Anulado</span>
            : paymentUnapplied(payment) > 0.005 && <span className="location-pill-badge">A tu favor {formatMoney(paymentUnapplied(payment))}</span>}
        </div>}>
        {() => <PaymentDetail payment={payment} invoices={invoices} payments={payments} storeId={storeId} busy={busy} run={run} onSaved={onChanged} />}
      </SettingsEditor>)}
    </div>
  </div>;
}
