begin;

-- Registered suppliers per store, with the discount this store gets from each one.
-- The invoice review uses it when the discount appears only in the invoice totals.
create table public.retail_suppliers (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 120 and name = btrim(name)),
 supplier_key text not null check(supplier_key <> '' and supplier_key = retail_private.normalize_supplier(name)),
 discount_percent numeric(5,2) not null default 0 check(discount_percent >= 0 and discount_percent < 100),
 notes text check(notes is null or length(notes) <= 300),
 revision integer not null default 1 check(revision >= 1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(store_id, supplier_key)
);

alter table public.retail_suppliers enable row level security;
-- Every member may read (the invoice review needs the discount); writes use the checked RPCs.
create policy member_read on public.retail_suppliers for select to authenticated
 using(retail_private.role_for(store_id) is not null);
revoke all on public.retail_suppliers from public, anon, authenticated;
grant select on public.retail_suppliers to authenticated;

-- p_id null creates; otherwise p_expected must match the current revision.
create function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 clean_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' or length(clean_name)>120 then raise exception 'Ingresá el nombre del proveedor (hasta 120 caracteres)' using errcode='22023'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount>=100 then
   raise exception 'El descuento debe ser un porcentaje desde 0 y menor a 100' using errcode='22023';
 end if;
 if round(p_discount,2)<>p_discount then raise exception 'Usá hasta dos decimales para el descuento' using errcode='22023'; end if;
 clean_notes:=nullif(btrim(coalesce(p_notes,'')),'');
 if length(clean_notes)>300 then raise exception 'Las notas admiten hasta 300 caracteres' using errcode='22023'; end if;
 if exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.supplier_key=clean_key and s.id is distinct from p_id) then
   raise exception 'Ya existe un proveedor con ese nombre en el comercio' using errcode='23505';
 end if;
 if p_id is null then
   insert into public.retail_suppliers(store_id,name,supplier_key,discount_percent,notes)
   values(p_store,clean_name,clean_key,p_discount,clean_notes)
   returning * into result;
   return result;
 end if;
 update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
   notes=clean_notes,revision=s.revision+1,updated_at=now()
 where s.id=p_id and s.store_id=p_store and s.revision=p_expected
 returning * into result;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar' using errcode='40001'; end if;
 return result;
end $$;

create function public.retail_delete_supplier(p_store uuid, p_id uuid, p_expected integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 -- Products and alias memory keep their supplier text; only the discount record is removed.
 delete from public.retail_suppliers where id=p_id and store_id=p_store and revision=p_expected;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de eliminar' using errcode='40001'; end if;
end $$;

revoke all on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer) from public,anon;
revoke all on function public.retail_delete_supplier(uuid,uuid,integer) from public,anon;
grant execute on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer) to authenticated;
grant execute on function public.retail_delete_supplier(uuid,uuid,integer) to authenticated;

notify pgrst,'reload schema';
commit;
