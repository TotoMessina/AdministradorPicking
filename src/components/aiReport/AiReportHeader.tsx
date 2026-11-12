import { BarChart3 } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import type { AiReportPanelState } from './useAiReportPanel';

/** Título y selector de período. */
export function AiReportHeader({ state }: { state: AiReportPanelState }) {
  const { storeName, period, setPeriod, status, setStatus } = state;
  return (
    <>
      {/* Header */}
      <div className="ai-report-header">
        <div className="ai-report-title-group">
          <div className="ai-report-badge">
            <AiIcon size={13} />
            <span>Explicación opcional con IA</span>
          </div>
          <h2 className="ai-report-title">
            <BarChart3 size={22} className="ai-report-kpi-icon" />
            <span>Reporte del Negocio</span>
          </h2>
          <p className="ai-report-subtitle">
            {storeName} · Diagnóstico y proyecciones basadas en datos reales
          </p>
        </div>

        {/* Period Selector */}
        <div
          className="ai-report-period-selector"
          role="radiogroup"
          aria-label="Seleccionar período"
        >
          <button
            type="button"
            className={`ai-report-period-btn ${period === "today" ? "active" : ""}`}
            onClick={() => {
              setPeriod("today");
              if (status === "done" || status === "error") setStatus("idle");
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`ai-report-period-btn ${period === "7days" ? "active" : ""}`}
            onClick={() => {
              setPeriod("7days");
              if (status === "done" || status === "error") setStatus("idle");
            }}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            className={`ai-report-period-btn ${period === "month" ? "active" : ""}`}
            onClick={() => {
              setPeriod("month");
              if (status === "done" || status === "error") setStatus("idle");
            }}
          >
            Este mes
          </button>
        </div>
      </div>
    </>
  );
}
