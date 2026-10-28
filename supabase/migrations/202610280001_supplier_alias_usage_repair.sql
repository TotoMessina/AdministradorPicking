begin;

-- Some conciliated installations registered 202610200002_supplier_alias_usage.sql without its effects:
-- they keep the six-argument upsert, so the app's alias sharing fails with "function not found".
-- Recreate that migration's objects idempotently; on complete installations this changes nothing.
drop function if exists public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer);
create or replace function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text, p_product_id uuid, p_product_name text,
 p_pack_size integer default null, p_confidence numeric default 1,
 p_usage_only boolean default false, p_mapping_id uuid default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path='' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
   raise exception 'La confianza debe estar entre cero y uno' using errcode='22023';
 end if;
 if p_usage_only then
   update public.retail_supplier_mappings m set times_used=m.times_used+1,last_used_at=now()
   where m.id=p_mapping_id and m.store_id=p_store and m.supplier=retail_private.normalize_supplier(p_supplier)
     and m.invoice_text=btrim(p_invoice_text) and m.product_id=p_product_id
     and m.pack_size_detected is not distinct from p_pack_size
     and m.confidence>=0.85 and m.times_used>=3
   returning m.* into result;
   if not found then raise exception 'El alias cambió o fue eliminado. Actualizá la memoria del proveedor.'; end if;
   return result;
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id,supplier,invoice_text,product_id,product_name,pack_size_detected,confidence)
 values(p_store,retail_private.normalize_supplier(p_supplier),btrim(p_invoice_text),p_product_id,btrim(p_product_name),p_pack_size,p_confidence)
 on conflict(store_id,supplier,invoice_text) do update set
   times_used=case when existing.product_id=excluded.product_id and existing.pack_size_detected is not distinct from excluded.pack_size_detected
     then existing.times_used+1 else 1 end,
   product_id=excluded.product_id,product_name=excluded.product_name,pack_size_detected=excluded.pack_size_detected,
   confidence=excluded.confidence,last_used_at=now()
 returning * into result;
 return result;
end;
$$;

do $repair$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='retail_supplier_mappings' and policyname='member_delete') then
   create policy member_delete on public.retail_supplier_mappings for delete to authenticated
    using(retail_private.role_for(store_id) is not null);
 end if;
end $repair$;
grant delete on public.retail_supplier_mappings to authenticated;

create or replace function public.retail_delete_supplier_mapping(p_store uuid,p_supplier text,p_mapping_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 delete from public.retail_supplier_mappings where id=p_mapping_id and store_id=p_store
   and supplier=retail_private.normalize_supplier(p_supplier);
end;
$$;

revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) from public,anon;
revoke all on function public.retail_delete_supplier_mapping(uuid,text,uuid) from public,anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) to authenticated;
grant execute on function public.retail_delete_supplier_mapping(uuid,text,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
