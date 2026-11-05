-- Presentaciones del producto: además del bulto (pack_size = unidades por bulto), cuántas unidades trae un display.
-- Un bulto con displays trae pack_size = displays × display_size unidades. El stock y el costo siguen siempre por unidad;
-- la presentación solo sirve para cargar cantidades y costos por bulto o por display y pasarlos a unidades.
begin;

alter table public.retail_products
 add column display_size integer check (display_size is null or display_size between 1 and 2147483647),
 add constraint retail_products_display_fits_pack check (display_size is null or pack_size is null or pack_size % display_size = 0);
grant update(display_size) on public.retail_products to authenticated;

notify pgrst,'reload schema';
commit;
