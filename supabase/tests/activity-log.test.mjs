// Actividad: qué se registra, antes y después, sin datos sensibles, de solo lectura, con filtros, permisos y conservación.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PLATFORM_SQL } from './platform.mjs';

const db = new PGlite();
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const login = async id => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('set role authenticated'); };
const owner = crypto.randomUUID(), cashier = crypto.randomUUID();
let checks = 0;
const pass = name => { checks++; console.log('PASS ' + name); };

try {
  await db.exec(PLATFORM_SQL);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^﻿/, ''));
  for (const id of [owner, cashier]) await db.query('insert into auth.users values($1,$2,now())', [id, `${id === owner ? 'duenio' : 'caja'}@example.test`]);
  await login(owner);
  const store = await scalar("select retail_create_store('Kiosco auditado')");
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const water = (await scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, name: 'Agua', code: 'AGUA', price: 100, cost: 40, stock: 10 }), branch])).id;
  const today = await scalar("select (now() at time zone 'America/Argentina/Buenos_Aires')::date::text");
  const activity = (kind = null, extra = {}) => scalar('select retail_activity($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [store, today, today, kind, extra.actor || null, extra.branch || null, extra.query || null, extra.before || null, extra.limit || 100]);

  await db.query('select retail_update_product_price($1,$2,120,100)', [store, water]);
  await db.query('select retail_save_product_at_branch($1,$2,true,10,$3)', [store, JSON.stringify({ id: water, stock: 14, cost: 45 }), branch]);
  const shift = await scalar('select retail_open_shift($1,$2,500)', [store, register]);
  const sale = crypto.randomUUID();
  await db.query("select retail_checkout($1,$2,'Efectivo',240,$3)", [shift, sale, JSON.stringify([{ product_id: water, qty: 2, unit_price: 120 }])]);
  await db.query("select retail_add_movement($1,'RETIRO',100,'Pago al repartidor',$2)", [shift, crypto.randomUUID()]);
  await db.query("select retail_return_sale($1,$2,$3,null,'Cobro duplicado',null,$4)", [store, sale, crypto.randomUUID(), shift]);
  await db.query('select retail_close_shift($1,400)', [shift]);
  await db.query("insert into retail_invitations(store_id,email,role) values($1,'nuevo@example.test','cashier')", [store]);
  await db.query("update retail_stores set receipt_message='Gracias, vuelva pronto' where id=$1", [store]);
  await db.query("select retail_set_billing_credentials($1,'-----BEGIN CERTIFICATE-----x','-----BEGIN PRIVATE KEY-----secreto','homo')", [store]).catch(() => {});

  const all = await activity();
  const titles = all.items.map(item => item.title);
  for (const expected of ['Cambió producto «Agua»', 'Abrió Caja principal', 'Retiro de efectivo', 'Cerró Caja principal', 'Creó acceso pendiente «nuevo@example.test»', 'Cambió comercio «Kiosco auditado»'])
    assert.ok(titles.some(title => title.startsWith(expected.replace(/«.*/, '')) && title.includes(expected.match(/«.*»/)?.[0] || '')), `missing: ${expected}`);
  assert.ok(titles.some(title => title.startsWith('Anuló la venta T-')));
  assert.ok(all.items.every(item => item.actor_email === 'duenio@example.test'), 'every action names its person');
  const price = (await activity('precios')).items.filter(item => item.title === 'Cambió producto «Agua»');
  assert.equal(price.length, 1); assert.deepEqual([price[0].before.price, price[0].after.price], [100, 120]);
  const stock = (await activity('stock')).items.filter(item => item.title === 'Cambió producto «Agua»');
  assert.equal(stock.length, 1, 'only the form edit is logged as a stock change, not the sale or the return');
  assert.deepEqual([stock[0].before.stock, stock[0].after.stock, stock[0].before.cost, stock[0].after.cost], [10, 14, 40, 45]);
  assert.equal(stock[0].branch_id, branch);
  const close = all.items.find(item => item.title === 'Cerró Caja principal');
  assert.equal(Number(close.before.esperado), 400, 'opening 500 + sale 240 - withdrawal 100 - cash refund 240'); assert.equal(Number(close.after.diferencia), 0);
  pass('prices, stock edits, cash, closings, voids, access and settings show person, branch, before and after');

  const raw = JSON.stringify((await db.query('select before,after from retail_audit_log')).rows);
  assert.ok(!/BEGIN|secreto|password|token/i.test(raw), 'no credentials, passwords or tokens are stored');
  assert.equal((await activity(null, { query: 'repartidor' })).items.length, 1);
  assert.equal((await activity('caja')).items.length, 2);
  assert.equal((await activity(null, { actor: cashier })).items.length, 0);
  const firstPage = await activity(null, { limit: 3 });
  assert.equal(firstPage.items.length, 3); assert.ok(firstPage.next_before);
  assert.ok(firstPage.people.some(person => person.email === 'duenio@example.test'));
  pass('filters by kind, person, text and pages; no secrets are stored');

  await assert.rejects(() => db.query('delete from retail_audit_log'), /permission denied/);
  await assert.rejects(() => db.query('update retail_audit_log set kind=$1', ['stock']), /permission denied/);
  await db.exec('reset role');
  await assert.rejects(() => db.query('delete from retail_audit_log'), /solo lectura/);
  await assert.rejects(() => db.query("update retail_audit_log set actor_email='otro'"), /solo lectura/);
  await db.query("insert into retail_audit_log(store_id,at,kind,entity,operation) values($1,now()-interval '25 months','precios','Producto','UPDATE')", [store]);
  assert.equal(await scalar('select retail_private.purge_audit_log()'), 1, 'only entries older than 24 months are removed');
  pass('the log cannot be edited or deleted, except the 24-month cleanup');

  await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await db.query("insert into retail_role_permissions(store_id,role,permissions) values($1,'cashier',array['sell','view_sales','manage_products'])", [store]);
  await login(owner);
  assert.ok((await activity('permisos')).items.some(item => item.title.includes('Persona con acceso'.toLowerCase())), 'new access is logged');
  await login(cashier);
  await assert.rejects(() => activity(), /Solo la administración/);
  assert.equal(await scalar('select count(*) from retail_audit_log'), 0);
  pass('only owners and admins read the activity');

  console.log(`${checks} activity checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
