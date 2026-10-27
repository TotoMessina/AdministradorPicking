// Tipos, validaciones y funciones auxiliares para facturación electrónica ARCA (ex AFIP)

export type CondicionIva = 'RI' | 'MO' | 'EX';

export type BillingStatus = 'none' | 'pending' | 'authorized' | 'error' | 'retry';

export interface StoreBillingSettings {
  cuit?: string | null;
  razon_social?: string | null;
  condicion_iva?: CondicionIva | null;
  punto_venta_afip?: number | null;
  iibb?: string | null;
  inicio_actividades?: string | null;
  billing_enabled?: boolean;
}

export interface SaleBillingFields {
  cbteTipo?: number | null;
  cbteNro?: number | null;
  cae?: string | null;
  caeVto?: string | null;
  billingStatus?: BillingStatus;
  billingError?: string | null;
  billingAttempts?: number;
}

export interface CondicionIvaOption {
  id: CondicionIva;
  label: string;
  description: string;
  comprobanteEmitido: string;
}

export const CONDICION_IVA_OPTIONS: readonly CondicionIvaOption[] = [
  {
    id: 'MO',
    label: 'Monotributo',
    description: 'Régimen simplificado. Emite Facturas C a consumidor final y a otros contribuyentes.',
    comprobanteEmitido: 'Factura C (tipo 11)',
  },
  {
    id: 'RI',
    label: 'Responsable Inscripto',
    description: 'Régimen general con IVA. Emite Facturas B a consumidor final y Facturas A a contribuyentes RI.',
    comprobanteEmitido: 'Factura B (tipo 6) / Factura A (tipo 1)',
  },
  {
    id: 'EX',
    label: 'IVA Exento',
    description: 'Actividad u operador exento de IVA.',
    comprobanteEmitido: 'Sin emisión electrónica directa',
  },
] as const;

/**
 * Deja únicamente los dígitos numéricos del texto.
 */
export function cleanCuit(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '').slice(0, 11);
}

/**
 * Da formato XX-XXXXXXXX-X a una cadena de dígitos de CUIT.
 */
export function formatCuit(raw: string | null | undefined): string {
  const digits = cleanCuit(raw);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`;
}

/**
 * Calcula el dígito verificador esperado para los primeros 10 dígitos de un CUIT.
 */
export function getExpectedCheckDigit(raw: string | null | undefined): number | null {
  const digits = cleanCuit(raw);
  if (digits.length < 10) return null;

  const validPrefixes = ['20', '23', '24', '27', '30', '33', '34'];
  const prefix = digits.slice(0, 2);
  if (!validPrefixes.includes(prefix)) return null;

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * multipliers[i];
  }

  const mod = 11 - (sum % 11);
  if (mod === 11) return 0;
  if (mod === 10) return 9;
  return mod;
}

/**
 * Valida un CUIT argentino de 11 dígitos mediante el algoritmo oficial Módulo 11 de AFIP/ARCA.
 */
export function validateCuit(raw: string | null | undefined): boolean {
  const cuit = cleanCuit(raw);
  if (cuit.length !== 11) return false;
  const expected = getExpectedCheckDigit(cuit);
  return expected !== null && Number(cuit[10]) === expected;
}

/**
 * Obtiene la etiqueta amigable de la condición frente al IVA.
 */
export function getCondicionIvaLabel(condicion?: string | null): string {
  switch (condicion) {
    case 'MO':
      return 'Monotributo';
    case 'RI':
      return 'Responsable Inscripto';
    case 'EX':
      return 'IVA Exento';
    default:
      return 'No especificada';
  }
}

/**
 * Obtiene el nombre del comprobante según el código oficial de comprobante ARCA.
 */
export function getComprobanteTipoLabel(tipo?: number | null): string {
  switch (tipo) {
    case 1:
      return 'Factura A';
    case 2:
      return 'Nota de Débito A';
    case 3:
      return 'Nota de Crédito A';
    case 6:
      return 'Factura B';
    case 7:
      return 'Nota de Débito B';
    case 8:
      return 'Nota de Crédito B';
    case 11:
      return 'Factura C';
    case 12:
      return 'Nota de Débito C';
    case 13:
      return 'Nota de Crédito C';
    default:
      return 'Comprobante';
  }
}

/**
 * Formatea el número de comprobante fiscal con el estándar argentino: 0001-00000042.
 */
export function formatComprobanteNro(ptoVta?: number | null, nro?: number | null): string {
  if (!ptoVta && !nro) return '';
  const ptoStr = String(ptoVta || 1).padStart(4, '0');
  const nroStr = String(nro || 0).padStart(8, '0');
  return `${ptoStr}-${nroStr}`;
}

/**
 * Formatea la fecha de vencimiento del CAE en formato DD/MM/AAAA.
 */
export function formatCaeVto(vto?: string | null): string {
  if (!vto) return '';
  // Si viene en formato YYYYMMDD
  if (/^\d{8}$/.test(vto)) {
    const y = vto.slice(0, 4);
    const m = vto.slice(4, 6);
    const d = vto.slice(6, 8);
    return `${d}/${m}/${y}`;
  }
  // Si viene en formato ISO o YYYY-MM-DD
  const parts = vto.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return vto;
}

/**
 * Determina si la configuración fiscal mínima para emitir está completa y validada.
 */
export function isStoreBillingConfigured(store: StoreBillingSettings): boolean {
  if (!store.cuit || !validateCuit(store.cuit)) return false;
  if (!store.razon_social || !store.razon_social.trim()) return false;
  if (!store.condicion_iva || !['RI', 'MO', 'EX'].includes(store.condicion_iva)) return false;
  if (!store.punto_venta_afip || store.punto_venta_afip < 1 || store.punto_venta_afip > 99998) return false;
  return true;
}
