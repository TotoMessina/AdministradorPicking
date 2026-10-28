-- AdministradorKiosco: actualización individual 39/46.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202610270002_primary_product_markup.sql; SHA-256 d9e8f398d415af14d4bc1235f3d2023f755cc62ad7879aa3b257794f756e6a02.
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
  "sha256": "baa181aa8cc76f1bc973e914a77fe568f3f30228979d682a67ac3571ce3cc14d"
 },
 {
  "ordinal": 46,
  "filename": "202610280004_permanent_product_deletion.sql",
  "sha256": "c066941e7a7c08d3b00196d0eecce2b777cdddf4b805bab1197644a71e269368"
 }
]
$retail_schema_manifest_json$::jsonb;
 conflict text; missing text;
begin
 perform set_config('lock_timeout','10s',true);
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 if to_regclass('retail_private.schema_migrations') is null then
  raise exception 'Falta el historial de instalación. No se aplicó 202610270002_primary_product_markup.sql'
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
 if exists(select 1 from retail_private.schema_migrations where filename='202610270002_primary_product_markup.sql') then
  raise notice '202610270002_primary_product_markup.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<39 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202610270002_primary_product_markup.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando 202610270002_primary_product_markup.sql';
  execute replace($retail_source_d9e8f398d415af14$
alter table public.retail_products add column sale_markup numeric(7,2)
 check(sale_markup is null or sale_markup between -99.99 and 10000);
grant update(sale_markup) on public.retail_products to authenticated;
alter table public.retail_price_lists add column is_primary boolean not null default false;
create unique index retail_one_primary_price_list on public.retail_price_lists(store_id) where is_primary;

create function retail_private.initialize_primary_price_list() returns trigger
language plpgsql security definer set search_path='' as $$
declare label text:='Principal'; suffix integer:=1;
begin
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.id::text,0));
 if exists(select 1 from public.retail_price_lists where store_id=new.id and is_primary) then return new; end if;
 while exists(select 1 from public.retail_price_lists where store_id=new.id and name=label and deleted_at is null) loop
  suffix:=suffix+1; label:='Principal '||suffix;
 end loop;
 insert into public.retail_price_lists(store_id,name,adjustment,active,base_kind,pricing_rules,is_primary)
  values(new.id,label,0,true,'catalog','[]'::jsonb,true);
 return new;
end $$;
revoke all on function retail_private.initialize_primary_price_list() from public,anon,authenticated;
create trigger retail_initialize_primary_price_list after insert on public.retail_stores
 for each row execute function retail_private.initialize_primary_price_list();

-- The existing tree validator still checks cycles, branch rules and 12 levels.
-- Do not flatten or delete a deep tree to force this migration to pass.
do $backfill$
declare shop record; primary_id uuid; label text; suffix integer;
begin
 for shop in select id from public.retail_stores order by id loop
  perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||shop.id::text,0));
  label:='Principal'; suffix:=1;
  while exists(select 1 from public.retail_price_lists where store_id=shop.id and name=label and deleted_at is null) loop
   suffix:=suffix+1; label:='Principal '||suffix;
  end loop;
  insert into public.retail_price_lists(store_id,name,adjustment,active,base_kind,pricing_rules,is_primary)
   values(shop.id,label,0,true,'catalog','[]'::jsonb,true) returning id into primary_id;
  update public.retail_price_lists set base_kind='list',parent_id=primary_id
   where store_id=shop.id and not is_primary and deleted_at is null and base_kind in ('cost','catalog');
 end loop;
end $backfill$;

create function retail_private.guard_primary_price_list() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.is_primary then raise exception 'La lista principal se conserva. Editá el margen de los productos'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and new.is_primary is distinct from old.is_primary then raise exception 'No se puede cambiar la identidad de la lista principal'; end if;
 if new.is_primary then
  if not new.active or new.deleted_at is not null or new.branch_id is not null or new.base_kind<>'catalog'
   or new.parent_id is not null or new.adjustment<>0 or new.pricing_rules<>'[]'::jsonb then
   raise exception 'La principal usa el costo y porcentaje de cada producto, está activa para todo el comercio y no puede eliminarse';
  end if;
 elsif new.deleted_at is null and (new.base_kind<>'list' or new.parent_id is null) then
  raise exception 'Elegí la lista principal o una de sus derivadas como origen';
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_primary_price_list() from public,anon,authenticated;
create trigger retail_primary_price_list before insert or update or delete on public.retail_price_lists
 for each row execute function retail_private.guard_primary_price_list();

create function retail_private.guard_primary_price_override() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.retail_price_lists where id=new.list_id and store_id=new.store_id and is_primary) then
  raise exception 'Editá el costo y margen del producto para cambiar el precio principal. Los precios fijos se usan en las derivadas';
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_primary_price_override() from public,anon,authenticated;
create trigger retail_primary_price_override before insert or update on public.retail_price_overrides
 for each row execute function retail_private.guard_primary_price_override();

create function retail_private.derive_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare calculated numeric;
begin
 if (tg_op='INSERT' and new.sale_markup is not null) or
  (tg_op='UPDATE' and new.sale_markup is distinct from old.sale_markup) then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if not new.sellable then new.sale_markup:=null; return new; end if;
 if new.sale_markup is null then return new; end if;
 if new.sale_markup not between -99.99 and 10000 then raise exception 'Revisá el porcentaje sobre costo'; end if;
 if new.cost>0 then calculated:=greatest(0.01,round(new.cost*(1+new.sale_markup/100),2)); end if;
 -- A deliberate manual price edit keeps existing price-only/bulk/import flows.
 -- A cost-only change, or a form sending the calculated price, keeps its percent.
 if tg_op='UPDATE' and new.sale_markup is not distinct from old.sale_markup and new.price is distinct from old.price
  and (calculated is null or new.price<>calculated) then
  new.sale_markup:=null; return new;
 end if;
 if calculated is not null then
  if calculated>9999999999 then raise exception 'El precio calculado supera el límite permitido. Revisá costo y porcentaje'; end if;
  new.price:=calculated;
 end if;
 return new;
end $$;
revoke all on function retail_private.derive_product_markup_price() from public,anon,authenticated;
-- After component-derived cost, before the existing low-margin classifier.
create trigger retail_zy_product_markup before insert or update on public.retail_products
 for each row execute function retail_private.derive_product_markup_price();

create function retail_private.check_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.retail_products;
begin
 select * into p from public.retail_products where id=new.id;
 if found and p.sellable and p.sale_markup is not null then
  if p.cost<=0 or p.price<>greatest(0.01,round(p.cost*(1+p.sale_markup/100),2)) then
   raise exception 'Cargá un costo mayor a cero para calcular el precio principal de %',p.name;
  end if;
 end if;
 return null;
end $$;
revoke all on function retail_private.check_product_markup_price() from public,anon,authenticated;
-- Recipes are inserted and configured in one transaction; validate final cost.
create constraint trigger retail_check_product_markup after insert or update on public.retail_products
 deferrable initially deferred for each row execute function retail_private.check_product_markup_price();

-- Extend the existing atomic recipe RPC, preserving its signature, permissions,
-- stock/composition rules and request-id replay checks. No standalone product survives.
do $composite$
declare definition text;
begin
 if (select md5(replace(prosrc,E'\r','')) from pg_catalog.pg_proc
  where oid='public.retail_create_composite_product(uuid,uuid,jsonb)'::regprocedure)<>'e0b520b78d301e2180f6a2a7a164df99' then
  raise exception 'La creación de combos cambió. Revisar la definición antes de aplicar el porcentaje; no se omitió la validación';
 end if;
 definition:=replace(pg_get_functiondef('public.retail_create_composite_product(uuid,uuid,jsonb)'::regprocedure),E'\r','');
 definition:=replace(definition,'min_stock,emoji,sellable)','min_stock,emoji,sellable,sale_markup)');
 definition:=replace(definition,'0,0,4,''📦'',true);','0,0,4,''📦'',true,(p_data->>''sale_markup'')::numeric);');
 if position('min_stock,emoji,sellable,sale_markup)' in definition)=0
  or position('(p_data->>''sale_markup'')::numeric' in definition)=0 then raise exception 'No se encontró el alta atómica esperada para combos'; end if;
 execute definition;
end $composite$;

create or replace function public.retail_active_price_list_for_branch(p_store uuid,p_branch uuid)
returns uuid language plpgsql stable security invoker set search_path='' as $$
declare v_list uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 select id into v_list from public.retail_price_lists where store_id=p_store and branch_id=p_branch and active and deleted_at is null;
 if v_list is null then select id into v_list from public.retail_price_lists where store_id=p_store and is_primary and active and deleted_at is null; end if;
 return v_list;
end $$;
revoke all on function public.retail_active_price_list_for_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_active_price_list_for_branch(uuid,uuid) to authenticated;

create or replace function retail_private.enforce_branch_price_rule() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_list public.retail_price_lists; v_default uuid;
begin
 if new.price_list_id is not null then
  select * into v_list from public.retail_price_lists where id=new.price_list_id and store_id=new.store_id and active and deleted_at is null for share;
  if not found or (v_list.branch_id is not null and v_list.branch_id<>new.branch_id) then raise exception 'La lista de precios no está disponible para esta sucursal'; end if;
 end if;
 if retail_private.role_for(new.store_id)='cashier' then
  v_default:=public.retail_active_price_list_for_branch(new.store_id,new.branch_id);
  -- Old prepared carts/queues may use null for catalog, which is exactly the
  -- neutral Principal price. Branch-specific derived lists remain mandatory.
  if new.price_list_id is distinct from v_default and not(new.price_list_id is null and exists(
   select 1 from public.retail_price_lists where id=v_default and store_id=new.store_id and is_primary)) then
   raise exception 'Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar';
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.enforce_branch_price_rule() from public,anon,authenticated;
notify pgrst,'reload schema';
$retail_source_d9e8f398d415af14$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610270002_primary_product_markup.sql','d9e8f398d415af14d4bc1235f3d2023f755cc62ad7879aa3b257794f756e6a02','schema');
 end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
