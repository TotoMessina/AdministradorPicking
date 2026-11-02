begin;
-- Conteos por sección: todo, una categoría, una marca o ambas. Varias secciones del mismo lugar pueden estar
-- abiertas a la vez; un producto solo puede contarse en un conteo abierto por lugar, así no se ajusta dos veces.

alter table public.retail_stock_counts add column brand text check(brand is null or length(btrim(brand)) between 1 and 160);
drop index public.retail_stock_counts_one_open;
create unique index retail_stock_counts_one_open_section on public.retail_stock_counts(store_id,location,coalesce(category_id::text,''),coalesce(lower(btrim(brand)),''))
 where status='open';

drop function public.retail_start_stock_count(uuid,uuid,text,uuid,text);
create function public.retail_start_stock_count(p_store uuid,p_id uuid,p_location text,p_category uuid default null,p_notes text default null,p_brand text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_stock_counts; v_store public.retail_stores; v_brand text:=nullif(btrim(coalesce(p_brand,'')),'');
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
 if v_brand is not null and length(v_brand)>160 then raise exception 'Marca demasiado larga'; end if;
 if exists(select 1 from public.retail_stock_counts where store_id=p_store and location=p_location and status='open'
   and category_id is not distinct from p_category and lower(btrim(coalesce(brand,'')))=lower(coalesce(v_brand,''))) then
  raise exception 'Ya hay un conteo abierto de esta sección en este lugar. Seguilo o cancelalo antes de empezar otro';
 end if;
 insert into public.retail_stock_counts(id,store_id,location,category_id,brand,notes,created_by,actor_email)
 values(p_id,p_store,p_location,p_category,v_brand,nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.jwt()->>'email');
 return p_id;
end $$;
revoke all on function public.retail_start_stock_count(uuid,uuid,text,uuid,text,text) from public,anon;
grant execute on function public.retail_start_stock_count(uuid,uuid,text,uuid,text,text) to authenticated;

create or replace function public.retail_save_stock_count_lines(p_store uuid,p_count uuid,p_lines jsonb) returns integer
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
  if v_count.brand is not null and lower(btrim(coalesce(v_product.brand,'')))<>lower(btrim(v_count.brand)) then raise exception '% no es de la marca de este conteo',v_product.name; end if;
  if v_line->>'reason' is not null and v_line->>'reason' not in ('rotura','vencido','robo','error_carga','otro') then raise exception 'Motivo inválido'; end if;
  if v_line->'counted' is null or jsonb_typeof(v_line->'counted')='null' then
   delete from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
   continue;
  end if;
  if coalesce(v_line->>'counted','')!~'^[0-9]{1,9}$' then raise exception 'Cantidad contada inválida para %',v_product.name; end if;
  v_counted:=(v_line->>'counted')::integer;
  -- Dos secciones abiertas del mismo lugar no pueden contar el mismo producto.
  perform pg_advisory_xact_lock(hashtextextended('stock-count-product:'||p_store::text||v_count.location||v_product.id::text,0));
  if exists(select 1 from public.retail_stock_count_lines l join public.retail_stock_counts c on c.id=l.count_id
    where c.store_id=p_store and c.location=v_count.location and c.status='open' and c.id<>p_count and l.product_id=v_product.id) then
   raise exception '% ya se está contando en otro conteo abierto de este lugar',v_product.name;
  end if;
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

notify pgrst,'reload schema';
commit;
