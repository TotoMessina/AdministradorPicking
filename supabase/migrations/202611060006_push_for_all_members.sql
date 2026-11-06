-- Push para todas las personas del comercio, no solo dueños y administradores.
-- Cajeros y supervisores pueden activar avisos en su dispositivo, pero solo reciben los avisos de la plataforma
-- (y la prueba): stock bajo y cierres de caja siguen siendo solo para dueños y administradores, en el alta,
-- en la cola (enqueue_push, sin cambios) y en el despacho (retail_claim_push).
begin;

-- Misma definición de 202610140001: cualquier miembro puede registrar su dispositivo; para quien no administra
-- se guardan desactivados los avisos del comercio.
create or replace function public.retail_save_push(p_store uuid,p_endpoint text,p_p256dh text,p_auth text,
 p_low_stock boolean,p_shift_closed boolean) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_old public.retail_push_subscriptions; v_manager boolean;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
  raise exception 'No tenés acceso a este comercio';
 end if;
 v_manager := retail_private.role_for(p_store) in ('owner','admin');
 -- Only real browser push services, never arbitrary URLs or internal hosts.
 if p_endpoint !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
  or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$'
  or p_endpoint is null or p_p256dh is null or p_auth is null then raise exception 'Suscripción push inválida'; end if;
 -- Serialize enrollment per endpoint and user (also bounds device count).
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_endpoint,1));
 select * into v_old from public.retail_push_subscriptions where endpoint=p_endpoint for update;
 if (v_old.id is null or v_old.user_id<>auth.uid()) and (select count(*) from public.retail_push_subscriptions where user_id=auth.uid())>=20 then
  raise exception 'Alcanzaste el máximo de 20 dispositivos';
 end if;
 if v_old.id is not null and (v_old.user_id<>auth.uid() or v_old.store_id<>p_store) then
  -- Account/store changes invalidate queued messages from the previous recipient.
  delete from public.retail_push_subscriptions where id=v_old.id;
 end if;
 insert into public.retail_push_subscriptions(user_id,store_id,endpoint,p256dh,auth,low_stock,shift_closed)
 values(auth.uid(),p_store,p_endpoint,p_p256dh,p_auth,v_manager and coalesce(p_low_stock,false),v_manager and coalesce(p_shift_closed,false))
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,
 low_stock=excluded.low_stock,shift_closed=excluded.shift_closed,updated_at=now()
 returning id into v_id;
 return v_id;
end $$;

-- Cada persona ve la suscripción de su propio dispositivo.
drop policy own_device on public.retail_push_subscriptions;
create policy own_device on public.retail_push_subscriptions for select to authenticated
 using(user_id=auth.uid() and retail_private.role_for(store_id) is not null);

create or replace function public.retail_request_push_test(p_store uuid,p_endpoint text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare s public.retail_push_subscriptions; v_id uuid;
begin
 select * into s from public.retail_push_subscriptions where endpoint=p_endpoint and store_id=p_store
 and user_id=auth.uid() for update;
 if s.id is null or retail_private.role_for(p_store) is null then
  raise exception 'Activá los avisos de este comercio primero'; end if;
 if s.last_test_at>now()-interval '1 minute' then raise exception 'Esperá un minuto antes de repetir la prueba'; end if;
 update public.retail_push_subscriptions set last_test_at=now() where id=s.id;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 values(s.id,s.user_id,s.store_id,'test',gen_random_uuid()::text) returning id into v_id;
 return v_id;
end $$;

-- Misma definición de 202611060005: la prueba vale para cualquier miembro; stock y cierres, solo para quien administra.
create or replace function public.retail_claim_push(p_only uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 delete from public.retail_push_deliveries where created_at<now()-interval '7 days';
 with candidates as (
  select d.id from public.retail_push_deliveries d where d.sent_at is null and d.attempts<5
  and d.available_at<=now() and d.created_at>now()-interval '24 hours'
  and (d.locked_at is null or d.locked_at<now()-interval '2 minutes')
  and (p_only is null or d.id=p_only) order by d.created_at for update skip locked limit 100
 ), claimed as (
  update public.retail_push_deliveries d set attempts=d.attempts+1,locked_at=now(),lease=gen_random_uuid()
  from candidates c where d.id=c.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object(
  'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
  'title',a.title,'body',a.body,
  'authorized',s.user_id=c.user_id and s.store_id=c.store_id and (
   (c.kind='platform' and a.id is not null and a.canceled_at is null and a.ends_at>now())
   or (c.kind='test' and exists(select 1 from public.retail_members m where m.store_id=c.store_id and m.user_id=c.user_id))
   or (c.kind in ('low_stock','shift_closed') and exists(select 1 from public.retail_members m where m.store_id=c.store_id and m.user_id=c.user_id and m.role in ('owner','admin'))
    and ((c.kind='low_stock' and s.low_stock) or (c.kind='shift_closed' and s.shift_closed))))
  )), '[]'::jsonb) into result from claimed c join public.retail_push_subscriptions s on s.id=c.subscription_id
  left join retail_private.platform_announcements a on a.id=c.announcement_id;
 return result;
end $$;

notify pgrst, 'reload schema';
commit;
