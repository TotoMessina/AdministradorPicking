-- RECOVERY FOR THE INSTALLATION DIAGNOSED ON 2026-10-27 ONLY.
-- Confirm AdministradorKiosco project lkahqqsduatkhxruiolo in the dashboard.
-- Run this WHOLE file once, then run the current supabase/schema.sql WHOLE.
-- If the session is aborted (25P02), run ROLLBACK before starting.
-- Writes installation history ONLY. Never replays migrations or changes retail data.
-- First 30: explicit manual baseline confirmed by the operator on 2026-10-23.
-- 31-34: source bodies matched to the supplied diagnostic, plus live guards below.
-- 35+ are NOT adopted: the reported database has no price tree or list deletion.
-- Billing may have the exact 003 date signature OR its exact 006 text replacement.
-- Accepting that replacement does NOT adopt 006 or permit arbitrary overloads.
-- The global baseline in generate-schema.mjs remains unchanged.
-- Package the pinned manifest: node scripts/generate-schema.mjs --manual-history-recovery-20261027
-- One atomic DO statement: manifest and validation never depend on a temp table
-- surviving another statement, session, or transaction.
do $reconcile$
declare
-- BEGIN PINNED MANIFEST: generated only with the explicit recovery flag.
 manifest jsonb := $retail_manual_manifest$
[
 {
  "ordinal": 1,
  "filename": "202610010001_retail_multistore.sql",
  "sha256": "f24b734005cc1623cbeb235dd0436522445fce6501ec73999528a8f745ed1cb9"
 },
 {
  "ordinal": 2,
  "filename": "202610020001_catalog_global_and_segmentation.sql",
  "sha256": "bca9c54fa75c2a8940b4f28c76aaab415b1740330c2a4a334dad2fef5beca292"
 },
 {
  "ordinal": 3,
  "filename": "202610070001_harden_global_catalog_immutability.sql",
  "sha256": "f3ff59ec39b6e5744cb059f242cfdaf0c234f1ab34c4bae2ec93ca10f13594f5"
 },
 {
  "ordinal": 4,
  "filename": "202610130001_branches_prices_ledgers.sql",
  "sha256": "e86fe143f886cd858443bde5917d43095126a4beca788c866f2589bcee94509b"
 },
 {
  "ordinal": 5,
  "filename": "202610140001_web_push.sql",
  "sha256": "918efe9a5d3313e3dc695430c93c0c035acdf97f9b20fcc4c387b444a8737964"
 },
 {
  "ordinal": 6,
  "filename": "202610150001_cashier_access.sql",
  "sha256": "a30006ceabfa2ca5abd0116ddf06f3f79d042bae913fd59c25efb5a918a83017"
 },
 {
  "ordinal": 7,
  "filename": "202610160001_offline_pos.sql",
  "sha256": "770c916876fcdabf64104718e442e7b424f343e6787bfc742c4164cccf435313"
 },
 {
  "ordinal": 8,
  "filename": "202610160002_offline_queue.sql",
  "sha256": "ffb2f924480094f8255c3bd1105ac834381678058bb65ff6e63ec433b4710ab0"
 },
 {
  "ordinal": 9,
  "filename": "202610160003_pack_size.sql",
  "sha256": "e8f486a53e3699543bb33b819986d3e96c57bbfb112cb039428e534507228c6b"
 },
 {
  "ordinal": 10,
  "filename": "202610160004_margin_groups.sql",
  "sha256": "8a5790ed3a1371e6c0aa57f46b68b2fe0af74efd79a3650cfa7ced54b876cc86"
 },
 {
  "ordinal": 11,
  "filename": "202610160005_branch_price_rules.sql",
  "sha256": "7899d29739b25999d24e879b18ed53f8794628fe852743c7916b46d4db5b16e1"
 },
 {
  "ordinal": 12,
  "filename": "202610190001_justified_withdrawal.sql",
  "sha256": "029b5843eacab94f78439fd8f13da846c46e7729f376e1f314286e1f20a14fa9"
 },
 {
  "ordinal": 13,
  "filename": "202610190001_store_onboarding.sql",
  "sha256": "e5b8362448949bceec6db8607ab80a30285230317f319875eb6d9a2f1d47f09c"
 },
 {
  "ordinal": 14,
  "filename": "202610190002_pending_replenishments.sql",
  "sha256": "3ddd179e5609126a264e696cd293909008bf4dd1acc06a8bb409c248ba5ab707"
 },
 {
  "ordinal": 15,
  "filename": "202610190003_stock_transfers.sql",
  "sha256": "cab05c3785465fba81273dddaad52130c14a8c6c42fb63ed53f476416d53a4be"
 },
 {
  "ordinal": 16,
  "filename": "202610200001_supplier_mappings.sql",
  "sha256": "d4841853f82adbd4e881feb1bdf3f525d76a12121e152b54257f8eaf9a81611c"
 },
 {
  "ordinal": 17,
  "filename": "202610200002_supplier_alias_usage.sql",
  "sha256": "1adc3ce4519abbb20c3436578bff8de5d9111f08abda7e198639468bd77e15c4"
 },
 {
  "ordinal": 18,
  "filename": "202610200003_product_expiry.sql",
  "sha256": "77d1f8c0f62da28481839205c638d09ab8586267acd2b86fb97f44c812072a87"
 },
 {
  "ordinal": 19,
  "filename": "202610210001_ledger_routing.sql",
  "sha256": "f19dc026535013c80519da077ca4de832b6706cf7e885ffbc1b0e31185591d7e"
 },
 {
  "ordinal": 20,
  "filename": "202610210002_staff_profiles.sql",
  "sha256": "ca6e73c2c8993bc2390e2f91d48e9a0d82e60e3ae1be9613297f6ba667809a0e"
 },
 {
  "ordinal": 21,
  "filename": "202610210003_ledger_lock_order.sql",
  "sha256": "b9f318a08145ad1e1734c2afe5fc1ff04402666a69869aa0f27c4dee2abb5124"
 },
 {
  "ordinal": 22,
  "filename": "202610210004_delegated_catalog_actions.sql",
  "sha256": "bcfa6664c406dd0074ba93d0bbb367c1c212c5e9285e703583616519f163628e"
 },
 {
  "ordinal": 23,
  "filename": "202610220001_product_compositions.sql",
  "sha256": "ef088735e7a849006d0960d0e16decd98e257bb432da68ebd2e0d02618f93c84"
 },
 {
  "ordinal": 24,
  "filename": "202610220002_loose_cigarettes.sql",
  "sha256": "e943d579b3d7ed4e77e96ffc6c26125f7ccb84ca09dcb9a09a7dde87ed147bad"
 },
 {
  "ordinal": 25,
  "filename": "202610220003_product_deletion_history.sql",
  "sha256": "458a93d670539dd4bfd36c3f8b4aff69042989aafdea80511ced58e6d5a3f9b7"
 },
 {
  "ordinal": 26,
  "filename": "202610220004_standard_categories.sql",
  "sha256": "85e889e22c9dcc559736c4af21b9cf7bc0205cbd1ff940ed00ff9d38f481fd13"
 },
 {
  "ordinal": 27,
  "filename": "202610220005_category_labels.sql",
  "sha256": "e975aa6c462d6ee5492edbb36b1ed523a410c634658f8ad36fd24fe18a218f99"
 },
 {
  "ordinal": 28,
  "filename": "202610220006_complete_permission_profiles.sql",
  "sha256": "913347ffd59472a588b214ee3da8ec426cb47fe143db19889896279a221636d5"
 },
 {
  "ordinal": 29,
  "filename": "202610230001_automatic_margin_groups.sql",
  "sha256": "6cd429e7679685c41c4adb245d3ec97ec07eeb202ca421e9640e9a80f49050c2"
 },
 {
  "ordinal": 30,
  "filename": "202610230002_ingredients_and_composition_costs.sql",
  "sha256": "86fd19952b8e65341957126f53ec64e327dd8f4ed3de54b2d9a3b9a9e3baaffb"
 },
 {
  "ordinal": 31,
  "filename": "202610240001_shift_closing_details.sql",
  "sha256": "d3204ba0e41d297710ff1e4a05ea5048c703dbe07b9b266b66a6c7aa7a859759"
 },
 {
  "ordinal": 32,
  "filename": "202610260001_optional_depot.sql",
  "sha256": "f221d19fcff7ac881cdbeefc3d3546e625c464872038afb8b69d5491e90b1f5a"
 },
 {
  "ordinal": 33,
  "filename": "202610260002_create_composite_product.sql",
  "sha256": "2e23fbafc73e0b697b607cae3b0587c9a709f13e4882b3a8ce244530eabb60a4"
 },
 {
  "ordinal": 34,
  "filename": "202610260003_billing_fields.sql",
  "sha256": "2a42b0a16de6707616bf9ca85fc249a83f55ee6b5976299b51197573391e6cd3"
 }
]
$retail_manual_manifest$::jsonb;
-- END PINNED MANIFEST

 entry record; fn record; fn_id oid; conflict text;
 billing_signature text:='public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text)';
 billing_body_hash text:='98ebc67d14a71d94d53845e547b08a58';
begin
 perform pg_catalog.set_config('lock_timeout','10s',true);
 perform pg_catalog.set_config('search_path','pg_catalog,public',true);
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 if to_regnamespace('retail_private') is null or exists(
  select 1 from unnest(array['retail_stores','retail_members','retail_categories','retail_registers',
   'retail_products','retail_shifts','retail_sales','retail_movements','retail_invitations']) t(name)
  where to_regclass('public.'||t.name) is null
 ) then
  raise exception 'No es la instalación retail esperada. Detener y revisar el proyecto; no se adoptó historial';
 end if;
 create table if not exists retail_private.schema_migrations (
  filename text primary key,
  sha256 text not null check(length(sha256)=64),
  origin text not null check(origin in ('schema','adopted')),
  registered_at timestamptz not null default now()
 );
 revoke all on retail_private.schema_migrations from public,anon,authenticated;

 if (select count(*) from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text))<>34 or
  not exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) where ordinal=30 and filename='202610230002_ingredients_and_composition_costs.sql') or
  not exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) where ordinal=34 and filename='202610260003_billing_fields.sql') then
  raise exception 'Manifiesto de recuperación incompleto. Regenerar con la opción explícita documentada';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) using(filename)
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then
  raise exception 'Historial diferente o posterior a esta recuperación: %. No se sobrescribió. Usar schema si ya se concilió; de lo contrario, revisar el diagnóstico',conflict;
 end if;
 if exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) join retail_private.schema_migrations h using(filename)
  where exists(select 1 from jsonb_to_recordset(manifest) previous(ordinal integer,filename text,sha256 text) where previous.ordinal<m.ordinal
   and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=previous.filename))) then
  raise exception 'El historial existente tiene huecos. No se completó automáticamente; revisar el diagnóstico';
 end if;
 if (select count(*) from retail_private.schema_migrations)=34 then
  raise notice 'Las 34 migraciones ya están registradas con sus checksums. No se modificó el historial. Continuar con schema.sql';
  return;
 end if;

 -- Reject drift since the diagnostic: never adopt the absent tree/deletion.
 if exists(select 1 from pg_attribute where attrelid=to_regclass('public.retail_price_lists')
  and attname in ('base_kind','parent_id','pricing_rules','revision','deleted_at','deleted_by') and attnum>0 and not attisdropped)
  or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where (n.nspname='public' and p.proname in ('retail_save_price_list_tree','retail_save_price_override','retail_delete_price_list'))
    or (n.nspname='retail_private' and p.proname in ('validate_price_tree','product_list_price'))) then
  raise exception 'Las listas cambiaron respecto al diagnóstico. No se adoptó nada: obtener diagnóstico actualizado';
 end if;

 -- 006 removes the date overload and installs a text overload. It may have
 -- been applied manually after the diagnostic. Require exactly one known body;
 -- do not roll it back, skip validation, or introduce an out-of-order history row.
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='retail_update_sale_billing')<>1 then
  raise exception 'Facturación sin función o con sobrecargas inesperadas. Ejecutar check_manual_schema_history.sql y compartir el resultado; no se adoptó historial';
 end if;
 if to_regprocedure(billing_signature) is null then
  billing_signature:='public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text)';
  billing_body_hash:='88a101fcd271dd6639f6c6e3e7dc98e0';
 end if;

 -- Exact source-body hashes (LF normalized), not mere function-name presence.
 for entry in select * from (values
  ('retail_private.cash_denominations_total(jsonb)','5abdfe06ac2af1c96abd1ab2da55bbe7',false,false,'numeric'),
  ('retail_private.snapshot_shift_closing()','a3328b4f836fc2a5323b1cc22ab52dfe',true,false,'trigger'),
  ('public.retail_close_shift(uuid,numeric,jsonb)','7896c4a23aeba3456751f5088fe9afa7',true,true,'numeric'),
  ('public.retail_shift_ticket_count(uuid)','7646d9b6365237d069fd1c499a9686ca',true,true,'integer'),
  ('public.retail_sync_operation(jsonb)','552f9ea1681a8f36707d7a2a48eab612',true,true,'jsonb'),
  ('retail_private.guard_depot_inventory()','f972110bcfb59579332a50cdbb350a6a',true,false,'trigger'),
  ('retail_private.guard_depot_setting()','a0ff2793e6de0d9a06bcca8bf49281da',true,false,'trigger'),
  ('public.retail_set_depot(uuid,boolean)','2f32037f514a373a405d1eaefbae537c',true,true,'void'),
  ('public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text)','3e44652f7200379c527e39581f3cebf6',true,true,'uuid'),
  ('public.retail_create_composite_product(uuid,uuid,jsonb)','e0b520b78d301e2180f6a2a7a164df99',true,true,'uuid'),
  ('retail_private.initialize_sale_billing()','a3647a204a4c7978e5030674b4033379',true,false,'trigger'),
  ('public.retail_set_billing_settings(uuid,text,text,text,integer,text,date,boolean)','39080491cc05da99d70ad670e4e98599',true,true,'void'),
  (billing_signature,billing_body_hash,true,true,'void'),
  -- Baseline compatibility: these bodies also match the reported installation.
  ('public.retail_close_shift(uuid,numeric)','9764106b4f05903166b47b4406ede81e',true,true,'numeric'),
  ('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)','6729f5fbb7b1a54f12024980627d72cd',true,true,'uuid')
 ) expected(signature,body_hash,definer,authenticated_execute,result_type) loop
  fn_id:=to_regprocedure(entry.signature);
  if fn_id is null then raise exception 'Falta %. No se adoptó historial',entry.signature; end if;
  select p.prosrc,p.prosecdef,p.proconfig,p.prorettype,p.proacl,p.proowner,l.lanname into fn
   from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=fn_id;
  if md5(replace(fn.prosrc,E'\r',''))<>entry.body_hash or fn.prosecdef<>entry.definer
   or fn.proconfig is distinct from array['search_path=""']::text[] or fn.lanname<>'plpgsql'
   or format_type(fn.prorettype,null)<>entry.result_type
   or has_function_privilege('authenticated',fn_id,'EXECUTE')<>entry.authenticated_execute
   or has_function_privilege('anon',fn_id,'EXECUTE')
   or exists(select 1 from aclexplode(coalesce(fn.proacl,acldefault('f',fn.proowner))) acl where acl.grantee=0 and acl.privilege_type='EXECUTE') then
   raise exception 'Definición o permisos distintos para %. Detener y actualizar diagnóstico; no se adoptó historial',entry.signature;
  end if;
 end loop;
 if billing_signature='public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text)' then
  raise notice 'Reconocida la firma text y el cuerpo exacto de facturación 006. Se adopta solo hasta la 003; schema ejecutará 004/005 y volverá a instalar 006 en orden, sin modificar ventas';
 end if;

 -- Verify every added column, including both depot tables. No retail rows read.
 for entry in select * from (values
  ('retail_shifts','closing_denominations','jsonb',false),('retail_shifts','ticket_count','integer',false),
  ('retail_stores','depot_enabled','boolean',true),
  ('retail_depot_balances','product_id','uuid',true),('retail_depot_balances','store_id','uuid',true),('retail_depot_balances','quantity','integer',true),
  ('retail_depot_movements','id','uuid',true),('retail_depot_movements','store_id','uuid',true),
  ('retail_depot_movements','product_id','uuid',true),('retail_depot_movements','product_name','text',true),
  ('retail_depot_movements','action','text',true),('retail_depot_movements','quantity','integer',true),
  ('retail_depot_movements','total_after','integer',true),('retail_depot_movements','depot_after','integer',true),
  ('retail_depot_movements','actor_id','uuid',true),('retail_depot_movements','actor_email','text',false),
  ('retail_depot_movements','created_at','timestamp with time zone',true),('retail_depot_movements','payload','jsonb',true),
  ('retail_stores','cuit','text',false),('retail_stores','razon_social','text',false),('retail_stores','condicion_iva','text',false),
  ('retail_stores','punto_venta_afip','integer',false),('retail_stores','iibb','text',false),
  ('retail_stores','inicio_actividades','date',false),('retail_stores','billing_enabled','boolean',true),
  ('retail_sales','cbte_tipo','smallint',false),('retail_sales','cbte_nro','bigint',false),('retail_sales','cae','text',false),
  ('retail_sales','cae_vto','date',false),('retail_sales','billing_status','text',true),
  ('retail_sales','billing_error','text',false),('retail_sales','billing_attempts','smallint',true)
 ) expected(table_name,column_name,type_name,not_null) loop
  if not exists(select 1 from pg_attribute a where a.attrelid=to_regclass('public.'||entry.table_name)
   and a.attname=entry.column_name and a.attnum>0 and not a.attisdropped
   and format_type(a.atttypid,a.atttypmod)=entry.type_name and a.attnotnull=entry.not_null) then
   raise exception 'Columna incompatible: %.%. No se adoptó historial',entry.table_name,entry.column_name;
  end if;
 end loop;
 for entry in select * from (values
  ('retail_stores','depot_enabled','false'),('retail_stores','billing_enabled','false'),
  ('retail_sales','billing_status',quote_literal('none')||'::text'),('retail_sales','billing_attempts','0'),
  ('retail_depot_movements','created_at','now()')
 ) expected(table_name,column_name,default_value) loop
  if not exists(select 1 from pg_attribute a join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where a.attrelid=to_regclass('public.'||entry.table_name) and a.attname=entry.column_name
   and pg_get_expr(d.adbin,d.adrelid)=entry.default_value) then
   raise exception 'Predeterminado incompatible: %.%. No se adoptó historial',entry.table_name,entry.column_name;
  end if;
 end loop;

 for entry in select * from (values
  ('retail_shifts','retail_snapshot_shift_closing','CREATE TRIGGER retail_snapshot_shift_closing BEFORE UPDATE OF closed_at, counted_cash, closing_denominations, ticket_count ON public.retail_shifts FOR EACH ROW EXECUTE FUNCTION retail_private.snapshot_shift_closing()'),
  ('retail_products','retail_guard_depot_inventory','CREATE TRIGGER retail_guard_depot_inventory BEFORE INSERT OR UPDATE OF stock, active, store_id ON public.retail_products FOR EACH ROW EXECUTE FUNCTION retail_private.guard_depot_inventory()'),
  ('retail_stores','retail_guard_depot_setting','CREATE TRIGGER retail_guard_depot_setting BEFORE UPDATE OF depot_enabled ON public.retail_stores FOR EACH ROW EXECUTE FUNCTION retail_private.guard_depot_setting()'),
  ('retail_sales','retail_initialize_sale_billing','CREATE TRIGGER retail_initialize_sale_billing BEFORE INSERT ON public.retail_sales FOR EACH ROW EXECUTE FUNCTION retail_private.initialize_sale_billing()')
 ) expected(table_name,trigger_name,definition) loop
  if not exists(select 1 from pg_trigger t where t.tgrelid=to_regclass('public.'||entry.table_name)
   and t.tgname=entry.trigger_name and t.tgenabled='O' and not t.tgisinternal and pg_get_triggerdef(t.oid)=entry.definition) then
   raise exception 'Trigger incompatible o deshabilitado: %. No se adoptó historial',entry.trigger_name;
  end if;
 end loop;

 for entry in select * from (values
  ('retail_shifts','retail_shifts_ticket_count_check'),
  ('retail_depot_balances','retail_depot_balances_pkey'),('retail_depot_balances','retail_depot_balances_product_id_fkey'),
  ('retail_depot_balances','retail_depot_balances_store_id_fkey'),('retail_depot_balances','retail_depot_balances_store_id_product_id_fkey'),
  ('retail_depot_balances','retail_depot_balances_quantity_check'),
  ('retail_depot_movements','retail_depot_movements_pkey'),('retail_depot_movements','retail_depot_movements_product_id_fkey'),
  ('retail_depot_movements','retail_depot_movements_store_id_fkey'),('retail_depot_movements','retail_depot_movements_store_id_product_id_fkey'),
  ('retail_depot_movements','retail_depot_movements_actor_id_fkey'),('retail_depot_movements','retail_depot_movements_action_check'),
  ('retail_depot_movements','retail_depot_movements_quantity_check'),
  ('retail_stores','retail_stores_condicion_iva_check'),('retail_stores','retail_stores_punto_venta_afip_check'),
  ('retail_stores','retail_stores_billing_enabled_check'),('retail_sales','retail_sales_billing_status_check'),
  ('retail_sales','retail_sales_billing_attempts_check')
 ) expected(table_name,constraint_name) loop
  if not exists(select 1 from pg_constraint c where c.conrelid=to_regclass('public.'||entry.table_name)
   and c.conname=entry.constraint_name and c.convalidated) then
   raise exception 'Restricción ausente o no validada: %. No se adoptó historial',entry.constraint_name;
  end if;
 end loop;
 for entry in select * from (values
  ('retail_depot_balances','retail_depot_balances_store'),('retail_depot_movements','retail_depot_movements_store'),
  ('retail_sales','retail_sales_billing_pending')
 ) expected(table_name,index_name) loop
  if not exists(select 1 from pg_index i where i.indrelid=to_regclass('public.'||entry.table_name)
   and i.indexrelid=to_regclass('public.'||entry.index_name) and i.indisvalid and i.indisready) then
   raise exception 'Índice ausente o inválido: %. No se adoptó historial',entry.index_name;
  end if;
 end loop;

 for entry in select * from (values
  ('retail_depot_balances','depot_balance_read','(retail_private.role_for(store_id) IS NOT NULL)'),
  ('retail_depot_movements','depot_movement_read','(retail_private.has_permission(store_id, ''manage_products''::text) OR retail_private.has_permission(store_id, ''replenish_stock''::text) OR retail_private.has_permission(store_id, ''manage_store''::text))')
 ) expected(table_name,policy_name,read_expression) loop
  if not exists(select 1 from pg_class c where c.oid=to_regclass('public.'||entry.table_name) and c.relrowsecurity)
   or (select count(*) from pg_policy p where p.polrelid=to_regclass('public.'||entry.table_name))<>1
   or not exists(select 1 from pg_policy p where p.polrelid=to_regclass('public.'||entry.table_name)
    and p.polname=entry.policy_name and p.polcmd='r' and p.polpermissive and p.polwithcheck is null
    and p.polroles=array[(select oid from pg_roles where rolname='authenticated')]
    and pg_get_expr(p.polqual,p.polrelid)=entry.read_expression)
   or not has_table_privilege('authenticated','public.'||entry.table_name,'SELECT')
   or has_table_privilege('anon','public.'||entry.table_name,'SELECT')
   or has_table_privilege('anon','public.'||entry.table_name,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('authenticated','public.'||entry.table_name,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
   raise exception 'RLS o permisos incompatibles: %. No se adoptó historial',entry.table_name;
  end if;
 end loop;

 insert into retail_private.schema_migrations(filename,sha256,origin)
  select m.filename,m.sha256,'adopted' from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
   where not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
   order by m.ordinal;
 raise notice 'Historial conciliado hasta 202610260003_billing_fields.sql. No se ejecutaron migraciones ni se modificaron datos del comercio. Continuar con schema.sql completo';
end $reconcile$;
select filename,origin,registered_at from retail_private.schema_migrations order by filename;
