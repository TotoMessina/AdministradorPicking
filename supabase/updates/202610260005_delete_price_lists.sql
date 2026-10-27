-- AdministradorKiosco: actualización individual 36/39.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202610260005_delete_price_lists.sql; SHA-256 540fb2b7146a1f68e89f462f43305d58798953d156be4e62e6944f0edccd2a69.
-- Requiere historial conciliado y TODAS las migraciones anteriores registradas.
-- Ejecutar este archivo COMPLETO en el proyecto correcto, de a uno y en orden.
-- Un DO atómico: sin tablas temporales; registra solo si termina correctamente.
-- Si ya está registrado con el mismo checksum, no repite el cuerpo SQL.
-- No fue ejecutado remotamente durante su preparación.
do $retail_install$
declare
 manifest jsonb := $retail_schema_manifest_json$
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
 }
]
$retail_schema_manifest_json$::jsonb;
 conflict text; missing text;
begin
 perform set_config('lock_timeout','10s',true);
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 if to_regclass('retail_private.schema_migrations') is null then
  raise exception 'Falta el historial de instalación. No se aplicó 202610260005_delete_price_lists.sql'
   using errcode='55000',hint='Revisar SUPABASE_SETUP.md y el diagnóstico de solo lectura. Este archivo no adopta migraciones ni reemplaza una conciliación pendiente.';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) using(filename)
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then
  raise exception 'Historial distinto al paquete: %. No se modificó. Revisar versión del repositorio y diagnóstico',conflict;
 end if;
 if exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  join retail_private.schema_migrations h using(filename)
  where exists(select 1 from jsonb_to_recordset(manifest) previous(ordinal integer,filename text,sha256 text)
   where previous.ordinal<m.ordinal and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=previous.filename))) then
  raise exception 'El historial tiene huecos. No se modificó: revisar diagnóstico antes de continuar';
 end if;
 if exists(select 1 from retail_private.schema_migrations where filename='202610260005_delete_price_lists.sql') then
  raise notice '202610260005_delete_price_lists.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<36 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202610260005_delete_price_lists.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando 202610260005_delete_price_lists.sql';
  if to_regprocedure('public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)') is null then
   raise exception 'Falta una función del árbol de listas: %', 'public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
  if to_regprocedure('public.retail_save_price_override(uuid,uuid,uuid,numeric)') is null then
   raise exception 'Falta una función del árbol de listas: %', 'public.retail_save_price_override(uuid,uuid,uuid,numeric)'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
  if to_regprocedure('retail_private.product_list_price(public.retail_products,uuid,integer)') is null then
   raise exception 'Falta una función del árbol de listas: %', 'retail_private.product_list_price(public.retail_products,uuid,integer)'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
  execute replace($retail_source_540fb2b7146a1f68$
-- Soft deletion retains sale FKs, fixed prices, rules and the author of the removal.
alter table public.retail_price_lists
 add column deleted_at timestamptz,
 add column deleted_by uuid references auth.users(id),
 add constraint retail_price_list_deleted_state check((deleted_at is null)=(deleted_by is null) and (deleted_at is null or not active));
alter table public.retail_price_lists drop constraint retail_price_lists_store_id_name_key;
create unique index retail_live_price_list_name on public.retail_price_lists(store_id,name) where deleted_at is null;

drop policy member_read on public.retail_price_lists;
create policy member_read on public.retail_price_lists for select to authenticated
 using(retail_private.role_for(store_id) is not null and deleted_at is null);
drop policy member_read on public.retail_price_overrides;
create policy member_read on public.retail_price_overrides for select to authenticated
 using(retail_private.role_for(store_id) is not null and exists(
  select 1 from public.retail_price_lists l where l.id=list_id and l.store_id=retail_price_overrides.store_id and l.deleted_at is null
 ));

create or replace function retail_private.validate_price_tree() returns trigger
language plpgsql security definer set search_path='' as $$
declare rule jsonb; parent public.retail_price_lists; cursor_id uuid; visited uuid[]; depth integer:=1; child_depth integer;
begin
 if tg_op='UPDATE' and new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de una lista'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.store_id::text,0));
 if tg_op='UPDATE' and old.deleted_at is not null then raise exception 'Esta lista fue eliminada. Actualizá los datos'; end if;
 if new.deleted_at is not null then
  if tg_op<>'UPDATE' then raise exception 'No se puede crear una lista eliminada'; end if;
  if exists(select 1 from public.retail_price_lists where store_id=new.store_id and parent_id=new.id and deleted_at is null) then
   raise exception 'Cambiá primero el origen de las listas derivadas antes de eliminar esta lista';
  end if;
  new.revision:=old.revision+1; return new;
 end if;
 if jsonb_typeof(new.pricing_rules) is distinct from 'array' or jsonb_array_length(new.pricing_rules)>300 then raise exception 'La lista admite hasta 300 reglas'; end if;
 for rule in select value from jsonb_array_elements(new.pricing_rules) loop
  if coalesce(rule->>'scope','') not in ('category','brand','product') or coalesce(btrim(rule->>'target'),'')='' or
     jsonb_typeof(rule->'adjustment') is distinct from 'number' then raise exception 'Completá el destino y porcentaje de cada regla'; end if;
  if (rule->>'adjustment')::numeric<=-100 or (rule->>'adjustment')::numeric>10000 or round((rule->>'adjustment')::numeric,2)<>(rule->>'adjustment')::numeric then raise exception 'El ajuste debe estar entre -99,99 y 10.000, con hasta dos decimales'; end if;
  if rule->>'scope'='category' and not exists(select 1 from public.retail_categories where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Categoría no disponible en este comercio'; end if;
  if rule->>'scope'='product' and not exists(select 1 from public.retail_products where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Producto no disponible en este comercio'; end if;
  if rule->>'scope'='brand' and (length(rule->>'target')>200 or rule->>'target'<>lower(btrim(rule->>'target'))) then raise exception 'La marca debe estar normalizada'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(new.pricing_rules) r group by r->>'scope',r->>'target' having count(*)>1) then raise exception 'Hay reglas repetidas para el mismo destino'; end if;
 visited:=array[new.id]; cursor_id:=new.parent_id;
 while cursor_id is not null loop
  if cursor_id=any(visited) then raise exception 'Una lista no puede depender de sí misma ni de una lista derivada de ella'; end if;
  select * into parent from public.retail_price_lists where id=cursor_id and store_id=new.store_id and deleted_at is null;
  if not found then raise exception 'La lista de origen no está disponible. Elegí otra'; end if;
  if parent.branch_id is not null and parent.branch_id is distinct from new.branch_id then raise exception 'Una lista de sucursal solo puede originar listas de esa misma sucursal'; end if;
  visited:=array_append(visited,cursor_id); depth:=depth+1; cursor_id:=parent.parent_id;
  if depth>12 then raise exception 'Se permiten hasta 12 niveles de listas'; end if;
 end loop;
 if new.branch_id is not null and exists(select 1 from public.retail_price_lists where parent_id=new.id and store_id=new.store_id and deleted_at is null and branch_id is distinct from new.branch_id) then raise exception 'Primero revisá las sucursales de las listas derivadas'; end if;
 with recursive children as (
  select id,1 as level,array[new.id,id] as path from public.retail_price_lists where store_id=new.store_id and parent_id=new.id and deleted_at is null
  union all select l.id,c.level+1,c.path||l.id from children c join public.retail_price_lists l on l.parent_id=c.id and l.store_id=new.store_id where l.deleted_at is null and not l.id=any(c.path) and c.level<12
 ) select coalesce(max(level),0) into child_depth from children;
 if depth+child_depth>12 then raise exception 'Este origen dejaría más de 12 niveles de listas'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
 return new;
end $$;
revoke all on function retail_private.validate_price_tree() from public,anon,authenticated;

-- Reject writes from stale clients and deleted ancestors, including idempotent-save
-- fast paths that do not run a row trigger. Leave all price calculations intact.
do $patch$
declare signature text; anchor text; replacement text; definition text;
begin
 for signature,anchor,replacement in select * from (values
  ('public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)',
   'if previous.store_id<>p_store then raise exception ''Lista no disponible'' using errcode=''42501''; end if;',
   E'if previous.store_id<>p_store then raise exception ''Lista no disponible'' using errcode=''42501''; end if;\n  if previous.deleted_at is not null then raise exception ''Esta lista fue eliminada. Actualizá los datos''; end if;'),
  ('public.retail_save_price_override(uuid,uuid,uuid,numeric)',
   'where id=p_list and store_id=p_store)',
   'where id=p_list and store_id=p_store and deleted_at is null)'),
  ('retail_private.product_list_price(public.retail_products,uuid,integer)',
   'if not found then raise exception ''Lista de origen no disponible''; end if;',
   'if not found or list.deleted_at is not null then raise exception ''Lista de origen no disponible. Actualizá los datos''; end if;')
 ) as patches(signature,anchor,replacement)
 loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
   raise exception 'La definición de % no coincide con la versión esperada. No se aplicaron cambios; revisar instalación',signature;
  end if;
  execute replace(definition,anchor,replacement);
 end loop;
end $patch$;

create function public.retail_delete_price_list(p_store uuid,p_list uuid,p_revision bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_list public.retail_price_lists;
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para eliminar listas' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 select * into current_list from public.retail_price_lists where id=p_list and store_id=p_store for update;
 if not found then raise exception 'Lista no disponible en este comercio'; end if;
 -- A lost response can be retried without changing its original author or timestamp.
 if current_list.deleted_at is not null then return p_list; end if;
 if current_list.revision is distinct from p_revision then raise exception 'La lista cambió en otro dispositivo. Actualizá los datos y volvé a revisar antes de eliminarla'; end if;
 if exists(select 1 from public.retail_price_lists where store_id=p_store and parent_id=p_list and deleted_at is null) then
  raise exception 'Cambiá primero el origen de las listas derivadas antes de eliminar esta lista';
 end if;
 update public.retail_price_lists set active=false,deleted_at=clock_timestamp(),deleted_by=auth.uid() where id=p_list and store_id=p_store;
 return p_list;
end $$;
revoke all on function public.retail_delete_price_list(uuid,uuid,bigint) from public,anon;
grant execute on function public.retail_delete_price_list(uuid,uuid,bigint) to authenticated;

notify pgrst,'reload schema';
$retail_source_540fb2b7146a1f68$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260005_delete_price_lists.sql','540fb2b7146a1f68e89f462f43305d58798953d156be4e62e6944f0edccd2a69','schema');
 end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
