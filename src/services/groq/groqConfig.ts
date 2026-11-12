export const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = import.meta.env?.VITE_GROQ_MODEL?.trim() || 'llama-3.1-8b-instant';
export const BASE_SYSTEM_PROMPT =
  'Sos un asistente para la administración de comercios. Respondé por defecto ' +
  'en español rioplatense informal, usando vos y expresiones como che o dale ' +
  'de forma natural, sin forzarlas. Sé claro, amable y concreto. No inventes ' +
  'datos del negocio; si falta información, indicá qué necesitás.';
