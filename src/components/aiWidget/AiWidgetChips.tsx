import { AiIcon } from '../AiIcon';
import type { AiAssistantWidgetState } from './useAiAssistantWidget';

/** Consultas rápidas. */
export function AiWidgetChips({ state }: { state: AiAssistantWidgetState }) {
  const { onOpenFull, isAiLoading, getPresets, handleSendQuery } = state;
  return (
    <>
      {/* Quick Preset Chips */}
      <div className="ai-omni-chips-bar">
        <small>Ayuda opcional generada con IA. Revisá la respuesta antes de tomar decisiones.</small>
        {onOpenFull && <button type="button" className="text-button ai-action" onClick={onOpenFull}><AiIcon /> Abrir análisis completo del comercio</button>}
      </div>
      <div className="ai-omni-chips-bar" aria-label="Consultas rápidas">
        <span className="ai-omni-chips-title">Consultas rápidas</span>
        <div className="ai-omni-chips-wrap">
          {getPresets().map((preset) => (
            <button
              key={preset}
              type="button"
              className="ai-omni-chip ai-action"
              disabled={isAiLoading}
              onClick={() => void handleSendQuery(preset)}
            >
              <AiIcon size={12} />
              <span>{preset}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
