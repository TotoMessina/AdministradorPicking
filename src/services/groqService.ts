import { GroqError, type GroqMessage, type GroqOptions } from '../types/ai';
import { ENDPOINT, DEFAULT_MODEL, BASE_SYSTEM_PROMPT } from './groq/groqConfig';
import { isRecord, checkAbort, normalizeError, apiError } from './groq/groqErrors';
import { readUsage, reportUsage } from './groq/groqUsage';
import { FALLBACK_FAST_MODEL } from './groq/groqLimits';

// Partes de este servicio, reexportadas para no cambiar los imports.
export * from './groq/groqConfig';
export * from './groq/groqUsage';
export * from './groq/groqLimits';

export { GroqError } from '../types/ai';

function parseJSON(text: string, status: number): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new GroqError('Groq devolvió una respuesta JSON inválida.', status, 'INVALID_RESPONSE');
  }
}

/**
 * Servidor de IA (función ai-proxy de Supabase). Lo configura src/lib/aiUsage.ts; este módulo no depende de la base.
 * Se usa cuando la app no tiene VITE_GROQ_API_KEY: así la clave de Groq queda solo en el servidor.
 */
export interface GroqProxy {
  url: string;
  headers: () => Promise<Record<string, string>>;
  /** Datos que el servidor necesita para autorizar y registrar: comercio y pantalla. */
  extra: () => Record<string, unknown>;
}
let proxy: GroqProxy | null = null;
export function setGroqProxy(next: GroqProxy | null): void {
  proxy = next;
}

export async function request(
  messages: readonly GroqMessage[],
  options: GroqOptions,
  stream: boolean,
): Promise<Response> {
  checkAbort(options.signal);
  // VITE_* es público en el navegador: sin esa clave se usa el servidor de IA, que guarda la suya como secreto.
  const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
  const server = apiKey ? null : proxy;
  if (!apiKey && !server) throw new GroqError('Configurá VITE_GROQ_API_KEY para usar el asistente.', 0, 'MISSING_API_KEY');
  if (!Array.isArray(messages) || messages.length === 0 || messages.some(message =>
    !message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string',
  )) throw new GroqError('Enviá al menos un mensaje con rol y contenido válidos.', 0, 'INVALID_MESSAGES');
  if ((options.model !== undefined && !options.model.trim()) ||
    (options.temperature !== undefined && (!Number.isFinite(options.temperature) || options.temperature < 0 || options.temperature > 2)) ||
    (options.maxTokens !== undefined && (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0)) ||
    (options.responseFormat !== undefined && options.responseFormat !== 'json_object')) {
    throw new GroqError('Revisá el modelo, la temperatura (0 a 2) y el máximo de tokens (entero positivo).', 0, 'INVALID_OPTIONS');
  }

  let serverHeaders: Record<string, string> = {};
  if (server) {
    try { serverHeaders = await server.headers(); } catch {
      throw new GroqError('No se pudo preparar la sesión para la IA. Volvé a ingresar.', 0, 'NETWORK_ERROR');
    }
    checkAbort(options.signal);
  }
  const response = await fetch(server ? server.url : ENDPOINT, {
    method: 'POST',
    headers: {
      ...(server ? serverHeaders : { Authorization: `Bearer ${apiKey}` }),
      'Content-Type': 'application/json',
      Accept: stream ? 'text/event-stream' : 'application/json',
    },
    signal: options.signal,
    body: JSON.stringify({
      ...(server ? server.extra() : {}),
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
  const currentModel = options.model ?? DEFAULT_MODEL;
  try {
    const response = await request(messages, options, false);
    const payload = parseJSON(await response.text(), response.status);
    checkAbort(options.signal);
    if (isRecord(payload) && payload.error) throw apiError(payload, response.status);
    const first = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
    if (!isRecord(first) || !isRecord(first.message) || typeof first.message.content !== 'string') {
      throw new GroqError('Groq no devolvió una respuesta de texto.', response.status, 'INVALID_RESPONSE');
    }
    if (options.responseFormat && first.finish_reason === 'length') {
      const truncated = new GroqError('La respuesta JSON alcanzó su límite de salida y quedó incompleta.', response.status, 'OUTPUT_TRUNCATED');
      reportUsage(currentModel, readUsage(payload), truncated);
      throw truncated;
    }
    reportUsage(currentModel, readUsage(payload));
    return first.message.content;
  } catch (error) {
    if (error instanceof GroqError && error.code === 'OUTPUT_TRUNCATED') throw error;
    const isModelNotFound = error instanceof GroqError && (error.code === 'model_not_found' || error.status === 404);
    const isDailyExhausted = error instanceof GroqError && error.status === 429 && /per day|\(TPD\)|\(RPD\)/i.test(error.message);
    if ((isModelNotFound || isDailyExhausted) && FALLBACK_FAST_MODEL && currentModel !== FALLBACK_FAST_MODEL && !options.signal?.aborted) {
      try {
        const fallbackResponse = await request(messages, { ...options, model: FALLBACK_FAST_MODEL }, false);
        const payload = parseJSON(await fallbackResponse.text(), fallbackResponse.status);
        checkAbort(options.signal);
        if (isRecord(payload) && payload.error) throw apiError(payload, fallbackResponse.status);
        const first = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
        if (isRecord(first) && isRecord(first.message) && typeof first.message.content === 'string') {
          reportUsage(FALLBACK_FAST_MODEL, readUsage(payload));
          return first.message.content;
        }
      } catch {
        // Ignorar fallo del fallback y arrojar el error original normalizado
      }
    }
    const normalized = normalizeError(error, options.signal);
    reportUsage(currentModel, null, normalized);
    throw normalized;
  }
}

/** Streams SSE content deltas. Rejects on truncated streams; releases the reader on every exit. */
export async function groqStream(
  messages: readonly GroqMessage[],
  onChunk: (text: string) => void,
  options: GroqOptions = {},
): Promise<void> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const currentModel = options.model ?? DEFAULT_MODEL;
  let usedModel = currentModel;
  let streamUsage: { promptTokens: number; completionTokens: number } | null = null;
  let response: Response;
  try {
    response = await request(messages, options, true);
  } catch (error) {
    const isModelNotFound = error instanceof GroqError && (error.code === 'model_not_found' || error.status === 404);
    const isDailyExhausted = error instanceof GroqError && error.status === 429 && /per day|\(TPD\)|\(RPD\)/i.test(error.message);
    if ((isModelNotFound || isDailyExhausted) && FALLBACK_FAST_MODEL && currentModel !== FALLBACK_FAST_MODEL && !options.signal?.aborted) {
      try {
        response = await request(messages, { ...options, model: FALLBACK_FAST_MODEL }, true);
        usedModel = FALLBACK_FAST_MODEL;
      } catch {
        const normalized = normalizeError(error, options.signal);
        reportUsage(currentModel, null, normalized);
        throw normalized;
      }
    } else {
      const normalized = normalizeError(error, options.signal);
      reportUsage(currentModel, null, normalized);
      throw normalized;
    }
  }

  try {
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
      streamUsage = readUsage(payload) ?? streamUsage;
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
    reportUsage(usedModel, streamUsage);
  } catch (error) {
    const normalized = normalizeError(error, options.signal);
    reportUsage(usedModel, streamUsage, normalized);
    throw normalized;
  } finally {
    if (reader) {
      try { await reader.cancel(); } catch { /* The connection may already be closed. */ }
      reader.releaseLock();
    }
  }
}
