begin;
-- require_permission bloquea filas con FOR SHARE: una función STABLE corre en transacción de solo lectura y falla.
alter function public.retail_location_stock_summary(uuid) volatile;

-- Comercios nuevos: nacen con stock por sucursal; todavía no hay stock que distribuir.
alter table public.retail_stores
 alter column branch_inventory_enabled set default true,
 alter column depot_enabled set default true;

create or replace function retail_private.activate_new_store_inventory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.is_default then
  insert into public.retail_inventory_activations(store_id,branch_id,created_by)
  select s.id,new.id,s.owner_id from public.retail_stores s where s.id=new.store_id and s.branch_inventory_enabled
  on conflict (store_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function retail_private.activate_new_store_inventory() from public,anon,authenticated;
drop trigger if exists retail_activate_new_store_inventory on public.retail_branches;
create trigger retail_activate_new_store_inventory after insert on public.retail_branches for each row execute function retail_private.activate_new_store_inventory();

-- Comercios existentes con una sola sucursal: no hay decisión que tomar sobre dónde está el stock.
-- Con varias sucursales, turnos abiertos o traslados pendientes se conserva la activación manual desde Transferencias.
do $$
declare r record; rolled uuid[]:='{}';
begin
 for r in select s.id as store_id,b.id as branch_id,s.owner_id from public.retail_stores s
  join public.retail_branches b on b.store_id=s.id and b.is_default
  where not s.branch_inventory_enabled
   and not exists(select 1 from public.retail_inventory_activations a where a.store_id=s.id)
   and (select count(*) from public.retail_branches o where o.store_id=s.id)=1
   and not exists(select 1 from public.retail_shifts x where x.store_id=s.id and x.closed_at is null)
   and not exists(select 1 from public.retail_stock_transfers t where t.store_id=s.id and t.status='pending')
   and not exists(select 1 from public.retail_products p
    left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
    where p.store_id=s.id and jsonb_array_length(p.stock_components)=0 and p.stock-coalesce(d.quantity,0)<0)
 loop
  insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
  select r.store_id,r.branch_id,p.id,p.stock-coalesce(d.quantity,0) from public.retail_products p
  left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
  where p.store_id=r.store_id and jsonb_array_length(p.stock_components)=0;
  insert into public.retail_inventory_activations(store_id,branch_id,created_by) values(r.store_id,r.branch_id,r.owner_id);
  rolled:=rolled||r.store_id;
 end loop;
 -- Estas guardas exigen un administrador con sesión; la migración no tiene sesión.
 alter table public.retail_stores disable trigger retail_branch_inventory_setting;
 alter table public.retail_stores disable trigger retail_guard_depot_setting;
 update public.retail_stores set branch_inventory_enabled=true,depot_enabled=true where id=any(rolled);
 alter table public.retail_stores enable trigger retail_branch_inventory_setting;
 alter table public.retail_stores enable trigger retail_guard_depot_setting;
end $$;
commit;
