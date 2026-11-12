import { useEffect, useRef } from 'react';
import { ArrowLeft, Download, Pencil } from 'lucide-react';
import { adLabels } from '../ads';
import { date, dateTime, Feedback, money, number, Stat, usePlatformData } from '../platformShared';
import { type CampaignDetail, placements, priceModels, today, state, estimate } from './platformAdsHelpers';

/** Resultados de una campaña. */
export function CampaignReport({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (detail: CampaignDetail) => void }) {
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
