import { useRef, useState } from 'react';
import { errorMessage, retail, type Store } from './api';
import type { Run } from './Management';
import './depot.css';

export function DepotSettings({ store, busy, run, active = true }: { store: Store; busy: boolean; run: Run; active?: boolean }) {
  const saving = useRef(false);
  const [error, setError] = useState('');
  const enabled = !!store.depot_enabled;
  return <section className="retail-panel depot-settings permission-form">
    <label className="permission-switch">
      <span className="permission-switch-label">Usar depósito <small>(opcional)</small></span>
      <span className="permission-switch-control">
        <input type="checkbox" role="switch" checked={enabled} disabled={busy || !active} aria-label="Usar depósito"
          onChange={async event => {
            if (!active || busy || saving.current) return;
            const next = event.target.checked;
            saving.current = true; setError('');
            try {
              await run(async () => {
                try { await retail.setDepot(store.id, next); }
                catch (reason) { setError(errorMessage(reason)); throw reason; }
              }, next ? 'Depósito habilitado. El stock actual sigue en salón.' : 'Depósito desactivado.');
            } finally { saving.current = false; }
          }} />
        <span className="permission-switch-track" aria-hidden="true" />
      </span>
    </label>
    <p>{enabled ? 'Salón y depósito son compartidos entre tus locales. Mové o recibí mercadería desde Productos → Reponer.' : 'Separá lo guardado de lo disponible para vender. Al activar, todas las existencias actuales siguen en salón.'}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
