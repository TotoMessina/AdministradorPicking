-- Read-only inventory. Confirm the project in the SQL Editor URL first.
-- This does not determine when objects were created or prove their provenance.
begin read only;

select table_schema, table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='retail_products'
 and column_name='margin_group';

select n.nspname as function_schema, p.proname as function_name,
 pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='retail_private' and p.proname='snapshot_margin_items'
 and p.pronargs=0;

select n.nspname as table_schema, c.relname as table_name,
 t.tgname as trigger_name, pg_catalog.pg_get_triggerdef(t.oid) as definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid=t.tgrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='retail_sales'
 and t.tgname='retail_snapshot_margin_items' and not t.tgisinternal;

commit;
