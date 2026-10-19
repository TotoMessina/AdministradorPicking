import { supabase } from '../../lib/supabase';

export interface OnboardingState {
  store_id: string;
  step: 1 | 2 | 3;
  details_confirmed_at: string | null;
  dismissed_at: string | null;
  completed_at: string | null;
  version: number;
}
function online() {
  if (!navigator.onLine) throw new Error('El inicio guiado necesita conexión. Tu borrador sigue en esta pantalla; conectate y reintentá.');
}
export const onboarding = {
  async read(store: string) {
    online();
    const { data, error } = await supabase.from('retail_store_onboarding').select('*').eq('store_id', store).maybeSingle();
    if (error && ['42P01', 'PGRST205'].includes(error.code)) return null;
    if (error) throw error;
    return data as OnboardingState | null;
  },
  async update(state: OnboardingState, action: string) {
    online();
    const { data, error } = await supabase.rpc('retail_onboarding_update', { p_store: state.store_id, p_version: state.version, p_action: action });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('No se pudo leer el avance guardado. Actualizá el inicio antes de continuar.');
    return row as OnboardingState;
  },
  async open(store: string, register: string, opening: number) {
    online();
    const { data, error } = await supabase.rpc('retail_onboarding_open_shift', { p_store: store, p_register: register, p_opening: opening });
    if (error) throw error;
    return data as string;
  },
};

export async function createStoreOnce(name: string) {
  online();
  const { data: { session } } = await supabase.auth.getSession();
  const key = `retail:create:${session?.user.id}:${name.trim().toLocaleLowerCase()}`;
  let request: string;
  try {
    request = localStorage.getItem(key) || crypto.randomUUID();
    localStorage.setItem(key, request);
  } catch { throw new Error('Permití el almacenamiento del navegador para crear el comercio sin repetir la solicitud.'); }
  const { data, error } = await supabase.rpc('retail_create_store_once', { p_name: name, p_request: request });
  if (error?.code === 'PGRST202') throw new Error('Falta habilitar el inicio guiado en el servidor. Aplicá la migración 202610190001_store_onboarding.sql antes de crear el comercio.');
  if (error) throw error;
  localStorage.removeItem(key);
  return data as string;
}
