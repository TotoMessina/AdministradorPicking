-- Robustness and type safety improvements for retail_update_sale_billing
begin;

-- Eliminar firmas previas sobrecargadas para evitar conflicto de tipos (PGRST203) en PostgREST
drop function if exists public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text);
drop function if exists public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text);

create or replace function public.retail_update_sale_billing(
  p_store uuid,
  p_sale uuid,
  p_status text,
  p_cbte_tipo smallint default null,
  p_cbte_nro bigint default null,
  p_cae text default null,
  p_cae_vto text default null,
  p_error text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  s public.retail_sales;
  v_vto date;
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
    if p_cae is null or trim(p_cae) = '' or p_cae_vto is null or trim(p_cae_vto) = '' or p_cbte_tipo is null or p_cbte_nro is null then
      raise exception 'Faltan datos de autorización (CAE, vencimiento o número de comprobante)';
    end if;

    begin
      v_vto := trim(p_cae_vto)::date;
    exception when others then
      v_vto := current_date + 10;
    end;

    update public.retail_sales
    set
      billing_status = 'authorized',
      cbte_tipo = p_cbte_tipo,
      cbte_nro = p_cbte_nro,
      cae = trim(p_cae),
      cae_vto = v_vto,
      billing_error = null
    where id = p_sale;
  elsif p_status = 'error' then
    update public.retail_sales
    set
      billing_status = 'error',
      billing_error = nullif(trim(p_error), ''),
      billing_attempts = coalesce(billing_attempts, 0) + 1
    where id = p_sale;
  else
    update public.retail_sales
    set
      billing_status = p_status
    where id = p_sale;
  end if;
end $$;

revoke all on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) from public,anon;
grant execute on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
