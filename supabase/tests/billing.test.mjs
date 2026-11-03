// Facturación ARCA sin duplicados: turno por punto de venta, número anotado antes de enviar, recuperación de
// respuestas perdidas y clave en Vault. ARCA no se llama: la función del servidor se reemplaza por sus llamadas a la base.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PLATFORM_SQL } from './platform.mjs';

const db = new PGlite();
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const login = async id => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('set role authenticated'); };
const asServer = async () => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); await db.exec('set role service_role'); };
const owner = crypto.randomUUID(), cashier = crypto.randomUUID();
const CERT = '-----BEGIN CERTIFICATE-----\nMIIBprueba\n-----END CERTIFICATE-----';
const KEY = '-----BEGIN PRIVATE KEY-----\nMIIEclavedeprueba\n-----END PRIVATE KEY-----';
let checks = 0;
const pass = name => { checks++; console.log('PASS ' + name); };

try {
  await db.exec(PLATFORM_SQL);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^﻿/, ''));
  for (const id of [owner, cashier]) await db.query('insert into auth.users values($1,$2,now())', [id, `${id}@example.test`]);
  await login(owner);
  const store = await scalar("select retail_create_store('Kiosco fiscal')");
  await db.exec('reset role'); await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')", [store, cashier]);
  await login(owner);
  await db.query("select retail_set_billing_settings($1,'20123456786','Kiosco SRL','RI',3,null,null,true)", [store]);
  const register = await scalar('select id from retail_registers where store_id=$1', [store]);
  const category = await scalar('select id from retail_categories where store_id=$1 limit 1', [store]);
  const branch = await scalar('select branch_id from retail_registers where id=$1', [register]);
  const product = (await scalar('select retail_save_product_at_branch($1,$2,false,null,$3)', [store, JSON.stringify({ category_id: category, name: 'Alfajor', code: 'ALF', price: 121, cost: 50, stock: 100 }), branch])).id;
  const shift = await scalar('select retail_open_shift($1,$2,0)', [store, register]);
  const sell = async () => { await login(owner); const id = crypto.randomUUID(); await db.query("select retail_checkout($1,$2,'Efectivo',121,$3)", [shift, id, JSON.stringify([{ product_id: product, qty: 1, unit_price: 121 }])]); return id; };
  const sale = await sell();
  assert.equal(await scalar('select billing_status from retail_sales where id=$1', [sale]), 'pending');

  // Certificados: solo dueño o administrador, la clave queda en Vault.
  await login(cashier);
  await assert.rejects(() => db.query('select retail_set_billing_credentials($1,$2,$3)', [store, CERT, KEY]), /dueño o un administrador/);
  assert.equal((await scalar('select retail_get_billing_credentials_status($1)', [store])).error, 'Sin permisos');
  await login(owner);
  await assert.rejects(() => db.query("select retail_set_billing_credentials($1,'no es un certificado',$2)", [store, KEY]), /certificado/);
  const before = await scalar('select retail_billing_begin($1,$2)', [store, sale]);
  assert.equal(before.state, 'error', 'without a certificate nothing is sent');
  await db.query('select retail_set_billing_credentials($1,$2,$3)', [store, CERT, KEY]);
  assert.deepEqual(await scalar('select retail_get_billing_credentials_status($1)', [store]).then(s => [s.configured, s.environment]), [true, 'homo'], 'homologation is the default');
  await db.exec('reset role');
  assert.equal(await scalar('select arca_key from retail_private.store_billing_credentials where store_id=$1', [store]), null, 'no plaintext key');
  assert.equal(await scalar('select count(*)::int from vault.secrets where secret=$1', [KEY]), 1);
  await login(owner);
  await db.query('select retail_set_billing_credentials($1,$2,null)', [store, CERT]);
  await db.exec('reset role');
  assert.equal(await scalar('select count(*)::int from vault.secrets'), 1, 'changing only the certificate keeps the same key');
  for (const call of ['retail_billing_secrets($1)', "retail_billing_save_token($1,'homo','t','s',now())"]) {
    await login(owner);
    await assert.rejects(() => db.query(`select ${call}`, [store]), /permission denied/, 'the browser cannot read keys or tokens');
  }
  await asServer();
  const secrets = await scalar('select retail_billing_secrets($1)', [store]);
  assert.deepEqual([secrets.key, secrets.environment, secrets.token], [KEY, 'homo', null]);
  await db.query("select retail_billing_save_token($1,'homo','TOKEN','SIGN',now()+interval '12 hours')", [store]);
  assert.equal((await scalar('select retail_billing_secrets($1)', [store])).token, 'TOKEN', 'the ARCA permission survives restarts');
  pass('only owners load certificates; the key lives in Vault and only the server reads it');

  // Turno: importes desde la venta guardada, uno por punto de venta y tipo.
  await login(cashier);
  const first = await scalar('select retail_billing_begin($1,$2)', [store, sale]);
  assert.equal(first.state, 'issue');
  assert.deepEqual([Number(first.attempt.imp_total), Number(first.attempt.imp_neto), Number(first.attempt.imp_iva), first.attempt.cbte_tipo, first.attempt.pto_vta, first.cuit],
    [121, 100, 21, 6, 3, '20123456786'], 'Factura B with amounts from the saved sale');
  assert.equal((await scalar('select retail_billing_begin($1,$2)', [store, sale])).state, 'busy', 'the same sale is not requested twice');
  const other = await sell();
  await login(cashier);
  assert.equal((await scalar('select retail_billing_begin($1,$2)', [store, other])).state, 'busy', 'only one number in flight per point of sale');
  await assert.rejects(() => db.query('select retail_billing_mark_sent($1,1)', [first.attempt.id]), /permission denied/);
  await assert.rejects(() => db.query("select retail_update_sale_billing($1,$2,'authorized',6::smallint,1,'123','2026-12-01')", [store, sale]), /servidor de facturación/);
  pass('amounts, type and CUIT come from the database and numbering is locked');

  // Respuesta perdida: el número quedó anotado y se consulta antes de usar otro.
  await asServer();
  await db.query('select retail_billing_mark_sent($1,1)', [first.attempt.id]);
  assert.equal((await scalar("select retail_billing_finish($1,'unknown',null,null,'ARCA no respondió a tiempo')", [first.attempt.id])).state, 'retry');
  await db.exec('reset role'); assert.equal(await scalar('select billing_status from retail_sales where id=$1', [sale]), 'retry');
  await login(cashier);
  assert.equal((await scalar('select retail_billing_begin($1,$2)', [store, sale])).state, 'busy', 'while the request may still be running, nobody else asks');
  await db.exec('reset role'); await db.query("update retail_billing_attempts set lease_until=now()-interval '1 second' where id=$1", [first.attempt.id]);
  await login(cashier);
  const recover = await scalar('select retail_billing_begin($1,$2)', [store, other]);
  assert.deepEqual([recover.state, recover.attempt.id, Number(recover.attempt.cbte_nro)], ['recover', first.attempt.id, 1], 'the pending number is checked first, even from another sale');
  await asServer();
  await db.query("select retail_billing_finish($1,'authorized','75000000000001','2026-11-13')", [first.attempt.id]);
  await db.exec('reset role'); const billed = (await db.query('select billing_status,cbte_nro,cbte_tipo,cae from retail_sales where id=$1', [sale])).rows[0];
  assert.deepEqual([billed.billing_status, Number(billed.cbte_nro), billed.cbte_tipo, billed.cae], ['authorized', 1, 6, '75000000000001'], 'the CAE found in ARCA is recovered');
  await login(cashier);
  const again = await scalar('select retail_billing_begin($1,$2)', [store, sale]);
  assert.deepEqual([again.state, again.cae], ['authorized', '75000000000001'], 'asking again returns the same invoice');
  await assert.rejects(() => db.query("select retail_update_sale_billing($1,$2,'error',null,null,null,null,'falló')", [store, sale]), /ya tiene factura autorizada/);
  await db.exec('reset role'); assert.equal(await scalar('select count(*)::int from retail_billing_attempts where sale_id=$1', [sale]), 1);
  await login(cashier);
  pass('a lost response is recovered from ARCA instead of issuing a second invoice');

  // Pedido que nunca llegó a ARCA, rechazo y autorización tardía.
  const next = await scalar('select retail_billing_begin($1,$2)', [store, other]);
  await asServer();
  await db.query('select retail_billing_mark_sent($1,2)', [next.attempt.id]);
  await db.query("select retail_billing_finish($1,'not_issued',null,null,'ARCA no la había registrado')", [next.attempt.id]);
  await login(cashier);
  const retry = await scalar('select retail_billing_begin($1,$2)', [store, other]);
  assert.equal(retry.state, 'issue');
  await asServer();
  await db.query('select retail_billing_mark_sent($1,2)', [retry.attempt.id]);
  await db.query("select retail_billing_finish($1,'authorized','75000000000002','2026-11-13')", [retry.attempt.id]);
  const late = await scalar("select retail_billing_finish($1,'authorized','75000000000099','2026-11-13')", [next.attempt.id]);
  assert.equal(late.state, 'conflict', 'a late second authorization is flagged, not overwritten');
  await db.exec('reset role'); assert.equal(await scalar('select cae from retail_sales where id=$1', [other]), '75000000000002');
  const rejected = await sell();
  await login(cashier);
  const attempt = await scalar('select retail_billing_begin($1,$2)', [store, rejected]);
  await asServer();
  await db.query('select retail_billing_mark_sent($1,3)', [attempt.attempt.id]);
  await db.query("select retail_billing_finish($1,'rejected',null,null,'Rechazo ARCA: dato inválido')", [attempt.attempt.id]);
  await db.exec('reset role'); assert.deepEqual(Object.values((await db.query('select billing_status,billing_error from retail_sales where id=$1', [rejected])).rows[0]), ['error', 'Rechazo ARCA: dato inválido']);
  await login(cashier);
  assert.equal((await scalar('select retail_billing_begin($1,$2)', [store, rejected])).state, 'issue', 'a rejected invoice can be requested again');
  await db.exec('reset role'); await db.query("update retail_billing_attempts set lease_until=now()-interval '1 second' where status='reserved'");
  await login(cashier);
  assert.equal((await scalar('select retail_billing_begin($1,$2)', [store, rejected])).state, 'issue', 'an expired turn that never reached ARCA is released');
  await db.exec('reset role'); assert.equal(await scalar("select count(*)::int from retail_billing_attempts where status='cancelled'"), 1);
  pass('requests that never reached ARCA, rejections and late answers leave a single invoice per sale');

  // Ventas anuladas y lectura de los intentos.
  const voided = await sell();
  await db.query("select retail_return_sale($1,$2,$3,null,'Error de cobro',null,$4)", [store, voided, crypto.randomUUID(), shift]);
  await login(cashier);
  assert.equal((await scalar('select retail_billing_begin($1,$2)', [store, voided])).state, 'voided');
  assert.equal(await scalar('select count(*)::int from retail_billing_attempts'), 0, 'cashiers do not see billing attempts');
  await login(owner);
  assert.ok(await scalar('select count(*)::int from retail_billing_attempts') >= 5, 'owners can review every request');
  pass('voided sales are not invoiced and only owners review the requests');

  // Factura A y comprobantes a nombre de un cliente.
  await login(owner);
  const customer = async values => { const id = crypto.randomUUID(); await db.query('select retail_save_customer($1,$2,$3)', [store, id, JSON.stringify({ name: 'Cliente', ...values })]); return id; };
  const company = await customer({ business_name: 'Distribuidora SA', tax_id_type: 'CUIT', tax_id: '30712345678', iva_condition: 'RI' });
  const mono = await customer({ tax_id_type: 'CUIT', tax_id: '20333444556', iva_condition: 'MO' });
  const noCuit = await customer({ iva_condition: 'RI' });
  const issue = async (id, cae, nro) => {
    await login(cashier);
    const plan = await scalar('select retail_billing_begin($1,$2)', [store, id]);
    assert.equal(plan.state, 'issue');
    await asServer();
    await db.query('select retail_billing_mark_sent($1,$2)', [plan.attempt.id, nro]);
    await db.query("select retail_billing_finish($1,'authorized',$2,'2026-11-13')", [plan.attempt.id, cae]);
    return plan.attempt;
  };
  const toCompany = await sell();
  await login(cashier);
  await db.query('select retail_set_sale_receptor($1,$2,$3)', [store, toCompany, company]);
  const factA = await issue(toCompany, '75000000000101', 1);
  assert.deepEqual([factA.cbte_tipo, factA.doc_tipo, Number(factA.doc_nro), factA.cond_iva_receptor, Number(factA.imp_iva)], [1, 80, 30712345678, 1, 21], 'Factura A with the CUIT and IVA');
  await db.exec('reset role');
  assert.deepEqual(Object.values((await db.query('select receptor_doc_tipo,receptor_name,cbte_tipo from retail_sales where id=$1', [toCompany])).rows[0]), [80, 'Distribuidora SA', 1]);
  await login(cashier);
  await assert.rejects(() => db.query('select retail_set_sale_receptor($1,$2,null)', [store, toCompany]), /ya se emitió/);
  const toMono = await sell();
  await login(cashier);
  await db.query('select retail_set_sale_receptor($1,$2,$3)', [store, toMono, mono]);
  await login(cashier);
  const monoPlan = await scalar('select retail_billing_begin($1,$2)', [store, toMono]);
  assert.deepEqual([monoPlan.attempt.cbte_tipo, monoPlan.attempt.cond_iva_receptor], [1, 6], 'monotributistas get Factura A too');
  await asServer(); await db.query("select retail_billing_finish($1,'cancelled')", [monoPlan.attempt.id]);
  const missing = await sell();
  await login(cashier);
  await db.query('select retail_set_sale_receptor($1,$2,$3)', [store, missing, noCuit]);
  assert.match((await scalar('select retail_billing_begin($1,$2)', [store, missing])).error, /CUIT del cliente/);
  pass('Factura A goes to registered customers with their CUIT; without it the sale is held');

  // Notas de crédito desde las devoluciones.
  await login(owner);
  await db.query("select retail_return_sale($1,$2,$3,null,'Cliente devolvió todo',null,$4)", [store, sale, crypto.randomUUID(), shift]);
  await db.exec('reset role');
  const saleReturn = (await db.query('select id,credit_note_status from retail_sale_returns where sale_id=$1', [sale])).rows[0];
  assert.equal(saleReturn.credit_note_status, 'pending', 'returns of invoiced sales wait for their credit note');
  await login(cashier);
  await assert.rejects(() => db.query('select retail_billing_begin_credit($1,$2)', [store, saleReturn.id]), /no permite emitir notas/);
  await login(owner);
  const note = await scalar('select retail_billing_begin_credit($1,$2)', [store, saleReturn.id]);
  assert.equal(note.state, 'issue');
  assert.deepEqual([note.attempt.cbte_tipo, Number(note.attempt.imp_total), note.attempt.asoc.tipo, note.attempt.asoc.nro, note.attempt.asoc.pto_vta, !!note.attempt.asoc.fecha],
    [8, 121, 6, 1, 3, true], 'Nota de crédito B linked to the original Factura B');
  assert.equal((await scalar('select retail_billing_begin_credit($1,$2)', [store, saleReturn.id])).state, 'busy', 'the same credit note is not requested twice');
  await assert.rejects(() => db.query("select retail_attach_credit_note($1,$2,'NC manual')", [store, saleReturn.id]), /se está emitiendo/);
  await asServer();
  await db.query('select retail_billing_mark_sent($1,1)', [note.attempt.id]);
  await db.query("select retail_billing_finish($1,'unknown')", [note.attempt.id]);
  await db.exec('reset role');
  assert.equal(await scalar('select credit_note_status from retail_sale_returns where id=$1', [saleReturn.id]), 'retry');
  await db.query("update retail_billing_attempts set lease_until=now()-interval '1 second' where id=$1", [note.attempt.id]);
  await login(owner);
  assert.equal((await scalar('select retail_billing_begin_credit($1,$2)', [store, saleReturn.id])).state, 'recover', 'a lost credit note is checked in ARCA first');
  await asServer();
  await db.query("select retail_billing_finish($1,'authorized','75000000000201','2026-11-13')", [note.attempt.id]);
  await db.exec('reset role');
  assert.deepEqual(Object.values((await db.query('select credit_note_status,credit_note_reference,cae from retail_sale_returns where id=$1', [saleReturn.id])).rows[0]),
    ['authorized', 'NC B 00003-00000001', '75000000000201']);
  assert.equal(await scalar('select billing_status from retail_sales where id=$1', [sale]), 'authorized', 'the original invoice stays as it was');
  await login(owner);
  assert.equal((await scalar('select retail_billing_begin_credit($1,$2)', [store, saleReturn.id])).state, 'authorized');
  await db.query("select retail_return_sale($1,$2,$3,$4,'Uno vencido',$5)", [store, toCompany, crypto.randomUUID(), JSON.stringify([{ index: 0, qty: 1 }]), JSON.stringify([{ method: 'QR', amount: 121 }])]);
  await db.exec('reset role');
  const companyReturn = await scalar('select id from retail_sale_returns where sale_id=$1', [toCompany]);
  await login(owner);
  const noteA = await scalar('select retail_billing_begin_credit($1,$2)', [store, companyReturn]);
  assert.deepEqual([noteA.attempt.cbte_tipo, noteA.attempt.doc_tipo, Number(noteA.attempt.doc_nro), noteA.attempt.asoc.tipo], [3, 80, 30712345678, 1], 'Nota de crédito A to the same customer');
  pass('credit notes are issued from returns, linked to the invoice, once, and recovered if the answer is lost');

  console.log(`${checks} billing checks passed`);
} finally {
  await db.close();
}
