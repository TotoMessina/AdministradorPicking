begin;
-- Gastos del negocio que no son mercadería. Solo administración: el resultado es información sensible.
create table if not exists public.retail_expenses (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), branch_id uuid,
 spent_on date not null, category text not null check(category in ('alquiler','servicios','sueldos','impuestos','mantenimiento','otros')),
 description text not null check(length(btrim(description)) between 1 and 300),
 amount numeric(14,2) not null check(amount>0 and amount::text<>'NaN'), fixed boolean not null default false,
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 voided_at timestamptz, voided_by uuid references auth.users(id),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id)
);
create index if not exists retail_expense_month on public.retail_expenses(store_id,spent_on desc);
alter table public.retail_expenses enable row level security;
drop policy if exists manager_read on public.retail_expenses;
create policy manager_read on public.retail_expenses for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_expenses from public,anon,authenticated;
grant select on public.retail_expenses to authenticated;

create or replace function public.retail_save_expense(p_store uuid,p_id uuid,p_expense jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.retail_expenses; v_branch uuid:=nullif(p_expense->>'branch_id','')::uuid; v_date date:=(p_expense->>'spent_on')::date;
 v_category text:=p_expense->>'category'; v_description text:=btrim(p_expense->>'description'); v_amount numeric:=(p_expense->>'amount')::numeric; v_fixed boolean:=coalesce((p_expense->>'fixed')::boolean,false);
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede cargar gastos' using errcode='42501'; end if;
 if p_id is null or v_date is null or v_amount is null or v_amount<=0 or v_amount>999999999999.99 or round(v_amount,2)<>v_amount then raise exception 'Revisá la fecha y el importe'; end if;
 if v_description is null or length(v_description) not between 1 and 300 then raise exception 'Escribí en qué se gastó'; end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where store_id=p_store and id=v_branch) then raise exception 'La sucursal no pertenece a este comercio'; end if;
 perform pg_advisory_xact_lock(hashtextextended('expense:'||p_id::text,0));
 select * into previous from public.retail_expenses where id=p_id;
 if found then
  if previous.store_id<>p_store or previous.voided_at is not null then raise exception 'Este gasto ya no se puede editar. Actualizá la lista'; end if;
  update public.retail_expenses set branch_id=v_branch,spent_on=v_date,category=v_category,description=v_description,amount=v_amount,fixed=v_fixed where id=p_id;
 else
  insert into public.retail_expenses(id,store_id,branch_id,spent_on,category,description,amount,fixed,created_by,actor_email)
  values(p_id,p_store,v_branch,v_date,v_category,v_description,v_amount,v_fixed,auth.uid(),auth.jwt()->>'email');
 end if;
 return p_id;
end $$;

create or replace function public.retail_delete_expense(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede eliminar gastos' using errcode='42501'; end if;
 update public.retail_expenses set voided_at=now(),voided_by=auth.uid() where store_id=p_store and id=p_id and voided_at is null;
end $$;

-- Costo de lo vendido con el costo guardado en cada renglón del ticket, no el costo de hoy.
create or replace function public.retail_month_result(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 return (with sold as (
  select s.id,s.branch_id,s.total from public.retail_sales s
  where s.store_id=p_store and s.created_at>=(first_day::timestamp at time zone zone) and s.created_at<(next_day::timestamp at time zone zone)
 ), line as (
  select s.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty
  from sold s cross join lateral jsonb_array_elements(coalesce((select r.items from public.retail_sales r where r.id=s.id),'[]'::jsonb)) i(item)
 ), spent as (
  select e.branch_id,e.category,e.amount from public.retail_expenses e
  where e.store_id=p_store and e.voided_at is null and e.spent_on>=first_day and e.spent_on<next_day
 ), places as (
  select branch_id from sold union select branch_id from spent where branch_id is not null
 )
 select jsonb_build_object(
  'sales',coalesce((select sum(total) from sold),0),
  'tickets',(select count(*) from sold),
  'cost',coalesce((select sum(unit_cost*qty) from line),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null or unit_cost<=0),
  'expenses',coalesce((select sum(amount) from spent),0),
  'shared_expenses',coalesce((select sum(amount) from spent where branch_id is null),0),
  'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',c.category,'amount',c.amount) order by c.amount desc) from (select category,sum(amount) as amount from spent group by category) c),'[]'::jsonb),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sum(total) from sold x where x.branch_id=p.branch_id),0),
    'cost',coalesce((select sum(unit_cost*qty) from line l where l.branch_id=p.branch_id),0),
    'expenses',coalesce((select sum(amount) from spent e where e.branch_id=p.branch_id),0))) from places p),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_save_expense(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_delete_expense(uuid,uuid) from public,anon;
revoke all on function public.retail_month_result(uuid,date) from public,anon;
grant execute on function public.retail_save_expense(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_delete_expense(uuid,uuid) to authenticated;
grant execute on function public.retail_month_result(uuid,date) to authenticated;
notify pgrst,'reload schema';
commit;
