import { MarginSummary } from '../features/retail/MarginSummary';
import { useAiReportPanel, type AIReportPanelProps } from './aiReport/useAiReportPanel';
import { AiReportHeader } from './aiReport/AiReportHeader';
import { AiReportKpis } from './aiReport/AiReportKpis';
import { AiReportDetails } from './aiReport/AiReportDetails';
import { AiReportActions } from './aiReport/AiReportActions';
import { AiReportOutput } from './aiReport/AiReportOutput';

/** Reporte del período: métricas locales y análisis con IA. */
export function AIReportPanel(props: AIReportPanelProps) {
  const state = useAiReportPanel(props);
  const { metrics } = state;
  return (
    <div
      className="ai-report-panel-container ai-report-light"
      role="region"
      aria-label="Panel de reportes ejecutivos con IA"
    >
      <AiReportHeader state={state} />

      <MarginSummary summary={metrics.separation} />
      <AiReportKpis state={state} />

      <AiReportDetails state={state} />

      <AiReportActions state={state} />

      <AiReportOutput state={state} />
    </div>
  );
}

export default AIReportPanel;
