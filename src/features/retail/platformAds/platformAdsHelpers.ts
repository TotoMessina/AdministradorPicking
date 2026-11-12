
// Tipos, textos y cálculos de las campañas publicitarias.
export type Placement = 'home_card' | 'catalog_featured' | 'supplier_offer';
export type PriceModel = 'fijo' | 'por_contacto' | 'por_mil_vistas';
export interface Advertiser { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; notes: string; active: boolean; campaigns: number }
export interface CampaignRow { id: string; advertiser: string; placement: Placement; title: string; starts_at: string; ends_at: string; paused: boolean;
  price_model: PriceModel; price: number; max_leads: number | null; items: number; views: number; stores: number; leads: number }
export interface CampaignDetail {
  id: string; advertiser_id: string; placement: Placement; title: string; body: string; cta_label: string | null; cta_url: string | null; whatsapp: string | null;
  brand: string | null; image_path: string | null; starts_at: string; ends_at: string; paused: boolean; plan_ids: string[] | null; store_ids: string[] | null;
  zones: string[] | null; daily_views_cap: number | null; max_leads: number | null; price_model: PriceModel; price: number;
  items: { ean_code: string; price: number | null; label: string | null; note: string | null; name: string | null }[];
  daily: { day: string; views: number; stores: number; clicks: number }[];
  leads: { created_at: string; store: string; ean_code: string }[];
  totals: { views: number; stores: number; leads: number };
}
export interface Draft {
  id: string | null; advertiser_id: string; placement: Placement; title: string; body: string; cta_label: string; cta_url: string; whatsapp: string; brand: string;
  image_path: string; starts: string; ends: string; paused: boolean; plan_ids: string[]; store_ids: string; zones: string; daily_views_cap: string; max_leads: string;
  price_model: PriceModel; price: string; items: string;
}

export const placements: Record<Placement, string> = { supplier_offer: 'Ofertas en pedidos', catalog_featured: 'Destacados del catálogo global', home_card: 'Tarjeta en Inicio' };
export const placementHelp: Record<Placement, string> = {
  supplier_offer: '«Este producto lo tiene X a $Y» en Proveedores → pedidos, para los productos que se están por acabar. El comercio contacta por WhatsApp o enlace: cada contacto cuenta.',
  catalog_featured: 'Tarjeta y etiqueta «Destacado» o «Nuevo lanzamiento» al dar de alta desde el catálogo global. Con una marca, ofrece ver sus productos.',
  home_card: 'Una tarjeta al final de Inicio, solo para dueños y administradores, marcada «Publicidad».',
};
export const priceModels: Record<PriceModel, string> = { fijo: 'Monto fijo', por_contacto: 'Por contacto', por_mil_vistas: 'Por cada mil vistas' };
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const today = () => new Date().toISOString().slice(0, 10);
export const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
export const dayStart = (value: string) => new Date(`${value}T00:00:00`).toISOString();
export const dayEnd = (value: string) => new Date(`${value}T23:59:59`).toISOString();
export const localDay = (value: string) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const state = (row: { paused: boolean; starts_at: string; ends_at: string }) => row.paused ? 'Pausada'
  : new Date(row.ends_at).getTime() < Date.now() ? 'Terminada' : new Date(row.starts_at).getTime() > Date.now() ? 'Programada' : 'Activa';
export const estimate = (row: { price_model: PriceModel; price: number }, views: number, leads: number) =>
  row.price_model === 'fijo' ? row.price : row.price_model === 'por_contacto' ? leads * row.price : Math.round(views / 1000 * row.price * 100) / 100;
// Líneas «código;precio;etiqueta;nota». Etiqueta: destacado, nuevo u oferta.
export const parseItems = (text: string) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
  const [code = '', price = '', label = '', ...note] = line.split(';').map(part => part.trim());
  return { line: index + 1, ean_code: code, price: price.replace(/\./g, '').replace(',', '.'), label: label.toLowerCase(), note: note.join(';') };
});
export const itemsText = (items: CampaignDetail['items']) => items.map(item => [item.ean_code, item.price ?? '', item.label ?? '', item.note ?? ''].join(';').replace(/;+$/, '')).join('\n');
