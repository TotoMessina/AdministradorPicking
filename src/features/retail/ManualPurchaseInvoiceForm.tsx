import { useEffect, useMemo, useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { retail, errorMessage, type PurchaseInvoice, type Supplier, type SupplierPayment } from './api';
import type { Run } from './Management';
import { PurchaseInvoicePanel } from '../../components/PurchaseInvoicePanel';
import {
  amountsFromTotal, checkPurchaseInvoice, emptyPurchaseDraft, formatMoney, purchaseInvoicePayload, voucherCode, voucherLabel, voucherNumber,
  type PurchaseInvoiceDraft, type VatRateOption, type VoucherKind, type VoucherLetter,
} from '../../services/purchaseInvoiceService';
import { cuitDigits, formatCuit } from '../../services/supplierInvoiceRules';
import { INVOICE_TYPES, documentAccount } from '../../services/supplierAccount';
import { randomUUID } from '../../utils/uuid';

const displayDate = (date: string) => date.split('-').reverse().join('/');
const number = (value: string) => { const parsed = Number(value); return value && Number.isFinite(parsed) ? parsed : 0; };
const KINDS: { id: VoucherKind; title: string; hint: string }[] = [
  { id: 'invoice', title: 'Factura', hint: 'Una compra o un servicio sin mercadería para cargar' },
  { id: 'credit', title: 'Devolución o descuento', hint: 'Nota de crédito: baja lo que le debés' },
  { id: 'debit', title: 'Cargo extra', hint: 'Nota de débito: sube lo que le debés' },
];

/**
 * Comprobante sin foto ni mercadería, paso a paso: qué se carga, y con el total y la alícuota
 * se calculan neto e IVA; el detalle fiscal queda plegado. No cambia stock ni costos.
 */
export function ManualPurchaseInvoiceForm({ storeId, invoices, payments, busy, run, close, onSaved }: {
  storeId: string; invoices: PurchaseInvoice[]; payments: SupplierPayment[]; busy: boolean; run: Run; close: () => void; onSaved: () => void;
}) {
  const [kind, setKind] = useState<VoucherKind | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [letter, setLetter] = useState<VoucherLetter>('A');
  const [rate, setRate] = useState<VatRateOption>('21');
  const [total, setTotal] = useState('');
  const [internal, setInternal] = useState('');
  const [iibb, setIibb] = useState('');
  const [vatPerception, setVatPerception] = useState('');
  const [draft, setDraft] = useState<PurchaseInvoiceDraft>(emptyPurchaseDraft);
  // Tocar el detalle fiscal deja de recalcular: lo cargado a mano no se pisa.
  const [detailEdited, setDetailEdited] = useState(false);
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
  const effective = useMemo<PurchaseInvoiceDraft>(() => detailEdited ? draft : {
    ...draft,
    voucher_type: kind ? voucherCode(kind, letter) : null,
    amounts: amountsFromTotal({ total: number(total), rate, letter, internalTaxes: number(internal), iibbPerceptions: number(iibb), vatPerceptions: number(vatPerception) }),
  }, [detailEdited, draft, kind, letter, total, rate, internal, iibb, vatPerception]);
  const checks = useMemo(() => checkPurchaseInvoice(effective, null), [effective]);
  const isNote = kind === 'credit' || kind === 'debit';
  const targets = invoices.filter(invoice => INVOICE_TYPES.has(invoice.voucher_type) && invoice.issuer_cuit === cuitDigits(effective.issuer_cuit));
  const name = supplier?.name ?? otherName.trim();
  const days = supplier?.profile.payment_days;
  const dueValid = !due || !effective.issue_date || due >= effective.issue_date;
  const extras = number(internal) + number(iibb) + number(vatPerception);
  const showVat = (letter === 'A' || letter === 'M') && rate !== '0';
  const update = (patch: Partial<PurchaseInvoiceDraft>) => setDraft(previous => ({ ...previous, ...patch }));

  const chooseSupplier = (id: string) => {
    setSupplierId(id); setAppliesTo('');
    const chosen = suppliers.find(item => item.id === id);
    update({ issuer_cuit: chosen?.cuit ? formatCuit(chosen.cuit) : '' });
    if (chosen?.profile.vat_condition === 'MO' || chosen?.profile.vat_condition === 'EX') setLetter('C');
  };

  if (!kind) return <div className="manual-kind-step" role="group" aria-label="Qué querés cargar">
    <strong>¿Qué querés cargar?</strong>
    {KINDS.map(item => <button key={item.id} type="button" className="manual-kind-option" disabled={busy} onClick={() => setKind(item.id)}>
      <strong>{item.title}</strong><span>{item.hint}</span>
    </button>)}
  </div>;

  return <form className="retail-form manual-purchase-form" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    const problem = !name ? 'Elegí o escribí el proveedor.' : !dueValid ? 'El vencimiento no puede ser anterior a la emisión.'
      : number(total) > 0 && extras >= number(total) && !detailEdited ? 'Internos y percepciones no pueden superar el total.'
        : checks.missing.length ? `Faltan: ${checks.missing.join(', ')}.` : '';
    if (problem) { setError(problem); return; }
    setError('');
    const ok = await run(async () => {
      try {
        await retail.savePurchaseInvoice(storeId, request, purchaseInvoicePayload(effective, { supplier_id: supplier?.id, supplier_name: name, qr_verified: false }));
        // Vencimiento y factura asociada se guardan aparte: el registro ya quedó hecho aunque esto fallara.
        const tracking = { ...(due ? { due_date: due } : {}), ...(isNote && appliesTo ? { applies_to: appliesTo } : {}) };
        if (Object.keys(tracking).length) await retail.updatePurchaseInvoiceTracking(storeId, request, tracking);
      } catch (e) { setError(errorMessage(e)); throw e; }
    }, 'Guardado');
    if (ok) { onSaved(); close(); }
  }}>
    <div className="manual-kind-chosen">
      <strong>{KINDS.find(item => item.id === kind)?.title}</strong>
      <button type="button" className="text-button" disabled={busy} onClick={() => { setKind(null); setAppliesTo(''); setDetailEdited(false); if (letter === 'M') setLetter('A'); }}>Cambiar</button>
    </div>
    <label>Proveedor
      <select value={supplierId} disabled={busy} onChange={event => chooseSupplier(event.target.value)}>
        <option value="">Otro (escribir el nombre)</option>
        {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}{item.cuit ? ` · ${formatCuit(item.cuit)}` : ''}</option>)}
      </select>
    </label>
    {!supplierId && <label>Nombre del proveedor<input maxLength={120} value={otherName} disabled={busy} onChange={event => setOtherName(event.target.value)} /></label>}
    {!supplier?.cuit && <label>CUIT del proveedor<input inputMode="numeric" autoComplete="off" maxLength={13} value={draft.issuer_cuit} disabled={busy}
      onChange={event => update({ issuer_cuit: event.target.value })} placeholder="Ej.: 30-70817362-9" /></label>}
    <div className="payment-form-row">
      <label>Letra
        <select value={letter} disabled={busy} onChange={event => setLetter(event.target.value as VoucherLetter)}>
          {(['A', 'B', 'C', ...(kind === 'invoice' ? ['M'] : [])] as VoucherLetter[]).map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Punto de venta<input inputMode="numeric" autoComplete="off" maxLength={5} value={draft.point_of_sale} disabled={busy} onChange={event => update({ point_of_sale: event.target.value.replace(/\D/g, '') })} placeholder="Ej.: 7" /></label>
      <label>Número<input inputMode="numeric" autoComplete="off" maxLength={8} value={draft.number} disabled={busy} onChange={event => update({ number: event.target.value.replace(/\D/g, '') })} placeholder="Ej.: 366648" /></label>
      <label>Fecha<input type="date" value={draft.issue_date} disabled={busy} onChange={event => update({ issue_date: event.target.value })} /></label>
    </div>
    <div className="payment-form-row">
      <label>Total<NumberInput step="0.01" min="0" value={total} disabled={busy || detailEdited} placeholder="0" onValueChange={setTotal} /></label>
      {(letter === 'A' || letter === 'M') && <label>IVA
        <select value={rate} disabled={busy || detailEdited} onChange={event => setRate(event.target.value as VatRateOption)}>
          <option value="21">21%</option><option value="10.5">10,5%</option><option value="27">27%</option><option value="0">Sin IVA</option>
        </select>
      </label>}
    </div>
    {!detailEdited && number(total) > extras && <p className="payment-summary" role="status">
      {showVat ? `Neto ${formatMoney(number(effective.amounts.net_21 || effective.amounts.net_10_5 || effective.amounts.net_27))} · IVA ${formatMoney(number(effective.amounts.vat_21 || effective.amounts.vat_10_5 || effective.amounts.vat_27))}`
        : `Sin IVA discriminado · ${formatMoney(number(effective.amounts.untaxed))}`}
    </p>}
    <details className="supplier-rules">
      <summary>Más datos <small>Internos, percepciones{isNote ? ' y factura asociada' : ' y vencimiento'}</small></summary>
      <div className="payment-form-row">
        <label>Impuestos internos<NumberInput step="0.01" min="0" value={internal} disabled={busy || detailEdited} placeholder="0" onValueChange={setInternal} /></label>
        <label>Percepción IIBB<NumberInput step="0.01" min="0" value={iibb} disabled={busy || detailEdited} placeholder="0" onValueChange={setIibb} /></label>
        <label>Percepción IVA<NumberInput step="0.01" min="0" value={vatPerception} disabled={busy || detailEdited} placeholder="0" onValueChange={setVatPerception} /></label>
      </div>
      <label>Vencimiento<input type="date" min={effective.issue_date || undefined} value={due} disabled={busy} aria-invalid={!dueValid} onChange={event => setDue(event.target.value)} /></label>
      <small>{!dueValid ? 'El vencimiento no puede ser anterior a la emisión.'
        : `Si lo dejás vacío: fecha de emisión${days ? ` + ${days} días (plazo del proveedor)` : ' (sin plazo cargado en la ficha)'}.`}</small>
    </details>
    {isNote && <label>¿A qué factura corresponde?
      <select value={appliesTo} disabled={busy} onChange={event => setAppliesTo(event.target.value)}>
        <option value="">Sin elegir{kind === 'credit' ? ' (queda a tu favor)' : ''}</option>
        {targets.map(invoice => <option key={invoice.id} value={invoice.id}>
          {voucherLabel(invoice.voucher_type)} {voucherNumber(invoice.point_of_sale, invoice.number)} · {displayDate(invoice.issue_date)} · saldo {formatMoney(documentAccount(invoice, invoices, payments).balance)}
        </option>)}
      </select>
    </label>}
    {isNote && !targets.length && <small>No hay facturas de este proveedor para elegir; podés asociarla después desde su detalle.</small>}
    <details className="supplier-rules">
      <summary>Ver o corregir el detalle fiscal <small>{detailEdited ? 'Editado a mano' : 'Calculado desde el total'}</small></summary>
      <PurchaseInvoicePanel manual draft={effective} onChange={next => { setDraft(next); setDetailEdited(true); }} checks={checks} qrStatus="none" duplicate={null}
        register onRegister={() => undefined} aiBusy={false} aiError="" onFillWithAi={() => undefined} disabled={busy} />
      {detailEdited && <button type="button" className="text-button" disabled={busy} onClick={() => setDetailEdited(false)}>Volver a calcular desde el total</button>}
    </details>
    {error && <p role="alert">{error}</p>}
    <div className="button-row">
      <button className="primary-button" disabled={busy}>Guardar {kind === 'invoice' ? 'factura' : 'nota'}</button>
    </div>
  </form>;
}
