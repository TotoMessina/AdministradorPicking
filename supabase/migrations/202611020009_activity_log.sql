begin;
-- Actividad: un único lugar para ver quién hizo qué. Lo que ya tenía historial propio (cajas, plata, anulaciones,
-- bajas de productos, stock, conteos, pagos) se lee de su tabla. Lo que no quedaba registrado (precios, ediciones
-- de productos, permisos, personas y configuración) se guarda en un registro nuevo que nadie puede editar ni borrar.
-- Nunca se guardan contraseñas, tokens ni certificados: cada tabla registra solo las columnas listadas.

create table public.retail_audit_log (
 id bigint generated always as identity primary key, store_id uuid not null, at timestamptz not null default now(),
 actor_id uuid, actor_email text, branch_id uuid,
 kind text not null check(kind in ('precios','productos','stock','permisos','configuracion','borrados')),
 entity text not null, entity_id text, entity_name text, operation text not null check(operation in ('INSERT','UPDATE','DELETE')),
 before jsonb, after jsonb
);
create index retail_audit_log_store_at on public.retail_audit_log(store_id,at desc);
alter table public.retail_audit_log enable row level security;
create policy managers_read on public.retail_audit_log for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_audit_log from public,anon,authenticated;
grant select on public.retail_audit_log to authenticated;

-- Inalterable: ni la app ni una función pueden cambiar o borrar un registro, salvo la limpieza por antigüedad.
create function retail_private.audit_log_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' and current_setting('retail.audit_purge',true)='on' then return old; end if;
 raise exception 'El registro de actividad es de solo lectura';
end $$;
create trigger retail_audit_log_immutable before update or delete on public.retail_audit_log for each row execute function retail_private.audit_log_immutable();

-- Conservación: 24 meses en este registro. Las ventas, cajas y demás historiales operativos no se borran.
create function retail_private.purge_audit_log() returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
 perform set_config('retail.audit_purge','on',true);
 delete from public.retail_audit_log where at<now()-interval '24 months';
 get diagnostics removed=row_count;
 perform set_config('retail.audit_purge','off',true);
 return removed;
end $$;
revoke all on function retail_private.purge_audit_log() from public,anon,authenticated;

-- TG_ARGV: tipo de acción, nombre de la entidad y columnas permitidas, separadas por coma.
create function retail_private.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
declare old_row jsonb:=case when tg_op<>'INSERT' then to_jsonb(old) end; new_row jsonb:=case when tg_op<>'DELETE' then to_jsonb(new) end;
 row_data jsonb; cols text[]:=string_to_array(tg_argv[2],','); col text; v_before jsonb:='{}'; v_after jsonb:='{}';
 v_kind text:=tg_argv[0]; v_branch uuid; v_location text:=nullif(current_setting('retail.inventory_location',true),''); v_name text;
begin
 row_data:=coalesce(new_row,old_row);
 -- El stock solo se registra cuando se edita desde la ficha del producto: ventas, devoluciones, conteos,
 -- reposiciones y traslados ya quedan en su propio historial.
 if tg_table_name='retail_products' and current_setting('retail.audit_product_form',true) is distinct from 'on' then cols:=array_remove(cols,'stock'); end if;
 foreach col in array cols loop
  if tg_op='UPDATE' and (old_row->col) is not distinct from (new_row->col) then continue; end if;
  if old_row ? col then v_before:=v_before||jsonb_build_object(col,old_row->col); end if;
  if new_row ? col then v_after:=v_after||jsonb_build_object(col,new_row->col); end if;
 end loop;
 if tg_op='UPDATE' and v_before='{}'::jsonb and v_after='{}'::jsonb then return null; end if;
 if tg_op='DELETE' then v_kind:='borrados';
 elsif tg_table_name='retail_products' then
  v_kind:=case when v_after ? 'stock' then 'stock' when v_after ?| array['price','cost','sale_markup'] then 'precios' else 'productos' end;
 end if;
 if tg_table_name='retail_branches' then v_branch:=(row_data->>'id')::uuid;
 elsif row_data ? 'branch_id' and nullif(row_data->>'branch_id','') is not null then v_branch:=(row_data->>'branch_id')::uuid;
 elsif v_location ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_branch:=v_location::uuid;
 end if;
 v_name:=coalesce(row_data->>'name',row_data->>'product_name',row_data->>'email',row_data->>'role');
 if tg_table_name='retail_members' then select email into v_name from auth.users where id=(row_data->>'user_id')::uuid; end if;
 if tg_table_name='retail_price_overrides' then select name into v_name from public.retail_products where id=(row_data->>'product_id')::uuid; end if;
 insert into public.retail_audit_log(store_id,actor_id,actor_email,branch_id,kind,entity,entity_id,entity_name,operation,before,after)
 values(coalesce(row_data->>'store_id',row_data->>'id')::uuid,auth.uid(),auth.jwt()->>'email',v_branch,v_kind,tg_argv[1],
  coalesce(row_data->>'id',row_data->>'user_id',row_data->>'product_id',row_data->>'role'),v_name,tg_op,
  case when tg_op='INSERT' then null else v_before end,case when tg_op='DELETE' then null else v_after end);
 return null;
end $$;
revoke all on function retail_private.audit_row() from public,anon,authenticated;

create trigger retail_audit_products after update or delete on public.retail_products for each row
 execute function retail_private.audit_row('productos','Producto','name,code,price,cost,sale_markup,min_stock,category_id,pack_size,supplier,stock');
create trigger retail_audit_price_overrides after insert or update or delete on public.retail_price_overrides for each row
 execute function retail_private.audit_row('precios','Precio fijo','list_id,product_id,price');
create trigger retail_audit_price_lists after insert or update or delete on public.retail_price_lists for each row
 execute function retail_private.audit_row('precios','Lista de precios','name,adjustment,active,branch_id,parent_id,base_kind,pricing_rules');
create trigger retail_audit_members after insert or update or delete on public.retail_members for each row
 execute function retail_private.audit_row('permisos','Persona con acceso','role,profile_id,branch_id,register_id');
create trigger retail_audit_invitations after insert or update or delete on public.retail_invitations for each row
 execute function retail_private.audit_row('permisos','Acceso pendiente','email,role,profile_id,branch_id,register_id');
create trigger retail_audit_profiles after insert or update or delete on public.retail_permission_profiles for each row
 execute function retail_private.audit_row('permisos','Perfil de permisos','name,base_role,permissions');
create trigger retail_audit_role_permissions after insert or update or delete on public.retail_role_permissions for each row
 execute function retail_private.audit_row('permisos','Permisos del rol','role,permissions');
create trigger retail_audit_stores after update on public.retail_stores for each row
 execute function retail_private.audit_row('configuracion','Comercio','name,address,phone,receipt_message,low_margin_threshold,branch_inventory_enabled,depot_enabled,billing_enabled,cuit,razon_social,condicion_iva,punto_venta_afip');
create trigger retail_audit_branches after insert or update or delete on public.retail_branches for each row
 execute function retail_private.audit_row('configuracion','Sucursal','name,address,is_default');
create trigger retail_audit_registers after insert or update or delete on public.retail_registers for each row
 execute function retail_private.audit_row('configuracion','Caja','name,active,branch_id');
create trigger retail_audit_ledgers after insert or update or delete on public.retail_ledgers for each row
 execute function retail_private.audit_row('configuracion','Registro de ventas','name,active,is_default,payment_methods');

-- La ficha del producto marca su edición para que el cambio de stock quede registrado.
alter function public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid) rename to retail_save_product_at_branch_before_audit;
create function public.retail_save_product_at_branch(p_store uuid,p_values jsonb,p_edit boolean,p_expected integer,p_branch uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb;
begin
 perform set_config('retail.audit_product_form','on',true);
 saved:=public.retail_save_product_at_branch_before_audit(p_store,p_values,p_edit,p_expected,p_branch);
 perform set_config('retail.audit_product_form','off',true);
 return saved;
end $$;
revoke all on function public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid) from public,anon;
grant execute on function public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid) to authenticated;

-- Todo junto, de lo más nuevo a lo más viejo. Solo lectura y solo para dueños y administradores.
create function public.retail_activity(p_store uuid,p_from date,p_to date,p_kind text default null,p_actor uuid default null,
 p_branch uuid default null,p_query text default null,p_before timestamptz default null,p_limit integer default 100) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz; v_limit integer:=least(greatest(coalesce(p_limit,100),1),200);
 v_query text:=nullif(lower(btrim(coalesce(p_query,''))),'');
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver la actividad' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 if p_kind is not null and p_kind not in ('precios','productos','stock','plata','caja','anulaciones','ventas','permisos','configuracion','borrados') then raise exception 'Tipo de actividad inválido'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=least((p_to+1)::timestamp at time zone zone,coalesce(p_before,'infinity'::timestamptz));
 return (with feed(at,kind,actor,actor_email,branch_id,title,detail,before,after) as (
  select a.at,a.kind,a.actor_id,a.actor_email,a.branch_id,
   case a.operation when 'INSERT' then 'Creó ' when 'DELETE' then 'Eliminó ' else 'Cambió ' end||lower(a.entity)||coalesce(' «'||a.entity_name||'»',''),null::text,a.before,a.after
  from public.retail_audit_log a where a.store_id=p_store and a.at>=v_from and a.at<v_to
  union all
  select s.opened_at,'caja',s.opened_by,null,r.branch_id,'Abrió '||r.name,null,null,jsonb_build_object('apertura',s.opening_cash)
  from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_at>=v_from and s.opened_at<v_to
  union all
  select s.closed_at,'caja',s.closed_by,null,r.branch_id,'Cerró '||r.name,null,jsonb_build_object('esperado',s.expected_cash),
   jsonb_build_object('contado',s.counted_cash,'diferencia',s.counted_cash-s.expected_cash)
  from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.closed_at>=v_from and s.closed_at<v_to
  union all
  select m.created_at,'plata',m.created_by,null,r.branch_id,case when m.type='INGRESO' then 'Ingreso de efectivo' else 'Retiro de efectivo' end,m.reason,null,jsonb_build_object('importe',m.amount)
  from public.retail_movements m join public.retail_shifts s on s.id=m.shift_id join public.retail_registers r on r.id=s.register_id
  where m.store_id=p_store and m.created_at>=v_from and m.created_at<v_to
  union all
  select f.created_at,'plata',f.created_by,f.actor_email,case when coalesce(f.to_location,f.from_location)~'^[0-9a-f-]{36}$' then coalesce(f.to_location,f.from_location)::uuid end,
   'Movimiento de plata',f.note,null,jsonb_build_object('importe',f.amount,'desde',f.from_location,'hacia',f.to_location)
  from public.retail_fund_transfers f where f.store_id=p_store and f.shift_id is null and f.created_at>=v_from and f.created_at<v_to
  union all
  select e.created_at,'plata',e.created_by,e.actor_email,e.branch_id,'Cargó un gasto',e.description,null,jsonb_build_object('importe',e.amount,'categoria',e.category)
  from public.retail_expenses e where e.store_id=p_store and e.created_at>=v_from and e.created_at<v_to
  union all
  select e.voided_at,'borrados',e.voided_by,null,e.branch_id,'Eliminó un gasto',e.description,jsonb_build_object('importe',e.amount),null
  from public.retail_expenses e where e.store_id=p_store and e.voided_at>=v_from and e.voided_at<v_to
  union all
  select p.created_at,'plata',p.created_by,p.actor_email,null,'Pagó a '||p.supplier_name,p.reference,null,jsonb_build_object('importe',p.amount,'medio',p.method)
  from public.retail_supplier_payments p where p.store_id=p_store and p.created_at>=v_from and p.created_at<v_to
  union all
  select p.voided_at,'anulaciones',p.voided_by,null,null,'Anuló un pago a '||p.supplier_name,p.void_reason,jsonb_build_object('importe',p.amount),null
  from public.retail_supplier_payments p where p.store_id=p_store and p.voided_at>=v_from and p.voided_at<v_to
  union all
  select c.created_at,'plata',c.created_by,c.actor_email,null,'Cobró a '||k.name,c.note,null,jsonb_build_object('importe',-c.amount,'medio',c.method)
  from public.retail_customer_movements c join public.retail_customers k on k.id=c.customer_id
  where c.store_id=p_store and c.kind='payment' and c.created_at>=v_from and c.created_at<v_to
  union all
  select r.created_at,'anulaciones',r.created_by,r.actor_email,r.branch_id,(case when r.kind='void' then 'Anuló la venta T-' else 'Devolvió parte de la venta T-' end)||s.ticket_number,r.reason,
   jsonb_build_object('total_venta',s.total),jsonb_build_object('devuelto',r.total)
  from public.retail_sale_returns r join public.retail_sales s on s.id=r.sale_id where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to
  union all
  select l.changed_at,'ventas',l.changed_by,null,s.branch_id,'Cambió el registro de la venta T-'||s.ticket_number,null,jsonb_build_object('registro',l.from_name),jsonb_build_object('registro',l.to_name)
  from public.retail_sale_ledger_changes l join public.retail_sales s on s.id=l.sale_id where l.store_id=p_store and l.changed_at>=v_from and l.changed_at<v_to
  union all
  select d.recorded_at,'borrados',d.actor_id,d.actor_email,null,(case when d.event_type='restored' then 'Restauró «' else 'Eliminó «' end)||d.product_name||'»',d.reason,null,null
  from public.retail_product_deletions d where d.store_id=p_store and d.event_type in ('deleted','restored') and d.recorded_at>=v_from and d.recorded_at<v_to
  union all
  select d.created_at,'stock',d.actor_id,d.actor_email,d.branch_id,
   (case d.action when 'to_depot' then 'Guardó en depósito «' when 'to_salon' then 'Pasó al salón «' else 'Recibió en depósito «' end)||d.product_name||'»',null,null,
   jsonb_build_object('cantidad',d.quantity,'deposito',d.depot_after)
  from public.retail_depot_movements d where d.store_id=p_store and d.created_at>=v_from and d.created_at<v_to
  union all
  select t.created_at,'stock',t.created_by,t.actor_email,case when t.to_location~'^[0-9a-f-]{36}$' then t.to_location::uuid end,
   'Armó un traslado de '||jsonb_array_length(t.items)||' productos',t.notes,null,jsonb_build_object('desde',t.from_location,'hacia',t.to_location)
  from public.retail_location_transfers t where t.store_id=p_store and t.created_at>=v_from and t.created_at<v_to
  union all
  select t.reviewed_at,'stock',t.reviewed_by,null,case when t.to_location~'^[0-9a-f-]{36}$' then t.to_location::uuid end,
   case when t.status='confirmed' then 'Confirmó un traslado' else 'Canceló un traslado' end,t.notes,null,jsonb_build_object('desde',t.from_location,'hacia',t.to_location)
  from public.retail_location_transfers t where t.store_id=p_store and t.reviewed_at>=v_from and t.reviewed_at<v_to
  union all
  select c.closed_at,'stock',c.closed_by,c.closed_email,case when c.location<>'depot' then c.location::uuid end,
   case when c.status='confirmed' then 'Confirmó un conteo' else 'Canceló un conteo' end,c.notes,null,
   jsonb_build_object('productos_ajustados',(select count(*) from public.retail_stock_count_lines l where l.count_id=c.id and l.adjustment<>0))
  from public.retail_stock_counts c where c.store_id=p_store and c.status<>'open' and c.closed_at>=v_from and c.closed_at<v_to
  union all
  -- Reposiciones (también sin conexión): las de devoluciones y conteos ya figuran arriba.
  select m.recorded_at,'stock',m.user_id,null,null,'Repuso «'||p.name||'»',null,null,jsonb_build_object('cantidad',m.delta,'costo',m.cost)
  from public.retail_stock_movements m join public.retail_products p on p.id=m.product_id
  where m.store_id=p_store and m.recorded_at>=v_from and m.recorded_at<v_to
   and not exists(select 1 from public.retail_sale_returns r where r.id=m.operation_id)
   and not exists(select 1 from public.retail_stock_counts c where c.id=m.operation_id)
 ), filtered as (
  select f.*,coalesce(f.actor_email,u.email) as email from feed f left join auth.users u on u.id=f.actor
  where (p_kind is null or f.kind=p_kind) and (p_actor is null or f.actor=p_actor) and (p_branch is null or f.branch_id=p_branch)
   and (v_query is null or lower(f.title||' '||coalesce(f.detail,''))like '%'||v_query||'%')
  order by f.at desc limit v_limit
 ) select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object('at',at,'kind',kind,'actor',actor,'actor_email',email,'branch_id',branch_id,
    'title',title,'detail',detail,'before',before,'after',after) order by at desc) from filtered),'[]'::jsonb),
  'next_before',case when (select count(*) from filtered)=v_limit then (select min(at) from filtered) end,
  'people',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email) order by u.email) from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_activity(uuid,date,date,text,uuid,uuid,text,timestamptz,integer) from public,anon;
grant execute on function public.retail_activity(uuid,date,date,text,uuid,uuid,text,timestamptz,integer) to authenticated;

notify pgrst,'reload schema';
commit;
