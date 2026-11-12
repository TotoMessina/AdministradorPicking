import { key, event, transaction } from './offlineStore';
import { activeUser } from './offlineSession';
import { remote } from './withOffline';

// Qué métodos se leen de la caché, cuáles funcionan sin conexión y cuáles exigen conexión.
export const reads = new Set(['stores', 'role', 'permissions', 'permissionProfiles', 'categories', 'registers', 'shifts', 'branches', 'priceLists', 'branchPriceRule', 'priceOverrides', 'ledgers', 'products', 'sales', 'movements', 'shiftBalance', 'registerAvailability', 'quickProducts', 'popularProducts', 'members', 'invitations', 'allSales', 'reportSales']);
export const operational = new Set(['openShift', 'closeShift', 'addMovement', 'checkout', 'replenishProductStock', 'replenishStockBatch']);
reads.add('shiftTicketCount');
// These records have no optimistic edits. Refresh authorization even if another
// operation is pending, without replacing optimistic sales, stock or balances.
export const permissionReads = new Set(['permissions', 'permissionProfiles', 'role', 'members', 'invitations']);
// These remito calls never change stock/catalog permissions. Polling a badge or
// signing a thumbnail must not trigger the configuration-wide cache refresh.
export const remitoOnline = new Set(['pendingReplenishments', 'getRemitoUrl', 'uploadRemito', 'submitPendingReplenishment', 'rejectPendingReplenishment']);
export const transferOnline = new Set(['stockTransfers', 'createTransfer', 'confirmTransfer', 'cancelTransfer']);
const fetching = new Set<string>();
const fetchedAt = new Map<string, number>();
export async function remoteRead(user: string, method: string, args: unknown[]) {
  const cacheKey = key(method, args);
  const revision = await transaction(user, state => state.revision);
  const value = await remote[method](...args as never[]);
  if (activeUser !== user) return value;
  let changed = false;
  await transaction(user, state => {
    // A request started before a local sale must never overwrite its optimistic stock/balance.
    if (!permissionReads.has(method) && (state.queue.length || state.revision !== revision)) return;
    changed = JSON.stringify(state.cache[cacheKey]) !== JSON.stringify(value);
    state.cache[cacheKey] = value;
  }, true);
  if (changed) event();
  return value;
}
export function backgroundRead(user: string, method: string, args: unknown[], force = false) {
  const id = user + key(method, args);
  if (navigator.onLine === false || fetching.has(id) || (!force && Date.now() - (fetchedAt.get(id) || 0) < 30000)) return;
  fetching.add(id); fetchedAt.set(id, Date.now());
  void remoteRead(user, method, args).catch(() => {}).finally(() => fetching.delete(id));
}
