import type { KioscoSale } from '../../../types/kiosco';
import type { Product, Store, Shift, Register, Movement, Branch, PriceList, PriceOverride, SalesLedger } from '../api';
import { priceForProduct } from '../pricing';
import { cashInSale } from '../payments';
import type { Permission } from '../permissions';
import { movementDetails, voucherPath } from '../vouchers';
import { randomUUID } from '../../../utils/uuid';
import { consumeSaleStock, hasComposition, withAvailableStock } from '../../../services/productComposition';
import { productMargin } from '../../../services/productMarginService';
import { closingCashDenominations } from '../../../services/cashDenominations';
import { type Operation, type State, key, updateProductCaches, event, transaction } from './offlineStore';
import { scheduleBackgroundSync } from './offlineSession';
import { syncOffline } from './offlineSync';

// Operaciones hechas sin conexión: se resuelven con la caché y quedan en la cola.
export function findCached<T>(s: State, method: string, store: string): T | undefined {
  const entry = Object.entries(s.cache).find(([k]) => { const [m, args] = JSON.parse(k); return m === method && args[0] === store; });
  return entry?.[1] as T | undefined;
}
export function need<T>(value: T | undefined): T { if (value === undefined) throw new Error('Prepará esta caja con conexión antes de operar offline. Abrí su turno y actualizá los datos.'); return value; }
export function put(s: State, method: string, args: unknown[], value: unknown) { s.cache[key(method, args)] = value; }
function amount(value: unknown) { const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new Error('Importe inválido'); return Math.round(n * 100) / 100; }
export function requireCachedPermission(state: State, store: string, user: string, permission: Permission) {
  const role = state.cache[key('role', [store, user])];
  if (role === 'owner' || role === 'admin') return;
  const permissions = need(state.cache[key('permissions', [store])] as Permission[] | undefined);
  if (!permissions.includes(permission)) throw new Error('Tu perfil no permite esta acción. Pedile a administración que revise tus permisos.');
}
export async function localWrite(user: string, method: string, args: unknown[]) {
  const result = await transaction(user, s => {
    const at = new Date().toISOString();
    let store = String(args[0]); let shiftId = ''; let shift: Shift | undefined;
    if (method === 'replenishProductStock' || method === 'replenishStockBatch') {
      const manager = ['owner', 'admin'].includes(String(s.cache[key('role', [store, user])])) || (findCached<Permission[]>(s, 'permissions', store) || []).includes('manage_products');
      if (!manager) requireCachedPermission(s, store, user, 'replenish_stock');
      const products = need(findCached<Product[]>(s, 'products', store));
      const rows = (method === 'replenishProductStock' ? [{ id: args[1], newStock: args[2], newCost: args[3], quantityAdded: args[4] }] : args[1]) as { id: string; newStock: number; newCost?: number; quantityAdded?: number }[];
      if (!rows.length || rows.length > 10000 || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('La reposición debe contener productos distintos');
      const request = method === 'replenishProductStock' ? args[5] as { id: string; at: string; branch?: string } | undefined : undefined;
      const scoped = (s.cache[key('stores', [])] as Store[] | undefined)?.find(entry => entry.id === store)?.branch_inventory_enabled;
      const branch = request?.branch || (method === 'replenishStockBatch' ? args[2] as string | undefined : undefined);
      if (scoped && !branch) throw new Error('Elegí la sucursal donde recibís la mercadería. El borrador se conserva.');
      const prior = request?.id && s.queue.find(entry => entry.operation.id === request.id)?.operation;
      if (prior) {
        const expected = rows.map(row => ({ product: row.id, delta: row.quantityAdded, cost: row.newCost ?? null }));
        if (prior.kind !== 'stock' || prior.store !== store || prior.at !== request?.at || prior.branch !== branch || JSON.stringify(prior.items) !== JSON.stringify(expected)) throw new Error('La solicitud corresponde a otra reposición. Revisá los datos.');
        return rows.map(row => ({ id: row.id }));
      }
      const items = rows.map(row => {
        const product = products.find(p => p.id === row.id); if (!product) throw new Error('Producto no disponible en este dispositivo');
        if (hasComposition(product)) throw new Error(`Reponé los componentes de ${product.name}; su disponibilidad se calcula con ese stock.`);
        const delta = row.quantityAdded ?? row.newStock - product.stock;
        if (!Number.isInteger(delta) || Math.abs(delta) > 1000000 || product.stock + delta < (product.depotStock || 0)) throw new Error('El stock total no puede quedar por debajo de lo guardado en depósito. Mové esas unidades al salón o revisá la cantidad.');
        if (!manager && (delta <= 0 || row.newCost !== undefined)) throw new Error('Tu permiso permite sumar stock sin modificar costos.');
        if (row.newCost !== undefined && product.sale_markup != null && amount(row.newCost) <= 0)
          throw new Error(`Cargá un costo mayor a cero para calcular el precio principal de ${product.name}.`);
        product.stock += delta;
        if (scoped && branch) {
          if (!product.branchStocks) throw new Error('Actualizá el catálogo con conexión antes de reponer por sucursal.');
          const next = (product.branchStocks[branch] || 0) + delta;
          if (next < 0) throw new Error('No alcanza el stock de esta sucursal para ese ajuste.');
          product.branchStocks = { ...product.branchStocks, [branch]: next };
        }
        if (row.newCost !== undefined) product.cost = amount(row.newCost);
        if (row.newCost !== undefined) {
          const cachedStore = (s.cache[key('stores', [])] as Store[] | undefined)?.find(entry => entry.id === store);
          product.margin_group = productMargin(product.price, product.cost, cachedStore?.low_margin_threshold).group;
        }
        return { product: product.id, delta, cost: row.newCost ?? null };
      });
      const cachedStore = (s.cache[key('stores', [])] as Store[] | undefined)?.find(entry => entry.id === store);
      updateProductCaches(s, store, withAvailableStock(products).map(product => hasComposition(product) || product.sale_markup != null
        ? { ...product, margin_group: productMargin(product.price, product.cost, cachedStore?.low_margin_threshold).group } : product));
      s.revision++; s.queue.push({ operation: { id: request?.id || randomUUID(), kind: 'stock', store, at: request?.at || at, items, ...(branch ? { branch } : {}) } });
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
      const id = randomUUID(); const opening = amount(args[2]);
      const opened: Shift = { id, store_id: store, register_id: register.id, opened_by: user, opened_at: at, opening_cash: opening, closed_at: null, counted_cash: null, expected_cash: null };
      shifts.unshift(opened); availability.forEach(r => { if (r.register_id === register.id) r.occupied = true; });
      put(s, 'sales', [store, id], []); put(s, 'movements', [store, id], []); put(s, 'shiftBalance', [id], opening);
      put(s, 'shiftTicketCount', [id], 0);
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
        requireCachedPermission(s, store, user, 'sell');
        const products = need(findCached<Product[]>(s, 'products', store));
        const priceLists = need(findCached<PriceList[]>(s, 'priceLists', store));
        const priceList = priceLists.find(l => l.id === sale.priceListId);
        const priceOverrides = need(findCached<PriceOverride[]>(s, 'priceOverrides', store));
        if (sale.priceListId && !priceList) throw new Error('La lista no está disponible. Actualizá los datos con conexión antes de cobrar.');
        for (const item of sale.items) {
          if (!Number.isInteger(item.qty) || item.qty <= 0 || item.unitPrice <= 0 || !Number.isFinite(item.unitPrice)) throw new Error('Producto o importe inválido');
          if (item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (!product) throw new Error(`Producto no disponible: ${item.name}`);
            if (item.unitPrice !== priceForProduct(product, priceList, priceOverrides, priceLists)) throw new Error(`Cambió el precio de ${product.name}. Revisá el carrito antes de cobrar.`);
            item.marginGroup = product.margin_group ?? 'standard';
            item.unitCost = product.cost > 0 ? product.cost : null;
          } else {
            item.marginGroup = 'standard'; item.unitCost = null;
          }
        }
        const register = regs.find(r => r.id === shift!.register_id)!;
        const branchInventory = (s.cache[key('stores', [])] as Store[] | undefined)?.find(entry => entry.id === store)?.branch_inventory_enabled;
        if (branchInventory && !register.branch_id) throw new Error('Esta caja necesita una sucursal asignada. Pedile a un administrador que la revise antes de vender.');
        updateProductCaches(s, store, consumeSaleStock(products, sale.items, branchInventory ? register.branch_id || undefined : undefined));
        const branch = need(findCached<Branch[]>(s, 'branches', store)).find(b => b.id === register.branch_id);
        const list = findCached<PriceList[]>(s, 'priceLists', store)?.find(l => l.id === sale.priceListId);
        if (sale.priceListId && (!list || !list.active || (list.branch_id && list.branch_id !== register.branch_id))) throw new Error('La lista de precios no está disponible para esta sucursal');
        const defaultList = priceLists.find(l => l.active && l.branch_id === register.branch_id)
          || priceLists.find(l => l.active && l.is_primary && !l.branch_id);
        const legacyPrincipal = !sale.priceListId && defaultList?.is_primary;
        if (role !== 'owner' && role !== 'admin' && (sale.priceListId || null) !== (defaultList?.id || null) && !legacyPrincipal) throw new Error('Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar');
        const ledger = need(findCached<SalesLedger[]>(s, 'ledgers', store)).find(l => l.active && (l.id === sale.ledgerId || (!sale.ledgerId && l.is_default)));
        if (!ledger) throw new Error('El registro de ventas ya no está activo. Actualizá los registros con conexión antes de cobrar.');
        Object.assign(sale, { store_id: store, shift_id: shiftId, created_by: user, register_id: register.id, ticketNumber: `L-${sale.id.slice(0, 8).toUpperCase()}`, syncStatus: 'pending', createdAt: at, created_at: at, branchId: branch?.id, branchName: branch?.name, registerName: register.name, priceListName: list?.name || 'Lista madre', ledgerId: ledger?.id, ledgerName: ledger?.name });
        sales.unshift(sale); put(s, 'shiftBalance', [shiftId], Math.round((balance + cashInSale(sale)) * 100) / 100);
        const ticketCount = s.cache[key('shiftTicketCount', [shiftId])] as number | undefined;
        put(s, 'shiftTicketCount', [shiftId], ticketCount === undefined ? new Set(sales.map(row => row.id)).size : ticketCount + 1);
        for (const [cacheKey, value] of Object.entries(s.cache)) {
          const [method, params] = JSON.parse(cacheKey);
          if (params[0] === store && (method === 'allSales' || (method === 'reportSales' && at >= params[1] && at < params[2]))) (value as KioscoSale[]).unshift(sale);
        }
        op = { id: sale.id, kind: 'sale', store, shift: shiftId, at, method: sale.paymentMethod, paid: sale.amountPaid, payments: sale.payments || [{ method: sale.paymentMethod, amount: sale.total }], items: sale.items.map(i => ({ product_id: i.productId || null, name: i.name, qty: i.qty, unit_price: i.unitPrice, stock_components: i.stockComponents || [] })), priceList: sale.priceListId || null, ledger: ledger?.id || null }; output = sale;
      } else if (method === 'addMovement') {
        const id = String(args[4]); if (moves.some(m => m.id === id)) return id;
        requireCachedPermission(s, store, user, args[1] === 'INGRESO' ? 'cash_income' : 'cash_withdrawal');
        const value = amount(args[2]); if (!value || !['INGRESO', 'RETIRO'].includes(String(args[1])) || !String(args[3]).trim()) throw new Error('Completá el importe y motivo');
        const details = movementDetails(String(args[1]), args[5] == null ? 'general' : String(args[5]), args[6] as string | null | undefined, args[7] as string | null | undefined);
        if (details.voucherUrl) voucherPath(store, shiftId, details.voucherUrl);
        const canSeeVoucher = ['owner', 'admin'].includes(findCached<string>(s, 'role', store) || '');
        moves.unshift({ id, store_id: store, shift_id: shiftId, created_by: user, type: args[1] as Movement['type'], amount: value, reason: String(args[3]), created_at: at,
          category: details.category, supplier_name: details.supplierName, voucher_url: canSeeVoucher ? details.voucherUrl : null });
        put(s, 'shiftBalance', [shiftId], Math.round((balance + (args[1] === 'INGRESO' ? value : -value)) * 100) / 100);
        op = { id, kind: 'movement', store, shift: shiftId, at, type: args[1], amount: value, reason: args[3], ...details }; output = id;
      } else {
        const counted = amount(args[1]);
        const denominations = closingCashDenominations(args[2], counted);
        shift.closed_at = at; shift.counted_cash = counted; shift.expected_cash = balance;
        shift.closing_denominations = denominations;
        shift.ticket_count = (s.cache[key('shiftTicketCount', [shiftId])] as number | undefined) ?? new Set(sales.map(row => row.id)).size;
        const availability = findCached<{ register_id: string; occupied: boolean }[]>(s, 'registerAvailability', store);
        availability?.forEach(r => { if (r.register_id === shift!.register_id) r.occupied = false; });
        op = { id: randomUUID(), kind: denominations ? 'close_details' : 'close', store, shift: shiftId, at, amount: counted,
          ...(denominations ? { denominations } : {}) }; output = balance;
      }
    }
    s.revision++; s.queue.push({ operation: op }); return output;
  }, true);
  event(); scheduleBackgroundSync(); void syncOffline();
  void navigator.storage?.persist?.().catch(() => false);
  return result;
}
