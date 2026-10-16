import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
const dom = new JSDOM('', { url: 'http://localhost:3001' });
Object.assign(globalThis, { window: dom.window, Event: dom.window.Event });
let online = true;
Object.defineProperty(globalThis, 'navigator', { value: { get onLine() { return online; } }, configurable: true });
let account = 'cashier', fail = null, calls = [], last;
globalThis.__offlineAuth = { auth: { getSession: async () => ({ data: { session: { user: { id: account }, access_token: 'test-token' } } }) }, rpc: (_name, args) => ({ setHeader: async () => {
  calls.push(args.p_operation); if (fail) return { error: fail };
  return { data: { ticketNumber: 'T-100' }, error: null };
} }) };
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
  plugins: [{ name: 'offline-test-client', enforce: 'pre', resolveId(id) { if (id.endsWith('/lib/supabase')) return '\0offline-client'; }, load(id) { if (id === '\0offline-client') return 'export const supabase=globalThis.__offlineAuth; export const SUPABASE_URL="https://example.test"; export const SUPABASE_ANON_KEY="test";'; } }] });
try {
  const offline = await server.ssrLoadModule('/src/features/retail/offline.ts');
  let serverStock = 5;
  const remote = {
    stores: async () => [{ id: 'store' }], role: async () => 'cashier', branches: async () => [{ id: 'branch', name: 'Centro' }],
    registers: async () => [{ id: 'reg', branch_id: 'branch', active: true, name: 'Caja' }],
    registerAvailability: async () => [{ register_id: 'reg', occupied: false }],
    shifts: async () => [], products: async () => [{ id: 'product', name: 'Agua', price: 50, stock: serverStock }],
    ledgers: async () => [{ id: 'ledger', name: 'General', is_default: true }], priceLists: async () => [],
    sales: async () => [], movements: async () => [], shiftBalance: async () => 100,
    openShift: async () => assert.fail('Must not wait for remote writes'), checkout: async () => assert.fail('Must not write remotely before durable enqueue'),
    addMovement: async () => assert.fail('Must enqueue'), closeShift: async () => assert.fail('Must enqueue'),
    replenishProductStock: async () => assert.fail('Must enqueue stock'), replenishStockBatch: async () => assert.fail('Must enqueue stock'),
  };
  const retail = offline.withOffline(remote); offline.configureOffline(account);
  for (const method of ['stores', 'branches', 'registers', 'registerAvailability', 'shifts', 'products', 'ledgers', 'priceLists']) await retail[method](...(method === 'stores' ? [] : ['store']));
  await retail.role('store', account);
  online = false;
  const shift = await retail.openShift('store', 'reg', 100);
  const makeSale = () => ({ id: crypto.randomUUID(), items: [{ productId: 'product', name: 'Agua', qty: 1, unitPrice: 50, subtotal: 50 }], total: 50, paymentMethod: 'Mixto', payments: [{ method: 'Efectivo', amount: 20 }, { method: 'QR', amount: 30 }], amountPaid: 50, change: 0, ledgerId: 'ledger', timestamp: '12:00' });
  const sale = makeSale();
  const oversold = { ...makeSale(), items: [{ productId: 'product', name: 'Agua', qty: 6, unitPrice: 50, subtotal: 300 }], total: 300 };
  await assert.rejects(() => retail.checkout('store', shift, oversold), /Stock local insuficiente/);
  assert.equal((await offline.offlineStatus()).queue.length, 1);
  assert.equal((await retail.products('store'))[0].stock, 5, 'rejected local sale rolls back stock and queue');
  last = await retail.checkout('store', shift, sale);
  assert.equal(last.syncStatus, 'pending'); assert.match(last.ticketNumber, /^L-/);
  await retail.checkout('store', shift, sale);
  assert.equal((await retail.products('store'))[0].stock, 4);
  assert.equal(await retail.shiftBalance(shift), 120);
  const movementId = crypto.randomUUID(); await retail.addMovement(shift, 'RETIRO', 10, 'Cambio', movementId); await retail.addMovement(shift, 'RETIRO', 10, 'Cambio', movementId);
  assert.equal(await retail.shiftBalance(shift), 110);
  assert.equal(await retail.closeShift(shift, 110), 110);
  assert.equal((await offline.offlineStatus()).queue.length, 4);
  assert.equal(calls.length, 0);
  await assert.rejects(() => retail.replenishProductStock('store', 'product', 6, undefined, 2), /Solo el administrador/);
  await assert.rejects(() => retail.checkout('store', shift, makeSale()), /turno no está abierto/);
  console.log('PASS offline open, mixed sale, stock deduction, movement and close persist atomically without network');

  offline.stopOffline(); offline.configureOffline('someone-else');
  await assert.rejects(() => retail.stores(), /todavía no están/);
  assert.equal((await offline.offlineStatus()).queue.length, 0);
  offline.configureOffline(account); assert.equal((await offline.offlineStatus()).queue.length, 4);
  assert.equal((await retail.sales('store', shift)).length, 1);
  console.log('PASS account isolation, restart recovery and local duplicate prevention');

  online = true; fail = { message: 'Network fetch failed', code: '' };
  await offline.syncOffline(); assert.equal((await offline.offlineStatus()).queue.length, 4);
  assert.equal((await offline.offlineStatus()).queue[0].error, undefined);
  fail = { message: 'Caja ocupada', code: '23505' };
  await offline.syncOffline(); assert.equal((await offline.offlineStatus()).queue[0].error, 'Caja ocupada');
  const before = calls.length; await offline.syncOffline(); assert.equal(calls.length, before);
  fail = null; serverStock = 4;
  await offline.retryOffline();
  assert.equal((await offline.offlineStatus()).queue.length, 0);
  assert.deepEqual(calls.slice(-4).map(op => op.kind), ['open', 'sale', 'movement', 'close']);
  console.log('PASS reconnection retry, explicit conflicts, retained operations and ordered synchronization');
  offline.stopOffline(); account = 'manager'; offline.configureOffline(account); remote.role = async () => 'admin';
  await retail.role('store', account); await retail.products('store');
  online = false;
  await retail.replenishProductStock('store', 'product', 999, 25, 3);
  assert.equal((await retail.products('store'))[0].stock, 7, 'replenishment uses the delta, not a stale absolute value');
  assert.equal((await retail.products('store'))[0].cost, 25);
  assert.equal((await offline.offlineStatus()).queue[0].operation.kind, 'stock');
  assert.equal((await offline.offlineStatus()).queue[0].operation.items[0].delta, 3);
  console.log('PASS offline stock reception uses additive quantities and manager-only permission');
  offline.stopOffline();
} finally { await server.close(); dom.window.close(); }
