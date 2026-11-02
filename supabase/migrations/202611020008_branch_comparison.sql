begin;
-- Comparación de sucursales. El cálculo de ventas, devoluciones y costo de Ganancias pasa a una sola función
-- interna por período, que usan el resultado del mes y la comparación; lo mismo con las unidades vendidas,
-- que usan los pedidos y la comparación. Nada se calcula dos veces de formas distintas.

-- Ventas netas, tickets y costo por sucursal entre dos instantes. Las devoluciones restan en su fecha,
-- con el costo guardado en el ticket. Las líneas sin costo se cuentan para avisar que el dato no es confiable.
create function retail_private.sales_period(p_store uuid,p_from timestamptz,p_to timestamptz) returns jsonb
language sql stable security definer set search_path='' as $$
 with sold as (
  select s.id,s.branch_id,s.total,s.items from public.retail_sales s where s.store_id=p_store and s.created_at>=p_from and s.created_at<p_to
 ), line as (
  select s.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty,(i.item->>'subtotal')::numeric as subtotal
  from sold s cross join lateral jsonb_array_elements(coalesce(s.items,'[]'::jsonb)) i(item)
 ), returned as (
  select r.branch_id,r.total,r.items from public.retail_sale_returns r where r.store_id=p_store and r.created_at>=p_from and r.created_at<p_to
 ), returned_line as (
  select r.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty from returned r cross join lateral jsonb_array_elements(r.items) i(item)
 ), places as (select branch_id from sold union select branch_id from returned)
 select jsonb_build_object(
  'sales',coalesce((select sum(total) from sold),0)-coalesce((select sum(total) from returned),0),
  'returns',coalesce((select sum(total) from returned),0),
  'tickets',(select count(*) from sold),
  'cost',coalesce((select sum(unit_cost*qty) from line),0)-coalesce((select sum(unit_cost*qty) from returned_line),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null or unit_cost<=0),
  'uncosted_sales',coalesce((select sum(subtotal) from line where unit_cost is null or unit_cost<=0),0),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sum(total) from sold x where x.branch_id=p.branch_id),0)-coalesce((select sum(total) from returned x where x.branch_id=p.branch_id),0),
    'returns',coalesce((select sum(total) from returned x where x.branch_id=p.branch_id),0),
    'tickets',(select count(*) from sold x where x.branch_id=p.branch_id),
    'cost',coalesce((select sum(unit_cost*qty) from line l where l.branch_id=p.branch_id),0)-coalesce((select sum(unit_cost*qty) from returned_line l where l.branch_id=p.branch_id),0),
    'uncosted_lines',(select count(*) from line l where l.branch_id=p.branch_id and (l.unit_cost is null or l.unit_cost<=0)),
    'uncosted_sales',coalesce((select sum(subtotal) from line l where l.branch_id=p.branch_id and (l.unit_cost is null or l.unit_cost<=0)),0))) from places p),'[]'::jsonb)
 );
$$;
revoke all on function retail_private.sales_period(uuid,timestamptz,timestamptz) from public,anon,authenticated;

-- Unidades vendidas por producto y sucursal: combos por sus componentes, sin ventas anuladas.
create function retail_private.units_sold(p_store uuid,p_from timestamptz,p_to timestamptz)
returns table(product_id uuid,branch_id uuid,units numeric) language sql stable security definer set search_path='' as $$
 with item as (
  select s.branch_id,i.value as line from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
  where s.store_id=p_store and s.return_status<>'voided' and s.created_at>=p_from and s.created_at<p_to
 ), units as (
  select branch_id,(line->>'productId')::uuid as product_id,(line->>'qty')::numeric as qty from item
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))=0
  union all
  select branch_id,(c->>'product_id')::uuid,(line->>'qty')::numeric*(c->>'quantity')::numeric from item cross join lateral jsonb_array_elements(line->'stockComponents') c
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))>0
 ) select product_id,branch_id,sum(qty) from units group by product_id,branch_id;
$$;
revoke all on function retail_private.units_sold(uuid,timestamptz,timestamptz) from public,anon,authenticated;

create or replace function public.retail_product_sales_velocity(p_store uuid,p_days integer default 28) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_days is null or p_days not between 1 and 180 then raise exception 'Elegí entre 1 y 180 días'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('product_id',u.product_id,'branch_id',u.branch_id,'units',u.units)),'[]'::jsonb)
  from retail_private.units_sold(p_store,now()-make_interval(days=>p_days),now()+interval '1 minute') u);
end $$;

-- Ganancias del mes: el mismo cálculo por período más los gastos del mes.
create or replace function public.retail_month_result(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires'; v_period jsonb;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 v_period:=retail_private.sales_period(p_store,first_day::timestamp at time zone zone,next_day::timestamp at time zone zone);
 return (with spent as (
  select e.branch_id,e.category,e.amount from public.retail_expenses e
  where e.store_id=p_store and e.voided_at is null and e.spent_on>=first_day and e.spent_on<next_day
 ), sold as (
  select (b->>'branch_id')::uuid as branch_id,(b->>'sales')::numeric as sales,(b->>'cost')::numeric as cost from jsonb_array_elements(v_period->'branches') b
 ), places as (select branch_id from sold union select branch_id from spent where branch_id is not null)
 select (v_period-'branches'-'uncosted_sales')||jsonb_build_object(
  'expenses',coalesce((select sum(amount) from spent),0),
  'shared_expenses',coalesce((select sum(amount) from spent where branch_id is null),0),
  'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',c.category,'amount',c.amount) order by c.amount desc) from (select category,sum(amount) as amount from spent group by category) c),'[]'::jsonb),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sales from sold x where x.branch_id=p.branch_id),0),
    'cost',coalesce((select cost from sold x where x.branch_id=p.branch_id),0),
    'expenses',coalesce((select sum(amount) from spent e where e.branch_id=p.branch_id),0))) from places p),'[]'::jsonb)
 ));
end $$;

-- Panel de sucursales para un rango de días: ventas, ganancia bruta, tickets, ticket promedio,
-- lo más vendido y lo que tiene stock pero no se vendió. Solo dueños y administradores.
create function public.retail_branch_comparison(p_store uuid,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz; v_period jsonb;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede comparar sucursales' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 v_period:=retail_private.sales_period(p_store,v_from,v_to);
 return (with sold as (select * from retail_private.units_sold(p_store,v_from,v_to)),
  totals as (select (b->>'branch_id')::uuid as branch_id,b from jsonb_array_elements(v_period->'branches') b),
  branch as (select id,name from public.retail_branches where store_id=p_store),
  stocked as (
   select b.id as branch_id,p.id as product_id,p.name,p.cost,retail_private.location_quantity(p_store,p.id,b.id::text) as quantity
   from branch b cross join public.retail_products p
   where p.store_id=p_store and p.active and jsonb_array_length(p.stock_components)=0
  )
 select jsonb_build_object(
  'from',p_from,'to',p_to,
  'sales',v_period->'sales','cost',v_period->'cost','tickets',v_period->'tickets',
  'uncosted_lines',v_period->'uncosted_lines','uncosted_sales',v_period->'uncosted_sales',
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',b.id,'name',b.name,
    'sales',coalesce((t.b->>'sales')::numeric,0),'returns',coalesce((t.b->>'returns')::numeric,0),'cost',coalesce((t.b->>'cost')::numeric,0),
    'tickets',coalesce((t.b->>'tickets')::integer,0),'uncosted_lines',coalesce((t.b->>'uncosted_lines')::integer,0),'uncosted_sales',coalesce((t.b->>'uncosted_sales')::numeric,0),
    'top',coalesce((select jsonb_agg(x order by (x->>'units')::numeric desc) from (
      select jsonb_build_object('product_id',s.product_id,'name',p.name,'units',s.units) as x from sold s join public.retail_products p on p.id=s.product_id
      where s.branch_id=b.id and s.units>0 order by s.units desc,p.name limit 5) top),'[]'::jsonb),
    'idle_count',(select count(*) from stocked k where k.branch_id=b.id and k.quantity>0 and not exists(select 1 from sold s where s.branch_id=b.id and s.product_id=k.product_id and s.units>0)),
    'idle',coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('product_id',k.product_id,'name',k.name,'stock',k.quantity,'value',k.quantity*coalesce(nullif(k.cost,0),0)) as x from stocked k
      where k.branch_id=b.id and k.quantity>0 and not exists(select 1 from sold s where s.branch_id=b.id and s.product_id=k.product_id and s.units>0)
      order by k.quantity*coalesce(k.cost,0) desc,k.quantity desc,k.name limit 10) idle),'[]'::jsonb)
   ) order by coalesce((t.b->>'sales')::numeric,0) desc,b.name) from branch b left join totals t on t.branch_id=b.id),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_branch_comparison(uuid,date,date) from public,anon;
grant execute on function public.retail_branch_comparison(uuid,date,date) to authenticated;

notify pgrst,'reload schema';
commit;
