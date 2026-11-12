import type { AIAssistantProps } from './aiAssistantProps';
import { useAiAssistantState } from './useAiAssistantState';
import { useAiSystemPrompt } from './useAiSystemPrompt';
import { useAiAssistantChat } from './useAiAssistantChat';

export type { AIAssistantProps };

/** Todo el estado y las acciones de AIAssistant. */
export function useAiAssistant(props: AIAssistantProps) {
  const s1 = useAiAssistantState(props);
  const s2 = useAiSystemPrompt({ ...props, ...s1 });
  const s3 = useAiAssistantChat({ ...props, ...s1, ...s2 });
  return { ...props, ...s1, ...s2, ...s3 };
}

export type AiAssistantState = ReturnType<typeof useAiAssistant>;
