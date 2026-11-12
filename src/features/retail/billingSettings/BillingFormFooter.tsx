import { AlertCircle, ShieldCheck } from 'lucide-react';
import type { BillingSettingsState } from './useBillingSettings';

/** Activación, aviso, error y botones del formulario fiscal. */
export function BillingFormFooter({ state }: { state: BillingSettingsState }) {
  const {
    busy, billingEnabled, setBillingEnabled, isDirty, setIsDirty, error, setError, canEnable,
    handleReset,
  } = state;
  return (
    <>
      <div className="billing-switch-section">
        <label className="permission-switch">
          <span className="permission-switch-label">
            <strong>Activar facturación electrónica ARCA</strong>
            <br />
            <small style={{ color: 'var(--tone-muted)' }}>
              Al emitir cada venta, se solicitará automáticamente el CAE a ARCA. Si el servicio de ARCA se encuentra temporalmente no disponible, la venta se completa igual y se reintenta en segundo plano.
            </small>
          </span>
          <span className="permission-switch-control">
            <input
              type="checkbox"
              role="switch"
              checked={billingEnabled}
              disabled={busy || (!canEnable && !billingEnabled)}
              aria-label="Activar facturación electrónica ARCA"
              onChange={(e) => {
                const next = e.target.checked;
                if (next && !canEnable) {
                  setError('Completá y validá CUIT, Razón Social, Condición IVA y Punto de Venta para poder activar.');
                  return;
                }
                setBillingEnabled(next);
                setIsDirty(true);
                setError('');
              }}
            />
            <span className="permission-switch-track" aria-hidden="true" />
          </span>
        </label>
        {!canEnable && !billingEnabled && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--tone-muted)' }}>
            ℹ️ Para activar, completá los datos obligatorios arriba (CUIT válido, Razón Social, Condición IVA y Punto de Venta).
          </p>
        )}
      </div>

      <div className="billing-info-banner">
        <ShieldCheck size={18} />
        <div>
          <strong>Seguridad y certificados digitales:</strong>
          <br />
          Los certificados de acceso a ARCA (WSAA) se almacenan exclusivamente en el servidor backend seguro. Tu clave privada nunca viaja al navegador ni se expone a los cajeros.
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className="button-row" style={{ marginTop: 14 }}>
        <button
          type="submit"
          className="primary-button"
          disabled={busy || !isDirty}
        >
          Guardar datos fiscales
        </button>
        {isDirty && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={handleReset}
          >
            Cancelar
          </button>
        )}
      </div>
    </>
  );
}
