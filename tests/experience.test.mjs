import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, FormData: dom.window.FormData, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
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
    load(id) { if (id === '\0test-document-parser') return 'export const extractTextFromFile = async () => { throw new Error("Document parsing is outside UI navigation tests"); }; export const cleanInvoiceOcrText = x => x;'; },
  }],
});
let client;
try {
  ({ supabase: client } = await server.ssrLoadModule('/src/lib/supabase.ts'));
  const { retail } = await server.ssrLoadModule('/src/features/retail/api.ts');
  const { RetailApp } = await server.ssrLoadModule('/src/features/retail/RetailApp.tsx');
  const { ToastProvider } = await server.ssrLoadModule('/src/context/ToastContext.tsx');
  const store = { id: 'store', name: 'Mi almacén', address: '', phone: '', receipt_message: 'Gracias', accent_color: '#5a50df', currency: 'ARS', owner_id: 'user' };
  const products = Array.from({ length: 65 }, (_, i) => ({ id: `p${i}`, name: `Agua ${i}`, code: `A${i}`, price: 100, cost: 40, stock: 10, minStock: i === 0 ? 12 : 2, emoji: '💧', category: 'Bebidas', categoryId: 'category', active: true }));
  const fixtures = {
    stores: [store], role: 'owner', categories: [{ id: 'category', name: 'Bebidas', store_id: 'store' }], products,
    branches: [{ id: 'b1', name: 'Centro', address: '', is_default: true }, { id: 'b2', name: 'Norte', address: '', is_default: false }],
    registers: [{ id: 'r1', name: 'Caja Centro', branch_id: 'b1', active: true }, { id: 'r2', name: 'Caja Norte', branch_id: 'b2', active: true }],
    shifts: [{ id: 'shift1', register_id: 'r1', opened_by: 'user', opened_at: '2026-10-13T12:00:00Z', opening_cash: 0, closed_at: null }, { id: 'shift2', register_id: 'r2', opened_by: 'user', opened_at: '2026-10-13T12:00:00Z', opening_cash: 0, closed_at: null }],
    priceLists: [{ id: 'wholesale', name: 'Mayorista', adjustment: -10, active: true }], priceOverrides: [],
    ledgers: [{ id: 'general', name: 'General', is_default: true, active: true }, { id: 'other', name: 'Especial', active: true }],
    members: [], invitations: [], allSales: [], sales: [], movements: [], reportSales: [], registerAvailability: [], shiftBalance: 0, quickProducts: [], popularProducts: [],
  };
  for (const [method, value] of Object.entries(fixtures)) retail[method] = async () => value;
  retail.acceptInvitations = async () => 0;
  render(React.createElement(ToastProvider, null, React.createElement(RetailApp, { session: { user: { id: 'user', email: 'test@example.test' } } })));
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
  assert.equal(document.querySelectorAll('.product-card').length, 60);
  const manualPanel = document.querySelector('.manual-panel');
  assert.ok(manualPanel.parentElement.classList.contains('catalog'));
  assert.ok(manualPanel.compareDocumentPosition(document.querySelector('.product-grid')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  fireEvent.click(screen.getByText('Opciones de venta'));
  fireEvent.change(screen.getByLabelText('Lista de precios'), { target: { value: 'wholesale' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar Agua 0, $90. 10 disponibles' }));
  assert.equal(screen.getByLabelText('Lista de precios').disabled, true);
  assert.equal(screen.getByLabelText('Registro de ventas').disabled, true);
  window.confirm = () => false;
  fireEvent.change(screen.getByLabelText('Sucursal', { exact: true }), { target: { value: 'b2' } });
  assert.equal(screen.getByLabelText('Sucursal', { exact: true }).value, 'b1');
  assert.ok(screen.getByRole('button', { name: 'Quitar Agua 0' }));
  window.confirm = () => true;
  await React.act(async () => fireEvent.change(screen.getByLabelText('Sucursal', { exact: true }), { target: { value: 'b2' } }));
  assert.equal(screen.getByLabelText('Caja de atención').value, 'r2');
  await waitFor(() => assert.equal(screen.queryByRole('button', { name: 'Venta rápida: Agua 1' }), null));
  assert.equal(screen.queryByRole('button', { name: 'Quitar Agua 0' }), null);
  console.log('PASS progressive sale options, product paging, branch selection and cart protection');

  fireEvent.click(screen.getByRole('button', { name: /Productos y stock/ }));
  const catalogPanel = document.getElementById('catalog-panel-products');
  const catalog = within(catalogPanel);
  assert.equal(catalogPanel.hidden, false);
  assert.equal(catalogPanel.querySelectorAll('tbody > tr').length, 50);
  fireEvent.click(catalog.getByText('Ver más productos'));
  assert.equal(catalogPanel.querySelectorAll('tbody > tr').length, 65);
  fireEvent.click(catalog.getByRole('button', { name: 'Ver stock bajo' }));
  assert.equal(catalogPanel.querySelectorAll('tbody > tr').length, 1);
  fireEvent.change(catalog.getByLabelText('Buscar productos'), { target: { value: 'Agua' } });
  screen.getByRole('tab', { name: 'Catálogo y stock' }).focus();
  fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
  assert.equal(document.activeElement.id, 'catalog-tab-prices');
  assert.equal(catalogPanel.hidden, true);
  fireEvent.keyDown(document.activeElement, { key: 'Home' });
  assert.equal(catalogPanel.hidden, false);
  assert.equal(catalog.getByLabelText('Buscar productos').value, 'Agua');
  console.log('PASS catalog paging, low-stock filter and keyboard section navigation');

  fireEvent.click(screen.getByRole('button', { name: /Mi comercio/ }));
  const general = document.getElementById('settings-panel-general');
  const name = within(general).getByLabelText('Nombre', { exact: true });
  fireEvent.change(name, { target: { value: 'Nombre sin guardar' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Sucursales y cajas' }));
  assert.equal(general.hidden, true);
  assert.equal(document.getElementById('settings-panel-locations').hidden, false);
  fireEvent.click(screen.getByRole('tab', { name: 'General' }));
  assert.equal(name.value, 'Nombre sin guardar');
  console.log('PASS settings groups preserve unsaved form values');

  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: /Cajas y turnos/ })));
  fireEvent.change(screen.getByLabelText('Efectivo contado ($)'), { target: { value: '125' } });
  await React.act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Resumen y ventas' })));
  assert.equal(document.getElementById('cash-panel-shift').hidden, true);
  fireEvent.click(screen.getByRole('tab', { name: 'Mi turno' }));
  assert.equal(screen.getByLabelText('Efectivo contado ($)').value, '125');
  console.log('PASS switching to reports preserves the current cash count');
  cleanup();

  // Administrators can identify and assign cashiers without gaining owner-only actions.
  retail.role = async () => 'admin';
  retail.members = async () => [{ user_id: 'cashier-private-id', email: 'caja@example.test', role: 'cashier', branch_id: null, register_id: null }];
  let assignment;
  retail.setCashierAccess = async (...args) => { assignment = args; };
  const mountWorkspace = () => render(React.createElement(ToastProvider, null, React.createElement(RetailApp, { session: { user: { id: 'user', email: 'test@example.test' } } })));
  mountWorkspace();
  await screen.findByLabelText('Buscar producto o escanear código');
  fireEvent.click(screen.getByRole('button', { name: /Mi comercio/ }));
  fireEvent.click(screen.getByRole('tab', { name: 'Equipo y permisos' }));
  assert.ok(screen.getByText('caja@example.test'));
  assert.equal(screen.queryByText('cashier-private-id'), null);
  assert.equal(screen.queryByRole('button', { name: 'Quitar', exact: true }), null);
  assert.equal(screen.queryByRole('button', { name: 'Crear cuenta y dar acceso' }), null);
  fireEvent.change(screen.getByLabelText('Caja de caja@example.test'), { target: { value: 'r2' } });
  assert.equal(screen.getByLabelText('Sucursal de caja@example.test').value, 'b2');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar asignación' }));
  await waitFor(() => assert.deepEqual(assignment, ['store', 'cashier-private-id', 'b2', 'r2', false]));
  await waitFor(() => assert.equal(screen.getByLabelText('Sucursal de caja@example.test').disabled, false));
  fireEvent.change(screen.getByLabelText('Sucursal de caja@example.test'), { target: { value: 'b1' } });
  assert.equal(screen.getByLabelText('Caja de caja@example.test').value, '');
  assert.equal(within(screen.getByLabelText('Caja de caja@example.test')).queryByRole('option', { name: 'Caja Norte' }), null);
  cleanup();
  console.log('PASS admin team emails, automatic register branch, branch reset and owner-only account controls');

  retail.role = async () => 'cashier';
  retail.branches = async () => [fixtures.branches[1]];
  retail.registers = async () => [fixtures.registers[1]];
  retail.shifts = async () => [];
  retail.registerAvailability = async () => [{ register_id: 'r2', occupied: true }];
  for (const method of ['members', 'invitations', 'allSales']) retail[method] = async () => assert.fail(`Cashier must not request ${method}`);
  mountWorkspace();
  await screen.findByText('Esta caja está en uso');
  assert.equal(screen.getByLabelText('Sucursal', { exact: true }).value, 'b2');
  assert.equal(screen.getByLabelText('Sucursal', { exact: true }).disabled, true);
  assert.equal(screen.getByLabelText('Caja de atención').value, 'r2');
  assert.equal(screen.queryByRole('button', { name: /Mi comercio/ }), null);
  fireEvent.click(screen.getByRole('button', { name: /Cajas y turnos/ }));
  await screen.findByText('Tu jornada en tres pasos');
  assert.equal(screen.getByRole('button', { name: 'Abrir Caja Norte' }).disabled, true);
  assert.equal(screen.queryByRole('tab', { name: 'Resumen y ventas' }), null);
  retail.registerAvailability = async () => [{ register_id: 'r2', occupied: false }];
  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: 'Actualizar', exact: true })));
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Abrir Caja Norte' }).disabled, false));
  retail.openShift = async () => { retail.shifts = async () => [fixtures.shifts[1]]; };
  retail.shiftBalance = async () => 0;
  await React.act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir Caja Norte' })));
  fireEvent.click(await screen.findByRole('button', { name: 'Ir a vender' }));
  await screen.findByLabelText('Buscar producto o escanear código');
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
