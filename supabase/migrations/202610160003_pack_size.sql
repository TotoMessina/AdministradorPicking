-- Stock and POS quantities remain individual units; packs are a replenishment input.
begin;
alter table public.retail_products
 add column pack_size integer default null check(pack_size is null or pack_size >= 1);
-- Product updates use explicit column grants and the existing manager RLS policy.
grant update(pack_size) on public.retail_products to authenticated;
notify pgrst,'reload schema';
commit;
