begin;

-- Invoice column layout learned per supplier after a confirmed import.
-- When the next invoice of that supplier matches it, the review reads it locally without Groq.
-- Keyed by the normalized supplier text, like the alias memory: it works for unregistered suppliers too.
create table public.retail_supplier_invoice_formats (
 store_id uuid not null references public.retail_stores(id),
 supplier_key text not null check(supplier_key <> '' and length(supplier_key) <= 120),
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 format jsonb not null check(jsonb_typeof(format) = 'object' and (format->>'version') = '1' and pg_column_size(format) <= 1000),
 samples integer not null default 0 check(samples >= 0),
 local_reads integer not null default 0 check(local_reads >= 0),
 updated_at timestamptz not null default now(),
 primary key(store_id, supplier_key)
);

alter table public.retail_supplier_invoice_formats enable row level security;
-- Every member may read it (invoice review); writes use the checked RPCs.
create policy member_read on public.retail_supplier_invoice_formats for select to authenticated
 using(retail_private.role_for(store_id) is not null);
revoke all on public.retail_supplier_invoice_formats from public, anon, authenticated;
grant select on public.retail_supplier_invoice_formats to authenticated;

-- Any member who imports an invoice may teach or confirm the layout, as with supplier aliases.
-- p_local_read=true only confirms a layout that already read this invoice without AI.
create function public.retail_save_supplier_invoice_format(
 p_store uuid, p_supplier text, p_format jsonb, p_samples integer, p_local_read boolean default false
) returns public.retail_supplier_invoice_formats
language plpgsql security definer set search_path='' as $$
declare result public.retail_supplier_invoice_formats; clean_name text; clean_key text;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 clean_name:=left(btrim(regexp_replace(coalesce(p_supplier,''),'[[:space:]]+',' ','g')),120);
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' then raise exception 'Indicá el proveedor para recordar el formato' using errcode='22023'; end if;
 if p_format is null or jsonb_typeof(p_format)<>'object' or (p_format->>'version') is distinct from '1' or pg_column_size(p_format)>1000 then
   raise exception 'Formato de factura inválido' using errcode='22023';
 end if;
 if p_samples is null or p_samples<1 then raise exception 'El formato necesita renglones confirmados' using errcode='22023'; end if;
 insert into public.retail_supplier_invoice_formats as existing(store_id,supplier_key,supplier_name,format,samples,local_reads)
 values(p_store,clean_key,clean_name,p_format,p_samples,case when p_local_read then 1 else 0 end)
 on conflict(store_id,supplier_key) do update set
   supplier_name=excluded.supplier_name,
   format=excluded.format,
   -- A different layout starts over; the same one accumulates confirmations.
   samples=case when existing.format=excluded.format then existing.samples+excluded.samples else excluded.samples end,
   local_reads=case when existing.format=excluded.format then existing.local_reads+excluded.local_reads else excluded.local_reads end,
   updated_at=now()
 returning * into result;
 return result;
end $$;

create function public.retail_delete_supplier_invoice_format(p_store uuid, p_supplier text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 delete from public.retail_supplier_invoice_formats
 where store_id=p_store and supplier_key=retail_private.normalize_supplier(p_supplier);
end $$;

revoke all on function public.retail_save_supplier_invoice_format(uuid,text,jsonb,integer,boolean) from public,anon;
revoke all on function public.retail_delete_supplier_invoice_format(uuid,text) from public,anon;
grant execute on function public.retail_save_supplier_invoice_format(uuid,text,jsonb,integer,boolean) to authenticated;
grant execute on function public.retail_delete_supplier_invoice_format(uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
