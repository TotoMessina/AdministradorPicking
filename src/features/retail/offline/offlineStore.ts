import type { Product } from '../api';

// Almacenamiento local (IndexedDB): caché de lecturas y cola de operaciones pendientes.
export type Operation = { id: string; kind: 'open' | 'sale' | 'movement' | 'close' | 'close_details' | 'stock'; store: string; at: string; shift?: string; [key: string]: unknown };
export type PendingOperation = { operation: Operation; error?: string };
export type State = { cache: Record<string, unknown>; queue: PendingOperation[]; revision: number };
export type Remote = Record<string, (...args: never[]) => Promise<unknown>>;
export let database: Promise<IDBDatabase> | undefined;
const fresh = (): State => ({ cache: {}, queue: [], revision: 0 });
export const key = (method: string, args: unknown[]) => JSON.stringify([method, args]);
export function updateProductCaches(state: State, store: string, products: Product[]) {
  for (const cacheKey of Object.keys(state.cache)) {
    const [method, args] = JSON.parse(cacheKey);
    if (method === 'products' && args[0] === store) state.cache[cacheKey] = products;
  }
}
export const event = () => window.dispatchEvent(new Event('retail-local-change'));
export function db() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('retail-offline-v1', 2);
    request.onupgradeneeded = () => { for (const name of ['accounts', 'meta']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(new Error('No se pudo abrir el almacenamiento local. No se guardó la operación.')); };
  });
  return database;
}
// One IndexedDB read/write transaction owns the complete account snapshot and outbox.
// Cross-tab operations serialize at the database, not just in this JavaScript instance.
export async function transaction<T>(user: string, mutate: (state: State) => T, write = false): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('accounts', write ? 'readwrite' : 'readonly');
    const store = tx.objectStore('accounts'); const request = store.get(user); let result: T; let failure: unknown;
    request.onsuccess = () => {
      try { const state: State = request.result || fresh(); if (!Number.isInteger(state.revision)) state.revision = 0; result = mutate(state); if (write) store.put(state, user); }
      catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(failure || new Error('No se pudo guardar en este dispositivo. Revisá el espacio disponible; la venta no se confirmó.'));
  });
}
