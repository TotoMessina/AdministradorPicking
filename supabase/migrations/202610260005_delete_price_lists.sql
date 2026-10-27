begin;

-- Soft deletion retains sale FKs, fixed prices, rules and the author of the removal.
alter table public.retail_price_lists
 add column deleted_at timestamptz,
 add column deleted_by uuid references auth.users(id),
 add constraint retail_price_list_deleted_state check((deleted_at is null)=(deleted_by is null) and (deleted_at is null or not active));
alter table public.retail_price_lists drop constraint retail_price_lists_store_id_name_key;
create unique index retail_live_price_list_name on public.retail_price_lists(store_id,name) where deleted_at is null;

drop policy member_read on public.retail_price_lists;
create policy member_read on public.retail_price_lists for select to authenticated
 using(retail_private.role_for(store_id) is not null and deleted_at is null);
drop policy member_read on public.retail_price_overrides;
create policy member_read on public.retail_price_overrides for select to authenticated
 using(retail_private.role_for(store_id) is not null and exists(
  select 1 from public.retail_price_lists l where l.id=list_id and l.store_id=retail_price_overrides.store_id and l.deleted_at is null
 ));

create or replace function retail_private.validate_price_tree() returns trigger
language plpgsql security definer set search_path='' as $$
declare rule jsonb; parent public.retail_price_lists; cursor_id uuid; visited uuid[]; depth integer:=1; child_depth integer;
begin
 if tg_op='UPDATE' and new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de una lista'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.store_id::text,0));
 if tg_op='UPDATE' and old.deleted_at is not null then raise exception 'Esta lista fue eliminada. Actualizá los datos'; end if;
 if new.deleted_at is not null then
  if tg_op<>'UPDATE' then raise exception 'No se puede crear una lista eliminada'; end if;
  if exists(select 1 from public.retail_price_lists where store_id=new.store_id and parent_id=new.id and deleted_at is null) then
   raise exception 'Cambiá primero el origen de las listas derivadas antes de eliminar esta lista';
  end if;
  new.revision:=old.revision+1; return new;
 end if;
 if jsonb_typeof(new.pricing_rules) is distinct from 'array' or jsonb_array_length(new.pricing_rules)>300 then raise exception 'La lista admite hasta 300 reglas'; end if;
 for rule in select value from jsonb_array_elements(new.pricing_rules) loop
  if coalesce(rule->>'scope','') not in ('category','brand','product') or coalesce(btrim(rule->>'target'),'')='' or
     jsonb_typeof(rule->'adjustment') is distinct from 'number' then raise exception 'Completá el destino y porcentaje de cada regla'; end if;
  if (rule->>'adjustment')::numeric<=-100 or (rule->>'adjustment')::numeric>10000 or round((rule->>'adjustment')::numeric,2)<>(rule->>'adjustment')::numeric then raise exception 'El ajuste debe estar entre -99,99 y 10.000, con hasta dos decimales'; end if;
  if rule->>'scope'='category' and not exists(select 1 from public.retail_categories where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Categoría no disponible en este comercio'; end if;
  if rule->>'scope'='product' and not exists(select 1 from public.retail_products where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Producto no disponible en este comercio'; end if;
  if rule->>'scope'='brand' and (length(rule->>'target')>200 or rule->>'target'<>lower(btrim(rule->>'target'))) then raise exception 'La marca debe estar normalizada'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(new.pricing_rules) r group by r->>'scope',r->>'target' having count(*)>1) then raise exception 'Hay reglas repetidas para el mismo destino'; end if;
 visited:=array[new.id]; cursor_id:=new.parent_id;
 while cursor_id is not null loop
  if cursor_id=any(visited) then raise exception 'Una lista no puede depender de sí misma ni de una lista derivada de ella'; end if;
  select * into parent from public.retail_price_lists where id=cursor_id and store_id=new.store_id and deleted_at is null;
  if not found then raise exception 'La lista de origen no está disponible. Elegí otra'; end if;
  if parent.branch_id is not null and parent.branch_id is distinct from new.branch_id then raise exception 'Una lista de sucursal solo puede originar listas de esa misma sucursal'; end if;
  visited:=array_append(visited,cursor_id); depth:=depth+1; cursor_id:=parent.parent_id;
  if depth>12 then raise exception 'Se permiten hasta 12 niveles de listas'; end if;
 end loop;
 if new.branch_id is not null and exists(select 1 from public.retail_price_lists where parent_id=new.id and store_id=new.store_id and deleted_at is null and branch_id is distinct from new.branch_id) then raise exception 'Primero revisá las sucursales de las listas derivadas'; end if;
 with recursive children as (
  select id,1 as level,array[new.id,id] as path from public.retail_price_lists where store_id=new.store_id and parent_id=new.id and deleted_at is null
  union all select l.id,c.level+1,c.path||l.id from children c join public.retail_price_lists l on l.parent_id=c.id and l.store_id=new.store_id where l.deleted_at is null and not l.id=any(c.path) and c.level<12
 ) select coalesce(max(level),0) into child_depth from children;
 if depth+child_depth>12 then raise exception 'Este origen dejaría más de 12 niveles de listas'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
 return new;
end $$;
revoke all on function retail_private.validate_price_tree() from public,anon,authenticated;

-- Reject writes from stale clients and deleted ancestors, including idempotent-save
-- fast paths that do not run a row trigger. Leave all price calculations intact.
do $patch$
declare signature text; anchor text; replacement text; definition text;
begin
 for signature,anchor,replacement in select * from (values
  ('public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)',
   'if previous.store_id<>p_store then raise exception ''Lista no disponible'' using errcode=''42501''; end if;',
   E'if previous.store_id<>p_store then raise exception ''Lista no disponible'' using errcode=''42501''; end if;\n  if previous.deleted_at is not null then raise exception ''Esta lista fue eliminada. Actualizá los datos''; end if;'),
  ('public.retail_save_price_override(uuid,uuid,uuid,numeric)',
   'where id=p_list and store_id=p_store)',
   'where id=p_list and store_id=p_store and deleted_at is null)'),
  ('retail_private.product_list_price(public.retail_products,uuid,integer)',
   'if not found then raise exception ''Lista de origen no disponible''; end if;',
   'if not found or list.deleted_at is not null then raise exception ''Lista de origen no disponible. Actualizá los datos''; end if;')
 ) as patches(signature,anchor,replacement)
 loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
   raise exception 'La definición de % no coincide con la versión esperada. No se aplicaron cambios; revisar instalación',signature;
  end if;
  execute replace(definition,anchor,replacement);
 end loop;
end $patch$;

create function public.retail_delete_price_list(p_store uuid,p_list uuid,p_revision bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_list public.retail_price_lists;
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para eliminar listas' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 select * into current_list from public.retail_price_lists where id=p_list and store_id=p_store for update;
 if not found then raise exception 'Lista no disponible en este comercio'; end if;
 -- A lost response can be retried without changing its original author or timestamp.
 if current_list.deleted_at is not null then return p_list; end if;
 if current_list.revision is distinct from p_revision then raise exception 'La lista cambió en otro dispositivo. Actualizá los datos y volvé a revisar antes de eliminarla'; end if;
 if exists(select 1 from public.retail_price_lists where store_id=p_store and parent_id=p_list and deleted_at is null) then
  raise exception 'Cambiá primero el origen de las listas derivadas antes de eliminar esta lista';
 end if;
 update public.retail_price_lists set active=false,deleted_at=clock_timestamp(),deleted_by=auth.uid() where id=p_list and store_id=p_store;
 return p_list;
end $$;
revoke all on function public.retail_delete_price_list(uuid,uuid,bigint) from public,anon;
grant execute on function public.retail_delete_price_list(uuid,uuid,bigint) to authenticated;

notify pgrst,'reload schema';
commit;
