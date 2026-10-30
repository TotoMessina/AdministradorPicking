import type { CondicionIva } from '../features/retail/billing';
import type { SupplierInvoiceRules } from './supplierInvoiceRules';

/**
 * Costo final: lo que se paga de bolsillo por unidad, comparable con el precio de venta (que incluye IVA).
 * costo final = neto con descuento × (1 + IVA) + impuestos internos por unidad.
 * Las percepciones no se suman: son pagos a cuenta de impuestos, no costo del producto.
 */
export type LandedVat = 'add_21' | 'add_10_5' | 'included';
export interface LandedCostSettings {
  vat: LandedVat;
  /** Reparte los impuestos internos del pie entre los artículos, en proporción a su importe. */
  spreadInternalTaxes: boolean;
}

const VAT_RATE: Record<LandedVat, number> = { add_21: 0.21, add_10_5: 0.105, included: 0 };
// Factura, nota de débito y de crédito A, y Factura M: discriminan IVA, sus precios son netos.
const NET_PRICED_VOUCHERS = new Set([1, 2, 3, 51]);
const FINAL_PRICED_VOUCHERS = new Set([6, 7, 8, 11, 12, 13]);

export const vatRate = (vat: LandedVat) => VAT_RATE[vat];

/**
 * La factura discrimina IVA (neto + IVA por separado): es Factura A aunque no se haya leído la letra.
 * Señales: "Neto ... 21%", "IVA 21%" o la alícuota repetida en los renglones.
 */
export function hasDiscriminatedVat(text: string): boolean {
  return /\bneto\b[^\n]{0,25}\b(?:21|10[.,]5|27)\b/i.test(text)
    || /\bi\.?\s?v\.?\s?a\.?\s*(?:\(?\s*)?(?:21|10[.,]5|27)(?:[.,]0+)?\s*%/i.test(text)
    || (text.match(/\b21(?:[.,]0+)?\s*%/g) ?? []).length >= 3;
}

/** Criterio sugerido según el proveedor, el tipo de factura y, si no se conoce, la condición del comercio. */
export function defaultLandedSettings(input: {
  rules: SupplierInvoiceRules; voucherType: number | null; storeCondition?: CondicionIva | null;
  /** El texto muestra neto e IVA por separado: se trata como Factura A. */
  vatDiscriminated?: boolean;
  net21: number; net105: number; internalTaxes: number;
}): LandedCostSettings & { reason: string } {
  if (input.rules.price_basis === 'final') {
    return { vat: 'included', spreadInternalTaxes: false, reason: 'El proveedor está configurado con costos que ya incluyen IVA e impuestos internos.' };
  }
  const rate: LandedVat = input.net105 > 0 && input.net21 === 0 ? 'add_10_5' : 'add_21';
  const spreadInternalTaxes = input.internalTaxes > 0;
  if (input.voucherType && NET_PRICED_VOUCHERS.has(input.voucherType)) {
    return { vat: rate, spreadInternalTaxes, reason: 'Factura A: los precios vienen sin IVA, se suma al costo.' };
  }
  if (input.voucherType && FINAL_PRICED_VOUCHERS.has(input.voucherType)) {
    return { vat: 'included', spreadInternalTaxes: false, reason: 'Factura B o C: los precios ya incluyen IVA e impuestos.' };
  }
  if (input.vatDiscriminated) {
    return { vat: rate, spreadInternalTaxes, reason: 'La factura discrimina IVA (neto e IVA por separado): los precios vienen sin IVA, se suma al costo. Revisá el tipo en los datos fiscales.' };
  }
  return input.storeCondition === 'RI'
    ? { vat: rate, spreadInternalTaxes, reason: 'Sin tipo de comprobante: como el comercio es Responsable Inscripto, se asume Factura A (precios sin IVA).' }
    : { vat: 'included', spreadInternalTaxes: false, reason: 'Sin tipo de comprobante: se asume que los precios ya incluyen IVA.' };
}

/**
 * Impuestos internos por unidad de stock para cada artículo, en proporción a su importe neto facturado.
 * `amount` es cantidad facturada × costo facturado; `units` las unidades que entran al stock.
 */
export function internalTaxPerUnit(lines: { amount: number; units: number }[], internalTaxes: number): number[] {
  const base = lines.reduce((sum, line) => sum + (line.amount > 0 ? line.amount : 0), 0);
  if (!(internalTaxes > 0) || !(base > 0)) return lines.map(() => 0);
  return lines.map(line => line.amount > 0 && line.units > 0 ? (internalTaxes * line.amount / base) / line.units : 0);
}

/** Costo final por unidad, en centavos. `netUnit` ya tiene aplicado el descuento del proveedor. */
export function landedUnitCost(netUnit: number, settings: LandedCostSettings, internalPerUnit = 0): number {
  if (!Number.isFinite(netUnit) || netUnit < 0) return netUnit;
  const internal = settings.spreadInternalTaxes && Number.isFinite(internalPerUnit) ? internalPerUnit : 0;
  return Math.round((netUnit * (1 + VAT_RATE[settings.vat]) + internal) * 100) / 100;
}
