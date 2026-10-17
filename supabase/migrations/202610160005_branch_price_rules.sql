begin;
alter table public.retail_price_lists add column branch_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
grant update(branch_id) on public.retail_price_lists to authenticated;
-- Global lists remain unlimited. A branch has one unambiguous active default.
create unique index retail_one_active_price_list_per_branch
 on public.retail_price_lists(store_id,branch_id) where active and branch_id is not null;

-- Existing member_read and manager_insert/update policies continue to enforce
-- store membership and owner/admin writes, including the new branch_id column.
create function public.retail_active_price_list_for_branch(p_store uuid,p_branch uuid)
returns uuid language plpgsql stable security invoker set search_path='' as $$
declare v_list uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 select id into v_list from public.retail_price_lists where store_id=p_store and branch_id=p_branch and active;
 return v_list;
end $$;
revoke all on function public.retail_active_price_list_for_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_active_price_list_for_branch(uuid,uuid) to authenticated;

-- Runs inside checkout's transaction (also when syncing offline). Any exception
-- rolls back stock, payment and sale together. Existing idempotent retries remain valid.
create function retail_private.enforce_branch_price_rule() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_list public.retail_price_lists; v_default uuid;
begin
 if new.price_list_id is not null then
  select * into v_list from public.retail_price_lists where id=new.price_list_id and store_id=new.store_id and active for share;
  if not found or (v_list.branch_id is not null and v_list.branch_id<>new.branch_id) then
   raise exception 'La lista de precios no está disponible para esta sucursal';
  end if;
 end if;
 if retail_private.role_for(new.store_id)='cashier' then
  v_default:=public.retail_active_price_list_for_branch(new.store_id,new.branch_id);
  if new.price_list_id is distinct from v_default then raise exception 'Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar'; end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.enforce_branch_price_rule() from public,anon,authenticated;
create trigger retail_enforce_branch_price_rule before insert on public.retail_sales
 for each row execute function retail_private.enforce_branch_price_rule();
notify pgrst,'reload schema';
commit;
