import { createSignupClient, supabase } from '../../lib/supabase';

export type StaffRole = 'admin' | 'cashier';
export type StaffAccountResult = 'ready' | 'confirmation' | 'existing';

export async function authorizeStaff(storeId: string, email: string, role: StaffRole) {
  const normalizedEmail = email.trim().toLowerCase();
  // Reuse pending invitations so a failed signup can be retried safely.
  const { data: pending, error: readError } = await supabase.from('retail_invitations')
    .select('id,role').eq('store_id', storeId).eq('email', normalizedEmail).maybeSingle();
  if (readError) throw readError;
  if (pending) {
    if (pending.role !== role) throw new Error('Ese email ya tiene un acceso pendiente con otros permisos. Revocalo antes de cambiar el rol.');
    return normalizedEmail;
  }
  // Owner-only RLS must succeed before attempting any registration.
  const { error } = await supabase.from('retail_invitations').insert({ store_id: storeId, email: normalizedEmail, role });
  if (error) throw error;
  return normalizedEmail;
}

export async function createStaffAccount(storeId: string, email: string, role: StaffRole, password: string): Promise<StaffAccountResult> {
  if (password.length < 8 || password.length > 72) throw new Error('Usá una contraseña de entre 8 y 72 caracteres.');
  const normalizedEmail = await authorizeStaff(storeId, email, role);
  const registration = createSignupClient();
  try {
    // Use the normal email verification flow; never auto-confirm another person's email.
    const { data, error } = await registration.auth.signUp({
      email: normalizedEmail, password, options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      if (error.code === 'user_already_exists' || error.message === 'User already registered') return 'existing';
      throw new Error('El acceso quedó autorizado, pero no se pudo completar el alta de la cuenta. ' + error.message);
    }
    if (data.user?.identities?.length === 0) return 'existing';
    if (!data.user) throw new Error('El acceso quedó autorizado, pero no se pudo confirmar el alta. Volvé a intentar.');
    return data.session ? 'ready' : 'confirmation';
  } finally {
    await registration.auth.dispose();
  }
}
