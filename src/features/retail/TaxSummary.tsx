import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NumberInput } from '../../components/NumberInput';
import { downloadCsv } from '../../services/purchaseInvoiceExport';
import { errorMessage } from './api';

interface RateRow { id: number; base: number; vat: number }
interface Summary {
  month: string; condicion_iva: 'RI' | 'MO' | 'EX' | null; legacy_invoices: number;
  sales: { invoices: number; credit_notes: number; total: number; exempt: number; without_vat: number; by_rate: RateRow[] };
  unbilled: { count: number; total: number; net_estimate: number; vat_estimate: number };
  purchases: {
    count: number; unbalanced: number; total: number; untaxed: number; internal_taxes: number; other_taxes: number;
    vat_perceptions: number; iibb_perceptions: number; by_rate: RateRow[];
  };
}

const RATE_LABELS: Record<number, string> = { 3: '0%', 4: '10,5%', 5: '21%', 6: '27%', 8: '5%', 9: '2,5%' };
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (value: number) => String(value).padStart(2, '0');
const thisMonth = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; };
const monthName = (month: string) => new Date(`${month}-15T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
const sum = (rows: RateRow[], key: 'base' | 'vat') => rows.reduce((n, r) => n + r[key], 0);
const RATE_KEY = 'kiosco_iibb_rate';
const readRate = () => { try { return localStorage.getItem(RATE_KEY) || ''; } catch { return ''; } };
const saveRate = (value: string) => { try { localStorage.setItem(RATE_KEY, value); } catch { /* sin almacenamiento */ } };

/** Convierte números a número (la base devuelve numeric como texto en algunos casos). */
function normalize(raw: Summary): Summary {
  const rates = (rows: RateRow[]) => (rows || []).map(r => ({ id: Number(r.id), base: Number(r.base), vat: Number(r.vat) }));
  const numbers = <T extends object>(obj: T) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v : Number(v)])) as T;
  return {
    ...raw,
    legacy_invoices: Number(raw.legacy_invoices || 0),
    sales: { ...numbers(raw.sales), by_rate: rates(raw.sales.by_rate) },
    unbilled: numbers(raw.unbilled),
    purchases: { ...numbers(raw.purchases), by_rate: rates(raw.purchases.by_rate) },
  };
}

/**
 * Resumen impositivo del mes para el contador: IVA de ventas (débito) y de compras (crédito), percepciones
 * sufridas y base de Ingresos Brutos. Es una ayuda para preparar las declaraciones juradas, no las reemplaza.
 */
export function TaxSummary({ storeId, active }: { storeId: string; active: boolean }) {
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [iibbRate, setIibbRate] = useState(readRate);

  useEffect(() => {
    if (!active) return;
    let live = true;
    setLoading(true); setError('');
    supabase.rpc('retail_tax_summary', { p_store: storeId, p_month: `${month}-01` })
      .then(({ data: raw, error: rpcError }) => {
        if (!live) return;
        if (rpcError) throw rpcError;
        setData(normalize(raw as Summary));
      })
      .then(undefined, err => {
        if (!live) return;
        const text = String((err as Error)?.message || '');
        setError(/retail_tax_summary|schema cache/.test(text) ? 'Falta aplicar la actualización 202611190001 en Supabase.' : errorMessage(err));
      })
      .then(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [active, storeId, month]);

  const ri = data?.condicion_iva === 'RI';
  const salesVat = data ? sum(data.sales.by_rate, 'vat') : 0;
  const purchaseVat = data ? sum(data.purchases.by_rate, 'vat') : 0;
  const vatBalance = salesVat - purchaseVat - (data?.purchases.vat_perceptions || 0);
  // Base de Ingresos Brutos: ventas sin IVA (facturadas y sin factura).
  const billedNet = data ? sum(data.sales.by_rate, 'base') + data.sales.exempt + data.sales.without_vat : 0;
  const iibbBase = billedNet + (data?.unbilled.net_estimate || 0);
  const rate = Number(iibbRate);
  const iibbTax = Number.isFinite(rate) && rate > 0 ? iibbBase * rate / 100 : null;

  const exportCsv = () => {
    if (!data) return;
    const n = (value: number) => (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
    const rows: [string, string][] = [
      ['Mes', monthName(data.month)],
      ['Facturas emitidas', String(data.sales.invoices)],
      ['Notas de crédito emitidas', String(data.sales.credit_notes)],
      ...data.sales.by_rate.flatMap(r => [[`Ventas neto gravado ${RATE_LABELS[r.id] || r.id}`, n(r.base)], [`Ventas IVA ${RATE_LABELS[r.id] || r.id}`, n(r.vat)]] as [string, string][]),
      ['Ventas exentas', n(data.sales.exempt)],
      ['Ventas sin IVA discriminado (Factura C)', n(data.sales.without_vat)],
      ['Total facturado', n(data.sales.total)],
      ['IVA débito fiscal', n(salesVat)],
      ['Ventas sin factura (cantidad)', String(data.unbilled.count)],
      ['Ventas sin factura (total)', n(data.unbilled.total)],
      ['Ventas sin factura (neto estimado)', n(data.unbilled.net_estimate)],
      ...data.purchases.by_rate.flatMap(r => [[`Compras neto gravado ${RATE_LABELS[r.id]}`, n(r.base)], [`Compras IVA ${RATE_LABELS[r.id]}`, n(r.vat)]] as [string, string][]),
      ['Compras no gravado / exento', n(data.purchases.untaxed)],
      ['Compras impuestos internos', n(data.purchases.internal_taxes)],
      ['Compras otros tributos', n(data.purchases.other_taxes)],
      ['Compras total', n(data.purchases.total)],
      ['IVA crédito fiscal', n(purchaseVat)],
      ['Percepciones de IVA sufridas', n(data.purchases.vat_perceptions)],
      ['Saldo de IVA estimado (débito - crédito - percepciones)', n(vatBalance)],
      ['Base Ingresos Brutos (ventas sin IVA)', n(iibbBase)],
      ['Percepciones de IIBB sufridas', n(data.purchases.iibb_perceptions)],
      ...(iibbTax !== null ? [[`IIBB estimado al ${iibbRate.replace('.', ',')}%`, n(iibbTax)], ['IIBB a pagar estimado (menos percepciones)', n(iibbTax - data.purchases.iibb_perceptions)]] as [string, string][] : []),
    ];
    const cell = (text: string) => `"${text.replaceAll('"', '""')}"`;
    downloadCsv('﻿' + [['Concepto', 'Valor'], ...rows].map(r => r.map(cell).join(';')).join('\r\n'), `Resumen_impositivo_${data.month}.csv`);
  };

  return <section className="retail-panel finance-panel" aria-labelledby="tax-summary-title">
    <div className="finance-panel-heading">
      <h3 id="tax-summary-title">Resumen de IVA e Ingresos Brutos</h3>
      <button type="button" className="secondary-button" disabled={!data || loading} onClick={exportCsv}><Download size={15} /> Descargar para el contador</button>
    </div>
    <p className="finance-hint">
      Ayuda para preparar las declaraciones juradas, no las reemplaza: el contador confirma los importes con Mis Comprobantes y el Libro IVA Digital.
    </p>
    <div className="finance-toolbar">
      <label>Mes<input type="month" value={month} disabled={loading} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /></label>
      {loading && <span role="status"><Loader2 size={15} className="spin" /> Calculando…</span>}
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}

    {data && <>
      <h4>IVA</h4>
      <div className="table-scroll"><table className="finance-table">
        <thead><tr><th>Alícuota</th><th className="is-number">Ventas neto</th><th className="is-number">IVA ventas (débito)</th><th className="is-number">Compras neto</th><th className="is-number">IVA compras (crédito)</th></tr></thead>
        <tbody>
          {[...new Set([...data.sales.by_rate, ...data.purchases.by_rate].map(r => r.id))].sort((a, b) => a - b).map(id => {
            const s = data.sales.by_rate.find(r => r.id === id); const p = data.purchases.by_rate.find(r => r.id === id);
            if (!s?.base && !p?.base && !s?.vat && !p?.vat) return null;
            return <tr key={id}><td>{RATE_LABELS[id] || id}</td>
              <td className="is-number">{money(s?.base || 0)}</td><td className="is-number">{money(s?.vat || 0)}</td>
              <td className="is-number">{money(p?.base || 0)}</td><td className="is-number">{money(p?.vat || 0)}</td></tr>;
          })}
          <tr><td>Exento / no gravado</td><td className="is-number">{money(data.sales.exempt)}</td><td /><td className="is-number">{money(data.purchases.untaxed)}</td><td /></tr>
          <tr><th>Total</th><th className="is-number">{money(sum(data.sales.by_rate, 'base'))}</th><th className="is-number">{money(salesVat)}</th>
            <th className="is-number">{money(sum(data.purchases.by_rate, 'base'))}</th><th className="is-number">{money(purchaseVat)}</th></tr>
        </tbody>
      </table></div>
      <ul>
        <li>Percepciones de IVA sufridas en compras: <strong>{money(data.purchases.vat_perceptions)}</strong></li>
        {ri
          ? <li>Saldo de IVA estimado (débito − crédito − percepciones): <strong>{money(vatBalance)}</strong>{vatBalance < 0 ? ' · a favor' : ' · a pagar'}</li>
          : <li>Como {data.condicion_iva === 'MO' ? 'Monotributo' : 'el comercio no es Responsable Inscripto'} no se liquida IVA: el IVA de las compras es costo.</li>}
      </ul>

      <h4>Ingresos Brutos</h4>
      <ul>
        <li>Ventas facturadas sin IVA: <strong>{money(billedNet)}</strong></li>
        <li>Ventas sin factura de la app ({data.unbilled.count}): {money(data.unbilled.total)}{ri ? `, sin IVA estimado ${money(data.unbilled.net_estimate)}` : ''}</li>
        <li>Base imponible estimada: <strong>{money(iibbBase)}</strong></li>
        <li>Percepciones de IIBB sufridas en compras: <strong>{money(data.purchases.iibb_perceptions)}</strong></li>
      </ul>
      <div className="finance-toolbar">
        <label>Alícuota de IIBB (%)<NumberInput value={iibbRate} min={0} max={100} step="0.01" onValueChange={value => { setIibbRate(value); saveRate(value); }} placeholder="Ej: 3,5" /></label>
        {iibbTax !== null && <span>Impuesto estimado {money(iibbTax)} · a pagar menos percepciones <strong>{money(iibbTax - data.purchases.iibb_perceptions)}</strong></span>}
      </div>

      <h4>Para revisar</h4>
      <ul>
        <li>{data.sales.invoices} facturas y {data.sales.credit_notes} notas de crédito emitidas en producción · total facturado {money(data.sales.total)}.</li>
        <li>{data.purchases.count} comprobantes de compra cargados · total {money(data.purchases.total)}{data.purchases.unbalanced ? ` · ${data.purchases.unbalanced} no cierran: revisalos en Proveedores` : ''}.</li>
        {data.unbilled.count > 0 && <li>Hay {data.unbilled.count} ventas del mes sin factura de la app (no se facturan, pendientes o con error). El neto sin IVA usa el IVA actual de cada producto.</li>}
        {data.legacy_invoices > 0 && <li>{data.legacy_invoices} facturas del mes se emitieron antes del registro actual y no entran en este resumen: tomalas de Mis Comprobantes.</li>}
        <li>Las retenciones que te practiquen tus clientes no se cargan en la app: sumalas aparte.</li>
      </ul>
    </>}
  </section>;
}
