begin;
-- Datos opcionales para facturarle al cliente y saldo a favor: un cobro puede superar la deuda
-- y lo que sobra queda a cuenta para una próxima compra con «Fiado».

alter table public.retail_customers
 add column business_name text check(business_name is null or length(btrim(business_name)) between 1 and 160),
 add column tax_id_type text check(tax_id_type is null or tax_id_type in ('CUIT','CUIL','DNI')),
 add column tax_id text check(tax_id is null or tax_id ~ '^[0-9]{7,11}$'),
 add column iva_condition text check(iva_condition is null or iva_condition in ('CF','RI','MO','EX')),
 add column address text check(address is null or length(btrim(address)) between 1 and 200),
 add column email text check(email is null or (length(email)<=254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
 add constraint retail_customers_tax_id_pair check((tax_id is null)=(tax_id_type is null)),
 add constraint retail_customers_tax_id_length check(tax_id is null or (tax_id_type='DNI' and length(tax_id) between 7 and 8) or (tax_id_type in ('CUIT','CUIL') and length(tax_id)=11));

create or replace function public.retail_save_customer(p_store uuid,p_id uuid,p_customer jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_name text:=btrim(coalesce(p_customer->>'name','')); v_phone text:=nullif(btrim(coalesce(p_customer->>'phone','')),'');
 v_limit numeric; v_active boolean:=coalesce((p_customer->>'active')::boolean,true);
 v_business text:=nullif(btrim(coalesce(p_customer->>'business_name','')),'');
 v_tax text:=nullif(regexp_replace(coalesce(p_customer->>'tax_id',''),'[^0-9]','','g'),'');
 v_tax_type text:=nullif(btrim(coalesce(p_customer->>'tax_id_type','')),'');
 v_iva text:=nullif(btrim(coalesce(p_customer->>'iva_condition','')),'');
 v_address text:=nullif(btrim(coalesce(p_customer->>'address','')),'');
 v_email text:=nullif(lower(btrim(coalesce(p_customer->>'email',''))),'');
begin
 if not retail_private.can_manage_customers(p_store) then raise exception 'Tu perfil no permite cargar ni editar clientes' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos del cliente incompletos'; end if;
 if length(v_name) not between 1 and 120 then raise exception 'Escribí el nombre del cliente'; end if;
 if v_phone is not null and length(v_phone)>40 then raise exception 'Teléfono demasiado largo'; end if;
 if nullif(p_customer->>'credit_limit','') is not null then
  if (p_customer->>'credit_limit')!~'^[0-9]{1,12}(\.[0-9]{1,2})?$' then raise exception 'Revisá el límite de deuda'; end if;
  v_limit:=(p_customer->>'credit_limit')::numeric;
 end if;
 if v_tax is null then v_tax_type:=null;
 else
  if v_tax_type is null then v_tax_type:=case when length(v_tax)=11 then 'CUIT' else 'DNI' end; end if;
  if v_tax_type not in ('CUIT','CUIL','DNI') or (v_tax_type='DNI' and length(v_tax) not between 7 and 8) or (v_tax_type<>'DNI' and length(v_tax)<>11) then
   raise exception 'Revisá el documento: el CUIT o CUIL lleva 11 números y el DNI 7 u 8';
  end if;
 end if;
 if v_iva is not null and v_iva not in ('CF','RI','MO','EX') then raise exception 'Revisá la condición frente al IVA'; end if;
 if v_business is not null and length(v_business)>160 then raise exception 'Razón social demasiado larga'; end if;
 if v_address is not null and length(v_address)>200 then raise exception 'Domicilio demasiado largo'; end if;
 if v_email is not null and (length(v_email)>254 or v_email!~'^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Revisá el email'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer:'||p_id::text,0));
 if exists(select 1 from public.retail_customers where id=p_id and store_id<>p_store) then raise exception 'El identificador ya corresponde a otro comercio'; end if;
 insert into public.retail_customers(id,store_id,name,phone,credit_limit,active,business_name,tax_id_type,tax_id,iva_condition,address,email,created_by)
 values(p_id,p_store,v_name,v_phone,v_limit,v_active,v_business,v_tax_type,v_tax,v_iva,v_address,v_email,auth.uid())
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,credit_limit=excluded.credit_limit,active=excluded.active,
  business_name=excluded.business_name,tax_id_type=excluded.tax_id_type,tax_id=excluded.tax_id,iva_condition=excluded.iva_condition,
  address=excluded.address,email=excluded.email;
 return p_id;
end $$;

create or replace function public.retail_customer_balances(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite ver clientes' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'credit_limit',c.credit_limit,'active',c.active,
   'business_name',c.business_name,'tax_id_type',c.tax_id_type,'tax_id',c.tax_id,'iva_condition',c.iva_condition,'address',c.address,'email',c.email,
   'balance',coalesce(m.balance,0),'last_movement',m.last_at) order by coalesce(m.balance,0) desc,lower(c.name)),'[]'::jsonb)
  from public.retail_customers c
  left join (select customer_id,sum(amount) as balance,max(created_at) as last_at from public.retail_customer_movements where store_id=p_store group by customer_id) m on m.customer_id=c.id
  where c.store_id=p_store);
end $$;

-- Un cobro puede superar la deuda: lo que sobra queda a favor del cliente.
create or replace function public.retail_customer_payment(p_store uuid,p_customer uuid,p_request uuid,p_amount numeric,p_method text,p_shift uuid default null,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_customer public.retail_customers; v_existing public.retail_customer_movements; v_balance numeric; v_shift public.retail_shifts;
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite registrar cobros' using errcode='42501'; end if;
 if p_request is null or p_customer is null then raise exception 'Datos del cobro incompletos'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer-payment:'||p_request::text,0));
 select * into v_existing from public.retail_customer_movements where id=p_request;
 if found then
  if v_existing.customer_id<>p_customer or v_existing.created_by<>auth.uid() then raise exception 'El identificador ya corresponde a otro movimiento'; end if;
  return jsonb_build_object('id',p_request,'balance',retail_private.customer_balance(p_customer));
 end if;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=p_store for update;
 if not found then raise exception 'Cliente no disponible'; end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Debito','Credito') then raise exception 'Elegí cómo te pagó'; end if;
 if p_amount is null or p_amount<=0 or p_amount>999999999999.99 or round(p_amount,2)<>p_amount or p_amount::text='NaN' then raise exception 'Revisá el importe cobrado'; end if;
 v_balance:=retail_private.customer_balance(p_customer);
 if p_method='Efectivo' then
  if p_shift is null then raise exception 'Abrí tu caja para cobrar en efectivo, o elegí otro medio'; end if;
  v_shift:=retail_private.check_shift(p_shift);
  if v_shift.store_id<>p_store then raise exception 'La caja no pertenece a este comercio'; end if;
 end if;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,method,shift_id,note,created_by,actor_email)
 values(p_request,p_store,p_customer,'payment',-p_amount,p_method,case when p_method='Efectivo' then v_shift.id end,
  nullif(btrim(coalesce(p_note,'')),''),auth.uid(),auth.jwt()->>'email');
 return jsonb_build_object('id',p_request,'balance',v_balance-p_amount);
end $$;

notify pgrst,'reload schema';
commit;
