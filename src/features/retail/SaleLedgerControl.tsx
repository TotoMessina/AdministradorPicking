import { useRef, useState } from 'react';
import type { KioscoSale } from '../../types/kiosco';
import { retail, errorMessage, type SalesLedger, type SaleLedgerChange } from './api';
import { randomUUID } from '../../utils/uuid';

export function SaleLedgerControl({ storeId, sale, ledgers, disabled, onMoved, showHistory = false, canMove = true }: {
  storeId: string; sale: KioscoSale; ledgers: SalesLedger[]; disabled?: boolean;
  onMoved: (sale: KioscoSale) => void; showHistory?: boolean; canMove?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SaleLedgerChange[] | null>(null);
  const running = useRef(false);
  const request = useRef({ signature: '', id: '' });
  const status = useRef<HTMLSpanElement>(null);
  const targets = ledgers.filter(ledger => ledger.active && ledger.id !== sale.ledgerId);
  const currentName = ledgers.find(ledger => ledger.id === sale.ledgerId)?.name || sale.ledgerName;
  const quickTarget = targets.length === 1 ? targets[0] : targets.find(ledger =>
    (currentName === 'General' && ledger.name === 'Pruebas') || (currentName === 'Pruebas' && ledger.name === 'General'));
  const otherTargets = targets.filter(ledger => ledger.id !== quickTarget?.id);
  const move = async (target: string) => {
    if (running.current || !sale.ledgerId || !canMove) return;
    running.current = true; setBusy(true); setError(''); setMessage('');
    const signature = JSON.stringify([storeId, sale.id, sale.ledgerId, target]);
    if (signature !== request.current.signature) request.current = { signature, id: randomUUID() };
    try {
      const saved = await retail.moveSaleLedger(storeId, sale.id, target, sale.ledgerId, request.current.id);
      request.current = { signature: '', id: '' };
      onMoved(saved); setHistory(null);
      setMessage(`Venta guardada en ${saved.ledgerName}.`);
      status.current?.focus({ preventScroll: true });
    } catch (e) { setError(errorMessage(e)); }
    finally { running.current = false; setBusy(false); }
  };
  return <div className="sale-ledger-control">
    <span tabIndex={-1} ref={status}>Registro: <strong>{sale.ledgerName || 'Sin registro'}</strong></span>
    {canMove && quickTarget && <button type="button" className="text-button" disabled={disabled || busy || sale.syncStatus === 'pending'}
      onClick={() => void move(quickTarget.id)}>Pasar a {quickTarget.name}</button>}
    {canMove && otherTargets.length > 0 && <details>
      <summary>{quickTarget ? 'Otros registros' : 'Cambiar registro'}</summary>
      <div className="button-row">{otherTargets.map(target => <button type="button" className="secondary-button" key={target.id}
        disabled={disabled || busy || sale.syncStatus === 'pending'} onClick={() => void move(target.id)}>Pasar a {target.name}</button>)}</div>
    </details>}
    {sale.syncStatus === 'pending' && <small>Podés cambiarlo cuando se sincronice la venta.</small>}
    {busy && <small role="status">Actualizando…</small>}
    {message && <small role="status">{message}</small>}
    {error && <small role="alert">{error}</small>}
    {showHistory && <>
      <button type="button" className="text-button" disabled={busy || disabled} onClick={async () => {
        if (history) { setHistory(null); return; }
        if (running.current) return;
        running.current = true; setBusy(true); setError('');
        try { setHistory(await retail.saleLedgerHistory(storeId, sale.id)); }
        catch (e) { setError(errorMessage(e)); }
        finally { running.current = false; setBusy(false); }
      }}>{history ? 'Ocultar cambios' : 'Ver cambios de registro'}</button>
      {history && (history.length ? <ul>{history.map(change => <li key={change.id}>
        {change.from_name} → {change.to_name} · {new Date(change.changed_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} · Usuario: {change.changed_by}
      </li>)}</ul> : <small>No hay cambios de registro.</small>)}
    </>}
  </div>;
}
