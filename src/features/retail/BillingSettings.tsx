import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  Key,
  RotateCw,
  Server,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, retail, type Store } from './api';
import {
  CONDICION_IVA_OPTIONS,
  cleanCuit,
  formatCuit,
  formatComprobanteNro,
  getComprobanteTipoLabel,
  getExpectedCheckDigit,
  isStoreBillingConfigured,
  validateCuit,
  type CondicionIva,
} from './billing';
import type { Run } from './Management';
import './billing.css';
import './permission-profiles.css';

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BillingSettings({
  store,
  busy,
  run,
  active = true,
}: {
  store: Store;
  busy: boolean;
  run: Run;
  active?: boolean;
}) {
  const [cuit, setCuit] = useState(formatCuit(store.cuit || ''));
  const [razonSocial, setRazonSocial] = useState(store.razon_social || '');
  const [condicionIva, setCondicionIva] = useState<CondicionIva>(store.condicion_iva || 'MO');
  const [puntoVenta, setPuntoVenta] = useState(store.punto_venta_afip ? String(store.punto_venta_afip) : '1');
  const [iibb, setIibb] = useState(store.iibb || '');
  const [inicioActividades, setInicioActividades] = useState(store.inicio_actividades || '');
  const [billingEnabled, setBillingEnabled] = useState(!!store.billing_enabled);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);

  // Guía paso a paso: abierta por defecto si aún no está activada para orientar al comerciante
  const [showGuide, setShowGuide] = useState(!store.billing_enabled);

  // Estado de certificados ARCA
  const [credentialsStatus, setCredentialsStatus] = useState<{
    configured: boolean;
    environment?: 'homo' | 'prod';
    updated_at?: string | null;
  } | null>(null);
  const [showCredsForm, setShowCredsForm] = useState(false);
  const [certContent, setCertContent] = useState('');
  const [keyContent, setKeyContent] = useState('');
  const [certFileName, setCertFileName] = useState('');
  const [keyFileName, setKeyFileName] = useState('');
  const [environment, setEnvironment] = useState<'homo' | 'prod'>('prod');
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsSuccessMsg, setCredsSuccessMsg] = useState('');

  // Generación de CSR asistida
  const [generatingCsr, setGeneratingCsr] = useState(false);
  const [showManualOpenSsl, setShowManualOpenSsl] = useState(false);
  const [copiedOpenSsl, setCopiedOpenSsl] = useState(false);

  // Prueba de conexión con AFIP
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    environment?: string;
    puntoVenta?: number;
    ultimoComprobante?: number;
    error?: string;
  } | null>(null);

  const [fiscalStats, setFiscalStats] = useState<{
    lastCbteTipo?: number | null;
    lastCbteNro?: number | null;
    lastDate?: string | null;
    pendingCount: number;
    errorCount: number;
  } | null>(null);
  const [fiscalStatsError, setFiscalStatsError] = useState('');
  const [fiscalStatsLoading, setFiscalStatsLoading] = useState(false);
  const [fiscalStatsRefresh, setFiscalStatsRefresh] = useState(0);

  // Cargar estado de credenciales de ARCA
  useEffect(() => {
    if (!active) return;
    let subscribed = true;
    retail.getBillingCredentialsStatus(store.id)
      .then(status => {
        if (!subscribed) return;
        setCredentialsStatus(status);
        if (status.environment) {
          setEnvironment(status.environment);
        }
      })
      .catch(() => {});
    return () => { subscribed = false; };
  }, [active, store.id]);

  useEffect(() => {
    if (!active || !store.billing_enabled) {
      setFiscalStatsLoading(false);
      if (!store.billing_enabled) setFiscalStatsError('');
      setFiscalStats(null);
      return;
    }
    let isSubscribed = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setFiscalStatsLoading(true);
    setFiscalStatsError('');
    setFiscalStats(null);
    Promise.all([
      supabase
        .from('retail_sales')
        .select('cbte_tipo, cbte_nro, created_at')
        .eq('store_id', store.id)
        .eq('billing_status', 'authorized')
        .order('cbte_nro', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle(),
      supabase
        .from('retail_sales')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .in('billing_status', ['pending', 'retry'])
        .abortSignal(controller.signal),
      supabase
        .from('retail_sales')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('billing_status', 'error')
        .abortSignal(controller.signal),
    ]).then(([lastRes, pendingRes, errorRes]) => {
      if (!isSubscribed) return;
      const failure = lastRes.error || pendingRes.error || errorRes.error;
      if (failure) throw failure;
      if (pendingRes.count === null || errorRes.count === null) {
        throw new Error('No se recibieron los contadores de facturación');
      }
      setFiscalStats({
        lastCbteTipo: lastRes.data?.cbte_tipo ?? null,
        lastCbteNro: lastRes.data?.cbte_nro ?? null,
        lastDate: lastRes.data?.created_at ?? null,
        pendingCount: pendingRes.count,
        errorCount: errorRes.count,
      });
    }).catch((err) => {
      if (!isSubscribed) return;
      const detail = controller.signal.aborted
        ? 'La consulta tardó demasiado.'
        : errorMessage(err);
      setFiscalStatsError(`No se pudo consultar el estado de facturación. Revisá la conexión y reintentá. ${detail}`);
    }).finally(() => {
      window.clearTimeout(timeout);
      if (isSubscribed) setFiscalStatsLoading(false);
    });

    return () => {
      isSubscribed = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [active, store.id, store.billing_enabled, fiscalStatsRefresh]);

  useEffect(() => {
    if (!isDirty) {
      setCuit(formatCuit(store.cuit || ''));
      setRazonSocial(store.razon_social || '');
      setCondicionIva(store.condicion_iva || 'MO');
      setPuntoVenta(store.punto_venta_afip ? String(store.punto_venta_afip) : '1');
      setIibb(store.iibb || '');
      setInicioActividades(store.inicio_actividades || '');
      setBillingEnabled(!!store.billing_enabled);
      setError('');
    }
  }, [
    store.id,
    store.cuit,
    store.razon_social,
    store.condicion_iva,
    store.punto_venta_afip,
    store.iibb,
    store.inicio_actividades,
    store.billing_enabled,
    isDirty,
  ]);

  const cuitDigits = cleanCuit(cuit);
  const isCuitValid = validateCuit(cuitDigits);
  const isCuitTouched = cuitDigits.length > 0;
  const expectedDigit = getExpectedCheckDigit(cuitDigits);
  const ptoVtaNum = Number(puntoVenta);
  const isPtoVtaValid = Number.isInteger(ptoVtaNum) && ptoVtaNum >= 1 && ptoVtaNum <= 99998;
  const isRazonValid = razonSocial.trim().length > 0;

  const canEnable = isCuitValid && isRazonValid && isPtoVtaValid && !!condicionIva;

  const handleReset = () => {
    setCuit(formatCuit(store.cuit || ''));
    setRazonSocial(store.razon_social || '');
    setCondicionIva(store.condicion_iva || 'MO');
    setPuntoVenta(store.punto_venta_afip ? String(store.punto_venta_afip) : '1');
    setIibb(store.iibb || '');
    setInicioActividades(store.inicio_actividades || '');
    setBillingEnabled(!!store.billing_enabled);
    setIsDirty(false);
    setError('');
  };

  const handleCertFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCertContent(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleKeyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setKeyContent(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleSaveCredentials = async () => {
    if (!certContent.trim()) {
      setError('Cargá o seleccioná el archivo del Certificado Digital (.crt)');
      return;
    }
    if (!keyContent.trim()) {
      setError('Cargá o seleccioná el archivo de la Clave Privada (.key)');
      return;
    }

    setSavingCreds(true);
    setError('');
    setCredsSuccessMsg('');
    try {
      await retail.setBillingCredentials(store.id, certContent, keyContent, environment);
      const updated = await retail.getBillingCredentialsStatus(store.id);
      setCredentialsStatus(updated);
      setShowCredsForm(false);
      setCertContent('');
      setKeyContent('');
      setCertFileName('');
      setKeyFileName('');
      setCredsSuccessMsg('✓ Certificado digital y clave privada guardados con éxito.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCreds(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setError('');
    try {
      const res = await retail.testBillingConnection(store.id);
      setTestResult(res);
    } catch (err) {
      setTestResult({
        success: false,
        error: errorMessage(err),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGenerateCsr = async () => {
    if (!cuitDigits || cuitDigits.length < 11 || !isCuitValid) {
      setError('Ingresá un CUIT válido de 11 dígitos en los datos del comercio antes de generar el pedido de certificado.');
      return;
    }
    setGeneratingCsr(true);
    setError('');
    setCredsSuccessMsg('');
    try {
      const res = await retail.generateBillingCsr(
        store.id,
        cuitDigits,
        razonSocial.trim() || 'Comercio',
        'kiosco_pos',
      );
      if (res.success && res.csr && res.privateKey) {
        setKeyContent(res.privateKey);
        setKeyFileName(`privada_${cuitDigits}.key`);
        setShowCredsForm(true);

        // Descargar los archivos necesarios
        downloadFile(`pedido_afip_${cuitDigits}.csr`, res.csr);
        downloadFile(`privada_afip_${cuitDigits}.key`, res.privateKey);

        setCredsSuccessMsg(
          '✓ Pedido (.csr) y Clave (.key) generados. Subí el archivo .csr a afip.gob.ar (Administración de Certificados Digitales). Cuando AFIP te entregue el certificado .crt, seleccionalo abajo.',
        );
      } else {
        setError(res.error || 'No se pudo generar el pedido de certificado.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGeneratingCsr(false);
    }
  };

  const openSslCommand = `# 1. Generar la clave privada (RSA 2048)
openssl genrsa -out privada.key 2048

# 2. Generar el pedido de certificado (.csr) para AFIP
openssl req -new -key privada.key -subj "/C=AR/O=${razonSocial.trim() || 'MI_COMERCIO'}/CN=kiosco_pos/serialNumber=CUIT ${cuitDigits || '20123456789'}" -out pedido.csr`;

  const isConfigured = isStoreBillingConfigured(store);

  return (
    <div className="store-settings-card billing-settings-card">
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

      <div className="location-card-body">
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

          {/* Formulario para cargar .crt y .key */}
          {showCredsForm && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--tone-border)' }}>
              <div className="billing-field" style={{ marginBottom: 12 }}>
                <label>
                  Entorno de ARCA / AFIP
                  <small>Elegí "Producción" para facturas reales con validez fiscal</small>
                </label>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="arca_env"
                      value="prod"
                      checked={environment === 'prod'}
                      onChange={() => setEnvironment('prod')}
                    />
                    <strong>Producción Oficial</strong> (AFIP real)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="arca_env"
                      value="homo"
                      checked={environment === 'homo'}
                      onChange={() => setEnvironment('homo')}
                    />
                    <span>Homologación (Testing AFIP)</span>
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
        </div>

        {/* Formulario Principal de Datos Fiscales */}
        <form
          className="retail-form permission-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || saving.current || !active) return;

            if (billingEnabled && !canEnable) {
              setError('Para activar la facturación electrónica es obligatorio ingresar CUIT válido, Razón Social, Condición IVA y Punto de Venta.');
              return;
            }

            if (cuitDigits.length > 0 && !isCuitValid) {
              if (cuitDigits.length < 11) {
                setError(`El CUIT debe tener 11 dígitos numéricos (ingresaste ${cuitDigits.length}).`);
              } else if (expectedDigit !== null) {
                setError(`El dígito verificador es incorrecto: para ${formatCuit(cuitDigits.slice(0, 10))} el último número debe ser ${expectedDigit}.`);
              } else {
                setError('El CUIT ingresado no es válido según el algoritmo oficial de ARCA.');
              }
              return;
            }

            saving.current = true;
            setError('');

            try {
              const success = await run(
                async () => {
                  try {
                    await retail.saveBillingSettings(store.id, {
                      cuit: cuitDigits || '',
                      razon_social: razonSocial.trim(),
                      condicion_iva: condicionIva,
                      punto_venta_afip: ptoVtaNum || 1,
                      iibb: iibb.trim() || null,
                      inicio_actividades: inicioActividades || null,
                      billing_enabled: billingEnabled,
                    });
                  } catch (err) {
                    setError(errorMessage(err));
                    throw err;
                  }
                },
                billingEnabled
                  ? 'Configuración fiscal guardada. Facturación electrónica activada.'
                  : 'Datos fiscales guardados.',
              );

              if (success) {
                setIsDirty(false);
              }
            } finally {
              saving.current = false;
            }
          }}
        >
          <div className="billing-form-grid">
            <div className="billing-field">
              <label htmlFor="billing-cuit">
                CUIT del titular / comercio
                {isCuitTouched && (
                  <small
                    style={{
                      color: isCuitValid
                        ? '#16a34a'
                        : cuitDigits.length < 11
                        ? 'var(--tone-muted)'
                        : '#dc2626',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>
                      {isCuitValid
                        ? 'CUIT válido'
                        : cuitDigits.length < 11
                        ? `${cuitDigits.length}/11 dígitos`
                        : 'Dígito verificador incorrecto'}
                    </span>
                    {!isCuitValid && cuitDigits.length === 11 && expectedDigit !== null && (
                      <button
                        type="button"
                        className="text-button"
                        style={{
                          padding: 0,
                          fontSize: '12px',
                          textDecoration: 'underline',
                          color: 'var(--tone-accent, #2563eb)',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const corrected = formatCuit(cuitDigits.slice(0, 10) + expectedDigit);
                          setCuit(corrected);
                          setIsDirty(true);
                          setError('');
                        }}
                        title={`Corregir último dígito a ${expectedDigit}`}
                      >
                        (Corregir a {expectedDigit})
                      </button>
                    )}
                  </small>
                )}
              </label>
              <div className="billing-cuit-input-wrap">
                <input
                  id="billing-cuit"
                  type="text"
                  inputMode="numeric"
                  placeholder="20-12345678-6"
                  maxLength={13}
                  value={cuit}
                  disabled={busy}
                  onChange={(e) => {
                    const formatted = formatCuit(e.target.value);
                    setCuit(formatted);
                    setIsDirty(true);
                  }}
                />
                {isCuitTouched && (
                  <span
                    className={`billing-cuit-status ${
                      isCuitValid ? 'billing-cuit-valid' : 'billing-cuit-invalid'
                    }`}
                  >
                    {isCuitValid ? <Check size={16} /> : <X size={16} />}
                  </span>
                )}
              </div>
            </div>

            <div className="billing-field">
              <label htmlFor="billing-razon-social">
                Razón Social / Titular
                <small>(Según constancia de inscripción AFIP)</small>
              </label>
              <input
                id="billing-razon-social"
                type="text"
                placeholder="Ej: Kiosco Central S.R.L. o Pérez Juan"
                value={razonSocial}
                disabled={busy}
                maxLength={100}
                onChange={(e) => {
                  setRazonSocial(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>

            <div className="billing-field">
              <label htmlFor="billing-condicion-iva">
                Condición frente al IVA
                <small>Define si emite Factura B o Factura C</small>
              </label>
              <select
                id="billing-condicion-iva"
                value={condicionIva}
                disabled={busy}
                onChange={(e) => {
                  setCondicionIva(e.target.value as CondicionIva);
                  setIsDirty(true);
                }}
              >
                {CONDICION_IVA_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="billing-field">
              <label htmlFor="billing-pto-vta">
                Punto de venta fiscal en ARCA
                <small>(Debe ser de tipo "Web Services", no "Comprobantes en Línea")</small>
              </label>
              <input
                id="billing-pto-vta"
                type="number"
                min={1}
                max={99998}
                placeholder="1"
                value={puntoVenta}
                disabled={busy}
                onChange={(e) => {
                  setPuntoVenta(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>

            <div className="billing-field">
              <label htmlFor="billing-iibb">
                Ingresos Brutos (IIBB)
                <small>(Opcional, según tu jurisdicción)</small>
              </label>
              <input
                id="billing-iibb"
                type="text"
                placeholder="Ej: 901-123456-7 o Convenio Multilateral"
                value={iibb}
                disabled={busy}
                maxLength={30}
                onChange={(e) => {
                  setIibb(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>

            <div className="billing-field">
              <label htmlFor="billing-inicio-actividades">
                Inicio de actividades
                <small>(Opcional)</small>
              </label>
              <input
                id="billing-inicio-actividades"
                type="date"
                value={inicioActividades}
                disabled={busy}
                onChange={(e) => {
                  setInicioActividades(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
          </div>

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
        </form>
      </div>
    </div>
  );
}
