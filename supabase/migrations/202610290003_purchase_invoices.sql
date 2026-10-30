begin;

-- Comprobantes de compra: cabecera fiscal para el contador. Independiente del stock:
-- registrar, corregir o borrar un comprobante no cambia productos, costos ni existencias.
create table public.retail_purchase_invoices (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id),
 supplier_id uuid references public.retail_suppliers(id) on delete set null,
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 issuer_cuit text not null check(retail_private.valid_cuit(issuer_cuit)),
 receiver_cuit text check(receiver_cuit is null or retail_private.valid_cuit(receiver_cuit)),
 voucher_type smallint not null check(voucher_type between 1 and 999),
 point_of_sale integer not null check(point_of_sale between 1 and 99999),
 number bigint not null check(number between 1 and 99999999),
 issue_date date not null,
 authorization_type text check(authorization_type in ('E','A')),
 authorization_code text check(authorization_code ~ '^[0-9]{14}$'),
 net_21 numeric(16,2) not null default 0 check(net_21>=0),
 vat_21 numeric(16,2) not null default 0 check(vat_21>=0),
 net_10_5 numeric(16,2) not null default 0 check(net_10_5>=0),
 vat_10_5 numeric(16,2) not null default 0 check(vat_10_5>=0),
 net_27 numeric(16,2) not null default 0 check(net_27>=0),
 vat_27 numeric(16,2) not null default 0 check(vat_27>=0),
 untaxed numeric(16,2) not null default 0 check(untaxed>=0),
 internal_taxes numeric(16,2) not null default 0 check(internal_taxes>=0),
 vat_perceptions numeric(16,2) not null default 0 check(vat_perceptions>=0),
 iibb_perceptions numeric(16,2) not null default 0 check(iibb_perceptions>=0),
 other_taxes numeric(16,2) not null default 0 check(other_taxes>=0),
 total numeric(16,2) not null check(total>0),
 -- Calculado al guardar: IVA por alícuota y suma de conceptos contra el total (±$0,05).
 balanced boolean not null,
 qr_verified boolean not null default false,
 notes text check(notes is null or length(notes)<=300),
 created_by uuid not null references auth.users(id),
 actor_email text,
 created_at timestamptz not null default now(),
 unique(store_id,issuer_cuit,voucher_type,point_of_sale,number)
);
create index retail_purchase_invoice_period on public.retail_purchase_invoices(store_id,issue_date desc,id);

alter table public.retail_purchase_invoices enable row level security;
create policy authorized_read on public.retail_purchase_invoices for select to authenticated
 using(retail_private.has_permission(store_id,'manage_products'));
revoke all on public.retail_purchase_invoices from public,anon,authenticated;
grant select on public.retail_purchase_invoices to authenticated;

-- p_request es el id del comprobante: reintentar con los mismos datos devuelve el mismo registro.
create function public.retail_save_purchase_invoice(p_store uuid,p_request uuid,p_invoice jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.retail_purchase_invoices; duplicate public.retail_purchase_invoices; inv public.retail_purchase_invoices;
 amounts text[]:=array['net_21','vat_21','net_10_5','vat_10_5','net_27','vat_27','untaxed','internal_taxes','vat_perceptions','iibb_perceptions','other_taxes','total'];
 field text; value numeric; supplier uuid; sum_parts numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if p_request is null or jsonb_typeof(p_invoice)<>'object' then raise exception 'Datos del comprobante incompletos' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into previous from public.retail_purchase_invoices where id=p_request;
 if found then
  if previous.store_id<>p_store then raise exception 'La solicitud corresponde a otro comercio'; end if;
  return previous.id;
 end if;
 foreach field in array amounts loop
  begin value:=coalesce((p_invoice->>field)::numeric,0);
  exception when others then raise exception 'Revisá el importe %', field using errcode='22023'; end;
  if value<0 or value::text in ('NaN','Infinity','-Infinity') or round(value,2)<>value or value>99999999999999 then
   raise exception 'Revisá el importe %: usá montos positivos con hasta dos decimales', field using errcode='22023';
  end if;
 end loop;
 if nullif(p_invoice->>'supplier_id','') is not null then
  select id into supplier from public.retail_suppliers where store_id=p_store and id=(p_invoice->>'supplier_id')::uuid;
 end if;
 begin
  inv:=jsonb_populate_record(null::public.retail_purchase_invoices,p_invoice);
 exception when others then raise exception 'Revisá tipo, punto de venta, número y fecha del comprobante' using errcode='22023';
 end;
 if inv.issuer_cuit is null or not retail_private.valid_cuit(inv.issuer_cuit) then raise exception 'El CUIT del proveedor no es válido' using errcode='22023'; end if;
 if inv.receiver_cuit is not null and not retail_private.valid_cuit(inv.receiver_cuit) then raise exception 'El CUIT del receptor no es válido' using errcode='22023'; end if;
 if inv.voucher_type is null or inv.point_of_sale is null or inv.number is null or inv.issue_date is null then
  raise exception 'Completá tipo, punto de venta, número y fecha del comprobante' using errcode='22023';
 end if;
 if coalesce(inv.total,0)<=0 then raise exception 'Completá el total del comprobante' using errcode='22023'; end if;
 select * into duplicate from public.retail_purchase_invoices d where d.store_id=p_store and d.issuer_cuit=inv.issuer_cuit
  and d.voucher_type=inv.voucher_type and d.point_of_sale=inv.point_of_sale and d.number=inv.number;
 if found then
  raise exception 'Este comprobante ya se registró el % (proveedor %)', to_char(duplicate.created_at at time zone 'America/Argentina/Buenos_Aires','DD/MM/YYYY'), duplicate.supplier_name using errcode='23505';
 end if;
 sum_parts:=coalesce(inv.net_21,0)+coalesce(inv.vat_21,0)+coalesce(inv.net_10_5,0)+coalesce(inv.vat_10_5,0)+coalesce(inv.net_27,0)+coalesce(inv.vat_27,0)
  +coalesce(inv.untaxed,0)+coalesce(inv.internal_taxes,0)+coalesce(inv.vat_perceptions,0)+coalesce(inv.iibb_perceptions,0)+coalesce(inv.other_taxes,0);
 insert into public.retail_purchase_invoices(
  id,store_id,supplier_id,supplier_name,issuer_cuit,receiver_cuit,voucher_type,point_of_sale,number,issue_date,authorization_type,authorization_code,
  net_21,vat_21,net_10_5,vat_10_5,net_27,vat_27,untaxed,internal_taxes,vat_perceptions,iibb_perceptions,other_taxes,total,
  balanced,qr_verified,notes,created_by,actor_email)
 values(p_request,p_store,supplier,btrim(coalesce(inv.supplier_name,'')),inv.issuer_cuit,inv.receiver_cuit,inv.voucher_type,inv.point_of_sale,inv.number,inv.issue_date,
  inv.authorization_type,nullif(inv.authorization_code,''),
  coalesce(inv.net_21,0),coalesce(inv.vat_21,0),coalesce(inv.net_10_5,0),coalesce(inv.vat_10_5,0),coalesce(inv.net_27,0),coalesce(inv.vat_27,0),
  coalesce(inv.untaxed,0),coalesce(inv.internal_taxes,0),coalesce(inv.vat_perceptions,0),coalesce(inv.iibb_perceptions,0),coalesce(inv.other_taxes,0),inv.total,
  abs(sum_parts-inv.total)<=0.05 and abs(coalesce(inv.net_21,0)*0.21-coalesce(inv.vat_21,0))<=0.05
   and abs(coalesce(inv.net_10_5,0)*0.105-coalesce(inv.vat_10_5,0))<=0.05 and abs(coalesce(inv.net_27,0)*0.27-coalesce(inv.vat_27,0))<=0.05,
  coalesce(inv.qr_verified,false),nullif(btrim(coalesce(inv.notes,'')),''),auth.uid(),auth.jwt()->>'email');
 return p_request;
end $$;

create function public.retail_delete_purchase_invoice(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 delete from public.retail_purchase_invoices where store_id=p_store and id=p_id;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
end $$;

revoke all on function public.retail_save_purchase_invoice(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_delete_purchase_invoice(uuid,uuid) from public,anon;
grant execute on function public.retail_save_purchase_invoice(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_delete_purchase_invoice(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
