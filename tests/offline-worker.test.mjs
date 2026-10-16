import 'fake-indexeddb/auto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import config from '../vite.config.ts';
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('retail-offline-v1', 2);
  request.onupgradeneeded = () => { request.result.createObjectStore('accounts'); request.result.createObjectStore('meta'); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const put = (table, key, value) => new Promise((resolve, reject) => { const tx = db.transaction(table, 'readwrite'); tx.objectStore(table).put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
const get = (table, key) => new Promise((resolve, reject) => { const request = db.transaction(table).objectStore(table).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const auth = { user: 'user', token: 'jwt-for-user', expires: Date.now() / 1000 + 3600, url: 'https://project.supabase.co', key: 'public-key' };
const pending = () => ({ revision: 0, cache: { '["sales",["store","shift"]]': [{ id: 'sale', ticketNumber: 'L-sale', syncStatus: 'pending' }] }, queue: [{ operation: { id: 'sale', kind: 'sale', store: 'store' } }] });
let emitted;
const plugin = config.plugins.find(p => p.name === 'kiosco-pwa');
plugin.generateBundle.call({ emitFile(file) { emitted = file; } }, {}, {
  'assets/main-123.js': { type: 'chunk', code: '/* application */' },
  'assets/main-123.css': { type: 'asset', source: '/* styles */' },
  'index.html': { type: 'asset', source: '<html></html>' },
});
const handlers = {}, messages = [], requests = [];
let fetchMode = 'success', precached;
vm.runInNewContext(emitted.source, {
  indexedDB, URL, Date, JSON, Error, Response, console,
  caches: { open: async () => ({ addAll: async urls => { precached = urls; }, match: async url => String(url).endsWith('index.html') ? new Response('cached application') : undefined }) },
  fetch: async (url, options) => {
    if (fetchMode === 'offline') throw new Error('network down');
    requests.push({ url, options });
    return fetchMode === 'conflict' ? new Response(JSON.stringify({ message: 'Stock insuficiente' }), { status: 400 }) : new Response(JSON.stringify({ ticketNumber: 'T-42' }));
  },
  self: { registration: { scope: 'https://shop.example/', sync: { register: async () => {} } }, location: { origin: 'https://shop.example' },
    clients: { matchAll: async () => [{ postMessage: msg => messages.push(msg) }] }, addEventListener: (type, callback) => { handlers[type] = callback; } },
});
const run = async type => { let done; handlers[type]({ tag: 'retail-outbox', waitUntil(p) { done = p; } }); await done; };
try {
  await run('install');
  for (const file of ['index.html', 'assets/main-123.js', 'assets/main-123.css']) assert.ok(precached.includes(`https://shop.example/${file}`));
  fetchMode = 'offline'; let page;
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://shop.example/' }, respondWith(response) { page = response; } });
  assert.equal(await (await page).text(), 'cached application');
  await put('meta', 'auth', auth); await put('accounts', 'user', pending());
  await assert.rejects(() => run('sync'), /network down/);
  assert.equal((await get('accounts', 'user')).queue.length, 1);
  fetchMode = 'success'; await run('sync');
  const state = await get('accounts', 'user'); assert.equal(state.queue.length, 0);
  assert.equal(Object.values(state.cache)[0][0].ticketNumber, 'T-42');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer jwt-for-user');
  assert.equal(messages.at(-1).type, 'retail-sync-updated');
  await put('accounts', 'user', pending()); fetchMode = 'conflict'; await run('sync');
  assert.equal((await get('accounts', 'user')).queue[0].error, 'Stock insuficiente');
  await put('accounts', 'user', pending()); await put('meta', 'auth', { ...auth, expires: 1 });
  const before = requests.length; await run('sync'); assert.equal(requests.length, before);
  await put('meta', 'auth', null); await run('sync'); assert.equal(requests.length, before);
  console.log('PASS generated app-shell precache, offline navigation, background sync, durable failures, conflict preservation and expired/logout session protection');
} finally { db.close(); }
