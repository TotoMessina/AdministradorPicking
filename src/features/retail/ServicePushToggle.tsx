import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from './api';
import { activatePush, isInstalled, isIosDevice, pushRegistration, pushSupported, removePush, vapidPublicKey } from './push';

/**
 * Avisos del proveedor del servicio para cajeros y supervisores sin acceso a Mi comercio.
 * Solo registra el dispositivo: stock bajo y cierres de caja quedan para quien administra.
 */
export function ServicePushToggle({ storeId, userId }: { storeId: string; userId: string }) {
  const { notify } = useToast();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const running = useRef(false);
  const pwaEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEV_PWA === 'true';
  const available = pushSupported() && Boolean(vapidPublicKey) && pwaEnabled && !(isIosDevice() && !isInstalled());

  useEffect(() => {
    let active = true;
    if (!available) return;
    void (async () => {
      try {
        const registration = await pushRegistration();
        const current = await registration.pushManager.getSubscription();
        if (!active) return;
        setSubscription(current);
        if (current && Notification.permission === 'granted') {
          const { data, error } = await supabase.from('retail_push_subscriptions').select('id')
            .eq('endpoint', current.endpoint).eq('store_id', storeId).eq('user_id', userId).maybeSingle();
          if (active && !error) setEnabled(Boolean(data));
        }
        if (active) setReady(true);
      } catch { /* Sin servicio push listo: no se ofrece el botón. */ }
    })();
    return () => { active = false; };
  }, [available, storeId, userId]);

  if (!available || !ready || Notification.permission === 'denied') return null;
  const toggle = () => {
    if (running.current) return;
    running.current = true; setWorking(true);
    // El permiso se pide en el mismo toque (iOS), antes de cualquier llamada.
    const action = enabled && subscription
      ? removePush(subscription).then(() => { setSubscription(null); setEnabled(false); notify('success', 'Avisos desactivados en este dispositivo'); })
      : activatePush(storeId, false, false).then(current => {
        if (!current) { notify('error', 'Los avisos siguen desactivados. Podés habilitarlos desde los permisos del navegador.'); return; }
        setSubscription(current); setEnabled(true); notify('success', 'Vas a recibir las novedades del servicio en este dispositivo');
      });
    void action.catch(error => notify('error', errorMessage(error))).finally(() => { running.current = false; setWorking(false); });
  };
  return <button type="button" className="text-button" disabled={working} onClick={toggle} aria-pressed={enabled}>
    {enabled ? <><BellOff size={15} /> Desactivar avisos</> : <><Bell size={15} /> Activar avisos</>}
  </button>;
}
