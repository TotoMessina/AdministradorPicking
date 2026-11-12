import { Send } from 'lucide-react';
import type { AiAssistantWidgetState } from './useAiAssistantWidget';

/** Campo para escribir la consulta. */
export function AiWidgetInput({ state }: { state: AiAssistantWidgetState }) {
  const { aiPrompt, setAiPrompt, isAiLoading, inputRef, handleSendQuery } = state;
  return (
    <>
      {/* Footer Input */}
      <form
        className="ai-omni-footer"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendQuery(aiPrompt);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Preguntale al asistente..."
          readOnly={isAiLoading}
          aria-label="Pregunta para el asistente IA"
        />
        <button
          type="submit"
          className="primary-button ai-omni-send-btn ai-action ai-action-strong"
          disabled={isAiLoading || !aiPrompt.trim()}
          aria-label="Enviar pregunta"
          title="Enviar"
        >
          <Send size={14} />
          <span>Enviar</span>
        </button>
      </form>
    </>
  );
}
