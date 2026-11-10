import { useCallback, useEffect, useState } from 'react';
import { CircleHelp, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage } from './api';
import type { Run } from './Management';
import { ReconciliationDetail } from './ReconciliationDetail';
import { MoneyMovementsReport, isOwnAccountMove } from './MoneyMovementsReport';
import { MoneyRouteMap } from './MoneyRouteMap';
import { downloadAccountantReport, methodLabels, methods, type Method, type MethodTotals, type MoneyReport } from './reconciliationExport';
import './bank-reconciliation.css';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const zone = 'America/Argentina/Buenos_Aires';
const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const missing = (message: string) => /retail_reconciliation_detail|schema cache/.test(message) ? 'Falta aplicar la actualización 202611040004 en Supabase.' : message;

/**
 * Informe para el contador: acumulado de lo cobrado por QR, tarjetas y transferencias en el período, con sus
 * movimientos. El contador concilia con los extractos; acá no se cargan acreditaciones ni comisiones.
 * El efectivo sigue en el arqueo de cada caja.
 */
export function BankReconciliation({ storeId, active }: { storeId: string; run?: Run; busy?: boolean; active: boolean }) {
  const today = day(new Date());
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [totals, setTotals] = useState<MethodTotals[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Method | null>(null);
  const [moneyReport, setMoneyReport] = useState<MoneyReport | null>(null);
  const [ownFocus, setOwnFocus] = useState(0);

  const load = useCallback(async () => {
    if (to < from) { setError('«Hasta» no puede ser anterior a «Desde».'); return; }
    setLoading(true);
    try {
      // Solo los totales: el detalle de cada medio se pide al abrirlo.
      const results = await Promise.all(methods.map(async method => {
        const { data, error: rpcError } = await supabase.rpc('retail_reconciliation_detail', { p_store: storeId, p_from: from, p_to: to, p_method: method, p_limit: 1 });
        if (rpcError) throw rpcError;
        const value = data as Record<string, number>;
        return { method, total: Number(value.total), sales: Number(value.sales), salesCount: Number(value.sales_count), refunds: Number(value.refunds),
          refundsCount: Number(value.refunds_count), collections: Number(value.collections), collectionsCount: Number(value.collections_count) };
      }));
      setTotals(results); setError('');
    } catch (e) { setError(missing(errorMessage(e))); }
    finally { setLoading(false); }
  }, [storeId, from, to]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const exportReport = async () => {
    setExporting(true);
    try { await downloadAccountantReport(storeId, from, to); setError(''); }
    catch (e) { setError(missing(errorMessage(e))); }
    finally { setExporting(false); }
  };
  const grand = totals?.reduce((sum, row) => sum + row.total, 0) ?? 0;
  // Movimientos entre cuentas propias: no son cobros, se muestran junto a los medios para ver todo en una pantalla.
  const ownMoves = moneyReport?.rows.filter(isOwnAccountMove) ?? [];
  const ownTotal = ownMoves.reduce((sum, row) => sum + row.amount, 0);

  const withdrawals = -(moneyReport?.rows.filter(row => row.kind === 'withdrawal').reduce((sum, row) => sum + row.amount, 0) ?? 0);
  const [year, month] = today.split('-').map(Number);
  const lastMonthEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
  const presets = [
    { id: 'month', label: 'Este mes', from: `${today.slice(0, 7)}-01`, to: today },
    { id: 'last', label: 'Mes pasado', from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd },
  ];
  const preset = presets.find(item => item.from === from && item.to === to)?.id;

  return <section className="retail-panel bank-reconciliation" aria-labelledby="bank-title">
    <div className="section-heading"><div><h2 id="bank-title">Para el contador</h2>
      <p>Todo lo que entró sin ser efectivo (QR, tarjetas y transferencias) y lo que se movió en tus cuentas, listo para mandarle a tu contador en Excel. El efectivo se controla al cerrar cada caja.</p></div>
      <div className="bank-heading-actions">
        <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
        <button type="button" className="primary-button" disabled={exporting || loading || !totals || !active} onClick={() => void exportReport()}>
          {exporting ? <><Loader2 size={15} className="spin" /> Armando el Excel…</> : <><FileSpreadsheet size={15} /> Descargar Excel para el contador</>}</button>
      </div>
    </div>
    <details className="bank-help"><summary><CircleHelp size={14} aria-hidden="true" /> ¿Qué hace el contador con esto?</summary>
      <p>Compara estos totales con los resúmenes de tu banco y de tu billetera (Mercado Pago, por ejemplo). Si lo cobrado por QR acá coincide con lo que entró en la cuenta, está todo bien. Si no, con «Ver movimientos» encontrás qué venta falta o sobra.</p>
      <p>Mandale el Excel una vez por mes: trae cada venta, devolución y cobro de fiado por medio de pago, tus cuentas y de dónde salió cada retiro.</p>
    </details>
    <div className="bank-period" role="group" aria-label="Período">
      <div className="bank-presets">{presets.map(item => <button key={item.id} type="button" className="secondary-button" aria-pressed={preset === item.id}
        onClick={() => { setFrom(item.from); setTo(item.to); }}>{item.label}</button>)}</div>
      <label>Desde<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
      <label>Hasta<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Calculando…</p>}
    {totals && <div className="bank-summary" role="group" aria-label="Resumen del período">
      <div><small>Cobraste sin efectivo</small><strong>{money(grand)}</strong><span>QR, tarjetas y transferencias</span></div>
      {moneyReport && <div><small>Salió de cajas y cuentas</small><strong>{money(withdrawals)}</strong><span>Retiros, pagos y salidas</span></div>}
      {moneyReport && <div><small>Pasaste entre tus cuentas</small><strong>{money(ownTotal)}</strong><span>{ownMoves.length} {ownMoves.length === 1 ? 'movimiento' : 'movimientos'} · no es cobro</span></div>}
    </div>}
    {totals && <h3 className="bank-step">1. Cuánto cobraste por cada medio</h3>}
    {totals && <div className="bank-methods">{totals.map(row => <article key={row.method} className={`bank-method ${detail === row.method ? 'is-selected' : ''}`}>
      <h3>{methodLabels[row.method]}</h3>
      <dl>
        <div><dt>Ventas ({row.salesCount})</dt><dd>{money(row.sales)}</dd></div>
        {row.refundsCount > 0 && <div><dt>Devoluciones ({row.refundsCount})</dt><dd>{money(row.refunds)}</dd></div>}
        {row.collectionsCount > 0 && <div><dt>Cobros de fiado ({row.collectionsCount})</dt><dd>{money(row.collections)}</dd></div>}
        <div className="bank-method-total"><dt>Total cobrado</dt><dd>{money(row.total)}</dd></div>
      </dl>
      <button type="button" className="secondary-button bank-method-detail" aria-expanded={detail === row.method} disabled={!row.salesCount && !row.refundsCount && !row.collectionsCount}
        onClick={() => setDetail(detail === row.method ? null : row.method)}>{detail === row.method ? 'Ocultar movimientos' : 'Ver movimientos'}</button>
    </article>)}
      {moneyReport && <article className="bank-method bank-method-own">
        <h3>Entre cuentas propias</h3>
        <dl>
          <div><dt>Movimientos</dt><dd>{ownMoves.length}</dd></div>
          {ownMoves.some(row => row.status === 'in_transit') && <div><dt>En camino</dt><dd>{money(ownMoves.filter(row => row.status === 'in_transit').reduce((sum, row) => sum + row.amount, 0))}</dd></div>}
          <div className="bank-method-total"><dt>Total movido</dt><dd>{money(ownTotal)}</dd></div>
        </dl>
        <small>Depósitos, pases entre banco y billetera y retiros a efectivo propio. No suman como cobro.</small>
        <button type="button" className="secondary-button bank-method-detail" disabled={!ownMoves.length} onClick={() => setOwnFocus(value => value + 1)}>Ver movimientos</button>
      </article>}
    </div>}
    {totals && moneyReport && <MoneyRouteMap totals={totals} accounts={moneyReport.accounts} />}
    {totals && <p className="bank-note">En una venta mixta (por ejemplo, parte efectivo y parte QR) cada medio suma solo su parte.</p>}
    {totals && detail && <ReconciliationDetail key={detail} storeId={storeId} method={detail} label={methodLabels[detail]} from={from} to={to} onClose={() => setDetail(null)} />}
    <MoneyMovementsReport storeId={storeId} from={from} to={to} active={active} onLoaded={setMoneyReport} focus={ownFocus} />
  </section>;
}
