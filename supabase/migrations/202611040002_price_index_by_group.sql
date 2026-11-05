-- Evolución de precios por categoría, marca o proveedor: índices de costo y de precio de venta (base 100
-- al inicio del período) y ganancia promedio, ponderados por unidades vendidas en el período (mínimo 1).
-- Solo lectura. El valor de cada producto en una fecha sale del registro de actividad (202611020009):
-- el «antes» del primer cambio posterior a esa fecha, o el valor actual si no cambió después. Para el costo,
-- antes del registro se usa el de la última reposición. Antes del registro el precio queda en su primer valor conocido.
begin;

create function public.retail_price_index(p_store uuid,p_group_kind text,p_groups text[],p_period text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_start timestamptz; v_step interval; v_now timestamptz:=now(); tracked timestamptz;
begin
 if not retail_private.has_permission(p_store,'edit_prices') and not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Necesitás permiso para editar precios o productos' using errcode='42501';
 end if;
 if p_group_kind not in ('all','category','brand','supplier') then raise exception 'Agrupación inválida'; end if;
 if p_group_kind<>'all' and (p_groups is null or cardinality(p_groups) not between 1 and 4) then raise exception 'Elegí entre 1 y 4 grupos para comparar'; end if;
 case p_period
  when '3m' then v_start:=date_trunc('day',(v_now at time zone zone)-interval '3 months') at time zone zone; v_step:=interval '1 week';
  when '6m' then v_start:=date_trunc('day',(v_now at time zone zone)-interval '6 months') at time zone zone; v_step:=interval '1 week';
  when '1y' then v_start:=date_trunc('day',(v_now at time zone zone)-interval '12 months') at time zone zone; v_step:=interval '1 month';
  else raise exception 'Período inválido';
 end case;
 select min(at) into tracked from public.retail_audit_log where store_id=p_store and entity='Producto' and (after ?| array['price','cost']);

 return (with
  prods as (
   select p.id,p.name,p.price,p.cost,
    case p_group_kind when 'all' then 'all' when 'category' then p.category_id::text
     when 'brand' then lower(btrim(p.brand)) else lower(btrim(p.supplier)) end as grp,
    case p_group_kind when 'all' then 'Todo el comercio' when 'category' then coalesce(c.name,'Sin categoría')
     when 'brand' then btrim(p.brand) else btrim(p.supplier) end as label
   from public.retail_products p left join public.retail_categories c on c.store_id=p.store_id and c.id=p.category_id
   where p.store_id=p_store and p.active and p.sellable
  ),
  chosen as (
   select * from prods where p_group_kind='all' or grp=any(array(select lower(btrim(g)) from unnest(p_groups) g))
  ),
  changes as (
   select a.entity_id::uuid as pid,a.at,a.before,a.after from public.retail_audit_log a
   where a.store_id=p_store and a.entity='Producto' and a.at>=v_start and (a.after ?| array['price','cost'])
    and a.entity_id in (select id::text from chosen)
  ),
  restocks as (
   select distinct on (m.product_id,m.occurred_at) m.product_id as pid,m.occurred_at as at,m.cost from public.retail_stock_movements m
   where m.store_id=p_store and m.cost is not null and m.product_id in (select id from chosen)
   order by m.product_id,m.occurred_at,m.recorded_at desc
  ),
  units as (
   select (i->>'productId')::uuid as pid,sum((i->>'qty')::numeric) as qty
   from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
   where s.store_id=p_store and s.created_at>=v_start and coalesce(s.return_status,'none')<>'voided'
    and i->>'productId' in (select id::text from chosen)
   group by 1
  ),
  buckets as (
   select t from generate_series(v_start,v_now,v_step) t
   union select v_now
  ),
  -- Tramos: cada «antes» rige desde el cambio anterior hasta ese cambio. Se cruzan por producto, no fila por fila.
  price_seg as (
   select pid,lag(at) over (partition by pid order by at) as from_t,at as to_t,(before->>'price')::numeric as v from changes where after ? 'price'
  ),
  cost_seg as (
   select pid,lag(at) over (partition by pid order by at) as from_t,at as to_t,(before->>'cost')::numeric as v from changes where after ? 'cost'
  ),
  restock_seg as (
   select pid,at as from_t,lead(at) over (partition by pid order by at) as to_t,cost as v from restocks
  ),
  grid as (
   select ch.id,ch.grp,b.t,1+coalesce(u.qty,0) as w,
    coalesce(ps.v,ch.price) as price,
    -- Antes del registro, una reposición posterior con otro costo indica que el costo de ese momento era el de la reposición anterior.
    coalesce(cs.v,case when rs.to_t is not null and rs.to_t<coalesce(tracked,'infinity'::timestamptz) then rs.v end,ch.cost) as cost
   from chosen ch cross join buckets b
   left join units u on u.pid=ch.id
   left join price_seg ps on ps.pid=ch.id and b.t<ps.to_t and (ps.from_t is null or b.t>=ps.from_t)
   left join cost_seg cs on cs.pid=ch.id and b.t<cs.to_t and (cs.from_t is null or b.t>=cs.from_t)
   left join restock_seg rs on rs.pid=ch.id and b.t>=rs.from_t and (rs.to_t is null or b.t<rs.to_t)
  ),
  based as (
   select g.*,first_value(g.price) over w as price0,first_value(g.cost) over w as cost0
   from grid g window w as (partition by g.id order by g.t)
  ),
  points as (
   select grp,t,
    round(100*sum(w*price/price0) filter (where price0>0 and price>0)/nullif(sum(w) filter (where price0>0 and price>0),0),2) as price_index,
    round(100*sum(w*cost/cost0) filter (where cost0>0 and cost>0)/nullif(sum(w) filter (where cost0>0 and cost>0),0),2) as cost_index,
    round(100*sum(w*(price/cost-1)) filter (where price>0 and cost>0)/nullif(sum(w) filter (where price>0 and cost>0),0),2) as markup
   from based group by grp,t
  ),
  movers as (
   select ch.id,ch.name,ch.label,
    round(100*(ch.price/nullif(b.price0,0)-1),2) as price_change,
    round(100*(ch.cost/nullif(b.cost0,0)-1),2) as cost_change,
    coalesce(u.qty,0) as qty
   from chosen ch join (select distinct on (id) id,price0,cost0 from based order by id,t) b on b.id=ch.id left join units u on u.pid=ch.id
  )
  select jsonb_build_object(
   'start',v_start,'tracked_since',tracked,
   'groups',coalesce((select jsonb_agg(jsonb_build_object('key',k.grp,'label',k.label,'products',k.n,
     'points',(select jsonb_agg(jsonb_build_object('t',p.t,'price',p.price_index,'cost',p.cost_index,'markup',p.markup) order by p.t) from points p where p.grp=k.grp))
     order by k.label)
    from (select grp,mode() within group (order by label) as label,count(*) as n from chosen group by grp) k),'[]'::jsonb),
   'movers',coalesce((select jsonb_agg(to_jsonb(m) order by greatest(abs(coalesce(m.cost_change,0)),abs(coalesce(m.price_change,0))) desc)
    from (select * from movers where coalesce(price_change,0)<>0 or coalesce(cost_change,0)<>0
     order by greatest(abs(coalesce(cost_change,0)),abs(coalesce(price_change,0))) desc limit 20) m),'[]'::jsonb)
  ));
end $$;
revoke all on function public.retail_price_index(uuid,text,text[],text) from public,anon;
grant execute on function public.retail_price_index(uuid,text,text[],text) to authenticated;

notify pgrst,'reload schema';
commit;
