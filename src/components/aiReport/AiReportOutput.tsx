import { Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import { AiMarkdownRenderer } from '../AiMarkdownRenderer';
import type { AiReportPanelState } from './useAiReportPanel';

/** Estado y texto del análisis con IA. */
export function AiReportOutput({ state }: { state: AiReportPanelState }) {
  const { status, reportText, errorMessage, copied, metrics, handleGenerateReport, handleCopyClipboard } = state;
  return (
    <>
      {/* AI Output / Status Section */}
      {status === "loading" && (
        <div className="ai-report-output-box">
          <div className="ai-report-loading-box">
            <Loader2 size={32} className="ai-report-loading-spinner" />
            <p>
              Analizando ventas de <strong>{metrics.periodLabel}</strong> y
              consultando con Groq IA…
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="ai-report-error-box" role="alert">
          <AlertCircle size={20} />
          <div className="ai-report-error-body">
            <strong>No se pudo generar el reporte ejecutivo</strong>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="ai-report-retry-btn ai-action"
              onClick={handleGenerateReport}
            >
              <AiIcon /> Reintentar generación
            </button>
          </div>
        </div>
      )}

      {(status === "streaming" || status === "done") && reportText && (
        <div
          className="ai-report-output-box"
          role="region"
          aria-label="Reporte narrativo IA"
        >
          <div className="ai-report-output-header">
            <div className="ai-report-output-title">
              <AiIcon />
              <span>Análisis Estratégico · {metrics.periodLabel}</span>
              <span
                className={`badge-status ${status === "streaming" ? "streaming" : "done"}`}
              >
                {status === "streaming" ? "Streaming…" : "Completado"}
              </span>
            </div>

            <div className="ai-report-output-actions">
              <button
                type="button"
                className={`ai-report-copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopyClipboard}
                title="Copiar reporte completo como texto plano al portapapeles"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "¡Copiado!" : "Copiar reporte"}</span>
              </button>
            </div>
          </div>

          <AiMarkdownRenderer
            content={reportText}
            isStreaming={status === "streaming"}
          />
        </div>
      )}
    </>
  );
}
