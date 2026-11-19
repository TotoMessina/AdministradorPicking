-- Resumen impositivo del mes para el contador: IVA débito (ventas) y crédito (compras), percepciones sufridas
-- y base de Ingresos Brutos. Solo lectura; dueño o administrador. No reemplaza las declaraciones juradas.
begin;

create function public.retail_tax_summary(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
 v_store public.retail_stores; v_sales jsonb; v_unbilled jsonb; v_purchases jsonb; v_purchase_rates jsonb;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo la administración puede ver el resumen impositivo' using errcode='42501';
 end if;
 next_day:=(first_day+interval '1 month')::date;
 select * into v_store from public.retail_stores where id=p_store;

 -- Ventas facturadas en producción (CAE o CAEA) por fecha del comprobante. Las notas de crédito restan.
 -- Pedidos anteriores al desglose por alícuota: todo al 21%, como se informaron.
 with docs as (
  select a.*,case when a.return_id is null then 1 else -1 end as sign
  from public.retail_billing_attempts a
  where a.store_id=p_store and a.environment='prod' and a.status='authorized' and a.cbte_fch>=first_day and a.cbte_fch<next_day
 ), lines as (
  select d.sign,(l->>'id')::integer as id,(l->>'base')::numeric as base,(l->>'importe')::numeric as importe
  from docs d cross join lateral jsonb_array_elements(coalesce(nullif(d.iva,'[]'::jsonb),
   case when d.cbte_tipo in (1,3,6,8) and d.imp_iva>0 then jsonb_build_array(jsonb_build_object('id',5,'base',d.imp_neto,'importe',d.imp_iva)) else '[]'::jsonb end)) l
 )
 select jsonb_build_object(
  'invoices',(select count(*) from docs where sign=1),
  'credit_notes',(select count(*) from docs where sign=-1),
  'total',coalesce((select sum(sign*imp_total) from docs),0),
  'exempt',coalesce((select sum(sign*imp_op_ex) from docs where cbte_tipo in (1,3,6,8)),0),
  -- Factura C (monotributo): sin IVA discriminado.
  'without_vat',coalesce((select sum(sign*imp_total) from docs where cbte_tipo not in (1,3,6,8)),0),
  'by_rate',coalesce((select jsonb_agg(jsonb_build_object('id',id,'base',base,'vat',vat) order by id)
    from (select id,sum(sign*base) as base,sum(sign*importe) as vat from lines group by id) r),'[]'::jsonb))
 into v_sales;

 -- Ventas del mes sin factura de la app al día de hoy (no facturadas, pendientes o con error), neto de devoluciones.
 -- Para Responsable Inscripto se estima el neto sin IVA con el IVA actual de cada producto.
 with pending as (
  select s.id,s.items,s.total-coalesce(s.returned_total,0) as amount
  from public.retail_sales s
  where s.store_id=p_store and s.created_at>=first_day::timestamp at time zone zone and s.created_at<next_day::timestamp at time zone zone
   and s.billing_status<>'authorized' and coalesce(s.return_status,'none')<>'voided' and s.total-coalesce(s.returned_total,0)>0
 ), split as (
  select p.amount,case when v_store.condicion_iva='RI' then retail_private.vat_breakdown(p_store,p.items,p.amount) end as vat from pending p
 )
 select jsonb_build_object('count',count(*),'total',coalesce(sum(amount),0),
  'net_estimate',coalesce(sum(case when vat is null then amount else (vat->>'neto')::numeric+(vat->>'op_ex')::numeric end),0),
  'vat_estimate',coalesce(sum((vat->>'iva')::numeric),0))
 into v_unbilled from split;

 -- Compras por fecha de la factura del proveedor. Las notas de crédito (3, 8, 13, 53) restan.
 with docs as (
  select i.*,case when i.voucher_type in (3,8,13,53) then -1 else 1 end as sign
  from public.retail_purchase_invoices i where i.store_id=p_store and i.issue_date>=first_day and i.issue_date<next_day
 )
 select jsonb_build_object(
  'count',count(*),'unbalanced',count(*) filter (where not balanced),
  'total',coalesce(sum(sign*total),0),'untaxed',coalesce(sum(sign*untaxed),0),
  'internal_taxes',coalesce(sum(sign*internal_taxes),0),'other_taxes',coalesce(sum(sign*other_taxes),0),
  'vat_perceptions',coalesce(sum(sign*vat_perceptions),0),'iibb_perceptions',coalesce(sum(sign*iibb_perceptions),0)),
  jsonb_build_array(
   jsonb_build_object('id',5,'base',coalesce(sum(sign*net_21),0),'vat',coalesce(sum(sign*vat_21),0)),
   jsonb_build_object('id',4,'base',coalesce(sum(sign*net_10_5),0),'vat',coalesce(sum(sign*vat_10_5),0)),
   jsonb_build_object('id',6,'base',coalesce(sum(sign*net_27),0),'vat',coalesce(sum(sign*vat_27),0)))
 into v_purchases,v_purchase_rates from docs;

 return jsonb_build_object('month',to_char(first_day,'YYYY-MM'),'condicion_iva',v_store.condicion_iva,
  'sales',v_sales,'unbilled',v_unbilled,'purchases',v_purchases||jsonb_build_object('by_rate',v_purchase_rates),
  -- Facturas anteriores al registro de pedidos a ARCA: no entran en el resumen.
  'legacy_invoices',(select count(*) from public.retail_sales s where s.store_id=p_store and s.billing_status='authorized'
    and s.created_at>=first_day::timestamp at time zone zone and s.created_at<next_day::timestamp at time zone zone
    and not exists(select 1 from public.retail_billing_attempts a where a.sale_id=s.id and a.return_id is null and a.status='authorized')));
end $$;
revoke all on function public.retail_tax_summary(uuid,date) from public,anon;
grant execute on function public.retail_tax_summary(uuid,date) to authenticated;

notify pgrst,'reload schema';
commit;
