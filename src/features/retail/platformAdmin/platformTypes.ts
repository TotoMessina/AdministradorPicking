
// Tipos y textos del panel de plataforma.
export type View = 'summary' | 'stores' | 'billing' | 'notices' | 'ads' | 'users' | 'ai' | 'catalog';
export type Status = 'prueba' | 'activo' | 'atencion' | 'baja';
export interface Overview {
  stores: number; new_stores: number; suspended_stores?: number; stores_with_sales: number; users: number; new_users: number; active_users: number; members: number;
  sales_count: number; sales_total: number; products: number; billing_stores: number; ai_requests: number; ai_errors: number; ai_tokens: number;
  catalog_total: number; catalog_pending: number; platform_admins: number;
}
export interface StoreRow {
  id: string; name: string; created_at: string; owner_email: string | null; members: number; branches: number; products: number;
  sales_count: number; sales_total: number; last_sale_at: string | null; ai_requests: number; ai_tokens: number; billing_enabled: boolean; status: Status; note: string; suspended_at: string | null; plan_name?: string | null; subscription_status?: string | null;
}
interface Usage { requests: number; tokens: number; errors: number }
export interface StoreDetail {
  id: string; name: string; address: string; phone: string; created_at: string; owner_email: string | null; billing_enabled: boolean;
  branch_inventory_enabled: boolean; depot_enabled: boolean; status: Status; note: string; note_updated_at: string | null;
  members: { email: string; role: string; last_sign_in_at: string | null }[]; invitations: number; branches: { name: string; is_default: boolean }[];
  registers: number; products: number; open_shifts: number; sales_count: number; sales_total: number; last_sale_at: string | null;
  ai_by_feature: (Usage & { feature: string })[];
  suspension: { reason: string; suspended_at: string; by: string | null } | null;
  suspension_log: { action: 'suspend' | 'reactivate'; reason: string | null; created_at: string; by: string | null }[];
}
export interface UserRow {
  user_id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean;
  stores: { id: string; name: string; role: string }[]; is_platform_admin: boolean;
}
export interface AiUsage {
  requests: number; errors: number; prompt_tokens: number; completion_tokens: number; users: number;
  by_day: (Usage & { day: string })[]; by_feature: (Usage & { feature: string })[]; by_model: (Usage & { model: string })[];
  by_store: (Usage & { store_id: string | null; name: string })[];
  recent_errors: { created_at: string; store: string | null; feature: string; model: string; error_code: string | null }[];
}

export const statuses: Record<Status, string> = { prueba: 'En prueba', activo: 'Activo', atencion: 'Requiere atención', baja: 'Dado de baja' };
export const roles: Record<string, string> = { owner: 'Dueño', admin: 'Administrador', supervisor: 'Supervisor', cashier: 'Cajero' };
export const features: Record<string, string> = {
  home: 'Inicio', pos: 'Vender', cash: 'Caja', catalog: 'Productos y stock', suppliers: 'Proveedores y facturas', finance: 'Ganancias',
  customers: 'Clientes', settings: 'Mi comercio', ai: 'Asistente', remito: 'Remito', otro: 'Otra pantalla',
};
