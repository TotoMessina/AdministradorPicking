import { useAiAssistant, type AIAssistantProps } from './aiAssistant/useAiAssistant';
import { AiAssistantHeader } from './aiAssistant/AiAssistantHeader';
import { AiAssistantMessages } from './aiAssistant/AiAssistantMessages';
import { AiAssistantInput } from './aiAssistant/AiAssistantInput';

/** Asistente de IA del comercio: chat con contexto de ventas, stock y caja. */
export function AIAssistant(props: AIAssistantProps) {
  const state = useAiAssistant(props);
  return (
    <div className="ai-assistant-container">
      <AiAssistantHeader state={state} />

      <AiAssistantMessages state={state} />

      <AiAssistantInput state={state} />
    </div>
  );
}
