-- Eliminar campañas de publicidad y avisos de la plataforma, de a uno o todos los terminados.
-- Borra también lo asociado (por clave foránea en cascada): productos, vistas y contactos de la campaña;
-- lecturas y push del aviso. No se puede deshacer. Las imágenes que quedan sin uso se devuelven para que el
-- panel las borre del bucket retail-ads.
begin;

-- Imágenes de las campañas indicadas que ninguna otra campaña usa.
create function retail_private.orphan_ad_images(p_ids uuid[]) returns text[]
language sql stable security definer set search_path = '' as $$
 select coalesce(array_agg(distinct c.image_path), '{}'::text[]) from retail_private.ad_campaigns c
 where c.id = any(p_ids) and c.image_path is not null
  and not exists (select 1 from retail_private.ad_campaigns o where o.image_path = c.image_path and not (o.id = any(p_ids)));
$$;
revoke all on function retail_private.orphan_ad_images(uuid[]) from public, anon, authenticated;

create function public.retail_admin_delete_campaign(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare images text[];
begin
 perform retail_private.require_platform_admin();
 perform 1 from retail_private.ad_campaigns where id = p_id for update;
 if not found then raise exception 'La campaña ya no existe. Actualizá la lista'; end if;
 images := retail_private.orphan_ad_images(array[p_id]);
 delete from retail_private.ad_campaigns where id = p_id;
 return jsonb_build_object('deleted', 1, 'images', to_jsonb(images));
end;
$$;

create function public.retail_admin_delete_announcement(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 delete from retail_private.platform_announcements where id = p_id;
 if not found then raise exception 'El aviso ya no existe. Actualizá la lista'; end if;
end;
$$;

-- Limpieza: campañas terminadas hace al menos p_days días; avisos vencidos o cancelados hace al menos p_days días.
-- p_preview true solo cuenta, sin borrar.
create function public.retail_admin_purge_ended(p_kind text, p_days integer, p_preview boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cutoff timestamptz; ids uuid[]; images text[] := '{}';
begin
 perform retail_private.require_platform_admin();
 if p_days is null or p_days not between 0 and 3650 then raise exception 'Indicá desde hace cuántos días (0 a 3.650)'; end if;
 cutoff := now() - make_interval(days => p_days);
 if p_kind = 'campaigns' then
  select coalesce(array_agg(id), '{}') into ids from retail_private.ad_campaigns where ends_at < cutoff;
  if not coalesce(p_preview, true) and cardinality(ids) > 0 then
   images := retail_private.orphan_ad_images(ids);
   delete from retail_private.ad_campaigns where id = any(ids);
  end if;
 elsif p_kind = 'announcements' then
  select coalesce(array_agg(id), '{}') into ids from retail_private.platform_announcements where coalesce(canceled_at, ends_at) < cutoff;
  if not coalesce(p_preview, true) and cardinality(ids) > 0 then
   delete from retail_private.platform_announcements where id = any(ids);
  end if;
 else
  raise exception 'Elegí qué limpiar';
 end if;
 return jsonb_build_object('count', cardinality(ids), 'deleted', case when coalesce(p_preview, true) then 0 else cardinality(ids) end, 'images', to_jsonb(images));
end;
$$;

revoke all on function public.retail_admin_delete_campaign(uuid), public.retail_admin_delete_announcement(uuid),
 public.retail_admin_purge_ended(text, integer, boolean) from public, anon;
grant execute on function public.retail_admin_delete_campaign(uuid), public.retail_admin_delete_announcement(uuid),
 public.retail_admin_purge_ended(text, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
