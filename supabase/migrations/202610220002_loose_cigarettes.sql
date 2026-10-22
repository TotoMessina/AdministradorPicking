-- Explicit, audited packet -> individual-unit conversion. No automatic data conversion.
-- Requires 202610220001_product_compositions.sql; checkout/recipes stay unchanged.
begin;
create table public.retail_loose_unit_conversions (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 packet_id uuid not null,
 unit_product_id uuid not null,
 units_per_packet integer not null check(units_per_packet between 2 and 1000),
 packet_stock integer not null check(packet_stock>=0),
 unit_stock integer not null check(unit_stock>=0),
 payload jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(store_id,packet_id),
 foreign key(store_id,packet_id) references public.retail_products(store_id,id),
 foreign key(store_id,unit_product_id) references public.retail_products(store_id,id),
 check(packet_id<>unit_product_id)
);
alter table public.retail_loose_unit_conversions enable row level security;
create policy manager_read on public.retail_loose_unit_conversions for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_loose_unit_conversions from public,anon,authenticated;
grant select on public.retail_loose_unit_conversions to authenticated;

create or replace function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare packet public.retail_products; unit_product public.retail_products; previous public.retail_loose_unit_conversions;
 actor_role text; per_packet integer; target_id uuid; total_units bigint; unit_price numeric; unit_cost numeric; unit_name text; unit_code text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Solo administración puede convertir atados en cigarrillos sueltos'; end if;
 if p_request is null or p_store is null or p_packet is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Faltan datos para convertir el atado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_loose_unit_conversions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.packet_id<>p_packet or previous.created_by<>auth.uid() or previous.payload<>p_data then raise exception 'La solicitud corresponde a otra conversión'; end if;
  return previous.unit_product_id;
 end if;
 if coalesce(p_data->>'units','')!~'^[1-9][0-9]{0,3}$' then raise exception 'Indicá cuántos cigarrillos trae el atado'; end if;
 per_packet:=(p_data->>'units')::integer;
 if per_packet not between 2 and 1000 then raise exception 'Ingresá entre 2 y 1000 cigarrillos por atado'; end if;
 unit_price:=(p_data->>'price')::numeric; unit_cost:=(p_data->>'cost')::numeric;
 if unit_price is null or unit_price<=0 or unit_price>999999999999.99 or unit_price::text in ('NaN','Infinity','-Infinity') or unit_price<>round(unit_price,2) then raise exception 'Revisá el precio por cigarrillo'; end if;
 if unit_cost is null or unit_cost<0 or unit_cost>999999999999.99 or unit_cost::text in ('NaN','Infinity','-Infinity') or unit_cost<>round(unit_cost,2) then raise exception 'Revisá el costo por cigarrillo'; end if;
 target_id:=nullif(p_data->>'target','')::uuid;
 if target_id=p_packet then raise exception 'El atado y el suelto deben ser productos distintos'; end if;
 -- Same order as recipe configuration and checkout. This operation may reverse an
 -- existing incorrect unit -> packet recipe, so lock the store's products in order.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select * into packet from public.retail_products where store_id=p_store and id=p_packet and active;
 if not found then raise exception 'El atado ya no está disponible'; end if;
 if exists(select 1 from public.retail_loose_unit_conversions where store_id=p_store and packet_id=p_packet) then raise exception 'Este atado ya fue convertido. Actualizá el catálogo y usá su producto suelto'; end if;
 if jsonb_array_length(packet.stock_components)<>0 then raise exception 'Abrí este flujo desde el atado que tiene stock propio, no desde el cigarrillo suelto'; end if;
 if jsonb_build_object('name',packet.name,'code',packet.code,'stock',packet.stock,'cost',packet.cost,'price',packet.price,'components',packet.stock_components) is distinct from p_data->'expected_packet' then raise exception 'Cambió el atado o sus existencias. Actualizá el catálogo y revisá la conversión'; end if;
 total_units:=packet.stock::bigint*per_packet;
 if total_units>2147483647 then raise exception 'El stock convertido supera el máximo permitido'; end if;
 if target_id is not null then
  select * into unit_product from public.retail_products where store_id=p_store and id=target_id and active;
  if not found then raise exception 'El producto suelto ya no está disponible'; end if;
  if jsonb_build_object('name',unit_product.name,'code',unit_product.code,'stock',unit_product.stock,'cost',unit_product.cost,'price',unit_product.price,'components',unit_product.stock_components) is distinct from p_data->'expected_unit' then raise exception 'Cambió el producto suelto. Actualizá el catálogo antes de reintentar'; end if;
  if unit_product.stock<>0 then raise exception 'El suelto ya tiene stock propio. Revisá las existencias para evitar contarlas dos veces'; end if;
  if jsonb_array_length(unit_product.stock_components)>0 and not
   (jsonb_array_length(unit_product.stock_components)=1 and unit_product.stock_components->0->>'product_id'=p_packet::text) then raise exception 'El suelto tiene otra composición. Elegí un producto sin stock o vinculado solamente a este atado'; end if;
 else
  unit_name:=trim(p_data->>'name'); unit_code:=trim(p_data->>'code');
  if unit_name is null or length(unit_name) not between 1 and 160 or unit_code is null or length(unit_code) not between 1 and 100 then raise exception 'Completá el nombre y código interno del suelto'; end if;
  if unit_code='MANUAL' or exists(select 1 from public.retail_products where store_id=p_store and code=unit_code) then raise exception 'El código del suelto ya está en uso. Elegí otro código interno'; end if;
  target_id:=p_request;
 end if;
 if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and p.active and p.id<>target_id and c->>'product_id'=p_packet::text) then
  raise exception 'Otros productos consumen este atado. Revisá esas composiciones antes de convertirlo';
 end if;
 if unit_product.id is null then
  insert into public.retail_products(id,store_id,category_id,code,name,price,cost,stock,min_stock,emoji,active,
   brand,supplier,supplier_code,tags,unit_type,pack_size,margin_group,expiry_date,last_restocked_at)
  values(target_id,p_store,packet.category_id,unit_code,unit_name,unit_price,unit_cost,0,
   least(2147483647,packet.min_stock::bigint*per_packet)::integer,packet.emoji,true,
   packet.brand,packet.supplier,null,packet.tags,'unit',per_packet,packet.margin_group,packet.expiry_date,packet.last_restocked_at);
 end if;
 -- Both updates, the audit and movements commit together. The unit keeps all
 -- other metadata when reusing an existing record; packet price/cost stay intact.
 update public.retail_products set stock_components='[]'::jsonb,stock=total_units::integer,
  price=unit_price,cost=unit_cost,pack_size=per_packet,unit_type='unit' where store_id=p_store and id=target_id;
 update public.retail_products set stock=0,stock_components=jsonb_build_array(jsonb_build_object('product_id',target_id::text,'quantity',per_packet))
  where store_id=p_store and id=p_packet;
 insert into public.retail_loose_unit_conversions(id,store_id,packet_id,unit_product_id,units_per_packet,packet_stock,unit_stock,payload,created_by)
 values(p_request,p_store,p_packet,target_id,per_packet,packet.stock,total_units::integer,p_data,auth.uid());
 if packet.stock>0 then
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,p_packet,p_store,auth.uid(),-packet.stock,packet.cost,now()),(p_request,target_id,p_store,auth.uid(),total_units::integer,unit_cost,now());
 end if;
 return target_id;
end $$;
revoke all on function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
