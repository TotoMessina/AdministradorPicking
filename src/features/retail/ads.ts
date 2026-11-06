import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Publicidad administrada desde el panel de plataforma. Es secundaria: sin conexión, sin la actualización
// de la base o ante cualquier error, no se muestra nada y nada se traba.
export type AdPlacement = 'home_card' | 'catalog_featured' | 'supplier_offer';
export interface HomeAd { id: string; advertiser: string; title: string; body: string; cta_label: string | null; cta_url: string | null; whatsapp: string | null; image_path: string | null }
export interface FeaturedAd { id: string; advertiser: string; title: string; body: string; brand: string | null; image_path: string | null;
  items: { ean_code: string; label: 'destacado' | 'nuevo' | 'oferta' | null; note: string | null; name: string | null }[] }
export interface SupplierOffer { id: string; advertiser: string; ean_code: string; price: number | null; note: string | null; label: string | null;
  cta_label: string | null; cta_url: string | null; whatsapp: string | null }

export const AD_BUCKET = 'retail-ads';
export const adImageUrl = (path: string | null) => path ? supabase.storage.from(AD_BUCKET).getPublicUrl(path).data.publicUrl : '';
export const adLabels: Record<string, string> = { destacado: 'Destacado', nuevo: 'Nuevo lanzamiento', oferta: 'Oferta' };

/** Enlace de contacto: WhatsApp con un mensaje armado o el enlace de la campaña. */
export function adContact(ad: { whatsapp: string | null; cta_url: string | null }, message = '') {
  if (ad.whatsapp) return `https://wa.me/${ad.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  return ad.cta_url || '';
}

// Vistas y contactos se agrupan y se envían juntos; cada vista cuenta una vez por pantalla abierta.
let pending: { store: string; events: { campaign: string; kind: 'view' | 'click'; ean?: string }[] } | null = null;
let timer = 0;
function flush() {
  timer = 0;
  const batch = pending; pending = null;
  if (!batch?.events.length || navigator.onLine === false) return;
  void supabase.rpc('retail_ad_track', { p_store: batch.store, p_events: batch.events.slice(0, 50) }).then(() => undefined, () => undefined);
}
export function trackAd(store: string, campaign: string, kind: 'view' | 'click', ean?: string) {
  if (pending && pending.store !== store) flush();
  pending ||= { store, events: [] };
  pending.events.push({ campaign, kind, ...(ean ? { ean } : {}) });
  if (kind === 'click' || pending.events.length >= 50) flush();
  else if (!timer) timer = window.setTimeout(flush, 3000);
}

/** Publicidad de un lugar. `codes` solo para las ofertas en pedidos; la clave evita repetir la consulta. */
export function useAds<T>(store: string, placement: AdPlacement, enabled: boolean, codes?: string[]) {
  const [ads, setAds] = useState<T[]>([]);
  const key = codes ? [...new Set(codes)].sort().join(',') : '';
  const byCodes = codes !== undefined;
  useEffect(() => {
    let current = true;
    if (!enabled || navigator.onLine === false || (byCodes && !key)) { setAds([]); return; }
    void supabase.rpc('retail_ads', { p_store: store, p_placement: placement, p_codes: key ? key.split(',').slice(0, 500) : null })
      .then(({ data, error }) => { if (current) setAds(!error && Array.isArray(data) ? data as T[] : []); });
    return () => { current = false; };
  }, [store, placement, enabled, key, byCodes]);
  return ads;
}

/** Cuenta una vista por cada aviso nuevo que aparece en pantalla. */
export function useAdViews(store: string, ids: string[]) {
  const seen = useRef(new Set<string>());
  const key = ids.join(',');
  useEffect(() => {
    for (const id of key ? key.split(',') : []) {
      if (seen.current.has(id)) continue;
      seen.current.add(id);
      const [campaign, ean] = id.split('|');
      trackAd(store, campaign, 'view', ean);
    }
  }, [store, key]);
}
