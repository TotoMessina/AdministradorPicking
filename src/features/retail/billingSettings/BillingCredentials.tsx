import { AlertCircle, CheckCircle2, Key, Server } from 'lucide-react';
import type { BillingSettingsState } from './useBillingSettings';
import { BillingCredentialsForm } from './BillingCredentialsForm';

/** Certificados de ARCA: estado, prueba de conexión y avisos. */
export function BillingCredentials({ state }: { state: BillingSettingsState }) {
  const {
    busy, credentialsStatus, showCredsForm, setShowCredsForm, savingCreds, credsSuccessMsg,
    setCredsSuccessMsg, testingConnection, testResult, handleTestConnection,
  } = state;
  return (
    <>
      {/* Sección: Certificados Digitales ARCA */}
      <div className="billing-credentials-box">
        <h4>
          <Key size={18} style={{ color: '#0284c7' }} /> Certificados Digitales de ARCA (AFIP)
        </h4>
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--tone-muted)' }}>
          Se utilizan para firmar digitalmente cada factura ante los servidores oficiales de AFIP (WSAA / WSFE). Se almacenan de forma segura y nunca se exponen al navegador.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            {credentialsStatus?.configured ? (
              <span className="billing-status-badge billing-status-authorized">
                <CheckCircle2 size={13} /> Certificado digital activo ({credentialsStatus.environment === 'prod' ? 'Producción Oficial' : 'Homologación Testing'})
              </span>
            ) : (
              <span className="billing-status-badge billing-status-pending">
                ⚠️ Pendiente de cargar certificado digital
              </span>
            )}
            {credentialsStatus?.updated_at && (
              <small style={{ display: 'block', color: 'var(--tone-muted)', fontSize: '11px', marginTop: 4 }}>
                Última actualización: {new Date(credentialsStatus.updated_at).toLocaleDateString('es-AR')}
              </small>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {credentialsStatus?.configured && (
              <button
                type="button"
                className="secondary-button"
                disabled={busy || testingConnection}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px' }}
                onClick={handleTestConnection}
              >
                <Server size={14} />
                {testingConnection ? 'Verificando con AFIP…' : 'Probar conexión con ARCA'}
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              disabled={busy || savingCreds}
              style={{ fontSize: '12px' }}
              onClick={() => {
                setShowCredsForm(prev => !prev);
                setCredsSuccessMsg('');
              }}
            >
              {showCredsForm ? 'Ocultar formulario' : credentialsStatus?.configured ? 'Reemplazar certificado' : '+ Cargar Certificado y Clave'}
            </button>
          </div>
        </div>

        {/* Resultado de prueba de conexión */}
        {testResult && (
          <div className={`billing-test-box ${testResult.success ? 'billing-test-success' : 'billing-test-error'}`}>
            {testResult.success ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <CheckCircle2 size={16} />
                  <strong>Conexión exitosa y validada con los servidores de ARCA (AFIP).</strong>
                </div>
                <span>
                  Entorno: <strong>{testResult.environment}</strong> · Punto de Venta validado: <strong>N° {testResult.puntoVenta}</strong> · Último comprobante oficial registrado en AFIP: <strong>N° {testResult.ultimoComprobante}</strong>
                </span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <AlertCircle size={16} />
                  <strong>No se pudo conectar o validar con ARCA:</strong>
                </div>
                <p style={{ margin: '4px 0', fontFamily: 'monospace', fontSize: '12px' }}>
                  {testResult.error}
                </p>
                {/* Diagnóstico contextual automático */}
                {testResult.error?.toLowerCase().includes('10004') || testResult.error?.toLowerCase().includes('no autorizado') || testResult.error?.toLowerCase().includes('relacion') ? (
                  <div className="billing-alert-tip" style={{ marginTop: 8 }}>
                    ℹ️ <strong>Causa probable:</strong> Falta completar el Paso 3. El alias de tu certificado no está vinculado al servicio WSFE en el <em>Administrador de Relaciones de Clave Fiscal</em> en afip.gob.ar.
                  </div>
                ) : testResult.error?.toLowerCase().includes('10016') || testResult.error?.toLowerCase().includes('punto de venta') ? (
                  <div className="billing-alert-tip" style={{ marginTop: 8 }}>
                    ℹ️ <strong>Causa probable:</strong> El punto de venta no está dado de alta en AFIP con el tipo <em>'Factura Electrónica - Web Services'</em> o el número no coincide.
                  </div>
                ) : testResult.error?.toLowerCase().includes('function') || testResult.error?.toLowerCase().includes('deploy') ? (
                  <div className="billing-alert-tip" style={{ marginTop: 8 }}>
                    ℹ️ <strong>Causa probable:</strong> La Edge Function de Supabase no está desplegada en el proyecto remoto. Ejecutá en terminal: <code>npx supabase functions deploy billing-authorize</code>.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {credsSuccessMsg && (
          <p role="status" style={{ color: '#16a34a', fontSize: '13px', margin: '10px 0 0', fontWeight: 600 }}>
            {credsSuccessMsg}
          </p>
        )}

        <BillingCredentialsForm state={state} />
      </div>
    </>
  );
}
