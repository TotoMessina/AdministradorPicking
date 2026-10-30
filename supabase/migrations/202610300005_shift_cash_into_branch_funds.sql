begin;
-- Un cierre puede dejar menos efectivo que la apertura: el saldo refleja ese faltante en vez de impedir el cierre.
-- Los movimientos manuales siguen rechazando sacar más de lo disponible.
alter table public.retail_location_funds drop constraint if exists retail_location_funds_balance_check;
alter table public.retail_location_funds drop constraint if exists retail_location_funds_balance_valid;
alter table public.retail_location_funds add constraint retail_location_funds_balance_valid check(balance::text not in ('NaN','Infinity','-Infinity'));

alter table public.retail_fund_transfers add column if not exists shift_id uuid;
alter table public.retail_fund_transfers drop constraint if exists retail_fund_transfers_shift_fkey;
alter table public.retail_fund_transfers add constraint retail_fund_transfers_shift_fkey foreign key(store_id,shift_id) references public.retail_shifts(store_id,id);

-- Lo generado por el turno: efectivo contado menos el efectivo con que abrió. Cubre cierres en línea y sin conexión.
create or replace function retail_private.shift_cash_to_fund() returns trigger language plpgsql security definer set search_path='' as $$
declare v_branch uuid; v_register text; delta numeric;
begin
 if old.closed_at is not null or new.closed_at is null or new.counted_cash is null then return new; end if;
 delta:=new.counted_cash-new.opening_cash;
 if delta=0 then return new; end if;
 select branch_id,name into v_branch,v_register from public.retail_registers where store_id=new.store_id and id=new.register_id;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||new.store_id::text,0));
 insert into public.retail_location_funds(store_id,location) values(new.store_id,v_branch::text) on conflict do nothing;
 update public.retail_location_funds set balance=balance+delta where store_id=new.store_id and location=v_branch::text;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email,shift_id)
 values(gen_random_uuid(),new.store_id,case when delta<0 then v_branch::text end,case when delta>0 then v_branch::text end,abs(delta),
  left('Cierre de turno · '||coalesce(v_register,'Caja'),1000),coalesce(new.closed_by,new.opened_by),auth.jwt()->>'email',new.id);
 return new;
end $$;
revoke all on function retail_private.shift_cash_to_fund() from public,anon,authenticated;
drop trigger if exists retail_shift_cash_to_fund on public.retail_shifts;
create trigger retail_shift_cash_to_fund after update of closed_at on public.retail_shifts for each row execute function retail_private.shift_cash_to_fund();

-- Efectivo de turnos abiertos por sucursal. Solo administración: el arqueo sigue a ciegas para quien cobra.
create or replace function public.retail_open_shift_cash(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return '[]'::jsonb; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('location',t.branch_id::text,'cash',t.cash,'shifts',t.shifts)),'[]'::jsonb) from (
  select r.branch_id,count(*) as shifts,sum(s.opening_cash
   +coalesce((select sum(x.cash_amount) from public.retail_sales x where x.shift_id=s.id),0)
   +coalesce((select sum(case when m.type='INGRESO' then m.amount else -m.amount end) from public.retail_movements m where m.shift_id=s.id),0)) as cash
  from public.retail_shifts s join public.retail_registers r on r.store_id=s.store_id and r.id=s.register_id
  where s.store_id=p_store and s.closed_at is null group by r.branch_id
 ) t);
end $$;
revoke all on function public.retail_open_shift_cash(uuid) from public,anon;
grant execute on function public.retail_open_shift_cash(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
