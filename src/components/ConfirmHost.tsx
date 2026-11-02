import { useEffect, useRef, useState } from 'react';

type Request = { message: string; resolve: (accepted: boolean) => void };
let show: ((request: Request) => void) | null = null;

/** Reemplaza a window.confirm, que algunos navegadores integrados cancelan sin mostrar. */
export const askConfirm = (message: string) => new Promise<boolean>(resolve => {
  if (show) show({ message, resolve });
  else resolve(window.confirm(message));
});

const risky = /^¿(Eliminar|Quitar|Anular|Revocar|Olvidar|Descartar)/;
const acceptLabel = (message: string) => {
  const verb = message.match(/^¿([A-Za-zÁÉÍÓÚáéíóúñ]+r)\b/)?.[1];
  return verb ? `Sí, ${verb.toLowerCase()}` : 'Sí, continuar';
};

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const safe = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    show = next => setRequest(previous => { previous?.resolve(false); return next; });
    return () => { show = null; };
  }, []);
  useEffect(() => { safe.current?.focus(); }, [request]);
  if (!request) return null;
  const answer = (accepted: boolean) => { request.resolve(accepted); setRequest(null); };
  const danger = risky.test(request.message);
  return <div className="confirm-host" role="dialog" aria-modal="true" aria-label="Confirmar" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); answer(false); } }}>
    <div className="confirm-host-card">
      <p>{request.message}</p>
      <div className="confirm-host-actions">
        <button ref={safe} type="button" className="secondary-button" onClick={() => answer(false)}>No, volver</button>
        <button type="button" className={danger ? 'danger-button' : 'primary-button'} onClick={() => answer(true)}>{acceptLabel(request.message)}</button>
      </div>
    </div>
  </div>;
}
