import { Send, Square } from 'lucide-react';
import type { AiAssistantState } from './useAiAssistant';

/** Barra para escribir la pregunta. */
export function AiAssistantInput({ state }: { state: AiAssistantState }) {
  const {
    input, isStreaming, textareaRef, handleSend, handleStopStreaming, handleKeyDown,
    handleTextareaChange,
  } = state;
  return (
    <>
      {/* Bottom Input Bar */}
      <div className="ai-input-bar-container">
        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu consulta…"
            aria-label="Consulta para el asistente"
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              type="button"
              className="ai-stop-btn"
              onClick={handleStopStreaming}
              title="Detener respuesta"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="ai-send-btn ai-action ai-action-strong"
              disabled={!input.trim()}
              aria-label="Enviar consulta al asistente IA"
              title="Enviar mensaje (Enter)"
            >
              <Send size={16} />
            </button>
          )}
        </form>
        <span className="ai-input-hints">
          Enter para enviar · Shift+Enter para una nueva línea
        </span>
      </div>
    </>
  );
}
