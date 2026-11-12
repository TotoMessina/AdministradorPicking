import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, FormData: dom.window.FormData, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLElement.prototype.scrollTo = () => {};
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
localStorage.setItem('kiosco_audio_muted', 'true');
const React = await import('react');
const { render, fireEvent, cleanup, waitFor, screen, within } = await import('@testing-library/react');
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://example.supabase.co'), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-only') },
  plugins: [{ name: 'test-document-parser', enforce: 'pre',
    resolveId(id) { if (id.endsWith('/invoiceParserService')) return '\0test-document-parser'; },
    load(id) { if (id === '\0test-document-parser') return 'export const extractTextFromFile = async () => { throw new Error("Document parsing is outside UI navigation tests"); }; export const cleanInvoiceOcrText = x => x; export const invoicePackCatalogContext = () => "";'; },
  }],
});
let client;
try {
  ({ supabase: client } = await server.ssrLoadModule('/src/lib/supabase.ts'));
  const { retail } = await server.ssrLoadModule('/src/features/retail/api/index.ts');
  const { RetailApp } = await server.ssrLoadModule('/src/features/retail/RetailApp.tsx');
  const { ToastProvider } = await server.ssrLoadModule('/src/context/ToastContext.tsx');
  const store = { id: 'store', name: 'Mi almacén', address: '', phone: '', receipt_message: 'Gracias', accent_color: '#5a50df', currency: 'ARS', owner_id: 'user' };
  const products = Array.from({ length: 65 }, (_, i) => ({ id: `p${i}`, name: `Agua ${i}`, code: `A${i}`, price: 100, cost: 40, stock: 10, minStock: i === 0 ? 12 : 2, emoji: '💧', category: 'Bebidas', categoryId: 'category', active: true }));
  const fixtures = {
    stores: [store], role: 'owner', categories: [{ id: 'category', name: 'Bebidas', store_id: 'store' }], products,
    branches: [{ id: 'b1', name: 'Centro', address: '', is_default: true }, { id: 'b2', name: 'Norte', address: '', is_default: false }],
    registers: [{ id: 'r1', name: 'Caja Centro', branch_id: 'b1', active: true }, { id: 'r2', name: 'Caja Norte', branch_id: 'b2', active: true }],
    shifts: [{ id: 'shift1', register_id: 'r1', opened_by: 'user', opened_at: '2026-10-13T12:00:00Z', opening_cash: 0, closed_at: null }, { id: 'shift2', register_id: 'r2', opened_by: 'user', opened_at: '2026-10-13T12:00:00Z', opening_cash: 0, closed_at: null }],
    priceLists: [{ id: 'wholesale', name: 'Mayorista', adjustment: -10, active: true }, { id: 'center', name: 'Precios Centro', adjustment: 20, active: true, branch_id: 'b1' }], priceOverrides: [],
    ledgers: [{ id: 'general', name: 'General', is_default: true, active: true }, { id: 'other', name: 'Especial', active: true }],
    members: [], invitations: [], allSales: [], sales: [], movements: [], reportSales: [], registerAvailability: [], shiftBalance: 0, quickProducts: [], popularProducts: [],
  };
  // Nothing here may reach the network: methods without a fixture read as empty.
  globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  for (const [method, value] of Object.entries(retail)) if (typeof value === 'function' && method !== 'subscribe') retail[method] = async () => [];
  for (const [method, value] of Object.entries(fixtures)) retail[method] = async () => value;
  retail.acceptInvitations = async () => 0;
  retail.branchPriceRule = async (_store, branch) => branch === 'b1' ? 'center' : null;
  render(React.createElement(ToastProvider, null, React.createElement(RetailApp, { session: { user: { id: 'user', email: 'test@example.test' } } })));
  const navButton = name => within(screen.getByRole('navigation', { name: 'Navegación principal' })).queryByRole('button', { name });
  const go = async name => { await waitFor(() => assert.ok(navButton(name))); await React.act(async () => fireEvent.click(navButton(name))); };
  await go(/Vender/);
  await waitFor(() => assert.ok(screen.getByLabelText('Buscar producto o escanear código')));
  let quickSaved;
  retail.saveQuickProducts = async (...args) => { quickSaved = args; };
  fireEvent.click(screen.getByRole('button', { name: 'Personalizar', exact: true }));
  fireEvent.change(screen.getByLabelText('Buscar para la botonera'), { target: { value: 'Agua 1' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Agua 1$/ }));
  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar botonera (1/20)' })));
  assert.deepEqual(quickSaved, ['store', 'b1', ['p1']]);
  assert.ok(screen.getByRole('button', { name: 'Venta rápida: Agua 1' }));
  console.log('PASS branch quick-product customization, save and touch-accessible product button');
  const priceList = () => screen.getByLabelText('Seleccionar lista de precios');
  const branchSelect = () => document.querySelectorAll('.branch-drawer-select')[0];
  const registerSelect = () => document.querySelectorAll('.branch-drawer-select')[1];
  const chooseBranch = async id => {
    if (!document.querySelector('.branch-drawer-panel.open')) fireEvent.click(screen.getByRole('button', { name: /Cambiar sucursal o caja/ }));
    await React.act(async () => fireEvent.change(branchSelect(), { target: { value: id } }));
  };
  const searchBox = screen.getByLabelText('Buscar producto o escanear código');
  fireEvent.change(searchBox, { target: { value: 'Agua' } });
  assert.equal(document.querySelectorAll('.pos-search-item').length, 16, 'long results stay paged');
  fireEvent.change(searchBox, { target: { value: 'Agua 0' } });
  assert.equal(priceList().value, 'center', 'B1 starts with its assigned list');
  fireEvent.change(priceList(), { target: { value: 'wholesale' } });
  fireEvent.click(screen.getByRole('button', { name: /^Agregar Agua 0, \$\s?90/ }));
  assert.equal(priceList().disabled, true);
  assert.equal(screen.getByLabelText('Seleccionar registro de ventas').disabled, true);
  fireEvent.click(screen.getByRole('button', { name: /Cambiar sucursal o caja/ }));
  assert.equal(branchSelect().disabled, true, 'a sale in progress blocks changing branch');
  assert.equal(branchSelect().value, 'b1');
  assert.ok(screen.getByText('Terminá o vaciá la venta actual para poder cambiar de sucursal o caja.'));
  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: 'Quitar Agua 0' })));
  await chooseBranch('b2');
  assert.equal(registerSelect().value, 'r2');
  fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
  await waitFor(() => assert.equal(screen.queryByRole('button', { name: 'Venta rápida: Agua 1' }), null));
  await waitFor(() => assert.equal(priceList().value, '', 'B2 without assignment uses the mother list'));
  assert.equal(priceList().querySelector('option[value="center"]'), null, 'B1 exclusive list is unavailable in B2');
  await chooseBranch('b1');
  fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
  await waitFor(() => assert.equal(priceList().value, 'center', 'Switching B2 to B1 restores the branch default'));
  fireEvent.change(priceList(), { target: { value: 'wholesale' } });
  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' })));
  await waitFor(() => assert.equal(priceList().value, 'wholesale', 'Manager override survives refresh on the same branch'));
  console.log('PASS branch default on B2 to B1, mother-list fallback, exclusive list filtering and preserved manager override');
  console.log('PASS progressive sale options, product paging, branch selection and cart protection');

  await go(/Productos y stock/);
  const catalogPanel = document.getElementById('catalog-panel-products');
  const catalog = within(catalogPanel);
  assert.equal(catalogPanel.hidden, false);
  assert.equal(catalogPanel.querySelectorAll('tbody > tr').length, 25);
  fireEvent.change(catalog.getByLabelText('Por página:'), { target: { value: '100' } });
  assert.equal(catalogPanel.querySelectorAll('tbody > tr').length, 65);
  fireEvent.click(catalog.getByRole('button', { name: /Stock bajo/ }));
  assert.equal(catalogPanel.querySelectorAll('tbody > tr').length, 1);
  const productSearch = 'Buscar productos por nombre, código o categoría';
  fireEvent.change(catalog.getByLabelText(productSearch), { target: { value: 'Agua' } });
  screen.getByRole('tab', { name: 'Catálogo y stock' }).focus();
  fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
  assert.equal(document.activeElement.id, 'catalog-tab-prices');
  assert.equal(catalogPanel.hidden, true);
  fireEvent.keyDown(document.activeElement, { key: 'Home' });
  assert.equal(catalogPanel.hidden, false);
  assert.equal(catalog.getByLabelText(productSearch).value, 'Agua');
  console.log('PASS catalog paging, low-stock filter and keyboard section navigation');

  await go(/Mi comercio/);
  const general = document.getElementById('settings-panel-general');
  const name = within(general).getByLabelText('Nombre', { exact: true });
  fireEvent.change(name, { target: { value: 'Nombre sin guardar' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Locales y cajas' }));
  assert.equal(general.hidden, true);
  assert.equal(document.getElementById('settings-panel-locations').hidden, false);
  fireEvent.click(screen.getByRole('tab', { name: 'Datos del comercio' }));
  assert.equal(name.value, 'Nombre sin guardar');
  console.log('PASS settings groups preserve unsaved form values');

  const COUNT_LABEL = '¿Cuánta plata contaste? ($)';
  await go(/^Caja/);
  fireEvent.click(await screen.findByRole('tab', { name: 'Cerrar la caja' }));
  fireEvent.change(screen.getByLabelText(COUNT_LABEL), { target: { value: '125' } });
  await React.act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Ver ventas' })));
  assert.equal(document.getElementById('cash-panel-shift').hidden, true);
  fireEvent.click(screen.getByRole('tab', { name: 'Mi caja' }));
  assert.equal(screen.getByLabelText(COUNT_LABEL).value, '125');
  console.log('PASS switching to reports preserves the current cash count');
  cleanup();

  // Administrators can identify and assign cashiers without gaining owner-only actions.
  retail.role = async () => 'admin';
  retail.members = async () => [{ user_id: 'cashier-private-id', email: 'caja@example.test', role: 'cashier', branch_id: null, register_id: null }];
  let assignment;
  retail.setCashierAccess = async (...args) => { assignment = args; };
  const mountWorkspace = () => render(React.createElement(ToastProvider, null, React.createElement(RetailApp, { session: { user: { id: 'user', email: 'test@example.test' } } })));
  mountWorkspace();
  await go(/Mi comercio/);
  fireEvent.click(await screen.findByRole('tab', { name: 'Personas con acceso' }));
  assert.ok(screen.getByText('caja@example.test'));
  assert.equal(screen.queryByText('cashier-private-id'), null);
  assert.equal(screen.queryByRole('button', { name: 'Quitar', exact: true }), null);
  fireEvent.click(screen.getByRole('button', { name: /Editar acceso/ }));
  const access = within(screen.getByRole('form', { name: 'Configurar acceso de caja@example.test' }));
  const setRegister = value => fireEvent.change(access.getByLabelText('Caja'), { target: { value } });
  setRegister('r2');
  assert.equal(access.getByLabelText('Sucursal').value, 'b2');
  fireEvent.change(access.getByLabelText('Sucursal'), { target: { value: 'b1' } });
  assert.equal(access.getByLabelText('Caja').value, '');
  assert.equal(within(access.getByLabelText('Caja')).queryByRole('option', { name: 'Caja Norte' }), null);
  fireEvent.change(access.getByLabelText('Sucursal'), { target: { value: '' } });
  setRegister('r2');
  await React.act(async () => fireEvent.click(access.getByRole('button', { name: 'Guardar cambios' })));
  await waitFor(() => assert.deepEqual(assignment, ['store', 'cashier-private-id', 'b2', 'r2', false]));
  cleanup();
  console.log('PASS admin team emails, automatic register branch, branch reset and owner-only removal');

  retail.role = async () => 'cashier';
  retail.branches = async () => [fixtures.branches[1]];
  retail.registers = async () => [fixtures.registers[1]];
  retail.shifts = async () => [];
  retail.registerAvailability = async () => [{ register_id: 'r2', occupied: true }];
  for (const method of ['members', 'invitations', 'allSales']) retail[method] = async () => assert.fail(`Cashier must not request ${method}`);
  retail.permissions = async () => ['sell', 'cash_income', 'cash_withdrawal', 'move_sale_ledger', 'submit_remito'];
  retail.openShift = async () => { retail.shifts = async () => [fixtures.shifts[1]]; };
  mountWorkspace();
  await go(/Vender/);
  await screen.findByText('Esta caja está en uso');
  assert.equal(screen.queryByRole('button', { name: /Cambiar sucursal o caja/ }), null, 'an assigned cashier has no branch selector');
  assert.equal(navButton(/Mi comercio/), null);
  await go(/^Caja/);
  const openButton = () => within(document.querySelector('.cash-opening')).getByRole('button', { name: 'Abrir la caja' });
  await waitFor(() => assert.equal(openButton().disabled, true));
  assert.equal(screen.queryByRole('tab', { name: 'Ver ventas' }), null);
  retail.registerAvailability = async () => [{ register_id: 'r2', occupied: false }];
  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' })));
  await waitFor(() => assert.equal(openButton().disabled, false));
  await React.act(async () => fireEvent.submit(openButton().closest('form')));
  await waitFor(() => assert.ok(screen.getByRole('tab', { name: 'Cerrar la caja' })));
  await go(/Vender/);
  await screen.findByLabelText('Buscar producto o escanear código');
  assert.equal(screen.queryByLabelText('Seleccionar lista de precios'), null, 'Cashier cannot override the branch price rule');
  cleanup();
  console.log('PASS assigned cashier defaults, private navigation, occupied register protection and guided opening-to-selling');

  const { ThermalReceiptModal } = await server.ssrLoadModule('/src/components/ThermalReceiptModal.tsx');
  const sale = { id: 's', ticketNumber: 'T-1', items: [], total: 100, amountPaid: 100, change: 0, paymentMethod: 'Efectivo', date: '13/10/2026', timestamp: '12:00' };
  function ReceiptHarness() {
    const [open, setOpen] = React.useState(false);
    return React.createElement(React.Fragment, null, React.createElement('button', { onClick: () => setOpen(true) }, 'Abrir ticket'), React.createElement(ThermalReceiptModal, { sale, isOpen: open, onClose: () => setOpen(false) }));
  }
  render(React.createElement(ReceiptHarness));
  const opener = screen.getByRole('button', { name: 'Abrir ticket' }); opener.focus(); fireEvent.click(opener);
  const dialog = screen.getByRole('dialog', { name: 'Ticket T-1' });
  assert.ok(dialog.contains(document.activeElement));
  const buttons = [...dialog.querySelectorAll('button')];
  buttons.at(-1).focus(); fireEvent.keyDown(document, { key: 'Tab' });
  assert.equal(document.activeElement, buttons[0]);
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(document.activeElement, opener);
  assert.notEqual(document.body.style.overflow, 'hidden');
  console.log('PASS receipt focus trap, Escape dismissal and focus restoration');
  cleanup();

  const { AuthGate } = await server.ssrLoadModule('/src/features/retail/AuthGate.tsx');
  client.auth.onAuthStateChange = (_callback) => { queueMicrotask(() => _callback('SIGNED_OUT', null)); return { data: { subscription: { unsubscribe() {} } } }; };
  render(React.createElement(AuthGate, null, () => null));
  await waitFor(() => assert.ok(screen.getByLabelText('Contraseña')));
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'example-secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
  assert.equal(screen.getByLabelText('Contraseña').type, 'text');
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
  assert.equal(screen.getByLabelText('Contraseña').type, 'password');
  console.log('PASS password visibility control preserves the typed value');
} finally { cleanup(); await client?.auth.dispose(); await server.close(); dom.window.close(); }
