import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { NumberInput } from '../../components/NumberInput';
import { randomUUID } from '../../utils/uuid';
import { errorMessage, type Branch } from './api';
import { expenseCategories, finance, type Expense, type ExpenseCategory, type ExpenseDraft, type MonthResult } from './financeApi';
import { countReasons, stockCounts, type StockLosses } from './stockCountApi';
import { FixedExpensesTrend } from './FixedExpensesTrend';
import type { Run } from './Management';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const pad = (value: number) => String(value).padStart(2, '0');
const thisMonth = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; };
const today = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; };
const previousMonth = (month: string) => { const [year, number] = month.split('-').map(Number); return number === 1 ? `${year - 1}-12` : `${year}-${pad(number - 1)}`; };
const monthName = (month: string) => new Date(`${month}-15T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
const emptyDraft = (month: string): { amount: string } & Omit<ExpenseDraft, 'amount'> => ({
  spent_on: month === thisMonth() ? today() : `${month}-01`, category: 'servicios', description: '', amount: '', fixed: false, branch_id: null,
});

/** Ganancia del mes: ventas menos costo de lo vendido menos gastos. Solo administración. */
export function FinanceTab({ storeId, branches, busy, run, active }: { storeId: string; branches: Branch[]; busy: boolean; run: Run; active: boolean }) {
  const [month, setMonth] = useState(thisMonth);
  const [result, setResult] = useState<MonthResult | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [previous, setPrevious] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(thisMonth()));
  const [saving, setSaving] = useState(false);
  const [stock, setStock] = useState<StockLosses | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summary, rows, last] = await Promise.all([finance.result(storeId, month), finance.expenses(storeId, month), finance.expenses(storeId, previousMonth(month))]);
      setResult({ ...summary, sales: Number(summary.sales), returns: Number(summary.returns || 0), cost: Number(summary.cost), expenses: Number(summary.expenses), shared_expenses: Number(summary.shared_expenses) });
      setExpenses(rows); setPrevious(last);
      // Sin la actualización de conteos, Ganancias sigue funcionando sin esa línea.
      setStock(await stockCounts.losses(storeId, month).then(row => ({ ...row, losses: Number(row.losses), surplus: Number(row.surplus) })).catch(() => null));
    } catch (e) {
      const message = errorMessage(e);
      setError(/retail_month_result|retail_expenses|schema cache/.test(String((e as Error)?.message)) ? 'Falta aplicar la actualización 202610300007 en Supabase.' : message);
    } finally { setLoading(false); }
  }, [storeId, month]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const gross = result ? result.sales - result.cost : 0;
  const shrink = stock ? stock.losses - stock.surplus : 0;
  const profit = gross - (result?.expenses ?? 0) - shrink;
  const fixedToCopy = useMemo(() => previous.filter(row => row.fixed && !expenses.some(item => item.fixed && item.category === row.category && item.description === row.description && item.branch_id === row.branch_id)), [previous, expenses]);
  const branchName = (id: string | null) => id ? branches.find(branch => branch.id === id)?.name ?? 'Sucursal anterior' : 'Todo el comercio';

  const startNew = () => { setDraft(emptyDraft(month)); setEditing('new'); };
  const startEdit = (row: Expense) => { setDraft({ ...row, amount: String(row.amount) }); setEditing(row.id); };
  const save = async () => {
    if (saving || busy || !editing) return;
    const amount = Number(draft.amount);
    if (!(amount > 0)) { setError('Escribí cuánto se gastó.'); return; }
    setSaving(true); setError('');
    try {
      const id = editing === 'new' ? randomUUID() : editing;
      if (await run(() => finance.save(storeId, id, { ...draft, amount }), 'Gasto guardado')) { setEditing(null); await load(); }
    } finally { setSaving(false); }
  };
  const remove = async (row: Expense) => {
    if (!await askConfirm(`¿Eliminar el gasto «${row.description}» de ${money(row.amount)}?`)) return;
    if (await run(() => finance.remove(storeId, row.id), 'Gasto eliminado')) await load();
  };
  const copyFixed = async () => {
    const day = (row: Expense) => { const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate(); return `${month}-${pad(Math.min(Number(row.spent_on.slice(8)), last))}`; };
    const ok = await run(async () => { for (const { id: _id, ...row } of fixedToCopy) await finance.save(storeId, randomUUID(), { ...row, spent_on: day({ ...row, id: _id }) }); }, 'Gastos fijos copiados');
    if (ok) await load();
  };

  return <div className="finance-tab">
    <div className="finance-toolbar">
      <label>Mes<input type="month" value={month} disabled={loading} onChange={event => { if (event.target.value) { setMonth(event.target.value); setEditing(null); } }} /></label>
      {loading && <span role="status"><Loader2 size={15} className="spin" /> Actualizando…</span>}
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}

    {result && <section className={`finance-hero ${profit >= 0 ? 'is-up' : 'is-down'}`} aria-label="Resultado del mes">
      <span className="finance-hero-icon">{profit >= 0 ? <TrendingUp size={30} aria-hidden="true" /> : <TrendingDown size={30} aria-hidden="true" />}</span>
      <div><small>{profit >= 0 ? `Te quedó en ${monthName(month)}` : `Perdiste en ${monthName(month)}`}</small><strong>{money(Math.abs(profit))}</strong></div>
    </section>}

    {result && <dl className="finance-steps">
      <div><dt>Vendiste</dt><dd>{money(result.sales)}</dd><small>{result.tickets} {result.tickets === 1 ? 'venta' : 'ventas'}{result.returns ? ` · ya descontados ${money(result.returns)} devueltos` : ''}</small></div>
      <div><dt>− Costo de lo vendido</dt><dd>{money(result.cost)}</dd><small>Ganancia bruta {money(gross)}</small></div>
      <div><dt>− Gastos</dt><dd>{money(result.expenses)}</dd><small>{expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}</small></div>
      {stock && (stock.losses > 0 || stock.surplus > 0) && <div><dt>− Pérdidas de stock</dt><dd>{money(shrink)}</dd><small>{stock.by_reason.map(row => `${countReasons[row.reason]} ${money(Number(row.amount))}`).join(' · ') || 'Sin faltantes'}{stock.surplus ? ` · sobrantes ${money(stock.surplus)} ya descontados` : ''}</small></div>}
    </dl>}
    {!!stock?.uncosted_lines && <p className="finance-note">{stock.uncosted_lines} {stock.uncosted_lines === 1 ? 'ajuste de conteo no tiene' : 'ajustes de conteo no tienen'} costo cargado y no suman a las pérdidas.</p>}
    {!!result?.uncosted_lines && <p className="finance-note">{result.uncosted_lines} {result.uncosted_lines === 1 ? 'producto vendido no tiene' : 'productos vendidos no tienen'} costo cargado, así que la ganancia real puede ser menor.</p>}

    {result && result.branches.length > 1 && <section className="retail-panel finance-panel">
      <h3>Por sucursal</h3>
      <div className="table-scroll"><table className="finance-table">
        <thead><tr><th scope="col">Sucursal</th><th scope="col" className="is-number">Ventas</th><th scope="col" className="is-number">Costo</th><th scope="col" className="is-number">Gastos</th><th scope="col" className="is-number">Quedó</th></tr></thead>
        <tbody>{result.branches.map(row => { const rest = Number(row.sales) - Number(row.cost) - Number(row.expenses); return <tr key={row.branch_id}>
          <th scope="row">{branchName(row.branch_id)}</th><td className="is-number">{money(Number(row.sales))}</td><td className="is-number">{money(Number(row.cost))}</td><td className="is-number">{money(Number(row.expenses))}</td><td className={`is-number ${rest < 0 ? 'is-negative' : ''}`}><strong>{money(rest)}</strong></td>
        </tr>; })}</tbody>
      </table></div>
      {result.shared_expenses > 0 && <small>Sin repartir entre sucursales: {money(result.shared_expenses)} de gastos de todo el comercio.</small>}
    </section>}

    <section className="retail-panel finance-panel">
      <div className="finance-panel-heading"><h3>Gastos del mes</h3>
        {editing === null && <button type="button" className="primary-button" disabled={busy} onClick={startNew}><Plus size={16} /> Agregar gasto</button>}
      </div>
      <p className="finance-hint">Alquiler, luz, sueldos, impuestos. La mercadería no va acá: ya se cuenta en el costo de lo vendido.</p>
      {editing === null && fixedToCopy.length > 0 && <div className="info-banner" role="status"><span>{fixedToCopy.length} {fixedToCopy.length === 1 ? 'gasto fijo' : 'gastos fijos'} de {monthName(previousMonth(month))} {fixedToCopy.length === 1 ? 'no está cargado' : 'no están cargados'} este mes.</span><button type="button" className="secondary-button" disabled={busy} onClick={() => void copyFixed()}>Copiarlos</button></div>}
      {editing !== null && <form className="retail-form finance-form" onSubmit={event => { event.preventDefault(); void save(); }}>
        <label>¿En qué se gastó?<input required maxLength={300} value={draft.description} placeholder="Ej. Alquiler del local" onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
        <label>Monto ($)<NumberInput required min={0.01} step={0.01} value={draft.amount} onValueChange={amount => setDraft({ ...draft, amount })} /></label>
        <label>Tipo<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as ExpenseCategory })}>{Object.entries(expenseCategories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Fecha<input type="date" required value={draft.spent_on} onChange={event => setDraft({ ...draft, spent_on: event.target.value })} /></label>
        {branches.length > 1 && <label>Sucursal<select value={draft.branch_id ?? ''} onChange={event => setDraft({ ...draft, branch_id: event.target.value || null })}><option value="">Todo el comercio</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
        <label className="finance-check"><input type="checkbox" checked={draft.fixed} onChange={event => setDraft({ ...draft, fixed: event.target.checked })} />Se repite todos los meses</label>
        <div className="finance-actions">
          <button className="primary-button" disabled={saving || busy}>{saving ? 'Guardando…' : 'Guardar gasto'}</button>
          <button type="button" className="text-button" disabled={saving} onClick={() => setEditing(null)}>Cancelar</button>
        </div>
      </form>}
      {!expenses.length && !loading && editing === null && <p className="finance-hint">Todavía no cargaste gastos este mes.</p>}
      {expenses.length > 0 && <ul className="finance-expenses">{expenses.map(row => <li key={row.id}>
        <span><strong>{row.description}</strong><small>{expenseCategories[row.category]} · {row.spent_on.split('-').reverse().join('/')}{branches.length > 1 ? ` · ${branchName(row.branch_id)}` : ''}{row.fixed ? ' · Fijo' : ''}</small></span>
        <strong className="finance-amount">{money(row.amount)}</strong>
        <button type="button" className="icon-button" disabled={busy} aria-label={`Editar ${row.description}`} onClick={() => startEdit(row)}><Pencil size={15} /></button>
        <button type="button" className="icon-button" disabled={busy} aria-label={`Eliminar ${row.description}`} onClick={() => void remove(row)}><Trash2 size={15} /></button>
      </li>)}</ul>}
    </section>
    {active && <FixedExpensesTrend storeId={storeId} month={month} version={expenses} />}
  </div>;
}
