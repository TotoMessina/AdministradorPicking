begin;

-- PostgREST reintenta automáticamente las transacciones que fallan con SQLSTATE 40001
-- (serialization_failure). Estas funciones usaban 40001 para avisar "el dato cambió": el aviso
-- nunca llegaba y la llamada quedaba reintentándose. Se redefinen igual, con el error por defecto (P0001).
-- Mismas firmas, permisos y comportamiento; solo cambia el código del error.

create or replace function public.retail_adjust_product_costs(p_store uuid,p_changes jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare change jsonb; product public.retail_products; next_cost numeric; expected numeric; changed text; total integer:=0;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 2000 then
  raise exception 'Elegí entre 1 y 2.000 productos para ajustar' using errcode='22023';
 end if;
 if (select count(distinct c->>'id') from jsonb_array_elements(p_changes) c)<>jsonb_array_length(p_changes) then
  raise exception 'Hay productos repetidos en el ajuste' using errcode='22023';
 end if;
 -- Mismo orden de bloqueo para ajustes simultáneos.
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  begin
   next_cost:=(change->>'cost')::numeric; expected:=(change->>'expected')::numeric;
  exception when others then raise exception 'Revisá los costos del ajuste' using errcode='22023';
  end;
  if next_cost is null or expected is null or next_cost<0 or round(next_cost,2)<>next_cost or next_cost>999999999999 then
   raise exception 'Revisá los costos del ajuste: montos positivos con hasta dos decimales' using errcode='22023';
  end if;
  select * into product from public.retail_products where store_id=p_store and id=(change->>'id')::uuid for update;
  if not found then raise exception 'Un producto ya no está disponible. Actualizá la vista previa'; end if;
  -- Los combos calculan su costo desde los componentes: no se ajustan directamente.
  if jsonb_array_length(coalesce(product.stock_components,'[]'::jsonb))>0 then
   raise exception '% es un combo: su costo sale de sus componentes', product.name using errcode='22023';
  end if;
  if product.cost<>expected then changed:=coalesce(changed||', ','')||product.name; end if;
 end loop;
 if changed is not null then
  raise exception 'El costo cambió en: %. Actualizá la vista previa; no se ajustó ningún producto', left(changed,300);
 end if;
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  update public.retail_products set cost=(change->>'cost')::numeric where store_id=p_store and id=(change->>'id')::uuid;
  total:=total+1;
 end loop;
 return total;
end $$;

create or replace function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null,
 p_cuit text default null, p_rules jsonb default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text; clean_cuit text;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 clean_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' or length(clean_name)>120 then raise exception 'Ingresá el nombre del proveedor (hasta 120 caracteres)' using errcode='22023'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount>=100 then
   raise exception 'El descuento debe ser un porcentaje desde 0 y menor a 100' using errcode='22023';
 end if;
 if round(p_discount,2)<>p_discount then raise exception 'Usá hasta dos decimales para el descuento' using errcode='22023'; end if;
 clean_notes:=nullif(btrim(coalesce(p_notes,'')),'');
 if length(clean_notes)>300 then raise exception 'Las notas admiten hasta 300 caracteres' using errcode='22023'; end if;
 clean_cuit:=nullif(regexp_replace(coalesce(p_cuit,''),'[^0-9]','','g'),'');
 if clean_cuit is not null and not retail_private.valid_cuit(clean_cuit) then
   raise exception 'El CUIT no es válido. Revisá los 11 números' using errcode='22023';
 end if;
 if p_rules is not null and not retail_private.valid_supplier_invoice_rules(p_rules) then
   raise exception 'Las reglas de lectura de facturas no son válidas' using errcode='22023';
 end if;
 if exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.supplier_key=clean_key and s.id is distinct from p_id) then
   raise exception 'Ya existe un proveedor con ese nombre en el comercio' using errcode='23505';
 end if;
 if clean_cuit is not null and exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.cuit=clean_cuit and s.id is distinct from p_id) then
   raise exception 'Ese CUIT ya pertenece a otro proveedor del comercio' using errcode='23505';
 end if;
 if p_id is null then
   insert into public.retail_suppliers(store_id,name,supplier_key,discount_percent,notes,cuit,invoice_rules)
   values(p_store,clean_name,clean_key,p_discount,clean_notes,clean_cuit,coalesce(p_rules,'{}'::jsonb))
   returning * into result;
   return result;
 end if;
 update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
   notes=clean_notes,
   cuit=case when p_cuit is null then s.cuit else clean_cuit end,
   invoice_rules=coalesce(p_rules,s.invoice_rules),
   revision=s.revision+1,updated_at=now()
 where s.id=p_id and s.store_id=p_store and s.revision=p_expected
 returning * into result;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar'; end if;
 return result;
end $$;

create or replace function public.retail_delete_supplier(p_store uuid, p_id uuid, p_expected integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 -- Products and alias memory keep their supplier text; only the discount record is removed.
 delete from public.retail_suppliers where id=p_id and store_id=p_store and revision=p_expected;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de eliminar'; end if;
end $$;

notify pgrst,'reload schema';
commit;
