-- Fixed recipes and sale presentations share physical stock in individual units.
-- Apply after 202610210004. Existing products keep their own stock unchanged.
begin;
alter table public.retail_products add column if not exists stock_components jsonb not null default '[]'::jsonb;
alter table public.retail_products add constraint retail_product_components_array
 check(jsonb_typeof(stock_components)='array' and jsonb_array_length(stock_components)<=30);

-- No UPDATE privilege is granted for this column: configuration goes through the RPC.
create or replace function retail_private.validate_product_composition() returns trigger
language plpgsql security definer set search_path='' as $$
declare part jsonb; source public.retail_products;
begin
 if tg_op='DELETE' then
  if exists(select 1 from public.retail_stores where id=old.store_id) and exists(
   select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=old.store_id and c->>'product_id'=old.id::text) then
   raise exception 'El producto es componente de otro producto. Desvinculalo antes de eliminarlo';
  end if;
  return old;
 end if;
 if jsonb_typeof(new.stock_components) is distinct from 'array' or jsonb_array_length(new.stock_components)>30 then raise exception 'Composición inválida'; end if;
 if tg_op='INSERT' and jsonb_array_length(new.stock_components)>0 then raise exception 'Creá el producto sin stock y luego configurá su composición'; end if;
 if jsonb_array_length(new.stock_components)>0 then
  if new.stock<>0 then raise exception 'Reponé los componentes: este producto no tiene stock propio'; end if;
  if (select count(distinct c->>'product_id') from jsonb_array_elements(new.stock_components) c)<>jsonb_array_length(new.stock_components) then raise exception 'No repitas componentes'; end if;
  for part in select value from jsonb_array_elements(new.stock_components) loop
   if coalesce(part->>'quantity','')!~'^[1-9][0-9]{0,6}$' or (part->>'quantity')::integer>1000000 then raise exception 'Ingresá unidades enteras entre 1 y 1000000'; end if;
   select * into source from public.retail_products where store_id=new.store_id and id=(part->>'product_id')::uuid and active;
   if not found or source.id=new.id or jsonb_array_length(source.stock_components)>0 then raise exception 'Elegí componentes activos con stock propio del mismo comercio'; end if;
  end loop;
  if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=new.store_id and p.active and c->>'product_id'=new.id::text) then raise exception 'Este producto ya es componente de otro. No se permiten composiciones anidadas'; end if;
 end if;
 if not new.active and exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=new.store_id and p.active and c->>'product_id'=new.id::text) then raise exception 'Antes de archivar, quitá el producto de las composiciones activas'; end if;
 return new;
end $$;
revoke all on function retail_private.validate_product_composition() from public,anon,authenticated;
create trigger retail_validate_product_composition before insert or update of stock_components,stock,active or delete on public.retail_products
 for each row execute function retail_private.validate_product_composition();

create or replace function public.retail_save_product_composition(p_store uuid,p_product uuid,p_components jsonb,p_expected jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare product public.retail_products; normalized jsonb; previous jsonb;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if retail_private.role_for(p_store) not in ('owner','admin') or retail_private.role_for(p_store) is null then raise exception 'Solo administración puede configurar composiciones'; end if;
 if jsonb_typeof(p_components) is distinct from 'array' or jsonb_array_length(p_components)>30 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Composición inválida'; end if;
 -- Configuration and checkout take this lock BEFORE product locks. No nested recipes.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store and
  (id=p_product or id in(select (c->>'product_id')::uuid from jsonb_array_elements(p_components) c)) order by id for update;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active;
 if not found then raise exception 'Producto no disponible'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',((c->>'product_id')::uuid)::text,'quantity',(c->>'quantity')::integer) order by (c->>'product_id')::uuid),'[]'::jsonb) into normalized from jsonb_array_elements(p_components) c;
 select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into previous from jsonb_array_elements(p_expected) c;
 if product.stock_components=normalized then return; end if;
 if product.stock_components is distinct from previous then raise exception 'La composición cambió en otro dispositivo. Actualizá el catálogo antes de reintentar'; end if;
 if jsonb_array_length(product.stock_components)=0 and product.stock<>0 then raise exception 'El producto tiene stock propio. Creá otro producto con stock 0; no se trasladan existencias automáticamente'; end if;
 update public.retail_products set stock_components=normalized where id=p_product;
end $$;
revoke all on function public.retail_save_product_composition(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.retail_save_product_composition(uuid,uuid,jsonb,jsonb) to authenticated;

-- Replaces only stock consumption in the existing checkout contract. Price-list,
-- ledger, payment, permission and margin-snapshot triggers remain in force.
create or replace function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; p public.retail_products; component public.retail_products; part jsonb; item jsonb; v_qty integer; v_units bigint; v_price numeric; v_name text;
 v_total numeric:=0; v_items jsonb:='[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric; v_parts jsonb; v_cash numeric; v_sum numeric; v_methods integer; v_snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by<>auth.uid() or v_existing.shift_id<>p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id<>p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s:=retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||s.store_id::text,0));
 -- Lock sold SKUs and their physical components together in UUID order.
 perform id from public.retail_products where store_id=s.store_id and id in (
  select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null
  union select (c->>'product_id')::uuid from public.retail_products sold cross join lateral jsonb_array_elements(sold.stock_components) c
   where sold.store_id=s.store_id and sold.id in(select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null)
 ) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty')!~'^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty:=(item->>'qty')::integer; v_snapshot:='[]'::jsonb;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   -- Older clients may sell ordinary products, but must refresh to sell a recipe.
   if jsonb_array_length(p.stock_components)>0 or item ? 'stock_components' then
    if jsonb_typeof(item->'stock_components') is distinct from 'array' then raise exception 'Actualizá la app y el catálogo para vender este combo o presentación'; end if;
    select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into v_snapshot from jsonb_array_elements(item->'stock_components') c;
    if v_snapshot is distinct from p.stock_components then raise exception 'Cambió la composición de %. Actualizá el catálogo y volvé a agregarlo',p.name; end if;
   end if;
   v_expected:=p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected:=coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price:=v_expected; v_name:=p.name;
   if jsonb_array_length(p.stock_components)=0 then
    if p.stock<v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
    update public.retail_products set stock=stock-v_qty where id=p.id;
   else
    for part in select value from jsonb_array_elements(p.stock_components) loop
     select * into component from public.retail_products where id=(part->>'product_id')::uuid and store_id=s.store_id and active;
     if not found or jsonb_array_length(component.stock_components)>0 then raise exception 'Componente no disponible. Revisá la composición de %',p.name; end if;
     v_units:=v_qty::bigint*(part->>'quantity')::bigint;
     if component.stock<v_units then raise exception 'Stock insuficiente de % para vender %',component.name,p.name; end if;
     update public.retail_products set stock=stock-v_units::integer where id=component.id;
    end loop;
   end if;
  else
   v_price:=(item->>'unit_price')::numeric; v_name:=trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price<=0 or v_price>999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price:=round(v_price,2); v_total:=v_total+v_qty*v_price;
  v_items:=v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty,'stockComponents',v_snapshot));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 v_parts:=coalesce(p_payments,jsonb_build_array(jsonb_build_object('method',p_method,'amount',v_total)));
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Desglose de pago inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito') or (x->>'amount') is null or (x->>'amount')::numeric<=0 or (x->>'amount')::numeric::text in ('NaN','Infinity','-Infinity') or round((x->>'amount')::numeric,2)<>(x->>'amount')::numeric) then raise exception 'Importe o medio de pago inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method') into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_total or v_methods<>jsonb_array_length(v_parts) or (p_method='Mixto' and v_methods<2) or (p_method<>'Mixto' and (v_methods<>1 or v_parts->0->>'method'<>p_method)) then raise exception 'El desglose debe coincidir con el total y el medio elegido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name,payments,cash_amount)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name,v_parts,v_cash);
 return p_request;
end $$;
revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
