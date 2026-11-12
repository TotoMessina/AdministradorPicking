import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import type { BillingSettingsState } from './useBillingSettings';

/** Lista de pasos para habilitar la facturación y botón de la guía. */
export function BillingChecklist({ state }: { state: BillingSettingsState }) {
  const {
    store, showGuide, setShowGuide, credentialsStatus, testResult, isCuitValid, ptoVtaNum, isPtoVtaValid,
    isRazonValid,
  } = state;
  return (
    <>
      {/* Checklist de Progreso de Habilitación */}
      <div className="billing-checklist">
        <div className="billing-checklist-item">
          <span className={`billing-checklist-dot ${isCuitValid && isRazonValid ? 'billing-checklist-done' : 'billing-checklist-pending'}`}>
            {isCuitValid && isRazonValid ? '✓' : '1'}
          </span>
          <span>
            <strong>Datos del comercio</strong>
            <br />
            <small style={{ color: 'var(--tone-muted)' }}>
              {isCuitValid ? 'CUIT verificado' : 'CUIT pendiente'}
            </small>
          </span>
        </div>

        <div className="billing-checklist-item">
          <span className={`billing-checklist-dot ${isPtoVtaValid ? 'billing-checklist-done' : 'billing-checklist-pending'}`}>
            {isPtoVtaValid ? '✓' : '2'}
          </span>
          <span>
            <strong>Pto. Vta. Web Services</strong>
            <br />
            <small style={{ color: 'var(--tone-muted)' }}>
              {isPtoVtaValid ? `N° ${ptoVtaNum}` : 'Falta definir'}
            </small>
          </span>
        </div>

        <div className="billing-checklist-item">
          <span className={`billing-checklist-dot ${credentialsStatus?.configured ? 'billing-checklist-done' : 'billing-checklist-pending'}`}>
            {credentialsStatus?.configured ? '✓' : '3'}
          </span>
          <span>
            <strong>Certificado digital</strong>
            <br />
            <small style={{ color: 'var(--tone-muted)' }}>
              {credentialsStatus?.configured ? 'Cargado y activo' : 'Pendiente de carga'}
            </small>
          </span>
        </div>

        <div className="billing-checklist-item">
          <span className={`billing-checklist-dot ${testResult?.success ? 'billing-checklist-done' : 'billing-checklist-pending'}`}>
            {testResult?.success ? '✓' : '4'}
          </span>
          <span>
            <strong>Prueba con AFIP</strong>
            <br />
            <small style={{ color: 'var(--tone-muted)' }}>
              {testResult?.success ? 'Conexión validada' : 'Pendiente de prueba'}
            </small>
          </span>
        </div>

        <div className="billing-checklist-item">
          <span className={`billing-checklist-dot ${store.billing_enabled ? 'billing-checklist-done' : 'billing-checklist-pending'}`}>
            {store.billing_enabled ? '✓' : '5'}
          </span>
          <span>
            <strong>Facturación activa</strong>
            <br />
            <small style={{ color: 'var(--tone-muted)' }}>
              {store.billing_enabled ? 'Emisión en vivo' : 'Inactiva'}
            </small>
          </span>
        </div>
      </div>

      {/* Botón para desplegar la Guía Paso a Paso */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="secondary-button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: '13px',
            border: '1px solid color-mix(in srgb, #0284c7 40%, transparent)',
            color: '#0284c7',
            backgroundColor: showGuide ? 'color-mix(in srgb, #0284c7 10%, transparent)' : 'transparent',
          }}
          onClick={() => setShowGuide(prev => !prev)}
        >
          <HelpCircle size={16} />
          {showGuide ? 'Ocultar guía de habilitación AFIP' : '📖 ¿Cómo habilitar mi comercio en AFIP? Guía paso a paso'}
          {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
    </>
  );
}
