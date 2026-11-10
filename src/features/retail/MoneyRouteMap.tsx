import { methodLabels, type Method, type MethodTotals, type MoneyReportAccount } from './reconciliationExport';
import { accountKinds } from './MoneyAccountEditor';
import './money-flow.css';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const ROW = 64, WIDTH = 640, NODE = 210;

/**
 * Recorrido de la plata del período: cada medio de cobro (izquierda) a la cuenta donde entra hoy (derecha).
 * El grosor de cada línea es lo cobrado por ese medio. Un medio sin cuenta va a «Sin cuenta asignada»,
 * que es justo lo que conviene resolver para que el contador pueda comparar con los extractos.
 */
export function MoneyRouteMap({ totals, accounts }: { totals: MethodTotals[]; accounts: MoneyReportAccount[] }) {
  const methods = totals.filter(row => row.total !== 0 || row.salesCount > 0);
  if (!methods.length) return null;
  const active = accounts.filter(account => account.active);
  const target = (method: Method) => active.find(account => account.methods.includes(method));
  const orphans = methods.filter(row => !target(row.method));
  const right = [...active.filter(account => methods.some(row => target(row.method)?.id === account.id)), ...(orphans.length ? [null] : [])];
  const height = Math.max(methods.length, right.length) * ROW;
  const leftY = (index: number) => (height - methods.length * ROW) / 2 + index * ROW + ROW / 2;
  const rightY = (index: number) => (height - right.length * ROW) / 2 + index * ROW + ROW / 2;
  const max = Math.max(...methods.map(row => Math.abs(row.total)), 1);
  const stroke = (value: number) => 3 + (Math.abs(value) / max) * 15;
  const routes = methods.map((row, index) => {
    const account = target(row.method);
    return { row, account, from: leftY(index), to: rightY(right.findIndex(item => (item?.id ?? null) === (account?.id ?? null))) };
  });

  return <figure className="money-route">
    <figcaption>Por dónde entró la plata que no es efectivo <small>El grosor es lo cobrado. Las cuentas se asignan en Plata.</small></figcaption>
    <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={routes.map(route => `${methodLabels[route.row.method]} ${money(route.row.total)} a ${route.account?.name ?? 'sin cuenta asignada'}`).join('; ')}>
      {routes.map(route => <path key={route.row.method} className={route.account ? 'money-route-path' : 'money-route-path is-orphan'}
        d={`M ${NODE} ${route.from} C ${WIDTH / 2} ${route.from}, ${WIDTH / 2} ${route.to}, ${WIDTH - NODE} ${route.to}`} strokeWidth={stroke(route.row.total)} />)}
      {methods.map((row, index) => <g key={row.method} transform={`translate(0 ${leftY(index) - 24})`}>
        <rect className="money-route-node" width={NODE} height="48" rx="12" />
        <text x="14" y="21" className="money-route-name">{methodLabels[row.method]}</text>
        <text x="14" y="38" className="money-route-amount">{money(row.total)}</text>
      </g>)}
      {right.map((account, index) => <g key={account?.id ?? 'none'} transform={`translate(${WIDTH - NODE} ${rightY(index) - 24})`}>
        <rect className={account ? 'money-route-node is-account' : 'money-route-node is-orphan'} width={NODE} height="48" rx="12" />
        <text x="14" y="21" className="money-route-name">{account ? account.name : 'Sin cuenta asignada'}</text>
        <text x="14" y="38" className="money-route-amount">{account ? `${accountKinds[account.kind]} · entró ${money(account.collected)}` : 'Asignale una cuenta a estos medios'}</text>
      </g>)}
    </svg>
    <ul className="money-route-list">{routes.map(route => <li key={route.row.method}><strong>{methodLabels[route.row.method]}</strong> {money(route.row.total)} → {route.account?.name ?? <em>sin cuenta asignada</em>}</li>)}</ul>
  </figure>;
}
