begin;
-- Anulaciones y devoluciones de ventas. La venta original no se borra ni se reescribe:
-- cada devolución es un registro propio y la venta solo lleva el acumulado devuelto.

-- Nuevo permiso: los perfiles y roles existentes no lo reciben automáticamente.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales']::text[]);
alter table public.retail_role_permissions drop constraint retail_role_permissions_permissions_check;
alter table public.retail_role_permissions add constraint retail_role_permissions_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales']::text[]) action where retail_private.has_permission(p_store,action);
$$;

alter table public.retail_sales
 add column returned_total numeric(14,2) not null default 0,
 add column return_status text not null default 'none' check(return_status in ('none','partial','voided')),
 add constraint retail_sales_returned_total_valid check(returned_total>=0 and returned_total<=total);

create table public.retail_sale_returns (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), sale_id uuid not null,
 kind text not null check(kind in ('void','partial')),
 -- Caja de la que salió el efectivo devuelto; sin efectivo no hace falta caja abierta.
 shift_id uuid, branch_id uuid not null, items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)>0),
 total numeric(14,2) not null check(total>0), cash_amount numeric(14,2) not null check(cash_amount>=0 and cash_amount<=total),
 payments jsonb not null check(jsonb_typeof(payments)='array'),
 reason text not null check(length(btrim(reason)) between 3 and 300),
 credit_note_required boolean not null default false,
 credit_note_reference text check(credit_note_reference is null or length(btrim(credit_note_reference)) between 1 and 120),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,shift_id) references public.retail_shifts(store_id,id),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id)
);
create index retail_sale_returns_sale on public.retail_sale_returns(sale_id);
create index retail_sale_returns_shift on public.retail_sale_returns(shift_id) where shift_id is not null;
create index retail_sale_returns_month on public.retail_sale_returns(store_id,created_at);
alter table public.retail_sale_returns enable row level security;
-- Visible para quien puede ver la venta: la política de ventas se aplica dentro de la subconsulta.
create policy sale_visible_read on public.retail_sale_returns for select to authenticated
 using(exists(select 1 from public.retail_sales s where s.id=sale_id and s.store_id=retail_sale_returns.store_id));
revoke all on public.retail_sale_returns from public,anon,authenticated;
grant select on public.retail_sale_returns to authenticated;

-- Un único cálculo de efectivo esperado: apertura + efectivo cobrado + ingresos − retiros − efectivo devuelto.
create function retail_private.shift_expected_cash(p_shift uuid) returns numeric language sql stable security definer set search_path='' as $$
 select s.opening_cash
  + coalesce((select sum(x.cash_amount) from public.retail_sales x where x.shift_id=s.id),0)
  + coalesce((select sum(case when m.type='INGRESO' then m.amount else -m.amount end) from public.retail_movements m where m.shift_id=s.id),0)
  - coalesce((select sum(r.cash_amount) from public.retail_sale_returns r where r.shift_id=s.id),0)
 from public.retail_shifts s where s.id=p_shift;
$$;
revoke all on function retail_private.shift_expected_cash(uuid) from public,anon,authenticated;

create or replace function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 v_expected:=retail_private.shift_expected_cash(s.id);
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

create or replace function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 return retail_private.shift_expected_cash(s.id);
end $$;

create or replace function public.retail_open_shift_cash(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return '[]'::jsonb; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('location',t.branch_id::text,'cash',t.cash,'shifts',t.shifts)),'[]'::jsonb) from (
  select r.branch_id,count(*) as shifts,sum(retail_private.shift_expected_cash(s.id)) as cash
  from public.retail_shifts s join public.retail_registers r on r.store_id=s.store_id and r.id=s.register_id
  where s.store_id=p_store and s.closed_at is null group by r.branch_id
 ) t);
end $$;

-- p_items null anula lo que queda de la venta; si no, [{index,qty}] sobre los renglones del ticket.
-- p_refund [{method,amount}] es obligatorio en devoluciones parciales; al anular se repite el cobro original.
create function public.retail_return_sale(p_store uuid,p_sale uuid,p_request uuid,p_items jsonb,p_reason text,p_refund jsonb default null,p_shift uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_existing public.retail_sale_returns; v_role text; v_reason text:=btrim(coalesce(p_reason,''));
 v_line jsonb; v_req jsonb; v_index integer; v_qty integer; v_left integer; v_lines jsonb:='[]'::jsonb; v_amount numeric:=0;
 v_kind text; v_parts jsonb; v_cash numeric:=0; v_sum numeric; v_methods integer; v_shift public.retail_shifts; v_credit boolean:=false;
 v_billing_status text; v_previous text:=current_setting('retail.inventory_location',true); v_stock record;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 if p_request is null or p_sale is null or p_store is null then raise exception 'Datos de la devolución incompletos'; end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-return:'||p_request::text,0));
 select * into v_existing from public.retail_sale_returns where id=p_request;
 if found then
  if v_existing.sale_id<>p_sale or v_existing.created_by<>auth.uid() then raise exception 'El identificador ya corresponde a otra devolución'; end if;
  select * into v_sale from public.retail_sales where id=p_sale;
  return jsonb_build_object('id',v_existing.id,'returnedTotal',v_sale.returned_total,'returnStatus',v_sale.return_status,'total',v_existing.total,'creditNoteRequired',v_existing.credit_note_required);
 end if;
 v_role:=retail_private.role_for(p_store);
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales')) then
  raise exception 'Tu perfil no permite anular ni devolver ventas. Pedile a administración que revise tus permisos' using errcode='42501';
 end if;
 if length(v_reason) not between 3 and 300 then raise exception 'Escribí el motivo de la devolución'; end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no disponible. Si se cobró sin conexión, sincronizá antes de devolverla'; end if;
 if v_role not in ('owner','admin') and v_sale.created_by<>auth.uid() and not retail_private.can_review_sales(p_store,v_sale.shift_id) then
  raise exception 'Sin acceso a esta venta' using errcode='42501';
 end if;
 if v_sale.return_status='voided' then raise exception 'Esta venta ya está anulada'; end if;
 v_billing_status:=v_sale.billing_status;
 if v_billing_status in ('pending','retry','error') and p_items is not null then
  raise exception 'La factura de esta venta está pendiente. Facturala antes de devolver una parte, o anulá la venta completa';
 end if;
 v_credit:=v_billing_status='authorized';

 if p_items is null then
  v_kind:='void';
  for v_line, v_index in select value,(ordinality-1)::integer from jsonb_array_elements(v_sale.items) with ordinality loop
   v_left:=(v_line->>'qty')::integer-coalesce((select sum((x->>'qty')::integer) from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.items) x
    where r.sale_id=p_sale and (x->>'index')::integer=v_index),0);
   if v_left>0 then v_lines:=v_lines||jsonb_build_array(v_line||jsonb_build_object('index',v_index,'qty',v_left,'subtotal',round(v_left*(v_line->>'unitPrice')::numeric,2))); end if;
  end loop;
 else
  v_kind:='partial';
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 300 then raise exception 'Elegí qué se devuelve'; end if;
  if (select count(distinct x->>'index') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Cada renglón se devuelve una sola vez'; end if;
  for v_req in select value from jsonb_array_elements(p_items) loop
   if coalesce(v_req->>'index','')!~'^[0-9]{1,3}$' or coalesce(v_req->>'qty','')!~'^[1-9][0-9]{0,5}$' then raise exception 'Cantidad a devolver inválida'; end if;
   v_index:=(v_req->>'index')::integer; v_qty:=(v_req->>'qty')::integer;
   v_line:=v_sale.items->v_index;
   if v_line is null then raise exception 'Ese renglón no está en la venta'; end if;
   v_left:=(v_line->>'qty')::integer-coalesce((select sum((x->>'qty')::integer) from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.items) x
    where r.sale_id=p_sale and (x->>'index')::integer=v_index),0);
   if v_qty>v_left then raise exception 'No podés devolver más de lo que queda de %: % unidades',v_line->>'name',v_left; end if;
   v_lines:=v_lines||jsonb_build_array(v_line||jsonb_build_object('index',v_index,'qty',v_qty,'subtotal',round(v_qty*(v_line->>'unitPrice')::numeric,2)));
  end loop;
 end if;
 if jsonb_array_length(v_lines)=0 then raise exception 'No queda nada por devolver en esta venta'; end if;
 select sum((x->>'subtotal')::numeric) into v_amount from jsonb_array_elements(v_lines) x;
 -- Lo que falta devolver se toma del total para no acumular diferencias de redondeo.
 if v_amount>v_sale.total-v_sale.returned_total or (v_kind='void') then v_amount:=v_sale.total-v_sale.returned_total; end if;
 if v_amount<=0 then raise exception 'No queda nada por devolver en esta venta'; end if;

 if p_refund is null then
  if v_kind='partial' or v_sale.returned_total>0 then raise exception 'Elegí cómo se devuelve la plata'; end if;
  v_parts:=v_sale.payments;
 else
  v_parts:=p_refund;
 end if;
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Medio de devolución inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito')
  or coalesce(x->>'amount','')!~'^[0-9]+(\.[0-9]{1,2})?$' or (x->>'amount')::numeric<=0) then raise exception 'Medio de devolución inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method')
  into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_amount or v_methods<>jsonb_array_length(v_parts) then raise exception 'Lo que se devuelve debe sumar %',v_amount; end if;

 if v_cash>0 then
  if p_shift is null then raise exception 'Abrí tu caja para devolver efectivo. Si devolvés por otro medio no hace falta'; end if;
  v_shift:=retail_private.check_shift(p_shift);
  if v_shift.store_id<>p_store then raise exception 'La caja no pertenece a este comercio'; end if;
  if retail_private.shift_expected_cash(v_shift.id)<v_cash then raise exception 'No hay suficiente efectivo en la caja para devolver'; end if;
 end if;

 -- El stock vuelve a la sucursal de la venta, con la composición guardada en el ticket.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform set_config('retail.inventory_location',v_sale.branch_id::text,true);
 for v_stock in
  with units as (
   select (l->>'productId')::uuid as product_id,(l->>'qty')::bigint as qty from jsonb_array_elements(v_lines) l
    where nullif(l->>'productId','') is not null and jsonb_array_length(coalesce(l->'stockComponents','[]'::jsonb))=0
   union all
   select (c->>'product_id')::uuid,(l->>'qty')::bigint*(c->>'quantity')::bigint from jsonb_array_elements(v_lines) l
    cross join lateral jsonb_array_elements(l->'stockComponents') c
    where nullif(l->>'productId','') is not null and jsonb_array_length(coalesce(l->'stockComponents','[]'::jsonb))>0
  )
  select u.product_id,sum(u.qty) as qty from units u join public.retail_products p on p.id=u.product_id and p.store_id=p_store
  group by u.product_id order by u.product_id
 loop
  perform 1 from public.retail_products where id=v_stock.product_id for update;
  update public.retail_products set stock=stock+v_stock.qty::integer where id=v_stock.product_id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,v_stock.product_id,p_store,auth.uid(),v_stock.qty::integer,null,now());
 end loop;
 perform set_config('retail.inventory_location',coalesce(v_previous,''),true);

 insert into public.retail_sale_returns(id,store_id,sale_id,kind,shift_id,branch_id,items,total,cash_amount,payments,reason,credit_note_required,created_by,actor_email)
 values(p_request,p_store,p_sale,v_kind,case when v_cash>0 then v_shift.id end,v_sale.branch_id,v_lines,v_amount,v_cash,v_parts,v_reason,v_credit,auth.uid(),auth.jwt()->>'email');
 update public.retail_sales set returned_total=returned_total+v_amount,
  return_status=case when returned_total+v_amount>=total then 'voided' else 'partial' end,
  -- Una anulación con la factura todavía pendiente la cancela: no debe emitirse después.
  billing_status=case when v_kind='void' and billing_status in ('pending','retry','error') then 'none' else billing_status end,
  billing_error=case when v_kind='void' and billing_status in ('pending','retry','error') then 'Venta anulada antes de facturar' else billing_error end
 where id=p_sale returning * into v_sale;
 return jsonb_build_object('id',p_request,'returnedTotal',v_sale.returned_total,'returnStatus',v_sale.return_status,'total',v_amount,'creditNoteRequired',v_credit);
end $$;
revoke all on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) from public,anon;
grant execute on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) to authenticated;

-- Si una factura en curso se autoriza después de anular, la devolución queda pidiendo nota de crédito.
create function retail_private.flag_credit_note_after_return() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.billing_status='authorized' and old.billing_status is distinct from 'authorized' and new.return_status<>'none' then
  update public.retail_sale_returns set credit_note_required=true where sale_id=new.id;
 end if;
 return new;
end $$;
revoke all on function retail_private.flag_credit_note_after_return() from public,anon,authenticated;
create trigger retail_flag_credit_note_after_return after update of billing_status on public.retail_sales
 for each row execute function retail_private.flag_credit_note_after_return();

-- La nota de crédito se emite por ahora fuera de la app; acá se registra su número.
create function public.retail_attach_credit_note(p_store uuid,p_return uuid,p_reference text) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales') and not retail_private.has_permission(p_store,'attach_invoice')) then
  raise exception 'Tu perfil no permite cargar notas de crédito' using errcode='42501';
 end if;
 if p_reference is null or length(btrim(p_reference)) not between 1 and 120 then raise exception 'Escribí el número de la nota de crédito'; end if;
 update public.retail_sale_returns set credit_note_reference=btrim(p_reference)
  where id=p_return and store_id=p_store and credit_note_required
   and exists(select 1 from public.retail_sales s where s.id=sale_id and (v_role in ('owner','admin') or s.created_by=auth.uid() or retail_private.can_review_sales(p_store,s.shift_id)));
 if not found then raise exception 'Devolución no disponible'; end if;
end $$;
revoke all on function public.retail_attach_credit_note(uuid,uuid,text) from public,anon;
grant execute on function public.retail_attach_credit_note(uuid,uuid,text) to authenticated;

-- Ganancias: las devoluciones restan en el mes en que se hicieron, con el costo guardado en el ticket.
create or replace function public.retail_month_result(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 return (with sold as (
  select s.id,s.branch_id,s.total from public.retail_sales s
  where s.store_id=p_store and s.created_at>=(first_day::timestamp at time zone zone) and s.created_at<(next_day::timestamp at time zone zone)
 ), line as (
  select s.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty
  from sold s cross join lateral jsonb_array_elements(coalesce((select r.items from public.retail_sales r where r.id=s.id),'[]'::jsonb)) i(item)
 ), returned as (
  select r.branch_id,r.total,r.items from public.retail_sale_returns r
  where r.store_id=p_store and r.created_at>=(first_day::timestamp at time zone zone) and r.created_at<(next_day::timestamp at time zone zone)
 ), returned_line as (
  select r.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty from returned r cross join lateral jsonb_array_elements(r.items) i(item)
 ), spent as (
  select e.branch_id,e.category,e.amount from public.retail_expenses e
  where e.store_id=p_store and e.voided_at is null and e.spent_on>=first_day and e.spent_on<next_day
 ), places as (
  select branch_id from sold union select branch_id from returned union select branch_id from spent where branch_id is not null
 )
 select jsonb_build_object(
  'sales',coalesce((select sum(total) from sold),0)-coalesce((select sum(total) from returned),0),
  'returns',coalesce((select sum(total) from returned),0),
  'tickets',(select count(*) from sold),
  'cost',coalesce((select sum(unit_cost*qty) from line),0)-coalesce((select sum(unit_cost*qty) from returned_line),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null or unit_cost<=0),
  'expenses',coalesce((select sum(amount) from spent),0),
  'shared_expenses',coalesce((select sum(amount) from spent where branch_id is null),0),
  'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',c.category,'amount',c.amount) order by c.amount desc) from (select category,sum(amount) as amount from spent group by category) c),'[]'::jsonb),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sum(total) from sold x where x.branch_id=p.branch_id),0)-coalesce((select sum(total) from returned x where x.branch_id=p.branch_id),0),
    'cost',coalesce((select sum(unit_cost*qty) from line l where l.branch_id=p.branch_id),0)-coalesce((select sum(unit_cost*qty) from returned_line l where l.branch_id=p.branch_id),0),
    'expenses',coalesce((select sum(amount) from spent e where e.branch_id=p.branch_id),0))) from places p),'[]'::jsonb)
 ));
end $$;

notify pgrst,'reload schema';
commit;
