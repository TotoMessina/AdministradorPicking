begin;
create table public.retail_pending_replenishments (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), branch_id uuid,
 submitted_by uuid not null references auth.users(id), submitted_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 image_url text not null unique, extracted_text text, items jsonb not null default '[]'::jsonb,
 notes text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz, rejection_reason text,
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=200),
 check(length(coalesce(notes,''))<=2000 and length(coalesce(extracted_text,''))<=100000),
 check((status='pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
  or (status='approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
  or (status='rejected' and reviewed_by is not null and reviewed_at is not null and rejection_reason is not null and length(trim(rejection_reason)) between 1 and 1000))
);
create index retail_pending_replenishments_store_status on public.retail_pending_replenishments(store_id,status,submitted_at,id);
alter table public.retail_pending_replenishments enable row level security;
create policy member_read on public.retail_pending_replenishments for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_create on public.retail_pending_replenishments for insert to authenticated
 with check(retail_private.role_for(store_id) is not null and submitted_by=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);
create policy manager_review on public.retail_pending_replenishments for update to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
-- Writes must go through the RPCs so changing a status cannot bypass validation/stock.
revoke all on public.retail_pending_replenishments from public,anon,authenticated;
grant select on public.retail_pending_replenishments to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('retail-remitos','retail-remitos',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','image/bmp','image/tiff'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function retail_private.can_upload_remito(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(p_name,'/');
 v_uuid text:='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
 if auth.uid() is null or coalesce(array_length(parts,1),0)<>3 or parts[1]!~v_uuid or parts[2]<>auth.uid()::text or
  parts[3]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif)$' then return false; end if;
 return retail_private.role_for(parts[1]::uuid) is not null;
end $$;
create function retail_private.can_read_remito(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1)
  and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function retail_private.can_upload_remito(text),retail_private.can_read_remito(text) from public,anon;
grant execute on function retail_private.can_upload_remito(text),retail_private.can_read_remito(text) to authenticated;
create policy retail_remitos_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-remitos' and retail_private.can_upload_remito(name));
create policy retail_remitos_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-remitos' and retail_private.can_read_remito(name));

create function retail_private.validate_remito_items(p_store uuid,p_items jsonb,p_require_links boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb:='[]'::jsonb; v_item jsonb; v_product public.retail_products; v_id uuid;
 v_line text; v_name text; v_qty integer; v_pack integer; v_confidence numeric;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200
  or (p_require_links and jsonb_array_length(p_items)=0) then raise exception 'Ingresá entre 1 y 200 artículos para aprobar (o enviá solo la foto para revisión)'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'quantity','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Cada cantidad debe ser un entero positivo en unidades individuales'; end if;
  v_qty:=(v_item->>'quantity')::integer;
  if v_qty>1000000 then raise exception 'La cantidad supera 1.000.000 de unidades'; end if;
  v_line:=trim(coalesce(v_item->>'invoice_line','')); v_name:=trim(coalesce(v_item->>'product_name',v_line));
  if length(v_line) not between 1 and 500 or length(v_name) not between 1 and 500 then raise exception 'Revisá las descripciones de los artículos'; end if;
  v_id:=nullif(v_item->>'product_id','')::uuid;
  if v_id is null then
   if p_require_links then raise exception 'Vinculá todos los artículos a productos del catálogo antes de aprobar'; end if;
  else
   select * into v_product from public.retail_products where id=v_id and store_id=p_store and active;
   if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
   v_name:=v_product.name;
  end if;
  v_pack:=null;
  if v_item->>'pack_size' is not null then
   if (v_item->>'pack_size')!~'^[1-9][0-9]{0,6}$' then raise exception 'La presentación del bulto es inválida'; end if;
   v_pack:=(v_item->>'pack_size')::integer;
   if v_pack>1000000 then raise exception 'La presentación del bulto es inválida'; end if;
  end if;
  v_confidence:=null;
  if jsonb_typeof(v_item->'confidence')='number' then v_confidence:=greatest(0,least(1,(v_item->>'confidence')::numeric)); end if;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('invoice_line',v_line,'product_id',v_id,'product_name',v_name,'quantity',v_qty,'pack_size',v_pack,'confidence',v_confidence));
 end loop;
 return v_result;
end $$;
revoke all on function retail_private.validate_remito_items(uuid,jsonb,boolean) from public,anon,authenticated;

create function public.retail_submit_pending_replenishment(p_store uuid,p_branch uuid,p_image_url text,p_extracted_text text,p_items jsonb,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_path text; v_id uuid; existing public.retail_pending_replenishments; v_items jsonb;
 v_role text:=retail_private.role_for(p_store); v_assigned uuid;
begin
 if auth.uid() is null or v_role is null then raise exception 'Sin acceso al comercio'; end if;
 v_path:=substring(p_image_url from '^https?://[^/]+/storage/v1/object/authenticated/retail-remitos/(.*)$');
 if v_path is null or split_part(v_path,'/',1)<>p_store::text or not retail_private.can_upload_remito(v_path) then raise exception 'La foto no corresponde a este comercio y usuario'; end if;
 v_id:=split_part(split_part(v_path,'/',3),'.',1)::uuid;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,1));
 select * into existing from public.retail_pending_replenishments where id=v_id;
 if found then
  if existing.store_id<>p_store or existing.submitted_by<>auth.uid() or existing.image_url<>p_image_url then raise exception 'La foto ya corresponde a otro envío'; end if;
  return existing.id;
 end if;
 if p_branch is not null and not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if v_role='cashier' then
  select coalesce(m.branch_id,r.branch_id) into v_assigned from public.retail_members m left join public.retail_registers r on r.id=m.register_id and r.store_id=m.store_id where m.store_id=p_store and m.user_id=auth.uid();
  if v_assigned is not null and p_branch is distinct from v_assigned then raise exception 'Usá la sucursal asignada a tu cuenta'; end if;
 end if;
 if length(coalesce(p_notes,''))>2000 or length(coalesce(p_extracted_text,''))>100000 then raise exception 'El texto o las notas superan el tamaño permitido'; end if;
 perform 1 from storage.objects o where o.bucket_id='retail-remitos' and o.name=v_path
  and coalesce(nullif(to_jsonb(o)->>'owner_id',''),to_jsonb(o)->>'owner')=auth.uid()::text for share;
 if not found then raise exception 'Primero subí la foto del remito'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,'[]'::jsonb),false);
 insert into public.retail_pending_replenishments(id,store_id,branch_id,submitted_by,image_url,extracted_text,items,notes)
 values(v_id,p_store,p_branch,auth.uid(),p_image_url,nullif(p_extracted_text,''),v_items,nullif(trim(p_notes),''));
 return v_id;
end $$;

create function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments; v_items jsonb; v_group record; p public.retail_products; v_qty integer;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede aprobar ingresos de stock'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='approved' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue rechazado'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,r.items),true);
 -- Lock all products in a stable order, then add to current stock, never a client snapshot.
 perform pr.id from public.retail_products pr where pr.store_id=p_store and pr.id in
  (select (item->>'product_id')::uuid from jsonb_array_elements(v_items) item) order by pr.id for update;
 for v_group in select (item->>'product_id')::uuid as product_id,sum((item->>'quantity')::integer) as quantity
  from jsonb_array_elements(v_items) item group by (item->>'product_id')::uuid loop
  if v_group.quantity>1000000 then raise exception 'La suma por producto supera 1.000.000 de unidades'; end if;
  v_qty:=v_group.quantity::integer;
  select * into p from public.retail_products where id=v_group.product_id and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible'; end if;
  if p.stock>2147483647-v_qty then raise exception 'El stock resultante supera el máximo permitido'; end if;
  update public.retail_products set stock=stock+v_qty where id=p.id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,occurred_at)
   values(r.id,p.id,p_store,auth.uid(),v_qty,now());
 end loop;
 update public.retail_pending_replenishments set items=v_items,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 return r.id;
end $$;

create function public.retail_reject_replenishment(p_store uuid,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede rechazar remitos'; end if;
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'Ingresá un motivo de rechazo (hasta 1.000 caracteres)'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='rejected' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue aprobado'; end if;
 update public.retail_pending_replenishments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=trim(p_reason) where id=r.id;
 return r.id;
end $$;
revoke all on function public.retail_submit_pending_replenishment(uuid,uuid,text,text,jsonb,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_reject_replenishment(uuid,uuid,text) from public,anon;
grant execute on function public.retail_submit_pending_replenishment(uuid,uuid,text,text,jsonb,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_reject_replenishment(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
