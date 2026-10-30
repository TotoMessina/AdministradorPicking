begin;

-- Lo que queda a favor de un pago debe poder aplicarse a un comprobante que ese pago ya cubrió en parte
-- (un proveedor con una sola factura dejaba el anticipo sin destino). Las aplicaciones se acumulan.
create or replace function retail_private.allocate_supplier_payment(p_store uuid,p_payment uuid,p_cuit text,p_available numeric,p_allocations jsonb) returns numeric
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
  insert into public.retail_supplier_payment_allocations(payment_id,invoice_id,store_id,amount) values(p_payment,invoice.id,p_store,value)
   on conflict(payment_id,invoice_id) do update set amount=public.retail_supplier_payment_allocations.amount+excluded.amount;
  used:=used+value;
 end loop;
 if used>p_available+0.005 then raise exception 'Lo aplicado supera el importe disponible del pago' using errcode='22023'; end if;
 return used;
end $$;

create or replace function public.retail_apply_supplier_payment(p_store uuid,p_id uuid,p_allocations jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare pay public.retail_supplier_payments; used numeric;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into pay from public.retail_supplier_payments where store_id=p_store and id=p_id for update;
 if not found or pay.voided_at is not null then raise exception 'El pago ya no está disponible. Actualizá los datos'; end if;
 select coalesce(sum(a.amount),0) into used from public.retail_supplier_payment_allocations a where a.payment_id=p_id;
 perform retail_private.allocate_supplier_payment(p_store,p_id,pay.issuer_cuit,pay.amount+pay.ret_vat+pay.ret_income+pay.ret_iibb+pay.ret_suss-used,p_allocations);
end $$;

notify pgrst,'reload schema';
commit;
