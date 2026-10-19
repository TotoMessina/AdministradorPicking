-- Apply locally/review before deploying. Existing stores are deliberately NOT backfilled.
begin;
create table public.retail_store_onboarding (
 store_id uuid primary key references public.retail_stores(id),
 step smallint not null default 1 check (step between 1 and 3),
 details_confirmed_at timestamptz,
 dismissed_at timestamptz,
 completed_at timestamptz,
 version integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.retail_store_onboarding enable row level security;
revoke all on public.retail_store_onboarding from public, anon, authenticated;
grant select on public.retail_store_onboarding to authenticated;
create policy manager_read on public.retail_store_onboarding for select to authenticated
 using (retail_private.role_for(store_id) in ('owner','admin'));

create function retail_private.initialize_onboarding() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_store_onboarding(store_id) values(new.id);
 return new;
end $$;
revoke all on function retail_private.initialize_onboarding() from public,anon,authenticated;
create trigger retail_initialize_onboarding after insert on public.retail_stores
 for each row execute function retail_private.initialize_onboarding();

-- Stable client request across reloads; serialize matching pending creations across devices.
create table retail_private.store_creation_requests (
 user_id uuid not null references auth.users(id), request_id uuid not null,
 store_id uuid not null references public.retail_stores(id), primary key(user_id,request_id)
);
revoke all on retail_private.store_creation_requests from public,anon,authenticated;
create function public.retail_create_store_once(p_name text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or p_request is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select store_id into v_id from retail_private.store_creation_requests where user_id=auth.uid() and request_id=p_request;
 if v_id is not null then return v_id; end if;
 select s.id into v_id from public.retail_stores s join public.retail_store_onboarding o on o.store_id=s.id
 where s.owner_id=auth.uid() and lower(s.name)=lower(trim(p_name)) and o.completed_at is null
 order by o.updated_at limit 1;
 if v_id is null then v_id := public.retail_create_store(p_name); end if;
 insert into retail_private.store_creation_requests values(auth.uid(),p_request,v_id);
 return v_id;
end $$;

create function public.retail_onboarding_update(p_store uuid,p_version integer,p_action text) returns public.retail_store_onboarding
language plpgsql security definer set search_path='' as $$
declare o public.retail_store_onboarding; has_products boolean;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para configurar este comercio'; end if;
 select * into o from public.retail_store_onboarding where store_id=p_store for update;
 if o.store_id is null then raise exception 'Este comercio no necesita inicio guiado'; end if;
 if p_version is null or o.version <> p_version then raise exception 'El inicio cambió en otro dispositivo. Actualizá para continuar.'; end if;
 if o.completed_at is not null then return o; end if;
 if p_action='details' then
   if not exists(select 1 from public.retail_registers where store_id=p_store and active) then raise exception 'Agregá una caja en Locales y cajas antes de continuar'; end if;
   o.details_confirmed_at := coalesce(o.details_confirmed_at,now()); o.step := 2;
 elsif p_action='products' then
   if o.details_confirmed_at is null then raise exception 'Confirmá primero los datos del comercio'; end if;
   o.step := 3;
 elsif p_action='back_details' then o.step := 1;
 elsif p_action='back_products' then o.step := 2;
 elsif p_action='dismiss' then o.dismissed_at := now();
 elsif p_action='resume' then o.dismissed_at := null;
 elsif p_action='finish' then
   if o.details_confirmed_at is null then raise exception 'Confirmá primero los datos del comercio'; end if;
   if not exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id
     where s.store_id=p_store and s.opened_by=auth.uid() and s.closed_at is null and r.active)
     then raise exception 'Abrí tu turno antes de empezar a vender'; end if;
   select exists(select 1 from public.retail_products where store_id=p_store and active) into has_products;
   o.completed_at := case when has_products then now() else null end;
   o.dismissed_at := now(); o.step := case when has_products then 3 else 2 end;
 else raise exception 'Acción de inicio no válida';
 end if;
 update public.retail_store_onboarding set step=o.step,details_confirmed_at=o.details_confirmed_at,
   dismissed_at=o.dismissed_at,completed_at=o.completed_at,version=version+1,updated_at=now()
 where store_id=p_store returning * into o;
 return o;
end $$;

-- This wrapper uses the actual opening RPC and its accounting/permission validation.
-- A retry (including another device) returns the same own open shift, never opens another.
create function public.retail_onboarding_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para configurar este comercio'; end if;
 perform 1 from public.retail_store_onboarding where store_id=p_store and details_confirmed_at is not null for update;
 if not found then raise exception 'Confirmá primero los datos del comercio'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then
   raise exception 'Caja no disponible. Actualizá y elegí una caja activa.';
 end if;
 select id into v_id from public.retail_shifts where store_id=p_store and register_id=p_register and closed_at is null;
 if v_id is not null then
   if exists(select 1 from public.retail_shifts where id=v_id and opened_by=auth.uid()) then return v_id; end if;
   raise exception 'Esta caja está ocupada. Elegí otra caja o actualizá cuando se libere.';
 end if;
 if exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=auth.uid() and closed_at is null) then
   raise exception 'Ya tenés un turno abierto en otra caja. Actualizá y seleccioná esa caja para continuar.';
 end if;
 return public.retail_open_shift(p_store,p_register,p_opening);
end $$;
revoke all on function public.retail_create_store_once(text,uuid), public.retail_onboarding_update(uuid,integer,text), public.retail_onboarding_open_shift(uuid,uuid,numeric) from public,anon;
grant execute on function public.retail_create_store_once(text,uuid), public.retail_onboarding_update(uuid,integer,text), public.retail_onboarding_open_shift(uuid,uuid,numeric) to authenticated;
commit;
