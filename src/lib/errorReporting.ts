import {
  captureMessage, flush, init, makeBrowserOfflineTransport, makeFetchTransport, reactErrorHandler, setTags, withScope,
  type ErrorEvent,
} from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim() || '';
const version = import.meta.env.VITE_APP_VERSION?.trim() || 'sin-version';
const allowedTags = new Set(['comercio_id', 'sucursal_id', 'pantalla', 'version', 'prueba']);
// Un dispositivo con un error en bucle no debe agotar la cuota mensual de todos los comercios.
const MAX_EVENTS_PER_LOAD = 20;
let sentEvents = 0;
let branchInContext = '';

export const monitoringEnabled = Boolean(dsn);
/** Errores de base o de código, no reglas del negocio escritas para quien usa la app. */
export const technicalMessage = /\b(relation|column|function|schema|constraint|transaction|syntax|violates|duplicate key|does not exist|permission denied|jwt|cannot execute|null value|invalid input)\b/i;
const technicalCode = /^(PGRST|42P|42703|42883|08|53|57|58|XX)/;

function clean(text = '') {
  return text
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[^\s@"'`]+@[^\s@"'`]+/g, '[correo]')
    .replace(/(["'`«])[^"'`»]*(["'`»])/g, '[texto]')
    .replace(/\b[\w-]{24,}\b/g, '[clave]')
    .replace(/\d[\d.,:/-]{3,}/g, '[número]');
}

// El evento se arma por lista de permitidos: lo que no está acá no sale del dispositivo.
function privateEvent(event: ErrorEvent) {
  if (++sentEvents > MAX_EVENTS_PER_LOAD) return null;
  const userAgent = event.request?.headers?.['User-Agent'];
  event.request = userAgent ? { headers: { 'User-Agent': userAgent } } : undefined;
  event.tags = Object.fromEntries(Object.entries(event.tags || {}).filter(([name]) => allowedTags.has(name)));
  event.contexts = event.contexts?.react ? { react: event.contexts.react } : {};
  delete event.user; delete event.extra; delete event.breadcrumbs; delete event.server_name; delete event.transaction;
  if (event.message) event.message = clean(event.message);
  if (event.logentry) event.logentry = { message: clean(event.logentry.message) };
  for (const value of event.exception?.values || []) {
    value.value = clean(value.value);
    delete value.mechanism?.data;
    for (const frame of value.stacktrace?.frames || []) delete frame.vars;
  }
  return event;
}

// El monitoreo nunca debe frenar la venta: un fallo acá se ignora.
export function initErrorReporting() {
  if (!dsn) return;
  try {
    init({
      dsn, release: version, environment: import.meta.env.MODE,
      dataCollection: { userInfo: false }, maxBreadcrumbs: 0, sendClientReports: false,
      integrations: defaults => defaults.filter(integration => !['Breadcrumbs', 'BrowserSession'].includes(integration.name)),
      // Guarda en el dispositivo lo ocurrido sin conexión y lo envía al volver.
      transport: makeBrowserOfflineTransport(makeFetchTransport),
      ignoreErrors: [/^(TypeError: )?(Failed to fetch|NetworkError.*|Load failed)$/, /ResizeObserver loop/, /AbortError/],
      denyUrls: [/^(chrome|moz|safari(-web)?)-extension:/],
      beforeSend: privateEvent,
    });
    setTags({ version });
  } catch (error) { console.warn('No se pudo activar el aviso de fallas:', error); }
}

export function setErrorContext(context: { storeId: string; branchId: string; screen: string } | null) {
  branchInContext = context?.branchId || '';
  if (!dsn) return;
  setTags({ comercio_id: context?.storeId || undefined, sucursal_id: context?.branchId || undefined, pantalla: context?.screen || undefined });
}

export const errorContextBranch = () => branchInContext;

export const uncaughtRenderError = reactErrorHandler((error, info) => console.error(error, info.componentStack));

function sendMessage(message: string, fingerprint: string[], test = false) {
  withScope(scope => {
    scope.setFingerprint(fingerprint);
    if (test) scope.setTag('prueba', 'si');
    captureMessage(message, 'error');
  });
}

/** Solo código y lugar: el texto de un error de base puede traer valores cargados por el comercio. */
export function reportTechnicalFailure(error: unknown, place: string) {
  if (!dsn) return;
  const { code = '', message = '' } = (error || {}) as { code?: string; message?: string };
  if (!technicalCode.test(code) && !technicalMessage.test(message)) return;
  const reference = code || 'sin-codigo';
  sendMessage(`Fallo técnico en ${place} (${reference})`, ['fallo-tecnico', place, reference]);
}

/** Una operación quedó trabada en la cola del dispositivo y necesita revisión. */
export function reportSyncConflict(kind: string, code = 'sin-codigo') {
  if (!dsn) return;
  sendMessage(`Operación sin sincronizar: ${kind} (${code})`, ['sin-sincronizar', kind, code]);
}

/** Cada prueba es un problema nuevo: los repetidos no vuelven a avisar. */
export async function sendTestAlert() {
  if (!dsn) return false;
  sendMessage('Prueba de aviso desde la app', ['prueba-aviso', 'app', String(Date.now())], true);
  return flush(3000);
}
