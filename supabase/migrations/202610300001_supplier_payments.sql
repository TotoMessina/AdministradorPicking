begin;

-- Cuenta corriente, etapa C: pagos a proveedores aplicados a comprobantes, retenciones y anticipos.
-- Nuevo permiso: los perfiles existentes no lo reciben automáticamente.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;

create table public.retail_supplier_payments (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id),
 issuer_cuit text not null check(retail_private.valid_cuit(issuer_cuit)),
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 paid_on date not null,
 method text not null check(method in ('cash','transfer','check','other')),
 -- Dinero entregado. Las retenciones también cancelan deuda, pero no salen de la caja.
 amount numeric(16,2) not null check(amount>=0),
 ret_vat numeric(16,2) not null default 0 check(ret_vat>=0),
 ret_income numeric(16,2) not null default 0 check(ret_income>=0),
 ret_iibb numeric(16,2) not null default 0 check(ret_iibb>=0),
 ret_suss numeric(16,2) not null default 0 check(ret_suss>=0),
 retention_certificate text check(length(retention_certificate)<=60),
 reference text check(length(reference)<=120),
 notes text check(length(notes)<=300),
 movement_id uuid references public.retail_movements(id),
 voided_at timestamptz,
 voided_by uuid references auth.users(id),
 void_reason text check(length(void_reason)<=300),
 voided_allocations jsonb,
 created_by uuid not null references auth.users(id),
 actor_email text,
 created_at timestamptz not null default now(),
 check(amount+ret_vat+ret_income+ret_iibb+ret_suss>0),
 check((voided_at is null)=(void_reason is null)),
 check(method<>'cash' or movement_id is not null)
);
create index retail_supplier_payment_history on public.retail_supplier_payments(store_id,paid_on desc,id);
create index retail_supplier_payment_account on public.retail_supplier_payments(store_id,issuer_cuit);

create table public.retail_supplier_payment_allocations (
 payment_id uuid not null references public.retail_supplier_payments(id),
 invoice_id uuid not null references public.retail_purchase_invoices(id),
 store_id uuid not null references public.retail_stores(id),
 amount numeric(16,2) not null check(amount>0),
 primary key(payment_id,invoice_id)
);
create index retail_supplier_allocation_invoice on public.retail_supplier_payment_allocations(invoice_id);

alter table public.retail_supplier_payments enable row level security;
alter table public.retail_supplier_payment_allocations enable row level security;
create policy authorized_read on public.retail_supplier_payments for select to authenticated using(retail_private.has_permission(store_id,'manage_supplier_accounts'));
create policy authorized_read on public.retail_supplier_payment_allocations for select to authenticated using(retail_private.has_permission(store_id,'manage_supplier_accounts'));
revoke all on public.retail_supplier_payments,public.retail_supplier_payment_allocations from public,anon,authenticated;
grant select on public.retail_supplier_payments,public.retail_supplier_payment_allocations to authenticated;

-- Quien registra pagos necesita ver los comprobantes para aplicarlos.
drop policy authorized_read on public.retail_purchase_invoices;
create policy authorized_read on public.retail_purchase_invoices for select to authenticated
 using(retail_private.has_permission(store_id,'manage_products') or retail_private.has_permission(store_id,'manage_supplier_accounts'));

-- Las notas de crédito y débito se vinculan en la etapa B. Valida y guarda aplicaciones de un pago:
-- mismo proveedor, solo facturas y notas de débito, sin superar su saldo ni lo disponible del pago.
create function retail_private.allocate_supplier_payment(p_store uuid,p_payment uuid,p_cuit text,p_available numeric,p_allocations jsonb) returns numeric
language plpgsql security definer set search_path='' as $$
declare item jsonb; invoice public.retail_purchase_invoices; value numeric; balance numeric; used numeric:=0;
begin
 if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)>200 then raise exception 'Revisá las facturas elegidas' using errcode='22023'; end if;
 for item in select c from jsonb_array_elements(p_allocations) c loop
  begin value:=(item->>'amount')::numeric;
  exception when others then raise exception 'Revisá los importes aplicados' using errcode='22023'; end;
  if value is null or value<=0 or round(value,2)<>value then raise exception 'Revisá los importes aplicados: positivos con hasta dos decimales' using errcode='22023'; end if;
  select * into invoice from public.retail_purchase_invoices where store_id=p_store and id=(item->>'invoice_id')::uuid for update;
  if not found or invoice.issuer_cuit<>p_cuit or invoice.voucher_type not in (1,2,6,7,11,12,51) then
   raise exception 'Elegí facturas o notas de débito de este proveedor' using errcode='22023';
  end if;
  balance:=invoice.total
   -coalesce((select sum(n.total) from public.retail_purchase_invoices n where n.store_id=p_store and n.applies_to=invoice.id and n.voucher_type in (3,8,13)),0)
   -coalesce((select sum(a.amount) from public.retail_supplier_payment_allocations a where a.invoice_id=invoice.id),0);
  if value>balance+0.005 then
   raise exception 'El importe aplicado supera el saldo del comprobante %-% (saldo %)', invoice.point_of_sale, invoice.number, round(balance,2) using errcode='22023';
  end if;
  insert into public.retail_supplier_payment_allocations(payment_id,invoice_id,store_id,amount) values(p_payment,invoice.id,p_store,value);
  used:=used+value;
 end loop;
 if used>p_available+0.005 then raise exception 'Lo aplicado supera el importe disponible del pago' using errcode='22023'; end if;
 return used;
end $$;
revoke all on function retail_private.allocate_supplier_payment(uuid,uuid,text,numeric,jsonb) from public,anon,authenticated;

-- p_request es el id del pago: reintentar devuelve el mismo registro. En efectivo crea en la misma
-- transacción el retiro del turno, con las validaciones de caja de retail_add_movement.
create function public.retail_save_supplier_payment(p_store uuid,p_request uuid,p_payment jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.retail_supplier_payments; pay public.retail_supplier_payments; v_shift uuid; v_voucher text; v_movement uuid;
 v_name text; total numeric; field text;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 if p_request is null or jsonb_typeof(p_payment)<>'object' then raise exception 'Datos del pago incompletos' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into previous from public.retail_supplier_payments where id=p_request;
 if found then
  if previous.store_id<>p_store then raise exception 'La solicitud corresponde a otro comercio'; end if;
  return previous.id;
 end if;
 begin
  pay:=jsonb_populate_record(null::public.retail_supplier_payments,p_payment);
 exception when others then raise exception 'Revisá fecha, medio e importes del pago' using errcode='22023';
 end;
 v_name:=btrim(coalesce(pay.supplier_name,''));
 if pay.issuer_cuit is null or not retail_private.valid_cuit(pay.issuer_cuit) then raise exception 'Elegí un proveedor con CUIT válido' using errcode='22023'; end if;
 if v_name='' or length(v_name)>120 then raise exception 'Falta el nombre del proveedor' using errcode='22023'; end if;
 if pay.paid_on is null then raise exception 'Completá la fecha del pago' using errcode='22023'; end if;
 if pay.method is null or pay.method not in ('cash','transfer','check','other') then raise exception 'Elegí el medio de pago' using errcode='22023'; end if;
 foreach field in array array['amount','ret_vat','ret_income','ret_iibb','ret_suss'] loop
  if coalesce((to_jsonb(pay)->>field)::numeric,0)<0 or round(coalesce((to_jsonb(pay)->>field)::numeric,0),2)<>coalesce((to_jsonb(pay)->>field)::numeric,0) then
   raise exception 'Revisá los importes del pago: positivos con hasta dos decimales' using errcode='22023';
  end if;
 end loop;
 total:=coalesce(pay.amount,0)+coalesce(pay.ret_vat,0)+coalesce(pay.ret_income,0)+coalesce(pay.ret_iibb,0)+coalesce(pay.ret_suss,0);
 if total<=0 then raise exception 'Completá el importe del pago' using errcode='22023'; end if;
 if pay.method='cash' then
  if coalesce(pay.amount,0)<=0 then raise exception 'Completá el efectivo entregado' using errcode='22023'; end if;
  v_shift:=nullif(p_payment->>'shift_id','')::uuid;
  v_voucher:=nullif(btrim(coalesce(p_payment->>'voucher_url','')),'');
  if v_shift is null then raise exception 'Elegí el turno de caja del que sale el efectivo' using errcode='22023'; end if;
  if not exists(select 1 from public.retail_shifts s where s.id=v_shift and s.store_id=p_store and s.closed_at is null) then
   raise exception 'El turno elegido ya no está abierto' using errcode='22023';
  end if;
  v_movement:=public.retail_add_movement(v_shift,'RETIRO',pay.amount,left('Pago a proveedor: '||v_name,300),p_request,'supplier_payment',v_voucher,v_name);
 end if;
 insert into public.retail_supplier_payments(id,store_id,issuer_cuit,supplier_name,paid_on,method,amount,ret_vat,ret_income,ret_iibb,ret_suss,
  retention_certificate,reference,notes,movement_id,created_by,actor_email)
 values(p_request,p_store,pay.issuer_cuit,v_name,pay.paid_on,pay.method,coalesce(pay.amount,0),coalesce(pay.ret_vat,0),coalesce(pay.ret_income,0),coalesce(pay.ret_iibb,0),coalesce(pay.ret_suss,0),
  nullif(btrim(coalesce(pay.retention_certificate,'')),''),nullif(btrim(coalesce(pay.reference,'')),''),nullif(btrim(coalesce(pay.notes,'')),''),v_movement,auth.uid(),auth.jwt()->>'email');
 perform retail_private.allocate_supplier_payment(p_store,p_request,pay.issuer_cuit,total,coalesce(p_payment->'allocations','[]'::jsonb));
 return p_request;
end $$;

-- Aplica lo que quedó a favor (anticipo) a comprobantes del mismo proveedor.
create function public.retail_apply_supplier_payment(p_store uuid,p_id uuid,p_allocations jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare pay public.retail_supplier_payments; used numeric;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into pay from public.retail_supplier_payments where store_id=p_store and id=p_id for update;
 if not found or pay.voided_at is not null then raise exception 'El pago ya no está disponible. Actualizá los datos'; end if;
 select coalesce(sum(a.amount),0) into used from public.retail_supplier_payment_allocations a where a.payment_id=p_id;
 if exists(select 1 from jsonb_array_elements(p_allocations) c join public.retail_supplier_payment_allocations a on a.payment_id=p_id and a.invoice_id=(c->>'invoice_id')::uuid) then
  raise exception 'Este pago ya está aplicado a uno de esos comprobantes' using errcode='22023';
 end if;
 perform retail_private.allocate_supplier_payment(p_store,p_id,pay.issuer_cuit,pay.amount+pay.ret_vat+pay.ret_income+pay.ret_iibb+pay.ret_suss-used,p_allocations);
end $$;

-- Un pago no se borra: se anula con motivo y sus aplicaciones quedan como constancia.
-- El retiro de caja no se revierte: el efectivo ya salió y el arqueo no debe cambiar por una corrección.
create function public.retail_void_supplier_payment(p_store uuid,p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare pay public.retail_supplier_payments; reason text:=nullif(btrim(coalesce(p_reason,'')),''); snapshot jsonb;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 if reason is null or length(reason)>300 then raise exception 'Indicá el motivo de la anulación (hasta 300 caracteres)' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into pay from public.retail_supplier_payments where store_id=p_store and id=p_id for update;
 if not found then raise exception 'El pago ya no está disponible. Actualizá los datos'; end if;
 if pay.voided_at is not null then raise exception 'Este pago ya está anulado'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('invoice_id',a.invoice_id,'amount',a.amount)),'[]'::jsonb) into snapshot
  from public.retail_supplier_payment_allocations a where a.payment_id=p_id;
 delete from public.retail_supplier_payment_allocations where payment_id=p_id;
 update public.retail_supplier_payments set voided_at=now(),voided_by=auth.uid(),void_reason=reason,voided_allocations=snapshot where id=p_id;
end $$;

create or replace function public.retail_delete_purchase_invoice(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if exists(select 1 from public.retail_supplier_payment_allocations a where a.store_id=p_store and a.invoice_id=p_id) then
  raise exception 'Este comprobante tiene pagos aplicados. Anulá esos pagos antes de eliminarlo';
 end if;
 delete from public.retail_purchase_invoices where store_id=p_store and id=p_id;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
end $$;

-- Una nota de crédito no puede dejar la factura por debajo de lo ya pagado.
create or replace function public.retail_update_purchase_invoice_tracking(p_store uuid,p_id uuid,p_changes jsonb) returns public.retail_purchase_invoices
language plpgsql security definer set search_path='' as $$
declare inv public.retail_purchase_invoices; target public.retail_purchase_invoices; result public.retail_purchase_invoices;
 next_due date; next_reason text; next_target uuid; linked numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_changes)<>'object' or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('due_date','review_reason','accept','applies_to')) then
  raise exception 'Cambios no válidos para el comprobante' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into inv from public.retail_purchase_invoices where store_id=p_store and id=p_id for update;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
 next_due:=inv.due_date; next_reason:=inv.review_reason; next_target:=inv.applies_to;
 if p_changes ? 'due_date' then
  begin next_due:=(p_changes->>'due_date')::date;
  exception when others then raise exception 'Revisá la fecha de vencimiento' using errcode='22023'; end;
  if next_due is null or next_due<inv.issue_date then raise exception 'El vencimiento no puede ser anterior a la emisión' using errcode='22023'; end if;
 end if;
 if p_changes ? 'review_reason' then
  next_reason:=nullif(btrim(coalesce(p_changes->>'review_reason','')),'');
  if length(next_reason)>300 then raise exception 'El motivo admite hasta 300 caracteres' using errcode='22023'; end if;
 end if;
 if coalesce((p_changes->>'accept')::boolean,false) and inv.voucher_type not in (2,7,12) then
  raise exception 'Solo se aceptan notas de débito' using errcode='22023';
 end if;
 if p_changes ? 'applies_to' then
  next_target:=nullif(p_changes->>'applies_to','')::uuid;
  if next_target is not null then
   if inv.voucher_type not in (2,3,7,8,12,13) then raise exception 'Solo las notas de crédito o débito se vinculan con una factura' using errcode='22023'; end if;
   select * into target from public.retail_purchase_invoices where store_id=p_store and id=next_target;
   if not found or target.id=inv.id then raise exception 'La factura elegida no está disponible' using errcode='22023'; end if;
   if target.voucher_type not in (1,6,11,51) or target.issuer_cuit<>inv.issuer_cuit then
    raise exception 'Elegí una factura del mismo proveedor' using errcode='22023';
   end if;
   if inv.voucher_type in (3,8,13) then
    select coalesce(sum(total),0) into linked from public.retail_purchase_invoices
     where store_id=p_store and applies_to=next_target and voucher_type in (3,8,13) and id<>inv.id;
    if linked+inv.total+coalesce((select sum(a.amount) from public.retail_supplier_payment_allocations a where a.invoice_id=next_target),0)>target.total+0.05 then
     raise exception 'Las notas de crédito y los pagos aplicados superarían el total de la factura' using errcode='22023';
    end if;
   end if;
  end if;
 end if;
 update public.retail_purchase_invoices set
  due_date=next_due,
  review_reason=next_reason,
  reviewed_by=case when next_reason is distinct from inv.review_reason then case when next_reason is null then null else auth.uid() end else reviewed_by end,
  reviewed_at=case when next_reason is distinct from inv.review_reason then case when next_reason is null then null else now() end else reviewed_at end,
  accepted_by=case when coalesce((p_changes->>'accept')::boolean,false) and accepted_at is null then auth.uid() else accepted_by end,
  accepted_at=case when coalesce((p_changes->>'accept')::boolean,false) and accepted_at is null then now() else accepted_at end,
  applies_to=next_target
 where id=inv.id
 returning * into result;
 return result;
end $$;

revoke all on function public.retail_save_supplier_payment(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_apply_supplier_payment(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_void_supplier_payment(uuid,uuid,text) from public,anon;
grant execute on function public.retail_save_supplier_payment(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_apply_supplier_payment(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_void_supplier_payment(uuid,uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
