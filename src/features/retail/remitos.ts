import { isValidUUID, SUPABASE_URL } from '../../lib/supabase';
import { voucherExtension, voucherMimeType } from './vouchers';

export const REMITO_BUCKET = 'retail-remitos';
export interface PendingReplenishmentItem {
  invoice_line: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  pack_size?: number | null;
  confidence?: number | null;
}
export interface PendingReplenishment {
  id: string;
  store_id: string;
  branch_id: string | null;
  submitted_by: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  image_url: string;
  extracted_text: string | null;
  items: PendingReplenishmentItem[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}
export function remitoExtension(file: File): string {
  if (!voucherMimeType(file).startsWith('image/')) throw new Error('Elegí una foto del remito.');
  return voucherExtension(file);
}
export function remitoReference(path: string) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/authenticated/${REMITO_BUCKET}/${path}`;
}
export function remitoPath(store: string, reference: string): string {
  const url = new URL(reference);
  const prefix = `/storage/v1/object/authenticated/${REMITO_BUCKET}/`;
  const parts = url.pathname.slice(prefix.length).split('/');
  const match = parts[2]?.match(/^([0-9a-f-]{36})\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif)$/);
  if (url.origin !== new URL(SUPABASE_URL).origin || !url.pathname.startsWith(prefix) || url.search || url.hash
    || parts.length !== 3 || parts[0] !== store || !isValidUUID(store) || !isValidUUID(parts[1]) || !match || !isValidUUID(match[1])) {
    throw new Error('La foto no corresponde a este comercio.');
  }
  return parts.join('/');
}
export function validRemitoQuantity(quantity: number) {
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 1000000;
}
