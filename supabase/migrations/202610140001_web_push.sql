-- Web Push: private device subscriptions and a durable delivery queue.
begin;
create table public.retail_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 20 and 2048),
 p256dh text not null, auth text not null,
 low_stock boolean not null default true, shift_closed boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_test_at timestamptz
);
create table public.retail_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.retail_push_subscriptions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 kind text not null check(kind in ('low_stock','shift_closed','test')),
 event_key text not null, created_at timestamptz not null default now(),
 available_at timestamptz not null default now(), attempts integer not null default 0,
 lease uuid, locked_at timestamptz, sent_at timestamptz, last_error text,
 unique(subscription_id,event_key)
);
create index on public.retail_push_subscriptions(store_id);
create index on public.retail_push_deliveries(available_at) where sent_at is null and attempts < 5;
alter table public.retail_push_subscriptions enable row level security;
alter table public.retail_push_deliveries enable row level security;
revoke all on public.retail_push_subscriptions,public.retail_push_deliveries from public,anon,authenticated;
grant select on public.retail_push_subscriptions to authenticated;
grant all on public.retail_push_subscriptions,public.retail_push_deliveries to service_role;
create policy own_device on public.retail_push_subscriptions for select to authenticated
 using(user_id=auth.uid() and retail_private.role_for(store_id) in ('owner','admin'));

create function public.retail_save_push(p_store uuid,p_endpoint text,p_p256dh text,p_auth text,
 p_low_stock boolean,p_shift_closed boolean) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_old public.retail_push_subscriptions;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo propietarios y administradores pueden activar estos avisos';
 end if;
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
 values(auth.uid(),p_store,p_endpoint,p_p256dh,p_auth,p_low_stock,p_shift_closed)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,
 low_stock=excluded.low_stock,shift_closed=excluded.shift_closed,updated_at=now()
 returning id into v_id;
 return v_id;
end $$;

create function public.retail_remove_push(p_endpoint text) returns void
 language sql security definer set search_path='' as $$
 delete from public.retail_push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();
$$;

create function public.retail_request_push_test(p_store uuid,p_endpoint text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare s public.retail_push_subscriptions; v_id uuid;
begin
 select * into s from public.retail_push_subscriptions where endpoint=p_endpoint and store_id=p_store
 and user_id=auth.uid() for update;
 if s.id is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Activá los avisos de este comercio primero'; end if;
 if s.last_test_at>now()-interval '1 minute' then raise exception 'Esperá un minuto antes de repetir la prueba'; end if;
 update public.retail_push_subscriptions set last_test_at=now() where id=s.id;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 values(s.id,s.user_id,s.store_id,'test',gen_random_uuid()::text) returning id into v_id;
 return v_id;
end $$;

create function retail_private.enqueue_push() returns trigger
 language plpgsql security definer set search_path='' as $$
declare v_kind text; v_key text;
begin
 if tg_table_name='retail_products' then
  if not new.active or new.stock>new.min_stock or (old.active and old.stock<=old.min_stock) then return new; end if;
  -- Group simultaneous low-stock crossings into one generic store notice per minute.
  v_kind:='low_stock'; v_key:='stock:'||new.store_id::text||':'||date_trunc('minute',now())::text;
 else
  if new.closed_at is null or old.closed_at is not null then return new; end if;
  v_kind:='shift_closed'; v_key:='shift:'||new.id::text;
 end if;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 select s.id,s.user_id,s.store_id,v_kind,v_key from public.retail_push_subscriptions s
 join public.retail_members m on m.store_id=s.store_id and m.user_id=s.user_id
 where s.store_id=new.store_id and m.role in ('owner','admin')
 and ((v_kind='low_stock' and s.low_stock) or (v_kind='shift_closed' and s.shift_closed))
 on conflict(subscription_id,event_key) do nothing;
 return new;
end $$;
create trigger retail_stock_push after update of stock,min_stock,active on public.retail_products
 for each row execute function retail_private.enqueue_push();
create trigger retail_shift_push after update of closed_at on public.retail_shifts
 for each row execute function retail_private.enqueue_push();

-- A short lease permits retries after worker failure without parallel claims.
create function public.retail_claim_push(p_only uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 delete from public.retail_push_deliveries where created_at<now()-interval '7 days';
 with candidates as (
  select d.id from public.retail_push_deliveries d where d.sent_at is null and d.attempts<5
  and d.available_at<=now() and d.created_at>now()-interval '24 hours'
  and (d.locked_at is null or d.locked_at<now()-interval '2 minutes')
  and (p_only is null or d.id=p_only) order by d.created_at for update skip locked limit 10
 ), claimed as (
  update public.retail_push_deliveries d set attempts=d.attempts+1,locked_at=now(),lease=gen_random_uuid()
  from candidates c where d.id=c.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object(
  'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
  'authorized',exists(select 1 from public.retail_members m where m.store_id=c.store_id and m.user_id=c.user_id and m.role in ('owner','admin'))
   and s.user_id=c.user_id and s.store_id=c.store_id
   and (c.kind='test' or (c.kind='low_stock' and s.low_stock) or (c.kind='shift_closed' and s.shift_closed))
  )), '[]'::jsonb) into result from claimed c join public.retail_push_subscriptions s on s.id=c.subscription_id;
 return result;
end $$;
revoke all on function retail_private.enqueue_push() from public,anon,authenticated;
revoke all on function public.retail_save_push(uuid,text,text,text,boolean,boolean),public.retail_remove_push(text),
 public.retail_request_push_test(uuid,text),public.retail_claim_push(uuid) from public,anon,authenticated;
grant execute on function public.retail_save_push(uuid,text,text,text,boolean,boolean),public.retail_remove_push(text),
 public.retail_request_push_test(uuid,text) to authenticated;
grant execute on function public.retail_claim_push(uuid) to service_role;
commit;
