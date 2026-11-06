-- Panel de plataforma: lectura de todos los comercios, uso de IA y seguimiento interno.
-- Solo para administradores de plataforma (retail_private.platform_admins, 202611030004). Ese permiso se sigue
-- otorgando únicamente desde el SQL Editor: ninguna función de este archivo agrega ni quita administradores.
-- No expone ventas individuales, tickets, clientes ni comprobantes: solo conteos y totales por comercio.
begin;

-- 1. Uso de IA. Groq se llama desde el navegador, así que cada dispositivo informa su propio uso.
-- Es un registro orientativo para seguimiento, no una medición de facturación ni un límite efectivo.
create table retail_private.ai_usage (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 store_id uuid references public.retail_stores(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 feature text not null check (feature ~ '^[a-z][a-z0-9_-]{0,39}$'),
 model text not null check (length(model) between 1 and 80),
 prompt_tokens integer not null default 0 check (prompt_tokens between 0 and 200000),
 completion_tokens integer not null default 0 check (completion_tokens between 0 and 200000),
 ok boolean not null,
 error_code text check (error_code is null or length(error_code) <= 60)
);
create index retail_ai_usage_created on retail_private.ai_usage(created_at);
create index retail_ai_usage_store on retail_private.ai_usage(store_id, created_at);
create index retail_ai_usage_user on retail_private.ai_usage(user_id, created_at);
revoke all on retail_private.ai_usage from public, anon, authenticated;

create function public.retail_log_ai_usage(
 p_store uuid, p_feature text, p_model text, p_prompt_tokens integer, p_completion_tokens integer, p_ok boolean, p_error_code text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid();
 store uuid := p_store;
 feat text := lower(coalesce(trim(p_feature), ''));
begin
 if uid is null or p_ok is null then return; end if;
 -- Un comercio ajeno no se atribuye: queda sin comercio.
 if store is not null and retail_private.role_for(store) is null then store := null; end if;
 if feat !~ '^[a-z][a-z0-9_-]{0,39}$' then feat := 'otro'; end if;
 -- Un dispositivo en bucle no debe inflar el registro.
 if (select count(*) from retail_private.ai_usage where user_id = uid and created_at > now() - interval '1 minute') >= 60 then return; end if;
 insert into retail_private.ai_usage(store_id, user_id, feature, model, prompt_tokens, completion_tokens, ok, error_code)
 values (store, uid, feat, left(coalesce(nullif(trim(p_model), ''), 'desconocido'), 80),
  least(greatest(coalesce(p_prompt_tokens, 0), 0), 200000), least(greatest(coalesce(p_completion_tokens, 0), 0), 200000),
  p_ok, case when p_ok then null else left(nullif(trim(p_error_code), ''), 60) end);
end;
$$;
revoke all on function public.retail_log_ai_usage(uuid, text, text, integer, integer, boolean, text) from public, anon;
grant execute on function public.retail_log_ai_usage(uuid, text, text, integer, integer, boolean, text) to authenticated;

-- 2. Seguimiento interno por comercio. Informativo: no bloquea ni habilita nada en el comercio.
create table retail_private.platform_store_notes (
 store_id uuid primary key references public.retail_stores(id) on delete cascade,
 status text not null default 'activo' check (status in ('prueba', 'activo', 'atencion', 'baja')),
 note text not null default '' check (length(note) <= 1000),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
revoke all on retail_private.platform_store_notes from public, anon, authenticated;

create function retail_private.require_platform_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
 if not retail_private.is_platform_admin() then
  raise exception 'Solo un administrador de plataforma puede ver este panel' using errcode = '42501';
 end if;
end;
$$;
revoke all on function retail_private.require_platform_admin() from public, anon, authenticated;

-- 3. Resumen general del período.
create function public.retail_admin_overview(p_days integer default 30) returns jsonb
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

-- 4. Lista de comercios con su actividad del período.
create function public.retail_admin_stores(p_search text default null, p_days integer default 30)
returns table (
 id uuid, name text, created_at timestamptz, owner_email text, members integer, branches integer, products integer,
 sales_count bigint, sales_total numeric, last_sale_at timestamptz, ai_requests bigint, ai_tokens bigint,
 billing_enabled boolean, status text, note text
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
  s.billing_enabled, coalesce(n.status, 'activo'), coalesce(n.note, '')
 from public.retail_stores s
 left join auth.users o on o.id = s.owner_id
 left join retail_private.platform_store_notes n on n.store_id = s.id
 left join lateral (select count(*) as sales_count, sum(x.total) as sales_total from public.retail_sales x
  where x.store_id = s.id and x.created_at >= since) sa on true
 left join lateral (select count(*) as requests, sum(a.prompt_tokens + a.completion_tokens)::bigint as tokens from retail_private.ai_usage a
  where a.store_id = s.id and a.created_at >= since) ai on true
 where term is null or s.name ilike '%' || term || '%' or o.email ilike '%' || term || '%' or s.id::text = term
 order by s.created_at desc
 limit 500;
end;
$$;

-- 5. Detalle de un comercio: personas, locales y uso de IA. Sin ventas individuales.
create function public.retail_admin_store_detail(p_store uuid, p_days integer default 30) returns jsonb
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

-- 6. Usuarios de la plataforma, para soporte. Máximo 200 por búsqueda.
create function public.retail_admin_users(p_search text default null)
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean, stores jsonb, is_platform_admin boolean)
language plpgsql stable security definer set search_path = '' as $$
declare term text := nullif(trim(coalesce(p_search, '')), '');
begin
 perform retail_private.require_platform_admin();
 return query
 select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
  coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'role', m.role) order by s.name)
   from public.retail_members m join public.retail_stores s on s.id = m.store_id where m.user_id = u.id), '[]'::jsonb),
  exists (select 1 from retail_private.platform_admins a where a.user_id = u.id)
 from auth.users u
 where term is null or u.email ilike '%' || term || '%' or u.id::text = term
 order by u.created_at desc
 limit 200;
end;
$$;

-- 7. Uso de IA del período: por día, función, modelo y comercio, más los últimos errores.
create function public.retail_admin_ai_usage(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
 days integer := least(greatest(coalesce(p_days, 30), 1), 365);
 since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
begin
 perform retail_private.require_platform_admin();
 return jsonb_build_object(
  'days', days,
  'requests', (select count(*) from retail_private.ai_usage where created_at >= since),
  'errors', (select count(*) from retail_private.ai_usage where created_at >= since and not ok),
  'prompt_tokens', (select coalesce(sum(prompt_tokens), 0) from retail_private.ai_usage where created_at >= since),
  'completion_tokens', (select coalesce(sum(completion_tokens), 0) from retail_private.ai_usage where created_at >= since),
  'users', (select count(distinct user_id) from retail_private.ai_usage where created_at >= since),
  'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'requests', requests, 'tokens', tokens, 'errors', errors) order by day)
   from (select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as day, count(*) as requests,
    sum(prompt_tokens + completion_tokens) as tokens, count(*) filter (where not ok) as errors
    from retail_private.ai_usage where created_at >= since group by 1) d), '[]'::jsonb),
  'by_feature', coalesce((select jsonb_agg(jsonb_build_object('feature', feature, 'requests', requests, 'tokens', tokens, 'errors', errors) order by requests desc)
   from (select feature, count(*) as requests, sum(prompt_tokens + completion_tokens) as tokens, count(*) filter (where not ok) as errors
    from retail_private.ai_usage where created_at >= since group by feature) f), '[]'::jsonb),
  'by_model', coalesce((select jsonb_agg(jsonb_build_object('model', model, 'requests', requests, 'tokens', tokens, 'errors', errors) order by requests desc)
   from (select model, count(*) as requests, sum(prompt_tokens + completion_tokens) as tokens, count(*) filter (where not ok) as errors
    from retail_private.ai_usage where created_at >= since group by model) m), '[]'::jsonb),
  'by_store', coalesce((select jsonb_agg(jsonb_build_object('store_id', store_id, 'name', name, 'requests', requests, 'tokens', tokens, 'errors', errors) order by tokens desc)
   from (select a.store_id, coalesce(s.name, 'Sin comercio') as name, count(*) as requests, sum(a.prompt_tokens + a.completion_tokens) as tokens,
    count(*) filter (where not a.ok) as errors
    from retail_private.ai_usage a left join public.retail_stores s on s.id = a.store_id
    where a.created_at >= since group by a.store_id, s.name order by tokens desc limit 20) t), '[]'::jsonb),
  'recent_errors', coalesce((select jsonb_agg(jsonb_build_object('created_at', created_at, 'store', name, 'feature', feature, 'model', model, 'error_code', error_code) order by created_at desc)
   from (select a.created_at, s.name, a.feature, a.model, a.error_code from retail_private.ai_usage a
    left join public.retail_stores s on s.id = a.store_id
    where a.created_at >= since and not a.ok order by a.created_at desc limit 20) e), '[]'::jsonb)
 );
end;
$$;

-- 8. Guardar el seguimiento interno de un comercio.
create function public.retail_admin_save_store_note(p_store uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if not exists (select 1 from public.retail_stores where id = p_store) then raise exception 'El comercio no existe'; end if;
 if p_status is null or p_status not in ('prueba', 'activo', 'atencion', 'baja') then raise exception 'Elegí un estado válido'; end if;
 if length(coalesce(p_note, '')) > 1000 then raise exception 'La nota admite hasta 1000 caracteres'; end if;
 insert into retail_private.platform_store_notes(store_id, status, note, updated_at, updated_by)
 values (p_store, p_status, coalesce(trim(p_note), ''), now(), auth.uid())
 on conflict (store_id) do update set status = excluded.status, note = excluded.note, updated_at = now(), updated_by = auth.uid();
end;
$$;

-- 9. Quiénes administran la plataforma (solo lectura; se cambia desde el SQL Editor).
create function public.retail_admin_platform_admins()
returns table (email text, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return query select u.email::text, a.note, a.created_at from retail_private.platform_admins a
  left join auth.users u on u.id = a.user_id order by a.created_at;
end;
$$;

revoke all on function public.retail_admin_overview(integer), public.retail_admin_stores(text, integer),
 public.retail_admin_store_detail(uuid, integer), public.retail_admin_users(text), public.retail_admin_ai_usage(integer),
 public.retail_admin_save_store_note(uuid, text, text), public.retail_admin_platform_admins() from public, anon;
grant execute on function public.retail_admin_overview(integer), public.retail_admin_stores(text, integer),
 public.retail_admin_store_detail(uuid, integer), public.retail_admin_users(text), public.retail_admin_ai_usage(integer),
 public.retail_admin_save_store_note(uuid, text, text), public.retail_admin_platform_admins() to authenticated;

notify pgrst, 'reload schema';
commit;
