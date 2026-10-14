-- ==============================================================================
-- Migración: 202610070001_harden_global_catalog_immutability.sql
-- Proyecto: Kiosco Express
-- Descripción:
--   Blindaje definitivo de retail_global_catalog:
--   1. Los productos verificados u oficiales (source = 'verified' o confidence_score >= 0.90)
--      son 100% INMUTABLES: ningún comercio puede alterar su nombre, marca, categoría o emoji.
--   2. En registros comunitarios, no se sobreescriben datos existentes (solo se rellenan nulos).
-- ==============================================================================

begin;

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

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    -- Si no existe en el catálogo global, se da de alta como producto nuevo
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      case when p_source in ('ai','community','verified') then p_source else 'community' end,
      1, case when p_source = 'verified' then 1.00 else 0.50 end
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1, 'confidence_score', 0.50);
  end if;

  -- 1. BLINDAJE OFICIAL: Si el producto está verificado o tiene alta confianza, sus datos son INTOCABLES
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

  -- 2. REGISTRO COMUNITARIO: Nunca sobreescribir datos existentes, solo completar campos vacíos (NULL)
  v_new_count := v_rec.contributor_count + 1;
  v_new_conf := least(0.89, round(0.50 + (v_new_count * 0.05), 2));

  update public.retail_global_catalog
  set
    contributor_count = v_new_count,
    confidence_score = v_new_conf,
    -- Mantener nombre original si ya existe
    name = coalesce(nullif(trim(v_rec.name), ''), v_name),
    -- Mantener marca original; solo rellenar si en la base estaba NULL o vacía
    brand = coalesce(nullif(trim(v_rec.brand), ''), nullif(trim(p_brand), '')),
    -- Mantener categoría original; solo rellenar si en la base estaba NULL o vacía
    category_suggestion = coalesce(nullif(trim(v_rec.category_suggestion), ''), nullif(trim(p_category), '')),
    -- Mantener emoji existente si ya tiene uno específico
    emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
    updated_at = now()
  where ean_code = v_code;

  return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);

exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

commit;
