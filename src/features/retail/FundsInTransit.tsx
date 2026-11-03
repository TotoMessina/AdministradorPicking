import { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Undo2 } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { askConfirm } from '../../components/ConfirmHost';
import type { Run } from './Management';
import { locationTransfers, type FundTransfer } from './locationTransferApi';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
// Pasado este tiempo, un envío sin confirmar se marca para revisar.
const REVIEW_AFTER_HOURS = 24;

/** Plata que salió de una ubicación y todavía no se confirmó en la otra. */
export function FundsInTransit({ storeId, transfers, placeName, run, disabled, onChanged }: {
  storeId: string; transfers: FundTransfer[]; placeName: (id: string | null) => string; run: Run; disabled: boolean; onChanged: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState<{ id: string; mode: 'partial' | 'return' } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const pending = transfers.filter(row => row.status === 'in_transit');
  if (!pending.length) return null;

  const finish = async (ok: boolean) => { if (ok) { setOpen(null); setAmount(''); setNote(''); setError(''); await onChanged(); } };
  const receiveAll = async (row: FundTransfer) => {
    if (!await askConfirm(`¿Confirmar que llegaron ${money(row.amount)} a ${placeName(row.to_location)}?`)) return;
    await finish(await run(() => locationTransfers.receiveFunds(storeId, row.id, row.amount, ''), 'Plata recibida'));
  };
  const submit = async (row: FundTransfer) => {
    if (!open) return;
    if (!note.trim()) { setError(open.mode === 'return' ? 'Escribí por qué vuelve al origen.' : 'Escribí qué pasó con la diferencia.'); return; }
    if (open.mode === 'return') {
      await finish(await run(() => locationTransfers.returnFunds(storeId, row.id, note.trim()), 'La plata volvió al origen'));
      return;
    }
    const value = Number(amount);
    if (!(value >= 0) || value > row.amount) { setError(`Lo recibido debe estar entre $0 y ${money(row.amount)}.`); return; }
    await finish(await run(() => locationTransfers.receiveFunds(storeId, row.id, value, note.trim()), value < row.amount ? `Recibido con un faltante de ${money(row.amount - value)}` : 'Plata recibida'));
  };

  return <section className="funds-in-transit" aria-labelledby="funds-in-transit-title">
    <h3 id="funds-in-transit-title">Plata en camino ({pending.length})</h3>
    <p>Ya salió del origen y entra al destino cuando alguien confirma cuánto llegó.</p>
    <ul>{pending.map(row => {
      const hours = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
      const late = hours >= REVIEW_AFTER_HOURS;
      return <li key={row.id} className={late ? 'is-late' : undefined}>
        <div className="funds-in-transit-head">
          <strong>{money(row.amount)}</strong>
          <span>{placeName(row.from_location)} <ArrowRight size={13} aria-hidden="true" /> {placeName(row.to_location)}</span>
        </div>
        <small>Salió {new Date(row.created_at).toLocaleString('es-AR')}{row.actor_email ? ` · ${row.actor_email}` : ''} · {row.note}</small>
        {late && <small className="funds-in-transit-late"><AlertTriangle size={13} aria-hidden="true" /> Hace {hours >= 48 ? `${Math.floor(hours / 24)} días` : `${Math.floor(hours)} horas`} que no se confirma: revisalo.</small>}
        {open?.id === row.id ? <form className="retail-form funds-in-transit-form" onSubmit={event => { event.preventDefault(); void submit(row); }}>
          {open.mode === 'partial' && <label>¿Cuánto llegó?<NumberInput min={0} max={row.amount} step={0.01} value={amount} onValueChange={setAmount} /></label>}
          <label>{open.mode === 'return' ? '¿Por qué vuelve al origen?' : '¿Qué pasó con la diferencia?'}<textarea rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label>
          {error && <p role="alert" className="error-banner">{error}</p>}
          <div className="location-transfer-record-actions">
            <button className="primary-button" disabled={disabled}>{open.mode === 'return' ? 'Devolver al origen' : 'Guardar lo recibido'}</button>
            <button type="button" className="secondary-button" disabled={disabled} onClick={() => { setOpen(null); setError(''); }}>Cancelar</button>
          </div>
        </form> : <div className="location-transfer-record-actions">
          <button type="button" className="primary-button" disabled={disabled} onClick={() => void receiveAll(row)}><Check size={14} /> Llegó todo</button>
          <button type="button" className="secondary-button" disabled={disabled} onClick={() => { setOpen({ id: row.id, mode: 'partial' }); setAmount(String(row.amount)); setNote(''); setError(''); }}>Llegó otro importe</button>
          <button type="button" className="text-button" disabled={disabled} onClick={() => { setOpen({ id: row.id, mode: 'return' }); setNote(''); setError(''); }}><Undo2 size={14} /> No llegó</button>
        </div>}
      </li>;
    })}</ul>
  </section>;
}
