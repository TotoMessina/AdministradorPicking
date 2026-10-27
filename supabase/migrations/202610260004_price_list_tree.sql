begin;

-- Legacy lists keep their catalog origin, percentages, branch and fixed prices.
-- Cost is a virtual read-only origin, not a new sellable list or a product write.
alter table public.retail_price_lists
 add column base_kind text not null default 'catalog' check(base_kind in ('cost','catalog','list')),
 add column parent_id uuid,
 add column pricing_rules jsonb not null default '[]'::jsonb,
 add column revision bigint not null default 0,
 add constraint retail_price_list_parent foreign key(store_id,parent_id) references public.retail_price_lists(store_id,id),
 add constraint retail_price_list_origin check((base_kind='list')=(parent_id is not null));
create index retail_price_list_children on public.retail_price_lists(store_id,parent_id);

create function retail_private.validate_price_tree() returns trigger
language plpgsql security definer set search_path='' as $$
declare rule jsonb; parent public.retail_price_lists; cursor_id uuid; visited uuid[]; depth integer:=1; child_depth integer;
begin
 if tg_op='UPDATE' and new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de una lista'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.store_id::text,0));
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
  select * into parent from public.retail_price_lists where id=cursor_id and store_id=new.store_id;
  if not found then raise exception 'La lista de origen no está disponible en este comercio'; end if;
  if parent.branch_id is not null and parent.branch_id is distinct from new.branch_id then raise exception 'Una lista de sucursal solo puede originar listas de esa misma sucursal'; end if;
  visited:=array_append(visited,cursor_id); depth:=depth+1; cursor_id:=parent.parent_id;
  if depth>12 then raise exception 'Se permiten hasta 12 niveles de listas'; end if;
 end loop;
 if new.branch_id is not null and exists(select 1 from public.retail_price_lists where parent_id=new.id and store_id=new.store_id and branch_id is distinct from new.branch_id) then raise exception 'Primero revisá las sucursales de las listas derivadas'; end if;
 with recursive children as (
  select id,1 as level,array[new.id,id] as path from public.retail_price_lists where store_id=new.store_id and parent_id=new.id
  union all select l.id,c.level+1,c.path||l.id from children c join public.retail_price_lists l on l.parent_id=c.id and l.store_id=new.store_id where not l.id=any(c.path) and c.level<12
 ) select coalesce(max(level),0) into child_depth from children;
 if depth+child_depth>12 then raise exception 'Este origen dejaría más de 12 niveles de listas'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
 return new;
end $$;
revoke all on function retail_private.validate_price_tree() from public,anon,authenticated;
create trigger retail_validate_price_tree before insert or update on public.retail_price_lists
 for each row execute function retail_private.validate_price_tree();

-- RPC-only writes lock the store BEFORE rows, coordinating checkout and concurrent edits.
-- RLS member reads and delegated policies remain; no new role is granted.
revoke insert,update,delete on public.retail_price_lists from authenticated;
revoke update(name,adjustment,active,branch_id) on public.retail_price_lists from authenticated;
revoke insert,update,delete on public.retail_price_overrides from authenticated;

create function public.retail_save_price_list_tree(p_store uuid,p_id uuid,p_name text,p_adjustment numeric,p_active boolean,p_branch uuid,p_base text,p_parent uuid,p_rules jsonb,p_revision bigint default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.retail_price_lists;
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para administrar listas' using errcode='42501'; end if;
 if p_id is null then raise exception 'Falta el identificador de la lista'; end if;
 if p_adjustment is null or p_adjustment::text in ('NaN','Infinity','-Infinity') or p_adjustment<=-100 or p_adjustment>10000 or round(p_adjustment,2)<>p_adjustment then raise exception 'Ingresá un ajuste entre -99,99 y 10.000, con hasta dos decimales'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 select * into previous from public.retail_price_lists where id=p_id for update;
 if found then
  if previous.store_id<>p_store then raise exception 'Lista no disponible' using errcode='42501'; end if;
  -- Retrying a committed request does not create another list or bump its revision.
  if row(previous.name,previous.adjustment,previous.active,previous.branch_id,previous.base_kind,previous.parent_id,previous.pricing_rules)
    is not distinct from row(btrim(p_name),p_adjustment,p_active,p_branch,p_base,p_parent,p_rules) then return p_id; end if;
  if previous.revision is distinct from p_revision then raise exception 'La lista cambió en otro dispositivo. Actualizá los datos y revisá el borrador antes de guardarlo'; end if;
  update public.retail_price_lists set name=btrim(p_name),adjustment=p_adjustment,active=p_active,branch_id=p_branch,base_kind=p_base,parent_id=p_parent,pricing_rules=p_rules where id=p_id and store_id=p_store;
 else
  insert into public.retail_price_lists(id,store_id,name,adjustment,active,branch_id,base_kind,parent_id,pricing_rules)
   values(p_id,p_store,btrim(p_name),p_adjustment,p_active,p_branch,p_base,p_parent,p_rules);
 end if;
 return p_id;
end $$;
revoke all on function public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint) from public,anon;
grant execute on function public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint) to authenticated;

create function public.retail_save_price_override(p_store uuid,p_list uuid,p_product uuid,p_price numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para administrar listas' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 if not exists(select 1 from public.retail_price_lists where id=p_list and store_id=p_store) or not exists(select 1 from public.retail_products where id=p_product and store_id=p_store) then raise exception 'Lista o producto no disponible en este comercio'; end if;
 if p_price is null then
  delete from public.retail_price_overrides where store_id=p_store and list_id=p_list and product_id=p_product;
 else
  insert into public.retail_price_overrides(store_id,list_id,product_id,price) values(p_store,p_list,p_product,p_price)
   on conflict(list_id,product_id) do update set price=excluded.price;
 end if;
end $$;
revoke all on function public.retail_save_price_override(uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.retail_save_price_override(uuid,uuid,uuid,numeric) to authenticated;

create function retail_private.product_list_price(p_product public.retail_products,p_list uuid,p_depth integer default 0)
returns numeric language plpgsql security definer set search_path='' as $$
declare list public.retail_price_lists; price numeric; rule jsonb; scope text; target text;
begin
 if p_depth>=12 then raise exception 'Revisá el origen de la lista: demasiados niveles'; end if;
 if p_list is null then return p_product.price; end if;
 select * into list from public.retail_price_lists where id=p_list and store_id=p_product.store_id;
 if not found then raise exception 'Lista de origen no disponible'; end if;
 select o.price into price from public.retail_price_overrides o where o.store_id=p_product.store_id and o.list_id=p_list and o.product_id=p_product.id;
 if found then return price; end if;
 if list.base_kind='cost' then
  if p_product.cost<=0 then raise exception 'Falta cargar el costo de % para calcular esta lista',p_product.name; end if;
  price:=p_product.cost;
 elsif list.base_kind='list' then price:=retail_private.product_list_price(p_product,list.parent_id,p_depth+1);
 else price:=p_product.price;
 end if;
 price:=greatest(0.01,round(price*(1+list.adjustment/100),2));
 foreach scope in array array['category','brand','product'] loop
  target:=case scope when 'category' then p_product.category_id::text when 'product' then p_product.id::text else lower(btrim(coalesce(p_product.brand,''))) end;
  for rule in select value from jsonb_array_elements(list.pricing_rules) r where r->>'scope'=scope and r->>'target'=target loop
   price:=greatest(0.01,round(price*(1+(rule->>'adjustment')::numeric/100),2));
  end loop;
 end loop;
 if price>=1000000000000 then raise exception 'El precio calculado de % supera el límite permitido',p_product.name; end if;
 return price;
end $$;
revoke all on function retail_private.product_list_price(public.retail_products,uuid,integer) from public,anon,authenticated;

-- Preserve the real checkout and all subsequent stock, ledger, margin, permission,
-- payment, receipt and idempotency protections. Replace only its price lookup.
do $patch$
declare definition text; previous text:=$old$   v_expected:=p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected:=coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;$old$;
begin
 definition:=replace(pg_get_functiondef('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)'::regprocedure),E'\r','');
 if position(previous in definition)=0 or position(' s:=retail_private.check_shift(p_shift);' in definition)=0 then
  raise exception 'La definición de checkout no coincide con la versión esperada. No se aplicaron cambios; revisar instalación';
 end if;
 definition:=replace(definition,previous,'   v_expected:=retail_private.product_list_price(p,p_price_list);');
 definition:=replace(definition,' s:=retail_private.check_shift(p_shift);',E' s:=retail_private.check_shift(p_shift);\n perform pg_advisory_xact_lock_shared(hashtextextended(''retail-pricing:''||s.store_id::text,0));');
 execute definition;
end $patch$;

notify pgrst,'reload schema';
commit;
