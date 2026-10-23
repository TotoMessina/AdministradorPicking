-- Catalog deletion is reversible (active=false); never erase sales or stock.
-- Requires product compositions. Install after the preceding local migrations.
begin;
create table public.retail_product_deletions (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 product_id uuid not null,
 product_name text not null,
 product_code text not null,
 event_type text not null check(event_type in ('deleted','restored','prior')),
 occurred_at timestamptz,
 recorded_at timestamptz not null default now(),
 actor_id uuid references auth.users(id) on delete set null,
 actor_email text,
 reason text check(reason is null or length(reason)<=500),
 product_snapshot jsonb not null,
 request_payload jsonb,
 search_text text generated always as (product_name||' '||product_code) stored
);
create index retail_product_deletions_history on public.retail_product_deletions(store_id,recorded_at desc,id desc);
alter table public.retail_product_deletions enable row level security;
create policy manager_read on public.retail_product_deletions for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_product_deletions from public,anon,authenticated;
grant select on public.retail_product_deletions to authenticated;

create or replace function retail_private.audit_product_deletion() returns trigger
language plpgsql security definer set search_path='' as $$
declare context jsonb; event_id uuid:=gen_random_uuid(); actor_email text; reason text; payload jsonb;
begin
 if old.active is not distinct from new.active then return new; end if;
 context:=nullif(current_setting('retail.product_deletion_context',true),'')::jsonb;
 if context->>'store_id'=new.store_id::text and context->>'product_id'=new.id::text then
  event_id:=(context->>'request_id')::uuid; reason:=context->>'reason'; payload:=context->'payload';
 end if;
 select email into actor_email from auth.users where id=auth.uid();
 insert into public.retail_product_deletions(id,store_id,product_id,product_name,product_code,event_type,occurred_at,actor_id,actor_email,reason,product_snapshot,request_payload)
 values(event_id,new.store_id,new.id,new.name,new.code,case when new.active then 'restored' else 'deleted' end,
  now(),auth.uid(),actor_email,reason,case when new.active then to_jsonb(new) else to_jsonb(old) end,payload);
 return new;
end $$;
revoke all on function retail_private.audit_product_deletion() from public,anon,authenticated;
create trigger retail_audit_product_deletion after update of active on public.retail_products
 for each row execute function retail_private.audit_product_deletion();

-- Preserve discovery of already archived records without inventing who/when.
insert into public.retail_product_deletions(store_id,product_id,product_name,product_code,event_type,product_snapshot)
 select store_id,id,name,code,'prior',to_jsonb(p) from public.retail_products p where not active;

create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Solo administración puede eliminar o restaurar productos'; end if;
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;
revoke all on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) from public,anon;
grant execute on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
