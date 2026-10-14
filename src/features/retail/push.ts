import { supabase } from '../../lib/supabase';

export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
export const pushSupported = () => window.isSecureContext && 'serviceWorker' in navigator &&
  'PushManager' in window && 'Notification' in window;
export const isIosDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('La clave pública de notificaciones no es válida.');
  return bytes;
}

export async function pushRegistration() {
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (registration?.waiting) throw new Error('Hay una actualización pendiente. Cerrá todas las ventanas de la app y volvé a abrirla para activar los avisos.');
  if (!registration?.active) throw new Error('La app todavía se está preparando. Cerrala y volvé a abrirla para activar los avisos.');
  return registration;
}

export async function savePush(storeId: string, subscription: PushSubscription, lowStock: boolean, shiftClosed: boolean) {
  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys.auth) throw new Error('No se pudo registrar este dispositivo.');
  const { error } = await supabase.rpc('retail_save_push', {
    p_store: storeId, p_endpoint: subscription.endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth,
    p_low_stock: lowStock, p_shift_closed: shiftClosed,
  });
  if (error) throw error;
}

// Call from a click handler: permission is requested before the first await.
export async function activatePush(storeId: string, lowStock = true, shiftClosed = true) {
  const permission = Notification.permission === 'granted'
    ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return null;
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
  catch (error) { if (created) await current.unsubscribe(); throw error; }
  return current;
}

export async function removePush(subscription: PushSubscription) {
  const { error } = await supabase.rpc('retail_remove_push', { p_endpoint: subscription.endpoint });
  if (error) throw error;
  await subscription.unsubscribe();
}

export async function disconnectPushOnLogout() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  // Unsubscribe locally even if the server is temporarily unreachable.
  try { await supabase.rpc('retail_remove_push', { p_endpoint: subscription.endpoint }); }
  finally { await subscription.unsubscribe(); }
}

export type PushIntent = { storeId: string; view: 'catalog' | 'cash' | 'settings' };
export function readPushIntent(value: unknown): PushIntent | null {
  if (!value || typeof value !== 'object') return null;
  const intent = value as Record<string, unknown>;
  if (typeof intent.storeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(intent.storeId) ||
    !['catalog', 'cash', 'settings'].includes(String(intent.view))) return null;
  return { storeId: intent.storeId, view: intent.view as PushIntent['view'] };
}
export function initialPushIntent() {
  if (!window.location.hash.startsWith('#push?')) return null;
  const params = new URLSearchParams(window.location.hash.slice(6));
  return readPushIntent({ storeId: params.get('store'), view: params.get('view') });
}
