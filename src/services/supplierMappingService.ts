export interface SupplierMapping {
  invoice_text: string;
  product_id: string;
  product_name: string;
  pack_size_detected?: number;
}

interface SupplierMappings {
  supplier: string;
  mappings: SupplierMapping[];
}

export function normalizeSupplierText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const key = (storeId: string) => `kiosco_supplier_mappings_${storeId}`;

function read(storeId: string): SupplierMappings[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(storeId)) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(group => group && typeof group.supplier === 'string' && Array.isArray(group.mappings))
      .map(group => ({ supplier: group.supplier, mappings: group.mappings.filter((mapping: SupplierMapping) =>
        mapping && typeof mapping.invoice_text === 'string' && typeof mapping.product_id === 'string'
        && typeof mapping.product_name === 'string' && normalizeSupplierText(mapping.invoice_text)
        && (mapping.pack_size_detected === undefined || (Number.isSafeInteger(mapping.pack_size_detected) && mapping.pack_size_detected >= 1))) }));
  } catch { return []; }
}

export function getMappings(storeId: string, supplier: string): SupplierMapping[] {
  const normalized = normalizeSupplierText(supplier);
  if (!storeId || !normalized) return [];
  return read(storeId).filter(group => normalizeSupplierText(group.supplier) === normalized).flatMap(group => group.mappings);
}

export function findMapping(storeId: string, supplier: string, invoiceText: string): SupplierMapping | null {
  const normalized = normalizeSupplierText(invoiceText);
  return normalized ? getMappings(storeId, supplier).find(mapping => normalizeSupplierText(mapping.invoice_text) === normalized) || null : null;
}

export function saveMapping(storeId: string, supplier: string, invoiceText: string, productId: string, productName: string, packSize?: number): void {
  if (!storeId || !normalizeSupplierText(supplier)) throw new Error('Ingresá el proveedor para recordar esta vinculación.');
  if (!normalizeSupplierText(invoiceText) || !productId || !productName.trim()) throw new Error('Elegí un producto válido para recordar la vinculación.');
  if (packSize !== undefined && (!Number.isSafeInteger(packSize) || packSize < 1)) throw new Error('La presentación debe tener una cantidad entera de unidades mayor a cero.');
  const groups = read(storeId);
  const supplierKey = normalizeSupplierText(supplier);
  const previous = getMappings(storeId, supplier);
  const mapping: SupplierMapping = { invoice_text: invoiceText.trim(), product_id: productId, product_name: productName.trim(), ...(packSize !== undefined ? { pack_size_detected: packSize } : {}) };
  const mappings = [...previous.filter(item => normalizeSupplierText(item.invoice_text) !== normalizeSupplierText(invoiceText)), mapping];
  try {
    localStorage.setItem(key(storeId), JSON.stringify([...groups.filter(group => normalizeSupplierText(group.supplier) !== supplierKey), { supplier: supplier.trim(), mappings }]));
  } catch {
    throw new Error('No se pudo guardar la vinculación en este dispositivo. Revisá el almacenamiento del navegador e intentá nuevamente.');
  }
}

export const supplierMappingService = { getMappings, saveMapping, findMapping };
