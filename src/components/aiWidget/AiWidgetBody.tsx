import { AlertCircle } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import { AiMarkdownRenderer } from '../AiMarkdownRenderer';
import type { AiAssistantWidgetState } from './useAiAssistantWidget';

/** Respuesta de la IA. */
export function AiWidgetBody({ state }: { state: AiAssistantWidgetState }) {
  const { aiResponse, isAiLoading, aiError, lastQuery, responseAreaRef, handleSendQuery } = state;
  return (
    <>
      {/* Response / Chat Body */}
      <div
        className="ai-omni-body"
        ref={responseAreaRef}
        tabIndex={0}
        role="region"
        aria-label="Contenido del asistente"
      >
        {aiError ? (
          <div className="ai-omni-error" role="alert">
            <AlertCircle size={16} />
            <div>
              <strong>No se pudo completar la consulta</strong>
              <p>{aiError}</p>
              <button type="button" className="secondary-button ai-action" disabled={isAiLoading} onClick={() => void handleSendQuery(lastQuery)}><AiIcon /> Reintentar consulta</button>
            </div>
          </div>
        ) : aiResponse ? (
          <div className="ai-omni-response-card">
            <AiMarkdownRenderer
              content={aiResponse}
              isStreaming={isAiLoading}
            />
          </div>
        ) : isAiLoading ? (
          <div className="ai-omni-loading">
            <AiIcon size={20} className="ai-spin-icon" />
            <span>Analizando datos en tiempo real…</span>
          </div>
        ) : (
          <div className="ai-omni-empty">
            <div className="ai-omni-empty-icon">
              <AiIcon size={26} />
            </div>
            <h4>¿En qué puedo ayudarte?</h4>
            <p>
              Elegí una consulta rápida arriba o escribí lo que necesites
              saber sobre precios, márgenes, combos o stock.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
