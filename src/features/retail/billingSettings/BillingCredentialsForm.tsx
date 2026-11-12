import { Upload } from 'lucide-react';
import type { BillingSettingsState } from './useBillingSettings';

/** Carga del certificado y la clave, o generación asistida. */
export function BillingCredentialsForm({ state }: { state: BillingSettingsState }) {
  const {
    busy, showCredsForm, setShowCredsForm, certContent, setCertContent, keyContent, setKeyContent,
    certFileName, keyFileName, environment, setEnvironment, savingCreds, handleCertFileSelect,
    handleKeyFileSelect, handleSaveCredentials,
  } = state;
  return (
    <>
      {/* Formulario para cargar .crt y .key */}
      {showCredsForm && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--tone-border)' }}>
          <div className="billing-field" style={{ marginBottom: 12 }}>
            <label>
              Entorno de ARCA / AFIP
              <small>Empezá en homologación: son facturas de prueba, sin validez fiscal. Producción emite facturas reales.</small>
            </label>
            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="arca_env"
                  value="homo"
                  checked={environment === 'homo'}
                  onChange={() => setEnvironment('homo')}
                />
                <span>Homologación (pruebas)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="arca_env"
                  value="prod"
                  checked={environment === 'prod'}
                  onChange={() => setEnvironment('prod')}
                />
                <strong>Producción</strong> (facturas reales)
              </label>
            </div>
          </div>

          <div className="billing-form-grid" style={{ marginBlock: 10 }}>
            <div className="billing-field">
              <label>
                Certificado Digital (.crt / .pem)
                {certFileName && <small style={{ color: '#16a34a' }}>✓ {certFileName}</small>}
              </label>
              <div className="billing-file-picker">
                <label htmlFor="cert-file-input">
                  <Upload size={14} /> {certFileName ? 'Cambiar archivo .crt' : 'Seleccionar archivo .crt'}
                </label>
                <input
                  id="cert-file-input"
                  type="file"
                  accept=".crt,.pem,.cer,.txt"
                  onChange={handleCertFileSelect}
                />
              </div>
              <textarea
                rows={3}
                placeholder="O pegá el contenido de tu certificado (-----BEGIN CERTIFICATE-----...)"
                value={certContent}
                style={{ fontSize: '11px', fontFamily: 'monospace' }}
                onChange={e => setCertContent(e.target.value)}
              />
            </div>

            <div className="billing-field">
              <label>
                Clave Privada (.key)
                {keyFileName && <small style={{ color: '#16a34a' }}>✓ {keyFileName}</small>}
              </label>
              <div className="billing-file-picker">
                <label htmlFor="key-file-input">
                  <Upload size={14} /> {keyFileName ? 'Cambiar archivo .key' : 'Seleccionar archivo .key'}
                </label>
                <input
                  id="key-file-input"
                  type="file"
                  accept=".key,.pem,.txt"
                  onChange={handleKeyFileSelect}
                />
              </div>
              <textarea
                rows={3}
                placeholder="O pegá el contenido de tu clave (-----BEGIN RSA PRIVATE KEY-----...)"
                value={keyContent}
                style={{ fontSize: '11px', fontFamily: 'monospace' }}
                onChange={e => setKeyContent(e.target.value)}
              />
            </div>
          </div>

          <div className="button-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="primary-button"
              disabled={busy || savingCreds}
              onClick={handleSaveCredentials}
            >
              {savingCreds ? 'Guardando…' : 'Guardar certificados de ARCA'}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy || savingCreds}
              onClick={() => setShowCredsForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
