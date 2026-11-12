import { RotateCcw } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import type { AiAssistantState } from './useAiAssistant';

/** Encabezado del asistente. */
export function AiAssistantHeader({ state }: { state: AiAssistantState }) {
  const { store, handleNewConversation } = state;
  return (
    <>
      {/* Header */}
      <header className="ai-assistant-header">
        <div className="ai-header-left">
          <div className="ai-header-icon-badge">
            <AiIcon size={22} />
          </div>
          <div className="ai-header-title-box">
            <div className="ai-header-title">
              <span>Asistente IA del comercio</span>
            </div>
            <span className="ai-header-subtitle">
              {store.name}
            </span>
          </div>
        </div>

        <div className="ai-header-right">
          <button
            type="button"
            className="ai-new-chat-btn"
            onClick={handleNewConversation}
            title="Iniciar nueva conversación y limpiar historial"
          >
            <RotateCcw size={14} />
            <span>Nueva conversación</span>
          </button>
        </div>
      </header>
    </>
  );
}
