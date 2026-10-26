-- Optional shared depot. retail_products.stock remains the physical total.
-- Existing inventory stays entirely in the sales area; no allocations/backfills.
begin;
alter table public.retail_stores add column depot_enabled boolean not null default false;

create table public.retail_depot_balances (
 product_id uuid primary key references public.retail_products(id),
 store_id uuid not null references public.retail_stores(id),
 quantity integer not null check(quantity>=0),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create index retail_depot_balances_store on public.retail_depot_balances(store_id);
create table public.retail_depot_movements (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id),
 product_id uuid not null references public.retail_products(id),
 product_name text not null,
 action text not null check(action in ('to_salon','to_depot','receive')),
 quantity integer not null check(quantity between 1 and 1000000),
 total_after integer not null,
 depot_after integer not null,
 actor_id uuid not null references auth.users(id),
 actor_email text,
 created_at timestamptz not null default now(),
 payload jsonb not null,
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create index retail_depot_movements_store on public.retail_depot_movements(store_id,created_at desc);
alter table public.retail_depot_balances enable row level security;
alter table public.retail_depot_movements enable row level security;
revoke all on public.retail_depot_balances,public.retail_depot_movements from public,anon,authenticated;
grant select on public.retail_depot_balances,public.retail_depot_movements to authenticated;
create policy depot_balance_read on public.retail_depot_balances for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy depot_movement_read on public.retail_depot_movements for select to authenticated
 using(retail_private.has_permission(store_id,'manage_products') or retail_private.has_permission(store_id,'replenish_stock') or retail_private.has_permission(store_id,'manage_store'));

-- Also protects legacy checkout clients, stock edits, recipes and direct REST calls.
create function retail_private.guard_depot_inventory() returns trigger
language plpgsql security definer set search_path='' as $$
declare reserved integer;
begin
 if tg_op='UPDATE' then
  if new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de un producto'; end if;
 end if;
 select quantity into reserved from public.retail_depot_balances where product_id=new.id;
 reserved:=coalesce(reserved,0);
 if new.stock<reserved then
  raise exception 'Stock de salón insuficiente para %. Hay % unidades en depósito. Reponé el salón o revisá el stock total',new.name,reserved;
 end if;
 if not new.active and reserved>0 then raise exception 'Pasá primero las unidades de % del depósito al salón antes de eliminar el producto',new.name; end if;
 return new;
end $$;
revoke all on function retail_private.guard_depot_inventory() from public,anon,authenticated;
create trigger retail_guard_depot_inventory before insert or update of stock,active,store_id on public.retail_products
 for each row execute function retail_private.guard_depot_inventory();

create function retail_private.guard_depot_setting() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.depot_enabled is distinct from old.depot_enabled then
  perform retail_private.require_permission(new.id,'manage_store');
  if not new.depot_enabled and exists(select 1 from public.retail_depot_balances where store_id=new.id and quantity>0) then
   raise exception 'Todavía hay mercadería en depósito. Pasala al salón antes de desactivar; no se borra ni se mueve automáticamente';
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_depot_setting() from public,anon,authenticated;
create trigger retail_guard_depot_setting before update of depot_enabled on public.retail_stores
 for each row execute function retail_private.guard_depot_setting();

create function public.retail_set_depot(p_store uuid,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_enabled is null then raise exception 'Indicá si usás depósito'; end if;
 update public.retail_stores set depot_enabled=p_enabled where id=p_store;
end $$;
revoke all on function public.retail_set_depot(uuid,boolean) from public,anon;
grant execute on function public.retail_set_depot(uuid,boolean) to authenticated;

create function public.retail_depot_operation(p_store uuid,p_product uuid,p_quantity integer,p_action text,p_request uuid,p_cost numeric default null,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.retail_products; previous public.retail_depot_movements; reserved integer;
 enabled boolean; signature jsonb; note text:=nullif(trim(p_note),'');
begin
 if retail_private.has_permission(p_store,'manage_products') then
  perform retail_private.require_permission(p_store,'manage_products');
 else perform retail_private.require_permission(p_store,'replenish_stock'); end if;
 if p_request is null or p_quantity is null or p_quantity not between 1 and 1000000 or p_action is null or p_action not in ('to_salon','to_depot','receive') then raise exception 'Revisá la operación y la cantidad de unidades'; end if;
 if p_cost is not null and (p_action<>'receive' or p_cost<0 or p_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
 if p_cost is not null then perform retail_private.require_permission(p_store,'manage_products'); end if;
 if length(note)>300 then raise exception 'La referencia admite hasta 300 caracteres'; end if;
 signature:=jsonb_build_object('product',p_product,'quantity',p_quantity,'action',p_action,'cost',p_cost,'note',note);
 perform pg_advisory_xact_lock(hashtextextended('depot:'||p_request::text,0));
 select * into previous from public.retail_depot_movements where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.actor_id<>auth.uid() or previous.payload<>signature then raise exception 'La solicitud corresponde a otra operación de depósito'; end if;
  return previous.id;
 end if;
 -- Consistent lock order: setting first, then product. Checkout locks the product too.
 select depot_enabled into enabled from public.retail_stores where id=p_store for share;
 if not coalesce(enabled,false) then raise exception 'El depósito no está habilitado. Actualizá los datos del comercio'; end if;
 select * into p from public.retail_products where id=p_product and store_id=p_store and active for update;
 if not found then raise exception 'Producto no disponible. Actualizá el catálogo'; end if;
 if jsonb_array_length(p.stock_components)>0 then raise exception 'Mové o recibí los componentes; el combo no tiene stock físico propio'; end if;
 select quantity into reserved from public.retail_depot_balances where product_id=p.id;
 reserved:=coalesce(reserved,0);
 if p_action='to_salon' then
  if reserved<p_quantity then raise exception 'No alcanza el stock del depósito para %. Actualizá y revisá la cantidad',p.name; end if;
  reserved:=reserved-p_quantity;
 elsif p_action='to_depot' then
  if p.stock-reserved<p_quantity then raise exception 'No alcanza el stock del salón para %. Actualizá y revisá la cantidad',p.name; end if;
  reserved:=reserved+p_quantity;
 else
  if p.stock::bigint+p_quantity>2147483647 then raise exception 'El stock resultante supera el límite permitido'; end if;
  update public.retail_products set stock=stock+p_quantity,cost=coalesce(p_cost,cost),last_restocked_at=now() where id=p.id;
  p.stock:=p.stock+p_quantity;
  reserved:=reserved+p_quantity;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
   values(p_request,p.id,p_store,auth.uid(),p_quantity,p_cost,now());
 end if;
 insert into public.retail_depot_balances(product_id,store_id,quantity) values(p.id,p_store,reserved)
  on conflict(product_id) do update set quantity=excluded.quantity;
 insert into public.retail_depot_movements(id,store_id,product_id,product_name,action,quantity,total_after,depot_after,actor_id,actor_email,payload)
  values(p_request,p_store,p.id,p.name,p_action,p_quantity,p.stock,reserved,auth.uid(),auth.jwt()->>'email',signature);
 return p_request;
end $$;
revoke all on function public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text) from public,anon;
grant execute on function public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text) to authenticated;
notify pgrst,'reload schema';
commit;
