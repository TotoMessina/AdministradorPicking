-- Cuentas con saldo (banco, billetera virtual): se suman a los fondos de sucursal y depósito como una ubicación más
-- de Plata. Usan los mismos movimientos (ingreso, envío «en camino», salida) y el mismo historial.
-- Saldo de una cuenta = movimientos manuales (retail_location_funds.balance) + lo cobrado por los medios de pago que
-- tiene asignados mientras los tuvo: ventas por ese medio, menos devoluciones por ese medio, más cobros de fiado.
-- Las ventas no escriben nada nuevo: el saldo se calcula, así el cobro y el arqueo no cambian.
begin;

create table public.retail_money_accounts (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 80),
 kind text not null default 'bank' check(kind in ('bank','wallet','other')),
 active boolean not null default true,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(store_id,id)
);
create unique index retail_money_accounts_name on public.retail_money_accounts(store_id,lower(btrim(name))) where active;

-- Qué medio de pago cae en qué cuenta y desde cuándo. Reasignar un medio cierra el período anterior: lo cobrado
-- antes queda en la cuenta donde entró.
create table public.retail_money_account_methods (
 id uuid primary key default gen_random_uuid(), store_id uuid not null,
 account_id uuid not null, method text not null check(method in ('QR','Debito','Credito','Transferencia')),
 from_at timestamptz not null default now(), to_at timestamptz, check(to_at is null or to_at>=from_at),
 foreign key(store_id,account_id) references public.retail_money_accounts(store_id,id)
);
create unique index retail_money_account_methods_open on public.retail_money_account_methods(store_id,method) where to_at is null;
create index retail_money_account_methods_account on public.retail_money_account_methods(account_id);

alter table public.retail_money_accounts enable row level security;
alter table public.retail_money_account_methods enable row level security;
create policy funds_read on public.retail_money_accounts for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
create policy funds_read on public.retail_money_account_methods for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
revoke all on public.retail_money_accounts,public.retail_money_account_methods from public,anon,authenticated;
grant select on public.retail_money_accounts,public.retail_money_account_methods to authenticated;

-- Lo cobrado por los medios de la cuenta, con las mismas reglas que la conciliación.
create function retail_private.money_account_inflow(p_store uuid,p_account uuid) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sales s on s.store_id=m.store_id and s.created_at>=m.from_at and s.created_at<coalesce(m.to_at,'infinity'::timestamptz)
   cross join lateral jsonb_array_elements(s.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 - coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sale_returns r on r.store_id=m.store_id and r.created_at>=m.from_at and r.created_at<coalesce(m.to_at,'infinity'::timestamptz)
   cross join lateral jsonb_array_elements(r.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 + coalesce((select sum(-c.amount) from public.retail_money_account_methods m
   join public.retail_customer_movements c on c.store_id=m.store_id and c.kind='payment' and c.method=m.method
    and c.created_at>=m.from_at and c.created_at<coalesce(m.to_at,'infinity'::timestamptz)
   where m.store_id=p_store and m.account_id=p_account),0);
$$;
revoke all on function retail_private.money_account_inflow(uuid,uuid) from public,anon,authenticated;

create function retail_private.is_money_account(p_store uuid,p_location text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_money_accounts where store_id=p_store and id::text=p_location and active);
$$;
revoke all on function retail_private.is_money_account(uuid,text) from public,anon,authenticated;

-- Igual que 202611030001, con las cuentas como ubicación válida y su saldo calculado para controlar lo disponible.
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
  if loc<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=loc)
   and not retail_private.is_money_account(p_store,loc) then raise exception 'La ubicación no pertenece a este comercio'; end if;
  insert into public.retail_location_funds(store_id,location) values(p_store,loc) on conflict do nothing;
 end loop;
 if p_from is not null then
  select balance into source_balance from public.retail_location_funds where store_id=p_store and location=p_from for update;
  if retail_private.is_money_account(p_store,p_from) then source_balance:=source_balance+retail_private.money_account_inflow(p_store,p_from::uuid); end if;
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

-- Cuentas del comercio con su saldo: movimientos manuales más lo cobrado por sus medios.
create function public.retail_money_accounts_summary(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'kind',a.kind,
   'methods',coalesce((select jsonb_agg(m.method order by m.method) from public.retail_money_account_methods m where m.account_id=a.id and m.to_at is null),'[]'::jsonb),
   'manual',coalesce(f.balance,0),'inflow',retail_private.money_account_inflow(p_store,a.id),
   'balance',coalesce(f.balance,0)+retail_private.money_account_inflow(p_store,a.id)) order by lower(a.name))
  from public.retail_money_accounts a left join public.retail_location_funds f on f.store_id=a.store_id and f.location=a.id::text
  where a.store_id=p_store and a.active),'[]'::jsonb);
end $$;

-- Crear o editar una cuenta y qué medios de pago caen en ella. Un medio está en una sola cuenta a la vez.
create function public.retail_save_money_account(p_store uuid,p_id uuid,p_name text,p_kind text,p_methods text[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_name text:=btrim(p_name); v_methods text[]:=coalesce(p_methods,'{}'); v_method text; v_now timestamptz:=now();
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if p_id is null then raise exception 'Cuenta inválida'; end if;
 if v_name is null or length(v_name) not between 1 and 80 then raise exception 'Escribí un nombre de hasta 80 caracteres'; end if;
 if p_kind not in ('bank','wallet','other') then raise exception 'Tipo de cuenta inválido'; end if;
 if exists(select 1 from unnest(v_methods) m where m not in ('QR','Debito','Credito','Transferencia')) then raise exception 'Medio de pago inválido'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 if exists(select 1 from public.retail_money_accounts where id=p_id and store_id<>p_store) then raise exception 'Cuenta inválida'; end if;
 if exists(select 1 from public.retail_money_accounts where id=p_id and not active) then raise exception 'La cuenta está archivada'; end if;
 insert into public.retail_money_accounts(id,store_id,name,kind,created_by) values(p_id,p_store,v_name,p_kind,auth.uid())
 on conflict(id) do update set name=excluded.name,kind=excluded.kind;
 -- Medios que deja de tener esta cuenta.
 update public.retail_money_account_methods set to_at=v_now where store_id=p_store and account_id=p_id and to_at is null and method<>all(v_methods);
 foreach v_method in array v_methods loop
  if exists(select 1 from public.retail_money_account_methods where store_id=p_store and account_id=p_id and method=v_method and to_at is null) then continue; end if;
  -- El medio estaba en otra cuenta: desde ahora entra en esta.
  update public.retail_money_account_methods set to_at=v_now where store_id=p_store and method=v_method and to_at is null;
  insert into public.retail_money_account_methods(store_id,account_id,method,from_at) values(p_store,p_id,v_method,v_now);
 end loop;
 return p_id;
end $$;

-- Archivar una cuenta: solo con saldo cero, para no perder plata de vista. El historial se conserva.
create function public.retail_archive_money_account(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_balance numeric;
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 if not retail_private.is_money_account(p_store,p_id::text) then raise exception 'Cuenta no disponible'; end if;
 v_balance:=coalesce((select balance from public.retail_location_funds where store_id=p_store and location=p_id::text),0)+retail_private.money_account_inflow(p_store,p_id);
 if v_balance<>0 then raise exception 'La cuenta tiene saldo. Pasalo a otra cuenta o registrá la salida antes de archivarla'; end if;
 if exists(select 1 from public.retail_fund_transfers where store_id=p_store and status='in_transit' and (from_location=p_id::text or to_location=p_id::text)) then
  raise exception 'Hay envíos en camino con esta cuenta. Confirmalos o devolvelos antes de archivarla';
 end if;
 update public.retail_money_account_methods set to_at=now() where store_id=p_store and account_id=p_id and to_at is null;
 update public.retail_money_accounts set active=false where id=p_id;
end $$;

revoke all on function public.retail_money_accounts_summary(uuid),public.retail_save_money_account(uuid,uuid,text,text,text[]),public.retail_archive_money_account(uuid,uuid) from public,anon;
grant execute on function public.retail_money_accounts_summary(uuid),public.retail_save_money_account(uuid,uuid,text,text,text[]),public.retail_archive_money_account(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
