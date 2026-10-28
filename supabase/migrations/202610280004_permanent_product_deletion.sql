begin;

-- Limpieza preventiva de productos inactivos huérfanos que hayan quedado fijados en la botonera
delete from public.retail_quick_products q
where not exists (
  select 1 from public.retail_products p
  where p.id = q.product_id and p.store_id = q.store_id and p.active
);

-- Actualizar retail_set_product_active para quitar automáticamente de la botonera al archivar/desactivar
create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'delete_products');
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
 if not p_active then
  delete from public.retail_quick_products where store_id=p_store and product_id=p_product;
 end if;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;

revoke all on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) from public,anon;
grant execute on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) to authenticated;

-- Función para eliminación física definitiva del producto y sus referencias
create or replace function public.retail_delete_product_permanently(p_store uuid, p_product uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 product public.retail_products;
 dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store, 'delete_products');

 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text, 0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then
  raise exception 'El producto ya no existe';
 end if;

 -- Validar si es componente de otros productos activos o inactivos
 select string_agg(name, ', ') into dependencies from (
  select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and c->>'product_id'=p_product::text order by p.name limit 5
 ) names;
 if dependencies is not null then
  raise exception 'No se puede eliminar definitivamente: se usa como componente en: %. Quitalo de esas recetas primero.', dependencies;
 end if;

 -- Validar remitos pendientes de revisión
 if exists (
  select 1 from public.retail_pending_replenishments r cross join lateral jsonb_array_elements(r.items) i
  where r.store_id=p_store and r.status='pending' and i->>'product_id'=p_product::text
 ) then
  raise exception 'El producto está incluido en remitos pendientes de revisión';
 end if;

 -- Limpieza de registros dependientes
 delete from public.retail_quick_products where store_id=p_store and product_id=p_product;
 delete from public.retail_price_overrides where store_id=p_store and product_id=p_product;
 if to_regclass('public.retail_depot_balances') is not null then
  execute 'delete from public.retail_depot_balances where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_depot_movements') is not null then
  execute 'delete from public.retail_depot_movements where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_branch_stock') is not null then
  execute 'delete from public.retail_branch_stock where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_supplier_product_mappings') is not null then
  execute 'delete from public.retail_supplier_product_mappings where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_cigarette_conversions') is not null then
  execute 'delete from public.retail_cigarette_conversions where store_id=$1 and (packet_id=$2 or unit_product_id=$2)' using p_store, p_product;
 end if;
 delete from public.retail_stock_movements where store_id=p_store and product_id=p_product;
 delete from public.retail_product_deletions where store_id=p_store and product_id=p_product;

 -- Eliminar físicamente el producto
 delete from public.retail_products where store_id=p_store and id=p_product;
end $$;

revoke all on function public.retail_delete_product_permanently(uuid, uuid) from public, anon;
grant execute on function public.retail_delete_product_permanently(uuid, uuid) to authenticated;

commit;

