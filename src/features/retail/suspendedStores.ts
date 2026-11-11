import { supabase } from '../../lib/supabase';

export type SuspendedStore = { id: string; name: string; reason: string; suspended_at: string };
// null = no se pudo consultar (sin conexión o base sin actualizar): no cambia lo que se muestra.
export async function suspendedStores(): Promise<SuspendedStore[] | null> {
  if (navigator.onLine === false) return null;
  const { data, error } = await supabase.rpc('retail_my_suspended_stores');
  return error ? null : (data || []) as SuspendedStore[];
}
