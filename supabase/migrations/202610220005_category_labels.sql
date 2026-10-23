-- Per-store labels; never rename the shared category identity or product links.
begin;
alter table public.retail_categories add column display_name text
 check(display_name is null or length(trim(display_name)) between 1 and 80);
create unique index retail_category_display_name on public.retail_categories
 (store_id,retail_private.normalize_category_name(coalesce(display_name,catalog_name))) where catalog_name is not null;
create function public.retail_rename_category(p_store uuid,p_category uuid,p_name text,p_expected text) returns uuid
language plpgsql security definer set search_path='' as $$
declare category public.retail_categories; label text:=nullif(trim(p_name),'');
begin
 perform retail_private.require_permission(p_store,'manage_categories');
 if coalesce(length(label),0)>80 then raise exception 'Usá un nombre de hasta 80 caracteres'; end if;
 select * into category from public.retail_categories where store_id=p_store and id=p_category and catalog_name is not null for update;
 if not found then raise exception 'Categoría no disponible. Actualizá los datos'; end if;
 if coalesce(category.display_name,category.catalog_name)=coalesce(label,category.catalog_name) then return category.id; end if;
 if p_expected is null or coalesce(category.display_name,category.catalog_name)<>p_expected then raise exception 'Otra persona cambió este nombre. Actualizá los datos y revisá el cambio'; end if;
 update public.retail_categories set display_name=case when label=category.catalog_name then null else label end where id=category.id;
 return category.id;
end $$;
revoke all on function public.retail_rename_category(uuid,uuid,text,text) from public,anon;
grant execute on function public.retail_rename_category(uuid,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
