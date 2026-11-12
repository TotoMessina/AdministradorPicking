import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { errorMessage, retail } from '../api';
import { formatCuit, type CondicionIva } from '../billing';
import type { billingSettingsProps } from './useBillingSettings';

/** Estado del formulario fiscal, de los certificados y de las métricas fiscales. */
export function useBillingSettingsState(ctx: ReturnType<typeof billingSettingsProps>) {
  const { store, active } = ctx;
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
  const [environment, setEnvironment] = useState<'homo' | 'prod'>('homo');
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
  return { cuit, setCuit, razonSocial, setRazonSocial, condicionIva, setCondicionIva, puntoVenta, setPuntoVenta, iibb, setIibb, inicioActividades, setInicioActividades, billingEnabled, setBillingEnabled, isDirty, setIsDirty, error, setError, saving, showGuide, setShowGuide, credentialsStatus, setCredentialsStatus, showCredsForm, setShowCredsForm, certContent, setCertContent, keyContent, setKeyContent, certFileName, setCertFileName, keyFileName, setKeyFileName, environment, setEnvironment, savingCreds, setSavingCreds, credsSuccessMsg, setCredsSuccessMsg, generatingCsr, setGeneratingCsr, showManualOpenSsl, setShowManualOpenSsl, copiedOpenSsl, setCopiedOpenSsl, testingConnection, setTestingConnection, testResult, setTestResult, fiscalStats, setFiscalStats, fiscalStatsError, setFiscalStatsError, fiscalStatsLoading, setFiscalStatsLoading, fiscalStatsRefresh, setFiscalStatsRefresh };
}
