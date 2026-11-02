import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { errorMessage } from './api';
import { finance, type Expense } from './financeApi';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const pad = (value: number) => String(value).padStart(2, '0');
const shift = (month: string, delta: number) => {
  const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};
const monthLabel = (month: string) => new Date(`${month}-15T12:00:00`).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
const percent = (from: number, to: number) => from > 0 ? Math.round((to - from) / from * 100) : null;
const groupKey = (row: Expense) => `${row.category}|${row.branch_id ?? ''}|${row.description.trim().toLowerCase()}`;

/** Gastos fijos de los últimos 6 meses: el total mes a mes y qué cambió contra el mes anterior. */
export function FixedExpensesTrend({ storeId, month, version }: { storeId: string; month: string; version: unknown }) {
  const [rows, setRows] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const months = useMemo(() => Array.from({ length: 6 }, (_, index) => shift(month, index - 5)), [month]);
  useEffect(() => {
    let alive = true;
    finance.fixedExpenses(storeId, months[0], month).then(data => { if (alive) { setRows(data); setError(''); } })
      .catch(e => { if (alive) setError(errorMessage(e)); });
    return () => { alive = false; };
  }, [storeId, month, months, version]);

  const totals = months.map(id => ({ id, total: rows.filter(row => row.spent_on.startsWith(id)).reduce((sum, row) => sum + row.amount, 0) }));
  const top = Math.max(...totals.map(row => row.total));
  const withData = totals.filter(row => row.total > 0);
  const current = totals[5].total, last = totals[4].total;
  const first = withData[0], change = first && first.id !== month ? percent(first.total, current) : null;
  const items = [...new Set(rows.map(groupKey))].map(key => {
    const same = rows.filter(row => groupKey(row) === key);
    const at = (id: string) => same.filter(row => row.spent_on.startsWith(id)).reduce((sum, row) => sum + row.amount, 0);
    return { key, name: same[0].description, now: at(month), before: at(shift(month, -1)) };
  }).filter(item => item.now > 0 || item.before > 0).sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before));

  if (error) return <p role="alert" className="error-banner">{error}</p>;
  if (!rows.length) return null;
  return <section className="retail-panel finance-panel" aria-label="Evolución de gastos fijos">
    <h3>Cómo vienen tus gastos fijos</h3>
    {withData.length < 2 ? <p className="finance-hint">Con dos meses cargados vas a ver cuánto subieron.</p>
      : <p className="finance-trend-summary">
        {change === null ? `Este mes no hay gastos fijos cargados. El mes anterior fueron ${money(last)}.`
          : change === 0 ? `Se mantienen igual que en ${monthLabel(first.id)}.`
          : `${change > 0 ? 'Subieron' : 'Bajaron'} ${Math.abs(change)}% desde ${monthLabel(first.id)}: de ${money(first.total)} a ${money(current)}.`}
      </p>}
    <ol className="home-week-bars finance-trend-bars">
      {totals.map(row => <li key={row.id} title={`${monthLabel(row.id)}: ${money(row.total)}`}>
        <small>{row.total ? money(row.total) : ' '}</small>
        <span className="home-week-track"><span className="home-week-bar" style={{ height: `${top ? Math.max(row.total ? 4 : 0, row.total / top * 100) : 0}%` }} /></span>
        <small>{monthLabel(row.id)}</small>
        <span className="sr-only">{money(row.total)}</span>
      </li>)}
    </ol>
    {last > 0 && <>
      <h4 className="finance-trend-title">Contra el mes anterior</h4>
      <ul className="finance-trend-items">{items.map(item => {
        const rise = item.now - item.before, share = percent(item.before, item.now);
        return <li key={item.key}>
          <span>{rise > 0 ? <ArrowUp size={15} aria-hidden="true" /> : rise < 0 ? <ArrowDown size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}{item.name}</span>
          <small>{money(item.before)} → {money(item.now)}</small>
          <strong className={rise > 0 ? 'is-up' : rise < 0 ? 'is-down' : undefined}>
            {!item.now ? 'No cargado' : !item.before ? 'Nuevo' : !rise ? 'Igual' : `${rise > 0 ? '+' : '−'}${money(Math.abs(rise))}${share === null ? '' : ` (${share > 0 ? '+' : ''}${share}%)`}`}
          </strong>
        </li>;
      })}</ul>
    </>}
  </section>;
}
