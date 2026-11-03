-- Administrador de plataforma para el catálogo global (retail_global_catalog).
-- Es un permiso aparte de los roles de comercio: se otorga solo desde el SQL Editor y nadie puede dárselo desde la app.
-- Los comercios dejan de escribir directo en la tabla: aportan solo con retail_contribute_catalog, que ya no acepta
-- 'verified' de quien no es administrador de plataforma. La lectura sigue abierta igual que antes.
begin;

-- 1. Quiénes administran la plataforma. Sin acceso desde la API.
create table retail_private.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 note text check (note is null or length(note)<=200),
 created_at timestamptz not null default now()
);
revoke all on retail_private.platform_admins from public,anon,authenticated;

create function retail_private.is_platform_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from retail_private.platform_admins where user_id=(select auth.uid()));
$$;
revoke all on function retail_private.is_platform_admin() from public,anon;
grant execute on function retail_private.is_platform_admin() to authenticated;

-- Para que la app sepa si mostrar herramientas de plataforma. Mostrar no da permiso: cada función vuelve a validar.
create function public.retail_is_platform_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.is_platform_admin();
$$;
revoke all on function public.retail_is_platform_admin() from public,anon;
grant execute on function public.retail_is_platform_admin() to authenticated;

-- 2. Sin escritura directa: antes cualquier usuario con sesión podía insertar o cambiar filas, incluido source y confianza.
drop policy if exists global_catalog_insert on public.retail_global_catalog;
drop policy if exists global_catalog_update on public.retail_global_catalog;
revoke insert,update,delete,truncate on public.retail_global_catalog from public,anon,authenticated;

-- 3. Aporte de los comercios: misma lógica que 202610070001, pero 'verified' solo para administradores de plataforma.
create or replace function public.retail_contribute_catalog(
  p_code text,
  p_name text,
  p_brand text default null,
  p_category text default null,
  p_emoji text default '📦',
  p_source text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p_code);
  v_name text := trim(p_name);
  v_source text;
  v_rec record;
  v_new_count integer;
  v_new_conf numeric(3,2);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Iniciá sesión para contribuir');
  end if;

  if length(v_code) not between 4 and 20 or length(v_name) not between 1 and 160 then
    return jsonb_build_object('error', 'Datos de producto inválidos');
  end if;

  v_source := case
    when p_source = 'verified' and retail_private.is_platform_admin() then 'verified'
    when p_source = 'ai' then 'ai'
    else 'community'
  end;

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      v_source, 1, case when v_source = 'verified' then 1.00 else 0.50 end
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1,
      'confidence_score', case when v_source = 'verified' then 1.00 else 0.50 end);
  end if;

  -- Verificados o de alta confianza: sus datos no cambian, solo se cuenta el aporte.
  if v_rec.source = 'verified' or coalesce(v_rec.confidence_score, 0) >= 0.90 then
    update public.retail_global_catalog
    set
      contributor_count = v_rec.contributor_count + 1,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object(
      'action', 'verified_protected',
      'message', 'El producto está verificado y sus datos oficiales no pueden ser alterados',
      'contributor_count', v_rec.contributor_count + 1
    );
  end if;

  -- Comunitarios: nunca sobrescribir datos existentes, solo completar campos vacíos.
  v_new_count := v_rec.contributor_count + 1;
  v_new_conf := least(0.89, round(0.50 + (v_new_count * 0.05), 2));

  update public.retail_global_catalog
  set
    contributor_count = v_new_count,
    confidence_score = v_new_conf,
    name = coalesce(nullif(trim(v_rec.name), ''), v_name),
    brand = coalesce(nullif(trim(v_rec.brand), ''), nullif(trim(p_brand), '')),
    category_suggestion = coalesce(nullif(trim(v_rec.category_suggestion), ''), nullif(trim(p_category), '')),
    emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
    updated_at = now()
  where ean_code = v_code;

  return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);

exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public, anon;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

-- 4. Edición del administrador de plataforma: reemplaza los datos del EAN (o lo crea).
-- p_verified true lo deja oficial e inmutable para los comercios; false lo devuelve a comunitario (confianza hasta 0,89).
create function public.retail_admin_save_catalog(
 p_code text, p_name text, p_brand text, p_category text, p_emoji text, p_description text, p_verified boolean
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 code text:=trim(p_code); nm text:=trim(p_name); prior record;
begin
 if not retail_private.is_platform_admin() then raise exception 'Solo un administrador de plataforma puede editar el catálogo global' using errcode='42501'; end if;
 if code is null or length(code) not between 4 and 20 then raise exception 'El código debe tener entre 4 y 20 caracteres'; end if;
 if nm is null or length(nm) not between 1 and 160 then raise exception 'El nombre debe tener entre 1 y 160 caracteres'; end if;
 if p_verified is null then raise exception 'Indicá si el producto queda verificado'; end if;

 select * into prior from public.retail_global_catalog where ean_code=code for update;
 if not found then
  insert into public.retail_global_catalog(ean_code,name,brand,category_suggestion,emoji,description,source,contributor_count,confidence_score)
  values(code,nm,nullif(trim(p_brand),''),nullif(trim(p_category),''),coalesce(nullif(trim(p_emoji),''),'📦'),nullif(trim(p_description),''),
   case when p_verified then 'verified' else 'community' end,1,case when p_verified then 1.00 else 0.50 end);
  return jsonb_build_object('action','inserted','ean_code',code,'verified',p_verified);
 end if;

 update public.retail_global_catalog set
  name=nm,
  brand=nullif(trim(p_brand),''),
  category_suggestion=nullif(trim(p_category),''),
  emoji=coalesce(nullif(trim(p_emoji),''),'📦'),
  description=nullif(trim(p_description),''),
  source=case when p_verified then 'verified' when prior.source='verified' then 'community' else prior.source end,
  confidence_score=case when p_verified then 1.00 else least(coalesce(prior.confidence_score,0.50),0.89) end,
  updated_at=now()
 where ean_code=code;
 return jsonb_build_object('action','updated','ean_code',code,'verified',p_verified);
end;
$$;

-- 5. Borrar un EAN equivocado. Los productos de los comercios no cambian: solo copiaban los datos.
create function public.retail_admin_delete_catalog(p_code text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.is_platform_admin() then raise exception 'Solo un administrador de plataforma puede editar el catálogo global' using errcode='42501'; end if;
 delete from public.retail_global_catalog where ean_code=trim(p_code);
 return found;
end;
$$;

revoke all on function public.retail_admin_save_catalog(text,text,text,text,text,text,boolean),public.retail_admin_delete_catalog(text) from public,anon;
grant execute on function public.retail_admin_save_catalog(text,text,text,text,text,text,boolean),public.retail_admin_delete_catalog(text) to authenticated;

notify pgrst,'reload schema';
commit;
