-- IA desde el servidor: la función ai-proxy llama a Groq con la clave guardada como secreto de Supabase.
-- La base decide si un comercio puede usar IA (acceso, suspensión, corte general y cupo diario de tokens) y
-- el servidor registra el uso real. El registro informado por el navegador (retail_log_ai_usage) queda solo
-- para instalaciones que todavía usan VITE_GROQ_API_KEY.
begin;

-- 1. Configuración general (una sola fila) y límites por comercio.
create table retail_private.ai_settings (
 id boolean primary key default true check (id),
 enabled boolean not null default true,
 default_daily_tokens integer check (default_daily_tokens is null or default_daily_tokens between 0 and 100000000),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
insert into retail_private.ai_settings(id) values (true);

create table retail_private.ai_store_limits (
 store_id uuid primary key references public.retail_stores(id) on delete cascade,
 enabled boolean not null default true,
 daily_tokens integer check (daily_tokens is null or daily_tokens between 0 and 100000000),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
revoke all on retail_private.ai_settings, retail_private.ai_store_limits from public, anon, authenticated;

-- Tokens usados hoy (día de Argentina) por el comercio.
create function retail_private.ai_tokens_today(p_store uuid) returns bigint
language sql stable security definer set search_path = '' as $$
 select coalesce(sum(prompt_tokens + completion_tokens), 0)::bigint from retail_private.ai_usage
 where store_id = p_store
  and created_at >= (date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires');
$$;
revoke all on function retail_private.ai_tokens_today(uuid) from public, anon, authenticated;

-- 2. Autorización: la llama ai-proxy con la sesión de la persona, antes de cada consulta.
-- role_for ya devuelve null para un comercio suspendido o sin acceso.
create function public.retail_ai_authorize(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
 settings retail_private.ai_settings;
 limits retail_private.ai_store_limits;
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
 -- Un dispositivo en bucle o un uso abusivo no agota el cupo del comercio en minutos.
 if (select count(*) from retail_private.ai_usage where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then
  return jsonb_build_object('allowed', false, 'code', 'ai_rate_limited', 'message', 'Demasiadas consultas seguidas. Probá de nuevo en un minuto', 'retry_after', 30);
 end if;
 select * into limits from retail_private.ai_store_limits where store_id = p_store;
 if found and not limits.enabled then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'La IA no está habilitada para este comercio. Lo demás de la app funciona igual');
 end if;
 cap := case when found and limits.daily_tokens is not null then limits.daily_tokens else settings.default_daily_tokens end;
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
revoke all on function public.retail_ai_authorize(uuid) from public, anon;
grant execute on function public.retail_ai_authorize(uuid) to authenticated;

-- 3. Registro del servidor: solo con la clave de servicio (ai-proxy), nunca desde la app.
create function public.retail_ai_record(
 p_store uuid, p_user uuid, p_feature text, p_model text, p_prompt_tokens integer, p_completion_tokens integer, p_ok boolean, p_error_code text
) returns void
language plpgsql security definer set search_path = '' as $$
declare feat text := lower(coalesce(trim(p_feature), ''));
begin
 if p_ok is null then return; end if;
 if feat !~ '^[a-z][a-z0-9_-]{0,39}$' then feat := 'otro'; end if;
 insert into retail_private.ai_usage(store_id, user_id, feature, model, prompt_tokens, completion_tokens, ok, error_code)
 values (
  case when exists (select 1 from public.retail_stores where id = p_store) then p_store end,
  case when exists (select 1 from auth.users where id = p_user) then p_user end,
  feat, left(coalesce(nullif(trim(p_model), ''), 'desconocido'), 80),
  least(greatest(coalesce(p_prompt_tokens, 0), 0), 200000), least(greatest(coalesce(p_completion_tokens, 0), 0), 200000),
  p_ok, case when p_ok then null else left(nullif(trim(p_error_code), ''), 60) end);
end;
$$;
revoke all on function public.retail_ai_record(uuid, uuid, text, text, integer, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.retail_ai_record(uuid, uuid, text, text, integer, integer, boolean, text) to service_role;

-- 4. Panel de plataforma.
create function public.retail_admin_ai_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return (select jsonb_build_object('enabled', s.enabled, 'default_daily_tokens', s.default_daily_tokens, 'updated_at', s.updated_at,
  'overrides', coalesce((select jsonb_agg(jsonb_build_object('store_id', l.store_id, 'name', st.name, 'enabled', l.enabled, 'daily_tokens', l.daily_tokens,
    'used_today', retail_private.ai_tokens_today(l.store_id)) order by st.name)
   from retail_private.ai_store_limits l join public.retail_stores st on st.id = l.store_id), '[]'::jsonb))
  from retail_private.ai_settings s where s.id);
end;
$$;

create function public.retail_admin_save_ai_settings(p_enabled boolean, p_default_daily_tokens integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if p_enabled is null then raise exception 'Indicá si la IA queda activa'; end if;
 if p_default_daily_tokens is not null and p_default_daily_tokens not between 0 and 100000000 then raise exception 'El cupo diario debe estar entre 0 y 100.000.000 tokens'; end if;
 update retail_private.ai_settings set enabled = p_enabled, default_daily_tokens = p_default_daily_tokens, updated_at = now(), updated_by = auth.uid() where id;
end;
$$;

create function public.retail_admin_store_ai_limit(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return jsonb_build_object(
  'custom', exists (select 1 from retail_private.ai_store_limits where store_id = p_store),
  'enabled', coalesce((select enabled from retail_private.ai_store_limits where store_id = p_store), true),
  'daily_tokens', (select daily_tokens from retail_private.ai_store_limits where store_id = p_store),
  'default_daily_tokens', (select default_daily_tokens from retail_private.ai_settings where id),
  'global_enabled', (select enabled from retail_private.ai_settings where id),
  'used_today', retail_private.ai_tokens_today(p_store));
end;
$$;

-- p_custom false vuelve el comercio a la configuración general.
create function public.retail_admin_save_store_ai_limit(p_store uuid, p_custom boolean, p_enabled boolean, p_daily_tokens integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if not exists (select 1 from public.retail_stores where id = p_store) then raise exception 'El comercio no existe'; end if;
 if not coalesce(p_custom, false) then delete from retail_private.ai_store_limits where store_id = p_store; return; end if;
 if p_enabled is null then raise exception 'Indicá si la IA queda habilitada para el comercio'; end if;
 if p_daily_tokens is not null and p_daily_tokens not between 0 and 100000000 then raise exception 'El cupo diario debe estar entre 0 y 100.000.000 tokens'; end if;
 insert into retail_private.ai_store_limits(store_id, enabled, daily_tokens, updated_at, updated_by)
 values (p_store, p_enabled, p_daily_tokens, now(), auth.uid())
 on conflict (store_id) do update set enabled = excluded.enabled, daily_tokens = excluded.daily_tokens, updated_at = now(), updated_by = auth.uid();
end;
$$;

revoke all on function public.retail_admin_ai_settings(), public.retail_admin_save_ai_settings(boolean, integer),
 public.retail_admin_store_ai_limit(uuid), public.retail_admin_save_store_ai_limit(uuid, boolean, boolean, integer) from public, anon;
grant execute on function public.retail_admin_ai_settings(), public.retail_admin_save_ai_settings(boolean, integer),
 public.retail_admin_store_ai_limit(uuid), public.retail_admin_save_store_ai_limit(uuid, boolean, boolean, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
