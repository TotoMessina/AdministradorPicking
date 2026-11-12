import { GroqError } from '../../types/ai';
import { isRecord } from './groqErrors';

// Registro del uso de tokens.
export interface GroqUsageEvent {
  model: string;
  promptTokens: number;
  completionTokens: number;
  ok: boolean;
  errorCode?: string;
}
let usageListener: ((event: GroqUsageEvent) => void) | null = null;
export function setGroqUsageListener(listener: ((event: GroqUsageEvent) => void) | null): void {
  usageListener = listener;
}
export function readUsage(payload: unknown): { promptTokens: number; completionTokens: number } | null {
  const usage = isRecord(payload) ? (isRecord(payload.usage) ? payload.usage : isRecord(payload.x_groq) && isRecord(payload.x_groq.usage) ? payload.x_groq.usage : null) : null;
  if (!usage) return null;
  const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  return { promptTokens: count(usage.prompt_tokens), completionTokens: count(usage.completion_tokens) };
}
// Registrar uso nunca debe cambiar la respuesta ni el error de la IA.
export function reportUsage(model: string, usage: { promptTokens: number; completionTokens: number } | null, error?: unknown): void {
  if (!usageListener) return;
  if (error instanceof GroqError && error.code === 'ABORTED') return;
  try {
    usageListener({
      model, promptTokens: usage?.promptTokens ?? 0, completionTokens: usage?.completionTokens ?? 0, ok: !error,
      ...(error ? { errorCode: error instanceof GroqError ? error.code : 'UNKNOWN' } : {}),
    });
  } catch { /* El registro de uso es secundario. */ }
}
