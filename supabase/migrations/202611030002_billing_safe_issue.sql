-- Facturación ARCA sin duplicados: una factura por venta, un número en curso por punto de venta y tipo,
-- recuperación de respuestas perdidas, importes tomados de la venta guardada y clave privada cifrada en Vault.
-- Requiere Vault (supabase_vault), que Supabase trae activo en todos los proyectos.
begin;

do $$ begin
 if to_regnamespace('vault') is null then
  raise exception 'Activá Vault en Supabase (Database → Extensions → supabase_vault) y volvé a aplicar esta actualización';
 end if;
end $$;

-- 1. Clave privada en Vault. La columna de texto queda vacía y ya no se puede volver a usar.
alter table retail_private.store_billing_credentials
 alter column arca_key drop not null,
 alter column arca_environment set default 'homo',
 add column if not exists arca_key_secret uuid;
update retail_private.store_billing_credentials
 set arca_key_secret=vault.create_secret(arca_key,'arca_key_'||store_id::text,'Clave privada ARCA del comercio'),arca_key=null
 where arca_key is not null and arca_key_secret is null;
alter table retail_private.store_billing_credentials
 add constraint store_billing_credentials_key_in_vault check (arca_key is null and arca_key_secret is not null);

-- 2. Permiso de ARCA (WSAA) guardado entre ejecuciones: ARCA niega uno nuevo mientras el anterior siga vigente.
create table retail_private.billing_wsaa_tokens (
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 environment text not null check (environment in ('homo','prod')),
 token text not null, sign text not null, expires_at timestamptz not null,
 primary key (store_id,environment)
);
revoke all on retail_private.billing_wsaa_tokens from public,anon,authenticated;

-- 3. Cada pedido de CAE queda registrado antes de salir. Solo puede haber uno en curso por punto de venta,
-- tipo y entorno, y uno por venta: ese es el bloqueo de numeración.
create table public.retail_billing_attempts (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 sale_id uuid not null references public.retail_sales(id),
 environment text not null check (environment in ('homo','prod')),
 pto_vta integer not null, cbte_tipo smallint not null,
 cbte_nro bigint, cbte_fch date not null,
 imp_total numeric(14,2) not null, imp_neto numeric(14,2) not null, imp_iva numeric(14,2) not null,
 -- reserved: tiene el turno pero no salió nada a ARCA. sent: salió con número y todavía no se sabe la respuesta.
 status text not null default 'reserved' check (status in ('reserved','sent','authorized','rejected','not_issued','cancelled','conflict')),
 cae text, cae_vto date, error text,
 lease_until timestamptz not null,
 requested_by uuid references auth.users(id),
 created_at timestamptz not null default now(), resolved_at timestamptz,
 check (status<>'sent' or cbte_nro is not null)
);
create unique index retail_billing_attempts_one_open_per_sequence on public.retail_billing_attempts(store_id,environment,pto_vta,cbte_tipo) where status in ('reserved','sent');
create unique index retail_billing_attempts_one_open_per_sale on public.retail_billing_attempts(sale_id) where status in ('reserved','sent');
create unique index retail_billing_attempts_one_invoice_per_sale on public.retail_billing_attempts(sale_id,environment) where status='authorized';
create unique index retail_billing_attempts_unique_number on public.retail_billing_attempts(store_id,environment,pto_vta,cbte_tipo,cbte_nro) where status='authorized';
create index retail_billing_attempts_sale on public.retail_billing_attempts(store_id,sale_id,created_at desc);
alter table public.retail_billing_attempts enable row level security;
create policy owner_read on public.retail_billing_attempts for select to authenticated using (retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_billing_attempts from public,anon,authenticated;
grant select on public.retail_billing_attempts to authenticated;

-- 4. Certificados: solo el dueño o un administrador. La clave puede omitirse para cambiar solo el certificado o el entorno.
create or replace function public.retail_set_billing_credentials(p_store uuid,p_cert text,p_key text,p_environment text default 'homo')
returns void language plpgsql security definer set search_path='' as $$
declare current_secret uuid; v_cert text:=nullif(trim(coalesce(p_cert,'')),''); v_key text:=nullif(trim(coalesce(p_key,'')),'');
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo el dueño o un administrador puede cargar el certificado de ARCA' using errcode='42501';
 end if;
 if p_environment is null or p_environment not in ('homo','prod') then raise exception 'Elegí homologación (pruebas) o producción'; end if;
 if v_cert is null or v_cert not like '-----BEGIN CERTIFICATE-----%' then raise exception 'El certificado (.crt) no es válido: tiene que empezar con -----BEGIN CERTIFICATE-----'; end if;
 if v_key is not null and v_key !~ '^-----BEGIN (RSA )?PRIVATE KEY-----' then raise exception 'La clave privada (.key) no es válida'; end if;
 select arca_key_secret into current_secret from retail_private.store_billing_credentials where store_id=p_store for update;
 if v_key is null and current_secret is null then raise exception 'La clave privada (.key) es obligatoria'; end if;
 if v_key is not null then
  if current_secret is null then current_secret:=vault.create_secret(v_key,'arca_key_'||p_store::text||'_'||gen_random_uuid()::text,'Clave privada ARCA del comercio');
  else perform vault.update_secret(current_secret,v_key); end if;
 end if;
 insert into retail_private.store_billing_credentials(store_id,arca_cert,arca_key,arca_key_secret,arca_environment,updated_at,updated_by)
 values(p_store,v_cert,null,current_secret,p_environment,now(),auth.uid())
 on conflict (store_id) do update set arca_cert=excluded.arca_cert,arca_key_secret=excluded.arca_key_secret,
  arca_environment=excluded.arca_environment,updated_at=now(),updated_by=auth.uid();
 -- Un certificado nuevo invalida el permiso de ARCA guardado.
 delete from retail_private.billing_wsaa_tokens where store_id=p_store;
end $$;

create or replace function public.retail_get_billing_credentials_status(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cred retail_private.store_billing_credentials;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return jsonb_build_object('configured',false,'error','Sin permisos'); end if;
 select * into cred from retail_private.store_billing_credentials where store_id=p_store;
 if not found then return jsonb_build_object('configured',false,'environment','homo','updated_at',null); end if;
 return jsonb_build_object('configured',true,'environment',cred.arca_environment,'updated_at',cred.updated_at);
end $$;

-- 5. Turno para pedir el CAE de una venta. Lo llama la función del servidor con la sesión de quien vende,
-- así se revisan sus permisos. Importes, tipo, CUIT y punto de venta salen de la base, nunca del navegador.
create function public.retail_billing_begin(p_store uuid,p_sale uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_store public.retail_stores; v_env text; v_tipo smallint; v_open public.retail_billing_attempts;
 v_neto numeric(14,2); v_iva numeric(14,2); v_attempt public.retail_billing_attempts;
begin
 if not (retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Sin permiso para facturar en este comercio' using errcode='42501';
 end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada. Si se cobró sin conexión, sincronizá antes de facturar'; end if;
 if v_sale.billing_status='authorized' then
  return jsonb_build_object('state','authorized','cae',v_sale.cae,'cae_vto',v_sale.cae_vto,'cbte_nro',v_sale.cbte_nro,'cbte_tipo',v_sale.cbte_tipo);
 end if;
 if v_sale.return_status='voided' then return jsonb_build_object('state','voided'); end if;
 if v_sale.billing_status='none' then return jsonb_build_object('state','skip'); end if;
 select * into v_store from public.retail_stores where id=p_store;
 if not v_store.billing_enabled then return jsonb_build_object('state','skip','error','La facturación electrónica está desactivada'); end if;
 v_tipo:=case v_store.condicion_iva when 'RI' then 6 when 'MO' then 11 end;
 if v_tipo is null then return jsonb_build_object('state','skip','error','Los comercios exentos todavía no emiten comprobante desde la app'); end if;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','error','error','Falta cargar el certificado de ARCA en Mi comercio'); end if;
 if coalesce(v_sale.total,0)<=0 then return jsonb_build_object('state','error','error','La venta no tiene importe para facturar'); end if;

 -- Primero se ordena lo que haya quedado en curso para este punto de venta y tipo.
 select * into v_open from public.retail_billing_attempts
  where store_id=p_store and environment=v_env and pto_vta=v_store.punto_venta_afip and cbte_tipo=v_tipo and status in ('reserved','sent') for update;
 if found then
  if v_open.lease_until>now() then return jsonb_build_object('state','busy'); end if;
  if v_open.status='reserved' then
   -- Nunca salió a ARCA: se libera sin riesgo.
   update public.retail_billing_attempts set status='cancelled',error='Se cortó antes de pedir el CAE',resolved_at=now() where id=v_open.id;
  else
   -- Salió con número y no se supo la respuesta: hay que consultarlo en ARCA antes de usar otro número.
   update public.retail_billing_attempts set lease_until=now()+interval '3 minutes' where id=v_open.id returning * into v_open;
   return jsonb_build_object('state','recover','attempt',to_jsonb(v_open),'cuit',regexp_replace(v_store.cuit,'\D','','g'));
  end if;
 end if;

 if v_tipo=6 then v_neto:=round(v_sale.total/1.21,2); v_iva:=v_sale.total-v_neto; else v_neto:=v_sale.total; v_iva:=0; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,lease_until,requested_by)
 values(p_store,p_sale,v_env,v_store.punto_venta_afip,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_sale.total,v_neto,v_iva,now()+interval '3 minutes',auth.uid()) returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',regexp_replace(v_store.cuit,'\D','','g'));
end $$;

-- 6. Antes de mandar el pedido a ARCA se anota el número. Si la respuesta se pierde, se sabe qué consultar.
create function public.retail_billing_mark_sent(p_attempt uuid,p_cbte_nro bigint) returns void
language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts;
begin
 select * into v from public.retail_billing_attempts where id=p_attempt for update;
 if not found or v.status<>'reserved' then raise exception 'El turno de facturación ya no está disponible'; end if;
 if v.lease_until<=now() then raise exception 'El turno de facturación venció. Reintentá'; end if;
 if p_cbte_nro is null or p_cbte_nro<1 then raise exception 'Número de comprobante inválido'; end if;
 update public.retail_billing_attempts set status='sent',cbte_nro=p_cbte_nro,lease_until=now()+interval '3 minutes' where id=p_attempt;
end $$;

-- 7. Resultado del pedido. ARCA manda: si autorizó, la venta queda autorizada aunque el turno ya se hubiera dado por perdido.
create function public.retail_billing_finish(p_attempt uuid,p_result text,p_cae text default null,p_cae_vto date default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts; v_sale public.retail_sales; v_error text:=left(nullif(trim(coalesce(p_error,'')),''),500);
begin
 if p_result not in ('authorized','rejected','not_issued','cancelled','unknown','conflict') then raise exception 'Resultado inválido'; end if;
 select * into v from public.retail_billing_attempts where id=p_attempt for update;
 if not found then raise exception 'Pedido de facturación no encontrado'; end if;
 select * into v_sale from public.retail_sales where id=v.sale_id for update;

 if p_result='authorized' then
  if nullif(trim(coalesce(p_cae,'')),'') is null or p_cae_vto is null or v.cbte_nro is null then raise exception 'Faltan el CAE, su vencimiento o el número'; end if;
  if v.status='authorized' then return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cae',v.cae); end if;
  if v_sale.billing_status='authorized' and v_sale.cae is distinct from trim(p_cae) then
   update public.retail_billing_attempts set status='conflict',cae=trim(p_cae),cae_vto=p_cae_vto,resolved_at=now(),
    error='La venta ya tenía factura y ARCA autorizó otra: corresponde anularla con nota de crédito' where id=v.id;
   return jsonb_build_object('state','conflict','error','La venta quedó con dos facturas en ARCA. Hay que anular una con nota de crédito');
  end if;
  update public.retail_billing_attempts set status='authorized',cae=trim(p_cae),cae_vto=p_cae_vto,error=null,resolved_at=now() where id=v.id;
  update public.retail_sales set billing_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=trim(p_cae),cae_vto=p_cae_vto,billing_error=null
   where id=v.sale_id;
  return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cbte_tipo',v.cbte_tipo,'cae',trim(p_cae),'cae_vto',p_cae_vto);
 end if;

 if v.status not in ('reserved','sent') then return jsonb_build_object('state',v.status); end if;
 if p_result='unknown' then
  -- Se deja en curso: el próximo pedido para este punto de venta lo consulta en ARCA antes de seguir.
  if v.status<>'sent' then raise exception 'Solo un pedido enviado puede quedar sin respuesta'; end if;
  update public.retail_billing_attempts set error=coalesce(v_error,'ARCA no respondió') where id=v.id;
  if v_sale.billing_status<>'authorized' then
   update public.retail_sales set billing_status='retry',billing_error='ARCA no respondió. Antes de reintentar se revisa si la factura quedó hecha',
    billing_attempts=least(billing_attempts+1,32767) where id=v.sale_id;
  end if;
  return jsonb_build_object('state','retry');
 end if;

 update public.retail_billing_attempts set status=p_result,error=v_error,resolved_at=now() where id=v.id;
 if v_sale.billing_status<>'authorized' then
  update public.retail_sales set
   billing_status=case when p_result in ('rejected','conflict') then 'error' else 'retry' end,
   billing_error=coalesce(v_error,case when p_result in ('rejected','conflict') then 'ARCA rechazó el comprobante' else 'No se pudo pedir el CAE. Se reintenta' end),
   billing_attempts=least(billing_attempts+1,32767)
  where id=v.sale_id;
 end if;
 return jsonb_build_object('state',case when p_result in ('rejected','conflict') then 'error' else 'retry' end,'error',v_error);
end $$;

-- 8. Solo para la función del servidor: certificado, clave descifrada y permiso de ARCA vigente.
create function public.retail_billing_secrets(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cred retail_private.store_billing_credentials; v_key text; v_token retail_private.billing_wsaa_tokens;
begin
 select * into cred from retail_private.store_billing_credentials where store_id=p_store;
 if not found then return null; end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where id=cred.arca_key_secret;
 select * into v_token from retail_private.billing_wsaa_tokens where store_id=p_store and environment=cred.arca_environment and expires_at>now()+interval '10 minutes';
 return jsonb_build_object('cert',cred.arca_cert,'key',v_key,'environment',cred.arca_environment,
  'token',v_token.token,'sign',v_token.sign,'token_expires_at',v_token.expires_at);
end $$;

create function public.retail_billing_save_token(p_store uuid,p_environment text,p_token text,p_sign text,p_expires_at timestamptz) returns void
language sql security definer set search_path='' as $$
 insert into retail_private.billing_wsaa_tokens(store_id,environment,token,sign,expires_at) values(p_store,p_environment,p_token,p_sign,p_expires_at)
 on conflict (store_id,environment) do update set token=excluded.token,sign=excluded.sign,expires_at=excluded.expires_at;
$$;

-- 9. Desde la app ya no se puede marcar una venta como autorizada ni pisar una autorizada.
create or replace function public.retail_update_sale_billing(p_store uuid,p_sale uuid,p_status text,p_cbte_tipo smallint default null,
 p_cbte_nro bigint default null,p_cae text default null,p_cae_vto text default null,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 if not (retail_private.has_permission(p_store,'manage_store') or retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Permisos insuficientes para actualizar el comprobante fiscal';
 end if;
 if p_status is null or p_status not in ('pending','error','retry') then
  raise exception 'El CAE lo registra solamente el servidor de facturación';
 end if;
 select * into s from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 if s.billing_status='authorized' then raise exception 'La venta ya tiene factura autorizada. Para corregirla corresponde una nota de crédito'; end if;
 if s.billing_status='none' then raise exception 'Esta venta no se factura'; end if;
 if exists(select 1 from public.retail_billing_attempts where sale_id=p_sale and status in ('reserved','sent')) then return; end if;
 update public.retail_sales set billing_status=p_status,
  billing_error=case when p_status='error' then coalesce(nullif(trim(p_error),''),billing_error) else billing_error end,
  billing_attempts=case when p_status='error' then least(billing_attempts+1,32767) else billing_attempts end
 where id=p_sale;
end $$;

revoke all on function public.retail_billing_begin(uuid,uuid),public.retail_billing_mark_sent(uuid,bigint),
 public.retail_billing_finish(uuid,text,text,date,text),public.retail_billing_secrets(uuid),
 public.retail_billing_save_token(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.retail_billing_begin(uuid,uuid) to authenticated;
grant execute on function public.retail_billing_mark_sent(uuid,bigint),public.retail_billing_finish(uuid,text,text,date,text),
 public.retail_billing_secrets(uuid),public.retail_billing_save_token(uuid,text,text,text,timestamptz) to service_role;
revoke all on function public.retail_set_billing_credentials(uuid,text,text,text),public.retail_get_billing_credentials_status(uuid),
 public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) from public,anon;
grant execute on function public.retail_set_billing_credentials(uuid,text,text,text),public.retail_get_billing_credentials_status(uuid),
 public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
