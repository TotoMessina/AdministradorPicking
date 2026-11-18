-- Facturación ARCA: lo que pide la guía de puesta en marcha.
-- 1. IVA por producto (alícuotas y exentos) y desglose por alícuota en facturas y notas de crédito.
-- 2. Consumidor final desde $10.000.000: hay que identificarlo (DNI, CUIL o CUIT) antes de pedir el CAE.
-- 3. Datos de la factura guardados en la venta para el ticket y el QR (fecha, punto de venta, entorno, neto, IVA, domicilio).
-- 4. Al pasar de homologación a producción, lo facturado en pruebas queda sin factura: no se mezcla con lo real.
-- 5. Contingencia CAEA (RG 5782/2025): CAEA por quincena, emisión cuando ARCA no responde, rendición y "sin movimiento".
-- Las notas de crédito salen siempre del punto de venta actual (CAE), asociadas a la factura original.
begin;

-- 1. IVA de cada producto. Por defecto 21%, como se facturaba hasta ahora.
alter table public.retail_products
 add column iva_rate text not null default '21' check (iva_rate in ('21','10.5','27','5','2.5','0','exento'));

create function public.retail_set_products_iva(p_store uuid,p_products uuid[],p_rate text) returns integer
language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Tu perfil no permite cambiar el IVA de los productos' using errcode='42501';
 end if;
 if p_rate is null or p_rate not in ('21','10.5','27','5','2.5','0','exento') then raise exception 'Alícuota de IVA inválida'; end if;
 if p_products is null or cardinality(p_products) not between 1 and 5000 then raise exception 'Elegí entre 1 y 5000 productos'; end if;
 update public.retail_products set iva_rate=p_rate where store_id=p_store and id=any(p_products) and iva_rate<>p_rate;
 get diagnostics v_count=row_count;
 return v_count;
end $$;
revoke all on function public.retail_set_products_iva(uuid,uuid[],text) from public,anon;
grant execute on function public.retail_set_products_iva(uuid,uuid[],text) to authenticated;

-- Desglose de un total por alícuota según los renglones. El total se reparte en proporción a cada renglón
-- (descuentos y recargos incluidos); la alícuota con más importe se queda con los centavos del redondeo.
-- Sin producto (importe manual) o producto borrado: 21%.
create function retail_private.vat_breakdown(p_store uuid,p_items jsonb,p_total numeric) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r record; v_groups jsonb; v_sum numeric:=0; v_left numeric:=round(p_total,2); v_count integer; v_i integer:=0; v_share numeric; v_pct numeric; v_base numeric;
 v_neto numeric:=0; v_iva numeric:=0; v_opex numeric:=0; v_alic jsonb:='[]'::jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object('rate',rate,'amount',amount) order by amount,rate),'[]'::jsonb),coalesce(sum(amount),0),count(*)
  into v_groups,v_sum,v_count
  from (select coalesce(p.iva_rate,'21') as rate,sum(greatest(coalesce(nullif(x->>'subtotal','')::numeric,0),0)) as amount
   from jsonb_array_elements(case when jsonb_typeof(p_items)='array' then p_items else '[]'::jsonb end) x
   left join public.retail_products p on p.store_id=p_store and p.id::text=coalesce(x->>'productId',x->>'product_id')
   group by 1) g
  where amount>0;
 if v_sum<=0 then v_groups:=jsonb_build_array(jsonb_build_object('rate','21','amount',v_left)); v_sum:=v_left; v_count:=1; end if;
 for r in select value->>'rate' as rate,(value->>'amount')::numeric as amount from jsonb_array_elements(v_groups) loop
  v_i:=v_i+1;
  v_share:=case when v_i=v_count then v_left else round(round(p_total,2)*r.amount/v_sum,2) end;
  v_left:=v_left-v_share;
  if r.rate='exento' then v_opex:=v_opex+v_share; continue; end if;
  v_pct:=r.rate::numeric;
  v_base:=round(v_share/(1+v_pct/100),2);
  v_neto:=v_neto+v_base; v_iva:=v_iva+(v_share-v_base);
  v_alic:=v_alic||jsonb_build_array(jsonb_build_object(
   'id',case r.rate when '0' then 3 when '10.5' then 4 when '21' then 5 when '27' then 6 when '5' then 8 when '2.5' then 9 end,
   'rate',r.rate,'base',v_base,'importe',v_share-v_base));
 end loop;
 return jsonb_build_object('neto',v_neto,'iva',v_iva,'op_ex',v_opex,'alicuotas',v_alic);
end $$;
revoke all on function retail_private.vat_breakdown(uuid,jsonb,numeric) from public,anon,authenticated;

-- 2. Pedidos, ventas y comercio: desglose, contingencia y datos para el ticket.
alter table public.retail_billing_attempts
 add column iva jsonb, add column imp_op_ex numeric(14,2) not null default 0,
 add column mode text not null default 'cae' check (mode in ('cae','caea')),
 add column caea_id uuid, add column reported_at timestamptz, add column report_error text;

alter table public.retail_sales
 add column invoice_pto_vta integer,
 add column invoice_date date,
 add column invoice_environment text check (invoice_environment is null or invoice_environment in ('homo','prod')),
 add column invoice_net numeric(14,2),
 add column invoice_vat numeric(14,2),
 add column invoice_exempt numeric(14,2),
 add column invoice_vat_detail jsonb,
 add column authorization_type text check (authorization_type is null or authorization_type in ('E','A')),
 add column receptor_address text;

alter table public.retail_stores
 add column punto_venta_caea integer check (punto_venta_caea is null or punto_venta_caea between 1 and 99998);

-- Facturas ya autorizadas: se completan desde su pedido a ARCA (todas al 21%, como se emitieron).
update public.retail_sales s
 set invoice_pto_vta=a.pto_vta, invoice_date=a.cbte_fch, invoice_environment=a.environment, invoice_net=a.imp_neto, invoice_vat=a.imp_iva,
  invoice_exempt=0, authorization_type='E',
  invoice_vat_detail=case when a.imp_iva>0 then jsonb_build_array(jsonb_build_object('id',5,'rate','21','base',a.imp_neto,'importe',a.imp_iva)) else '[]'::jsonb end
 from public.retail_billing_attempts a
 where a.sale_id=s.id and a.return_id is null and a.status='authorized' and a.cae=s.cae and s.billing_status='authorized';

-- 3. CAEA por quincena y numeración propia del punto de venta de contingencia.
create table public.retail_billing_caea (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 environment text not null check (environment in ('homo','prod')),
 periodo integer not null, orden smallint not null check (orden in (1,2)),
 caea text not null, valid_from date not null, valid_to date not null, report_deadline date not null,
 no_movement_informed_at timestamptz, no_movement_error text,
 created_at timestamptz not null default now(),
 unique (store_id,environment,periodo,orden)
);
alter table public.retail_billing_caea enable row level security;
create policy owner_read on public.retail_billing_caea for select to authenticated using (retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_billing_caea from public,anon,authenticated;
grant select on public.retail_billing_caea to authenticated;

create table retail_private.billing_caea_numbers (
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 environment text not null check (environment in ('homo','prod')),
 pto_vta integer not null, cbte_tipo smallint not null,
 last_nro bigint not null check (last_nro>=0), synced_at timestamptz not null default now(),
 primary key (store_id,environment,pto_vta,cbte_tipo)
);
revoke all on retail_private.billing_caea_numbers from public,anon,authenticated;

create function public.retail_set_billing_contingency(p_store uuid,p_pto integer) returns void
language plpgsql security definer set search_path='' as $$
declare v_pto integer;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo el dueño o un administrador puede cambiar el punto de venta de contingencia' using errcode='42501';
 end if;
 if p_pto is not null and (p_pto<1 or p_pto>99998) then raise exception 'El punto de venta va de 1 a 99998'; end if;
 select punto_venta_afip into v_pto from public.retail_stores where id=p_store;
 if p_pto is not null and p_pto=v_pto then raise exception 'El punto de venta de contingencia (CAEA) tiene que ser distinto del de facturación'; end if;
 update public.retail_stores set punto_venta_caea=p_pto where id=p_store;
end $$;
revoke all on function public.retail_set_billing_contingency(uuid,integer) from public,anon;
grant execute on function public.retail_set_billing_contingency(uuid,integer) to authenticated;

-- 4. Qué se factura y a quién: tipo, receptor, regla del consumidor final identificado y desglose.
create function retail_private.billing_sale_plan(p_sale public.retail_sales,p_store public.retail_stores) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_customer public.retail_customers; v_doc_tipo smallint:=99; v_doc_nro bigint:=0; v_cond smallint:=5; v_name text; v_tipo smallint; v_vat jsonb;
begin
 if p_sale.customer_id is not null then
  select * into v_customer from public.retail_customers where id=p_sale.customer_id and store_id=p_store.id;
  if v_customer.tax_id is not null then
   v_doc_tipo:=case v_customer.tax_id_type when 'CUIT' then 80 when 'CUIL' then 86 else 96 end;
   v_doc_nro:=v_customer.tax_id::bigint; v_name:=coalesce(v_customer.business_name,v_customer.name);
  end if;
  v_cond:=case v_customer.iva_condition when 'RI' then 1 when 'MO' then 6 when 'EX' then 4 else 5 end;
 end if;
 if p_store.condicion_iva='RI' then
  -- A Responsables Inscriptos y Monotributistas, Factura A con su CUIT. Al resto, Factura B.
  if v_cond in (1,6) then
   if v_doc_tipo<>80 then return jsonb_build_object('error','Para Factura A cargá el CUIT del cliente en Clientes'); end if;
   v_tipo:=1;
  else v_tipo:=6; end if;
 else v_tipo:=11; end if;
 -- RG 5700/2025: desde $10.000.000 el consumidor final se identifica.
 if v_doc_tipo=99 and p_sale.total>=10000000 then
  return jsonb_build_object('error','Desde $10.000.000 ARCA exige identificar al cliente. En Ver ventas elegí la factura a nombre de un cliente con DNI, CUIL o CUIT');
 end if;
 if v_tipo in (1,6) then v_vat:=retail_private.vat_breakdown(p_store.id,p_sale.items,p_sale.total);
 else v_vat:=jsonb_build_object('neto',p_sale.total,'iva',0,'op_ex',0,'alicuotas','[]'::jsonb); end if;
 return jsonb_build_object('tipo',v_tipo,'doc_tipo',v_doc_tipo,'doc_nro',v_doc_nro,'cond',v_cond,'name',v_name,'vat',v_vat);
end $$;
revoke all on function retail_private.billing_sale_plan(public.retail_sales,public.retail_stores) from public,anon,authenticated;

-- 5. Factura de una venta (mismo circuito que 202611030003, con el plan de arriba).
create or replace function public.retail_billing_begin(p_store uuid,p_sale uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_store public.retail_stores; v_env text; v_plan jsonb; v_claim jsonb; v_attempt public.retail_billing_attempts; v_cuit text;
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

 v_plan:=retail_private.billing_sale_plan(v_sale,v_store);
 if v_plan ? 'error' then return jsonb_build_object('state','error','error',v_plan->>'error'); end if;

 v_cuit:=regexp_replace(v_store.cuit,'\D','','g');
 v_claim:=retail_private.billing_claim(p_store,v_env,v_store.punto_venta_afip,(v_plan->>'tipo')::smallint,v_cuit);
 if v_claim is not null then return v_claim; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,imp_op_ex,iva,lease_until,requested_by,
  doc_tipo,doc_nro,cond_iva_receptor,receptor_name)
 values(p_store,p_sale,v_env,v_store.punto_venta_afip,(v_plan->>'tipo')::smallint,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_sale.total,(v_plan#>>'{vat,neto}')::numeric,(v_plan#>>'{vat,iva}')::numeric,(v_plan#>>'{vat,op_ex}')::numeric,v_plan#>'{vat,alicuotas}',
  now()+interval '3 minutes',auth.uid(),(v_plan->>'doc_tipo')::smallint,(v_plan->>'doc_nro')::bigint,(v_plan->>'cond')::smallint,v_plan->>'name')
 returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',v_cuit);
end $$;

-- 6. Nota de crédito: desglose de lo devuelto, emitida en el punto de venta actual y asociada a la factura original
-- (que puede ser de otro punto de venta, del de contingencia o de antes de un cambio).
create or replace function public.retail_billing_begin_credit(p_store uuid,p_return uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_return public.retail_sale_returns; v_sale public.retail_sales; v_store public.retail_stores; v_original public.retail_billing_attempts;
 v_role text:=retail_private.role_for(p_store); v_env text; v_tipo smallint; v_claim jsonb; v_vat jsonb;
 v_attempt public.retail_billing_attempts; v_cuit text; v_asoc_pto integer;
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
 v_asoc_pto:=coalesce(v_original.pto_vta,v_sale.invoice_pto_vta,v_store.punto_venta_afip);
 v_cuit:=regexp_replace(v_store.cuit,'\D','','g');
 v_claim:=retail_private.billing_claim(p_store,v_env,v_store.punto_venta_afip,v_tipo,v_cuit);
 if v_claim is not null then return v_claim; end if;
 if v_tipo in (3,8) then v_vat:=retail_private.vat_breakdown(p_store,v_return.items,v_return.total);
 else v_vat:=jsonb_build_object('neto',v_return.total,'iva',0,'op_ex',0,'alicuotas','[]'::jsonb); end if;
 insert into public.retail_billing_attempts(store_id,sale_id,return_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,imp_op_ex,iva,lease_until,requested_by,
  doc_tipo,doc_nro,cond_iva_receptor,receptor_name,asoc)
 values(p_store,v_sale.id,p_return,v_env,v_store.punto_venta_afip,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_return.total,(v_vat->>'neto')::numeric,(v_vat->>'iva')::numeric,(v_vat->>'op_ex')::numeric,v_vat->'alicuotas',now()+interval '3 minutes',auth.uid(),
  coalesce(v_sale.receptor_doc_tipo,99),coalesce(v_sale.receptor_doc_nro,0),coalesce(v_sale.receptor_iva,5),v_sale.receptor_name,
  -- Las facturas emitidas antes del circuito actual no tienen fecha guardada: se asocian sin fecha.
  jsonb_strip_nulls(jsonb_build_object('tipo',v_sale.cbte_tipo,'pto_vta',v_asoc_pto,'nro',v_sale.cbte_nro,'cuit',v_cuit,'fecha',coalesce(v_original.cbte_fch,v_sale.invoice_date))))
 returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',v_cuit);
end $$;

-- Datos que la venta guarda al quedar autorizada (por CAE o por CAEA).
create function retail_private.billing_mark_sale(p_attempt public.retail_billing_attempts,p_customer uuid) returns text
language plpgsql security definer set search_path='' as $$
declare v_address text;
begin
 if p_attempt.doc_tipo<>99 and p_customer is not null then
  select nullif(btrim(address),'') into v_address from public.retail_customers where id=p_customer and store_id=p_attempt.store_id;
 end if;
 update public.retail_sales set billing_status='authorized',cbte_tipo=p_attempt.cbte_tipo,cbte_nro=p_attempt.cbte_nro,cae=p_attempt.cae,cae_vto=p_attempt.cae_vto,billing_error=null,
  receptor_doc_tipo=p_attempt.doc_tipo,receptor_doc_nro=p_attempt.doc_nro,receptor_name=p_attempt.receptor_name,receptor_iva=p_attempt.cond_iva_receptor,receptor_address=v_address,
  invoice_pto_vta=p_attempt.pto_vta,invoice_date=p_attempt.cbte_fch,invoice_environment=p_attempt.environment,invoice_net=p_attempt.imp_neto,invoice_vat=p_attempt.imp_iva,
  invoice_exempt=p_attempt.imp_op_ex,invoice_vat_detail=coalesce(p_attempt.iva,'[]'::jsonb),authorization_type=case p_attempt.mode when 'caea' then 'A' else 'E' end
 where id=p_attempt.sale_id;
 return v_address;
end $$;
revoke all on function retail_private.billing_mark_sale(public.retail_billing_attempts,uuid) from public,anon,authenticated;

-- Respuesta con los datos del comprobante, para que la app arme el ticket sin recargar.
create function retail_private.billing_result(p_attempt public.retail_billing_attempts,p_address text) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('state','authorized','cbte_nro',p_attempt.cbte_nro,'cbte_tipo',p_attempt.cbte_tipo,'cae',p_attempt.cae,'cae_vto',p_attempt.cae_vto,
  'pto_vta',p_attempt.pto_vta,'cbte_fch',p_attempt.cbte_fch,'environment',p_attempt.environment,'imp_neto',p_attempt.imp_neto,'imp_iva',p_attempt.imp_iva,
  'imp_op_ex',p_attempt.imp_op_ex,'iva',coalesce(p_attempt.iva,'[]'::jsonb),'receptor_iva',p_attempt.cond_iva_receptor,'receptor_address',p_address,
  'authorization_type',case p_attempt.mode when 'caea' then 'A' else 'E' end);
$$;
revoke all on function retail_private.billing_result(public.retail_billing_attempts,text) from public,anon,authenticated;

-- 7. Resultado del pedido (mismo circuito que 202611030003; la venta guarda los datos del comprobante).
create or replace function public.retail_billing_finish(p_attempt uuid,p_result text,p_cae text default null,p_cae_vto date default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts; v_sale public.retail_sales; v_return public.retail_sale_returns;
 v_error text:=left(nullif(trim(coalesce(p_error,'')),''),500); v_current_cae text; v_done boolean; v_note boolean; v_address text;
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
  if v.status='authorized' then return retail_private.billing_result(v,v_sale.receptor_address); end if;
  if v_done and v_current_cae is distinct from trim(p_cae) then
   update public.retail_billing_attempts set status='conflict',cae=trim(p_cae),cae_vto=p_cae_vto,resolved_at=now(),
    error='Ya tenía comprobante y ARCA autorizó otro: corresponde anularlo con nota de crédito' where id=v.id;
   return jsonb_build_object('state','conflict','error','Quedaron dos comprobantes en ARCA para lo mismo. Hay que anular uno con nota de crédito');
  end if;
  update public.retail_billing_attempts set status='authorized',cae=trim(p_cae),cae_vto=p_cae_vto,error=null,resolved_at=now() where id=v.id returning * into v;
  if v_note then
   update public.retail_sale_returns set credit_note_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=v.cae,cae_vto=v.cae_vto,
    credit_note_error=null,credit_note_reference=case v.cbte_tipo when 3 then 'NC A ' when 8 then 'NC B ' else 'NC C ' end
     ||lpad(v.pto_vta::text,5,'0')||'-'||lpad(v.cbte_nro::text,8,'0')
   where id=v.return_id;
  else
   v_address:=retail_private.billing_mark_sale(v,v_sale.customer_id);
  end if;
  return retail_private.billing_result(v,v_address);
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

-- 8. Factura con CAEA cuando ARCA no responde. La llama la función del servidor con la sesión de quien vende.
-- El número sale de la numeración propia del punto de venta de contingencia, sincronizada con ARCA cuando responde.
create function public.retail_billing_issue_caea(p_store uuid,p_sale uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_store public.retail_stores; v_env text; v_plan jsonb; v_caea public.retail_billing_caea;
 v_today date:=(now() at time zone 'America/Argentina/Buenos_Aires')::date; v_nro bigint; v_attempt public.retail_billing_attempts; v_address text;
begin
 if not (retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Sin permiso para facturar en este comercio' using errcode='42501';
 end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 if v_sale.billing_status='authorized' or v_sale.billing_status='none' or v_sale.return_status='voided' then return jsonb_build_object('state','skip'); end if;
 select * into v_store from public.retail_stores where id=p_store;
 if not v_store.billing_enabled or v_store.condicion_iva not in ('RI','MO') or v_store.punto_venta_caea is null then
  return jsonb_build_object('state','retry','error','Sin punto de venta de contingencia (CAEA) configurado');
 end if;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','retry','error','Falta el certificado de ARCA'); end if;
 -- Un pedido de CAE enviado sin respuesta puede haber quedado autorizado: primero se consulta.
 if exists(select 1 from public.retail_billing_attempts where sale_id=p_sale and return_id is null and status in ('reserved','sent')) then
  return jsonb_build_object('state','retry','error','Hay un pedido de CAE sin confirmar para esta venta');
 end if;
 v_plan:=retail_private.billing_sale_plan(v_sale,v_store);
 if v_plan ? 'error' then return jsonb_build_object('state','error','error',v_plan->>'error'); end if;
 select * into v_caea from public.retail_billing_caea where store_id=p_store and environment=v_env and v_today between valid_from and valid_to;
 if not found then return jsonb_build_object('state','retry','error','ARCA no responde y no hay CAEA vigente para esta quincena'); end if;
 update retail_private.billing_caea_numbers set last_nro=last_nro+1
  where store_id=p_store and environment=v_env and pto_vta=v_store.punto_venta_caea and cbte_tipo=(v_plan->>'tipo')::smallint
  returning last_nro into v_nro;
 if v_nro is null then
  return jsonb_build_object('state','retry','error','La numeración de contingencia todavía no se sincronizó con ARCA');
 end if;
 insert into public.retail_billing_attempts(store_id,sale_id,environment,pto_vta,cbte_tipo,cbte_nro,cbte_fch,imp_total,imp_neto,imp_iva,imp_op_ex,iva,
  status,cae,cae_vto,lease_until,requested_by,resolved_at,doc_tipo,doc_nro,cond_iva_receptor,receptor_name,mode,caea_id)
 values(p_store,p_sale,v_env,v_store.punto_venta_caea,(v_plan->>'tipo')::smallint,v_nro,v_today,
  v_sale.total,(v_plan#>>'{vat,neto}')::numeric,(v_plan#>>'{vat,iva}')::numeric,(v_plan#>>'{vat,op_ex}')::numeric,v_plan#>'{vat,alicuotas}',
  'authorized',v_caea.caea,v_caea.valid_to,now(),auth.uid(),now(),(v_plan->>'doc_tipo')::smallint,(v_plan->>'doc_nro')::bigint,(v_plan->>'cond')::smallint,v_plan->>'name',
  'caea',v_caea.id)
 returning * into v_attempt;
 v_address:=retail_private.billing_mark_sale(v_attempt,v_sale.customer_id);
 return retail_private.billing_result(v_attempt,v_address);
end $$;

-- 9. Mantenimiento del CAEA (función del servidor): qué pedir, qué numeración sincronizar, qué rendir y qué informar sin movimiento.
create function public.retail_billing_can_maintain(p_store uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales');
$$;

create function public.retail_billing_caea_context(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_store public.retail_stores; v_env text; v_today date:=(now() at time zone 'America/Argentina/Buenos_Aires')::date;
 v_cur_periodo integer; v_cur_orden smallint; v_next_periodo integer; v_next_orden smallint; v_next_start date; v_periods jsonb:='[]'::jsonb;
begin
 select * into v_store from public.retail_stores where id=p_store;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if not found or not v_store.billing_enabled or v_store.punto_venta_caea is null or v_store.condicion_iva not in ('RI','MO') then
  return jsonb_build_object('enabled',false);
 end if;
 v_cur_periodo:=to_char(v_today,'YYYYMM')::integer;
 v_cur_orden:=case when extract(day from v_today)<=15 then 1 else 2 end;
 if v_cur_orden=1 then v_next_periodo:=v_cur_periodo; v_next_orden:=2; v_next_start:=date_trunc('month',v_today)::date+15;
 else v_next_start:=(date_trunc('month',v_today)+interval '1 month')::date; v_next_periodo:=to_char(v_next_start,'YYYYMM')::integer; v_next_orden:=1; end if;
 if not exists(select 1 from public.retail_billing_caea where store_id=p_store and environment=v_env and periodo=v_cur_periodo and orden=v_cur_orden) then
  v_periods:=v_periods||jsonb_build_array(jsonb_build_object('periodo',v_cur_periodo,'orden',v_cur_orden));
 end if;
 -- El próximo se pide en los 5 días previos a su inicio.
 if v_next_start-v_today<=5 and not exists(select 1 from public.retail_billing_caea where store_id=p_store and environment=v_env and periodo=v_next_periodo and orden=v_next_orden) then
  v_periods:=v_periods||jsonb_build_array(jsonb_build_object('periodo',v_next_periodo,'orden',v_next_orden));
 end if;
 return jsonb_build_object('enabled',true,'environment',v_env,'cuit',regexp_replace(v_store.cuit,'\D','','g'),'pto_vta',v_store.punto_venta_caea,
  'tipos',case v_store.condicion_iva when 'RI' then '[1,6]'::jsonb else '[11]'::jsonb end,
  'periods',v_periods,
  'reports',coalesce((select jsonb_agg(to_jsonb(a) order by a.cbte_tipo,a.cbte_nro) from (
    select a.id,a.pto_vta,a.cbte_tipo,a.cbte_nro,a.cbte_fch,a.imp_total,a.imp_neto,a.imp_iva,a.imp_op_ex,a.iva,a.doc_tipo,a.doc_nro,a.cond_iva_receptor,
     a.cae,a.created_at from public.retail_billing_attempts a
    where a.store_id=p_store and a.environment=v_env and a.mode='caea' and a.status='authorized' and a.reported_at is null
    order by a.cbte_tipo,a.cbte_nro limit 50) a),'[]'::jsonb),
  'no_movement',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'caea',c.caea)) from public.retail_billing_caea c
    where c.store_id=p_store and c.environment=v_env and c.valid_to<v_today and v_today<=c.report_deadline and c.no_movement_informed_at is null
     and not exists(select 1 from public.retail_billing_attempts a where a.caea_id=c.id)),'[]'::jsonb));
end $$;

create function public.retail_billing_save_caea(p_store uuid,p_environment text,p_periodo integer,p_orden smallint,p_caea text,p_from date,p_to date,p_deadline date) returns void
language sql security definer set search_path='' as $$
 insert into public.retail_billing_caea(store_id,environment,periodo,orden,caea,valid_from,valid_to,report_deadline)
 values(p_store,p_environment,p_periodo,p_orden,p_caea,p_from,p_to,p_deadline)
 on conflict (store_id,environment,periodo,orden) do update set caea=excluded.caea,valid_from=excluded.valid_from,valid_to=excluded.valid_to,report_deadline=excluded.report_deadline;
$$;

create function public.retail_billing_sync_caea_number(p_store uuid,p_environment text,p_pto integer,p_tipo smallint,p_last bigint) returns void
language sql security definer set search_path='' as $$
 insert into retail_private.billing_caea_numbers(store_id,environment,pto_vta,cbte_tipo,last_nro,synced_at) values(p_store,p_environment,p_pto,p_tipo,p_last,now())
 on conflict (store_id,environment,pto_vta,cbte_tipo) do update set last_nro=greatest(retail_private.billing_caea_numbers.last_nro,excluded.last_nro),synced_at=now();
$$;

create function public.retail_billing_caea_reported(p_attempt uuid,p_ok boolean,p_error text default null) returns void
language sql security definer set search_path='' as $$
 update public.retail_billing_attempts set reported_at=case when p_ok then now() end,report_error=case when p_ok then null else left(p_error,500) end
 where id=p_attempt and mode='caea' and reported_at is null;
$$;

create function public.retail_billing_caea_no_movement(p_caea uuid,p_ok boolean,p_error text default null) returns void
language sql security definer set search_path='' as $$
 update public.retail_billing_caea set no_movement_informed_at=case when p_ok then now() end,no_movement_error=case when p_ok then null else left(p_error,500) end
 where id=p_caea and no_movement_informed_at is null;
$$;

-- Estado de la contingencia para Mi comercio (dueño o administrador).
create function public.retail_billing_caea_status(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_env text; v_today date:=(now() at time zone 'America/Argentina/Buenos_Aires')::date; v_caea public.retail_billing_caea;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return null; end if;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 select * into v_caea from public.retail_billing_caea where store_id=p_store and environment=v_env and v_today between valid_from and valid_to;
 return jsonb_build_object('caea',v_caea.caea,'valid_to',v_caea.valid_to,
  'unreported',(select count(*) from public.retail_billing_attempts where store_id=p_store and environment=v_env and mode='caea' and status='authorized' and reported_at is null),
  'report_error',(select report_error from public.retail_billing_attempts where store_id=p_store and environment=v_env and mode='caea' and reported_at is null and report_error is not null order by created_at desc limit 1),
  'numbering_ready',exists(select 1 from retail_private.billing_caea_numbers n join public.retail_stores s on s.id=n.store_id
    where n.store_id=p_store and n.environment=v_env and n.pto_vta=s.punto_venta_caea));
end $$;

-- 10. Pasar de homologación a producción: lo facturado en pruebas y lo que esperaba factura de antes del cambio
-- queda sin factura. Desde el cambio, cada venta se factura en producción.
create or replace function public.retail_set_billing_credentials(p_store uuid,p_cert text,p_key text,p_environment text default 'homo')
returns void language plpgsql security definer set search_path='' as $$
declare current_secret uuid; v_old_env text; v_cert text:=nullif(trim(coalesce(p_cert,'')),''); v_key text:=nullif(trim(coalesce(p_key,'')),'');
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo el dueño o un administrador puede cargar el certificado de ARCA' using errcode='42501';
 end if;
 if p_environment is null or p_environment not in ('homo','prod') then raise exception 'Elegí homologación (pruebas) o producción'; end if;
 if v_cert is null or v_cert not like '-----BEGIN CERTIFICATE-----%' then raise exception 'El certificado (.crt) no es válido: tiene que empezar con -----BEGIN CERTIFICATE-----'; end if;
 if v_key is not null and v_key !~ '^-----BEGIN (RSA )?PRIVATE KEY-----' then raise exception 'La clave privada (.key) no es válida'; end if;
 select arca_key_secret,arca_environment into current_secret,v_old_env from retail_private.store_billing_credentials where store_id=p_store for update;
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

 if v_old_env='homo' and p_environment='prod' then
  if exists(select 1 from public.retail_billing_attempts where store_id=p_store and status in ('reserved','sent')) then
   raise exception 'Hay una factura en curso. Esperá unos minutos y volvé a guardar';
  end if;
  create temporary table pg_temp.billing_cutover_sales on commit drop as
   select s.id from public.retail_sales s
   where s.store_id=p_store and (s.billing_status in ('pending','retry','error') or (s.billing_status='authorized' and exists(select 1 from public.retail_billing_attempts a
    where a.sale_id=s.id and a.return_id is null and a.status='authorized' and a.environment='homo' and a.cae=s.cae)));
  update public.retail_sale_returns r set credit_note_required=false,credit_note_status='none',cbte_tipo=null,cbte_nro=null,cae=null,cae_vto=null,credit_note_error=null
   where r.store_id=p_store and r.sale_id in (select id from pg_temp.billing_cutover_sales);
  update public.retail_sales s set billing_status='none',billing_error=null,cbte_tipo=null,cbte_nro=null,cae=null,cae_vto=null,
   receptor_doc_tipo=null,receptor_doc_nro=null,receptor_name=null,receptor_iva=null,receptor_address=null,
   invoice_pto_vta=null,invoice_date=null,invoice_environment=null,invoice_net=null,invoice_vat=null,invoice_exempt=null,invoice_vat_detail=null,authorization_type=null
   where s.id in (select id from pg_temp.billing_cutover_sales);
  drop table pg_temp.billing_cutover_sales;
 end if;
end $$;

revoke all on function public.retail_billing_begin(uuid,uuid),public.retail_billing_begin_credit(uuid,uuid),public.retail_billing_finish(uuid,text,text,date,text),
 public.retail_billing_issue_caea(uuid,uuid),public.retail_billing_can_maintain(uuid),public.retail_billing_caea_context(uuid),
 public.retail_billing_save_caea(uuid,text,integer,smallint,text,date,date,date),public.retail_billing_sync_caea_number(uuid,text,integer,smallint,bigint),
 public.retail_billing_caea_reported(uuid,boolean,text),public.retail_billing_caea_no_movement(uuid,boolean,text),public.retail_billing_caea_status(uuid),
 public.retail_set_billing_credentials(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.retail_billing_begin(uuid,uuid),public.retail_billing_begin_credit(uuid,uuid),public.retail_billing_issue_caea(uuid,uuid),
 public.retail_billing_can_maintain(uuid),public.retail_billing_caea_status(uuid),public.retail_set_billing_credentials(uuid,text,text,text) to authenticated;
grant execute on function public.retail_billing_finish(uuid,text,text,date,text),public.retail_billing_caea_context(uuid),
 public.retail_billing_save_caea(uuid,text,integer,smallint,text,date,date,date),public.retail_billing_sync_caea_number(uuid,text,integer,smallint,bigint),
 public.retail_billing_caea_reported(uuid,boolean,text),public.retail_billing_caea_no_movement(uuid,boolean,text) to service_role;

notify pgrst,'reload schema';
commit;
