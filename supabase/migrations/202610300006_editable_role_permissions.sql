begin;
-- Lo habitual de cada rol, por comercio. Sin fila se usan los permisos de siempre.
create table if not exists public.retail_role_permissions (
 store_id uuid not null references public.retail_stores(id), role text not null check(role in ('cashier','supervisor')),
 permissions text[] not null check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]),
 revision integer not null default 0, primary key(store_id,role)
);
alter table public.retail_role_permissions enable row level security;
drop policy if exists member_read on public.retail_role_permissions;
create policy member_read on public.retail_role_permissions for select to authenticated using(retail_private.role_for(store_id) is not null);
revoke all on public.retail_role_permissions from public,anon,authenticated;
grant select on public.retail_role_permissions to authenticated;

create or replace function retail_private.has_permission(p_store uuid,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select case when m.role in ('owner','admin') then true
 when m.profile_id is not null then p_action=any(p.permissions)
 else p_action=any(coalesce(r.permissions,case when m.role='supervisor'
 then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']
 else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end)) end
 from public.retail_members m left join public.retail_permission_profiles p on p.id=m.profile_id and p.store_id=m.store_id
 left join public.retail_role_permissions r on r.store_id=m.store_id and r.role=m.role
 where m.store_id=p_store and m.user_id=auth.uid()),false);
$$;

create or replace function public.retail_save_role_permissions(p_store uuid,p_role text,p_permissions text[],p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.retail_role_permissions; normalized text[];
begin
 perform retail_private.require_permission(p_store,'manage_profiles');
 if p_role is null or p_role not in ('cashier','supervisor') or p_permissions is null then raise exception 'Revisá el rol y los permisos'; end if;
 select coalesce(array_agg(distinct action order by action),'{}'::text[]) into normalized from unnest(p_permissions) action;
 if not coalesce(retail_private.can_grant_permissions(p_store,normalized),false) then raise exception 'Solo podés conceder permisos que ya tenés' using errcode='42501'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and exists(select 1 from public.retail_members where store_id=p_store and user_id=auth.uid() and role=p_role and profile_id is null) then
  raise exception 'No podés cambiar los permisos de tu propio rol' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('role-permissions:'||p_store::text||p_role,0));
 select * into previous from public.retail_role_permissions where store_id=p_store and role=p_role for update;
 if found then
  if previous.permissions @> normalized and previous.permissions <@ normalized then return; end if;
  if p_revision is null or previous.revision<>p_revision then raise exception 'El rol cambió en otro dispositivo. Actualizá la lista y revisá los cambios antes de guardar'; end if;
  update public.retail_role_permissions set permissions=normalized,revision=revision+1 where store_id=p_store and role=p_role;
 else
  insert into public.retail_role_permissions(store_id,role,permissions) values(p_store,p_role,normalized);
 end if;
end $$;
revoke all on function public.retail_save_role_permissions(uuid,text,text[],integer) from public,anon;
grant execute on function public.retail_save_role_permissions(uuid,text,text[],integer) to authenticated;
notify pgrst,'reload schema';
commit;
