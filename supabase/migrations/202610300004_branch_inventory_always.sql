begin;
-- El stock por sucursal deja de ser opcional: los comercios que quedaban sin activar asignan su salón a la sucursal principal.
-- Solo se omite un saldo imposible (depósito mayor que el total), que seguiría usando la activación desde Transferencias.
do $$
declare r record; rolled uuid[]:='{}';
begin
 for r in select s.id as store_id,b.id as branch_id,s.owner_id from public.retail_stores s
  join public.retail_branches b on b.store_id=s.id and b.is_default
  where not s.branch_inventory_enabled
   and not exists(select 1 from public.retail_inventory_activations a where a.store_id=s.id)
   and not exists(select 1 from public.retail_products p
    left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
    where p.store_id=s.id and jsonb_array_length(p.stock_components)=0 and p.stock-coalesce(d.quantity,0)<0)
 loop
  perform 1 from public.retail_stores where id=r.store_id for update;
  perform 1 from public.retail_products where store_id=r.store_id order by id for update;
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
