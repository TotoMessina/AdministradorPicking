import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { activatePush, isInstalled, pushRegistration, pushSupported, vapidPublicKey } from './push';
import { useDialogFocus } from './useDialogFocus';
import { errorMessage } from './api';

export function PushWelcome({ storeId, storeName, userId, onDone }: {
  storeId: string; storeName: string; userId: string; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const close = () => { if (!running.current) { setOpen(false); onDone(); } };
  const dialog = useDialogFocus(open, close);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      if (!isInstalled() || !pushSupported() || !vapidPublicKey ||
        !(import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEV_PWA === 'true') || Notification.permission === 'denied') {
        onDone(); return;
      }
      try {
        // Initial sign-in may finish before the first service worker activates.
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Worker unavailable')), 8000);
        })]);
        if (!active) return;
        const registration = await pushRegistration();
        const current = await registration.pushManager.getSubscription();
        const { data, error } = await supabase.from('retail_push_subscriptions')
          .select('endpoint').eq('user_id', userId).limit(20);
        if (!active) return;
        // Do not replace an existing subscription or its saved preferences on login.
        if (error || (current && data?.some(row => row.endpoint === current.endpoint) && Notification.permission === 'granted')) {
          onDone(); return;
        }
        setOpen(true);
      } catch { if (active) onDone(); }
      finally { clearTimeout(timer); }
    }
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [userId, onDone]);

  if (!open) return null;
  return <div className="push-welcome-backdrop">
    <div className="push-welcome" role="dialog" aria-modal="true" aria-labelledby="push-welcome-title"
      aria-describedby="push-welcome-description" aria-busy={busy} tabIndex={-1} ref={dialog}>
      <span className="push-welcome-icon"><Bell size={28} aria-hidden="true" /></span>
      <h2 id="push-welcome-title">Enterate de lo importante</h2>
      <p id="push-welcome-description">Activá los avisos de <strong>{storeName}</strong> para recibir alertas de stock bajo y cierres de caja, aunque la app esté cerrada.</p>
      <p className="push-welcome-note">Podés elegir qué recibir después, en Mi comercio → App y avisos. Este dispositivo recibe avisos de un comercio a la vez.</p>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="push-welcome-actions">
        <button className="primary-button" disabled={busy} onClick={() => {
          if (running.current) return;
          running.current = true; setBusy(true); setError('');
          // Starting here preserves the user gesture required by iOS.
          void activatePush(storeId).then(() => { setOpen(false); onDone(); })
            .catch(e => setError(errorMessage(e)))
            .finally(() => { running.current = false; setBusy(false); });
        }}><Bell size={16} aria-hidden="true" />{busy ? 'Activando…' : 'Activar notificaciones'}</button>
        <button className="text-button" disabled={busy} onClick={close}>Ahora no</button>
      </div>
    </div>
  </div>;
}
