import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PwaStatus } from '../../components/PwaStatus';
import { errorMessage } from './api';
import { applicationServerKey, isInstalled, isIosDevice, pushRegistration, pushSupported, removePush, savePush, vapidPublicKey } from './push';

export function PushSettings({ storeId, userId }: { storeId: string; userId: string }) {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [lowStock, setLowStock] = useState(true);
  const [shiftClosed, setShiftClosed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState('Notification' in window ? Notification.permission : 'default');
  const running = useRef(false);
  const iosInstall = isIosDevice() && !isInstalled();
  const pwaEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEV_PWA === 'true';
  const available = pushSupported() && Boolean(vapidPublicKey) && pwaEnabled && !iosInstall;

  useEffect(() => {
    let active = true;
    async function load() {
      if (!available) { setLoading(false); return; }
      try {
        const { error: setupError } = await supabase.from('retail_push_subscriptions').select('id').limit(1);
        if (setupError) throw new Error('El servicio de notificaciones todavía no está disponible. Contactá al administrador para habilitarlo.');
        const registration = await pushRegistration();
        const current = await registration.pushManager.getSubscription();
        if (!active) return;
        setSubscription(current);
        if (current) {
          const { data, error } = await supabase.from('retail_push_subscriptions').select('low_stock,shift_closed')
            .eq('endpoint', current.endpoint).eq('store_id', storeId).eq('user_id', userId).maybeSingle();
          if (error) throw error;
          if (!active) return;
          setEnabled(Boolean(data) && Notification.permission === 'granted');
          if (data) { setLowStock(data.low_stock); setShiftClosed(data.shift_closed); }
        }
        if (active) setReady(true);
      } catch (e) { if (active) setError(errorMessage(e)); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [available, storeId, userId]);

  async function perform(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (e) { setError(errorMessage(e)); }
    finally { running.current = false; setBusy(false); }
  }

  function enable() {
    // Request directly from the button gesture, before any network call (iOS).
    if (running.current) return;
    const permissionRequest = Notification.requestPermission();
    void perform(async () => {
      const result = await permissionRequest;
      setPermission(result);
      if (result !== 'granted') { setMessage('Los avisos siguen desactivados. Podés habilitarlos desde los permisos del navegador.'); return; }
      const registration = await pushRegistration();
      let current = await registration.pushManager.getSubscription();
      const key = applicationServerKey(vapidPublicKey);
      if (current?.options.applicationServerKey &&
        Array.from(new Uint8Array(current.options.applicationServerKey)).join() !== Array.from(key).join()) {
        await removePush(current); current = null;
      }
      const created = !current;
      current ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      try { await savePush(storeId, current, lowStock, shiftClosed); }
      catch (e) { if (created) await current.unsubscribe(); throw e; }
      setSubscription(current); setEnabled(true); setMessage('Avisos activados para este comercio y este dispositivo.');
    });
  }

  return <div className="push-settings">
    <section className="retail-panel">
      <h2>La app en tu dispositivo</h2>
      <p>Instalala para abrirla desde tu pantalla de inicio, en una ventana propia.</p>
      <PwaStatus settings />
    </section>
    <section className="retail-panel">
      <div className="section-heading"><div><h2><Bell size={20} aria-hidden="true" /> Notificaciones</h2>
        <p>Avisos de stock bajo y cierres de caja, aunque no tengas la app abierta.</p></div>
        <span className={`status-pill ${enabled ? 'status-open' : 'status-closed'}`}><span />{loading ? 'Consultando…' : enabled ? 'Activadas' : 'Desactivadas'}</span>
      </div>
      <p>Este dispositivo recibe avisos de un comercio a la vez. Activarlos acá reemplaza los del comercio anterior. Al cerrar sesión se desactivan.</p>
      {iosInstall ? <div className="info-banner">En iPhone o iPad, agregá la app a la pantalla de inicio y abrila desde su ícono antes de activar los avisos.</div>
        : !pushSupported() ? <div className="info-banner">Este navegador no permite notificaciones push. Abrí la app mediante HTTPS en un navegador compatible.</div>
        : !pwaEnabled ? <div className="info-banner">Los avisos se activan en la versión publicada o en la vista previa de producción.</div>
        : !vapidPublicKey ? <div className="info-banner">Las notificaciones todavía no están habilitadas en este sistema.</div> : null}
      {permission === 'denied' && <div className="info-banner">Bloqueaste las notificaciones. Permitilas desde la configuración del navegador o del dispositivo y volvé a abrir la app.</div>}
      <fieldset className="push-preferences" disabled={!available || !ready || busy || loading}>
        <legend>Qué querés recibir</legend>
        <label><input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} /><span><strong>Stock bajo</strong><small>Cuando un producto llega al mínimo configurado. No se repite con cada venta.</small></span></label>
        <label><input type="checkbox" checked={shiftClosed} onChange={e => setShiftClosed(e.target.checked)} /><span><strong>Cierres de caja</strong><small>Cuando se cierra un turno de cualquier sucursal del comercio.</small></span></label>
      </fieldset>
      <div className="push-actions">
        {enabled ? <>
          <button className="primary-button" disabled={busy || loading || (!lowStock && !shiftClosed)} onClick={() => void perform(async () => {
            if (!subscription) return;
            await savePush(storeId, subscription, lowStock, shiftClosed); setMessage('Preferencias guardadas.');
          })}>Guardar preferencias</button>
          <button className="secondary-button" disabled={busy || loading} onClick={() => void perform(async () => {
            if (!subscription) return;
            const { data: deliveryId, error } = await supabase.rpc('retail_request_push_test', { p_store: storeId, p_endpoint: subscription.endpoint });
            if (error) throw error;
            const { data, error: sendError } = await supabase.functions.invoke('push-dispatch', { body: { deliveryId } });
            if (sendError) throw new Error('La prueba quedó en cola, pero no se pudo contactar al servicio de envío. Revisá su configuración.');
            if (data?.expired) {
              await subscription.unsubscribe(); setSubscription(null); setEnabled(false);
              throw new Error('La suscripción venció. Volvé a activar las notificaciones.');
            }
            if (data?.skipped) throw new Error('La prueba no pudo enviarse. Volvé a activar los avisos de este comercio.');
            setMessage(data?.accepted ? 'Prueba enviada. Buscala entre las notificaciones del dispositivo.' : 'Prueba en cola. Puede tardar unos minutos en llegar.');
          })}><Send size={16} /> Probar aviso</button>
          <button className="text-button" disabled={busy || loading} onClick={() => void perform(async () => {
            if (!subscription) return;
            await removePush(subscription); setSubscription(null); setEnabled(false); setMessage('Avisos desactivados en este dispositivo.');
          })}><BellOff size={16} /> Desactivar</button>
        </> : <button className="primary-button" disabled={!available || !ready || busy || loading || permission === 'denied' || (!lowStock && !shiftClosed)} onClick={enable}>
          <Bell size={16} /> {busy ? 'Activando…' : 'Activar notificaciones'}
        </button>}
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {message && <div className="info-banner" role="status">{message}</div>}
      <p className="push-note">Los avisos pueden demorarse según la conexión y la configuración del dispositivo. No incluyen importes ni datos de clientes.</p>
    </section>
  </div>;
}
