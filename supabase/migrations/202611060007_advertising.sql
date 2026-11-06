-- Publicidad administrada por el proveedor del servicio.
-- Tres lugares, ninguno en Vender ni en la caja:
--   supplier_offer   «Este producto lo tiene X a $Y» en pedidos a proveedores (productos que llegan al mínimo).
--   catalog_featured «Destacado» o «Nuevo lanzamiento» al dar de alta desde el catálogo global.
--   home_card        Tarjeta patrocinada en Inicio, para dueños y administradores, marcada «Publicidad».
-- Medición propia y agregada: vistas por comercio y día, y contactos (clics) deduplicados por día.
-- A los anunciantes no se les da ningún dato de ventas. Los planes «sin publicidad» no ven ninguna.
begin;

alter table retail_private.plans add column ads_free boolean not null default false;

create table retail_private.ad_advertisers (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(trim(name)) between 1 and 80),
 contact_name text check (contact_name is null or length(contact_name) <= 80),
 phone text check (phone is null or length(phone) <= 40),
 email text check (email is null or length(email) <= 120),
 notes text not null default '' check (length(notes) <= 1000),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table retail_private.ad_campaigns (
 id uuid primary key default gen_random_uuid(),
 advertiser_id uuid not null references retail_private.ad_advertisers(id),
 placement text not null check (placement in ('home_card', 'catalog_featured', 'supplier_offer')),
 title text not null check (length(trim(title)) between 1 and 80),
 body text not null default '' check (length(body) <= 300),
 cta_label text check (cta_label is null or length(cta_label) between 1 and 30),
 cta_url text check (cta_url is null or (length(cta_url) <= 500 and cta_url ~ '^(https://|tel:|mailto:)')),
 whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
 brand text check (brand is null or length(brand) <= 80),
 image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 paused boolean not null default false,
 plan_ids uuid[],
 store_ids uuid[],
 zones text[],
 daily_views_cap integer check (daily_views_cap is null or daily_views_cap between 1 and 1000),
 max_leads integer check (max_leads is null or max_leads between 1 and 1000000),
 price_model text not null default 'fijo' check (price_model in ('fijo', 'por_contacto', 'por_mil_vistas')),
 price numeric(14,2) not null default 0 check (price >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null,
 check (ends_at > starts_at)
);
create index retail_ad_campaigns_live on retail_private.ad_campaigns(placement, ends_at) where not paused;

create table retail_private.ad_items (
 campaign_id uuid not null references retail_private.ad_campaigns(id) on delete cascade,
 ean_code text not null check (length(ean_code) between 4 and 20),
 price numeric(14,2) check (price is null or price > 0),
 label text check (label is null or label in ('destacado', 'nuevo', 'oferta')),
 note text check (note is null or length(note) <= 80),
 primary key (campaign_id, ean_code)
);
create index retail_ad_items_code on retail_private.ad_items(ean_code);

create table retail_private.ad_daily (
 campaign_id uuid not null references retail_private.ad_campaigns(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 day date not null,
 views integer not null default 0,
 clicks integer not null default 0,
 primary key (campaign_id, store_id, day)
);
create index retail_ad_daily_day on retail_private.ad_daily(campaign_id, day);

create table retail_private.ad_leads (
 id bigint generated always as identity primary key,
 campaign_id uuid not null references retail_private.ad_campaigns(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 ean_code text not null default '',
 day date not null,
 created_at timestamptz not null default now(),
 unique (campaign_id, store_id, ean_code, day)
);
revoke all on retail_private.ad_advertisers, retail_private.ad_campaigns, retail_private.ad_items, retail_private.ad_daily, retail_private.ad_leads
 from public, anon, authenticated;

-- Imágenes públicas (las ven los comercios); solo los administradores de plataforma las suben o borran.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('retail-ads', 'retail-ads', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy retail_ads_admin_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'retail-ads' and retail_private.is_platform_admin());
create policy retail_ads_admin_delete on storage.objects for delete to authenticated
 using (bucket_id = 'retail-ads' and retail_private.is_platform_admin());

create function retail_private.ad_today() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'America/Argentina/Buenos_Aires')::date; $$;

-- ¿La campaña puede mostrarse a este comercio ahora?
create function retail_private.ad_eligible(p_campaign retail_private.ad_campaigns, p_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select not p_campaign.paused and p_campaign.starts_at <= now() and p_campaign.ends_at > now()
  and exists (select 1 from retail_private.ad_advertisers a where a.id = p_campaign.advertiser_id and a.active)
  and not exists (select 1 from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id where s.store_id = p_store and p.ads_free)
  and (p_campaign.plan_ids is null or exists (select 1 from retail_private.store_subscriptions s where s.store_id = p_store and s.plan_id = any(p_campaign.plan_ids)))
  and (p_campaign.store_ids is null or p_store = any(p_campaign.store_ids))
  and (p_campaign.zones is null or exists (select 1 from public.retail_stores st, unnest(p_campaign.zones) z
   where st.id = p_store and st.address ilike '%' || z || '%'))
  and (p_campaign.max_leads is null or (select count(*) from retail_private.ad_leads l where l.campaign_id = p_campaign.id) < p_campaign.max_leads)
  and (p_campaign.daily_views_cap is null or coalesce((select d.views from retail_private.ad_daily d
   where d.campaign_id = p_campaign.id and d.store_id = p_store and d.day = retail_private.ad_today()), 0) < p_campaign.daily_views_cap);
$$;
revoke all on function retail_private.ad_eligible(retail_private.ad_campaigns, uuid), retail_private.ad_today() from public, anon, authenticated;

-- 1. Publicidad para un lugar de la app. Solo lectura: las vistas se informan con retail_ad_track.
create function public.retail_ads(p_store uuid, p_placement text, p_codes text[] default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_role text := retail_private.role_for(p_store);
begin
 if auth.uid() is null or v_role is null then return '[]'::jsonb; end if;
 if p_placement = 'home_card' then
  if v_role not in ('owner', 'admin') then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'advertiser', a.name, 'title', c.title, 'body', c.body, 'cta_label', c.cta_label,
    'cta_url', c.cta_url, 'whatsapp', c.whatsapp, 'image_path', c.image_path))
   from (select * from retail_private.ad_campaigns c where c.placement = 'home_card' and retail_private.ad_eligible(c, p_store) order by random() limit 1) c
   join retail_private.ad_advertisers a on a.id = c.advertiser_id), '[]'::jsonb);
 elsif p_placement = 'catalog_featured' then
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'advertiser', a.name, 'title', c.title, 'body', c.body, 'brand', c.brand,
    'image_path', c.image_path, 'items', coalesce((select jsonb_agg(jsonb_build_object('ean_code', i.ean_code, 'label', i.label, 'note', i.note,
      'name', g.name)) from retail_private.ad_items i left join public.retail_global_catalog g on g.ean_code = i.ean_code where i.campaign_id = c.id), '[]'::jsonb)))
   from (select * from retail_private.ad_campaigns c where c.placement = 'catalog_featured' and retail_private.ad_eligible(c, p_store) order by c.created_at desc limit 5) c
   join retail_private.ad_advertisers a on a.id = c.advertiser_id), '[]'::jsonb);
 elsif p_placement = 'supplier_offer' then
  if p_codes is null or coalesce(array_length(p_codes, 1), 0) = 0 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'advertiser', a.name, 'ean_code', i.ean_code, 'price', i.price, 'note', i.note,
    'label', i.label, 'cta_label', c.cta_label, 'cta_url', c.cta_url, 'whatsapp', c.whatsapp))
   from retail_private.ad_items i
   join retail_private.ad_campaigns c on c.id = i.campaign_id and c.placement = 'supplier_offer'
   join retail_private.ad_advertisers a on a.id = c.advertiser_id
   where i.ean_code = any(p_codes[1:500]) and retail_private.ad_eligible(c, p_store)), '[]'::jsonb);
 end if;
 return '[]'::jsonb;
end;
$$;

-- 2. Medición. Vistas: hasta 1.000 por campaña, comercio y día. Contactos: uno por campaña, comercio, producto y día.
create function public.retail_ad_track(p_store uuid, p_events jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item jsonb; campaign uuid; code text; today date := retail_private.ad_today(); inserted integer;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then return; end if;
 if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 50 then return; end if;
 for item in select value from jsonb_array_elements(p_events) loop
  begin campaign := (item->>'campaign')::uuid; exception when others then continue; end;
  if campaign is null or not exists (select 1 from retail_private.ad_campaigns where id = campaign) then continue; end if;
  if item->>'kind' = 'view' then
   insert into retail_private.ad_daily(campaign_id, store_id, day, views) values (campaign, p_store, today, 1)
   on conflict (campaign_id, store_id, day) do update set views = least(retail_private.ad_daily.views + 1, 1000);
  elsif item->>'kind' = 'click' then
   code := left(coalesce(item->>'ean', ''), 20);
   insert into retail_private.ad_leads(campaign_id, store_id, user_id, ean_code, day) values (campaign, p_store, auth.uid(), code, today)
   on conflict (campaign_id, store_id, ean_code, day) do nothing;
   get diagnostics inserted = row_count;
   if inserted > 0 then
    insert into retail_private.ad_daily(campaign_id, store_id, day, clicks) values (campaign, p_store, today, 1)
    on conflict (campaign_id, store_id, day) do update set clicks = retail_private.ad_daily.clicks + 1;
   end if;
  end if;
 end loop;
end;
$$;
revoke all on function public.retail_ads(uuid, text, text[]), public.retail_ad_track(uuid, jsonb) from public, anon;
grant execute on function public.retail_ads(uuid, text, text[]), public.retail_ad_track(uuid, jsonb) to authenticated;

-- 3. Panel de plataforma: anunciantes.
create function public.retail_admin_advertisers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'contact_name', a.contact_name, 'phone', a.phone, 'email', a.email,
   'notes', a.notes, 'active', a.active, 'campaigns', (select count(*) from retail_private.ad_campaigns c where c.advertiser_id = a.id)) order by a.active desc, a.name)
  from retail_private.ad_advertisers a), '[]'::jsonb);
end;
$$;

create function public.retail_admin_save_advertiser(p_id uuid, p_name text, p_contact text, p_phone text, p_email text, p_notes text, p_active boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved uuid;
begin
 perform retail_private.require_platform_admin();
 if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Escribí el nombre del anunciante (hasta 80 caracteres)'; end if;
 if p_active is null then raise exception 'Indicá si el anunciante está activo'; end if;
 if p_id is null then
  insert into retail_private.ad_advertisers(name, contact_name, phone, email, notes, active)
  values (trim(p_name), nullif(trim(p_contact), ''), nullif(trim(p_phone), ''), nullif(trim(p_email), ''), coalesce(trim(p_notes), ''), p_active) returning id into saved;
 else
  update retail_private.ad_advertisers set name = trim(p_name), contact_name = nullif(trim(p_contact), ''), phone = nullif(trim(p_phone), ''),
   email = nullif(trim(p_email), ''), notes = coalesce(trim(p_notes), ''), active = p_active, updated_at = now() where id = p_id returning id into saved;
  if saved is null then raise exception 'El anunciante ya no existe. Actualizá la lista'; end if;
 end if;
 return saved;
exception when unique_violation then raise exception 'Ya hay un anunciante con ese nombre';
end;
$$;

-- 4. Campañas con sus totales.
create function public.retail_admin_campaigns() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'advertiser', a.name, 'placement', c.placement, 'title', c.title,
   'starts_at', c.starts_at, 'ends_at', c.ends_at, 'paused', c.paused, 'price_model', c.price_model, 'price', c.price, 'max_leads', c.max_leads,
   'items', (select count(*) from retail_private.ad_items i where i.campaign_id = c.id),
   'views', coalesce((select sum(views) from retail_private.ad_daily d where d.campaign_id = c.id), 0),
   'stores', (select count(distinct store_id) from retail_private.ad_daily d where d.campaign_id = c.id and d.views > 0),
   'leads', (select count(*) from retail_private.ad_leads l where l.campaign_id = c.id)) order by c.created_at desc)
  from (select * from retail_private.ad_campaigns order by created_at desc limit 200) c join retail_private.ad_advertisers a on a.id = c.advertiser_id), '[]'::jsonb);
end;
$$;

create function public.retail_admin_campaign(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c retail_private.ad_campaigns;
begin
 perform retail_private.require_platform_admin();
 select * into c from retail_private.ad_campaigns where id = p_id;
 if not found then raise exception 'La campaña ya no existe. Actualizá la lista'; end if;
 return to_jsonb(c) || jsonb_build_object(
  'items', coalesce((select jsonb_agg(jsonb_build_object('ean_code', i.ean_code, 'price', i.price, 'label', i.label, 'note', i.note,
    'name', (select name from public.retail_global_catalog g where g.ean_code = i.ean_code)) order by i.ean_code)
   from retail_private.ad_items i where i.campaign_id = c.id), '[]'::jsonb),
  'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'stores', stores, 'clicks', clicks) order by day)
   from (select day, sum(views) as views, count(*) filter (where views > 0) as stores, sum(clicks) as clicks from retail_private.ad_daily
    where campaign_id = c.id and day >= retail_private.ad_today() - 90 group by day) d), '[]'::jsonb),
  'leads', coalesce((select jsonb_agg(jsonb_build_object('created_at', created_at, 'store', name, 'ean_code', ean_code) order by created_at desc)
   from (select l.created_at, s.name, l.ean_code from retail_private.ad_leads l join public.retail_stores s on s.id = l.store_id
    where l.campaign_id = c.id order by l.created_at desc limit 500) x), '[]'::jsonb),
  'totals', jsonb_build_object(
   'views', coalesce((select sum(views) from retail_private.ad_daily where campaign_id = c.id), 0),
   'stores', (select count(distinct store_id) from retail_private.ad_daily where campaign_id = c.id and views > 0),
   'leads', (select count(*) from retail_private.ad_leads where campaign_id = c.id)));
end;
$$;

-- Guarda la campaña y reemplaza sus productos. p_values: campos de la campaña; p_items: [{ean_code, price, label, note}].
create function public.retail_admin_save_campaign(p_id uuid, p_values jsonb, p_items jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v jsonb := coalesce(p_values, '{}'::jsonb); saved uuid; v_placement text := v->>'placement'; item jsonb; total integer;
begin
 perform retail_private.require_platform_admin();
 if v_placement is null or v_placement not in ('home_card', 'catalog_featured', 'supplier_offer') then raise exception 'Elegí dónde se muestra'; end if;
 if nullif(v->>'ends_at', '') is null then raise exception 'Elegí hasta cuándo se muestra'; end if;
 if not exists (select 1 from retail_private.ad_advertisers where id = (v->>'advertiser_id')::uuid) then raise exception 'Elegí el anunciante'; end if;
 if length(trim(coalesce(v->>'title', ''))) not between 1 and 80 then raise exception 'Escribí el título (hasta 80 caracteres)'; end if;
 if nullif(v->>'cta_url', '') is not null and v->>'cta_url' !~ '^(https://|tel:|mailto:)' then raise exception 'El enlace debe empezar con https://, tel: o mailto:'; end if;
 if nullif(v->>'whatsapp', '') is not null and v->>'whatsapp' !~ '^[0-9]{8,15}$' then raise exception 'El WhatsApp va solo con números, con código de país (ej.: 5493415551234)'; end if;
 if v_placement = 'supplier_offer' and nullif(v->>'whatsapp', '') is null and nullif(v->>'cta_url', '') is null then
  raise exception 'Una oferta para pedidos necesita un WhatsApp o un enlace para que el comercio contacte al anunciante';
 end if;
 if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 500 then raise exception 'Hasta 500 productos por campaña'; end if;
 total := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
 if v_placement in ('catalog_featured', 'supplier_offer') and total = 0 then raise exception 'Agregá al menos un código de barras'; end if;
 if p_id is null then
  insert into retail_private.ad_campaigns(advertiser_id, placement, ends_at, title, created_by) values ((v->>'advertiser_id')::uuid, v_placement, now() + interval '30 days', trim(v->>'title'), auth.uid())
  returning id into saved;
 else
  saved := p_id;
  if not exists (select 1 from retail_private.ad_campaigns where id = saved) then raise exception 'La campaña ya no existe. Actualizá la lista'; end if;
 end if;
 update retail_private.ad_campaigns set
  advertiser_id = (v->>'advertiser_id')::uuid, placement = v->>'placement', title = trim(v->>'title'), body = coalesce(trim(v->>'body'), ''),
  cta_label = nullif(trim(v->>'cta_label'), ''), cta_url = nullif(trim(v->>'cta_url'), ''), whatsapp = nullif(trim(v->>'whatsapp'), ''),
  brand = nullif(trim(v->>'brand'), ''), image_path = nullif(v->>'image_path', ''),
  starts_at = coalesce((v->>'starts_at')::timestamptz, now()), ends_at = (v->>'ends_at')::timestamptz, paused = coalesce((v->>'paused')::boolean, false),
  plan_ids = case when jsonb_typeof(v->'plan_ids') = 'array' and jsonb_array_length(v->'plan_ids') > 0 then array(select jsonb_array_elements_text(v->'plan_ids')::uuid) end,
  store_ids = case when jsonb_typeof(v->'store_ids') = 'array' and jsonb_array_length(v->'store_ids') > 0 then array(select jsonb_array_elements_text(v->'store_ids')::uuid) end,
  zones = case when jsonb_typeof(v->'zones') = 'array' and jsonb_array_length(v->'zones') > 0 then array(select left(trim(z), 60) from jsonb_array_elements_text(v->'zones') z where trim(z) <> '') end,
  daily_views_cap = (v->>'daily_views_cap')::integer, max_leads = (v->>'max_leads')::integer,
  price_model = coalesce(v->>'price_model', 'fijo'), price = coalesce((v->>'price')::numeric, 0), updated_at = now()
 where id = saved;
 delete from retail_private.ad_items where campaign_id = saved;
 for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
  if length(trim(coalesce(item->>'ean_code', ''))) not between 4 and 20 then raise exception 'Revisá los códigos de barras: entre 4 y 20 caracteres'; end if;
  insert into retail_private.ad_items(campaign_id, ean_code, price, label, note)
  values (saved, trim(item->>'ean_code'), nullif(item->>'price', '')::numeric, nullif(item->>'label', ''), nullif(trim(item->>'note'), ''))
  on conflict (campaign_id, ean_code) do update set price = excluded.price, label = excluded.label, note = excluded.note;
 end loop;
 return saved;
exception
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception 'Revisá fechas, números e identificadores de la campaña';
 when check_violation then raise exception 'Revisá los datos de la campaña: alguno está fuera de rango (%).', sqlerrm;
end;
$$;

create function public.retail_admin_set_campaign_paused(p_id uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 update retail_private.ad_campaigns set paused = coalesce(p_paused, true), updated_at = now() where id = p_id;
 if not found then raise exception 'La campaña ya no existe. Actualizá la lista'; end if;
end;
$$;

-- 5. Planes: «sin publicidad». Cambia el tipo de resultado y la firma: se reemplazan con los mismos permisos.
drop function public.retail_admin_plans();
create function public.retail_admin_plans()
returns table (id uuid, name text, price numeric, max_branches integer, max_registers integer, max_users integer,
 ai_enabled boolean, ai_daily_tokens integer, active boolean, stores bigint, ads_free boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return query select p.id, p.name, p.price, p.max_branches, p.max_registers, p.max_users, p.ai_enabled, p.ai_daily_tokens, p.active,
  (select count(*) from retail_private.store_subscriptions s where s.plan_id = p.id), p.ads_free
 from retail_private.plans p order by p.active desc, p.price, p.name;
end;
$$;

drop function public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean);
create function public.retail_admin_save_plan(
 p_id uuid, p_name text, p_price numeric, p_max_branches integer, p_max_registers integer, p_max_users integer,
 p_ai_enabled boolean, p_ai_daily_tokens integer, p_active boolean, p_ads_free boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved uuid;
begin
 perform retail_private.require_platform_admin();
 if length(trim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'Escribí el nombre del plan (hasta 60 caracteres)'; end if;
 if p_price is null or p_price < 0 or round(p_price, 2) <> p_price then raise exception 'Revisá el precio: un importe positivo con hasta dos decimales'; end if;
 if p_ai_enabled is null or p_active is null then raise exception 'Faltan datos del plan'; end if;
 if p_id is null then
  insert into retail_private.plans(name, price, max_branches, max_registers, max_users, ai_enabled, ai_daily_tokens, active, ads_free)
  values (trim(p_name), p_price, p_max_branches, p_max_registers, p_max_users, p_ai_enabled, p_ai_daily_tokens, p_active, coalesce(p_ads_free, false)) returning id into saved;
 else
  update retail_private.plans set name = trim(p_name), price = p_price, max_branches = p_max_branches, max_registers = p_max_registers,
   max_users = p_max_users, ai_enabled = p_ai_enabled, ai_daily_tokens = p_ai_daily_tokens, active = p_active, ads_free = coalesce(p_ads_free, false), updated_at = now()
  where id = p_id returning id into saved;
  if saved is null then raise exception 'El plan ya no existe. Actualizá la lista'; end if;
 end if;
 return saved;
exception when unique_violation then raise exception 'Ya hay un plan con ese nombre';
end;
$$;

revoke all on function public.retail_admin_advertisers(), public.retail_admin_save_advertiser(uuid, text, text, text, text, text, boolean),
 public.retail_admin_campaigns(), public.retail_admin_campaign(uuid), public.retail_admin_save_campaign(uuid, jsonb, jsonb),
 public.retail_admin_set_campaign_paused(uuid, boolean), public.retail_admin_plans(),
 public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean, boolean) from public, anon;
grant execute on function public.retail_admin_advertisers(), public.retail_admin_save_advertiser(uuid, text, text, text, text, text, boolean),
 public.retail_admin_campaigns(), public.retail_admin_campaign(uuid), public.retail_admin_save_campaign(uuid, jsonb, jsonb),
 public.retail_admin_set_campaign_paused(uuid, boolean), public.retail_admin_plans(),
 public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
