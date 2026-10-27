-- Electronic billing configuration (ARCA / AFIP) and sale fiscal fields.
-- Opt-in per store; existing offline sales and non-fiscal checkout remain unaffected.
begin;

alter table public.retail_stores
  add column cuit text,
  add column razon_social text,
  add column condicion_iva text check(condicion_iva is null or condicion_iva in ('RI','MO','EX')),
  add column punto_venta_afip integer check(punto_venta_afip is null or (punto_venta_afip between 1 and 99998)),
  add column iibb text,
  add column inicio_actividades date,
  add column billing_enabled boolean not null default false;

alter table public.retail_stores
  add constraint retail_stores_billing_enabled_check
  check (
    not billing_enabled or (
      cuit is not null and length(trim(cuit)) >= 11 and
      razon_social is not null and length(trim(razon_social)) >= 1 and
      condicion_iva in ('RI','MO','EX') and
      punto_venta_afip is not null and (punto_venta_afip between 1 and 99998)
    )
  );

alter table public.retail_sales
  add column cbte_tipo smallint,
  add column cbte_nro bigint,
  add column cae text,
  add column cae_vto date,
  add column billing_status text not null default 'none' check(billing_status in ('none','pending','authorized','error','retry')),
  add column billing_error text,
  add column billing_attempts smallint not null default 0 check(billing_attempts >= 0);

create index retail_sales_billing_pending
  on public.retail_sales(store_id, billing_status)
  where billing_status in ('pending', 'retry', 'error');

create function retail_private.initialize_sale_billing() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_billing_enabled boolean;
begin
  if new.billing_status is null or new.billing_status = 'none' then
    select billing_enabled into v_billing_enabled from public.retail_stores where id = new.store_id;
    if coalesce(v_billing_enabled, false) then
      new.billing_status := 'pending';
    else
      new.billing_status := 'none';
    end if;
  end if;
  return new;
end $$;
revoke all on function retail_private.initialize_sale_billing() from public,anon,authenticated;

create trigger retail_initialize_sale_billing
  before insert on public.retail_sales
  for each row execute function retail_private.initialize_sale_billing();

create function public.retail_set_billing_settings(
  p_store uuid,
  p_cuit text,
  p_razon_social text,
  p_condicion_iva text,
  p_punto_venta_afip integer,
  p_iibb text,
  p_inicio_actividades date,
  p_billing_enabled boolean
) returns void
language plpgsql security definer set search_path='' as $$
declare
  v_cuit text := nullif(trim(p_cuit), '');
  v_razon text := nullif(trim(p_razon_social), '');
  v_condicion text := nullif(trim(p_condicion_iva), '');
  v_iibb text := nullif(trim(p_iibb), '');
  v_enabled boolean := coalesce(p_billing_enabled, false);
begin
  perform retail_private.require_permission(p_store, 'manage_store');

  if v_cuit is not null then
    if not (v_cuit ~ '^\d{2}-?\d{8}-?\d{1}$') then
      raise exception 'El CUIT debe tener 11 dígitos numéricos válidos';
    end if;
  end if;

  if v_condicion is not null and v_condicion not in ('RI', 'MO', 'EX') then
    raise exception 'Condición frente al IVA inválida. Elegí Monotributo, Responsable Inscripto o Exento';
  end if;

  if p_punto_venta_afip is not null and (p_punto_venta_afip < 1 or p_punto_venta_afip > 99998) then
    raise exception 'El punto de venta debe estar entre 1 y 99998';
  end if;

  if v_enabled then
    if v_cuit is null or v_razon is null or v_condicion is null or p_punto_venta_afip is null then
      raise exception 'Para activar la facturación completá CUIT, Razón Social, Condición frente al IVA y Punto de Venta';
    end if;
  end if;

  update public.retail_stores
  set
    cuit = v_cuit,
    razon_social = v_razon,
    condicion_iva = v_condicion,
    punto_venta_afip = p_punto_venta_afip,
    iibb = v_iibb,
    inicio_actividades = p_inicio_actividades,
    billing_enabled = v_enabled
  where id = p_store;
end $$;

revoke all on function public.retail_set_billing_settings(uuid,text,text,text,integer,text,date,boolean) from public,anon;
grant execute on function public.retail_set_billing_settings(uuid,text,text,text,integer,text,date,boolean) to authenticated;

create function public.retail_update_sale_billing(
  p_store uuid,
  p_sale uuid,
  p_status text,
  p_cbte_tipo smallint default null,
  p_cbte_nro bigint default null,
  p_cae text default null,
  p_cae_vto date default null,
  p_error text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  s public.retail_sales;
begin
  if not (retail_private.has_permission(p_store, 'manage_store') or
          retail_private.has_permission(p_store, 'sell') or
          retail_private.has_permission(p_store, 'view_sales')) then
    raise exception 'Permisos insuficientes para actualizar el comprobante fiscal';
  end if;

  select * into s from public.retail_sales
  where id = p_sale and store_id = p_store for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if p_status not in ('none', 'pending', 'authorized', 'error', 'retry') then
    raise exception 'Estado de facturación inválido';
  end if;

  if p_status = 'authorized' then
    if p_cae is null or trim(p_cae) = '' or p_cae_vto is null or p_cbte_tipo is null or p_cbte_nro is null then
      raise exception 'Faltan datos de autorización (CAE, vencimiento o número de comprobante)';
    end if;

    update public.retail_sales
    set
      billing_status = 'authorized',
      cbte_tipo = p_cbte_tipo,
      cbte_nro = p_cbte_nro,
      cae = trim(p_cae),
      cae_vto = p_cae_vto,
      billing_error = null
    where id = p_sale;
  elsif p_status = 'error' then
    update public.retail_sales
    set
      billing_status = 'error',
      billing_error = nullif(trim(p_error), ''),
      billing_attempts = billing_attempts + 1
    where id = p_sale;
  else
    update public.retail_sales
    set
      billing_status = p_status
    where id = p_sale;
  end if;
end $$;

revoke all on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text) from public,anon;
grant execute on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text) to authenticated;

notify pgrst,'reload schema';
commit;
