begin;

-- Forward correction for environments that already applied ledger routing.
-- Keep the RPC contract, authorization and audit/idempotency behavior intact.
create or replace function public.retail_move_sale_ledger(p_store uuid,p_sale uuid,p_target uuid,p_expected uuid,p_request uuid)
returns public.retail_sales language plpgsql security definer set search_path='' as $$
declare s public.retail_sales; destination public.retail_ledgers; previous public.retail_sale_ledger_changes; actor_role text;
begin
 if p_store is null or p_sale is null or p_target is null or p_expected is null or p_request is null then raise exception 'Faltan datos para cambiar el registro'; end if;
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
 -- Both the audit's source and destination foreign keys need ledger row locks.
 -- Taking them together, in UUID order, avoids a cycle with configuration saves.
 perform id from public.retail_ledgers where store_id=p_store and id in (s.ledger_id,p_target) order by id for share;
 select * into destination from public.retail_ledgers where store_id=p_store and id=p_target and active for share;
 if not found then raise exception 'El registro de destino ya no está activo'; end if;
 if s.ledger_id=p_target then return s; end if;
 if s.ledger_id is distinct from p_expected then raise exception 'La venta cambió de registro en otro dispositivo. Actualizá y volvé a elegir'; end if;
 insert into public.retail_sale_ledger_changes(id,store_id,sale_id,from_ledger,to_ledger,from_name,to_name,changed_by)
 values(p_request,p_store,p_sale,s.ledger_id,p_target,s.ledger_name,destination.name,auth.uid());
 update public.retail_sales set ledger_id=p_target,ledger_name=destination.name where id=p_sale returning * into s;
 return s;
end $$;
revoke all on function public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) to authenticated;

commit;
