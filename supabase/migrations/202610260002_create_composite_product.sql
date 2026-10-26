-- Create the product and its validated recipe atomically, reusing existing rules.
begin;
create function public.retail_create_composite_product(p_store uuid,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare signature jsonb; previous public.retail_sync_receipts; category uuid;
 label text:=trim(p_data->>'name'); code text:=trim(p_data->>'code'); price numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 perform retail_private.require_permission(p_store,'manage_compositions');
 if p_request is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Revisá los datos del combo'; end if;
 signature:=jsonb_build_object('kind','create_composite','store',p_store,'data',p_data);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_sync_receipts where id=p_request;
 if found then
  if previous.user_id<>auth.uid() or previous.store_id<>p_store or previous.payload<>signature then raise exception 'La solicitud corresponde a otra operación. Revisá el combo antes de guardar'; end if;
  return (previous.result->>'id')::uuid;
 end if;
 if label is null or length(label) not between 1 and 160 or code is null or length(code) not between 1 and 80 then raise exception 'Completá nombre y código del combo'; end if;
 price:=(p_data->>'price')::numeric;
 if price is null or price::text in ('NaN','Infinity','-Infinity') or price not between 0.01 and 9999999999 then raise exception 'Ingresá un precio de venta válido'; end if;
 category:=(p_data->>'categoryId')::uuid;
 if not exists(select 1 from public.retail_categories where id=category and store_id=p_store) then raise exception 'Elegí una categoría del comercio'; end if;
 if jsonb_typeof(p_data->'components') is distinct from 'array' then raise exception 'Elegí los componentes del combo'; end if;
 if jsonb_array_length(p_data->'components') not between 1 and 30 then raise exception 'Elegí entre 1 y 30 componentes'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 -- The existing composition trigger requires an empty recipe on INSERT. Both
 -- statements stay in this transaction: no bare product survives a recipe error.
 insert into public.retail_products(id,store_id,category_id,name,code,price,cost,stock,min_stock,emoji,sellable)
  values(p_request,p_store,category,label,code,price,0,0,4,'📦',true);
 perform public.retail_save_product_composition(p_store,p_request,p_data->'components','[]'::jsonb);
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result)
  values(p_request,auth.uid(),p_store,signature,jsonb_build_object('id',p_request));
 return p_request;
end $$;
revoke all on function public.retail_create_composite_product(uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_create_composite_product(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
