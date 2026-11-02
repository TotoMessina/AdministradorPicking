import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage } from './api';
import './branch-comparison.css';

interface BranchRow {
  branch_id: string; name: string; sales: number; returns: number; cost: number; tickets: number; uncosted_lines: number; uncosted_sales: number;
  top: { product_id: string; name: string; units: number }[];
  idle_count: number; idle: { product_id: string; name: string; stock: number; value: number }[];
}
interface Comparison { sales: number; tickets: number; uncosted_sales: number; branches: BranchRow[] }

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const units = (value: number) => Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 });
const zone = 'America/Argentina/Buenos_Aires';
const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const shift = (date: string, days: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return day(value); };
type Preset = 'today' | 'week' | 'month' | 'last_month' | 'custom';
function range(preset: Preset, custom: { from: string; to: string }) {
  const today = day(new Date());
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') return { from: shift(today, -6), to: today };
  if (preset === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (preset === 'last_month') { const first = `${today.slice(0, 7)}-01`; const end = shift(first, -1); return { from: `${end.slice(0, 7)}-01`, to: end }; }
  return custom;
}
// Con más de esta parte vendida sin costo, la ganancia no es confiable.
const UNRELIABLE_SHARE = 0.05;

/** Comparación de sucursales calculada en el servidor con el mismo cálculo de Ganancias. */
export function BranchComparison({ storeId, active }: { storeId: string; active: boolean }) {
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState(() => ({ from: shift(day(new Date()), -29), to: day(new Date()) }));
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const period = range(preset, custom);

  const load = useCallback(async () => {
    if (!period.from || !period.to || period.to < period.from) { setError('Revisá las fechas: «Hasta» no puede ser anterior a «Desde».'); return; }
    setLoading(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('retail_branch_comparison', { p_store: storeId, p_from: period.from, p_to: period.to });
      if (rpcError) throw rpcError;
      const value = result as Comparison;
      setData({ ...value, sales: Number(value.sales), tickets: Number(value.tickets), uncosted_sales: Number(value.uncosted_sales),
        branches: value.branches.map(row => ({ ...row, sales: Number(row.sales), returns: Number(row.returns), cost: Number(row.cost), tickets: Number(row.tickets), uncosted_sales: Number(row.uncosted_sales) })) });
      setError('');
    } catch (e) { setError(/retail_branch_comparison|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611020008 en Supabase.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [storeId, period.from, period.to]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const grossSales = data ? data.branches.reduce((sum, row) => sum + Math.max(0, row.sales), 0) : 0;
  const uncostedShare = data && data.sales > 0 ? data.uncosted_sales / data.sales : 0;

  return <section className="retail-panel branch-comparison" aria-labelledby="branch-comparison-title">
    <div className="section-heading"><div><h2 id="branch-comparison-title">Comparar sucursales</h2>
      <p>Ventas netas de devoluciones y ganancia bruta (ventas menos costo de lo vendido), con el mismo cálculo de Ganancias. Los gastos se ven en «Resultado del mes».</p></div>
      <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
    </div>
    <div className="branch-comparison-period">
      <label>Período<select value={preset} onChange={event => setPreset(event.target.value as Preset)}>
        <option value="today">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Este mes</option><option value="last_month">Mes anterior</option><option value="custom">Elegir fechas</option>
      </select></label>
      {preset === 'custom' && <>
        <label>Desde<input type="date" value={custom.from} max={custom.to} onChange={event => setCustom(previous => ({ ...previous, from: event.target.value }))} /></label>
        <label>Hasta<input type="date" value={custom.to} min={custom.from} onChange={event => setCustom(previous => ({ ...previous, to: event.target.value }))} /></label>
      </>}
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Calculando…</p>}
    {data && uncostedShare > 0 && <p className={`branch-comparison-warning ${uncostedShare >= UNRELIABLE_SHARE ? 'is-serious' : ''}`} role="status">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{uncostedShare >= UNRELIABLE_SHARE ? <strong>La ganancia no es confiable. </strong> : null}
        {money(data.uncosted_sales)} vendidos ({Math.round(uncostedShare * 1000) / 10}%) no tienen costo cargado, así que la ganancia aparece más alta que la real. Cargá el costo de esos productos.</span>
    </p>}
    {data && !data.branches.length && <p className="branch-comparison-empty">Todavía no hay sucursales.</p>}
    {data && data.branches.length > 0 && <div className="branch-comparison-grid">{data.branches.map(row => {
      const profit = row.sales - row.cost;
      const margin = row.sales > 0 ? profit / row.sales : 0;
      const share = grossSales > 0 ? Math.max(0, row.sales) / grossSales : 0;
      const branchUncosted = row.sales > 0 ? row.uncosted_sales / row.sales : 0;
      return <article key={row.branch_id} className="branch-comparison-card" aria-label={`Sucursal ${row.name}`}>
        <header><h3>{row.name}</h3>{branchUncosted >= UNRELIABLE_SHARE && <span className="branch-comparison-flag">Faltan costos</span>}</header>
        <div className="branch-comparison-sales"><small>Ventas</small><strong>{money(row.sales)}</strong>
          <span className="branch-comparison-bar" aria-hidden="true"><span style={{ width: `${Math.round(share * 100)}%` }} /></span>
          <small>{Math.round(share * 100)}% del total{row.returns > 0 ? ` · ${money(row.returns)} devueltos` : ''}</small></div>
        <dl className="branch-comparison-metrics">
          <div><dt>Ganancia bruta</dt><dd>{money(profit)}</dd><small>{row.sales > 0 ? `${Math.round(margin * 100)}% de margen` : '—'}</small></div>
          <div><dt>Tickets</dt><dd>{row.tickets.toLocaleString('es-AR')}</dd></div>
          <div><dt>Ticket promedio</dt><dd>{row.tickets ? money(row.sales / row.tickets) : '—'}</dd></div>
        </dl>
        {row.uncosted_lines > 0 && <small className="branch-comparison-note">{row.uncosted_lines} {row.uncosted_lines === 1 ? 'renglón vendido sin costo' : 'renglones vendidos sin costo'}.</small>}
        <h4>Más vendidos</h4>
        {row.top.length ? <ol className="branch-comparison-list">{row.top.map(item => <li key={item.product_id}><span>{item.name}</span><strong>{units(item.units)} u.</strong></li>)}</ol>
          : <p className="branch-comparison-empty">Sin ventas en el período.</p>}
        <details className="branch-comparison-idle"><summary>Sin rotación: {row.idle_count} {row.idle_count === 1 ? 'producto' : 'productos'}</summary>
          {row.idle.length ? <><ul className="branch-comparison-list">{row.idle.map(item => <li key={item.product_id}><span>{item.name}<small>{units(item.stock)} en stock</small></span><strong>{item.value ? money(item.value) : '—'}</strong></li>)}</ul>
            {row.idle_count > row.idle.length && <small className="branch-comparison-note">Se muestran los {row.idle.length} con más plata inmovilizada.</small>}</>
            : <p className="branch-comparison-empty">Todo lo que hay en stock se vendió al menos una vez.</p>}
        </details>
      </article>;
    })}</div>}
    {data && data.branches.length === 1 && <small className="branch-comparison-note">Con una sola sucursal, el panel muestra su resumen. Al sumar sucursales se comparan acá.</small>}
  </section>;
}
