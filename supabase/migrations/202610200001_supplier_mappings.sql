begin;

-- Same normalization as normalizeSupplierText in the client; no new extension.
create function retail_private.normalize_supplier(p_text text) returns text
language sql immutable set search_path = '' as $$
 select btrim(regexp_replace(regexp_replace(lower(regexp_replace(
   normalize(coalesce(p_text, ''), NFD), U&'[\0300-\036f]', '', 'g')),
   '[^[:alnum:][:space:]]', ' ', 'g'), '[[:space:]]+', ' ', 'g'));
$$;
revoke all on function retail_private.normalize_supplier(text) from public;
grant execute on function retail_private.normalize_supplier(text) to authenticated;

create table public.retail_supplier_mappings (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 supplier text not null check(supplier <> '' and supplier = retail_private.normalize_supplier(supplier)),
 invoice_text text not null check(length(btrim(invoice_text)) > 0),
 product_id uuid not null references public.retail_products(id),
 product_name text not null check(length(btrim(product_name)) > 0),
 pack_size_detected integer check(pack_size_detected is null or pack_size_detected >= 1),
 confidence numeric(3,2) not null default 1.0 check(confidence between 0 and 1),
 times_used integer not null default 1 check(times_used >= 1),
 last_used_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(store_id, supplier, invoice_text),
 -- A member cannot link their store's alias to another store's product.
 foreign key(store_id, product_id) references public.retail_products(store_id, id)
);
create index retail_supplier_mappings_rank
 on public.retail_supplier_mappings(store_id, supplier, times_used desc, last_used_at desc);

alter table public.retail_supplier_mappings enable row level security;
create policy member_read on public.retail_supplier_mappings for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_insert on public.retail_supplier_mappings for insert to authenticated
 with check(retail_private.role_for(store_id) is not null);
create policy member_update on public.retail_supplier_mappings for update to authenticated
 using(retail_private.role_for(store_id) is not null)
 with check(retail_private.role_for(store_id) is not null);
revoke all on public.retail_supplier_mappings from public, anon, authenticated;
grant select, insert, update on public.retail_supplier_mappings to authenticated;

create function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text,
 p_product_id uuid, p_product_name text, p_pack_size integer default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path = '' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode = '42501';
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id, supplier, invoice_text, product_id, product_name, pack_size_detected)
 values (p_store, retail_private.normalize_supplier(p_supplier), btrim(p_invoice_text),
   p_product_id, btrim(p_product_name), p_pack_size)
 on conflict (store_id, supplier, invoice_text) do update set
   product_id = excluded.product_id, product_name = excluded.product_name,
   pack_size_detected = excluded.pack_size_detected,
   times_used = existing.times_used + 1, last_used_at = now()
 returning * into result;
 return result;
end;
$$;

create function public.retail_get_supplier_mappings(p_store uuid, p_supplier text)
returns setof public.retail_supplier_mappings
language plpgsql stable security invoker set search_path = '' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode = '42501';
 end if;
 return query select m.* from public.retail_supplier_mappings m
 where m.store_id = p_store and m.supplier = retail_private.normalize_supplier(p_supplier)
 order by m.times_used desc, m.last_used_at desc, m.id;
end;
$$;
revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer) from public, anon;
revoke all on function public.retail_get_supplier_mappings(uuid,text) from public, anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer) to authenticated;
grant execute on function public.retail_get_supplier_mappings(uuid,text) to authenticated;

commit;
