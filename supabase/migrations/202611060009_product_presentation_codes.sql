-- Código de cada presentación: la unidad sigue usando `code` (EAN), el display su EAN-13 y el bulto su DUN-14.
-- Además, cuántos bultos entran en un pallet. Al reponer, en remitos y en facturas de compra el código del display
-- o del bulto se reconoce y se convierte a unidades; en Vender no se usa. Stock y costo siguen siempre por unidad.
begin;

alter table public.retail_products
 add column display_code text check (display_code is null or display_code ~ '^[0-9A-Za-z-]{1,40}$'),
 add column pack_code text check (pack_code is null or pack_code ~ '^[0-9A-Za-z-]{1,40}$'),
 add column pallet_packs integer check (pallet_packs is null or pallet_packs between 1 and 100000);
grant update(display_code,pack_code,pallet_packs) on public.retail_products to authenticated;
create index retail_products_display_code on public.retail_products(store_id,display_code) where display_code is not null;
create index retail_products_pack_code on public.retail_products(store_id,pack_code) where pack_code is not null;

-- Un código identifica una sola presentación de un solo producto activo del comercio: no puede repetirse entre
-- unidades, displays y bultos. Los productos ya cargados no se revisan; el control corre al cambiar un código.
create function retail_private.check_presentation_codes() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_code text; v_codes text[];
begin
 if not new.active then return new; end if;
 v_codes:=array_remove(array[case when tg_op='INSERT' or new.code is distinct from old.code or not old.active then nullif(btrim(new.code),'') end,
  new.display_code,new.pack_code],null);
 if new.display_code is not null and (new.display_code=new.pack_code or new.display_code=btrim(new.code)) then raise exception 'El código del display tiene que ser distinto del de la unidad y del bulto'; end if;
 if new.pack_code is not null and new.pack_code=btrim(new.code) then raise exception 'El código del bulto tiene que ser distinto del de la unidad'; end if;
 if tg_op='UPDATE' and old.active and new.code is not distinct from old.code and new.display_code is not distinct from old.display_code
  and new.pack_code is not distinct from old.pack_code then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('presentation-codes:'||new.store_id::text,0));
 foreach v_code in array v_codes loop
  -- El código de la unidad puede repetirse entre productos como antes; solo choca con displays y bultos.
  if exists(select 1 from public.retail_products p where p.store_id=new.store_id and p.active and p.id<>new.id
   and (p.display_code=v_code or p.pack_code=v_code or (v_code<>btrim(new.code) and btrim(p.code)=v_code))) then
   raise exception 'El código % ya está en otro producto', v_code;
  end if;
 end loop;
 return new;
end $$;
revoke all on function retail_private.check_presentation_codes() from public,anon,authenticated;
create trigger retail_products_presentation_codes before insert or update of code,display_code,pack_code,active on public.retail_products
 for each row execute function retail_private.check_presentation_codes();

-- Igual que 202610280003, con los campos agregados después: con inventario por sucursal la ficha también guarda
-- display, códigos de presentación, pallet, redondeo y «sin precio».
create or replace function public.retail_save_product_at_branch_before_audit(p_store uuid,p_values jsonb,p_edit boolean,p_expected integer,p_branch uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare columns_sql text; expressions_sql text; assignment_sql text; saved uuid; previous text:=current_setting('retail.inventory_location',true); product_id uuid;
 allowed text[]:=array['category_id','code','name','price','sale_markup','cost','stock','min_stock','emoji','active','sellable','brand','supplier','supplier_code','tags','unit_type','pack_size','expiry_date','last_restocked_at',
  'display_size','display_code','pack_code','pallet_packs','price_rounding','price_pending'];
begin
 if p_values is null or jsonb_typeof(p_values)<>'object' or p_edit is null then raise exception 'Datos del producto incompletos'; end if;
 product_id:=(p_values->>'id')::uuid;
 if exists(select 1 from jsonb_object_keys(p_values) k where k<>all(allowed||array['id'])) then raise exception 'Campos de producto no admitidos'; end if;
 if not exists(select 1 from public.retail_branches where store_id=p_store and id=p_branch) then raise exception 'Elegí la sucursal del stock'; end if;
 perform set_config('retail.inventory_location',p_branch::text,true);
 select string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(null::public.retail_products,$1)).%I',k),','),
  string_agg(format('%I=(jsonb_populate_record(null::public.retail_products,$1)).%I',k,k),',')
 into columns_sql,expressions_sql,assignment_sql from jsonb_object_keys(p_values) k where k=any(allowed);
 if p_edit then
  execute 'update public.retail_products set '||assignment_sql||' where store_id=$2 and id=$3 and active and stock=$4 returning id' into saved using p_values,p_store,product_id,p_expected;
 else
  execute 'insert into public.retail_products(store_id,'||columns_sql||') select $2,'||expressions_sql||' returning id' into saved using p_values,p_store;
 end if;
 if saved is null then raise exception 'El producto cambió o no tenés permiso. Actualizá y revisá el borrador'; end if;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return jsonb_build_object('id',saved);
end $$;

notify pgrst,'reload schema';
commit;
