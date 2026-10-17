import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { KioscoSale } from '../../types/kiosco';
import type { Product, Shift, Register, Movement, Branch, PriceList, SalesLedger } from './api';
import { cashInSale } from './payments';

type Operation = { id: string; kind: 'open' | 'sale' | 'movement' | 'close' | 'stock'; store: string; at: string; shift?: string; [key: string]: unknown };
export type PendingOperation = { operation: Operation; error?: string };
type State = { cache: Record<string, unknown>; queue: PendingOperation[]; revision: number };
type Remote = Record<string, (...args: never[]) => Promise<unknown>>;
let activeUser = '';
let remote: Remote;
let syncing = false;
let database: Promise<IDBDatabase> | undefined;
const fresh = (): State => ({ cache: {}, queue: [], revision: 0 });
const key = (method: string, args: unknown[]) => JSON.stringify([method, args]);
const event = () => window.dispatchEvent(new Event('retail-local-change'));
export const offlineSupported = () => typeof indexedDB !== 'undefined';
export function configureOffline(user: string) { activeUser = user; }
export function stopOffline() { activeUser = ''; return backgroundAuth(null).catch(() => {}); }
export async function backgroundAuth(session: Session | null) {
  if (!offlineSupported()) return;
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('meta', 'readwrite');
    tx.objectStore('meta').put(session?.access_token ? { user: session.user.id, token: session.access_token, expires: session.expires_at, url: SUPABASE_URL, key: SUPABASE_ANON_KEY } : null, 'auth');
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
function scheduleBackgroundSync() {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready.then(registration => {
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    return sync?.register('retail-outbox');
  }).catch(() => {});
}
function db() {
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
async function transaction<T>(user: string, mutate: (state: State) => T, write = false): Promise<T> {
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
const reads = new Set(['stores', 'role', 'categories', 'registers', 'shifts', 'branches', 'priceLists', 'branchPriceRule', 'priceOverrides', 'ledgers', 'products', 'sales', 'movements', 'shiftBalance', 'registerAvailability', 'quickProducts', 'popularProducts', 'members', 'invitations', 'allSales', 'reportSales']);
const operational = new Set(['openShift', 'closeShift', 'addMovement', 'checkout', 'replenishProductStock', 'replenishStockBatch']);
const fetching = new Set<string>();
const fetchedAt = new Map<string, number>();
async function remoteRead(user: string, method: string, args: unknown[]) {
  const cacheKey = key(method, args);
  const revision = await transaction(user, state => state.revision);
  const value = await remote[method](...args as never[]);
  if (activeUser !== user) return value;
  let changed = false;
  await transaction(user, state => {
    // A request started before a local sale must never overwrite its optimistic stock/balance.
    if (state.queue.length || state.revision !== revision) return;
    changed = JSON.stringify(state.cache[cacheKey]) !== JSON.stringify(value);
    state.cache[cacheKey] = value;
  }, true);
  if (changed) event();
  return value;
}
function backgroundRead(user: string, method: string, args: unknown[], force = false) {
  const id = user + key(method, args);
  if (navigator.onLine === false || fetching.has(id) || (!force && Date.now() - (fetchedAt.get(id) || 0) < 30000)) return;
  fetching.add(id); fetchedAt.set(id, Date.now());
  void remoteRead(user, method, args).catch(() => {}).finally(() => fetching.delete(id));
}
export async function offlineStatus() {
  if (!activeUser || !offlineSupported()) return { queue: [] as PendingOperation[], supported: offlineSupported(), syncing };
  const queue = await transaction(activeUser, s => s.queue);
  return { queue, supported: true, syncing };
}
export async function exportOfflineBackup() {
  if (!activeUser) return;
  const data = await transaction(activeUser, state => ({ version: 1, user: activeUser, exportedAt: new Date().toISOString(), operations: state.queue }));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `operaciones-pendientes-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function syncOffline() {
  const user = activeUser;
  if (!user || !offlineSupported() || syncing || navigator.onLine === false) return;
  syncing = true; event();
  try {
    // Serial server receipts make concurrent tabs/retries harmless; the local snapshot
    // is reconciled by operation ID after the transaction has committed remotely.
    for (;;) {
      if (activeUser !== user || !navigator.onLine) break;
      const entry = await transaction(user, s => s.queue[0]);
      if (!entry || entry.error) break;
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id !== user) break;
      await backgroundAuth(session.session);
      const { data, error } = await supabase.rpc('retail_sync_operation', { p_operation: entry.operation }).setHeader('Authorization', `Bearer ${session.session.access_token}`);
      if (error) {
        // Transport failures stay retryable. Business/authorization failures are explicit conflicts.
        if (error.code && !['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003'].includes(error.code)) {
          await transaction(user, s => { const current = s.queue.find(q => q.operation.id === entry.operation.id); if (current) current.error = error.message; }, true);
        }
        break;
      }
      await transaction(user, s => {
        s.revision++;
        s.queue = s.queue.filter(q => q.operation.id !== entry.operation.id);
        if (entry.operation.kind === 'sale') for (const [k, value] of Object.entries(s.cache)) {
          if (Array.isArray(value) && ['sales', 'allSales'].includes(JSON.parse(k)[0])) {
            s.cache[k] = (value as KioscoSale[]).map(sale => sale.id === entry.operation.id ? { ...sale, ticketNumber: data.ticketNumber, syncStatus: 'synced' } : sale);
          }
        }
      }, true);
      event();
    }
    const state = await transaction(user, s => s);
    if (!state.queue.length && activeUser === user) for (const k of Object.keys(state.cache)) {
      const [method, args] = JSON.parse(k); if (reads.has(method)) backgroundRead(user, method, args, true);
    }
  } catch { /* Durable queue remains intact; online event/timer/manual retry resumes. */ }
  finally { syncing = false; event(); }
}
export async function retryOffline() {
  if (!activeUser || !offlineSupported()) return;
  await transaction(activeUser, s => { s.queue.forEach(q => delete q.error); }, true);
  await syncOffline();
}
function findCached<T>(s: State, method: string, store: string): T | undefined {
  const entry = Object.entries(s.cache).find(([k]) => { const [m, args] = JSON.parse(k); return m === method && args[0] === store; });
  return entry?.[1] as T | undefined;
}
function need<T>(value: T | undefined): T { if (value === undefined) throw new Error('Prepará esta caja con conexión antes de operar offline. Abrí su turno y actualizá los datos.'); return value; }
function put(s: State, method: string, args: unknown[], value: unknown) { s.cache[key(method, args)] = value; }
function amount(value: unknown) { const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new Error('Importe inválido'); return Math.round(n * 100) / 100; }
async function localWrite(user: string, method: string, args: unknown[]) {
  const result = await transaction(user, s => {
    const at = new Date().toISOString();
    let store = String(args[0]); let shiftId = ''; let shift: Shift | undefined;
    if (method === 'replenishProductStock' || method === 'replenishStockBatch') {
      if (!['owner', 'admin'].includes(String(s.cache[key('role', [store, user])]))) throw new Error('Solo el administrador puede registrar stock');
      const products = need(findCached<Product[]>(s, 'products', store));
      const rows = (method === 'replenishProductStock' ? [{ id: args[1], newStock: args[2], newCost: args[3], quantityAdded: args[4] }] : args[1]) as { id: string; newStock: number; newCost?: number; quantityAdded?: number }[];
      if (!rows.length || rows.length > 10000 || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('La reposición debe contener productos distintos');
      const items = rows.map(row => {
        const product = products.find(p => p.id === row.id); if (!product) throw new Error('Producto no disponible en este dispositivo');
        const delta = row.quantityAdded ?? row.newStock - product.stock;
        if (!Number.isInteger(delta) || Math.abs(delta) > 1000000 || product.stock + delta < 0) throw new Error('Cantidad de stock inválida');
        product.stock += delta;
        if (row.newCost !== undefined) product.cost = amount(row.newCost);
        return { product: product.id, delta, cost: row.newCost ?? null };
      });
      s.revision++; s.queue.push({ operation: { id: crypto.randomUUID(), kind: 'stock', store, at, items } });
      return rows.map(row => ({ id: row.id }));
    }
    if (method === 'checkout') shiftId = String(args[1]);
    if (method === 'addMovement' || method === 'closeShift') {
      shiftId = String(args[0]);
      for (const [k, value] of Object.entries(s.cache)) if (JSON.parse(k)[0] === 'shifts') {
        shift = (value as Shift[]).find(sh => sh.id === shiftId); if (shift) { store = shift.store_id; break; }
      }
    }
    const shifts = need(findCached<Shift[]>(s, 'shifts', store));
    shift ??= shifts.find(sh => sh.id === shiftId);
    const regs = need(findCached<Register[]>(s, 'registers', store));
    let op: Operation; let output: unknown;
    if (method === 'openShift') {
      const register = regs.find(r => r.id === args[1] && r.active);
      if (!register) throw new Error('Caja no habilitada para esta cuenta');
      const availability = need(findCached<{ register_id: string; occupied: boolean }[]>(s, 'registerAvailability', store));
      if (shifts.some(sh => sh.register_id === register.id && !sh.closed_at) || availability.some(r => r.register_id === register.id && r.occupied)) throw new Error('Esta caja ya tiene un turno abierto');
      const id = crypto.randomUUID(); const opening = amount(args[2]);
      const opened: Shift = { id, store_id: store, register_id: register.id, opened_by: user, opened_at: at, opening_cash: opening, closed_at: null, counted_cash: null, expected_cash: null };
      shifts.unshift(opened); availability.forEach(r => { if (r.register_id === register.id) r.occupied = true; });
      put(s, 'sales', [store, id], []); put(s, 'movements', [store, id], []); put(s, 'shiftBalance', [id], opening);
      op = { id, kind: 'open', store, register: register.id, amount: opening, at }; output = id;
    } else {
      if (!shift || shift.closed_at) throw new Error('El turno no está abierto');
      const role = s.cache[key('role', [store, user])];
      if (shift.opened_by !== user && role !== 'owner' && role !== 'admin') throw new Error('El turno pertenece a otro usuario');
      if (!regs.some(r => r.id === shift!.register_id && r.active)) throw new Error('Caja no habilitada');
      const balance = need(s.cache[key('shiftBalance', [shiftId])] as number | undefined);
      const sales = need(s.cache[key('sales', [store, shiftId])] as KioscoSale[] | undefined);
      const moves = need(s.cache[key('movements', [store, shiftId])] as Movement[] | undefined);
      if (method === 'checkout') {
        const sale = structuredClone(args[2]) as KioscoSale;
        const previous = sales.find(saleRow => saleRow.id === sale.id); if (previous) return previous;
        const products = need(findCached<Product[]>(s, 'products', store));
        for (const item of sale.items) {
          if (!Number.isInteger(item.qty) || item.qty <= 0 || item.unitPrice <= 0 || !Number.isFinite(item.unitPrice)) throw new Error('Producto o importe inválido');
          if (item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (!product || product.stock < item.qty) throw new Error(`Stock local insuficiente: ${item.name}`);
            item.marginGroup = product.margin_group ?? 'standard';
            item.unitCost = product.cost > 0 ? product.cost : null;
            product.stock -= item.qty;
          } else {
            item.marginGroup = 'standard'; item.unitCost = null;
          }
        }
        const register = regs.find(r => r.id === shift!.register_id)!;
        const branch = need(findCached<Branch[]>(s, 'branches', store)).find(b => b.id === register.branch_id);
        const list = findCached<PriceList[]>(s, 'priceLists', store)?.find(l => l.id === sale.priceListId);
        if (sale.priceListId && (!list || !list.active || (list.branch_id && list.branch_id !== register.branch_id))) throw new Error('La lista de precios no está disponible para esta sucursal');
        const defaultList = findCached<PriceList[]>(s, 'priceLists', store)?.find(l => l.active && l.branch_id === register.branch_id)?.id || null;
        if (role === 'cashier' && (sale.priceListId || null) !== defaultList) throw new Error('Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar');
        const ledger = need(findCached<SalesLedger[]>(s, 'ledgers', store)).find(l => l.id === sale.ledgerId || (!sale.ledgerId && l.is_default));
        Object.assign(sale, { ticketNumber: `L-${sale.id.slice(0, 8).toUpperCase()}`, syncStatus: 'pending', createdAt: at, created_at: at, branchId: branch?.id, branchName: branch?.name, registerName: register.name, priceListName: list?.name || 'Lista madre', ledgerId: ledger?.id, ledgerName: ledger?.name });
        sales.unshift(sale); put(s, 'shiftBalance', [shiftId], Math.round((balance + cashInSale(sale)) * 100) / 100);
        for (const [cacheKey, value] of Object.entries(s.cache)) {
          const [method, params] = JSON.parse(cacheKey);
          if (params[0] === store && (method === 'allSales' || (method === 'reportSales' && at >= params[1] && at < params[2]))) (value as KioscoSale[]).unshift(sale);
        }
        op = { id: sale.id, kind: 'sale', store, shift: shiftId, at, method: sale.paymentMethod, paid: sale.amountPaid, payments: sale.payments || [{ method: sale.paymentMethod, amount: sale.total }], items: sale.items.map(i => ({ product_id: i.productId || null, name: i.name, qty: i.qty, unit_price: i.unitPrice })), priceList: sale.priceListId || null, ledger: ledger?.id || null }; output = sale;
      } else if (method === 'addMovement') {
        const id = String(args[4]); if (moves.some(m => m.id === id)) return id;
        const value = amount(args[2]); if (!value || !['INGRESO', 'RETIRO'].includes(String(args[1])) || !String(args[3]).trim()) throw new Error('Completá el importe y motivo');
        moves.unshift({ id, type: args[1] as Movement['type'], amount: value, reason: String(args[3]), created_at: at });
        put(s, 'shiftBalance', [shiftId], Math.round((balance + (args[1] === 'INGRESO' ? value : -value)) * 100) / 100);
        op = { id, kind: 'movement', store, shift: shiftId, at, type: args[1], amount: value, reason: args[3] }; output = id;
      } else {
        const counted = amount(args[1]); shift.closed_at = at; shift.counted_cash = counted; shift.expected_cash = balance;
        const availability = findCached<{ register_id: string; occupied: boolean }[]>(s, 'registerAvailability', store);
        availability?.forEach(r => { if (r.register_id === shift!.register_id) r.occupied = false; });
        op = { id: crypto.randomUUID(), kind: 'close', store, shift: shiftId, at, amount: counted }; output = balance;
      }
    }
    s.revision++; s.queue.push({ operation: op }); return output;
  }, true);
  event(); scheduleBackgroundSync(); void syncOffline();
  void navigator.storage?.persist?.().catch(() => false);
  return result;
}
export function withOffline<T extends Remote>(source: T): T {
  remote = source;
  return new Proxy(source, { get(target, property: string) {
    const original = target[property]; if (typeof original !== 'function') return original;
    return async (...args: unknown[]) => {
      const user = activeUser;
      if (!user || !offlineSupported()) return original(...args as never[]);
      if (operational.has(property)) return localWrite(user, property, args);
      if (property === 'acceptInvitations') {
        if (navigator.onLine === false) return 0;
        const cached = await transaction(user, s => s.cache[key('stores', [])]);
        if (cached) { void original(...args as never[]).catch(() => {}); return 0; }
      }
      if (reads.has(property)) {
        if (property === 'branchPriceRule' && navigator.onLine === false) {
          return transaction(user, state => {
            const branches = need(findCached<Branch[]>(state, 'branches', String(args[0])));
            if (!branches.some(branch => branch.id === args[1])) throw new Error('Sucursal no disponible');
            return need(findCached<PriceList[]>(state, 'priceLists', String(args[0]))).find(list => list.active && list.branch_id === args[1])?.id || null;
          });
        }
        const cached = await transaction(user, s => ({ value: s.cache[key(property, args)], pending: s.queue.length > 0 }));
        if (cached.value !== undefined) { if (!cached.pending) backgroundRead(user, property, args); return cached.value; }
        if (navigator.onLine === false) throw new Error('Estos datos todavía no están disponibles en este dispositivo. Conectate para prepararlos.');
        return remoteRead(user, property, args);
      }
      if (navigator.onLine === false) throw new Error('Esta configuración necesita conexión. Podés seguir vendiendo desde tu caja.');
      const result = await original(...args as never[]);
      // Configuration is online-only. Refresh cached catalog/permissions after changes.
      const state = await transaction(user, s => s);
      if (!state.queue.length) await Promise.all(Object.keys(state.cache).map(k => { const [m, a] = JSON.parse(k); return remoteRead(user, m, a).catch(() => {}); }));
      return result;
    };
  } });
}
