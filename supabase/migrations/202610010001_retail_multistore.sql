-- Multi-store retail. Run once in Supabase SQL Editor (or via supabase db push).
-- Existing tables are not changed. No service_role key belongs in the frontend.
begin;
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
commit;
