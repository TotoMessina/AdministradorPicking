// Clientes y cuenta corriente: fiado, límite, cobros, caja, devoluciones, reintentos y permisos.
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
  const store = await scalar("select retail_create_store('Kiosco fiado')");
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const water = (await scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, name: 'Agua', code: 'AGUA', price: 100, cost: 40, stock: 20 }), branch])).id;
  const stockOf = () => scalar('select stock from retail_products where id=$1', [water]);
  const shift = await scalar('select retail_open_shift($1,$2,100)', [store, register]);
  const balanceOf = async id => Number((await scalar('select retail_customer_balances($1)', [store])).find(row => row.id === id).balance);
  const cash = () => scalar('select retail_shift_balance($1)', [shift]).then(Number);
  const fiar = (request, customer, qty, over = false) => db.query("select retail_checkout($1,$2,'Fiado',0,$3,null,null,null,$4,$5)",
    [shift, request, JSON.stringify([{ product_id: water, qty, unit_price: 100 }]), customer, over]);
  const pay = (customer, request, amount, method, shiftId = null) => scalar('select retail_customer_payment($1,$2,$3,$4,$5,$6)', [store, customer, request, amount, method, shiftId]);

  const ana = crypto.randomUUID();
  await assert.rejects(() => db.query('select retail_save_customer($1,$2,$3)', [store, ana, JSON.stringify({ name: ' ' })]), /nombre/);
  await db.query('select retail_save_customer($1,$2,$3)', [store, ana, JSON.stringify({ name: 'Ana Gómez', phone: '11 5555-0000', credit_limit: '500' })]);
  await db.query('select retail_save_customer($1,$2,$3)', [store, ana, JSON.stringify({ name: 'Ana Gómez', phone: '11 5555-0000', credit_limit: '500' })]);
  assert.equal(await scalar('select count(*) from retail_customers'), 1, 'saving again does not duplicate');
  pass('customers are saved with name, phone and debt limit');

  const first = crypto.randomUUID();
  await assert.rejects(() => db.query("select retail_checkout($1,$2,'Fiado',0,$3)", [shift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }])]), /a quién le fiás/);
  await fiar(first, ana, 3);
  await fiar(first, ana, 3);
  const sale = (await db.query('select payment_method,payments,cash_amount,customer_id,customer_name,total from retail_sales where id=$1', [first])).rows[0];
  assert.equal(sale.payment_method, 'Fiado'); assert.equal(Number(sale.cash_amount), 0); assert.equal(sale.customer_name, 'Ana Gómez'); assert.deepEqual(sale.payments, [{ method: 'Fiado', amount: 300 }]);
  assert.equal(await balanceOf(ana), 300); assert.equal(await stockOf(), 17);
  assert.equal(await cash(), 100, 'a credit sale adds no cash to the shift');
  assert.equal(await scalar('select count(*) from retail_customer_movements'), 1, 'retrying the sale does not add debt twice');
  pass('a credit sale needs a customer, adds debt and stock movement but no cash, and retries safely');

  await assert.rejects(() => fiar(crypto.randomUUID(), ana, 3), /más que su límite de 500/);
  assert.equal(await stockOf(), 17, 'a rejected sale leaves no stock movement'); assert.equal(await balanceOf(ana), 300);
  await fiar(crypto.randomUUID(), ana, 3, true);
  assert.equal(await balanceOf(ana), 600);
  pass('exceeding the limit is rejected unless confirmed by someone allowed');

  const partial = crypto.randomUUID();
  await assert.rejects(() => pay(ana, partial, 50, 'Efectivo'), /Abrí tu caja/);
  assert.equal(Number((await pay(ana, partial, 250, 'Efectivo', shift)).balance), 350);
  await pay(ana, partial, 250, 'Efectivo', shift);
  assert.equal(await balanceOf(ana), 350); assert.equal(await cash(), 350, 'cash enters the shift when collected');
  await pay(ana, crypto.randomUUID(), 50, 'Transferencia');
  assert.equal(await balanceOf(ana), 300); assert.equal(await cash(), 350, 'a transfer collection does not touch cash');
  pass('partial collections by method lower the balance; cash ones enter the shift once');

  await db.query('select retail_return_sale($1,$2,$3,null,$4)', [store, first, crypto.randomUUID(), 'Se anotó al cliente equivocado']);
  assert.equal(await balanceOf(ana), 0, 'voiding a credit sale credits the account'); assert.equal(await stockOf(), 17);
  assert.equal(await cash(), 350, 'the void returns no cash');
  const kinds = (await db.query('select kind,amount from retail_customer_movements where customer_id=$1 order by created_at,kind', [ana])).rows.map(r => `${r.kind}:${Number(r.amount)}`);
  assert.deepEqual(kinds.sort(), ['payment:-250', 'payment:-50', 'return:-300', 'sale:300', 'sale:300'].sort());
  await db.query("select retail_close_shift($1,350)", [shift]);
  assert.equal(Number(await scalar('select expected_cash from retail_shifts where id=$1', [shift])), 350);
  pass('voiding a credit sale credits the customer; the closing includes collected cash');

  // Saldo a favor: puede dejar plata de más y usarla después con «Fiado».
  const beto = crypto.randomUUID();
  await assert.rejects(() => db.query('select retail_save_customer($1,$2,$3)', [store, beto, JSON.stringify({ name: 'Beto SRL', tax_id: '20-1234', iva_condition: 'RI' })]), /Revisá el documento/);
  await assert.rejects(() => db.query('select retail_save_customer($1,$2,$3)', [store, beto, JSON.stringify({ name: 'Beto SRL', email: 'no-es-mail' })]), /email/);
  await db.query('select retail_save_customer($1,$2,$3)', [store, beto, JSON.stringify({ name: 'Beto', business_name: 'Beto SRL', tax_id: '30-71234567-1', iva_condition: 'RI', address: 'San Martín 100', email: 'Compras@Beto.com', credit_limit: '0' })]);
  const fiscal = (await db.query('select tax_id_type,tax_id,iva_condition,email,business_name from retail_customers where id=$1', [beto])).rows[0];
  assert.deepEqual(fiscal, { tax_id_type: 'CUIT', tax_id: '30712345671', iva_condition: 'RI', email: 'compras@beto.com', business_name: 'Beto SRL' });
  const advanceShift = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  assert.equal(Number((await pay(beto, crypto.randomUUID(), 1000, 'Efectivo', advanceShift)).balance), -1000);
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [advanceShift])), 1000, 'an advance enters the shift as cash');
  await db.query("select retail_checkout($1,$2,'Fiado',0,$3,null,null,null,$4)", [advanceShift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 3, unit_price: 100 }]), beto]);
  assert.equal(await balanceOf(beto), -700, 'the sale is paid from the credit without exceeding a zero limit');
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [advanceShift])), 1000, 'spending the credit adds no cash');
  await assert.rejects(() => db.query("select retail_checkout($1,$2,'Fiado',0,$3,null,null,null,$4)", [advanceShift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 8, unit_price: 100 }]), beto]), /más que su límite de 0/);
  const listed = (await scalar('select retail_customer_balances($1)', [store])).find(row => row.id === beto);
  assert.equal(listed.tax_id, '30712345671'); assert.equal(listed.iva_condition, 'RI');
  await db.query('select retail_close_shift($1,1000)', [advanceShift]);
  pass('optional billing data is validated and listed; advances leave credit that later sales use');

  await assert.rejects(() => db.query("select retail_checkout($1,$2,'Efectivo',100,$3,null,null,null,$4)", [shift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }]), ana]), /solo para ventas fiadas|cerrado/);

  await db.exec('reset role'); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await login(cashier);
  assert.equal(await scalar('select count(*) from retail_customers'), 2, 'cashiers see customers to sell on credit');
  await assert.rejects(() => db.query('select retail_save_customer($1,$2,$3)', [store, crypto.randomUUID(), JSON.stringify({ name: 'Nuevo' })]), /no permite cargar/);
  const cashierShift = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  await db.query("select retail_checkout($1,$2,'Fiado',0,$3,null,null,null,$4)", [cashierShift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 5, unit_price: 100 }]), ana]);
  await assert.rejects(() => db.query("select retail_checkout($1,$2,'Fiado',0,$3,null,null,null,$4,true)", [cashierShift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }]), ana]), /no permite fiar por encima/);
  await login(stranger);
  assert.equal(await scalar('select count(*) from retail_customer_movements'), 0);
  await assert.rejects(() => db.query('select retail_customer_balances($1)', [store]), /no permite ver clientes/);
  await assert.rejects(() => db.query('delete from retail_customer_movements'), /permission denied/);
  pass('cashiers sell on credit within the limit; editing customers and going over it need permission');

  // Fiado parcial dentro de un pago Mixto: el efectivo va a la caja y solo el resto a la cuenta.
  await login(owner);
  const caro = crypto.randomUUID();
  await db.query('select retail_save_customer($1,$2,$3)', [store, caro, JSON.stringify({ name: 'Caro', credit_limit: '400' })]);
  const mixed = (request, parts, qty) => db.query("select retail_checkout($1,$2,'Mixto',$3,$4,null,null,$5,$6)",
    [cashierShift, request, parts.find(p => p.method === 'Efectivo')?.amount || 0, JSON.stringify([{ product_id: water, qty, unit_price: 100 }]), JSON.stringify(parts), caro]);
  const drawer = () => scalar('select retail_shift_balance($1)', [cashierShift]).then(Number);
  const before = await drawer();
  const half = crypto.randomUUID();
  await mixed(half, [{ method: 'Efectivo', amount: 200 }, { method: 'Fiado', amount: 300 }], 5);
  await mixed(half, [{ method: 'Efectivo', amount: 200 }, { method: 'Fiado', amount: 300 }], 5);
  const mixedSale = (await db.query('select payment_method,payments,cash_amount,customer_id from retail_sales where id=$1', [half])).rows[0];
  assert.equal(mixedSale.payment_method, 'Mixto'); assert.equal(Number(mixedSale.cash_amount), 200); assert.equal(mixedSale.customer_id, caro);
  assert.deepEqual(mixedSale.payments, [{ method: 'Efectivo', amount: 200 }, { method: 'Fiado', amount: 300 }]);
  assert.equal(await balanceOf(caro), 300, 'only the credit part goes to the account, once');
  assert.equal(await drawer(), before + 200, 'the cash part enters the shift');
  await mixed(crypto.randomUUID(), [{ method: 'Transferencia', amount: 40 }, { method: 'Fiado', amount: 60 }], 1);
  assert.equal(await balanceOf(caro), 360);
  await assert.rejects(() => mixed(crypto.randomUUID(), [{ method: 'Efectivo', amount: 10 }, { method: 'Fiado', amount: 90 }], 1), /más que su límite de 400/);
  await assert.rejects(() => db.query("select retail_checkout($1,$2,'Mixto',100,$3,null,null,$4)", [cashierShift, crypto.randomUUID(), JSON.stringify([{ product_id: water, qty: 1, unit_price: 100 }]), JSON.stringify([{ method: 'Efectivo', amount: 50 }, { method: 'Fiado', amount: 50 }])]), /a quién le fiás/);
  await db.query('select retail_return_sale($1,$2,$3,null,$4,null,$5)', [store, half, crypto.randomUUID(), 'Se cobró mal', cashierShift]);
  assert.equal(await balanceOf(caro), 60, 'voiding returns the credit part to the account');
  assert.equal(await drawer(), before + 200 - 200, 'and the cash part leaves the shift');
  pass('a mixed payment can leave part on credit; limit, retries and voids treat each part correctly');

  console.log(`${checks} customer account checks passed.`);
} catch (error) { console.error('FAIL', error.message, error.where || ''); process.exitCode = 1; }
finally { await db.close(); }
