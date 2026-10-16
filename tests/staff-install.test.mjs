import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, FormData: dom.window.FormData,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
let online = true;
Object.defineProperty(navigator, 'onLine', { get: () => online });
const React = await import('react');
const { render, screen, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
let pending = null, denied = false, signups = 0, disposals = 0;
let signupResult = { data: { user: { id: 'new-user', identities: [{}] }, session: null }, error: null };
const invitations = [];
globalThis.__staffTestDb = {
  auth: { signUp: () => assert.fail('Must not register through the owner session') },
  from: () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: pending, error: null }),
      insert: async values => { if (denied) return { error: new Error('Denied') }; invitations.push(values); pending = values; return { error: null }; } };
    return query;
  },
};
globalThis.__staffSignupClient = () => ({ auth: {
  signUp: async values => { signups++; assert.equal(values.email, 'cashier@example.test'); assert.equal(values.password, 'Example-pass-123'); return signupResult; },
  dispose: async () => { disposals++; },
} });
const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
  plugins: [{ name: 'staff-test-client', enforce: 'pre', resolveId(id) { if (id.endsWith('/lib/supabase')) return '\0staff-client'; },
    load(id) { if (id === '\0staff-client') return 'export const supabase=globalThis.__staffTestDb;export const createSignupClient=()=>globalThis.__staffSignupClient();'; } }] });
try {
  const { createStaffAccount, authorizeStaff } = await server.ssrLoadModule('/src/features/retail/staffAccounts.ts');
  denied = true;
  await assert.rejects(() => createStaffAccount('store', 'cashier@example.test', 'cashier', 'Example-pass-123'), /Denied/);
  assert.equal(signups, 0); denied = false;
  assert.equal(await createStaffAccount('store', ' CASHIER@example.test ', 'cashier', 'Example-pass-123'), 'confirmation');
  assert.equal(invitations.length, 1); assert.equal(invitations[0].email, 'cashier@example.test');
  signupResult = { data: { user: { id: 'obfuscated', identities: [] }, session: null }, error: null };
  assert.equal(await createStaffAccount('store', 'cashier@example.test', 'cashier', 'Example-pass-123'), 'existing');
  assert.equal(invitations.length, 1);
  signupResult = { data: { user: null, session: null }, error: { message: 'Email rate limit exceeded' } };
  await assert.rejects(() => createStaffAccount('store', 'cashier@example.test', 'cashier', 'Example-pass-123'), /acceso quedó autorizado/);
  assert.equal(disposals, signups);
  await assert.rejects(() => authorizeStaff('store', 'cashier@example.test', 'admin'), /otros permisos/);
  signupResult = { data: { user: { id: 'new-user', identities: [{}] }, session: { user: { id: 'new-user' } } }, error: null };
  assert.equal(await createStaffAccount('store', 'cashier@example.test', 'cashier', 'Example-pass-123'), 'ready');
  const { StaffAccessForm } = await server.ssrLoadModule('/src/features/retail/StaffAccessForm.tsx');
  render(React.createElement(StaffAccessForm, { storeId: 'store', busy: false, run: async action => { await action(); return true; } }));
  fireEvent.change(screen.getByLabelText('Email del colaborador'), { target: { value: 'cashier@example.test' } });
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'Example-pass-123' } });
  fireEvent.change(screen.getByLabelText('Repetir contraseña'), { target: { value: 'different' } });
  const before = signups;
  fireEvent.submit(document.querySelector('form')); await screen.findByRole('alert'); assert.equal(signups, before);
  fireEvent.change(screen.getByLabelText('Repetir contraseña'), { target: { value: 'Example-pass-123' } });
  fireEvent.submit(document.querySelector('form')); await screen.findByText(/Ya puede ingresar/);
  assert.equal(screen.getByLabelText('Contraseña inicial').value, ''); assert.equal(signups, before + 1);
  fireEvent.click(screen.getByRole('checkbox'));
  assert.equal(screen.queryByLabelText('Contraseña inicial'), null);
  cleanup();
  console.log('PASS staff permissions before signup, isolated registration, existing accounts, safe retry, confirmation, mismatch and password clearing');

  const { PwaStatus } = await server.ssrLoadModule('/src/components/PwaStatus.tsx');
  const prompt = () => { const event = new dom.window.Event('beforeinstallprompt', { cancelable: true }); event.prompt = async () => {}; event.userChoice = Promise.resolve({ outcome: 'dismissed' }); fireEvent(window, event); };
  render(React.createElement(PwaStatus)); prompt();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso de instalación' }));
  assert.equal(screen.queryByRole('button', { name: 'Instalar app' }), null);
  cleanup();render(React.createElement(PwaStatus));prompt();
  assert.equal(screen.queryByRole('button', { name: 'Instalar app' }), null);
  online = false; fireEvent(window, new dom.window.Event('offline'));
  await screen.findByText(/Sin conexión/);
  online = true; cleanup();render(React.createElement(PwaStatus, { settings: true }));prompt();
  assert.ok(screen.getByRole('button', { name: 'Instalar app' }));
  assert.equal(screen.queryByRole('button', { name: 'Cerrar aviso de instalación' }), null);
  cleanup();localStorage.clear();render(React.createElement(PwaStatus));prompt();
  fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
  await waitFor(() => assert.equal(screen.queryByRole('button', { name: 'Instalar app' }), null));
  console.log('PASS dismissible install prompt persists, settings remain available, offline notice remains visible and browser dismissal is respected');
} finally { cleanup(); await server.close(); dom.window.close(); delete globalThis.__staffTestDb; delete globalThis.__staffSignupClient; }
