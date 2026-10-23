-- Apply after 202610230001. No stock, selling prices or historical tickets change.
-- Existing products remain sellable. Existing recipes adopt component-derived costs.
begin;
alter table public.retail_products add column sellable boolean not null default true;
alter table public.retail_products drop constraint retail_products_price_check;
alter table public.retail_products add constraint retail_products_price_check
 check(price >= 0 and (not sellable or price > 0));
grant update(sellable) on public.retail_products to authenticated;

create function retail_private.guard_product_usage() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not new.sellable then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
 elsif new.sellable is distinct from old.sellable then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_product_usage() from public,anon,authenticated;
create trigger retail_product_usage before insert or update of sellable on public.retail_products
 for each row execute function retail_private.guard_product_usage();

create function retail_private.derive_composition_cost() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipe_cost numeric; known boolean; component_count integer;
begin
 if jsonb_array_length(new.stock_components)>0 then
  select sum(p.cost*(c->>'quantity')::numeric),bool_and(p.cost>0),count(*)
   into recipe_cost,known,component_count
   from jsonb_array_elements(new.stock_components) c
   join public.retail_products p on p.id=(c->>'product_id')::uuid and p.store_id=new.store_id;
  -- 0 is the existing unknown-cost representation: never report a partial sum as full cost.
  if component_count<>jsonb_array_length(new.stock_components) or not coalesce(known,false) then
   new.cost:=0;
  else
   if recipe_cost>999999999999.99 then raise exception 'El costo del combo supera el límite permitido. Revisá cantidades y costos de sus componentes'; end if;
   new.cost:=round(recipe_cost,2);
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.derive_composition_cost() from public,anon,authenticated;
-- Alphabetical trigger order: authorization/recipe validation, then derived cost, then margin.
-- All updates (including old clients) derive the cost; stale form data cannot overwrite it.
create trigger retail_y_derive_composition_cost before insert or update on public.retail_products
 for each row execute function retail_private.derive_composition_cost();
drop trigger retail_zz_classify_margin on public.retail_products;
create trigger retail_zz_classify_margin before insert or update on public.retail_products
 for each row execute function retail_private.classify_product_margin();

create function retail_private.refresh_dependent_composition_costs() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent_id uuid;
begin
 if new.cost is not distinct from old.cost then return new; end if;
 -- No nested recipes are permitted. Derived writes do not grant any new client capability.
 -- Touch an unchanged price so permission guards see no requested catalog/price change;
 -- the later BEFORE triggers derive cost and margin on the server in this transaction.
 for parent_id in select p.id from public.retail_products p
  where p.store_id=new.store_id and p.stock_components @> jsonb_build_array(jsonb_build_object('product_id',new.id))
  order by p.id
 loop
  update public.retail_products set price=price where id=parent_id and store_id=new.store_id;
 end loop;
 return new;
end $$;
revoke all on function retail_private.refresh_dependent_composition_costs() from public,anon,authenticated;
create trigger retail_refresh_recipe_costs after update on public.retail_products
 for each row when (old.cost is distinct from new.cost)
 execute function retail_private.refresh_dependent_composition_costs();

create function retail_private.reject_ingredient_sales() returns trigger
language plpgsql security definer set search_path='' as $$
declare sold public.retail_products; item jsonb;
begin
 for item in select value from jsonb_array_elements(new.items) loop
  if item->>'productId' is not null then
   select * into sold from public.retail_products
    where id=(item->>'productId')::uuid and store_id=new.store_id for share;
   if found and not sold.sellable then
    raise exception '% es solo un insumo. Retiralo de la venta y actualizá el catálogo',sold.name;
   end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function retail_private.reject_ingredient_sales() from public,anon,authenticated;
-- A rejected checkout rolls back all stock updates. Recipes can still consume ingredients.
create trigger retail_reject_ingredient_sales before insert on public.retail_sales
 for each row execute function retail_private.reject_ingredient_sales();

-- Refresh only current recipe costs/margin; physical units, price and ticket snapshots stay intact.
update public.retail_products set price=price where jsonb_array_length(stock_components)>0;
notify pgrst,'reload schema';
commit;
