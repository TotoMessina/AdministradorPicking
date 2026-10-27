// Servicio de facturación electrónica ARCA (ex AFIP)
import { supabase } from '../lib/supabase';
import { cleanCuit, type BillingStatus, type CondicionIva } from '../features/retail/billing';
import { retail, type Store } from '../features/retail/api';
import type { KioscoSale } from '../types/kiosco';

export interface ArcaQrParams {
  cuit: string;
  puntoVenta: number;
  cbteTipo: number;
  cbteNro: number;
  importe: number;
  fecha: string; // YYYY-MM-DD
  cae: string;
  tipoDocRec?: number; // 99 = Consumidor final
  nroDocRec?: number;
}

export interface ArcaAuthResult {
  success: boolean;
  cae?: string;
  cae_vto?: string;
  cbte_nro?: number;
  cbte_tipo?: number;
  error?: string;
}

/**
 * Determina el código de comprobante oficial de ARCA según la condición IVA del vendedor.
 * Para kioscos a consumidor final:
 * - Responsable Inscripto -> Factura B (tipo 6)
 * - Monotributista -> Factura C (tipo 11)
 * - Exento -> Sin comprobante electrónico directo
 */
export function determineComprobanteTipo(condicionIva: CondicionIva | string | null | undefined): number | null {
  if (condicionIva === 'RI') return 6; // Factura B
  if (condicionIva === 'MO') return 11; // Factura C
  return null;
}

/**
 * Genera la URL oficial de ARCA para el código QR con el JSON del comprobante codificado en base64.
 * Cumple con la especificación de RG 4291 / 4892 de AFIP/ARCA.
 */
export function buildArcaQrUrl(params: ArcaQrParams): string {
  const cuitNum = Number(cleanCuit(params.cuit));
  const caeNum = Number(cleanCuit(params.cae));
  let fechaYmd = params.fecha ? params.fecha.split('T')[0] : new Date().toISOString().split('T')[0];
  if (fechaYmd.includes('/')) {
    const parts = fechaYmd.split('/');
    if (parts.length === 3) {
      fechaYmd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const payload = {
    ver: 1,
    fecha: fechaYmd,
    cuit: cuitNum,
    ptoVta: params.puntoVenta,
    tipoCmp: params.cbteTipo,
    nroCmp: params.cbteNro,
    importe: Math.round(params.importe * 100) / 100,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: params.tipoDocRec ?? 99,
    nroDocRec: params.nroDocRec ?? 0,
    tipoCodAut: 'E',
    codAut: caeNum,
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // Codificación segura en base64 UTF-8
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
  } catch {
    return `https://www.afip.gob.ar/fe/qr/?cuit=${cuitNum}&cbte=${params.cbteTipo}&pto=${params.puntoVenta}&nro=${params.cbteNro}`;
  }
}

/**
 * Desglosa los importes fiscales de una venta según el tipo de comprobante.
 */
export function calculateTaxBreakdown(total: number, cbteTipo: number) {
  const impTotal = Math.round(total * 100) / 100;
  if (cbteTipo === 6) {
    // Factura B a Consumidor Final: IVA 21%
    const impNeto = Math.round((impTotal / 1.21) * 100) / 100;
    const impIVA = Math.round((impTotal - impNeto) * 100) / 100;
    return {
      impTotal,
      impNeto,
      impIVA,
      impTotConc: 0,
      impOpEx: 0,
      impTrib: 0,
      alicuotas: [{ id: 5, baseImp: impNeto, importe: impIVA }],
    };
  }

  // Factura C: Monotributo, sin discriminar IVA
  return {
    impTotal,
    impNeto: impTotal,
    impIVA: 0,
    impTotConc: 0,
    impOpEx: 0,
    impTrib: 0,
    alicuotas: [],
  };
}

/**
 * Solicita la autorización fiscal real en ARCA (AFIP).
 * Se comunica con la Edge Function oficial que firma con certificado digital X.509
 * y autoriza comprobantes ante WSAA y WSFE. Nunca simula ni inventa CAEs.
 * Se ejecuta en segundo plano tras la venta o en reintentos; nunca bloquea el cobro al cliente.
 */
export async function authorizeSaleInvoice(
  store: Store,
  sale: KioscoSale,
): Promise<Partial<KioscoSale> | null> {
  if (!store.billing_enabled) return null;

  const cbteTipo = determineComprobanteTipo(store.condicion_iva);
  if (!cbteTipo) return null;

  const cuitClean = cleanCuit(store.cuit);
  const ptoVta = store.punto_venta_afip || 1;
  const breakdown = calculateTaxBreakdown(sale.total, cbteTipo);

  let authResult: ArcaAuthResult | null = null;
  let remoteError: string | null = null;

  // Invocar Edge Function oficial de ARCA
  try {
    const { data, error } = await supabase.functions.invoke<ArcaAuthResult>('billing-authorize', {
      body: {
        storeId: store.id,
        saleId: sale.id,
        cuit: cuitClean,
        puntoVenta: ptoVta,
        cbteTipo,
        total: breakdown.impTotal,
        neto: breakdown.impNeto,
        iva: breakdown.impIVA,
        condicionIva: store.condicion_iva,
        razonSocial: store.razon_social,
        fecha: sale.created_at || new Date().toISOString(),
      },
    });

    if (!error && data && data.success) {
      authResult = data;
    } else {
      remoteError = data?.error || error?.message || 'Error en comunicación con ARCA';
    }
  } catch (err) {
    remoteError = err instanceof Error ? err.message : 'Error al conectar con la función de facturación ARCA';
  }

  // Si hubo error de ARCA o de comunicación, registrar el error real en la venta sin simular
  if (remoteError || !authResult?.success) {
    const finalError = remoteError || authResult?.error || 'No se pudo obtener autorización de ARCA';
    await retail.updateSaleBilling(store.id, sale.id, 'error', {
      error: finalError,
    }).catch(() => {});

    return {
      billingStatus: 'error',
      billingError: finalError,
      billingAttempts: (sale.billingAttempts || 0) + 1,
    };
  }

  // 4. Autorización exitosa: persistir en base de datos
  try {
    await retail.updateSaleBilling(store.id, sale.id, 'authorized', {
      cae: authResult.cae,
      cae_vto: authResult.cae_vto,
      cbte_nro: authResult.cbte_nro,
      cbte_tipo: authResult.cbte_tipo || cbteTipo,
    });
  } catch (updateErr) {
    const errorMsg =
      updateErr instanceof Error
        ? updateErr.message
        : typeof updateErr === 'object' && updateErr
          ? JSON.stringify(updateErr)
          : String(updateErr);
    console.warn('[billing] No se pudo persistir el CAE en base de datos, usando datos en memoria:', errorMsg);
  }

  return {
    cae: authResult.cae,
    caeVto: authResult.cae_vto,
    cbteNro: authResult.cbte_nro,
    cbteTipo: authResult.cbte_tipo || cbteTipo,
    billingStatus: 'authorized',
    billingError: null,
  };
}

/**
 * Reintenta la obtención de CAE para una venta con error previo.
 */
export async function retrySaleBilling(
  store: Store,
  sale: KioscoSale,
): Promise<Partial<KioscoSale>> {
  await retail.updateSaleBilling(store.id, sale.id, 'retry').catch(() => {});
  const res = await authorizeSaleInvoice(store, { ...sale, billingStatus: 'retry' });
  return res || { billingStatus: 'error' };
}

/**
 * Procesa ventas pendientes de facturación para un comercio (por ejemplo tras sincronización offline).
 * Se ejecuta en segundo plano sin interrumpir al usuario ni bloquear la caja.
 */
export async function processPendingSales(
  store: Store,
  sales: KioscoSale[],
  onSaleUpdated?: (saleId: string, result: Partial<KioscoSale>) => void,
): Promise<void> {
  if (!store.billing_enabled) return;
  const pending = sales.filter(s => (s.billingStatus === 'pending' || s.billingStatus === 'retry') && s.syncStatus !== 'pending');
  for (const s of pending) {
    try {
      const res = await authorizeSaleInvoice(store, s);
      if (res && onSaleUpdated) {
        onSaleUpdated(s.id, res);
      }
    } catch {
      // Ignora error puntual y continúa con la siguiente venta pendiente
    }
  }
}

