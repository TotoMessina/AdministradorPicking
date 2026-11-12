import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { NumberInput } from '../../../components/NumberInput';
import { supabase } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import type { Run } from '../managementTypes';
import { AD_BUCKET, adImageUrl } from '../ads';
import { readError } from '../platformShared';
import { type Placement, type PriceModel, type Advertiser, type Draft, placements, placementHelp, priceModels, uuid, dayStart, dayEnd, parseItems } from './platformAdsHelpers';

/** Alta y edición de una campaña. */
export function CampaignEditor({ initial, advertisers, plans, run, busy, onClose, onSaved }: {
  initial: Draft; advertisers: Advertiser[]; plans: { id: string; name: string }[]; run: Run; busy: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { requestAnimationFrame(() => title.current?.focus()); }, []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const withItems = draft.placement !== 'home_card';

  const upload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/jpeg' ? 'jpg' : '';
    if (!ext) { setError('La imagen tiene que ser JPG, PNG o WEBP.'); return; }
    if (file.size > 1024 * 1024) { setError('La imagen puede pesar hasta 1 MB. Achicala antes de subirla.'); return; }
    if (!draft.advertiser_id) { setError('Elegí el anunciante antes de subir la imagen.'); return; }
    setUploading(true); setError('');
    const path = `${draft.advertiser_id}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(AD_BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '86400' });
    setUploading(false);
    if (uploadError) { setError(/bucket|not found/i.test(uploadError.message) ? 'Falta aplicar la actualización 202611060007_advertising.sql en Supabase.' : uploadError.message); return; }
    set('image_path', path);
  };

  const save = async () => {
    const fail = (message: string, field?: string) => { setError(message); if (field) document.getElementById(field)?.focus(); };
    if (!draft.advertiser_id) return fail('Elegí el anunciante.', 'campaign-advertiser');
    if (!draft.title.trim()) return fail('Escribí el título.', 'campaign-title');
    if (!draft.ends || draft.ends < draft.starts) return fail('La fecha de fin tiene que ser igual o posterior a la de inicio.', 'campaign-ends');
    if (draft.whatsapp && !/^[0-9]{8,15}$/.test(draft.whatsapp)) return fail('El WhatsApp va solo con números y código de país (ej.: 5493415551234).', 'campaign-whatsapp');
    if (draft.cta_url && !/^(https:\/\/|tel:|mailto:)/.test(draft.cta_url)) return fail('El enlace tiene que empezar con https://, tel: o mailto:.', 'campaign-url');
    if (draft.placement === 'supplier_offer' && !draft.whatsapp && !draft.cta_url) return fail('Una oferta para pedidos necesita un WhatsApp o un enlace de contacto.', 'campaign-whatsapp');
    const stores = draft.store_ids.split(/[\s,]+/).map(id => id.trim()).filter(Boolean);
    if (stores.some(id => !uuid.test(id))) return fail('Revisá los ID de comercios: uno por línea, copiados desde su detalle.', 'campaign-stores');
    const items = withItems ? parseItems(draft.items) : [];
    if (withItems && !items.length) return fail('Agregá al menos un código de barras.', 'campaign-items');
    const bad = items.find(item => item.ean_code.length < 4 || item.ean_code.length > 20 || (item.price && !(Number(item.price) > 0))
      || (item.label && !['destacado', 'nuevo', 'oferta'].includes(item.label)) || item.note.length > 80);
    if (bad) return fail(`Revisá la línea ${bad.line} de productos: código de 4 a 20 caracteres; precio mayor a 0; etiqueta destacado, nuevo u oferta; nota hasta 80 caracteres.`, 'campaign-items');
    for (const [value, field, label] of [[draft.daily_views_cap, 'campaign-cap', 'El tope diario va de 1 a 1.000'], [draft.max_leads, 'campaign-max', 'El máximo de contactos va de 1 a 1.000.000']] as const) {
      if (value.trim() && !(Number(value) >= 1)) return fail(`${label}, o vacío para no limitar.`, field);
    }
    setError('');
    const values = {
      advertiser_id: draft.advertiser_id, placement: draft.placement, title: draft.title.trim(), body: draft.body.trim(), cta_label: draft.cta_label.trim(),
      cta_url: draft.cta_url.trim(), whatsapp: draft.whatsapp.trim(), brand: draft.placement === 'catalog_featured' ? draft.brand.trim() : '',
      image_path: draft.placement === 'supplier_offer' ? '' : draft.image_path, starts_at: dayStart(draft.starts), ends_at: dayEnd(draft.ends), paused: draft.paused,
      plan_ids: draft.plan_ids, store_ids: stores, zones: draft.zones.split(',').map(zone => zone.trim()).filter(Boolean),
      daily_views_cap: draft.placement === 'home_card' && draft.daily_views_cap.trim() ? Math.round(Number(draft.daily_views_cap)) : null,
      max_leads: draft.max_leads.trim() ? Math.round(Number(draft.max_leads)) : null, price_model: draft.price_model, price: Number(draft.price) || 0,
    };
    const ok = await run(async () => {
      const { error: rpcError } = await supabase.rpc('retail_admin_save_campaign', { p_id: draft.id, p_values: values,
        p_items: items.map(item => ({ ean_code: item.ean_code, price: item.price || null, label: item.label || null, note: item.note || null })) });
      if (rpcError) throw new Error(readError(rpcError));
    }, draft.id ? 'Campaña actualizada' : 'Campaña creada');
    if (ok) onSaved();
  };

  return <form className="platform-card platform-note" noValidate aria-labelledby="campaign-editor-title" onSubmit={event => { event.preventDefault(); void save(); }}>
    <h4 id="campaign-editor-title" ref={title} tabIndex={-1} className="platform-detail-title">{draft.id ? `Editar «${initial.title}»` : 'Nueva campaña'}</h4>
    <div className="platform-fields">
      <label className="platform-field">Anunciante<select id="campaign-advertiser" value={draft.advertiser_id} onChange={event => set('advertiser_id', event.target.value)}>
        <option value="">Elegí un anunciante</option>{advertisers.filter(item => item.active || item.id === draft.advertiser_id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="platform-field">Dónde se muestra<select value={draft.placement} onChange={event => set('placement', event.target.value as Placement)}>
        {Object.entries(placements).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <p className="platform-muted">{placementHelp[draft.placement]}</p>
    <div className="platform-fields">
      <label className="platform-field">Título<input id="campaign-title" value={draft.title} maxLength={80} autoComplete="off" onChange={event => set('title', event.target.value)}
        placeholder={draft.placement === 'supplier_offer' ? 'Ej.: Distribuidora Sur' : 'Ej.: Nuevo alfajor triple'} /></label>
      {draft.placement === 'catalog_featured' && <label className="platform-field">Marca para «Ver productos» (opcional)<input value={draft.brand} maxLength={80} autoComplete="off" onChange={event => set('brand', event.target.value)} placeholder="Igual que en el catálogo global" /></label>}
    </div>
    {draft.placement !== 'supplier_offer' && <label className="platform-field">Texto<textarea rows={2} maxLength={300} value={draft.body} onChange={event => set('body', event.target.value)} /></label>}
    <div className="platform-fields">
      <label className="platform-field">WhatsApp (con código de país)<input id="campaign-whatsapp" value={draft.whatsapp} maxLength={15} inputMode="numeric" autoComplete="off" onChange={event => set('whatsapp', event.target.value.replace(/\D/g, ''))} placeholder="5493415551234" /></label>
      <label className="platform-field">O enlace<input id="campaign-url" value={draft.cta_url} maxLength={500} autoComplete="off" spellCheck={false} onChange={event => set('cta_url', event.target.value)} placeholder="https://…" /></label>
      <label className="platform-field">Texto del botón (opcional)<input value={draft.cta_label} maxLength={30} autoComplete="off" onChange={event => set('cta_label', event.target.value)} placeholder={draft.placement === 'supplier_offer' ? 'Contactar' : 'Ver más'} /></label>
    </div>
    {draft.placement !== 'supplier_offer' && <div className="platform-ad-image">
      {draft.image_path ? <img src={adImageUrl(draft.image_path)} alt="Imagen de la campaña" /> : <span className="platform-muted">Sin imagen</span>}
      <button type="button" className="secondary-button" disabled={busy || uploading} onClick={() => fileInput.current?.click()}><ImageIcon size={15} /> {uploading ? 'Subiendo…' : draft.image_path ? 'Cambiar imagen' : 'Subir imagen'}</button>
      {draft.image_path && <button type="button" className="text-button" disabled={busy || uploading} onClick={() => set('image_path', '')}>Quitar</button>}
      <input ref={fileInput} type="file" hidden tabIndex={-1} accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])} />
      <small className="platform-muted">JPG, PNG o WEBP de hasta 1 MB; cuadrada se ve mejor.</small>
    </div>}
    {withItems && <label className="platform-field">Productos (uno por línea: código;precio;etiqueta;nota)
      <textarea id="campaign-items" rows={5} value={draft.items} spellCheck={false} onChange={event => set('items', event.target.value)}
        placeholder={draft.placement === 'supplier_offer' ? '7790580123456;1250;oferta;caja x 12\n7790580654321;980' : '7790580123456;;nuevo\n7790580654321;;destacado'} />
      <small className="platform-muted">{draft.placement === 'supplier_offer' ? 'El precio se muestra al comercio. Etiqueta: oferta, nuevo o destacado (opcional).' : 'El precio no se muestra en el catálogo. Etiqueta: nuevo o destacado.'} Se aparea por código de barras.</small></label>}
    <div className="platform-fields">
      <label className="platform-field">Desde<input type="date" value={draft.starts} onChange={event => set('starts', event.target.value)} /></label>
      <label className="platform-field">Hasta<input id="campaign-ends" type="date" value={draft.ends} min={draft.starts} onChange={event => set('ends', event.target.value)} /></label>
      {draft.placement === 'home_card' && <label className="platform-field">Veces por comercio y día (vacío = sin tope)<NumberInput id="campaign-cap" value={draft.daily_views_cap} onValueChange={value => set('daily_views_cap', value)} min={1} max={1000} step={1} inputMode="numeric" /></label>}
      <label className="platform-field">Terminar al llegar a (contactos)<NumberInput id="campaign-max" value={draft.max_leads} onValueChange={value => set('max_leads', value)} min={1} step={1} inputMode="numeric" placeholder="Sin máximo" /></label>
    </div>
    <fieldset className="platform-targeting">
      <legend>A quién se muestra (vacío = a todos)</legend>
      {plans.length > 0 && <div className="platform-check-list">{plans.map(plan => <label key={plan.id} className="platform-check"><input type="checkbox" checked={draft.plan_ids.includes(plan.id)}
        onChange={event => set('plan_ids', event.target.checked ? [...draft.plan_ids, plan.id] : draft.plan_ids.filter(id => id !== plan.id))} /><span>Plan {plan.name}</span></label>)}</div>}
      <div className="platform-fields">
        <label className="platform-field">Zona: palabras de la dirección, separadas por coma<input value={draft.zones} maxLength={300} autoComplete="off" onChange={event => set('zones', event.target.value)} placeholder="Rosario, Funes" /></label>
        <label className="platform-field">Solo estos comercios (ID, uno por línea)<textarea id="campaign-stores" rows={2} value={draft.store_ids} spellCheck={false} onChange={event => set('store_ids', event.target.value)} /></label>
      </div>
      <small className="platform-muted">Los comercios con un plan «sin publicidad» nunca la ven. La zona busca esas palabras en la dirección cargada por el comercio.</small>
    </fieldset>
    <div className="platform-fields">
      <label className="platform-field">Cómo se cobra<select value={draft.price_model} onChange={event => set('price_model', event.target.value as PriceModel)}>
        {Object.entries(priceModels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="platform-field">Precio acordado ($)<NumberInput value={draft.price} onValueChange={value => set('price', value)} min={0} step="0.01" /></label>
    </div>
    <label className="platform-check"><input type="checkbox" checked={draft.paused} onChange={event => set('paused', event.target.checked)} />
      <span><strong>Pausada</strong><small>Guardala sin mostrarla todavía.</small></span></label>
    <p className="platform-muted">Antes de publicar, revisá que el rubro esté permitido: la publicidad de tabaco está prohibida (Ley 26.687) y la de alcohol tiene restricciones (Ley 24.788).</p>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="platform-form-actions">
      <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancelar</button>
      <button type="submit" className="primary-button" disabled={busy || uploading}>Guardar campaña</button>
    </div>
  </form>;
}
