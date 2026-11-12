import { askConfirm } from '../../../components/ConfirmHost';
import { errorMessage, retail } from '../api';
import { cleanCuit, formatCuit, getExpectedCheckDigit, isStoreBillingConfigured, validateCuit } from '../billing';
import { downloadFile } from './downloadFile';
import type { billingSettingsProps } from './useBillingSettings';
import type { useBillingSettingsState } from './useBillingSettingsState';

/** Validaciones y acciones: certificados, prueba de conexión y pedido de certificado (CSR). */
export function useBillingSettingsActions(ctx: ReturnType<typeof billingSettingsProps> & ReturnType<typeof useBillingSettingsState>) {
  const {
    store, cuit, setCuit, razonSocial, setRazonSocial, condicionIva, setCondicionIva, puntoVenta,
    setPuntoVenta, setIibb, setInicioActividades, setBillingEnabled, setIsDirty, setError,
    credentialsStatus, setCredentialsStatus, setShowCredsForm, certContent, setCertContent, keyContent,
    setKeyContent, setCertFileName, setKeyFileName, environment, setSavingCreds, setCredsSuccessMsg,
    setGeneratingCsr, setTestingConnection, setTestResult,
  } = ctx;
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
    if (!keyContent.trim() && !credentialsStatus?.configured) {
      setError('Cargá o seleccioná el archivo de la Clave Privada (.key)');
      return;
    }
    if (environment === 'prod' && credentialsStatus?.environment !== 'prod'
      && !await askConfirm('¿Pasar a producción? Desde ahora cada venta genera una factura real ante ARCA. Hacelo después de probar en homologación y con el visto bueno de tu contador.')) return;

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

  return { cuitDigits, isCuitValid, isCuitTouched, expectedDigit, ptoVtaNum, isPtoVtaValid, isRazonValid, canEnable, handleReset, handleCertFileSelect, handleKeyFileSelect, handleSaveCredentials, handleTestConnection, handleGenerateCsr, openSslCommand, isConfigured };
}
