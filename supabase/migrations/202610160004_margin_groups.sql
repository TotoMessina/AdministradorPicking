begin;
alter table public.retail_products
 add column margin_group text default 'standard' check(margin_group in ('standard','low_margin'));
grant update(margin_group) on public.retail_products to authenticated;

-- A ticket may contain both groups. Capture the server's product data per line,
-- independently of its sales ledger, so later edits do not rewrite profitability.
create function retail_private.snapshot_margin_items() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_product public.retail_products; v_items jsonb:='[]'::jsonb;
begin
 for v_item in select value from jsonb_array_elements(new.items) loop
  if v_item->>'productId' is not null then
   select * into v_product from public.retail_products where id=(v_item->>'productId')::uuid and store_id=new.store_id;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   v_item:=v_item || jsonb_build_object('marginGroup',coalesce(v_product.margin_group,'standard'),'unitCost',nullif(v_product.cost,0));
  else
   v_item:=v_item || jsonb_build_object('marginGroup','standard','unitCost',null);
  end if;
  v_items:=v_items || jsonb_build_array(v_item);
 end loop;
 new.items:=v_items;
 return new;
end $$;
revoke all on function retail_private.snapshot_margin_items() from public,anon,authenticated;
create trigger retail_snapshot_margin_items before insert on public.retail_sales
 for each row execute function retail_private.snapshot_margin_items();
notify pgrst,'reload schema';
commit;
