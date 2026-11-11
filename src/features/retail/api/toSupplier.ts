import { toSupplierInvoiceRules } from '../../../services/supplierInvoiceRules';
import { toSupplierProfile, type SupplierProfile } from '../../../services/supplierProfile';
import type { Supplier } from './types';

// Antes de la migración de ficha fiscal no existen cuit/invoice_rules: se leen como vacíos.
export const toSupplier = (row: Supplier): Supplier => ({
  ...row, discount_percent: Number(row.discount_percent), cuit: row.cuit ?? null, invoice_rules: toSupplierInvoiceRules(row.invoice_rules),
  profile: toSupplierProfile(row as unknown as Partial<Record<keyof SupplierProfile, unknown>>),
});
