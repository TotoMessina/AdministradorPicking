-- Avisos del proveedor del servicio a los usuarios de la app.
-- - Dentro de la app: los ve cada usuario alcanzado, en cualquier pantalla, hasta que lo marca como leído o vence.
-- - Push opcional: entra en la misma cola de retail_push_deliveries (tipo 'platform') y llega a los dispositivos
--   con avisos activados (hoy, dueños y administradores). Un envío por dispositivo; repetirlo no duplica.
-- - Alcance: todos, dueños y administradores, comercios de un plan o un comercio.
-- Para envíos masivos, retail_claim_push entrega lotes de hasta 100 (antes 10) y push-dispatch repite lotes.
begin;

create table retail_private.platform_announcements (
 id uuid primary key,
 title text not null check (length(trim(title)) between 1 and 80),
 body text not null check (length(trim(body)) between 1 and 500),
 level text not null default 'info' check (level in ('info', 'importante', 'urgente')),
 audience text not null check (audience in ('all', 'managers', 'plan', 'store')),
 plan_id uuid references retail_private.plans(id) on delete set null,
 store_id uuid references public.retail_stores(id) on delete cascade,
 push boolean not null default false,
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 canceled_at timestamptz,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null,
 check (ends_at > starts_at),
 check (audience <> 'plan' or plan_id is not null),
 check (audience <> 'store' or store_id is not null)
);
create index retail_platform_announcements_active on retail_private.platform_announcements(ends_at) where canceled_at is null;

create table retail_private.announcement_reads (
 announcement_id uuid not null references retail_private.platform_announcements(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key (announcement_id, user_id)
);
revoke all on retail_private.platform_announcements, retail_private.announcement_reads from public, anon, authenticated;

-- ¿El usuario está alcanzado por el aviso? Mira la membresía directa: un comercio suspendido igual recibe avisos.
create function retail_private.announcement_reaches(p_announcement retail_private.platform_announcements, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select case p_announcement.audience
  when 'all' then true
  when 'managers' then exists (select 1 from public.retail_members m where m.user_id = p_user and m.role in ('owner', 'admin'))
  when 'plan' then exists (select 1 from public.retail_members m join retail_private.store_subscriptions s on s.store_id = m.store_id
   where m.user_id = p_user and s.plan_id = p_announcement.plan_id)
  when 'store' then exists (select 1 from public.retail_members m where m.user_id = p_user and m.store_id = p_announcement.store_id)
  else false end;
$$;
revoke all on function retail_private.announcement_reaches(retail_private.platform_announcements, uuid) from public, anon, authenticated;

-- 1. Para cada usuario: avisos vigentes, no leídos.
create function public.retail_my_announcements()
returns table (id uuid, title text, body text, level text, starts_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select a.id, a.title, a.body, a.level, a.starts_at from retail_private.platform_announcements a
 where auth.uid() is not null and a.canceled_at is null and a.starts_at <= now() and a.ends_at > now()
  and not exists (select 1 from retail_private.announcement_reads r where r.announcement_id = a.id and r.user_id = auth.uid())
  and retail_private.announcement_reaches(a, auth.uid())
 order by case a.level when 'urgente' then 0 when 'importante' then 1 else 2 end, a.starts_at desc
 limit 5;
$$;

create function public.retail_dismiss_announcement(p_announcement uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then return; end if;
 insert into retail_private.announcement_reads(announcement_id, user_id)
 select a.id, auth.uid() from retail_private.platform_announcements a where a.id = p_announcement
 on conflict do nothing;
end;
$$;
revoke all on function public.retail_my_announcements(), public.retail_dismiss_announcement(uuid) from public, anon;
grant execute on function public.retail_my_announcements(), public.retail_dismiss_announcement(uuid) to authenticated;

-- 2. Cola push: nuevo tipo y vínculo con el aviso.
alter table public.retail_push_deliveries drop constraint retail_push_deliveries_kind_check;
alter table public.retail_push_deliveries add constraint retail_push_deliveries_kind_check check (kind in ('low_stock', 'shift_closed', 'test', 'platform'));
alter table public.retail_push_deliveries add column announcement_id uuid references retail_private.platform_announcements(id) on delete cascade;

-- Dispositivos alcanzados (las suscripciones push son por dispositivo y comercio).
create function retail_private.announcement_devices(p_announcement retail_private.platform_announcements)
returns setof public.retail_push_subscriptions
language sql stable security definer set search_path = '' as $$
 select s.* from public.retail_push_subscriptions s
 where case p_announcement.audience
  when 'all' then true
  when 'managers' then exists (select 1 from public.retail_members m where m.user_id = s.user_id and m.store_id = s.store_id and m.role in ('owner', 'admin'))
  when 'plan' then exists (select 1 from retail_private.store_subscriptions b where b.store_id = s.store_id and b.plan_id = p_announcement.plan_id)
  when 'store' then s.store_id = p_announcement.store_id
  else false end;
$$;
revoke all on function retail_private.announcement_devices(retail_private.platform_announcements) from public, anon, authenticated;

-- Misma lógica de 202610140001, con lotes de 100 y el tipo 'platform' (título y texto del aviso; se omite si se canceló).
create or replace function public.retail_claim_push(p_only uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 delete from public.retail_push_deliveries where created_at<now()-interval '7 days';
 with candidates as (
  select d.id from public.retail_push_deliveries d where d.sent_at is null and d.attempts<5
  and d.available_at<=now() and d.created_at>now()-interval '24 hours'
  and (d.locked_at is null or d.locked_at<now()-interval '2 minutes')
  and (p_only is null or d.id=p_only) order by d.created_at for update skip locked limit 100
 ), claimed as (
  update public.retail_push_deliveries d set attempts=d.attempts+1,locked_at=now(),lease=gen_random_uuid()
  from candidates c where d.id=c.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object(
  'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
  'title',a.title,'body',a.body,
  'authorized',s.user_id=c.user_id and s.store_id=c.store_id and (
   (c.kind='platform' and a.id is not null and a.canceled_at is null and a.ends_at>now())
   or (c.kind<>'platform' and exists(select 1 from public.retail_members m where m.store_id=c.store_id and m.user_id=c.user_id and m.role in ('owner','admin'))
    and (c.kind='test' or (c.kind='low_stock' and s.low_stock) or (c.kind='shift_closed' and s.shift_closed))))
  )), '[]'::jsonb) into result from claimed c join public.retail_push_subscriptions s on s.id=c.subscription_id
  left join retail_private.platform_announcements a on a.id=c.announcement_id;
 return result;
end $$;

-- 3. Panel de plataforma.
create function retail_private.check_announcement_target(p_audience text, p_plan uuid, p_store uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
 if p_audience is null or p_audience not in ('all', 'managers', 'plan', 'store') then raise exception 'Elegí a quién va el aviso'; end if;
 if p_audience = 'plan' and not exists (select 1 from retail_private.plans where id = p_plan) then raise exception 'Elegí el plan'; end if;
 if p_audience = 'store' and not exists (select 1 from public.retail_stores where id = p_store) then raise exception 'El comercio no existe. Revisá el ID'; end if;
end;
$$;
revoke all on function retail_private.check_announcement_target(text, uuid, uuid) from public, anon, authenticated;

create function public.retail_admin_announcement_reach(p_audience text, p_plan uuid, p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare probe retail_private.platform_announcements;
begin
 perform retail_private.require_platform_admin();
 perform retail_private.check_announcement_target(p_audience, p_plan, p_store);
 probe.audience := p_audience; probe.plan_id := case when p_audience = 'plan' then p_plan end; probe.store_id := case when p_audience = 'store' then p_store end;
 return jsonb_build_object(
  'users', (select count(*) from auth.users u where retail_private.announcement_reaches(probe, u.id)),
  'devices', (select count(*) from retail_private.announcement_devices(probe)));
end;
$$;

create function public.retail_admin_send_announcement(
 p_request uuid, p_title text, p_body text, p_level text, p_audience text, p_plan uuid, p_store uuid, p_days integer, p_push boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved retail_private.platform_announcements; queued integer := 0;
begin
 perform retail_private.require_platform_admin();
 if p_request is null then raise exception 'Falta el identificador del aviso'; end if;
 select * into saved from retail_private.platform_announcements where id = p_request;
 if found then
  return jsonb_build_object('id', saved.id, 'push_queued', (select count(*) from public.retail_push_deliveries where announcement_id = saved.id), 'repeated', true);
 end if;
 if length(trim(coalesce(p_title, ''))) not between 1 and 80 then raise exception 'Escribí un título de hasta 80 caracteres'; end if;
 if length(trim(coalesce(p_body, ''))) not between 1 and 500 then raise exception 'Escribí el mensaje (hasta 500 caracteres)'; end if;
 if p_level is null or p_level not in ('info', 'importante', 'urgente') then raise exception 'Elegí la importancia del aviso'; end if;
 if p_days is null or p_days not between 1 and 60 then raise exception 'El aviso puede quedar visible de 1 a 60 días'; end if;
 perform retail_private.check_announcement_target(p_audience, p_plan, p_store);
 insert into retail_private.platform_announcements(id, title, body, level, audience, plan_id, store_id, push, ends_at, created_by)
 values (p_request, trim(p_title), trim(p_body), p_level, p_audience, case when p_audience = 'plan' then p_plan end,
  case when p_audience = 'store' then p_store end, coalesce(p_push, false), now() + make_interval(days => p_days), auth.uid())
 returning * into saved;
 if saved.push then
  insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key, announcement_id)
  select d.id, d.user_id, d.store_id, 'platform', 'platform:' || saved.id::text, saved.id from retail_private.announcement_devices(saved) d
  on conflict (subscription_id, event_key) do nothing;
  get diagnostics queued = row_count;
 end if;
 return jsonb_build_object('id', saved.id, 'push_queued', queued, 'repeated', false);
end;
$$;

create function public.retail_admin_announcements() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return coalesce((select jsonb_agg(jsonb_build_object(
   'id', a.id, 'title', a.title, 'body', a.body, 'level', a.level, 'audience', a.audience,
   'plan', (select name from retail_private.plans where id = a.plan_id), 'store', (select name from public.retail_stores where id = a.store_id),
   'push', a.push, 'created_at', a.created_at, 'ends_at', a.ends_at, 'canceled_at', a.canceled_at,
   'by', (select email from auth.users where id = a.created_by),
   'reads', (select count(*) from retail_private.announcement_reads r where r.announcement_id = a.id),
   'push_total', (select count(*) from public.retail_push_deliveries d where d.announcement_id = a.id),
   'push_sent', (select count(*) from public.retail_push_deliveries d where d.announcement_id = a.id and d.sent_at is not null),
   'push_failed', (select count(*) from public.retail_push_deliveries d where d.announcement_id = a.id and d.sent_at is null and d.attempts >= 5)
  ) order by a.created_at desc)
  from (select * from retail_private.platform_announcements order by created_at desc limit 50) a), '[]'::jsonb);
end;
$$;

-- Cancelar: deja de mostrarse y no se envían los push pendientes. Los ya entregados no se pueden retirar.
create function public.retail_admin_cancel_announcement(p_announcement uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 update retail_private.platform_announcements set canceled_at = now() where id = p_announcement and canceled_at is null;
 if not found then raise exception 'El aviso no existe o ya estaba cancelado. Actualizá la lista'; end if;
 delete from public.retail_push_deliveries where announcement_id = p_announcement and sent_at is null;
end;
$$;

revoke all on function public.retail_admin_announcement_reach(text, uuid, uuid),
 public.retail_admin_send_announcement(uuid, text, text, text, text, uuid, uuid, integer, boolean),
 public.retail_admin_announcements(), public.retail_admin_cancel_announcement(uuid) from public, anon;
grant execute on function public.retail_admin_announcement_reach(text, uuid, uuid),
 public.retail_admin_send_announcement(uuid, text, text, text, text, uuid, uuid, integer, boolean),
 public.retail_admin_announcements(), public.retail_admin_cancel_announcement(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
