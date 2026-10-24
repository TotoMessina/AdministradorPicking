-- AdministradorKiosco: schema consolidado generado desde migrations/.
-- Regenerar: node scripts/generate-schema.mjs. NO editar los bloques generados.
-- Ejecutar completo en el SQL Editor del proyecto correcto; no desde el frontend.
-- Base nueva: instala todo. Base manual previa SIN historial: baseline declara
-- que TODAS las migraciones hasta ese nombre ya fueron aplicadas por el responsable.
-- El usuario confirmó todas las actuales el 2026-10-23. Baseline FIJO, no avanza
-- al agregar archivos. Para otro entorno, revisar o vaciar antes de ejecutar.
-- Una base existente sin historial ni baseline se rechaza ANTES de aplicar cambios.
-- Reejecuciones omiten migraciones registradas y verifican su SHA-256.
-- No incluye maintenance/, tests/, ni push-schedule.sql (requiere Vault y despliegue).
-- Este archivo no fue ejecutado contra Supabase durante su preparación.
begin;
select pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
select set_config('retail.schema_baseline', '202610230002_ingredients_and_composition_costs.sql', true);

create schema if not exists retail_private;
create table if not exists retail_private.schema_migrations (
 filename text primary key,
 sha256 text not null check(length(sha256)=64),
 origin text not null check(origin in ('schema','adopted')),
 registered_at timestamptz not null default now()
);
revoke all on retail_private.schema_migrations from public,anon,authenticated;
create temporary table retail_schema_manifest (
 ordinal integer primary key, filename text unique not null, sha256 text not null
) on commit drop;
insert into retail_schema_manifest(ordinal,filename,sha256) values
 (1,'202610010001_retail_multistore.sql','f24b734005cc1623cbeb235dd0436522445fce6501ec73999528a8f745ed1cb9'),
 (2,'202610020001_catalog_global_and_segmentation.sql','bca9c54fa75c2a8940b4f28c76aaab415b1740330c2a4a334dad2fef5beca292'),
 (3,'202610070001_harden_global_catalog_immutability.sql','f3ff59ec39b6e5744cb059f242cfdaf0c234f1ab34c4bae2ec93ca10f13594f5'),
 (4,'202610130001_branches_prices_ledgers.sql','e86fe143f886cd858443bde5917d43095126a4beca788c866f2589bcee94509b'),
 (5,'202610140001_web_push.sql','918efe9a5d3313e3dc695430c93c0c035acdf97f9b20fcc4c387b444a8737964'),
 (6,'202610150001_cashier_access.sql','a30006ceabfa2ca5abd0116ddf06f3f79d042bae913fd59c25efb5a918a83017'),
 (7,'202610160001_offline_pos.sql','770c916876fcdabf64104718e442e7b424f343e6787bfc742c4164cccf435313'),
 (8,'202610160002_offline_queue.sql','ffb2f924480094f8255c3bd1105ac834381678058bb65ff6e63ec433b4710ab0'),
 (9,'202610160003_pack_size.sql','e8f486a53e3699543bb33b819986d3e96c57bbfb112cb039428e534507228c6b'),
 (10,'202610160004_margin_groups.sql','8a5790ed3a1371e6c0aa57f46b68b2fe0af74efd79a3650cfa7ced54b876cc86'),
 (11,'202610160005_branch_price_rules.sql','7899d29739b25999d24e879b18ed53f8794628fe852743c7916b46d4db5b16e1'),
 (12,'202610190001_justified_withdrawal.sql','029b5843eacab94f78439fd8f13da846c46e7729f376e1f314286e1f20a14fa9'),
 (13,'202610190001_store_onboarding.sql','e5b8362448949bceec6db8607ab80a30285230317f319875eb6d9a2f1d47f09c'),
 (14,'202610190002_pending_replenishments.sql','3ddd179e5609126a264e696cd293909008bf4dd1acc06a8bb409c248ba5ab707'),
 (15,'202610190003_stock_transfers.sql','cab05c3785465fba81273dddaad52130c14a8c6c42fb63ed53f476416d53a4be'),
 (16,'202610200001_supplier_mappings.sql','d4841853f82adbd4e881feb1bdf3f525d76a12121e152b54257f8eaf9a81611c'),
 (17,'202610200002_supplier_alias_usage.sql','1adc3ce4519abbb20c3436578bff8de5d9111f08abda7e198639468bd77e15c4'),
 (18,'202610200003_product_expiry.sql','77d1f8c0f62da28481839205c638d09ab8586267acd2b86fb97f44c812072a87'),
 (19,'202610210001_ledger_routing.sql','f19dc026535013c80519da077ca4de832b6706cf7e885ffbc1b0e31185591d7e'),
 (20,'202610210002_staff_profiles.sql','ca6e73c2c8993bc2390e2f91d48e9a0d82e60e3ae1be9613297f6ba667809a0e'),
 (21,'202610210003_ledger_lock_order.sql','b9f318a08145ad1e1734c2afe5fc1ff04402666a69869aa0f27c4dee2abb5124'),
 (22,'202610210004_delegated_catalog_actions.sql','bcfa6664c406dd0074ba93d0bbb367c1c212c5e9285e703583616519f163628e'),
 (23,'202610220001_product_compositions.sql','ef088735e7a849006d0960d0e16decd98e257bb432da68ebd2e0d02618f93c84'),
 (24,'202610220002_loose_cigarettes.sql','e943d579b3d7ed4e77e96ffc6c26125f7ccb84ca09dcb9a09a7dde87ed147bad'),
 (25,'202610220003_product_deletion_history.sql','458a93d670539dd4bfd36c3f8b4aff69042989aafdea80511ced58e6d5a3f9b7'),
 (26,'202610220004_standard_categories.sql','85e889e22c9dcc559736c4af21b9cf7bc0205cbd1ff940ed00ff9d38f481fd13'),
 (27,'202610220005_category_labels.sql','e975aa6c462d6ee5492edbb36b1ed523a410c634658f8ad36fd24fe18a218f99'),
 (28,'202610220006_complete_permission_profiles.sql','913347ffd59472a588b214ee3da8ec426cb47fe143db19889896279a221636d5'),
 (29,'202610230001_automatic_margin_groups.sql','6cd429e7679685c41c4adb245d3ec97ec07eeb202ca421e9640e9a80f49050c2'),
 (30,'202610230002_ingredients_and_composition_costs.sql','86fd19952b8e65341957126f53ec64e327dd8f4ed3de54b2d9a3b9a9e3baaffb'),
 (31,'202610240001_shift_closing_details.sql','d3204ba0e41d297710ff1e4a05ea5048c703dbe07b9b266b66a6c7aa7a859759');

do $retail_bootstrap$
declare baseline text:=current_setting('retail.schema_baseline'); boundary integer; conflict text;
 existing_installation boolean;
begin
 if baseline<>'' then
  select ordinal into boundary from retail_schema_manifest where filename=baseline;
  if boundary is null then raise exception 'Baseline desconocido: %. Usá el nombre completo de una migración del manifiesto',baseline; end if;
 end if;
 select exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and left(c.relname,7)='retail_')
  or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and left(p.proname,7)='retail_') into existing_installation;
 if not exists(select 1 from retail_private.schema_migrations) then
  if existing_installation then
   if baseline='' then
    raise exception 'La base ya contiene objetos retail pero no tiene historial de schema. No se modificó la instalación. Consultá SUPABASE_SETUP.md y confirmá la última migración completa antes de indicar baseline';
   end if;
   if exists(select 1 from unnest(array['retail_stores','retail_members','retail_categories','retail_registers','retail_products','retail_shifts','retail_sales','retail_movements','retail_invitations']) t(name)
    where to_regclass('public.'||t.name) is null) then
    raise exception 'La instalación base está incompleta. No se puede adoptar por baseline; revisar el inventario sin borrar tablas';
   end if;
   -- Explicit operator declaration, NOT an inference from columns or row counts.
   insert into retail_private.schema_migrations(filename,sha256,origin)
    select filename,sha256,'adopted' from retail_schema_manifest where ordinal<=boundary;
   raise notice 'Adoptadas % migraciones hasta %. Esta fecha registra la adopción, no su ejecución original',boundary,baseline;
  end if;
 elsif baseline<>'' and exists(select 1 from retail_schema_manifest m where m.ordinal<=boundary
  and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)) then
  raise exception 'La base ya tiene historial. No se permite ampliar baseline para saltar migraciones pendientes';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join retail_schema_manifest m on m.filename=h.filename
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then
  raise exception 'El historial no coincide con este schema: %. No se aplicó ningún cambio. No editar migraciones registradas; preparar una nueva o usar la versión correcta del repositorio',conflict;
 end if;
 if exists(select 1 from retail_schema_manifest m join retail_private.schema_migrations h using(filename)
  where exists(select 1 from retail_schema_manifest previous where previous.ordinal<m.ordinal
   and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=previous.filename))) then
  raise exception 'El historial tiene huecos. Revisalo antes de aplicar migraciones posteriores';
 end if;
end;
$retail_bootstrap$;

-- 1/31: 202610010001_retail_multistore.sql
do $retail_step_1$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610010001_retail_multistore.sql') then
  raise notice 'Aplicando 202610010001_retail_multistore.sql';
  execute $retail_source_f24b734005cc1623$
create schema if not exists retail_private;
revoke all on schema retail_private from public;
grant usage on schema retail_private to authenticated;

create table public.retail_stores (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
 owner_id uuid not null references auth.users(id), address text not null default '', phone text not null default '',
 receipt_message text not null default '¡Gracias por tu compra!', accent_color text not null default '#5a50df' check(accent_color ~ '^#[0-9a-fA-F]{6}$'),
 currency text not null default 'ARS' check(currency = 'ARS'), created_at timestamptz not null default now()
);
create table public.retail_members (
 store_id uuid not null references public.retail_stores(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','admin','cashier')), primary key(store_id,user_id)
);
create table public.retail_categories (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80), unique(store_id,name), unique(store_id,id)
);
create table public.retail_registers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80), active boolean not null default true,
 unique(store_id,name), unique(store_id,id)
);
create table public.retail_products (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 category_id uuid not null, code text not null check(length(trim(code)) between 1 and 100),
 name text not null check(length(trim(name)) between 1 and 160), price numeric(14,2) not null check(price > 0),
 cost numeric(14,2) not null default 0 check(cost >= 0), stock integer not null default 0 check(stock >= 0),
 min_stock integer not null default 4 check(min_stock >= 0), emoji text not null default '📦', active boolean not null default true,
 unique(store_id,code), unique(store_id,id), foreign key(store_id,category_id) references public.retail_categories(store_id,id)
);
create table public.retail_shifts (
 id uuid primary key default gen_random_uuid(), store_id uuid not null, register_id uuid not null,
 opened_by uuid not null references auth.users(id), opened_at timestamptz not null default now(),
 opening_cash numeric(14,2) not null check(opening_cash >= 0), closed_at timestamptz, closed_by uuid references auth.users(id),
 counted_cash numeric(14,2) check(counted_cash >= 0), expected_cash numeric(14,2),
 unique(store_id,id), foreign key(store_id,register_id) references public.retail_registers(store_id,id)
);
create unique index retail_one_open_shift on public.retail_shifts(register_id) where closed_at is null;
create table public.retail_sales (
 id uuid primary key, store_id uuid not null, shift_id uuid not null, created_by uuid not null references auth.users(id),
 ticket_number bigint generated always as identity, created_at timestamptz not null default now(),
 payment_method text not null check(payment_method in ('Efectivo','QR','Debito','Credito')),
 total numeric(14,2) not null check(total > 0), amount_paid numeric(14,2) not null, change numeric(14,2) not null check(change >= 0),
 items jsonb not null, unique(store_id,id), foreign key(store_id,shift_id) references public.retail_shifts(store_id,id)
);
create table public.retail_movements (
 id uuid primary key default gen_random_uuid(), store_id uuid not null, shift_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 type text not null check(type in ('INGRESO','RETIRO')), amount numeric(14,2) not null check(amount > 0),
 reason text not null check(length(trim(reason)) between 1 and 300),
 foreign key(store_id,shift_id) references public.retail_shifts(store_id,id)
);
create table public.retail_invitations (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 email text not null check(email = lower(trim(email))), role text not null check(role in ('admin','cashier')),
 created_at timestamptz not null default now(), unique(store_id,email)
);
create index on public.retail_members(user_id);
create index on public.retail_products(store_id,category_id);
create index on public.retail_shifts(store_id,opened_at desc);
create index on public.retail_sales(store_id,shift_id,created_at desc);
create index on public.retail_movements(store_id,shift_id,created_at desc);

create function retail_private.role_for(p_store uuid) returns text language sql stable security definer set search_path = '' as $$
 select role from public.retail_members where store_id = p_store and user_id = (select auth.uid());
$$;
revoke all on function retail_private.role_for(uuid) from public;
grant execute on function retail_private.role_for(uuid) to authenticated;

alter table public.retail_stores enable row level security;
alter table public.retail_members enable row level security;
alter table public.retail_categories enable row level security;
alter table public.retail_registers enable row level security;
alter table public.retail_products enable row level security;
alter table public.retail_shifts enable row level security;
alter table public.retail_sales enable row level security;
alter table public.retail_movements enable row level security;
alter table public.retail_invitations enable row level security;

create policy member_read on public.retail_stores for select to authenticated using(retail_private.role_for(id) is not null);
create policy manager_update on public.retail_stores for update to authenticated using(retail_private.role_for(id) in ('owner','admin')) with check(retail_private.role_for(id) in ('owner','admin'));
create policy member_read on public.retail_members for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy owner_remove on public.retail_members for delete to authenticated using(retail_private.role_for(store_id) = 'owner' and role <> 'owner');
create policy owner_read on public.retail_invitations for select to authenticated using(retail_private.role_for(store_id) = 'owner');
create policy owner_invite on public.retail_invitations for insert to authenticated with check(retail_private.role_for(store_id) = 'owner');
create policy owner_revoke on public.retail_invitations for delete to authenticated using(retail_private.role_for(store_id) = 'owner');

do $$ declare t text; begin
 foreach t in array array['retail_categories','retail_registers','retail_products'] loop
 execute format('create policy member_read on public.%I for select to authenticated using (retail_private.role_for(store_id) is not null)',t);
 execute format('create policy manager_insert on public.%I for insert to authenticated with check (retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 execute format('create policy manager_update on public.%I for update to authenticated using (retail_private.role_for(store_id) in (''owner'',''admin'')) with check (retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 end loop;
 foreach t in array array['retail_shifts','retail_sales','retail_movements'] loop
 execute format('create policy member_read on public.%I for select to authenticated using (retail_private.role_for(store_id) is not null)',t);
 end loop;
end $$;
-- Explicit grants: sales, movements and shifts can only be written by verified RPCs.
revoke all on public.retail_stores,public.retail_members,public.retail_categories,public.retail_registers,public.retail_products,public.retail_shifts,public.retail_sales,public.retail_movements,public.retail_invitations from anon,authenticated;
grant select on public.retail_stores,public.retail_members,public.retail_categories,public.retail_registers,public.retail_products,public.retail_shifts,public.retail_sales,public.retail_movements,public.retail_invitations to authenticated;
grant update(name,address,phone,receipt_message,accent_color) on public.retail_stores to authenticated;
grant insert on public.retail_categories,public.retail_registers,public.retail_products,public.retail_invitations to authenticated;
grant update(name) on public.retail_categories to authenticated;
grant update(name,active) on public.retail_registers to authenticated;
grant update(category_id,code,name,price,cost,stock,min_stock,emoji,active) on public.retail_products to authenticated;
grant delete on public.retail_members,public.retail_invitations to authenticated;

create function public.retail_create_store(p_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 insert into public.retail_stores(name,owner_id) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.retail_members values(v_id,auth.uid(),'owner');
 insert into public.retail_categories(store_id,name) select v_id,n from unnest(array['Golosinas','Bebidas','Snacks','Varios']) n;
 insert into public.retail_registers(store_id,name) values(v_id,'Caja principal');
 return v_id;
end $$;

-- Invitations are accepted by the verified account email, never by client-supplied user IDs.
create function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path = '' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 insert into public.retail_members(store_id,user_id,role)
 select store_id,auth.uid(),role from public.retail_invitations where email = v_email
 on conflict (store_id,user_id) do nothing;
 get diagnostics v_count = row_count;
 delete from public.retail_invitations where email = v_email;
 return v_count;
end $$;

create function public.retail_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then raise exception 'Caja no disponible'; end if;
 if p_opening is null or p_opening < 0 or p_opening::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
 insert into public.retail_shifts(store_id,register_id,opened_by,opening_cash) values(p_store,p_register,auth.uid(),p_opening) returning id into v_id;
 return v_id;
end $$;

create function retail_private.check_shift(p_shift uuid) returns public.retail_shifts language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; r text;
begin
 select * into s from public.retail_shifts where id=p_shift for update;
 r := retail_private.role_for(s.store_id);
 if s.id is null or r is null then raise exception 'Turno no disponible'; end if;
 if s.closed_at is not null then raise exception 'El turno ya está cerrado'; end if;
 if s.opened_by <> auth.uid() and r not in ('owner','admin') then raise exception 'Esta caja está abierta por otro usuario'; end if;
 return s;
end $$;
revoke all on function retail_private.check_shift(uuid) from public,anon,authenticated;

create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 if p_method is null or p_method not in ('Efectivo','QR','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   if (item->>'unit_price')::numeric is distinct from p.price then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := p.price; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items);
 return p_request;
end $$;

create function public.retail_add_movement(p_shift uuid,p_type text,p_amount numeric,p_reason text,p_request uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; existing public.retail_movements;
begin
 s := retail_private.check_shift(p_shift);
 select * into existing from public.retail_movements where id=p_request;
 if found then
  if existing.shift_id <> p_shift or existing.created_by <> auth.uid() then raise exception 'Solicitud no válida'; end if;
  return existing.id;
 end if;
 if p_amount is null or p_amount <= 0 or p_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Importe inválido'; end if;
 insert into public.retail_movements(id,store_id,shift_id,created_by,type,amount,reason) values(p_request,s.store_id,s.id,auth.uid(),p_type,p_amount,trim(p_reason));
 return p_request;
end $$;

create function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 select s.opening_cash+coalesce((select sum(total) from public.retail_sales where shift_id=s.id and payment_method='Efectivo'),0)
 +coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0) into v_expected;
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

revoke all on function public.retail_create_store(text),public.retail_accept_invitations(),public.retail_open_shift(uuid,uuid,numeric),public.retail_checkout(uuid,uuid,text,numeric,jsonb),public.retail_add_movement(uuid,text,numeric,text,uuid),public.retail_close_shift(uuid,numeric) from public,anon;
grant execute on function public.retail_create_store(text),public.retail_accept_invitations(),public.retail_open_shift(uuid,uuid,numeric),public.retail_checkout(uuid,uuid,text,numeric,jsonb),public.retail_add_movement(uuid,text,numeric,text,uuid),public.retail_close_shift(uuid,numeric) to authenticated;
$retail_source_f24b734005cc1623$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610010001_retail_multistore.sql','f24b734005cc1623cbeb235dd0436522445fce6501ec73999528a8f745ed1cb9','schema');
 end if;
end;
$retail_step_1$;

-- 2/31: 202610020001_catalog_global_and_segmentation.sql
do $retail_step_2$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610020001_catalog_global_and_segmentation.sql') then
  raise notice 'Aplicando 202610020001_catalog_global_and_segmentation.sql';
  execute $retail_source_bca9c54fa75c2a89$
-- ==============================================================================
-- 1. FUNCIÓN AUXILIAR: Actualización automática de timestamp (updated_at)
-- ==============================================================================
create or replace function retail_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function retail_private.set_updated_at() from public, anon;
grant execute on function retail_private.set_updated_at() to authenticated;

-- ==============================================================================
-- PARTE A: TABLA retail_global_catalog (Catálogo Comunitario por EAN)
-- ==============================================================================

-- 1. Creación de la tabla
create table if not exists public.retail_global_catalog (
  -- Clave primaria: código de barras EAN normalizado (entre 4 y 20 caracteres)
  ean_code text primary key check(length(trim(ean_code)) between 4 and 20),
  -- Datos descriptivos básicos del producto
  name text not null check(length(trim(name)) between 1 and 160),
  brand text,
  category_suggestion text,
  emoji text default '📦',
  description text,
  -- Métricas comunitarias de validación y confianza
  contributor_count integer default 1 check(contributor_count >= 1),
  confidence_score numeric(3,2) default 0.50 check(confidence_score between 0.00 and 1.00),
  -- Origen del registro: 'ai' | 'community' | 'verified'
  source text default 'community' check(source in ('ai', 'community', 'verified')),
  -- Metadatos de auditoría temporal
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Índices de optimización de búsqueda
-- Índice GIN para búsqueda full-text en español sobre el nombre del producto
create index if not exists idx_retail_global_catalog_fts
  on public.retail_global_catalog
  using gin(to_tsvector('spanish', name));

-- Índice B-Tree para filtrado por marca comercial
create index if not exists idx_retail_global_catalog_brand
  on public.retail_global_catalog(brand);

-- Índice B-Tree para filtrado por sugerencia de categoría
create index if not exists idx_retail_global_catalog_category_suggestion
  on public.retail_global_catalog(category_suggestion);

-- 3. Trigger para actualizar automáticamente el campo updated_at
drop trigger if exists trg_retail_global_catalog_updated_at on public.retail_global_catalog;
create trigger trg_retail_global_catalog_updated_at
  before update on public.retail_global_catalog
  for each row
  execute function retail_private.set_updated_at();

-- 4. Seguridad de Fila (Row Level Security - RLS)
alter table public.retail_global_catalog enable row level security;

-- Lectura pública: tanto usuarios anónimos como autenticados pueden consultar el catálogo comunitario
drop policy if exists global_catalog_read on public.retail_global_catalog;
create policy global_catalog_read
  on public.retail_global_catalog
  for select
  to anon, authenticated
  using (true);

-- Inserción: únicamente usuarios autenticados pueden registrar nuevos productos comunitarios
drop policy if exists global_catalog_insert on public.retail_global_catalog;
create policy global_catalog_insert
  on public.retail_global_catalog
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- Actualización: usuarios autenticados pueden sugerir mejoras y aportar métricas
drop policy if exists global_catalog_update on public.retail_global_catalog;
create policy global_catalog_update
  on public.retail_global_catalog
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 5. Concesión de privilegios (Grants)
-- Revocar accesos por defecto y conceder permisos específicos
revoke all on public.retail_global_catalog from anon, authenticated;

grant select on public.retail_global_catalog to anon, authenticated;
grant insert on public.retail_global_catalog to authenticated;

-- UPDATE limitado a columnas no críticas (protegiendo ean_code como PK y created_at como auditoría)
grant update(
  name,
  brand,
  category_suggestion,
  emoji,
  description,
  contributor_count,
  confidence_score,
  source
) on public.retail_global_catalog to authenticated;


-- ==============================================================================
-- PARTE B: COLUMNAS NUEVAS Y SEGMENTACIÓN EN retail_products
-- ==============================================================================

-- 1. Agregar nuevas columnas a la tabla de productos por comercio
alter table public.retail_products
  add column if not exists brand text,
  add column if not exists supplier text,
  add column if not exists supplier_code text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists unit_type text not null default 'unit';

-- 2. Restricción check para los valores admitidos en unit_type
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'retail_products_unit_type_check'
  ) then
    alter table public.retail_products
      add constraint retail_products_unit_type_check
      check (unit_type in ('unit', 'kg', 'lt', 'pack', 'box'));
  end if;
end $$;

-- 3. Índices para segmentación, filtrado y ajustes en lote
-- Índice para filtrado de productos por comercio y marca
create index if not exists idx_retail_products_store_brand
  on public.retail_products(store_id, brand);

-- Índice para filtrado de productos por comercio y proveedor/distribuidor
create index if not exists idx_retail_products_store_supplier
  on public.retail_products(store_id, supplier);

-- Índice GIN para búsquedas y filtros por etiquetas múltiples (tags)
create index if not exists idx_retail_products_tags
  on public.retail_products
  using gin(tags);

-- 4. Actualización de permisos: Extender grant update a las nuevas columnas
-- Permite que los roles autorizados (administradores/dueños según RLS de la tienda)
-- puedan modificar los nuevos atributos de producto.
grant update(
  brand,
  supplier,
  supplier_code,
  tags,
  unit_type
) on public.retail_products to authenticated;


-- ==============================================================================
-- PARTE C: FUNCIONES RPC PARA CATÁLOGO GLOBAL (LOOKUP Y CONTRIBUCIÓN)
-- ==============================================================================

-- 1. Búsqueda comunitaria por código EAN
create or replace function public.retail_lookup_ean(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rec record;
begin
  select
    ean_code,
    name,
    brand,
    category_suggestion,
    emoji,
    source,
    confidence_score
  into v_rec
  from public.retail_global_catalog
  where ean_code = trim(p_code)
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'name', v_rec.name,
    'brand', v_rec.brand,
    'category_suggestion', v_rec.category_suggestion,
    'emoji', v_rec.emoji,
    'source', v_rec.source,
    'confidence_score', v_rec.confidence_score
  );
end;
$$;

revoke all on function public.retail_lookup_ean(text) from public;
grant execute on function public.retail_lookup_ean(text) to anon, authenticated;

-- 2. Contribución comunitaria al catálogo cuando se guarda un producto
create or replace function public.retail_contribute_catalog(
  p_code text,
  p_name text,
  p_brand text default null,
  p_category text default null,
  p_emoji text default '📦',
  p_source text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p_code);
  v_name text := trim(p_name);
  v_rec record;
  v_new_count integer;
  v_new_conf numeric(3,2);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Iniciá sesión para contribuir');
  end if;

  if length(v_code) not between 4 and 20 or length(v_name) not between 1 and 160 then
    return jsonb_build_object('error', 'Datos de producto inválidos');
  end if;

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      case when p_source in ('ai','community','verified') then p_source else 'community' end,
      1, 0.50
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1, 'confidence_score', 0.50);
  else
    v_new_count := v_rec.contributor_count + 1;
    v_new_conf := least(1.00, round(0.50 + (v_new_count * 0.05), 2));

    update public.retail_global_catalog
    set
      contributor_count = v_new_count,
      confidence_score = v_new_conf,
      -- No sobrescribir el nombre si el producto ya está verificado
      name = case when v_rec.confidence_score >= 0.90 then v_rec.name else v_name end,
      brand = coalesce(nullif(trim(p_brand), ''), v_rec.brand),
      category_suggestion = coalesce(nullif(trim(p_category), ''), v_rec.category_suggestion),
      emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);
  end if;
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public, anon;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

-- Notificar a PostgREST para recargar la caché de esquemas inmediatamente
notify pgrst, 'reload schema';

$retail_source_bca9c54fa75c2a89$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610020001_catalog_global_and_segmentation.sql','bca9c54fa75c2a8940b4f28c76aaab415b1740330c2a4a334dad2fef5beca292','schema');
 end if;
end;
$retail_step_2$;

-- 3/31: 202610070001_harden_global_catalog_immutability.sql
do $retail_step_3$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610070001_harden_global_catalog_immutability.sql') then
  raise notice 'Aplicando 202610070001_harden_global_catalog_immutability.sql';
  execute $retail_source_f3ff59ec39b6e574$
create or replace function public.retail_contribute_catalog(
  p_code text,
  p_name text,
  p_brand text default null,
  p_category text default null,
  p_emoji text default '📦',
  p_source text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p_code);
  v_name text := trim(p_name);
  v_rec record;
  v_new_count integer;
  v_new_conf numeric(3,2);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Iniciá sesión para contribuir');
  end if;

  if length(v_code) not between 4 and 20 or length(v_name) not between 1 and 160 then
    return jsonb_build_object('error', 'Datos de producto inválidos');
  end if;

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    -- Si no existe en el catálogo global, se da de alta como producto nuevo
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      case when p_source in ('ai','community','verified') then p_source else 'community' end,
      1, case when p_source = 'verified' then 1.00 else 0.50 end
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1, 'confidence_score', 0.50);
  end if;

  -- 1. BLINDAJE OFICIAL: Si el producto está verificado o tiene alta confianza, sus datos son INTOCABLES
  if v_rec.source = 'verified' or coalesce(v_rec.confidence_score, 0) >= 0.90 then
    update public.retail_global_catalog
    set
      contributor_count = v_rec.contributor_count + 1,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object(
      'action', 'verified_protected',
      'message', 'El producto está verificado y sus datos oficiales no pueden ser alterados',
      'contributor_count', v_rec.contributor_count + 1
    );
  end if;

  -- 2. REGISTRO COMUNITARIO: Nunca sobreescribir datos existentes, solo completar campos vacíos (NULL)
  v_new_count := v_rec.contributor_count + 1;
  v_new_conf := least(0.89, round(0.50 + (v_new_count * 0.05), 2));

  update public.retail_global_catalog
  set
    contributor_count = v_new_count,
    confidence_score = v_new_conf,
    -- Mantener nombre original si ya existe
    name = coalesce(nullif(trim(v_rec.name), ''), v_name),
    -- Mantener marca original; solo rellenar si en la base estaba NULL o vacía
    brand = coalesce(nullif(trim(v_rec.brand), ''), nullif(trim(p_brand), '')),
    -- Mantener categoría original; solo rellenar si en la base estaba NULL o vacía
    category_suggestion = coalesce(nullif(trim(v_rec.category_suggestion), ''), nullif(trim(p_category), '')),
    -- Mantener emoji existente si ya tiene uno específico
    emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
    updated_at = now()
  where ean_code = v_code;

  return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);

exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

$retail_source_f3ff59ec39b6e574$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610070001_harden_global_catalog_immutability.sql','f3ff59ec39b6e5744cb059f242cfdaf0c234f1ab34c4bae2ec93ca10f13594f5','schema');
 end if;
end;
$retail_step_3$;

-- 4/31: 202610130001_branches_prices_ledgers.sql
do $retail_step_4$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610130001_branches_prices_ledgers.sql') then
  raise notice 'Aplicando 202610130001_branches_prices_ledgers.sql';
  execute $retail_source_e86fe143f886cd85$
create table public.retail_branches (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80), address text not null default '',
 is_default boolean not null default false, unique(store_id,id), unique(store_id,name)
);
create unique index retail_default_branch on public.retail_branches(store_id) where is_default;
create table public.retail_price_lists (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80),
 adjustment numeric(8,2) not null default 0 check(adjustment > -100 and adjustment <= 10000),
 active boolean not null default true, unique(store_id,id), unique(store_id,name)
);
create table public.retail_price_overrides (
 store_id uuid not null, list_id uuid not null, product_id uuid not null,
 price numeric(14,2) not null check(price > 0 and price < 1000000000000),
 primary key(list_id,product_id),
 foreign key(store_id,list_id) references public.retail_price_lists(store_id,id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create table public.retail_ledgers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80),
 is_default boolean not null default false, active boolean not null default true,
 check(not is_default or active), unique(store_id,id), unique(store_id,name)
);
create unique index retail_default_ledger on public.retail_ledgers(store_id) where is_default;

create function retail_private.initialize_location() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_branches(store_id,name,is_default) values(new.id,'Principal',true);
 insert into public.retail_ledgers(store_id,name,is_default) values(new.id,'General',true);
 insert into public.retail_ledgers(store_id,name) values(new.id,'Otras ventas');
 return new;
end $$;
revoke all on function retail_private.initialize_location() from public,anon,authenticated;
create trigger retail_initialize_location after insert on public.retail_stores for each row execute function retail_private.initialize_location();
insert into public.retail_branches(store_id,name,is_default) select id,'Principal',true from public.retail_stores;
insert into public.retail_ledgers(store_id,name,is_default) select id,'General',true from public.retail_stores;
insert into public.retail_ledgers(store_id,name) select id,'Otras ventas' from public.retail_stores;

alter table public.retail_registers add column branch_id uuid;
update public.retail_registers r set branch_id=b.id from public.retail_branches b where b.store_id=r.store_id and b.is_default;
alter table public.retail_registers alter column branch_id set not null;
alter table public.retail_registers add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
alter table public.retail_registers drop constraint retail_registers_store_id_name_key;
alter table public.retail_registers add unique(branch_id,name);
create function retail_private.default_register_branch() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.branch_id is null then select id into new.branch_id from public.retail_branches where store_id=new.store_id and is_default; end if;
 return new;
end $$;
revoke all on function retail_private.default_register_branch() from public,anon,authenticated;
create trigger retail_default_register_branch before insert on public.retail_registers for each row execute function retail_private.default_register_branch();

alter table public.retail_sales
 add column branch_id uuid, add column branch_name text,
 add column register_name text,
 add column price_list_id uuid, add column price_list_name text not null default 'Lista madre',
 add column ledger_id uuid, add column ledger_name text,
 add column invoice_reference text, add column invoiced_at timestamptz,
 add column invoiced_by uuid references auth.users(id),
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,price_list_id) references public.retail_price_lists(store_id,id),
 add foreign key(store_id,ledger_id) references public.retail_ledgers(store_id,id),
 add check(invoice_reference is null or length(trim(invoice_reference)) between 1 and 120);
update public.retail_sales s set branch_id=r.branch_id,branch_name=b.name,register_name=r.name
 from public.retail_shifts sh join public.retail_registers r on r.id=sh.register_id join public.retail_branches b on b.id=r.branch_id where sh.id=s.shift_id;
update public.retail_sales s set ledger_id=l.id,ledger_name=l.name from public.retail_ledgers l where l.store_id=s.store_id and l.is_default;
alter table public.retail_sales alter column branch_id set not null, alter column ledger_id set not null,
 alter column branch_name set not null, alter column register_name set not null, alter column ledger_name set not null;
create index retail_sales_reporting on public.retail_sales(store_id,created_at,id);

do $$ declare t text; begin
 foreach t in array array['retail_branches','retail_price_lists','retail_price_overrides','retail_ledgers'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('create policy member_read on public.%I for select to authenticated using(retail_private.role_for(store_id) is not null)',t);
 execute format('create policy manager_insert on public.%I for insert to authenticated with check(retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 execute format('create policy manager_update on public.%I for update to authenticated using(retail_private.role_for(store_id) in (''owner'',''admin'')) with check(retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 end loop;
end $$;
grant update(name,address) on public.retail_branches to authenticated;
grant update(name,adjustment,active) on public.retail_price_lists to authenticated;
grant update(name,active) on public.retail_ledgers to authenticated;
grant update,delete on public.retail_price_overrides to authenticated;
create policy manager_delete on public.retail_price_overrides for delete to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));

-- Attaching an externally issued invoice is append-only and identifies the operator.
create function public.retail_attach_invoice(p_sale uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 select * into s from public.retail_sales where id=p_sale for update;
 if s.id is null or coalesce(retail_private.role_for(s.store_id),'') not in ('owner','admin') then raise exception 'Sin permiso para asociar comprobantes'; end if;
 if s.invoice_reference is not null then
  if s.invoice_reference=trim(p_reference) then return; end if;
  raise exception 'La venta ya tiene un comprobante asociado';
 end if;
 if p_reference is null or length(trim(p_reference)) not between 1 and 120 then raise exception 'Ingresá la referencia del comprobante emitido'; end if;
 update public.retail_sales set invoice_reference=trim(p_reference),invoiced_at=now(),invoiced_by=auth.uid() where id=p_sale;
end $$;
revoke all on function public.retail_attach_invoice(uuid,text) from public,anon;
grant execute on function public.retail_attach_invoice(uuid,text) to authenticated;

drop function public.retail_checkout(uuid,uuid,text,numeric,jsonb);
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id <> p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and
  ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   v_expected := p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected := coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := v_expected; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name);
 return p_request;
end $$;

revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid) to authenticated;

-- Update the mother list atomically; never insert incomplete products via upsert.
create function public.retail_update_prices(p_store uuid,p_updates jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_price numeric;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para cambiar precios'; end if;
 if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'Precios inválidos'; end if;
 if jsonb_array_length(p_updates) not between 1 and 10000 then raise exception 'Cantidad de cambios inválida'; end if;
 perform id from public.retail_products where store_id=p_store and id in (select (x->>'id')::uuid from jsonb_array_elements(p_updates) x) order by id for update;
 for item in select value from jsonb_array_elements(p_updates) loop
  v_price := (item->>'price')::numeric;
  if v_price is null or v_price <= 0 or v_price >= 1000000000000 or v_price::text in ('NaN','Infinity','-Infinity') or round(v_price,2)<=0 then raise exception 'Precio inválido'; end if;
  update public.retail_products set price=round(v_price,2) where id=(item->>'id')::uuid and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
 end loop;
end $$;
revoke all on function public.retail_update_prices(uuid,jsonb) from public,anon;
grant execute on function public.retail_update_prices(uuid,jsonb) to authenticated;
$retail_source_e86fe143f886cd85$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610130001_branches_prices_ledgers.sql','e86fe143f886cd858443bde5917d43095126a4beca788c866f2589bcee94509b','schema');
 end if;
end;
$retail_step_4$;

-- 5/31: 202610140001_web_push.sql
do $retail_step_5$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610140001_web_push.sql') then
  raise notice 'Aplicando 202610140001_web_push.sql';
  execute $retail_source_918efe9a5d3313e3$
create table public.retail_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 20 and 2048),
 p256dh text not null, auth text not null,
 low_stock boolean not null default true, shift_closed boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_test_at timestamptz
);
create table public.retail_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.retail_push_subscriptions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 kind text not null check(kind in ('low_stock','shift_closed','test')),
 event_key text not null, created_at timestamptz not null default now(),
 available_at timestamptz not null default now(), attempts integer not null default 0,
 lease uuid, locked_at timestamptz, sent_at timestamptz, last_error text,
 unique(subscription_id,event_key)
);
create index on public.retail_push_subscriptions(store_id);
create index on public.retail_push_deliveries(available_at) where sent_at is null and attempts < 5;
alter table public.retail_push_subscriptions enable row level security;
alter table public.retail_push_deliveries enable row level security;
revoke all on public.retail_push_subscriptions,public.retail_push_deliveries from public,anon,authenticated;
grant select on public.retail_push_subscriptions to authenticated;
grant all on public.retail_push_subscriptions,public.retail_push_deliveries to service_role;
create policy own_device on public.retail_push_subscriptions for select to authenticated
 using(user_id=auth.uid() and retail_private.role_for(store_id) in ('owner','admin'));

create function public.retail_save_push(p_store uuid,p_endpoint text,p_p256dh text,p_auth text,
 p_low_stock boolean,p_shift_closed boolean) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_old public.retail_push_subscriptions;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo propietarios y administradores pueden activar estos avisos';
 end if;
 -- Only real browser push services, never arbitrary URLs or internal hosts.
 if p_endpoint !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
  or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$'
  or p_endpoint is null or p_p256dh is null or p_auth is null then raise exception 'Suscripción push inválida'; end if;
 -- Serialize enrollment per endpoint and user (also bounds device count).
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_endpoint,1));
 select * into v_old from public.retail_push_subscriptions where endpoint=p_endpoint for update;
 if (v_old.id is null or v_old.user_id<>auth.uid()) and (select count(*) from public.retail_push_subscriptions where user_id=auth.uid())>=20 then
  raise exception 'Alcanzaste el máximo de 20 dispositivos';
 end if;
 if v_old.id is not null and (v_old.user_id<>auth.uid() or v_old.store_id<>p_store) then
  -- Account/store changes invalidate queued messages from the previous recipient.
  delete from public.retail_push_subscriptions where id=v_old.id;
 end if;
 insert into public.retail_push_subscriptions(user_id,store_id,endpoint,p256dh,auth,low_stock,shift_closed)
 values(auth.uid(),p_store,p_endpoint,p_p256dh,p_auth,p_low_stock,p_shift_closed)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,
 low_stock=excluded.low_stock,shift_closed=excluded.shift_closed,updated_at=now()
 returning id into v_id;
 return v_id;
end $$;

create function public.retail_remove_push(p_endpoint text) returns void
 language sql security definer set search_path='' as $$
 delete from public.retail_push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();
$$;

create function public.retail_request_push_test(p_store uuid,p_endpoint text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare s public.retail_push_subscriptions; v_id uuid;
begin
 select * into s from public.retail_push_subscriptions where endpoint=p_endpoint and store_id=p_store
 and user_id=auth.uid() for update;
 if s.id is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Activá los avisos de este comercio primero'; end if;
 if s.last_test_at>now()-interval '1 minute' then raise exception 'Esperá un minuto antes de repetir la prueba'; end if;
 update public.retail_push_subscriptions set last_test_at=now() where id=s.id;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 values(s.id,s.user_id,s.store_id,'test',gen_random_uuid()::text) returning id into v_id;
 return v_id;
end $$;

create function retail_private.enqueue_push() returns trigger
 language plpgsql security definer set search_path='' as $$
declare v_kind text; v_key text;
begin
 if tg_table_name='retail_products' then
  if not new.active or new.stock>new.min_stock or (old.active and old.stock<=old.min_stock) then return new; end if;
  -- Group simultaneous low-stock crossings into one generic store notice per minute.
  v_kind:='low_stock'; v_key:='stock:'||new.store_id::text||':'||date_trunc('minute',now())::text;
 else
  if new.closed_at is null or old.closed_at is not null then return new; end if;
  v_kind:='shift_closed'; v_key:='shift:'||new.id::text;
 end if;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 select s.id,s.user_id,s.store_id,v_kind,v_key from public.retail_push_subscriptions s
 join public.retail_members m on m.store_id=s.store_id and m.user_id=s.user_id
 where s.store_id=new.store_id and m.role in ('owner','admin')
 and ((v_kind='low_stock' and s.low_stock) or (v_kind='shift_closed' and s.shift_closed))
 on conflict(subscription_id,event_key) do nothing;
 return new;
end $$;
create trigger retail_stock_push after update of stock,min_stock,active on public.retail_products
 for each row execute function retail_private.enqueue_push();
create trigger retail_shift_push after update of closed_at on public.retail_shifts
 for each row execute function retail_private.enqueue_push();

-- A short lease permits retries after worker failure without parallel claims.
create function public.retail_claim_push(p_only uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 delete from public.retail_push_deliveries where created_at<now()-interval '7 days';
 with candidates as (
  select d.id from public.retail_push_deliveries d where d.sent_at is null and d.attempts<5
  and d.available_at<=now() and d.created_at>now()-interval '24 hours'
  and (d.locked_at is null or d.locked_at<now()-interval '2 minutes')
  and (p_only is null or d.id=p_only) order by d.created_at for update skip locked limit 10
 ), claimed as (
  update public.retail_push_deliveries d set attempts=d.attempts+1,locked_at=now(),lease=gen_random_uuid()
  from candidates c where d.id=c.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object(
  'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
  'authorized',exists(select 1 from public.retail_members m where m.store_id=c.store_id and m.user_id=c.user_id and m.role in ('owner','admin'))
   and s.user_id=c.user_id and s.store_id=c.store_id
   and (c.kind='test' or (c.kind='low_stock' and s.low_stock) or (c.kind='shift_closed' and s.shift_closed))
  )), '[]'::jsonb) into result from claimed c join public.retail_push_subscriptions s on s.id=c.subscription_id;
 return result;
end $$;
revoke all on function retail_private.enqueue_push() from public,anon,authenticated;
revoke all on function public.retail_save_push(uuid,text,text,text,boolean,boolean),public.retail_remove_push(text),
 public.retail_request_push_test(uuid,text),public.retail_claim_push(uuid) from public,anon,authenticated;
grant execute on function public.retail_save_push(uuid,text,text,text,boolean,boolean),public.retail_remove_push(text),
 public.retail_request_push_test(uuid,text) to authenticated;
grant execute on function public.retail_claim_push(uuid) to service_role;
$retail_source_918efe9a5d3313e3$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610140001_web_push.sql','918efe9a5d3313e3dc695430c93c0c035acdf97f9b20fcc4c387b444a8737964','schema');
 end if;
end;
$retail_step_5$;

-- 6/31: 202610150001_cashier_access.sql
do $retail_step_6$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610150001_cashier_access.sql') then
  raise notice 'Aplicando 202610150001_cashier_access.sql';
  execute $retail_source_a30006ceabfa2ca5$
alter table public.retail_members
 add column branch_id uuid,
 add column register_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,register_id) references public.retail_registers(store_id,id);
alter table public.retail_invitations
 add column branch_id uuid,
 add column register_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,register_id) references public.retail_registers(store_id,id);

create function retail_private.can_use_register(p_store uuid,p_register uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m join public.retail_registers r on r.store_id=m.store_id
 where m.store_id=p_store and m.user_id=auth.uid() and r.id=p_register
 and (m.role in ('owner','admin') or ((m.branch_id is null or m.branch_id=r.branch_id) and (m.register_id is null or m.register_id=r.id))));
$$;
revoke all on function retail_private.can_use_register(uuid,uuid) from public,anon;
grant execute on function retail_private.can_use_register(uuid,uuid) to authenticated;

drop policy member_read on public.retail_members;
create policy member_read on public.retail_members for select to authenticated
 using(user_id=auth.uid() or retail_private.role_for(store_id) in ('owner','admin'));
drop policy member_read on public.retail_registers;
create policy member_read on public.retail_registers for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin') or retail_private.can_use_register(store_id,id));
drop policy member_read on public.retail_branches;
create policy member_read on public.retail_branches for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or exists (
 select 1 from public.retail_members m where m.store_id=retail_branches.store_id and m.user_id=auth.uid()
 and (m.branch_id is null or m.branch_id=retail_branches.id)
 and (m.register_id is null or exists(select 1 from public.retail_registers r where r.id=m.register_id and r.branch_id=retail_branches.id))));
drop policy member_read on public.retail_shifts;
create policy member_read on public.retail_shifts for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and opened_by=auth.uid()));
drop policy member_read on public.retail_sales;
create policy member_read on public.retail_sales for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and created_by=auth.uid()));
drop policy member_read on public.retail_movements;
create policy member_read on public.retail_movements for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and created_by=auth.uid()));
create policy admin_read_cashier_invites on public.retail_invitations for select to authenticated
 using(retail_private.role_for(store_id)='admin' and role='cashier');
create index retail_shifts_operator on public.retail_shifts(store_id,opened_by);
create index retail_sales_operator on public.retail_sales(store_id,created_by);
create index retail_movements_operator on public.retail_movements(store_id,created_by);

-- Read current verified account emails without exposing auth.users to clients.
create function public.retail_team(p_store uuid)
returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para consultar el equipo'; end if;
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id
 from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;

-- A register selection always implies its branch. null/null means unrestricted.
create function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para asignar cajeros'; end if;
 if p_pending then
  select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
  select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if v_role is distinct from 'cashier' then raise exception 'Solo se pueden asignar permisos a cajeros de este comercio'; end if;
 v_branch := p_branch;
 if p_register is not null then
  select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
  if v_branch is null then raise exception 'Caja no disponible'; end if;
  if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then
  update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
  if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id
    where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null
    and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then
   raise exception 'El cajero debe cerrar su turno actual antes de cambiar a otra sucursal o caja';
  end if;
  update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 -- Serialize acceptance with editing the pending assignment.
 perform 1 from public.retail_invitations where email=v_email order by id for update;
 insert into public.retail_members(store_id,user_id,role,branch_id,register_id)
 select store_id,auth.uid(),role,branch_id,register_id from public.retail_invitations where email=v_email
 on conflict(store_id,user_id) do nothing;
 get diagnostics v_count = row_count;
 delete from public.retail_invitations where email=v_email;
 return v_count;
end $$;

create or replace function public.retail_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if not retail_private.can_use_register(p_store,p_register) then raise exception 'Sin acceso a esta caja'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then raise exception 'Caja no disponible'; end if;
 if p_opening is null or p_opening<0 or p_opening::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
 insert into public.retail_shifts(store_id,register_id,opened_by,opening_cash) values(p_store,p_register,auth.uid(),p_opening) returning id into v_id;
 return v_id;
end $$;

create or replace function retail_private.check_shift(p_shift uuid) returns public.retail_shifts language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; r text;
begin
 select * into s from public.retail_shifts where id=p_shift;
 perform 1 from public.retail_members where store_id=s.store_id and user_id=auth.uid() for share;
 select * into s from public.retail_shifts where id=p_shift for update;
 r := retail_private.role_for(s.store_id);
 if s.id is null or r is null then raise exception 'Turno no disponible'; end if;
 if s.closed_at is not null then raise exception 'El turno ya está cerrado'; end if;
 if s.opened_by<>auth.uid() and r not in ('owner','admin') then raise exception 'Esta caja está abierta por otro usuario'; end if;
 if not retail_private.can_use_register(s.store_id,s.register_id) then raise exception 'Sin acceso a esta caja'; end if;
 return s;
end $$;

-- Only disclose occupancy, never the other operator's identity, amounts or activity.
create function public.retail_register_availability(p_store uuid)
returns table(register_id uuid,occupied boolean) language sql stable security definer set search_path='' as $$
 select r.id,exists(select 1 from public.retail_shifts s where s.register_id=r.id and s.closed_at is null)
 from public.retail_registers r where r.store_id=p_store and r.active and retail_private.can_use_register(p_store,r.id);
$$;

-- Reconciliation needs the whole balance of one's own shift, including any manager
-- adjustments, while the underlying rows remain private to their authors/managers.
create function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 select s.opening_cash
  + coalesce((select sum(total) from public.retail_sales where shift_id=s.id and payment_method='Efectivo'),0)
  + coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0)
 into v_expected;
 return v_expected;
end $$;

revoke all on function public.retail_team(uuid),public.retail_set_cashier_access(uuid,uuid,uuid,uuid,boolean),public.retail_register_availability(uuid),public.retail_shift_balance(uuid) from public,anon;
grant execute on function public.retail_team(uuid),public.retail_set_cashier_access(uuid,uuid,uuid,uuid,boolean),public.retail_register_availability(uuid),public.retail_shift_balance(uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_a30006ceabfa2ca5$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610150001_cashier_access.sql','a30006ceabfa2ca5abd0116ddf06f3f79d042bae913fd59c25efb5a918a83017','schema');
 end if;
end;
$retail_step_6$;

-- 7/31: 202610160001_offline_pos.sql
do $retail_step_7$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160001_offline_pos.sql') then
  raise notice 'Aplicando 202610160001_offline_pos.sql';
  execute $retail_source_770c916876fcdabf$
alter table public.retail_sales drop constraint retail_sales_payment_method_check;
alter table public.retail_sales add check(payment_method in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito'));
alter table public.retail_sales add column payments jsonb, add column cash_amount numeric(14,2), add column recorded_at timestamptz not null default now();
update public.retail_sales set payments=jsonb_build_array(jsonb_build_object('method',payment_method,'amount',total)),cash_amount=case when payment_method='Efectivo' then total else 0 end;
alter table public.retail_sales alter column payments set not null,alter column cash_amount set not null;
alter table public.retail_sales add check(cash_amount>=0 and cash_amount<=total);
alter table public.retail_movements add column recorded_at timestamptz not null default now();
drop function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid);
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric; v_parts jsonb; v_cash numeric; v_sum numeric; v_methods integer;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id <> p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and
  ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   v_expected := p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected := coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := v_expected; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 v_parts := coalesce(p_payments,jsonb_build_array(jsonb_build_object('method',p_method,'amount',v_total)));
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Desglose de pago inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito') or (x->>'amount') is null or (x->>'amount')::numeric<=0 or (x->>'amount')::numeric::text in ('NaN','Infinity','-Infinity') or round((x->>'amount')::numeric,2)<>(x->>'amount')::numeric) then raise exception 'Importe o medio de pago inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method') into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_total or v_methods<>jsonb_array_length(v_parts) or (p_method='Mixto' and v_methods<2) or (p_method<>'Mixto' and (v_methods<>1 or v_parts->0->>'method'<>p_method)) then raise exception 'El desglose debe coincidir con el total y el medio elegido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name,payments,cash_amount)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name,v_parts,v_cash);
 return p_request;
end $$;

revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) to authenticated;

create or replace function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 select s.opening_cash+coalesce((select sum(cash_amount) from public.retail_sales where shift_id=s.id),0)
 +coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0) into v_expected;
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

create or replace function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 select s.opening_cash
  + coalesce((select sum(cash_amount) from public.retail_sales where shift_id=s.id),0)
  + coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0)
 into v_expected;
 return v_expected;
end $$;


notify pgrst,'reload schema';
$retail_source_770c916876fcdabf$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160001_offline_pos.sql','770c916876fcdabf64104718e442e7b424f343e6787bfc742c4164cccf435313','schema');
 end if;
end;
$retail_step_7$;

-- 8/31: 202610160002_offline_queue.sql
do $retail_step_8$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160002_offline_queue.sql') then
  raise notice 'Aplicando 202610160002_offline_queue.sql';
  execute $retail_source_ffb2f924480094f8$
create table public.retail_quick_products (
 store_id uuid not null, branch_id uuid not null, product_id uuid not null, position integer not null check(position between 0 and 19),
 primary key(branch_id,product_id), unique(branch_id,position),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
alter table public.retail_quick_products enable row level security;
create policy member_read on public.retail_quick_products for select to authenticated using (
 exists(select 1 from public.retail_branches b where b.id=branch_id and b.store_id=retail_quick_products.store_id));
grant select on public.retail_quick_products to authenticated;

create function public.retail_save_quick_products(p_store uuid,p_branch uuid,p_products uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede personalizar la botonera'; end if;
 perform 1 from public.retail_branches where id=p_branch and store_id=p_store for update;
 if not found then raise exception 'Sucursal no disponible'; end if;
 if p_products is null or cardinality(p_products)>20 or
  (select count(distinct id) from unnest(p_products) id)<>cardinality(p_products) or
  exists(select 1 from unnest(p_products) as selected(product_id) where not exists(select 1 from public.retail_products p where p.id=selected.product_id and p.store_id=p_store and p.active)) then raise exception 'Elegí hasta 20 productos distintos de este comercio'; end if;
 delete from public.retail_quick_products where branch_id=p_branch;
 insert into public.retail_quick_products(store_id,branch_id,product_id,position) select p_store,p_branch,id,n-1 from unnest(p_products) with ordinality as t(id,n);
end $$;
create function public.retail_popular_products(p_store uuid,p_branch uuid) returns table(product_id uuid,units numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) or
  not exists(select 1 from public.retail_registers r where r.branch_id=p_branch and retail_private.can_use_register(p_store,r.id)) then raise exception 'Sin acceso a la sucursal'; end if;
 -- Only aggregate product rotation; never expose tickets, operators or amounts.
 return query select (i->>'productId')::uuid,sum((i->>'qty')::numeric)
 from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
 where s.store_id=p_store and s.branch_id=p_branch and s.created_at>=now()-interval '30 days' and i->>'productId' is not null
 group by i->>'productId' order by sum((i->>'qty')::numeric) desc limit 20;
end $$;

create table public.retail_stock_movements (
 operation_id uuid not null, product_id uuid not null, store_id uuid not null, user_id uuid not null references auth.users(id),
 delta integer not null, cost numeric(14,2), occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
 primary key(operation_id,product_id), foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
alter table public.retail_stock_movements enable row level security;
create policy manager_read on public.retail_stock_movements for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_stock_movements from public,anon,authenticated;
grant select on public.retail_stock_movements to authenticated;

create table public.retail_sync_receipts (
 id uuid primary key, user_id uuid not null references auth.users(id), store_id uuid not null references public.retail_stores(id),
 payload jsonb not null, result jsonb not null, synced_at timestamptz not null default now()
);
alter table public.retail_sync_receipts enable row level security;
-- Deliberately no direct client access. Receipts are written with the operation in one transaction.
revoke all on public.retail_sync_receipts from public,anon,authenticated;
create function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if coalesce(retail_private.role_for(v_store),'') not in ('owner','admin') then raise exception 'Sin permiso para registrar stock'; end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost) where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id);
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
revoke all on function public.retail_sync_operation(jsonb),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_popular_products(uuid,uuid) from public,anon;
grant execute on function public.retail_sync_operation(jsonb),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_popular_products(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_ffb2f924480094f8$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160002_offline_queue.sql','ffb2f924480094f8255c3bd1105ac834381678058bb65ff6e63ec433b4710ab0','schema');
 end if;
end;
$retail_step_8$;

-- 9/31: 202610160003_pack_size.sql
do $retail_step_9$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160003_pack_size.sql') then
  raise notice 'Aplicando 202610160003_pack_size.sql';
  execute $retail_source_e8f486a53e369954$
alter table public.retail_products
 add column pack_size integer default null check(pack_size is null or pack_size >= 1);
-- Product updates use explicit column grants and the existing manager RLS policy.
grant update(pack_size) on public.retail_products to authenticated;
notify pgrst,'reload schema';
$retail_source_e8f486a53e369954$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160003_pack_size.sql','e8f486a53e3699543bb33b819986d3e96c57bbfb112cb039428e534507228c6b','schema');
 end if;
end;
$retail_step_9$;

-- 10/31: 202610160004_margin_groups.sql
do $retail_step_10$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160004_margin_groups.sql') then
  raise notice 'Aplicando 202610160004_margin_groups.sql';
  execute $retail_source_8a5790ed3a1371e6$
-- May be rerun to finish a manual installation without deleting existing values.
alter table public.retail_products
 add column if not exists margin_group text default 'standard';
alter table public.retail_products alter column margin_group set default 'standard';

do $migration$
begin
 if not exists (
  select 1 from pg_catalog.pg_constraint
  where conrelid='public.retail_products'::regclass
    and conname='retail_products_margin_group_check'
 ) then
  alter table public.retail_products
   add constraint retail_products_margin_group_check check(margin_group in ('standard','low_margin'));
 end if;
end;
$migration$;
grant update(margin_group) on public.retail_products to authenticated;

-- A ticket may contain both groups. Capture the server's product data per line,
-- independently of its sales ledger, so later edits do not rewrite profitability.
create or replace function retail_private.snapshot_margin_items() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_product public.retail_products; v_items jsonb:='[]'::jsonb;
begin
 for v_item in select value from jsonb_array_elements(new.items) loop
  if v_item->>'productId' is not null then
   select * into v_product from public.retail_products where id=(v_item->>'productId')::uuid and store_id=new.store_id;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   v_item:=v_item || jsonb_build_object('marginGroup',coalesce(v_product.margin_group,'standard'),'unitCost',nullif(v_product.cost,0));
  else
   v_item:=v_item || jsonb_build_object('marginGroup','standard','unitCost',null);
  end if;
  v_items:=v_items || jsonb_build_array(v_item);
 end loop;
 new.items:=v_items;
 return new;
end $$;
revoke all on function retail_private.snapshot_margin_items() from public,anon,authenticated;
-- Recreate this migration's trigger atomically; existing sales are untouched.
drop trigger if exists retail_snapshot_margin_items on public.retail_sales;
create trigger retail_snapshot_margin_items before insert on public.retail_sales
 for each row execute function retail_private.snapshot_margin_items();
notify pgrst,'reload schema';
$retail_source_8a5790ed3a1371e6$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160004_margin_groups.sql','8a5790ed3a1371e6c0aa57f46b68b2fe0af74efd79a3650cfa7ced54b876cc86','schema');
 end if;
end;
$retail_step_10$;

-- 11/31: 202610160005_branch_price_rules.sql
do $retail_step_11$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160005_branch_price_rules.sql') then
  raise notice 'Aplicando 202610160005_branch_price_rules.sql';
  execute $retail_source_7899d29739b25999$
alter table public.retail_price_lists add column branch_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
grant update(branch_id) on public.retail_price_lists to authenticated;
-- Global lists remain unlimited. A branch has one unambiguous active default.
create unique index retail_one_active_price_list_per_branch
 on public.retail_price_lists(store_id,branch_id) where active and branch_id is not null;

-- Existing member_read and manager_insert/update policies continue to enforce
-- store membership and owner/admin writes, including the new branch_id column.
create function public.retail_active_price_list_for_branch(p_store uuid,p_branch uuid)
returns uuid language plpgsql stable security invoker set search_path='' as $$
declare v_list uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 select id into v_list from public.retail_price_lists where store_id=p_store and branch_id=p_branch and active;
 return v_list;
end $$;
revoke all on function public.retail_active_price_list_for_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_active_price_list_for_branch(uuid,uuid) to authenticated;

-- Runs inside checkout's transaction (also when syncing offline). Any exception
-- rolls back stock, payment and sale together. Existing idempotent retries remain valid.
create function retail_private.enforce_branch_price_rule() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_list public.retail_price_lists; v_default uuid;
begin
 if new.price_list_id is not null then
  select * into v_list from public.retail_price_lists where id=new.price_list_id and store_id=new.store_id and active for share;
  if not found or (v_list.branch_id is not null and v_list.branch_id<>new.branch_id) then
   raise exception 'La lista de precios no está disponible para esta sucursal';
  end if;
 end if;
 if retail_private.role_for(new.store_id)='cashier' then
  v_default:=public.retail_active_price_list_for_branch(new.store_id,new.branch_id);
  if new.price_list_id is distinct from v_default then raise exception 'Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar'; end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.enforce_branch_price_rule() from public,anon,authenticated;
create trigger retail_enforce_branch_price_rule before insert on public.retail_sales
 for each row execute function retail_private.enforce_branch_price_rule();
notify pgrst,'reload schema';
$retail_source_7899d29739b25999$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160005_branch_price_rules.sql','7899d29739b25999d24e879b18ed53f8794628fe852743c7916b46d4db5b16e1','schema');
 end if;
end;
$retail_step_11$;

-- 12/31: 202610190001_justified_withdrawal.sql
do $retail_step_12$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190001_justified_withdrawal.sql') then
  raise notice 'Aplicando 202610190001_justified_withdrawal.sql';
  execute $retail_source_029b5843eacab94f$
alter table public.retail_movements
 add column category text not null default 'general' check(category in ('general','supplier_payment','other')),
 add column voucher_url text,
 add column supplier_name text,
 add constraint retail_movement_supplier_details check (
  (type='RETIRO' or category='general') and
  (supplier_name is null or length(trim(supplier_name)) between 1 and 160) and
  (category<>'supplier_payment' or (type='RETIRO' and nullif(trim(supplier_name),'') is not null and nullif(trim(voucher_url),'') is not null))
 );

-- No public objects, no overwrite/delete policies. Receipts are immutable for clients.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('retail-vouchers','retail-vouchers',false,10485760,array[
 'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','image/bmp','image/tiff','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create function retail_private.can_upload_voucher(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(p_name,'/');
 v_uuid text:='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
 if auth.uid() is null or coalesce(array_length(parts,1),0)<>3 or parts[1]!~v_uuid or parts[2]!~v_uuid or
  parts[3]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif|pdf)$' then return false; end if;
 return exists(select 1 from public.retail_shifts s where s.store_id=parts[1]::uuid and s.id=parts[2]::uuid and s.closed_at is null
  and retail_private.role_for(s.store_id) is not null
  and (retail_private.role_for(s.store_id) in ('owner','admin') or
   (s.opened_by=auth.uid() and retail_private.can_use_register(s.store_id,s.register_id))));
end $$;
create function retail_private.can_read_voucher(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1)
  and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function retail_private.can_upload_voucher(text),retail_private.can_read_voucher(text) from public,anon;
grant execute on function retail_private.can_upload_voucher(text),retail_private.can_read_voucher(text) to authenticated;
create policy retail_vouchers_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-vouchers' and retail_private.can_upload_voucher(name));
create policy retail_vouchers_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-vouchers' and retail_private.can_read_voucher(name));

-- Column permissions prevent a cashier from requesting voucher_url directly through REST.
-- The RLS policies for the other columns remain in force (own rows for cashiers).
revoke select on public.retail_movements from authenticated,anon,public;
grant select(id,store_id,shift_id,created_by,type,amount,reason,created_at,recorded_at,category,supplier_name)
 on public.retail_movements to authenticated;

create function public.retail_movement_details(p_store uuid,p_shift uuid)
returns table(id uuid,type text,amount numeric,reason text,created_at timestamptz,category text,voucher_url text,supplier_name text)
language plpgsql stable security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or not exists(select 1 from public.retail_shifts s where s.id=p_shift and s.store_id=p_store
  and (v_role in ('owner','admin') or s.opened_by=auth.uid())) then raise exception 'Sin acceso a este turno'; end if;
 return query select m.id,m.type,m.amount,m.reason,m.created_at,m.category,
  case when v_role in ('owner','admin') then m.voucher_url else null::text end,m.supplier_name
 from public.retail_movements m where m.store_id=p_store and m.shift_id=p_shift
 and (v_role in ('owner','admin') or m.created_by=auth.uid());
end $$;

-- Keep the original five-argument RPC for older clients. The new signature is explicit
-- (no ambiguous default-argument overload) and validates the actual uploaded object.
create function public.retail_add_movement(p_shift uuid,p_type text,p_amount numeric,p_reason text,p_request uuid,
 p_category text,p_voucher_url text,p_supplier_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; existing public.retail_movements;
 v_category text:=coalesce(p_category,'general'); v_supplier text:=nullif(trim(p_supplier_name),'');
 v_voucher text:=nullif(trim(p_voucher_url),''); v_path text;
begin
 if auth.uid() is null or p_request is null then raise exception 'Solicitud no válida'; end if;
 if v_category not in ('general','supplier_payment','other') or p_type not in ('INGRESO','RETIRO') or p_type is null
  or (p_type='INGRESO' and v_category<>'general') then raise exception 'Categoría de movimiento inválida'; end if;
 if v_category<>'supplier_payment' then v_supplier:=null; v_voucher:=null; end if;
 if v_category='supplier_payment' and v_supplier is null then raise exception 'Ingresá el nombre del proveedor'; end if;
 if v_category='supplier_payment' and v_voucher is null then raise exception 'Adjuntá el comprobante para pagos a proveedores'; end if;
 if v_supplier is not null and length(v_supplier)>160 then raise exception 'El nombre del proveedor supera los 160 caracteres'; end if;
 if p_amount is null or p_amount<=0 or p_amount>=1000000000000 or p_amount::text in ('NaN','Infinity','-Infinity') or round(p_amount,2)<=0 then raise exception 'Importe inválido'; end if;
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>300 then raise exception 'Completá el motivo (hasta 300 caracteres)'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from public.retail_movements where id=p_request;
 if found then
  if existing.shift_id<>p_shift or existing.created_by<>auth.uid() or retail_private.role_for(existing.store_id) is null
   or existing.type<>p_type or existing.amount<>round(p_amount,2) or existing.reason<>trim(p_reason)
   or existing.category<>v_category or existing.voucher_url is distinct from v_voucher or existing.supplier_name is distinct from v_supplier then
   raise exception 'El identificador ya corresponde a otro movimiento'; end if;
  return existing.id;
 end if;
 s:=retail_private.check_shift(p_shift);
 if v_voucher is not null then
  v_path:=substring(v_voucher from '^https?://[^/]+/storage/v1/object/authenticated/retail-vouchers/(.*)$');
  if v_path is null or split_part(v_path,'/',1)<>s.store_id::text or split_part(v_path,'/',2)<>s.id::text
   or not retail_private.can_upload_voucher(v_path) then raise exception 'El comprobante no corresponde al comercio y turno'; end if;
  perform 1 from storage.objects o where o.bucket_id='retail-vouchers' and o.name=v_path
   and (coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=auth.uid()::text or retail_private.role_for(s.store_id) in ('owner','admin')) for share;
  if not found then raise exception 'Primero subí un comprobante válido para este turno'; end if;
 end if;
 insert into public.retail_movements(id,store_id,shift_id,created_by,type,amount,reason,category,voucher_url,supplier_name)
 values(p_request,s.store_id,s.id,auth.uid(),p_type,p_amount,trim(p_reason),v_category,v_voucher,v_supplier);
 return p_request;
end $$;

revoke all on function public.retail_movement_details(uuid,uuid),public.retail_add_movement(uuid,text,numeric,text,uuid,text,text,text) from public,anon;
grant execute on function public.retail_movement_details(uuid,uuid),public.retail_add_movement(uuid,text,numeric,text,uuid,text,text,text) to authenticated;

-- Keep offline replay transactional, idempotent and compatible with older queued movements.

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if coalesce(retail_private.role_for(v_store),'') not in ('owner','admin') then raise exception 'Sin permiso para registrar stock'; end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost) where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;

revoke all on function public.retail_sync_operation(jsonb) from public,anon;
grant execute on function public.retail_sync_operation(jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_029b5843eacab94f$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190001_justified_withdrawal.sql','029b5843eacab94f78439fd8f13da846c46e7729f376e1f314286e1f20a14fa9','schema');
 end if;
end;
$retail_step_12$;

-- 13/31: 202610190001_store_onboarding.sql
do $retail_step_13$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190001_store_onboarding.sql') then
  raise notice 'Aplicando 202610190001_store_onboarding.sql';
  execute $retail_source_e5b8362448949bce$
create table public.retail_store_onboarding (
 store_id uuid primary key references public.retail_stores(id),
 step smallint not null default 1 check (step between 1 and 3),
 details_confirmed_at timestamptz,
 dismissed_at timestamptz,
 completed_at timestamptz,
 version integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.retail_store_onboarding enable row level security;
revoke all on public.retail_store_onboarding from public, anon, authenticated;
grant select on public.retail_store_onboarding to authenticated;
create policy manager_read on public.retail_store_onboarding for select to authenticated
 using (retail_private.role_for(store_id) in ('owner','admin'));

create function retail_private.initialize_onboarding() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_store_onboarding(store_id) values(new.id);
 return new;
end $$;
revoke all on function retail_private.initialize_onboarding() from public,anon,authenticated;
create trigger retail_initialize_onboarding after insert on public.retail_stores
 for each row execute function retail_private.initialize_onboarding();

-- Stable client request across reloads; serialize matching pending creations across devices.
create table retail_private.store_creation_requests (
 user_id uuid not null references auth.users(id), request_id uuid not null,
 store_id uuid not null references public.retail_stores(id), primary key(user_id,request_id)
);
revoke all on retail_private.store_creation_requests from public,anon,authenticated;
create function public.retail_create_store_once(p_name text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or p_request is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select store_id into v_id from retail_private.store_creation_requests where user_id=auth.uid() and request_id=p_request;
 if v_id is not null then return v_id; end if;
 select s.id into v_id from public.retail_stores s join public.retail_store_onboarding o on o.store_id=s.id
 where s.owner_id=auth.uid() and lower(s.name)=lower(trim(p_name)) and o.completed_at is null
 order by o.updated_at limit 1;
 if v_id is null then v_id := public.retail_create_store(p_name); end if;
 insert into retail_private.store_creation_requests values(auth.uid(),p_request,v_id);
 return v_id;
end $$;

create function public.retail_onboarding_update(p_store uuid,p_version integer,p_action text) returns public.retail_store_onboarding
language plpgsql security definer set search_path='' as $$
declare o public.retail_store_onboarding; has_products boolean;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para configurar este comercio'; end if;
 select * into o from public.retail_store_onboarding where store_id=p_store for update;
 if o.store_id is null then raise exception 'Este comercio no necesita inicio guiado'; end if;
 if p_version is null or o.version <> p_version then raise exception 'El inicio cambió en otro dispositivo. Actualizá para continuar.'; end if;
 if o.completed_at is not null then return o; end if;
 if p_action='details' then
   if not exists(select 1 from public.retail_registers where store_id=p_store and active) then raise exception 'Agregá una caja en Locales y cajas antes de continuar'; end if;
   o.details_confirmed_at := coalesce(o.details_confirmed_at,now()); o.step := 2;
 elsif p_action='products' then
   if o.details_confirmed_at is null then raise exception 'Confirmá primero los datos del comercio'; end if;
   o.step := 3;
 elsif p_action='back_details' then o.step := 1;
 elsif p_action='back_products' then o.step := 2;
 elsif p_action='dismiss' then o.dismissed_at := now();
 elsif p_action='resume' then o.dismissed_at := null;
 elsif p_action='finish' then
   if o.details_confirmed_at is null then raise exception 'Confirmá primero los datos del comercio'; end if;
   if not exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id
     where s.store_id=p_store and s.opened_by=auth.uid() and s.closed_at is null and r.active)
     then raise exception 'Abrí tu turno antes de empezar a vender'; end if;
   select exists(select 1 from public.retail_products where store_id=p_store and active) into has_products;
   o.completed_at := case when has_products then now() else null end;
   o.dismissed_at := now(); o.step := case when has_products then 3 else 2 end;
 else raise exception 'Acción de inicio no válida';
 end if;
 update public.retail_store_onboarding set step=o.step,details_confirmed_at=o.details_confirmed_at,
   dismissed_at=o.dismissed_at,completed_at=o.completed_at,version=version+1,updated_at=now()
 where store_id=p_store returning * into o;
 return o;
end $$;

-- This wrapper uses the actual opening RPC and its accounting/permission validation.
-- A retry (including another device) returns the same own open shift, never opens another.
create function public.retail_onboarding_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para configurar este comercio'; end if;
 perform 1 from public.retail_store_onboarding where store_id=p_store and details_confirmed_at is not null for update;
 if not found then raise exception 'Confirmá primero los datos del comercio'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then
   raise exception 'Caja no disponible. Actualizá y elegí una caja activa.';
 end if;
 select id into v_id from public.retail_shifts where store_id=p_store and register_id=p_register and closed_at is null;
 if v_id is not null then
   if exists(select 1 from public.retail_shifts where id=v_id and opened_by=auth.uid()) then return v_id; end if;
   raise exception 'Esta caja está ocupada. Elegí otra caja o actualizá cuando se libere.';
 end if;
 if exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=auth.uid() and closed_at is null) then
   raise exception 'Ya tenés un turno abierto en otra caja. Actualizá y seleccioná esa caja para continuar.';
 end if;
 return public.retail_open_shift(p_store,p_register,p_opening);
end $$;
revoke all on function public.retail_create_store_once(text,uuid), public.retail_onboarding_update(uuid,integer,text), public.retail_onboarding_open_shift(uuid,uuid,numeric) from public,anon;
grant execute on function public.retail_create_store_once(text,uuid), public.retail_onboarding_update(uuid,integer,text), public.retail_onboarding_open_shift(uuid,uuid,numeric) to authenticated;
$retail_source_e5b8362448949bce$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190001_store_onboarding.sql','e5b8362448949bceec6db8607ab80a30285230317f319875eb6d9a2f1d47f09c','schema');
 end if;
end;
$retail_step_13$;

-- 14/31: 202610190002_pending_replenishments.sql
do $retail_step_14$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190002_pending_replenishments.sql') then
  raise notice 'Aplicando 202610190002_pending_replenishments.sql';
  execute $retail_source_3ddd179e5609126a$
create table public.retail_pending_replenishments (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), branch_id uuid,
 submitted_by uuid not null references auth.users(id), submitted_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 image_url text not null unique, extracted_text text, items jsonb not null default '[]'::jsonb,
 notes text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz, rejection_reason text,
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=200),
 check(length(coalesce(notes,''))<=2000 and length(coalesce(extracted_text,''))<=100000),
 check((status='pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
  or (status='approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
  or (status='rejected' and reviewed_by is not null and reviewed_at is not null and rejection_reason is not null and length(trim(rejection_reason)) between 1 and 1000))
);
create index retail_pending_replenishments_store_status on public.retail_pending_replenishments(store_id,status,submitted_at,id);
alter table public.retail_pending_replenishments enable row level security;
create policy member_read on public.retail_pending_replenishments for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_create on public.retail_pending_replenishments for insert to authenticated
 with check(retail_private.role_for(store_id) is not null and submitted_by=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);
create policy manager_review on public.retail_pending_replenishments for update to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
-- Writes must go through the RPCs so changing a status cannot bypass validation/stock.
revoke all on public.retail_pending_replenishments from public,anon,authenticated;
grant select on public.retail_pending_replenishments to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('retail-remitos','retail-remitos',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','image/bmp','image/tiff'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function retail_private.can_upload_remito(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(p_name,'/');
 v_uuid text:='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
 if auth.uid() is null or coalesce(array_length(parts,1),0)<>3 or parts[1]!~v_uuid or parts[2]<>auth.uid()::text or
  parts[3]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif)$' then return false; end if;
 return retail_private.role_for(parts[1]::uuid) is not null;
end $$;
create function retail_private.can_read_remito(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1)
  and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function retail_private.can_upload_remito(text),retail_private.can_read_remito(text) from public,anon;
grant execute on function retail_private.can_upload_remito(text),retail_private.can_read_remito(text) to authenticated;
create policy retail_remitos_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-remitos' and retail_private.can_upload_remito(name));
create policy retail_remitos_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-remitos' and retail_private.can_read_remito(name));

create function retail_private.validate_remito_items(p_store uuid,p_items jsonb,p_require_links boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb:='[]'::jsonb; v_item jsonb; v_product public.retail_products; v_id uuid;
 v_line text; v_name text; v_qty integer; v_pack integer; v_confidence numeric;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200
  or (p_require_links and jsonb_array_length(p_items)=0) then raise exception 'Ingresá entre 1 y 200 artículos para aprobar (o enviá solo la foto para revisión)'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'quantity','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Cada cantidad debe ser un entero positivo en unidades individuales'; end if;
  v_qty:=(v_item->>'quantity')::integer;
  if v_qty>1000000 then raise exception 'La cantidad supera 1.000.000 de unidades'; end if;
  v_line:=trim(coalesce(v_item->>'invoice_line','')); v_name:=trim(coalesce(v_item->>'product_name',v_line));
  if length(v_line) not between 1 and 500 or length(v_name) not between 1 and 500 then raise exception 'Revisá las descripciones de los artículos'; end if;
  v_id:=nullif(v_item->>'product_id','')::uuid;
  if v_id is null then
   if p_require_links then raise exception 'Vinculá todos los artículos a productos del catálogo antes de aprobar'; end if;
  else
   select * into v_product from public.retail_products where id=v_id and store_id=p_store and active;
   if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
   v_name:=v_product.name;
  end if;
  v_pack:=null;
  if v_item->>'pack_size' is not null then
   if (v_item->>'pack_size')!~'^[1-9][0-9]{0,6}$' then raise exception 'La presentación del bulto es inválida'; end if;
   v_pack:=(v_item->>'pack_size')::integer;
   if v_pack>1000000 then raise exception 'La presentación del bulto es inválida'; end if;
  end if;
  v_confidence:=null;
  if jsonb_typeof(v_item->'confidence')='number' then v_confidence:=greatest(0,least(1,(v_item->>'confidence')::numeric)); end if;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('invoice_line',v_line,'product_id',v_id,'product_name',v_name,'quantity',v_qty,'pack_size',v_pack,'confidence',v_confidence));
 end loop;
 return v_result;
end $$;
revoke all on function retail_private.validate_remito_items(uuid,jsonb,boolean) from public,anon,authenticated;

create function public.retail_submit_pending_replenishment(p_store uuid,p_branch uuid,p_image_url text,p_extracted_text text,p_items jsonb,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_path text; v_id uuid; existing public.retail_pending_replenishments; v_items jsonb;
 v_role text:=retail_private.role_for(p_store); v_assigned uuid;
begin
 if auth.uid() is null or v_role is null then raise exception 'Sin acceso al comercio'; end if;
 v_path:=substring(p_image_url from '^https?://[^/]+/storage/v1/object/authenticated/retail-remitos/(.*)$');
 if v_path is null or split_part(v_path,'/',1)<>p_store::text or not retail_private.can_upload_remito(v_path) then raise exception 'La foto no corresponde a este comercio y usuario'; end if;
 v_id:=split_part(split_part(v_path,'/',3),'.',1)::uuid;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,1));
 select * into existing from public.retail_pending_replenishments where id=v_id;
 if found then
  if existing.store_id<>p_store or existing.submitted_by<>auth.uid() or existing.image_url<>p_image_url then raise exception 'La foto ya corresponde a otro envío'; end if;
  return existing.id;
 end if;
 if p_branch is not null and not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if v_role='cashier' then
  select coalesce(m.branch_id,r.branch_id) into v_assigned from public.retail_members m left join public.retail_registers r on r.id=m.register_id and r.store_id=m.store_id where m.store_id=p_store and m.user_id=auth.uid();
  if v_assigned is not null and p_branch is distinct from v_assigned then raise exception 'Usá la sucursal asignada a tu cuenta'; end if;
 end if;
 if length(coalesce(p_notes,''))>2000 or length(coalesce(p_extracted_text,''))>100000 then raise exception 'El texto o las notas superan el tamaño permitido'; end if;
 perform 1 from storage.objects o where o.bucket_id='retail-remitos' and o.name=v_path
  and coalesce(nullif(to_jsonb(o)->>'owner_id',''),to_jsonb(o)->>'owner')=auth.uid()::text for share;
 if not found then raise exception 'Primero subí la foto del remito'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,'[]'::jsonb),false);
 insert into public.retail_pending_replenishments(id,store_id,branch_id,submitted_by,image_url,extracted_text,items,notes)
 values(v_id,p_store,p_branch,auth.uid(),p_image_url,nullif(p_extracted_text,''),v_items,nullif(trim(p_notes),''));
 return v_id;
end $$;

create function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments; v_items jsonb; v_group record; p public.retail_products; v_qty integer;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede aprobar ingresos de stock'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='approved' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue rechazado'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,r.items),true);
 -- Lock all products in a stable order, then add to current stock, never a client snapshot.
 perform pr.id from public.retail_products pr where pr.store_id=p_store and pr.id in
  (select (item->>'product_id')::uuid from jsonb_array_elements(v_items) item) order by pr.id for update;
 for v_group in select (item->>'product_id')::uuid as product_id,sum((item->>'quantity')::integer) as quantity
  from jsonb_array_elements(v_items) item group by (item->>'product_id')::uuid loop
  if v_group.quantity>1000000 then raise exception 'La suma por producto supera 1.000.000 de unidades'; end if;
  v_qty:=v_group.quantity::integer;
  select * into p from public.retail_products where id=v_group.product_id and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible'; end if;
  if p.stock>2147483647-v_qty then raise exception 'El stock resultante supera el máximo permitido'; end if;
  update public.retail_products set stock=stock+v_qty where id=p.id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,occurred_at)
   values(r.id,p.id,p_store,auth.uid(),v_qty,now());
 end loop;
 update public.retail_pending_replenishments set items=v_items,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 return r.id;
end $$;

create function public.retail_reject_replenishment(p_store uuid,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede rechazar remitos'; end if;
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'Ingresá un motivo de rechazo (hasta 1.000 caracteres)'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='rejected' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue aprobado'; end if;
 update public.retail_pending_replenishments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=trim(p_reason) where id=r.id;
 return r.id;
end $$;
revoke all on function public.retail_submit_pending_replenishment(uuid,uuid,text,text,jsonb,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_reject_replenishment(uuid,uuid,text) from public,anon;
grant execute on function public.retail_submit_pending_replenishment(uuid,uuid,text,text,jsonb,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_reject_replenishment(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
$retail_source_3ddd179e5609126a$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190002_pending_replenishments.sql','3ddd179e5609126a264e696cd293909008bf4dd1acc06a8bb409c248ba5ab707','schema');
 end if;
end;
$retail_step_14$;

-- 15/31: 202610190003_stock_transfers.sql
do $retail_step_15$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190003_stock_transfers.sql') then
  raise notice 'Aplicando 202610190003_stock_transfers.sql';
  execute $retail_source_cab05c3785465fba$
-- Internal audit records only: these functions never update product stock.
create table public.retail_stock_transfers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 from_branch_id uuid not null, to_branch_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 notes text, status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 items jsonb not null, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 foreign key(store_id,from_branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,to_branch_id) references public.retail_branches(store_id,id),
 check(from_branch_id<>to_branch_id), check(length(coalesce(notes,''))<=2000),
 check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 200),
 check((status='pending' and reviewed_by is null and reviewed_at is null)
  or (status in ('confirmed','cancelled') and reviewed_by is not null and reviewed_at is not null))
);
create index retail_stock_transfers_history on public.retail_stock_transfers(store_id,created_at desc,id);
alter table public.retail_stock_transfers enable row level security;
create policy member_read on public.retail_stock_transfers for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_create on public.retail_stock_transfers for insert to authenticated
 with check(retail_private.role_for(store_id) is not null and created_by=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);
create policy manager_review on public.retail_stock_transfers for update to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
-- RPC-only writes preserve item validation, idempotency and review audit fields.
revoke all on public.retail_stock_transfers from public,anon,authenticated;
grant select on public.retail_stock_transfers to authenticated;

create function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_request,gen_random_uuid()); existing public.retail_stock_transfers;
 v_item jsonb; v_product uuid; v_qty integer; v_name text; v_items jsonb:='[]'::jsonb;
 v_requested jsonb:='[]'::jsonb; v_existing jsonb; v_notes text:=nullif(trim(p_notes),'');
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if p_from_branch is null or p_to_branch is null or p_from_branch=p_to_branch then raise exception 'Elegí sucursales de origen y destino diferentes'; end if;
 if length(coalesce(v_notes,''))>2000 then raise exception 'Las notas no pueden superar los 2.000 caracteres'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Agregá al menos un producto'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(v_item->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá los productos y sus cantidades enteras positivas'; end if;
  v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'qty')::integer;
  if v_qty>1000000 then raise exception 'La cantidad por producto no puede superar 1.000.000 de unidades'; end if;
  v_requested:=v_requested||jsonb_build_array(jsonb_build_object('product_id',v_product,'qty',v_qty));
 end loop;
 if (select count(distinct item->>'product_id') from jsonb_array_elements(v_requested) item)<>jsonb_array_length(v_requested) then
  raise exception 'Incluí cada producto una sola vez con su cantidad total'; end if;
 select jsonb_agg(item order by item->>'product_id') into v_requested from jsonb_array_elements(v_requested) item;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into existing from public.retail_stock_transfers where id=v_id;
 if found then
  select jsonb_agg(jsonb_build_object('product_id',item->>'product_id','qty',(item->>'qty')::integer) order by item->>'product_id')
   into v_existing from jsonb_array_elements(existing.items) item;
  if existing.store_id<>p_store or existing.created_by<>auth.uid() or existing.from_branch_id<>p_from_branch or existing.to_branch_id<>p_to_branch
   or existing.notes is distinct from v_notes or v_existing<>v_requested then raise exception 'El identificador ya corresponde a otra transferencia'; end if;
  return existing.id;
 end if;
 if (select count(*) from public.retail_branches where store_id=p_store and id in (p_from_branch,p_to_branch))<>2 then raise exception 'Las sucursales deben pertenecer a este comercio'; end if;
 for v_item in select value from jsonb_array_elements(v_requested) loop
  v_product:=(v_item->>'product_id')::uuid;
  select name into v_name from public.retail_products where id=v_product and store_id=p_store and active;
  if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_product,'product_name',v_name,'qty',(v_item->>'qty')::integer));
 end loop;
 insert into public.retail_stock_transfers(id,store_id,from_branch_id,to_branch_id,created_by,items,notes)
 values(v_id,p_store,p_from_branch,p_to_branch,auth.uid(),v_items,v_notes);
 return v_id;
end $$;

create function public.retail_confirm_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede confirmar transferencias'; end if;
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='confirmed' then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia está cancelada'; end if;
 update public.retail_stock_transfers set status='confirmed',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create function public.retail_cancel_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede cancelar transferencias'; end if;
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='cancelled' then return t.id; end if;
 if t.status<>'pending' then raise exception 'Una transferencia confirmada conserva su registro histórico'; end if;
 update public.retail_stock_transfers set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;
revoke all on function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid),public.retail_confirm_transfer(uuid,uuid),public.retail_cancel_transfer(uuid,uuid) from public,anon;
grant execute on function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid),public.retail_confirm_transfer(uuid,uuid),public.retail_cancel_transfer(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_cab05c3785465fba$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190003_stock_transfers.sql','cab05c3785465fba81273dddaad52130c14a8c6c42fb63ed53f476416d53a4be','schema');
 end if;
end;
$retail_step_15$;

-- 16/31: 202610200001_supplier_mappings.sql
do $retail_step_16$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610200001_supplier_mappings.sql') then
  raise notice 'Aplicando 202610200001_supplier_mappings.sql';
  execute $retail_source_d4841853f82adbd4$
-- Same normalization as normalizeSupplierText in the client; no new extension.
create function retail_private.normalize_supplier(p_text text) returns text
language sql immutable set search_path = '' as $$
 select btrim(regexp_replace(regexp_replace(lower(regexp_replace(
   normalize(coalesce(p_text, ''), NFD), U&'[\0300-\036f]', '', 'g')),
   '[^[:alnum:][:space:]]', ' ', 'g'), '[[:space:]]+', ' ', 'g'));
$$;
revoke all on function retail_private.normalize_supplier(text) from public;
grant execute on function retail_private.normalize_supplier(text) to authenticated;

create table public.retail_supplier_mappings (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 supplier text not null check(supplier <> '' and supplier = retail_private.normalize_supplier(supplier)),
 invoice_text text not null check(length(btrim(invoice_text)) > 0),
 product_id uuid not null references public.retail_products(id),
 product_name text not null check(length(btrim(product_name)) > 0),
 pack_size_detected integer check(pack_size_detected is null or pack_size_detected >= 1),
 confidence numeric(3,2) not null default 1.0 check(confidence between 0 and 1),
 times_used integer not null default 1 check(times_used >= 1),
 last_used_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(store_id, supplier, invoice_text),
 -- A member cannot link their store's alias to another store's product.
 foreign key(store_id, product_id) references public.retail_products(store_id, id)
);
create index retail_supplier_mappings_rank
 on public.retail_supplier_mappings(store_id, supplier, times_used desc, last_used_at desc);

alter table public.retail_supplier_mappings enable row level security;
create policy member_read on public.retail_supplier_mappings for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_insert on public.retail_supplier_mappings for insert to authenticated
 with check(retail_private.role_for(store_id) is not null);
create policy member_update on public.retail_supplier_mappings for update to authenticated
 using(retail_private.role_for(store_id) is not null)
 with check(retail_private.role_for(store_id) is not null);
revoke all on public.retail_supplier_mappings from public, anon, authenticated;
grant select, insert, update on public.retail_supplier_mappings to authenticated;

create function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text,
 p_product_id uuid, p_product_name text, p_pack_size integer default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path = '' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode = '42501';
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id, supplier, invoice_text, product_id, product_name, pack_size_detected)
 values (p_store, retail_private.normalize_supplier(p_supplier), btrim(p_invoice_text),
   p_product_id, btrim(p_product_name), p_pack_size)
 on conflict (store_id, supplier, invoice_text) do update set
   product_id = excluded.product_id, product_name = excluded.product_name,
   pack_size_detected = excluded.pack_size_detected,
   times_used = existing.times_used + 1, last_used_at = now()
 returning * into result;
 return result;
end;
$$;

create function public.retail_get_supplier_mappings(p_store uuid, p_supplier text)
returns setof public.retail_supplier_mappings
language plpgsql stable security invoker set search_path = '' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode = '42501';
 end if;
 return query select m.* from public.retail_supplier_mappings m
 where m.store_id = p_store and m.supplier = retail_private.normalize_supplier(p_supplier)
 order by m.times_used desc, m.last_used_at desc, m.id;
end;
$$;
revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer) from public, anon;
revoke all on function public.retail_get_supplier_mappings(uuid,text) from public, anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer) to authenticated;
grant execute on function public.retail_get_supplier_mappings(uuid,text) to authenticated;

$retail_source_d4841853f82adbd4$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610200001_supplier_mappings.sql','d4841853f82adbd4e881feb1bdf3f525d76a12121e152b54257f8eaf9a81611c','schema');
 end if;
end;
$retail_step_16$;

-- 17/31: 202610200002_supplier_alias_usage.sql
do $retail_step_17$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610200002_supplier_alias_usage.sql') then
  raise notice 'Aplicando 202610200002_supplier_alias_usage.sql';
  execute $retail_source_1adc3ce4519abbb2$
-- Replace the old signature without ambiguous PostgREST overloads; six-argument callers keep working.
drop function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer);
create function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text, p_product_id uuid, p_product_name text,
 p_pack_size integer default null, p_confidence numeric default 1,
 p_usage_only boolean default false, p_mapping_id uuid default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path='' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
   raise exception 'La confianza debe estar entre cero y uno' using errcode='22023';
 end if;
 if p_usage_only then
   update public.retail_supplier_mappings m set times_used=m.times_used+1,last_used_at=now()
   where m.id=p_mapping_id and m.store_id=p_store and m.supplier=retail_private.normalize_supplier(p_supplier)
     and m.invoice_text=btrim(p_invoice_text) and m.product_id=p_product_id
     and m.pack_size_detected is not distinct from p_pack_size
     and m.confidence>=0.85 and m.times_used>=3
   returning m.* into result;
   if not found then raise exception 'El alias cambió o fue eliminado. Actualizá la memoria del proveedor.'; end if;
   return result;
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id,supplier,invoice_text,product_id,product_name,pack_size_detected,confidence)
 values(p_store,retail_private.normalize_supplier(p_supplier),btrim(p_invoice_text),p_product_id,btrim(p_product_name),p_pack_size,p_confidence)
 on conflict(store_id,supplier,invoice_text) do update set
   times_used=case when existing.product_id=excluded.product_id and existing.pack_size_detected is not distinct from excluded.pack_size_detected
     then existing.times_used+1 else 1 end,
   product_id=excluded.product_id,product_name=excluded.product_name,pack_size_detected=excluded.pack_size_detected,
   confidence=excluded.confidence,last_used_at=now()
 returning * into result;
 return result;
end;
$$;

create policy member_delete on public.retail_supplier_mappings for delete to authenticated
 using(retail_private.role_for(store_id) is not null);
grant delete on public.retail_supplier_mappings to authenticated;
create function public.retail_delete_supplier_mapping(p_store uuid,p_supplier text,p_mapping_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 delete from public.retail_supplier_mappings where id=p_mapping_id and store_id=p_store
   and supplier=retail_private.normalize_supplier(p_supplier);
end;
$$;
revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) from public,anon;
revoke all on function public.retail_delete_supplier_mapping(uuid,text,uuid) from public,anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) to authenticated;
grant execute on function public.retail_delete_supplier_mapping(uuid,text,uuid) to authenticated;
$retail_source_1adc3ce4519abbb2$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610200002_supplier_alias_usage.sql','1adc3ce4519abbb20c3436578bff8de5d9111f08abda7e198639468bd77e15c4','schema');
 end if;
end;
$retail_step_17$;

-- 18/31: 202610200003_product_expiry.sql
do $retail_step_18$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610200003_product_expiry.sql') then
  raise notice 'Aplicando 202610200003_product_expiry.sql';
  execute $retail_source_77d1f8c0f62da284$
alter table public.retail_products
  add column if not exists expiry_date date default null,
  add column if not exists last_restocked_at timestamptz default null;

$retail_source_77d1f8c0f62da284$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610200003_product_expiry.sql','77d1f8c0f62da28481839205c638d09ab8586267acd2b86fb97f44c812072a87','schema');
 end if;
end;
$retail_step_18$;

-- 19/31: 202610210001_ledger_routing.sql
do $retail_step_19$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210001_ledger_routing.sql') then
  raise notice 'Aplicando 202610210001_ledger_routing.sql';
  execute $retail_source_f19dc026535013c8$
alter table public.retail_ledgers add column payment_methods text[] not null default '{}'
 check(payment_methods <@ array['Efectivo','QR','Transferencia','Debito','Credito','Mixto']::text[]);
-- Each method has at most one destination per store, including direct inserts.
create unique index retail_ledger_cash_rule on public.retail_ledgers(store_id) where 'Efectivo'=any(payment_methods);
create unique index retail_ledger_qr_rule on public.retail_ledgers(store_id) where 'QR'=any(payment_methods);
create unique index retail_ledger_transfer_rule on public.retail_ledgers(store_id) where 'Transferencia'=any(payment_methods);
create unique index retail_ledger_debit_rule on public.retail_ledgers(store_id) where 'Debito'=any(payment_methods);
create unique index retail_ledger_credit_rule on public.retail_ledgers(store_id) where 'Credito'=any(payment_methods);
create unique index retail_ledger_mixed_rule on public.retail_ledgers(store_id) where 'Mixto'=any(payment_methods);

create function public.retail_save_ledger_routing(p_store uuid,p_default uuid,p_rules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede configurar los registros'; end if;
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=p_default and active) then raise exception 'Elegí un registro principal activo'; end if;
 if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Reglas inválidas'; end if;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   if entry.key not in ('Efectivo','QR','Transferencia','Debito','Credito','Mixto') or entry.value is null then raise exception 'Medio de pago inválido'; end if;
   if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=entry.value::uuid and active) then raise exception 'El registro elegido ya no está activo'; end if;
 end loop;
 update public.retail_ledgers set is_default=false,payment_methods='{}' where store_id=p_store;
 update public.retail_ledgers set is_default=true where store_id=p_store and id=p_default;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   update public.retail_ledgers set payment_methods=array_append(payment_methods,entry.key) where store_id=p_store and id=entry.value::uuid;
 end loop;
end $$;

-- Opt-in setup for existing stores: retain all other ledgers and historical sales.
create function public.retail_prepare_sales_ledgers(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare general_id uuid; tests_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede preparar los registros'; end if;
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 insert into public.retail_ledgers(store_id,name) values(p_store,'General')
 on conflict(store_id,name) do update set active=true;
 select id into tests_id from public.retail_ledgers where store_id=p_store and name='Pruebas';
 if tests_id is null then
   select id into tests_id from public.retail_ledgers where store_id=p_store and name='Otras ventas' and not is_default;
   if tests_id is not null then
     update public.retail_ledgers set name='Pruebas',active=true where id=tests_id;
   else
     insert into public.retail_ledgers(store_id,name) values(p_store,'Pruebas');
   end if;
 else
   update public.retail_ledgers set active=true where id=tests_id;
 end if;
 select id into general_id from public.retail_ledgers where store_id=p_store and name='General';
 update public.retail_ledgers set is_default=false where store_id=p_store and is_default;
 update public.retail_ledgers set is_default=true where id=general_id;
end $$;

-- The same bootstrap as before; only the second new-store ledger's label changes.
create or replace function retail_private.initialize_location() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_branches(store_id,name,is_default) values(new.id,'Principal',true);
 insert into public.retail_ledgers(store_id,name,is_default) values(new.id,'General',true);
 insert into public.retail_ledgers(store_id,name) values(new.id,'Pruebas');
 return new;
end $$;

create table public.retail_sale_ledger_changes (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 sale_id uuid not null, from_ledger uuid not null, to_ledger uuid not null,
 from_name text not null, to_name text not null,
 changed_by uuid not null references auth.users(id), changed_at timestamptz not null default now(),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,from_ledger) references public.retail_ledgers(store_id,id),
 foreign key(store_id,to_ledger) references public.retail_ledgers(store_id,id)
);
create index retail_sale_ledger_history on public.retail_sale_ledger_changes(store_id,sale_id,changed_at,id);
alter table public.retail_sale_ledger_changes enable row level security;
revoke all on public.retail_sale_ledger_changes from public,anon,authenticated;
grant select on public.retail_sale_ledger_changes to authenticated;
create policy sale_ledger_history_read on public.retail_sale_ledger_changes for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or
 (retail_private.role_for(store_id)='cashier' and exists(select 1 from public.retail_sales s where s.id=sale_id and s.store_id=retail_sale_ledger_changes.store_id and s.created_by=auth.uid()))
);

create function public.retail_move_sale_ledger(p_store uuid,p_sale uuid,p_target uuid,p_expected uuid,p_request uuid)
returns public.retail_sales language plpgsql security definer set search_path='' as $$
declare s public.retail_sales; destination public.retail_ledgers; previous public.retail_sale_ledger_changes; actor_role text;
begin
 if p_store is null or p_sale is null or p_target is null or p_expected is null or p_request is null then raise exception 'Faltan datos para cambiar el registro'; end if;
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 select * into s from public.retail_sales where store_id=p_store and id=p_sale;
 if s.id is null or actor_role is null or (actor_role='cashier' and s.created_by<>auth.uid()) then raise exception 'No tenés acceso a esta venta'; end if;
 select * into previous from public.retail_sale_ledger_changes where id=p_request;
 if found then
   if previous.store_id<>p_store or previous.sale_id<>p_sale or previous.to_ledger<>p_target or previous.from_ledger<>p_expected or previous.changed_by<>auth.uid() then raise exception 'La solicitud corresponde a otro cambio'; end if;
   return s;
 end if;
 if actor_role='cashier' then
   perform retail_private.check_shift(s.shift_id);
 else
   perform 1 from public.retail_shifts where id=s.shift_id for update;
 end if;
 select * into s from public.retail_sales where store_id=p_store and id=p_sale for update;
 -- Lock both ledger FK targets in the same order as routing configuration.
 -- Locking only the destination can deadlock when the audit insert locks the source.
 perform id from public.retail_ledgers where store_id=p_store and id in (s.ledger_id,p_target) order by id for share;
 select * into destination from public.retail_ledgers where store_id=p_store and id=p_target and active for share;
 if not found then raise exception 'El registro de destino ya no está activo'; end if;
 if s.ledger_id=p_target then return s; end if;
 if s.ledger_id is distinct from p_expected then raise exception 'La venta cambió de registro en otro dispositivo. Actualizá y volvé a elegir'; end if;
 insert into public.retail_sale_ledger_changes(id,store_id,sale_id,from_ledger,to_ledger,from_name,to_name,changed_by)
 values(p_request,p_store,p_sale,s.ledger_id,p_target,s.ledger_name,destination.name,auth.uid());
 update public.retail_sales set ledger_id=p_target,ledger_name=destination.name where id=p_sale returning * into s;
 return s;
end $$;
revoke all on function public.retail_save_ledger_routing(uuid,uuid,jsonb),public.retail_prepare_sales_ledgers(uuid),public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.retail_save_ledger_routing(uuid,uuid,jsonb),public.retail_prepare_sales_ledgers(uuid),public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) to authenticated;
$retail_source_f19dc026535013c8$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210001_ledger_routing.sql','f19dc026535013c80519da077ca4de832b6706cf7e885ffbc1b0e31185591d7e','schema');
 end if;
end;
$retail_step_19$;

-- 20/31: 202610210002_staff_profiles.sql
do $retail_step_20$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210002_staff_profiles.sql') then
  raise notice 'Aplicando 202610210002_staff_profiles.sql';
  execute $retail_source_ca6e73c2c8993bc2$
alter table public.retail_members drop constraint retail_members_role_check;
alter table public.retail_members add constraint retail_members_role_check check(role in ('owner','admin','supervisor','cashier'));
alter table public.retail_invitations drop constraint retail_invitations_role_check;
alter table public.retail_invitations add constraint retail_invitations_role_check check(role in ('admin','supervisor','cashier'));
create table public.retail_permission_profiles (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 80),
 base_role text not null check(base_role in ('cashier','supervisor')),
 permissions text[] not null check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']::text[]),
 unique(store_id,id),unique(store_id,name)
);
alter table public.retail_members add column profile_id uuid,
 add foreign key(store_id,profile_id) references public.retail_permission_profiles(store_id,id);
alter table public.retail_invitations add column profile_id uuid,
 add foreign key(store_id,profile_id) references public.retail_permission_profiles(store_id,id);

-- Legacy administrative RPCs must never infer administrative authority for supervisors.
-- Actual role is still read directly from membership by the client/team RPC.
create or replace function retail_private.role_for(p_store uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when role='supervisor' then 'cashier' else role end from public.retail_members
 where store_id=p_store and user_id=(select auth.uid());
$$;
create function retail_private.has_permission(p_store uuid,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select case when m.role in ('owner','admin') then true
 when m.profile_id is not null then p_action=any(p.permissions)
 else p_action=any(case when m.role='supervisor'
 then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']
 else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end) end
 from public.retail_members m left join public.retail_permission_profiles p on p.id=m.profile_id and p.store_id=m.store_id
 where m.store_id=p_store and m.user_id=auth.uid()),false);
$$;
revoke all on function retail_private.has_permission(uuid,text) from public,anon;
grant execute on function retail_private.has_permission(uuid,text) to authenticated;
create function public.retail_permissions(p_store uuid) returns text[]
language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']) action
 where retail_private.has_permission(p_store,action);
$$;

alter table public.retail_permission_profiles enable row level security;
revoke all on public.retail_permission_profiles from public,anon,authenticated;
grant select,insert on public.retail_permission_profiles to authenticated;
grant update(name,permissions) on public.retail_permission_profiles to authenticated;
create policy profile_read on public.retail_permission_profiles for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy profile_create on public.retail_permission_profiles for insert to authenticated with check(retail_private.role_for(store_id) in ('owner','admin'));
create policy profile_update on public.retail_permission_profiles for update to authenticated using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
create function retail_private.validate_staff_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.profile_id is not null and not exists(select 1 from public.retail_permission_profiles p where p.id=new.profile_id and p.store_id=new.store_id and p.base_role=new.role) then
   raise exception 'El perfil no corresponde al rol y comercio elegidos';
 end if;
 return new;
end $$;
create trigger retail_member_profile before insert or update of role,profile_id,store_id on public.retail_members for each row execute function retail_private.validate_staff_profile();
create trigger retail_invitation_profile before insert or update of role,profile_id,store_id on public.retail_invitations for each row execute function retail_private.validate_staff_profile();
revoke all on function retail_private.validate_staff_profile() from public,anon,authenticated;

create function public.retail_set_staff_profile(p_store uuid,p_target uuid,p_role text,p_profile uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede asignar perfiles'; end if;
 if p_role is null or p_role not in ('cashier','supervisor') then raise exception 'Elegí Cajero o Supervisor'; end if;
 if p_pending then
   select role into old_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
   select role into old_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if old_role is null or old_role not in ('cashier','supervisor') then raise exception 'Solo se pueden cambiar perfiles de cajeros y supervisores'; end if;
 if old_role<>p_role and not p_pending and exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de cambiar su rol'; end if;
 if p_pending then
   update public.retail_invitations set role=p_role,profile_id=p_profile where store_id=p_store and id=p_target;
 else
   update public.retail_members set role=p_role,profile_id=p_profile where store_id=p_store and user_id=p_target;
 end if;
end $$;

drop function public.retail_team(uuid);
create function public.retail_team(p_store uuid) returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid,profile_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para consultar el equipo'; end if;
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id,m.profile_id from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;
drop policy admin_read_cashier_invites on public.retail_invitations;
create policy admin_read_cashier_invites on public.retail_invitations for select to authenticated using(retail_private.role_for(store_id)='admin' and role in ('cashier','supervisor'));

create or replace function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 perform 1 from public.retail_invitations where email=v_email order by id for update;
 insert into public.retail_members(store_id,user_id,role,branch_id,register_id,profile_id)
 select store_id,auth.uid(),role,branch_id,register_id,profile_id from public.retail_invitations where email=v_email on conflict(store_id,user_id) do nothing;
 get diagnostics v_count=row_count;
 delete from public.retail_invitations where email=v_email;
 return v_count;
end $$;

create or replace function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para asignar personal'; end if;
 if p_pending then select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update; end if;
 if v_role is null or v_role not in ('cashier','supervisor') then raise exception 'Solo se pueden asignar cajeros o supervisores de este comercio'; end if;
 v_branch:=p_branch;
 if p_register is not null then
   select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
   if v_branch is null then raise exception 'Caja no disponible'; end if;
   if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
   if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then raise exception 'La persona debe cerrar su turno antes de cambiar a otra sucursal o caja'; end if;
   update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

-- Guard writes at the table boundary: REST, RPC and offline replay obey the same profile.
create function retail_private.require_permission(p_store uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform 1 from public.retail_permission_profiles p join public.retail_members m on m.profile_id=p.id and m.store_id=p.store_id where m.store_id=p_store and m.user_id=auth.uid() for share of p;
 if not retail_private.has_permission(p_store,p_action) then raise exception 'Tu perfil no permite esta acción. Pedile a administración que revise tus permisos' using errcode='42501'; end if;
end $$;
create function retail_private.guard_staff_action() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='retail_sales' then
   if tg_op='INSERT' then perform retail_private.require_permission(new.store_id,'sell');
   elsif new.ledger_id is distinct from old.ledger_id then perform retail_private.require_permission(new.store_id,'move_sale_ledger'); end if;
 elsif tg_table_name='retail_movements' then
   perform retail_private.require_permission(new.store_id,case when new.type='INGRESO' then 'cash_income' else 'cash_withdrawal' end);
 else perform retail_private.require_permission(new.store_id,'submit_remito'); end if;
 return new;
end $$;
create trigger retail_sale_profile_guard before insert or update of ledger_id on public.retail_sales for each row execute function retail_private.guard_staff_action();
create trigger retail_movement_profile_guard before insert on public.retail_movements for each row execute function retail_private.guard_staff_action();
create trigger retail_remito_profile_guard before insert on public.retail_pending_replenishments for each row execute function retail_private.guard_staff_action();
revoke all on function retail_private.require_permission(uuid,text),retail_private.guard_staff_action() from public,anon,authenticated;

create function retail_private.can_review_sales(p_store uuid,p_shift uuid) returns boolean language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'view_sales') and exists(select 1 from public.retail_shifts s where s.id=p_shift and s.store_id=p_store and retail_private.can_use_register(p_store,s.register_id));
$$;
revoke all on function retail_private.can_review_sales(uuid,uuid) from public,anon;
grant execute on function retail_private.can_review_sales(uuid,uuid) to authenticated;
create policy staff_review_sales on public.retail_sales for select to authenticated using(retail_private.can_review_sales(store_id,shift_id));
revoke all on function public.retail_permissions(uuid),public.retail_set_staff_profile(uuid,uuid,text,uuid,boolean),public.retail_team(uuid) from public,anon;
grant execute on function public.retail_permissions(uuid),public.retail_set_staff_profile(uuid,uuid,text,uuid,boolean),public.retail_team(uuid) to authenticated;
$retail_source_ca6e73c2c8993bc2$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210002_staff_profiles.sql','ca6e73c2c8993bc2390e2f91d48e9a0d82e60e3ae1be9613297f6ba667809a0e','schema');
 end if;
end;
$retail_step_20$;

-- 21/31: 202610210003_ledger_lock_order.sql
do $retail_step_21$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210003_ledger_lock_order.sql') then
  raise notice 'Aplicando 202610210003_ledger_lock_order.sql';
  execute $retail_source_b9f318a08145ad1e$
-- Forward correction for environments that already applied ledger routing.
-- Keep the RPC contract, authorization and audit/idempotency behavior intact.
create or replace function public.retail_move_sale_ledger(p_store uuid,p_sale uuid,p_target uuid,p_expected uuid,p_request uuid)
returns public.retail_sales language plpgsql security definer set search_path='' as $$
declare s public.retail_sales; destination public.retail_ledgers; previous public.retail_sale_ledger_changes; actor_role text;
begin
 if p_store is null or p_sale is null or p_target is null or p_expected is null or p_request is null then raise exception 'Faltan datos para cambiar el registro'; end if;
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 select * into s from public.retail_sales where store_id=p_store and id=p_sale;
 if s.id is null or actor_role is null or (actor_role='cashier' and s.created_by<>auth.uid()) then raise exception 'No tenés acceso a esta venta'; end if;
 select * into previous from public.retail_sale_ledger_changes where id=p_request;
 if found then
   if previous.store_id<>p_store or previous.sale_id<>p_sale or previous.to_ledger<>p_target or previous.from_ledger<>p_expected or previous.changed_by<>auth.uid() then raise exception 'La solicitud corresponde a otro cambio'; end if;
   return s;
 end if;
 if actor_role='cashier' then
   perform retail_private.check_shift(s.shift_id);
 else
   perform 1 from public.retail_shifts where id=s.shift_id for update;
 end if;
 select * into s from public.retail_sales where store_id=p_store and id=p_sale for update;
 -- Both the audit's source and destination foreign keys need ledger row locks.
 -- Taking them together, in UUID order, avoids a cycle with configuration saves.
 perform id from public.retail_ledgers where store_id=p_store and id in (s.ledger_id,p_target) order by id for share;
 select * into destination from public.retail_ledgers where store_id=p_store and id=p_target and active for share;
 if not found then raise exception 'El registro de destino ya no está activo'; end if;
 if s.ledger_id=p_target then return s; end if;
 if s.ledger_id is distinct from p_expected then raise exception 'La venta cambió de registro en otro dispositivo. Actualizá y volvé a elegir'; end if;
 insert into public.retail_sale_ledger_changes(id,store_id,sale_id,from_ledger,to_ledger,from_name,to_name,changed_by)
 values(p_request,p_store,p_sale,s.ledger_id,p_target,s.ledger_name,destination.name,auth.uid());
 update public.retail_sales set ledger_id=p_target,ledger_name=destination.name where id=p_sale returning * into s;
 return s;
end $$;
revoke all on function public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) to authenticated;

$retail_source_b9f318a08145ad1e$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210003_ledger_lock_order.sql','b9f318a08145ad1e1734c2afe5fc1ff04402666a69869aa0f27c4dee2abb5124','schema');
 end if;
end;
$retail_step_21$;

-- 22/31: 202610210004_delegated_catalog_actions.sql
do $retail_step_22$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210004_delegated_catalog_actions.sql') then
  raise notice 'Aplicando 202610210004_delegated_catalog_actions.sql';
  execute $retail_source_bcfa6664c406dd00$
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check
 check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products']::text[]);
-- No profile or default role receives a new capability automatically.
create or replace function public.retail_permissions(p_store uuid) returns text[]
language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products']) action
 where retail_private.has_permission(p_store,action);
$$;

create function public.retail_update_product_price(p_store uuid,p_product uuid,p_price numeric,p_expected numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare product public.retail_products;
begin
 perform retail_private.require_permission(p_store,'edit_prices');
 if p_price is null or p_price<=0 or p_price::text in ('NaN','Infinity','-Infinity') or p_expected is null then raise exception 'Ingresá un precio válido mayor a cero'; end if;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.price=p_price then return product.id; end if;
 if product.price is distinct from p_expected then raise exception 'El precio cambió en otro dispositivo. Actualizá y revisalo antes de guardar'; end if;
 update public.retail_products set price=p_price where id=product.id;
 return product.id;
end $$;

create or replace function public.retail_save_quick_products(p_store uuid,p_branch uuid,p_products uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_quick_products');
 perform 1 from public.retail_branches where id=p_branch and store_id=p_store for update;
 if not found then raise exception 'Sucursal no disponible'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and not exists(
   select 1 from public.retail_registers r where r.store_id=p_store and r.branch_id=p_branch and r.active and retail_private.can_use_register(p_store,r.id)
 ) then raise exception 'No tenés una caja asignada en esta sucursal'; end if;
 if p_products is null or cardinality(p_products)>20 or
  (select count(distinct id) from unnest(p_products) id)<>cardinality(p_products) or
  exists(select 1 from unnest(p_products) as selected(product_id) where not exists(select 1 from public.retail_products p where p.id=selected.product_id and p.store_id=p_store and p.active)) then raise exception 'Elegí hasta 20 productos distintos de este comercio'; end if;
 delete from public.retail_quick_products where branch_id=p_branch;
 insert into public.retail_quick_products(store_id,branch_id,product_id,position) select p_store,p_branch,id,n-1 from unnest(p_products) with ordinality as t(id,n);
end $$;

-- Existing durable operation contract/receipts and deterministic product lock order.
-- Only stock authorization expands; non-administrators can add units, not remove or re-cost them.
create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  perform retail_private.require_permission(v_store,'replenish_stock');
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
revoke all on function public.retail_update_product_price(uuid,uuid,numeric,numeric),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_sync_operation(jsonb) from public,anon;
grant execute on function public.retail_update_product_price(uuid,uuid,numeric,numeric),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_sync_operation(jsonb) to authenticated;
$retail_source_bcfa6664c406dd00$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210004_delegated_catalog_actions.sql','bcfa6664c406dd0074ba93d0bbb367c1c212c5e9285e703583616519f163628e','schema');
 end if;
end;
$retail_step_22$;

-- 23/31: 202610220001_product_compositions.sql
do $retail_step_23$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220001_product_compositions.sql') then
  raise notice 'Aplicando 202610220001_product_compositions.sql';
  execute $retail_source_ef088735e7a84900$
alter table public.retail_products add column if not exists stock_components jsonb not null default '[]'::jsonb;
alter table public.retail_products add constraint retail_product_components_array
 check(jsonb_typeof(stock_components)='array' and jsonb_array_length(stock_components)<=30);

-- No UPDATE privilege is granted for this column: configuration goes through the RPC.
create or replace function retail_private.validate_product_composition() returns trigger
language plpgsql security definer set search_path='' as $$
declare part jsonb; source public.retail_products;
begin
 if tg_op='DELETE' then
  if exists(select 1 from public.retail_stores where id=old.store_id) and exists(
   select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=old.store_id and c->>'product_id'=old.id::text) then
   raise exception 'El producto es componente de otro producto. Desvinculalo antes de eliminarlo';
  end if;
  return old;
 end if;
 if jsonb_typeof(new.stock_components) is distinct from 'array' or jsonb_array_length(new.stock_components)>30 then raise exception 'Composición inválida'; end if;
 if tg_op='INSERT' and jsonb_array_length(new.stock_components)>0 then raise exception 'Creá el producto sin stock y luego configurá su composición'; end if;
 if jsonb_array_length(new.stock_components)>0 then
  if new.stock<>0 then raise exception 'Reponé los componentes: este producto no tiene stock propio'; end if;
  if (select count(distinct c->>'product_id') from jsonb_array_elements(new.stock_components) c)<>jsonb_array_length(new.stock_components) then raise exception 'No repitas componentes'; end if;
  for part in select value from jsonb_array_elements(new.stock_components) loop
   if coalesce(part->>'quantity','')!~'^[1-9][0-9]{0,6}$' or (part->>'quantity')::integer>1000000 then raise exception 'Ingresá unidades enteras entre 1 y 1000000'; end if;
   select * into source from public.retail_products where store_id=new.store_id and id=(part->>'product_id')::uuid and active;
   if not found or source.id=new.id or jsonb_array_length(source.stock_components)>0 then raise exception 'Elegí componentes activos con stock propio del mismo comercio'; end if;
  end loop;
  if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=new.store_id and p.active and c->>'product_id'=new.id::text) then raise exception 'Este producto ya es componente de otro. No se permiten composiciones anidadas'; end if;
 end if;
 if not new.active and exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=new.store_id and p.active and c->>'product_id'=new.id::text) then raise exception 'Antes de archivar, quitá el producto de las composiciones activas'; end if;
 return new;
end $$;
revoke all on function retail_private.validate_product_composition() from public,anon,authenticated;
create trigger retail_validate_product_composition before insert or update of stock_components,stock,active or delete on public.retail_products
 for each row execute function retail_private.validate_product_composition();

create or replace function public.retail_save_product_composition(p_store uuid,p_product uuid,p_components jsonb,p_expected jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare product public.retail_products; normalized jsonb; previous jsonb;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if retail_private.role_for(p_store) not in ('owner','admin') or retail_private.role_for(p_store) is null then raise exception 'Solo administración puede configurar composiciones'; end if;
 if jsonb_typeof(p_components) is distinct from 'array' or jsonb_array_length(p_components)>30 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Composición inválida'; end if;
 -- Configuration and checkout take this lock BEFORE product locks. No nested recipes.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store and
  (id=p_product or id in(select (c->>'product_id')::uuid from jsonb_array_elements(p_components) c)) order by id for update;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active;
 if not found then raise exception 'Producto no disponible'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',((c->>'product_id')::uuid)::text,'quantity',(c->>'quantity')::integer) order by (c->>'product_id')::uuid),'[]'::jsonb) into normalized from jsonb_array_elements(p_components) c;
 select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into previous from jsonb_array_elements(p_expected) c;
 if product.stock_components=normalized then return; end if;
 if product.stock_components is distinct from previous then raise exception 'La composición cambió en otro dispositivo. Actualizá el catálogo antes de reintentar'; end if;
 if jsonb_array_length(product.stock_components)=0 and product.stock<>0 then raise exception 'El producto tiene stock propio. Creá otro producto con stock 0; no se trasladan existencias automáticamente'; end if;
 update public.retail_products set stock_components=normalized where id=p_product;
end $$;
revoke all on function public.retail_save_product_composition(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.retail_save_product_composition(uuid,uuid,jsonb,jsonb) to authenticated;

-- Replaces only stock consumption in the existing checkout contract. Price-list,
-- ledger, payment, permission and margin-snapshot triggers remain in force.
create or replace function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; p public.retail_products; component public.retail_products; part jsonb; item jsonb; v_qty integer; v_units bigint; v_price numeric; v_name text;
 v_total numeric:=0; v_items jsonb:='[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric; v_parts jsonb; v_cash numeric; v_sum numeric; v_methods integer; v_snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by<>auth.uid() or v_existing.shift_id<>p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id<>p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s:=retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||s.store_id::text,0));
 -- Lock sold SKUs and their physical components together in UUID order.
 perform id from public.retail_products where store_id=s.store_id and id in (
  select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null
  union select (c->>'product_id')::uuid from public.retail_products sold cross join lateral jsonb_array_elements(sold.stock_components) c
   where sold.store_id=s.store_id and sold.id in(select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null)
 ) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty')!~'^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty:=(item->>'qty')::integer; v_snapshot:='[]'::jsonb;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   -- Older clients may sell ordinary products, but must refresh to sell a recipe.
   if jsonb_array_length(p.stock_components)>0 or item ? 'stock_components' then
    if jsonb_typeof(item->'stock_components') is distinct from 'array' then raise exception 'Actualizá la app y el catálogo para vender este combo o presentación'; end if;
    select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into v_snapshot from jsonb_array_elements(item->'stock_components') c;
    if v_snapshot is distinct from p.stock_components then raise exception 'Cambió la composición de %. Actualizá el catálogo y volvé a agregarlo',p.name; end if;
   end if;
   v_expected:=p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected:=coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price:=v_expected; v_name:=p.name;
   if jsonb_array_length(p.stock_components)=0 then
    if p.stock<v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
    update public.retail_products set stock=stock-v_qty where id=p.id;
   else
    for part in select value from jsonb_array_elements(p.stock_components) loop
     select * into component from public.retail_products where id=(part->>'product_id')::uuid and store_id=s.store_id and active;
     if not found or jsonb_array_length(component.stock_components)>0 then raise exception 'Componente no disponible. Revisá la composición de %',p.name; end if;
     v_units:=v_qty::bigint*(part->>'quantity')::bigint;
     if component.stock<v_units then raise exception 'Stock insuficiente de % para vender %',component.name,p.name; end if;
     update public.retail_products set stock=stock-v_units::integer where id=component.id;
    end loop;
   end if;
  else
   v_price:=(item->>'unit_price')::numeric; v_name:=trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price<=0 or v_price>999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price:=round(v_price,2); v_total:=v_total+v_qty*v_price;
  v_items:=v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty,'stockComponents',v_snapshot));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 v_parts:=coalesce(p_payments,jsonb_build_array(jsonb_build_object('method',p_method,'amount',v_total)));
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Desglose de pago inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito') or (x->>'amount') is null or (x->>'amount')::numeric<=0 or (x->>'amount')::numeric::text in ('NaN','Infinity','-Infinity') or round((x->>'amount')::numeric,2)<>(x->>'amount')::numeric) then raise exception 'Importe o medio de pago inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method') into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_total or v_methods<>jsonb_array_length(v_parts) or (p_method='Mixto' and v_methods<2) or (p_method<>'Mixto' and (v_methods<>1 or v_parts->0->>'method'<>p_method)) then raise exception 'El desglose debe coincidir con el total y el medio elegido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name,payments,cash_amount)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name,v_parts,v_cash);
 return p_request;
end $$;
revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_ef088735e7a84900$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220001_product_compositions.sql','ef088735e7a849006d0960d0e16decd98e257bb432da68ebd2e0d02618f93c84','schema');
 end if;
end;
$retail_step_23$;

-- 24/31: 202610220002_loose_cigarettes.sql
do $retail_step_24$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220002_loose_cigarettes.sql') then
  raise notice 'Aplicando 202610220002_loose_cigarettes.sql';
  execute $retail_source_e943d579b3d7ed4e$
create table public.retail_loose_unit_conversions (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 packet_id uuid not null,
 unit_product_id uuid not null,
 units_per_packet integer not null check(units_per_packet between 2 and 1000),
 packet_stock integer not null check(packet_stock>=0),
 unit_stock integer not null check(unit_stock>=0),
 payload jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(store_id,packet_id),
 foreign key(store_id,packet_id) references public.retail_products(store_id,id),
 foreign key(store_id,unit_product_id) references public.retail_products(store_id,id),
 check(packet_id<>unit_product_id)
);
alter table public.retail_loose_unit_conversions enable row level security;
create policy manager_read on public.retail_loose_unit_conversions for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_loose_unit_conversions from public,anon,authenticated;
grant select on public.retail_loose_unit_conversions to authenticated;

create or replace function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare packet public.retail_products; unit_product public.retail_products; previous public.retail_loose_unit_conversions;
 actor_role text; per_packet integer; target_id uuid; total_units bigint; unit_price numeric; unit_cost numeric; unit_name text; unit_code text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Solo administración puede convertir atados en cigarrillos sueltos'; end if;
 if p_request is null or p_store is null or p_packet is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Faltan datos para convertir el atado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_loose_unit_conversions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.packet_id<>p_packet or previous.created_by<>auth.uid() or previous.payload<>p_data then raise exception 'La solicitud corresponde a otra conversión'; end if;
  return previous.unit_product_id;
 end if;
 if coalesce(p_data->>'units','')!~'^[1-9][0-9]{0,3}$' then raise exception 'Indicá cuántos cigarrillos trae el atado'; end if;
 per_packet:=(p_data->>'units')::integer;
 if per_packet not between 2 and 1000 then raise exception 'Ingresá entre 2 y 1000 cigarrillos por atado'; end if;
 unit_price:=(p_data->>'price')::numeric; unit_cost:=(p_data->>'cost')::numeric;
 if unit_price is null or unit_price<=0 or unit_price>999999999999.99 or unit_price::text in ('NaN','Infinity','-Infinity') or unit_price<>round(unit_price,2) then raise exception 'Revisá el precio por cigarrillo'; end if;
 if unit_cost is null or unit_cost<0 or unit_cost>999999999999.99 or unit_cost::text in ('NaN','Infinity','-Infinity') or unit_cost<>round(unit_cost,2) then raise exception 'Revisá el costo por cigarrillo'; end if;
 target_id:=nullif(p_data->>'target','')::uuid;
 if target_id=p_packet then raise exception 'El atado y el suelto deben ser productos distintos'; end if;
 -- Same order as recipe configuration and checkout. This operation may reverse an
 -- existing incorrect unit -> packet recipe, so lock the store's products in order.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select * into packet from public.retail_products where store_id=p_store and id=p_packet and active;
 if not found then raise exception 'El atado ya no está disponible'; end if;
 if exists(select 1 from public.retail_loose_unit_conversions where store_id=p_store and packet_id=p_packet) then raise exception 'Este atado ya fue convertido. Actualizá el catálogo y usá su producto suelto'; end if;
 if jsonb_array_length(packet.stock_components)<>0 then raise exception 'Abrí este flujo desde el atado que tiene stock propio, no desde el cigarrillo suelto'; end if;
 if jsonb_build_object('name',packet.name,'code',packet.code,'stock',packet.stock,'cost',packet.cost,'price',packet.price,'components',packet.stock_components) is distinct from p_data->'expected_packet' then raise exception 'Cambió el atado o sus existencias. Actualizá el catálogo y revisá la conversión'; end if;
 total_units:=packet.stock::bigint*per_packet;
 if total_units>2147483647 then raise exception 'El stock convertido supera el máximo permitido'; end if;
 if target_id is not null then
  select * into unit_product from public.retail_products where store_id=p_store and id=target_id and active;
  if not found then raise exception 'El producto suelto ya no está disponible'; end if;
  if jsonb_build_object('name',unit_product.name,'code',unit_product.code,'stock',unit_product.stock,'cost',unit_product.cost,'price',unit_product.price,'components',unit_product.stock_components) is distinct from p_data->'expected_unit' then raise exception 'Cambió el producto suelto. Actualizá el catálogo antes de reintentar'; end if;
  if unit_product.stock<>0 then raise exception 'El suelto ya tiene stock propio. Revisá las existencias para evitar contarlas dos veces'; end if;
  if jsonb_array_length(unit_product.stock_components)>0 and not
   (jsonb_array_length(unit_product.stock_components)=1 and unit_product.stock_components->0->>'product_id'=p_packet::text) then raise exception 'El suelto tiene otra composición. Elegí un producto sin stock o vinculado solamente a este atado'; end if;
 else
  unit_name:=trim(p_data->>'name'); unit_code:=trim(p_data->>'code');
  if unit_name is null or length(unit_name) not between 1 and 160 or unit_code is null or length(unit_code) not between 1 and 100 then raise exception 'Completá el nombre y código interno del suelto'; end if;
  if unit_code='MANUAL' or exists(select 1 from public.retail_products where store_id=p_store and code=unit_code) then raise exception 'El código del suelto ya está en uso. Elegí otro código interno'; end if;
  target_id:=p_request;
 end if;
 if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and p.active and p.id<>target_id and c->>'product_id'=p_packet::text) then
  raise exception 'Otros productos consumen este atado. Revisá esas composiciones antes de convertirlo';
 end if;
 if unit_product.id is null then
  insert into public.retail_products(id,store_id,category_id,code,name,price,cost,stock,min_stock,emoji,active,
   brand,supplier,supplier_code,tags,unit_type,pack_size,margin_group,expiry_date,last_restocked_at)
  values(target_id,p_store,packet.category_id,unit_code,unit_name,unit_price,unit_cost,0,
   least(2147483647,packet.min_stock::bigint*per_packet)::integer,packet.emoji,true,
   packet.brand,packet.supplier,null,packet.tags,'unit',per_packet,packet.margin_group,packet.expiry_date,packet.last_restocked_at);
 end if;
 -- Both updates, the audit and movements commit together. The unit keeps all
 -- other metadata when reusing an existing record; packet price/cost stay intact.
 update public.retail_products set stock_components='[]'::jsonb,stock=total_units::integer,
  price=unit_price,cost=unit_cost,pack_size=per_packet,unit_type='unit' where store_id=p_store and id=target_id;
 update public.retail_products set stock=0,stock_components=jsonb_build_array(jsonb_build_object('product_id',target_id::text,'quantity',per_packet))
  where store_id=p_store and id=p_packet;
 insert into public.retail_loose_unit_conversions(id,store_id,packet_id,unit_product_id,units_per_packet,packet_stock,unit_stock,payload,created_by)
 values(p_request,p_store,p_packet,target_id,per_packet,packet.stock,total_units::integer,p_data,auth.uid());
 if packet.stock>0 then
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,p_packet,p_store,auth.uid(),-packet.stock,packet.cost,now()),(p_request,target_id,p_store,auth.uid(),total_units::integer,unit_cost,now());
 end if;
 return target_id;
end $$;
revoke all on function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_e943d579b3d7ed4e$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220002_loose_cigarettes.sql','e943d579b3d7ed4e77e96ffc6c26125f7ccb84ca09dcb9a09a7dde87ed147bad','schema');
 end if;
end;
$retail_step_24$;

-- 25/31: 202610220003_product_deletion_history.sql
do $retail_step_25$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220003_product_deletion_history.sql') then
  raise notice 'Aplicando 202610220003_product_deletion_history.sql';
  execute $retail_source_458a93d670539dd4$
create table public.retail_product_deletions (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 product_id uuid not null,
 product_name text not null,
 product_code text not null,
 event_type text not null check(event_type in ('deleted','restored','prior')),
 occurred_at timestamptz,
 recorded_at timestamptz not null default now(),
 actor_id uuid references auth.users(id) on delete set null,
 actor_email text,
 reason text check(reason is null or length(reason)<=500),
 product_snapshot jsonb not null,
 request_payload jsonb,
 search_text text generated always as (product_name||' '||product_code) stored
);
create index retail_product_deletions_history on public.retail_product_deletions(store_id,recorded_at desc,id desc);
alter table public.retail_product_deletions enable row level security;
create policy manager_read on public.retail_product_deletions for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_product_deletions from public,anon,authenticated;
grant select on public.retail_product_deletions to authenticated;

create or replace function retail_private.audit_product_deletion() returns trigger
language plpgsql security definer set search_path='' as $$
declare context jsonb; event_id uuid:=gen_random_uuid(); actor_email text; reason text; payload jsonb;
begin
 if old.active is not distinct from new.active then return new; end if;
 context:=nullif(current_setting('retail.product_deletion_context',true),'')::jsonb;
 if context->>'store_id'=new.store_id::text and context->>'product_id'=new.id::text then
  event_id:=(context->>'request_id')::uuid; reason:=context->>'reason'; payload:=context->'payload';
 end if;
 select email into actor_email from auth.users where id=auth.uid();
 insert into public.retail_product_deletions(id,store_id,product_id,product_name,product_code,event_type,occurred_at,actor_id,actor_email,reason,product_snapshot,request_payload)
 values(event_id,new.store_id,new.id,new.name,new.code,case when new.active then 'restored' else 'deleted' end,
  now(),auth.uid(),actor_email,reason,case when new.active then to_jsonb(new) else to_jsonb(old) end,payload);
 return new;
end $$;
revoke all on function retail_private.audit_product_deletion() from public,anon,authenticated;
create trigger retail_audit_product_deletion after update of active on public.retail_products
 for each row execute function retail_private.audit_product_deletion();

-- Preserve discovery of already archived records without inventing who/when.
insert into public.retail_product_deletions(store_id,product_id,product_name,product_code,event_type,product_snapshot)
 select store_id,id,name,code,'prior',to_jsonb(p) from public.retail_products p where not active;

create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Solo administración puede eliminar o restaurar productos'; end if;
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;
revoke all on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) from public,anon;
grant execute on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_458a93d670539dd4$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220003_product_deletion_history.sql','458a93d670539dd4bfd36c3f8b4aff69042989aafdea80511ced58e6d5a3f9b7','schema');
 end if;
end;
$retail_step_25$;

-- 26/31: 202610220004_standard_categories.sql
do $retail_step_26$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220004_standard_categories.sql') then
  raise notice 'Aplicando 202610220004_standard_categories.sql';
  execute $retail_source_85e889e22c9dcc55$
create table public.retail_category_catalog (
 name text primary key
);
insert into public.retail_category_catalog(name) values
 ('Aderezos y conservas'),('Aguas y saborizadas'),('Alfajores'),('Almacen'),
 ('Bebidas'),('Bebidas Alcoholicas'),('Cereales y barras'),('Chocolates'),
 ('Cigarrillos'),('Energizantes y deportivas'),('Galletitas y obleas'),
 ('Golosinas'),('Helados'),('Infusiones'),('Jugos'),('Lacteos'),
 ('Panificados y reposteria'),('Snacks'),('Varios');
alter table public.retail_category_catalog enable row level security;
create policy authenticated_read on public.retail_category_catalog for select to authenticated using(true);
revoke all on public.retail_category_catalog from public,anon,authenticated;
grant select on public.retail_category_catalog to authenticated;

alter table public.retail_categories add column catalog_name text references public.retail_category_catalog(name);
alter table public.retail_categories add constraint retail_category_catalog_label check(catalog_name is null or name=catalog_name);
create unique index retail_category_store_catalog on public.retail_categories(store_id,catalog_name) where catalog_name is not null;

create function retail_private.normalize_category_name(p_name text) returns text
language sql immutable set search_path='' as $$
 select regexp_replace(translate(lower(trim(p_name)),'áéíóúüñ','aeiouun'),'\s+',' ','g');
$$;
revoke all on function retail_private.normalize_category_name(text) from public,anon,authenticated;

-- Reuse exact names/IDs. Variants remain preserved as legacy rows.
insert into public.retail_categories(store_id,name,catalog_name)
 select s.id,c.name,c.name from public.retail_stores s cross join public.retail_category_catalog c
 on conflict(store_id,name) do update set catalog_name=excluded.catalog_name;

create table retail_private.product_category_migrations (
 product_id uuid primary key,
 store_id uuid not null,
 previous_category_id uuid not null,
 previous_category_name text not null,
 new_category_id uuid not null,
 migrated_at timestamptz not null default now()
);
revoke all on retail_private.product_category_migrations from public,anon,authenticated;
insert into retail_private.product_category_migrations(product_id,store_id,previous_category_id,previous_category_name,new_category_id)
 select p.id,p.store_id,p.category_id,old.name,target.id
 from public.retail_products p
 join public.retail_categories old on old.store_id=p.store_id and old.id=p.category_id
 left join public.retail_category_catalog known on retail_private.normalize_category_name(known.name)=retail_private.normalize_category_name(old.name)
 join public.retail_categories target on target.store_id=p.store_id and target.catalog_name=coalesce(known.name,'Varios')
 where p.category_id<>target.id;
update public.retail_products p set category_id=m.new_category_id
 from retail_private.product_category_migrations m where m.product_id=p.id and m.store_id=p.store_id;

-- Defense in depth: old clients cannot create or rename categories either.
drop policy if exists manager_insert on public.retail_categories;
drop policy if exists manager_update on public.retail_categories;
revoke insert,update,delete on public.retail_categories from authenticated,anon;
revoke update(name) on public.retail_categories from authenticated,anon;

create function retail_private.resolve_standard_product_category() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous public.retail_categories; canonical text; resolved uuid;
begin
 if new.category_id is not null then
  select * into previous from public.retail_categories where store_id=new.store_id and id=new.category_id;
  if not found then raise exception 'La categoría no pertenece a este comercio. Actualizá el catálogo y reintentá'; end if;
  canonical:=previous.catalog_name;
  if canonical is null then
   select name into canonical from public.retail_category_catalog
    where retail_private.normalize_category_name(name)=retail_private.normalize_category_name(previous.name);
  end if;
 end if;
 select id into resolved from public.retail_categories where store_id=new.store_id and catalog_name=coalesce(canonical,'Varios');
 if resolved is null then raise exception 'Faltan las categorías del comercio. Revisá la migración de categorías estándar'; end if;
 new.category_id:=resolved;
 return new;
end $$;
revoke all on function retail_private.resolve_standard_product_category() from public,anon,authenticated;
create trigger retail_standard_product_category before insert or update of category_id on public.retail_products
 for each row execute function retail_private.resolve_standard_product_category();

-- Same store bootstrap and contract; all nineteen categories now come from SQL.
create or replace function public.retail_create_store(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 insert into public.retail_stores(name,owner_id) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.retail_members(store_id,user_id,role) values(v_id,auth.uid(),'owner');
 insert into public.retail_categories(store_id,name,catalog_name) select v_id,name,name from public.retail_category_catalog;
 insert into public.retail_registers(store_id,name) values(v_id,'Caja principal');
 return v_id;
end $$;
revoke all on function public.retail_create_store(text) from public,anon;
grant execute on function public.retail_create_store(text) to authenticated;
notify pgrst,'reload schema';
$retail_source_85e889e22c9dcc55$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220004_standard_categories.sql','85e889e22c9dcc559736c4af21b9cf7bc0205cbd1ff940ed00ff9d38f481fd13','schema');
 end if;
end;
$retail_step_26$;

-- 27/31: 202610220005_category_labels.sql
do $retail_step_27$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220005_category_labels.sql') then
  raise notice 'Aplicando 202610220005_category_labels.sql';
  execute $retail_source_e975aa6c462d6ee5$
alter table public.retail_categories add column display_name text
 check(display_name is null or length(trim(display_name)) between 1 and 80);
create unique index retail_category_display_name on public.retail_categories
 (store_id,retail_private.normalize_category_name(coalesce(display_name,catalog_name))) where catalog_name is not null;
create function public.retail_rename_category(p_store uuid,p_category uuid,p_name text,p_expected text) returns uuid
language plpgsql security definer set search_path='' as $$
declare category public.retail_categories; label text:=nullif(trim(p_name),'');
begin
 perform retail_private.require_permission(p_store,'manage_categories');
 if coalesce(length(label),0)>80 then raise exception 'Usá un nombre de hasta 80 caracteres'; end if;
 select * into category from public.retail_categories where store_id=p_store and id=p_category and catalog_name is not null for update;
 if not found then raise exception 'Categoría no disponible. Actualizá los datos'; end if;
 if coalesce(category.display_name,category.catalog_name)=coalesce(label,category.catalog_name) then return category.id; end if;
 if p_expected is null or coalesce(category.display_name,category.catalog_name)<>p_expected then raise exception 'Otra persona cambió este nombre. Actualizá los datos y revisá el cambio'; end if;
 update public.retail_categories set display_name=case when label=category.catalog_name then null else label end where id=category.id;
 return category.id;
end $$;
revoke all on function public.retail_rename_category(uuid,uuid,text,text) from public,anon;
grant execute on function public.retail_rename_category(uuid,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
$retail_source_e975aa6c462d6ee5$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220005_category_labels.sql','e975aa6c462d6ee5492edbb36b1ed523a410c634658f8ad36fd24fe18a218f99','schema');
 end if;
end;
$retail_step_27$;

-- 28/31: 202610220006_complete_permission_profiles.sql
do $retail_step_28$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220006_complete_permission_profiles.sql') then
  raise notice 'Aplicando 202610220006_complete_permission_profiles.sql';
  execute $retail_source_913347ffd59472a5$
alter table public.retail_permission_profiles add column revision integer not null default 0;

create function retail_private.can_grant_permissions(p_store uuid,p_permissions text[]) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.role_for(p_store) in ('owner','admin') or
 (retail_private.has_permission(p_store,'manage_profiles') and not exists(
  select 1 from unnest(p_permissions) action where not retail_private.has_permission(p_store,action)));
$$;
revoke all on function retail_private.can_grant_permissions(uuid,text[]) from public,anon;
grant execute on function retail_private.can_grant_permissions(uuid,text[]) to authenticated;

-- Profiles are written only through the validated, concurrent-safe RPC.
revoke insert,update on public.retail_permission_profiles from authenticated,anon;
revoke update(name,permissions) on public.retail_permission_profiles from authenticated,anon;
create function public.retail_save_permission_profile(p_store uuid,p_id uuid,p_name text,p_role text,p_permissions text[],p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.retail_permission_profiles; normalized text[]; label text:=trim(p_name);
begin
 perform retail_private.require_permission(p_store,'manage_profiles');
 if p_id is null or p_role is null or p_role not in ('cashier','supervisor') or label is null or length(label) not between 1 and 80 or p_permissions is null then raise exception 'Revisá nombre, rol y permisos del perfil'; end if;
 select coalesce(array_agg(distinct action order by action),'{}'::text[]) into normalized from unnest(p_permissions) action;
 if not coalesce(retail_private.can_grant_permissions(p_store,normalized),false) then raise exception 'Solo podés conceder permisos que ya tenés' using errcode='42501'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and exists(select 1 from public.retail_members where store_id=p_store and user_id=auth.uid() and profile_id=p_id) then raise exception 'Pedile a otro administrador que cambie tu propio perfil' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into previous from public.retail_permission_profiles where id=p_id for update;
 if found then
  if previous.store_id<>p_store or previous.base_role<>p_role then raise exception 'El perfil no corresponde al comercio o rol'; end if;
  if previous.name=label and previous.permissions @> normalized and previous.permissions <@ normalized then return previous.id; end if;
  if p_revision is null or previous.revision<>p_revision then raise exception 'El perfil cambió en otro dispositivo. Actualizá la lista y revisá los cambios antes de guardar'; end if;
  update public.retail_permission_profiles set name=label,permissions=normalized,revision=revision+1 where id=p_id;
 else
  insert into public.retail_permission_profiles(id,store_id,name,base_role,permissions) values(p_id,p_store,label,p_role,normalized);
 end if;
 return p_id;
end $$;
revoke all on function public.retail_save_permission_profile(uuid,uuid,text,text,text[],integer) from public,anon;
grant execute on function public.retail_save_permission_profile(uuid,uuid,text,text,text[],integer) to authenticated;

-- Direct REST writes and RPCs must enforce the same capabilities.
create function retail_private.guard_product_capabilities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
  return new;
 end if;
 if new.active is distinct from old.active then perform retail_private.require_permission(new.store_id,'delete_products'); end if;
 if new.stock_components is distinct from old.stock_components then perform retail_private.require_permission(new.store_id,'manage_compositions'); end if;
 if (to_jsonb(new)-array['active','stock_components','stock','cost','last_restocked_at','price']) is distinct from
    (to_jsonb(old)-array['active','stock_components','stock','cost','last_restocked_at','price']) and not retail_private.has_permission(new.store_id,'manage_compositions') then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if new.price is distinct from old.price and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'edit_prices'); end if;
 if (new.stock is distinct from old.stock or new.cost is distinct from old.cost or new.last_restocked_at is distinct from old.last_restocked_at)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions')
  and not retail_private.has_permission(new.store_id,'review_remitos') then
  -- Checkout consumes stock with the sell permission; the RPC restricts it to
  -- the caller's valid shift and exact cart. REST updates still require product RLS.
  if not retail_private.has_permission(new.store_id,'sell') then perform retail_private.require_permission(new.store_id,'replenish_stock'); end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_product_capabilities() from public,anon,authenticated;
create trigger retail_product_capabilities before insert or update on public.retail_products for each row execute function retail_private.guard_product_capabilities();
create policy delegated_product_insert on public.retail_products for insert to authenticated with check(retail_private.has_permission(store_id,'manage_products'));
create policy delegated_product_update on public.retail_products for update to authenticated using(retail_private.has_permission(store_id,'manage_products')) with check(retail_private.has_permission(store_id,'manage_products'));
create policy delegated_store_update on public.retail_stores for update to authenticated using(retail_private.has_permission(id,'manage_store')) with check(retail_private.has_permission(id,'manage_store'));

create function retail_private.guard_delegated_staff() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed text[];
begin
 if retail_private.role_for(new.store_id) in ('owner','admin') then return new; end if;
 perform retail_private.require_permission(new.store_id,'manage_staff');
 if new.role not in ('cashier','supervisor') then raise exception 'No podés crear administradores' using errcode='42501'; end if;
 if new.profile_id is null then
  allowed:=array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'];
  if new.role='supervisor' then allowed:=allowed||array['view_sales']; end if;
 else select permissions into allowed from public.retail_permission_profiles where id=new.profile_id and store_id=new.store_id;
 end if;
 if allowed is null or exists(select 1 from unnest(allowed) action where not retail_private.has_permission(new.store_id,action)) then raise exception 'No podés asignar permisos que no tenés' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function retail_private.guard_delegated_staff() from public,anon,authenticated;
create trigger retail_delegated_invite before insert or update on public.retail_invitations for each row execute function retail_private.guard_delegated_staff();
create policy delegated_invites_read on public.retail_invitations for select to authenticated using(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
create policy delegated_invites_create on public.retail_invitations for insert to authenticated with check(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
create policy delegated_invites_delete on public.retail_invitations for delete to authenticated using(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
-- Check open shifts with privileged access; their details remain private.
create function retail_private.can_remove_staff(p_store uuid,p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'manage_staff') and p_target<>auth.uid()
 and exists(select 1 from public.retail_members where store_id=p_store and user_id=p_target and role in ('cashier','supervisor'))
 and not exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null);
$$;
revoke all on function retail_private.can_remove_staff(uuid,uuid) from public,anon;
grant execute on function retail_private.can_remove_staff(uuid,uuid) to authenticated;
create policy delegated_staff_delete on public.retail_members for delete to authenticated using(retail_private.can_remove_staff(store_id,user_id));

create function retail_private.guard_transfer_permission() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform retail_private.require_permission(new.store_id,'manage_transfers'); return new; end $$;
revoke all on function retail_private.guard_transfer_permission() from public,anon,authenticated;
create trigger retail_transfer_capability before insert or update on public.retail_stock_transfers for each row execute function retail_private.guard_transfer_permission();

-- Further capability checks below retain the existing transactional bodies,
-- locking, idempotency, stock calculations and assignment/shift restrictions.

alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;
create policy delegated_insert on public.retail_branches for insert to authenticated with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_update on public.retail_branches for update to authenticated using(retail_private.has_permission(store_id,'manage_locations')) with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_insert on public.retail_registers for insert to authenticated with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_update on public.retail_registers for update to authenticated using(retail_private.has_permission(store_id,'manage_locations')) with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_insert on public.retail_price_lists for insert to authenticated with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_update on public.retail_price_lists for update to authenticated using(retail_private.has_permission(store_id,'manage_price_lists')) with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_insert on public.retail_price_overrides for insert to authenticated with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_update on public.retail_price_overrides for update to authenticated using(retail_private.has_permission(store_id,'manage_price_lists')) with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_insert on public.retail_ledgers for insert to authenticated with check(retail_private.has_permission(store_id,'manage_ledgers'));
create policy delegated_update on public.retail_ledgers for update to authenticated using(retail_private.has_permission(store_id,'manage_ledgers')) with check(retail_private.has_permission(store_id,'manage_ledgers'));
create policy delegated_delete on public.retail_price_overrides for delete to authenticated using(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_history on public.retail_product_deletions for select to authenticated using(retail_private.has_permission(store_id,'delete_products'));
create or replace function retail_private.can_read_remito(p_name text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1) and m.user_id=auth.uid() and retail_private.has_permission(m.store_id,'review_remitos')); $$;

create or replace function public.retail_update_prices(p_store uuid,p_updates jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_price numeric;
begin
 perform retail_private.require_permission(p_store,'edit_prices');
 if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'Precios inválidos'; end if;
 if jsonb_array_length(p_updates) not between 1 and 10000 then raise exception 'Cantidad de cambios inválida'; end if;
 perform id from public.retail_products where store_id=p_store and id in (select (x->>'id')::uuid from jsonb_array_elements(p_updates) x) order by id for update;
 for item in select value from jsonb_array_elements(p_updates) loop
  v_price := (item->>'price')::numeric;
  if v_price is null or v_price <= 0 or v_price >= 1000000000000 or v_price::text in ('NaN','Infinity','-Infinity') or round(v_price,2)<=0 then raise exception 'Precio inválido'; end if;
  update public.retail_products set price=round(v_price,2) where id=(item->>'id')::uuid and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
 end loop;
end $$;

create or replace function public.retail_attach_invoice(p_sale uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 select * into s from public.retail_sales where id=p_sale for update;
 if s.id is null then raise exception 'Venta no disponible'; end if;
 perform retail_private.require_permission(s.store_id,'attach_invoice');
 if not retail_private.can_review_sales(s.store_id,s.shift_id) then raise exception 'Sin acceso a esta venta' using errcode='42501'; end if;
 if s.invoice_reference is not null then
  if s.invoice_reference=trim(p_reference) then return; end if;
  raise exception 'La venta ya tiene un comprobante asociado';
 end if;
 if p_reference is null or length(trim(p_reference)) not between 1 and 120 then raise exception 'Ingresá la referencia del comprobante emitido'; end if;
 update public.retail_sales set invoice_reference=trim(p_reference),invoiced_at=now(),invoiced_by=auth.uid() where id=p_sale;
end $$;

create or replace function public.retail_save_product_composition(p_store uuid,p_product uuid,p_components jsonb,p_expected jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare product public.retail_products; normalized jsonb; previous jsonb;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_compositions');
 if jsonb_typeof(p_components) is distinct from 'array' or jsonb_array_length(p_components)>30 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Composición inválida'; end if;
 -- Configuration and checkout take this lock BEFORE product locks. No nested recipes.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store and
  (id=p_product or id in(select (c->>'product_id')::uuid from jsonb_array_elements(p_components) c)) order by id for update;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active;
 if not found then raise exception 'Producto no disponible'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',((c->>'product_id')::uuid)::text,'quantity',(c->>'quantity')::integer) order by (c->>'product_id')::uuid),'[]'::jsonb) into normalized from jsonb_array_elements(p_components) c;
 select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into previous from jsonb_array_elements(p_expected) c;
 if product.stock_components=normalized then return; end if;
 if product.stock_components is distinct from previous then raise exception 'La composición cambió en otro dispositivo. Actualizá el catálogo antes de reintentar'; end if;
 if jsonb_array_length(product.stock_components)=0 and product.stock<>0 then raise exception 'El producto tiene stock propio. Creá otro producto con stock 0; no se trasladan existencias automáticamente'; end if;
 update public.retail_products set stock_components=normalized where id=p_product;
end $$;

create or replace function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare packet public.retail_products; unit_product public.retail_products; previous public.retail_loose_unit_conversions;
 actor_role text; per_packet integer; target_id uuid; total_units bigint; unit_price numeric; unit_cost numeric; unit_name text; unit_code text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'manage_compositions');
 if p_request is null or p_store is null or p_packet is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Faltan datos para convertir el atado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_loose_unit_conversions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.packet_id<>p_packet or previous.created_by<>auth.uid() or previous.payload<>p_data then raise exception 'La solicitud corresponde a otra conversión'; end if;
  return previous.unit_product_id;
 end if;
 if coalesce(p_data->>'units','')!~'^[1-9][0-9]{0,3}$' then raise exception 'Indicá cuántos cigarrillos trae el atado'; end if;
 per_packet:=(p_data->>'units')::integer;
 if per_packet not between 2 and 1000 then raise exception 'Ingresá entre 2 y 1000 cigarrillos por atado'; end if;
 unit_price:=(p_data->>'price')::numeric; unit_cost:=(p_data->>'cost')::numeric;
 if unit_price is null or unit_price<=0 or unit_price>999999999999.99 or unit_price::text in ('NaN','Infinity','-Infinity') or unit_price<>round(unit_price,2) then raise exception 'Revisá el precio por cigarrillo'; end if;
 if unit_cost is null or unit_cost<0 or unit_cost>999999999999.99 or unit_cost::text in ('NaN','Infinity','-Infinity') or unit_cost<>round(unit_cost,2) then raise exception 'Revisá el costo por cigarrillo'; end if;
 target_id:=nullif(p_data->>'target','')::uuid;
 if target_id=p_packet then raise exception 'El atado y el suelto deben ser productos distintos'; end if;
 -- Same order as recipe configuration and checkout. This operation may reverse an
 -- existing incorrect unit -> packet recipe, so lock the store's products in order.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select * into packet from public.retail_products where store_id=p_store and id=p_packet and active;
 if not found then raise exception 'El atado ya no está disponible'; end if;
 if exists(select 1 from public.retail_loose_unit_conversions where store_id=p_store and packet_id=p_packet) then raise exception 'Este atado ya fue convertido. Actualizá el catálogo y usá su producto suelto'; end if;
 if jsonb_array_length(packet.stock_components)<>0 then raise exception 'Abrí este flujo desde el atado que tiene stock propio, no desde el cigarrillo suelto'; end if;
 if jsonb_build_object('name',packet.name,'code',packet.code,'stock',packet.stock,'cost',packet.cost,'price',packet.price,'components',packet.stock_components) is distinct from p_data->'expected_packet' then raise exception 'Cambió el atado o sus existencias. Actualizá el catálogo y revisá la conversión'; end if;
 total_units:=packet.stock::bigint*per_packet;
 if total_units>2147483647 then raise exception 'El stock convertido supera el máximo permitido'; end if;
 if target_id is not null then
  select * into unit_product from public.retail_products where store_id=p_store and id=target_id and active;
  if not found then raise exception 'El producto suelto ya no está disponible'; end if;
  if jsonb_build_object('name',unit_product.name,'code',unit_product.code,'stock',unit_product.stock,'cost',unit_product.cost,'price',unit_product.price,'components',unit_product.stock_components) is distinct from p_data->'expected_unit' then raise exception 'Cambió el producto suelto. Actualizá el catálogo antes de reintentar'; end if;
  if unit_product.stock<>0 then raise exception 'El suelto ya tiene stock propio. Revisá las existencias para evitar contarlas dos veces'; end if;
  if jsonb_array_length(unit_product.stock_components)>0 and not
   (jsonb_array_length(unit_product.stock_components)=1 and unit_product.stock_components->0->>'product_id'=p_packet::text) then raise exception 'El suelto tiene otra composición. Elegí un producto sin stock o vinculado solamente a este atado'; end if;
 else
  unit_name:=trim(p_data->>'name'); unit_code:=trim(p_data->>'code');
  if unit_name is null or length(unit_name) not between 1 and 160 or unit_code is null or length(unit_code) not between 1 and 100 then raise exception 'Completá el nombre y código interno del suelto'; end if;
  if unit_code='MANUAL' or exists(select 1 from public.retail_products where store_id=p_store and code=unit_code) then raise exception 'El código del suelto ya está en uso. Elegí otro código interno'; end if;
  target_id:=p_request;
 end if;
 if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and p.active and p.id<>target_id and c->>'product_id'=p_packet::text) then
  raise exception 'Otros productos consumen este atado. Revisá esas composiciones antes de convertirlo';
 end if;
 if unit_product.id is null then
  insert into public.retail_products(id,store_id,category_id,code,name,price,cost,stock,min_stock,emoji,active,
   brand,supplier,supplier_code,tags,unit_type,pack_size,margin_group,expiry_date,last_restocked_at)
  values(target_id,p_store,packet.category_id,unit_code,unit_name,unit_price,unit_cost,0,
   least(2147483647,packet.min_stock::bigint*per_packet)::integer,packet.emoji,true,
   packet.brand,packet.supplier,null,packet.tags,'unit',per_packet,packet.margin_group,packet.expiry_date,packet.last_restocked_at);
 end if;
 -- Both updates, the audit and movements commit together. The unit keeps all
 -- other metadata when reusing an existing record; packet price/cost stay intact.
 update public.retail_products set stock_components='[]'::jsonb,stock=total_units::integer,
  price=unit_price,cost=unit_cost,pack_size=per_packet,unit_type='unit' where store_id=p_store and id=target_id;
 update public.retail_products set stock=0,stock_components=jsonb_build_array(jsonb_build_object('product_id',target_id::text,'quantity',per_packet))
  where store_id=p_store and id=p_packet;
 insert into public.retail_loose_unit_conversions(id,store_id,packet_id,unit_product_id,units_per_packet,packet_stock,unit_stock,payload,created_by)
 values(p_request,p_store,p_packet,target_id,per_packet,packet.stock,total_units::integer,p_data,auth.uid());
 if packet.stock>0 then
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,p_packet,p_store,auth.uid(),-packet.stock,packet.cost,now()),(p_request,target_id,p_store,auth.uid(),total_units::integer,unit_cost,now());
 end if;
 return target_id;
end $$;

create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'delete_products');
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;

create or replace function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments; v_items jsonb; v_group record; p public.retail_products; v_qty integer;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='approved' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue rechazado'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,r.items),true);
 -- Lock all products in a stable order, then add to current stock, never a client snapshot.
 perform pr.id from public.retail_products pr where pr.store_id=p_store and pr.id in
  (select (item->>'product_id')::uuid from jsonb_array_elements(v_items) item) order by pr.id for update;
 for v_group in select (item->>'product_id')::uuid as product_id,sum((item->>'quantity')::integer) as quantity
  from jsonb_array_elements(v_items) item group by (item->>'product_id')::uuid loop
  if v_group.quantity>1000000 then raise exception 'La suma por producto supera 1.000.000 de unidades'; end if;
  v_qty:=v_group.quantity::integer;
  select * into p from public.retail_products where id=v_group.product_id and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible'; end if;
  if p.stock>2147483647-v_qty then raise exception 'El stock resultante supera el máximo permitido'; end if;
  update public.retail_products set stock=stock+v_qty where id=p.id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,occurred_at)
   values(r.id,p.id,p_store,auth.uid(),v_qty,now());
 end loop;
 update public.retail_pending_replenishments set items=v_items,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 return r.id;
end $$;

create or replace function public.retail_reject_replenishment(p_store uuid,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'Ingresá un motivo de rechazo (hasta 1.000 caracteres)'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='rejected' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue aprobado'; end if;
 update public.retail_pending_replenishments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=trim(p_reason) where id=r.id;
 return r.id;
end $$;

create or replace function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_request,gen_random_uuid()); existing public.retail_stock_transfers;
 v_item jsonb; v_product uuid; v_qty integer; v_name text; v_items jsonb:='[]'::jsonb;
 v_requested jsonb:='[]'::jsonb; v_existing jsonb; v_notes text:=nullif(trim(p_notes),'');
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 if p_from_branch is null or p_to_branch is null or p_from_branch=p_to_branch then raise exception 'Elegí sucursales de origen y destino diferentes'; end if;
 if length(coalesce(v_notes,''))>2000 then raise exception 'Las notas no pueden superar los 2.000 caracteres'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Agregá al menos un producto'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(v_item->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá los productos y sus cantidades enteras positivas'; end if;
  v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'qty')::integer;
  if v_qty>1000000 then raise exception 'La cantidad por producto no puede superar 1.000.000 de unidades'; end if;
  v_requested:=v_requested||jsonb_build_array(jsonb_build_object('product_id',v_product,'qty',v_qty));
 end loop;
 if (select count(distinct item->>'product_id') from jsonb_array_elements(v_requested) item)<>jsonb_array_length(v_requested) then
  raise exception 'Incluí cada producto una sola vez con su cantidad total'; end if;
 select jsonb_agg(item order by item->>'product_id') into v_requested from jsonb_array_elements(v_requested) item;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into existing from public.retail_stock_transfers where id=v_id;
 if found then
  select jsonb_agg(jsonb_build_object('product_id',item->>'product_id','qty',(item->>'qty')::integer) order by item->>'product_id')
   into v_existing from jsonb_array_elements(existing.items) item;
  if existing.store_id<>p_store or existing.created_by<>auth.uid() or existing.from_branch_id<>p_from_branch or existing.to_branch_id<>p_to_branch
   or existing.notes is distinct from v_notes or v_existing<>v_requested then raise exception 'El identificador ya corresponde a otra transferencia'; end if;
  return existing.id;
 end if;
 if (select count(*) from public.retail_branches where store_id=p_store and id in (p_from_branch,p_to_branch))<>2 then raise exception 'Las sucursales deben pertenecer a este comercio'; end if;
 for v_item in select value from jsonb_array_elements(v_requested) loop
  v_product:=(v_item->>'product_id')::uuid;
  select name into v_name from public.retail_products where id=v_product and store_id=p_store and active;
  if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_product,'product_name',v_name,'qty',(v_item->>'qty')::integer));
 end loop;
 insert into public.retail_stock_transfers(id,store_id,from_branch_id,to_branch_id,created_by,items,notes)
 values(v_id,p_store,p_from_branch,p_to_branch,auth.uid(),v_items,v_notes);
 return v_id;
end $$;

create or replace function public.retail_confirm_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='confirmed' then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia está cancelada'; end if;
 update public.retail_stock_transfers set status='confirmed',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create or replace function public.retail_cancel_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='cancelled' then return t.id; end if;
 if t.status<>'pending' then raise exception 'Una transferencia confirmada conserva su registro histórico'; end if;
 update public.retail_stock_transfers set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create or replace function public.retail_save_ledger_routing(p_store uuid,p_default uuid,p_rules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_ledgers');
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=p_default and active) then raise exception 'Elegí un registro principal activo'; end if;
 if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Reglas inválidas'; end if;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   if entry.key not in ('Efectivo','QR','Transferencia','Debito','Credito','Mixto') or entry.value is null then raise exception 'Medio de pago inválido'; end if;
   if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=entry.value::uuid and active) then raise exception 'El registro elegido ya no está activo'; end if;
 end loop;
 update public.retail_ledgers set is_default=false,payment_methods='{}' where store_id=p_store;
 update public.retail_ledgers set is_default=true where store_id=p_store and id=p_default;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   update public.retail_ledgers set payment_methods=array_append(payment_methods,entry.key) where store_id=p_store and id=entry.value::uuid;
 end loop;
end $$;

create or replace function public.retail_prepare_sales_ledgers(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare general_id uuid; tests_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_ledgers');
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 insert into public.retail_ledgers(store_id,name) values(p_store,'General')
 on conflict(store_id,name) do update set active=true;
 select id into tests_id from public.retail_ledgers where store_id=p_store and name='Pruebas';
 if tests_id is null then
   select id into tests_id from public.retail_ledgers where store_id=p_store and name='Otras ventas' and not is_default;
   if tests_id is not null then
     update public.retail_ledgers set name='Pruebas',active=true where id=tests_id;
   else
     insert into public.retail_ledgers(store_id,name) values(p_store,'Pruebas');
   end if;
 else
   update public.retail_ledgers set active=true where id=tests_id;
 end if;
 select id into general_id from public.retail_ledgers where store_id=p_store and name='General';
 update public.retail_ledgers set is_default=false where store_id=p_store and is_default;
 update public.retail_ledgers set is_default=true where id=general_id;
end $$;

create or replace function public.retail_team(p_store uuid) returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid,profile_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id,m.profile_id from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;

create or replace function public.retail_set_staff_profile(p_store uuid,p_target uuid,p_role text,p_profile uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_staff');
 if p_role is null or p_role not in ('cashier','supervisor') then raise exception 'Elegí Cajero o Supervisor'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') then
  if not p_pending and p_target=auth.uid() then raise exception 'No podes cambiar tu propio acceso'; end if;
  if p_profile is null then
   if exists(select 1 from unnest(case when p_role='supervisor' then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales'] else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end) a where not retail_private.has_permission(p_store,a)) then raise exception 'No podes conceder permisos que no tenes'; end if;
  elsif not exists(select 1 from public.retail_permission_profiles p where p.id=p_profile and p.store_id=p_store and not exists(select 1 from unnest(p.permissions) a where not retail_private.has_permission(p_store,a))) then raise exception 'No podes conceder permisos que no tenes'; end if;
 end if;
 if p_pending then
   select role into old_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
   select role into old_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if old_role is null or old_role not in ('cashier','supervisor') then raise exception 'Solo se pueden cambiar perfiles de cajeros y supervisores'; end if;
 if old_role<>p_role and not p_pending and exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de cambiar su rol'; end if;
 if p_pending then
   update public.retail_invitations set role=p_role,profile_id=p_profile where store_id=p_store and id=p_target;
 else
   update public.retail_members set role=p_role,profile_id=p_profile where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 if retail_private.role_for(p_store) not in ('owner','admin') and not p_pending and p_target=auth.uid() then raise exception 'No podes cambiar tu propia asignacion'; end if;
 if p_pending then select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update; end if;
 if v_role is null or v_role not in ('cashier','supervisor') then raise exception 'Solo se pueden asignar cajeros o supervisores de este comercio'; end if;
 v_branch:=p_branch;
 if p_register is not null then
   select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
   if v_branch is null then raise exception 'Caja no disponible'; end if;
   if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
   if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then raise exception 'La persona debe cerrar su turno antes de cambiar a otra sucursal o caja'; end if;
   update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if not retail_private.has_permission(v_store,'manage_products') then perform retail_private.require_permission(v_store,'replenish_stock'); end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if not retail_private.has_permission(v_store,'manage_products') and retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
-- Configuration metadata is separate from operational register availability.
-- Seeing all location names never grants use of an unassigned register.
create function public.retail_remove_staff(p_store uuid,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target_role text;
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 if p_target=auth.uid() then raise exception 'No podés quitar tu propio acceso'; end if;
 select role into target_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 if not found then return; end if;
 if target_role='owner' or (target_role='admin' and retail_private.role_for(p_store)<>'owner') then raise exception 'No podés quitar este acceso' using errcode='42501'; end if;
 if exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de quitar el acceso'; end if;
 delete from public.retail_members where store_id=p_store and user_id=p_target;
end $$;
revoke all on function public.retail_remove_staff(uuid,uuid) from public,anon;
grant execute on function public.retail_remove_staff(uuid,uuid) to authenticated;
create function public.retail_management_locations(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not (retail_private.has_permission(p_store,'manage_locations') or retail_private.has_permission(p_store,'manage_staff') or retail_private.has_permission(p_store,'manage_transfers') or retail_private.has_permission(p_store,'manage_price_lists') or retail_private.has_permission(p_store,'review_remitos')) then raise exception 'Sin permiso para consultar esta configuración' using errcode='42501'; end if;
 return jsonb_build_object(
  'branches',(select coalesce(jsonb_agg(to_jsonb(b) order by b.name),'[]'::jsonb) from public.retail_branches b where b.store_id=p_store),
  'registers',(select coalesce(jsonb_agg(to_jsonb(r) order by r.name),'[]'::jsonb) from public.retail_registers r where r.store_id=p_store));
end $$;
create function public.retail_write_branch(p_store uuid,p_name text,p_address text,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if p_id is null then insert into public.retail_branches(store_id,name,address) values(p_store,trim(p_name),p_address) returning id into target;
 else update public.retail_branches set name=trim(p_name),address=p_address where store_id=p_store and id=p_id returning id into target; end if;
 if target is null then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 return target;
end $$;
create function public.retail_write_register(p_store uuid,p_name text,p_branch uuid,p_id uuid default null,p_active boolean default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare current_register public.retail_registers; target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if p_branch is not null and not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'La sucursal no pertenece al comercio'; end if;
 if p_id is null then
  insert into public.retail_registers(store_id,name,branch_id,active) values(p_store,trim(p_name),p_branch,coalesce(p_active,true)) returning id into target;
 else
  select * into current_register from public.retail_registers where id=p_id and store_id=p_store for update;
  if not found then raise exception 'Caja no disponible. Actualizá los datos'; end if;
  if ((p_branch is not null and p_branch<>current_register.branch_id) or p_active=false) and exists(select 1 from public.retail_shifts where register_id=p_id and closed_at is null) then raise exception 'Cerrá el turno de esta caja antes de moverla o desactivarla'; end if;
  update public.retail_registers set name=coalesce(trim(p_name),name),branch_id=coalesce(p_branch,branch_id),active=coalesce(p_active,active) where id=p_id returning id into target;
 end if;
 return target;
end $$;
revoke all on function public.retail_management_locations(uuid),public.retail_write_branch(uuid,text,text,uuid),public.retail_write_register(uuid,text,uuid,uuid,boolean) from public,anon;
grant execute on function public.retail_management_locations(uuid),public.retail_write_branch(uuid,text,text,uuid),public.retail_write_register(uuid,text,uuid,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
$retail_source_913347ffd59472a5$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220006_complete_permission_profiles.sql','913347ffd59472a588b214ee3da8ec426cb47fe143db19889896279a221636d5','schema');
 end if;
end;
$retail_step_28$;

-- 29/31: 202610230001_automatic_margin_groups.sql
do $retail_step_29$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610230001_automatic_margin_groups.sql') then
  raise notice 'Aplicando 202610230001_automatic_margin_groups.sql';
  execute $retail_source_6cd429e7679685c4$
alter table public.retail_stores add column low_margin_threshold numeric(5,2) not null default 10
 check(low_margin_threshold between 0 and 100);

create function retail_private.product_margin_group(p_price numeric,p_cost numeric,p_threshold numeric) returns text
language sql immutable set search_path='' as $$
 select case when p_price>0 and p_cost>0 and (p_price-p_cost)*100<p_price*p_threshold then 'low_margin' else 'standard' end;
$$;
revoke all on function retail_private.product_margin_group(numeric,numeric,numeric) from public,anon,authenticated;

create function retail_private.classify_product_margin() returns trigger
language plpgsql security definer set search_path='' as $$
declare threshold numeric;
begin
 -- Price/cost writers serialize with threshold changes; register assignments
 -- and all existing permission checks remain in force.
 select low_margin_threshold into threshold from public.retail_stores where id=new.store_id for share;
 if threshold is null then raise exception 'Comercio no disponible para calcular el margen'; end if;
 new.margin_group:=retail_private.product_margin_group(new.price,new.cost,threshold);
 return new;
end $$;
revoke all on function retail_private.classify_product_margin() from public,anon,authenticated;
-- Run AFTER the existing BEFORE permission/validation triggers. Only the server
-- derives this field, so editing a price does not require full product access.
create trigger retail_zz_classify_margin before insert or update of price,cost,margin_group on public.retail_products
 for each row execute function retail_private.classify_product_margin();

create function public.retail_set_margin_threshold(p_store uuid,p_threshold numeric,p_expected numeric) returns numeric
language plpgsql security definer set search_path='' as $$
declare previous numeric; normalized numeric;
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_threshold is null or p_threshold::text in ('NaN','Infinity','-Infinity') or p_threshold<0 or p_threshold>100 then raise exception 'Usá un porcentaje entre 0 y 100, con hasta dos decimales'; end if;
 normalized:=round(p_threshold,2);
 if normalized<>p_threshold then raise exception 'Usá hasta dos decimales para el límite'; end if;
 -- Threshold writers serialize before taking any row locks. Lock products in
 -- the same UUID order as price/restock RPCs, then lock the store (not reversed).
 perform pg_advisory_xact_lock(hashtextextended('retail-margin:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select low_margin_threshold into previous from public.retail_stores where id=p_store for update;
 if not found then raise exception 'Comercio no disponible'; end if;
 if previous=normalized then return normalized; end if;
 if p_expected is null or previous<>p_expected then raise exception 'Otra persona cambió el límite. Actualizá los datos y revisá el porcentaje antes de guardar'; end if;
 update public.retail_stores set low_margin_threshold=normalized where id=p_store;
 -- Same value: never alter prices. The last BEFORE trigger derives the group,
 -- without demanding product-edit permission from a store-settings delegate.
 update public.retail_products set price=price where store_id=p_store;
 return normalized;
end $$;
revoke all on function public.retail_set_margin_threshold(uuid,numeric,numeric) from public,anon;
grant execute on function public.retail_set_margin_threshold(uuid,numeric,numeric) to authenticated;
-- No UPDATE grant for the threshold column: writes must use the checked RPC.

-- Reclassify current products, including inactive ones, without touching sales.
update public.retail_products set price=price;
notify pgrst,'reload schema';
$retail_source_6cd429e7679685c4$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610230001_automatic_margin_groups.sql','6cd429e7679685c41c4adb245d3ec97ec07eeb202ca421e9640e9a80f49050c2','schema');
 end if;
end;
$retail_step_29$;

-- 30/31: 202610230002_ingredients_and_composition_costs.sql
do $retail_step_30$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610230002_ingredients_and_composition_costs.sql') then
  raise notice 'Aplicando 202610230002_ingredients_and_composition_costs.sql';
  execute $retail_source_86fd19952b8e6534$
alter table public.retail_products add column sellable boolean not null default true;
alter table public.retail_products drop constraint retail_products_price_check;
alter table public.retail_products add constraint retail_products_price_check
 check(price >= 0 and (not sellable or price > 0));
grant update(sellable) on public.retail_products to authenticated;

create function retail_private.guard_product_usage() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not new.sellable then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
 elsif new.sellable is distinct from old.sellable then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_product_usage() from public,anon,authenticated;
create trigger retail_product_usage before insert or update of sellable on public.retail_products
 for each row execute function retail_private.guard_product_usage();

create function retail_private.derive_composition_cost() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipe_cost numeric; known boolean; component_count integer;
begin
 if jsonb_array_length(new.stock_components)>0 then
  select sum(p.cost*(c->>'quantity')::numeric),bool_and(p.cost>0),count(*)
   into recipe_cost,known,component_count
   from jsonb_array_elements(new.stock_components) c
   join public.retail_products p on p.id=(c->>'product_id')::uuid and p.store_id=new.store_id;
  -- 0 is the existing unknown-cost representation: never report a partial sum as full cost.
  if component_count<>jsonb_array_length(new.stock_components) or not coalesce(known,false) then
   new.cost:=0;
  else
   if recipe_cost>999999999999.99 then raise exception 'El costo del combo supera el límite permitido. Revisá cantidades y costos de sus componentes'; end if;
   new.cost:=round(recipe_cost,2);
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.derive_composition_cost() from public,anon,authenticated;
-- Alphabetical trigger order: authorization/recipe validation, then derived cost, then margin.
-- All updates (including old clients) derive the cost; stale form data cannot overwrite it.
create trigger retail_y_derive_composition_cost before insert or update on public.retail_products
 for each row execute function retail_private.derive_composition_cost();
drop trigger retail_zz_classify_margin on public.retail_products;
create trigger retail_zz_classify_margin before insert or update on public.retail_products
 for each row execute function retail_private.classify_product_margin();

create function retail_private.refresh_dependent_composition_costs() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent_id uuid;
begin
 if new.cost is not distinct from old.cost then return new; end if;
 -- No nested recipes are permitted. Derived writes do not grant any new client capability.
 -- Touch an unchanged price so permission guards see no requested catalog/price change;
 -- the later BEFORE triggers derive cost and margin on the server in this transaction.
 for parent_id in select p.id from public.retail_products p
  where p.store_id=new.store_id and p.stock_components @> jsonb_build_array(jsonb_build_object('product_id',new.id))
  order by p.id
 loop
  update public.retail_products set price=price where id=parent_id and store_id=new.store_id;
 end loop;
 return new;
end $$;
revoke all on function retail_private.refresh_dependent_composition_costs() from public,anon,authenticated;
create trigger retail_refresh_recipe_costs after update on public.retail_products
 for each row when (old.cost is distinct from new.cost)
 execute function retail_private.refresh_dependent_composition_costs();

create function retail_private.reject_ingredient_sales() returns trigger
language plpgsql security definer set search_path='' as $$
declare sold public.retail_products; item jsonb;
begin
 for item in select value from jsonb_array_elements(new.items) loop
  if item->>'productId' is not null then
   select * into sold from public.retail_products
    where id=(item->>'productId')::uuid and store_id=new.store_id for share;
   if found and not sold.sellable then
    raise exception '% es solo un insumo. Retiralo de la venta y actualizá el catálogo',sold.name;
   end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function retail_private.reject_ingredient_sales() from public,anon,authenticated;
-- A rejected checkout rolls back all stock updates. Recipes can still consume ingredients.
create trigger retail_reject_ingredient_sales before insert on public.retail_sales
 for each row execute function retail_private.reject_ingredient_sales();

-- Refresh only current recipe costs/margin; physical units, price and ticket snapshots stay intact.
update public.retail_products set price=price where jsonb_array_length(stock_components)>0;
notify pgrst,'reload schema';
$retail_source_86fd19952b8e6534$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610230002_ingredients_and_composition_costs.sql','86fd19952b8e65341957126f53ec64e327dd8f4ed3de54b2d9a3b9a9e3baaffb','schema');
 end if;
end;
$retail_step_30$;

-- 31/31: 202610240001_shift_closing_details.sql
do $retail_step_31$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610240001_shift_closing_details.sql') then
  raise notice 'Aplicando 202610240001_shift_closing_details.sql';
  execute $retail_source_d3204ba0e41d2977$
alter table public.retail_shifts
 add column closing_denominations jsonb,
 add column ticket_count integer check(ticket_count is null or ticket_count>=0);

create function retail_private.cash_denominations_total(p_details jsonb) returns numeric
language plpgsql immutable set search_path='' as $$
declare item record; total numeric:=0;
begin
 if p_details is null then return 0; end if;
 if jsonb_typeof(p_details)<>'object' then raise exception 'Revisá el detalle de billetes'; end if;
 for item in select * from jsonb_each(p_details) loop
  if item.key not in ('10','20','50','100','200','500','1000','2000','10000','20000')
   or jsonb_typeof(item.value)<>'number' or item.value::text!~'^[0-9]{1,7}$' then
   raise exception 'Usá las denominaciones disponibles y cantidades enteras entre 0 y 1.000.000';
  end if;
  if item.value::text::numeric>1000000 then raise exception 'La cantidad de cada billete no puede superar 1.000.000'; end if;
  total:=total+item.key::numeric*item.value::text::numeric;
 end loop;
 return total;
end $$;
revoke all on function retail_private.cash_denominations_total(jsonb) from public,anon,authenticated;

create function retail_private.snapshot_shift_closing() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.closed_at is not null and (new.closing_denominations is distinct from old.closing_denominations
  or new.ticket_count is distinct from old.ticket_count or new.counted_cash is distinct from old.counted_cash) then
  raise exception 'El cierre ya está guardado. No se puede reemplazar su conteo ni su detalle';
 end if;
 if new.closing_denominations is not null then
  if retail_private.cash_denominations_total(new.closing_denominations)>coalesce(new.counted_cash,999999999999.99) then
   raise exception 'Los billetes detallados superan el efectivo contado. Revisá cantidades o total';
  end if;
 end if;
 if old.closed_at is null and new.closed_at is not null then
  -- check_shift serializes checkout and close on this row; all payment methods count once.
  select count(*)::integer into new.ticket_count from public.retail_sales where shift_id=new.id and store_id=new.store_id;
 end if;
 return new;
end $$;
revoke all on function retail_private.snapshot_shift_closing() from public,anon,authenticated;
create trigger retail_snapshot_shift_closing before update of closed_at,counted_cash,closing_denominations,ticket_count
 on public.retail_shifts for each row execute function retail_private.snapshot_shift_closing();

-- Preserve accounting and permission checks in the existing two-argument function.
create function public.retail_close_shift(p_shift uuid,p_counted numeric,p_denominations jsonb) returns numeric
language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts;
begin
 s:=retail_private.check_shift(p_shift);
 if p_counted is null or p_counted<0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 if retail_private.cash_denominations_total(p_denominations)>p_counted then
  raise exception 'Los billetes detallados superan el efectivo contado. Revisá cantidades o total';
 end if;
 update public.retail_shifts set closing_denominations=nullif(p_denominations,'{}'::jsonb) where id=s.id;
 return public.retail_close_shift(p_shift,p_counted);
end $$;
revoke all on function public.retail_close_shift(uuid,numeric,jsonb) from public,anon;
grant execute on function public.retail_close_shift(uuid,numeric,jsonb) to authenticated;

create function public.retail_shift_ticket_count(p_shift uuid) returns integer
language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; total integer;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if auth.uid() is null or s.id is null or retail_private.role_for(s.store_id) is null
  or (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 if s.ticket_count is not null then return s.ticket_count; end if;
 select count(*)::integer into total from public.retail_sales where shift_id=s.id and store_id=s.store_id;
 return total;
end $$;
revoke all on function public.retail_shift_ticket_count(uuid) from public,anon;
grant execute on function public.retail_shift_ticket_count(uuid) to authenticated;

-- Offline replay follows below, preserving the current permission/stock/receipt logic.

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if not retail_private.has_permission(v_store,'manage_products') then perform retail_private.require_permission(v_store,'replenish_stock'); end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if not retail_private.has_permission(v_store,'manage_products') and retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind in ('close','close_details') then
   if v_kind='close_details' then
    v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric,p_operation->'denominations');
   else
    v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   end if;
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount,'ticketCount',(select ticket_count from public.retail_shifts where id=v_shift));
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
revoke all on function public.retail_sync_operation(jsonb) from public,anon;
grant execute on function public.retail_sync_operation(jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_d3204ba0e41d2977$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610240001_shift_closing_details.sql','d3204ba0e41d297710ff1e4a05ea5048c703dbe07b9b266b66a6c7aa7a859759','schema');
 end if;
end;
$retail_step_31$;

notify pgrst,'reload schema';
commit;
-- Solo metadatos de instalación; no expone datos del comercio ni secretos.
select filename,origin,registered_at from retail_private.schema_migrations order by filename;
