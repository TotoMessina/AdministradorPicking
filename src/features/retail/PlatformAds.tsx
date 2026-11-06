import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, Download, Image as ImageIcon, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { NumberInput } from '../../components/NumberInput';
import { supabase } from '../../lib/supabase';
import { randomUUID } from '../../utils/uuid';
import type { Run } from './managementTypes';
import { AD_BUCKET, adImageUrl, adLabels } from './ads';
import { date, dateTime, Feedback, money, number, PurgeEnded, readError, removeAdImages, Stat, usePlatformData } from './platformShared';

type Placement = 'home_card' | 'catalog_featured' | 'supplier_offer';
type PriceModel = 'fijo' | 'por_contacto' | 'por_mil_vistas';
interface Advertiser { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; notes: string; active: boolean; campaigns: number }
interface CampaignRow { id: string; advertiser: string; placement: Placement; title: string; starts_at: string; ends_at: string; paused: boolean;
  price_model: PriceModel; price: number; max_leads: number | null; items: number; views: number; stores: number; leads: number }
interface CampaignDetail {
  id: string; advertiser_id: string; placement: Placement; title: string; body: string; cta_label: string | null; cta_url: string | null; whatsapp: string | null;
  brand: string | null; image_path: string | null; starts_at: string; ends_at: string; paused: boolean; plan_ids: string[] | null; store_ids: string[] | null;
  zones: string[] | null; daily_views_cap: number | null; max_leads: number | null; price_model: PriceModel; price: number;
  items: { ean_code: string; price: number | null; label: string | null; note: string | null; name: string | null }[];
  daily: { day: string; views: number; stores: number; clicks: number }[];
  leads: { created_at: string; store: string; ean_code: string }[];
  totals: { views: number; stores: number; leads: number };
}
interface Draft {
  id: string | null; advertiser_id: string; placement: Placement; title: string; body: string; cta_label: string; cta_url: string; whatsapp: string; brand: string;
  image_path: string; starts: string; ends: string; paused: boolean; plan_ids: string[]; store_ids: string; zones: string; daily_views_cap: string; max_leads: string;
  price_model: PriceModel; price: string; items: string;
}

export const placements: Record<Placement, string> = { supplier_offer: 'Ofertas en pedidos', catalog_featured: 'Destacados del catálogo global', home_card: 'Tarjeta en Inicio' };
const placementHelp: Record<Placement, string> = {
  supplier_offer: '«Este producto lo tiene X a $Y» en Proveedores → pedidos, para los productos que se están por acabar. El comercio contacta por WhatsApp o enlace: cada contacto cuenta.',
  catalog_featured: 'Tarjeta y etiqueta «Destacado» o «Nuevo lanzamiento» al dar de alta desde el catálogo global. Con una marca, ofrece ver sus productos.',
  home_card: 'Una tarjeta al final de Inicio, solo para dueños y administradores, marcada «Publicidad».',
};
const priceModels: Record<PriceModel, string> = { fijo: 'Monto fijo', por_contacto: 'Por contacto', por_mil_vistas: 'Por cada mil vistas' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const dayStart = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const dayEnd = (value: string) => new Date(`${value}T23:59:59`).toISOString();
const localDay = (value: string) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const state = (row: { paused: boolean; starts_at: string; ends_at: string }) => row.paused ? 'Pausada'
  : new Date(row.ends_at).getTime() < Date.now() ? 'Terminada' : new Date(row.starts_at).getTime() > Date.now() ? 'Programada' : 'Activa';
const estimate = (row: { price_model: PriceModel; price: number }, views: number, leads: number) =>
  row.price_model === 'fijo' ? row.price : row.price_model === 'por_contacto' ? leads * row.price : Math.round(views / 1000 * row.price * 100) / 100;
// Líneas «código;precio;etiqueta;nota». Etiqueta: destacado, nuevo u oferta.
const parseItems = (text: string) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
  const [code = '', price = '', label = '', ...note] = line.split(';').map(part => part.trim());
  return { line: index + 1, ean_code: code, price: price.replace(/\./g, '').replace(',', '.'), label: label.toLowerCase(), note: note.join(';') };
});
const itemsText = (items: CampaignDetail['items']) => items.map(item => [item.ean_code, item.price ?? '', item.label ?? '', item.note ?? ''].join(';').replace(/;+$/, '')).join('\n');

function AdvertisersCard({ advertisers, reload, run, busy }: { advertisers: Advertiser[]; reload: () => void; run: Run; busy: boolean }) {
  const empty = { id: null as string | null, name: '', contact_name: '', phone: '', email: '', notes: '', active: true };
  const [draft, setDraft] = useState<typeof empty | null>(null);
  const [error, setError] = useState('');
  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setError('Escribí el nombre del anunciante.'); document.getElementById('advertiser-name')?.focus(); return; }
    setError('');
    const ok = await run(async () => {
      const { error: rpcError } = await supabase.rpc('retail_admin_save_advertiser', { p_id: draft.id, p_name: draft.name.trim(), p_contact: draft.contact_name,
        p_phone: draft.phone, p_email: draft.email, p_notes: draft.notes, p_active: draft.active });
      if (rpcError) throw new Error(readError(rpcError));
    }, draft.id ? 'Anunciante actualizado' : 'Anunciante creado');
    if (ok) { setDraft(null); reload(); }
  };
  const set = (key: keyof typeof empty, value: string | boolean) => setDraft(previous => previous && { ...previous, [key]: value });
  return <section className="platform-card" aria-labelledby="advertisers-title">
    <div className="platform-toolbar"><h4 id="advertisers-title">Anunciantes</h4>
      <button type="button" className="secondary-button" disabled={busy || Boolean(draft)} onClick={() => setDraft(empty)}><Plus size={15} /> Nuevo anunciante</button></div>
    {draft && <form className="platform-note" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="platform-fields">
        <label className="platform-field">Nombre<input id="advertiser-name" value={draft.name} maxLength={80} autoComplete="off" onChange={event => set('name', event.target.value)} /></label>
        <label className="platform-field">Contacto<input value={draft.contact_name} maxLength={80} autoComplete="off" onChange={event => set('contact_name', event.target.value)} /></label>
        <label className="platform-field">Teléfono<input value={draft.phone} maxLength={40} autoComplete="off" inputMode="tel" onChange={event => set('phone', event.target.value)} /></label>
        <label className="platform-field">Correo<input value={draft.email} maxLength={120} autoComplete="off" type="email" onChange={event => set('email', event.target.value)} /></label>
      </div>
      <label className="platform-field">Notas internas<textarea rows={2} maxLength={1000} value={draft.notes} onChange={event => set('notes', event.target.value)} placeholder="Acuerdo, forma de pago, contacto de facturación…" /></label>
      <label className="platform-check"><input type="checkbox" checked={draft.active} onChange={event => set('active', event.target.checked)} />
        <span><strong>Activo</strong><small>Sin marcar, ninguna de sus campañas se muestra.</small></span></label>
      {error && <p role="alert" className="error-banner">{error}</p>}
      <div className="platform-form-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={busy}>Guardar anunciante</button></div>
    </form>}
    {!advertisers.length && !draft && <p className="platform-muted">Todavía no hay anunciantes. Creá uno para cargar su primera campaña.</p>}
    {advertisers.length > 0 && <ul className="platform-plain-list">{advertisers.map(item => <li key={item.id}>
      <strong>{item.name}</strong><small> · {item.campaigns} {item.campaigns === 1 ? 'campaña' : 'campañas'}{item.active ? '' : ' · inactivo'}{item.contact_name ? ` · ${item.contact_name}` : ''}{item.phone ? ` · ${item.phone}` : ''}{item.email ? ` · ${item.email}` : ''}</small>
      {' '}<button type="button" className="text-button" disabled={busy || Boolean(draft)} aria-label={`Editar ${item.name}`} onClick={() => setDraft({ id: item.id, name: item.name,
        contact_name: item.contact_name || '', phone: item.phone || '', email: item.email || '', notes: item.notes, active: item.active })}><Pencil size={14} /> Editar</button>
    </li>)}</ul>}
  </section>;
}

function CampaignEditor({ initial, advertisers, plans, run, busy, onClose, onSaved }: {
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

function CampaignReport({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (detail: CampaignDetail) => void }) {
  const report = usePlatformData<CampaignDetail>('retail_admin_campaign', { p_id: id }, true);
  const r = report.data;
  const title = useRef<HTMLHeadingElement>(null);
  const loaded = r?.id;
  useEffect(() => { if (loaded) requestAnimationFrame(() => title.current?.focus()); }, [loaded]);
  const exportLeads = () => {
    if (!r) return;
    const rows = [['Fecha', 'Comercio', 'Código'], ...r.leads.map(lead => [dateTime(lead.created_at), lead.store, lead.ean_code])];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `contactos_${r.title.replace(/[^\w-]+/g, '_').slice(0, 40)}_${today()}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="platform-stack">
    <div className="platform-toolbar"><button type="button" className="secondary-button" onClick={onBack}><ArrowLeft size={15} /> Volver a campañas</button>
      {r && <button type="button" className="secondary-button" onClick={() => onEdit(r)}><Pencil size={15} /> Editar</button>}</div>
    <Feedback loading={report.loading && !r} error={report.error} />
    {r && <>
      <div><h4 ref={title} tabIndex={-1} className="platform-detail-title">{r.title}</h4>
        <p className="platform-muted">{placements[r.placement]} · {date(r.starts_at)} a {date(r.ends_at)} · {state(r)} · {priceModels[r.price_model]} {money(r.price)}</p></div>
      <div className="platform-stats">
        <Stat label="Vistas" value={number(r.totals.views)} />
        <Stat label="Comercios alcanzados" value={number(r.totals.stores)} />
        <Stat label="Contactos" value={number(r.totals.leads)} detail={r.totals.views ? `${(r.totals.leads / r.totals.views * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}% de las vistas` : undefined} />
        <Stat label="A facturar (estimado)" value={money(estimate(r, r.totals.views, r.totals.leads))} detail={r.price_model === 'fijo' ? 'monto fijo acordado' : 'según lo medido'} />
      </div>
      <section className="platform-card"><h4>Por día (últimos 90)</h4>
        {r.daily.length ? <div className="platform-table-wrap"><table className="platform-table">
          <thead><tr><th scope="col">Día</th><th scope="col">Vistas</th><th scope="col">Comercios</th><th scope="col">Contactos</th></tr></thead>
          <tbody>{[...r.daily].reverse().map(day => <tr key={day.day}><th scope="row">{date(`${day.day}T12:00:00`)}</th><td>{number(day.views)}</td><td>{number(day.stores)}</td><td>{number(day.clicks)}</td></tr>)}</tbody>
        </table></div> : <p className="platform-muted">Todavía no se mostró.</p>}
      </section>
      <section className="platform-card">
        <div className="platform-toolbar"><h4>Contactos ({number(r.leads.length)}{r.leads.length >= 500 ? ', se muestran los últimos 500' : ''})</h4>
          {r.leads.length > 0 && <button type="button" className="secondary-button" onClick={exportLeads}><Download size={15} /> Descargar CSV</button>}</div>
        <p className="platform-muted">Un contacto es un toque en el botón de la publicidad, uno por comercio, producto y día. Compartí con el anunciante solo lo acordado.</p>
        {r.leads.length ? <ul className="platform-plain-list">{r.leads.slice(0, 50).map((lead, index) => <li key={`${lead.created_at}-${index}`}>
          <strong>{lead.store}</strong><small> · {dateTime(lead.created_at)}{lead.ean_code ? ` · ${lead.ean_code}` : ''}</small></li>)}</ul> : <p className="platform-muted">Sin contactos todavía.</p>}
      </section>
      {r.items.length > 0 && <section className="platform-card"><h4>Productos ({r.items.length})</h4>
        <ul className="platform-plain-list">{r.items.map(item => <li key={item.ean_code}><strong>{item.name || 'Sin datos en el catálogo global'}</strong>
          <small> · {item.ean_code}{item.price ? ` · ${money(item.price)}` : ''}{item.label ? ` · ${adLabels[item.label] || item.label}` : ''}{item.note ? ` · ${item.note}` : ''}</small></li>)}</ul></section>}
    </>}
  </div>;
}

/** Pestaña Publicidad: anunciantes, campañas en los tres lugares de la app e informe para facturar. */
export function PlatformAds({ active, run, busy }: { active: boolean; run: Run; busy: boolean }) {
  const campaigns = usePlatformData<CampaignRow[]>('retail_admin_campaigns', {}, active);
  const advertisers = usePlatformData<Advertiser[]>('retail_admin_advertisers', {}, active);
  const plans = usePlatformData<{ id: string; name: string; active: boolean; ads_free?: boolean }[]>('retail_admin_plans', {}, active);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const reload = () => { void campaigns.reload(); void advertisers.reload(); };
  const blank = (): Draft => ({ id: null, advertiser_id: '', placement: 'supplier_offer', title: '', body: '', cta_label: '', cta_url: '', whatsapp: '', brand: '', image_path: '',
    starts: today(), ends: inDays(30), paused: false, plan_ids: [], store_ids: '', zones: '', daily_views_cap: '', max_leads: '', price_model: 'fijo', price: '', items: '' });
  const fromDetail = (d: CampaignDetail): Draft => ({ id: d.id, advertiser_id: d.advertiser_id, placement: d.placement, title: d.title, body: d.body, cta_label: d.cta_label || '',
    cta_url: d.cta_url || '', whatsapp: d.whatsapp || '', brand: d.brand || '', image_path: d.image_path || '', starts: localDay(d.starts_at), ends: localDay(d.ends_at),
    paused: d.paused, plan_ids: d.plan_ids || [], store_ids: (d.store_ids || []).join('\n'), zones: (d.zones || []).join(', '),
    daily_views_cap: d.daily_views_cap ? String(d.daily_views_cap) : '', max_leads: d.max_leads ? String(d.max_leads) : '', price_model: d.price_model,
    price: String(d.price ?? ''), items: itemsText(d.items) });
  const remove = async (row: CampaignRow) => {
    if (!await askConfirm(`¿Eliminar la campaña «${row.title}»? Se borran también sus ${number(row.views)} vistas y ${number(row.leads)} contactos. No se puede deshacer: si tenés que facturarla, descargá antes el informe.`)) return;
    const ok = await run(async () => {
      const { data, error } = await supabase.rpc('retail_admin_delete_campaign', { p_id: row.id });
      if (error) throw new Error(readError(error));
      await removeAdImages((data as { images?: unknown })?.images);
    }, 'Campaña eliminada');
    if (ok) void campaigns.reload();
  };
  const togglePause = async (row: CampaignRow) => {
    if (!row.paused && !await askConfirm(`¿Pausar «${row.title}»? Deja de mostrarse hasta que la reanudes.`)) return;
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_set_campaign_paused', { p_id: row.id, p_paused: !row.paused });
      if (error) throw new Error(readError(error));
    }, row.paused ? 'Campaña reanudada' : 'Campaña pausada');
    if (ok) void campaigns.reload();
  };

  if (editing) return <CampaignEditor key={editing.id || 'new'} initial={editing} advertisers={advertisers.data || []} plans={(plans.data || []).filter(plan => plan.active && !plan.ads_free)}
    run={run} busy={busy} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />;
  if (report) return <CampaignReport id={report} onBack={() => { setReport(null); void campaigns.reload(); }} onEdit={detail => { setReport(null); setEditing(fromDetail(detail)); }} />;

  const rows = campaigns.data || [];
  const live = rows.filter(row => state(row) === 'Activa');
  return <div className="platform-stack">
    <div className="platform-toolbar">
      <p className="platform-muted">Nunca aparece en Vender ni en la caja. Al anunciante no se le da ningún dato de ventas de los comercios: solo vistas y contactos.</p>
      <span className="platform-toolbar-actions">
        <button type="button" className="secondary-button" disabled={campaigns.loading} onClick={reload}><RefreshCw size={15} /> Actualizar</button>
        <button type="button" className="primary-button" disabled={busy || !(advertisers.data || []).some(item => item.active)} onClick={() => setEditing(blank())}><Plus size={15} /> Nueva campaña</button>
      </span>
    </div>
    <div className="platform-stats">
      <Stat label="Campañas activas" value={number(live.length)} detail={`${number(rows.length)} en total`} />
      <Stat label="Vistas (activas)" value={number(live.reduce((sum, row) => sum + row.views, 0))} />
      <Stat label="Contactos (activas)" value={number(live.reduce((sum, row) => sum + row.leads, 0))} />
      <Stat label="A facturar (activas, estimado)" value={money(live.reduce((sum, row) => sum + estimate(row, row.views, row.leads), 0))} />
    </div>
    <Feedback loading={campaigns.loading && !campaigns.data} error={campaigns.error || advertisers.error} />
    {campaigns.data && !rows.length && <p className="platform-muted">Todavía no hay campañas.</p>}
    {rows.length > 0 && <div className="platform-table-wrap"><table className="platform-table">
      <thead><tr><th scope="col">Campaña</th><th scope="col">Dónde</th><th scope="col">Vigencia</th><th scope="col">Vistas · comercios</th><th scope="col">Contactos</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <th scope="row"><strong>{row.title}</strong><small>{row.advertiser}{row.items ? ` · ${row.items} productos` : ''}</small></th>
        <td>{placements[row.placement]}</td>
        <td>{date(row.starts_at)} a {date(row.ends_at)}</td>
        <td>{number(row.views)} · {number(row.stores)}</td>
        <td>{number(row.leads)}{row.max_leads ? <small>de {number(row.max_leads)}</small> : null}</td>
        <td>{state(row)}</td>
        <td className="platform-row-actions">
          <button type="button" className="secondary-button" aria-label={`Informe de ${row.title}`} onClick={() => setReport(row.id)}><BarChart3 size={15} /> Informe</button>
          {state(row) !== 'Terminada' && <button type="button" className="text-button" disabled={busy} aria-label={`${row.paused ? 'Reanudar' : 'Pausar'} ${row.title}`} onClick={() => void togglePause(row)}>
            {row.paused ? <><Play size={14} /> Reanudar</> : <><Pause size={14} /> Pausar</>}</button>}
          <button type="button" className="text-button danger-text" disabled={busy} aria-label={`Eliminar ${row.title}`} onClick={() => void remove(row)}><Trash2 size={14} /> Eliminar</button>
        </td>
      </tr>)}</tbody>
    </table></div>}
    <AdvertisersCard advertisers={advertisers.data || []} reload={reload} run={run} busy={busy} />
    <PurgeEnded kind="campaigns" run={run} busy={busy} onDone={reload} />
  </div>;
}
