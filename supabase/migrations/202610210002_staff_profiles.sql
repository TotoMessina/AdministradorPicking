begin;

alter table public.retail_members drop constraint retail_members_role_check;
alter table public.retail_members add constraint retail_members_role_check check(role in ('owner','admin','supervisor','cashier'));
alter table public.retail_invitations drop constraint retail_invitations_role_check;
alter table public.retail_invitations add constraint retail_invitations_role_check check(role in ('admin','supervisor','cashier'));
create table public.retail_permission_profiles (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 80),
 base_role text not null check(base_role in ('cashier','supervisor')),
 permissions text[] not null check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']::text[]),
 unique(store_id,id),unique(store_id,name)
);
alter table public.retail_members add column profile_id uuid,
 add foreign key(store_id,profile_id) references public.retail_permission_profiles(store_id,id);
alter table public.retail_invitations add column profile_id uuid,
 add foreign key(store_id,profile_id) references public.retail_permission_profiles(store_id,id);

-- Legacy administrative RPCs must never infer administrative authority for supervisors.
-- Actual role is still read directly from membership by the client/team RPC.
create or replace function retail_private.role_for(p_store uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when role='supervisor' then 'cashier' else role end from public.retail_members
 where store_id=p_store and user_id=(select auth.uid());
$$;
create function retail_private.has_permission(p_store uuid,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select case when m.role in ('owner','admin') then true
 when m.profile_id is not null then p_action=any(p.permissions)
 else p_action=any(case when m.role='supervisor'
 then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']
 else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end) end
 from public.retail_members m left join public.retail_permission_profiles p on p.id=m.profile_id and p.store_id=m.store_id
 where m.store_id=p_store and m.user_id=auth.uid()),false);
$$;
revoke all on function retail_private.has_permission(uuid,text) from public,anon;
grant execute on function retail_private.has_permission(uuid,text) to authenticated;
create function public.retail_permissions(p_store uuid) returns text[]
language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']) action
 where retail_private.has_permission(p_store,action);
$$;

alter table public.retail_permission_profiles enable row level security;
revoke all on public.retail_permission_profiles from public,anon,authenticated;
grant select,insert on public.retail_permission_profiles to authenticated;
grant update(name,permissions) on public.retail_permission_profiles to authenticated;
create policy profile_read on public.retail_permission_profiles for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy profile_create on public.retail_permission_profiles for insert to authenticated with check(retail_private.role_for(store_id) in ('owner','admin'));
create policy profile_update on public.retail_permission_profiles for update to authenticated using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
create function retail_private.validate_staff_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.profile_id is not null and not exists(select 1 from public.retail_permission_profiles p where p.id=new.profile_id and p.store_id=new.store_id and p.base_role=new.role) then
   raise exception 'El perfil no corresponde al rol y comercio elegidos';
 end if;
 return new;
end $$;
create trigger retail_member_profile before insert or update of role,profile_id,store_id on public.retail_members for each row execute function retail_private.validate_staff_profile();
create trigger retail_invitation_profile before insert or update of role,profile_id,store_id on public.retail_invitations for each row execute function retail_private.validate_staff_profile();
revoke all on function retail_private.validate_staff_profile() from public,anon,authenticated;

create function public.retail_set_staff_profile(p_store uuid,p_target uuid,p_role text,p_profile uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede asignar perfiles'; end if;
 if p_role is null or p_role not in ('cashier','supervisor') then raise exception 'Elegí Cajero o Supervisor'; end if;
 if p_pending then
   select role into old_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
   select role into old_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if old_role is null or old_role not in ('cashier','supervisor') then raise exception 'Solo se pueden cambiar perfiles de cajeros y supervisores'; end if;
 if old_role<>p_role and not p_pending and exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de cambiar su rol'; end if;
 if p_pending then
   update public.retail_invitations set role=p_role,profile_id=p_profile where store_id=p_store and id=p_target;
 else
   update public.retail_members set role=p_role,profile_id=p_profile where store_id=p_store and user_id=p_target;
 end if;
end $$;

drop function public.retail_team(uuid);
create function public.retail_team(p_store uuid) returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid,profile_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para consultar el equipo'; end if;
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id,m.profile_id from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;
drop policy admin_read_cashier_invites on public.retail_invitations;
create policy admin_read_cashier_invites on public.retail_invitations for select to authenticated using(retail_private.role_for(store_id)='admin' and role in ('cashier','supervisor'));

create or replace function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 perform 1 from public.retail_invitations where email=v_email order by id for update;
 insert into public.retail_members(store_id,user_id,role,branch_id,register_id,profile_id)
 select store_id,auth.uid(),role,branch_id,register_id,profile_id from public.retail_invitations where email=v_email on conflict(store_id,user_id) do nothing;
 get diagnostics v_count=row_count;
 delete from public.retail_invitations where email=v_email;
 return v_count;
end $$;

create or replace function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para asignar personal'; end if;
 if p_pending then select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update; end if;
 if v_role is null or v_role not in ('cashier','supervisor') then raise exception 'Solo se pueden asignar cajeros o supervisores de este comercio'; end if;
 v_branch:=p_branch;
 if p_register is not null then
   select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
   if v_branch is null then raise exception 'Caja no disponible'; end if;
   if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
   if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then raise exception 'La persona debe cerrar su turno antes de cambiar a otra sucursal o caja'; end if;
   update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

-- Guard writes at the table boundary: REST, RPC and offline replay obey the same profile.
create function retail_private.require_permission(p_store uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform 1 from public.retail_permission_profiles p join public.retail_members m on m.profile_id=p.id and m.store_id=p.store_id where m.store_id=p_store and m.user_id=auth.uid() for share of p;
 if not retail_private.has_permission(p_store,p_action) then raise exception 'Tu perfil no permite esta acción. Pedile a administración que revise tus permisos' using errcode='42501'; end if;
end $$;
create function retail_private.guard_staff_action() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='retail_sales' then
   if tg_op='INSERT' then perform retail_private.require_permission(new.store_id,'sell');
   elsif new.ledger_id is distinct from old.ledger_id then perform retail_private.require_permission(new.store_id,'move_sale_ledger'); end if;
 elsif tg_table_name='retail_movements' then
   perform retail_private.require_permission(new.store_id,case when new.type='INGRESO' then 'cash_income' else 'cash_withdrawal' end);
 else perform retail_private.require_permission(new.store_id,'submit_remito'); end if;
 return new;
end $$;
create trigger retail_sale_profile_guard before insert or update of ledger_id on public.retail_sales for each row execute function retail_private.guard_staff_action();
create trigger retail_movement_profile_guard before insert on public.retail_movements for each row execute function retail_private.guard_staff_action();
create trigger retail_remito_profile_guard before insert on public.retail_pending_replenishments for each row execute function retail_private.guard_staff_action();
revoke all on function retail_private.require_permission(uuid,text),retail_private.guard_staff_action() from public,anon,authenticated;

create function retail_private.can_review_sales(p_store uuid,p_shift uuid) returns boolean language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'view_sales') and exists(select 1 from public.retail_shifts s where s.id=p_shift and s.store_id=p_store and retail_private.can_use_register(p_store,s.register_id));
$$;
revoke all on function retail_private.can_review_sales(uuid,uuid) from public,anon;
grant execute on function retail_private.can_review_sales(uuid,uuid) to authenticated;
create policy staff_review_sales on public.retail_sales for select to authenticated using(retail_private.can_review_sales(store_id,shift_id));
revoke all on function public.retail_permissions(uuid),public.retail_set_staff_profile(uuid,uuid,text,uuid,boolean),public.retail_team(uuid) from public,anon;
grant execute on function public.retail_permissions(uuid),public.retail_set_staff_profile(uuid,uuid,text,uuid,boolean),public.retail_team(uuid) to authenticated;
commit;
