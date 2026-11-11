import { supabase } from '../../../lib/supabase';
import { createStoreOnce } from '../onboarding';
import type { Role, Store, Category, Register } from './types';
import { result } from './request';

/** Comercios, rubros y cajas. */
export const storesApi = {
  async stores() {
    return result<Store[]>(
      supabase.from("retail_stores").select("*").order("created_at"),
    );
  },
  async acceptInvitations() {
    return result(supabase.rpc("retail_accept_invitations"));
  },
  async createStore(name: string) {
    return createStoreOnce(name);
  },
  async role(store: string, user: string) {
    const data = await result<{ role: Role }>(
      supabase
        .from("retail_members")
        .select("role")
        .eq("store_id", store)
        .eq("user_id", user)
        .single(),
    );
    return data.role;
  },
  async updateStore(
    store: string,
    values: Pick<
      Store,
      "name" | "address" | "phone" | "receipt_message" | "accent_color"
    >,
  ) {
    return result(
      supabase
        .from("retail_stores")
        .update(values)
        .eq("id", store)
        .select("id")
        .single(),
    );
  },
  async categories(store: string) {
    const rows = await result<(Category & { catalog_name: string; display_name?: string | null })[]>(
      supabase
        .from("retail_categories")
        .select("*")
        .eq("store_id", store)
        .not("catalog_name", "is", null)
        .order("name"),
    );
    return rows.map(category => ({ ...category, name: category.display_name || category.catalog_name, canonicalName: category.catalog_name }));
  },
  async renameCategory(store: string, category: Category, name: string) {
    return result(supabase.rpc('retail_rename_category', { p_store: store, p_category: category.id, p_name: name, p_expected: category.name }));
  },
  async registers(store: string) {
    return result<Register[]>(
      supabase
        .from("retail_registers")
        .select("*")
        .eq("store_id", store)
        .order("name"),
    );
  },
  async addRegister(store: string, name: string, branch?: string) {
    return result(supabase.rpc('retail_write_register', { p_store: store, p_name: name.trim(), p_branch: branch || null, p_id: null, p_active: true }));
  },
  async saveRegister(store: string, id: string, name: string, branchId?: string | null) {
    return result(supabase.rpc('retail_write_register', { p_store: store, p_name: name.trim(), p_branch: branchId || null, p_id: id, p_active: null }));
  },
  async deleteRegister(store: string, id: string) {
    return result(supabase.rpc('retail_write_register', { p_store: store, p_name: null, p_branch: null, p_id: id, p_active: false }));
  },
  async registerAvailability(store: string) {
    return result<{ register_id: string; occupied: boolean }[]>(supabase.rpc('retail_register_availability', { p_store: store }));
  },
};
