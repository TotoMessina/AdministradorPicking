import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { db } from './offlineStore';

// Usuario activo y sincronización en segundo plano (service worker).
export let activeUser = '';
export const offlineSupported = () => typeof indexedDB !== 'undefined';
export function configureOffline(user: string) { activeUser = user; }
export function stopOffline() { activeUser = ''; return backgroundAuth(null).catch(() => {}); }
export async function backgroundAuth(session: Session | null) {
  if (!offlineSupported()) return;
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('meta', 'readwrite');
    tx.objectStore('meta').put(session?.access_token ? { user: session.user.id, token: session.access_token, expires: session.expires_at, url: SUPABASE_URL, key: SUPABASE_ANON_KEY } : null, 'auth');
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
export function scheduleBackgroundSync() {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready.then(registration => {
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    return sync?.register('retail-outbox');
  }).catch(() => {});
}
