-- Keyboard payments, branch shortcuts and idempotent offline operations.
begin;
alter table public.retail_sales drop constraint retail_sales_payment_method_check;
alter table public.retail_sales add check(payment_method in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito'));
alter table public.retail_sales add column payments jsonb, add column cash_amount numeric(14,2), add column recorded_at timestamptz not null default now();
update public.retail_sales set payments=jsonb_build_array(jsonb_build_object('method',payment_method,'amount',total)),cash_amount=case when payment_method='Efectivo' then total else 0 end;
alter table public.retail_sales alter column payments set not null,alter column cash_amount set not null;
alter table public.retail_sales add check(cash_amount>=0 and cash_amount<=total);
alter table public.retail_movements add column recorded_at timestamptz not null default now();
drop function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid);
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric; v_parts jsonb; v_cash numeric; v_sum numeric; v_methods integer;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id <> p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and
  ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   v_expected := p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected := coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := v_expected; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 v_parts := coalesce(p_payments,jsonb_build_array(jsonb_build_object('method',p_method,'amount',v_total)));
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

create or replace function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 select s.opening_cash+coalesce((select sum(cash_amount) from public.retail_sales where shift_id=s.id),0)
 +coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0) into v_expected;
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

create or replace function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 select s.opening_cash
  + coalesce((select sum(cash_amount) from public.retail_sales where shift_id=s.id),0)
  + coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0)
 into v_expected;
 return v_expected;
end $$;


notify pgrst,'reload schema';
commit;
