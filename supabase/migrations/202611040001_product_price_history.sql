-- Historial de costo y precio de venta de un producto, para el panel «Historial de precios».
-- Solo lectura. Junta tres fuentes que ya existen:
--  · retail_audit_log: cambios de precio, costo y ganancia desde 202611020009 (quién y antes/después);
--  · retail_stock_movements: el costo cargado en cada reposición;
--  · retail_sales: el precio cobrado por día, solo para el tiempo anterior al primer cambio registrado,
--    cuando todavía no había registro de actividad.
-- Lo pueden ver quienes editan precios o productos, de a un producto por vez.
begin;

create function public.retail_product_price_history(p_store uuid,p_product uuid,p_from date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare product public.retail_products; zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; first_change timestamptz;
begin
 if not retail_private.has_permission(p_store,'edit_prices') and not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Necesitás permiso para editar precios o productos' using errcode='42501';
 end if;
 select * into product from public.retail_products where store_id=p_store and id=p_product;
 if not found then raise exception 'El producto no está disponible'; end if;
 v_from:=coalesce(p_from::timestamp at time zone zone,'-infinity'::timestamptz);
 select min(at) into first_change from public.retail_audit_log
  where store_id=p_store and entity='Producto' and entity_id=p_product::text and (after ?| array['price','cost','sale_markup']);

 return jsonb_build_object(
  'product',jsonb_build_object('name',product.name,'price',product.price,'cost',product.cost,'sale_markup',product.sale_markup,
   'sellable',product.sellable,'price_pending',product.price_pending),
  'tracked_since',first_change,
  'changes',coalesce((select jsonb_agg(jsonb_build_object('at',a.at,'actor',a.actor_email,'before',a.before,'after',a.after) order by a.at)
   from (select at,actor_email,before,after from public.retail_audit_log
    where store_id=p_store and entity='Producto' and entity_id=p_product::text and at>=v_from and (after ?| array['price','cost','sale_markup'])
    order by at desc limit 1000) a),'[]'::jsonb),
  'restocks',coalesce((select jsonb_agg(jsonb_build_object('at',m.occurred_at,'cost',m.cost,'qty',m.delta,'actor',m.email) order by m.occurred_at)
   from (select sm.occurred_at,sm.cost,sm.delta,u.email from public.retail_stock_movements sm left join auth.users u on u.id=sm.user_id
    where sm.store_id=p_store and sm.product_id=p_product and sm.cost is not null and sm.occurred_at>=v_from
    order by sm.occurred_at desc limit 1000) m),'[]'::jsonb),
  -- El precio más cobrado de cada día (las listas por sucursal pueden dar otros importes el mismo día).
  'sales',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'price',d.price,'qty',d.qty) order by d.day)
   from (select (s.created_at at time zone zone)::date as day,mode() within group (order by (i->>'unitPrice')::numeric) as price,sum((i->>'qty')::numeric) as qty
    from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
    where s.store_id=p_store and s.created_at>=v_from and s.created_at<coalesce(first_change,'infinity'::timestamptz)
     and coalesce(s.return_status,'none')<>'voided' and i->>'productId'=p_product::text and jsonb_typeof(i->'unitPrice')='number'
    group by 1 order by 1 desc limit 400) d),'[]'::jsonb)
 );
end $$;
revoke all on function public.retail_product_price_history(uuid,uuid,date) from public,anon;
grant execute on function public.retail_product_price_history(uuid,uuid,date) to authenticated;

notify pgrst,'reload schema';
commit;
