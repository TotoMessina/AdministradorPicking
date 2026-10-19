-- READ ONLY. Run the whole file in AdministradorKiosco's SQL Editor.
-- Correct project: lkahqqsduatkhxruiolo. Do not run installation in FilmTracker.
-- One JSON result, without user/product/sale rows or credentials.
-- Object presence does not prove that every statement of a migration ran.

begin read only;
set local statement_timeout='15s';

with base_tables(name) as (
 values ('retail_stores'), ('retail_members'), ('retail_categories'),
 ('retail_registers'), ('retail_products'), ('retail_shifts'),
 ('retail_sales'), ('retail_movements'), ('retail_invitations')
), retail_tables as (
 select c.oid,c.relname,c.relrowsecurity
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and left(c.relname,7)='retail_' and c.relkind in ('r','p')
)
select jsonb_pretty(jsonb_build_object(
 'tablas_base_faltantes', (
  select coalesce(jsonb_agg(b.name order by b.name),'[]'::jsonb)
  from base_tables b where not exists(select 1 from retail_tables t where t.relname=b.name)
 ),
 'schema_retail_private', exists(select 1 from pg_catalog.pg_namespace where nspname='retail_private'),
 'tablas_y_columnas', (
  select coalesce(jsonb_agg(jsonb_build_object(
   'tabla',t.relname,'rls',t.relrowsecurity,
   'columnas',(
    select jsonb_agg(jsonb_build_object('nombre',a.attname,'tipo',pg_catalog.format_type(a.atttypid,a.atttypmod)) order by a.attnum)
    from pg_catalog.pg_attribute a where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
   )
  ) order by t.relname),'[]'::jsonb) from retail_tables t
 ),
 'funciones',(
  select coalesce(jsonb_agg(format('%I.%I(%s)',n.nspname,p.proname,pg_catalog.oidvectortypes(p.proargtypes))
   order by n.nspname,p.proname,p.oid),'[]'::jsonb)
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='retail_private' or (n.nspname='public' and left(p.proname,7)='retail_')
 ),
 'triggers',(
  select coalesce(jsonb_agg(jsonb_build_object(
   'tabla',t.relname,'nombre',tr.tgname,'definicion',pg_catalog.pg_get_triggerdef(tr.oid)
  ) order by t.relname,tr.tgname),'[]'::jsonb)
  from retail_tables t join pg_catalog.pg_trigger tr on tr.tgrelid=t.oid where not tr.tgisinternal
 ),
 'buckets',(
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'publico',public) order by id),'[]'::jsonb)
  from storage.buckets where id in ('retail-vouchers','retail-remitos')
 )
)) as instalacion_kiosco;

commit;
