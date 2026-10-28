import type { Supplier } from '../features/retail/api';
import { normalizeSupplierText } from './supplierMappingService';

/** Registered supplier whose normalized name matches the invoice supplier, if any. */
export function findRegisteredSupplier(suppliers: Supplier[], name: string): Supplier | null {
  const key = normalizeSupplierText(name);
  return key ? suppliers.find(supplier => supplier.supplier_key === key) || null : null;
}

/** Valid invoice discount: 0 ≤ percent < 100. Anything else means no discount. */
export function validDiscount(percent: number): boolean {
  return Number.isFinite(percent) && percent >= 0 && percent < 100;
}

/** Net cost after the supplier's global discount, in cents: $1.000 with 10% → $900. */
export function applySupplierDiscount(cost: number, percent: number): number {
  if (!Number.isFinite(cost) || !validDiscount(percent) || percent === 0) return cost;
  return Math.round(cost * (100 - percent)) / 100;
}
