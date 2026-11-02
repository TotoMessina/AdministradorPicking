// Envío directo a Sentry, sin SDK: nada que cargar al iniciar y un fallo acá no puede frenar la facturación.
// El evento se arma campo por campo, así que no viajan encabezados, cuerpo, usuario ni variables.
const dsn = Deno.env.get('SENTRY_DSN')?.trim() || '';
const version = Deno.env.get('APP_VERSION')?.trim() || 'sin-version';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validId = (value: unknown) => typeof value === 'string' && uuid.test(value) ? value : undefined;

const clean = (text: string) => text
  .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
  .replace(/https?:\/\/\S+/g, '[url]')
  .replace(/[^\s@"'`]+@[^\s@"'`]+/g, '[correo]')
  .replace(/(["'`«])[^"'`»]*(["'`»])/g, '[texto]')
  .replace(/\b[\w-]{24,}\b/g, '[clave]')
  .replace(/\d[\d.,:/-]{3,}/g, '[número]');

interface Failure { funcion: string; comercio?: string; sucursal?: string; prueba?: boolean; fingerprint?: string[] }

export async function reportFailure(error: unknown, failure: Failure): Promise<boolean> {
  if (!dsn) return false;
  try {
    const url = new URL(dsn);
    const project = url.pathname.split('/').pop();
    const base = url.pathname.slice(0, url.pathname.lastIndexOf('/'));
    const failed = error instanceof Error ? error : new Error('Fallo sin detalle');
    const value = clean(failed.message);
    const eventId = crypto.randomUUID().replaceAll('-', '');
    const tags = Object.fromEntries(Object.entries({ pantalla: `funcion/${failure.funcion}`, version, comercio_id: failure.comercio,
      sucursal_id: failure.sucursal, prueba: failure.prueba ? 'si' : undefined }).filter(([, tag]) => tag));
    const event = { event_id: eventId, timestamp: Date.now() / 1000, platform: 'javascript', level: 'error', logger: failure.funcion,
      release: version, environment: 'production', tags, fingerprint: failure.fingerprint || [failure.funcion, failed.name, value],
      exception: { values: [{ type: failed.name, value }] }, extra: { stack: clean(failed.stack || '').slice(0, 2000) } };
    const envelope = [JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
    const response = await fetch(`${url.protocol}//${url.host}${base}/api/${project}/envelope/`, {
      method: 'POST', body: envelope, signal: AbortSignal.timeout(2000),
      headers: { 'Content-Type': 'application/x-sentry-envelope', 'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=kiosco-funciones/1.0` },
    });
    return response.ok;
  } catch { return false; }
}
