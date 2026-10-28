-- Recuperación específica de 202610270005: tabla ya creada sin su historial.
-- Ejecutar COMPLETO solo en AdministradorKiosco. No forma parte de schema.
-- No borra ni modifica formatos, proveedores, productos ni migraciones previas.
-- Exige historial válido hasta 202610270004 y objetos EXACTOS de la fuente.
-- La tabla temporal de referencia nace y se consulta dentro de este único DO;
-- no contiene datos del comercio ni depende de una consulta anterior.
-- Preparado localmente; no ejecutado contra Supabase.
do $retail_format_recovery$
declare
-- BEGIN FORMAT RECOVERY METADATA: generated with --supplier-format-recovery.
 manifest jsonb := $format_manifest$
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
 },
 {
  "ordinal": 35,
  "filename": "202610260004_price_list_tree.sql",
  "sha256": "bb77060967eec30f15a7befb20989890ac312c90f76e002656fa6dfada36bf36"
 },
 {
  "ordinal": 36,
  "filename": "202610260005_delete_price_lists.sql",
  "sha256": "540fb2b7146a1f68e89f462f43305d58798953d156be4e62e6944f0edccd2a69"
 },
 {
  "ordinal": 37,
  "filename": "202610260006_billing_update_robustness.sql",
  "sha256": "97469041ab94b975ce569c26fb60b2aba78d9f8a94c4c13a5567c47f14c576f2"
 },
 {
  "ordinal": 38,
  "filename": "202610270001_store_billing_credentials.sql",
  "sha256": "5c5d202e9b94464428e5417696fbc782491a023ad726f772b5693436ba16b9cb"
 },
 {
  "ordinal": 39,
  "filename": "202610270002_primary_product_markup.sql",
  "sha256": "d9e8f398d415af14d4bc1235f3d2023f755cc62ad7879aa3b257794f756e6a02"
 },
 {
  "ordinal": 40,
  "filename": "202610270003_suppliers.sql",
  "sha256": "9f007483d72681a7d849f29714756c7fbfb83e6146d35d4ba80d9fbd78518f05"
 },
 {
  "ordinal": 41,
  "filename": "202610270004_cost_price_lists.sql",
  "sha256": "abe5683734a54251ad3e49ee9235ee1b9a9607081b9a6b04927e902cdfe56d0b"
 },
 {
  "ordinal": 42,
  "filename": "202610270005_supplier_invoice_formats.sql",
  "sha256": "62535c0e844930c8af0840aa80c582f265c0a8919b8cdabb4f83cb7cf0a41509"
 },
 {
  "ordinal": 43,
  "filename": "202610280001_supplier_alias_usage_repair.sql",
  "sha256": "e6eee2d43a1a62cc232ada97415baa8b591f83572848c8877f26444b82db583a"
 },
 {
  "ordinal": 44,
  "filename": "202610280002_location_funds.sql",
  "sha256": "f22cae1d60cb383ca0f76216dc20e303370a2018266199f8650aa7beb77f8ada"
 },
 {
  "ordinal": 45,
  "filename": "202610280003_location_inventory.sql",
  "sha256": "056054048e34a355f3315ed545e01af797fb2a1eb7a9026a79363bf4aa8cfaea"
 },
 {
  "ordinal": 46,
  "filename": "202610280004_permanent_product_deletion.sql",
  "sha256": "c066941e7a7c08d3b00196d0eecce2b777cdddf4b805bab1197644a71e269368"
 }
]
$format_manifest$::jsonb;
 expected_functions jsonb := $format_functions$
[
 {
  "signature": "public.retail_save_supplier_invoice_format(uuid,text,jsonb,integer,boolean)",
  "arg_names": [
   "p_store",
   "p_supplier",
   "p_format",
   "p_samples",
   "p_local_read"
  ],
  "defaults": 1,
  "returns_table": true,
  "body_hash": "fa5377af3ffd5b9b0c35540ce7c27a43"
 },
 {
  "signature": "public.retail_delete_supplier_invoice_format(uuid,text)",
  "arg_names": [
   "p_store",
   "p_supplier"
  ],
  "defaults": 0,
  "returns_table": false,
  "body_hash": "7ad28a413493df4e4c9939c1df6c75a0"
 }
]
$format_functions$::jsonb;
 expected_table_sql text := $format_reference$
create temporary table retail_expected_invoice_format (
 store_id uuid not null ,
 supplier_key text not null check(supplier_key <> '' and length(supplier_key) <= 120),
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 format jsonb not null check(jsonb_typeof(format) = 'object' and (format->>'version') = '1' and pg_column_size(format) <= 1000),
 samples integer not null default 0 check(samples >= 0),
 local_reads integer not null default 0 check(local_reads >= 0),
 updated_at timestamptz not null default now(),
 primary key(store_id, supplier_key)
) on commit drop;
$format_reference$;
-- END FORMAT RECOVERY METADATA
 target_name constant text := '202610270005_supplier_invoice_formats.sql';
 target_order constant integer := 42;
 target_hash text; conflict text; missing text; table_id oid; reference_id oid;
 table_owner oid; table_type oid; entry record; fn record; fn_id oid; privilege text;
begin
 perform set_config('lock_timeout','10s',true);
 perform set_config('search_path','pg_catalog,public',true);
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 select m.sha256 into target_hash from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.filename=target_name and m.ordinal=target_order;
 if target_hash is null or jsonb_array_length(expected_functions)<>2 or expected_table_sql='' then
  raise exception 'Falta generar los metadatos de recuperación. No se modificó nada';
 end if;
 if to_regclass('retail_private.schema_migrations') is null then
  raise exception 'Falta el historial. Usá primero el diagnóstico y la conciliación documentados; no se adoptó la 005';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) using(filename)
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then raise exception 'Historial distinto al repositorio: %. No se modificó nada',conflict; end if;
 if exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  join retail_private.schema_migrations h using(filename)
  where exists(select 1 from jsonb_to_recordset(manifest) prior(ordinal integer,filename text,sha256 text)
   where prior.ordinal<m.ordinal and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=prior.filename))) then
  raise exception 'El historial tiene huecos. Revisar diagnóstico; no se adoptó la 005';
 end if;
 if exists(select 1 from retail_private.schema_migrations where filename=target_name) then
  raise notice '202610270005 ya está registrada con el mismo checksum. No se repitió ni se certificaron sus objetos';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<target_order and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar %. Aplicá los paquetes anteriores en orden antes de conciliar la 005',missing
   using hint='No repetir la fuente de migrations ni insertar historial a mano. Ver SUPABASE_SETUP.md.';
 end if;
 table_id:=to_regclass('public.retail_supplier_invoice_formats');
 if table_id is null then raise exception 'La tabla no existe. Usá el paquete normal 202610270005; no hace falta conciliar'; end if;
 lock table public.retail_supplier_invoice_formats in share mode;
 select relowner,reltype into table_owner,table_type from pg_class
  where oid=table_id and relkind='r' and relpersistence='p' and relrowsecurity and not relforcerowsecurity and not relispartition;
 if table_owner is null then raise exception 'Tipo de tabla o RLS distinto. No se adoptó la 005'; end if;
 if exists(select 1 from pg_inherits where inhrelid=table_id or inhparent=table_id)
  or exists(select 1 from pg_trigger where tgrelid=table_id and not tgisinternal)
  or exists(select 1 from pg_rewrite where ev_class=table_id) then
  raise exception 'Hay herencia, triggers o reglas adicionales. No se adoptó la 005';
 end if;

 -- Reference DDL comes from the unchanged local source. No permanent FK is
 -- created from a temporary table: that FK is verified separately below.
 execute expected_table_sql;
 reference_id:=to_regclass('pg_temp.retail_expected_invoice_format');
 if exists(
  with columns as (
   select a.attrelid,a.attnum,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,
    pg_get_expr(d.adbin,d.adrelid) as default_value
   from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where a.attrelid in(table_id,reference_id) and a.attnum>0 and not a.attisdropped
  ), actual as (select attnum,attname,atttypid,atttypmod,attnotnull,attidentity,attgenerated,default_value from columns where attrelid=table_id),
  expected as (select attnum,attname,atttypid,atttypmod,attnotnull,attidentity,attgenerated,default_value from columns where attrelid=reference_id)
  (select * from actual except select * from expected) union all (select * from expected except select * from actual)
 ) then raise exception 'Las columnas, tipos o valores predeterminados no coinciden. No se adoptó la 005'; end if;
 if exists(
  with constraints as (
   select conrelid,contype,condeferrable,condeferred,convalidated,pg_get_constraintdef(oid) as definition
   from pg_constraint where conrelid in(table_id,reference_id) and contype<>'f'
  ), actual as (select contype,condeferrable,condeferred,convalidated,definition from constraints where conrelid=table_id),
  expected as (select contype,condeferrable,condeferred,convalidated,definition from constraints where conrelid=reference_id)
  (select * from actual except all select * from expected) union all (select * from expected except all select * from actual)
 ) then raise exception 'Las restricciones de formatos no coinciden. No se adoptó la 005'; end if;
 if (select count(*) from pg_constraint where conrelid=table_id and contype='f')<>1
  or not exists(select 1 from pg_constraint c where c.conrelid=table_id and c.contype='f'
   and c.confrelid=to_regclass('public.retail_stores') and c.convalidated and not c.condeferrable
   and c.confupdtype='a' and c.confdeltype='a' and c.confmatchtype='s'
   and c.conkey=array[(select attnum from pg_attribute where attrelid=table_id and attname='store_id')]::smallint[]
   and c.confkey=array[(select attnum from pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[])
  or (select count(*) from pg_index where indrelid=table_id)<>1
  or not exists(select 1 from pg_index where indrelid=table_id and indisprimary and indisunique and indisvalid and indisready) then
  raise exception 'Clave de comercio o índices distintos. No se adoptó la 005';
 end if;
 if (select count(*) from pg_policy where polrelid=table_id)<>1
  or not exists(select 1 from pg_policy where polrelid=table_id and polname='member_read' and polcmd='r' and polpermissive
   and polroles=array[(select oid from pg_roles where rolname='authenticated')]
   and polwithcheck is null
   and regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g')='retail_private.role_forstore_idISNOTNULL') then
  raise exception 'Política RLS distinta de member_read. No se adoptó la 005';
 end if;
 foreach privilege in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
  if has_table_privilege('anon',table_id,privilege)
   or has_table_privilege('authenticated',table_id,privilege) is distinct from (privilege='SELECT') then
   raise exception 'Permiso de tabla inesperado: %. No se adoptó la 005',privilege;
  end if;
 end loop;
 if has_any_column_privilege('anon',table_id,'SELECT,INSERT,UPDATE,REFERENCES')
  or has_any_column_privilege('authenticated',table_id,'INSERT,UPDATE,REFERENCES')
  or exists(select 1 from aclexplode((select coalesce(relacl,acldefault('r',relowner)) from pg_class where oid=table_id)) acl
   where acl.grantee=0 or (acl.grantee<>table_owner and acl.grantee not in(select oid from pg_roles where rolname in('authenticated','service_role')))
    or (acl.grantee=(select oid from pg_roles where rolname='authenticated') and acl.is_grantable)) then
  raise exception 'Permisos de columnas o roles adicionales. No se adoptó la 005';
 end if;

 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  and p.proname in('retail_save_supplier_invoice_format','retail_delete_supplier_invoice_format'))<>2 then
  raise exception 'Funciones ausentes o con sobrecargas inesperadas. No se adoptó la 005';
 end if;
 for entry in select * from jsonb_to_recordset(expected_functions) f(signature text,body_hash text,arg_names text[],defaults integer,returns_table boolean) loop
  fn_id:=to_regprocedure(entry.signature);
  if fn_id is null then raise exception 'Falta %. No se adoptó la 005',entry.signature; end if;
  select p.*,l.lanname into fn from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=fn_id;
  if md5(replace(fn.prosrc,chr(13),''))<>entry.body_hash or not fn.prosecdef or fn.lanname<>'plpgsql'
   or fn.proconfig is distinct from array['search_path=""']::text[] or fn.proowner<>table_owner
   or fn.proargnames is distinct from entry.arg_names or fn.pronargdefaults<>entry.defaults
   or pg_get_expr(fn.proargdefaults,0) is distinct from (case when entry.defaults=1 then 'false' else null end)
   or fn.prorettype<>(case when entry.returns_table then table_type else 'void'::regtype::oid end)
   or fn.proretset or fn.proisstrict or fn.proleakproof or fn.provolatile<>'v' or fn.proparallel<>'u'
   or not has_function_privilege('authenticated',fn_id,'EXECUTE') or has_function_privilege('anon',fn_id,'EXECUTE')
   or exists(select 1 from aclexplode(coalesce(fn.proacl,acldefault('f',fn.proowner))) acl
    where acl.grantee=0 or (acl.grantee<>fn.proowner and acl.grantee not in(select oid from pg_roles where rolname in('authenticated','service_role')))
     or (acl.grantee=(select oid from pg_roles where rolname='authenticated') and acl.is_grantable)) then
   raise exception 'Definición o permisos distintos para %. No se adoptó la 005',entry.signature;
  end if;
 end loop;
 insert into retail_private.schema_migrations(filename,sha256,origin) values(target_name,target_hash,'adopted');
 raise notice '202610270005 conciliada tras validar objetos. Los formatos guardados no se modificaron';
end;
$retail_format_recovery$;
select filename,origin,registered_at from retail_private.schema_migrations where filename='202610270005_supplier_invoice_formats.sql';
