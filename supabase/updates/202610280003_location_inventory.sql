-- AdministradorKiosco: actualización individual 45/46.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202610280003_location_inventory.sql; SHA-256 baa181aa8cc76f1bc973e914a77fe568f3f30228979d682a67ac3571ce3cc14d.
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
  raise exception 'Falta el historial de instalación. No se aplicó 202610280003_location_inventory.sql'
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
 if exists(select 1 from retail_private.schema_migrations where filename='202610280003_location_inventory.sql') then
  raise notice '202610280003_location_inventory.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<45 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202610280003_location_inventory.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando 202610280003_location_inventory.sql';
  execute replace($retail_source_baa181aa8cc76f1b$
alter table public.retail_stores add column branch_inventory_enabled boolean not null default false;
alter table public.retail_depot_movements add column branch_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
create table public.retail_branch_stock (
 store_id uuid not null, branch_id uuid not null, product_id uuid not null,
 quantity integer not null check(quantity>=0), primary key(store_id,branch_id,product_id),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create table public.retail_inventory_activations (
 store_id uuid primary key references public.retail_stores(id), branch_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id)
);
alter table public.retail_branch_stock enable row level security;
alter table public.retail_inventory_activations enable row level security;
create policy member_read on public.retail_branch_stock for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy manager_read on public.retail_inventory_activations for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_branch_stock,public.retail_inventory_activations from public,anon,authenticated;
grant select on public.retail_branch_stock,public.retail_inventory_activations to authenticated;

create function public.retail_location_stock_summary(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
  select 'depot'::text as location,coalesce(sum(d.quantity),0) as quantity from public.retail_depot_balances d
   join public.retail_products p on p.id=d.product_id and p.store_id=d.store_id where d.store_id=p_store and p.active
  union all
  select b.id::text,coalesce(sum(s.quantity) filter(where p.active),0) from public.retail_branches b
   left join public.retail_branch_stock s on s.branch_id=b.id and s.store_id=b.store_id
   left join public.retail_products p on p.id=s.product_id and p.store_id=s.store_id where b.store_id=p_store group by b.id
 ) t);
end $$;
revoke all on function public.retail_location_stock_summary(uuid) from public,anon;
grant execute on function public.retail_location_stock_summary(uuid) to authenticated;

create function retail_private.inventory_location(p_store uuid,p_location text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_location is null or (p_location<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=p_location)) then raise exception 'Elegí una ubicación de este comercio'; end if;
end $$;
revoke all on function retail_private.inventory_location(uuid,text) from public,anon,authenticated;

create function public.retail_enable_branch_inventory(p_store uuid,p_branch uuid) returns void
language plpgsql security definer set search_path='' as $$
declare prior public.retail_inventory_activations;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo un administrador puede distribuir el inventario inicial' using errcode='42501'; end if;
 perform 1 from public.retail_stores where id=p_store for update;
 select * into prior from public.retail_inventory_activations where store_id=p_store;
 if found then
  if prior.branch_id<>p_branch then raise exception 'El inventario ya fue distribuido. Usá una transferencia para moverlo'; end if;
  return;
 end if;
 perform retail_private.inventory_location(p_store,p_branch::text);
 if exists(select 1 from public.retail_shifts where store_id=p_store and closed_at is null) then raise exception 'Cerrá los turnos y sincronizá todos los dispositivos antes de distribuir el stock'; end if;
 if exists(select 1 from public.retail_stock_transfers where store_id=p_store and status='pending') then raise exception 'Confirmá o cancelá los traslados anteriores pendientes antes de distribuir el stock'; end if;
 perform 1 from public.retail_products where store_id=p_store order by id for update;
 insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
 select p_store,p_branch,p.id,p.stock-coalesce(d.quantity,0) from public.retail_products p
 left join public.retail_depot_balances d on d.store_id=p_store and d.product_id=p.id
 where p.store_id=p_store and jsonb_array_length(p.stock_components)=0;
 insert into public.retail_inventory_activations(store_id,branch_id,created_by) values(p_store,p_branch,auth.uid());
 update public.retail_stores set branch_inventory_enabled=true,depot_enabled=true where id=p_store;
end $$;

create function retail_private.guard_branch_inventory_setting() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.branch_inventory_enabled and not new.depot_enabled then raise exception 'El depósito forma parte del inventario por ubicación. Conservá sus saldos y usá Transferencias'; end if;
 if new.branch_inventory_enabled is distinct from old.branch_inventory_enabled then
  if not new.branch_inventory_enabled or not exists(select 1 from public.retail_inventory_activations where store_id=new.id) then raise exception 'El inventario por sucursal se activa distribuyendo el stock, y no se desactiva borrando saldos'; end if;
  if coalesce(retail_private.role_for(new.id),'') not in ('owner','admin') then raise exception 'Solo el administrador puede distribuir el inventario' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger retail_branch_inventory_setting before update of branch_inventory_enabled,depot_enabled on public.retail_stores for each row execute function retail_private.guard_branch_inventory_setting();

-- Coordinate activation with existing stock writers and shift openings, including REST.
create function retail_private.lock_inventory_setting() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_stores where id=new.store_id for share;
 return new;
end $$;
create trigger retail_lock_inventory_setting before insert or update of stock on public.retail_products for each row execute function retail_private.lock_inventory_setting();
create trigger retail_lock_shift_inventory_setting before insert on public.retail_shifts for each row execute function retail_private.lock_inventory_setting();

-- Product.stock remains the aggregate. A transaction explicitly identifies the branch.
create function retail_private.allocate_branch_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare delta bigint; loc text; current_qty integer;
begin
 if not exists(select 1 from public.retail_stores where id=new.store_id and branch_inventory_enabled) then return new; end if;
 delta:=new.stock-case when tg_op='INSERT' then 0 else old.stock end;
 if delta=0 then return new; end if;
 loc:=nullif(current_setting('retail.inventory_location',true),'');
 if loc in ('depot','conversion') then return new; end if;
 perform retail_private.inventory_location(new.store_id,loc);
 insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(new.store_id,loc::uuid,new.id,0) on conflict do nothing;
 select quantity into current_qty from public.retail_branch_stock where store_id=new.store_id and branch_id=loc::uuid and product_id=new.id for update;
 if current_qty::bigint+delta not between 0 and 2147483647 then raise exception 'Stock insuficiente de % en esta sucursal, o cantidad fuera de límite. Actualizá el catálogo',new.name; end if;
 update public.retail_branch_stock set quantity=(current_qty::bigint+delta)::integer where store_id=new.store_id and branch_id=loc::uuid and product_id=new.id;
 return new;
end $$;
create trigger retail_allocate_branch_stock after insert or update of stock on public.retail_products for each row execute function retail_private.allocate_branch_stock();

create function retail_private.check_location_stock_total() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.retail_products; pid uuid; sid uuid; qty bigint;
begin
 if tg_table_name='retail_products' then pid:=new.id; sid:=new.store_id;
 elsif tg_op='DELETE' then pid:=old.product_id; sid:=old.store_id;
 else pid:=new.product_id; sid:=new.store_id; end if;
 if not exists(select 1 from public.retail_stores where id=sid and branch_inventory_enabled) then return null; end if;
 select * into p from public.retail_products where store_id=sid and id=pid;
 if not found then return null; end if;
 select coalesce(sum(quantity),0) into qty from public.retail_branch_stock where store_id=sid and product_id=pid;
 qty:=qty+coalesce((select quantity from public.retail_depot_balances where store_id=sid and product_id=pid),0);
 if qty<>p.stock then raise exception 'Las existencias por ubicación no coinciden con el total de %. La operación se revirtió',p.name; end if;
 return null;
end $$;
create constraint trigger retail_location_product_total after insert or update on public.retail_products deferrable initially deferred for each row execute function retail_private.check_location_stock_total();
create constraint trigger retail_location_branch_total after insert or update or delete on public.retail_branch_stock deferrable initially deferred for each row execute function retail_private.check_location_stock_total();
create constraint trigger retail_location_depot_total after insert or update or delete on public.retail_depot_balances deferrable initially deferred for each row execute function retail_private.check_location_stock_total();

-- Keep all existing checkout/billing/pricing/permission logic inside its original body.
alter function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) rename to retail_checkout_before_locations;
revoke all on function public.retail_checkout_before_locations(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare branch uuid; saved uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 select r.branch_id into branch from public.retail_shifts s join public.retail_registers r on r.id=s.register_id and r.store_id=s.store_id where s.id=p_shift;
 perform 1 from public.retail_stores where id=(select store_id from public.retail_shifts where id=p_shift) for share;
 perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 saved:=public.retail_checkout_before_locations(p_shift,p_request,p_method,p_paid,p_items,p_price_list,p_ledger,p_payments);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;
alter function public.retail_sync_operation(jsonb) rename to retail_sync_before_locations;
revoke all on function public.retail_sync_before_locations(jsonb) from public,anon,authenticated;
create function public.retail_sync_operation(p_operation jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; branch uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 if retail_private.role_for((p_operation->>'store')::uuid) is null then raise exception 'Sin acceso al comercio' using errcode='42501'; end if;
 perform 1 from public.retail_stores where id=(p_operation->>'store')::uuid for share;
 if p_operation->>'kind'='stock' then perform set_config('retail.inventory_location',coalesce(p_operation->>'branch',''),true); end if;
 if p_operation->>'kind'='sale' then
  select r.branch_id into branch from public.retail_shifts s join public.retail_registers r on r.id=s.register_id and r.store_id=s.store_id
   where s.id=(p_operation->>'shift')::uuid and s.store_id=(p_operation->>'store')::uuid;
  perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 end if;
 saved:=public.retail_sync_before_locations(p_operation);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

-- REST product permissions still apply; branch is context for the stock delta only.
create function public.retail_save_product_at_branch(p_store uuid,p_values jsonb,p_edit boolean,p_expected integer,p_branch uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare columns_sql text; expressions_sql text; assignment_sql text; saved uuid; previous text:=current_setting('retail.inventory_location',true); product_id uuid;
 allowed text[]:=array['category_id','code','name','price','sale_markup','cost','stock','min_stock','emoji','active','sellable','brand','supplier','supplier_code','tags','unit_type','pack_size','expiry_date','last_restocked_at'];
begin
 if p_values is null or jsonb_typeof(p_values)<>'object' or p_edit is null then raise exception 'Datos del producto incompletos'; end if;
 product_id:=(p_values->>'id')::uuid;
 if exists(select 1 from jsonb_object_keys(p_values) k where k<>all(allowed||array['id'])) then raise exception 'Campos de producto no admitidos'; end if;
 if not exists(select 1 from public.retail_branches where store_id=p_store and id=p_branch) then raise exception 'Elegí la sucursal del stock'; end if;
 perform set_config('retail.inventory_location',p_branch::text,true);
 select string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(null::public.retail_products,$1)).%I',k),','),
  string_agg(format('%I=(jsonb_populate_record(null::public.retail_products,$1)).%I',k,k),',')
 into columns_sql,expressions_sql,assignment_sql from jsonb_object_keys(p_values) k where k=any(allowed);
 if p_edit then
  execute 'update public.retail_products set '||assignment_sql||' where store_id=$2 and id=$3 and active and stock=$4 returning id' into saved using p_values,p_store,product_id,p_expected;
 else
  execute 'insert into public.retail_products(store_id,'||columns_sql||') select $2,'||expressions_sql||' returning id' into saved using p_values,p_store;
 end if;
 if saved is null then raise exception 'El producto cambió o no tenés permiso. Actualizá y revisá el borrador'; end if;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return jsonb_build_object('id',saved);
end $$;

alter function public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text) rename to retail_depot_before_locations;
revoke all on function public.retail_depot_before_locations(uuid,uuid,integer,text,uuid,numeric,text) from public,anon,authenticated;
create function public.retail_depot_operation_at_branch(p_store uuid,p_product uuid,p_quantity integer,p_action text,p_request uuid,p_branch uuid,p_cost numeric default null,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid; current_qty integer; previous text:=current_setting('retail.inventory_location',true); enabled boolean;
begin
 if not retail_private.has_permission(p_store,'manage_products') then perform retail_private.require_permission(p_store,'replenish_stock'); end if;
 select branch_inventory_enabled into enabled from public.retail_stores where id=p_store for share;
 if coalesce(enabled,false) then
  perform retail_private.inventory_location(p_store,p_branch::text);
  perform 1 from public.retail_products where id=p_product and store_id=p_store for update;
  if exists(select 1 from public.retail_depot_movements where id=p_request) then
   if not exists(select 1 from public.retail_depot_movements where id=p_request and store_id=p_store and branch_id=p_branch) then raise exception 'La solicitud de depósito corresponde a otra sucursal'; end if;
   return public.retail_depot_before_locations(p_store,p_product,p_quantity,p_action,p_request,p_cost,p_note);
  end if;
  insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(p_store,p_branch,p_product,0) on conflict do nothing;
  select quantity into current_qty from public.retail_branch_stock where store_id=p_store and branch_id=p_branch and product_id=p_product for update;
  if p_action='to_depot' and current_qty<p_quantity then raise exception 'No alcanza el stock de esta sucursal'; end if;
 end if;
 perform set_config('retail.inventory_location','depot',true);
 saved:=public.retail_depot_before_locations(p_store,p_product,p_quantity,p_action,p_request,p_cost,p_note);
 update public.retail_depot_movements set branch_id=p_branch where id=saved and store_id=p_store;
 if coalesce(enabled,false) and p_action in ('to_depot','to_salon') then
  update public.retail_branch_stock set quantity=quantity+case when p_action='to_salon' then p_quantity else -p_quantity end
   where store_id=p_store and branch_id=p_branch and product_id=p_product;
 end if;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;
create function public.retail_depot_operation(p_store uuid,p_product uuid,p_quantity integer,p_action text,p_request uuid,p_cost numeric default null,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled) then raise exception 'Elegí una sucursal y actualizá la app para operar con depósito'; end if;
 return public.retail_depot_before_locations(p_store,p_product,p_quantity,p_action,p_request,p_cost,p_note);
end $$;

alter function public.retail_approve_replenishment(uuid,uuid,jsonb) rename to retail_approve_before_locations;
revoke all on function public.retail_approve_before_locations(uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare branch uuid; saved uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 select branch_id into branch from public.retail_pending_replenishments where store_id=p_store and id=p_id;
 perform 1 from public.retail_stores where id=p_store for share;
 perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 saved:=public.retail_approve_before_locations(p_store,p_id,p_items);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

create function public.retail_approve_replenishment_at_branch(p_store uuid,p_id uuid,p_items jsonb,p_branch uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 perform 1 from public.retail_stores where id=p_store for share;
 perform retail_private.inventory_location(p_store,p_branch::text);
 select * into r from public.retail_pending_replenishments where store_id=p_store and id=p_id for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.branch_id is not null and r.branch_id<>p_branch then raise exception 'El remito pertenece a otra sucursal'; end if;
 if r.branch_id is null and r.status='pending' then
  update public.retail_pending_replenishments set branch_id=p_branch where id=r.id;
 end if;
 return public.retail_approve_replenishment(p_store,p_id,p_items);
end $$;
revoke all on function public.retail_approve_replenishment_at_branch(uuid,uuid,jsonb,uuid) from public,anon;
grant execute on function public.retail_approve_replenishment_at_branch(uuid,uuid,jsonb,uuid) to authenticated;

-- Unit conversion preserves each branch's proportion rather than allocating it again.
alter function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) rename to retail_loose_before_locations;
revoke all on function public.retail_loose_before_locations(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved uuid; depot_qty integer; factor integer; previous text:=current_setting('retail.inventory_location',true);
begin
 perform retail_private.require_permission(p_store,'manage_compositions');
 perform 1 from public.retail_stores where id=p_store for share;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 if not exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled)
  or exists(select 1 from public.retail_loose_unit_conversions where id=p_request) then return public.retail_loose_before_locations(p_store,p_packet,p_request,p_data); end if;
 perform 1 from public.retail_products where store_id=p_store and id=p_packet for update;
 select quantity into depot_qty from public.retail_depot_balances where store_id=p_store and product_id=p_packet;
 update public.retail_depot_balances set quantity=0 where store_id=p_store and product_id=p_packet;
 perform set_config('retail.inventory_location','conversion',true);
 saved:=public.retail_loose_before_locations(p_store,p_packet,p_request,p_data);
 factor:=(p_data->>'units')::integer;
 insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
 select store_id,branch_id,saved,(quantity::bigint*factor)::integer from public.retail_branch_stock where store_id=p_store and product_id=p_packet
 on conflict(store_id,branch_id,product_id) do update set quantity=excluded.quantity;
 update public.retail_branch_stock set quantity=0 where store_id=p_store and product_id=p_packet;
 insert into public.retail_depot_balances(store_id,product_id,quantity) values(p_store,saved,(coalesce(depot_qty,0)::bigint*factor)::integer)
 on conflict(product_id) do update set quantity=excluded.quantity;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

create table public.retail_location_transfers (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 from_location text not null,to_location text not null, items jsonb not null,
 status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 notes text, created_by uuid not null references auth.users(id), actor_email text,created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 check(from_location<>to_location),check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 200),
 check((status='pending' and reviewed_by is null and reviewed_at is null) or(status<>'pending' and reviewed_by is not null and reviewed_at is not null))
);
create index retail_location_transfer_history on public.retail_location_transfers(store_id,created_at desc,id);
alter table public.retail_location_transfers enable row level security;
create policy authorized_read on public.retail_location_transfers for select to authenticated using(retail_private.has_permission(store_id,'manage_transfers'));
revoke all on public.retail_location_transfers from public,anon,authenticated;
grant select on public.retail_location_transfers to authenticated;

create function public.retail_create_location_transfer(p_store uuid,p_from text,p_to text,p_items jsonb,p_notes text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_location_transfers; item jsonb; canonical jsonb; snapshot jsonb:='[]'; p public.retail_products;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 perform retail_private.inventory_location(p_store,p_from); perform retail_private.inventory_location(p_store,p_to);
 if p_from=p_to or p_request is null or p_items is null or jsonb_typeof(p_items)<>'array' or length(coalesce(p_notes,''))>2000 then raise exception 'Revisá origen, destino, productos y notas'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if coalesce(item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(item->>'qty','')!~'^[1-9][0-9]{0,6}$' or (item->>'qty')::integer>1000000 then raise exception 'Usá cantidades enteras de 1 a 1.000.000'; end if;
 end loop;
 if (select count(distinct x->>'product_id') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Incluí cada producto una sola vez'; end if;
 select jsonb_agg(jsonb_build_object('product_id',x->>'product_id','qty',(x->>'qty')::integer) order by x->>'product_id') into canonical from jsonb_array_elements(p_items) x;
 perform pg_advisory_xact_lock(hashtextextended('location-transfer:'||p_request::text,0));
 select * into prior from public.retail_location_transfers where id=p_request;
 if found then
  if prior.store_id<>p_store or prior.created_by<>auth.uid() or prior.from_location<>p_from or prior.to_location<>p_to or prior.notes is distinct from nullif(btrim(p_notes),'')
   or (select jsonb_agg(jsonb_build_object('product_id',x->>'product_id','qty',(x->>'qty')::integer) order by x->>'product_id') from jsonb_array_elements(prior.items) x)<>canonical then raise exception 'La solicitud corresponde a otra transferencia'; end if;
  return prior.id;
 end if;
 if not exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled) then raise exception 'Primero distribuí el stock actual entre ubicaciones'; end if;
 for item in select value from jsonb_array_elements(canonical) loop
  select * into p from public.retail_products where store_id=p_store and id=(item->>'product_id')::uuid and active;
  if not found or jsonb_array_length(p.stock_components)>0 then raise exception 'Transferí productos físicos o los componentes del combo'; end if;
  snapshot:=snapshot||jsonb_build_array(item||jsonb_build_object('product_name',p.name));
 end loop;
 insert into public.retail_location_transfers(id,store_id,from_location,to_location,items,notes,created_by,actor_email)
 values(p_request,p_store,p_from,p_to,snapshot,nullif(btrim(p_notes),''),auth.uid(),auth.jwt()->>'email');
 return p_request;
end $$;

create function public.retail_review_location_transfer(p_store uuid,p_id uuid,p_confirm boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_location_transfers; item jsonb; source_qty integer; destination_qty integer; pid uuid; qty integer; depot_qty integer; branch uuid; product_name text; total integer; depot_after integer; movement_id uuid; movement_action text;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 if p_confirm is null then raise exception 'Indicá si confirmás o cancelás'; end if;
 select * into t from public.retail_location_transfers where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if (p_confirm and t.status='confirmed') or (not p_confirm and t.status='cancelled') then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia ya fue revisada. Actualizá el historial'; end if;
 if p_confirm then
  perform 1 from public.retail_stores where id=p_store for share;
  for item in (select value from jsonb_array_elements(t.items) order by (value->>'product_id')) loop
   pid:=(item->>'product_id')::uuid; qty:=(item->>'qty')::integer;
   perform 1 from public.retail_products where id=pid and store_id=p_store and active and jsonb_array_length(stock_components)=0 for update;
   if not found then raise exception 'Un producto ya no está disponible para transferir'; end if;
   if t.from_location='depot' or t.to_location='depot' then
    branch:=(case when t.from_location='depot' then t.to_location else t.from_location end)::uuid;
    insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(p_store,branch,pid,0) on conflict do nothing;
    insert into public.retail_depot_balances(store_id,product_id,quantity) values(p_store,pid,0) on conflict do nothing;
    select quantity into source_qty from public.retail_branch_stock where store_id=p_store and branch_id=branch and product_id=pid for update;
    select quantity into depot_qty from public.retail_depot_balances where store_id=p_store and product_id=pid for update;
    if (t.from_location='depot' and depot_qty<qty) or (t.to_location='depot' and source_qty<qty) then raise exception 'No alcanza el stock de origen. Actualizá existencias'; end if;
    depot_after:=case when t.from_location='depot' then depot_qty - qty else depot_qty + qty end;
    update public.retail_branch_stock set quantity=case when t.from_location='depot' then quantity + qty else quantity - qty end where store_id=p_store and branch_id=branch and product_id=pid;
    update public.retail_depot_balances set quantity=depot_after where store_id=p_store and product_id=pid;
    select name,stock into product_name,total from public.retail_products where id=pid and store_id=p_store;
    movement_id:=md5(t.id::text||pid::text)::uuid; movement_action:=case when t.from_location='depot' then 'to_salon' else 'to_depot' end;
    insert into public.retail_depot_movements(id,store_id,product_id,product_name,action,quantity,total_after,depot_after,actor_id,actor_email,branch_id,payload)
    values(movement_id,p_store,pid,product_name,movement_action,qty,total,depot_after,auth.uid(),auth.jwt()->>'email',branch,
     jsonb_build_object('product',pid,'quantity',qty,'action',movement_action,'cost',null,'note','Transferencia '||t.id::text));
   else
    insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(p_store,t.from_location::uuid,pid,0),(p_store,t.to_location::uuid,pid,0) on conflict do nothing;
    perform 1 from public.retail_branch_stock where store_id=p_store and product_id=pid and branch_id in (t.from_location::uuid,t.to_location::uuid) order by branch_id for update;
    select quantity into source_qty from public.retail_branch_stock where store_id=p_store and branch_id=t.from_location::uuid and product_id=pid;
    select quantity into destination_qty from public.retail_branch_stock where store_id=p_store and branch_id=t.to_location::uuid and product_id=pid;
    if source_qty<qty or destination_qty::bigint+qty>2147483647 then raise exception 'No alcanza el stock de origen o el destino supera el límite. Actualizá existencias'; end if;
    update public.retail_branch_stock set quantity=case when branch_id=t.from_location::uuid then quantity - qty else quantity + qty end where store_id=p_store and product_id=pid and branch_id in (t.from_location::uuid,t.to_location::uuid);
   end if;
  end loop;
 end if;
 update public.retail_location_transfers set status=case when p_confirm then 'confirmed' else 'cancelled' end,reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end; $$;

-- Old clients cannot silently create non-inventory transfers after activation.
alter function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid) rename to retail_create_transfer_before_locations;
revoke all on function public.retail_create_transfer_before_locations(uuid,uuid,uuid,jsonb,text,uuid) from public,anon,authenticated;
create function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_stores where id=p_store for share;
 if exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled) then raise exception 'Actualizá la app y usá las transferencias por ubicación'; end if;
 return public.retail_create_transfer_before_locations(p_store,p_from_branch,p_to_branch,p_items,p_notes,p_request);
end $$;

revoke all on function public.retail_enable_branch_inventory(uuid,uuid),public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb),public.retail_sync_operation(jsonb),public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid),public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text),public.retail_depot_operation_at_branch(uuid,uuid,integer,text,uuid,uuid,numeric,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb),public.retail_create_location_transfer(uuid,text,text,jsonb,text,uuid),public.retail_review_location_transfer(uuid,uuid,boolean),public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid) from public,anon;
grant execute on function public.retail_enable_branch_inventory(uuid,uuid),public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb),public.retail_sync_operation(jsonb),public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid),public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text),public.retail_depot_operation_at_branch(uuid,uuid,integer,text,uuid,uuid,numeric,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb),public.retail_create_location_transfer(uuid,text,text,jsonb,text,uuid),public.retail_review_location_transfer(uuid,uuid,boolean),public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid) to authenticated;
revoke all on function retail_private.allocate_branch_stock(),retail_private.check_location_stock_total(),retail_private.guard_branch_inventory_setting(),retail_private.lock_inventory_setting() from public,anon,authenticated;
notify pgrst,'reload schema';
$retail_source_baa181aa8cc76f1b$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610280003_location_inventory.sql','baa181aa8cc76f1bc973e914a77fe568f3f30228979d682a67ac3571ce3cc14d','schema');
 end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
