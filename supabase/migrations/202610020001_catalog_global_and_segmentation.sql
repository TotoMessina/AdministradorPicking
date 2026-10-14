-- ==============================================================================
-- Migración: 202610020001_catalog_global_and_segmentation.sql
-- Proyecto: Kiosco Express
-- Descripción:
--   PARTE A: Catálogo comunitario global de productos por código EAN
--            (retail_global_catalog) con búsqueda full-text y RLS comunitaria.
--   PARTE B: Segmentación avanzada en retail_products (marca, distribuidor,
--            código de proveedor, tags y tipo de unidad) con índices y permisos.
--
-- Compatibilidad: Totalmente compatible e incremental con 202610010001_retail_multistore.sql.
-- Idempotencia: Seguro de re-ejecutar sin alterar datos ni configuraciones previas.
-- ==============================================================================

begin;

-- ==============================================================================
-- 1. FUNCIÓN AUXILIAR: Actualización automática de timestamp (updated_at)
-- ==============================================================================
create or replace function retail_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function retail_private.set_updated_at() from public, anon;
grant execute on function retail_private.set_updated_at() to authenticated;

-- ==============================================================================
-- PARTE A: TABLA retail_global_catalog (Catálogo Comunitario por EAN)
-- ==============================================================================

-- 1. Creación de la tabla
create table if not exists public.retail_global_catalog (
  -- Clave primaria: código de barras EAN normalizado (entre 4 y 20 caracteres)
  ean_code text primary key check(length(trim(ean_code)) between 4 and 20),
  -- Datos descriptivos básicos del producto
  name text not null check(length(trim(name)) between 1 and 160),
  brand text,
  category_suggestion text,
  emoji text default '📦',
  description text,
  -- Métricas comunitarias de validación y confianza
  contributor_count integer default 1 check(contributor_count >= 1),
  confidence_score numeric(3,2) default 0.50 check(confidence_score between 0.00 and 1.00),
  -- Origen del registro: 'ai' | 'community' | 'verified'
  source text default 'community' check(source in ('ai', 'community', 'verified')),
  -- Metadatos de auditoría temporal
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Índices de optimización de búsqueda
-- Índice GIN para búsqueda full-text en español sobre el nombre del producto
create index if not exists idx_retail_global_catalog_fts
  on public.retail_global_catalog
  using gin(to_tsvector('spanish', name));

-- Índice B-Tree para filtrado por marca comercial
create index if not exists idx_retail_global_catalog_brand
  on public.retail_global_catalog(brand);

-- Índice B-Tree para filtrado por sugerencia de categoría
create index if not exists idx_retail_global_catalog_category_suggestion
  on public.retail_global_catalog(category_suggestion);

-- 3. Trigger para actualizar automáticamente el campo updated_at
drop trigger if exists trg_retail_global_catalog_updated_at on public.retail_global_catalog;
create trigger trg_retail_global_catalog_updated_at
  before update on public.retail_global_catalog
  for each row
  execute function retail_private.set_updated_at();

-- 4. Seguridad de Fila (Row Level Security - RLS)
alter table public.retail_global_catalog enable row level security;

-- Lectura pública: tanto usuarios anónimos como autenticados pueden consultar el catálogo comunitario
drop policy if exists global_catalog_read on public.retail_global_catalog;
create policy global_catalog_read
  on public.retail_global_catalog
  for select
  to anon, authenticated
  using (true);

-- Inserción: únicamente usuarios autenticados pueden registrar nuevos productos comunitarios
drop policy if exists global_catalog_insert on public.retail_global_catalog;
create policy global_catalog_insert
  on public.retail_global_catalog
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- Actualización: usuarios autenticados pueden sugerir mejoras y aportar métricas
drop policy if exists global_catalog_update on public.retail_global_catalog;
create policy global_catalog_update
  on public.retail_global_catalog
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 5. Concesión de privilegios (Grants)
-- Revocar accesos por defecto y conceder permisos específicos
revoke all on public.retail_global_catalog from anon, authenticated;

grant select on public.retail_global_catalog to anon, authenticated;
grant insert on public.retail_global_catalog to authenticated;

-- UPDATE limitado a columnas no críticas (protegiendo ean_code como PK y created_at como auditoría)
grant update(
  name,
  brand,
  category_suggestion,
  emoji,
  description,
  contributor_count,
  confidence_score,
  source
) on public.retail_global_catalog to authenticated;


-- ==============================================================================
-- PARTE B: COLUMNAS NUEVAS Y SEGMENTACIÓN EN retail_products
-- ==============================================================================

-- 1. Agregar nuevas columnas a la tabla de productos por comercio
alter table public.retail_products
  add column if not exists brand text,
  add column if not exists supplier text,
  add column if not exists supplier_code text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists unit_type text not null default 'unit';

-- 2. Restricción check para los valores admitidos en unit_type
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'retail_products_unit_type_check'
  ) then
    alter table public.retail_products
      add constraint retail_products_unit_type_check
      check (unit_type in ('unit', 'kg', 'lt', 'pack', 'box'));
  end if;
end $$;

-- 3. Índices para segmentación, filtrado y ajustes en lote
-- Índice para filtrado de productos por comercio y marca
create index if not exists idx_retail_products_store_brand
  on public.retail_products(store_id, brand);

-- Índice para filtrado de productos por comercio y proveedor/distribuidor
create index if not exists idx_retail_products_store_supplier
  on public.retail_products(store_id, supplier);

-- Índice GIN para búsquedas y filtros por etiquetas múltiples (tags)
create index if not exists idx_retail_products_tags
  on public.retail_products
  using gin(tags);

-- 4. Actualización de permisos: Extender grant update a las nuevas columnas
-- Permite que los roles autorizados (administradores/dueños según RLS de la tienda)
-- puedan modificar los nuevos atributos de producto.
grant update(
  brand,
  supplier,
  supplier_code,
  tags,
  unit_type
) on public.retail_products to authenticated;


-- ==============================================================================
-- PARTE C: FUNCIONES RPC PARA CATÁLOGO GLOBAL (LOOKUP Y CONTRIBUCIÓN)
-- ==============================================================================

-- 1. Búsqueda comunitaria por código EAN
create or replace function public.retail_lookup_ean(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rec record;
begin
  select
    ean_code,
    name,
    brand,
    category_suggestion,
    emoji,
    source,
    confidence_score
  into v_rec
  from public.retail_global_catalog
  where ean_code = trim(p_code)
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'name', v_rec.name,
    'brand', v_rec.brand,
    'category_suggestion', v_rec.category_suggestion,
    'emoji', v_rec.emoji,
    'source', v_rec.source,
    'confidence_score', v_rec.confidence_score
  );
end;
$$;

revoke all on function public.retail_lookup_ean(text) from public;
grant execute on function public.retail_lookup_ean(text) to anon, authenticated;

-- 2. Contribución comunitaria al catálogo cuando se guarda un producto
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
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      case when p_source in ('ai','community','verified') then p_source else 'community' end,
      1, 0.50
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1, 'confidence_score', 0.50);
  else
    v_new_count := v_rec.contributor_count + 1;
    v_new_conf := least(1.00, round(0.50 + (v_new_count * 0.05), 2));

    update public.retail_global_catalog
    set
      contributor_count = v_new_count,
      confidence_score = v_new_conf,
      -- No sobrescribir el nombre si el producto ya está verificado
      name = case when v_rec.confidence_score >= 0.90 then v_rec.name else v_name end,
      brand = coalesce(nullif(trim(p_brand), ''), v_rec.brand),
      category_suggestion = coalesce(nullif(trim(p_category), ''), v_rec.category_suggestion),
      emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);
  end if;
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public, anon;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

-- Notificar a PostgREST para recargar la caché de esquemas inmediatamente
notify pgrst, 'reload schema';

commit;


