import { CheckCircle2, FileText } from 'lucide-react';
import type { BillingSettingsState } from './useBillingSettings';

/** Encabezado con el estado de la facturación. */
export function BillingSettingsHeader({ state }: { state: BillingSettingsState }) {
  const { store, isConfigured } = state;
  return (
    <>
      <div className="store-settings-header">
        <div
          className="store-settings-header-icon"
          style={{ backgroundColor: 'color-mix(in srgb, #0284c7 15%, transparent)', color: '#0284c7' }}
        >
          <FileText size={22} />
        </div>
        <div className="store-settings-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3>Facturación electrónica ARCA (ex AFIP)</h3>
            {store.billing_enabled ? (
              <span className="billing-status-badge billing-status-authorized">
                <CheckCircle2 size={13} /> Facturación activada
              </span>
            ) : isConfigured ? (
              <span className="billing-status-badge billing-status-pending">
                Lista para activar
              </span>
            ) : (
              <span className="billing-status-badge billing-status-none">
                Sin configurar
              </span>
            )}
          </div>
          <p>
            Emití comprobantes oficiales electrónicos con CAE (Facturas B y C) conectados a los servicios de ARCA. Es optativo y no interrumpe tus ventas.
          </p>
        </div>
      </div>
    </>
  );
}
