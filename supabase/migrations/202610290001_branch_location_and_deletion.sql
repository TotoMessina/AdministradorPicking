begin;

-- Ubicación opcional en el mapa. Sin coordenadas la sucursal sigue operando igual.
alter table public.retail_branches
 add column latitude double precision check(latitude between -90 and 90),
 add column longitude double precision check(longitude between -180 and 180),
 add check((latitude is null)=(longitude is null));

create function public.retail_set_branch_location(p_store uuid,p_id uuid,p_latitude double precision,p_longitude double precision) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if (p_latitude is null)<>(p_longitude is null) or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
  raise exception 'Ubicación inválida. Elegí un punto en el mapa';
 end if;
 update public.retail_branches set latitude=p_latitude,longitude=p_longitude where store_id=p_store and id=p_id returning id into target;
 if target is null then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 return target;
end $$;

-- Eliminar solo sucursales sin historial: ventas, turnos, stock, transferencias y fondos se conservan siempre.
create function public.retail_delete_branch(p_store uuid,p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare branch public.retail_branches; dependency text;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 select * into branch from public.retail_branches where store_id=p_store and id=p_id for update;
 if not found then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 if branch.is_default then raise exception 'La sucursal principal no se puede eliminar'; end if;
 if exists(select 1 from public.retail_registers where store_id=p_store and branch_id=p_id and active) then
  raise exception 'Mové o desactivá primero las cajas de esta sucursal';
 end if;
 if exists(select 1 from public.retail_location_funds where store_id=p_store and location=p_id::text)
  or exists(select 1 from public.retail_fund_transfers where store_id=p_store and (from_location=p_id::text or to_location=p_id::text)) then
  raise exception 'La sucursal tiene fondos o movimientos de dinero registrados; no se puede eliminar';
 end if;
 if exists(select 1 from public.retail_location_transfers where store_id=p_store and (from_location=p_id::text or to_location=p_id::text)) then
  raise exception 'La sucursal tiene transferencias registradas; no se puede eliminar';
 end if;
 begin
  -- Configuración propia sin historial: se elimina junto con la sucursal.
  delete from public.retail_quick_products where store_id=p_store and branch_id=p_id;
  delete from public.retail_branch_stock where store_id=p_store and branch_id=p_id and quantity=0;
  delete from public.retail_registers r where r.store_id=p_store and r.branch_id=p_id and not r.active
   and not exists(select 1 from public.retail_shifts s where s.register_id=r.id);
  delete from public.retail_branches where store_id=p_store and id=p_id;
 exception when foreign_key_violation then
  get stacked diagnostics dependency=table_name;
  raise exception '%', case
   when dependency in ('retail_sales','retail_shifts','retail_registers') then 'La sucursal tiene cajas con turnos o ventas registradas; no se puede eliminar'
   when dependency in ('retail_members','retail_invitations') then 'Hay personas asignadas a esta sucursal. Cambiá su asignación primero'
   when dependency='retail_price_lists' then 'Hay listas de precios asignadas a esta sucursal. Cambiá su sucursal primero'
   when dependency in ('retail_branch_stock','retail_inventory_activations','retail_depot_movements') then 'La sucursal tiene stock o historial de inventario; no se puede eliminar'
   when dependency='retail_pending_replenishments' then 'La sucursal tiene remitos o reposiciones registradas; no se puede eliminar'
   when dependency='retail_stock_transfers' then 'La sucursal tiene transferencias registradas; no se puede eliminar'
   else 'La sucursal tiene historial asociado; no se puede eliminar' end;
 end;
 return p_id;
end $$;

revoke all on function public.retail_set_branch_location(uuid,uuid,double precision,double precision) from public,anon;
revoke all on function public.retail_delete_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_set_branch_location(uuid,uuid,double precision,double precision) to authenticated;
grant execute on function public.retail_delete_branch(uuid,uuid) to authenticated;

commit;
