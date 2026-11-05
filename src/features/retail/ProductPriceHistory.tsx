import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, type Product } from './api';
import './product-price-history.css';

type Delta = Record<string, unknown> | null;
interface History {
  product: { name: string; price: number; cost: number; sale_markup: number | null; sellable: boolean; price_pending?: boolean };
  tracked_since: string | null;
  changes: { at: string; actor: string | null; before: Delta; after: Delta }[];
  restocks: { at: string; cost: number; qty: number; actor: string | null }[];
  sales: { day: string; price: number; qty: number }[];
}
interface Point { t: number; v: number }
interface Row { t: number; what: 'Costo' | 'Precio' | 'Ganancia'; before: number | null; after: number; reason: string; actor: string | null }

const zone = 'America/Argentina/Buenos_Aires';
const periods = [{ id: '3m', label: '3 meses', months: 3 }, { id: '6m', label: '6 meses', months: 6 }, { id: '1y', label: '1 año', months: 12 }, { id: 'all', label: 'Todo', months: 0 }] as const;
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: value % 1 ? 2 : 0 });
const percent = (value: number) => `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
const num = (value: unknown) => value === null || value === undefined || value === '' ? null : Number(value);
const dateLabel = (t: number, withYear = false) => new Date(t).toLocaleDateString('es-AR', { timeZone: zone, day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
const dateTime = (t: number) => new Date(t).toLocaleString('es-AR', { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fromDate = (months: number) => {
  if (!months) return null;
  const date = new Date(); date.setMonth(date.getMonth() - months);
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

/** Valor vigente en t de una serie en escalones (cada punto vale hasta el siguiente). */
function stepAt(series: Point[], t: number) {
  let value: number | null = null;
  for (const point of series) { if (point.t <= t) value = point.v; else break; }
  return value;
}

/** Arma la serie en escalones: desde el valor anterior al primer cambio hasta el valor actual. */
function stepSeries(changes: { t: number; before: number | null; after: number }[], current: number, start: number, end: number): Point[] {
  const sorted = [...changes].sort((a, b) => a.t - b.t);
  if (!sorted.length) return current > 0 ? [{ t: start, v: current }, { t: end, v: current }] : [];
  const points: Point[] = [];
  const first = sorted[0].before;
  if (first !== null && first > 0) points.push({ t: start, v: first });
  for (const change of sorted) if (change.after > 0) points.push({ t: change.t, v: change.after });
  if (current > 0) points.push({ t: end, v: current });
  return points;
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find(candidate => candidate * power >= value / 4) || 10;
  return Math.ceil(value / (step * power)) * step * power;
}

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

/** Costo y precio de venta de un producto a lo largo del tiempo, con la ganancia aparte y la lista de cambios. */
export function ProductPriceHistory({ storeId, product, onClose }: { storeId: string; product: Product; onClose: () => void }) {
  const [period, setPeriod] = useState<(typeof periods)[number]['id']>('6m');
  const [data, setData] = useState<History | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<number | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [panel, width] = useWidth<HTMLElement>();
  const months = periods.find(item => item.id === period)!.months;

  const load = useCallback(async () => {
    if (!navigator.onLine) { setError('El historial necesita conexión.'); return; }
    setLoading(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('retail_product_price_history', { p_store: storeId, p_product: product.id, p_from: fromDate(months) });
      if (rpcError) throw rpcError;
      setData(result as History); setError('');
    } catch (e) {
      const message = errorMessage(e);
      setError(/retail_product_price_history|schema cache/.test(message) ? 'Falta aplicar la actualización 202611040001 en Supabase.' : message);
    } finally { setLoading(false); }
  }, [storeId, product.id, months]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { requestAnimationFrame(() => title.current?.focus()); }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const end = Date.now();
    const times = [...data.changes.map(row => Date.parse(row.at)), ...data.restocks.map(row => Date.parse(row.at)), ...data.sales.map(row => Date.parse(`${row.day}T12:00:00-03:00`))];
    const earliest = times.length ? Math.min(...times) : end - 30 * 86400000;
    const start = months ? Math.min(Date.parse(`${fromDate(months)}T00:00:00-03:00`), end) : Math.min(earliest, end - 86400000);

    const priceChanges: { t: number; before: number | null; after: number }[] = [];
    const costChanges: { t: number; before: number | null; after: number }[] = [];
    const rows: Row[] = [];
    const usedRestocks = new Set<number>();
    for (const change of data.changes) {
      const t = Date.parse(change.at); const before = change.before || {}; const after = change.after || {};
      const costChanged = 'cost' in after; const markupChanged = 'sale_markup' in after;
      if (costChanged) {
        const value = num(after.cost)!;
        const restock = data.restocks.findIndex(item => Math.abs(Date.parse(item.at) - t) < 120000 && Number(item.cost) === value);
        if (restock >= 0) usedRestocks.add(restock);
        costChanges.push({ t, before: num(before.cost), after: value });
        rows.push({ t, what: 'Costo', before: num(before.cost), after: value, reason: restock >= 0 ? `Reposición de ${data.restocks[restock].qty} u.` : 'Edición del costo', actor: change.actor });
      }
      if (markupChanged && num(after.sale_markup) !== null) rows.push({ t, what: 'Ganancia', before: num(before.sale_markup), after: num(after.sale_markup)!, reason: 'Cambio de ganancia', actor: change.actor });
      if ('price' in after) {
        const value = num(after.price)!;
        const reason = markupChanged && after.sale_markup === null ? 'Precio manual' : markupChanged ? 'Cambio de ganancia' : costChanged ? 'Recálculo por costo' : 'Edición del precio';
        priceChanges.push({ t, before: num(before.price), after: value });
        rows.push({ t, what: 'Precio', before: num(before.price), after: value, reason, actor: change.actor });
      }
    }
    // Reposiciones sin cambio registrado (anteriores al registro de actividad o con el mismo costo).
    let lastCost: number | null = null;
    data.restocks.forEach((item, index) => {
      if (usedRestocks.has(index)) return;
      const t = Date.parse(item.at); const value = Number(item.cost);
      const tracked = data.tracked_since && t >= Date.parse(data.tracked_since);
      if (!tracked && value !== lastCost) costChanges.push({ t, before: lastCost, after: value });
      rows.push({ t, what: 'Costo', before: null, after: value, reason: `Reposición de ${item.qty} u.`, actor: item.actor });
      lastCost = value;
    });
    const price = data.product.price_pending || !data.product.sellable ? [] : stepSeries(priceChanges, Number(data.product.price), start, end);
    const cost = stepSeries(costChanges, Number(data.product.cost), start, end);
    const sales = data.sales.map(row => ({ t: Date.parse(`${row.day}T12:00:00-03:00`), v: Number(row.price), qty: Number(row.qty) })).filter(row => row.t >= start);
    const markupTimes = [...new Set([...price, ...cost].map(point => point.t))].sort((a, b) => a - b);
    const markup = markupTimes.flatMap(t => { const p = stepAt(price, t); const c = stepAt(cost, t); return p && c ? [{ t, v: (p / c - 1) * 100 }] : []; });
    const firstPrice = price[0]?.v; const firstCost = cost[0]?.v;
    return {
      start, end, price, cost, sales, markup, rows: rows.filter(row => row.t >= start).sort((a, b) => b.t - a.t),
      priceChange: firstPrice ? (Number(data.product.price) / firstPrice - 1) * 100 : null,
      costChange: firstCost && data.product.cost > 0 ? (Number(data.product.cost) / firstCost - 1) * 100 : null,
      currentMarkup: data.product.cost > 0 && data.product.price > 0 ? (data.product.price / data.product.cost - 1) * 100 : null,
    };
  }, [data, months]);

  const pad = { top: 14, right: 84, bottom: 26, left: 64 };
  const height = 220; const markupHeight = 96;
  const plotWidth = Math.max(100, width - pad.left - pad.right);
  const maxValue = view ? niceMax(Math.max(1, ...view.price.map(p => p.v), ...view.cost.map(p => p.v), ...view.sales.map(p => p.v))) : 1;
  const x = (t: number) => view ? pad.left + ((t - view.start) / Math.max(1, view.end - view.start)) * plotWidth : pad.left;
  const y = (v: number) => pad.top + (1 - v / maxValue) * (height - pad.top - pad.bottom);
  const stepPath = (series: Point[], yOf: (v: number) => number) => series.map((point, index) => index === 0 ? `M${x(point.t)},${yOf(point.v)}` : `H${x(point.t)}V${yOf(point.v)}`).join('');
  const markupValues = view?.markup.map(point => point.v) ?? [];
  const markupMin = Math.min(0, ...markupValues); const markupMax = niceMax(Math.max(1, ...markupValues));
  const my = (v: number) => 10 + (1 - (v - markupMin) / Math.max(1, markupMax - markupMin)) * (markupHeight - 30);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(part => maxValue * part);
  const timeTicks = view ? [0, 0.33, 0.66, 1].map(part => view.start + (view.end - view.start) * part) : [];
  const longRange = view ? view.end - view.start > 300 * 86400000 : false;

  const onPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!view) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * width;
    if (px < pad.left || px > pad.left + plotWidth) { setHover(null); return; }
    setHover(view.start + ((px - pad.left) / plotWidth) * (view.end - view.start));
  };
  const hoverPrice = view && hover !== null ? stepAt(view.price, hover) : null;
  const hoverCost = view && hover !== null ? stepAt(view.cost, hover) : null;
  const hoverSale = view && hover !== null ? view.sales.find(point => Math.abs(point.t - hover) < 43200000) : undefined;
  const lastPrice = view?.price.at(-1); const lastCost = view?.cost.at(-1);
  const labelsTooClose = lastPrice && lastCost ? Math.abs(y(lastPrice.v) - y(lastCost.v)) < 14 : false;

  return <section ref={panel} className="retail-form product-price-history" aria-labelledby="price-history-title">
    <div className="price-history-head">
      <div>
        <h3 id="price-history-title" ref={title} tabIndex={-1}><span aria-hidden="true">{product.emoji || '📦'}</span> Historial de precios · {product.name}</h3>
        <p>Costo de compra y precio de venta en la lista Principal.</p>
      </div>
      <div className="price-history-tools">
        <div className="price-history-periods" role="group" aria-label="Período">
          {periods.map(item => <button key={item.id} type="button" className={period === item.id ? 'is-active' : ''} aria-pressed={period === item.id} onClick={() => setPeriod(item.id)}>{item.label}</button>)}
        </div>
        <button type="button" className="icon-button" aria-label="Actualizar" disabled={loading} onClick={() => void load()}><RefreshCw size={16} /></button>
        <button type="button" className="icon-button" aria-label="Cerrar historial" onClick={onClose}><X size={18} /></button>
      </div>
    </div>

    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && !data && <p role="status"><Loader2 size={15} className="spin" /> Cargando historial…</p>}

    {data && view && <>
      <dl className="price-history-stats">
        <div><dt>Costo actual</dt><dd>{data.product.cost > 0 ? money(data.product.cost) : 'Sin costo'}{view.costChange !== null && <small>{view.costChange >= 0 ? '+' : ''}{percent(view.costChange)} en el período</small>}</dd></div>
        <div><dt>Precio actual</dt><dd>{data.product.price_pending ? 'Sin precio' : !data.product.sellable ? 'Solo insumo' : money(data.product.price)}{view.priceChange !== null && <small>{view.priceChange >= 0 ? '+' : ''}{percent(view.priceChange)} en el período</small>}</dd></div>
        <div><dt>Ganancia sobre costo</dt><dd>{view.currentMarkup !== null ? percent(view.currentMarkup) : '—'}<small>{data.product.sale_markup != null ? 'Sigue al costo' : 'Precio manual'}</small></dd></div>
      </dl>

      {!view.price.length && !view.cost.length && !view.sales.length
        ? <p className="price-history-empty">No hay cambios ni reposiciones con costo en este período.</p>
        : <div className="price-history-chart">
          <ul className="price-history-legend" aria-label="Series">
            <li><span className="swatch is-price" aria-hidden="true" />Precio de venta</li>
            <li><span className="swatch is-cost" aria-hidden="true" />Costo</li>
            {view.sales.length > 0 && <li><span className="swatch is-sale" aria-hidden="true" />Precio cobrado (ventas, antes del registro)</li>}
          </ul>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolución del costo y del precio de ${product.name}. El detalle está en la tabla de cambios.`}
            onPointerMove={onPointer} onPointerLeave={() => setHover(null)}>
            {ticks.map(value => <g key={value} className="grid">
              <line x1={pad.left} x2={pad.left + plotWidth} y1={y(value)} y2={y(value)} />
              <text x={pad.left - 8} y={y(value)} dy="0.32em" textAnchor="end">{money(value)}</text>
            </g>)}
            {timeTicks.map((t, index) => <text key={t} className="axis" x={x(t)} y={height - 6} textAnchor={index === 0 ? 'start' : index === timeTicks.length - 1 ? 'end' : 'middle'}>{dateLabel(t, longRange)}</text>)}
            {view.cost.length > 0 && <path className="line is-cost" d={stepPath(view.cost, y)} />}
            {view.price.length > 0 && <path className="line is-price" d={stepPath(view.price, y)} />}
            {view.sales.map(point => <circle key={point.t} className="dot is-sale" cx={x(point.t)} cy={y(point.v)} r={4} />)}
            {lastPrice && <text className="direct-label" x={pad.left + plotWidth + 6} y={y(lastPrice.v) - (labelsTooClose && lastCost && lastCost.v > lastPrice.v ? -8 : labelsTooClose ? 8 : 0)} dy="0.32em">{money(lastPrice.v)}</text>}
            {lastCost && <text className="direct-label" x={pad.left + plotWidth + 6} y={y(lastCost.v) + (labelsTooClose && lastPrice && lastPrice.v >= lastCost.v ? 8 : labelsTooClose ? -8 : 0)} dy="0.32em">{money(lastCost.v)}</text>}
            {hover !== null && <g className="crosshair">
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={height - pad.bottom} />
              {hoverPrice !== null && <circle className="marker is-price" cx={x(hover)} cy={y(hoverPrice)} r={5} />}
              {hoverCost !== null && <circle className="marker is-cost" cx={x(hover)} cy={y(hoverCost)} r={5} />}
            </g>}
          </svg>
          {hover !== null && (hoverPrice !== null || hoverCost !== null || hoverSale) && <div className="price-history-tooltip" role="status"
            style={{ left: Math.min(Math.max(x(hover), 90), width - 90) }}>
            <strong>{dateLabel(hover, true)}</strong>
            {hoverPrice !== null && <span><i className="swatch is-price" aria-hidden="true" />Precio {money(hoverPrice)}</span>}
            {hoverCost !== null && <span><i className="swatch is-cost" aria-hidden="true" />Costo {money(hoverCost)}</span>}
            {hoverPrice !== null && hoverCost !== null && hoverCost > 0 && <span>Ganancia {percent((hoverPrice / hoverCost - 1) * 100)}</span>}
            {hoverSale && <span><i className="swatch is-sale" aria-hidden="true" />Cobrado {money(hoverSale.v)} · {hoverSale.qty.toLocaleString('es-AR')} u.</span>}
          </div>}

          {view.markup.length > 1 && <>
            <h4 className="price-history-subtitle">Ganancia sobre costo</h4>
            <svg width={width} height={markupHeight} viewBox={`0 0 ${width} ${markupHeight}`} role="img" aria-label="Evolución de la ganancia sobre costo">
              {[markupMin, markupMax].map(value => <g key={value} className="grid">
                <line x1={pad.left} x2={pad.left + plotWidth} y1={my(value)} y2={my(value)} />
                <text x={pad.left - 8} y={my(value)} dy="0.32em" textAnchor="end">{percent(value)}</text>
              </g>)}
              <path className="line is-markup" d={view.markup.map((point, index) => index === 0 ? `M${x(point.t)},${my(point.v)}` : `H${x(point.t)}V${my(point.v)}`).join('') + `H${x(view.end)}`} />
              <text className="direct-label" x={pad.left + plotWidth + 6} y={my(view.markup.at(-1)!.v)} dy="0.32em">{percent(view.markup.at(-1)!.v)}</text>
              {hover !== null && <line className="crosshair-line" x1={x(hover)} x2={x(hover)} y1={8} y2={markupHeight - 18} />}
            </svg>
          </>}
        </div>}

      {data.tracked_since === null || (view.start < Date.parse(data.tracked_since))
        ? <p className="price-history-note">Los cambios de precio se registran desde que se activó la Actividad{data.tracked_since ? ` (${dateLabel(Date.parse(data.tracked_since), true)})` : ''}. Antes de eso, el precio sale de lo cobrado en las ventas y el costo, de las reposiciones.</p> : null}

      <div className="price-history-table" role="region" aria-label="Cambios de costo y precio" tabIndex={0}>
        <table>
          <caption>Cambios en el período</caption>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Qué</th><th scope="col" className="num">Antes</th><th scope="col" className="num">Después</th><th scope="col">Motivo</th><th scope="col">Quién</th></tr></thead>
          <tbody>
            {view.rows.length ? view.rows.map((row, index) => <tr key={`${row.t}-${row.what}-${index}`}>
              <td>{dateTime(row.t)}</td>
              <td>{row.what}</td>
              <td className="num">{row.before === null ? '—' : row.what === 'Ganancia' ? percent(row.before) : money(row.before)}</td>
              <td className="num"><strong>{row.what === 'Ganancia' ? percent(row.after) : money(row.after)}</strong></td>
              <td>{row.reason}</td>
              <td>{row.actor || '—'}</td>
            </tr>) : <tr><td colSpan={6} className="price-history-empty">Sin cambios registrados en este período.</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
  </section>;
}
