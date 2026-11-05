-- Retiros y movimientos de plata para la conciliación y el informe del contador: de dónde sale cada retiro
-- (efectivo de una caja, fondo de una sucursal o del depósito, o una cuenta de banco o billetera) y adónde va.
-- Además, por cuenta, lo cobrado por sus medios en el período y su saldo actual. Solo lectura.
begin;

-- Lo cobrado por los medios de una cuenta entre dos momentos (mismas reglas que money_account_inflow).
create function retail_private.money_account_inflow_between(p_store uuid,p_account uuid,p_from timestamptz,p_to timestamptz) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sales s on s.store_id=m.store_id and s.created_at>=greatest(m.from_at,p_from) and s.created_at<least(coalesce(m.to_at,'infinity'::timestamptz),p_to)
   cross join lateral jsonb_array_elements(s.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 - coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sale_returns r on r.store_id=m.store_id and r.created_at>=greatest(m.from_at,p_from) and r.created_at<least(coalesce(m.to_at,'infinity'::timestamptz),p_to)
   cross join lateral jsonb_array_elements(r.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 + coalesce((select sum(-c.amount) from public.retail_money_account_methods m
   join public.retail_customer_movements c on c.store_id=m.store_id and c.kind='payment' and c.method=m.method
    and c.created_at>=greatest(m.from_at,p_from) and c.created_at<least(coalesce(m.to_at,'infinity'::timestamptz),p_to)
   where m.store_id=p_store and m.account_id=p_account),0);
$$;
revoke all on function retail_private.money_account_inflow_between(uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;

-- Nombre legible de una ubicación de plata, también de cuentas archivadas o sucursales eliminadas.
create function retail_private.fund_location_name(p_store uuid,p_location text) returns text
language sql stable security definer set search_path='' as $$
 select case when p_location is null then null when p_location='depot' then 'Depósito'
  else coalesce((select name from public.retail_branches where store_id=p_store and id::text=p_location),
   (select name from public.retail_money_accounts where store_id=p_store and id::text=p_location),'Ubicación anterior') end;
$$;
revoke all on function retail_private.fund_location_name(uuid,text) from public,anon,authenticated;

create function public.retail_money_movements_report(p_store uuid,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return jsonb_build_object(
  'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'kind',a.kind,'active',a.active,
    'methods',coalesce((select jsonb_agg(m.method order by m.method) from public.retail_money_account_methods m where m.account_id=a.id and m.to_at is null),'[]'::jsonb),
    'collected',retail_private.money_account_inflow_between(p_store,a.id,v_from,v_to),
    'balance',coalesce(f.balance,0)+retail_private.money_account_inflow(p_store,a.id)) order by a.active desc,lower(a.name))
   from public.retail_money_accounts a left join public.retail_location_funds f on f.store_id=a.store_id and f.location=a.id::text
   where a.store_id=p_store and (a.active or exists(select 1 from public.retail_fund_transfers t where t.store_id=p_store and t.created_at>=v_from and t.created_at<v_to
    and (t.from_location=a.id::text or t.to_location=a.id::text)))),'[]'::jsonb),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc) from (
   -- Retiros e ingresos dentro de un turno: siempre efectivo de esa caja.
   select 'shift' as origin,m.id,m.created_at as at,case when m.type='RETIRO' then 'withdrawal' else 'income' end as kind,
    case when m.type='RETIRO' then -m.amount else m.amount end as amount,
    case when m.type='RETIRO' then 'Efectivo · '||coalesce(reg.name,'Caja') end as source,
    case when m.type='INGRESO' then 'Efectivo · '||coalesce(reg.name,'Caja') end as destination,
    'cash' as source_kind,m.reason as note,m.category,m.supplier_name,u.email as actor,null::text as status
   from public.retail_movements m join public.retail_shifts sh on sh.id=m.shift_id left join public.retail_registers reg on reg.id=sh.register_id
   left join auth.users u on u.id=m.created_by
   where m.store_id=p_store and m.created_at>=v_from and m.created_at<v_to
   union all
   -- Movimientos de sucursales, depósito y cuentas. Los cierres de caja automáticos ya están en el arqueo.
   select 'fund',t.id,t.created_at,case when t.from_location is null then 'income' when t.to_location is null then 'withdrawal' else 'transfer' end,
    case when t.from_location is null then t.amount when t.to_location is null then -t.amount else t.amount end,
    retail_private.fund_location_name(p_store,t.from_location),retail_private.fund_location_name(p_store,t.to_location),
    case when exists(select 1 from public.retail_money_accounts a where a.store_id=p_store and a.id::text in (t.from_location,t.to_location)) then 'account' else 'fund' end,
    t.note,null,null,t.actor_email,t.status
   from public.retail_fund_transfers t
   where t.store_id=p_store and t.shift_id is null and t.created_at>=v_from and t.created_at<v_to
   order by 3 desc limit 5000) r),'[]'::jsonb));
end $$;
revoke all on function public.retail_money_movements_report(uuid,date,date) from public,anon;
grant execute on function public.retail_money_movements_report(uuid,date,date) to authenticated;

notify pgrst,'reload schema';
commit;
