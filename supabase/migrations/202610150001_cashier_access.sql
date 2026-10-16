-- Cashier assignments and private activity. Managers retain store-wide oversight.
begin;
alter table public.retail_members
 add column branch_id uuid,
 add column register_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,register_id) references public.retail_registers(store_id,id);
alter table public.retail_invitations
 add column branch_id uuid,
 add column register_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,register_id) references public.retail_registers(store_id,id);

create function retail_private.can_use_register(p_store uuid,p_register uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m join public.retail_registers r on r.store_id=m.store_id
 where m.store_id=p_store and m.user_id=auth.uid() and r.id=p_register
 and (m.role in ('owner','admin') or ((m.branch_id is null or m.branch_id=r.branch_id) and (m.register_id is null or m.register_id=r.id))));
$$;
revoke all on function retail_private.can_use_register(uuid,uuid) from public,anon;
grant execute on function retail_private.can_use_register(uuid,uuid) to authenticated;

drop policy member_read on public.retail_members;
create policy member_read on public.retail_members for select to authenticated
 using(user_id=auth.uid() or retail_private.role_for(store_id) in ('owner','admin'));
drop policy member_read on public.retail_registers;
create policy member_read on public.retail_registers for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin') or retail_private.can_use_register(store_id,id));
drop policy member_read on public.retail_branches;
create policy member_read on public.retail_branches for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or exists (
 select 1 from public.retail_members m where m.store_id=retail_branches.store_id and m.user_id=auth.uid()
 and (m.branch_id is null or m.branch_id=retail_branches.id)
 and (m.register_id is null or exists(select 1 from public.retail_registers r where r.id=m.register_id and r.branch_id=retail_branches.id))));
drop policy member_read on public.retail_shifts;
create policy member_read on public.retail_shifts for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and opened_by=auth.uid()));
drop policy member_read on public.retail_sales;
create policy member_read on public.retail_sales for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and created_by=auth.uid()));
drop policy member_read on public.retail_movements;
create policy member_read on public.retail_movements for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and created_by=auth.uid()));
create policy admin_read_cashier_invites on public.retail_invitations for select to authenticated
 using(retail_private.role_for(store_id)='admin' and role='cashier');
create index retail_shifts_operator on public.retail_shifts(store_id,opened_by);
create index retail_sales_operator on public.retail_sales(store_id,created_by);
create index retail_movements_operator on public.retail_movements(store_id,created_by);

-- Read current verified account emails without exposing auth.users to clients.
create function public.retail_team(p_store uuid)
returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para consultar el equipo'; end if;
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id
 from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;

-- A register selection always implies its branch. null/null means unrestricted.
create function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para asignar cajeros'; end if;
 if p_pending then
  select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
  select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if v_role is distinct from 'cashier' then raise exception 'Solo se pueden asignar permisos a cajeros de este comercio'; end if;
 v_branch := p_branch;
 if p_register is not null then
  select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
  if v_branch is null then raise exception 'Caja no disponible'; end if;
  if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then
  update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
  if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id
    where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null
    and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then
   raise exception 'El cajero debe cerrar su turno actual antes de cambiar a otra sucursal o caja';
  end if;
  update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 -- Serialize acceptance with editing the pending assignment.
 perform 1 from public.retail_invitations where email=v_email order by id for update;
 insert into public.retail_members(store_id,user_id,role,branch_id,register_id)
 select store_id,auth.uid(),role,branch_id,register_id from public.retail_invitations where email=v_email
 on conflict(store_id,user_id) do nothing;
 get diagnostics v_count = row_count;
 delete from public.retail_invitations where email=v_email;
 return v_count;
end $$;

create or replace function public.retail_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if not retail_private.can_use_register(p_store,p_register) then raise exception 'Sin acceso a esta caja'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then raise exception 'Caja no disponible'; end if;
 if p_opening is null or p_opening<0 or p_opening::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
 insert into public.retail_shifts(store_id,register_id,opened_by,opening_cash) values(p_store,p_register,auth.uid(),p_opening) returning id into v_id;
 return v_id;
end $$;

create or replace function retail_private.check_shift(p_shift uuid) returns public.retail_shifts language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; r text;
begin
 select * into s from public.retail_shifts where id=p_shift;
 perform 1 from public.retail_members where store_id=s.store_id and user_id=auth.uid() for share;
 select * into s from public.retail_shifts where id=p_shift for update;
 r := retail_private.role_for(s.store_id);
 if s.id is null or r is null then raise exception 'Turno no disponible'; end if;
 if s.closed_at is not null then raise exception 'El turno ya está cerrado'; end if;
 if s.opened_by<>auth.uid() and r not in ('owner','admin') then raise exception 'Esta caja está abierta por otro usuario'; end if;
 if not retail_private.can_use_register(s.store_id,s.register_id) then raise exception 'Sin acceso a esta caja'; end if;
 return s;
end $$;

-- Only disclose occupancy, never the other operator's identity, amounts or activity.
create function public.retail_register_availability(p_store uuid)
returns table(register_id uuid,occupied boolean) language sql stable security definer set search_path='' as $$
 select r.id,exists(select 1 from public.retail_shifts s where s.register_id=r.id and s.closed_at is null)
 from public.retail_registers r where r.store_id=p_store and r.active and retail_private.can_use_register(p_store,r.id);
$$;

-- Reconciliation needs the whole balance of one's own shift, including any manager
-- adjustments, while the underlying rows remain private to their authors/managers.
create function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 select s.opening_cash
  + coalesce((select sum(total) from public.retail_sales where shift_id=s.id and payment_method='Efectivo'),0)
  + coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0)
 into v_expected;
 return v_expected;
end $$;

revoke all on function public.retail_team(uuid),public.retail_set_cashier_access(uuid,uuid,uuid,uuid,boolean),public.retail_register_availability(uuid),public.retail_shift_balance(uuid) from public,anon;
grant execute on function public.retail_team(uuid),public.retail_set_cashier_access(uuid,uuid,uuid,uuid,boolean),public.retail_register_availability(uuid),public.retail_shift_balance(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
