import { useRef, useState } from 'react';
import { errorMessage, retail, type DepotAction, type DepotMovement } from './api';

const labels: Record<DepotAction, string> = { receive: 'Ingreso a depósito', to_salon: 'Depósito → Salón', to_depot: 'Salón → Depósito' };
export function DepotHistory({ store, product, active }: { store: string; product: string; active: boolean }) {
  const [rows, setRows] = useState<DepotMovement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const working = useRef(false);
  return <details className="depot-history"><summary>Historial de depósito</summary>
    <button type="button" className="text-button" disabled={!active || loading} onClick={async () => {
      if (!active || working.current) return;
      working.current = true; setLoading(true); setError('');
      try { setRows(await retail.depotMovements(store, product)); setLoaded(true); }
      catch (reason) { setError(errorMessage(reason)); }
      finally { working.current = false; setLoading(false); }
    }}>{loading ? 'Cargando…' : loaded ? 'Actualizar historial' : 'Consultar movimientos'}</button>
    {error && <p role="alert">{error}</p>}
    {loaded && !rows.length && <p>No hay movimientos de depósito para este producto.</p>}
    <ul>{rows.map(row => <li key={row.id}><strong>{labels[row.action]} · {row.quantity.toLocaleString('es-AR')} u.</strong>
      <small>{new Date(row.created_at).toLocaleString('es-AR')} · {row.actor_email || 'Usuario del comercio'}</small>
      <small>Salón: {(row.total_after - row.depot_after).toLocaleString('es-AR')} · Depósito: {row.depot_after.toLocaleString('es-AR')} · Total: {row.total_after.toLocaleString('es-AR')}</small>
    </li>)}</ul>
    {rows.length === 30 && <small>Se muestran los últimos 30 movimientos de este producto.</small>}
  </details>;
}
