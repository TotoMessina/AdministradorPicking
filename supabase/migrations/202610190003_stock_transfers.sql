begin;

-- Internal audit records only: these functions never update product stock.
create table public.retail_stock_transfers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 from_branch_id uuid not null, to_branch_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 notes text, status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 items jsonb not null, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 foreign key(store_id,from_branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,to_branch_id) references public.retail_branches(store_id,id),
 check(from_branch_id<>to_branch_id), check(length(coalesce(notes,''))<=2000),
 check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 200),
 check((status='pending' and reviewed_by is null and reviewed_at is null)
  or (status in ('confirmed','cancelled') and reviewed_by is not null and reviewed_at is not null))
);
create index retail_stock_transfers_history on public.retail_stock_transfers(store_id,created_at desc,id);
alter table public.retail_stock_transfers enable row level security;
create policy member_read on public.retail_stock_transfers for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_create on public.retail_stock_transfers for insert to authenticated
 with check(retail_private.role_for(store_id) is not null and created_by=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);
create policy manager_review on public.retail_stock_transfers for update to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
-- RPC-only writes preserve item validation, idempotency and review audit fields.
revoke all on public.retail_stock_transfers from public,anon,authenticated;
grant select on public.retail_stock_transfers to authenticated;

create function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_request,gen_random_uuid()); existing public.retail_stock_transfers;
 v_item jsonb; v_product uuid; v_qty integer; v_name text; v_items jsonb:='[]'::jsonb;
 v_requested jsonb:='[]'::jsonb; v_existing jsonb; v_notes text:=nullif(trim(p_notes),'');
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if p_from_branch is null or p_to_branch is null or p_from_branch=p_to_branch then raise exception 'Elegí sucursales de origen y destino diferentes'; end if;
 if length(coalesce(v_notes,''))>2000 then raise exception 'Las notas no pueden superar los 2.000 caracteres'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Agregá al menos un producto'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(v_item->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá los productos y sus cantidades enteras positivas'; end if;
  v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'qty')::integer;
  if v_qty>1000000 then raise exception 'La cantidad por producto no puede superar 1.000.000 de unidades'; end if;
  v_requested:=v_requested||jsonb_build_array(jsonb_build_object('product_id',v_product,'qty',v_qty));
 end loop;
 if (select count(distinct item->>'product_id') from jsonb_array_elements(v_requested) item)<>jsonb_array_length(v_requested) then
  raise exception 'Incluí cada producto una sola vez con su cantidad total'; end if;
 select jsonb_agg(item order by item->>'product_id') into v_requested from jsonb_array_elements(v_requested) item;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into existing from public.retail_stock_transfers where id=v_id;
 if found then
  select jsonb_agg(jsonb_build_object('product_id',item->>'product_id','qty',(item->>'qty')::integer) order by item->>'product_id')
   into v_existing from jsonb_array_elements(existing.items) item;
  if existing.store_id<>p_store or existing.created_by<>auth.uid() or existing.from_branch_id<>p_from_branch or existing.to_branch_id<>p_to_branch
   or existing.notes is distinct from v_notes or v_existing<>v_requested then raise exception 'El identificador ya corresponde a otra transferencia'; end if;
  return existing.id;
 end if;
 if (select count(*) from public.retail_branches where store_id=p_store and id in (p_from_branch,p_to_branch))<>2 then raise exception 'Las sucursales deben pertenecer a este comercio'; end if;
 for v_item in select value from jsonb_array_elements(v_requested) loop
  v_product:=(v_item->>'product_id')::uuid;
  select name into v_name from public.retail_products where id=v_product and store_id=p_store and active;
  if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_product,'product_name',v_name,'qty',(v_item->>'qty')::integer));
 end loop;
 insert into public.retail_stock_transfers(id,store_id,from_branch_id,to_branch_id,created_by,items,notes)
 values(v_id,p_store,p_from_branch,p_to_branch,auth.uid(),v_items,v_notes);
 return v_id;
end $$;

create function public.retail_confirm_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede confirmar transferencias'; end if;
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='confirmed' then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia está cancelada'; end if;
 update public.retail_stock_transfers set status='confirmed',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create function public.retail_cancel_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede cancelar transferencias'; end if;
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='cancelled' then return t.id; end if;
 if t.status<>'pending' then raise exception 'Una transferencia confirmada conserva su registro histórico'; end if;
 update public.retail_stock_transfers set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;
revoke all on function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid),public.retail_confirm_transfer(uuid,uuid),public.retail_cancel_transfer(uuid,uuid) from public,anon;
grant execute on function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid),public.retail_confirm_transfer(uuid,uuid),public.retail_cancel_transfer(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
