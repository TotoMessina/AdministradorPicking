import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage } from './api';
import type { Run } from './Management';
import { ReconciliationDetail } from './ReconciliationDetail';
import { MoneyMovementsReport, isOwnAccountMove } from './MoneyMovementsReport';
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

  return <section className="retail-panel bank-reconciliation" aria-labelledby="bank-title">
    <div className="section-heading"><div><h2 id="bank-title">Conciliación</h2>
      <p>Lo cobrado por QR, tarjetas y transferencias, tus cuentas y los retiros con su origen, para enviarle a tu contador. El efectivo de las ventas se controla en el arqueo de cada caja.</p></div>
      <div className="bank-heading-actions">
        <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
        <button type="button" className="primary-button" disabled={exporting || loading || !totals || !active} onClick={() => void exportReport()}>
          {exporting ? <><Loader2 size={15} className="spin" /> Armando el Excel…</> : <><FileSpreadsheet size={15} /> Descargar Excel para el contador</>}</button>
      </div>
    </div>
    <div className="bank-period">
      <label>Ventas desde<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
      <label>Hasta<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Calculando…</p>}
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
    {totals && <p className="bank-note">Total cobrado por QR, tarjetas y transferencias en el período: <strong>{money(grand)}</strong>. En una venta mixta se cuenta en cada medio solo su parte. Los movimientos entre cuentas propias no se suman al cobrado.</p>}
    {totals && detail && <ReconciliationDetail key={detail} storeId={storeId} method={detail} label={methodLabels[detail]} from={from} to={to} onClose={() => setDetail(null)} />}
    <MoneyMovementsReport storeId={storeId} from={from} to={to} active={active} onLoaded={setMoneyReport} focus={ownFocus} />
  </section>;
}
