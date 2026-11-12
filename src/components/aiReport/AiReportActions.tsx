import { Loader2, Lock, RefreshCw, XCircle } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import type { AiReportPanelState } from './useAiReportPanel';

/** Botones para generar, cortar y copiar el reporte. */
export function AiReportActions({ state }: { state: AiReportPanelState }) {
  const { status, isAuthorized, handleGenerateReport, handleCancel } = state;
  return (
    <>
      {/* Action Bar */}
      <div className="ai-report-action-bar">
        {isAuthorized ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="secondary-button ai-action ai-action-strong"
              onClick={handleGenerateReport}
              disabled={status === "loading" || status === "streaming"}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={18} className="ai-report-loading-spinner" />
                  <span>Conectando con IA…</span>
                </>
              ) : status === "streaming" ? (
                <>
                  <Loader2 size={18} className="ai-report-loading-spinner" />
                  <span>Generando reporte en vivo…</span>
                </>
              ) : (
                <>
                  <AiIcon size={18} />
                  <span>Explicar estos resultados</span>
                </>
              )}
            </button>

            {(status === "loading" || status === "streaming") && (
              <button
                type="button"
                className="ai-report-secondary-btn"
                onClick={handleCancel}
                title="Detener generación"
              >
                <XCircle size={16} />
                <span>Cancelar</span>
              </button>
            )}

            {status === "done" && (
              <button
                type="button"
                className="ai-report-secondary-btn"
                onClick={handleGenerateReport}
                title="Volver a generar el reporte"
              >
                <RefreshCw size={15} />
                <span>Regenerar</span>
              </button>
            )}
          </div>
        ) : (
          <div className="ai-report-role-notice">
            <Lock size={15} />
            <span>
              La generación de reportes ejecutivos con IA está reservada para
              administradores y dueños del comercio.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
