import { X, Trash2 } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import type { AiAssistantWidgetState } from './useAiAssistantWidget';

/** Encabezado del asistente flotante. */
export function AiWidgetHeader({ state }: { state: AiAssistantWidgetState }) {
  const {
    onToggle, aiResponse, isAiLoading, setIsAiLoading, abortControllerRef, clearChat, currentTabInfo,
    TabIcon,
  } = state;
  return (
    <>
      {/* Header */}
      <div className="ai-omni-header">
        <div className="ai-omni-header-info">
          <div className="ai-omni-badge">
            <AiIcon size={13} />
            <span>Asistente IA</span>
          </div>
          <div className="ai-omni-context-pill">
            <TabIcon size={12} />
            <span>{currentTabInfo.label}</span>
          </div>
        </div>

        <div className="ai-omni-header-actions">
          {aiResponse && (
            <button
              type="button"
              className="ai-omni-icon-btn"
              onClick={clearChat}
              aria-label="Limpiar respuesta"
              title="Limpiar respuesta"
              disabled={isAiLoading}
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            type="button"
            className="ai-omni-icon-btn ai-omni-close-btn"
            onClick={() => {
              abortControllerRef.current?.abort();
              setIsAiLoading(false);
              onToggle(false);
            }}
            aria-label="Cerrar asistente"
            title="Cerrar"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
