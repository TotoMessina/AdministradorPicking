-- READ-ONLY audit of FilmTracker after accidentally attempting the retail migration.
-- Run the WHOLE file in FilmTracker's SQL Editor, not AdministradorKiosco's.
-- Produces one JSON text cell: copy that cell to share the current schema state.
-- Does not read user, movie, sales, message or prediction rows. No credentials.
-- Expected objects come from the five migration files supplied by the user.
-- Missing expected objects may indicate unapplied migrations, not damage.

begin read only;
set local statement_timeout = '15s';

with expected_tables(table_name, expected_columns, expect_rls) as (
 values
 ('awards_predictions', array['id','user_id','season_year','predictions','score','submitted_at'], true),
 ('cineclubs', array['id','name','description','cover_url','creator_id','current_movie_tmdb_id','voting_deadline','discussion_date','created_at'], true),
 ('cineclub_members', array['id','club_id','user_id','role','has_watched','created_at'], true),
 ('cineclub_polls', array['id','club_id','options','active','created_at'], true),
 ('cineclub_messages', array['id','club_id','user_id','message','is_spoiler','created_at'], true),
 ('trigger_warnings', array['id','tmdb_id','category','label','source','reported_by','upvotes','created_at'], true),
 ('trigger_warning_votes', array['id','warning_id','user_id','created_at'], true),
 -- Only these additions are described by the supplied files, not the base schema.
 ('profiles', array['streaming_platforms'], null::boolean),
 ('movies', array['origin_country'], null::boolean)
), table_checks as (
 select e.table_name, c.oid, c.relrowsecurity,
  jsonb_build_object(
   'tabla', 'public.' || e.table_name,
   'existe', c.oid is not null,
   'columnas_esperadas_faltantes', (
    select coalesce(jsonb_agg(col.name order by col.name), '[]'::jsonb)
    from unnest(e.expected_columns) as col(name)
    where not exists (
     select 1 from pg_catalog.pg_attribute a
     where a.attrelid=c.oid and a.attname=col.name and a.attnum>0 and not a.attisdropped
    )
   ),
   'rls_activado', c.relrowsecurity,
   'rls_requerido_por_archivos', e.expect_rls,
   'rls_cumple', case when e.expect_rls is null then null else coalesce(c.relrowsecurity, false) end
  ) as result
 from expected_tables e
 left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.table_name and c.relkind in ('r','p')
), expected_indexes(index_name) as (
 values
 ('idx_awards_predictions_season_year'), ('idx_awards_predictions_user'),
 ('idx_cineclubs_creator'), ('idx_cineclub_members_club'), ('idx_cineclub_members_user'),
 ('idx_cineclub_polls_club'), ('idx_cineclub_messages_club'),
 ('idx_trigger_warnings_tmdb'), ('idx_trigger_warnings_reported_by'),
 ('idx_trigger_warning_votes_warning')
)
select jsonb_pretty(jsonb_build_object(
 'alcance', 'Estructura actual, sin datos. Contrastar con las cinco migraciones compartidas; no es una copia ni un historial de la base.',
 'tablas_filmtracker', (
  select jsonb_agg(result order by table_name) from table_checks
 ),
 'columnas_especiales', (
  select coalesce(jsonb_agg(jsonb_build_object(
   'tabla', c.relname, 'columna', a.attname,
   'tipo', pg_catalog.format_type(a.atttypid,a.atttypmod),
   'default', pg_catalog.pg_get_expr(d.adbin,d.adrelid)
  ) order by c.relname,a.attname),'[]'::jsonb)
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid=a.attrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  left join pg_catalog.pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where n.nspname='public' and not a.attisdropped and a.attnum>0
   and ((c.relname='profiles' and a.attname='streaming_platforms')
     or (c.relname='movies' and a.attname='origin_country'))
 ),
 'indices_esperados_faltantes', (
  select coalesce(jsonb_agg(e.index_name order by e.index_name),'[]'::jsonb)
  from expected_indexes e
  where not exists (
   select 1 from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   join pg_catalog.pg_index i on i.indexrelid=c.oid
   where n.nspname='public' and c.relname=e.index_name and i.indisvalid and i.indisready
  )
 ),
 'politicas_actuales', (
  select coalesce(jsonb_agg(jsonb_build_object(
   'tabla', tc.table_name, 'nombre', p.polname, 'comando', p.polcmd,
   'permisiva', p.polpermissive,
   'using', pg_catalog.pg_get_expr(p.polqual,p.polrelid),
   'with_check', pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid)
  ) order by tc.table_name,p.polname),'[]'::jsonb)
  from table_checks tc join pg_catalog.pg_policy p on p.polrelid=tc.oid
 ),
 'restricciones_actuales', (
  select coalesce(jsonb_agg(jsonb_build_object(
   'tabla', tc.table_name, 'nombre', con.conname,
   'definicion', pg_catalog.pg_get_constraintdef(con.oid), 'validada', con.convalidated
  ) order by tc.table_name,con.conname),'[]'::jsonb)
  from table_checks tc join pg_catalog.pg_constraint con on con.conrelid=tc.oid
 ),
 'objetos_del_kiosco', jsonb_build_object(
  'schema_retail_private', exists (select 1 from pg_catalog.pg_namespace where nspname='retail_private'),
  'funciones_retail', (
   select coalesce(jsonb_agg(jsonb_build_object(
    'firma', format('%I.%I(%s)',n.nspname,p.proname,pg_catalog.oidvectortypes(p.proargtypes)),
    'tipo', p.prokind,
    'definicion', pg_catalog.pg_get_functiondef(p.oid)
   ) order by n.nspname,p.proname,p.oid),'[]'::jsonb)
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where p.prokind in ('f','p') and
    (n.nspname='retail_private' or (n.nspname='public' and left(p.proname,7)='retail_'))
  ),
  'otras_funciones_que_mencionan_retail', (
   select coalesce(jsonb_agg(format('%I.%I(%s)',n.nspname,p.proname,pg_catalog.oidvectortypes(p.proargtypes))
    order by n.nspname,p.proname,p.oid),'[]'::jsonb)
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where p.prokind in ('f','p') and n.nspname not in ('pg_catalog','information_schema','retail_private')
    and not (n.nspname='public' and left(p.proname,7)='retail_')
    and strpos(p.prosrc,'retail_')>0
  ),
  'otras_relaciones_retail', (
   select coalesce(jsonb_agg(jsonb_build_object('nombre',c.relname,'tipo',c.relkind) order by c.relname),'[]'::jsonb)
   from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and left(c.relname,7)='retail_' and c.relkind not in ('r','p')
  ),
  'tablas_retail', (
   select coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb)
   from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and left(c.relname,7)='retail_' and c.relkind in ('r','p')
  ),
  'columna_margin_group', exists (
   select 1 from pg_catalog.pg_attribute a
   join pg_catalog.pg_class c on c.oid=a.attrelid
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='retail_products' and a.attname='margin_group'
    and a.attnum>0 and not a.attisdropped
  ),
  'funcion_snapshot', exists (
   select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='retail_private' and p.proname='snapshot_margin_items' and p.pronargs=0
  ),
  'trigger_snapshot', exists (
   select 1 from pg_catalog.pg_trigger t
   join pg_catalog.pg_class c on c.oid=t.tgrelid
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='retail_sales' and t.tgname='retail_snapshot_margin_items'
    and not t.tgisinternal
  )
 )
)) as auditoria_filmtracker;

commit;
