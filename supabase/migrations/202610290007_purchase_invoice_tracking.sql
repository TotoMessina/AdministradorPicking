begin;

-- Cuenta corriente, etapa B: vencimiento, revisión, aceptación de notas de débito y vínculo de notas
-- de crédito/débito con su factura. Los importes originales nunca se modifican.
alter table public.retail_purchase_invoices
 add column due_date date,
 add column review_reason text check(review_reason is null or length(btrim(review_reason)) between 1 and 300),
 add column reviewed_by uuid references auth.users(id),
 add column reviewed_at timestamptz,
 add column accepted_by uuid references auth.users(id),
 add column accepted_at timestamptz,
 add column applies_to uuid references public.retail_purchase_invoices(id) on delete set null,
 add check(applies_to is null or applies_to<>id),
 add check((accepted_at is null)=(accepted_by is null));
create index retail_purchase_invoice_applies_to on public.retail_purchase_invoices(applies_to) where applies_to is not null;

-- Vencimiento por defecto: emisión + plazo del proveedor (por id o, si no, por CUIT). Sin plazo: la emisión.
create function retail_private.default_purchase_due_date() returns trigger
language plpgsql set search_path='' as $$
declare days integer;
begin
 if new.due_date is null then
  select s.payment_days into days from public.retail_suppliers s
   where s.store_id=new.store_id and (s.id=new.supplier_id or (new.supplier_id is null and s.cuit=new.issuer_cuit))
   order by (s.id=new.supplier_id) desc limit 1;
  new.due_date:=new.issue_date+coalesce(days,0);
 end if;
 return new;
end $$;
create trigger retail_purchase_due_date before insert on public.retail_purchase_invoices
 for each row execute function retail_private.default_purchase_due_date();

update public.retail_purchase_invoices p set due_date=p.issue_date+coalesce(
 (select s.payment_days from public.retail_suppliers s where s.store_id=p.store_id and (s.id=p.supplier_id or (p.supplier_id is null and s.cuit=p.issuer_cuit))
  order by (s.id=p.supplier_id) desc limit 1),0);
alter table public.retail_purchase_invoices alter column due_date set not null,
 add check(due_date>=issue_date);

-- Tipos: facturas (1, 6, 11, 51), notas de débito (2, 7, 12) y de crédito (3, 8, 13).
create function public.retail_update_purchase_invoice_tracking(p_store uuid,p_id uuid,p_changes jsonb) returns public.retail_purchase_invoices
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
    if linked+inv.total>target.total+0.05 then
     raise exception 'Las notas de crédito vinculadas superarían el total de la factura' using errcode='22023';
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

revoke all on function retail_private.default_purchase_due_date() from public,anon,authenticated;
revoke all on function public.retail_update_purchase_invoice_tracking(uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_update_purchase_invoice_tracking(uuid,uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
