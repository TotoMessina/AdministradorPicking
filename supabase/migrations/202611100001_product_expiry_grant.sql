-- El vencimiento del producto (202610200003) se agregó sin permiso de edición: cambiarlo desde la ficha o la
-- planilla daba «permission denied». Se habilita igual que las demás columnas editables del producto; las
-- políticas y los controles de permisos de la tabla siguen aplicando. `last_restocked_at` sigue siendo solo del
-- servidor (lo actualiza la reposición).
begin;
grant update(expiry_date) on public.retail_products to authenticated;
notify pgrst,'reload schema';
commit;
