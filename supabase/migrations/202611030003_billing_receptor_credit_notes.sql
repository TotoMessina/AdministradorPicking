-- Factura A y comprobantes a nombre de un cliente, y notas de crédito emitidas desde las devoluciones.
-- Usa el mismo circuito contra duplicados que las facturas: un pedido en curso por punto de venta y tipo,
-- número anotado antes de enviar y consulta en ARCA cuando la respuesta se pierde.
begin;

-- 1. Receptor del comprobante, guardado al autorizar para el ticket y el QR.
alter table public.retail_sales
 add column receptor_doc_tipo smallint, add column receptor_doc_nro bigint,
 add column receptor_name text, add column receptor_iva smallint;

-- 2. Nota de crédito por devolución.
alter table public.retail_sale_returns
 add column credit_note_status text not null default 'none' check (credit_note_status in ('none','pending','authorized','error','retry')),
 add column cbte_tipo smallint, add column cbte_nro bigint, add column cae text, add column cae_vto date, add column credit_note_error text;

-- Las devoluciones nuevas de ventas facturadas quedan para emitir desde la app. Las anteriores siguen con carga manual.
create function retail_private.queue_credit_note() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.credit_note_required and new.credit_note_status='none' and new.credit_note_reference is null then new.credit_note_status:='pending'; end if;
 return new;
end $$;
revoke all on function retail_private.queue_credit_note() from public,anon,authenticated;
create trigger retail_queue_credit_note before insert or update of credit_note_required on public.retail_sale_returns
 for each row execute function retail_private.queue_credit_note();

-- 3. Los pedidos llevan el receptor y, en las notas de crédito, la devolución y la factura asociada.
alter table public.retail_billing_attempts
 add column return_id uuid references public.retail_sale_returns(id),
 add column doc_tipo smallint not null default 99, add column doc_nro bigint not null default 0,
 add column cond_iva_receptor smallint not null default 5, add column receptor_name text,
 add column asoc jsonb;
drop index public.retail_billing_attempts_one_open_per_sale;
drop index public.retail_billing_attempts_one_invoice_per_sale;
create unique index retail_billing_attempts_one_open_per_sale on public.retail_billing_attempts(sale_id) where status in ('reserved','sent') and return_id is null;
create unique index retail_billing_attempts_one_open_per_return on public.retail_billing_attempts(return_id) where status in ('reserved','sent') and return_id is not null;
create unique index retail_billing_attempts_one_invoice_per_sale on public.retail_billing_attempts(sale_id,environment) where status='authorized' and return_id is null;
create unique index retail_billing_attempts_one_note_per_return on public.retail_billing_attempts(return_id,environment) where status='authorized' and return_id is not null;

-- 4. Turno por punto de venta y tipo: libre, ocupado o con un pedido anterior para consultar en ARCA.
create function retail_private.billing_claim(p_store uuid,p_env text,p_pto integer,p_tipo smallint,p_cuit text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_open public.retail_billing_attempts;
begin
 select * into v_open from public.retail_billing_attempts
  where store_id=p_store and environment=p_env and pto_vta=p_pto and cbte_tipo=p_tipo and status in ('reserved','sent') for update;
 if not found then return null; end if;
 if v_open.lease_until>now() then return jsonb_build_object('state','busy'); end if;
 if v_open.status='reserved' then
  update public.retail_billing_attempts set status='cancelled',error='Se cortó antes de pedir el CAE',resolved_at=now() where id=v_open.id;
  return null;
 end if;
 update public.retail_billing_attempts set lease_until=now()+interval '3 minutes' where id=v_open.id returning * into v_open;
 return jsonb_build_object('state','recover','attempt',to_jsonb(v_open),'cuit',p_cuit);
end $$;
revoke all on function retail_private.billing_claim(uuid,text,integer,smallint,text) from public,anon,authenticated;

-- 5. Factura de una venta, con el cliente como receptor si la venta tiene uno.
create or replace function public.retail_billing_begin(p_store uuid,p_sale uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_store public.retail_stores; v_customer public.retail_customers; v_env text; v_tipo smallint;
 v_claim jsonb; v_neto numeric(14,2); v_iva numeric(14,2); v_attempt public.retail_billing_attempts; v_cuit text;
 v_doc_tipo smallint:=99; v_doc_nro bigint:=0; v_cond smallint:=5; v_name text;
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
 if v_store.condicion_iva not in ('RI','MO') then return jsonb_build_object('state','skip','error','Los comercios exentos todavía no emiten comprobante desde la app'); end if;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','error','error','Falta cargar el certificado de ARCA en Mi comercio'); end if;
 if coalesce(v_sale.total,0)<=0 then return jsonb_build_object('state','error','error','La venta no tiene importe para facturar'); end if;

 -- Receptor: el cliente de la venta, si tiene documento cargado. Si no, consumidor final.
 if v_sale.customer_id is not null then
  select * into v_customer from public.retail_customers where id=v_sale.customer_id and store_id=p_store;
  if v_customer.tax_id is not null then
   v_doc_tipo:=case v_customer.tax_id_type when 'CUIT' then 80 when 'CUIL' then 86 else 96 end;
   v_doc_nro:=v_customer.tax_id::bigint; v_name:=coalesce(v_customer.business_name,v_customer.name);
  end if;
  v_cond:=case v_customer.iva_condition when 'RI' then 1 when 'MO' then 6 when 'EX' then 4 else 5 end;
 end if;
 if v_store.condicion_iva='RI' then
  -- A Responsables Inscriptos y Monotributistas, Factura A con su CUIT. Al resto, Factura B.
  if v_cond in (1,6) then
   if v_doc_tipo<>80 then return jsonb_build_object('state','error','error','Para Factura A cargá el CUIT del cliente en Clientes'); end if;
   v_tipo:=1;
  else v_tipo:=6; end if;
 else v_tipo:=11; end if;

 v_cuit:=regexp_replace(v_store.cuit,'\D','','g');
 v_claim:=retail_private.billing_claim(p_store,v_env,v_store.punto_venta_afip,v_tipo,v_cuit);
 if v_claim is not null then return v_claim; end if;
 if v_tipo in (1,6) then v_neto:=round(v_sale.total/1.21,2); v_iva:=v_sale.total-v_neto; else v_neto:=v_sale.total; v_iva:=0; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,lease_until,requested_by,
  doc_tipo,doc_nro,cond_iva_receptor,receptor_name)
 values(p_store,p_sale,v_env,v_store.punto_venta_afip,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_sale.total,v_neto,v_iva,now()+interval '3 minutes',auth.uid(),v_doc_tipo,v_doc_nro,v_cond,v_name) returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',v_cuit);
end $$;

-- 6. Nota de crédito de una devolución: mismo receptor que la factura y la factura como comprobante asociado.
create function public.retail_billing_begin_credit(p_store uuid,p_return uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_return public.retail_sale_returns; v_sale public.retail_sales; v_store public.retail_stores; v_original public.retail_billing_attempts;
 v_role text:=retail_private.role_for(p_store); v_env text; v_tipo smallint; v_claim jsonb; v_neto numeric(14,2); v_iva numeric(14,2);
 v_attempt public.retail_billing_attempts; v_cuit text; v_pto integer;
begin
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales') and not retail_private.has_permission(p_store,'attach_invoice')) then
  raise exception 'Tu perfil no permite emitir notas de crédito' using errcode='42501';
 end if;
 select * into v_return from public.retail_sale_returns where id=p_return and store_id=p_store for update;
 if not found then raise exception 'Devolución no encontrada'; end if;
 select * into v_sale from public.retail_sales where id=v_return.sale_id for update;
 if v_role not in ('owner','admin') and v_sale.created_by<>auth.uid() and not retail_private.can_review_sales(p_store,v_sale.shift_id) then
  raise exception 'Sin acceso a esta venta' using errcode='42501';
 end if;
 if v_return.credit_note_status='authorized' then
  return jsonb_build_object('state','authorized','cae',v_return.cae,'cae_vto',v_return.cae_vto,'cbte_nro',v_return.cbte_nro,'cbte_tipo',v_return.cbte_tipo);
 end if;
 if not v_return.credit_note_required or v_return.credit_note_reference is not null then return jsonb_build_object('state','skip'); end if;
 if v_sale.billing_status<>'authorized' then return jsonb_build_object('state','error','error','La venta todavía no tiene factura'); end if;
 select * into v_store from public.retail_stores where id=p_store;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','error','error','Falta cargar el certificado de ARCA en Mi comercio'); end if;
 v_tipo:=case v_sale.cbte_tipo when 1 then 3 when 6 then 8 when 11 then 13 end;
 if v_tipo is null then return jsonb_build_object('state','error','error','La factura de esta venta no admite nota de crédito desde la app'); end if;
 select * into v_original from public.retail_billing_attempts
  where sale_id=v_sale.id and return_id is null and status='authorized' order by resolved_at desc limit 1;
 if found and v_original.environment<>v_env then
  return jsonb_build_object('state','error','error','La factura se emitió en otro entorno de ARCA. Volvé a ese entorno para anularla');
 end if;
 v_pto:=coalesce(v_original.pto_vta,v_store.punto_venta_afip);
 v_cuit:=regexp_replace(v_store.cuit,'\D','','g');
 v_claim:=retail_private.billing_claim(p_store,v_env,v_pto,v_tipo,v_cuit);
 if v_claim is not null then return v_claim; end if;
 if v_tipo in (3,8) then v_neto:=round(v_return.total/1.21,2); v_iva:=v_return.total-v_neto; else v_neto:=v_return.total; v_iva:=0; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,return_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,lease_until,requested_by,
  doc_tipo,doc_nro,cond_iva_receptor,receptor_name,asoc)
 values(p_store,v_sale.id,p_return,v_env,v_pto,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_return.total,v_neto,v_iva,now()+interval '3 minutes',auth.uid(),
  coalesce(v_sale.receptor_doc_tipo,99),coalesce(v_sale.receptor_doc_nro,0),coalesce(v_sale.receptor_iva,5),v_sale.receptor_name,
  -- Las facturas emitidas antes de este circuito no tienen fecha guardada: se asocian sin fecha.
  jsonb_strip_nulls(jsonb_build_object('tipo',v_sale.cbte_tipo,'pto_vta',v_pto,'nro',v_sale.cbte_nro,'cuit',v_cuit,'fecha',v_original.cbte_fch)))
 returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',v_cuit);
end $$;

-- 7. Resultado: la factura actualiza la venta y la nota de crédito actualiza la devolución.
create or replace function public.retail_billing_finish(p_attempt uuid,p_result text,p_cae text default null,p_cae_vto date default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts; v_sale public.retail_sales; v_return public.retail_sale_returns;
 v_error text:=left(nullif(trim(coalesce(p_error,'')),''),500); v_current_cae text; v_done boolean; v_note boolean;
begin
 if p_result not in ('authorized','rejected','not_issued','cancelled','unknown','conflict') then raise exception 'Resultado inválido'; end if;
 select * into v from public.retail_billing_attempts where id=p_attempt for update;
 if not found then raise exception 'Pedido de facturación no encontrado'; end if;
 v_note:=v.return_id is not null;
 select * into v_sale from public.retail_sales where id=v.sale_id for update;
 if v_note then
  select * into v_return from public.retail_sale_returns where id=v.return_id for update;
  v_done:=v_return.credit_note_status='authorized'; v_current_cae:=v_return.cae;
 else
  v_done:=v_sale.billing_status='authorized'; v_current_cae:=v_sale.cae;
 end if;

 if p_result='authorized' then
  if nullif(trim(coalesce(p_cae,'')),'') is null or p_cae_vto is null or v.cbte_nro is null then raise exception 'Faltan el CAE, su vencimiento o el número'; end if;
  if v.status='authorized' then return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cbte_tipo',v.cbte_tipo,'cae',v.cae,'cae_vto',v.cae_vto); end if;
  if v_done and v_current_cae is distinct from trim(p_cae) then
   update public.retail_billing_attempts set status='conflict',cae=trim(p_cae),cae_vto=p_cae_vto,resolved_at=now(),
    error='Ya tenía comprobante y ARCA autorizó otro: corresponde anularlo con nota de crédito' where id=v.id;
   return jsonb_build_object('state','conflict','error','Quedaron dos comprobantes en ARCA para lo mismo. Hay que anular uno con nota de crédito');
  end if;
  update public.retail_billing_attempts set status='authorized',cae=trim(p_cae),cae_vto=p_cae_vto,error=null,resolved_at=now() where id=v.id;
  if v_note then
   update public.retail_sale_returns set credit_note_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=trim(p_cae),cae_vto=p_cae_vto,
    credit_note_error=null,credit_note_reference=case v.cbte_tipo when 3 then 'NC A ' when 8 then 'NC B ' else 'NC C ' end
     ||lpad(v.pto_vta::text,5,'0')||'-'||lpad(v.cbte_nro::text,8,'0')
   where id=v.return_id;
  else
   update public.retail_sales set billing_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=trim(p_cae),cae_vto=p_cae_vto,billing_error=null,
    receptor_doc_tipo=v.doc_tipo,receptor_doc_nro=v.doc_nro,receptor_name=v.receptor_name,receptor_iva=v.cond_iva_receptor
   where id=v.sale_id;
  end if;
  return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cbte_tipo',v.cbte_tipo,'cae',trim(p_cae),'cae_vto',p_cae_vto);
 end if;

 if v.status not in ('reserved','sent') then return jsonb_build_object('state',v.status); end if;
 if p_result='unknown' then
  -- Se deja en curso: el próximo pedido para este punto de venta lo consulta en ARCA antes de seguir.
  if v.status<>'sent' then raise exception 'Solo un pedido enviado puede quedar sin respuesta'; end if;
  update public.retail_billing_attempts set error=coalesce(v_error,'ARCA no respondió') where id=v.id;
  v_error:='ARCA no respondió. Antes de reintentar se revisa si el comprobante quedó hecho';
 else
  update public.retail_billing_attempts set status=p_result,error=v_error,resolved_at=now() where id=v.id;
  v_error:=coalesce(v_error,case when p_result in ('rejected','conflict') then 'ARCA rechazó el comprobante' else 'No se pudo pedir el CAE. Se reintenta' end);
 end if;
 if not v_done then
  if v_note then
   update public.retail_sale_returns set credit_note_status=case when p_result in ('rejected','conflict') then 'error' else 'retry' end,credit_note_error=v_error where id=v.return_id;
  else
   update public.retail_sales set billing_status=case when p_result in ('rejected','conflict') then 'error' else 'retry' end,billing_error=v_error,
    billing_attempts=least(billing_attempts+1,32767) where id=v.sale_id;
  end if;
 end if;
 return jsonb_build_object('state',case when p_result in ('rejected','conflict') then 'error' else 'retry' end,'error',v_error);
end $$;

-- 8. Factura a nombre de un cliente: se elige antes de facturar, también en ventas que no son fiadas.
create function public.retail_set_sale_receptor(p_store uuid,p_sale uuid,p_customer uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_customer public.retail_customers;
begin
 if not (retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Sin permiso para facturar en este comercio' using errcode='42501';
 end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 if v_sale.billing_status='authorized' then raise exception 'La factura ya se emitió. Para cambiar el cliente, anulá la venta y cobrala de nuevo'; end if;
 if v_sale.billing_status='none' or v_sale.return_status='voided' then raise exception 'Esta venta no se factura'; end if;
 if exists(select 1 from public.retail_billing_attempts where sale_id=p_sale and return_id is null and status in ('reserved','sent')) then
  raise exception 'Se está facturando en este momento. Probá en unos minutos';
 end if;
 if exists(select 1 from public.retail_customer_movements where sale_id=p_sale and kind='sale') and p_customer is distinct from v_sale.customer_id then
  raise exception 'En una venta fiada la factura va a nombre del cliente de la cuenta';
 end if;
 if p_customer is not null then
  select * into v_customer from public.retail_customers where id=p_customer and store_id=p_store;
  if not found or not v_customer.active then raise exception 'Cliente no disponible'; end if;
 end if;
 update public.retail_sales set customer_id=p_customer,customer_name=v_customer.name where id=p_sale;
end $$;

-- 9. La nota de crédito a mano queda para devoluciones anteriores o rechazadas, nunca mientras la app la está emitiendo.
create or replace function public.retail_attach_credit_note(p_store uuid,p_return uuid,p_reference text) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales') and not retail_private.has_permission(p_store,'attach_invoice')) then
  raise exception 'Tu perfil no permite cargar notas de crédito' using errcode='42501';
 end if;
 if p_reference is null or length(btrim(p_reference)) not between 1 and 120 then raise exception 'Escribí el número de la nota de crédito'; end if;
 if exists(select 1 from public.retail_billing_attempts where return_id=p_return and status in ('reserved','sent','authorized')) then
  raise exception 'La nota de crédito se está emitiendo o ya se emitió desde la app';
 end if;
 update public.retail_sale_returns set credit_note_reference=btrim(p_reference),credit_note_status='none',credit_note_error=null
  where id=p_return and store_id=p_store and credit_note_required and credit_note_status<>'authorized'
   and exists(select 1 from public.retail_sales s where s.id=sale_id and (v_role in ('owner','admin') or s.created_by=auth.uid() or retail_private.can_review_sales(p_store,s.shift_id)));
 if not found then raise exception 'Devolución no disponible'; end if;
end $$;

revoke all on function public.retail_billing_begin(uuid,uuid),public.retail_billing_begin_credit(uuid,uuid),public.retail_billing_finish(uuid,text,text,date,text),
 public.retail_set_sale_receptor(uuid,uuid,uuid),public.retail_attach_credit_note(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.retail_billing_begin(uuid,uuid),public.retail_billing_begin_credit(uuid,uuid),public.retail_set_sale_receptor(uuid,uuid,uuid),
 public.retail_attach_credit_note(uuid,uuid,text) to authenticated;
grant execute on function public.retail_billing_finish(uuid,text,text,date,text) to service_role;

notify pgrst,'reload schema';
commit;
