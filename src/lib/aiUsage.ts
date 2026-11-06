import { setGroqProxy, setGroqUsageListener, type GroqUsageEvent } from '../services/groqService';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './supabase';

// Comercio y pantalla desde donde se usa la IA. Sin comercio no se registra nada (por ejemplo, en pruebas locales).
let context: { storeId: string; screen: string } | null = null;
// Sin clave en la app, Groq se llama desde el servidor (ai-proxy), que autoriza y registra el uso real.
const usesServer = !import.meta.env.VITE_GROQ_API_KEY?.trim();

const feature = (screen: string) => (/^[a-z][a-z0-9_-]{0,39}$/.test(screen) ? screen : 'otro');

// Solo con clave en la app: el servidor ya registra lo que pasa por él.
function record(event: GroqUsageEvent) {
  if (usesServer || !context || !isSupabaseConfigured || typeof navigator !== 'undefined' && navigator.onLine === false) return;
  // Sin esperar ni reintentar: el uso es orientativo y nunca frena la herramienta de IA.
  void supabase.rpc('retail_log_ai_usage', {
    p_store: context.storeId, p_feature: feature(context.screen), p_model: event.model,
    p_prompt_tokens: event.promptTokens, p_completion_tokens: event.completionTokens, p_ok: event.ok, p_error_code: event.errorCode ?? null,
  }).then(() => undefined, () => undefined);
}

async function serverHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { apikey: SUPABASE_ANON_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function setAiUsageContext(next: { storeId: string; screen: string } | null) {
  context = next;
  setGroqUsageListener(next ? record : null);
  setGroqProxy(next && usesServer && isSupabaseConfigured ? {
    url: `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/ai-proxy`,
    headers: serverHeaders,
    extra: () => context ? { store_id: context.storeId, feature: feature(context.screen) } : {},
  } : null);
}
