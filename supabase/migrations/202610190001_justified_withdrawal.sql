begin;

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
commit;
