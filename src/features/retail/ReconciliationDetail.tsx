import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage } from './api';
import { kindLabel, type DetailRow, type Method } from './reconciliationExport';

interface Detail { count: number; total: number; rows: DetailRow[] }

const zone = 'America/Argentina/Buenos_Aires';
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const dayKey = (at: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
const time = (at: string) => new Date(at).toLocaleString('es-AR', { timeZone: zone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Lo que forma el «Total cobrado» de un medio en el período: ventas por ese medio, devoluciones devueltas por ese
 * medio y cobros de fiado. La suma coincide con la tarjeta de la conciliación.
 */
export function ReconciliationDetail({ storeId, method, label, from, to, onClose }: {
  storeId: string; method: Method; label: string; from: string; to: string; onClose: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [byDay, setByDay] = useState(false);
  const [query, setQuery] = useState('');
  const title = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('retail_reconciliation_detail', { p_store: storeId, p_from: from, p_to: to, p_method: method });
      if (rpcError) throw rpcError;
      const value = result as Detail;
      setData({ count: Number(value.count), total: Number(value.total), rows: value.rows.map(row => ({ ...row, amount: Number(row.amount), total: row.total === null ? null : Number(row.total) })) });
      setError('');
    } catch (e) { setError(/retail_reconciliation_detail|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611040004 en Supabase.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [storeId, from, to, method]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { requestAnimationFrame(() => title.current?.focus()); }, [method]);

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!data || !text) return data?.rows || [];
    return data.rows.filter(row => `${row.ticket_number ?? ''} ${row.register ?? ''} ${row.actor ?? ''} ${row.detail ?? ''} ${kindLabel(row)}`.toLowerCase().includes(text));
  }, [data, query]);
  const days = useMemo(() => {
    const map = new Map<string, { sales: number; refunds: number; collections: number; count: number }>();
    for (const row of rows) {
      const entry = map.get(dayKey(row.at)) || { sales: 0, refunds: 0, collections: 0, count: 0 };
      if (row.kind === 'sale') { entry.sales += row.amount; entry.count += 1; } else if (row.kind === 'refund') entry.refunds += row.amount; else entry.collections += row.amount;
      map.set(dayKey(row.at), entry);
    }
    return [...map].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);
  const shownTotal = rows.reduce((sum, row) => sum + row.amount, 0);

  const download = () => {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const amount = (value: number) => value.toFixed(2).replace('.', ',');
    const lines = byDay
      ? [['Día', 'Ventas', 'Cantidad', 'Devoluciones', 'Cobros de fiado', 'Total'].join(';'),
        ...days.map(([key, d]) => [key, amount(d.sales), d.count, amount(d.refunds), amount(d.collections), amount(d.sales + d.refunds + d.collections)].join(';'))]
      : [['Fecha', 'Tipo', 'Ticket', 'Caja', `Importe ${label}`, 'Total de la venta', 'Mixta', 'Quién', 'Detalle'].join(';'),
        ...rows.map(row => [new Date(row.at).toLocaleString('es-AR', { timeZone: zone }), kindLabel(row), row.ticket_number ?? '', row.register ?? '', amount(row.amount),
          row.total === null ? '' : amount(row.total), row.mixed ? 'Sí' : 'No', row.actor ?? '', row.detail ?? ''].map(value => quote(String(value))).join(';'))];
    // BOM para que Excel abra bien los acentos.
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `conciliacion_${method.toLowerCase()}_${from}_${to}${byDay ? '_por_dia' : ''}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  return <section className="bank-detail" aria-labelledby="bank-detail-title">
    <div className="bank-detail-head">
      <div>
        <h3 id="bank-detail-title" ref={title} tabIndex={-1}>{label}: movimientos del {new Date(`${from}T12:00:00`).toLocaleDateString('es-AR')} al {new Date(`${to}T12:00:00`).toLocaleDateString('es-AR')}</h3>
        <p>Ventas cobradas por este medio (en una venta mixta, solo la parte de este medio), devoluciones devueltas por este medio y cobros de fiado.</p>
      </div>
      <button type="button" className="icon-button" aria-label="Cerrar movimientos" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="bank-detail-tools">
      <div className="bank-detail-toggle" role="group" aria-label="Vista">
        <button type="button" className={!byDay ? 'is-active' : ''} aria-pressed={!byDay} onClick={() => setByDay(false)}>Cada movimiento</button>
        <button type="button" className={byDay ? 'is-active' : ''} aria-pressed={byDay} onClick={() => setByDay(true)}>Por día</button>
      </div>
      <label className="bank-detail-search">Buscar<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ticket, caja, persona…" /></label>
      <button type="button" className="secondary-button" disabled={!rows.length} onClick={download}><Download size={15} /> Descargar CSV</button>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Cargando…</p>}
    {data && <>
      <p className="bank-detail-total" role="status">{query.trim() ? `${rows.length} de ${data.count} movimientos · ${money(shownTotal)}` : `${data.count} movimientos · Total ${money(data.total)}`}
        {data.count > data.rows.length && ` · Se muestran los ${data.rows.length} más recientes; acortá el período para ver todos.`}</p>
      <div className="bank-detail-table" role="region" aria-label={`Movimientos de ${label}`} tabIndex={0}>
        {byDay ? <table>
          <thead><tr><th scope="col">Día</th><th scope="col" className="num">Ventas</th><th scope="col" className="num">Cant.</th><th scope="col" className="num">Devoluciones</th><th scope="col" className="num">Cobros de fiado</th><th scope="col" className="num">Total</th></tr></thead>
          <tbody>{days.length ? days.map(([key, d]) => <tr key={key}>
            <th scope="row">{dayLabel(key)}</th><td className="num">{money(d.sales)}</td><td className="num">{d.count}</td>
            <td className="num">{d.refunds ? money(d.refunds) : '—'}</td><td className="num">{d.collections ? money(d.collections) : '—'}</td>
            <td className="num"><strong>{money(d.sales + d.refunds + d.collections)}</strong></td>
          </tr>) : <tr><td colSpan={6} className="bank-detail-empty">Sin movimientos.</td></tr>}</tbody>
        </table> : <table>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Ticket</th><th scope="col">Caja</th><th scope="col" className="num">Importe</th><th scope="col" className="num">Total venta</th><th scope="col">Quién</th></tr></thead>
          <tbody>{rows.length ? rows.map(row => <tr key={`${row.kind}-${row.id}`} className={row.amount < 0 ? 'is-negative' : row.return_status === 'voided' ? 'is-voided' : undefined}>
            <td>{time(row.at)}</td>
            <td>{kindLabel(row)}{row.mixed && <small> · mixta</small>}{row.detail && <small className="bank-detail-note">{row.detail}</small>}</td>
            <td>{row.ticket_number ? `T-${row.ticket_number}` : '—'}</td>
            <td>{row.register || '—'}</td>
            <td className="num"><strong>{money(row.amount)}</strong></td>
            <td className="num">{row.total === null ? '—' : money(row.total)}</td>
            <td>{row.actor || '—'}</td>
          </tr>) : <tr><td colSpan={7} className="bank-detail-empty">Sin movimientos con este medio en el período.</td></tr>}</tbody>
        </table>}
      </div>
    </>}
  </section>;
}
