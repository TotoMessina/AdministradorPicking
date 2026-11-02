begin;
-- Conteo físico por sucursal o depósito. Cada renglón guarda cuánto decía el sistema al cargarse lo contado.
-- Al confirmar se aplica solo esa diferencia sobre el stock actual: lo vendido o movido después del
-- conteo baja el sistema y la estantería por igual, así que no genera diferencias falsas.

create table public.retail_stock_counts (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 location text not null check(location='depot' or location ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
 category_id uuid, status text not null default 'open' check(status in ('open','confirmed','cancelled')),
 notes text check(notes is null or length(notes)<=1000),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 closed_by uuid references auth.users(id), closed_email text, closed_at timestamptz,
 check((status='open')=(closed_at is null)),
 foreign key(store_id,category_id) references public.retail_categories(store_id,id)
);
-- Un único conteo abierto por ubicación: dos conteos simultáneos ajustarían dos veces lo mismo.
create unique index retail_stock_counts_one_open on public.retail_stock_counts(store_id,location) where status='open';
create index retail_stock_counts_history on public.retail_stock_counts(store_id,created_at desc);

create table public.retail_stock_count_lines (
 count_id uuid not null references public.retail_stock_counts(id), store_id uuid not null, product_id uuid not null,
 counted integer not null check(counted between 0 and 2147483647), expected integer not null,
 reason text check(reason in ('rotura','vencido','robo','error_carga','otro')),
 note text check(note is null or length(note)<=300),
 counted_by uuid not null references auth.users(id), counted_email text, counted_at timestamptz not null default now(),
 adjustment integer, unit_cost numeric(14,2),
 primary key(count_id,product_id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create index retail_stock_count_lines_product on public.retail_stock_count_lines(store_id,product_id);

alter table public.retail_stock_counts enable row level security;
alter table public.retail_stock_count_lines enable row level security;
create function retail_private.can_count_stock(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false)
  or retail_private.has_permission(p_store,'manage_products') or retail_private.has_permission(p_store,'replenish_stock');
$$;
revoke all on function retail_private.can_count_stock(uuid) from public,anon;
grant execute on function retail_private.can_count_stock(uuid) to authenticated;
create policy counters_read on public.retail_stock_counts for select to authenticated using(retail_private.can_count_stock(store_id));
create policy counters_read on public.retail_stock_count_lines for select to authenticated using(retail_private.can_count_stock(store_id));
revoke all on public.retail_stock_counts,public.retail_stock_count_lines from public,anon,authenticated;
grant select on public.retail_stock_counts,public.retail_stock_count_lines to authenticated;

-- Lo que el sistema tiene hoy en una ubicación. Sin inventario por sucursal, el salón es el total menos el depósito.
create function retail_private.location_quantity(p_store uuid,p_product uuid,p_location text) returns integer
language sql stable security definer set search_path='' as $$
 select case
  when p_location='depot' then coalesce((select d.quantity from public.retail_depot_balances d where d.store_id=p_store and d.product_id=p_product),0)
  when s.branch_inventory_enabled then coalesce((select b.quantity from public.retail_branch_stock b where b.store_id=p_store and b.product_id=p_product and b.branch_id::text=p_location),0)
  else p.stock-coalesce((select d.quantity from public.retail_depot_balances d where d.store_id=p_store and d.product_id=p_product),0) end
 from public.retail_stores s join public.retail_products p on p.store_id=s.id and p.id=p_product where s.id=p_store;
$$;
revoke all on function retail_private.location_quantity(uuid,uuid,text) from public,anon,authenticated;

create function public.retail_start_stock_count(p_store uuid,p_id uuid,p_location text,p_category uuid default null,p_notes text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_stock_counts; v_store public.retail_stores;
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 if p_id is null or p_location is null then raise exception 'Elegí dónde vas a contar'; end if;
 perform pg_advisory_xact_lock(hashtextextended('stock-count:'||p_id::text,0));
 select * into v_existing from public.retail_stock_counts where id=p_id;
 if found then
  if v_existing.store_id<>p_store or v_existing.location<>p_location then raise exception 'El identificador ya corresponde a otro conteo'; end if;
  return p_id;
 end if;
 select * into v_store from public.retail_stores where id=p_store;
 if p_location='depot' then
  if not v_store.depot_enabled then raise exception 'Este comercio no usa depósito'; end if;
 elsif not exists(select 1 from public.retail_branches where store_id=p_store and id::text=p_location) then
  raise exception 'Elegí una sucursal de este comercio';
 end if;
 if p_category is not null and not exists(select 1 from public.retail_categories where store_id=p_store and id=p_category) then raise exception 'Elegí una categoría de este comercio'; end if;
 if exists(select 1 from public.retail_stock_counts where store_id=p_store and location=p_location and status='open') then
  raise exception 'Ya hay un conteo abierto en este lugar. Seguilo o cancelalo antes de empezar otro';
 end if;
 insert into public.retail_stock_counts(id,store_id,location,category_id,notes,created_by,actor_email)
 values(p_id,p_store,p_location,p_category,nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.jwt()->>'email');
 return p_id;
end $$;

-- p_lines: [{product_id, counted (null quita el renglón), reason, note}]. Repetir el mismo valor no cambia nada;
-- volver a contar un producto toma de nuevo lo que dice el sistema en ese momento.
create function public.retail_save_stock_count_lines(p_store uuid,p_count uuid,p_lines jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare v_count public.retail_stock_counts; v_line jsonb; v_product public.retail_products; v_counted integer; v_previous public.retail_stock_count_lines; v_saved integer:=0;
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 select * into v_count from public.retail_stock_counts where id=p_count and store_id=p_store for update;
 if not found then raise exception 'Conteo no disponible'; end if;
 if v_count.status<>'open' then raise exception 'Este conteo ya está cerrado'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 2000 then raise exception 'No hay renglones para guardar'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  select * into v_product from public.retail_products where id=nullif(v_line->>'product_id','')::uuid and store_id=p_store;
  if not found or not v_product.active then raise exception 'Producto no disponible en este comercio'; end if;
  if jsonb_array_length(v_product.stock_components)>0 then raise exception '% no tiene stock propio: contá sus componentes',v_product.name; end if;
  if v_count.category_id is not null and v_product.category_id<>v_count.category_id then raise exception '% no es de la categoría de este conteo',v_product.name; end if;
  if v_line->>'reason' is not null and v_line->>'reason' not in ('rotura','vencido','robo','error_carga','otro') then raise exception 'Motivo inválido'; end if;
  if v_line->'counted' is null or jsonb_typeof(v_line->'counted')='null' then
   delete from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
   continue;
  end if;
  if coalesce(v_line->>'counted','')!~'^[0-9]{1,9}$' then raise exception 'Cantidad contada inválida para %',v_product.name; end if;
  v_counted:=(v_line->>'counted')::integer;
  select * into v_previous from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
  if found and v_previous.counted=v_counted then
   update public.retail_stock_count_lines set reason=v_line->>'reason',note=nullif(btrim(coalesce(v_line->>'note','')),'') where count_id=p_count and product_id=v_product.id;
  else
   insert into public.retail_stock_count_lines(count_id,store_id,product_id,counted,expected,reason,note,counted_by,counted_email)
   values(p_count,p_store,v_product.id,v_counted,retail_private.location_quantity(p_store,v_product.id,v_count.location),v_line->>'reason',
    nullif(btrim(coalesce(v_line->>'note','')),''),auth.uid(),auth.jwt()->>'email')
   on conflict(count_id,product_id) do update set counted=excluded.counted,expected=excluded.expected,reason=excluded.reason,note=excluded.note,
    counted_by=excluded.counted_by,counted_email=excluded.counted_email,counted_at=now();
  end if;
  v_saved:=v_saved+1;
 end loop;
 return v_saved;
end $$;

-- Confirmar aplica los ajustes y cierra el conteo. Cada diferencia necesita motivo.
create function public.retail_confirm_stock_count(p_store uuid,p_count uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_count public.retail_stock_counts; v_line public.retail_stock_count_lines; v_product public.retail_products; v_diff integer;
 v_current integer; v_previous text:=current_setting('retail.inventory_location',true); v_branch_mode boolean; v_missing text;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') and not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Solo quien puede editar productos confirma los ajustes del conteo' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into v_count from public.retail_stock_counts where id=p_count and store_id=p_store for update;
 if not found then raise exception 'Conteo no disponible'; end if;
 if v_count.status='confirmed' then
  return jsonb_build_object('id',p_count,'status','confirmed','lines',(select count(*) from public.retail_stock_count_lines where count_id=p_count and adjustment<>0));
 end if;
 if v_count.status<>'open' then raise exception 'Este conteo fue cancelado'; end if;
 if not exists(select 1 from public.retail_stock_count_lines where count_id=p_count) then raise exception 'Todavía no contaste ningún producto'; end if;
 select string_agg(p.name,', ' order by p.name) into v_missing from public.retail_stock_count_lines l join public.retail_products p on p.id=l.product_id
  where l.count_id=p_count and l.counted<>l.expected and l.reason is null;
 if v_missing is not null then raise exception 'Elegí el motivo de cada diferencia: %',left(v_missing,300); end if;
 select branch_inventory_enabled into v_branch_mode from public.retail_stores where id=p_store for share;
 for v_line in select * from public.retail_stock_count_lines where count_id=p_count order by product_id for update loop
  select * into v_product from public.retail_products where id=v_line.product_id and store_id=p_store for update;
  v_diff:=v_line.counted-v_line.expected;
  update public.retail_stock_count_lines set adjustment=v_diff,unit_cost=nullif(v_product.cost,0) where count_id=p_count and product_id=v_line.product_id;
  continue when v_diff=0;
  v_current:=retail_private.location_quantity(p_store,v_product.id,v_count.location);
  if v_current+v_diff<0 then
   raise exception 'No se puede ajustar %: el sistema tiene % y el ajuste es %. Volvé a contarlo',v_product.name,v_current,v_diff;
  end if;
  if v_count.location='depot' then
   perform set_config('retail.inventory_location','depot',true);
   if v_diff<0 then update public.retail_depot_balances set quantity=quantity+v_diff where store_id=p_store and product_id=v_product.id; end if;
   update public.retail_products set stock=stock+v_diff where id=v_product.id;
   if v_diff>0 then
    insert into public.retail_depot_balances(product_id,store_id,quantity) values(v_product.id,p_store,v_diff)
    on conflict(product_id) do update set quantity=public.retail_depot_balances.quantity+excluded.quantity;
   end if;
  else
   perform set_config('retail.inventory_location',case when v_branch_mode then v_count.location else '' end,true);
   update public.retail_products set stock=stock+v_diff where id=v_product.id;
  end if;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_count,v_product.id,p_store,auth.uid(),v_diff,nullif(v_product.cost,0),now());
 end loop;
 perform set_config('retail.inventory_location',coalesce(v_previous,''),true);
 update public.retail_stock_counts set status='confirmed',closed_by=auth.uid(),closed_email=auth.jwt()->>'email',closed_at=now() where id=p_count;
 return jsonb_build_object('id',p_count,'status','confirmed','lines',(select count(*) from public.retail_stock_count_lines where count_id=p_count and adjustment<>0));
end $$;

create function public.retail_cancel_stock_count(p_store uuid,p_count uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 update public.retail_stock_counts set status='cancelled',closed_by=auth.uid(),closed_email=auth.jwt()->>'email',closed_at=now()
  where id=p_count and store_id=p_store and status='open';
 if not found and not exists(select 1 from public.retail_stock_counts where id=p_count and store_id=p_store and status='cancelled') then
  raise exception 'Este conteo ya está cerrado';
 end if;
end $$;

revoke all on function public.retail_start_stock_count(uuid,uuid,text,uuid,text),public.retail_save_stock_count_lines(uuid,uuid,jsonb),
 public.retail_confirm_stock_count(uuid,uuid),public.retail_cancel_stock_count(uuid,uuid) from public,anon;
grant execute on function public.retail_start_stock_count(uuid,uuid,text,uuid,text),public.retail_save_stock_count_lines(uuid,uuid,jsonb),
 public.retail_confirm_stock_count(uuid,uuid),public.retail_cancel_stock_count(uuid,uuid) to authenticated;

-- Pérdidas de conteos confirmados en el mes, valuadas al costo del momento de confirmar.
-- Los sobrantes se informan aparte y compensan; costo cero cuenta como desconocido.
create function public.retail_month_stock_losses(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 return (with line as (
  select l.reason,l.adjustment,l.unit_cost from public.retail_stock_count_lines l join public.retail_stock_counts c on c.id=l.count_id
  where c.store_id=p_store and c.status='confirmed' and l.adjustment<>0
   and c.closed_at>=(first_day::timestamp at time zone zone) and c.closed_at<(next_day::timestamp at time zone zone)
 ) select jsonb_build_object(
  'losses',coalesce((select sum(-adjustment*unit_cost) from line where adjustment<0),0),
  'surplus',coalesce((select sum(adjustment*unit_cost) from line where adjustment>0),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null),
  'by_reason',coalesce((select jsonb_agg(jsonb_build_object('reason',r.reason,'amount',r.amount,'units',r.units) order by r.amount desc)
   from (select reason,sum(-adjustment*coalesce(unit_cost,0)) as amount,sum(-adjustment) as units from line where adjustment<0 group by reason) r),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_month_stock_losses(uuid,date) from public,anon;
grant execute on function public.retail_month_stock_losses(uuid,date) to authenticated;

notify pgrst,'reload schema';
commit;
