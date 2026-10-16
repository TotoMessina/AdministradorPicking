import { useEffect, useState } from 'react';
import { exportOfflineBackup, offlineStatus, retryOffline, syncOffline } from './offline';
export function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof offlineStatus>>>({ queue: [], supported: true, syncing: false });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const update = () => { setOnline(navigator.onLine !== false); void offlineStatus().then(s => { if (active) setStatus(s); }).catch(() => { if (active) setError('No se pudo leer el almacenamiento local.'); }); };
    const connect = () => { update(); void syncOffline(); };
    const workerUpdate = (event: MessageEvent) => { if (event.data?.type === 'retail-sync-updated') window.dispatchEvent(new Event('retail-local-change')); };
    navigator.serviceWorker?.addEventListener('message', workerUpdate);
    update(); void syncOffline();
    window.addEventListener('online', connect); window.addEventListener('offline', update); window.addEventListener('retail-local-change', update);
    const timer = setInterval(() => { update(); void syncOffline(); }, 15000);
    return () => { active = false; clearInterval(timer); navigator.serviceWorker?.removeEventListener('message', workerUpdate); window.removeEventListener('online', connect); window.removeEventListener('offline', update); window.removeEventListener('retail-local-change', update); };
  }, []);
  const conflict = status.queue.find(q => q.error);
  return <div className={`offline-status ${conflict || error ? 'has-conflict' : ''}`} role="status">
    <span>{!status.supported ? 'Este navegador no permite guardar offline' : !online ? 'Sin conexión · guardando en este dispositivo' : status.syncing ? 'Sincronizando…' : status.queue.length ? 'Operaciones guardadas en este dispositivo' : 'Conectado · datos locales disponibles'}</span>
    {status.queue.length > 0 && <details><summary>{status.queue.length} operaciones pendientes{conflict ? ' · revisar' : ''}</summary>
      {conflict && <p>No se descartó ninguna operación. {conflict.error} Corregí la causa con el administrador y reintentá.</p>}
      <ol>{status.queue.slice(0, 20).map(q => <li key={q.operation.id}>{({ sale: 'Venta', open: 'Apertura', close: 'Cierre', movement: 'Movimiento', stock: 'Stock' })[q.operation.kind]} · {new Date(q.operation.at).toLocaleString('es-AR')} · {q.operation.id.slice(0, 8)}{q.error ? ` — ${q.error}` : ''}</li>)}</ol>
      <button type="button" className="secondary-button" disabled={!online || status.syncing} onClick={() => void retryOffline().catch(e => setError(String(e)))}>Reintentar sincronización</button>
      <button type="button" className="text-button" onClick={() => void exportOfflineBackup().catch(e => setError(String(e)))}>Descargar respaldo</button>
      <small>Conservá este dispositivo hasta sincronizar. No borres sus datos del navegador.</small>
    </details>}
    {error && <span>{error}</span>}
  </div>;
}
