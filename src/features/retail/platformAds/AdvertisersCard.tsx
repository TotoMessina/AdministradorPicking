import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Run } from '../managementTypes';
import { readError } from '../platformShared';
import type { Advertiser } from './platformAdsHelpers';

/** Anunciantes: lista y alta. */
export function AdvertisersCard({ advertisers, reload, run, busy }: { advertisers: Advertiser[]; reload: () => void; run: Run; busy: boolean }) {
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
