-- Automatic product classification; price, cost, stock and sales stay unchanged.
-- Apply after 202610220006. The default is 10% gross margin on base sale price.
begin;
alter table public.retail_stores add column low_margin_threshold numeric(5,2) not null default 10
 check(low_margin_threshold between 0 and 100);

create function retail_private.product_margin_group(p_price numeric,p_cost numeric,p_threshold numeric) returns text
language sql immutable set search_path='' as $$
 select case when p_price>0 and p_cost>0 and (p_price-p_cost)*100<p_price*p_threshold then 'low_margin' else 'standard' end;
$$;
revoke all on function retail_private.product_margin_group(numeric,numeric,numeric) from public,anon,authenticated;

create function retail_private.classify_product_margin() returns trigger
language plpgsql security definer set search_path='' as $$
declare threshold numeric;
begin
 -- Price/cost writers serialize with threshold changes; register assignments
 -- and all existing permission checks remain in force.
 select low_margin_threshold into threshold from public.retail_stores where id=new.store_id for share;
 if threshold is null then raise exception 'Comercio no disponible para calcular el margen'; end if;
 new.margin_group:=retail_private.product_margin_group(new.price,new.cost,threshold);
 return new;
end $$;
revoke all on function retail_private.classify_product_margin() from public,anon,authenticated;
-- Run AFTER the existing BEFORE permission/validation triggers. Only the server
-- derives this field, so editing a price does not require full product access.
create trigger retail_zz_classify_margin before insert or update of price,cost,margin_group on public.retail_products
 for each row execute function retail_private.classify_product_margin();

create function public.retail_set_margin_threshold(p_store uuid,p_threshold numeric,p_expected numeric) returns numeric
language plpgsql security definer set search_path='' as $$
declare previous numeric; normalized numeric;
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_threshold is null or p_threshold::text in ('NaN','Infinity','-Infinity') or p_threshold<0 or p_threshold>100 then raise exception 'Usá un porcentaje entre 0 y 100, con hasta dos decimales'; end if;
 normalized:=round(p_threshold,2);
 if normalized<>p_threshold then raise exception 'Usá hasta dos decimales para el límite'; end if;
 -- Threshold writers serialize before taking any row locks. Lock products in
 -- the same UUID order as price/restock RPCs, then lock the store (not reversed).
 perform pg_advisory_xact_lock(hashtextextended('retail-margin:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select low_margin_threshold into previous from public.retail_stores where id=p_store for update;
 if not found then raise exception 'Comercio no disponible'; end if;
 if previous=normalized then return normalized; end if;
 if p_expected is null or previous<>p_expected then raise exception 'Otra persona cambió el límite. Actualizá los datos y revisá el porcentaje antes de guardar'; end if;
 update public.retail_stores set low_margin_threshold=normalized where id=p_store;
 -- Same value: never alter prices. The last BEFORE trigger derives the group,
 -- without demanding product-edit permission from a store-settings delegate.
 update public.retail_products set price=price where store_id=p_store;
 return normalized;
end $$;
revoke all on function public.retail_set_margin_threshold(uuid,numeric,numeric) from public,anon;
grant execute on function public.retail_set_margin_threshold(uuid,numeric,numeric) to authenticated;
-- No UPDATE grant for the threshold column: writes must use the checked RPC.

-- Reclassify current products, including inactive ones, without touching sales.
update public.retail_products set price=price;
notify pgrst,'reload schema';
commit;
