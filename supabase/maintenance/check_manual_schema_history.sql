-- READ ONLY. Run the WHOLE file in AdministradorKiosco's SQL Editor.
-- Confirm project lkahqqsduatkhxruiolo in the dashboard first.
-- If the previous failed transaction is still open (25P02), run ROLLBACK first.
-- Returns installation metadata only. Does not adopt migrations or change data.
-- Object presence alone is NOT proof that an entire migration was applied.
begin read only;
set local statement_timeout='15s';

-- Read optional history dynamically: a missing history table must not break diagnosis.
-- The local setting transports JSON to the final SELECT and disappears at COMMIT.
do $history$
declare history_rows jsonb:='[]'::jsonb; history_exists boolean; history_shape boolean:=false;
begin
 history_exists:=to_regclass('retail_private.schema_migrations') is not null;
 if history_exists then
  select count(*)=4 into history_shape from pg_catalog.pg_attribute
   where attrelid=to_regclass('retail_private.schema_migrations') and not attisdropped
    and attname in ('filename','sha256','origin','registered_at');
  if history_shape then
   execute 'select coalesce(jsonb_agg(jsonb_build_object(''archivo'',filename,''sha256'',sha256,''origen'',origin,''registrado'',registered_at) order by filename),''[]''::jsonb) from retail_private.schema_migrations'
    into history_rows;
  end if;
 end if;
 perform set_config('retail.schema_diagnostic_history',jsonb_build_object(
  'existe',history_exists,'estructura_esperada',history_shape,'migraciones',history_rows
 )::text,true);
end $history$;

with expected_columns(step,table_name,column_name) as (values
 ('31-cierre','retail_shifts','closing_denominations'),('31-cierre','retail_shifts','ticket_count'),
 ('32-deposito','retail_stores','depot_enabled'),
 ('34-facturacion','retail_stores','cuit'),('34-facturacion','retail_stores','razon_social'),
 ('34-facturacion','retail_stores','condicion_iva'),('34-facturacion','retail_stores','punto_venta_afip'),
 ('34-facturacion','retail_stores','iibb'),('34-facturacion','retail_stores','inicio_actividades'),
 ('34-facturacion','retail_stores','billing_enabled'),
 ('34-facturacion','retail_sales','cbte_tipo'),('34-facturacion','retail_sales','cbte_nro'),
 ('34-facturacion','retail_sales','cae'),('34-facturacion','retail_sales','cae_vto'),
 ('34-facturacion','retail_sales','billing_status'),('34-facturacion','retail_sales','billing_error'),
 ('34-facturacion','retail_sales','billing_attempts'),
 ('35-arbol','retail_price_lists','base_kind'),('35-arbol','retail_price_lists','parent_id'),
 ('35-arbol','retail_price_lists','pricing_rules'),('35-arbol','retail_price_lists','revision'),
 ('36-baja','retail_price_lists','deleted_at'),('36-baja','retail_price_lists','deleted_by')
), expected_functions(schema_name,function_name) as (values
 ('retail_private','cash_denominations_total'),('retail_private','snapshot_shift_closing'),
 ('public','retail_close_shift'),('public','retail_shift_ticket_count'),('public','retail_sync_operation'),
 ('retail_private','guard_depot_inventory'),('retail_private','guard_depot_setting'),
 ('public','retail_set_depot'),('public','retail_depot_operation'),('public','retail_create_composite_product'),
 ('retail_private','initialize_sale_billing'),('public','retail_set_billing_settings'),('public','retail_update_sale_billing'),
 ('retail_private','validate_price_tree'),('retail_private','product_list_price'),
 ('public','retail_save_price_list_tree'),('public','retail_save_price_override'),('public','retail_delete_price_list'),
 ('public','retail_checkout')
), target_tables as (
 select c.oid,c.relname,c.relrowsecurity from pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in (
  'retail_shifts','retail_stores','retail_sales','retail_products','retail_price_lists',
  'retail_price_overrides','retail_depot_balances','retail_depot_movements'
 ) and c.relkind in ('r','p')
)
select jsonb_pretty(jsonb_build_object(
 'aviso','Inventario de solo lectura; no certifica ni registra migraciones completas',
 'historial',current_setting('retail.schema_diagnostic_history')::jsonb,
 'columnas',(
  select jsonb_agg(jsonb_build_object('paso',e.step,'tabla',e.table_name,'columna',e.column_name,
   'existe',a.attnum is not null,'tipo',pg_catalog.format_type(a.atttypid,a.atttypmod),
   'no_nula',a.attnotnull,'predeterminado',pg_catalog.pg_get_expr(d.adbin,d.adrelid)
  ) order by e.step,e.table_name,e.column_name)
  from expected_columns e left join pg_catalog.pg_attribute a
   on a.attrelid=to_regclass('public.'||e.table_name) and a.attname=e.column_name and a.attnum>0 and not a.attisdropped
  left join pg_catalog.pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
 ),
 'funciones',(
  select jsonb_agg(jsonb_build_object('nombre',e.schema_name||'.'||e.function_name,
   'variantes',coalesce((select jsonb_agg(jsonb_build_object(
    'firma',pg_catalog.pg_get_function_identity_arguments(p.oid),
    'security_definer',p.prosecdef,'configuracion',p.proconfig,
    'huella_cuerpo',md5(replace(p.prosrc,E'\r','')),
    'ejecutable_authenticated',case when exists(select 1 from pg_catalog.pg_roles where rolname='authenticated') then has_function_privilege('authenticated',p.oid,'EXECUTE') else null end,
    'ejecutable_anon',case when exists(select 1 from pg_catalog.pg_roles where rolname='anon') then has_function_privilege('anon',p.oid,'EXECUTE') else null end,
    'incluye_close_details',case when e.function_name='retail_sync_operation' then position('close_details' in p.prosrc)>0 else null end,
    'usa_arbol_precios',case when e.function_name='retail_checkout' then position('retail_private.product_list_price' in p.prosrc)>0 else null end
   ) order by p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname=e.schema_name and p.proname=e.function_name),'[]'::jsonb)
  ) order by e.schema_name,e.function_name) from expected_functions e
 ),
 'tablas',(
  select jsonb_agg(jsonb_build_object('nombre',t.relname,'rls',t.relrowsecurity) order by t.relname) from target_tables t
 ),
 'triggers',(
  select coalesce(jsonb_agg(jsonb_build_object('tabla',t.relname,'nombre',tr.tgname,
   'habilitado',tr.tgenabled,'definicion',pg_catalog.pg_get_triggerdef(tr.oid)) order by t.relname,tr.tgname),'[]'::jsonb)
  from target_tables t join pg_catalog.pg_trigger tr on tr.tgrelid=t.oid where not tr.tgisinternal
 ),
 'restricciones',(
  select coalesce(jsonb_agg(jsonb_build_object('tabla',t.relname,'nombre',c.conname,
   'definicion',pg_catalog.pg_get_constraintdef(c.oid)) order by t.relname,c.conname),'[]'::jsonb)
  from target_tables t join pg_catalog.pg_constraint c on c.conrelid=t.oid
  where t.relname in ('retail_shifts','retail_price_lists','retail_price_overrides','retail_depot_balances','retail_depot_movements')
 ),
 'indices',(
  select coalesce(jsonb_agg(jsonb_build_object('tabla',t.relname,'definicion',pg_catalog.pg_get_indexdef(i.indexrelid)) order by t.relname,i.indexrelid),'[]'::jsonb)
  from target_tables t join pg_catalog.pg_index i on i.indrelid=t.oid
  where t.relname in ('retail_price_lists','retail_price_overrides','retail_depot_balances','retail_depot_movements')
 ),
 'politicas',(
  select coalesce(jsonb_agg(jsonb_build_object('tabla',p.tablename,'nombre',p.policyname,'comando',p.cmd,
   'roles',p.roles,'lectura',p.qual,'escritura',p.with_check) order by p.tablename,p.policyname),'[]'::jsonb)
  from pg_catalog.pg_policies p where p.schemaname='public'
   and p.tablename in ('retail_price_lists','retail_price_overrides','retail_depot_balances','retail_depot_movements')
 )
)) as diagnostico_historial;
commit;
