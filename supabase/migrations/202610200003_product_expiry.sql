-- Migration: Add product expiry date and last restocked timestamp to retail_products
begin;

alter table public.retail_products
  add column if not exists expiry_date date default null,
  add column if not exists last_restocked_at timestamptz default null;

commit;
