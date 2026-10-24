import { useEffect, useState, useRef } from 'react';
import { exportOfflineBackup, offlineStatus, retryOffline, syncOffline } from './offline';

export function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof offlineStatus>>>({ queue: [], supported: true, syncing: false });
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const detailsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    const update = () => {
      setOnline(navigator.onLine !== false);
      void offlineStatus()
        .then((s) => {
          if (active) setStatus(s);
        })
        .catch(() => {
          if (active) setError('No se pudo leer el almacenamiento local.');
        });
    };
    const connect = () => {
      update();
      void syncOffline();
    };
    const workerUpdate = (event: MessageEvent) => {
      if (event.data?.type === 'retail-sync-updated') window.dispatchEvent(new Event('retail-local-change'));
    };
    navigator.serviceWorker?.addEventListener('message', workerUpdate);
    update();
    void syncOffline();
    window.addEventListener('online', connect);
    window.addEventListener('offline', update);
    window.addEventListener('retail-local-change', update);
    const timer = setInterval(() => {
      update();
      void syncOffline();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
      navigator.serviceWorker?.removeEventListener('message', workerUpdate);
      window.removeEventListener('online', connect);
      window.removeEventListener('offline', update);
      window.removeEventListener('retail-local-change', update);
    };
  }, []);

  // Close details popover when clicking outside
  useEffect(() => {
    if (!showDetails) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        setShowDetails(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDetails]);

  const conflict = status.queue.find((q) => q.error);
  const isOk = status.supported && online && !status.syncing && !status.queue.length && !conflict && !error;
  const isSyncing = status.syncing;

  const statusText = !status.supported
    ? 'Este navegador no permite guardar offline'
    : !online
      ? 'Sin conexión · guardando en este dispositivo'
      : status.syncing
        ? 'Sincronizando…'
        : status.queue.length
          ? `${status.queue.length} operaciones guardadas en este dispositivo`
          : 'Conectado · datos locales disponibles';

  const dotClass = isSyncing ? 'dot-syncing' : isOk ? 'dot-online' : 'dot-offline';

  return (
    <span className="offline-status-indicator" role="status" aria-label={statusText} ref={detailsRef}>
      <button
        type="button"
        className="offline-status-dot-btn"
        title={statusText}
        aria-label={statusText}
        onClick={() => {
          if (status.queue.length > 0 || conflict || error) {
            setShowDetails((prev) => !prev);
          }
        }}
      >
        <span className={`offline-status-dot ${dotClass}`} />
      </button>

      {/* Tooltip al poner el cursor encima */}
      <span className="offline-status-tooltip" role="tooltip">
        {statusText}
      </span>

      {/* Popover flotante con detalles si hay pendientes o conflicto */}
      {showDetails && (
        <div className="offline-status-popover" role="dialog" aria-label="Detalles de sincronización">
          <div className="offline-status-popover-header">
            <strong>Estado de sincronización</strong>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowDetails(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <p className="offline-status-popover-msg">{statusText}</p>
          {status.queue.length > 0 && (
            <div className="offline-status-queue">
              <span className="queue-title">{status.queue.length} operaciones pendientes{conflict ? ' · revisar' : ''}</span>
              {conflict && (
                <p className="conflict-alert">
                  No se descartó ninguna operación. {conflict.error}. Corregí la causa y reintentá.
                </p>
              )}
              <ol className="queue-list">
                {status.queue.slice(0, 10).map((q) => (
                  <li key={q.operation.id}>
                    {({ sale: 'Venta', open: 'Apertura', close: 'Cierre', close_details: 'Cierre con billetes', movement: 'Movimiento', stock: 'Stock' })[q.operation.kind]} ·{' '}
                    {new Date(q.operation.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    {q.error ? ` — ${q.error}` : ''}
                  </li>
                ))}
              </ol>
              <div className="offline-status-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!online || status.syncing}
                  onClick={() => void retryOffline().catch((e) => setError(String(e)))}
                >
                  Reintentar sincronización
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void exportOfflineBackup().catch((e) => setError(String(e)))}
                >
                  Descargar respaldo
                </button>
              </div>
            </div>
          )}
          {error && <span className="error-text">{error}</span>}
        </div>
      )}
    </span>
  );
}

