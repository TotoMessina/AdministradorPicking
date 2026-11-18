import { useEffect, useState } from 'react';
import { errorMessage, retail } from '../api';
import type { CaeaStatus } from '../api/billing';
import { formatCaeVto } from '../billing';
import type { BillingSettingsState } from './useBillingSettings';

/**
 * Contingencia CAEA (RG 5782/2025): si ARCA no responde, la venta se factura con el CAEA de la quincena
 * en un punto de venta propio y después se rinde sola. La app pide el CAEA y lo rinde cuando ARCA responde.
 */
export function BillingContingency({ state }: { state: BillingSettingsState }) {
  const { store, active, busy, run } = state;
  const [pto, setPto] = useState(store.punto_venta_caea ? String(store.punto_venta_caea) : '');
  const [status, setStatus] = useState<CaeaStatus | null>(null);
  const [statusError, setStatusError] = useState('');

  useEffect(() => { setPto(store.punto_venta_caea ? String(store.punto_venta_caea) : ''); }, [store.punto_venta_caea]);

  useEffect(() => {
    if (!active || !store.billing_enabled || !store.punto_venta_caea) { setStatus(null); return; }
    let live = true;
    retail.getCaeaStatus(store.id)
      .then(value => { if (live) { setStatus(value); setStatusError(''); } })
      .catch(err => { if (live) setStatusError(errorMessage(err)); });
    return () => { live = false; };
  }, [active, store.id, store.billing_enabled, store.punto_venta_caea]);

  const save = async () => {
    const value = pto.trim() ? Number(pto) : null;
    await run(() => retail.setBillingContingency(store.id, value),
      value ? 'Punto de venta de contingencia guardado. El CAEA se pide solo cuando ARCA responde.' : 'Contingencia CAEA desactivada.');
  };

  return (
    <div className="billing-credentials-box">
      <h4>Contingencia si ARCA no responde (CAEA)</h4>
      <p style={{ marginTop: 0, fontSize: 13, color: 'var(--tone-muted)' }}>
        Si ARCA no responde, la venta se factura con el CAEA de la quincena en un punto de venta propio de contingencia,
        y la app lo rinde sola cuando ARCA vuelve. Dalo de alta en ARCA como punto de venta de contingencia CAEA (Web Services),
        con el mismo domicilio y distinto del de facturación.
      </p>
      <div className="billing-form-grid">
        <div className="billing-field">
          <label htmlFor="billing-pto-caea">
            Punto de venta de contingencia
            <small>Vacío: sin contingencia (la venta espera a que ARCA responda)</small>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="billing-pto-caea" type="number" min={1} max={99998} value={pto} disabled={busy}
              onChange={e => setPto(e.target.value)} style={{ flex: 1 }} />
            <button type="button" className="secondary-button" disabled={busy || !active} onClick={save}>Guardar</button>
          </div>
        </div>
      </div>
      {statusError && <p role="alert">No se pudo consultar la contingencia. {statusError}</p>}
      {status && (
        <ul style={{ fontSize: 13, margin: '8px 0 0', paddingLeft: 18 }}>
          <li>{status.caea ? `CAEA vigente: ${status.caea} (hasta ${formatCaeVto(status.valid_to)})` : 'Todavía no hay CAEA para esta quincena: se pide solo cuando ARCA responde.'}</li>
          <li>{status.numbering_ready ? 'Numeración de contingencia sincronizada con ARCA.' : 'Numeración de contingencia sin sincronizar todavía.'}</li>
          {status.unreported > 0 && <li>Comprobantes con CAEA por rendir: {status.unreported}.</li>}
          {status.report_error && <li role="alert">Último problema al rendir: {status.report_error}</li>}
        </ul>
      )}
    </div>
  );
}
