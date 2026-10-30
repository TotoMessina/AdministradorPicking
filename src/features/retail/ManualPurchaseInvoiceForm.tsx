import { useEffect, useMemo, useState } from 'react';
import { retail, errorMessage, type PurchaseInvoice, type Supplier, type SupplierPayment } from './api';
import type { Run } from './Management';
import { PurchaseInvoicePanel } from '../../components/PurchaseInvoicePanel';
import {
  checkPurchaseInvoice, emptyPurchaseDraft, formatMoney, purchaseInvoicePayload, voucherLabel, voucherNumber, type PurchaseInvoiceDraft,
} from '../../services/purchaseInvoiceService';
import { cuitDigits, formatCuit } from '../../services/supplierInvoiceRules';
import { CREDIT_NOTE_TYPES, DEBIT_NOTE_TYPES, INVOICE_TYPES, documentAccount } from '../../services/supplierAccount';
import { randomUUID } from '../../utils/uuid';

const displayDate = (date: string) => date.split('-').reverse().join('/');

/**
 * Comprobante sin foto ni mercadería: notas de crédito por devoluciones, facturas de servicios
 * o comprobantes recibidos por correo. No cambia stock ni costos.
 */
export function ManualPurchaseInvoiceForm({ storeId, invoices, payments, busy, run, close, onSaved }: {
  storeId: string; invoices: PurchaseInvoice[]; payments: SupplierPayment[]; busy: boolean; run: Run; close: () => void; onSaved: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [draft, setDraft] = useState<PurchaseInvoiceDraft>(emptyPurchaseDraft);
  const [due, setDue] = useState('');
  const [appliesTo, setAppliesTo] = useState('');
  const [error, setError] = useState('');
  const [request] = useState(randomUUID);
  useEffect(() => {
    let cancelled = false;
    void retail.suppliers(storeId).then(rows => { if (!cancelled) setSuppliers(rows); }, () => undefined);
    return () => { cancelled = true; };
  }, [storeId]);

  const supplier = suppliers.find(item => item.id === supplierId);
  const checks = useMemo(() => checkPurchaseInvoice(draft, null), [draft]);
  const isNote = !!draft.voucher_type && (CREDIT_NOTE_TYPES.has(draft.voucher_type) || DEBIT_NOTE_TYPES.has(draft.voucher_type));
  const targets = invoices.filter(invoice => INVOICE_TYPES.has(invoice.voucher_type) && invoice.issuer_cuit === cuitDigits(draft.issuer_cuit));
  const name = supplier?.name ?? otherName.trim();
  const days = supplier?.profile.payment_days;
  const dueValid = !due || !draft.issue_date || due >= draft.issue_date;
  const ready = !checks.missing.length && !!name && dueValid;

  const chooseSupplier = (id: string) => {
    setSupplierId(id); setAppliesTo('');
    const chosen = suppliers.find(item => item.id === id);
    if (chosen?.cuit) setDraft(previous => ({ ...previous, issuer_cuit: formatCuit(chosen.cuit!) }));
  };

  return <form className="retail-form manual-purchase-form" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    if (!ready) {
      setError(!name ? 'Elegí o escribí el proveedor.' : !dueValid ? 'El vencimiento no puede ser anterior a la emisión.' : `Faltan: ${checks.missing.join(', ')}.`);
      return;
    }
    setError('');
    const ok = await run(async () => {
      try {
        await retail.savePurchaseInvoice(storeId, request, purchaseInvoicePayload(draft, { supplier_id: supplier?.id, supplier_name: name, qr_verified: false }));
        // Vencimiento y vínculo se guardan aparte: el registro ya quedó hecho aunque esto fallara.
        const tracking = { ...(due ? { due_date: due } : {}), ...(isNote && appliesTo ? { applies_to: appliesTo } : {}) };
        if (Object.keys(tracking).length) await retail.updatePurchaseInvoiceTracking(storeId, request, tracking);
      } catch (e) { setError(errorMessage(e)); throw e; }
    }, 'Comprobante registrado');
    if (ok) { onSaved(); close(); }
  }}>
    <p>Para comprobantes sin mercadería para cargar: notas de crédito por devoluciones o diferencias, notas de débito o facturas de servicios. No cambia el stock ni los costos.</p>
    <label>Proveedor
      <select value={supplierId} disabled={busy} onChange={event => chooseSupplier(event.target.value)}>
        <option value="">Otro (escribir el nombre)</option>
        {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}{item.cuit ? ` · ${formatCuit(item.cuit)}` : ''}</option>)}
      </select>
    </label>
    {!supplierId && <label>Nombre del proveedor<input maxLength={120} value={otherName} disabled={busy} onChange={event => setOtherName(event.target.value)} /></label>}
    <PurchaseInvoicePanel manual draft={draft} onChange={setDraft} checks={checks} qrStatus="none" duplicate={null}
      register onRegister={() => undefined} aiBusy={false} aiError="" onFillWithAi={() => undefined} disabled={busy} />
    <label>Vencimiento (opcional)<input type="date" min={draft.issue_date || undefined} value={due} disabled={busy}
      aria-invalid={!dueValid} onChange={event => setDue(event.target.value)} /></label>
    <small>{!dueValid ? 'El vencimiento no puede ser anterior a la emisión.'
      : `Si lo dejás vacío: fecha de emisión${days ? ` + ${days} días (plazo del proveedor)` : ' (sin plazo cargado en la ficha)'}.`}</small>
    {isNote && <label>Corresponde a la factura
      <select value={appliesTo} disabled={busy} onChange={event => setAppliesTo(event.target.value)}>
        <option value="">Sin vincular {CREDIT_NOTE_TYPES.has(draft.voucher_type!) ? '(queda como crédito a favor)' : ''}</option>
        {targets.map(invoice => <option key={invoice.id} value={invoice.id}>
          {voucherLabel(invoice.voucher_type)} {voucherNumber(invoice.point_of_sale, invoice.number)} · {displayDate(invoice.issue_date)} · saldo {formatMoney(documentAccount(invoice, invoices, payments).balance)}
        </option>)}
      </select>
    </label>}
    {isNote && !targets.length && <small>No hay facturas registradas con ese CUIT para vincular; podés vincularla después desde el detalle.</small>}
    {error && <p role="alert">{error}</p>}
    <div className="button-row">
      <button className="primary-button" disabled={busy}>Registrar comprobante</button>
    </div>
  </form>;
}
