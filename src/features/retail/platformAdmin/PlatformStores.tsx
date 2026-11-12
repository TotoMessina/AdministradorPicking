import { useRef, useState } from 'react';
import { Ban, RefreshCw } from 'lucide-react';
import { date, Feedback, money, number, usePlatformData } from '../platformShared';
import { subscriptionStatus } from '../PlatformBilling';
import type { Run } from '../managementTypes';
import { type Status, type StoreRow, statuses } from './platformTypes';
import { StoreDetailView } from './PlatformStoreDetail';

// Lista de comercios.
export function Stores({ days, active, run, busy, selected, setSelected }: { days: number; active: boolean; run: Run; busy: boolean; selected: string | null; setSelected: (id: string | null) => void }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'suspended' | Status>('all');
  const trigger = useRef<HTMLButtonElement | null>(null);
  const list = usePlatformData<StoreRow[]>('retail_admin_stores', { p_search: search || null, p_days: days }, active);
  const rows = (list.data || []).filter(row => statusFilter === 'all' || (statusFilter === 'suspended' ? Boolean(row.suspended_at) : row.status === statusFilter));
  const back = () => { setSelected(null); requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus(); }); };
  if (selected) return <StoreDetailView storeId={selected} days={days} run={run} busy={busy} onBack={back} onSaved={() => void list.reload()} />;
  return <div className="platform-stack">
    <form className="platform-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label className="platform-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, correo del dueño o ID" />
        <button className="secondary-button" disabled={list.loading}>Buscar</button></span></label>
      <label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}>
        <option value="all">Todos</option><option value="suspended">Suspendidos</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className="secondary-button" disabled={list.loading} onClick={() => void list.reload()}><RefreshCw size={15} /> Actualizar</button>
    </form>
    <Feedback loading={list.loading} error={list.error} />
    {list.data && <p className="platform-muted">{rows.length === 1 ? '1 comercio' : `${number(rows.length)} comercios`}{list.data.length >= 500 ? ' (se muestran los 500 más recientes; buscá para acotar)' : ''}.</p>}
    {list.data && !rows.length && <p className="platform-muted">No hay comercios con estos filtros.</p>}
    {rows.length > 0 && <div className="platform-table-wrap"><table className="platform-table">
      <thead><tr><th scope="col">Comercio</th><th scope="col">Abono y seguimiento</th><th scope="col">Personas · sucursales · productos</th><th scope="col">Ventas ({days} días)</th><th scope="col">Última venta</th><th scope="col">IA (tokens)</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <th scope="row"><strong>{row.name}</strong><small>{row.owner_email || 'Sin dueño'} · alta {date(row.created_at)}{row.billing_enabled ? ' · ARCA' : ''}</small></th>
        <td>{row.plan_name ? <small>{row.plan_name} · {subscriptionStatus[row.subscription_status || ''] || row.subscription_status}</small> : <small>Sin abono</small>}<span className={`platform-pill is-${row.status}`}>{statuses[row.status] || row.status}</span>{row.suspended_at && <span className="platform-pill is-suspended"><Ban size={11} aria-hidden="true" /> Suspendido</span>}</td>
        <td>{number(row.members)} · {number(row.branches)} · {number(row.products)}</td>
        <td>{number(row.sales_count)}<small>{money(row.sales_total)}</small></td>
        <td>{date(row.last_sale_at)}</td>
        <td>{number(row.ai_tokens)}<small>{number(row.ai_requests)} consultas</small></td>
        <td><button type="button" className="secondary-button" aria-label={`Ver detalle de ${row.name}`} onClick={event => { trigger.current = event.currentTarget; setSelected(row.id); }}>Ver detalle</button></td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}
