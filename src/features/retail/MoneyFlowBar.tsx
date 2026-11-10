import './money-flow.css';

export interface FlowPart { id: string; label: string; amount: number; tone: 'cost' | 'expense' | 'fee' | 'loss' | 'profit' }

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const share = (value: number, total: number) => `${Math.max(0, Math.round((value / total) * 1000) / 10)}%`;

/**
 * A dónde fue cada peso vendido: una sola barra que arranca en lo vendido y se reparte entre costo, gastos,
 * comisiones, pérdidas y lo que quedó. Si se gastó más de lo vendido, la barra se alarga y la marca muestra
 * hasta dónde llegaron las ventas. El detalle numérico sigue en las tarjetas; esto es la foto de un vistazo.
 */
export function MoneyFlowBar({ sales, parts }: { sales: number; parts: FlowPart[] }) {
  const shown = parts.filter(part => part.amount > 0);
  const total = Math.max(sales, shown.reduce((sum, part) => sum + part.amount, 0));
  if (!(total > 0)) return null;
  const summary = (total > sales ? `faltaron ${money(total - sales)} para cubrir los costos, ` : '') + shown.map(part => `${part.label} ${money(part.amount)} (${share(part.amount, sales || total)} de lo vendido)`).join(', ');
  return <figure className="money-flow" aria-label={`De ${money(sales)} vendidos: ${summary}`}>
    <figcaption><span>De cada $100 que vendiste</span><strong>{money(sales)} vendidos</strong></figcaption>
    <div className="money-flow-track" aria-hidden="true">
      <span className="money-flow-bar">{shown.map(part => <span key={part.id} className={`money-flow-part is-${part.tone}`} style={{ width: share(part.amount, total) }} title={`${part.label}: ${money(part.amount)}`} />)}</span>
      {total > sales && <span className="money-flow-over" style={{ left: share(sales, total) }} />}
      {total > sales && sales > 0 && <span className="money-flow-mark" style={{ left: share(sales, total) }}><small>Hasta acá llegaron las ventas</small></span>}
    </div>
    <ul className="money-flow-legend">
      {shown.map(part => <li key={part.id}><i className={`is-${part.tone}`} aria-hidden="true" /><span>{part.label}</span>
        <strong>${sales > 0 ? Math.round((part.amount / sales) * 100) : 0}</strong><small>{money(part.amount)}</small></li>)}
      {total > sales && <li><i className="is-deficit" aria-hidden="true" /><span>Faltó para cubrir</span><strong>{money(total - sales)}</strong><small>Se gastó más de lo que se vendió</small></li>}
    </ul>
  </figure>;
}
