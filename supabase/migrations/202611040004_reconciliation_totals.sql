-- La conciliación pasa a ser un informe para el contador: acumulado por medio de pago y sus movimientos.
-- Reemplaza retail_reconciliation_detail (202611040003) para devolver además los totales separados
-- (ventas, devoluciones, cobros de fiado) y aceptar un límite mayor al exportar. Mismas reglas y permiso.
-- Las liquidaciones ya cargadas (retail_bank_deposits) no se tocan.
begin;

drop function public.retail_reconciliation_detail(uuid,date,date,text);

create function public.retail_reconciliation_detail(p_store uuid,p_from date,p_to date,p_method text,p_limit integer default 2000) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz; v_limit integer:=least(greatest(coalesce(p_limit,2000),1),20000);
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 if p_method not in ('QR','Debito','Credito','Transferencia') then raise exception 'Medio de pago inválido'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return (with rows as (
  select 'sale' as kind,s.id,s.created_at as at,(x->>'amount')::numeric as amount,s.total,s.ticket_number,
   jsonb_array_length(s.payments)>1 as mixed,s.return_status,reg.name as register,u.email as actor,null::text as detail
  from public.retail_sales s cross join lateral jsonb_array_elements(s.payments) x
  left join public.retail_shifts sh on sh.id=s.shift_id left join public.retail_registers reg on reg.id=sh.register_id
  left join auth.users u on u.id=s.created_by
  where s.store_id=p_store and s.created_at>=v_from and s.created_at<v_to and x->>'method'=p_method
  union all
  select 'refund',r.id,r.created_at,-(x->>'amount')::numeric,r.total,s.ticket_number,false,r.kind,reg.name,r.actor_email,r.reason
  from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.payments) x
  join public.retail_sales s on s.id=r.sale_id
  left join public.retail_shifts sh on sh.id=s.shift_id left join public.retail_registers reg on reg.id=sh.register_id
  where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to and x->>'method'=p_method
  union all
  select 'collection',c.id,c.created_at,-c.amount,null,null,false,null,null,c.actor_email,k.name
  from public.retail_customer_movements c join public.retail_customers k on k.id=c.customer_id
  where c.store_id=p_store and c.kind='payment' and c.method=p_method and c.created_at>=v_from and c.created_at<v_to
 )
 select jsonb_build_object('method',p_method,'count',(select count(*) from rows),'total',coalesce((select sum(amount) from rows),0),
  'sales',coalesce((select sum(amount) from rows where kind='sale'),0),'sales_count',(select count(*) from rows where kind='sale'),
  'refunds',coalesce((select sum(amount) from rows where kind='refund'),0),'refunds_count',(select count(*) from rows where kind='refund'),
  'collections',coalesce((select sum(amount) from rows where kind='collection'),0),'collections_count',(select count(*) from rows where kind='collection'),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc) from (select * from rows order by at desc limit v_limit) r),'[]'::jsonb)));
end $$;
revoke all on function public.retail_reconciliation_detail(uuid,date,date,text,integer) from public,anon;
grant execute on function public.retail_reconciliation_detail(uuid,date,date,text,integer) to authenticated;

notify pgrst,'reload schema';
commit;
