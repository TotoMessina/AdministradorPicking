begin;

alter table public.retail_ledgers add column payment_methods text[] not null default '{}'
 check(payment_methods <@ array['Efectivo','QR','Transferencia','Debito','Credito','Mixto']::text[]);
-- Each method has at most one destination per store, including direct inserts.
create unique index retail_ledger_cash_rule on public.retail_ledgers(store_id) where 'Efectivo'=any(payment_methods);
create unique index retail_ledger_qr_rule on public.retail_ledgers(store_id) where 'QR'=any(payment_methods);
create unique index retail_ledger_transfer_rule on public.retail_ledgers(store_id) where 'Transferencia'=any(payment_methods);
create unique index retail_ledger_debit_rule on public.retail_ledgers(store_id) where 'Debito'=any(payment_methods);
create unique index retail_ledger_credit_rule on public.retail_ledgers(store_id) where 'Credito'=any(payment_methods);
create unique index retail_ledger_mixed_rule on public.retail_ledgers(store_id) where 'Mixto'=any(payment_methods);

create function public.retail_save_ledger_routing(p_store uuid,p_default uuid,p_rules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede configurar los registros'; end if;
 perform 1 from public.retail_stores where id=p_store for update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=p_default and active) then raise exception 'Elegí un registro principal activo'; end if;
 if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Reglas inválidas'; end if;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   if entry.key not in ('Efectivo','QR','Transferencia','Debito','Credito','Mixto') or entry.value is null then raise exception 'Medio de pago inválido'; end if;
   if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=entry.value::uuid and active) then raise exception 'El registro elegido ya no está activo'; end if;
 end loop;
 update public.retail_ledgers set is_default=false,payment_methods='{}' where store_id=p_store;
 update public.retail_ledgers set is_default=true where store_id=p_store and id=p_default;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   update public.retail_ledgers set payment_methods=array_append(payment_methods,entry.key) where store_id=p_store and id=entry.value::uuid;
 end loop;
end $$;

-- Opt-in setup for existing stores: retain all other ledgers and historical sales.
create function public.retail_prepare_sales_ledgers(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare general_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede preparar los registros'; end if;
 perform 1 from public.retail_stores where id=p_store for update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 insert into public.retail_ledgers(store_id,name) values(p_store,'General'),(p_store,'Pruebas')
 on conflict(store_id,name) do update set active=true;
 select id into general_id from public.retail_ledgers where store_id=p_store and name='General';
 update public.retail_ledgers set is_default=false where store_id=p_store and is_default;
 update public.retail_ledgers set is_default=true where id=general_id;
end $$;

-- The same bootstrap as before; only the second new-store ledger's label changes.
create or replace function retail_private.initialize_location() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_branches(store_id,name,is_default) values(new.id,'Principal',true);
 insert into public.retail_ledgers(store_id,name,is_default) values(new.id,'General',true);
 insert into public.retail_ledgers(store_id,name) values(new.id,'Pruebas');
 return new;
end $$;

create table public.retail_sale_ledger_changes (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 sale_id uuid not null, from_ledger uuid not null, to_ledger uuid not null,
 from_name text not null, to_name text not null,
 changed_by uuid not null references auth.users(id), changed_at timestamptz not null default now(),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,from_ledger) references public.retail_ledgers(store_id,id),
 foreign key(store_id,to_ledger) references public.retail_ledgers(store_id,id)
);
create index retail_sale_ledger_history on public.retail_sale_ledger_changes(store_id,sale_id,changed_at,id);
alter table public.retail_sale_ledger_changes enable row level security;
revoke all on public.retail_sale_ledger_changes from public,anon,authenticated;
grant select on public.retail_sale_ledger_changes to authenticated;
create policy sale_ledger_history_read on public.retail_sale_ledger_changes for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or
 (retail_private.role_for(store_id)='cashier' and exists(select 1 from public.retail_sales s where s.id=sale_id and s.store_id=retail_sale_ledger_changes.store_id and s.created_by=auth.uid()))
);

create function public.retail_move_sale_ledger(p_store uuid,p_sale uuid,p_target uuid,p_expected uuid,p_request uuid)
returns public.retail_sales language plpgsql security definer set search_path='' as $$
declare s public.retail_sales; destination public.retail_ledgers; previous public.retail_sale_ledger_changes; actor_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 select * into s from public.retail_sales where store_id=p_store and id=p_sale;
 if s.id is null or actor_role is null or (actor_role='cashier' and s.created_by<>auth.uid()) then raise exception 'No tenés acceso a esta venta'; end if;
 select * into previous from public.retail_sale_ledger_changes where id=p_request;
 if found then
   if previous.store_id<>p_store or previous.sale_id<>p_sale or previous.to_ledger<>p_target or previous.from_ledger<>p_expected or previous.changed_by<>auth.uid() then raise exception 'La solicitud corresponde a otro cambio'; end if;
   return s;
 end if;
 if actor_role='cashier' then
   perform retail_private.check_shift(s.shift_id);
 else
   perform 1 from public.retail_shifts where id=s.shift_id for update;
 end if;
 select * into s from public.retail_sales where store_id=p_store and id=p_sale for update;
 select * into destination from public.retail_ledgers where store_id=p_store and id=p_target and active for share;
 if not found then raise exception 'El registro de destino ya no está activo'; end if;
 if s.ledger_id=p_target then return s; end if;
 if s.ledger_id is distinct from p_expected then raise exception 'La venta cambió de registro en otro dispositivo. Actualizá y volvé a elegir'; end if;
 insert into public.retail_sale_ledger_changes(id,store_id,sale_id,from_ledger,to_ledger,from_name,to_name,changed_by)
 values(p_request,p_store,p_sale,s.ledger_id,p_target,s.ledger_name,destination.name,auth.uid());
 update public.retail_sales set ledger_id=p_target,ledger_name=destination.name where id=p_sale returning * into s;
 return s;
end $$;
revoke all on function public.retail_save_ledger_routing(uuid,uuid,jsonb),public.retail_prepare_sales_ledgers(uuid),public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.retail_save_ledger_routing(uuid,uuid,jsonb),public.retail_prepare_sales_ledgers(uuid),public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) to authenticated;
commit;
