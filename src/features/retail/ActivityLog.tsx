import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Download, Loader2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, type Branch } from './api';
import './activity-log.css';

interface ActivityItem { at: string; kind: string; actor: string | null; actor_email: string | null; branch_id: string | null; title: string; detail: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null }
interface ActivityPage { items: ActivityItem[]; next_before: string | null; people: { id: string; email: string }[] }

const kinds: Record<string, string> = {
  precios: 'Precios', productos: 'Productos', stock: 'Stock', plata: 'Plata', caja: 'Cajas', anulaciones: 'Anulaciones',
  ventas: 'Ventas', permisos: 'Permisos', configuracion: 'Configuración', borrados: 'Borrados',
};
const labels: Record<string, string> = {
  price: 'Precio', cost: 'Costo', sale_markup: '% sobre costo', stock: 'Stock', name: 'Nombre', code: 'Código', min_stock: 'Aviso de stock',
  category_id: 'Categoría', pack_size: 'Bulto', supplier: 'Proveedor', adjustment: 'Ajuste %', active: 'Activo', role: 'Rol', permissions: 'Permisos',
  profile_id: 'Perfil', branch_id: 'Sucursal', register_id: 'Caja', email: 'Email', esperado: 'Esperado', contado: 'Contado', diferencia: 'Diferencia',
  apertura: 'Apertura', importe: 'Importe', devuelto: 'Devuelto', total_venta: 'Total de la venta', registro: 'Registro', cantidad: 'Cantidad',
  deposito: 'En depósito', desde: 'Desde', hacia: 'Hacia', medio: 'Medio', categoria: 'Categoría', productos_ajustados: 'Productos ajustados',
  receipt_message: 'Mensaje del ticket', low_margin_threshold: 'Bajo margen %', address: 'Dirección', phone: 'Teléfono', is_default: 'Principal',
  payment_methods: 'Medios', base_role: 'Rol base', billing_enabled: 'Facturación', branch_inventory_enabled: 'Stock por sucursal', depot_enabled: 'Depósito',
};
const moneyKeys = new Set(['price', 'cost', 'esperado', 'contado', 'diferencia', 'apertura', 'importe', 'devuelto', 'total_venta', 'costo']);
const roles: Record<string, string> = { owner: 'Dueño', admin: 'Administrador', supervisor: 'Supervisor', cashier: 'Cajero' };
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const zone = 'America/Argentina/Buenos_Aires';
const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const minus = (date: string, days: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - days); return day(value); };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Quién hizo qué: precios, stock, plata, cajas, anulaciones, permisos, configuración y borrados en un solo lugar.
 * Solo lectura: nadie puede editar ni borrar lo registrado.
 */
export function ActivityLog({ storeId, branches, active }: { storeId: string; branches: Branch[]; active: boolean }) {
  const today = day(new Date());
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [custom, setCustom] = useState({ from: minus(today, 29), to: today });
  const [kind, setKind] = useState('');
  const [actor, setActor] = useState('');
  const [branch, setBranch] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [people, setPeople] = useState<ActivityPage['people']>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const period = preset === 'today' ? { from: today, to: today } : preset === 'week' ? { from: minus(today, 6), to: today } : preset === 'month' ? { from: minus(today, 29), to: today } : custom;
  const branchName = (id: string | null) => id ? branches.find(row => row.id === id)?.name || 'Sucursal anterior' : '';

  const load = useCallback(async (before: string | null = null) => {
    if (period.to < period.from) { setError('Revisá las fechas: «Hasta» no puede ser anterior a «Desde».'); return; }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('retail_activity', { p_store: storeId, p_from: period.from, p_to: period.to, p_kind: kind || null,
        p_actor: actor || null, p_branch: branch || null, p_query: search || null, p_before: before, p_limit: 100 });
      if (rpcError) throw rpcError;
      const page = data as ActivityPage;
      setItems(previous => before ? [...previous, ...page.items] : page.items); setNext(page.next_before); setPeople(page.people); setError('');
    } catch (e) { setError(/retail_activity|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611020009 en Supabase.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [storeId, period.from, period.to, kind, actor, branch, search]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const show = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number' || (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value))) {
      return moneyKeys.has(key) ? money(Number(value)) : Number(value).toLocaleString('es-AR');
    }
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Ninguno';
    if (typeof value === 'string' && key === 'role') return roles[value] || value;
    if (typeof value === 'string' && uuid.test(value)) return branchName(value) || 'cambiado';
    if (typeof value === 'string' && value === 'depot') return 'Depósito';
    return typeof value === 'object' ? 'cambiado' : String(value);
  };
  const changes = (item: ActivityItem) => [...new Set([...Object.keys(item.before || {}), ...Object.keys(item.after || {})])];
  const days = items.reduce<{ label: string; rows: ActivityItem[] }[]>((groups, item) => {
    const label = new Date(item.at).toLocaleDateString('es-AR', { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long' });
    const last = groups.at(-1);
    if (last?.label === label) last.rows.push(item); else groups.push({ label, rows: [item] });
    return groups;
  }, []);

  const time = (at: string) => new Date(at).toLocaleTimeString('es-AR', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
  const filtersOn = Boolean(kind || actor || branch || search);
  const clearFilters = () => { setKind(''); setActor(''); setBranch(''); setQuery(''); setSearch(''); };
  const columns = branches.length > 1 ? 6 : 5;
  const download = () => {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [['Fecha', 'Hora', 'Tipo', 'Qué pasó', 'Detalle', 'Cambios', 'Quién', 'Sucursal'].join(';'),
      ...items.map(item => [new Date(item.at).toLocaleDateString('es-AR', { timeZone: zone }), time(item.at), kinds[item.kind] || item.kind, item.title, item.detail || '',
        changes(item).map(key => `${labels[key] || key}: ${item.before && key in item.before ? show(key, item.before[key]) : ''}${item.before && key in item.before && item.after && key in item.after ? ' → ' : ''}${item.after && key in item.after ? show(key, item.after[key]) : ''}`).join(' | '),
        item.actor_email || 'Sistema', item.branch_id ? branchName(item.branch_id) : ''].map(value => quote(String(value))).join(';'))];
    // BOM para que Excel abra bien los acentos.
    const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `actividad_${period.from}_${period.to}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  return <section className="retail-panel activity-log" aria-labelledby="activity-title">
    <div className="section-heading"><div><h2 id="activity-title">Actividad</h2>
      <p>Quién hizo qué y cuándo. Es de solo lectura: nadie puede editar ni borrar lo registrado.</p></div>
      <div className="activity-actions">
        <button type="button" className="secondary-button" disabled={!items.length} onClick={download}><Download size={15} /> Descargar CSV</button>
        <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
      </div>
    </div>

    <div className="activity-toolbar">
      <div className="activity-segmented" role="group" aria-label="Período">
        {([['today', 'Hoy'], ['week', '7 días'], ['month', '30 días'], ['custom', 'Elegir fechas']] as const).map(([id, label]) =>
          <button key={id} type="button" className={preset === id ? 'is-active' : ''} aria-pressed={preset === id} onClick={() => setPreset(id)}>{label}</button>)}
      </div>
      {preset === 'custom' && <div className="activity-dates">
        <label>Desde<input type="date" value={custom.from} max={custom.to} onChange={event => setCustom(previous => ({ ...previous, from: event.target.value }))} /></label>
        <label>Hasta<input type="date" value={custom.to} min={custom.from} onChange={event => setCustom(previous => ({ ...previous, to: event.target.value }))} /></label>
      </div>}
    </div>
    <div className="activity-kinds" role="group" aria-label="Tipo de actividad">
      <button type="button" className={!kind ? 'is-active' : ''} aria-pressed={!kind} onClick={() => setKind('')}>Todo</button>
      {Object.entries(kinds).map(([id, label]) => <button key={id} type="button" className={`kind-${id} ${kind === id ? 'is-active' : ''}`} aria-pressed={kind === id} onClick={() => setKind(kind === id ? '' : id)}>{label}</button>)}
    </div>
    <form className="activity-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label>Quién<select value={actor} onChange={event => setActor(event.target.value)}><option value="">Todas las personas</option>{people.map(person => <option key={person.id} value={person.id}>{person.email}</option>)}</select></label>
      {branches.length > 1 && <label>Sucursal<select value={branch} onChange={event => setBranch(event.target.value)}><option value="">Todas</option>{branches.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      <label className="activity-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Producto, motivo, caja…" /><button className="secondary-button" disabled={loading}>Buscar</button></span></label>
      {filtersOn && <button type="button" className="text-button activity-clear" onClick={clearFilters}><X size={14} /> Limpiar filtros</button>}
    </form>

    {error && <p role="alert" className="error-banner">{error}</p>}
    {!error && items.length > 0 && <p className="activity-count" role="status">{items.length} {items.length === 1 ? 'movimiento' : 'movimientos'}{next ? ' (hay más antiguos)' : ''}</p>}
    {!loading && !items.length && !error && <p className="activity-empty">No hay actividad con estos filtros.</p>}
    {items.length > 0 && <div className="activity-table" role="region" aria-label="Actividad" tabIndex={0}>
      <table>
        <thead><tr>
          <th scope="col" className="col-time">Hora</th>
          <th scope="col" className="col-kind">Tipo</th>
          <th scope="col">Qué pasó</th>
          <th scope="col">Cambio</th>
          <th scope="col" className="col-who">Quién</th>
          {branches.length > 1 && <th scope="col">Sucursal</th>}
        </tr></thead>
        {days.map(group => <tbody key={group.label}>
          <tr className="activity-day-row"><th scope="colgroup" colSpan={columns}>{group.label}</th></tr>
          {group.rows.map((item, index) => <tr key={`${item.at}-${index}`}>
            <td className="col-time"><time dateTime={item.at}>{time(item.at)}</time></td>
            <td className="col-kind"><span className={`activity-kind kind-${item.kind}`}>{kinds[item.kind] || item.kind}</span></td>
            <td className="col-what"><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}</td>
            <td className="col-change">{changes(item).length ? <ul>{changes(item).map(key => <li key={key}>
              <span className="activity-field">{labels[key] || key}:</span>{' '}
              {item.before && key in item.before && <span className="activity-before">{show(key, item.before[key])}</span>}
              {item.before && key in item.before && item.after && key in item.after && <ArrowRight size={12} aria-label="pasó a" />}
              {item.after && key in item.after && <span className="activity-after">{show(key, item.after[key])}</span>}
            </li>)}</ul> : <span className="activity-muted">—</span>}</td>
            <td className="col-who" title={item.actor_email || 'Sistema'}>{item.actor_email || 'Sistema'}</td>
            {branches.length > 1 && <td>{item.branch_id ? branchName(item.branch_id) : '—'}</td>}
          </tr>)}
        </tbody>)}
      </table>
    </div>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Cargando…</p>}
    {next && !loading && <button type="button" className="secondary-button activity-more" onClick={() => void load(next)}>Ver más antiguos</button>}
    <small className="activity-note">Los cambios de precios, productos, permisos y configuración se conservan 24 meses. Las ventas, cajas, plata y stock quedan en su propio historial y no se borran. El CSV incluye lo que se ve en pantalla: con «Ver más antiguos» se suma al archivo.</small>
  </section>;
}
