// Anulaciones y devoluciones: stock en la sucursal de la venta, combos, caja, Ganancias, factura, reintentos y permisos.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PLATFORM_SQL } from './platform.mjs';

const db = new PGlite();
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const login = async id => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('set role authenticated'); };
const asAdmin = () => db.exec('reset role');
const owner = crypto.randomUUID(), cashier = crypto.randomUUID(), stranger = crypto.randomUUID();
const giveBack = (store, sale, request, items, reason, refund = null, shift = null) =>
  scalar('select retail_return_sale($1,$2,$3,$4,$5,$6,$7)', [store, sale, request, items && JSON.stringify(items), reason, refund && JSON.stringify(refund), shift]);
let checks = 0;
const pass = name => { checks++; console.log('PASS ' + name); };

try {
  await db.exec(PLATFORM_SQL);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^﻿/, ''));
  for (const id of [owner, cashier, stranger]) await db.query('insert into auth.users values($1,$2,now())', [id, `${id}@example.test`]);
  await login(owner);
  const store = await scalar("select retail_create_store('Kiosco devoluciones')");
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const save = values => scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, ...values }), branch]).then(row => row.id);
  const water = await save({ name: 'Agua', code: 'AGUA', price: 100, cost: 40, stock: 10 });
  const bread = await save({ name: 'Pan', code: 'PAN', price: 50, cost: 10, stock: 20 });
  const combo = await save({ name: 'Pancho doble', code: 'PANCHO', price: 500, cost: 0, stock: 0 });
  const recipe = [{ product_id: bread, quantity: 2 }];
  await asAdmin(); await db.query('update retail_products set stock_components=$1 where id=$2', [JSON.stringify(recipe), combo]); await login(owner);
  const stockOf = id => scalar('select stock from retail_products where id=$1', [id]);
  const branchStockOf = id => scalar('select quantity from retail_branch_stock where product_id=$1 and branch_id=$2', [id, branch]);
  const shift = await scalar('select retail_open_shift($1,$2,100)', [store, register]);
  const sale = crypto.randomUUID();
  await db.query("select retail_checkout($1,$2,'Efectivo',1350,$3)", [shift, sale, JSON.stringify([
    { product_id: water, qty: 3, unit_price: 100 }, { product_id: combo, qty: 2, unit_price: 500, stock_components: recipe }, { name: 'Varios', qty: 1, unit_price: 50 }])]);
  assert.equal(await stockOf(water), 7); assert.equal(await stockOf(bread), 16);

  const partial = crypto.randomUUID();
  await assert.rejects(() => giveBack(store, sale, partial, [{ index: 0, qty: 1 }], ' '), /motivo/);
  await assert.rejects(() => giveBack(store, sale, partial, [{ index: 0, qty: 1 }], 'Se cobró de más'), /cómo se devuelve/);
  await assert.rejects(() => giveBack(store, sale, partial, [{ index: 0, qty: 1 }], 'Se cobró de más', [{ method: 'Efectivo', amount: 100 }]), /Abrí tu caja/);
  const first = await giveBack(store, sale, partial, [{ index: 0, qty: 1 }, { index: 1, qty: 1 }], 'Cliente devolvió un agua y un pancho', [{ method: 'Efectivo', amount: 600 }], shift);
  assert.equal(Number(first.returnedTotal), 600); assert.equal(first.returnStatus, 'partial');
  assert.equal(await stockOf(water), 8); assert.equal(await stockOf(bread), 18, 'combo returns its components');
  assert.equal(await branchStockOf(water), 8); assert.equal(await branchStockOf(bread), 18, 'stock returns to the sale branch');
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [shift])), 850);
  pass('partial return restores products and combo components in the sale branch and lowers expected cash');

  const again = await giveBack(store, sale, partial, [{ index: 0, qty: 1 }, { index: 1, qty: 1 }], 'Cliente devolvió un agua y un pancho', [{ method: 'Efectivo', amount: 600 }], shift);
  assert.equal(again.id, partial);
  assert.equal(await stockOf(water), 8); assert.equal(await scalar('select count(*) from retail_sale_returns where sale_id=$1', [sale]), 1);
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [shift])), 850);
  pass('retrying the same request after a lost response does not duplicate stock, cash or the record');

  await assert.rejects(() => giveBack(store, sale, crypto.randomUUID(), [{ index: 0, qty: 3 }], 'Error de carga', [{ method: 'Efectivo', amount: 300 }], shift), /más de lo que queda/);
  await assert.rejects(() => giveBack(store, sale, crypto.randomUUID(), [{ index: 0, qty: 1 }], 'Error de carga', [{ method: 'QR', amount: 1 }]), /debe sumar/);
  await assert.rejects(() => giveBack(store, sale, crypto.randomUUID(), null, 'Anular el resto'), /cómo se devuelve/);
  const voided = await giveBack(store, sale, crypto.randomUUID(), null, 'Anular el resto', [{ method: 'Transferencia', amount: 750 }]);
  assert.equal(voided.returnStatus, 'voided'); assert.equal(Number(voided.returnedTotal), 1350);
  assert.equal(await stockOf(water), 10); assert.equal(await stockOf(bread), 20);
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [shift])), 850, 'a transfer refund does not touch cash');
  await assert.rejects(() => giveBack(store, sale, crypto.randomUUID(), null, 'Otra vez', [{ method: 'QR', amount: 1 }]), /ya está anulada/);
  const original = (await db.query('select total,items from retail_sales where id=$1', [sale])).rows[0];
  assert.equal(Number(original.total), 1350); assert.equal(original.items.length, 3);
  const record = (await db.query('select kind,reason,created_by,actor_email from retail_sale_returns where sale_id=$1 order by created_at,kind', [sale])).rows;
  assert.deepEqual(record.map(r => r.kind).sort(), ['partial', 'void']); assert.ok(record.every(r => r.created_by === owner && r.reason.length >= 3));
  pass('voiding the rest keeps the original sale, needs a refund method after a partial return and cannot repeat');

  const month = await scalar('select retail_month_result($1,current_date)', [store]);
  assert.equal(Number(month.sales), 0); assert.equal(Number(month.returns), 1350); assert.equal(Number(month.cost), 0);
  pass('Ganancias subtracts returned sales and their saved cost in the month of the return');

  // Caja cerrada: el cierre no cambia y el efectivo sale de la caja abierta ahora.
  const late = crypto.randomUUID();
  await db.query("select retail_checkout($1,$2,'Efectivo',100,$3)", [shift, late, JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }])]);
  await db.query('select retail_close_shift($1,950)', [shift]);
  const closedExpected = Number(await scalar('select expected_cash from retail_shifts where id=$1', [shift]));
  assert.equal(closedExpected, 950);
  await assert.rejects(() => giveBack(store, late, crypto.randomUUID(), null, 'Cobro duplicado', null, shift), /cerrado/);
  await assert.rejects(() => giveBack(store, late, crypto.randomUUID(), null, 'Cobro duplicado'), /Abrí tu caja/);
  const newShift = await scalar('select retail_open_shift($1,$2,200)', [store, register]);
  const tooMuch = crypto.randomUUID();
  await db.query("select retail_checkout($1,$2,'QR',500,$3)", [newShift, tooMuch, JSON.stringify([{ product_id: combo, qty: 1, unit_price: 500, stock_components: recipe }])]);
  await assert.rejects(() => giveBack(store, tooMuch, crypto.randomUUID(), null, 'Sin efectivo', [{ method: 'Efectivo', amount: 500 }], newShift), /suficiente efectivo/);
  await giveBack(store, late, crypto.randomUUID(), null, 'Cobro duplicado', null, newShift);
  assert.equal(Number(await scalar('select expected_cash from retail_shifts where id=$1', [shift])), closedExpected);
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [newShift])), 100, 'opening 200 minus the 100 cash refund');
  pass('a closed shift keeps its count; cash refunds need an open shift with enough cash');

  // Factura pendiente, con error o autorizada.
  const pendingSale = crypto.randomUUID(), billedSale = crypto.randomUUID();
  for (const id of [pendingSale, billedSale]) await db.query("select retail_checkout($1,$2,'QR',100,$3)", [newShift, id, JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }])]);
  await asAdmin();
  await db.query("update retail_sales set billing_status='pending' where id=$1", [pendingSale]);
  await db.query("update retail_sales set billing_status='authorized',cae='12345678901234',cbte_tipo=11,cbte_nro=7 where id=$1", [billedSale]);
  await login(owner);
  await assert.rejects(() => giveBack(store, pendingSale, crypto.randomUUID(), [{ index: 0, qty: 1 }], 'Error de cobro', [{ method: 'QR', amount: 100 }]), /factura de esta venta está pendiente/);
  await giveBack(store, pendingSale, crypto.randomUUID(), null, 'Error de cobro');
  assert.equal(await scalar('select billing_status from retail_sales where id=$1', [pendingSale]), 'none', 'voiding cancels the pending invoice');
  const billed = await giveBack(store, billedSale, crypto.randomUUID(), [{ index: 0, qty: 1 }], 'Producto vencido', [{ method: 'QR', amount: 100 }]);
  assert.equal(billed.creditNoteRequired, true);
  const billedReturn = await scalar('select id from retail_sale_returns where sale_id=$1', [billedSale]);
  await db.query("select retail_attach_credit_note($1,$2,'NC C 0001-00000003')", [store, billedReturn]);
  assert.equal(await scalar('select credit_note_reference from retail_sale_returns where id=$1', [billedReturn]), 'NC C 0001-00000003');
  pass('pending invoices block partial returns and are cancelled by a void; authorized invoices ask for a credit note');

  const racing = crypto.randomUUID();
  await db.query("select retail_checkout($1,$2,'QR',100,$3)", [newShift, racing, JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }])]);
  await giveBack(store, racing, crypto.randomUUID(), null, 'Anulada mientras facturaba');
  await asAdmin(); await db.query("update retail_sales set billing_status='authorized' where id=$1", [racing]); await login(owner);
  assert.equal(await scalar('select credit_note_required from retail_sale_returns where sale_id=$1', [racing]), true);
  pass('an invoice authorized after the void still asks for a credit note');

  // Permisos: el cajero no devuelve sin permiso ni ve ventas ajenas; otro comercio no ve nada.
  await asAdmin(); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  const target = crypto.randomUUID();
  await login(owner);
  await db.query("select retail_checkout($1,$2,'QR',100,$3)", [newShift, target, JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }])]);
  await login(cashier);
  await assert.rejects(() => giveBack(store, target, crypto.randomUUID(), null, 'Sin permiso'), /no permite anular/);
  await asAdmin(); await db.query("insert into retail_role_permissions(store_id,role,permissions) values($1,'cashier',array['sell','refund_sales'])", [store]);
  await login(cashier);
  await assert.rejects(() => giveBack(store, target, crypto.randomUUID(), null, 'Venta de otra persona'), /Venta no disponible|Sin acceso/);
  assert.equal(await scalar('select count(*) from retail_sale_returns'), 0, 'returns of sales the cashier cannot see stay private');
  await login(stranger);
  assert.equal(await scalar('select count(*) from retail_sale_returns'), 0);
  await assert.rejects(() => giveBack(store, target, crypto.randomUUID(), null, 'Ajeno'), /no permite anular/);
  await assert.rejects(() => db.query('delete from retail_sale_returns'), /permission denied/);
  pass('refund permission is explicit, scoped to visible sales and records stay private and immutable');

  console.log(`${checks} sale return checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
