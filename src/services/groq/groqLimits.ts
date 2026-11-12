import { GroqError } from '../../types/ai';
import { DEFAULT_MODEL, BASE_SYSTEM_PROMPT } from './groqConfig';

// Límites: modelo de respaldo, tamaño de pedido y espera por límite de uso.
export const FALLBACK_FAST_MODEL = DEFAULT_MODEL === 'qwen/qwen3.8-27b' ? 'llama-3.1-8b-instant' : 'qwen/qwen3.8-27b';

export function isRateLimitError(err: unknown): boolean {
  if (err instanceof GroqError) {
    if (err.status === 429 || err.code === 'rate_limit_exceeded') return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('rate_limit') ||
      msg.includes('tokens per minute') ||
      msg.includes('tpm') ||
      msg.includes('otpm') ||
      msg.includes('itpm') ||
      msg.includes('request too large') ||
      msg.includes('rate limit') ||
      msg.includes('try again in') ||
      msg.includes('429')
    );
  }
  return false;
}

/**
 * Groq checks input plus requested output against the per-minute token limit (8.000 on qwen/qwen3.8-27b).
 * A request above it is rejected every time, so waiting never fixes it.
 */
export const REQUEST_TOKEN_BUDGET = 7200;

/** Conservative estimate (Spanish text, JSON and amounts), including the base system prompt. */
export function estimateTokens(text: string): number {
  return Math.ceil((text.length + BASE_SYSTEM_PROMPT.length) / 3);
}

export function isRequestTooLarge(err: unknown): boolean {
  return err instanceof GroqError && (err.status === 413 || err.code === 'request_too_large'
    || /request too large|reduce your message size/i.test(err.message));
}

export function getRetryDelay(err: unknown, defaultSecs = 3): number {
  if (err instanceof GroqError && err.retryAfter && err.retryAfter > 0) {
    return Math.max(1, Math.ceil(err.retryAfter));
  }
  if (err instanceof Error) {
    const match = err.message.match(/try again in ([\d\.]+)s/i);
    if (match?.[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) return Math.max(1, Math.ceil(val));
    }
  }
  return defaultSecs;
}
