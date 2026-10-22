begin;

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
commit;
