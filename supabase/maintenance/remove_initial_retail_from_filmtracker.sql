-- MANUAL, DESTRUCTIVE MAINTENANCE FOR FILMTRACKER ONLY.
-- Removes the nine retail tables reported by the user, INCLUDING THEIR ROWS,
-- plus the eight known functions and the now-empty retail_private schema.
-- Export/retain any retail data you need BEFORE running this file.
-- Confirm the FilmTracker project in the SQL Editor URL.
-- DO NOT RUN in AdministradorKiosco (lkahqqsduatkhxruiolo).
-- Run the ENTIRE file, never selected fragments. No CASCADE is used.
-- Guards below require FilmTracker tables and reject unknown retail objects
-- or other stored functions mentioning retail. Failures roll back the cleanup.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
 expected_film_tables text[] := array[
  'profiles','movies','awards_predictions','cineclubs','cineclub_members',
  'cineclub_polls','cineclub_messages','trigger_warnings','trigger_warning_votes'
 ];
 allowed_tables text[] := array[
  'retail_categories','retail_invitations','retail_members','retail_movements',
  'retail_products','retail_registers','retail_sales','retail_shifts','retail_stores'
 ];
 allowed_functions text[] := array[
  'public.retail_create_store(text)',
  'public.retail_accept_invitations()',
  'public.retail_open_shift(uuid, uuid, numeric)',
  'public.retail_checkout(uuid, uuid, text, numeric, jsonb)',
  'public.retail_add_movement(uuid, text, numeric, text, uuid)',
  'public.retail_close_shift(uuid, numeric)',
  'retail_private.check_shift(uuid)',
  'retail_private.role_for(uuid)'
 ];
 unexpected text;
begin
 select string_agg(t.name,', ' order by t.name) into unexpected
 from unnest(expected_film_tables) as t(name)
 where not exists (
  select 1 from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname=t.name and c.relkind in ('r','p')
 );
 if unexpected is not null then
  raise exception 'No se reconoce el esquema esperado de FilmTracker. Faltan: %. No se elimino nada.', unexpected;
 end if;

 select string_agg(c.relname,', ' order by c.relname) into unexpected
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and left(c.relname,7)='retail_'
  and c.relkind in ('r','p','v','m','f')
  and not (c.relname=any(allowed_tables));
 if unexpected is not null then
  raise exception 'Hay relaciones retail fuera de las nueve revisadas: %. Compartir el inventario ampliado antes de continuar.', unexpected;
 end if;

 select string_agg(format('%I.%I(%s)',n.nspname,p.proname,pg_catalog.oidvectortypes(p.proargtypes)),', '
  order by n.nspname,p.proname,p.oid) into unexpected
 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where (
  n.nspname='retail_private'
  or (n.nspname='public' and left(p.proname,7)='retail_')
  or (n.nspname not in ('pg_catalog','information_schema') and strpos(p.prosrc,'retail_')>0)
 ) and not (format('%I.%I(%s)',n.nspname,p.proname,pg_catalog.oidvectortypes(p.proargtypes))=any(allowed_functions));
 if unexpected is not null then
  raise exception 'Hay rutinas no incluidas o referencias a retail en otras rutinas: %. No se elimino nada.', unexpected;
 end if;
end;
$preflight$;

-- Remove public entry points and the helper whose return type is retail_shifts.
drop function if exists
 public.retail_create_store(text),
 public.retail_accept_invitations(),
 public.retail_open_shift(uuid,uuid,numeric),
 public.retail_checkout(uuid,uuid,text,numeric,jsonb),
 public.retail_add_movement(uuid,text,numeric,text,uuid),
 public.retail_close_shift(uuid,numeric)
restrict;

-- The private schema may already have been removed on a previous run.
do $remove_helper$
begin
 if exists (select 1 from pg_catalog.pg_namespace where nspname='retail_private') then
  execute 'drop function if exists retail_private.check_shift(uuid) restrict';
 end if;
end;
$remove_helper$;

-- One explicit group: references within these nine tables are removed together.
-- External views/FKs/etc. block the command instead of being cascaded away.
drop table if exists
 public.retail_movements,
 public.retail_sales,
 public.retail_shifts,
 public.retail_products,
 public.retail_invitations,
 public.retail_members,
 public.retail_registers,
 public.retail_categories,
 public.retail_stores
restrict;

-- Table policies referencing role_for have now gone with their retail tables.
do $remove_role_helper$
begin
 if exists (select 1 from pg_catalog.pg_namespace where nspname='retail_private') then
  execute 'drop function if exists retail_private.role_for(uuid) restrict';
 end if;
end;
$remove_role_helper$;
drop schema if exists retail_private restrict;

-- Refuse to report success if a prefixed sequence/view/index/function remains.
-- Owned indexes, row types and identity sequences normally go with their tables.
do $verify$
begin
 if exists (
  select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and left(c.relname,7)='retail_'
 ) or exists (
  select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='retail_private' or (n.nspname='public' and left(p.proname,7)='retail_')
 ) or exists (select 1 from pg_catalog.pg_namespace where nspname='retail_private') then
  raise exception 'Quedan objetos retail no contemplados. La limpieza se revierte; compartir inventario ampliado.';
 end if;
end;
$verify$;

notify pgrst, 'reload schema';
commit;

select 'Limpieza completada: ejecutar ahora el informe ampliado de FilmTracker para verificar el estado final.' as resultado;
