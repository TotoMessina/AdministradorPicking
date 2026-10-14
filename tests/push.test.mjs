import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

test('dispatcher rejects anonymous requests, blocks arbitrary endpoints and handles retry/expiry', async () => {
  const source = await readFile('supabase/functions/push-dispatch/index.ts', 'utf8');
  const js = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }).outputText;
  let handler, claims = 0, sent = 0, jobList = [], sendError = null;
  const updates = [], deletions = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: null }, error: new Error('invalid') }) },
    rpc: async () => { claims++; return { data: jobList, error: null }; },
    from: table => ({
      update: values => ({ eq: (key, id) => ({ eq: async (leaseKey, lease) => { updates.push({ table, values, key, id, leaseKey, lease }); return { error: null }; } }) }),
      delete: () => ({ eq: async (key, id) => { deletions.push({ table,key,id }); return { error: null }; } }),
    }),
  };
  const vars = { SUPABASE_URL:'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY:'server-only', PUSH_DISPATCH_SECRET:'scheduler-only', VAPID_SUBJECT:'mailto:test@example.com', VAPID_PUBLIC_KEY:'public', VAPID_PRIVATE_KEY:'private' };
  vm.runInNewContext(js, { URL, Response, Date, console, createClient:()=>db,
    webpush:{ sendNotification:async()=>{sent++;if(sendError)throw sendError;} },
    Deno:{ env:{get:name=>vars[name]},serve:fn=>{handler=fn;} },
  });
  const invoke = (headers={}) => handler(new Request('https://example.test', { method:'POST', headers, body:'{}' }));
  assert.equal((await invoke()).status,401);assert.equal(claims,0);
  assert.equal((await invoke({Authorization:'Bearer forged'})).status,401);assert.equal(claims,0);
  assert.equal((await invoke({'x-push-secret':'wrong'})).status,401);assert.equal(claims,0);
  const job={id:'job',subscription_id:'sub',store_id:'store',lease:'lease-1',attempts:1,authorized:true,kind:'low_stock',endpoint:'https://127.0.0.1/internal',p256dh:'key',auth:'key'};
  jobList=[job];
  await invoke({'x-push-secret':'scheduler-only'}); assert.equal(sent,0);assert.equal(updates.at(-1).values.last_error,'recipient_unavailable');
  jobList=[{...job,endpoint:'https://fcm.googleapis.com/fcm/send/ok'}];
  const ok=await (await invoke({'x-push-secret':'scheduler-only'})).json();assert.equal(ok.accepted,1);assert.ok(updates.at(-1).values.sent_at);assert.equal(updates.at(-1).lease,'lease-1');
  sendError={statusCode:503}; await invoke({'x-push-secret':'scheduler-only'});
  assert.equal(updates.at(-1).values.last_error,'push_503');assert.ok(new Date(updates.at(-1).values.available_at)>new Date());
  sendError={statusCode:410};const expired=await (await invoke({'x-push-secret':'scheduler-only'})).json();assert.equal(expired.expired,1);assert.equal(deletions.at(-1).id,'sub');
  jobList=[{...job,authorized:false}]; const before=sent;await invoke({'x-push-secret':'scheduler-only'});assert.equal(sent,before);
});

test('service worker displays push, tolerates malformed payloads and protects open sales', async () => {
  const handlers = {}, notifications = [], opened = [], messages = [];
  let focused = 0, windows = [];
  const scope = 'https://shop.example/';
  const source = (await readFile('pwa/sw.js','utf8')).replace('__CACHE_VERSION__','test').replace('__PRECACHE_ASSETS__','[]').replace('__DEVELOPMENT__','false');
  vm.runInNewContext(source, { URL, Response, self: {
    registration: { scope, showNotification: async (...args) => notifications.push(args) },
    location: { origin: 'https://shop.example' },
    addEventListener: (name, fn) => { handlers[name] = fn; },
    clients: { matchAll: async () => windows, openWindow: async url => opened.push(url) },
  } });
  const run = async (name, extra) => { let promise; handlers[name]({ ...extra, waitUntil: p => { promise = p; } }); await promise; };
  await run('push', { data: { json() { throw new Error('invalid'); } } });
  assert.equal(notifications[0][0], 'Kiosco Express');
  await run('push', { data: { json: () => ({ title:'Stock', body:'Revisar', view:'catalog', storeId:'10000000-0000-0000-0000-000000000001', url:'https://evil.example' }) } });
  assert.equal(notifications[1][1].data.view, 'catalog');
  const notification = { close() {}, data: notifications[1][1].data };
  await run('notificationclick', { notification });
  assert.ok(opened[0].startsWith(scope+'#push?'));
  assert.ok(!opened[0].includes('evil'));
  windows = [{ url:scope, postMessage:m=>messages.push(m), focus:async()=>focused++, navigate:()=>assert.fail('must not reload POS') }];
  await run('notificationclick', { notification });
  assert.equal(focused,1); assert.equal(messages[0].type,'retail-push-open'); assert.equal(opened.length,1);
});

test('push subscriptions and queue enforce permissions, preferences, isolation and leases', async () => {
  const db = new PGlite();
  const a='10000000-0000-0000-0000-000000000001', b='10000000-0000-0000-0000-000000000002', cashier='10000000-0000-0000-0000-000000000003';
  const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
  const login=async(id)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
  const service=()=>db.exec('reset role;set role service_role');
  const endpoint='https://fcm.googleapis.com/fcm/send/test-browser';
  const save=(store,url=endpoint,stock=true,shifts=true)=>scalar('select retail_save_push($1,$2,$3,$4,$5,$6)',[store,url,'B'.repeat(87),'a'.repeat(22),stock,shifts]);
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    for(const file of ['202610010001_retail_multistore.sql','202610020001_catalog_global_and_segmentation.sql','202610070001_harden_global_catalog_immutability.sql','202610130001_branches_prices_ledgers.sql','202610140001_web_push.sql'])
      await db.exec((await readFile('supabase/migrations/'+file,'utf8')).replace(/^\uFEFF/,''));
    for(const id of [a,b,cashier]) await db.query('insert into auth.users values($1,$2,now())',[id,id+'@example.test']);
    await login(a); const storeA=await scalar("select retail_create_store('A')");
    const category=await scalar('select id from retail_categories where store_id=$1 limit 1',[storeA]);
    const product=await scalar("insert into retail_products(store_id,category_id,code,name,price,stock,min_stock) values($1,$2,'A','Agua',100,10,4) returning id",[storeA,category]);
    const reg=await scalar('select id from retail_registers where store_id=$1',[storeA]);
    await save(storeA);
    await assert.rejects(()=>save(storeA,'https://127.0.0.1/private'),/inválida/);
    await assert.rejects(()=>save(storeA,'https://fcm.googleapis.com.evil.example/send'),/inválida/);
    await assert.rejects(()=>save(storeA,'https://fcm.googleapis.com:8443/send'),/inválida/);
    await assert.rejects(()=>db.query('select * from retail_push_deliveries'),/permission denied/);
    await assert.rejects(()=>db.query('select retail_claim_push()'),/permission denied/);
    await assert.rejects(()=>db.query('delete from retail_push_subscriptions'),/permission denied/);
    await db.query('update retail_products set stock=4 where id=$1',[product]);
    await db.query('update retail_products set stock=3 where id=$1',[product]);
    await service(); assert.equal(await scalar('select count(*) from retail_push_deliveries'),1);
    let jobs=await scalar('select retail_claim_push()'); assert.equal(jobs.length,1); assert.equal(jobs[0].authorized,true);
    assert.equal((await scalar('select retail_claim_push()')).length,0);
    await db.query("update retail_push_deliveries set locked_at=now()-interval '3 minutes'");
    const retry=await scalar('select retail_claim_push()'); assert.equal(retry[0].attempts,2); assert.notEqual(retry[0].lease,jobs[0].lease);
    await db.query('update retail_push_deliveries set sent_at=now(),locked_at=null');
    await login(a); await save(storeA,endpoint,false,true);
    await db.query('update retail_products set stock=10 where id=$1',[product]);
    await db.query('update retail_products set stock=2 where id=$1',[product]);
    const shift=await scalar('select retail_open_shift($1,$2,0)',[storeA,reg]);
    await db.query('select retail_close_shift($1,0)',[shift]);
    await service(); jobs=await scalar('select retail_claim_push()'); assert.equal(jobs.length,1);assert.equal(jobs[0].kind,'shift_closed');
    await db.query('update retail_push_deliveries set sent_at=now(),locked_at=null');
    await login(a);
    const testId=await scalar('select retail_request_push_test($1,$2)',[storeA,endpoint]);
    await assert.rejects(()=>db.query('select retail_request_push_test($1,$2)',[storeA,endpoint]),/un minuto/);
    await login(b); const storeB=await scalar("select retail_create_store('B')");
    assert.equal(await scalar('select count(*) from retail_push_subscriptions'),0);
    await assert.rejects(()=>save(storeA),/propietarios/);
    await db.query('select retail_remove_push($1)',[endpoint]);
    await service(); assert.equal(await scalar('select count(*) from retail_push_subscriptions'),1);
    await login(b); await save(storeB);
    await service(); assert.equal(await scalar('select count(*) from retail_push_deliveries where id=$1',[testId]),0);
    await db.exec('reset role');
    await db.query("insert into retail_members(store_id,user_id,role) values($1,$2,'cashier')",[storeA,cashier]);
    await login(cashier); await assert.rejects(()=>save(storeA),/propietarios/);
    await login(a);await save(storeA,'https://updates.push.services.mozilla.com/wpush/v2/test');
    const notice=await scalar('select retail_request_push_test($1,$2)',[storeA,'https://updates.push.services.mozilla.com/wpush/v2/test']);
    await db.exec('reset role');await db.query("update retail_members set role='cashier' where store_id=$1 and user_id=$2",[storeA,a]);
    await service(); jobs=await scalar('select retail_claim_push($1)',[notice]);assert.equal(jobs[0].authorized,false);
    await db.exec('reset role;set role anon');
    await assert.rejects(()=>db.query('select * from retail_push_subscriptions'),/permission denied/);
    await assert.rejects(()=>db.query('select retail_claim_push()'),/permission denied/);
  } finally { await db.close(); }
});
