import { RotateCw } from 'lucide-react';
import { formatComprobanteNro, getComprobanteTipoLabel } from '../billing';
import type { BillingSettingsState } from './useBillingSettings';

/** Métricas fiscales del comercio. */
export function BillingFiscalStats({ state }: { state: BillingSettingsState }) {
  const { store, active, fiscalStats, fiscalStatsError, fiscalStatsLoading, setFiscalStatsRefresh } = state;
  return (
    <>
      {store.billing_enabled && fiscalStatsLoading && (
        <p role="status">Consultando estado de facturación…</p>
      )}
      {store.billing_enabled && fiscalStatsError && (
        <div className="billing-alert-tip" style={{ flexWrap: 'wrap' }}>
          <p role="alert" style={{ margin: 0, flex: '1 1 220px', overflowWrap: 'anywhere' }}>{fiscalStatsError}</p>
          <button type="button" className="secondary-button" disabled={!active || fiscalStatsLoading}
            onClick={() => setFiscalStatsRefresh(value => value + 1)}>
            <RotateCw size={14} /> Reintentar consulta
          </button>
        </div>
      )}
      {/* Mostrar métricas únicamente después de una respuesta válida. */}
      {store.billing_enabled && fiscalStats && (
        <div
          className="billing-stats-monitor"
          style={{
            background: 'var(--tone-soft)',
            border: '1px solid var(--tone-border)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <div>
            <span style={{ color: 'var(--tone-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Punto de venta fiscal
            </span>
            <strong>Pto. Vta. N° {store.punto_venta_afip || 1}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--tone-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Último comprobante emitido
            </span>
            <strong>
              {fiscalStats.lastCbteNro
                ? `${getComprobanteTipoLabel(fiscalStats.lastCbteTipo)} N° ${formatComprobanteNro(store.punto_venta_afip, fiscalStats.lastCbteNro)}`
                : 'Aún no se emitieron comprobantes'}
            </strong>
            {fiscalStats.lastDate && (
              <small style={{ display: 'block', color: 'var(--tone-muted)', fontSize: '11px' }}>
                {new Date(fiscalStats.lastDate).toLocaleString('es-AR')}
              </small>
            )}
          </div>
          <div>
            <span style={{ color: 'var(--tone-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estado de emisión
            </span>
            {fiscalStats.errorCount > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ {fiscalStats.errorCount} {fiscalStats.errorCount === 1 ? 'error pendiente' : 'errores pendientes'}</span>
            ) : fiscalStats.pendingCount > 0 ? (
              <span style={{ color: '#d97706', fontWeight: 600 }}>⏳ {fiscalStats.pendingCount} en cola de autorización</span>
            ) : (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Al día (sin pendientes)</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
