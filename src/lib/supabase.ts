import { createClient } from "@supabase/supabase-js";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = createClient(
  SUPABASE_URL || "https://unconfigured.supabase.co",
  SUPABASE_ANON_KEY || "unconfigured",
);
// Staff registration must never replace the owner's current session.
export const createSignupClient = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `staff-registration-${crypto.randomUUID()}` },
});
// Compatibility for the retired single-store diagnostics screen; never used for queries.
export const DEFAULT_STORE_ID = "";
export const isValidUUID = (id?: string | null) =>
  !!id &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
