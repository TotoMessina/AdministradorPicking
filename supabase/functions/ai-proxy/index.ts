// Supabase Edge Function: ai-proxy
// Llama a Groq con la clave guardada como secreto (GROQ_API_KEY), así la clave no viaja en la app.
// Antes de cada consulta la base decide si el comercio puede usar IA (retail_ai_authorize: acceso, suspensión,
// corte general, cupo diario y freno por minuto). Después registra el uso real (retail_ai_record).
// La respuesta de Groq se devuelve tal cual (JSON o eventos SSE), con su mismo código HTTP.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { reportFailure, validId } from '../_shared/errorReporting.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT = 60_000;
const MAX_MESSAGES = 60;
const MAX_CHARS = 120_000;
const MAX_OUTPUT_TOKENS = 4096;

const env = (name: string, fallback = '') => Deno.env.get(name)?.trim() || fallback;
const allowedModels = new Set(env('AI_ALLOWED_MODELS', 'llama-3.1-8b-instant,qwen/qwen3.8-27b').split(',').map(model => model.trim()).filter(Boolean));

/** Mismo formato de error que Groq, para que la app lo muestre igual. */
const failure = (status: number, code: string, message: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error: { code, message } }), { status, headers: { ...cors, ...extra, 'Content-Type': 'application/json' } });

type Usage = { prompt: number; completion: number };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function readUsage(payload: unknown): Usage | null {
  if (!isRecord(payload)) return null;
  const usage = isRecord(payload.usage) ? payload.usage : isRecord(payload.x_groq) && isRecord(payload.x_groq.usage) ? payload.x_groq.usage : null;
  if (!usage) return null;
  const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  return { prompt: count(usage.prompt_tokens), completion: count(usage.completion_tokens) };
}
const errorCode = (text: string, status: number) => {
  try {
    const payload = JSON.parse(text);
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
    return typeof error.code === 'string' ? error.code : typeof error.type === 'string' ? error.type : `HTTP_${status}`;
  } catch { return `HTTP_${status}`; }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return failure(405, 'method_not_allowed', 'Método no permitido');

  const supabaseUrl = env('SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY');
  const groqKey = env('GROQ_API_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !groqKey) {
    return failure(500, 'MISSING_API_KEY', 'La IA no está configurada en el servidor. Falta el secreto GROQ_API_KEY en Supabase.');
  }
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return failure(401, 'ai_unauthenticated', 'Iniciá sesión para usar la IA');
  const { data: { user }, error: userError } = await db.auth.getUser(token);
  if (userError || !user) return failure(401, 'ai_unauthenticated', 'La sesión venció. Volvé a ingresar');

  const body = await request.json().catch(() => null);
  const storeId = validId(body?.store_id);
  if (!isRecord(body) || !storeId) return failure(400, 'INVALID_OPTIONS', 'Falta el comercio de la consulta');
  const feature = typeof body.feature === 'string' && /^[a-z][a-z0-9_-]{0,39}$/.test(body.feature) ? body.feature : 'otro';
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  if (!allowedModels.has(model)) return failure(400, 'model_not_allowed', `El modelo ${model || 'indicado'} no está habilitado en el servidor (AI_ALLOWED_MODELS).`);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const chars = messages.reduce((total: number, message: unknown) => total + (isRecord(message) && typeof message.content === 'string' ? message.content.length : 0), 0);
  if (!messages.length || messages.length > MAX_MESSAGES || chars > MAX_CHARS || messages.some((message: unknown) => !isRecord(message)
    || !['system', 'user', 'assistant'].includes(String(message.role)) || typeof message.content !== 'string')) {
    return failure(413, 'request_too_large', 'La consulta es demasiado grande o tiene un formato inválido. Reducí el texto e intentá de nuevo.');
  }
  const stream = body.stream === true;

  // Con la sesión de la persona: la base revisa acceso, suspensión y cupo.
  const userDb = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: verdict, error: authorizeError } = await userDb.rpc('retail_ai_authorize', { p_store: storeId });
  if (authorizeError) {
    await reportFailure(authorizeError, { funcion: 'ai-proxy', comercio: storeId });
    return failure(503, 'ai_unavailable', /retail_ai_authorize|schema cache/.test(authorizeError.message)
      ? 'Falta aplicar la actualización 202611060003_ai_server_limits.sql en Supabase.' : 'No se pudo validar el uso de IA. Probá de nuevo.');
  }
  if (!isRecord(verdict) || verdict.allowed !== true) {
    const code = isRecord(verdict) && typeof verdict.code === 'string' ? verdict.code : 'ai_disabled';
    const message = isRecord(verdict) && typeof verdict.message === 'string' ? verdict.message : 'La IA no está disponible para este comercio';
    return code === 'ai_rate_limited' ? failure(429, code, message, { 'Retry-After': '30' }) : failure(403, code, message);
  }

  const record = (usage: Usage | null, ok: boolean, code?: string) => db.rpc('retail_ai_record', {
    p_store: storeId, p_user: user.id, p_feature: feature, p_model: model, p_prompt_tokens: usage?.prompt ?? 0,
    p_completion_tokens: usage?.completion ?? 0, p_ok: ok, p_error_code: ok ? null : code ?? null,
  }).then(() => undefined, () => undefined);

  const temperature = typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 2 ? body.temperature : undefined;
  const requested = Number.isInteger(body.max_completion_tokens) && Number(body.max_completion_tokens) > 0 ? Number(body.max_completion_tokens) : 500;
  const responseFormat = isRecord(body.response_format) && body.response_format.type === 'json_object' ? { type: 'json_object' } : undefined;

  let groq: Response;
  try {
    groq = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json', Accept: stream ? 'text/event-stream' : 'application/json' },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(GROQ_TIMEOUT)]),
      body: JSON.stringify({
        model, messages: messages.map((message: Record<string, unknown>) => ({ role: message.role, content: message.content })),
        temperature, max_completion_tokens: Math.min(requested, MAX_OUTPUT_TOKENS), ...(responseFormat ? { response_format: responseFormat } : {}), stream,
      }),
    });
  } catch {
    if (request.signal.aborted) return new Response(null, { status: 499, headers: cors });
    await record(null, false, 'NETWORK_ERROR');
    return failure(502, 'NETWORK_ERROR', 'No se pudo completar la conexión con Groq.');
  }

  const passHeaders = new Headers(cors);
  for (const name of ['content-type', 'retry-after', 'x-ratelimit-reset-tokens']) {
    const value = groq.headers.get(name);
    if (value) passHeaders.set(name, value);
  }

  if (!stream || !groq.ok || !groq.body) {
    const text = await groq.text();
    let usage: Usage | null = null;
    try { usage = readUsage(JSON.parse(text)); } catch { /* Errores de proxy sin JSON. */ }
    await record(usage, groq.ok, groq.ok ? undefined : errorCode(text, groq.status));
    return new Response(text, { status: groq.status, headers: passHeaders });
  }

  // Pasa los eventos sin cambiarlos y lee el uso del último evento de Groq.
  let usage: Usage | null = null;
  let buffer = '';
  const decoder = new TextDecoder();
  const scan = (final = false) => {
    const lines = buffer.split(/\r?\n/);
    buffer = final ? '' : lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { usage = readUsage(JSON.parse(data)) ?? usage; } catch { /* Evento parcial o no JSON. */ }
    }
  };
  const tap = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      buffer += decoder.decode(chunk, { stream: true });
      scan();
    },
    async flush() {
      buffer += decoder.decode();
      scan(true);
      await record(usage, true);
    },
  });
  return new Response(groq.body.pipeThrough(tap), { status: groq.status, headers: passHeaders });
});
