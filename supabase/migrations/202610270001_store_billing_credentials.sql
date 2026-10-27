-- Secure storage and management of ARCA / AFIP digital certificates and credentials per store.
-- Certificates and private keys are stored exclusively in retail_private and are NEVER exposed to the frontend or non-admin roles.
begin;

create table if not exists retail_private.store_billing_credentials (
  store_id uuid primary key references public.retail_stores(id) on delete cascade,
  arca_cert text not null,
  arca_key text not null,
  arca_environment text not null default 'homo' check (arca_environment in ('homo', 'prod')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

revoke all on retail_private.store_billing_credentials from public,anon,authenticated;

-- RPC to securely set/update ARCA credentials for a store. Requires manage_store permission.
create or replace function public.retail_set_billing_credentials(
  p_store uuid,
  p_cert text,
  p_key text,
  p_environment text default 'homo'
) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not retail_private.has_permission(p_store, 'manage_store') then
    raise exception 'Solo administradores o propietarios pueden configurar certificados fiscales de ARCA';
  end if;

  if p_cert is null or trim(p_cert) = '' then
    raise exception 'El certificado digital (.crt) es obligatorio';
  end if;

  if p_key is null or trim(p_key) = '' then
    raise exception 'La clave privada (.key) es obligatoria';
  end if;

  if p_environment not in ('homo', 'prod') then
    raise exception 'Entorno inválido. Debe ser "homo" (testing) o "prod" (producción)';
  end if;

  insert into retail_private.store_billing_credentials(
    store_id, arca_cert, arca_key, arca_environment, updated_at, updated_by
  ) values (
    p_store, trim(p_cert), trim(p_key), p_environment, now(), auth.uid()
  )
  on conflict (store_id) do update set
    arca_cert = excluded.arca_cert,
    arca_key = excluded.arca_key,
    arca_environment = excluded.arca_environment,
    updated_at = now(),
    updated_by = auth.uid();
end $$;

-- RPC to inspect the status of credentials without EVER exposing the private key or full certificate
create or replace function public.retail_get_billing_credentials_status(
  p_store uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  cred retail_private.store_billing_credentials;
begin
  if not retail_private.has_permission(p_store, 'manage_store') then
    return jsonb_build_object('configured', false, 'error', 'Sin permisos');
  end if;

  select * into cred from retail_private.store_billing_credentials where store_id = p_store;

  if not found then
    return jsonb_build_object(
      'configured', false,
      'environment', 'homo',
      'updated_at', null
    );
  end if;

  return jsonb_build_object(
    'configured', true,
    'environment', cred.arca_environment,
    'updated_at', cred.updated_at
  );
end $$;

revoke all on function public.retail_set_billing_credentials(uuid,text,text,text) from public,anon;
grant execute on function public.retail_set_billing_credentials(uuid,text,text,text) to authenticated;

revoke all on function public.retail_get_billing_credentials_status(uuid) from public,anon;
grant execute on function public.retail_get_billing_credentials_status(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
