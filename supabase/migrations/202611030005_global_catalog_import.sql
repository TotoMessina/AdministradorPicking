-- Importación en bloque del catálogo global desde una planilla. Solo administradores de plataforma.
-- Cada fila trae code y solo las columnas que tenía la planilla: una columna ausente conserva el dato actual.
-- verified ausente conserva el estado; en un código nuevo queda comunitario. Todo el lote entra o no entra.
begin;

create function public.retail_admin_import_catalog(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 r jsonb; ref text; code text; nm text; br text; cat text; emo text; descr text; ver boolean;
 src text; conf numeric(3,2); prior record; known boolean; changed integer;
 inserted integer:=0; updated integer:=0; unchanged integer:=0;
begin
 if not retail_private.is_platform_admin() then raise exception 'Solo un administrador de plataforma puede editar el catálogo global' using errcode='42501'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 1000 then
  raise exception 'Mandá entre 1 y 1.000 filas por vez';
 end if;
 if (select count(distinct trim(value->>'code')) from jsonb_array_elements(p_rows)) <> jsonb_array_length(p_rows) then
  raise exception 'Hay códigos repetidos en el lote';
 end if;

 for r in select value from jsonb_array_elements(p_rows) loop
  ref:=coalesce('Fila '||(r->>'row')||': ','');
  code:=trim(r->>'code');
  if code is null or length(code) not between 4 and 20 then raise exception '%El código debe tener entre 4 y 20 caracteres',ref; end if;
  if r ? 'verified' and jsonb_typeof(r->'verified')<>'boolean' then raise exception '%Verificado debe ser Sí o No',ref; end if;
  ver:=case when r ? 'verified' then (r->>'verified')::boolean end;

  select * into prior from public.retail_global_catalog where ean_code=code for update;
  known:=found;
  nm:=case when r ? 'name' or not known then trim(r->>'name') else prior.name end;
  br:=case when r ? 'brand' then nullif(trim(r->>'brand'),'') else prior.brand end;
  cat:=case when r ? 'category' then nullif(trim(r->>'category'),'') else prior.category_suggestion end;
  emo:=case when r ? 'emoji' then coalesce(nullif(trim(r->>'emoji'),''),'📦') else coalesce(prior.emoji,'📦') end;
  descr:=case when r ? 'description' then nullif(trim(r->>'description'),'') else prior.description end;
  if nm is null or length(nm) not between 1 and 160 then raise exception '%El nombre debe tener entre 1 y 160 caracteres',ref; end if;
  -- Los límites valen para lo que trae la planilla; un dato anterior que no viene no frena la fila.
  if (r ? 'brand' and length(br)>80) or (r ? 'category' and length(cat)>80) then raise exception '%Marca y categoría admiten hasta 80 caracteres',ref; end if;
  if r ? 'emoji' and length(emo)>16 then raise exception '%El emoji es demasiado largo',ref; end if;
  if r ? 'description' and length(descr)>500 then raise exception '%La descripción admite hasta 500 caracteres',ref; end if;

  if not known then
   insert into public.retail_global_catalog(ean_code,name,brand,category_suggestion,emoji,description,source,contributor_count,confidence_score)
   values(code,nm,br,cat,emo,descr,case when ver then 'verified' else 'community' end,1,case when ver then 1.00 else 0.50 end);
   inserted:=inserted+1;
   continue;
  end if;

  src:=case when ver then 'verified' when ver=false and prior.source='verified' then 'community' else prior.source end;
  conf:=case when ver then 1.00 when ver=false then least(coalesce(prior.confidence_score,0.50),0.89) else prior.confidence_score end;
  update public.retail_global_catalog set name=nm,brand=br,category_suggestion=cat,emoji=emo,description=descr,source=src,confidence_score=conf,updated_at=now()
  where ean_code=code
   and (name,brand,category_suggestion,emoji,description,source,confidence_score) is distinct from (nm,br,cat,emo,descr,src,conf);
  get diagnostics changed=row_count;
  if changed>0 then updated:=updated+1; else unchanged:=unchanged+1; end if;
 end loop;

 return jsonb_build_object('inserted',inserted,'updated',updated,'unchanged',unchanged);
end;
$$;

revoke all on function public.retail_admin_import_catalog(jsonb) from public,anon;
grant execute on function public.retail_admin_import_catalog(jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
