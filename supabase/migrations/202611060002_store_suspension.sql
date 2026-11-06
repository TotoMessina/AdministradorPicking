-- Suspensión de comercios por el proveedor del servicio.
-- Un comercio suspendido no se puede leer ni operar desde la app: role_for, has_permission y require_permission
-- dejan de reconocer la membresía, y con ellas las políticas RLS y las funciones que dependen de esos permisos.
-- No borra ni cambia datos: al reactivar, todo vuelve como estaba. Los administradores de plataforma no quedan
-- bloqueados (soporte). Solo un administrador de plataforma puede suspender o reactivar.
begin;

create table retail_private.store_suspensions (
 store_id uuid primary key references public.retail_stores(id) on delete cascade,
 reason text not null check (length(trim(reason)) between 1 and 300),
 suspended_at timestamptz not null default now(),
 suspended_by uuid references auth.users(id) on delete set null
);
create table retail_private.store_suspension_log (
 id bigint generated always as identity primary key,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 action text not null check (action in ('suspend', 'reactivate')),
 reason text,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null
);
create index retail_store_suspension_log_store on retail_private.store_suspension_log(store_id, created_at desc);
revoke all on retail_private.store_suspensions, retail_private.store_suspension_log from public, anon, authenticated;

create function retail_private.store_suspended(p_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from retail_private.store_suspensions where store_id = p_store) and not retail_private.is_platform_admin();
$$;
revoke all on function retail_private.store_suspended(uuid) from public, anon;
grant execute on function retail_private.store_suspended(uuid) to authenticated;

-- 1. Permisos centrales. Mismas definiciones vigentes (202610210002 y 202610300006) con la condición de suspensión.
create or replace function retail_private.role_for(p_store uuid) returns text
language sql stable security definer set search_path = '' as $$
 select case when role = 'supervisor' then 'cashier' else role end from public.retail_members
 where store_id = p_store and user_id = (select auth.uid()) and not retail_private.store_suspended(p_store);
$$;

create or replace function retail_private.has_permission(p_store uuid, p_action text) returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce((select case when m.role in ('owner','admin') then true
 when m.profile_id is not null then p_action = any(p.permissions)
 else p_action = any(coalesce(r.permissions, case when m.role = 'supervisor'
 then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']
 else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end)) end
 from public.retail_members m left join public.retail_permission_profiles p on p.id = m.profile_id and p.store_id = m.store_id
 left join public.retail_role_permissions r on r.store_id = m.store_id and r.role = m.role
 where m.store_id = p_store and m.user_id = auth.uid() and not retail_private.store_suspended(p_store)), false);
$$;

-- RS001: aviso propio de suspensión. La cola sin conexión lo trata como "reintentar después", sin marcar error.
create or replace function retail_private.require_permission(p_store uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.retail_members where store_id = p_store and user_id = auth.uid() for share;
 perform 1 from public.retail_permission_profiles p join public.retail_members m on m.profile_id = p.id and m.store_id = p.store_id
  where m.store_id = p_store and m.user_id = auth.uid() for share of p;
 if retail_private.store_suspended(p_store) then
  raise exception 'El comercio está suspendido. Los datos se conservan; contactá al proveedor del servicio' using errcode = 'RS001';
 end if;
 if not retail_private.has_permission(p_store, p_action) then
  raise exception 'Tu perfil no permite esta acción. Pedile a administración que revise tus permisos' using errcode = '42501';
 end if;
end $$;

-- Comprobantes de retiros: esta lectura miraba el rol directo en la membresía.
create or replace function retail_private.can_read_voucher(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.retail_members m where m.store_id::text = split_part(p_name, '/', 1)
  and m.user_id = auth.uid() and m.role in ('owner','admin') and not retail_private.store_suspended(m.store_id));
$$;

-- Sucursales: su lectura para cajeros mira la membresía propia, que sigue visible.
create policy store_not_suspended on public.retail_branches as restrictive for select to authenticated
 using (not retail_private.store_suspended(store_id));

-- 2. Sincronización sin conexión: mismo cuerpo vigente (202610280003) con el aviso de suspensión primero,
-- para que las operaciones guardadas en el dispositivo queden pendientes y se envíen al reactivar.
create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; branch uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 if retail_private.store_suspended((p_operation->>'store')::uuid)
  and exists(select 1 from public.retail_members where store_id=(p_operation->>'store')::uuid and user_id=auth.uid()) then
  raise exception 'El comercio está suspendido. Las operaciones de este dispositivo quedan guardadas y se envían al reactivarlo' using errcode='RS001';
 end if;
 if retail_private.role_for((p_operation->>'store')::uuid) is null then raise exception 'Sin acceso al comercio' using errcode='42501'; end if;
 perform 1 from public.retail_stores where id=(p_operation->>'store')::uuid for share;
 if p_operation->>'kind'='stock' then perform set_config('retail.inventory_location',coalesce(p_operation->>'branch',''),true); end if;
 if p_operation->>'kind'='sale' then
  select r.branch_id into branch from public.retail_shifts s join public.retail_registers r on r.id=s.register_id and r.store_id=s.store_id
   where s.id=(p_operation->>'shift')::uuid and s.store_id=(p_operation->>'store')::uuid;
  perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 end if;
 saved:=public.retail_sync_before_locations(p_operation);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

-- 3. Para que la app explique por qué no ve un comercio, en lugar de ofrecer crear otro.
create function public.retail_my_suspended_stores()
returns table (id uuid, name text, reason text, suspended_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select s.id, s.name, x.reason, x.suspended_at from public.retail_members m
 join public.retail_stores s on s.id = m.store_id
 join retail_private.store_suspensions x on x.store_id = m.store_id
 where m.user_id = auth.uid() and not retail_private.is_platform_admin()
 order by s.name;
$$;
revoke all on function public.retail_my_suspended_stores() from public, anon;
grant execute on function public.retail_my_suspended_stores() to authenticated;

-- 4. Suspender y reactivar, con historial.
create function public.retail_admin_suspend_store(p_store uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare why text := trim(coalesce(p_reason, ''));
begin
 perform retail_private.require_platform_admin();
 if length(why) not between 1 and 300 then raise exception 'Escribí el motivo de la suspensión (hasta 300 caracteres)'; end if;
 perform 1 from public.retail_stores where id = p_store for update;
 if not found then raise exception 'El comercio no existe'; end if;
 if exists (select 1 from retail_private.store_suspensions where store_id = p_store) then
  raise exception 'El comercio ya está suspendido. Actualizá la vista';
 end if;
 insert into retail_private.store_suspensions(store_id, reason, suspended_by) values (p_store, why, auth.uid());
 insert into retail_private.store_suspension_log(store_id, action, reason, created_by) values (p_store, 'suspend', why, auth.uid());
end;
$$;

create function public.retail_admin_reactivate_store(p_store uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 perform 1 from public.retail_stores where id = p_store for update;
 if not found then raise exception 'El comercio no existe'; end if;
 delete from retail_private.store_suspensions where store_id = p_store;
 if not found then raise exception 'El comercio no estaba suspendido. Actualizá la vista'; end if;
 insert into retail_private.store_suspension_log(store_id, action, created_by) values (p_store, 'reactivate', auth.uid());
end;
$$;

-- 5. El panel muestra la suspensión. Mismas funciones de 202611060001 con los datos de suspensión agregados.
create or replace function public.retail_admin_overview(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
 days integer := least(greatest(coalesce(p_days, 30), 1), 365);
 since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
 result jsonb;
begin
 perform retail_private.require_platform_admin();
 select jsonb_build_object(
  'days', days,
  'stores', (select count(*) from public.retail_stores),
  'new_stores', (select count(*) from public.retail_stores where created_at >= since),
  'suspended_stores', (select count(*) from retail_private.store_suspensions),
  'stores_with_sales', (select count(distinct store_id) from public.retail_sales where created_at >= since),
  'users', (select count(*) from auth.users),
  'new_users', (select count(*) from auth.users where created_at >= since),
  'active_users', (select count(*) from auth.users where last_sign_in_at >= since),
  'members', (select count(*) from public.retail_members),
  'sales_count', (select count(*) from public.retail_sales where created_at >= since),
  'sales_total', (select coalesce(sum(total), 0) from public.retail_sales where created_at >= since),
  'products', (select count(*) from public.retail_products where active),
  'billing_stores', (select count(*) from public.retail_stores where billing_enabled),
  'ai_requests', (select count(*) from retail_private.ai_usage where created_at >= since),
  'ai_errors', (select count(*) from retail_private.ai_usage where created_at >= since and not ok),
  'ai_tokens', (select coalesce(sum(prompt_tokens + completion_tokens), 0) from retail_private.ai_usage where created_at >= since),
  'catalog_total', (select count(*) from public.retail_global_catalog),
  'catalog_pending', (select count(*) from public.retail_global_catalog where source <> 'verified' and coalesce(confidence_score, 0) < 0.9),
  'platform_admins', (select count(*) from retail_private.platform_admins)
 ) into result;
 return result;
end;
$$;

-- Cambia el tipo de resultado: se reemplaza la función con los mismos permisos.
drop function public.retail_admin_stores(text, integer);
create function public.retail_admin_stores(p_search text default null, p_days integer default 30)
returns table (
 id uuid, name text, created_at timestamptz, owner_email text, members integer, branches integer, products integer,
 sales_count bigint, sales_total numeric, last_sale_at timestamptz, ai_requests bigint, ai_tokens bigint,
 billing_enabled boolean, status text, note text, suspended_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
 since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
 term text := nullif(trim(coalesce(p_search, '')), '');
begin
 perform retail_private.require_platform_admin();
 return query
 select s.id, s.name, s.created_at, o.email::text,
  (select count(*)::integer from public.retail_members m where m.store_id = s.id),
  (select count(*)::integer from public.retail_branches b where b.store_id = s.id),
  (select count(*)::integer from public.retail_products p where p.store_id = s.id and p.active),
  coalesce(sa.sales_count, 0), coalesce(sa.sales_total, 0),
  (select max(x.created_at) from public.retail_sales x where x.store_id = s.id),
  coalesce(ai.requests, 0), coalesce(ai.tokens, 0),
  s.billing_enabled, coalesce(n.status, 'activo'), coalesce(n.note, ''), su.suspended_at
 from public.retail_stores s
 left join auth.users o on o.id = s.owner_id
 left join retail_private.platform_store_notes n on n.store_id = s.id
 left join retail_private.store_suspensions su on su.store_id = s.id
 left join lateral (select count(*) as sales_count, sum(x.total) as sales_total from public.retail_sales x
  where x.store_id = s.id and x.created_at >= since) sa on true
 left join lateral (select count(*) as requests, sum(a.prompt_tokens + a.completion_tokens)::bigint as tokens from retail_private.ai_usage a
  where a.store_id = s.id and a.created_at >= since) ai on true
 where term is null or s.name ilike '%' || term || '%' or o.email ilike '%' || term || '%' or s.id::text = term
 order by s.created_at desc
 limit 500;
end;
$$;
revoke all on function public.retail_admin_stores(text, integer) from public, anon;
grant execute on function public.retail_admin_stores(text, integer) to authenticated;

create or replace function public.retail_admin_store_detail(p_store uuid, p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
 since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
 store public.retail_stores;
begin
 perform retail_private.require_platform_admin();
 select * into store from public.retail_stores where id = p_store;
 if not found then raise exception 'El comercio no existe'; end if;
 return jsonb_build_object(
  'id', store.id, 'name', store.name, 'address', store.address, 'phone', store.phone, 'created_at', store.created_at,
  'billing_enabled', store.billing_enabled, 'branch_inventory_enabled', store.branch_inventory_enabled, 'depot_enabled', store.depot_enabled,
  'owner_email', (select email from auth.users where id = store.owner_id),
  'status', coalesce((select status from retail_private.platform_store_notes where store_id = store.id), 'activo'),
  'note', coalesce((select note from retail_private.platform_store_notes where store_id = store.id), ''),
  'note_updated_at', (select updated_at from retail_private.platform_store_notes where store_id = store.id),
  'suspension', (select jsonb_build_object('reason', x.reason, 'suspended_at', x.suspended_at, 'by', u.email)
   from retail_private.store_suspensions x left join auth.users u on u.id = x.suspended_by where x.store_id = store.id),
  'suspension_log', coalesce((select jsonb_agg(jsonb_build_object('action', action, 'reason', reason, 'created_at', created_at, 'by', email) order by created_at desc)
   from (select l.action, l.reason, l.created_at, u.email from retail_private.store_suspension_log l left join auth.users u on u.id = l.created_by
    where l.store_id = store.id order by l.created_at desc limit 10) h), '[]'::jsonb),
  'members', coalesce((select jsonb_agg(jsonb_build_object('email', u.email, 'role', m.role, 'last_sign_in_at', u.last_sign_in_at) order by m.role, lower(u.email))
   from public.retail_members m join auth.users u on u.id = m.user_id where m.store_id = store.id), '[]'::jsonb),
  'invitations', (select count(*) from public.retail_invitations where store_id = store.id),
  'branches', coalesce((select jsonb_agg(jsonb_build_object('name', b.name, 'is_default', b.is_default) order by b.is_default desc, b.name)
   from public.retail_branches b where b.store_id = store.id), '[]'::jsonb),
  'registers', (select count(*) from public.retail_registers where store_id = store.id and active),
  'products', (select count(*) from public.retail_products where store_id = store.id and active),
  'open_shifts', (select count(*) from public.retail_shifts where store_id = store.id and closed_at is null),
  'sales_count', (select count(*) from public.retail_sales where store_id = store.id and created_at >= since),
  'sales_total', (select coalesce(sum(total), 0) from public.retail_sales where store_id = store.id and created_at >= since),
  'last_sale_at', (select max(created_at) from public.retail_sales where store_id = store.id),
  'ai_by_feature', coalesce((select jsonb_agg(jsonb_build_object('feature', feature, 'requests', requests, 'tokens', tokens, 'errors', errors) order by requests desc)
   from (select feature, count(*) as requests, sum(prompt_tokens + completion_tokens) as tokens, count(*) filter (where not ok) as errors
    from retail_private.ai_usage where store_id = store.id and created_at >= since group by feature) f), '[]'::jsonb)
 );
end;
$$;

revoke all on function public.retail_admin_suspend_store(uuid, text), public.retail_admin_reactivate_store(uuid) from public, anon;
grant execute on function public.retail_admin_suspend_store(uuid, text), public.retail_admin_reactivate_store(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
