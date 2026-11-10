-- Nuevo medio de cobro «Link» (link de pago: Mercado Pago, Ualá, etc.). Se comporta como QR o transferencia: no es
-- efectivo, no toca la caja, se concilia y puede asignarse a una cuenta.
--
-- La lista de medios está escrita a mano en restricciones de tablas y en el cuerpo de varias funciones (cobro,
-- sincronización sin conexión, devoluciones, fiado, registros de ventas, conciliación y cuentas). En lugar de copiar
-- cada función entera, se agrega 'Link' solo a esas listas exactas, partiendo de la definición vigente en la base:
-- todo lo demás de cada función queda igual (cuerpo, seguridad, permisos y dueño).
begin;

-- 1) Restricciones CHECK: pg_get_constraintdef escribe cada valor como 'Transferencia'::text.
do $$
declare r record; v_new text;
begin
 for r in select c.conname, c.conrelid::regclass as tbl, pg_get_constraintdef(c.oid) as def
   from pg_constraint c join pg_namespace n on n.oid = c.connamespace
   where n.nspname = 'public' and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%''Transferencia''::text%'
     and pg_get_constraintdef(c.oid) not like '%''Link''%'
 loop
  v_new := replace(r.def, '''Transferencia''::text', '''Transferencia''::text, ''Link''::text');
  execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  execute format('alter table %s add constraint %I %s', r.tbl, r.conname, v_new);
 end loop;
end $$;

-- 2) Funciones: solo las listas de medios, con la forma exacta en que están escritas en las migraciones.
do $$
declare r record; v_def text; v_new text; v_count integer := 0;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'retail_private') and p.prokind = 'f' and p.prosrc like '%''Transferencia''%'
 loop
  v_def := pg_get_functiondef(r.oid);
  v_new := v_def;
  v_new := replace(v_new, '''Transferencia'',''Mixto'',''Debito'',''Credito'')', '''Transferencia'',''Mixto'',''Debito'',''Credito'',''Link'')');
  v_new := replace(v_new, '''Transferencia'',''Debito'',''Credito'',''Mixto'')', '''Transferencia'',''Debito'',''Credito'',''Mixto'',''Link'')');
  v_new := replace(v_new, '''Transferencia'',''Debito'',''Credito'')', '''Transferencia'',''Debito'',''Credito'',''Link'')');
  v_new := replace(v_new, '(''QR'',''Debito'',''Credito'',''Transferencia'')', '(''QR'',''Debito'',''Credito'',''Transferencia'',''Link'')');
  v_new := replace(v_new, 'values (''QR''),(''Debito''),(''Credito''),(''Transferencia'')', 'values (''QR''),(''Debito''),(''Credito''),(''Transferencia''),(''Link'')');
  if v_new <> v_def then execute v_new; v_count := v_count + 1; end if;
 end loop;
 raise notice 'Funciones actualizadas con el medio Link: %', v_count;
end $$;

notify pgrst,'reload schema';
commit;
