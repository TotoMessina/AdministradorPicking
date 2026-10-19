-- MANUAL MAINTENANCE ONLY. Do not add this file to the migrations directory.
-- Run only in the OTHER project where 202610160004_margin_groups.sql was
-- accidentally installed and margin_group did not exist beforehand.
-- Confirm the project in the SQL Editor URL before running the whole file.
-- Do NOT run in AdministradorKiosco (project lkahqqsduatkhxruiolo).
-- Removes the added column and its contents, its column constraint/grant,
-- and this migration's trigger/function. Does not rewrite sales JSON or
-- delete product/sale rows. No CASCADE: external dependencies may block it.

begin;
set local lock_timeout = '5s';

drop trigger if exists retail_snapshot_margin_items on public.retail_sales;
drop function if exists retail_private.snapshot_margin_items() restrict;
alter table public.retail_products drop column if exists margin_group restrict;

notify pgrst, 'reload schema';
commit;

-- Success: all three flags must be false.
select
 exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='retail_products'
    and column_name='margin_group'
 ) as margin_group_still_exists,
 exists (
  select 1 from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='retail_private' and p.proname='snapshot_margin_items'
    and p.pronargs=0
 ) as snapshot_function_still_exists,
 exists (
  select 1 from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid=t.tgrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='retail_sales'
    and t.tgname='retail_snapshot_margin_items' and not t.tgisinternal
 ) as snapshot_trigger_still_exists;
