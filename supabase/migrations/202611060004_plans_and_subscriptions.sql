-- Planes y abonos de los comercios.
-- - Planes con precio mensual y límites (sucursales, cajas activas, personas, IA). Vacío = sin límite.
-- - Abono por comercio: prueba gratis, pagado hasta, días de gracia o bonificado. Un comercio sin abono no se
--   controla: así quedan todos los existentes al aplicar esta migración, hasta que se les asigne un plan.
-- - Bloqueo automático, sin tareas programadas: vencida la gracia, store_suspended() devuelve verdadero y rige
--   el mismo bloqueo de 202611060002. Registrar un pago lo levanta en el acto.
-- - Pagos registrados por el administrador de plataforma, con ID de pedido para que un reintento no duplique.
begin;

create table retail_private.plans (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(trim(name)) between 1 and 60),
 price numeric(14,2) not null default 0 check (price >= 0),
 max_branches integer check (max_branches is null or max_branches between 1 and 10000),
 max_registers integer check (max_registers is null or max_registers between 1 and 10000),
 max_users integer check (max_users is null or max_users between 1 and 10000),
 ai_enabled boolean not null default true,
 ai_daily_tokens integer check (ai_daily_tokens is null or ai_daily_tokens between 0 and 100000000),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table retail_private.billing_settings (
 id boolean primary key default true check (id),
 new_store_plan_id uuid references retail_private.plans(id) on delete set null,
 trial_days integer not null default 14 check (trial_days between 0 and 365),
 grace_days integer not null default 5 check (grace_days between 0 and 60),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
insert into retail_private.billing_settings(id) values (true);

create table retail_private.store_subscriptions (
 store_id uuid primary key references public.retail_stores(id) on delete cascade,
 plan_id uuid not null references retail_private.plans(id),
 exempt boolean not null default false,
 trial_until timestamptz,
 paid_until timestamptz,
 grace_days integer not null default 5 check (grace_days between 0 and 60),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
create index retail_store_subscriptions_plan on retail_private.store_subscriptions(plan_id);

create table retail_private.subscription_payments (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 paid_at timestamptz not null default now(),
 amount numeric(14,2) not null check (amount >= 0),
 months integer not null check (months between 1 and 36),
 method text not null check (method in ('transferencia', 'efectivo', 'mercado_pago', 'tarjeta', 'otro')),
 reference text check (reference is null or length(reference) <= 120),
 period_from timestamptz not null,
 period_to timestamptz not null,
 created_by uuid references auth.users(id) on delete set null
);
create index retail_subscription_payments_store on retail_private.subscription_payments(store_id, paid_at desc);
revoke all on retail_private.plans, retail_private.billing_settings, retail_private.store_subscriptions, retail_private.subscription_payments
 from public, anon, authenticated;

-- Hasta cuándo tiene acceso (prueba o pago) y en qué estado está.
create function retail_private.subscription_access_until(p_trial timestamptz, p_paid timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$
 select nullif(greatest(coalesce(p_trial, '-infinity'::timestamptz), coalesce(p_paid, '-infinity'::timestamptz)), '-infinity'::timestamptz);
$$;
create function retail_private.subscription_status(p_exempt boolean, p_trial timestamptz, p_paid timestamptz, p_grace integer) returns text
language sql stable set search_path = '' as $$
 select case
  when p_exempt then 'bonificado'
  when coalesce(p_paid, '-infinity'::timestamptz) >= now() then 'al_dia'
  when coalesce(p_trial, '-infinity'::timestamptz) >= now() then 'prueba'
  when retail_private.subscription_access_until(p_trial, p_paid) is not null
   and retail_private.subscription_access_until(p_trial, p_paid) + make_interval(days => p_grace) >= now() then 'vencido'
  else 'bloqueado' end;
$$;
revoke all on function retail_private.subscription_access_until(timestamptz, timestamptz),
 retail_private.subscription_status(boolean, timestamptz, timestamptz, integer) from public, anon;
grant execute on function retail_private.subscription_access_until(timestamptz, timestamptz),
 retail_private.subscription_status(boolean, timestamptz, timestamptz, integer) to authenticated;

-- 1. Bloqueo: suspensión manual o abono bloqueado. Misma excepción para administradores de plataforma.
create or replace function retail_private.store_suspended(p_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select (exists (select 1 from retail_private.store_suspensions where store_id = p_store)
  or exists (select 1 from retail_private.store_subscriptions s where s.store_id = p_store
   and retail_private.subscription_status(s.exempt, s.trial_until, s.paid_until, s.grace_days) = 'bloqueado'))
  and not retail_private.is_platform_admin();
$$;

-- La pantalla de acceso suspendido explica también el abono vencido.
create or replace function public.retail_my_suspended_stores()
returns table (id uuid, name text, reason text, suspended_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select s.id, s.name, x.reason, x.suspended_at from public.retail_members m
 join public.retail_stores s on s.id = m.store_id
 join retail_private.store_suspensions x on x.store_id = m.store_id
 where m.user_id = auth.uid() and not retail_private.is_platform_admin()
 union all
 select s.id, s.name,
  'El abono venció el ' || to_char(retail_private.subscription_access_until(b.trial_until, b.paid_until) at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY')
   || '. Al registrarse el pago, el acceso vuelve en el acto',
  retail_private.subscription_access_until(b.trial_until, b.paid_until) + make_interval(days => b.grace_days)
 from public.retail_members m
 join public.retail_stores s on s.id = m.store_id
 join retail_private.store_subscriptions b on b.store_id = m.store_id
 where m.user_id = auth.uid() and not retail_private.is_platform_admin()
  and retail_private.subscription_status(b.exempt, b.trial_until, b.paid_until, b.grace_days) = 'bloqueado'
  and not exists (select 1 from retail_private.store_suspensions x where x.store_id = m.store_id)
 order by 2;
$$;

-- 2. Comercios nuevos: prueba gratis con el plan elegido en la configuración (si hay uno).
create function retail_private.start_store_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
declare settings retail_private.billing_settings;
begin
 select * into settings from retail_private.billing_settings where id;
 if settings.new_store_plan_id is not null then
  insert into retail_private.store_subscriptions(store_id, plan_id, trial_until, grace_days)
  values (new.id, settings.new_store_plan_id, now() + make_interval(days => settings.trial_days), settings.grace_days)
  on conflict (store_id) do nothing;
 end if;
 return new;
end;
$$;
create trigger retail_start_subscription after insert on public.retail_stores
 for each row execute function retail_private.start_store_subscription();

-- 3. Límites del plan al agregar sucursales, cajas activas y personas. Lo ya existente no se toca.
create function retail_private.plan_limit(p_store uuid, p_kind text) returns integer
language sql stable security definer set search_path = '' as $$
 select case p_kind when 'branches' then p.max_branches when 'registers' then p.max_registers when 'users' then p.max_users end
 from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id
 where s.store_id = p_store and not s.exempt;
$$;
revoke all on function retail_private.plan_limit(uuid, text) from public, anon, authenticated;

create function retail_private.enforce_plan_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cap integer; used integer; label text;
begin
 if tg_table_name = 'retail_registers' and (not new.active or (tg_op = 'UPDATE' and old.active)) then return new; end if;
 cap := retail_private.plan_limit(new.store_id, case tg_table_name when 'retail_branches' then 'branches' when 'retail_registers' then 'registers' else 'users' end);
 if cap is null then return new; end if;
 -- Dos altas simultáneas no pasan juntas el límite.
 perform pg_advisory_xact_lock(hashtextextended('plan-limit:' || new.store_id::text || tg_table_name, 0));
 if tg_table_name = 'retail_branches' then
  select count(*) into used from public.retail_branches where store_id = new.store_id; label := 'sucursales';
 elsif tg_table_name = 'retail_registers' then
  select count(*) into used from public.retail_registers where store_id = new.store_id and active and id <> new.id; label := 'cajas activas';
 elsif tg_table_name = 'retail_members' then
  select count(*) into used from public.retail_members where store_id = new.store_id; label := 'personas con acceso';
 else
  select (select count(*) from public.retail_members where store_id = new.store_id)
   + (select count(*) from public.retail_invitations where store_id = new.store_id) into used;
  label := 'personas con acceso (contando invitaciones pendientes)';
 end if;
 if used >= cap then
  raise exception 'Tu plan permite hasta % %. Para agregar más, pedí un cambio de plan', cap, label using errcode = 'P0001';
 end if;
 return new;
end;
$$;
create trigger retail_plan_limit_branches before insert on public.retail_branches for each row execute function retail_private.enforce_plan_limits();
create trigger retail_plan_limit_registers before insert or update of active on public.retail_registers for each row execute function retail_private.enforce_plan_limits();
create trigger retail_plan_limit_members before insert on public.retail_members for each row execute function retail_private.enforce_plan_limits();
create trigger retail_plan_limit_invitations before insert on public.retail_invitations for each row execute function retail_private.enforce_plan_limits();

-- 4. IA: la configuración propia del comercio manda; si no tiene, el plan; si no, la configuración general.
-- Corrige además que "configuración propia sin cupo" significa sin límite, como indica el panel.
create or replace function public.retail_ai_authorize(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
 settings retail_private.ai_settings;
 limits retail_private.ai_store_limits;
 has_limits boolean;
 has_plan boolean;
 plan_ai boolean;
 plan_cap integer;
 cap integer;
 used bigint;
begin
 if auth.uid() is null then return jsonb_build_object('allowed', false, 'code', 'ai_unauthenticated', 'message', 'Iniciá sesión para usar la IA'); end if;
 if p_store is null or retail_private.role_for(p_store) is null then
  return jsonb_build_object('allowed', false, 'code', 'ai_no_access', 'message', 'No tenés acceso a este comercio');
 end if;
 select * into settings from retail_private.ai_settings where id;
 if not coalesce(settings.enabled, true) then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'La IA está pausada por el proveedor del servicio. Lo demás de la app funciona igual');
 end if;
 if (select count(*) from retail_private.ai_usage where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then
  return jsonb_build_object('allowed', false, 'code', 'ai_rate_limited', 'message', 'Demasiadas consultas seguidas. Probá de nuevo en un minuto', 'retry_after', 30);
 end if;
 select * into limits from retail_private.ai_store_limits where store_id = p_store;
 has_limits := found;
 if has_limits and not limits.enabled then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'La IA no está habilitada para este comercio. Lo demás de la app funciona igual');
 end if;
 select p.ai_enabled, p.ai_daily_tokens into plan_ai, plan_cap from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id
  where s.store_id = p_store and not s.exempt;
 has_plan := found;
 if not has_limits and has_plan and not plan_ai then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'El plan del comercio no incluye IA. Lo demás de la app funciona igual');
 end if;
 cap := case when has_limits then limits.daily_tokens when has_plan then plan_cap else settings.default_daily_tokens end;
 if cap is not null then
  used := retail_private.ai_tokens_today(p_store);
  if used >= cap then
   return jsonb_build_object('allowed', false, 'code', 'ai_quota_exceeded', 'message', 'Se alcanzó el uso de IA de hoy para este comercio. Mañana vuelve a estar disponible', 'used', used, 'cap', cap);
  end if;
  return jsonb_build_object('allowed', true, 'remaining', cap - used);
 end if;
 return jsonb_build_object('allowed', true, 'remaining', null);
end;
$$;

-- 5. Para el dueño o administrador del comercio: su plan, vencimiento y uso de los límites.
create function public.retail_my_subscription(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare sub retail_private.store_subscriptions; pl retail_private.plans;
begin
 if coalesce(retail_private.role_for(p_store), '') not in ('owner', 'admin') then return null; end if;
 select * into sub from retail_private.store_subscriptions where store_id = p_store;
 if not found then return null; end if;
 select * into pl from retail_private.plans where id = sub.plan_id;
 return jsonb_build_object(
  'plan', pl.name, 'price', pl.price,
  'status', retail_private.subscription_status(sub.exempt, sub.trial_until, sub.paid_until, sub.grace_days),
  'access_until', retail_private.subscription_access_until(sub.trial_until, sub.paid_until),
  'blocks_at', retail_private.subscription_access_until(sub.trial_until, sub.paid_until) + make_interval(days => sub.grace_days),
  'limits', jsonb_build_object('branches', pl.max_branches, 'registers', pl.max_registers, 'users', pl.max_users),
  'used', jsonb_build_object(
   'branches', (select count(*) from public.retail_branches where store_id = p_store),
   'registers', (select count(*) from public.retail_registers where store_id = p_store and active),
   'users', (select count(*) from public.retail_members where store_id = p_store)));
end;
$$;
revoke all on function public.retail_my_subscription(uuid) from public, anon;
grant execute on function public.retail_my_subscription(uuid) to authenticated;

-- 6. Panel de plataforma: planes y configuración.
create function public.retail_admin_plans()
returns table (id uuid, name text, price numeric, max_branches integer, max_registers integer, max_users integer,
 ai_enabled boolean, ai_daily_tokens integer, active boolean, stores bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return query select p.id, p.name, p.price, p.max_branches, p.max_registers, p.max_users, p.ai_enabled, p.ai_daily_tokens, p.active,
  (select count(*) from retail_private.store_subscriptions s where s.plan_id = p.id)
 from retail_private.plans p order by p.active desc, p.price, p.name;
end;
$$;

create function public.retail_admin_save_plan(
 p_id uuid, p_name text, p_price numeric, p_max_branches integer, p_max_registers integer, p_max_users integer,
 p_ai_enabled boolean, p_ai_daily_tokens integer, p_active boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved uuid;
begin
 perform retail_private.require_platform_admin();
 if length(trim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'Escribí el nombre del plan (hasta 60 caracteres)'; end if;
 if p_price is null or p_price < 0 or round(p_price, 2) <> p_price then raise exception 'Revisá el precio: un importe positivo con hasta dos decimales'; end if;
 if p_ai_enabled is null or p_active is null then raise exception 'Faltan datos del plan'; end if;
 if p_id is null then
  insert into retail_private.plans(name, price, max_branches, max_registers, max_users, ai_enabled, ai_daily_tokens, active)
  values (trim(p_name), p_price, p_max_branches, p_max_registers, p_max_users, p_ai_enabled, p_ai_daily_tokens, p_active) returning id into saved;
 else
  update retail_private.plans set name = trim(p_name), price = p_price, max_branches = p_max_branches, max_registers = p_max_registers,
   max_users = p_max_users, ai_enabled = p_ai_enabled, ai_daily_tokens = p_ai_daily_tokens, active = p_active, updated_at = now()
  where id = p_id returning id into saved;
  if saved is null then raise exception 'El plan ya no existe. Actualizá la lista'; end if;
 end if;
 return saved;
exception when unique_violation then raise exception 'Ya hay un plan con ese nombre';
end;
$$;

create function public.retail_admin_billing_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return (select jsonb_build_object('new_store_plan_id', new_store_plan_id, 'trial_days', trial_days, 'grace_days', grace_days)
  from retail_private.billing_settings where id);
end;
$$;

create function public.retail_admin_save_billing_settings(p_new_store_plan uuid, p_trial_days integer, p_grace_days integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if p_trial_days is null or p_trial_days not between 0 and 365 then raise exception 'La prueba gratis va de 0 a 365 días'; end if;
 if p_grace_days is null or p_grace_days not between 0 and 60 then raise exception 'Los días de gracia van de 0 a 60'; end if;
 if p_new_store_plan is not null and not exists (select 1 from retail_private.plans where id = p_new_store_plan and active) then
  raise exception 'Elegí un plan activo para los comercios nuevos';
 end if;
 update retail_private.billing_settings set new_store_plan_id = p_new_store_plan, trial_days = p_trial_days, grace_days = p_grace_days,
  updated_at = now(), updated_by = auth.uid() where id;
end;
$$;

-- 7. Abono de un comercio: estado, uso, pagos; asignar plan y registrar pagos.
create function public.retail_admin_store_subscription(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare sub retail_private.store_subscriptions;
begin
 perform retail_private.require_platform_admin();
 select * into sub from retail_private.store_subscriptions where store_id = p_store;
 return jsonb_build_object(
  'subscription', case when sub.store_id is null then null else jsonb_build_object(
   'plan_id', sub.plan_id, 'plan', (select name from retail_private.plans where id = sub.plan_id),
   'price', (select price from retail_private.plans where id = sub.plan_id),
   'exempt', sub.exempt, 'trial_until', sub.trial_until, 'paid_until', sub.paid_until, 'grace_days', sub.grace_days,
   'status', retail_private.subscription_status(sub.exempt, sub.trial_until, sub.paid_until, sub.grace_days),
   'access_until', retail_private.subscription_access_until(sub.trial_until, sub.paid_until)) end,
  'used', jsonb_build_object(
   'branches', (select count(*) from public.retail_branches where store_id = p_store),
   'registers', (select count(*) from public.retail_registers where store_id = p_store and active),
   'users', (select count(*) from public.retail_members where store_id = p_store),
   'invitations', (select count(*) from public.retail_invitations where store_id = p_store)),
  'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_at', paid_at, 'amount', amount, 'months', months, 'method', method,
    'reference', reference, 'period_to', period_to, 'by', email) order by paid_at desc)
   from (select p.paid_at, p.amount, p.months, p.method, p.reference, p.period_to, u.email from retail_private.subscription_payments p
    left join auth.users u on u.id = p.created_by where p.store_id = p_store order by p.paid_at desc limit 24) h), '[]'::jsonb));
end;
$$;

-- p_plan null quita el abono: el comercio deja de controlarse (sin límites ni vencimiento).
create function public.retail_admin_set_store_plan(p_store uuid, p_plan uuid, p_exempt boolean, p_trial_days integer, p_grace_days integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if not exists (select 1 from public.retail_stores where id = p_store) then raise exception 'El comercio no existe'; end if;
 if p_plan is null then delete from retail_private.store_subscriptions where store_id = p_store; return; end if;
 if not exists (select 1 from retail_private.plans where id = p_plan) then raise exception 'El plan ya no existe. Actualizá la lista'; end if;
 if p_exempt is null then raise exception 'Indicá si el comercio queda bonificado'; end if;
 if p_trial_days is not null and p_trial_days not between 0 and 365 then raise exception 'La prueba gratis va de 0 a 365 días'; end if;
 if p_grace_days is null or p_grace_days not between 0 and 60 then raise exception 'Los días de gracia van de 0 a 60'; end if;
 insert into retail_private.store_subscriptions(store_id, plan_id, exempt, trial_until, grace_days, updated_by)
 values (p_store, p_plan, p_exempt, case when p_trial_days is not null then now() + make_interval(days => p_trial_days) end, p_grace_days, auth.uid())
 on conflict (store_id) do update set plan_id = excluded.plan_id, exempt = excluded.exempt, grace_days = excluded.grace_days,
  trial_until = case when p_trial_days is not null then excluded.trial_until else retail_private.store_subscriptions.trial_until end,
  updated_at = now(), updated_by = auth.uid();
end;
$$;

-- Extiende el acceso por meses desde lo que esté más adelante: hoy, lo ya pagado o el fin de la prueba.
create function public.retail_admin_record_payment(p_request uuid, p_store uuid, p_amount numeric, p_months integer, p_method text, p_reference text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare sub retail_private.store_subscriptions; prior retail_private.subscription_payments; base timestamptz; paid_to timestamptz;
begin
 perform retail_private.require_platform_admin();
 if p_request is null then raise exception 'Falta el identificador del pago'; end if;
 select * into prior from retail_private.subscription_payments where id = p_request;
 if found then
  if prior.store_id <> p_store then raise exception 'El identificador del pago ya se usó en otro comercio'; end if;
  return prior.period_to;
 end if;
 if p_amount is null or p_amount < 0 or round(p_amount, 2) <> p_amount then raise exception 'Revisá el importe: positivo y con hasta dos decimales'; end if;
 if p_months is null or p_months not between 1 and 36 then raise exception 'Elegí entre 1 y 36 meses'; end if;
 if p_method is null or p_method not in ('transferencia', 'efectivo', 'mercado_pago', 'tarjeta', 'otro') then raise exception 'Elegí cómo se pagó'; end if;
 if length(coalesce(p_reference, '')) > 120 then raise exception 'La referencia admite hasta 120 caracteres'; end if;
 select * into sub from retail_private.store_subscriptions where store_id = p_store for update;
 if not found then raise exception 'Asigná un plan al comercio antes de registrar pagos'; end if;
 base := greatest(now(), coalesce(sub.paid_until, now()), coalesce(sub.trial_until, now()));
 paid_to := base + make_interval(months => p_months);
 insert into retail_private.subscription_payments(id, store_id, amount, months, method, reference, period_from, period_to, created_by)
 values (p_request, p_store, p_amount, p_months, p_method, nullif(trim(p_reference), ''), base, paid_to, auth.uid());
 update retail_private.store_subscriptions set paid_until = paid_to, updated_at = now(), updated_by = auth.uid() where store_id = p_store;
 return paid_to;
end;
$$;

-- 8. Resumen de cobranza: estados, ingreso mensual estimado y próximos vencimientos.
create function public.retail_admin_billing_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return (with subs as (
  select s.store_id, st.name, p.name as plan, p.price,
   retail_private.subscription_status(s.exempt, s.trial_until, s.paid_until, s.grace_days) as status,
   retail_private.subscription_access_until(s.trial_until, s.paid_until) as access_until, s.grace_days
  from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id join public.retail_stores st on st.id = s.store_id)
 select jsonb_build_object(
  'without_plan', (select count(*) from public.retail_stores st where not exists (select 1 from retail_private.store_subscriptions s where s.store_id = st.id)),
  'by_status', coalesce((select jsonb_object_agg(status, total) from (select status, count(*) as total from subs group by status) c), '{}'::jsonb),
  'monthly_revenue', (select coalesce(sum(price), 0) from subs where status in ('al_dia', 'vencido')),
  'collected_30d', (select coalesce(sum(amount), 0) from retail_private.subscription_payments where paid_at >= now() - interval '30 days'),
  'attention', coalesce((select jsonb_agg(jsonb_build_object('store_id', store_id, 'name', name, 'plan', plan, 'status', status, 'access_until', access_until,
    'blocks_at', access_until + make_interval(days => grace_days)) order by access_until nulls first)
   from (select * from subs where status in ('vencido', 'bloqueado') or (status in ('al_dia', 'prueba') and access_until < now() + interval '7 days')
    order by access_until nulls first limit 100) a), '[]'::jsonb)));
end;
$$;

-- 9. La lista de comercios muestra plan y estado del abono. Cambia el tipo de resultado.
drop function public.retail_admin_stores(text, integer);
create function public.retail_admin_stores(p_search text default null, p_days integer default 30)
returns table (
 id uuid, name text, created_at timestamptz, owner_email text, members integer, branches integer, products integer,
 sales_count bigint, sales_total numeric, last_sale_at timestamptz, ai_requests bigint, ai_tokens bigint,
 billing_enabled boolean, status text, note text, suspended_at timestamptz, plan_name text, subscription_status text
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
  s.billing_enabled, coalesce(n.status, 'activo'), coalesce(n.note, ''), su.suspended_at,
  pl.name, case when sub.store_id is null then null
   else retail_private.subscription_status(sub.exempt, sub.trial_until, sub.paid_until, sub.grace_days) end
 from public.retail_stores s
 left join auth.users o on o.id = s.owner_id
 left join retail_private.platform_store_notes n on n.store_id = s.id
 left join retail_private.store_suspensions su on su.store_id = s.id
 left join retail_private.store_subscriptions sub on sub.store_id = s.id
 left join retail_private.plans pl on pl.id = sub.plan_id
 left join lateral (select count(*) as sales_count, sum(x.total) as sales_total from public.retail_sales x
  where x.store_id = s.id and x.created_at >= since) sa on true
 left join lateral (select count(*) as requests, sum(a.prompt_tokens + a.completion_tokens)::bigint as tokens from retail_private.ai_usage a
  where a.store_id = s.id and a.created_at >= since) ai on true
 where term is null or s.name ilike '%' || term || '%' or o.email ilike '%' || term || '%' or s.id::text = term
 order by s.created_at desc
 limit 500;
end;
$$;

revoke all on function public.retail_admin_stores(text, integer), public.retail_admin_plans(),
 public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean),
 public.retail_admin_billing_settings(), public.retail_admin_save_billing_settings(uuid, integer, integer),
 public.retail_admin_store_subscription(uuid), public.retail_admin_set_store_plan(uuid, uuid, boolean, integer, integer),
 public.retail_admin_record_payment(uuid, uuid, numeric, integer, text, text), public.retail_admin_billing_summary() from public, anon;
grant execute on function public.retail_admin_stores(text, integer), public.retail_admin_plans(),
 public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean),
 public.retail_admin_billing_settings(), public.retail_admin_save_billing_settings(uuid, integer, integer),
 public.retail_admin_store_subscription(uuid), public.retail_admin_set_store_plan(uuid, uuid, boolean, integer, integer),
 public.retail_admin_record_payment(uuid, uuid, numeric, integer, text, text), public.retail_admin_billing_summary() to authenticated;

notify pgrst, 'reload schema';
commit;
