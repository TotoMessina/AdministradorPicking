import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, type Category, type Product } from './api';
import './product-price-history.css';

type Kind = 'all' | 'category' | 'brand' | 'supplier';
type Period = '3m' | '6m' | '1y';
interface Group { key: string; label: string; products: number; points: { t: string; price: number | null; cost: number | null; markup: number | null }[] }
interface Mover { id: string; name: string; label: string; price_change: number | null; cost_change: number | null; qty: number }
interface IndexData { start: string; tracked_since: string | null; groups: Group[]; movers: Mover[] }
interface Series { key: string; label: string; color: string; points: { t: number; v: number }[] }

const zone = 'America/Argentina/Buenos_Aires';
// Orden fijo de la paleta validada: azul, naranja, aqua, amarillo. El color sigue al grupo, no a su posición en el ranking.
const palette = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const kinds: { id: Kind; label: string }[] = [{ id: 'all', label: 'Todo el comercio' }, { id: 'category', label: 'Categoría' }, { id: 'brand', label: 'Marca' }, { id: 'supplier', label: 'Proveedor' }];
const periods: { id: Period; label: string }[] = [{ id: '3m', label: '3 meses' }, { id: '6m', label: '6 meses' }, { id: '1y', label: '1 año' }];
const fmt = (value: number, digits = 1) => value.toLocaleString('es-AR', { maximumFractionDigits: digits });
const pct = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${fmt(value)}%`;
const day = (t: number, year = false) => new Date(t).toLocaleDateString('es-AR', { timeZone: zone, day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
const normalize = (text: string) => text.trim().toLowerCase();

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Gráfico de líneas con un solo eje, etiqueta al final de cada serie y cruz con detalle al pasar. */
function LineChart({ series, width, height, format, reference, label }: {
  series: Series[]; width: number; height: number; format: (value: number) => string; reference?: number; label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 92, bottom: 24, left: 52 };
  const all = series.flatMap(item => item.points);
  if (!all.length) return <p className="price-history-empty">Sin datos para graficar.</p>;
  const times = [...new Set(all.map(point => point.t))].sort((a, b) => a - b);
  const t0 = times[0]; const t1 = Math.max(times.at(-1)!, t0 + 1);
  const values = [...all.map(point => point.v), ...(reference !== undefined ? [reference] : [])];
  let min = Math.min(...values); let max = Math.max(...values);
  const spread = Math.max(1, max - min); min -= spread * 0.1; max += spread * 0.1;
  const plot = Math.max(100, width - pad.left - pad.right);
  const x = (t: number) => pad.left + ((t - t0) / (t1 - t0)) * plot;
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min)) * (height - pad.top - pad.bottom);
  const ticks = [0, 0.5, 1].map(part => min + (max - min) * part);
  const hoverT = hover !== null ? times.reduce((best, t) => Math.abs(t - hover) < Math.abs(best - hover) ? t : best, times[0]) : null;
  // Etiquetas finales separadas al menos 14px para que no se pisen.
  const ends = series.filter(item => item.points.length).map(item => ({ item, y: y(item.points.at(-1)!.v) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  const onPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * width;
    setHover(px < pad.left || px > pad.left + plot ? null : t0 + ((px - pad.left) / plot) * (t1 - t0));
  };
  return <div className="price-history-chart">
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} onPointerMove={onPointer} onPointerLeave={() => setHover(null)}>
      {ticks.map(value => <g key={value} className="grid"><line x1={pad.left} x2={pad.left + plot} y1={y(value)} y2={y(value)} />
        <text x={pad.left - 8} y={y(value)} dy="0.32em" textAnchor="end">{format(value)}</text></g>)}
      {reference !== undefined && <line className="reference-line" x1={pad.left} x2={pad.left + plot} y1={y(reference)} y2={y(reference)} />}
      {[t0, (t0 + t1) / 2, t1].map((t, index) => <text key={index} className="axis" x={x(t)} y={height - 6} textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}>{day(t, t1 - t0 > 300 * 86400000)}</text>)}
      {series.map(item => <path key={item.key} className="line" style={{ stroke: item.color }} d={item.points.map((point, index) => `${index ? 'L' : 'M'}${x(point.t)},${y(point.v)}`).join('')} />)}
      {ends.map(({ item, y: labelY }) => <text key={item.key} className="direct-label" x={pad.left + plot + 6} y={labelY} dy="0.32em">{format(item.points.at(-1)!.v)}{series.length > 1 ? ` · ${item.label.slice(0, 12)}` : ''}</text>)}
      {hoverT !== null && <g className="crosshair"><line x1={x(hoverT)} x2={x(hoverT)} y1={pad.top} y2={height - pad.bottom} />
        {series.map(item => { const point = item.points.find(p => p.t === hoverT); return point ? <circle key={item.key} className="marker" style={{ fill: item.color }} cx={x(hoverT)} cy={y(point.v)} r={5} /> : null; })}</g>}
    </svg>
    {hoverT !== null && <div className="price-history-tooltip" role="status" style={{ left: Math.min(Math.max(x(hoverT), 90), width - 90) }}>
      <strong>{day(hoverT, true)}</strong>
      {series.map(item => { const point = item.points.find(p => p.t === hoverT); return point ? <span key={item.key}><i className="swatch" style={{ background: item.color }} aria-hidden="true" />{item.label}: {format(point.v)}</span> : null; })}
    </div>}
  </div>;
}

/**
 * Evolución de precios por categoría, marca o proveedor: índices base 100 de costo y precio, ponderados por
 * unidades vendidas, y ganancia promedio. Hasta 4 grupos comparados en un mismo gráfico.
 */
export function PriceEvolution({ storeId, products, categories, onOpenProduct, onClose }: {
  storeId: string; products: Product[]; categories: Category[]; onOpenProduct: (product: Product, trigger: HTMLElement) => void; onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>('category');
  const [groups, setGroups] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>('6m');
  const [metric, setMetric] = useState<'price' | 'cost'>('price');
  const [data, setData] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const [panel, width] = useWidth<HTMLElement>();

  const options = useMemo(() => {
    const sellable = products.filter(product => product.sellable !== false);
    if (kind === 'category') return categories.filter(category => sellable.some(product => product.categoryId === category.id)).map(category => ({ key: category.id, label: category.name }));
    const field = kind === 'brand' ? 'brand' : 'supplier';
    const seen = new Map<string, string>();
    for (const product of sellable) { const value = product[field]?.trim(); if (value && !seen.has(normalize(value))) seen.set(normalize(value), value); }
    return [...seen].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, 'es-AR'));
  }, [products, categories, kind]);

  const load = useCallback(async () => {
    if (kind !== 'all' && !groups.length) { setData(null); return; }
    if (!navigator.onLine) { setError('La evolución de precios necesita conexión.'); return; }
    setLoading(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('retail_price_index', { p_store: storeId, p_group_kind: kind, p_groups: kind === 'all' ? null : groups, p_period: period });
      if (rpcError) throw rpcError;
      setData(result as IndexData); setError('');
    } catch (e) {
      const message = errorMessage(e);
      setError(/retail_price_index|schema cache/.test(message) ? 'Falta aplicar la actualización 202611040002 en Supabase.' : message);
    } finally { setLoading(false); }
  }, [storeId, kind, groups, period]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { requestAnimationFrame(() => title.current?.focus()); }, []);

  // El color de cada grupo depende del orden en que se eligió, así no cambia al sumar o quitar otros.
  const colorOf = (key: string) => palette[Math.max(0, (kind === 'all' ? ['all'] : groups).indexOf(key)) % palette.length];
  const ordered = (data?.groups || []).slice().sort((a, b) => (kind === 'all' ? 0 : groups.indexOf(a.key) - groups.indexOf(b.key)));
  // Los índices llegan en base 100; se muestran como variación desde el inicio (112 → +12%), que se lee sin explicación.
  const toPoints = (group: Group, field: 'price' | 'cost' | 'markup') => group.points.flatMap(point => point[field] === null ? []
    : [{ t: Date.parse(point.t), v: field === 'markup' ? Number(point[field]) : Number(point[field]) - 100 }]);
  const startLabel = data ? day(Date.parse(data.start), true) : '';
  const single = ordered.length === 1;
  const indexSeries: Series[] = single
    ? [{ key: 'price', label: 'Precio', color: palette[0], points: toPoints(ordered[0], 'price') }, { key: 'cost', label: 'Costo', color: palette[1], points: toPoints(ordered[0], 'cost') }]
    : ordered.map(group => ({ key: group.key, label: group.label, color: colorOf(group.key), points: toPoints(group, metric) }));
  const markupSeries: Series[] = ordered.map(group => ({ key: group.key, label: group.label, color: single ? palette[2] : colorOf(group.key), points: toPoints(group, 'markup') }));
  const summary = ordered.map(group => {
    const last = group.points.at(-1); const first = group.points.find(point => point.markup !== null);
    return { group, price: last?.price ?? null, cost: last?.cost ?? null, markupNow: last?.markup ?? null, markupThen: first?.markup ?? null };
  });
  const addGroup = (key: string) => { if (key && !groups.includes(key) && groups.length < 4) setGroups([...groups, key]); };

  return <section ref={panel} className="retail-form product-price-history price-evolution" aria-labelledby="price-evolution-title">
    <div className="price-history-head">
      <div>
        <h3 id="price-evolution-title" ref={title} tabIndex={-1}>Evolución de precios</h3>
        <p>Cuánto subieron o bajaron costo y precio desde el inicio del período, en promedio y pesando más lo que más se vende. Si el costo sube más que el precio, se achica la ganancia.</p>
      </div>
      <div className="price-history-tools">
        <div className="price-history-periods" role="group" aria-label="Período">
          {periods.map(item => <button key={item.id} type="button" className={period === item.id ? 'is-active' : ''} aria-pressed={period === item.id} onClick={() => setPeriod(item.id)}>{item.label}</button>)}
        </div>
        <button type="button" className="icon-button" aria-label="Actualizar" disabled={loading} onClick={() => void load()}><RefreshCw size={16} /></button>
        <button type="button" className="icon-button" aria-label="Cerrar evolución de precios" onClick={onClose}><X size={18} /></button>
      </div>
    </div>

    <div className="price-evolution-filters">
      <label>Agrupar por<select value={kind} onChange={event => { setKind(event.target.value as Kind); setGroups([]); setData(null); }}>
        {kinds.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select></label>
      {kind !== 'all' && <label>Comparar (hasta 4)<select value="" disabled={groups.length >= 4} onChange={event => addGroup(event.target.value)}>
        <option value="">{groups.length >= 4 ? 'Ya elegiste 4' : `Agregar ${kinds.find(item => item.id === kind)!.label.toLowerCase()}…`}</option>
        {options.filter(option => !groups.includes(option.key)).map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select></label>}
      {!single && ordered.length > 1 && <div className="price-history-periods" role="group" aria-label="Qué comparar">
        <button type="button" className={metric === 'price' ? 'is-active' : ''} aria-pressed={metric === 'price'} onClick={() => setMetric('price')}>Precio</button>
        <button type="button" className={metric === 'cost' ? 'is-active' : ''} aria-pressed={metric === 'cost'} onClick={() => setMetric('cost')}>Costo</button>
      </div>}
    </div>
    {kind !== 'all' && groups.length > 0 && <ul className="price-evolution-chips" aria-label="Grupos elegidos">
      {groups.map(key => <li key={key}><span className="swatch" style={{ background: colorOf(key) }} aria-hidden="true" />{options.find(option => option.key === key)?.label || key}
        <button type="button" aria-label={`Quitar ${options.find(option => option.key === key)?.label || key}`} onClick={() => setGroups(groups.filter(item => item !== key))}><X size={13} /></button></li>)}
    </ul>}

    {error && <p role="alert" className="error-banner">{error}</p>}
    {kind !== 'all' && !groups.length && <p className="price-history-empty">Elegí una o más {kind === 'category' ? 'categorías' : kind === 'brand' ? 'marcas' : 'proveedores'} para ver su evolución.</p>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Calculando…</p>}

    {data && ordered.length > 0 && <>
      <dl className="price-history-stats">
        {summary.map(({ group, price, cost, markupNow, markupThen }) => <div key={group.key}>
          <dt>{!single && <span className="swatch" style={{ background: colorOf(group.key) }} aria-hidden="true" />} {group.label} · {group.products} productos</dt>
          <dd>Precio {pct(price === null ? null : price - 100)}<small>Costo {pct(cost === null ? null : cost - 100)} · Ganancia {markupNow === null ? '—' : `${fmt(markupNow)}%`}{markupThen !== null && markupNow !== null ? ` (antes ${fmt(markupThen)}%)` : ''}</small></dd>
        </div>)}
      </dl>

      {single && <ul className="price-history-legend" aria-label="Series"><li><span className="swatch is-price" aria-hidden="true" />Precio de venta</li><li><span className="swatch is-cost" aria-hidden="true" />Costo</li></ul>}
      <h4 className="price-history-subtitle">{single ? `Variación de costo y precio desde el ${startLabel}` : `Variación del ${metric === 'price' ? 'precio' : 'costo'} desde el ${startLabel}`}</h4>
      <LineChart series={indexSeries} width={width} height={220} format={value => pct(Math.round(value * 10) / 10)} reference={0} label="Variación de costo y precio desde el inicio del período. Los valores están en la tabla de datos." />
      <h4 className="price-history-subtitle">Ganancia promedio sobre costo</h4>
      <LineChart series={markupSeries} width={width} height={130} format={value => `${fmt(value)}%`} label="Evolución de la ganancia promedio. Los valores están en la tabla de datos." />

      <details className="price-evolution-data">
        <summary>Ver datos del gráfico</summary>
        <div className="price-history-table" role="region" aria-label="Datos del gráfico" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Fecha</th>{ordered.map(group => <th key={group.key} scope="col" className="num" colSpan={3}>{group.label}</th>)}</tr>
              <tr><th scope="col" />{ordered.map(group => <Fragment key={group.key}><th scope="col" className="num">Precio</th><th scope="col" className="num">Costo</th><th scope="col" className="num">Ganancia</th></Fragment>)}</tr></thead>
            <tbody>{(ordered[0]?.points || []).map((point, index) => <tr key={point.t}>
              <td>{day(Date.parse(point.t), true)}</td>
              {ordered.map(group => { const row = group.points[index]; return <Fragment key={group.key}><td className="num">{row?.price == null ? '—' : pct(row.price - 100)}</td><td className="num">{row?.cost == null ? '—' : pct(row.cost - 100)}</td><td className="num">{row?.markup == null ? '—' : `${fmt(row.markup)}%`}</td></Fragment>; })}
            </tr>)}</tbody>
          </table>
        </div>
      </details>

      {(!data.tracked_since || Date.parse(data.tracked_since) > Date.parse(data.start)) && <p className="price-history-note">
        Los cambios de precio se registran desde que se activó la Actividad{data.tracked_since ? ` (${day(Date.parse(data.tracked_since), true)})` : ''}. Antes de eso el precio queda en su primer valor conocido y el costo sale de las reposiciones, así que el índice es aproximado en ese tramo.</p>}

      <div className="price-history-table" role="region" aria-label="Productos que más cambiaron" tabIndex={0}>
        <table>
          <caption>Productos que más cambiaron en el período</caption>
          <thead><tr><th scope="col">Producto</th><th scope="col">{kinds.find(item => item.id === kind)!.label}</th><th scope="col" className="num">Costo</th><th scope="col" className="num">Precio</th><th scope="col" className="num">Vendidos</th></tr></thead>
          <tbody>{data.movers.length ? data.movers.map(mover => {
            const product = products.find(item => item.id === mover.id);
            return <tr key={mover.id}>
              <th scope="row">{product ? <button type="button" className="product-name-button" onClick={event => onOpenProduct(product, event.currentTarget)}>{mover.name}</button> : mover.name}</th>
              <td>{mover.label || '—'}</td>
              <td className="num">{pct(mover.cost_change)}</td>
              <td className="num">{pct(mover.price_change)}</td>
              <td className="num">{fmt(Number(mover.qty), 0)}</td>
            </tr>;
          }) : <tr><td colSpan={5} className="price-history-empty">Ningún producto cambió de costo ni de precio en el período.</td></tr>}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
