-- Recibos de los movimientos de plata: cada ingreso o retiro de caja y cada ingreso, salida o envío entre fondos y
-- cuentas recibe un número correlativo por comercio y por serie (recibo de ingreso, recibo de pago, constancia de
-- movimiento entre cuentas). Lo asigna la base al guardar, así vale también para lo sincronizado sin conexión.
-- No es un comprobante fiscal. Los movimientos anteriores quedan sin número; los cierres automáticos de caja tampoco
-- llevan número porque ya están en el arqueo.
begin;

create table public.retail_receipt_counters (
 store_id uuid not null references public.retail_stores(id),
 series text not null check(series in ('income','payment','transfer')),
 last_number bigint not null default 0 check(last_number>=0),
 primary key(store_id,series)
);
alter table public.retail_receipt_counters enable row level security;
revoke all on public.retail_receipt_counters from public,anon,authenticated;

alter table public.retail_movements add column receipt_number bigint check(receipt_number is null or receipt_number>0);
alter table public.retail_fund_transfers add column receipt_number bigint check(receipt_number is null or receipt_number>0);
create unique index retail_movements_receipt on public.retail_movements(store_id,type,receipt_number) where receipt_number is not null;
create unique index retail_fund_transfers_receipt on public.retail_fund_transfers(store_id,(case when from_location is null then 'income' when to_location is null then 'payment' else 'transfer' end),receipt_number) where receipt_number is not null;

-- Siguiente número de la serie. La fila del contador queda bloqueada hasta el fin de la transacción: dos movimientos
-- simultáneos no repiten número, y si la operación falla el número no se consume.
create function retail_private.next_receipt_number(p_store uuid,p_series text) returns bigint
language sql security definer set search_path='' as $$
 insert into public.retail_receipt_counters(store_id,series,last_number) values(p_store,p_series,1)
 on conflict(store_id,series) do update set last_number=public.retail_receipt_counters.last_number+1
 returning last_number;
$$;
revoke all on function retail_private.next_receipt_number(uuid,text) from public,anon,authenticated;

create function retail_private.number_movement_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 new.receipt_number:=retail_private.next_receipt_number(new.store_id,case when new.type='INGRESO' then 'income' else 'payment' end);
 return new;
end $$;
revoke all on function retail_private.number_movement_receipt() from public,anon,authenticated;
create trigger retail_movements_receipt before insert on public.retail_movements
 for each row execute function retail_private.number_movement_receipt();

create function retail_private.number_fund_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.shift_id is not null then new.receipt_number:=null; return new; end if;
 new.receipt_number:=retail_private.next_receipt_number(new.store_id,
  case when new.from_location is null then 'income' when new.to_location is null then 'payment' else 'transfer' end);
 return new;
end $$;
revoke all on function retail_private.number_fund_receipt() from public,anon,authenticated;
create trigger retail_fund_transfers_receipt before insert on public.retail_fund_transfers
 for each row execute function retail_private.number_fund_receipt();

-- Igual que 202610190001, con el número de recibo para imprimirlo desde la caja.
drop function public.retail_movement_details(uuid,uuid);
create function public.retail_movement_details(p_store uuid,p_shift uuid)
returns table(id uuid,type text,amount numeric,reason text,created_at timestamptz,category text,voucher_url text,supplier_name text,receipt_number bigint,actor_email text)
language plpgsql stable security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or not exists(select 1 from public.retail_shifts s where s.id=p_shift and s.store_id=p_store
  and (v_role in ('owner','admin') or s.opened_by=auth.uid())) then raise exception 'Sin acceso a este turno'; end if;
 return query select m.id,m.type,m.amount,m.reason,m.created_at,m.category,
  case when v_role in ('owner','admin') then m.voucher_url else null::text end,m.supplier_name,m.receipt_number,u.email::text
 from public.retail_movements m left join auth.users u on u.id=m.created_by
 where m.store_id=p_store and m.shift_id=p_shift
 and (v_role in ('owner','admin') or m.created_by=auth.uid());
end $$;
revoke all on function public.retail_movement_details(uuid,uuid) from public,anon;
grant execute on function public.retail_movement_details(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
