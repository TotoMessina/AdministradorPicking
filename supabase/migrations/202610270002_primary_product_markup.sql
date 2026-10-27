-- Global Principal list + product percentage over cost. Apply after all prior files.
-- Explicitly requested: existing list roots now inherit Principal, retaining their
-- adjustments and fixed prices. This CAN change derived selling prices. Tickets,
-- stock, branch assignments and already recorded sale snapshots are not rewritten.
-- Synchronize devices/queues and review open carts before applying this update.
begin;
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
commit;
