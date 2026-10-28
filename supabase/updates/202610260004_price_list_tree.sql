-- AdministradorKiosco: actualización individual 35/46.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202610260004_price_list_tree.sql; SHA-256 bb77060967eec30f15a7befb20989890ac312c90f76e002656fa6dfada36bf36.
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
  raise exception 'Falta el historial de instalación. No se aplicó 202610260004_price_list_tree.sql'
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
 if exists(select 1 from retail_private.schema_migrations where filename='202610260004_price_list_tree.sql') then
  raise notice '202610260004_price_list_tree.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<35 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202610260004_price_list_tree.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando 202610260004_price_list_tree.sql';
  execute replace($retail_source_bb77060967eec30f$
-- Legacy lists keep their catalog origin, percentages, branch and fixed prices.
-- Cost is a virtual read-only origin, not a new sellable list or a product write.
alter table public.retail_price_lists
 add column base_kind text not null default 'catalog' check(base_kind in ('cost','catalog','list')),
 add column parent_id uuid,
 add column pricing_rules jsonb not null default '[]'::jsonb,
 add column revision bigint not null default 0,
 add constraint retail_price_list_parent foreign key(store_id,parent_id) references public.retail_price_lists(store_id,id),
 add constraint retail_price_list_origin check((base_kind='list')=(parent_id is not null));
create index retail_price_list_children on public.retail_price_lists(store_id,parent_id);

create function retail_private.validate_price_tree() returns trigger
language plpgsql security definer set search_path='' as $$
declare rule jsonb; parent public.retail_price_lists; cursor_id uuid; visited uuid[]; depth integer:=1; child_depth integer;
begin
 if tg_op='UPDATE' and new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de una lista'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.store_id::text,0));
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
  select * into parent from public.retail_price_lists where id=cursor_id and store_id=new.store_id;
  if not found then raise exception 'La lista de origen no está disponible en este comercio'; end if;
  if parent.branch_id is not null and parent.branch_id is distinct from new.branch_id then raise exception 'Una lista de sucursal solo puede originar listas de esa misma sucursal'; end if;
  visited:=array_append(visited,cursor_id); depth:=depth+1; cursor_id:=parent.parent_id;
  if depth>12 then raise exception 'Se permiten hasta 12 niveles de listas'; end if;
 end loop;
 if new.branch_id is not null and exists(select 1 from public.retail_price_lists where parent_id=new.id and store_id=new.store_id and branch_id is distinct from new.branch_id) then raise exception 'Primero revisá las sucursales de las listas derivadas'; end if;
 with recursive children as (
  select id,1 as level,array[new.id,id] as path from public.retail_price_lists where store_id=new.store_id and parent_id=new.id
  union all select l.id,c.level+1,c.path||l.id from children c join public.retail_price_lists l on l.parent_id=c.id and l.store_id=new.store_id where not l.id=any(c.path) and c.level<12
 ) select coalesce(max(level),0) into child_depth from children;
 if depth+child_depth>12 then raise exception 'Este origen dejaría más de 12 niveles de listas'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
 return new;
end $$;
revoke all on function retail_private.validate_price_tree() from public,anon,authenticated;
create trigger retail_validate_price_tree before insert or update on public.retail_price_lists
 for each row execute function retail_private.validate_price_tree();

-- RPC-only writes lock the store BEFORE rows, coordinating checkout and concurrent edits.
-- RLS member reads and delegated policies remain; no new role is granted.
revoke insert,update,delete on public.retail_price_lists from authenticated;
revoke update(name,adjustment,active,branch_id) on public.retail_price_lists from authenticated;
revoke insert,update,delete on public.retail_price_overrides from authenticated;

create function public.retail_save_price_list_tree(p_store uuid,p_id uuid,p_name text,p_adjustment numeric,p_active boolean,p_branch uuid,p_base text,p_parent uuid,p_rules jsonb,p_revision bigint default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.retail_price_lists;
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para administrar listas' using errcode='42501'; end if;
 if p_id is null then raise exception 'Falta el identificador de la lista'; end if;
 if p_adjustment is null or p_adjustment::text in ('NaN','Infinity','-Infinity') or p_adjustment<=-100 or p_adjustment>10000 or round(p_adjustment,2)<>p_adjustment then raise exception 'Ingresá un ajuste entre -99,99 y 10.000, con hasta dos decimales'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 select * into previous from public.retail_price_lists where id=p_id for update;
 if found then
  if previous.store_id<>p_store then raise exception 'Lista no disponible' using errcode='42501'; end if;
  -- Retrying a committed request does not create another list or bump its revision.
  if row(previous.name,previous.adjustment,previous.active,previous.branch_id,previous.base_kind,previous.parent_id,previous.pricing_rules)
    is not distinct from row(btrim(p_name),p_adjustment,p_active,p_branch,p_base,p_parent,p_rules) then return p_id; end if;
  if previous.revision is distinct from p_revision then raise exception 'La lista cambió en otro dispositivo. Actualizá los datos y revisá el borrador antes de guardarlo'; end if;
  update public.retail_price_lists set name=btrim(p_name),adjustment=p_adjustment,active=p_active,branch_id=p_branch,base_kind=p_base,parent_id=p_parent,pricing_rules=p_rules where id=p_id and store_id=p_store;
 else
  insert into public.retail_price_lists(id,store_id,name,adjustment,active,branch_id,base_kind,parent_id,pricing_rules)
   values(p_id,p_store,btrim(p_name),p_adjustment,p_active,p_branch,p_base,p_parent,p_rules);
 end if;
 return p_id;
end $$;
revoke all on function public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint) from public,anon;
grant execute on function public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint) to authenticated;

create function public.retail_save_price_override(p_store uuid,p_list uuid,p_product uuid,p_price numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para administrar listas' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 if not exists(select 1 from public.retail_price_lists where id=p_list and store_id=p_store) or not exists(select 1 from public.retail_products where id=p_product and store_id=p_store) then raise exception 'Lista o producto no disponible en este comercio'; end if;
 if p_price is null then
  delete from public.retail_price_overrides where store_id=p_store and list_id=p_list and product_id=p_product;
 else
  insert into public.retail_price_overrides(store_id,list_id,product_id,price) values(p_store,p_list,p_product,p_price)
   on conflict(list_id,product_id) do update set price=excluded.price;
 end if;
end $$;
revoke all on function public.retail_save_price_override(uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.retail_save_price_override(uuid,uuid,uuid,numeric) to authenticated;

create function retail_private.product_list_price(p_product public.retail_products,p_list uuid,p_depth integer default 0)
returns numeric language plpgsql security definer set search_path='' as $$
declare list public.retail_price_lists; price numeric; rule jsonb; scope text; target text;
begin
 if p_depth>=12 then raise exception 'Revisá el origen de la lista: demasiados niveles'; end if;
 if p_list is null then return p_product.price; end if;
 select * into list from public.retail_price_lists where id=p_list and store_id=p_product.store_id;
 if not found then raise exception 'Lista de origen no disponible'; end if;
 select o.price into price from public.retail_price_overrides o where o.store_id=p_product.store_id and o.list_id=p_list and o.product_id=p_product.id;
 if found then return price; end if;
 if list.base_kind='cost' then
  if p_product.cost<=0 then raise exception 'Falta cargar el costo de % para calcular esta lista',p_product.name; end if;
  price:=p_product.cost;
 elsif list.base_kind='list' then price:=retail_private.product_list_price(p_product,list.parent_id,p_depth+1);
 else price:=p_product.price;
 end if;
 price:=greatest(0.01,round(price*(1+list.adjustment/100),2));
 foreach scope in array array['category','brand','product'] loop
  target:=case scope when 'category' then p_product.category_id::text when 'product' then p_product.id::text else lower(btrim(coalesce(p_product.brand,''))) end;
  for rule in select value from jsonb_array_elements(list.pricing_rules) r where r->>'scope'=scope and r->>'target'=target loop
   price:=greatest(0.01,round(price*(1+(rule->>'adjustment')::numeric/100),2));
  end loop;
 end loop;
 if price>=1000000000000 then raise exception 'El precio calculado de % supera el límite permitido',p_product.name; end if;
 return price;
end $$;
revoke all on function retail_private.product_list_price(public.retail_products,uuid,integer) from public,anon,authenticated;

-- Preserve the real checkout and all subsequent stock, ledger, margin, permission,
-- payment, receipt and idempotency protections. Replace only its price lookup.
do $patch$
declare definition text; previous text:=$old$   v_expected:=p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected:=coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;$old$;
begin
 definition:=replace(pg_get_functiondef('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)'::regprocedure),E'\r','');
 if position(previous in definition)=0 or position(' s:=retail_private.check_shift(p_shift);' in definition)=0 then
  raise exception 'La definición de checkout no coincide con la versión esperada. No se aplicaron cambios; revisar instalación';
 end if;
 definition:=replace(definition,previous,'   v_expected:=retail_private.product_list_price(p,p_price_list);');
 definition:=replace(definition,' s:=retail_private.check_shift(p_shift);',E' s:=retail_private.check_shift(p_shift);\n perform pg_advisory_xact_lock_shared(hashtextextended(''retail-pricing:''||s.store_id::text,0));');
 execute definition;
end $patch$;

notify pgrst,'reload schema';
$retail_source_bb77060967eec30f$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260004_price_list_tree.sql','bb77060967eec30f15a7befb20989890ac312c90f76e002656fa6dfada36bf36','schema');
 exception when raise_exception then
 if sqlerrm<>'La definición de checkout no coincide con la versión esperada. No se aplicaron cambios; revisar instalación' then raise; end if;
 raise exception using errcode=sqlstate,message=sqlerrm,
  detail='Huella del cuerpo checkout (LF): '||coalesce((select md5(replace(prosrc,chr(13),'')) from pg_catalog.pg_proc
   where oid=to_regprocedure('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)')),'función ausente'),
  hint='El SQL de instalación ya normaliza CRLF. Si persiste, ejecutar supabase/maintenance/check_manual_schema_history.sql y compartir el resultado y esta huella. No quitar la validación ni reemplazar checkout a ciegas.';
end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
