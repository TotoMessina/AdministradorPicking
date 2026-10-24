-- Optional banknotes and authoritative ticket counts. Apply after 202610230002.
-- Old shifts stay unchanged; two-argument closing and old offline payloads remain valid.
begin;
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
commit;
