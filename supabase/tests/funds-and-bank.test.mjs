// Plata en camino entre ubicaciones y conciliación de lo que entró al banco, con comisiones para Ganancias.
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
  const store = await scalar("select retail_create_store('Kiosco plata')");
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const balance = location => scalar('select coalesce((select balance from retail_location_funds where store_id=$1 and location=$2),0)', [store, location]).then(Number);
  const move = (from, to, amount, request = crypto.randomUUID()) => db.query('select retail_move_location_funds($1,$2,$3,$4,$5,$6)', [store, from, to, amount, 'Envío de prueba', request]).then(() => request);

  await move(null, branch, 1000);
  assert.equal(await balance(branch), 1000, 'external income is still immediate');
  const sent = crypto.randomUUID();
  await move(branch, 'depot', 600, sent); await move(branch, 'depot', 600, sent);
  assert.equal(await balance(branch), 400, 'it leaves the origin when sent, once'); assert.equal(await balance('depot'), 0, 'and does not reach the destination yet');
  assert.equal(await scalar('select status from retail_fund_transfers where id=$1', [sent]), 'in_transit');
  await assert.rejects(() => db.query('select retail_receive_location_funds($1,$2,550)', [store, sent]), /escribí qué pasó/);
  await assert.rejects(() => db.query('select retail_receive_location_funds($1,$2,700,$3)', [store, sent, 'Contado de más']), /entre 0 y lo enviado/);
  const received = await scalar("select retail_receive_location_funds($1,$2,550,'Faltaron 50 en el sobre')", [store, sent]);
  assert.equal(Number(received.missing), 50); assert.equal(await balance('depot'), 550);
  await db.query("select retail_receive_location_funds($1,$2,550,'Faltaron 50 en el sobre')", [store, sent]);
  assert.equal(await balance('depot'), 550, 'confirming twice does not add twice');
  const row = (await db.query('select status,received_amount,received_by,review_note from retail_fund_transfers where id=$1', [sent])).rows[0];
  assert.deepEqual([row.status, Number(row.received_amount), row.received_by, row.review_note], ['received', 550, owner, 'Faltaron 50 en el sobre']);
  pass('money sent between locations is in transit until someone confirms how much arrived');

  const lost = await move(branch, 'depot', 100);
  await assert.rejects(() => db.query("select retail_return_location_funds($1,$2,'')", [store, lost]), /por qué vuelve/);
  await db.query("select retail_return_location_funds($1,$2,'Nunca salió de la sucursal')", [store, lost]);
  assert.equal(await balance(branch), 400); assert.equal(await scalar('select status from retail_fund_transfers where id=$1', [lost]), 'returned');
  await assert.rejects(() => db.query('select retail_receive_location_funds($1,$2,100)', [store, lost]), /ya no está en camino/);
  const shift = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  await db.query('select retail_close_shift($1,0)', [shift]);
  pass('money that did not arrive goes back to the origin; shift closings keep working');

  // Conciliación.
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const water = (await scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, name: 'Agua', code: 'AGUA', price: 50, cost: 20, stock: 100 }), branch])).id;
  const sales = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  const sell = (method, qty, payments = null) => { const id = crypto.randomUUID(); return db.query('select retail_checkout($1,$2,$3,$4,$5,null,null,$6)', [sales, id, method, qty * 50, JSON.stringify([{ product_id: water, qty, unit_price: 50 }]), payments && JSON.stringify(payments)]).then(() => id); };
  const qrSale = await sell('QR', 6);
  await sell('Debito', 4);
  await sell('Mixto', 3, [{ method: 'Efectivo', amount: 100 }, { method: 'QR', amount: 50 }]);
  await db.query("select retail_return_sale($1,$2,$3,$4,'Error',$5)", [store, qrSale, crypto.randomUUID(), JSON.stringify([{ index: 0, qty: 2 }]), JSON.stringify([{ method: 'QR', amount: 100 }])]);
  const today = await scalar("select (now() at time zone 'America/Argentina/Buenos_Aires')::date::text");
  const deposit = (id, values) => db.query('select retail_save_bank_deposit($1,$2,$3)', [store, id, JSON.stringify({ deposited_on: today, sales_from: today, sales_to: today, ...values })]);
  await assert.rejects(() => deposit(crypto.randomUUID(), { method: 'QR', net: '-5' }), /importes/);
  const qrDeposit = crypto.randomUUID(), cardDeposit = crypto.randomUUID();
  await deposit(qrDeposit, { method: 'QR', provider: 'Billetera', net: '240', commission: '8', taxes: '2' });
  await deposit(qrDeposit, { method: 'QR', provider: 'Billetera', net: '240', commission: '8', taxes: '2' });
  await deposit(cardDeposit, { method: 'Debito', net: '190', commission: '6' });
  const report = await scalar('select retail_bank_reconciliation($1,$2,$3)', [store, today, today]);
  const byMethod = method => report.methods.find(row => row.method === method);
  assert.deepEqual([Number(byMethod('QR').sold), Number(byMethod('QR').difference), Number(byMethod('QR').commission)], [250, 0, 8], 'QR: sales and mixed parts, minus refunds');
  assert.deepEqual([Number(byMethod('Debito').sold), Number(byMethod('Debito').difference)], [200, -4]);
  assert.equal(Number(byMethod('Credito').sold), 0); assert.equal(report.deposits.length, 2, 'saving again does not duplicate');
  assert.ok(!report.methods.some(row => row.method === 'Efectivo'), 'cash is not reconciled here');
  pass('bank deposits are compared with what was sold by each method, showing differences and commissions');

  const month = await scalar('select retail_month_commissions($1,current_date)', [store]);
  assert.deepEqual([Number(month.commission), Number(month.taxes)], [14, 2]);
  await assert.rejects(() => db.query("select retail_void_bank_deposit($1,$2,'')", [store, cardDeposit]), /por qué/);
  await db.query("select retail_void_bank_deposit($1,$2,'Cargada dos veces')", [store, cardDeposit]);
  assert.equal(Number((await scalar('select retail_month_commissions($1,current_date)', [store])).commission), 8, 'a voided deposit leaves Ganancias');
  assert.equal(Number((await scalar('select retail_bank_reconciliation($1,$2,$3)', [store, today, today])).methods.find(row => row.method === 'Debito').difference), -200);
  pass('Ganancias takes commissions once, from active deposits only');

  await db.exec('reset role'); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await login(cashier);
  await assert.rejects(() => db.query('select retail_bank_reconciliation($1,$2,$3)', [store, today, today]), /no permite conciliar/);
  await assert.rejects(() => move(branch, 'depot', 10), /permiso|no permite/i);
  assert.equal(await scalar('select count(*) from retail_bank_deposits'), 0);
  assert.equal(await scalar('select count(*) from retail_fund_transfers'), 0);
  pass('cashiers see neither funds nor bank deposits');

  console.log(`${checks} funds and bank checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
