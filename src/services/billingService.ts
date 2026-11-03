// Servicio de facturación electrónica ARCA (ex AFIP)
import { supabase } from '../lib/supabase';
import { errorContextBranch } from '../lib/errorReporting';
import { cleanCuit, type BillingStatus, type CondicionIva } from '../features/retail/billing';
import type { Store } from '../features/retail/api';
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
  /** authorized, retry (se vuelve a pedir), error (ARCA rechazó), skip o voided (no se factura). */
  state?: 'authorized' | 'retry' | 'error' | 'skip' | 'voided';
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

// Después de un "reintentar más tarde" la venta espera un minuto antes del próximo pedido automático.
const RETRY_PAUSE = 60_000;
const retryAfter = new Map<string, number>();

/** Frena el pedido automático de una venta un momento, por ejemplo mientras se le asigna el cliente de la factura. */
export function holdSaleBilling(saleId: string, ms = 30_000) {
  retryAfter.set(saleId, Date.now() + ms);
}

/**
 * Solicita la autorización fiscal real en ARCA (AFIP).
 * La función del servidor toma importes, tipo, CUIT y punto de venta de la venta guardada, evita pedir dos veces
 * y deja el estado de facturación en la base. Nunca simula ni inventa CAEs.
 * Se ejecuta en segundo plano tras la venta o en reintentos; nunca bloquea el cobro al cliente.
 */
export async function authorizeSaleInvoice(
  store: Store,
  sale: KioscoSale,
): Promise<Partial<KioscoSale> | null> {
  if (!store.billing_enabled) return null;
  if (!determineComprobanteTipo(store.condicion_iva)) return null;

  let data: ArcaAuthResult | null = null;
  let remoteError: string | null = null;
  try {
    const response = await supabase.functions.invoke<ArcaAuthResult>('billing-authorize', {
      body: { storeId: store.id, branchId: errorContextBranch(), saleId: sale.id },
    });
    data = response.data;
    if (response.error && !data) remoteError = response.error.message;
  } catch (err) {
    remoteError = err instanceof Error ? err.message : 'Error al conectar con la función de facturación ARCA';
  }

  if (data?.success && data.cae) {
    retryAfter.delete(sale.id);
    return {
      cae: data.cae,
      caeVto: data.cae_vto,
      cbteNro: data.cbte_nro,
      cbteTipo: data.cbte_tipo,
      billingStatus: 'authorized',
      billingError: null,
    };
  }
  if (data?.state === 'skip' || data?.state === 'voided') return null;

  // Sin respuesta del servidor o ARCA caído: la venta sigue pendiente y se vuelve a pedir más tarde.
  const status: BillingStatus = data?.state === 'error' ? 'error' : 'retry';
  if (status === 'retry') retryAfter.set(sale.id, Date.now() + RETRY_PAUSE);
  return {
    billingStatus: status,
    billingError: data?.error || remoteError || 'No se pudo obtener autorización de ARCA',
    billingAttempts: (sale.billingAttempts || 0) + 1,
  };
}

/**
 * Emite en ARCA la nota de crédito de una devolución de una venta facturada, asociada a esa factura.
 * Usa el mismo circuito que las facturas: un solo pedido por devolución y recuperación si la respuesta se pierde.
 */
export async function authorizeCreditNote(storeId: string, returnId: string): Promise<ArcaAuthResult> {
  try {
    const { data, error } = await supabase.functions.invoke<ArcaAuthResult>('billing-authorize', {
      body: { storeId, branchId: errorContextBranch(), returnId, action: 'credit_note' },
    });
    if (data) return data;
    return { success: false, state: 'retry', error: error?.message || 'No se pudo conectar con ARCA' };
  } catch (err) {
    return { success: false, state: 'retry', error: err instanceof Error ? err.message : 'No se pudo conectar con ARCA' };
  }
}

/**
 * Reintenta la obtención de CAE para una venta con error previo.
 */
export async function retrySaleBilling(
  store: Store,
  sale: KioscoSale,
): Promise<Partial<KioscoSale>> {
  const res = await authorizeSaleInvoice(store, sale);
  return res || { billingStatus: sale.billingStatus };
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
  const now = Date.now();
  const pending = sales.filter(s => (s.billingStatus === 'pending' || s.billingStatus === 'retry') && s.syncStatus !== 'pending'
    && s.returnStatus !== 'voided' && (retryAfter.get(s.id) || 0) <= now);
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
