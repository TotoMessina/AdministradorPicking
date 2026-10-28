-- Adopción y conciliación para 202610280002 (fondos por ubicación)
-- y opcionalmente 202610280003 (inventario por sucursal si ya fue ejecutada).
-- Ejecutar en el SQL Editor de Supabase.
-- Si la sesión anterior quedó abortada (25P02), ejecutar primero: ROLLBACK;
do $adopt_funds$
declare
  v_funds_hash constant text := 'f22cae1d60cb383ca0f76216dc20e303370a2018266199f8650aa7beb77f8ada';
  v_inventory_hash constant text := '056054048e34a355f3315ed545e01af797fb2a1eb7a9026a79363bf4aa8cfaea';
begin
  perform set_config('lock_timeout', '10s', true);
  perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema', 0));

  if to_regclass('retail_private.schema_migrations') is null then
    raise exception 'Falta la tabla de historial retail_private.schema_migrations.';
  end if;

  if not exists (select 1 from retail_private.schema_migrations where filename = '202610280001_supplier_alias_usage_repair.sql') then
    raise exception 'Falta registrar 202610280001_supplier_alias_usage_repair.sql antes de conciliar fondos.';
  end if;

  -- 1. Validar y adoptar 202610280002_location_funds.sql
  if to_regclass('public.retail_location_funds') is null then
    raise exception 'La tabla retail_location_funds no existe. Usá el paquete normal 202610280002_location_funds.sql.';
  end if;

  if to_regclass('public.retail_fund_transfers') is null then
    raise exception 'La tabla retail_fund_transfers no existe. Revisá la instalación de fondos.';
  end if;

  if to_regprocedure('public.retail_move_location_funds(uuid,text,text,numeric,text,uuid)') is null then
    raise exception 'Falta la función retail_move_location_funds. Revisá la instalación de fondos.';
  end if;

  if not exists (select 1 from retail_private.schema_migrations where filename = '202610280002_location_funds.sql') then
    insert into retail_private.schema_migrations(filename, sha256, origin)
    values('202610280002_location_funds.sql', v_funds_hash, 'adopted');
    raise notice '202610280002_location_funds.sql adoptada con éxito.';
  else
    raise notice '202610280002_location_funds.sql ya estaba registrada.';
  end if;

  -- 2. Si 202610280003_location_inventory.sql también fue ejecutada directamente, adoptarla también
  if to_regclass('public.retail_branch_stock') is not null
     and to_regprocedure('public.retail_enable_branch_inventory(uuid,uuid)') is not null then
    if not exists (select 1 from retail_private.schema_migrations where filename = '202610280003_location_inventory.sql') then
      insert into retail_private.schema_migrations(filename, sha256, origin)
      values('202610280003_location_inventory.sql', v_inventory_hash, 'adopted');
      raise notice '202610280003_location_inventory.sql adoptada con éxito (tablas y funciones ya presentes).';
    else
      raise notice '202610280003_location_inventory.sql ya estaba registrada.';
    end if;
  end if;

end $adopt_funds$;

select filename, origin, registered_at
from retail_private.schema_migrations
where filename in ('202610280001_supplier_alias_usage_repair.sql', '202610280002_location_funds.sql', '202610280003_location_inventory.sql', '202610280004_permanent_product_deletion.sql')
order by filename;

