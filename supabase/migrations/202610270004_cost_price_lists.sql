begin;

-- Lists may start again from product cost (Costo +X%) besides Principal and its
-- derived lists. Existing lists, prices, fixed prices and assignments are not
-- touched: only the guard from 202610270002 accepts the cost origin again.
-- A second catalog root stays blocked because Principal already is that price.
create or replace function retail_private.guard_primary_price_list() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.is_primary then raise exception 'La lista principal se conserva. Editá el margen de los productos'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and new.is_primary is distinct from old.is_primary then raise exception 'No se puede cambiar la identidad de la lista principal'; end if;
 if new.is_primary then
  if not new.active or new.deleted_at is not null or new.branch_id is not null or new.base_kind<>'catalog'
   or new.parent_id is not null or new.adjustment<>0 or new.pricing_rules<>'[]'::jsonb then
   raise exception 'La principal usa el costo y porcentaje de cada producto, está activa para todo el comercio y no puede eliminarse';
  end if;
 elsif new.deleted_at is null and not ((new.base_kind='list' and new.parent_id is not null)
  or (new.base_kind='cost' and new.parent_id is null)) then
  raise exception 'Elegí Costo, la lista principal o una de sus derivadas como origen';
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_primary_price_list() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
