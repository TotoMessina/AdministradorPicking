-- Notificaciones push operativas:
-- 1. Diferencias en arqueo de caja (alerta ante faltantes o sobrantes al cerrar turno)
-- 2. Apertura de turno de caja (aviso de inicio de jornada con caja y sucursal)
-- 3. Traslados de mercadería (solicitud y confirmación entre locales y depósito)

begin;

-- Columnas de preferencias en retail_push_subscriptions
alter table public.retail_push_subscriptions
 add column if not exists shift_opened boolean not null default true,
 add column if not exists cash_difference boolean not null default true,
 add column if not exists transfers boolean not null default true;

-- Tipos permitidos y columnas de contenido en retail_push_deliveries
alter table public.retail_push_deliveries drop constraint if exists retail_push_deliveries_kind_check;
alter table public.retail_push_deliveries add constraint retail_push_deliveries_kind_check
 check (kind in ('low_stock', 'shift_closed', 'test', 'platform', 'shift_opened', 'cash_difference', 'transfer_pending', 'transfer_reviewed'));

alter table public.retail_push_deliveries
 add column if not exists title text,
 add column if not exists body text;

-- Guardado de suscripción con nuevas preferencias
create or replace function public.retail_save_push(
 p_store uuid, p_endpoint text, p_p256dh text, p_auth text,
 p_low_stock boolean, p_shift_closed boolean,
 p_shift_opened boolean, p_cash_difference boolean, p_transfers boolean
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 v_id uuid;
 v_old public.retail_push_subscriptions;
 v_manager boolean;
 v_can_transfers boolean;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
  raise exception 'No tenés acceso a este comercio';
 end if;
 v_manager := retail_private.role_for(p_store) in ('owner','admin');
 v_can_transfers := v_manager or retail_private.has_permission(p_store, 'manage_transfers');

 if p_endpoint !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
  or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$'
  or p_endpoint is null or p_p256dh is null or p_auth is null then
   raise exception 'Suscripción push inválida';
 end if;

 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_endpoint,1));

 select * into v_old from public.retail_push_subscriptions where endpoint=p_endpoint for update;
 if (v_old.id is null or v_old.user_id<>auth.uid()) and (select count(*) from public.retail_push_subscriptions where user_id=auth.uid())>=20 then
  raise exception 'Alcanzaste el máximo de 20 dispositivos';
 end if;
 if v_old.id is not null and (v_old.user_id<>auth.uid() or v_old.store_id<>p_store) then
  delete from public.retail_push_subscriptions where id=v_old.id;
 end if;

 insert into public.retail_push_subscriptions(
  user_id, store_id, endpoint, p256dh, auth,
  low_stock, shift_closed, shift_opened, cash_difference, transfers
 )
 values (
  auth.uid(), p_store, p_endpoint, p_p256dh, p_auth,
  v_manager and coalesce(p_low_stock, false),
  v_manager and coalesce(p_shift_closed, false),
  v_manager and coalesce(p_shift_opened, false),
  v_manager and coalesce(p_cash_difference, false),
  v_can_transfers and coalesce(p_transfers, false)
 )
 on conflict(endpoint) do update set
  p256dh = excluded.p256dh,
  auth = excluded.auth,
  low_stock = excluded.low_stock,
  shift_closed = excluded.shift_closed,
  shift_opened = excluded.shift_opened,
  cash_difference = excluded.cash_difference,
  transfers = excluded.transfers,
  updated_at = now()
 returning id into v_id;

 return v_id;
end $$;

-- Sobrecarga de compatibilidad para clientes o pruebas con 6 parámetros
create or replace function public.retail_save_push(
 p_store uuid, p_endpoint text, p_p256dh text, p_auth text,
 p_low_stock boolean, p_shift_closed boolean
) returns uuid language sql security definer set search_path='' as $$
 select public.retail_save_push(p_store, p_endpoint, p_p256dh, p_auth, p_low_stock, p_shift_closed, true, true, true);
$$;

revoke all on function public.retail_save_push(uuid,text,text,text,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.retail_save_push(uuid,text,text,text,boolean,boolean,boolean,boolean,boolean) to authenticated;

revoke all on function public.retail_save_push(uuid,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.retail_save_push(uuid,text,text,text,boolean,boolean) to authenticated;

-- Encolado de eventos de stock y turnos (aperturas, cierres y diferencias de caja)
create or replace function retail_private.enqueue_push() returns trigger
 language plpgsql security definer set search_path='' as $$
declare
 v_name text;
 v_diff numeric(14,2);
begin
 if tg_table_name = 'retail_products' then
  if not new.active or new.stock > new.min_stock or (old.active and old.stock <= old.min_stock) then return new; end if;
  insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key)
  select s.id, s.user_id, s.store_id, 'low_stock', 'stock:' || new.store_id::text || ':' || date_trunc('minute', now())::text
  from public.retail_push_subscriptions s
  join public.retail_members m on m.store_id = s.store_id and m.user_id = s.user_id
  where s.store_id = new.store_id and m.role in ('owner', 'admin') and s.low_stock
  on conflict(subscription_id, event_key) do nothing;
  return new;
 end if;

 if tg_table_name = 'retail_shifts' then
  select coalesce(b.name || ' · ' || r.name, r.name) into v_name
  from public.retail_registers r
  left join public.retail_branches b on b.id = r.branch_id
  where r.id = new.register_id;

  if tg_op = 'INSERT' then
   if new.closed_at is null then
    insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key, title, body)
    select s.id, s.user_id, s.store_id, 'shift_opened', 'shift_opened:' || new.id::text,
     'Apertura de caja',
     'Se abrió un turno en ' || coalesce(v_name, 'la caja') || '.'
    from public.retail_push_subscriptions s
    join public.retail_members m on m.store_id = s.store_id and m.user_id = s.user_id
    where s.store_id = new.store_id and m.role in ('owner', 'admin') and s.shift_opened
    on conflict(subscription_id, event_key) do nothing;
   end if;
   return new;
  end if;

  if tg_op = 'UPDATE' then
   if new.closed_at is null or old.closed_at is not null then return new; end if;

   -- Cierre general de turno
   insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key, title, body)
   select s.id, s.user_id, s.store_id, 'shift_closed', 'shift:' || new.id::text,
    'Cierre de caja',
    'Se cerró el turno en ' || coalesce(v_name, 'la caja') || '.'
   from public.retail_push_subscriptions s
   join public.retail_members m on m.store_id = s.store_id and m.user_id = s.user_id
   where s.store_id = new.store_id and m.role in ('owner', 'admin') and s.shift_closed
   on conflict(subscription_id, event_key) do nothing;

   -- Diferencia en arqueo (faltante o sobrante)
   if new.counted_cash is not null and new.expected_cash is not null and abs(new.counted_cash - new.expected_cash) >= 0.01 then
    v_diff := new.counted_cash - new.expected_cash;
    insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key, title, body)
    select s.id, s.user_id, s.store_id, 'cash_difference', 'diff:' || new.id::text,
     case when v_diff < 0 then 'Faltante en arqueo' else 'Sobrante en arqueo' end,
     case when v_diff < 0
      then 'Se detectó un faltante en ' || coalesce(v_name, 'la caja') || ' al cerrar turno.'
      else 'Se detectó un sobrante en ' || coalesce(v_name, 'la caja') || ' al cerrar turno.' end
    from public.retail_push_subscriptions s
    join public.retail_members m on m.store_id = s.store_id and m.user_id = s.user_id
    where s.store_id = new.store_id and m.role in ('owner', 'admin') and s.cash_difference
    on conflict(subscription_id, event_key) do nothing;
   end if;

   return new;
  end if;
 end if;

 return new;
end $$;

-- Actualizar trigger de retail_shifts para activarse también al abrir turno (INSERT)
drop trigger if exists retail_shift_push on public.retail_shifts;
create trigger retail_shift_push after insert or update of closed_at on public.retail_shifts
 for each row execute function retail_private.enqueue_push();

-- Encolado de eventos de traslados de mercadería
create or replace function retail_private.enqueue_transfer_push() returns trigger
 language plpgsql security definer set search_path='' as $$
declare
 from_name text;
 to_name text;
 count_items integer;
begin
 from_name := case when new.from_location = 'depot' then 'Depósito'
  else coalesce((select name from public.retail_branches where id::text = new.from_location and store_id = new.store_id), 'Sucursal') end;
 to_name := case when new.to_location = 'depot' then 'Depósito'
  else coalesce((select name from public.retail_branches where id::text = new.to_location and store_id = new.store_id), 'Sucursal') end;
 count_items := jsonb_array_length(new.items);

 if tg_op = 'INSERT' then
  if new.status = 'pending' then
   insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key, title, body)
   select s.id, s.user_id, s.store_id, 'transfer_pending', 'transfer_pending:' || new.id::text,
    'Solicitud de traslado',
    'Pedido de mercadería de ' || from_name || ' hacia ' || to_name || ' (' || count_items || (case when count_items = 1 then ' producto).' else ' productos).' end)
   from public.retail_push_subscriptions s
   where s.store_id = new.store_id and s.transfers and s.user_id <> new.created_by
   and (
    exists(select 1 from public.retail_members m where m.store_id = s.store_id and m.user_id = s.user_id and m.role in ('owner', 'admin'))
    or retail_private.has_permission(s.store_id, 'manage_transfers')
   )
   on conflict(subscription_id, event_key) do nothing;
  end if;
  return new;
 end if;

 if tg_op = 'UPDATE' then
  if old.status = 'pending' and new.status in ('confirmed', 'cancelled') then
   insert into public.retail_push_deliveries(subscription_id, user_id, store_id, kind, event_key, title, body)
   select s.id, s.user_id, s.store_id, 'transfer_reviewed', 'transfer_reviewed:' || new.id::text || ':' || new.status,
    case when new.status = 'confirmed' then 'Traslado confirmado' else 'Traslado cancelado' end,
    case when new.status = 'confirmed'
     then 'Se confirmó el envío de mercadería de ' || from_name || ' a ' || to_name || '.'
     else 'Se canceló el traslado de mercadería de ' || from_name || ' a ' || to_name || '.' end
   from public.retail_push_subscriptions s
   where s.store_id = new.store_id and s.transfers and s.user_id <> coalesce(new.reviewed_by, auth.uid())
   and (
    exists(select 1 from public.retail_members m where m.store_id = s.store_id and m.user_id = s.user_id and m.role in ('owner', 'admin'))
    or retail_private.has_permission(s.store_id, 'manage_transfers')
   )
   on conflict(subscription_id, event_key) do nothing;
  end if;
  return new;
 end if;

 return new;
end $$;

drop trigger if exists retail_transfer_push on public.retail_location_transfers;
create trigger retail_transfer_push after insert or update of status on public.retail_location_transfers
 for each row execute function retail_private.enqueue_transfer_push();

-- Despacho de avisos en cola con soporte de los nuevos tipos y contenido
create or replace function public.retail_claim_push(p_only uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 delete from public.retail_push_deliveries where created_at < now() - interval '7 days';
 with candidates as (
  select d.id from public.retail_push_deliveries d where d.sent_at is null and d.attempts < 5
  and d.available_at <= now() and d.created_at > now() - interval '24 hours'
  and (d.locked_at is null or d.locked_at < now() - interval '2 minutes')
  and (p_only is null or d.id = p_only) order by d.created_at for update skip locked limit 100
 ), claimed as (
  update public.retail_push_deliveries d set attempts = d.attempts + 1, locked_at = now(), lease = gen_random_uuid()
  from candidates c where d.id = c.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
  'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
  'title', coalesce(c.title, a.title),
  'body', coalesce(c.body, a.body),
  'authorized', s.user_id = c.user_id and s.store_id = c.store_id and (
   (c.kind = 'platform' and a.id is not null and a.canceled_at is null and a.ends_at > now())
   or (c.kind = 'test' and exists(select 1 from public.retail_members m where m.store_id = c.store_id and m.user_id = c.user_id))
   or (c.kind in ('low_stock', 'shift_closed', 'shift_opened', 'cash_difference')
       and exists(select 1 from public.retail_members m where m.store_id = c.store_id and m.user_id = c.user_id and m.role in ('owner', 'admin'))
       and ((c.kind = 'low_stock' and s.low_stock)
         or (c.kind = 'shift_closed' and s.shift_closed)
         or (c.kind = 'shift_opened' and s.shift_opened)
         or (c.kind = 'cash_difference' and s.cash_difference)))
   or (c.kind in ('transfer_pending', 'transfer_reviewed')
       and s.transfers
       and (exists(select 1 from public.retail_members m where m.store_id = c.store_id and m.user_id = c.user_id and m.role in ('owner', 'admin'))
         or retail_private.has_permission(c.store_id, 'manage_transfers')))
  )
 )), '[]'::jsonb) into result from claimed c join public.retail_push_subscriptions s on s.id = c.subscription_id
 left join retail_private.platform_announcements a on a.id = c.announcement_id;
 return result;
end $$;

notify pgrst, 'reload schema';
commit;

