import { AlertCircle, Download, ExternalLink, Info } from 'lucide-react';
import type { BillingSettingsState } from './useBillingSettings';

/** Guía paso a paso para habilitar la facturación. */
export function BillingGuide({ state }: { state: BillingSettingsState }) {
  const {
    busy, showGuide, generatingCsr, showManualOpenSsl, setShowManualOpenSsl, copiedOpenSsl,
    setCopiedOpenSsl, cuitDigits, isCuitValid, handleGenerateCsr, openSslCommand,
  } = state;
  return (
    <>
      {/* Guía intuitiva paso a paso */}
      {showGuide && (
        <div className="billing-guide-box">
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} /> Pasos para facturar legalmente con ARCA (AFIP)
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--tone-text)' }}>
            Para que el sistema emita facturas oficiales con CAE y código QR legal, completá estos 4 pasos una sola vez:
          </p>

          <div className="billing-guide-step">
            <div className="billing-guide-step-num">1</div>
            <div className="billing-guide-step-body">
              <h4>Crear el Punto de Venta Web Services en AFIP</h4>
              <p>
                1. Ingresá con Clave Fiscal a{' '}
                <a
                  href="https://auth.afip.gob.ar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  afip.gob.ar <ExternalLink size={12} />
                </a>
                <br />
                2. Entrá al servicio <strong>"Administración de Puntos de Venta y Domicilios"</strong> → elegí tu empresa/titular → <strong>"A.B.M. Puntos de Venta"</strong> → clic en <strong>"Agregar"</strong>.
                <br />
                3. Completá:
              </p>
              <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>
                  <li><strong>Número:</strong> Ingresá un número libre (ej: <code>2</code> si el 1 lo usás para Comprobantes en Línea).</li>
                  <li><strong>Nombre Fantasía:</strong> Ej: <em>Kiosco</em>.</li>
                  <li><strong>Sistema:</strong> Seleccioná obligatoriamente <strong>"Factura Electrónica - Monotributo / Responsable Inscripto - Web Services"</strong>.</li>
                  <li><strong>Domicilio:</strong> Seleccioná el local comercial.</li>
              </ul>
              <div className="billing-alert-tip">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Atención:</strong> No uses un punto de venta asignado a <em>"Comprobantes en Línea"</em> o <em>"Facturador Móvil"</em>. AFIP exige que sea exclusivo para <strong>"Web Services"</strong>.
                </div>
              </div>
            </div>
          </div>

          <div className="billing-guide-step">
            <div className="billing-guide-step-num">2</div>
            <div className="billing-guide-step-body">
              <h4>Generar el Certificado Digital y la Clave Privada</h4>
              <p>
                El sistema necesita un Certificado Digital (archivo <code>.crt</code>) emitido por AFIP y una Clave Privada (archivo <code>.key</code>) para firmar cada factura ante los servidores fiscales.
              </p>

              <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy || generatingCsr || !isCuitValid}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                    color: '#0284c7',
                    borderColor: '#0284c7',
                  }}
                  onClick={handleGenerateCsr}
                >
                  <Download size={14} />
                  {generatingCsr ? 'Generando par de claves…' : '⚡ Generar pedido (.csr) y clave privada (.key) en 1 clic'}
                </button>

                <button
                  type="button"
                  className="text-button"
                  style={{ fontSize: '12px', textDecoration: 'underline', color: 'var(--tone-muted)' }}
                  onClick={() => setShowManualOpenSsl(prev => !prev)}
                >
                  {showManualOpenSsl ? 'Ocultar comandos OpenSSL' : '¿Preferís generar con OpenSSL? Ver comandos'}
                </button>
              </div>

              {!isCuitValid && (
                <small style={{ display: 'block', color: 'var(--tone-muted)', marginTop: 4 }}>
                  ℹ️ Ingresá tu CUIT válido abajo para habilitar la generación automática de claves.
                </small>
              )}

              {showManualOpenSsl && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--tone-muted)' }}>Comandos para terminal (Linux, Mac o Git Bash):</span>
                    <button
                      type="button"
                      className="text-button"
                      style={{ fontSize: '11px', padding: 0, textDecoration: 'underline', color: '#0284c7' }}
                      onClick={() => {
                        navigator.clipboard.writeText(openSslCommand);
                        setCopiedOpenSsl(true);
                        setTimeout(() => setCopiedOpenSsl(false), 2500);
                      }}
                    >
                      {copiedOpenSsl ? '✓ Copiado' : 'Copiar comandos'}
                    </button>
                  </div>
                  <pre className="billing-code-box">
                    {openSslCommand}
                  </pre>
                </div>
              )}

              <p style={{ marginTop: 8 }}>
                <strong>Luego en AFIP:</strong> Entrá a <strong>"Administración de Certificados Digitales"</strong> → <strong>"Agregar Alias"</strong> (ej: nombre <code>kiosco_pos</code>) → seleccioná y subí el archivo <code>pedido_afip_{cuitDigits || '...'}.csr</code> que descargaste recién. Hacé clic en "Guardar", luego en <strong>"Ver"</strong> sobre el alias y descargá el Certificado emitido (archivo <code>.crt</code>).
              </p>
            </div>
          </div>

          <div className="billing-guide-step">
            <div className="billing-guide-step-num">3</div>
            <div className="billing-guide-step-body">
              <h4>Vincular el servicio Facturación Electrónica (WSFE) en AFIP</h4>
              <p>
                1. En AFIP, ingresá a <strong>"Administrador de Relaciones de Clave Fiscal"</strong>.
                <br />
                2. Hacé clic en <strong>"Nueva Relación"</strong> → <strong>"Buscar Servicio"</strong>.
                <br />
                3. Elegí <strong>"AFIP"</strong> → <strong>"Web Services"</strong> → <strong>"Facturación Electrónica"</strong> (WSFE).
                <br />
                4. En el campo <strong>"Representante"</strong>, hacé clic en "Buscar" y seleccioná el computador fiscal que creaste en el Paso 2 (<code>kiosco_pos</code>).
                <br />
                5. Hacé clic en <strong>"Confirmar"</strong>.
              </p>
            </div>
          </div>

          <div className="billing-guide-step">
            <div className="billing-guide-step-num">4</div>
            <div className="billing-guide-step-body">
              <h4>Cargar credenciales, probar conexión y activar</h4>
              <p>
                1. En la sección <strong>"Certificados Digitales"</strong> abajo, seleccioná el archivo <code>.crt</code> descargado de AFIP y la clave privada <code>.key</code>.
                <br />
                2. Seleccioná <strong>"Producción Oficial"</strong> (para comprobantes legales reales).
                <br />
                3. Guardá las credenciales y hacé clic en <strong>"⚡ Probar conexión con ARCA"</strong> para verificar que AFIP aprueba la conexión en tiempo real.
                <br />
                4. Guardá tus datos fiscales y encendé el interruptor <strong>"Activar facturación electrónica ARCA"</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
