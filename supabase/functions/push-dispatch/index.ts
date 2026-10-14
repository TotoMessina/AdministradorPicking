import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; };
const endpointAllowed = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      /^(fcm\.googleapis\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/.test(url.hostname);
  } catch { return false; }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  try {
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const cron = request.headers.get('x-push-secret') === env('PUSH_DISPATCH_SECRET');
    let only: string | null = null;
    if (!cron) {
      const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return json({ error: 'Iniciá sesión' }, 401);
      const { data: { user }, error } = await db.auth.getUser(token);
      if (error || !user) return json({ error: 'Sesión inválida' }, 401);
      const body = await request.json().catch(() => ({}));
      if (typeof body.deliveryId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.deliveryId)) return json({ error: 'Prueba inválida' }, 400);
      const { data: own, error: ownError } = await db.from('retail_push_deliveries').select('id,sent_at')
        .eq('id', body.deliveryId).eq('user_id', user.id).eq('kind', 'test').maybeSingle();
      if (ownError) throw ownError;
      if (!own) return json({ error: 'Prueba no disponible' }, 404);
      if (own.sent_at) return json({ accepted: 1 });
      only = own.id;
    }
    const vapidDetails = { subject: env('VAPID_SUBJECT'), publicKey: env('VAPID_PUBLIC_KEY'), privateKey: env('VAPID_PRIVATE_KEY') };
    const { data: jobs, error } = await db.rpc('retail_claim_push', { p_only: only });
    if (error) throw error;
    const statuses = await Promise.all((jobs || []).map(async (job: any) => {
      const finish = async (values: Record<string, unknown>) => {
        const { error } = await db.from('retail_push_deliveries').update(values).eq('id', job.id).eq('lease', job.lease);
        if (error) throw error;
      };
      if (!job.authorized || !endpointAllowed(job.endpoint)) {
        await finish({ attempts: 5, locked_at: null, last_error: 'recipient_unavailable' });
        return 'skipped';
      }
      const titles: Record<string, string> = { low_stock: 'Revisá el stock', shift_closed: 'Cierre de caja', test: 'Avisos activados' };
      const bodies: Record<string, string> = {
        low_stock: 'Hay productos que llegaron al stock mínimo. Abrí el catálogo para revisarlos.',
        shift_closed: 'Se cerró un turno. Abrí Cajas y turnos para consultar el resumen.',
        test: 'Este dispositivo ya puede recibir avisos de tu comercio.',
      };
      try {
        // No amounts, product names or customer details on a locked screen.
        await webpush.sendNotification({ endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth } },
          JSON.stringify({ title: titles[job.kind], body: bodies[job.kind], tag: `${job.store_id}:${job.kind}`,
            storeId: job.store_id, view: job.kind === 'low_stock' ? 'catalog' : job.kind === 'shift_closed' ? 'cash' : 'settings' }),
          { vapidDetails, TTL: 3600, urgency: 'normal', timeout: 8000 });
        await finish({ sent_at: new Date().toISOString(), locked_at: null, last_error: null });
        return 'accepted';
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode) || 0;
        if (status === 404 || status === 410) {
          const { error } = await db.from('retail_push_subscriptions').delete().eq('id', job.subscription_id);
          if (error) throw error;
          return 'expired';
        } else {
          await finish({ locked_at: null, last_error: `push_${status || 'network'}`,
            attempts: status === 400 || status === 413 ? 5 : job.attempts,
            available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000).toISOString() });
        }
        return 'failed';
      }
    }));
    return json({ accepted: statuses.filter(s => s === 'accepted').length, pending: statuses.filter(s => s === 'failed').length,
      expired: statuses.filter(s => s === 'expired').length, skipped: statuses.filter(s => s === 'skipped').length });
  } catch {
    // Never log subscription endpoints, encryption keys or VAPID secrets.
    return json({ error: 'No se pudo enviar el aviso. Revisá la configuración del servicio push.' }, 503);
  }
});
