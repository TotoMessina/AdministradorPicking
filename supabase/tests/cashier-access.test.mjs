import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const login = async id => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
};
const users = Object.fromEntries(['owner', 'admin', 'one', 'two', 'outsider', 'pending'].map(name => [name, crypto.randomUUID()]));
const scope = (store, user, branch = null, register = null, pending = false) => db.query('select retail_set_cashier_access($1,$2,$3,$4,$5)', [store, user, branch, register, pending]);
const open = (store, register) => scalar('select retail_open_shift($1,$2,100)', [store, register]);
const move = (shift, amount = 10) => scalar("select retail_add_movement($1,'INGRESO',$2,'Prueba',$3)", [shift, amount, crypto.randomUUID()]);
const sale = shift => scalar("select retail_checkout($1,$2,'Efectivo',50,$3)", [shift, crypto.randomUUID(), JSON.stringify([{ name: 'Manual', qty: 1, unit_price: 50 }])]);
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^\uFEFF/, ''));
  }
  for (const [name, id] of Object.entries(users)) await db.query('insert into auth.users values($1,$2,now())', [id, `${name}@example.test`]);
  await login(users.owner);
  const store = await scalar("select retail_create_store('Comercio')");
  const branch = await scalar('select id from retail_branches where store_id=$1', [store]);
  const reg = await scalar('select id from retail_registers where store_id=$1', [store]);
  const branch2 = await scalar("insert into retail_branches(store_id,name) values($1,'Norte') returning id", [store]);
  const reg2 = await scalar("insert into retail_registers(store_id,branch_id,name) values($1,$2,'Norte 1') returning id", [store, branch2]);
  const reg3 = await scalar("insert into retail_registers(store_id,branch_id,name) values($1,$2,'Norte 2') returning id", [store, branch2]);
  for (const name of ['admin', 'one', 'two']) {
    await login(users.owner);
    await db.query('insert into retail_invitations(store_id,email,role) values($1,$2,$3)', [store, `${name}@example.test`, name === 'admin' ? 'admin' : 'cashier']);
    await login(users[name]); assert.equal(await scalar('select retail_accept_invitations()'), 1);
  }
  await login(users.outsider);
  const otherStore = await scalar("select retail_create_store('Otro')");
  const otherReg = await scalar('select id from retail_registers where store_id=$1', [otherStore]);
  const otherBranch = await scalar('select id from retail_branches where store_id=$1', [otherStore]);
  await assert.rejects(() => db.query('select * from retail_team($1)', [store]), /Sin permiso/);
  await assert.rejects(() => scope(store, users.one), /Sin permiso/);
  await login(users.admin);
  const team = (await db.query('select * from retail_team($1)', [store])).rows;
  assert.equal(team.length, 4); assert.equal(team.find(m => m.user_id === users.one).email, 'one@example.test');
  await assert.rejects(() => scope(store, users.owner, branch2), /Solo se pueden/);
  await assert.rejects(() => scope(store, users.one, otherBranch), /Sucursal no disponible/);
  await assert.rejects(() => scope(store, users.one, null, otherReg), /Caja no disponible/);
  await assert.rejects(() => scope(store, users.one, branch, reg2), /no pertenece/);
  await scope(store, users.one, branch2);
  await login(users.one);
  assert.equal(await scalar('select count(*) from retail_branches'), 1);
  assert.equal(await scalar('select count(*) from retail_registers'), 2);
  assert.equal(await scalar('select count(*) from retail_members'), 1);
  await assert.rejects(() => db.query('select * from retail_team($1)', [store]), /Sin permiso/);
  await assert.rejects(() => scope(store, users.one), /Sin permiso/);
  await assert.rejects(() => db.query('update retail_members set branch_id=null where user_id=$1', [users.one]), /permission denied/);
  await assert.rejects(() => open(store, reg), /Sin acceso/);
  console.log('PASS manager emails, branch scope, cross-store rejection and no cashier privilege escalation');

  await login(users.admin); await scope(store, users.one, null, reg2);
  await login(users.one);
  assert.equal(await scalar('select count(*) from retail_registers'), 1);
  assert.equal(await scalar('select branch_id from retail_members'), branch2);
  await assert.rejects(() => open(store, reg3), /Sin acceso/);
  const shift1 = await open(store, reg2); const sale1 = await sale(shift1); const move1 = await move(shift1);
  await login(users.two);
  const shift2 = await open(store, reg); await sale(shift2); await move(shift2);
  assert.equal(await scalar('select count(*) from retail_shifts'), 1);
  assert.equal(await scalar('select count(*) from retail_sales'), 1);
  assert.equal(await scalar('select count(*) from retail_movements'), 1);
  assert.equal(await scalar('select count(*) from retail_sales where id=$1', [sale1]), 0);
  assert.equal(await scalar('select count(*) from retail_movements where id=$1', [move1]), 0);
  await assert.rejects(() => sale(shift1), /otro usuario/);
  await assert.rejects(() => move(shift1), /otro usuario/);
  await assert.rejects(() => db.query('select retail_close_shift($1,0)', [shift1]), /otro usuario/);
  await assert.rejects(() => db.query('select retail_shift_balance($1)', [shift1]), /Sin acceso/);
  const occupancy = (await db.query('select * from retail_register_availability($1)', [store])).rows;
  assert.equal(occupancy.find(r => r.register_id === reg2).occupied, true);
  assert.deepEqual(Object.keys(occupancy[0]).sort(), ['occupied', 'register_id']);
  await assert.rejects(() => open(store, reg2), /unique constraint/);
  console.log('PASS private own activity, direct lookup protection, write RPC denial and occupancy without private data');

  await login(users.admin);
  assert.equal(await scalar('select count(*) from retail_sales where store_id=$1', [store]), 2);
  await assert.rejects(() => scope(store, users.one, branch), /cerrar su turno/);
  await scope(store, users.one, branch2); // broadening access is safe with an open shift
  await move(shift1, 25); // oversight adjustments stay private, but own-shift reconciliation stays correct
  await login(users.one);
  assert.equal(await scalar('select count(*) from retail_movements'), 1);
  assert.equal(Number(await scalar('select retail_shift_balance($1)', [shift1])), 185);
  assert.equal(Number(await scalar('select retail_close_shift($1,185)', [shift1])), 185);
  await login(users.admin); await scope(store, users.one, branch);
  await login(users.one);
  assert.equal(await scalar('select count(*) from retail_shifts where closed_at is not null'), 1);
  assert.equal(await scalar('select count(*) from retail_registers'), 1);
  await login(users.admin); await scope(store, users.one);
  await login(users.one); assert.equal(await scalar('select count(*) from retail_registers'), 3);
  console.log('PASS active shift reassignment guard, manager overview, accurate own balance and restoring unrestricted access');

  await login(users.owner);
  const invitation = await scalar("insert into retail_invitations(store_id,email,role) values($1,'pending@example.test','cashier') returning id", [store]);
  await login(users.admin); await scope(store, invitation, null, reg3, true);
  await login(users.pending); assert.equal(await scalar('select retail_accept_invitations()'), 1);
  assert.equal(await scalar('select register_id from retail_members'), reg3);
  assert.equal(await scalar('select count(*) from retail_registers'), 1);
  await assert.rejects(() => open(store, reg), /Sin acceso/);
  const ownShift = await open(store, reg3); await sale(ownShift); await move(ownShift);
  assert.equal(Number(await scalar('select retail_close_shift($1,160)', [ownShift])), 160);
  await login(users.owner); await db.query('delete from retail_members where store_id=$1 and user_id=$2', [store, users.pending]);
  await login(users.pending); assert.equal(await scalar('select count(*) from retail_sales'), 0);
  await assert.rejects(() => db.query('select retail_shift_balance($1)', [ownShift]), /Sin acceso/);
  await db.exec('reset role; set role anon;');
  await assert.rejects(() => db.query('select * from retail_team($1)', [store]), /permission denied/);
  await assert.rejects(() => scope(store, users.one), /permission denied/);
  console.log('PASS pending assignments, autonomous cashier open/sell/move/close, revocation and anonymous denial');
} catch (error) { console.error('FAIL', error.message, error.detail || '', error.query || ''); process.exitCode = 1; }
finally { await db.close(); }
