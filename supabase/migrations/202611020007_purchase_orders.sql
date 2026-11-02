begin;
-- Pedidos a proveedores: se arman con sugerencias, se guardan, se envían a mano (WhatsApp o copiar)
-- y, al cargar la factura con el lector, se guarda lo recibido para comparar contra lo pedido.

create function retail_private.can_order(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false)
  or retail_private.has_permission(p_store,'manage_products') or retail_private.has_permission(p_store,'manage_supplier_accounts');
$$;
revoke all on function retail_private.can_order(uuid) from public,anon;
grant execute on function retail_private.can_order(uuid) to authenticated;

create table public.retail_purchase_orders (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 supplier_id uuid references public.retail_suppliers(id) on delete set null,
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 branch_id uuid not null,
 status text not null default 'draft' check(status in ('draft','sent','received','cancelled')),
 notes text check(notes is null or length(notes)<=1000),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), sent_at timestamptz,
 -- Lo que trajo la factura: [{product_id, name, qty, unit_cost}] en unidades y costo final por unidad.
 receipt jsonb check(receipt is null or jsonb_typeof(receipt)='array'),
 received_at timestamptz, received_by uuid references auth.users(id), received_email text,
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 check((status='received')=(receipt is not null))
);
create index retail_purchase_orders_store on public.retail_purchase_orders(store_id,created_at desc);

create table public.retail_purchase_order_lines (
 order_id uuid not null references public.retail_purchase_orders(id), store_id uuid not null, product_id uuid not null,
 product_name text not null, qty integer not null check(qty between 1 and 1000000),
 -- Costo del producto al pedir: sirve para detectar aumentos en la factura.
 unit_cost numeric(14,2), suggested integer check(suggested is null or suggested>=0),
 primary key(order_id,product_id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);

alter table public.retail_purchase_orders enable row level security;
alter table public.retail_purchase_order_lines enable row level security;
create policy buyers_read on public.retail_purchase_orders for select to authenticated using(retail_private.can_order(store_id));
create policy buyers_read on public.retail_purchase_order_lines for select to authenticated using(retail_private.can_order(store_id));
revoke all on public.retail_purchase_orders,public.retail_purchase_order_lines from public,anon,authenticated;
grant select on public.retail_purchase_orders,public.retail_purchase_order_lines to authenticated;

-- Unidades vendidas por producto y sucursal en los últimos días, con los combos descontados por sus componentes.
create function public.retail_product_sales_velocity(p_store uuid,p_days integer default 28) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_days is null or p_days not between 1 and 180 then raise exception 'Elegí entre 1 y 180 días'; end if;
 return (with item as (
  select s.branch_id,i.value as line from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
  where s.store_id=p_store and s.return_status<>'voided' and s.created_at>=now()-make_interval(days=>p_days)
 ), units as (
  select branch_id,(line->>'productId')::uuid as product_id,(line->>'qty')::numeric as qty from item
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))=0
  union all
  select branch_id,(c->>'product_id')::uuid,(line->>'qty')::numeric*(c->>'quantity')::numeric from item cross join lateral jsonb_array_elements(line->'stockComponents') c
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))>0
 ) select coalesce(jsonb_agg(jsonb_build_object('product_id',product_id,'branch_id',branch_id,'units',units)),'[]'::jsonb)
   from (select product_id,branch_id,sum(qty) as units from units group by product_id,branch_id) t);
end $$;

-- Guardar o editar un pedido mientras no esté recibido ni cancelado. Repetir el guardado no duplica renglones.
create function public.retail_save_purchase_order(p_store uuid,p_id uuid,p_order jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_purchase_orders; v_supplier uuid:=nullif(p_order->>'supplier_id','')::uuid; v_name text:=btrim(coalesce(p_order->>'supplier_name',''));
 v_branch uuid:=nullif(p_order->>'branch_id','')::uuid; v_line jsonb; v_product public.retail_products;
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos del pedido incompletos'; end if;
 if jsonb_typeof(p_order->'lines') is distinct from 'array' or jsonb_array_length(p_order->'lines') not between 1 and 1000 then raise exception 'El pedido no tiene productos'; end if;
 if v_supplier is not null then
  select name into v_name from public.retail_suppliers where id=v_supplier and store_id=p_store;
  if not found then raise exception 'Proveedor no disponible'; end if;
 end if;
 if length(v_name) not between 1 and 120 then raise exception 'Elegí o escribí el proveedor'; end if;
 if v_branch is null or not exists(select 1 from public.retail_branches where store_id=p_store and id=v_branch) then raise exception 'Elegí la sucursal del pedido'; end if;
 perform pg_advisory_xact_lock(hashtextextended('purchase-order:'||p_id::text,0));
 select * into v_existing from public.retail_purchase_orders where id=p_id for update;
 if found then
  if v_existing.store_id<>p_store then raise exception 'El identificador ya corresponde a otro comercio'; end if;
  if v_existing.status in ('received','cancelled') then raise exception 'Este pedido ya está cerrado'; end if;
  update public.retail_purchase_orders set supplier_id=v_supplier,supplier_name=v_name,branch_id=v_branch,
   notes=nullif(btrim(coalesce(p_order->>'notes','')),''),updated_at=now() where id=p_id;
  delete from public.retail_purchase_order_lines where order_id=p_id;
 else
  insert into public.retail_purchase_orders(id,store_id,supplier_id,supplier_name,branch_id,notes,created_by,actor_email)
  values(p_id,p_store,v_supplier,v_name,v_branch,nullif(btrim(coalesce(p_order->>'notes','')),''),auth.uid(),auth.jwt()->>'email');
 end if;
 for v_line in select value from jsonb_array_elements(p_order->'lines') loop
  if coalesce(v_line->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá las cantidades del pedido'; end if;
  select * into v_product from public.retail_products where id=nullif(v_line->>'product_id','')::uuid and store_id=p_store;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
  insert into public.retail_purchase_order_lines(order_id,store_id,product_id,product_name,qty,unit_cost,suggested)
  values(p_id,p_store,v_product.id,v_product.name,(v_line->>'qty')::integer,nullif(v_product.cost,0),nullif(v_line->>'suggested','')::integer)
  on conflict(order_id,product_id) do update set qty=excluded.qty,suggested=excluded.suggested;
 end loop;
 return p_id;
end $$;

create function public.retail_set_purchase_order_status(p_store uuid,p_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare v_order public.retail_purchase_orders;
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_status not in ('sent','cancelled') then raise exception 'Estado inválido'; end if;
 select * into v_order from public.retail_purchase_orders where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Pedido no disponible'; end if;
 if v_order.status=p_status then return; end if;
 if v_order.status in ('received','cancelled') then raise exception 'Este pedido ya está cerrado'; end if;
 update public.retail_purchase_orders set status=p_status,sent_at=case when p_status='sent' then coalesce(sent_at,now()) else sent_at end,updated_at=now() where id=p_id;
end $$;

-- Al cargar una factura con el lector: se guarda lo recibido en el pedido abierto más reciente
-- del mismo proveedor y sucursal. Devuelve el pedido o null si no había ninguno.
create function public.retail_receive_purchase_order(p_store uuid,p_supplier_name text,p_branch uuid,p_receipt jsonb,p_order uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_order public.retail_purchase_orders; v_key text:=retail_private.normalize_supplier(coalesce(p_supplier_name,''));
begin
 if not retail_private.can_order(p_store) then return null; end if;
 if jsonb_typeof(p_receipt) is distinct from 'array' or jsonb_array_length(p_receipt) not between 1 and 2000 then raise exception 'La factura no tiene renglones'; end if;
 if exists(select 1 from jsonb_array_elements(p_receipt) x where nullif(x->>'product_id','') is null or coalesce(x->>'qty','')!~'^[0-9]+(\.[0-9]+)?$') then raise exception 'Renglones de factura inválidos'; end if;
 if p_order is not null then
  select * into v_order from public.retail_purchase_orders where id=p_order and store_id=p_store and status in ('draft','sent') for update;
 else
  select * into v_order from public.retail_purchase_orders where store_id=p_store and status in ('draft','sent') and branch_id is not distinct from p_branch
   and v_key<>'' and retail_private.normalize_supplier(supplier_name)=v_key order by coalesce(sent_at,created_at) desc limit 1 for update;
 end if;
 if not found then return null; end if;
 update public.retail_purchase_orders set status='received',receipt=p_receipt,received_at=now(),received_by=auth.uid(),received_email=auth.jwt()->>'email',updated_at=now()
  where id=v_order.id;
 return v_order.id;
end $$;

revoke all on function public.retail_product_sales_velocity(uuid,integer),public.retail_save_purchase_order(uuid,uuid,jsonb),
 public.retail_set_purchase_order_status(uuid,uuid,text),public.retail_receive_purchase_order(uuid,text,uuid,jsonb,uuid) from public,anon;
grant execute on function public.retail_product_sales_velocity(uuid,integer),public.retail_save_purchase_order(uuid,uuid,jsonb),
 public.retail_set_purchase_order_status(uuid,uuid,text),public.retail_receive_purchase_order(uuid,text,uuid,jsonb,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
