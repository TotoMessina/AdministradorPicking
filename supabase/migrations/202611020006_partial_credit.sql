begin;
-- Fiado parcial: un pago Mixto puede llevar una parte «Fiado», por ejemplo $500 en efectivo y el resto fiado.
-- En una sola transacción el efectivo queda en la venta (y en la caja) y solo la parte fiada va a la cuenta del cliente.

create or replace function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null,p_customer uuid default null,p_over_limit boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_store uuid; v_customer public.retail_customers; v_sale public.retail_sales; v_balance numeric; saved uuid;
 v_credit numeric:=0; v_core_parts jsonb; v_placeholder text; v_core_method text; v_core_paid numeric;
begin
 if p_method='Mixto' and jsonb_typeof(p_payments)='array' then
  select coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Fiado'),0) into v_credit
  from jsonb_array_elements(p_payments) x where coalesce(x->>'amount','')~'^[0-9]+(\.[0-9]{1,2})?$';
  if exists(select 1 from jsonb_array_elements(p_payments) x where x->>'method'='Fiado') and v_credit<=0 then raise exception 'Revisá el importe fiado'; end if;
 end if;
 if p_method is distinct from 'Fiado' and v_credit=0 then
  if p_customer is not null then raise exception 'El cliente se elige solo para ventas fiadas'; end if;
  return public.retail_checkout_before_credit(p_shift,p_request,p_method,p_paid,p_items,p_price_list,p_ledger,p_payments);
 end if;
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 if p_customer is null then raise exception 'Elegí a quién le fiás'; end if;
 select store_id into v_store from public.retail_shifts where id=p_shift;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=v_store for update;
 if not found or not v_customer.active then raise exception 'Cliente no disponible'; end if;
 if not retail_private.can_use_customers(v_store) then raise exception 'Tu perfil no permite fiar' using errcode='42501'; end if;
 -- El cobro existente valida la venta con la parte fiada como un medio sin efectivo que no esté ya en uso.
 if p_method='Fiado' then
  v_core_method:='Transferencia'; v_core_paid:=0; v_core_parts:=null;
 else
  select m into v_placeholder from unnest(array['Transferencia','QR','Debito','Credito']) m
   where not exists(select 1 from jsonb_array_elements(p_payments) x where x->>'method'=m) limit 1;
  if v_placeholder is null then raise exception 'Demasiados medios de pago en la misma venta'; end if;
  select jsonb_agg(case when x->>'method'='Fiado' then jsonb_set(x,'{method}',to_jsonb(v_placeholder)) else x end) into v_core_parts from jsonb_array_elements(p_payments) x;
  v_core_method:='Mixto'; v_core_paid:=p_paid;
 end if;
 select * into v_sale from public.retail_sales where id=p_request;
 if found then
  if v_sale.customer_id is distinct from p_customer then raise exception 'La solicitud ya fue usada con otro cliente'; end if;
  return v_sale.id;
 end if;
 saved:=public.retail_checkout_before_credit(p_shift,p_request,v_core_method,v_core_paid,p_items,p_price_list,p_ledger,v_core_parts);
 select * into v_sale from public.retail_sales where id=saved for update;
 if p_method='Fiado' then v_credit:=v_sale.total; end if;
 v_balance:=retail_private.customer_balance(p_customer);
 if v_customer.credit_limit is not null and v_balance+v_credit>v_customer.credit_limit then
  if not p_over_limit then
   raise exception 'Con esta venta % debería %, más que su límite de %',v_customer.name,v_balance+v_credit,v_customer.credit_limit;
  end if;
  if not retail_private.can_manage_customers(v_store) then
   raise exception 'Supera el límite de % y tu perfil no permite fiar por encima. Pedile a administración',v_customer.name using errcode='42501';
  end if;
 end if;
 if p_method='Fiado' then
  update public.retail_sales set payment_method='Fiado',payments=jsonb_build_array(jsonb_build_object('method','Fiado','amount',total)),
   amount_paid=total,change=0,cash_amount=0,customer_id=p_customer,customer_name=v_customer.name where id=saved;
 else
  -- El efectivo ya quedó en cash_amount; se devuelve el desglose real con su parte fiada.
  update public.retail_sales set payments=p_payments,customer_id=p_customer,customer_name=v_customer.name where id=saved;
 end if;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,created_by,actor_email)
 values(saved,v_store,p_customer,'sale',v_credit,saved,auth.uid(),auth.jwt()->>'email');
 return saved;
end $$;

-- Anular una venta con fiado parcial repite su desglose: el efectivo sale de la caja y lo fiado se descuenta de la cuenta.
create or replace function public.retail_return_sale(p_store uuid,p_sale uuid,p_request uuid,p_items jsonb,p_reason text,p_refund jsonb default null,p_shift uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_parts jsonb:=p_refund; v_core jsonb; v_credit numeric; v_result jsonb; v_placeholder text;
begin
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store;
 if not found or v_sale.customer_id is null then
  if exists(select 1 from jsonb_array_elements(coalesce(p_refund,'[]'::jsonb)) x where x->>'method'='Fiado') then raise exception 'Solo una venta fiada se devuelve a cuenta del cliente'; end if;
  return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift);
 end if;
 if v_parts is null and p_items is null and v_sale.returned_total=0 then v_parts:=v_sale.payments; end if;
 if v_parts is null then return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift); end if;
 select coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Fiado'),0) into v_credit from jsonb_array_elements(v_parts) x;
 select m into v_placeholder from unnest(array['Transferencia','QR','Debito','Credito']) m
  where not exists(select 1 from jsonb_array_elements(v_parts) x where x->>'method'=m) limit 1;
 if v_credit>0 and v_placeholder is null then raise exception 'Demasiados medios de devolución'; end if;
 select coalesce(jsonb_agg(case when x->>'method'='Fiado' then jsonb_set(x,'{method}',to_jsonb(v_placeholder)) else x end),'[]'::jsonb) into v_core from jsonb_array_elements(v_parts) x;
 v_result:=public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,v_core,p_shift);
 if v_credit>0 then
  update public.retail_sale_returns set payments=v_parts where id=p_request and payments is distinct from v_parts;
  insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,return_id,created_by,actor_email)
  values(p_request,p_store,v_sale.customer_id,'return',-v_credit,p_sale,p_request,auth.uid(),auth.jwt()->>'email') on conflict(id) do nothing;
 end if;
 return v_result;
end $$;

notify pgrst,'reload schema';
commit;
