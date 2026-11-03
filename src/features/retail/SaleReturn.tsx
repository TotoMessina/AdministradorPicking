import { useEffect, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import type { KioscoSale, PaymentPart } from '../../types/kiosco';
import { NumberInput } from '../../components/NumberInput';
import { askConfirm } from '../../components/ConfirmHost';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage, type SaleReturn as SaleReturnRecord } from './api';
import { authorizeCreditNote } from '../../services/billingService';
import type { Run } from './Management';
import './sale-return.css';

const money = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const methods: PaymentPart['method'][] = ['Efectivo', 'QR', 'Transferencia', 'Debito', 'Credito'];
const methodLabel: Record<PaymentPart['method'], string> = { Efectivo: 'Efectivo', QR: 'QR', Transferencia: 'Transferencia', Debito: 'Débito', Credito: 'Crédito', Fiado: 'A cuenta del cliente' };

export const saleNet = (sale: KioscoSale) => sale.total - (sale.returnedTotal || 0);

/** Estado visible de la venta: anulada o con parte devuelta. */
export function SaleReturnBadge({ sale }: { sale: KioscoSale }) {
  if (!sale.returnStatus || sale.returnStatus === 'none') return null;
  return <span className={`sale-return-badge ${sale.returnStatus}`}>
    {sale.returnStatus === 'voided' ? 'Anulada' : `Devuelto ${money(sale.returnedTotal || 0)}`}
  </span>;
}

/**
 * Anular o devolver parte de una venta terminada. La venta original no cambia: queda un registro con motivo y autor.
 * El identificador se conserva hasta que la devolución se guarda, así un reintento tras perder la conexión no la duplica.
 */
export function SaleReturn({ storeId, sale, shiftId, canRefund, run, busy, onReturned }: {
  storeId: string; sale: KioscoSale; shiftId?: string; canRefund: boolean; run: Run; busy: boolean; onReturned?: (sale: KioscoSale) => void;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<SaleReturnRecord[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<'void' | 'partial'>('void');
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [method, setMethod] = useState<'original' | PaymentPart['method']>('original');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [creditNote, setCreditNote] = useState<Record<string, string>>({});
  const request = useRef(randomUUID());

  useEffect(() => {
    if (!open) return;
    let active = true;
    retail.saleReturns(storeId, sale.id).then(rows => { if (active) { setHistory(rows); setLoadError(''); } })
      .catch(e => { if (active) setLoadError(errorMessage(e)); });
    return () => { active = false; };
  }, [open, storeId, sale.id, sale.returnedTotal]);

  const returned = (index: number) => (history || []).reduce((n, r) => n + r.items.filter(i => i.index === index).reduce((m, i) => m + i.qty, 0), 0);
  const left = sale.items.map((item, index) => Math.max(0, item.qty - returned(index)));
  const remaining = Math.round((sale.total - (sale.returnedTotal || 0)) * 100) / 100;
  const chosen = sale.items.map((_, index) => Math.min(left[index], Math.max(0, Math.floor(Number(quantities[index] || 0)))));
  const everything = chosen.every((qty, index) => qty === left[index]);
  const amount = mode === 'void' || everything ? remaining
    : Math.round(chosen.reduce((n, qty, index) => n + qty * sale.items[index].unitPrice, 0) * 100) / 100;
  const firstReturn = !(sale.returnedTotal || 0);
  // Anular sin devoluciones previas repite el cobro original; en otro caso se elige un medio.
  const usual: PaymentPart['method'] = sale.paymentMethod === 'Mixto' ? 'Efectivo' : sale.paymentMethod;
  const asCharged = mode === 'void' && firstReturn;
  const refundMethod = method === 'original' && !asCharged ? usual : method;
  const cashOut = refundMethod === 'Efectivo' || (refundMethod === 'original' && (sale.payments || []).some(p => p.method === 'Efectivo'));
  const billingPending = ['pending', 'retry', 'error'].includes(sale.billingStatus || 'none');
  const invoiced = sale.billingStatus === 'authorized';
  const pendingCreditNotes = (history || []).filter(r => r.credit_note_required && !r.credit_note_reference);
  const reload = async () => setHistory(await retail.saleReturns(storeId, sale.id).catch(() => history));
  // La nota de crédito sale de ARCA asociada a la factura de la venta. Un reintento nunca emite dos.
  const emitCreditNote = (id: string) => run(async () => {
    const res = await authorizeCreditNote(storeId, id);
    await reload();
    if (!res.success) throw new Error(res.error || 'No se pudo emitir la nota de crédito. Reintentá en unos minutos');
  }, 'Nota de crédito emitida en ARCA');

  if (sale.syncStatus === 'pending') return canRefund ? <small className="sale-return-note">Sincronizá esta venta para poder anularla o devolverla.</small> : null;
  if (!canRefund && !pendingCreditNotes.length) return null;

  async function submit() {
    setError('');
    if (reason.trim().length < 3) { setError('Escribí el motivo de la devolución.'); return; }
    if (amount <= 0) { setError('Elegí al menos una unidad para devolver.'); return; }
    if (cashOut && !shiftId) { setError('Abrí tu caja para devolver efectivo, o elegí otro medio.'); return; }
    const question = mode === 'void' ? `¿Anular la venta ${sale.ticketNumber} por ${money(amount)}?` : `¿Devolver ${money(amount)} de la venta ${sale.ticketNumber}?`;
    if (!await askConfirm(question)) return;
    const items = mode === 'void' ? null : chosen.map((qty, index) => ({ index, qty })).filter(line => line.qty > 0);
    const refund = refundMethod === 'original' ? null : [{ method: refundMethod, amount }];
    let saved: Awaited<ReturnType<typeof retail.returnSale>> | undefined;
    const ok = await run(async () => {
      saved = await retail.returnSale(storeId, sale.id, request.current, items, reason.trim(), refund, cashOut ? shiftId || null : null);
    }, mode === 'void' ? 'Venta anulada' : 'Devolución guardada');
    if (!ok || !saved) return;
    request.current = randomUUID();
    setReason(''); setQuantities({}); setMethod('original'); setMode('void');
    onReturned?.({ ...sale, returnedTotal: Number(saved.returnedTotal), returnStatus: saved.returnStatus });
    await reload();
    if (saved.creditNoteRequired) {
      const id = saved.id;
      void authorizeCreditNote(storeId, id).then(reload);
    }
  }

  return <details className="sale-return" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary><Undo2 size={14} aria-hidden="true" /> {sale.returnStatus === 'voided' ? 'Ver anulación' : pendingCreditNotes.length ? 'Falta nota de crédito' : 'Anular o devolver'}</summary>
    {open && <div className="sale-return-body">
      {loadError && <div className="error-banner" role="alert">{loadError}</div>}
      {!!history?.length && <ul className="sale-return-history" aria-label="Devoluciones de esta venta">
        {history.map(r => <li key={r.id}>
          <strong>{r.kind === 'void' ? 'Anulación' : 'Devolución'} · {money(Number(r.total))}</strong>
          <small>{new Date(r.created_at).toLocaleString('es-AR')} · {r.actor_email || 'Usuario'} · {r.reason}</small>
          {r.credit_note_required && r.credit_note_reference && <small>Nota de crédito: {r.credit_note_reference}{r.cae ? ` · CAE ${r.cae}` : ''}</small>}
          {r.credit_note_required && !r.credit_note_reference && r.credit_note_status && r.credit_note_status !== 'none' && <div className="inline-form">
            <small>{r.credit_note_status === 'error' ? `ARCA rechazó la nota de crédito: ${r.credit_note_error || 'sin detalle'}`
              : r.credit_note_status === 'retry' ? (r.credit_note_error || 'ARCA no respondió. Reintentá en unos minutos') : 'Nota de crédito pendiente de emitir en ARCA'}</small>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => void emitCreditNote(r.id)}>{r.credit_note_status === 'pending' ? 'Emitir nota de crédito' : 'Reintentar'}</button>
          </div>}
          {r.credit_note_required && !r.credit_note_reference && (!r.credit_note_status || r.credit_note_status === 'none' || r.credit_note_status === 'error') && <form className="inline-form" onSubmit={e => {
              e.preventDefault();
              const reference = (creditNote[r.id] || '').trim();
              if (!reference) return;
              void run(() => retail.attachCreditNote(storeId, r.id, reference), 'Nota de crédito registrada')
                .then(async ok => { if (ok) setHistory(await retail.saleReturns(storeId, sale.id).catch(() => history)); });
            }}>
              <label>{r.credit_note_status === 'error' ? 'Si la emitiste por fuera de la app, número de la nota de crédito' : 'Número de la nota de crédito emitida en ARCA'}<input maxLength={120} value={creditNote[r.id] || ''} onChange={e => setCreditNote(prev => ({ ...prev, [r.id]: e.target.value }))} /></label>
              <button className="secondary-button" disabled={busy || !(creditNote[r.id] || '').trim()}>Guardar</button>
            </form>}
        </li>)}
      </ul>}
      {canRefund && sale.returnStatus !== 'voided' && history && <form className="retail-form sale-return-form" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <fieldset className="sale-return-mode" disabled={busy}>
          <legend>¿Qué querés hacer?</legend>
          <label><input type="radio" name={`mode-${sale.id}`} checked={mode === 'void'} onChange={() => setMode('void')} /> Anular {firstReturn ? 'la venta completa' : 'lo que queda'} ({money(remaining)})</label>
          <label><input type="radio" name={`mode-${sale.id}`} checked={mode === 'partial'} disabled={billingPending} onChange={() => setMode('partial')} /> Devolver una parte</label>
        </fieldset>
        {billingPending && <p className="sale-return-note">La factura de esta venta está pendiente. Podés anularla completa; para devolver una parte, primero tiene que quedar facturada.</p>}
        {mode === 'partial' && <div className="sale-return-lines">
          {sale.items.map((item, index) => left[index] > 0 && <label key={index}>
            <span>{item.name} <small>{money(item.unitPrice)} · quedan {left[index]}</small></span>
            <NumberInput min="0" max={String(left[index])} step="1" value={quantities[index] || ''} placeholder="0"
              aria-label={`Unidades de ${item.name} a devolver`} disabled={busy}
              onValueChange={value => setQuantities(prev => ({ ...prev, [index]: value }))} />
          </label>)}
        </div>}
        <label>¿Cómo se devuelve la plata?<select value={method} disabled={busy} onChange={e => setMethod(e.target.value as typeof method)}>
          {asCharged
            ? <option value="original">Como se cobró ({sale.paymentMethod === 'Mixto' ? (sale.payments || []).map(p => methodLabel[p.method]).join(' + ') : methodLabel[sale.paymentMethod as PaymentPart['method']] || sale.paymentMethod})</option>
            : <option value="original">{methodLabel[usual]}</option>}
          {(sale.customerId ? [...methods, 'Fiado' as const] : methods).filter(m => asCharged || m !== usual).map(m => <option key={m} value={m}>{methodLabel[m]}</option>)}
        </select></label>
        {cashOut && !shiftId && <p className="sale-return-note">Para devolver efectivo tenés que tener tu caja abierta. Sale de esa caja, no de la caja donde se cobró.</p>}
        <label>Motivo<textarea required minLength={3} maxLength={300} rows={2} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} placeholder="Ej.: se cobró dos veces, el cliente devolvió un producto" /></label>
        <p className="sale-return-summary">Se devuelven <strong>{money(amount)}</strong>. El stock vuelve a {sale.branchName || 'la sucursal de la venta'}.</p>
        {invoiced && <p className="sale-return-note">Esta venta tiene factura. Después de guardar, emití la nota de crédito en ARCA y cargá su número acá.</p>}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="sale-return-actions"><button className="danger-button-outline" disabled={busy || amount <= 0}>{mode === 'void' ? 'Anular venta' : 'Guardar devolución'}</button></div>
      </form>}
    </div>}
  </details>;
}
