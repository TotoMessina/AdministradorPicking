import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import { errorMessage } from './api';
import { fetchMoneyReport, moneyKindLabels, type MoneyReport, type MoneyRow } from './reconciliationExport';
import { accountKinds, accountMethodLabels } from './MoneyAccountEditor';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const zone = 'America/Argentina/Buenos_Aires';
const when = (at: string) => new Date(at).toLocaleString('es-AR', { timeZone: zone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Cuentas de banco o billetera y los retiros y movimientos de plata del período, con su origen:
 * efectivo de una caja, fondo de sucursal o depósito, o una cuenta. Para la conciliación del contador.
 */
/** Envíos entre cuentas propias (banco, billetera) o entre una cuenta y el efectivo de sucursal o depósito. No son ingresos. */
export const isOwnAccountMove = (row: MoneyRow) => row.origin === 'fund' && row.kind === 'transfer' && row.source_kind === 'account' && row.status !== 'returned';

export function MoneyMovementsReport({ storeId, from, to, active, onLoaded, focus }: {
  storeId: string; from: string; to: string; active: boolean;
  /** Avisa el informe cargado, para mostrar el resumen de cuentas propias junto a los medios de cobro. */
  onLoaded?: (report: MoneyReport | null) => void;
  /** Cada cambio filtra la tabla a los movimientos entre cuentas propias y la muestra. */
  focus?: number;
}) {
  const [report, setReport] = useState<MoneyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('all');
  const [kind, setKind] = useState<'all' | 'withdrawal' | 'income' | 'transfer'>('withdrawal');
  const tableRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(onLoaded);
  loaded.current = onLoaded;
  useEffect(() => {
    if (!focus) return;
    setKind('transfer'); setOrigin('accounts');
    requestAnimationFrame(() => { tableRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); tableRef.current?.focus({ preventScroll: true }); });
  }, [focus]);

  const load = useCallback(async () => {
    if (to < from) return;
    setLoading(true);
    try { const value = await fetchMoneyReport(storeId, from, to); setReport(value); loaded.current?.(value); setError(''); }
    catch (e) { loaded.current?.(null); setError(/retail_money_movements_report|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611040007 en Supabase para ver cuentas y retiros.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [storeId, from, to]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const origins = useMemo(() => [...new Set((report?.rows || []).map(row => row.source || row.destination).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')), [report]);
  const rows = (report?.rows || []).filter(row => (kind === 'all' || row.kind === kind)
    && (origin === 'all' || (origin === 'cash' ? row.source_kind === 'cash' : origin === 'accounts' ? row.source_kind === 'account' && (kind !== 'transfer' || isOwnAccountMove(row)) : row.source === origin || row.destination === origin)));
  // Retiros por origen: cuánto salió de cada lugar en el período.
  const bySource = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of report?.rows || []) if (row.kind === 'withdrawal' && row.source) totals.set(row.source, (totals.get(row.source) || 0) - row.amount);
    return [...totals].sort((a, b) => b[1] - a[1]);
  }, [report]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return <section className="money-report" aria-labelledby="money-report-title">
    <h3 id="money-report-title"><Landmark size={17} aria-hidden="true" /> Cuentas y retiros</h3>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && !report && <p role="status"><Loader2 size={15} className="spin" /> Cargando cuentas y retiros…</p>}
    {report && <>
      {report.accounts.length ? <div className="money-report-accounts">{report.accounts.map(account => <article key={account.id} className={account.active ? '' : 'is-archived'}>
        <h4>{account.name}</h4>
        <small>{accountKinds[account.kind]}{account.methods.length ? ` · cobra ${account.methods.map(method => accountMethodLabels[method]).join(', ')}` : ''}{account.active ? '' : ' · archivada'}</small>
        <dl>
          <div><dt>Cobrado en el período</dt><dd>{money(account.collected)}</dd></div>
          <div><dt>Saldo actual</dt><dd className={account.balance < 0 ? 'is-negative' : ''}>{money(account.balance)}</dd></div>
        </dl>
      </article>)}</div>
        : <p className="bank-note">Todavía no hay cuentas. Creá tu banco o billetera en <strong>Productos y stock → Transferencias → Dinero → Cuenta</strong>: lo cobrado por sus medios suma solo y desde ahí registrás retiros.</p>}

      {bySource.length > 0 && <p className="money-report-sources" role="status">Retiros del período: {bySource.map(([name, amount]) => `${name} ${money(amount)}`).join(' · ')}</p>}
      <div className="money-report-filters">
        <label>Tipo<select value={kind} onChange={event => setKind(event.target.value as typeof kind)}>
          <option value="withdrawal">Retiros y salidas</option><option value="income">Ingresos</option><option value="transfer">Envíos entre ubicaciones y cuentas propias</option><option value="all">Todo</option>
        </select></label>
        <label>Origen o destino<select value={origin} onChange={event => setOrigin(event.target.value)}>
          <option value="all">Todos</option><option value="cash">Efectivo de las cajas</option><option value="accounts">Cuentas de banco o billetera</option>
          {origins.map(name => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <small>{rows.length} {rows.length === 1 ? 'movimiento' : 'movimientos'} · {money(total)}</small>
      </div>
      <div ref={tableRef} className="bank-detail-table" role="region" aria-label="Retiros y movimientos de plata" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Sale de</th><th scope="col">Va a</th><th scope="col" className="num">Importe</th><th scope="col">Motivo</th><th scope="col">Quién</th></tr></thead>
          <tbody>{rows.length ? rows.map(row => <tr key={`${row.origin}-${row.id}`} className={row.amount < 0 ? 'is-negative' : undefined}>
            <td>{when(row.at)}</td>
            <td>{moneyKindLabels(row)}</td>
            <td>{row.source || <span className="activity-muted">Exterior</span>}</td>
            <td>{row.destination || <span className="activity-muted">Exterior</span>}</td>
            <td className="num"><strong>{money(row.amount)}</strong></td>
            <td className="money-report-note">{row.supplier_name ? `${row.supplier_name} · ` : ''}{row.note}</td>
            <td>{row.actor || '—'}</td>
          </tr>) : <tr><td colSpan={7} className="bank-detail-empty">Sin movimientos con estos filtros.</td></tr>}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
