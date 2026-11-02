// Pedidos a proveedores: ventas recientes por sucursal, guardado, envío, recepción por factura y permisos.
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
  const store = await scalar("select retail_create_store('Kiosco pedidos')");
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const save = values => scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, ...values }), branch]).then(row => row.id);
  const water = await save({ name: 'Agua', code: 'AGUA', price: 100, cost: 40, stock: 20, supplier: 'Distri Sur' });
  const bread = await save({ name: 'Pan', code: 'PAN', price: 50, cost: 10, stock: 20 });
  const combo = await save({ name: 'Pancho', code: 'PANCHO', price: 300, cost: 0, stock: 0 });
  const recipe = [{ product_id: bread, quantity: 2 }];
  await db.exec('reset role');
  await db.query('update retail_products set stock_components=$1 where id=$2', [JSON.stringify(recipe), combo]);
  const supplier = await scalar("insert into retail_suppliers(store_id,name,supplier_key) values($1,'Distri Sur',retail_private.normalize_supplier('Distri Sur')) returning id", [store]);
  await login(owner);
  const shift = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  await db.query("select retail_checkout($1,$2,'QR',600,$3)", [shift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 6, unit_price: 100 }])]);
  await db.query("select retail_checkout($1,$2,'QR',900,$3)", [shift, crypto.randomUUID(), JSON.stringify([{ product_id: combo, qty: 3, unit_price: 300, stock_components: recipe }])]);
  const voided = crypto.randomUUID();
  await db.query("select retail_checkout($1,$2,'QR',100,$3)", [shift, voided, JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }])]);
  await db.query("select retail_return_sale($1,$2,$3,null,'Error de carga')", [store, voided, crypto.randomUUID()]);
  const velocity = await scalar('select retail_product_sales_velocity($1,28)', [store]);
  const unitsOf = id => Number(velocity.find(row => row.product_id === id && row.branch_id === branch)?.units || 0);
  assert.equal(unitsOf(water), 6, 'voided sales do not count'); assert.equal(unitsOf(bread), 6, 'combos count their components');
  pass('recent sales by product and branch include combo components and skip voided sales');

  const order = crypto.randomUUID();
  const draft = lines => db.query('select retail_save_purchase_order($1,$2,$3)', [store, order, JSON.stringify({ supplier_id: supplier, branch_id: branch, notes: 'Para el lunes', lines })]);
  await assert.rejects(() => db.query('select retail_save_purchase_order($1,$2,$3)', [store, order, JSON.stringify({ supplier_name: 'X', branch_id: branch, lines: [] })]), /no tiene productos/);
  await draft([{ product_id: water, qty: 24, suggested: 18 }, { product_id: bread, qty: 10 }]);
  await draft([{ product_id: water, qty: 30, suggested: 18 }, { product_id: bread, qty: 10 }]);
  const lines = (await db.query('select product_id,qty,unit_cost,suggested from retail_purchase_order_lines where order_id=$1 order by product_name', [order])).rows;
  assert.equal(lines.length, 2); assert.equal(lines.find(l => l.product_id === water).qty, 30); assert.equal(Number(lines.find(l => l.product_id === water).unit_cost), 40);
  assert.equal(await scalar('select supplier_name from retail_purchase_orders where id=$1', [order]), 'Distri Sur');
  await db.query("select retail_set_purchase_order_status($1,$2,'sent')", [store, order]);
  await db.query("select retail_set_purchase_order_status($1,$2,'sent')", [store, order]);
  assert.equal(await scalar('select status from retail_purchase_orders where id=$1', [order]), 'sent');
  pass('orders save and edit without duplicating lines, keep the cost at order time and are marked sent');

  const receipt = [{ product_id: water, name: 'Agua', qty: 24, unit_cost: 46 }, { product_id: bread, name: 'Pan', qty: 12, unit_cost: 10 }];
  assert.equal(await scalar('select retail_receive_purchase_order($1,$2,$3,$4)', [store, 'DISTRI  SUR', crypto.randomUUID(), JSON.stringify(receipt)]), null, 'another branch does not match');
  assert.equal(await scalar('select retail_receive_purchase_order($1,$2,$3,$4)', [store, 'DISTRI  SUR', branch, JSON.stringify(receipt)]), order);
  const received = (await db.query('select status,receipt,received_by from retail_purchase_orders where id=$1', [order])).rows[0];
  assert.equal(received.status, 'received'); assert.deepEqual(received.receipt, receipt); assert.equal(received.received_by, owner);
  assert.equal(await scalar('select retail_receive_purchase_order($1,$2,$3,$4)', [store, 'Distri Sur', branch, JSON.stringify(receipt)]), null, 'a received order is not matched twice');
  await assert.rejects(() => draft([{ product_id: water, qty: 1 }]), /ya está cerrado/);
  pass('loading the invoice stores what arrived on the latest open order of that supplier and branch');

  await db.exec('reset role'); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await login(cashier);
  await assert.rejects(() => db.query('select retail_product_sales_velocity($1,28)', [store]), /no permite armar pedidos/);
  assert.equal(await scalar('select count(*) from retail_purchase_orders'), 0);
  assert.equal(await scalar('select retail_receive_purchase_order($1,$2,$3,$4)', [store, 'Distri Sur', branch, JSON.stringify(receipt)]), null);
  await assert.rejects(() => db.query('delete from retail_purchase_orders'), /permission denied/);
  pass('ordering needs product or supplier account permission');

  console.log(`${checks} purchase order checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
