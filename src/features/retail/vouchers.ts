import { isValidUUID, SUPABASE_URL } from '../../lib/supabase';

export const VOUCHER_BUCKET = 'retail-vouchers';
export const VOUCHER_MAX_BYTES = 10 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif', 'image/bmp': 'bmp',
  'image/tiff': 'tif', 'application/pdf': 'pdf',
};

export function voucherMimeType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const extension = (file.name.split('.').pop() || '').toLowerCase().replace(/^jpeg$/, 'jpg').replace(/^tiff$/, 'tif');
  return Object.entries(extensions).find(([, candidate]) => candidate === extension)?.[0] || '';
}

export function voucherExtension(file: File): string {
  if (!file.size) throw new Error('El comprobante está vacío. Elegí otro archivo.');
  if (file.size > VOUCHER_MAX_BYTES) throw new Error('El comprobante no puede superar los 10 MB.');
  const extension = extensions[voucherMimeType(file)];
  if (!extension) throw new Error('Elegí una foto (JPG, PNG, WebP, HEIC u otro formato compatible) o un PDF.');
  return extension;
}

/** Permanent private reference; this URL never grants read access or contains a token. */
export function voucherReference(path: string): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/authenticated/${VOUCHER_BUCKET}/${path}`;
}

export function voucherPath(store: string, shift: string, reference: string): string {
  if (!isValidUUID(store) || !isValidUUID(shift)) throw new Error('Comercio o turno inválido.');
  const url = new URL(reference);
  const prefix = `/storage/v1/object/authenticated/${VOUCHER_BUCKET}/${store}/${shift}/`;
  const file = url.pathname.slice(prefix.length);
  if (url.origin !== new URL(SUPABASE_URL).origin || url.search || url.hash || !url.pathname.startsWith(prefix)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif|pdf)$/.test(file)) {
    throw new Error('El comprobante no corresponde a este comercio y turno.');
  }
  return `${store}/${shift}/${file}`;
}

export function movementDetails(type: string, category = 'general', voucherUrl?: string | null, supplierName?: string | null) {
  if (!['general', 'supplier_payment', 'other'].includes(category) || (type !== 'RETIRO' && category !== 'general')) throw new Error('Categoría de movimiento inválida.');
  const supplier = supplierName?.trim() || null;
  const voucher = voucherUrl?.trim() || null;
  if (category === 'supplier_payment' && !supplier) throw new Error('Ingresá el nombre del proveedor.');
  if (supplier && supplier.length > 160) throw new Error('El nombre del proveedor no puede superar los 160 caracteres.');
  if (category === 'supplier_payment' && !voucher) throw new Error('Adjuntá el comprobante para pagos a proveedores');
  return { category, supplierName: category === 'supplier_payment' ? supplier : null, voucherUrl: category === 'supplier_payment' ? voucher : null };
}
