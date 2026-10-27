import { GroqError, type GroqMessage, type GroqOptions } from '../types/ai';

export { GroqError } from '../types/ai';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = import.meta.env?.VITE_GROQ_MODEL?.trim() || 'llama-3.1-8b-instant';
const BASE_SYSTEM_PROMPT =
  'Sos un asistente para la administración de comercios. Respondé por defecto ' +
  'en español rioplatense informal, usando vos y expresiones como che o dale ' +
  'de forma natural, sin forzarlas. Sé claro, amable y concreto. No inventes ' +
  'datos del negocio; si falta información, indicá qué necesitás.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GroqError('La solicitud fue cancelada.', 0, 'ABORTED');
}

function normalizeError(error: unknown, signal?: AbortSignal): GroqError {
  if (error instanceof GroqError) return error;
  if (signal?.aborted || (isRecord(error) && error.name === 'AbortError')) {
    return new GroqError('La solicitud fue cancelada.', 0, 'ABORTED');
  }
  return new GroqError('No se pudo completar la conexión con Groq.', 0, 'NETWORK_ERROR');
}

function apiError(payload: unknown, status: number, headers?: Headers): GroqError {
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

export const FALLBACK_FAST_MODEL = 'llama-3.1-8b-instant';

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

function parseJSON(text: string, status: number): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new GroqError('Groq devolvió una respuesta JSON inválida.', status, 'INVALID_RESPONSE');
  }
}

async function request(
  messages: readonly GroqMessage[],
  options: GroqOptions,
  stream: boolean,
): Promise<Response> {
  checkAbort(options.signal);
  // VITE_* is public in the browser bundle. Use a server-side proxy in production.
  const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
  if (!apiKey) throw new GroqError('Configurá VITE_GROQ_API_KEY para usar el asistente.', 0, 'MISSING_API_KEY');
  if (!Array.isArray(messages) || messages.length === 0 || messages.some(message =>
    !message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string',
  )) throw new GroqError('Enviá al menos un mensaje con rol y contenido válidos.', 0, 'INVALID_MESSAGES');
  if ((options.model !== undefined && !options.model.trim()) ||
    (options.temperature !== undefined && (!Number.isFinite(options.temperature) || options.temperature < 0 || options.temperature > 2)) ||
    (options.maxTokens !== undefined && (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0)) ||
    (options.responseFormat !== undefined && options.responseFormat !== 'json_object')) {
    throw new GroqError('Revisá el modelo, la temperatura (0 a 2) y el máximo de tokens (entero positivo).', 0, 'INVALID_OPTIONS');
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: stream ? 'text/event-stream' : 'application/json',
    },
    signal: options.signal,
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages: [{ role: 'system', content: BASE_SYSTEM_PROMPT }, ...messages],
      temperature: options.temperature,
      // Groq deprecates max_tokens in favor of max_completion_tokens. Default to 500 to stay well within free tier OTPM limits.
      max_completion_tokens: options.maxTokens ?? 500,
      ...(options.responseFormat ? { response_format: { type: options.responseFormat } } : {}),
      stream,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { /* Proxies can return non-JSON errors. */ }
    throw apiError(payload, response.status, response.headers);
  }
  return response;
}

/** Stateless completion. Prepends the base system prompt without modifying messages. */
export async function groqChat(
  messages: readonly GroqMessage[],
  options: GroqOptions = {},
): Promise<string> {
  try {
    const response = await request(messages, options, false);
    const payload = parseJSON(await response.text(), response.status);
    checkAbort(options.signal);
    if (isRecord(payload) && payload.error) throw apiError(payload, response.status);
    const first = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
    if (!isRecord(first) || !isRecord(first.message) || typeof first.message.content !== 'string') {
      throw new GroqError('Groq no devolvió una respuesta de texto.', response.status, 'INVALID_RESPONSE');
    }
    if (options.responseFormat && first.finish_reason === 'length')
      throw new GroqError('La respuesta JSON alcanzó su límite de salida y quedó incompleta.', response.status, 'OUTPUT_TRUNCATED');
    return first.message.content;
  } catch (error) {
    throw normalizeError(error, options.signal);
  }
}

/** Streams SSE content deltas. Rejects on truncated streams; releases the reader on every exit. */
export async function groqStream(
  messages: readonly GroqMessage[],
  onChunk: (text: string) => void,
  options: GroqOptions = {},
): Promise<void> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await request(messages, options, true);
    if (!response.body) throw new GroqError('Groq no devolvió un stream.', response.status, 'MISSING_STREAM');
    if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
      await response.body.cancel();
      throw new GroqError('Groq no devolvió eventos SSE.', response.status, 'INVALID_STREAM');
    }
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let dataLines: string[] = [];
    let done = false;

    const dispatch = () => {
      if (!dataLines.length || done) return;
      const data = dataLines.join('\n');
      dataLines = [];
      if (data.trim() === '[DONE]') { done = true; return; }
      const payload = parseJSON(data, response.status);
      if (isRecord(payload) && payload.error) throw apiError(payload, response.status);
      if (!isRecord(payload) || !Array.isArray(payload.choices)) {
        throw new GroqError('Groq devolvió un evento inválido.', response.status, 'INVALID_RESPONSE');
      }
      // Usage-only events have no choices; role/finish events have no content.
      for (const choice of payload.choices) {
        if (!isRecord(choice) || choice.index !== 0 || !isRecord(choice.delta)) continue;
        const text = choice.delta.content;
        if (text === undefined || text === null || text === '') continue;
        if (typeof text !== 'string') throw new GroqError('Delta de texto inválido.', response.status, 'INVALID_RESPONSE');
        checkAbort(options.signal);
        try { onChunk(text); } catch {
          throw new GroqError('No se pudo procesar el fragmento recibido.', 0, 'CALLBACK_ERROR');
        }
      }
    };

    const line = (value: string) => {
      if (value === '') { dispatch(); return; }
      // Ignore SSE comments, IDs, retry and event names.
      if (value === 'data') dataLines.push('');
      else if (value.startsWith('data:')) dataLines.push(value.slice(5).replace(/^ /, ''));
    };

    const consume = (eof = false) => {
      while (!done) {
        const match = /[\r\n]/.exec(buffer);
        if (!match) break;
        const index = match.index;
        // A CRLF pair can be split between network chunks.
        if (buffer[index] === '\r' && index === buffer.length - 1 && !eof) break;
        const width = buffer[index] === '\r' && buffer[index + 1] === '\n' ? 2 : 1;
        const value = buffer.slice(0, index);
        buffer = buffer.slice(index + width);
        line(value);
      }
      if (eof && !done) {
        if (buffer) { line(buffer); buffer = ''; }
        dispatch();
      }
    };

    while (!done) {
      checkAbort(options.signal);
      const next = await reader.read();
      checkAbort(options.signal);
      buffer += decoder.decode(next.value, { stream: !next.done });
      consume(next.done);
      if (next.done) break;
    }
    checkAbort(options.signal);
    if (!done) throw new GroqError('La respuesta de Groq se interrumpió antes de finalizar.', response.status, 'INCOMPLETE_STREAM');
  } catch (error) {
    throw normalizeError(error, options.signal);
  } finally {
    if (reader) {
      try { await reader.cancel(); } catch { /* The connection may already be closed. */ }
      reader.releaseLock();
    }
  }
}
