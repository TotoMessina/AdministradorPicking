import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
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

  return <section className="retail-panel activity-log" aria-labelledby="activity-title">
    <div className="section-heading"><div><h2 id="activity-title">Actividad</h2>
      <p>Quién hizo qué y cuándo. Es de solo lectura: nadie puede editar ni borrar lo registrado.</p></div>
      <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
    </div>
    <form className="activity-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label>Período<select value={preset} onChange={event => setPreset(event.target.value as typeof preset)}>
        <option value="today">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option><option value="custom">Elegir fechas</option>
      </select></label>
      {preset === 'custom' && <>
        <label>Desde<input type="date" value={custom.from} max={custom.to} onChange={event => setCustom(previous => ({ ...previous, from: event.target.value }))} /></label>
        <label>Hasta<input type="date" value={custom.to} min={custom.from} onChange={event => setCustom(previous => ({ ...previous, to: event.target.value }))} /></label>
      </>}
      <label>Qué<select value={kind} onChange={event => setKind(event.target.value)}><option value="">Todo</option>{Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Quién<select value={actor} onChange={event => setActor(event.target.value)}><option value="">Todas las personas</option>{people.map(person => <option key={person.id} value={person.id}>{person.email}</option>)}</select></label>
      {branches.length > 1 && <label>Sucursal<select value={branch} onChange={event => setBranch(event.target.value)}><option value="">Todas</option>{branches.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      <label className="activity-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Producto, motivo, caja…" /><button className="secondary-button" disabled={loading}>Buscar</button></span></label>
    </form>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {!loading && !items.length && !error && <p className="activity-empty">No hay actividad con estos filtros.</p>}
    {days.map(group => <div key={group.label} className="activity-day">
      <h3>{group.label}</h3>
      <ol className="activity-list">{group.rows.map((item, index) => <li key={`${item.at}-${index}`}>
        <div className="activity-row-head">
          <time dateTime={item.at}>{new Date(item.at).toLocaleTimeString('es-AR', { timeZone: zone, hour: '2-digit', minute: '2-digit' })}</time>
          <span className={`activity-kind kind-${item.kind}`}>{kinds[item.kind] || item.kind}</span>
          <strong>{item.title}</strong>
        </div>
        <small>{item.actor_email || 'Sistema'}{item.branch_id ? ` · ${branchName(item.branch_id)}` : ''}</small>
        {item.detail && <p className="activity-detail">{item.detail}</p>}
        {changes(item).length > 0 && <dl className="activity-changes">{changes(item).map(key => <div key={key}>
          <dt>{labels[key] || key}</dt>
          <dd>{item.before && key in item.before && <span className="activity-before">{show(key, item.before[key])}</span>}
            {item.before && key in item.before && item.after && key in item.after && <ArrowRight size={12} aria-label="pasó a" />}
            {item.after && key in item.after && <span className="activity-after">{show(key, item.after[key])}</span>}</dd>
        </div>)}</dl>}
      </li>)}</ol>
    </div>)}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Cargando…</p>}
    {next && !loading && <button type="button" className="secondary-button" onClick={() => void load(next)}>Ver más antiguos</button>}
    <small className="activity-note">Los cambios de precios, productos, permisos y configuración se conservan 24 meses. Las ventas, cajas, plata y stock quedan en su propio historial y no se borran.</small>
  </section>;
}
