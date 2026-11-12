import { useState } from 'react';
import { BarChart3, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { supabase } from '../../lib/supabase';
import type { Run } from './managementTypes';
import { date, Feedback, money, number, PurgeEnded, readError, removeAdImages, Stat, usePlatformData } from './platformShared';
import { type Advertiser, type CampaignRow, type CampaignDetail, type Draft, placements, today, inDays, localDay, state, estimate, itemsText } from './platformAds/platformAdsHelpers';
import { AdvertisersCard } from './platformAds/AdvertisersCard';
import { CampaignEditor } from './platformAds/CampaignEditor';
import { CampaignReport } from './platformAds/CampaignReport';

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
