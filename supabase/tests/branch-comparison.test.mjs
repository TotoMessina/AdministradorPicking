// Comparación de sucursales: mismo cálculo que Ganancias, tickets, lo más vendido, sin rotación, costos faltantes y permisos.
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
  for (const id of [owner, cashier]) await db.query('insert into auth.users values($1,$2,now())', [id, `${id}@example.test`]);
  await login(owner);
  const store = await scalar("select retail_create_store('Kiosco dos locales')");
  const registerA = await scalar('select id from retail_registers where store_id=$1', [store]);
  const centro = await scalar('select branch_id from retail_registers where id=$1', [registerA]);
  await db.exec('reset role');
  const norte = await scalar("insert into retail_branches(store_id,name) values($1,'Norte') returning id", [store]);
  const registerB = await scalar("insert into retail_registers(store_id,branch_id,name) values($1,$2,'Caja Norte') returning id", [store, norte]);
  await login(owner);
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const save = (values, branch) => scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, ...values }), branch]).then(row => row.id);
  const water = await save({ name: 'Agua', code: 'AGUA', price: 100, cost: 40, stock: 20 }, centro);
  const mate = await save({ name: 'Mate', code: 'MATE', price: 500, cost: 0, stock: 5 }, centro);
  const yerba = await save({ name: 'Yerba', code: 'YERBA', price: 900, cost: 300, stock: 10 }, centro);
  const cookies = await save({ name: 'Galletas', code: 'GALLE', price: 200, cost: 80, stock: 10 }, norte);
  const shiftA = await scalar('select retail_open_shift($1,$2,0)', [store, registerA]);
  const shiftB = await scalar('select retail_open_shift($1,$2,0)', [store, registerB]);
  const sell = (shift, product, qty, price) => { const id = crypto.randomUUID(); return db.query("select retail_checkout($1,$2,'QR',$3,$4)", [shift, id, qty * price, JSON.stringify([{ product_id: product, qty, unit_price: price }])]).then(() => id); };
  const waterSale = await sell(shiftA, water, 3, 100);
  await sell(shiftA, mate, 1, 500);
  await sell(shiftB, cookies, 2, 200);
  await db.query("select retail_return_sale($1,$2,$3,$4,'Vencida',$5)", [store, waterSale, crypto.randomUUID(), JSON.stringify([{ index: 0, qty: 1 }]), JSON.stringify([{ method: 'QR', amount: 100 }])]);

  const today = await scalar("select (now() at time zone 'America/Argentina/Buenos_Aires')::date::text");
  const panel = await scalar('select retail_branch_comparison($1,$2,$3)', [store, today, today]);
  const a = panel.branches.find(row => row.branch_id === centro), b = panel.branches.find(row => row.branch_id === norte);
  assert.deepEqual([Number(a.sales), Number(a.returns), a.tickets, Number(a.cost)], [700, 100, 2, 80]);
  assert.deepEqual([Number(b.sales), b.tickets, Number(b.cost)], [400, 1, 160]);
  assert.equal(panel.branches[0].branch_id, centro, 'branches come ordered by sales');
  assert.equal(a.uncosted_lines, 1); assert.equal(Number(a.uncosted_sales), 500); assert.equal(b.uncosted_lines, 0);
  pass('sales, returns, tickets and cost by branch, with missing costs counted');

  assert.deepEqual(a.top.map(row => row.name), ['Agua', 'Mate']); assert.equal(Number(a.top[0].units), 3);
  assert.deepEqual(b.top.map(row => row.name), ['Galletas']);
  assert.deepEqual(a.idle.map(row => row.name), ['Yerba']); assert.equal(a.idle_count, 1); assert.equal(Number(a.idle[0].value), 3000);
  assert.equal(b.idle_count, 0, 'products without stock in the branch are not idle there');
  pass('best sellers and products with stock but no sales, per branch');

  const month = await scalar('select retail_month_result($1,current_date)', [store]);
  assert.deepEqual([Number(month.sales), Number(month.cost), month.tickets, month.uncosted_lines, Number(month.returns)], [1100, 240, 3, 1, 100]);
  assert.equal(Number(month.sales), Number(panel.sales), 'Ganancias and the panel share the same calculation');
  assert.equal(month.uncosted_sales, undefined); assert.equal(month.branches.length, 2);
  pass('the monthly result keeps its shape and matches the panel');

  await assert.rejects(() => db.query('select retail_branch_comparison($1,$2,$3)', [store, '2025-01-01', '2026-06-01']), /hasta un año/);
  await db.exec('reset role'); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await db.query("insert into retail_role_permissions(store_id,role,permissions) values($1,'cashier',array['sell','view_sales','manage_products'])", [store]);
  await login(cashier);
  await assert.rejects(() => db.query('select retail_branch_comparison($1,$2,$3)', [store, today, today]), /Solo la administración/);
  pass('only owners and admins compare branches, within a year');

  console.log(`${checks} branch comparison checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
