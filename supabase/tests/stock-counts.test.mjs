// Conteo físico: diferencias contra el sistema, ventas durante el conteo, motivos, depósito, pérdidas y permisos.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PLATFORM_SQL } from './platform.mjs';

const db = new PGlite();
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const login = async id => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('set role authenticated'); };
const owner = crypto.randomUUID(), cashier = crypto.randomUUID(), stranger = crypto.randomUUID();
let checks = 0;
const pass = name => { checks++; console.log('PASS ' + name); };

try {
  await db.exec(PLATFORM_SQL);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^﻿/, ''));
  for (const id of [owner, cashier, stranger]) await db.query('insert into auth.users values($1,$2,now())', [id, `${id}@example.test`]);
  await login(owner);
  const store = await scalar("select retail_create_store('Kiosco conteo')");
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const [drinks, snacks] = (await db.query('select id from retail_categories where store_id=$1 order by name limit 2', [store])).rows.map(r => r.id);
  const save = values => scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify(values), branch]).then(row => row.id);
  const water = await save({ category_id: drinks, name: 'Agua', code: 'AGUA', price: 100, cost: 40, stock: 10 });
  const chips = await save({ category_id: snacks, name: 'Papas', code: 'PAPAS', price: 200, cost: 90, stock: 6 });
  const combo = await save({ category_id: snacks, name: 'Combo', code: 'COMBO', price: 250, cost: 0, stock: 0 });
  await db.exec('reset role'); await db.query('update retail_products set stock_components=$1 where id=$2', [JSON.stringify([{ product_id: chips, quantity: 1 }]), combo]); await login(owner);
  // La función es interna: se consulta como la base, sin exponerla a la app.
  const at = async (product, place = branch) => { await db.exec('reset role'); const value = await scalar('select retail_private.location_quantity($1,$2,$3)', [store, product, place]); await login(owner); return value; };
  const stockOf = id => scalar('select stock from retail_products where id=$1', [id]);
  const lines = (count, rows) => db.query('select retail_save_stock_count_lines($1,$2,$3)', [store, count, JSON.stringify(rows)]);
  const shift = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  const sell = (product, qty, price) => db.query("select retail_checkout($1,$2,'QR',$3,$4)", [shift, crypto.randomUUID(), qty * price, JSON.stringify([{ product_id: product, qty, unit_price: price }])]);

  const count = crypto.randomUUID();
  await db.query('select retail_start_stock_count($1,$2,$3)', [store, count, branch]);
  assert.equal(await scalar('select retail_start_stock_count($1,$2,$3)', [store, count, branch]), count, 'starting again with the same id is safe');
  await assert.rejects(() => db.query('select retail_start_stock_count($1,$2,$3)', [store, crypto.randomUUID(), branch]), /Ya hay un conteo abierto/);
  await sell(chips, 1, 200);
  await lines(count, [{ product_id: water, counted: 8 }, { product_id: chips, counted: 5 }]);
  await sell(water, 3, 100);
  assert.equal(await stockOf(water), 7);
  await assert.rejects(() => db.query('select retail_confirm_stock_count($1,$2)', [store, count]), /motivo de cada diferencia: Agua/);
  await lines(count, [{ product_id: water, counted: 8, reason: 'rotura', note: 'Se cayó un pack' }]);
  assert.equal(await scalar('select expected from retail_stock_count_lines where count_id=$1 and product_id=$2', [count, water]), 10, 'same count keeps its snapshot');
  const confirmed = await scalar('select retail_confirm_stock_count($1,$2)', [store, count]);
  assert.equal(confirmed.status, 'confirmed'); assert.equal(Number(confirmed.lines), 1);
  assert.equal(await stockOf(water), 5, 'only the counted difference is applied: 7 − 2'); assert.equal(await at(water), 5);
  assert.equal(await stockOf(chips), 5, 'a sale before counting creates no difference');
  pass('sales during and before the count create no false differences; only counted differences are adjusted');

  assert.equal((await scalar('select retail_confirm_stock_count($1,$2)', [store, count])).status, 'confirmed');
  assert.equal(await stockOf(water), 5, 'confirming twice does not adjust twice');
  await assert.rejects(() => lines(count, [{ product_id: water, counted: 1 }]), /cerrado/);
  const record = (await db.query('select l.counted,l.expected,l.adjustment,l.unit_cost,l.reason,l.counted_by,c.closed_by from retail_stock_count_lines l join retail_stock_counts c on c.id=l.count_id where l.product_id=$1', [water])).rows[0];
  assert.deepEqual([record.counted, record.expected, record.adjustment, Number(record.unit_cost), record.reason], [8, 10, -2, 40, 'rotura']);
  assert.equal(record.counted_by, owner); assert.equal(record.closed_by, owner);
  pass('confirmation is idempotent, closes the count and keeps who counted, what and why');

  const recount = crypto.randomUUID();
  await db.query('select retail_start_stock_count($1,$2,$3,$4)', [store, recount, branch, snacks]);
  await assert.rejects(() => lines(recount, [{ product_id: water, counted: 1 }]), /no es de la categoría/);
  await assert.rejects(() => lines(recount, [{ product_id: combo, counted: 1 }]), /no tiene stock propio/);
  await lines(recount, [{ product_id: chips, counted: 9 }]);
  await sell(chips, 1, 200);
  await lines(recount, [{ product_id: chips, counted: 4 }]);
  assert.equal(await scalar('select expected from retail_stock_count_lines where count_id=$1', [recount]), 4, 'counting again takes a new snapshot');
  await lines(recount, [{ product_id: chips, counted: null }]);
  await assert.rejects(() => db.query('select retail_confirm_stock_count($1,$2)', [store, recount]), /Todavía no contaste/);
  await db.query('select retail_cancel_stock_count($1,$2)', [store, recount]);
  await assert.rejects(() => db.query('select retail_confirm_stock_count($1,$2)', [store, recount]), /cancelado/);
  pass('category scope, combos, recounts, removed lines and cancellation');

  // Depósito: faltante y sobrante.
  await db.query("select retail_depot_operation_at_branch($1,$2,3,'to_depot',$3,$4)", [store, chips, crypto.randomUUID(), branch]);
  assert.equal(await at(chips, 'depot'), 3);
  const depot = crypto.randomUUID();
  await db.query("select retail_start_stock_count($1,$2,'depot')", [store, depot]);
  await lines(depot, [{ product_id: chips, counted: 1, reason: 'robo' }]);
  await db.query('select retail_confirm_stock_count($1,$2)', [store, depot]);
  assert.equal(await at(chips, 'depot'), 1); assert.equal(await stockOf(chips), 2, 'total follows the depot shortage');
  const surplus = crypto.randomUUID();
  await db.query("select retail_start_stock_count($1,$2,'depot')", [store, surplus]);
  await lines(surplus, [{ product_id: water, counted: 2, reason: 'error_carga' }]);
  await db.query('select retail_confirm_stock_count($1,$2)', [store, surplus]);
  assert.equal(await at(water, 'depot'), 2); assert.equal(await stockOf(water), 7); assert.equal(await at(water), 5, 'the branch keeps its own units');
  pass('depot counts adjust depot and total without touching the branch');

  const losses = await scalar('select retail_month_stock_losses($1,current_date)', [store]);
  assert.equal(Number(losses.losses), 2 * 40 + 2 * 90); assert.equal(Number(losses.surplus), 2 * 40);
  assert.deepEqual(losses.by_reason.map(r => r.reason).sort(), ['robo', 'rotura']);
  pass('Ganancias receives losses in money by reason, with surpluses apart');

  // Secciones: por marca, combinables con categoría y abiertas a la vez sin contar dos veces un producto.
  const coke = await save({ category_id: drinks, name: 'Coca 500', code: 'COCA', price: 150, cost: 70, stock: 4, brand: 'Coca-Cola' });
  const pepsi = await save({ category_id: drinks, name: 'Pepsi 500', code: 'PEPSI', price: 140, cost: 60, stock: 3, brand: 'Pepsi' });
  const byBrand = crypto.randomUUID(), byCategory = crypto.randomUUID();
  await db.query('select retail_start_stock_count($1,$2,$3,null,null,$4)', [store, byBrand, branch, ' coca-cola ']);
  assert.equal(await scalar('select brand from retail_stock_counts where id=$1', [byBrand]), 'coca-cola');
  await assert.rejects(() => db.query('select retail_start_stock_count($1,$2,$3,null,null,$4)', [store, crypto.randomUUID(), branch, 'Coca-Cola']), /esta sección/);
  await assert.rejects(() => lines(byBrand, [{ product_id: pepsi, counted: 3 }]), /no es de la marca/);
  await lines(byBrand, [{ product_id: coke, counted: 4 }]);
  await db.query('select retail_start_stock_count($1,$2,$3,$4)', [store, byCategory, branch, drinks]);
  await assert.rejects(() => lines(byCategory, [{ product_id: coke, counted: 4 }]), /ya se está contando en otro conteo abierto/);
  await lines(byCategory, [{ product_id: pepsi, counted: 3 }]);
  await db.query('select retail_confirm_stock_count($1,$2)', [store, byBrand]);
  await lines(byCategory, [{ product_id: coke, counted: 4 }]);
  await db.query('select retail_confirm_stock_count($1,$2)', [store, byCategory]);
  assert.equal(await stockOf(coke), 4); assert.equal(await stockOf(pepsi), 3);
  pass('counts by brand or category can run at the same time without counting a product twice');

  // Permisos.
  await db.exec('reset role'); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await login(cashier);
  await assert.rejects(() => db.query('select retail_start_stock_count($1,$2,$3)', [store, crypto.randomUUID(), branch]), /no permite contar/);
  assert.equal(await scalar('select count(*) from retail_stock_counts'), 0);
  await db.exec('reset role'); await db.query("insert into retail_role_permissions(store_id,role,permissions) values($1,'cashier',array['sell','replenish_stock'])", [store]);
  await login(cashier);
  const byCashier = crypto.randomUUID();
  await db.query('select retail_start_stock_count($1,$2,$3)', [store, byCashier, branch]);
  await lines(byCashier, [{ product_id: water, counted: 4, reason: 'vencido' }]);
  await assert.rejects(() => db.query('select retail_confirm_stock_count($1,$2)', [store, byCashier]), /Solo quien puede editar productos/);
  await assert.rejects(() => db.query('select retail_month_stock_losses($1,current_date)', [store]), /Solo la administración/);
  await login(stranger);
  assert.equal(await scalar('select count(*) from retail_stock_count_lines'), 0);
  await assert.rejects(() => db.query('delete from retail_stock_counts'), /permission denied/);
  pass('counting needs stock permission, confirming needs product permission and other stores see nothing');

  console.log(`${checks} stock count checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
