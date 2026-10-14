-- Branches are locations inside a store. Stock remains shared by store.
begin;
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
commit;
