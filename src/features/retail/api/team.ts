import { supabase } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import type { Permission, PermissionProfile, RolePermissions, StaffBaseRole } from '../permissions';
import type { Member, Invitation } from './types';
import { result } from './request';

/** Equipo: miembros, permisos, perfiles e invitaciones. */
export const teamApi = {
  async members(store: string) {
    return result<Member[]>(supabase.rpc('retail_team', { p_store: store }));
  },
  async permissions(store: string) {
    return result<Permission[]>(supabase.rpc('retail_permissions', { p_store: store }));
  },
  async permissionProfiles(store: string) {
    return result<PermissionProfile[]>(supabase.from('retail_permission_profiles').select('*').eq('store_id', store).order('name'));
  },
  async rolePermissions(store: string) {
    const rows = await result<{ role: StaffBaseRole; permissions: Permission[]; revision: number }[]>(supabase.from('retail_role_permissions').select('role,permissions,revision').eq('store_id', store));
    return Object.fromEntries(rows.map(({ role, permissions, revision }) => [role, { permissions, revision }])) as RolePermissions;
  },
  async saveRolePermissions(store: string, role: StaffBaseRole, permissions: Permission[], revision = 0) {
    return result(supabase.rpc('retail_save_role_permissions', { p_store: store, p_role: role, p_permissions: permissions, p_revision: revision }));
  },
  async savePermissionProfile(store: string, profile: Omit<PermissionProfile, 'id' | 'store_id'>, id?: string, requestId?: string, revision = 0) {
    return result(supabase.rpc('retail_save_permission_profile', { p_store: store, p_id: id || requestId || randomUUID(), p_name: profile.name.trim(), p_role: profile.base_role, p_permissions: profile.permissions, p_revision: revision }));
  },
  async setStaffProfile(store: string, target: string, role: StaffBaseRole, profile: string, pending = false) {
    return result(supabase.rpc('retail_set_staff_profile', { p_store: store, p_target: target, p_role: role, p_profile: profile || null, p_pending: pending }));
  },
  async setCashierAccess(store: string, target: string, branch: string, register: string, pending = false) {
    return result(supabase.rpc('retail_set_cashier_access', { p_store: store, p_target: target, p_branch: branch || null, p_register: register || null, p_pending: pending }));
  },
  async invitations(store: string) {
    return result<Invitation[]>(
      supabase
        .from("retail_invitations")
        .select("id,email,role,branch_id,register_id,profile_id")
        .eq("store_id", store),
    );
  },
  async invite(store: string, email: string, role: "admin" | "supervisor" | "cashier") {
    return result(
      supabase
        .from("retail_invitations")
        .insert({ store_id: store, email: email.trim().toLowerCase(), role }),
    );
  },
  async revokeInvite(store: string, id: string) {
    return result(
      supabase
        .from("retail_invitations")
        .delete()
        .eq("store_id", store)
        .eq("id", id),
    );
  },
  async removeMember(store: string, user: string) {
    return result(supabase.rpc('retail_remove_staff', { p_store: store, p_target: user }));
  },
};
