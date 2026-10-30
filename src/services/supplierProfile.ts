import type { CondicionIva } from '../features/retail/billing';

/** Ficha del proveedor para administración y cuenta corriente. Todos los campos son opcionales. */
export interface SupplierProfile {
  legal_name: string | null;
  vat_condition: CondicionIva | null;
  fiscal_address: string | null;
  commercial_address: string | null;
  phone: string | null;
  email: string | null;
  bank_cbu: string | null;
  bank_alias: string | null;
  payment_terms: string | null;
  /** Días desde la emisión hasta el vencimiento de sus facturas. */
  payment_days: number | null;
  collections_contact: string | null;
  purchasing_contact: string | null;
}

export const SUPPLIER_PROFILE_FIELDS = [
  'legal_name', 'vat_condition', 'fiscal_address', 'commercial_address', 'phone', 'email',
  'bank_cbu', 'bank_alias', 'payment_terms', 'payment_days', 'collections_contact', 'purchasing_contact',
] as const;

export const VAT_CONDITION_LABELS: Record<CondicionIva, string> = {
  RI: 'Responsable Inscripto', MO: 'Monotributo', EX: 'Exento',
};

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;

/** Antes de la migración de la ficha las columnas no existen: se leen como vacías. */
export function toSupplierProfile(row: Partial<Record<keyof SupplierProfile, unknown>>): SupplierProfile {
  const condition = row.vat_condition;
  const days = row.payment_days == null ? null : Number(row.payment_days);
  return {
    legal_name: text(row.legal_name),
    vat_condition: condition === 'RI' || condition === 'MO' || condition === 'EX' ? condition : null,
    fiscal_address: text(row.fiscal_address),
    commercial_address: text(row.commercial_address),
    phone: text(row.phone),
    email: text(row.email),
    bank_cbu: text(row.bank_cbu),
    bank_alias: text(row.bank_alias),
    payment_terms: text(row.payment_terms),
    payment_days: days !== null && Number.isInteger(days) ? days : null,
    collections_contact: text(row.collections_contact),
    purchasing_contact: text(row.purchasing_contact),
  };
}

export const emptySupplierProfile = (): SupplierProfile => toSupplierProfile({});

export const sameSupplierProfile = (a: SupplierProfile, b: SupplierProfile) =>
  SUPPLIER_PROFILE_FIELDS.every(field => (a[field] ?? null) === (b[field] ?? null));

/** CBU: 22 dígitos con los dos dígitos verificadores del BCRA (banco/sucursal y cuenta). */
export function validCbu(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{22}$/.test(digits)) return false;
  const check = (part: string, weights: number[]) => (10 - weights.reduce((sum, weight, index) => sum + Number(part[index]) * weight, 0) % 10) % 10;
  return check(digits.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) === Number(digits[7])
    && check(digits.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(digits[21]);
}

export const validAlias = (value: string) => /^[A-Za-z0-9.-]{6,20}$/.test(value.trim());
export const validEmail = (value: string) => value.trim().length <= 160 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());

/** Mensajes por campo; vacío si todo es válido. */
export function supplierProfileErrors(profile: SupplierProfile): Partial<Record<keyof SupplierProfile, string>> {
  const errors: Partial<Record<keyof SupplierProfile, string>> = {};
  if (profile.bank_cbu && !validCbu(profile.bank_cbu)) errors.bank_cbu = 'El CBU no es válido: revisá los 22 números.';
  if (profile.bank_alias && !validAlias(profile.bank_alias)) errors.bank_alias = 'El alias tiene de 6 a 20 letras, números, puntos o guiones.';
  if (profile.email && !validEmail(profile.email)) errors.email = 'Revisá el correo: debe tener la forma nombre@dominio.com.';
  if (profile.payment_days !== null && (!Number.isInteger(profile.payment_days) || profile.payment_days < 0 || profile.payment_days > 365)) {
    errors.payment_days = 'El plazo va de 0 a 365 días enteros.';
  }
  return errors;
}
