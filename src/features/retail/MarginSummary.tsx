import type { MarginSummary as Summary } from './marginAnalytics';
const money = (n: number) => '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
export function MarginSummary({ summary }: { summary: Summary }) {
  const { standard, lowMargin } = summary;
  return <section className="margin-summary" aria-label="Separación por grupo de margen">
    <div><small>Facturación real (sin bajo margen)</small><strong>{money(standard.revenue)}</strong><span>Ticket promedio: {money(standard.averageTicket)} · Margen: {standard.marginPercent === null ? 'Sin costos suficientes' : `${standard.marginPercent.toFixed(1)}%`}</span></div>
    <div><small>Facturación bajo margen (cigarrillos/cargas)</small><strong>{money(lowMargin.revenue)}</strong><span>Contribución al margen: {summary.lowMarginContributionPercent === null ? 'No disponible' : `${summary.lowMarginContributionPercent.toFixed(1)}%`}</span><span>Margen del rubro: {lowMargin.marginPercent === null ? 'Sin costos suficientes' : `${lowMargin.marginPercent.toFixed(1)}%`}</span></div>
    <p>Facturación total registrada: {money(summary.totalRevenue)} · {summary.totalTickets} tickets. Los indicadores principales excluyen bajo margen. La contribución compara ganancias brutas de ambos grupos.</p>
    {(standard.missingCosts + lowMargin.missingCosts > 0) && <p>Faltan costos en {standard.missingCosts + lowMargin.missingCosts} artículos vendidos. No se consideran ganancia del 100%.</p>}
    {summary.legacyItems > 0 && <p>Las ventas anteriores sin grupo guardado usan la clasificación actual del catálogo.</p>}
  </section>;
}
