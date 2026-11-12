import type { KioscoSale } from '../../../types/kiosco';
import type { Product, Branch, PriceList, PriceOverride } from '../api';
import { type Remote, key, event, transaction } from './offlineStore';
import { activeUser, offlineSupported } from './offlineSession';
import { reads, operational, permissionReads, remitoOnline, transferOnline, remoteRead, backgroundRead } from './offlineReads';
import { findCached, need, requireCachedPermission, localWrite } from './offlineLocal';

/** Envuelve las llamadas a Supabase para que funcionen sin conexión cuando corresponde. */
export let remote: Remote;
export function withOffline<T extends Remote>(source: T): T {
  remote = source;
  return new Proxy(source, { get(target, property: string) {
    const original = target[property]; if (typeof original !== 'function') return original;
    return async (...args: unknown[]) => {
      const user = activeUser;
      if (!user || !offlineSupported()) return original(...args as never[]);
      if (operational.has(property)) return localWrite(user, property, args);
      if (property === 'managementLocations') {
        if (navigator.onLine === false) throw new Error('Conectate para administrar locales y cajas. Podés seguir vendiendo en tu caja preparada.');
        return original(...args as never[]);
      }
      if (property === 'productDeletionHistory') {
        if (navigator.onLine === false) throw new Error('Conectate para consultar los productos eliminados.');
        return original(...args as never[]);
      }
      if (property === 'saleLedgerHistory') {
        if (navigator.onLine === false) throw new Error('Conectate para consultar el historial de registros.');
        return original(...args as never[]);
      }
      if (property === 'moveSaleLedger') {
        if (navigator.onLine === false) throw new Error('Conectate para cambiar el registro de una venta terminada.');
        await transaction(user, state => requireCachedPermission(state, String(args[0]), user, 'move_sale_ledger'));
        const pending = await transaction(user, state => state.queue.some(entry => entry.operation.kind === 'sale' && entry.operation.id === args[1]));
        if (pending) throw new Error('Esperá a que esta venta se sincronice antes de cambiar su registro.');
        const moved = await original(...args as never[]) as KioscoSale;
        // Patch only classification. Never replace optimistic stock, payments or pending operations.
        try {
          await transaction(user, state => {
            state.revision++;
            for (const [cacheKey, value] of Object.entries(state.cache)) {
              if (['sales', 'allSales', 'reportSales'].includes(JSON.parse(cacheKey)[0]) && Array.isArray(value)) {
                state.cache[cacheKey] = (value as KioscoSale[]).map(sale => sale.id === moved.id ? { ...sale, ledgerId: moved.ledgerId, ledgerName: moved.ledgerName } : sale);
              }
            }
          }, true);
        } catch { /* The server change is saved; caller receives the authoritative sale. */ }
        event();
        return moved;
      }
      if (remitoOnline.has(property)) {
        if (navigator.onLine === false) throw new Error('Necesitás conexión para consultar o enviar remitos. El borrador sigue en esta pantalla.');
        return original(...args as never[]);
      }
      if (transferOnline.has(property)) {
        if (navigator.onLine === false) throw new Error('Necesitás conexión para consultar o registrar transferencias. El borrador sigue en esta pantalla.');
        return original(...args as never[]);
      }
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
            const lists = need(findCached<PriceList[]>(state, 'priceLists', String(args[0])));
            return (lists.find(list => list.active && list.branch_id === args[1])
              || lists.find(list => list.active && list.is_primary && !list.branch_id))?.id || null;
          });
        }
        const cached = await transaction(user, s => ({ value: s.cache[key(property, args)], pending: s.queue.length > 0 }));
        if (cached.value !== undefined) { if (!cached.pending || permissionReads.has(property)) backgroundRead(user, property, args); return cached.value; }
        if (navigator.onLine === false) throw new Error('Estos datos todavía no están disponibles en este dispositivo. Conectate para prepararlos.');
        return remoteRead(user, property, args);
      }
      if (navigator.onLine === false) throw new Error('Esta configuración necesita conexión. Podés seguir vendiendo desde tu caja.');
      if (property === 'setDepot' || property === 'depotOperation') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de cambiar o mover stock de depósito. El borrador se conserva.');
      });
      if (property === 'depotMovements') return original(...args as never[]);
      if (property === 'saveMarginThreshold') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de cambiar el límite de bajo margen. El porcentaje ingresado se conserva.');
      });
      if (property === 'setStorePricing' || property === 'updateProductPricing' || property === 'bulkUpdatePricing') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de cambiar el precio por costo o el redondeo. Lo ingresado se conserva.');
      });
      if (property === 'savePriceListTree' || property === 'savePriceList' || property === 'savePriceOverride' || property === 'deletePriceList') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de cambiar listas o precios fijos. El borrador se conserva.');
      });
      if (property === 'checkoutOnCredit' || property === 'customerPayment') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de fiar o registrar un cobro. La venta se conserva.');
      });
      if (property === 'returnSale') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de anular o devolver una venta. El motivo se conserva.');
      });
      if (property === 'archiveProduct' || property === 'restoreProduct' || property === 'deleteProductPermanently') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de eliminar o restaurar productos.');
      });
      if (property === 'saveProduct') await transaction(user, state => {
        const product = args[1] as Product;
        const previous = findCached<Product[]>(state, 'products', String(args[0]))?.find(row => row.id === product.id);
        if (state.queue.length && product.sellable !== undefined && product.sellable !== (previous?.sellable !== false))
          throw new Error('Sincronizá las operaciones pendientes antes de cambiar si un producto se vende o es solo insumo. El borrador se conserva.');
      });
      if (property === 'saveProductComposition' || property === 'enableLooseCigarettes' || property === 'createCompositeProduct') await transaction(user, state => {
        if (state.queue.length) throw new Error('Sincronizá las operaciones pendientes antes de configurar combos o sueltos. El borrador se conserva.');
      });
      const result = await original(...args as never[]);
      if (property === 'deletePriceList') {
        const store = String(args[0]); const list = String(args[1]);
        await transaction(user, state => {
          state.revision++;
          const primary = findCached<PriceList[]>(state, 'priceLists', store)?.find(row => row.is_primary && row.active);
          for (const [k, value] of Object.entries(state.cache)) {
            const [method, parameters] = JSON.parse(k);
            if (parameters[0] !== store) continue;
            if (method === 'priceLists') state.cache[k] = (value as PriceList[]).filter(row => row.id !== list);
            if (method === 'priceOverrides') state.cache[k] = (value as PriceOverride[]).filter(row => row.list_id !== list);
            if (method === 'branchPriceRule' && value === list) state.cache[k] = primary?.id || null;
          }
        }, true);
        event();
      }
      if (property === 'archiveProduct' || property === 'deleteProductPermanently') {
        const store = String(args[0]); const productId = String(args[1]);
        await transaction(user, state => {
          state.revision++;
          for (const [k, value] of Object.entries(state.cache)) {
            const [method, parameters] = JSON.parse(k);
            if (parameters[0] !== store) continue;
            if (method === 'products' && Array.isArray(value)) {
              state.cache[k] = (value as Product[]).filter(row => row.id !== productId);
            }
            if (method === 'quickProducts' && Array.isArray(value)) {
              state.cache[k] = (value as { product_id: string }[]).filter(row => row.product_id !== productId);
            }
            if (method === 'popularProducts' && Array.isArray(value)) {
              state.cache[k] = (value as { product_id: string }[]).filter(row => row.product_id !== productId);
            }
          }
        }, true);
        event();
      }
      if (property === 'restoreProduct') {
        const store = String(args[0]);
        await transaction(user, state => {
          state.revision++;
          for (const k of Object.keys(state.cache)) {
            const [method, parameters] = JSON.parse(k);
            if (parameters[0] === store && method === 'products') {
              delete state.cache[k];
            }
          }
        }, true);
        event();
      }
      if (property === 'setDepot' || property === 'depotOperation' || property === 'createCompositeProduct') {
        const state = await transaction(user, s => { s.revision++; return s; }, true);
        // The write is already committed; a failed refresh cannot turn it into a
        // failed operation. Normal refresh/background reads can recover the view.
        await Promise.allSettled(Object.keys(state.cache).filter(k => ['products', 'stores'].includes(JSON.parse(k)[0])).map(k => {
          const [method, parameters] = JSON.parse(k);
          return remoteRead(user, method, parameters);
        }));
        event();
        return result;
      }
      // Configuration is online-only. Refresh cached catalog/permissions after changes.
      const state = await transaction(user, s => s);
      const permissionChange = property === 'savePermissionProfile' || property === 'setStaffProfile';
      if (!state.queue.length || permissionChange) await Promise.all(Object.keys(state.cache).map(k => {
        const [m, a] = JSON.parse(k);
        if (state.queue.length && !permissionReads.has(m)) return Promise.resolve();
        return remoteRead(user, m, a).catch(() => {});
      }));
      return result;
    };
  } });
}
