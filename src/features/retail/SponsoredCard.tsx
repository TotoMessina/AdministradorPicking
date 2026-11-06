import { ExternalLink } from 'lucide-react';
import { adContact, adImageUrl, trackAd, useAdViews, useAds, type HomeAd } from './ads';
import './ads.css';

/** Tarjeta patrocinada de Inicio. Solo dueños y administradores; la base decide si corresponde mostrarla. */
export function SponsoredCard({ storeId, enabled }: { storeId: string; enabled: boolean }) {
  const ads = useAds<HomeAd>(storeId, 'home_card', enabled);
  const ad = ads[0];
  useAdViews(storeId, ad ? [ad.id] : []);
  if (!ad) return null;
  const href = adContact(ad, `Hola, vi su anuncio «${ad.title}» en la app del kiosco.`);
  const image = adImageUrl(ad.image_path);
  return <aside className="sponsored-card" aria-label={`Publicidad de ${ad.advertiser}`}>
    {image && <img src={image} alt="" loading="lazy" decoding="async" />}
    <div>
      <small className="ad-tag">Publicidad · {ad.advertiser}</small>
      <strong>{ad.title}</strong>
      {ad.body && <p>{ad.body}</p>}
      {href && <a className="secondary-button" href={href} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackAd(storeId, ad.id, 'click')}>
        {ad.cta_label || (ad.whatsapp ? 'Escribir por WhatsApp' : 'Ver más')} <ExternalLink size={14} aria-hidden="true" /></a>}
    </div>
  </aside>;
}
