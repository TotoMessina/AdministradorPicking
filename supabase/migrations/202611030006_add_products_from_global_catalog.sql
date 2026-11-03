-- Alta de productos del comercio desde el catálogo global, por marca, categoría o las dos.
-- Siempre con stock 0. Con precio quedan a la venta; sin precio se crean «sin precio»: no se venden
-- hasta cargarlo, y la marca se borra sola cuando el producto pasa a la venta con su precio.
begin;

-- 1. Sin precio: no a la venta y precio 0. Es distinto de un insumo, que tampoco se vende pero no espera precio.
alter table public.retail_products add column price_pending boolean not null default false;
alter table public.retail_products add constraint retail_products_price_pending check (not price_pending or (not sellable and price=0));

create function retail_private.clear_price_pending() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.sellable then new.price_pending:=false; end if;
 return new;
end $$;
revoke all on function retail_private.clear_price_pending() from public,anon,authenticated;
create trigger retail_clear_price_pending before insert or update of sellable,price_pending on public.retail_products
 for each row execute function retail_private.clear_price_pending();
-- La ficha la apaga al guardar el producto como insumo: ya no espera precio.
grant update(price_pending) on public.retail_products to authenticated;

-- 2. Marcas y categorías del catálogo global, sin distinguir mayúsculas ni espacios.
-- Con una marca elegida, las categorías se cuentan dentro de esa marca, y al revés.
create function public.retail_global_catalog_facets(p_brand text default null,p_category text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 with base as (
  select nullif(btrim(brand),'') brand,nullif(btrim(category_suggestion),'') category from public.retail_global_catalog
 )
 select jsonb_build_object(
  'brands',coalesce((select jsonb_agg(jsonb_build_object('name',name,'count',total) order by lower(name))
   from (select mode() within group (order by brand) name,count(*) total from base
    where brand is not null and (nullif(btrim(p_category),'') is null or lower(category)=lower(btrim(p_category))) group by lower(brand)) b),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(jsonb_build_object('name',name,'count',total) order by lower(name))
   from (select mode() within group (order by category) name,count(*) total from base
    where category is not null and (nullif(btrim(p_brand),'') is null or lower(brand)=lower(btrim(p_brand))) group by lower(category)) c),'[]'::jsonb));
$$;
revoke all on function public.retail_global_catalog_facets(text,text) from public,anon;
grant execute on function public.retail_global_catalog_facets(text,text) to authenticated;

-- 3. Productos del catálogo global para una marca, una categoría o las dos (hasta 1.000).
create function public.retail_global_catalog_matches(p_brand text,p_category text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_brand text:=nullif(btrim(p_brand),''); v_category text:=nullif(btrim(p_category),''); total integer;
begin
 if v_brand is null and v_category is null then raise exception 'Elegí una marca, una categoría o las dos'; end if;
 select count(*) into total from public.retail_global_catalog
  where (v_brand is null or lower(btrim(brand))=lower(v_brand)) and (v_category is null or lower(btrim(category_suggestion))=lower(v_category));
 return jsonb_build_object('total',total,'items',coalesce((select jsonb_agg(to_jsonb(g) order by lower(g.name),g.ean_code) from (
  select ean_code,name,brand,category_suggestion,emoji,source,confidence_score from public.retail_global_catalog
  where (v_brand is null or lower(btrim(brand))=lower(v_brand)) and (v_category is null or lower(btrim(category_suggestion))=lower(v_category))
  order by lower(name),ean_code limit 1000) g),'[]'::jsonb));
end $$;
revoke all on function public.retail_global_catalog_matches(text,text) from public,anon;
grant execute on function public.retail_global_catalog_matches(text,text) to authenticated;

-- 4. Alta en bloque. Nombre, marca y emoji salen del catálogo global, no del pedido.
-- Un código que el comercio ya tiene (activo o archivado) se omite, así repetir el pedido no duplica.
create function public.retail_add_from_global_catalog(p_store uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 item jsonb; v_code text; v_price numeric; v_cost numeric; v_category uuid; fallback uuid; g record; new_id uuid;
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
  v_cost:=case when jsonb_typeof(item->'cost')='number' then (item->>'cost')::numeric else 0 end;
  if v_price is not null and (v_price<=0 or v_price>9999999999 or round(v_price,2)<>v_price) then raise exception 'Revisá el precio de %',g.name; end if;
  if v_cost<0 or v_cost>9999999999 or round(v_cost,2)<>v_cost then raise exception 'Revisá el costo de %',g.name; end if;

  v_category:=null;
  if item->>'category_id' is not null then
   select id into v_category from public.retail_categories where store_id=p_store and id::text=item->>'category_id';
   if v_category is null then raise exception 'La categoría elegida para % no pertenece a este comercio',g.name; end if;
  end if;
  v_category:=coalesce(v_category,fallback);
  if v_category is null then raise exception 'Falta la categoría Varios en este comercio. Actualizá las categorías'; end if;

  insert into public.retail_products(store_id,category_id,code,name,price,cost,stock,emoji,brand,sellable,price_pending)
  values(p_store,v_category,v_code,left(btrim(g.name),160),coalesce(v_price,0),v_cost,0,coalesce(nullif(btrim(g.emoji),''),'📦'),nullif(btrim(g.brand),''),
   v_price is not null,v_price is null)
  on conflict (store_id,code) do nothing
  returning id into new_id;
  if new_id is null then skipped:=skipped||jsonb_build_object('code',v_code,'reason','exists'); continue; end if;
  created:=created+1;
  if v_price is not null then priced:=priced+1; end if;
  new_id:=null;
 end loop;

 return jsonb_build_object('created',created,'priced',priced,'pending',created-priced,'skipped',skipped);
end $$;
revoke all on function public.retail_add_from_global_catalog(uuid,jsonb) from public,anon;
grant execute on function public.retail_add_from_global_catalog(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
