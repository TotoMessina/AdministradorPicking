import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SupplierMapping {
  id?: string;
  confidence?: number;
  times_used?: number;
  last_used_at?: string;
  invoice_text: string;
  product_id: string;
  product_name: string;
  pack_size_detected?: number;
}

export interface SaveMappingOptions { confidence?: number; usageOnly?: boolean; mappingId?: string }

function fromRemote(row: SupplierMapping): SupplierMapping {
  return { id: row.id, invoice_text: row.invoice_text, product_id: row.product_id, product_name: row.product_name,
    confidence: Number(row.confidence), times_used: Number(row.times_used), last_used_at: row.last_used_at,
    ...(row.pack_size_detected != null ? { pack_size_detected: row.pack_size_detected } : {}) };
}

interface SupplierMappings {
  supplier: string;
  mappings: SupplierMapping[];
}

export function normalizeSupplierText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// The original key holds legacy data and unsent writes; cache is never uploaded blindly.
const key = (storeId: string) => `kiosco_supplier_mappings_${storeId}`;
const cacheKey = (storeId: string) => `kiosco_supplier_mappings_cache_${storeId}`;
const queues = new Map<string, Promise<unknown>>();

function read(storageKey: string, strict = false): SupplierMappings[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(value)) throw new Error('Formato inválido');
    for (const group of value) {
      if (!group || typeof group.supplier !== 'string' || !normalizeSupplierText(group.supplier) || !Array.isArray(group.mappings)) throw new Error('Proveedor inválido');
      for (const mapping of group.mappings) {
        if (!mapping || typeof mapping.invoice_text !== 'string' || !normalizeSupplierText(mapping.invoice_text)
          || typeof mapping.product_id !== 'string' || typeof mapping.product_name !== 'string' || !mapping.product_name.trim()
          || (mapping.pack_size_detected !== undefined && (!Number.isSafeInteger(mapping.pack_size_detected) || mapping.pack_size_detected < 1))) throw new Error('Vínculo inválido');
      }
    }
    return value as SupplierMappings[];
  } catch {
    if (strict) throw new Error('No se pudo leer la memoria local. Conservá los datos del navegador y revisá el almacenamiento antes de reintentar.');
    return [];
  }
}

function localMappings(storageKey: string, supplier: string): SupplierMapping[] {
  return read(storageKey).filter(group => normalizeSupplierText(group.supplier) === supplier).flatMap(group => group.mappings);
}

function writeGroup(storageKey: string, supplier: string, mappings: SupplierMapping[]) {
  const groups = read(storageKey, true).filter(group => normalizeSupplierText(group.supplier) !== supplier);
  if (mappings.length) groups.push({ supplier, mappings });
  if (groups.length) localStorage.setItem(storageKey, JSON.stringify(groups));
  else localStorage.removeItem(storageKey);
}

function remember(storageKey: string, supplier: string, mapping: SupplierMapping) {
  const previous = localMappings(storageKey, supplier).filter(item => normalizeSupplierText(item.invoice_text) !== normalizeSupplierText(mapping.invoice_text));
  writeGroup(storageKey, supplier, [...previous, mapping]);
}

function inStore<T>(storeId: string, task: () => Promise<T>): Promise<T> {
  const result = (queues.get(storeId) || Promise.resolve()).then(task, task);
  queues.set(storeId, result);
  const cleanup = () => { if (queues.get(storeId) === result) queues.delete(storeId); };
  void result.then(cleanup, cleanup);
  return result;
}

async function remote<T>(request: (signal: AbortSignal) => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  if (!isSupabaseConfigured || !navigator.onLine) throw new Error('Se necesita conexión para compartir las vinculaciones.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const { data, error } = await request(controller.signal);
    if (error) throw error;
    return data;
  } finally { window.clearTimeout(timeout); }
}

async function upload(storeId: string, supplier: string, mapping: SupplierMapping) {
  const data = await remote(signal => supabase.rpc('retail_upsert_supplier_mapping', {
    p_store: storeId, p_supplier: supplier, p_invoice_text: mapping.invoice_text,
    p_product_id: mapping.product_id, p_product_name: mapping.product_name,
    p_pack_size: mapping.pack_size_detected ?? null,
    p_confidence: mapping.confidence ?? 1,
  }).abortSignal(signal));
  const saved = fromRemote(data);
  try { remember(cacheKey(storeId), supplier, saved); } catch { /* Server copy is safe. */ }
  return saved;
}

function acknowledge(storeId: string, supplier: string, mapping: SupplierMapping) {
  // Remove only this acknowledged version, preserving changes from another tab.
  const remaining = localMappings(key(storeId), supplier).filter(item => JSON.stringify(item) !== JSON.stringify(mapping));
  writeGroup(key(storeId), supplier, remaining);
}

export function migrateLocalMappings(storeId: string): Promise<void> {
  return inStore(storeId, async () => {
    if (!storeId) return;
    const groups = read(key(storeId), true);
    for (const group of groups) {
      for (const mapping of group.mappings) {
        const supplier = normalizeSupplierText(group.supplier);
        await upload(storeId, supplier, mapping);
        acknowledge(storeId, supplier, mapping);
      }
    }
    // No flag on partial failure; successful rows have already been acknowledged.
    if (!read(key(storeId), true).length) {
      localStorage.removeItem(key(storeId));
      localStorage.setItem(`kiosco_mappings_migrated_${storeId}`, '1');
    }
  });
}

export async function getMappings(storeId: string, supplier: string): Promise<SupplierMapping[]> {
  const normalized = normalizeSupplierText(supplier);
  if (!storeId || !normalized) return [];
  // Retry pending offline writes before reading the shared authoritative memory.
  try { await migrateLocalMappings(storeId); } catch { /* Preserve pending data for retry. */ }
  try {
    return await inStore(storeId, async () => {
      const mappings: SupplierMapping[] = [];
      for (let offset = 0; ; offset += 500) {
        const data = await remote(signal => supabase.rpc('retail_get_supplier_mappings', { p_store: storeId, p_supplier: normalized }).range(offset, offset + 499).abortSignal(signal));
        if (!Array.isArray(data)) throw new Error('Respuesta de memoria inválida');
        mappings.push(...data.map(fromRemote));
        if (data.length < 500) break;
      }
      try { writeGroup(cacheKey(storeId), normalized, mappings); } catch { /* Read still succeeds without browser storage. */ }
      return mappings;
    });
  } catch { return cachedMappings(storeId, normalized); }
}

function cachedMappings(storeId: string, supplier: string): SupplierMapping[] {
  const merged = new Map<string, SupplierMapping>();
  for (const mapping of [...localMappings(cacheKey(storeId), supplier), ...localMappings(key(storeId), supplier)]) merged.set(normalizeSupplierText(mapping.invoice_text), mapping);
  return [...merged.values()];
}

// Preserve the synchronous public lookup; await getMappings first to refresh its cache.
export function findMapping(storeId: string, supplier: string, invoiceText: string): SupplierMapping | null {
  const normalized = normalizeSupplierText(invoiceText);
  return normalized ? cachedMappings(storeId, normalizeSupplierText(supplier)).find(mapping => normalizeSupplierText(mapping.invoice_text) === normalized) || null : null;
}

export async function saveMapping(storeId: string, supplier: string, invoiceText: string, productId: string, productName: string, packSize?: number, options: SaveMappingOptions = {}): Promise<SupplierMapping> {
  const supplierKey = normalizeSupplierText(supplier);
  if (!storeId || !supplierKey) throw new Error('Ingresá el proveedor para recordar esta vinculación.');
  if (!normalizeSupplierText(invoiceText) || !productId || !productName.trim()) throw new Error('Elegí un producto válido para recordar la vinculación.');
  if (packSize !== undefined && (!Number.isSafeInteger(packSize) || packSize < 1 || packSize > 2147483647)) throw new Error('La presentación debe tener una cantidad entera de unidades válida mayor a cero.');
  const confidence = options.confidence ?? 1;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('La confianza debe estar entre cero y uno.');
  const mapping: SupplierMapping = { invoice_text: invoiceText.trim(), product_id: productId, product_name: productName.trim(), confidence, ...(packSize !== undefined ? { pack_size_detected: packSize } : {}) };
  return inStore(storeId, async () => {
    if (options.usageOnly) {
      if (!options.mappingId) throw new Error('El alias necesita una identificación compartida para registrar su uso.');
      // Usage is best-effort online: never queue a stale automatic upsert that could resurrect an alias.
      const data = await remote(signal => supabase.rpc('retail_upsert_supplier_mapping', {
        p_store: storeId, p_supplier: supplierKey, p_invoice_text: mapping.invoice_text,
        p_product_id: productId, p_product_name: productName, p_pack_size: packSize ?? null,
        p_confidence: confidence, p_usage_only: true, p_mapping_id: options.mappingId,
      }).abortSignal(signal));
      const saved = fromRemote(data);
      try { remember(cacheKey(storeId), supplierKey, saved); } catch { /* Server copy is safe. */ }
      return saved;
    }
    let localSaved = false;
    try { remember(key(storeId), supplierKey, mapping); localSaved = true; } catch { /* Try the server even if local storage is unavailable. */ }
    try {
      const saved = await upload(storeId, supplierKey, mapping);
      try { acknowledge(storeId, supplierKey, mapping); } catch { /* Remote save succeeded; do not report it as lost. */ }
      return saved;
    }
    catch {
      if (!localSaved) throw new Error('No se pudo guardar la vinculación ni en el comercio ni en este dispositivo. Revisá la conexión y el almacenamiento e intentá nuevamente.');
      return mapping;
    }
  });
}

export function deleteMapping(storeId: string, supplier: string, mapping: SupplierMapping): Promise<boolean> {
  return inStore(storeId, async () => {
    if (!mapping.id) throw new Error('Sincronizá este alias antes de eliminarlo del comercio.');
    const normalized = normalizeSupplierText(supplier);
    await remote(signal => supabase.rpc('retail_delete_supplier_mapping', { p_store: storeId, p_supplier: normalized, p_mapping_id: mapping.id }).abortSignal(signal));
    let cacheCleared = true;
    for (const storageKey of [key(storeId), cacheKey(storeId)]) {
      try {
        writeGroup(storageKey, normalized, localMappings(storageKey, normalized).filter(item =>
          item.id !== mapping.id && normalizeSupplierText(item.invoice_text) !== normalizeSupplierText(mapping.invoice_text)));
      } catch { cacheCleared = false; }
    }
    return cacheCleared;
  });
}

export const supplierMappingService = { getMappings, saveMapping, findMapping, migrateLocalMappings, deleteMapping };
