-- Ajuste masivo por ganancia sobre costo: cada producto recibe su porcentaje nuevo (y opcionalmente su
-- redondeo) y el precio lo recalcula la base. Reemplaza el ajuste de precios a mano en «Ajustar precios».
-- Un producto que cambió de precio en otro dispositivo, sin costo o que ya no se vende se omite y se informa.
begin;

create function public.retail_bulk_update_pricing(p_store uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; product public.retail_products; v_id uuid; v_markup numeric; v_rounding integer;
 updated integer:=0; skipped jsonb:='[]'::jsonb;
begin
 if not retail_private.has_permission(p_store,'edit_prices') then perform retail_private.require_permission(p_store,'manage_products'); end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then
  raise exception 'Ajustá entre 1 y 500 productos por vez';
 end if;
 for item in select value from jsonb_array_elements(p_items) loop
  begin v_id:=(item->>'id')::uuid; exception when others then raise exception 'Producto inválido en el ajuste'; end;
  v_markup:=case when jsonb_typeof(item->'markup')='number' then (item->>'markup')::numeric end;
  if v_markup is null or v_markup not between -99.99 and 10000 or round(v_markup,2)<>v_markup then raise exception 'Revisá la ganancia: debe estar entre -99,99 y 10.000%%, con hasta dos decimales'; end if;
  if item ? 'rounding' then
   v_rounding:=case when jsonb_typeof(item->'rounding')='number' then (item->>'rounding')::integer end;
   if v_rounding is not null and v_rounding not in (0,1,5,10,50,100) then raise exception 'Elegí un redondeo válido'; end if;
  end if;
  select * into product from public.retail_products where store_id=p_store and id=v_id and active for update;
  if not found or not product.sellable then skipped:=skipped||jsonb_build_object('id',v_id,'reason','unavailable'); continue; end if;
  if product.cost<=0 then skipped:=skipped||jsonb_build_object('id',v_id,'reason','no_cost'); continue; end if;
  if jsonb_typeof(item->'expected')<>'number' or product.price<>(item->>'expected')::numeric then
   skipped:=skipped||jsonb_build_object('id',v_id,'reason','changed'); continue;
  end if;
  update public.retail_products set sale_markup=v_markup,
   price_rounding=case when item ? 'rounding' then v_rounding else price_rounding end
  where id=product.id;
  updated:=updated+1;
 end loop;
 return jsonb_build_object('updated',updated,'skipped',skipped);
end $$;
revoke all on function public.retail_bulk_update_pricing(uuid,jsonb) from public,anon;
grant execute on function public.retail_bulk_update_pricing(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
