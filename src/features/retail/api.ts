import { supabase, isValidUUID } from "../../lib/supabase";
import { randomUUID } from "../../utils/uuid";
import type { KioscoProduct, KioscoSale, StockComponent } from "../../types/kiosco";
import { hasComposition, withAvailableStock } from '../../services/productComposition';
import { closingCashDenominations, type CashDenominations } from '../../services/cashDenominations';
import { syncOffline, withOffline } from './offline';
import { createStoreOnce, onboarding } from './onboarding';
import { locationTransfers } from './locationTransferApi';
import { movementDetails, VOUCHER_BUCKET, voucherExtension, voucherMimeType, voucherPath, voucherReference } from './vouchers';
import { toInvoiceFormat, type InvoiceFormat, type StoredInvoiceFormat } from '../../services/invoiceFormatService';
import { REMITO_BUCKET, remitoExtension, remitoPath, remitoReference, type PendingReplenishment, type PendingReplenishmentItem } from './remitos';
export type { PendingReplenishment, PendingReplenishmentItem } from './remitos';
import type { Permission, PermissionProfile, StaffBaseRole } from './permissions';
import type { BillingStatus, CondicionIva } from './billing';
export type { BillingStatus, CondicionIva } from './billing';
export type Role = "owner" | "admin" | "supervisor" | "cashier";
export interface Store {
  id: string;
  name: string;
  owner_id: string;
  address: string;
  phone: string;
  receipt_message: string;
  accent_color: string;
  currency: string;
  low_margin_threshold?: number;
  depot_enabled?: boolean;
  branch_inventory_enabled?: boolean;
  cuit?: string | null;
  razon_social?: string | null;
  condicion_iva?: CondicionIva | null;
  punto_venta_afip?: number | null;
  iibb?: string | null;
  inicio_actividades?: string | null;
  billing_enabled?: boolean;
}
export interface Category {
  id: string;
  store_id: string;
  name: string;
  canonicalName?: string;
}
export interface Register {
  id: string;
  store_id: string;
  name: string;
  active: boolean;
  branch_id: string;
}
export interface Branch { id: string; store_id: string; name: string; address: string; is_default: boolean }
export interface StockTransferItem { product_id: string; product_name: string; qty: number }
export type DepotAction = 'to_salon' | 'to_depot' | 'receive';
export interface DepotMovement {
  id: string; product_id: string; product_name: string; action: DepotAction; quantity: number;
  total_after: number; depot_after: number; actor_email: string | null; created_at: string;
}
export interface StockTransfer {
  id: string;
  store_id: string;
  from_branch_id: string;
  to_branch_id: string;
  created_by: string;
  created_at: string;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  items: StockTransferItem[];
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}
export interface PriceRule { scope: 'category' | 'brand' | 'product'; target: string; adjustment: number }
export interface PriceList {
  id: string; store_id: string; name: string; adjustment: number; active: boolean; branch_id?: string | null;
  is_primary?: boolean;
  base_kind?: 'cost' | 'catalog' | 'list'; parent_id?: string | null; pricing_rules?: PriceRule[]; revision?: number;
}
export interface PriceOverride { list_id: string; product_id: string; price: number }
export interface SalesLedger { id: string; store_id: string; name: string; is_default: boolean; active: boolean; payment_methods?: import('../../types/kiosco').PaymentMethod[] }
export interface SaleLedgerChange { id: string; from_name: string; to_name: string; changed_by: string; changed_at: string }
export interface Shift {
  id: string;
  store_id: string;
  register_id: string;
  opened_by: string;
  opened_at: string;
  opening_cash: number;
  closed_at: string | null;
  counted_cash: number | null;
  expected_cash: number | null;
  closing_denominations?: CashDenominations | null;
  ticket_count?: number | null;
}
export interface Product extends KioscoProduct {
  categoryId: string;
  cost: number;
  active: boolean;
  brand?: string;
  supplier?: string;
  supplierCode?: string;
  tags?: string[];
  unitType?: string;
  pack_size?: number | null;
  margin_group?: 'standard' | 'low_margin' | null;
  expiry_date?: string | null;
  last_restocked_at?: string | null;
}
export interface ProductDeletionRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  event_type: 'deleted' | 'restored' | 'prior';
  occurred_at: string | null;
  recorded_at: string;
  actor_email: string | null;
  reason: string | null;
  currentActive: boolean | null;
}
export interface Movement {
  shift_id?: string;
  store_id?: string;
  register_id?: string;
  created_by?: string;
  id: string;
  type: "INGRESO" | "RETIRO";
  amount: number;
  reason: string;
  created_at: string;
  category?: string;
  voucher_url?: string | null;
  supplier_name?: string | null;
}
export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  supplier_key: string;
  /** Descuento habitual del comercio con este proveedor, sobre el costo facturado. */
  discount_percent: number;
  notes: string | null;
  revision: number;
}
export interface Member {
  profile_id?: string | null;
  user_id: string;
  role: Role;
  email: string;
  branch_id: string | null;
  register_id: string | null;
}
export interface Invitation {
  profile_id?: string | null;
  id: string;
  email: string;
  role: Role;
  branch_id: string | null;
  register_id: string | null;
}
export interface SaleRow {
  shift_id?: string;
  store_id?: string;
  created_by?: string;
  payments?: KioscoSale['payments'];
  branch_id: string;
  branch_name: string;
  register_name: string;
  price_list_id: string | null;
  price_list_name: string;
  ledger_id: string;
  ledger_name: string;
  invoice_reference: string | null;
  cbte_tipo?: number | null;
  cbte_nro?: number | null;
  cae?: string | null;
  cae_vto?: string | null;
  billing_status?: BillingStatus;
  billing_error?: string | null;
  billing_attempts?: number;
  id: string;
  ticket_number: number;
  items: KioscoSale["items"];
  total: number;
  payment_method: KioscoSale["paymentMethod"];
  amount_paid: number;
  change: number;
  created_at: string;
}
export interface EanLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
  category_suggestion?: string;
  emoji?: string;
  source?: "ai" | "community" | "verified";
  confidence_score?: number;
}
export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (['PGRST202', 'PGRST204', '42703', '42P01'].includes(e?.code || '') && /retail_set_billing_settings|retail_update_sale_billing|billing_enabled|cuit|razon_social/.test(e.message || ''))
    return 'Falta actualizar la configuración fiscal en la base. Aplicá schema.sql con la migración 202610260003_billing_fields.sql y reintentá. El borrador se conserva.';
  if (e?.code === 'PGRST202' && /retail_create_composite_product/.test(e.message || ''))
    return 'Falta actualizar la creación de combos. Aplicá schema.sql con 202610260002_create_composite_product.sql y reintentá. El borrador se conserva.';
  if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '') && /retail_(?:set_depot|depot_)|depot_enabled/.test(e.message || ''))
    return 'Falta habilitar el depósito en la base. Aplicá schema.sql con 202610260001_optional_depot.sql, actualizá los datos y reintentá. El borrador se conserva.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /p_denominations|closing_denominations|ticket_count|retail_shift_ticket_count/.test(e.message || ''))
    return 'Falta actualizar el cierre de turnos. Aplicá schema.sql con la migración 202610240001_shift_closing_details.sql y actualizá los datos. El detalle pendiente se conserva.';
  if (['PGRST204', '42703'].includes(e?.code || '') && /sellable/.test(e.message || ''))
    return 'Falta habilitar insumos y costos de combos en Supabase. Aplicá 202610230002_ingredients_and_composition_costs.sql después de las migraciones anteriores, actualizá el catálogo y reintentá. El borrador se conserva.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /retail_set_margin_threshold|low_margin_threshold/.test(e.message || ''))
    return 'Falta habilitar el margen automático. Aplicá 202610230001_automatic_margin_groups.sql después de las migraciones anteriores y actualizá los datos.';
  if ((['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /retail_save_permission_profile|retail_management_locations|retail_write_branch|retail_write_register|revision/.test(e.message || '')) || (e?.code === '23514' && e.message?.includes('retail_permission_profiles_permissions_check')))
    return 'Falta ampliar los perfiles en Supabase. Aplicá 202610220006_complete_permission_profiles.sql después de las migraciones anteriores y actualizá los datos.';
  if ((e?.code === '23514' && e.message?.includes('retail_permission_profiles_permissions_check'))
    || (e?.code === 'PGRST202' && e.message?.includes('retail_update_product_price')))
    return 'Falta habilitar las acciones delegadas de productos. Aplicá la migración 202610210004_delegated_catalog_actions.sql y actualizá los permisos antes de reintentar.';
  if ((['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '')
    && /retail_(?:permissions|permission_profiles|set_staff_profile)|profile_id/.test(e.message || ''))
    || (e?.code === '23514' && /retail_(?:members|invitations)_role_check/.test(e.message || '')))
    return 'Falta actualizar roles y perfiles en Supabase. Aplicá la migración 202610210002_staff_profiles.sql y actualizá los datos antes de reintentar.';
  if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '')
    && /retail_(?:save_ledger_routing|prepare_sales_ledgers|move_sale_ledger|sale_ledger_changes)|payment_methods/.test(e.message || ''))
    return 'Falta actualizar los registros de ventas en Supabase. Aplicá la migración 202610210001_ledger_routing.sql, actualizá los datos y reintentá. Este cambio no se guardó.';
  if (['PGRST202', 'PGRST204', '42P01', '42703'].includes(e?.code || '') && /retail_enable_loose_cigarettes|retail_loose_unit_conversions/.test(e.message || ''))
    return 'Falta habilitar la conversión de atados en Supabase. Aplicá 202610220002_loose_cigarettes.sql después de la migración de composiciones y reintentá. No se convirtió el stock.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /stock_components|retail_save_product_composition/.test(e.message || ''))
    return 'Falta habilitar combos y sueltos en Supabase. Aplicá la migración 202610220001_product_compositions.sql, actualizá el catálogo y reintentá.';
  if (['PGRST202', 'PGRST205', '42P01'].includes(e?.code || '') && /retail_set_product_active|retail_product_deletions/.test(e.message || ''))
    return 'Falta habilitar el historial de productos en Supabase. Aplicá la migración 202610220003_product_deletion_history.sql y reintentá.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /display_name|retail_rename_category/.test(e.message || ''))
    return 'Falta habilitar los nombres de categorías. Aplicá 202610220005_category_labels.sql y actualizá los datos.';
  if (['PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '') && /catalog_name|retail_category_catalog/.test(e.message || ''))
    return 'Falta actualizar las categorías en Supabase. Aplicá 202610220004_standard_categories.sql y actualizá los datos. No hace falta crear categorías.';
  if (e?.code === '23505' && e.message?.includes('retail_one_active_price_list_per_branch'))
    return 'Esta sucursal ya tiene una lista activa. Desactivala o cambiala a global antes de asignar otra.';
  if (e?.code === 'PGRST204' || e?.code === '42703') {
    if (/sale_markup|is_primary/.test(e.message || ''))
      return 'Falta actualizar la lista Principal en Supabase. Aplicá supabase/updates/202610270002_primary_product_markup.sql después de las actualizaciones anteriores y recargá los datos. El borrador se conserva.';
    if (e.message?.includes('margin_group'))
      return 'Falta actualizar la base de datos: ejecutá completa la migración 202610160004_margin_groups.sql en el SQL Editor de Supabase. Después, actualizá la pantalla y volvé a guardar. El producto no se guardó.';
    if (e.message?.includes('pack_size'))
      return 'Falta actualizar la base de datos: ejecutá completa la migración 202610160003_pack_size.sql en el SQL Editor de Supabase. Después, actualizá la pantalla y volvé a guardar. El producto no se guardó.';
    if (e.message?.includes('expiry_date') || e.message?.includes('last_restocked_at'))
      return 'Falta actualizar la base de datos: ejecutá completa la migración 202610200003_product_expiry.sql en el SQL Editor de Supabase. Después, actualizá la pantalla y volvé a guardar. El producto no se guardó.';
    return `La base de datos no tiene una columna que necesita esta versión. Revisá las migraciones pendientes en SUPABASE_SETUP.md. ${e.message || ''}`;
  }
  if (e?.code === "PGRST205" || e?.code === "PGRST202" || e?.code === "42P01")
    return "Falta instalar la base de datos. Ejecutá la migración SQL indicada en SUPABASE_SETUP.md y volvé a intentar.";
  if (e?.code === "PGRST116")
    return "El registro cambió o ya no está disponible. Actualizá los datos antes de volver a guardar.";
  if (e?.code === "23505")
    return "Ya existe un registro con esos datos, o esta caja ya tiene un turno abierto. Actualizá la pantalla.";
  if (e?.code === "42501")
    return "Tu usuario no tiene permiso para realizar esta acción.";
  if (e?.message === "Invalid login credentials")
    return "Email o contraseña incorrectos.";
  if (e?.message === "Email not confirmed")
    return "Confirmá tu email antes de ingresar.";
  return (
    e?.message ||
    "No se pudo conectar. Verificá tu conexión y volvé a intentar."
  );
}
async function result<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data as T;
}
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const batch = await result<T[]>(page(from, from + 499));
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
export const saleFromRow = (row: SaleRow): KioscoSale => ({
  shift_id: row.shift_id,
  store_id: row.store_id,
  created_by: row.created_by,
  branchId: row.branch_id,
  branchName: row.branch_name,
  registerName: row.register_name,
  priceListId: row.price_list_id,
  priceListName: row.price_list_name,
  ledgerId: row.ledger_id,
  ledgerName: row.ledger_name,
  invoiceReference: row.invoice_reference,
  cbteTipo: row.cbte_tipo ?? null,
  cbteNro: row.cbte_nro ?? null,
  cae: row.cae ?? null,
  caeVto: row.cae_vto ?? null,
  billingStatus: row.billing_status ?? 'none',
  billingError: row.billing_error ?? null,
  billingAttempts: row.billing_attempts ?? 0,
  id: row.id,
  ticketNumber: `T-${row.ticket_number}`,
  items: row.items,
  total: Number(row.total),
  paymentMethod: row.payment_method,
  payments: row.payments,
  amountPaid: Number(row.amount_paid),
  change: Number(row.change),
  timestamp: new Date(row.created_at).toLocaleTimeString("es-AR"),
  date: new Date(row.created_at).toLocaleDateString("es-AR"),
  created_at: row.created_at,
  createdAt: row.created_at,
});

async function lookupOpenFoodFacts(code: string): Promise<EanLookupResult> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
      signal: AbortSignal.timeout(2800),
      headers: {
        'User-Agent': 'KioscoAdminApp/1.0 (retail product lookup)',
      },
    });
    if (!res.ok) return { found: false };
    const json = await res.json();
    if (json.status !== 1 || !json.product) return { found: false };
    const p = json.product;
    const name: string = (p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '').trim();
    if (!name) return { found: false };
    const brand: string | undefined = p.brands?.split(',')[0]?.trim() || undefined;
    const rawCategories: string = p.categories_es || p.categories || '';
    const category_suggestion = rawCategories.split(',')[0]?.trim() || undefined;
    return {
      found: true,
      name,
      brand,
      category_suggestion,
      emoji: '📦',
      source: 'community',
      confidence_score: 0.85,
    };
  } catch {
    return { found: false };
  }
}

const remoteRetail = {
  enableBranchInventory: locationTransfers.enable,
  reviewLocationTransfer: locationTransfers.review,
  async quickProducts(store: string, branch: string) {
    return result<{ product_id: string; position: number }[]>(supabase.from('retail_quick_products').select('product_id,position').eq('store_id', store).eq('branch_id', branch).order('position'));
  },
  async popularProducts(store: string, branch: string) {
    return result<{ product_id: string; units: number }[]>(supabase.rpc('retail_popular_products', { p_store: store, p_branch: branch }));
  },
  async saveQuickProducts(store: string, branch: string, products: string[]) {
    return result(supabase.rpc('retail_save_quick_products', { p_store: store, p_branch: branch, p_products: products }));
  },
  async branches(store: string) {
    return result<Branch[]>(supabase.from('retail_branches').select('*').eq('store_id', store).order('is_default', { ascending: false }).order('name'));
  },
  async priceLists(store: string) {
    return result<PriceList[]>(supabase.from('retail_price_lists').select('*').eq('store_id', store).order('name'));
  },
  async branchPriceRule(store: string, branch: string): Promise<string | null> {
    return result<string | null>(supabase.rpc('retail_active_price_list_for_branch', { p_store: store, p_branch: branch }));
  },
  async priceOverrides(store: string) {
    return allRows<PriceOverride>((from, to) => supabase.from('retail_price_overrides').select('*').eq('store_id', store).order('list_id').order('product_id').range(from, to));
  },
  async ledgers(store: string) {
    return result<SalesLedger[]>(supabase.from('retail_ledgers').select('*').eq('store_id', store).order('is_default', { ascending: false }).order('name'));
  },
  async saveBranch(store: string, name: string, address: string, id?: string) {
    return result(supabase.rpc('retail_write_branch', { p_store: store, p_name: name.trim(), p_address: address, p_id: id || null }));
  },
  async managementLocations(store: string) {
    return result<{ branches: Branch[]; registers: Register[] }>(supabase.rpc('retail_management_locations', { p_store: store }));
  },
  async savePriceList(store: string, name: string, adjustment: number, id?: string, active = true, branchId?: string | null) {
    const previous = id ? await result<PriceList>(supabase.from('retail_price_lists').select('*').eq('store_id', store).eq('id', id).single()) : undefined;
    const primary = previous ? undefined : await result<PriceList | null>(supabase.from('retail_price_lists').select('*').eq('store_id', store).eq('is_primary', true).maybeSingle());
    if (!previous && !primary) throw new Error('Actualizá la lista Principal en Supabase antes de crear listas. El borrador se conserva.');
    return result(supabase.rpc('retail_save_price_list_tree', {
      p_store: store, p_id: id || randomUUID(), p_name: name.trim(), p_adjustment: adjustment, p_active: active,
      p_branch: branchId === undefined ? previous?.branch_id || null : branchId || null,
      p_base: previous?.base_kind || 'list', p_parent: previous?.parent_id || primary?.id || null,
      p_rules: previous?.pricing_rules || [], p_revision: previous?.revision ?? 0,
    }));
  },
  async savePriceOverride(store: string, list: string, product: string, price: number | null) {
    return result(supabase.rpc('retail_save_price_override', { p_store: store, p_list: list, p_product: product, p_price: price }));
  },
  async savePriceListTree(store: string, list: PriceList) {
    const { data, error } = await supabase.rpc('retail_save_price_list_tree', {
      p_store: store, p_id: list.id, p_name: list.name.trim(), p_adjustment: list.adjustment,
      p_active: list.active, p_branch: list.branch_id || null, p_base: list.base_kind || 'catalog',
      p_parent: list.parent_id || null, p_rules: list.pricing_rules || [], p_revision: list.revision ?? 0,
    });
    if (error?.code === 'PGRST202') throw new Error('Falta actualizar las listas en Supabase. Aplicá el schema preparado y volvé a guardar; el borrador se conserva.');
    if (error) throw error;
    return data as string;
  },
  async saveLedger(store: string, name: string, id?: string, active = true) {
    const query = supabase.from('retail_ledgers');
    return result(id ? query.update({ name: name.trim(), active }).eq('store_id', store).eq('id', id).select('id').single() : query.insert({ store_id: store, name: name.trim() }));
  },
  async deletePriceList(store: string, list: string, revision: number) {
    const { data, error } = await supabase.rpc('retail_delete_price_list', { p_store: store, p_list: list, p_revision: revision });
    if (error?.code === 'PGRST202') throw new Error('Falta actualizar la eliminación de listas en Supabase. Aplicá schema.sql y reintentá. La lista sigue disponible.');
    if (error) throw error;
    return data as string;
  },
  async saveLedgerRouting(store: string, defaultId: string, rules: Record<string, string>) {
    return result(supabase.rpc('retail_save_ledger_routing', { p_store: store, p_default: defaultId, p_rules: rules }));
  },
  async prepareSalesLedgers(store: string) {
    return result(supabase.rpc('retail_prepare_sales_ledgers', { p_store: store }));
  },
  async moveSaleLedger(store: string, sale: string, target: string, expected: string, request: string) {
    const row = await result<SaleRow>(supabase.rpc('retail_move_sale_ledger', { p_store: store, p_sale: sale, p_target: target, p_expected: expected, p_request: request }));
    return saleFromRow(row);
  },
  async saleLedgerHistory(store: string, sale: string) {
    return allRows<SaleLedgerChange>((from, to) => supabase.from('retail_sale_ledger_changes').select('id,from_name,to_name,changed_by,changed_at')
      .eq('store_id', store).eq('sale_id', sale).order('changed_at', { ascending: false }).order('id').range(from, to));
  },
  async reportSales(store: string, fromDate: string, toDate: string) {
    const rows = await allRows<SaleRow>((from, to) => supabase.from('retail_sales').select('*').eq('store_id', store).gte('created_at', fromDate).lt('created_at', toDate).order('created_at').order('id').range(from, to));
    return rows.map(saleFromRow);
  },
  async attachInvoice(sale: string, reference: string) {
    return result(supabase.rpc('retail_attach_invoice', { p_sale: sale, p_reference: reference.trim() }));
  },
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
  async products(store: string, categories: Category[]): Promise<Product[]> {
    const rows = await allRows<{
      id: string;
      category_id: string;
      code: string;
      name: string;
      price: number;
      cost: number;
      stock: number;
      min_stock: number;
      emoji: string;
      active: boolean;
      brand?: string | null;
      supplier?: string | null;
      supplier_code?: string | null;
      tags?: string[] | null;
      unit_type?: string | null;
      pack_size?: number | null;
      sale_markup?: number | null;
      margin_group?: 'standard' | 'low_margin' | null;
      expiry_date?: string | null;
      last_restocked_at?: string | null;
      stock_components?: StockComponent[];
      sellable?: boolean;
    }>((from, to) =>
      supabase
        .from("retail_products")
        .select("*")
        .eq("store_id", store)
        .eq("active", true)
        .order("name")
        .order("id")
        .range(from, to),
    );
    const balances = await allRows<{ product_id: string; quantity: number }>((from, to) => supabase.from('retail_depot_balances')
      .select('product_id,quantity').eq('store_id', store).order('product_id').range(from, to)).catch(async error => {
      if (!['PGRST205', '42P01'].includes(error?.code)) throw error;
      // Compatibility with a server preceding this feature, never a missing
      // balance table on a commerce that already enabled its depot.
      const current = await result<Store>(supabase.from('retail_stores').select('*').eq('id', store).single());
      if (current.depot_enabled) throw error;
      return [];
    });
    const depot = new Map((balances || []).map(row => [row.product_id, Number(row.quantity)]));
    const locationMode = await result<{ branch_inventory_enabled?: boolean }>(supabase.from('retail_stores').select('*').eq('id', store).single());
    const branchRows = locationMode.branch_inventory_enabled
      ? await allRows<{ product_id: string; branch_id: string; quantity: number }>((from, to) => supabase.from('retail_branch_stock').select('product_id,branch_id,quantity').eq('store_id', store).order('product_id').order('branch_id').range(from, to)) : [];
    const branchStock = new Map<string, Record<string, number>>();
    for (const row of branchRows) {
      const allocations = branchStock.get(row.product_id) || {};
      allocations[row.branch_id] = Number(row.quantity);
      branchStock.set(row.product_id, allocations);
    }
    return withAvailableStock<Product>(rows.map((p) => ({
      id: p.id,
      categoryId: p.category_id,
      category:
        categories.find((c) => c.id === p.category_id)?.name || "Varios",
      code: p.code,
      name: p.name,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: p.stock,
      depotStock: depot.get(p.id) || 0,
      ...(locationMode.branch_inventory_enabled ? { branchStocks: branchStock.get(p.id) || {} } : {}),
      minStock: p.min_stock,
      emoji: p.emoji,
      active: p.active,
      brand: p.brand || undefined,
      supplier: p.supplier || undefined,
      supplierCode: p.supplier_code || undefined,
      tags: Array.isArray(p.tags) ? p.tags : [],
      unitType: p.unit_type || "unit",
      pack_size: p.pack_size ?? null,
      sale_markup: p.sale_markup == null ? null : Number(p.sale_markup),
      margin_group: p.margin_group ?? 'standard',
      expiry_date: p.expiry_date ?? null,
      last_restocked_at: p.last_restocked_at ?? null,
      stock_components: p.stock_components || [],
      sellable: p.sellable !== false,
    })));
  },
  async shifts(store: string) {
    const [opened, closed] = await Promise.all([
      result<Shift[]>(
        supabase
          .from("retail_shifts")
          .select("*")
          .eq("store_id", store)
          .is("closed_at", null)
          .order("opened_at", { ascending: false }),
      ),
      result<Shift[]>(
        supabase
          .from("retail_shifts")
          .select("*")
          .eq("store_id", store)
          .not("closed_at", "is", null)
          .order("closed_at", { ascending: false })
          .limit(200),
      ),
    ]);
    return [...opened, ...closed];
  },
  async sales(store: string, shift: string) {
    const rows = await allRows<SaleRow>((from, to) =>
      supabase
        .from("retail_sales")
        .select("*")
        .eq("store_id", store)
        .eq("shift_id", shift)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    return rows.map(saleFromRow);
  },
  async allSales(store: string, limit = 500) {
    const rows = await result<SaleRow[]>(
      supabase
        .from("retail_sales")
        .select("*")
        .eq("store_id", store)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
    return (rows || []).map(saleFromRow);
  },
  async movements(store: string, shift: string) {
    const rows = await allRows<Movement>((from, to) =>
      supabase
        .rpc('retail_movement_details', { p_store: store, p_shift: shift })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    return rows.map(row => ({ ...row, store_id: store, shift_id: shift }));
  },
  async saveProduct(
    store: string,
    p: Omit<Product, "category">,
    edit: boolean,
    expectedStock?: number,
    stockBranch?: string,
  ) {
    if (p.pack_size != null && (!Number.isInteger(p.pack_size) || p.pack_size < 1 || p.pack_size > 2147483647)) throw new Error('Las unidades por bulto deben ser un número entero mayor o igual a 1.');
    const values: Record<string, unknown> = {
      category_id: p.categoryId || null,
      code: p.code.trim(),
      name: p.name.trim(),
      price: p.price,
      ...(p.sale_markup !== undefined ? { sale_markup: p.sale_markup } : {}),
      cost: p.cost,
      stock: hasComposition(p) ? 0 : p.stock,
      min_stock: p.minStock,
      emoji: p.emoji,
      active: true,
      ...(p.sellable !== undefined ? { sellable: p.sellable } : {}),
      brand: p.brand?.trim() || null,
      supplier: p.supplier?.trim() || null,
      supplier_code: p.supplierCode?.trim() || null,
      tags: p.tags || [],
      unit_type: p.unitType || "unit",
      pack_size: p.pack_size ?? null,
      // Older callers that only edit prices must not clear optional metadata.
      ...(p.expiry_date !== undefined ? { expiry_date: p.expiry_date || null } : {}),
      ...(p.last_restocked_at !== undefined ? { last_restocked_at: p.last_restocked_at || null } : {}),
    };
    if (stockBranch) return result<{ id: string }>(supabase.rpc('retail_save_product_at_branch', {
      p_store: store, p_values: { ...values, ...(edit ? { id: p.id } : {}) }, p_edit: edit,
      p_expected: expectedStock ?? p.stock, p_branch: stockBranch,
    }));
    if (edit)
      return result<{ id: string }>(
        supabase
          .from("retail_products")
          .update(values)
          .eq("store_id", store)
          .eq("id", p.id)
          .eq("active", true)
          .eq("stock", expectedStock ?? p.stock)
          .select("id")
          .single(),
      );
    return result<{ id: string }>(
      supabase
        .from("retail_products")
        .insert({ ...values, store_id: store })
        .select("id")
        .single(),
    );
  },
  async createCompositeProduct(store: string, request: string, data: { name: string; code: string; price: number; sale_markup?: number | null; categoryId: string; components: StockComponent[] }) {
    if (data.sale_markup != null) {
      const primary = await result<{ id: string } | null>(supabase.from('retail_price_lists').select('id').eq('store_id', store).eq('is_primary', true).maybeSingle());
      if (!primary) throw new Error('Actualizá la lista Principal en Supabase antes de guardar un combo por porcentaje. El borrador se conserva.');
    }
    return result<string>(supabase.rpc('retail_create_composite_product', { p_store: store, p_request: request, p_data: data }));
  },
  async archiveProduct(store: string, id: string, request?: { id: string; reason?: string; product?: Product }) {
    const p = request?.product;
    return result(supabase.rpc('retail_set_product_active', {
      p_store: store, p_product: id, p_active: false, p_request: request?.id || randomUUID(),
      p_reason: request?.reason?.trim() || null,
      p_expected: p ? { name: p.name, code: p.code, stock: hasComposition(p) ? 0 : p.stock, components: p.stock_components || [] } : null,
    }));
  },
  async restoreProduct(store: string, id: string, request: string) {
    return result(supabase.rpc('retail_set_product_active', {
      p_store: store, p_product: id, p_active: true, p_request: request, p_reason: null, p_expected: null,
    }));
  },
  async deleteProductPermanently(store: string, id: string) {
    return result(supabase.rpc('retail_delete_product_permanently', {
      p_store: store, p_product: id,
    }));
  },
  async productDeletionHistory(store: string, search = '', cursor?: { recorded_at: string; id: string }) {
    let query = supabase.from('retail_product_deletions')
      .select('id,product_id,product_name,product_code,event_type,occurred_at,recorded_at,actor_email,reason')
      .eq('store_id', store).order('recorded_at', { ascending: false }).order('id', { ascending: false }).limit(50);
    if (search.trim()) query = query.ilike('search_text', `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`);
    if (cursor) {
      if (!isValidUUID(cursor.id) || !Number.isFinite(Date.parse(cursor.recorded_at)) || !/^[\dT:.+Z-]+$/.test(cursor.recorded_at)) throw new Error('Actualizá el historial para continuar.');
      query = query.or(`recorded_at.lt.${cursor.recorded_at},and(recorded_at.eq.${cursor.recorded_at},id.lt.${cursor.id})`);
    }
    const rows = await result<Omit<ProductDeletionRecord, 'currentActive'>[]>(query);
    if (!rows.length) return [];
    const states = await result<{ id: string; active: boolean }[]>(supabase.from('retail_products').select('id,active').eq('store_id', store).in('id', [...new Set(rows.map(row => row.product_id))]));
    return rows.map(row => ({ ...row, currentActive: states.find(p => p.id === row.product_id)?.active ?? null }));
  },
  async replenishProductStock(
    store: string,
    productId: string,
    newStock: number,
    newCost?: number,
    _quantityAdded?: number,
    request?: { id: string; at: string; branch?: string },
  ) {
    // Preserve the durable stock contract even without IndexedDB.
    if (_quantityAdded !== undefined) return result(supabase.rpc('retail_sync_operation', { p_operation: {
      id: request?.id || randomUUID(), kind: 'stock', store, at: request?.at || new Date().toISOString(), ...(request?.branch ? { branch: request.branch } : {}),
      items: [{ product: productId, delta: _quantityAdded, cost: newCost ?? null }],
    } }));
    const values: Record<string, unknown> = {
      stock: newStock,
      ...(_quantityAdded !== undefined && _quantityAdded > 0 ? { last_restocked_at: new Date().toISOString() } : {}),
    };
    if (typeof newCost === "number" && newCost >= 0) {
      values.cost = newCost;
    }
    return result(
      supabase
        .from("retail_products")
        .update(values)
        .eq("store_id", store)
        .eq("id", productId)
        .select("id")
        .single(),
    );
  },
  async replenishStockBatch(
    store: string,
    items: { id: string; newStock: number; newCost?: number; quantityAdded?: number }[],
    stockBranch?: string,
  ) {
    if (stockBranch) return result(supabase.rpc('retail_sync_operation', { p_operation: {
      id: randomUUID(), kind: 'stock', store, at: new Date().toISOString(), branch: stockBranch,
      items: items.map(item => ({ product: item.id, delta: item.quantityAdded, cost: item.newCost ?? null })),
    } }));
    const results = [];
    const nowIso = new Date().toISOString();
    for (const item of items) {
      const values: Record<string, unknown> = {
        stock: item.newStock,
        ...(item.quantityAdded !== undefined && item.quantityAdded > 0 ? { last_restocked_at: nowIso } : {}),
      };
      if (typeof item.newCost === "number" && item.newCost >= 0) {
        values.cost = item.newCost;
      }
      const res = await result(
        supabase
          .from("retail_products")
          .update(values)
          .eq("store_id", store)
          .eq("id", item.id)
          .select("id")
          .single(),
      );
      results.push(res);
    }
    return results;
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
  async saveMarginThreshold(store: string, threshold: number, expected: number) {
    return result(supabase.rpc('retail_set_margin_threshold', { p_store: store, p_threshold: threshold, p_expected: expected }));
  },
  async saveBillingSettings(
    store: string,
    settings: {
      cuit: string;
      razon_social: string;
      condicion_iva: CondicionIva;
      punto_venta_afip: number;
      iibb?: string | null;
      inicio_actividades?: string | null;
      billing_enabled: boolean;
    },
  ) {
    return result(
      supabase.rpc('retail_set_billing_settings', {
        p_store: store,
        p_cuit: settings.cuit,
        p_razon_social: settings.razon_social,
        p_condicion_iva: settings.condicion_iva,
        p_punto_venta_afip: settings.punto_venta_afip,
        p_iibb: settings.iibb || null,
        p_inicio_actividades: settings.inicio_actividades || null,
        p_billing_enabled: settings.billing_enabled,
      }),
    );
  },
  async updateSaleBilling(
    store: string,
    saleId: string,
    status: BillingStatus,
    details?: {
      cbte_tipo?: number;
      cbte_nro?: number;
      cae?: string;
      cae_vto?: string;
      error?: string;
    },
  ) {
    const params: Record<string, unknown> = {
      p_store: store,
      p_sale: saleId,
      p_status: status,
    };
    if (details?.cbte_tipo != null) params.p_cbte_tipo = details.cbte_tipo;
    if (details?.cbte_nro != null) params.p_cbte_nro = details.cbte_nro;
    if (details?.cae != null) params.p_cae = details.cae;
    if (details?.cae_vto != null) params.p_cae_vto = details.cae_vto;
    if (details?.error != null) params.p_error = details.error;

    return result(supabase.rpc('retail_update_sale_billing', params));
  },
  async setBillingCredentials(
    store: string,
    cert: string,
    key: string,
    environment: 'homo' | 'prod' = 'homo',
  ) {
    return result(
      supabase.rpc('retail_set_billing_credentials', {
        p_store: store,
        p_cert: cert,
        p_key: key,
        p_environment: environment,
      }),
    );
  },
  async getBillingCredentialsStatus(
    store: string,
  ): Promise<{ configured: boolean; environment?: 'homo' | 'prod'; updated_at?: string | null }> {
    return result(
      supabase.rpc('retail_get_billing_credentials_status', {
        p_store: store,
      }),
    );
  },
  async testBillingConnection(
    store: string,
  ): Promise<{ success: boolean; message?: string; environment?: string; puntoVenta?: number; ultimoComprobante?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('billing-authorize', {
      body: {
        storeId: store,
        action: 'test_connection',
      },
    });
    if (error) {
      throw new Error(error.message || 'Error al conectar con el servicio de comprobación de ARCA');
    }
    return data;
  },
  async generateBillingCsr(
    store: string,
    cuit: string,
    razonSocial: string,
    alias = 'kiosco_pos',
  ): Promise<{ success: boolean; privateKey: string; csr: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('billing-authorize', {
      body: {
        storeId: store,
        action: 'generate_csr',
        cuit,
        razonSocial,
        alias,
      },
    });
    if (error) {
      throw new Error(error.message || 'Error al generar pedido de certificado en backend');
    }
    return data;
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
  async members(store: string) {
    return result<Member[]>(supabase.rpc('retail_team', { p_store: store }));
  },
  async permissions(store: string) {
    return result<Permission[]>(supabase.rpc('retail_permissions', { p_store: store }));
  },
  async permissionProfiles(store: string) {
    return result<PermissionProfile[]>(supabase.from('retail_permission_profiles').select('*').eq('store_id', store).order('name'));
  },
  async updateProductPrice(store: string, product: string, price: number, expected: number) {
    return result(supabase.rpc('retail_update_product_price', { p_store: store, p_product: product, p_price: price, p_expected: expected }));
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
  async registerAvailability(store: string) {
    return result<{ register_id: string; occupied: boolean }[]>(supabase.rpc('retail_register_availability', { p_store: store }));
  },
  async shiftBalance(shift: string) {
    return Number(await result<number>(supabase.rpc('retail_shift_balance', { p_shift: shift })));
  },
  async shiftTicketCount(shift: string) {
    return Number(await result<number>(supabase.rpc('retail_shift_ticket_count', { p_shift: shift })));
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
  async openShift(store: string, register: string, opening: number) {
    return result<string>(
      supabase.rpc("retail_open_shift", {
        p_store: store,
        p_register: register,
        p_opening: opening,
      }),
    );
  },
  async openOnboardingShift(store: string, register: string, opening: number) {
    await syncOffline();
    return onboarding.open(store, register, opening);
  },
  async closeShift(shift: string, counted: number, denominations?: CashDenominations | null) {
    const detail = closingCashDenominations(denominations, counted);
    return result<number>(
      supabase.rpc("retail_close_shift", {
        p_shift: shift,
        p_counted: counted,
        ...(detail ? { p_denominations: detail } : {}),
      }),
    );
  },
  async addMovement(
    shift: string,
    type: string,
    amount: number,
    reason: string,
    request: string,
    category = 'general',
    voucherUrl?: string | null,
    supplierName?: string | null,
  ) {
    const details = movementDetails(type, category, voucherUrl, supplierName);
    return result(
      supabase.rpc("retail_add_movement", {
        p_shift: shift,
        p_type: type,
        p_amount: amount,
        p_reason: reason,
        p_request: request,
        p_category: details.category,
        p_voucher_url: details.voucherUrl,
        p_supplier_name: details.supplierName,
      }),
    );
  },
  async uploadVoucher(store: string, shiftId: string, file: File): Promise<string> {
    const extension = voucherExtension(file);
    if (!isValidUUID(store) || !isValidUUID(shiftId)) throw new Error('Comercio o turno inválido.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Necesitás conexión para subir el comprobante. Conservá el archivo y reintentá cuando vuelva internet.');
    await syncOffline();
    const shift = await result<{ id: string } | null>(supabase.from('retail_shifts').select('id').eq('id', shiftId).eq('store_id', store).is('closed_at', null).maybeSingle());
    if (!shift) throw new Error('El turno no está disponible en el servidor. Sincronizá o actualizá el turno y reintentá.');
    const path = `${store}/${shiftId}/${randomUUID()}.${extension}`;
    await result(supabase.storage.from(VOUCHER_BUCKET).upload(path, file, { contentType: voucherMimeType(file), upsert: false, cacheControl: '0' }));
    return voucherReference(path);
  },
  async uploadRemito(store: string, file: File): Promise<string> {
    const extension = remitoExtension(file);
    if (!isValidUUID(store)) throw new Error('Comercio inválido.');
    if (navigator.onLine === false) throw new Error('Necesitás conexión para enviar la foto. El borrador sigue en esta pantalla.');
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Iniciá sesión antes de enviar el remito.');
    const path = `${store}/${data.user.id}/${randomUUID()}.${extension}`;
    await result(supabase.storage.from(REMITO_BUCKET).upload(path, file, { contentType: voucherMimeType(file), upsert: false, cacheControl: '0' }));
    return remitoReference(path);
  },
  async getRemitoUrl(store: string, reference: string): Promise<string> {
    const path = remitoPath(store, reference);
    const signed = await result<{ signedUrl: string }>(supabase.storage.from(REMITO_BUCKET).createSignedUrl(path, 300));
    return signed.signedUrl;
  },
  async submitPendingReplenishment(store: string, branchId: string | null, imageUrl: string, extractedText: string | null, items: PendingReplenishmentItem[], notes: string): Promise<string> {
    remitoPath(store, imageUrl);
    return result<string>(supabase.rpc('retail_submit_pending_replenishment', {
      p_store: store, p_branch: branchId || null, p_image_url: imageUrl, p_extracted_text: extractedText || null, p_items: items, p_notes: notes.trim() || null,
    }));
  },
  async approvePendingReplenishment(store: string, id: string, items?: PendingReplenishmentItem[], branchId?: string): Promise<string> {
    if (branchId) return result<string>(supabase.rpc('retail_approve_replenishment_at_branch', { p_store: store, p_id: id, p_items: items ?? null, p_branch: branchId }));
    return result<string>(supabase.rpc('retail_approve_replenishment', { p_store: store, p_id: id, p_items: items ?? null }));
  },
  async rejectPendingReplenishment(store: string, id: string, reason: string): Promise<string> {
    return result<string>(supabase.rpc('retail_reject_replenishment', { p_store: store, p_id: id, p_reason: reason.trim() }));
  },
  async pendingReplenishments(store: string): Promise<PendingReplenishment[]> {
    return allRows<PendingReplenishment>((from, to) => supabase.from('retail_pending_replenishments').select('*').eq('store_id', store).eq('status', 'pending').order('submitted_at').order('id').range(from, to));
  },
  async createTransfer(store: string, fromBranch: string, toBranch: string, items: StockTransferItem[], notes: string, requestId?: string): Promise<string> {
    if (!fromBranch || !toBranch || fromBranch === toBranch) throw new Error('Elegí sucursales de origen y destino diferentes.');
    return result<string>(supabase.rpc('retail_create_transfer', {
      p_store: store, p_from_branch: fromBranch, p_to_branch: toBranch, p_items: items, p_notes: notes.trim() || null, p_request: requestId || randomUUID(),
    }));
  },
  async setDepot(store: string, enabled: boolean) {
    return result(supabase.rpc('retail_set_depot', { p_store: store, p_enabled: enabled }));
  },
  async depotOperation(store: string, product: string, quantity: number, action: DepotAction, request: string, cost?: number, note?: string, stockBranch?: string) {
    return result<string>(supabase.rpc(stockBranch ? 'retail_depot_operation_at_branch' : 'retail_depot_operation', {
      ...(stockBranch ? { p_branch: stockBranch } : {}),
      p_store: store, p_product: product, p_quantity: quantity, p_action: action, p_request: request,
      p_cost: cost ?? null, p_note: note?.trim() || null,
    }));
  },
  async depotMovements(store: string, product: string): Promise<DepotMovement[]> {
    return result<DepotMovement[]>(supabase.from('retail_depot_movements')
      .select('id,product_id,product_name,action,quantity,total_after,depot_after,actor_email,created_at')
      .eq('store_id', store).eq('product_id', product).order('created_at', { ascending: false }).order('id').limit(30));
  },
  async confirmTransfer(store: string, transferId: string): Promise<string> {
    return result<string>(supabase.rpc('retail_confirm_transfer', { p_store: store, p_transfer_id: transferId }));
  },
  async cancelTransfer(store: string, transferId: string): Promise<string> {
    return result<string>(supabase.rpc('retail_cancel_transfer', { p_store: store, p_transfer_id: transferId }));
  },
  async stockTransfers(store: string): Promise<StockTransfer[]> {
    return allRows<StockTransfer>((from, to) => supabase.from('retail_stock_transfers').select('*').eq('store_id', store).order('created_at', { ascending: false }).order('id').range(from, to));
  },
  async getVoucherUrl(store: string, shiftId: string, reference: string): Promise<string> {
    const path = voucherPath(store, shiftId, reference);
    // Storage SELECT policy authorizes managers only, including when called outside the UI.
    const signed = await result<{ signedUrl: string }>(supabase.storage.from(VOUCHER_BUCKET).createSignedUrl(path, 60));
    return signed.signedUrl;
  },
  async enableLooseCigarettes(store: string, packet: Product, request: string, input: {
    unitsPerPacket: number; target: Product | null; name: string; code: string; price: number; cost: number;
  }) {
    const snapshot = (product: Product) => ({ name: product.name, code: product.code, stock: hasComposition(product) ? 0 : product.stock, cost: product.cost, price: product.price, components: product.stock_components || [] });
    return result<string>(supabase.rpc('retail_enable_loose_cigarettes', {
      p_store: store, p_packet: packet.id, p_request: request,
      p_data: { units: input.unitsPerPacket, target: input.target?.id || null, name: input.name, code: input.code, price: input.price, cost: input.cost,
        expected_packet: snapshot(packet), expected_unit: input.target ? snapshot(input.target) : null },
    }));
  },
  async saveProductComposition(store: string, product: string, components: StockComponent[], expected: StockComponent[]) {
    return result(supabase.rpc('retail_save_product_composition', {
      p_store: store, p_product: product, p_components: components, p_expected: expected,
    }));
  },
  async checkout(store: string, shift: string, sale: KioscoSale) {
    const id = await result<string>(
      supabase.rpc("retail_checkout", {
        p_price_list: sale.priceListId || null,
        p_ledger: sale.ledgerId || null,
        p_shift: shift,
        p_request: sale.id,
        p_method: sale.paymentMethod,
        p_payments: sale.payments || null,
        p_paid: sale.amountPaid,
        p_items: sale.items.map((i) => ({
          product_id: i.productId || null,
          name: i.name,
          qty: i.qty,
          unit_price: i.unitPrice,
          stock_components: i.stockComponents || [],
        })),
      }),
    );
    const row = await result<SaleRow>(
      supabase
        .from("retail_sales")
        .select("*")
        .eq("store_id", store)
        .eq("id", id)
        .single(),
    );
    return saleFromRow(row);
  },
  async bulkUpdatePrices(
    storeId: string,
    updates: { id: string; price?: number; newPrice?: number }[],
  ): Promise<void> {
    if (!updates || updates.length === 0) return;

    for (const u of updates) {
      if (!isValidUUID(u.id)) {
        throw new Error(`ID de producto inválido: "${u.id}"`);
      }
      const val = typeof u.price === "number" ? u.price : u.newPrice;
      if (typeof val !== "number" || isNaN(val) || val <= 0) {
        throw new Error(
          `Precio inválido para el producto ${u.id}: ${val}`,
        );
      }
    }

    await result(supabase.rpc('retail_update_prices', {
      p_store: storeId,
      p_updates: updates.map((u) => ({
        id: u.id,
        price: typeof u.price === "number" ? u.price : u.newPrice,
      })),
    }));
  },
  async suppliers(storeId: string): Promise<Supplier[]> {
    const rows = await allRows<Supplier>((from, to) =>
      supabase.from("retail_suppliers").select("*").eq("store_id", storeId).order("name").range(from, to),
    );
    return rows.map((row) => ({ ...row, discount_percent: Number(row.discount_percent) }));
  },
  async saveSupplier(storeId: string, supplier: { id?: string; name: string; discount_percent: number; notes?: string | null; revision?: number }) {
    return result<Supplier>(supabase.rpc("retail_save_supplier", {
      p_store: storeId, p_id: supplier.id || null, p_name: supplier.name,
      p_discount: supplier.discount_percent, p_notes: supplier.notes?.trim() || null, p_expected: supplier.revision ?? null,
    }));
  },
  async deleteSupplier(storeId: string, supplier: Supplier) {
    return result(supabase.rpc("retail_delete_supplier", { p_store: storeId, p_id: supplier.id, p_expected: supplier.revision }));
  },
  /** Learned invoice layouts; rows with an unknown shape are ignored, so those invoices use AI. */
  async supplierInvoiceFormats(storeId: string): Promise<StoredInvoiceFormat[]> {
    const rows = await allRows<StoredInvoiceFormat>((from, to) =>
      supabase.from("retail_supplier_invoice_formats").select("supplier_key,supplier_name,format,samples,local_reads")
        .eq("store_id", storeId).order("supplier_key").range(from, to),
    );
    return rows.flatMap((row) => {
      const format = toInvoiceFormat(row.format);
      return format ? [{ ...row, format, samples: Number(row.samples), local_reads: Number(row.local_reads) }] : [];
    });
  },
  async saveSupplierInvoiceFormat(storeId: string, supplier: string, format: InvoiceFormat, samples: number, localRead: boolean) {
    return result(supabase.rpc("retail_save_supplier_invoice_format", {
      p_store: storeId, p_supplier: supplier, p_format: format, p_samples: samples, p_local_read: localRead,
    }));
  },
  async deleteSupplierInvoiceFormat(storeId: string, supplier: string) {
    return result(supabase.rpc("retail_delete_supplier_invoice_format", { p_store: storeId, p_supplier: supplier }));
  },
  async getDistributors(storeId: string): Promise<string[]> {
    const rows = await allRows<{ supplier: string | null }>((from, to) =>
      supabase
        .from("retail_products")
        .select("supplier")
        .eq("store_id", storeId)
        .not("supplier", "is", null)
        .neq("supplier", "")
        .order("supplier")
        .range(from, to),
    );
    const set = new Set<string>();
    for (const r of rows) {
      const trimmed = r.supplier?.trim();
      if (trimmed) set.add(trimmed);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-AR"));
  },
  async getBrands(storeId: string): Promise<string[]> {
    const rows = await allRows<{ brand: string | null }>((from, to) =>
      supabase
        .from("retail_products")
        .select("brand")
        .eq("store_id", storeId)
        .not("brand", "is", null)
        .neq("brand", "")
        .order("brand")
        .range(from, to),
    );
    const set = new Set<string>();
    for (const r of rows) {
      const trimmed = r.brand?.trim();
      if (trimmed) set.add(trimmed);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-AR"));
  },
  async getTags(storeId: string): Promise<string[]> {
    const rows = await allRows<{ tags: string[] | null }>((from, to) =>
      supabase
        .from("retail_products")
        .select("tags")
        .eq("store_id", storeId)
        .range(from, to),
    );
    const set = new Set<string>();
    for (const r of rows) {
      if (Array.isArray(r.tags)) {
        for (const tag of r.tags) {
          const trimmed = tag?.trim();
          if (trimmed) set.add(trimmed);
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-AR"));
  },
  async lookupEan(code: string): Promise<EanLookupResult> {
    const trimmed = code?.trim();
    if (!trimmed) return { found: false };

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<EanLookupResult>((resolve) => {
        timer = setTimeout(() => resolve({ found: false }), 3500);
      });

      const fetchPromise = (async (): Promise<EanLookupResult> => {
        const { data, error } = await supabase.rpc("retail_lookup_ean", {
          p_code: trimmed,
        });
        if (!error && data && (data as EanLookupResult).found) {
          return data as EanLookupResult;
        }
        // Fallback: Si no está en retail_global_catalog, buscar en Open Food Facts
        const offResult = await lookupOpenFoodFacts(trimmed);
        if (offResult.found && offResult.name) {
          void remoteRetail.contributeCatalog(
            trimmed,
            offResult.name,
            offResult.brand,
            offResult.category_suggestion,
            offResult.emoji || '📦',
            'community',
          ).catch(() => {});
          return offResult;
        }
        return { found: false };
      })();

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch {
      return { found: false };
    } finally {
      if (timer) clearTimeout(timer);
    }
  },
  async contributeCatalog(
    code: string,
    name: string,
    brand?: string,
    category?: string,
    emoji?: string,
    source: "ai" | "community" | "verified" = "community",
  ): Promise<void> {
    try {
      await supabase.rpc("retail_contribute_catalog", {
        p_code: code.trim(),
        p_name: name.trim(),
        p_brand: brand?.trim() || null,
        p_category: category?.trim() || null,
        p_emoji: emoji?.trim() || "📦",
        p_source: source,
      });
    } catch {
      // Fire-and-forget, silent fail
    }
  },
};

export const retail = withOffline(remoteRetail);

if (typeof window !== "undefined") {
  (window as unknown as { retail?: typeof retail }).retail = retail;
}
