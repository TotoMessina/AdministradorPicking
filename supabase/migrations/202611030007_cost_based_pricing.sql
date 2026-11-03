-- Precio por costo con redondeo: el comercio define la ganancia por defecto y el redondeo de los precios
-- calculados por porcentaje sobre costo; cada producto puede tener su propio redondeo. El precio manual sigue
-- existiendo y no se redondea. Quien puede editar precios ahora también puede cambiar porcentaje y redondeo.
-- Los comercios existentes quedan sin redondeo para que ningún precio cambie al aplicar esta actualización.
begin;

-- 1. Configuración del comercio y excepción por producto. Pasos: 0 (centavos), $1, $5, $10, $50 o $100, siempre hacia arriba.
alter table public.retail_stores
 add column price_rounding integer not null default 0 check (price_rounding in (0,1,5,10,50,100)),
 add column default_markup numeric(7,2) not null default 30 check (default_markup between 0 and 10000);
alter table public.retail_stores alter column price_rounding set default 10;
alter table public.retail_products add column price_rounding integer check (price_rounding is null or price_rounding in (0,1,5,10,50,100));
grant update(price_rounding) on public.retail_products to authenticated;

create function retail_private.markup_price(p_cost numeric,p_markup numeric,p_step integer) returns numeric
language sql immutable set search_path='' as $$
 select case when coalesce(p_step,0)>0 then ceil(raw/p_step)*p_step else raw end
 from (select greatest(0.01,round(p_cost*(1+p_markup/100),2)) raw) r;
$$;
revoke all on function retail_private.markup_price(numeric,numeric,integer) from public,anon,authenticated;

create function retail_private.product_rounding(p_store uuid,p_override integer) returns integer
language sql stable security definer set search_path='' as $$
 select coalesce(p_override,(select price_rounding from public.retail_stores where id=p_store),0);
$$;
revoke all on function retail_private.product_rounding(uuid,integer) from public,anon,authenticated;

-- 2. Mismo cálculo que 202610270002, con redondeo. Cambiar porcentaje o redondeo alcanza con editar precios.
create or replace function retail_private.derive_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare calculated numeric;
begin
 if (tg_op='INSERT' and (new.sale_markup is not null or new.price_rounding is not null)) or
  (tg_op='UPDATE' and (new.sale_markup is distinct from old.sale_markup or new.price_rounding is distinct from old.price_rounding)) then
  if not retail_private.has_permission(new.store_id,'edit_prices') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
 end if;
 if not new.sellable then new.sale_markup:=null; return new; end if;
 if new.sale_markup is null then return new; end if;
 if new.sale_markup not between -99.99 and 10000 then raise exception 'Revisá el porcentaje sobre costo'; end if;
 if new.cost>0 then calculated:=retail_private.markup_price(new.cost,new.sale_markup,retail_private.product_rounding(new.store_id,new.price_rounding)); end if;
 -- A deliberate manual price edit keeps existing price-only/bulk/import flows.
 -- A cost-only change, or a form sending the calculated price, keeps its percent.
 if tg_op='UPDATE' and new.sale_markup is not distinct from old.sale_markup and new.price_rounding is not distinct from old.price_rounding
  and new.price is distinct from old.price and (calculated is null or new.price<>calculated) then
  new.sale_markup:=null; return new;
 end if;
 if calculated is not null then
  if calculated>9999999999 then raise exception 'El precio calculado supera el límite permitido. Revisá costo y porcentaje'; end if;
  new.price:=calculated;
 end if;
 return new;
end $$;

create or replace function retail_private.check_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.retail_products;
begin
 select * into p from public.retail_products where id=new.id;
 if found and p.sellable and p.sale_markup is not null then
  if p.cost<=0 or p.price<>retail_private.markup_price(p.cost,p.sale_markup,retail_private.product_rounding(p.store_id,p.price_rounding)) then
   raise exception 'Cargá un costo mayor a cero para calcular el precio principal de %',p.name;
  end if;
 end if;
 return null;
end $$;

-- 3. Igual que 202610220006, salvo que porcentaje y redondeo se cuentan como precio, no como ficha.
create or replace function retail_private.guard_product_capabilities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
  return new;
 end if;
 if new.active is distinct from old.active then perform retail_private.require_permission(new.store_id,'delete_products'); end if;
 if new.stock_components is distinct from old.stock_components then perform retail_private.require_permission(new.store_id,'manage_compositions'); end if;
 if (to_jsonb(new)-array['active','stock_components','stock','cost','last_restocked_at','price','sale_markup','price_rounding']) is distinct from
    (to_jsonb(old)-array['active','stock_components','stock','cost','last_restocked_at','price','sale_markup','price_rounding']) and not retail_private.has_permission(new.store_id,'manage_compositions') then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if (new.price is distinct from old.price or new.sale_markup is distinct from old.sale_markup or new.price_rounding is distinct from old.price_rounding)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'edit_prices'); end if;
 if (new.stock is distinct from old.stock or new.cost is distinct from old.cost or new.last_restocked_at is distinct from old.last_restocked_at)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions')
  and not retail_private.has_permission(new.store_id,'review_remitos') then
  -- Checkout consumes stock with the sell permission; the RPC restricts it to
  -- the caller's valid shift and exact cart. REST updates still require product RLS.
  if not retail_private.has_permission(new.store_id,'sell') then perform retail_private.require_permission(new.store_id,'replenish_stock'); end if;
 end if;
 return new;
end $$;

-- 4. Editar el precio por costo: porcentaje y redondeo (null = el del comercio). Devuelve el precio que quedó.
create function public.retail_update_product_pricing(p_store uuid,p_product uuid,p_markup numeric,p_rounding integer,p_expected numeric) returns numeric
language plpgsql security definer set search_path='' as $$
declare product public.retail_products; saved numeric;
begin
 if not retail_private.has_permission(p_store,'edit_prices') then perform retail_private.require_permission(p_store,'manage_products'); end if;
 if p_markup is null or p_markup not between -99.99 and 10000 or round(p_markup,2)<>p_markup then raise exception 'El porcentaje debe estar entre -99,99 y 10.000, con hasta dos decimales'; end if;
 if p_rounding is not null and p_rounding not in (0,1,5,10,50,100) then raise exception 'Elegí un redondeo válido'; end if;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if not product.sellable then raise exception 'Este producto no se vende directamente'; end if;
 if product.cost<=0 then raise exception 'Cargá el costo de % para calcular el precio',product.name; end if;
 if p_expected is null or product.price is distinct from p_expected then raise exception 'El precio cambió en otro dispositivo. Actualizá y revisalo antes de guardar'; end if;
 update public.retail_products set sale_markup=p_markup,price_rounding=p_rounding where id=product.id returning price into saved;
 return saved;
end $$;
revoke all on function public.retail_update_product_pricing(uuid,uuid,numeric,integer,numeric) from public,anon;
grant execute on function public.retail_update_product_pricing(uuid,uuid,numeric,integer,numeric) to authenticated;

-- 5. Ganancia por defecto y redondeo del comercio. Cambiar el redondeo recalcula los precios por costo que
-- usan el del comercio; los manuales y los que tienen su propio redondeo no cambian.
create function public.retail_set_store_pricing(p_store uuid,p_rounding integer,p_default_markup numeric) returns integer
language plpgsql security definer set search_path='' as $$
declare previous integer; repriced integer:=0;
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_rounding is null or p_rounding not in (0,1,5,10,50,100) then raise exception 'Elegí un redondeo válido'; end if;
 if p_default_markup is null or p_default_markup not between 0 and 10000 or round(p_default_markup,2)<>p_default_markup then raise exception 'La ganancia por defecto debe estar entre 0 y 10.000%%, con hasta dos decimales'; end if;
 select price_rounding into previous from public.retail_stores where id=p_store for update;
 if not found then raise exception 'Comercio no disponible'; end if;
 update public.retail_stores set price_rounding=p_rounding,default_markup=p_default_markup where id=p_store;
 if previous is distinct from p_rounding then
  if not retail_private.has_permission(p_store,'edit_prices') then perform retail_private.require_permission(p_store,'manage_products'); end if;
  -- Una actualización sin cambios hace que el cálculo vuelva a correr con el redondeo nuevo.
  update public.retail_products set price=price
  where store_id=p_store and sale_markup is not null and sellable and price_rounding is null and cost>0;
  get diagnostics repriced=row_count;
 end if;
 return repriced;
end $$;
revoke all on function public.retail_set_store_pricing(uuid,integer,numeric) from public,anon;
grant execute on function public.retail_set_store_pricing(uuid,integer,numeric) to authenticated;

-- 6. Alta desde el catálogo global (reemplaza la de 202611030006): además de precio manual acepta
-- porcentaje sobre costo, que necesita costo mayor a cero. Sin ninguno de los dos queda «sin precio».
create or replace function public.retail_add_from_global_catalog(p_store uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 item jsonb; v_code text; v_price numeric; v_cost numeric; v_markup numeric; v_category uuid; fallback uuid; g record; new_id uuid;
 created integer:=0; priced integer:=0; skipped jsonb:='[]'::jsonb;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then
  raise exception 'Elegí entre 1 y 500 productos por vez';
 end if;
 if (select count(distinct btrim(value->>'code')) from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then
  raise exception 'Hay productos repetidos en el pedido';
 end if;
 select id into fallback from public.retail_categories where store_id=p_store and catalog_name='Varios';

 for item in select value from jsonb_array_elements(p_items) loop
  v_code:=btrim(item->>'code');
  select * into g from public.retail_global_catalog where ean_code=v_code;
  if not found then skipped:=skipped||jsonb_build_object('code',v_code,'reason','not_in_catalog'); continue; end if;

  v_price:=case when jsonb_typeof(item->'price')='number' then (item->>'price')::numeric end;
  v_markup:=case when jsonb_typeof(item->'markup')='number' then (item->>'markup')::numeric end;
  v_cost:=case when jsonb_typeof(item->'cost')='number' then (item->>'cost')::numeric else 0 end;
  if v_price is not null and v_markup is not null then raise exception 'Elegí porcentaje o precio manual para %, no los dos',g.name; end if;
  if v_price is not null and (v_price<=0 or v_price>9999999999 or round(v_price,2)<>v_price) then raise exception 'Revisá el precio de %',g.name; end if;
  if v_cost<0 or v_cost>9999999999 or round(v_cost,2)<>v_cost then raise exception 'Revisá el costo de %',g.name; end if;
  if v_markup is not null and (v_markup not between -99.99 and 10000 or round(v_markup,2)<>v_markup) then raise exception 'Revisá el porcentaje de %',g.name; end if;
  if v_markup is not null and v_cost<=0 then raise exception 'Cargá el costo de % para calcular el precio',g.name; end if;

  v_category:=null;
  if item->>'category_id' is not null then
   select id into v_category from public.retail_categories where store_id=p_store and id::text=item->>'category_id';
   if v_category is null then raise exception 'La categoría elegida para % no pertenece a este comercio',g.name; end if;
  end if;
  v_category:=coalesce(v_category,fallback);
  if v_category is null then raise exception 'Falta la categoría Varios en este comercio. Actualizá las categorías'; end if;

  -- Con porcentaje, el precio lo calcula el comercio con su redondeo; 0,01 es solo el valor inicial.
  insert into public.retail_products(store_id,category_id,code,name,price,sale_markup,cost,stock,emoji,brand,sellable,price_pending)
  values(p_store,v_category,v_code,left(btrim(g.name),160),case when v_markup is not null then 0.01 else coalesce(v_price,0) end,v_markup,v_cost,0,
   coalesce(nullif(btrim(g.emoji),''),'📦'),nullif(btrim(g.brand),''),v_price is not null or v_markup is not null,v_price is null and v_markup is null)
  on conflict (store_id,code) do nothing
  returning id into new_id;
  if new_id is null then skipped:=skipped||jsonb_build_object('code',v_code,'reason','exists'); continue; end if;
  created:=created+1;
  if v_price is not null or v_markup is not null then priced:=priced+1; end if;
  new_id:=null;
 end loop;

 return jsonb_build_object('created',created,'priced',priced,'pending',created-priced,'skipped',skipped);
end $$;

notify pgrst,'reload schema';
commit;
