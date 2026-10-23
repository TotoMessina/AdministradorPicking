-- Fixed categories are provisioned by the database, never by store users.
-- Keeps existing category rows/IDs; backs up changed product associations.
begin;
create table public.retail_category_catalog (
 name text primary key
);
insert into public.retail_category_catalog(name) values
 ('Aderezos y conservas'),('Aguas y saborizadas'),('Alfajores'),('Almacen'),
 ('Bebidas'),('Bebidas Alcoholicas'),('Cereales y barras'),('Chocolates'),
 ('Cigarrillos'),('Energizantes y deportivas'),('Galletitas y obleas'),
 ('Golosinas'),('Helados'),('Infusiones'),('Jugos'),('Lacteos'),
 ('Panificados y reposteria'),('Snacks'),('Varios');
alter table public.retail_category_catalog enable row level security;
create policy authenticated_read on public.retail_category_catalog for select to authenticated using(true);
revoke all on public.retail_category_catalog from public,anon,authenticated;
grant select on public.retail_category_catalog to authenticated;

alter table public.retail_categories add column catalog_name text references public.retail_category_catalog(name);
alter table public.retail_categories add constraint retail_category_catalog_label check(catalog_name is null or name=catalog_name);
create unique index retail_category_store_catalog on public.retail_categories(store_id,catalog_name) where catalog_name is not null;

create function retail_private.normalize_category_name(p_name text) returns text
language sql immutable set search_path='' as $$
 select regexp_replace(translate(lower(trim(p_name)),'áéíóúüñ','aeiouun'),'\s+',' ','g');
$$;
revoke all on function retail_private.normalize_category_name(text) from public,anon,authenticated;

-- Reuse exact names/IDs. Variants remain preserved as legacy rows.
insert into public.retail_categories(store_id,name,catalog_name)
 select s.id,c.name,c.name from public.retail_stores s cross join public.retail_category_catalog c
 on conflict(store_id,name) do update set catalog_name=excluded.catalog_name;

create table retail_private.product_category_migrations (
 product_id uuid primary key,
 store_id uuid not null,
 previous_category_id uuid not null,
 previous_category_name text not null,
 new_category_id uuid not null,
 migrated_at timestamptz not null default now()
);
revoke all on retail_private.product_category_migrations from public,anon,authenticated;
insert into retail_private.product_category_migrations(product_id,store_id,previous_category_id,previous_category_name,new_category_id)
 select p.id,p.store_id,p.category_id,old.name,target.id
 from public.retail_products p
 join public.retail_categories old on old.store_id=p.store_id and old.id=p.category_id
 left join public.retail_category_catalog known on retail_private.normalize_category_name(known.name)=retail_private.normalize_category_name(old.name)
 join public.retail_categories target on target.store_id=p.store_id and target.catalog_name=coalesce(known.name,'Varios')
 where p.category_id<>target.id;
update public.retail_products p set category_id=m.new_category_id
 from retail_private.product_category_migrations m where m.product_id=p.id and m.store_id=p.store_id;

-- Defense in depth: old clients cannot create or rename categories either.
drop policy if exists manager_insert on public.retail_categories;
drop policy if exists manager_update on public.retail_categories;
revoke insert,update,delete on public.retail_categories from authenticated,anon;
revoke update(name) on public.retail_categories from authenticated,anon;

create function retail_private.resolve_standard_product_category() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous public.retail_categories; canonical text; resolved uuid;
begin
 if new.category_id is not null then
  select * into previous from public.retail_categories where store_id=new.store_id and id=new.category_id;
  if not found then raise exception 'La categoría no pertenece a este comercio. Actualizá el catálogo y reintentá'; end if;
  canonical:=previous.catalog_name;
  if canonical is null then
   select name into canonical from public.retail_category_catalog
    where retail_private.normalize_category_name(name)=retail_private.normalize_category_name(previous.name);
  end if;
 end if;
 select id into resolved from public.retail_categories where store_id=new.store_id and catalog_name=coalesce(canonical,'Varios');
 if resolved is null then raise exception 'Faltan las categorías del comercio. Revisá la migración de categorías estándar'; end if;
 new.category_id:=resolved;
 return new;
end $$;
revoke all on function retail_private.resolve_standard_product_category() from public,anon,authenticated;
create trigger retail_standard_product_category before insert or update of category_id on public.retail_products
 for each row execute function retail_private.resolve_standard_product_category();

-- Same store bootstrap and contract; all nineteen categories now come from SQL.
create or replace function public.retail_create_store(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 insert into public.retail_stores(name,owner_id) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.retail_members(store_id,user_id,role) values(v_id,auth.uid(),'owner');
 insert into public.retail_categories(store_id,name,catalog_name) select v_id,name,name from public.retail_category_catalog;
 insert into public.retail_registers(store_id,name) values(v_id,'Caja principal');
 return v_id;
end $$;
revoke all on function public.retail_create_store(text) from public,anon;
grant execute on function public.retail_create_store(text) to authenticated;
notify pgrst,'reload schema';
commit;
