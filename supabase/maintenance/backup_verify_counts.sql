-- READ ONLY. Run the whole file in the SQL Editor, in production and in the restored project.
-- Row counts only: no user, sale or credential data. Compare both results line by line.

begin read only;
set local statement_timeout='60s';

select tabla,filas from (
 select n.nspname||'.'||c.relname as tabla,
  (xpath('/row/filas/text()',query_to_xml(format('select count(*) as filas from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text::bigint as filas
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and ((n.nspname='public' and left(c.relname,7)='retail_') or n.nspname='retail_private' or (n.nspname='auth' and c.relname='users'))
 union all
 select 'archivos:'||b.id,(select count(*) from storage.objects o where o.bucket_id=b.id)
 from storage.buckets b where b.id in ('retail-vouchers','retail-remitos')
) conteos order by tabla;

commit;
