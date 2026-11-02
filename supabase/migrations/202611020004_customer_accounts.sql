begin;
-- Clientes y cuenta corriente. Una venta «Fiado» suma deuda al cliente y no suma efectivo a la caja;
-- el efectivo entra a la caja cuando se registra el cobro. Ganancias cuenta la venta cuando se hace.

-- Nuevo permiso: crear y editar clientes y fiar por encima del límite. No se asigna automáticamente.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales','manage_customers']::text[]);
alter table public.retail_role_permissions drop constraint retail_role_permissions_permissions_check;
alter table public.retail_role_permissions add constraint retail_role_permissions_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales','manage_customers']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales','manage_customers']::text[]) action where retail_private.has_permission(p_store,action);
$$;

create function retail_private.can_manage_customers(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false) or retail_private.has_permission(p_store,'manage_customers');
$$;
-- Quien cobra necesita ver a quién le fía y cuánto debe.
create function retail_private.can_use_customers(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select retail_private.can_manage_customers(p_store) or retail_private.has_permission(p_store,'sell');
$$;
revoke all on function retail_private.can_manage_customers(uuid),retail_private.can_use_customers(uuid) from public,anon;
grant execute on function retail_private.can_manage_customers(uuid),retail_private.can_use_customers(uuid) to authenticated;

create table public.retail_customers (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 120),
 phone text check(phone is null or length(btrim(phone)) between 1 and 40),
 credit_limit numeric(14,2) check(credit_limit is null or (credit_limit>=0 and credit_limit::text<>'NaN')),
 active boolean not null default true,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(store_id,id)
);
create index retail_customers_name on public.retail_customers(store_id,lower(name));

create table public.retail_customer_movements (
 id uuid primary key, store_id uuid not null, customer_id uuid not null,
 kind text not null check(kind in ('sale','payment','return')),
 -- Positivo: el cliente debe más. Negativo: pagó o se le descontó una devolución.
 amount numeric(14,2) not null check(amount<>0 and amount::text<>'NaN'),
 method text check(method is null or method in ('Efectivo','QR','Transferencia','Debito','Credito')),
 sale_id uuid, return_id uuid, shift_id uuid, note text check(note is null or length(note)<=300),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 check((kind='payment')=(method is not null)), check(kind<>'payment' or amount<0), check(kind<>'sale' or amount>0),
 foreign key(store_id,customer_id) references public.retail_customers(store_id,id),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,shift_id) references public.retail_shifts(store_id,id)
);
create index retail_customer_movements_customer on public.retail_customer_movements(customer_id,created_at desc);
create index retail_customer_movements_shift on public.retail_customer_movements(shift_id) where shift_id is not null;

alter table public.retail_customers enable row level security;
alter table public.retail_customer_movements enable row level security;
create policy customer_users_read on public.retail_customers for select to authenticated using(retail_private.can_use_customers(store_id));
create policy customer_users_read on public.retail_customer_movements for select to authenticated using(retail_private.can_use_customers(store_id));
revoke all on public.retail_customers,public.retail_customer_movements from public,anon,authenticated;
grant select on public.retail_customers,public.retail_customer_movements to authenticated;

alter table public.retail_sales drop constraint if exists retail_sales_payment_method_check;
alter table public.retail_sales add constraint retail_sales_payment_method_check check(payment_method in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito','Fiado'));
alter table public.retail_sales add column customer_id uuid, add column customer_name text,
 add constraint retail_sales_customer_fkey foreign key(store_id,customer_id) references public.retail_customers(store_id,id),
 add constraint retail_sales_credit_needs_customer check(payment_method<>'Fiado' or customer_id is not null);

create function retail_private.customer_balance(p_customer uuid) returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(sum(amount),0) from public.retail_customer_movements where customer_id=p_customer;
$$;
revoke all on function retail_private.customer_balance(uuid) from public,anon,authenticated;

create function public.retail_save_customer(p_store uuid,p_id uuid,p_customer jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_name text:=btrim(coalesce(p_customer->>'name','')); v_phone text:=nullif(btrim(coalesce(p_customer->>'phone','')),'');
 v_limit numeric; v_active boolean:=coalesce((p_customer->>'active')::boolean,true);
begin
 if not retail_private.can_manage_customers(p_store) then raise exception 'Tu perfil no permite cargar ni editar clientes' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos del cliente incompletos'; end if;
 if length(v_name) not between 1 and 120 then raise exception 'Escribí el nombre del cliente'; end if;
 if v_phone is not null and length(v_phone)>40 then raise exception 'Teléfono demasiado largo'; end if;
 if nullif(p_customer->>'credit_limit','') is not null then
  if (p_customer->>'credit_limit')!~'^[0-9]{1,12}(\.[0-9]{1,2})?$' then raise exception 'Revisá el límite de deuda'; end if;
  v_limit:=(p_customer->>'credit_limit')::numeric;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('customer:'||p_id::text,0));
 if exists(select 1 from public.retail_customers where id=p_id and store_id<>p_store) then raise exception 'El identificador ya corresponde a otro comercio'; end if;
 insert into public.retail_customers(id,store_id,name,phone,credit_limit,active,created_by)
 values(p_id,p_store,v_name,v_phone,v_limit,v_active,auth.uid())
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,credit_limit=excluded.credit_limit,active=excluded.active;
 return p_id;
end $$;

-- Clientes con saldo, para la pantalla y para Inicio.
create function public.retail_customer_balances(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite ver clientes' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'credit_limit',c.credit_limit,'active',c.active,
   'balance',coalesce(m.balance,0),'last_movement',m.last_at) order by coalesce(m.balance,0) desc,lower(c.name)),'[]'::jsonb)
  from public.retail_customers c
  left join (select customer_id,sum(amount) as balance,max(created_at) as last_at from public.retail_customer_movements where store_id=p_store group by customer_id) m on m.customer_id=c.id
  where c.store_id=p_store);
end $$;

-- Cobro total o parcial. El efectivo entra a la caja abierta de quien cobra; los otros medios no tocan caja.
create function public.retail_customer_payment(p_store uuid,p_customer uuid,p_request uuid,p_amount numeric,p_method text,p_shift uuid default null,p_note text default null) returns jsonb
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
 if p_amount is null or p_amount<=0 or round(p_amount,2)<>p_amount or p_amount::text='NaN' then raise exception 'Revisá el importe cobrado'; end if;
 v_balance:=retail_private.customer_balance(p_customer);
 if p_amount>v_balance then raise exception 'El cobro supera lo que debe el cliente (%)',v_balance; end if;
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

-- La caja suma el efectivo de los cobros de cuenta corriente hechos en ese turno.
create or replace function retail_private.shift_expected_cash(p_shift uuid) returns numeric language sql stable security definer set search_path='' as $$
 select s.opening_cash
  + coalesce((select sum(x.cash_amount) from public.retail_sales x where x.shift_id=s.id),0)
  + coalesce((select sum(case when m.type='INGRESO' then m.amount else -m.amount end) from public.retail_movements m where m.shift_id=s.id),0)
  - coalesce((select sum(r.cash_amount) from public.retail_sale_returns r where r.shift_id=s.id),0)
  - coalesce((select sum(c.amount) from public.retail_customer_movements c where c.shift_id=s.id and c.method='Efectivo'),0)
 from public.retail_shifts s where s.id=p_shift;
$$;

-- Fiado: se valida con el cobro existente como medio sin efectivo y, en la misma transacción,
-- se marca como Fiado, se controla el límite y se suma la deuda. Si algo falla, no queda venta ni stock movido.
alter function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) rename to retail_checkout_before_credit;
revoke all on function public.retail_checkout_before_credit(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null,p_customer uuid default null,p_over_limit boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_store uuid; v_customer public.retail_customers; v_sale public.retail_sales; v_balance numeric; saved uuid;
begin
 if p_method is distinct from 'Fiado' then
  if p_customer is not null then raise exception 'El cliente se elige solo para ventas fiadas'; end if;
  return public.retail_checkout_before_credit(p_shift,p_request,p_method,p_paid,p_items,p_price_list,p_ledger,p_payments);
 end if;
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 if p_customer is null then raise exception 'Elegí a quién le fiás'; end if;
 select store_id into v_store from public.retail_shifts where id=p_shift;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=v_store for update;
 if not found or not v_customer.active then raise exception 'Cliente no disponible'; end if;
 if not retail_private.can_use_customers(v_store) then raise exception 'Tu perfil no permite fiar' using errcode='42501'; end if;
 select * into v_sale from public.retail_sales where id=p_request;
 if found then
  if v_sale.customer_id is distinct from p_customer then raise exception 'La solicitud ya fue usada con otro cliente'; end if;
  return public.retail_checkout_before_credit(p_shift,p_request,'Transferencia',0,p_items,p_price_list,p_ledger,null);
 end if;
 saved:=public.retail_checkout_before_credit(p_shift,p_request,'Transferencia',0,p_items,p_price_list,p_ledger,null);
 select * into v_sale from public.retail_sales where id=saved for update;
 v_balance:=retail_private.customer_balance(p_customer);
 if v_customer.credit_limit is not null and v_balance+v_sale.total>v_customer.credit_limit then
  if not p_over_limit then
   raise exception 'Con esta venta % debería %, más que su límite de %',v_customer.name,v_balance+v_sale.total,v_customer.credit_limit;
  end if;
  if not retail_private.can_manage_customers(v_store) then
   raise exception 'Supera el límite de % y tu perfil no permite fiar por encima. Pedile a administración',v_customer.name using errcode='42501';
  end if;
 end if;
 update public.retail_sales set payment_method='Fiado',payments=jsonb_build_array(jsonb_build_object('method','Fiado','amount',total)),
  amount_paid=total,change=0,cash_amount=0,customer_id=p_customer,customer_name=v_customer.name where id=saved;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,created_by,actor_email)
 values(saved,v_store,p_customer,'sale',v_sale.total,saved,auth.uid(),auth.jwt()->>'email');
 return saved;
end $$;
revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb,uuid,boolean) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb,uuid,boolean) to authenticated;

-- Devolver una venta fiada descuenta de la cuenta del cliente en vez de entregar plata.
alter function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) rename to retail_return_sale_before_credit;
revoke all on function public.retail_return_sale_before_credit(uuid,uuid,uuid,jsonb,text,jsonb,uuid) from public,anon,authenticated;
create function public.retail_return_sale(p_store uuid,p_sale uuid,p_request uuid,p_items jsonb,p_reason text,p_refund jsonb default null,p_shift uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_parts jsonb:=p_refund; v_core jsonb; v_credit numeric; v_result jsonb;
begin
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store;
 if not found or v_sale.customer_id is null then
  if exists(select 1 from jsonb_array_elements(coalesce(p_refund,'[]'::jsonb)) x where x->>'method'='Fiado') then raise exception 'Solo una venta fiada se devuelve a cuenta del cliente'; end if;
  return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift);
 end if;
 -- Anular por primera vez repite el cobro original: todo a cuenta del cliente.
 if v_parts is null and p_items is null and v_sale.returned_total=0 then v_parts:=jsonb_build_array(jsonb_build_object('method','Fiado','amount',v_sale.total)); end if;
 if v_parts is null then return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift); end if;
 select coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Fiado'),0) into v_credit from jsonb_array_elements(v_parts) x;
 select coalesce(jsonb_agg(case when x->>'method'='Fiado' then jsonb_set(x,'{method}','"Transferencia"') else x end),'[]'::jsonb) into v_core from jsonb_array_elements(v_parts) x;
 v_result:=public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,v_core,p_shift);
 if v_credit>0 then
  update public.retail_sale_returns set payments=v_parts where id=p_request and payments is distinct from v_parts;
  insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,return_id,created_by,actor_email)
  values(p_request,p_store,v_sale.customer_id,'return',-v_credit,p_sale,p_request,auth.uid(),auth.jwt()->>'email') on conflict(id) do nothing;
 end if;
 return v_result;
end $$;
revoke all on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) from public,anon;
grant execute on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) to authenticated;

revoke all on function public.retail_save_customer(uuid,uuid,jsonb),public.retail_customer_balances(uuid),
 public.retail_customer_payment(uuid,uuid,uuid,numeric,text,uuid,text) from public,anon;
grant execute on function public.retail_save_customer(uuid,uuid,jsonb),public.retail_customer_balances(uuid),
 public.retail_customer_payment(uuid,uuid,uuid,numeric,text,uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
