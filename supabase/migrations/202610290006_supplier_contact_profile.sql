begin;

-- Ficha completa del proveedor (cuenta corriente, etapa A): datos fiscales, contacto y condiciones de pago.
-- Todos opcionales. No cambia descuentos, costos, comprobantes ni reglas de lectura.
create function retail_private.valid_cbu(p_cbu text) returns boolean
language plpgsql immutable set search_path='' as $$
declare first_weights integer[]:=array[7,1,3,9,7,1,3]; second_weights integer[]:=array[3,9,7,1,3,9,7,1,3,9,7,1,3];
 total integer:=0; digit integer;
begin
 if p_cbu is null or p_cbu !~ '^[0-9]{22}$' then return false; end if;
 for i in 1..7 loop total:=total+substr(p_cbu,i,1)::integer*first_weights[i]; end loop;
 digit:=(10-total%10)%10;
 if digit<>substr(p_cbu,8,1)::integer then return false; end if;
 total:=0;
 for i in 1..13 loop total:=total+substr(p_cbu,8+i,1)::integer*second_weights[i]; end loop;
 digit:=(10-total%10)%10;
 return digit=substr(p_cbu,22,1)::integer;
end $$;
revoke all on function retail_private.valid_cbu(text) from public;
grant execute on function retail_private.valid_cbu(text) to authenticated;

alter table public.retail_suppliers
 add column legal_name text check(legal_name is null or length(legal_name) between 1 and 160),
 add column vat_condition text check(vat_condition in ('RI','MO','EX')),
 add column fiscal_address text check(fiscal_address is null or length(fiscal_address) between 1 and 300),
 add column commercial_address text check(commercial_address is null or length(commercial_address) between 1 and 300),
 add column phone text check(phone is null or length(phone) between 1 and 40),
 add column email text check(email is null or (length(email)<=160 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
 add column bank_cbu text check(bank_cbu is null or retail_private.valid_cbu(bank_cbu)),
 add column bank_alias text check(bank_alias is null or bank_alias ~ '^[A-Za-z0-9.-]{6,20}$'),
 add column payment_terms text check(payment_terms is null or length(payment_terms) between 1 and 300),
 add column payment_days smallint check(payment_days between 0 and 365),
 add column collections_contact text check(collections_contact is null or length(collections_contact) between 1 and 160),
 add column purchasing_contact text check(purchasing_contact is null or length(purchasing_contact) between 1 and 160);

-- Misma función con p_profile. Sin p_profile (clientes anteriores) se conserva la ficha guardada;
-- con p_profile se reemplazan todos sus campos (los ausentes quedan vacíos).
drop function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb);
create function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null,
 p_cuit text default null, p_rules jsonb default null, p_profile jsonb default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text; clean_cuit text;
 profile public.retail_suppliers; clean_cbu text;
 fields text[]:=array['legal_name','vat_condition','fiscal_address','commercial_address','phone','email','bank_cbu','bank_alias','payment_terms','payment_days','collections_contact','purchasing_contact'];
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
 if p_profile is not null then
  if jsonb_typeof(p_profile)<>'object' or exists(select 1 from jsonb_object_keys(p_profile) k where k<>all(fields)) then
   raise exception 'Datos de la ficha del proveedor no válidos' using errcode='22023';
  end if;
  begin
   profile:=jsonb_populate_record(null::public.retail_suppliers,p_profile);
  exception when others then raise exception 'Revisá el plazo de pago: días enteros de 0 a 365' using errcode='22023';
  end;
  clean_cbu:=nullif(regexp_replace(coalesce(profile.bank_cbu,''),'[^0-9]','','g'),'');
  if clean_cbu is not null and not retail_private.valid_cbu(clean_cbu) then
   raise exception 'El CBU no es válido. Revisá los 22 números' using errcode='22023';
  end if;
  if nullif(btrim(coalesce(profile.bank_alias,'')),'') is not null and btrim(profile.bank_alias) !~ '^[A-Za-z0-9.-]{6,20}$' then
   raise exception 'El alias debe tener de 6 a 20 letras, números, puntos o guiones' using errcode='22023';
  end if;
  if nullif(btrim(coalesce(profile.email,'')),'') is not null and (length(btrim(profile.email))>160 or btrim(profile.email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
   raise exception 'Revisá el correo de administración' using errcode='22023';
  end if;
  if profile.vat_condition is not null and profile.vat_condition not in ('RI','MO','EX') then
   raise exception 'Elegí una condición frente al IVA válida' using errcode='22023';
  end if;
  if profile.payment_days is not null and profile.payment_days not between 0 and 365 then
   raise exception 'Revisá el plazo de pago: días enteros de 0 a 365' using errcode='22023';
  end if;
  if length(profile.legal_name)>160 or length(profile.fiscal_address)>300 or length(profile.commercial_address)>300 or length(profile.phone)>40
   or length(profile.payment_terms)>300 or length(profile.collections_contact)>160 or length(profile.purchasing_contact)>160 then
   raise exception 'Algún dato de la ficha supera el largo permitido' using errcode='22023';
  end if;
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
 else
   update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
     notes=clean_notes,
     cuit=case when p_cuit is null then s.cuit else clean_cuit end,
     invoice_rules=coalesce(p_rules,s.invoice_rules),
     revision=s.revision+1,updated_at=now()
   where s.id=p_id and s.store_id=p_store and s.revision=p_expected
   returning * into result;
   -- Sin 40001: PostgREST reintentaría la transacción en lugar de devolver el aviso.
   if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar'; end if;
 end if;
 if p_profile is not null then
   update public.retail_suppliers s set
     legal_name=nullif(btrim(coalesce(profile.legal_name,'')),''),
     vat_condition=profile.vat_condition,
     fiscal_address=nullif(btrim(coalesce(profile.fiscal_address,'')),''),
     commercial_address=nullif(btrim(coalesce(profile.commercial_address,'')),''),
     phone=nullif(btrim(coalesce(profile.phone,'')),''),
     email=nullif(lower(btrim(coalesce(profile.email,''))),''),
     bank_cbu=clean_cbu,
     bank_alias=nullif(btrim(coalesce(profile.bank_alias,'')),''),
     payment_terms=nullif(btrim(coalesce(profile.payment_terms,'')),''),
     payment_days=profile.payment_days,
     collections_contact=nullif(btrim(coalesce(profile.collections_contact,'')),''),
     purchasing_contact=nullif(btrim(coalesce(profile.purchasing_contact,'')),'')
   where s.id=result.id
   returning * into result;
 end if;
 return result;
end $$;

revoke all on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb,jsonb) from public,anon;
grant execute on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
