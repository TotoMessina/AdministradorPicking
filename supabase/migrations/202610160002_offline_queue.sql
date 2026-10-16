begin;
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
commit;
