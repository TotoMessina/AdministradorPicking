begin;

-- Ficha fiscal del proveedor: CUIT para reconocer sus facturas y reglas de lectura.
-- No cambia costos, stock ni descuentos existentes.
create function retail_private.valid_cuit(p_cuit text) returns boolean
language plpgsql immutable set search_path='' as $$
declare total integer:=0; weights integer[]:=array[5,4,3,2,7,6,5,4,3,2]; check_digit integer;
begin
 if p_cuit is null or p_cuit !~ '^[0-9]{11}$' then return false; end if;
 for i in 1..10 loop total:=total+substr(p_cuit,i,1)::integer*weights[i]; end loop;
 check_digit:=11-total%11;
 if check_digit=11 then check_digit:=0; end if;
 return check_digit<10 and check_digit=substr(p_cuit,11,1)::integer;
end $$;

create function retail_private.valid_supplier_invoice_rules(p_rules jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(p_rules)='object'
  and not exists(select 1 from jsonb_object_keys(p_rules) k where k not in ('quantity_unit','amount_includes_vat','merge_repeated_codes','cost_column'))
  and coalesce(p_rules->>'quantity_unit','auto') in ('auto','unit')
  and coalesce(jsonb_typeof(p_rules->'amount_includes_vat'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'merge_repeated_codes'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'cost_column'),'string')='string'
  and length(coalesce(p_rules->>'cost_column',''))<=60;
$$;

alter table public.retail_suppliers
 add column cuit text check(cuit is null or retail_private.valid_cuit(cuit)),
 add column invoice_rules jsonb not null default '{}'::jsonb check(retail_private.valid_supplier_invoice_rules(invoice_rules));
create unique index retail_suppliers_cuit on public.retail_suppliers(store_id,cuit) where cuit is not null;

-- Misma firma ampliada. Sin p_cuit/p_rules (clientes anteriores) se conservan los valores guardados;
-- p_cuit '' quita el CUIT.
drop function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer);
create function public.retail_save_supplier(
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
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar' using errcode='40001'; end if;
 return result;
end $$;

-- Las restricciones de la tabla usan estas funciones: mismo criterio que normalize_supplier.
revoke all on function retail_private.valid_cuit(text) from public;
revoke all on function retail_private.valid_supplier_invoice_rules(jsonb) from public;
grant execute on function retail_private.valid_cuit(text) to authenticated;
grant execute on function retail_private.valid_supplier_invoice_rules(jsonb) to authenticated;
revoke all on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb) from public,anon;
grant execute on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
