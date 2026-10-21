import { useRef, useState } from 'react';
import type { KioscoSale } from '../../types/kiosco';
import { retail, errorMessage, type SalesLedger, type SaleLedgerChange } from './api';
import { randomUUID } from '../../utils/uuid';

export function SaleLedgerControl({ storeId, sale, ledgers, disabled, onMoved, showHistory = false }: {
  storeId: string; sale: KioscoSale; ledgers: SalesLedger[]; disabled?: boolean;
  onMoved: (sale: KioscoSale) => void; showHistory?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SaleLedgerChange[] | null>(null);
  const running = useRef(false);
  const request = useRef({ signature: '', id: '' });
  const status = useRef<HTMLSpanElement>(null);
  const targets = ledgers.filter(ledger => ledger.active && ledger.id !== sale.ledgerId);
  const move = async (target: string) => {
    if (running.current || !sale.ledgerId) return;
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
    {targets.length === 1 ? <button type="button" className="text-button" disabled={disabled || busy || sale.syncStatus === 'pending'}
      onClick={() => void move(targets[0].id)}>Pasar a {targets[0].name}</button> : targets.length > 1 ? <details>
      <summary>Cambiar registro</summary>
      <div className="button-row">{targets.map(target => <button type="button" className="secondary-button" key={target.id}
        disabled={disabled || busy || sale.syncStatus === 'pending'} onClick={() => void move(target.id)}>Pasar a {target.name}</button>)}</div>
    </details> : null}
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
        {change.from_name} → {change.to_name} · {new Date(change.changed_at).toLocaleString('es-AR')} · Usuario: {change.changed_by}
      </li>)}</ul> : <small>No hay cambios de registro.</small>)}
    </>}
  </div>;
}
