begin;

-- Costo final: nueva regla de proveedor "price_basis" ('auto' según el tipo de factura, 'final' si el
-- costo tomado ya incluye IVA e impuestos internos, por ejemplo la columna "Final C/Dto.").
create or replace function retail_private.valid_supplier_invoice_rules(p_rules jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(p_rules)='object'
  and not exists(select 1 from jsonb_object_keys(p_rules) k where k not in ('quantity_unit','amount_includes_vat','merge_repeated_codes','cost_column','price_basis'))
  and coalesce(p_rules->>'quantity_unit','auto') in ('auto','unit')
  and coalesce(jsonb_typeof(p_rules->'amount_includes_vat'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'merge_repeated_codes'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'cost_column'),'string')='string'
  and length(coalesce(p_rules->>'cost_column',''))<=60
  and coalesce(p_rules->>'price_basis','auto') in ('auto','final');
$$;

-- Ajuste explícito de costos existentes (por ejemplo, sumar el IVA a los productos de un proveedor).
-- Todo o nada: si algún costo cambió desde la vista previa, no se modifica ninguno; así reintentar
-- nunca suma el IVA dos veces. Los productos con precio por porcentaje recalculan su precio por el
-- disparador existente.
create function public.retail_adjust_product_costs(p_store uuid,p_changes jsonb) returns integer
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
  raise exception 'El costo cambió en: %. Actualizá la vista previa; no se ajustó ningún producto', left(changed,300) using errcode='40001';
 end if;
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  update public.retail_products set cost=(change->>'cost')::numeric where store_id=p_store and id=(change->>'id')::uuid;
  total:=total+1;
 end loop;
 return total;
end $$;

revoke all on function public.retail_adjust_product_costs(uuid,jsonb) from public,anon;
grant execute on function public.retail_adjust_product_costs(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
