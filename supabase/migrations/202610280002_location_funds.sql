begin;

-- Funds are separate from shifts, cash movements, sales and expected cash.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;

create table public.retail_location_funds (
 store_id uuid not null references public.retail_stores(id), location text not null,
 balance numeric(16,2) not null default 0 check(balance>=0 and balance::text not in ('NaN','Infinity','-Infinity')),
 primary key(store_id,location),
 check(location='depot' or location ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);
create table public.retail_fund_transfers (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 from_location text, to_location text, amount numeric(16,2) not null check(amount>0 and amount::text<>'NaN'),
 note text not null check(length(btrim(note)) between 1 and 1000),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 check(from_location is not null or to_location is not null),
 check(from_location is null or to_location is null or from_location<>to_location),
 foreign key(store_id,from_location) references public.retail_location_funds(store_id,location),
 foreign key(store_id,to_location) references public.retail_location_funds(store_id,location)
);
create index retail_fund_transfer_history on public.retail_fund_transfers(store_id,created_at desc,id);
alter table public.retail_location_funds enable row level security;
alter table public.retail_fund_transfers enable row level security;
create policy authorized_read on public.retail_location_funds for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
create policy authorized_read on public.retail_fund_transfers for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
revoke all on public.retail_location_funds,public.retail_fund_transfers from public,anon,authenticated;
grant select on public.retail_location_funds,public.retail_fund_transfers to authenticated;

create function public.retail_move_location_funds(p_store uuid,p_from text,p_to text,p_amount numeric,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_fund_transfers; loc text; source_balance numeric; target_balance numeric;
 note text:=btrim(p_note);
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
 -- Serialize account updates, including first-use rows. No negative source balances.
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
 if p_to is not null then
  select balance into target_balance from public.retail_location_funds where store_id=p_store and location=p_to for update;
  if target_balance+p_amount>999999999999.99 then raise exception 'El saldo resultante supera el límite permitido'; end if;
  update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=p_to;
 end if;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email)
 values(p_request,p_store,p_from,p_to,p_amount,note,auth.uid(),auth.jwt()->>'email');
 return p_request;
end $$;
revoke all on function public.retail_move_location_funds(uuid,text,text,numeric,text,uuid) from public,anon;
grant execute on function public.retail_move_location_funds(uuid,text,text,numeric,text,uuid) to authenticated;

create or replace function public.retail_management_locations(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not (retail_private.has_permission(p_store,'manage_locations') or retail_private.has_permission(p_store,'manage_staff') or retail_private.has_permission(p_store,'manage_transfers') or retail_private.has_permission(p_store,'manage_funds') or retail_private.has_permission(p_store,'manage_price_lists') or retail_private.has_permission(p_store,'review_remitos')) then raise exception 'Sin permiso para consultar esta configuración' using errcode='42501'; end if;
 return jsonb_build_object(
  'branches',(select coalesce(jsonb_agg(to_jsonb(b) order by b.name),'[]'::jsonb) from public.retail_branches b where b.store_id=p_store),
  'registers',(select coalesce(jsonb_agg(to_jsonb(r) order by r.name),'[]'::jsonb) from public.retail_registers r where r.store_id=p_store));
end $$;
notify pgrst,'reload schema';
commit;
