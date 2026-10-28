begin;
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
commit;
