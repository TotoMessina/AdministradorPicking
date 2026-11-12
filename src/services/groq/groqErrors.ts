import { GroqError } from '../../types/ai';

// Errores de Groq: cancelación, red y respuestas con error.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GroqError('La solicitud fue cancelada.', 0, 'ABORTED');
}

export function normalizeError(error: unknown, signal?: AbortSignal): GroqError {
  if (error instanceof GroqError) return error;
  if (signal?.aborted || (isRecord(error) && error.name === 'AbortError')) {
    return new GroqError('La solicitud fue cancelada.', 0, 'ABORTED');
  }
  return new GroqError('No se pudo completar la conexión con Groq.', 0, 'NETWORK_ERROR');
}

export function apiError(payload: unknown, status: number, headers?: Headers): GroqError {
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
  const code = typeof error.code === 'string' ? error.code
    : typeof error.type === 'string' ? error.type : `HTTP_${status}`;
  const providerMessage = typeof error.message === 'string' ? error.message : `Groq respondió con un error (${status}).`;
  const message = code === 'model_not_found'
    ? `${providerMessage} Revisá VITE_GROQ_MODEL y elegí un modelo disponible en tu cuenta. Sin esa variable se usa llama-3.1-8b-instant. Reiniciá el servidor local o volvé a desplegar después de cambiarla.`
    : providerMessage;

  let retryAfter: number | undefined;
  const headerVal = headers?.get('retry-after');
  if (headerVal) {
    const parsed = parseFloat(headerVal);
    if (!isNaN(parsed) && parsed > 0) retryAfter = parsed;
  }
  if (!retryAfter) {
    const resetTokens = headers?.get('x-ratelimit-reset-tokens');
    if (resetTokens) {
      const match = resetTokens.match(/([\d\.]+)(m?s)/i);
      if (match) {
        const val = parseFloat(match[1]);
        retryAfter = match[2].toLowerCase() === 'ms' ? val / 1000 : val;
      }
    }
  }
  if (!retryAfter) {
    const match = message.match(/try again in ([\d\.]+)s/i);
    if (match?.[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) retryAfter = parsed;
    }
  }

  return new GroqError(
    message,
    status,
    code,
    retryAfter,
  );
}

/** Uso informado por cada llamada. Lo registra src/lib/aiUsage.ts; este módulo no depende de la base. */
