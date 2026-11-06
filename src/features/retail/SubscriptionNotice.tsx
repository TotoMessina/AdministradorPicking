import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './subscription-notice.css';

interface MySubscription { plan: string; status: string; access_until: string | null; blocks_at: string | null }

const day = (value: string | null) => value ? new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const soon = (value: string | null) => Boolean(value) && new Date(value as string).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

/**
 * Aviso para dueños y administradores: la prueba o el abono vence pronto, o ya venció y está en gracia.
 * Es informativo: el bloqueo lo decide la base. Sin abono o sin conexión no muestra nada.
 */
export function SubscriptionNotice({ storeId }: { storeId: string }) {
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  useEffect(() => {
    let current = true;
    if (navigator.onLine === false) return;
    void supabase.rpc('retail_my_subscription', { p_store: storeId }).then(({ data, error }) => {
      if (current) setSubscription(!error && data ? data as MySubscription : null);
    });
    return () => { current = false; };
  }, [storeId]);
  if (!subscription) return null;
  const { status, plan, access_until: until, blocks_at: blocks } = subscription;
  const message = status === 'vencido' ? `Tu abono (${plan}) venció el ${day(until)}. Si no se registra el pago, el acceso se bloquea el ${day(blocks)}.`
    : status === 'prueba' && soon(until) ? `Tu prueba gratis termina el ${day(until)}. Para seguir usando la app, contratá el plan ${plan}.`
    : status === 'al_dia' && soon(until) ? `Tu abono (${plan}) vence el ${day(until)}.` : '';
  if (!message) return null;
  return <p role="status" className={`subscription-notice${status === 'vencido' ? ' is-urgent' : ''}`}>
    <CalendarClock size={16} aria-hidden="true" /> <span>{message} Consultá con el proveedor del servicio cómo pagar.</span>
  </p>;
}
