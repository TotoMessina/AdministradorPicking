-- Delegation is explicit, per-store, and never changes a staff member's role.
-- Apply after 005. Existing profiles receive no new permissions automatically.
begin;
alter table public.retail_permission_profiles add column revision integer not null default 0;

create function retail_private.can_grant_permissions(p_store uuid,p_permissions text[]) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.role_for(p_store) in ('owner','admin') or
 (retail_private.has_permission(p_store,'manage_profiles') and not exists(
  select 1 from unnest(p_permissions) action where not retail_private.has_permission(p_store,action)));
$$;
revoke all on function retail_private.can_grant_permissions(uuid,text[]) from public,anon;
grant execute on function retail_private.can_grant_permissions(uuid,text[]) to authenticated;

-- Profiles are written only through the validated, concurrent-safe RPC.
revoke insert,update on public.retail_permission_profiles from authenticated,anon;
revoke update(name,permissions) on public.retail_permission_profiles from authenticated,anon;
create function public.retail_save_permission_profile(p_store uuid,p_id uuid,p_name text,p_role text,p_permissions text[],p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.retail_permission_profiles; normalized text[]; label text:=trim(p_name);
begin
 perform retail_private.require_permission(p_store,'manage_profiles');
 if p_id is null or p_role is null or p_role not in ('cashier','supervisor') or label is null or length(label) not between 1 and 80 or p_permissions is null then raise exception 'Revisá nombre, rol y permisos del perfil'; end if;
 select coalesce(array_agg(distinct action order by action),'{}'::text[]) into normalized from unnest(p_permissions) action;
 if not coalesce(retail_private.can_grant_permissions(p_store,normalized),false) then raise exception 'Solo podés conceder permisos que ya tenés' using errcode='42501'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and exists(select 1 from public.retail_members where store_id=p_store and user_id=auth.uid() and profile_id=p_id) then raise exception 'Pedile a otro administrador que cambie tu propio perfil' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into previous from public.retail_permission_profiles where id=p_id for update;
 if found then
  if previous.store_id<>p_store or previous.base_role<>p_role then raise exception 'El perfil no corresponde al comercio o rol'; end if;
  if previous.name=label and previous.permissions @> normalized and previous.permissions <@ normalized then return previous.id; end if;
  if p_revision is null or previous.revision<>p_revision then raise exception 'El perfil cambió en otro dispositivo. Actualizá la lista y revisá los cambios antes de guardar'; end if;
  update public.retail_permission_profiles set name=label,permissions=normalized,revision=revision+1 where id=p_id;
 else
  insert into public.retail_permission_profiles(id,store_id,name,base_role,permissions) values(p_id,p_store,label,p_role,normalized);
 end if;
 return p_id;
end $$;
revoke all on function public.retail_save_permission_profile(uuid,uuid,text,text,text[],integer) from public,anon;
grant execute on function public.retail_save_permission_profile(uuid,uuid,text,text,text[],integer) to authenticated;

-- Direct REST writes and RPCs must enforce the same capabilities.
create function retail_private.guard_product_capabilities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
  return new;
 end if;
 if new.active is distinct from old.active then perform retail_private.require_permission(new.store_id,'delete_products'); end if;
 if new.stock_components is distinct from old.stock_components then perform retail_private.require_permission(new.store_id,'manage_compositions'); end if;
 if (to_jsonb(new)-array['active','stock_components','stock','cost','last_restocked_at','price']) is distinct from
    (to_jsonb(old)-array['active','stock_components','stock','cost','last_restocked_at','price']) and not retail_private.has_permission(new.store_id,'manage_compositions') then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if new.price is distinct from old.price and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'edit_prices'); end if;
 if (new.stock is distinct from old.stock or new.cost is distinct from old.cost or new.last_restocked_at is distinct from old.last_restocked_at)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions')
  and not retail_private.has_permission(new.store_id,'review_remitos') then
  -- Checkout consumes stock with the sell permission; the RPC restricts it to
  -- the caller's valid shift and exact cart. REST updates still require product RLS.
  if not retail_private.has_permission(new.store_id,'sell') then perform retail_private.require_permission(new.store_id,'replenish_stock'); end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_product_capabilities() from public,anon,authenticated;
create trigger retail_product_capabilities before insert or update on public.retail_products for each row execute function retail_private.guard_product_capabilities();
create policy delegated_product_insert on public.retail_products for insert to authenticated with check(retail_private.has_permission(store_id,'manage_products'));
create policy delegated_product_update on public.retail_products for update to authenticated using(retail_private.has_permission(store_id,'manage_products')) with check(retail_private.has_permission(store_id,'manage_products'));
create policy delegated_store_update on public.retail_stores for update to authenticated using(retail_private.has_permission(id,'manage_store')) with check(retail_private.has_permission(id,'manage_store'));

create function retail_private.guard_delegated_staff() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed text[];
begin
 if retail_private.role_for(new.store_id) in ('owner','admin') then return new; end if;
 perform retail_private.require_permission(new.store_id,'manage_staff');
 if new.role not in ('cashier','supervisor') then raise exception 'No podés crear administradores' using errcode='42501'; end if;
 if new.profile_id is null then
  allowed:=array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'];
  if new.role='supervisor' then allowed:=allowed||array['view_sales']; end if;
 else select permissions into allowed from public.retail_permission_profiles where id=new.profile_id and store_id=new.store_id;
 end if;
 if allowed is null or exists(select 1 from unnest(allowed) action where not retail_private.has_permission(new.store_id,action)) then raise exception 'No podés asignar permisos que no tenés' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function retail_private.guard_delegated_staff() from public,anon,authenticated;
create trigger retail_delegated_invite before insert or update on public.retail_invitations for each row execute function retail_private.guard_delegated_staff();
create policy delegated_invites_read on public.retail_invitations for select to authenticated using(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
create policy delegated_invites_create on public.retail_invitations for insert to authenticated with check(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
create policy delegated_invites_delete on public.retail_invitations for delete to authenticated using(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
-- Check open shifts with privileged access; their details remain private.
create function retail_private.can_remove_staff(p_store uuid,p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'manage_staff') and p_target<>auth.uid()
 and exists(select 1 from public.retail_members where store_id=p_store and user_id=p_target and role in ('cashier','supervisor'))
 and not exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null);
$$;
revoke all on function retail_private.can_remove_staff(uuid,uuid) from public,anon;
grant execute on function retail_private.can_remove_staff(uuid,uuid) to authenticated;
create policy delegated_staff_delete on public.retail_members for delete to authenticated using(retail_private.can_remove_staff(store_id,user_id));

create function retail_private.guard_transfer_permission() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform retail_private.require_permission(new.store_id,'manage_transfers'); return new; end $$;
revoke all on function retail_private.guard_transfer_permission() from public,anon,authenticated;
create trigger retail_transfer_capability before insert or update on public.retail_stock_transfers for each row execute function retail_private.guard_transfer_permission();

-- Further capability checks below retain the existing transactional bodies,
-- locking, idempotency, stock calculations and assignment/shift restrictions.

alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;
create policy delegated_insert on public.retail_branches for insert to authenticated with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_update on public.retail_branches for update to authenticated using(retail_private.has_permission(store_id,'manage_locations')) with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_insert on public.retail_registers for insert to authenticated with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_update on public.retail_registers for update to authenticated using(retail_private.has_permission(store_id,'manage_locations')) with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_insert on public.retail_price_lists for insert to authenticated with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_update on public.retail_price_lists for update to authenticated using(retail_private.has_permission(store_id,'manage_price_lists')) with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_insert on public.retail_price_overrides for insert to authenticated with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_update on public.retail_price_overrides for update to authenticated using(retail_private.has_permission(store_id,'manage_price_lists')) with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_insert on public.retail_ledgers for insert to authenticated with check(retail_private.has_permission(store_id,'manage_ledgers'));
create policy delegated_update on public.retail_ledgers for update to authenticated using(retail_private.has_permission(store_id,'manage_ledgers')) with check(retail_private.has_permission(store_id,'manage_ledgers'));
create policy delegated_delete on public.retail_price_overrides for delete to authenticated using(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_history on public.retail_product_deletions for select to authenticated using(retail_private.has_permission(store_id,'delete_products'));
create or replace function retail_private.can_read_remito(p_name text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1) and m.user_id=auth.uid() and retail_private.has_permission(m.store_id,'review_remitos')); $$;

create or replace function public.retail_update_prices(p_store uuid,p_updates jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_price numeric;
begin
 perform retail_private.require_permission(p_store,'edit_prices');
 if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'Precios inválidos'; end if;
 if jsonb_array_length(p_updates) not between 1 and 10000 then raise exception 'Cantidad de cambios inválida'; end if;
 perform id from public.retail_products where store_id=p_store and id in (select (x->>'id')::uuid from jsonb_array_elements(p_updates) x) order by id for update;
 for item in select value from jsonb_array_elements(p_updates) loop
  v_price := (item->>'price')::numeric;
  if v_price is null or v_price <= 0 or v_price >= 1000000000000 or v_price::text in ('NaN','Infinity','-Infinity') or round(v_price,2)<=0 then raise exception 'Precio inválido'; end if;
  update public.retail_products set price=round(v_price,2) where id=(item->>'id')::uuid and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
 end loop;
end $$;

create or replace function public.retail_attach_invoice(p_sale uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 select * into s from public.retail_sales where id=p_sale for update;
 if s.id is null then raise exception 'Venta no disponible'; end if;
 perform retail_private.require_permission(s.store_id,'attach_invoice');
 if not retail_private.can_review_sales(s.store_id,s.shift_id) then raise exception 'Sin acceso a esta venta' using errcode='42501'; end if;
 if s.invoice_reference is not null then
  if s.invoice_reference=trim(p_reference) then return; end if;
  raise exception 'La venta ya tiene un comprobante asociado';
 end if;
 if p_reference is null or length(trim(p_reference)) not between 1 and 120 then raise exception 'Ingresá la referencia del comprobante emitido'; end if;
 update public.retail_sales set invoice_reference=trim(p_reference),invoiced_at=now(),invoiced_by=auth.uid() where id=p_sale;
end $$;

create or replace function public.retail_save_product_composition(p_store uuid,p_product uuid,p_components jsonb,p_expected jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare product public.retail_products; normalized jsonb; previous jsonb;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_compositions');
 if jsonb_typeof(p_components) is distinct from 'array' or jsonb_array_length(p_components)>30 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Composición inválida'; end if;
 -- Configuration and checkout take this lock BEFORE product locks. No nested recipes.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store and
  (id=p_product or id in(select (c->>'product_id')::uuid from jsonb_array_elements(p_components) c)) order by id for update;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active;
 if not found then raise exception 'Producto no disponible'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',((c->>'product_id')::uuid)::text,'quantity',(c->>'quantity')::integer) order by (c->>'product_id')::uuid),'[]'::jsonb) into normalized from jsonb_array_elements(p_components) c;
 select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into previous from jsonb_array_elements(p_expected) c;
 if product.stock_components=normalized then return; end if;
 if product.stock_components is distinct from previous then raise exception 'La composición cambió en otro dispositivo. Actualizá el catálogo antes de reintentar'; end if;
 if jsonb_array_length(product.stock_components)=0 and product.stock<>0 then raise exception 'El producto tiene stock propio. Creá otro producto con stock 0; no se trasladan existencias automáticamente'; end if;
 update public.retail_products set stock_components=normalized where id=p_product;
end $$;

create or replace function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare packet public.retail_products; unit_product public.retail_products; previous public.retail_loose_unit_conversions;
 actor_role text; per_packet integer; target_id uuid; total_units bigint; unit_price numeric; unit_cost numeric; unit_name text; unit_code text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'manage_compositions');
 if p_request is null or p_store is null or p_packet is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Faltan datos para convertir el atado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_loose_unit_conversions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.packet_id<>p_packet or previous.created_by<>auth.uid() or previous.payload<>p_data then raise exception 'La solicitud corresponde a otra conversión'; end if;
  return previous.unit_product_id;
 end if;
 if coalesce(p_data->>'units','')!~'^[1-9][0-9]{0,3}$' then raise exception 'Indicá cuántos cigarrillos trae el atado'; end if;
 per_packet:=(p_data->>'units')::integer;
 if per_packet not between 2 and 1000 then raise exception 'Ingresá entre 2 y 1000 cigarrillos por atado'; end if;
 unit_price:=(p_data->>'price')::numeric; unit_cost:=(p_data->>'cost')::numeric;
 if unit_price is null or unit_price<=0 or unit_price>999999999999.99 or unit_price::text in ('NaN','Infinity','-Infinity') or unit_price<>round(unit_price,2) then raise exception 'Revisá el precio por cigarrillo'; end if;
 if unit_cost is null or unit_cost<0 or unit_cost>999999999999.99 or unit_cost::text in ('NaN','Infinity','-Infinity') or unit_cost<>round(unit_cost,2) then raise exception 'Revisá el costo por cigarrillo'; end if;
 target_id:=nullif(p_data->>'target','')::uuid;
 if target_id=p_packet then raise exception 'El atado y el suelto deben ser productos distintos'; end if;
 -- Same order as recipe configuration and checkout. This operation may reverse an
 -- existing incorrect unit -> packet recipe, so lock the store's products in order.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select * into packet from public.retail_products where store_id=p_store and id=p_packet and active;
 if not found then raise exception 'El atado ya no está disponible'; end if;
 if exists(select 1 from public.retail_loose_unit_conversions where store_id=p_store and packet_id=p_packet) then raise exception 'Este atado ya fue convertido. Actualizá el catálogo y usá su producto suelto'; end if;
 if jsonb_array_length(packet.stock_components)<>0 then raise exception 'Abrí este flujo desde el atado que tiene stock propio, no desde el cigarrillo suelto'; end if;
 if jsonb_build_object('name',packet.name,'code',packet.code,'stock',packet.stock,'cost',packet.cost,'price',packet.price,'components',packet.stock_components) is distinct from p_data->'expected_packet' then raise exception 'Cambió el atado o sus existencias. Actualizá el catálogo y revisá la conversión'; end if;
 total_units:=packet.stock::bigint*per_packet;
 if total_units>2147483647 then raise exception 'El stock convertido supera el máximo permitido'; end if;
 if target_id is not null then
  select * into unit_product from public.retail_products where store_id=p_store and id=target_id and active;
  if not found then raise exception 'El producto suelto ya no está disponible'; end if;
  if jsonb_build_object('name',unit_product.name,'code',unit_product.code,'stock',unit_product.stock,'cost',unit_product.cost,'price',unit_product.price,'components',unit_product.stock_components) is distinct from p_data->'expected_unit' then raise exception 'Cambió el producto suelto. Actualizá el catálogo antes de reintentar'; end if;
  if unit_product.stock<>0 then raise exception 'El suelto ya tiene stock propio. Revisá las existencias para evitar contarlas dos veces'; end if;
  if jsonb_array_length(unit_product.stock_components)>0 and not
   (jsonb_array_length(unit_product.stock_components)=1 and unit_product.stock_components->0->>'product_id'=p_packet::text) then raise exception 'El suelto tiene otra composición. Elegí un producto sin stock o vinculado solamente a este atado'; end if;
 else
  unit_name:=trim(p_data->>'name'); unit_code:=trim(p_data->>'code');
  if unit_name is null or length(unit_name) not between 1 and 160 or unit_code is null or length(unit_code) not between 1 and 100 then raise exception 'Completá el nombre y código interno del suelto'; end if;
  if unit_code='MANUAL' or exists(select 1 from public.retail_products where store_id=p_store and code=unit_code) then raise exception 'El código del suelto ya está en uso. Elegí otro código interno'; end if;
  target_id:=p_request;
 end if;
 if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and p.active and p.id<>target_id and c->>'product_id'=p_packet::text) then
  raise exception 'Otros productos consumen este atado. Revisá esas composiciones antes de convertirlo';
 end if;
 if unit_product.id is null then
  insert into public.retail_products(id,store_id,category_id,code,name,price,cost,stock,min_stock,emoji,active,
   brand,supplier,supplier_code,tags,unit_type,pack_size,margin_group,expiry_date,last_restocked_at)
  values(target_id,p_store,packet.category_id,unit_code,unit_name,unit_price,unit_cost,0,
   least(2147483647,packet.min_stock::bigint*per_packet)::integer,packet.emoji,true,
   packet.brand,packet.supplier,null,packet.tags,'unit',per_packet,packet.margin_group,packet.expiry_date,packet.last_restocked_at);
 end if;
 -- Both updates, the audit and movements commit together. The unit keeps all
 -- other metadata when reusing an existing record; packet price/cost stay intact.
 update public.retail_products set stock_components='[]'::jsonb,stock=total_units::integer,
  price=unit_price,cost=unit_cost,pack_size=per_packet,unit_type='unit' where store_id=p_store and id=target_id;
 update public.retail_products set stock=0,stock_components=jsonb_build_array(jsonb_build_object('product_id',target_id::text,'quantity',per_packet))
  where store_id=p_store and id=p_packet;
 insert into public.retail_loose_unit_conversions(id,store_id,packet_id,unit_product_id,units_per_packet,packet_stock,unit_stock,payload,created_by)
 values(p_request,p_store,p_packet,target_id,per_packet,packet.stock,total_units::integer,p_data,auth.uid());
 if packet.stock>0 then
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,p_packet,p_store,auth.uid(),-packet.stock,packet.cost,now()),(p_request,target_id,p_store,auth.uid(),total_units::integer,unit_cost,now());
 end if;
 return target_id;
end $$;

create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'delete_products');
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;

create or replace function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments; v_items jsonb; v_group record; p public.retail_products; v_qty integer;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='approved' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue rechazado'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,r.items),true);
 -- Lock all products in a stable order, then add to current stock, never a client snapshot.
 perform pr.id from public.retail_products pr where pr.store_id=p_store and pr.id in
  (select (item->>'product_id')::uuid from jsonb_array_elements(v_items) item) order by pr.id for update;
 for v_group in select (item->>'product_id')::uuid as product_id,sum((item->>'quantity')::integer) as quantity
  from jsonb_array_elements(v_items) item group by (item->>'product_id')::uuid loop
  if v_group.quantity>1000000 then raise exception 'La suma por producto supera 1.000.000 de unidades'; end if;
  v_qty:=v_group.quantity::integer;
  select * into p from public.retail_products where id=v_group.product_id and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible'; end if;
  if p.stock>2147483647-v_qty then raise exception 'El stock resultante supera el máximo permitido'; end if;
  update public.retail_products set stock=stock+v_qty where id=p.id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,occurred_at)
   values(r.id,p.id,p_store,auth.uid(),v_qty,now());
 end loop;
 update public.retail_pending_replenishments set items=v_items,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 return r.id;
end $$;

create or replace function public.retail_reject_replenishment(p_store uuid,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'Ingresá un motivo de rechazo (hasta 1.000 caracteres)'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='rejected' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue aprobado'; end if;
 update public.retail_pending_replenishments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=trim(p_reason) where id=r.id;
 return r.id;
end $$;

create or replace function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_request,gen_random_uuid()); existing public.retail_stock_transfers;
 v_item jsonb; v_product uuid; v_qty integer; v_name text; v_items jsonb:='[]'::jsonb;
 v_requested jsonb:='[]'::jsonb; v_existing jsonb; v_notes text:=nullif(trim(p_notes),'');
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 if p_from_branch is null or p_to_branch is null or p_from_branch=p_to_branch then raise exception 'Elegí sucursales de origen y destino diferentes'; end if;
 if length(coalesce(v_notes,''))>2000 then raise exception 'Las notas no pueden superar los 2.000 caracteres'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Agregá al menos un producto'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(v_item->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá los productos y sus cantidades enteras positivas'; end if;
  v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'qty')::integer;
  if v_qty>1000000 then raise exception 'La cantidad por producto no puede superar 1.000.000 de unidades'; end if;
  v_requested:=v_requested||jsonb_build_array(jsonb_build_object('product_id',v_product,'qty',v_qty));
 end loop;
 if (select count(distinct item->>'product_id') from jsonb_array_elements(v_requested) item)<>jsonb_array_length(v_requested) then
  raise exception 'Incluí cada producto una sola vez con su cantidad total'; end if;
 select jsonb_agg(item order by item->>'product_id') into v_requested from jsonb_array_elements(v_requested) item;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into existing from public.retail_stock_transfers where id=v_id;
 if found then
  select jsonb_agg(jsonb_build_object('product_id',item->>'product_id','qty',(item->>'qty')::integer) order by item->>'product_id')
   into v_existing from jsonb_array_elements(existing.items) item;
  if existing.store_id<>p_store or existing.created_by<>auth.uid() or existing.from_branch_id<>p_from_branch or existing.to_branch_id<>p_to_branch
   or existing.notes is distinct from v_notes or v_existing<>v_requested then raise exception 'El identificador ya corresponde a otra transferencia'; end if;
  return existing.id;
 end if;
 if (select count(*) from public.retail_branches where store_id=p_store and id in (p_from_branch,p_to_branch))<>2 then raise exception 'Las sucursales deben pertenecer a este comercio'; end if;
 for v_item in select value from jsonb_array_elements(v_requested) loop
  v_product:=(v_item->>'product_id')::uuid;
  select name into v_name from public.retail_products where id=v_product and store_id=p_store and active;
  if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_product,'product_name',v_name,'qty',(v_item->>'qty')::integer));
 end loop;
 insert into public.retail_stock_transfers(id,store_id,from_branch_id,to_branch_id,created_by,items,notes)
 values(v_id,p_store,p_from_branch,p_to_branch,auth.uid(),v_items,v_notes);
 return v_id;
end $$;

create or replace function public.retail_confirm_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='confirmed' then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia está cancelada'; end if;
 update public.retail_stock_transfers set status='confirmed',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create or replace function public.retail_cancel_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='cancelled' then return t.id; end if;
 if t.status<>'pending' then raise exception 'Una transferencia confirmada conserva su registro histórico'; end if;
 update public.retail_stock_transfers set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create or replace function public.retail_save_ledger_routing(p_store uuid,p_default uuid,p_rules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_ledgers');
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=p_default and active) then raise exception 'Elegí un registro principal activo'; end if;
 if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Reglas inválidas'; end if;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   if entry.key not in ('Efectivo','QR','Transferencia','Debito','Credito','Mixto') or entry.value is null then raise exception 'Medio de pago inválido'; end if;
   if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=entry.value::uuid and active) then raise exception 'El registro elegido ya no está activo'; end if;
 end loop;
 update public.retail_ledgers set is_default=false,payment_methods='{}' where store_id=p_store;
 update public.retail_ledgers set is_default=true where store_id=p_store and id=p_default;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   update public.retail_ledgers set payment_methods=array_append(payment_methods,entry.key) where store_id=p_store and id=entry.value::uuid;
 end loop;
end $$;

create or replace function public.retail_prepare_sales_ledgers(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare general_id uuid; tests_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_ledgers');
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 insert into public.retail_ledgers(store_id,name) values(p_store,'General')
 on conflict(store_id,name) do update set active=true;
 select id into tests_id from public.retail_ledgers where store_id=p_store and name='Pruebas';
 if tests_id is null then
   select id into tests_id from public.retail_ledgers where store_id=p_store and name='Otras ventas' and not is_default;
   if tests_id is not null then
     update public.retail_ledgers set name='Pruebas',active=true where id=tests_id;
   else
     insert into public.retail_ledgers(store_id,name) values(p_store,'Pruebas');
   end if;
 else
   update public.retail_ledgers set active=true where id=tests_id;
 end if;
 select id into general_id from public.retail_ledgers where store_id=p_store and name='General';
 update public.retail_ledgers set is_default=false where store_id=p_store and is_default;
 update public.retail_ledgers set is_default=true where id=general_id;
end $$;

create or replace function public.retail_team(p_store uuid) returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid,profile_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id,m.profile_id from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;

create or replace function public.retail_set_staff_profile(p_store uuid,p_target uuid,p_role text,p_profile uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_staff');
 if p_role is null or p_role not in ('cashier','supervisor') then raise exception 'Elegí Cajero o Supervisor'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') then
  if not p_pending and p_target=auth.uid() then raise exception 'No podes cambiar tu propio acceso'; end if;
  if p_profile is null then
   if exists(select 1 from unnest(case when p_role='supervisor' then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales'] else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end) a where not retail_private.has_permission(p_store,a)) then raise exception 'No podes conceder permisos que no tenes'; end if;
  elsif not exists(select 1 from public.retail_permission_profiles p where p.id=p_profile and p.store_id=p_store and not exists(select 1 from unnest(p.permissions) a where not retail_private.has_permission(p_store,a))) then raise exception 'No podes conceder permisos que no tenes'; end if;
 end if;
 if p_pending then
   select role into old_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
   select role into old_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if old_role is null or old_role not in ('cashier','supervisor') then raise exception 'Solo se pueden cambiar perfiles de cajeros y supervisores'; end if;
 if old_role<>p_role and not p_pending and exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de cambiar su rol'; end if;
 if p_pending then
   update public.retail_invitations set role=p_role,profile_id=p_profile where store_id=p_store and id=p_target;
 else
   update public.retail_members set role=p_role,profile_id=p_profile where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 if retail_private.role_for(p_store) not in ('owner','admin') and not p_pending and p_target=auth.uid() then raise exception 'No podes cambiar tu propia asignacion'; end if;
 if p_pending then select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update; end if;
 if v_role is null or v_role not in ('cashier','supervisor') then raise exception 'Solo se pueden asignar cajeros o supervisores de este comercio'; end if;
 v_branch:=p_branch;
 if p_register is not null then
   select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
   if v_branch is null then raise exception 'Caja no disponible'; end if;
   if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
   if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then raise exception 'La persona debe cerrar su turno antes de cambiar a otra sucursal o caja'; end if;
   update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if not retail_private.has_permission(v_store,'manage_products') then perform retail_private.require_permission(v_store,'replenish_stock'); end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if not retail_private.has_permission(v_store,'manage_products') and retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
-- Configuration metadata is separate from operational register availability.
-- Seeing all location names never grants use of an unassigned register.
create function public.retail_remove_staff(p_store uuid,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target_role text;
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 if p_target=auth.uid() then raise exception 'No podés quitar tu propio acceso'; end if;
 select role into target_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 if not found then return; end if;
 if target_role='owner' or (target_role='admin' and retail_private.role_for(p_store)<>'owner') then raise exception 'No podés quitar este acceso' using errcode='42501'; end if;
 if exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de quitar el acceso'; end if;
 delete from public.retail_members where store_id=p_store and user_id=p_target;
end $$;
revoke all on function public.retail_remove_staff(uuid,uuid) from public,anon;
grant execute on function public.retail_remove_staff(uuid,uuid) to authenticated;
create function public.retail_management_locations(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not (retail_private.has_permission(p_store,'manage_locations') or retail_private.has_permission(p_store,'manage_staff') or retail_private.has_permission(p_store,'manage_transfers') or retail_private.has_permission(p_store,'manage_price_lists') or retail_private.has_permission(p_store,'review_remitos')) then raise exception 'Sin permiso para consultar esta configuración' using errcode='42501'; end if;
 return jsonb_build_object(
  'branches',(select coalesce(jsonb_agg(to_jsonb(b) order by b.name),'[]'::jsonb) from public.retail_branches b where b.store_id=p_store),
  'registers',(select coalesce(jsonb_agg(to_jsonb(r) order by r.name),'[]'::jsonb) from public.retail_registers r where r.store_id=p_store));
end $$;
create function public.retail_write_branch(p_store uuid,p_name text,p_address text,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if p_id is null then insert into public.retail_branches(store_id,name,address) values(p_store,trim(p_name),p_address) returning id into target;
 else update public.retail_branches set name=trim(p_name),address=p_address where store_id=p_store and id=p_id returning id into target; end if;
 if target is null then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 return target;
end $$;
create function public.retail_write_register(p_store uuid,p_name text,p_branch uuid,p_id uuid default null,p_active boolean default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare current_register public.retail_registers; target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if p_branch is not null and not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'La sucursal no pertenece al comercio'; end if;
 if p_id is null then
  insert into public.retail_registers(store_id,name,branch_id,active) values(p_store,trim(p_name),p_branch,coalesce(p_active,true)) returning id into target;
 else
  select * into current_register from public.retail_registers where id=p_id and store_id=p_store for update;
  if not found then raise exception 'Caja no disponible. Actualizá los datos'; end if;
  if ((p_branch is not null and p_branch<>current_register.branch_id) or p_active=false) and exists(select 1 from public.retail_shifts where register_id=p_id and closed_at is null) then raise exception 'Cerrá el turno de esta caja antes de moverla o desactivarla'; end if;
  update public.retail_registers set name=coalesce(trim(p_name),name),branch_id=coalesce(p_branch,branch_id),active=coalesce(p_active,active) where id=p_id returning id into target;
 end if;
 return target;
end $$;
revoke all on function public.retail_management_locations(uuid),public.retail_write_branch(uuid,text,text,uuid),public.retail_write_register(uuid,text,uuid,uuid,boolean) from public,anon;
grant execute on function public.retail_management_locations(uuid),public.retail_write_branch(uuid,text,text,uuid),public.retail_write_register(uuid,text,uuid,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
