import { DollarSign, Receipt, Package, Calendar } from 'lucide-react';
import type { AiReportPanelState } from './useAiReportPanel';

/** Indicadores calculados sin IA. */
export function AiReportKpis({ state }: { state: AiReportPanelState }) {
  const { metrics } = state;
  return (
    <>
      {/* Numerical KPI Grid (Calculated locally, without IA) */}
      <div className="ai-report-kpi-grid">
        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Facturación sin bajo margen</span>
            <DollarSign size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value accent-green">
            ${metrics.totalRevenue.toLocaleString("es-AR")}
          </div>
          <p className="ai-report-kpi-sub">
            {metrics.totalSalesCount} transacciones en {metrics.periodLabel.toLowerCase()}
          </p>
        </div>

        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Ticket Promedio</span>
            <Receipt size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value">
            ${Math.round(metrics.averageTicket).toLocaleString("es-AR")}
          </div>
          <p className="ai-report-kpi-sub">Gasto promedio por cliente</p>
        </div>

        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Unidades Vendidas</span>
            <Package size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value">{metrics.totalUnitsSold}</div>
          <p className="ai-report-kpi-sub">
            {metrics.topProducts.length > 0
              ? `Líder: ${metrics.topProducts[0].name.slice(0, 18)}`
              : "Sin productos vendidos"}
          </p>
        </div>

        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Turnos Operados</span>
            <Calendar size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value">
            {metrics.shiftsCount} {metrics.shiftsCount === 1 ? "turno" : "turnos"}
          </div>
          <p className="ai-report-kpi-sub">Historial de caja registrado</p>
        </div>
      </div>
    </>
  );
}
