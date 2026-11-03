begin;
-- 1. Plata en camino: un envío entre ubicaciones sale del origen al enviarlo y entra al destino cuando
--    alguien confirma cuánto llegó. Si no llega, queda «en camino» para revisarlo o devolverlo al origen.
-- 2. Conciliación: lo que entró al banco por QR, tarjetas y transferencias contra lo vendido por esos medios,
--    con comisiones y retenciones. Ganancias resta las comisiones una sola vez, desde estas liquidaciones.
-- El arqueo del cajero no cambia: nada de esto se muestra a quien cobra.

alter table public.retail_fund_transfers
 add column status text not null default 'done' check(status in ('done','in_transit','received','returned')),
 add column received_amount numeric(16,2) check(received_amount is null or (received_amount>=0 and received_amount::text<>'NaN')),
 add column received_by uuid references auth.users(id), add column received_email text, add column received_at timestamptz,
 add column review_note text check(review_note is null or length(btrim(review_note)) between 1 and 1000),
 add constraint retail_fund_transfers_transit_route check(status='done' or (from_location is not null and to_location is not null)),
 add constraint retail_fund_transfers_review check((status in ('received','returned'))=(received_at is not null));
create index retail_fund_transfers_in_transit on public.retail_fund_transfers(store_id,created_at) where status='in_transit';

-- Entre dos ubicaciones queda en camino; ingresos y salidas externas siguen siendo inmediatos.
create or replace function public.retail_move_location_funds(p_store uuid,p_from text,p_to text,p_amount numeric,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_fund_transfers; loc text; source_balance numeric; target_balance numeric;
 note text:=btrim(p_note); v_transit boolean:=p_from is not null and p_to is not null;
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
  or p_amount<=0 or p_amount>999999999999.99 or round(p_amount,2)<>p_amount then raise exception 'Ingresá un importe positivo con hasta dos decimales'; end if;
 if note is null or length(note) not between 1 and 1000 then raise exception 'Escribí un motivo de hasta 1.000 caracteres'; end if;
 if (p_from is null and p_to is null) or p_from=p_to then raise exception 'Elegí un origen y un destino diferentes'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-request:'||p_request::text,0));
 select * into prior from public.retail_fund_transfers where id=p_request;
 if found then
  if prior.store_id<>p_store or prior.created_by<>auth.uid() or prior.from_location is distinct from p_from
   or prior.to_location is distinct from p_to or prior.amount<>p_amount or prior.note<>note then raise exception 'La solicitud corresponde a otro movimiento'; end if;
  return prior.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 foreach loc in array array[p_from,p_to] loop
  if loc is null then continue; end if;
  if loc<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=loc) then raise exception 'La ubicación no pertenece a este comercio'; end if;
  insert into public.retail_location_funds(store_id,location) values(p_store,loc) on conflict do nothing;
 end loop;
 if p_from is not null then
  select balance into source_balance from public.retail_location_funds where store_id=p_store and location=p_from for update;
  if source_balance<p_amount then raise exception 'El fondo de origen no tiene saldo suficiente. Actualizá los saldos'; end if;
  update public.retail_location_funds set balance=balance-p_amount where store_id=p_store and location=p_from;
 end if;
 if p_to is not null and not v_transit then
  select balance into target_balance from public.retail_location_funds where store_id=p_store and location=p_to for update;
  if target_balance+p_amount>999999999999.99 then raise exception 'El saldo resultante supera el límite permitido'; end if;
  update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=p_to;
 end if;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email,status)
 values(p_request,p_store,p_from,p_to,p_amount,note,auth.uid(),auth.jwt()->>'email',case when v_transit then 'in_transit' else 'done' end);
 return p_request;
end $$;

-- Confirmar lo que llegó. Si llegó menos, la diferencia queda registrada como faltante y exige una nota.
create function public.retail_receive_location_funds(p_store uuid,p_id uuid,p_amount numeric,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_transfer public.retail_fund_transfers; v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 select * into v_transfer from public.retail_fund_transfers where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Envío no disponible'; end if;
 if v_transfer.status='received' then return jsonb_build_object('id',p_id,'status','received','missing',v_transfer.amount-v_transfer.received_amount); end if;
 if v_transfer.status<>'in_transit' then raise exception 'Este envío ya no está en camino'; end if;
 if p_amount is null or p_amount<0 or p_amount>v_transfer.amount or round(p_amount,2)<>p_amount then raise exception 'Lo recibido debe estar entre 0 y lo enviado'; end if;
 if p_amount<v_transfer.amount and v_note is null then raise exception 'Llegó menos de lo enviado: escribí qué pasó'; end if;
 insert into public.retail_location_funds(store_id,location) values(p_store,v_transfer.to_location) on conflict do nothing;
 update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=v_transfer.to_location;
 update public.retail_fund_transfers set status='received',received_amount=p_amount,received_by=auth.uid(),received_email=auth.jwt()->>'email',received_at=now(),review_note=v_note where id=p_id;
 return jsonb_build_object('id',p_id,'status','received','missing',v_transfer.amount-p_amount);
end $$;

-- Si no llegó: vuelve entera al origen, con su motivo.
create function public.retail_return_location_funds(p_store uuid,p_id uuid,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare v_transfer public.retail_fund_transfers; v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if v_note is null then raise exception 'Escribí por qué vuelve al origen'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 select * into v_transfer from public.retail_fund_transfers where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Envío no disponible'; end if;
 if v_transfer.status='returned' then return; end if;
 if v_transfer.status<>'in_transit' then raise exception 'Este envío ya no está en camino'; end if;
 update public.retail_location_funds set balance=balance+v_transfer.amount where store_id=p_store and location=v_transfer.from_location;
 update public.retail_fund_transfers set status='returned',received_amount=0,received_by=auth.uid(),received_email=auth.jwt()->>'email',received_at=now(),review_note=v_note where id=p_id;
end $$;
revoke all on function public.retail_receive_location_funds(uuid,uuid,numeric,text),public.retail_return_location_funds(uuid,uuid,text) from public,anon;
grant execute on function public.retail_receive_location_funds(uuid,uuid,numeric,text),public.retail_return_location_funds(uuid,uuid,text) to authenticated;

-- Liquidaciones: lo que acreditó el banco o la billetera por un medio de pago, para un rango de días de venta.
create function retail_private.can_reconcile(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false) or retail_private.has_permission(p_store,'manage_funds');
$$;
revoke all on function retail_private.can_reconcile(uuid) from public,anon;
grant execute on function retail_private.can_reconcile(uuid) to authenticated;

create table public.retail_bank_deposits (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 method text not null check(method in ('QR','Debito','Credito','Transferencia')),
 provider text check(provider is null or length(btrim(provider)) between 1 and 80),
 deposited_on date not null, sales_from date not null, sales_to date not null,
 -- Lo que acreditaron, lo que cobraron de comisión y lo que retuvieron por impuestos.
 net numeric(16,2) not null check(net>=0 and net::text<>'NaN'),
 commission numeric(16,2) not null default 0 check(commission>=0 and commission::text<>'NaN'),
 taxes numeric(16,2) not null default 0 check(taxes>=0 and taxes::text<>'NaN'),
 reference text check(reference is null or length(reference)<=120), note text check(note is null or length(note)<=500),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 voided_at timestamptz, voided_by uuid references auth.users(id), void_reason text check(void_reason is null or length(btrim(void_reason)) between 1 and 300),
 check(sales_to>=sales_from and sales_to-sales_from<=93), check((voided_at is null)=(void_reason is null)), check(net+commission+taxes>0)
);
create index retail_bank_deposits_store on public.retail_bank_deposits(store_id,sales_to desc);
alter table public.retail_bank_deposits enable row level security;
create policy reconcilers_read on public.retail_bank_deposits for select to authenticated using(retail_private.can_reconcile(store_id));
revoke all on public.retail_bank_deposits from public,anon,authenticated;
grant select on public.retail_bank_deposits to authenticated;

create function public.retail_save_bank_deposit(p_store uuid,p_id uuid,p_deposit jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_bank_deposits; v_method text:=p_deposit->>'method';
 v_net numeric; v_commission numeric; v_taxes numeric; v_from date; v_to date; v_on date;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos de la liquidación incompletos'; end if;
 if v_method is null or v_method not in ('QR','Debito','Credito','Transferencia') then raise exception 'Elegí el medio de pago'; end if;
 if exists(select 1 from jsonb_each_text(p_deposit) e where e.key in ('net','commission','taxes') and e.value is not null and e.value<>'' and e.value!~'^[0-9]{1,13}(\.[0-9]{1,2})?$') then
  raise exception 'Revisá los importes';
 end if;
 v_net:=coalesce(nullif(p_deposit->>'net','')::numeric,0); v_commission:=coalesce(nullif(p_deposit->>'commission','')::numeric,0); v_taxes:=coalesce(nullif(p_deposit->>'taxes','')::numeric,0);
 if v_net+v_commission+v_taxes<=0 then raise exception 'Cargá lo acreditado'; end if;
 v_on:=nullif(p_deposit->>'deposited_on','')::date; v_from:=nullif(p_deposit->>'sales_from','')::date; v_to:=nullif(p_deposit->>'sales_to','')::date;
 if v_on is null or v_from is null or v_to is null or v_to<v_from or v_to-v_from>93 then raise exception 'Revisá las fechas: los días de venta pueden abarcar hasta tres meses'; end if;
 perform pg_advisory_xact_lock(hashtextextended('bank-deposit:'||p_id::text,0));
 select * into v_existing from public.retail_bank_deposits where id=p_id for update;
 if found then
  if v_existing.store_id<>p_store then raise exception 'El identificador ya corresponde a otro comercio'; end if;
  if v_existing.voided_at is not null then raise exception 'Esta liquidación está anulada'; end if;
  update public.retail_bank_deposits set method=v_method,provider=nullif(btrim(coalesce(p_deposit->>'provider','')),''),deposited_on=v_on,sales_from=v_from,sales_to=v_to,
   net=v_net,commission=v_commission,taxes=v_taxes,reference=nullif(btrim(coalesce(p_deposit->>'reference','')),''),note=nullif(btrim(coalesce(p_deposit->>'note','')),'') where id=p_id;
 else
  insert into public.retail_bank_deposits(id,store_id,method,provider,deposited_on,sales_from,sales_to,net,commission,taxes,reference,note,created_by,actor_email)
  values(p_id,p_store,v_method,nullif(btrim(coalesce(p_deposit->>'provider','')),''),v_on,v_from,v_to,v_net,v_commission,v_taxes,
   nullif(btrim(coalesce(p_deposit->>'reference','')),''),nullif(btrim(coalesce(p_deposit->>'note','')),''),auth.uid(),auth.jwt()->>'email');
 end if;
 return p_id;
end $$;

create function public.retail_void_bank_deposit(p_store uuid,p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 1 and 300 then raise exception 'Escribí por qué se anula'; end if;
 update public.retail_bank_deposits set voided_at=now(),voided_by=auth.uid(),void_reason=btrim(p_reason) where id=p_id and store_id=p_store and voided_at is null;
 if not found and not exists(select 1 from public.retail_bank_deposits where id=p_id and store_id=p_store) then raise exception 'Liquidación no disponible'; end if;
end $$;

-- Lo vendido por medio (pagos de ventas y cobros a clientes, menos devoluciones por ese medio) contra lo liquidado.
-- Se comparan las liquidaciones cuyos días de venta están dentro del período elegido.
create function public.retail_bank_reconciliation(p_store uuid,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return (with methods(method) as (values ('QR'),('Debito'),('Credito'),('Transferencia')),
  sold as (
   select x->>'method' as method,sum((x->>'amount')::numeric) as amount from public.retail_sales s cross join lateral jsonb_array_elements(s.payments) x
   where s.store_id=p_store and s.created_at>=v_from and s.created_at<v_to group by 1
  ), refunded as (
   select x->>'method' as method,sum((x->>'amount')::numeric) as amount from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.payments) x
   where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to group by 1
  ), collected as (
   select c.method,sum(-c.amount) as amount from public.retail_customer_movements c
   where c.store_id=p_store and c.kind='payment' and c.created_at>=v_from and c.created_at<v_to group by 1
  ), deposited as (
   select method,sum(net) as net,sum(commission) as commission,sum(taxes) as taxes,count(*) as deposits from public.retail_bank_deposits
   where store_id=p_store and voided_at is null and sales_from>=p_from and sales_to<=p_to group by 1
  )
  select jsonb_build_object('from',p_from,'to',p_to,
   'methods',(select jsonb_agg(jsonb_build_object('method',m.method,
     'sold',coalesce(s.amount,0)-coalesce(r.amount,0)+coalesce(c.amount,0),
     'net',coalesce(d.net,0),'commission',coalesce(d.commission,0),'taxes',coalesce(d.taxes,0),'deposits',coalesce(d.deposits,0),
     -- Diferencia: lo liquidado (acreditado + comisión + retenciones) menos lo vendido. Negativo: falta cobrar.
     'difference',coalesce(d.net,0)+coalesce(d.commission,0)+coalesce(d.taxes,0)-(coalesce(s.amount,0)-coalesce(r.amount,0)+coalesce(c.amount,0)))
    order by m.method) from methods m left join sold s on s.method=m.method left join refunded r on r.method=m.method
    left join collected c on c.method=m.method left join deposited d on d.method=m.method),
   'deposits',coalesce((select jsonb_agg(to_jsonb(b)-'store_id'-'created_by'-'voided_by' order by b.deposited_on desc,b.created_at desc) from public.retail_bank_deposits b
    where b.store_id=p_store and b.sales_to>=p_from and b.sales_from<=p_to),'[]'::jsonb)
  ));
end $$;

-- Ganancias: comisiones y retenciones de las liquidaciones acreditadas en el mes. Se toman solo de acá,
-- así que no hay que cargarlas también como gasto.
create function public.retail_month_commissions(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 return (with month as (
  select method,commission,taxes from public.retail_bank_deposits
  where store_id=p_store and voided_at is null and deposited_on>=first_day and deposited_on<(first_day+interval '1 month')::date
 ) select jsonb_build_object('commission',coalesce((select sum(commission) from month),0),'taxes',coalesce((select sum(taxes) from month),0),
   'deposits',(select count(*) from month),
   'by_method',coalesce((select jsonb_agg(jsonb_build_object('method',method,'commission',total) order by total desc)
    from (select method,sum(commission) as total from month group by method having sum(commission)>0) t),'[]'::jsonb)));
end $$;

revoke all on function public.retail_save_bank_deposit(uuid,uuid,jsonb),public.retail_void_bank_deposit(uuid,uuid,text),
 public.retail_bank_reconciliation(uuid,date,date),public.retail_month_commissions(uuid,date) from public,anon;
grant execute on function public.retail_save_bank_deposit(uuid,uuid,jsonb),public.retail_void_bank_deposit(uuid,uuid,text),
 public.retail_bank_reconciliation(uuid,date,date),public.retail_month_commissions(uuid,date) to authenticated;

notify pgrst,'reload schema';
commit;
