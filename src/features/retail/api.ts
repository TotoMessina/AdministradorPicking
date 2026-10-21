import { supabase, isValidUUID } from "../../lib/supabase";
import type { KioscoProduct, KioscoSale } from "../../types/kiosco";
import { syncOffline, withOffline } from './offline';
import { createStoreOnce, onboarding } from './onboarding';
import { movementDetails, VOUCHER_BUCKET, voucherExtension, voucherMimeType, voucherPath, voucherReference } from './vouchers';
import { REMITO_BUCKET, remitoExtension, remitoPath, remitoReference, type PendingReplenishment, type PendingReplenishmentItem } from './remitos';
export type { PendingReplenishment, PendingReplenishmentItem } from './remitos';
export type Role = "owner" | "admin" | "cashier";
export interface Store {
  id: string;
  name: string;
  owner_id: string;
  address: string;
  phone: string;
  receipt_message: string;
  accent_color: string;
  currency: string;
}
export interface Category {
  id: string;
  store_id: string;
  name: string;
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
export interface PriceList { id: string; store_id: string; name: string; adjustment: number; active: boolean; branch_id?: string | null }
export interface PriceOverride { list_id: string; product_id: string; price: number }
export interface SalesLedger { id: string; store_id: string; name: string; is_default: boolean; active: boolean }
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
export interface Member {
  user_id: string;
  role: Role;
  email: string;
  branch_id: string | null;
  register_id: string | null;
}
export interface Invitation {
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
  if (e?.code === '23505' && e.message?.includes('retail_one_active_price_list_per_branch'))
    return 'Esta sucursal ya tiene una lista activa. Desactivala o cambiala a global antes de asignar otra.';
  if (e?.code === 'PGRST204' || e?.code === '42703') {
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
    const query = supabase.from('retail_branches');
    return result(id ? query.update({ name: name.trim(), address }).eq('store_id', store).eq('id', id).select('id').single() : query.insert({ store_id: store, name: name.trim(), address }));
  },
  async savePriceList(store: string, name: string, adjustment: number, id?: string, active = true, branchId?: string | null) {
    const query = supabase.from('retail_price_lists');
    const values = { name: name.trim(), adjustment, active, ...(branchId !== undefined ? { branch_id: branchId || null } : {}) };
    return result(id ? query.update(values).eq('store_id', store).eq('id', id).select('id').single() : query.insert({ store_id: store, ...values, branch_id: branchId || null }));
  },
  async savePriceOverride(store: string, list: string, product: string, price: number | null) {
    const query = supabase.from('retail_price_overrides');
    return result(price === null ? query.delete().eq('store_id', store).eq('list_id', list).eq('product_id', product) : query.upsert({ store_id: store, list_id: list, product_id: product, price }, { onConflict: 'list_id,product_id' }));
  },
  async saveLedger(store: string, name: string, id?: string, active = true) {
    const query = supabase.from('retail_ledgers');
    return result(id ? query.update({ name: name.trim(), active }).eq('store_id', store).eq('id', id).select('id').single() : query.insert({ store_id: store, name: name.trim() }));
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
    return result<Category[]>(
      supabase
        .from("retail_categories")
        .select("*")
        .eq("store_id", store)
        .order("name"),
    );
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
      margin_group?: 'standard' | 'low_margin' | null;
      expiry_date?: string | null;
      last_restocked_at?: string | null;
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
    return rows.map((p) => ({
      id: p.id,
      categoryId: p.category_id,
      category:
        categories.find((c) => c.id === p.category_id)?.name || "Sin categoría",
      code: p.code,
      name: p.name,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: p.stock,
      minStock: p.min_stock,
      emoji: p.emoji,
      active: p.active,
      brand: p.brand || undefined,
      supplier: p.supplier || undefined,
      supplierCode: p.supplier_code || undefined,
      tags: Array.isArray(p.tags) ? p.tags : [],
      unitType: p.unit_type || "unit",
      pack_size: p.pack_size ?? null,
      margin_group: p.margin_group ?? 'standard',
      expiry_date: p.expiry_date ?? null,
      last_restocked_at: p.last_restocked_at ?? null,
    }));
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
  ) {
    if (p.pack_size != null && (!Number.isInteger(p.pack_size) || p.pack_size < 1 || p.pack_size > 2147483647)) throw new Error('Las unidades por bulto deben ser un número entero mayor o igual a 1.');
    const values: Record<string, unknown> = {
      category_id: p.categoryId,
      code: p.code.trim(),
      name: p.name.trim(),
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      min_stock: p.minStock,
      emoji: p.emoji,
      active: true,
      brand: p.brand?.trim() || null,
      supplier: p.supplier?.trim() || null,
      supplier_code: p.supplierCode?.trim() || null,
      tags: p.tags || [],
      unit_type: p.unitType || "unit",
      pack_size: p.pack_size ?? null,
      margin_group: p.margin_group ?? 'standard',
      // Older callers that only edit prices must not clear optional metadata.
      ...(p.expiry_date !== undefined ? { expiry_date: p.expiry_date || null } : {}),
      ...(p.last_restocked_at !== undefined ? { last_restocked_at: p.last_restocked_at || null } : {}),
    };
    if (edit)
      return result(
        supabase
          .from("retail_products")
          .update(values)
          .eq("store_id", store)
          .eq("id", p.id)
          .eq("stock", expectedStock ?? p.stock)
          .select("id")
          .single(),
      );
    return result(
      supabase
        .from("retail_products")
        .insert({ ...values, store_id: store })
        .select("id")
        .single(),
    );
  },
  async archiveProduct(store: string, id: string) {
    return result(
      supabase
        .from("retail_products")
        .update({ active: false })
        .eq("store_id", store)
        .eq("id", id)
        .select("id")
        .single(),
    );
  },
  async replenishProductStock(
    store: string,
    productId: string,
    newStock: number,
    newCost?: number,
    _quantityAdded?: number,
  ) {
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
  ) {
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
  async addCategory(store: string, name: string) {
    return result<{ id: string }>(
      supabase
        .from("retail_categories")
        .insert({ store_id: store, name: name.trim() }).select('id').single(),
    );
  },
  async renameCategory(store: string, id: string, name: string) {
    return result(
      supabase
        .from("retail_categories")
        .update({ name: name.trim() })
        .eq("store_id", store)
        .eq("id", id)
        .select("id")
        .single(),
    );
  },
  async addRegister(store: string, name: string, branch?: string) {
    return result(
      supabase
        .from("retail_registers")
        .insert({ store_id: store, name: name.trim(), ...(branch ? { branch_id: branch } : {}) }),
    );
  },
  async saveRegister(store: string, id: string, name: string) {
    return result(
      supabase
        .from("retail_registers")
        .update({ name: name.trim() })
        .eq("store_id", store)
        .eq("id", id)
        .select("id")
        .single(),
    );
  },
  async deleteRegister(store: string, id: string) {
    // Soft-delete: marca la caja como inactiva para preservar historial de turnos y ventas
    return result(
      supabase
        .from("retail_registers")
        .update({ active: false })
        .eq("store_id", store)
        .eq("id", id)
        .select("id")
        .single(),
    );
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
  async setCashierAccess(store: string, target: string, branch: string, register: string, pending = false) {
    return result(supabase.rpc('retail_set_cashier_access', { p_store: store, p_target: target, p_branch: branch || null, p_register: register || null, p_pending: pending }));
  },
  async registerAvailability(store: string) {
    return result<{ register_id: string; occupied: boolean }[]>(supabase.rpc('retail_register_availability', { p_store: store }));
  },
  async shiftBalance(shift: string) {
    return Number(await result<number>(supabase.rpc('retail_shift_balance', { p_shift: shift })));
  },
  async invitations(store: string) {
    return result<Invitation[]>(
      supabase
        .from("retail_invitations")
        .select("id,email,role,branch_id,register_id")
        .eq("store_id", store),
    );
  },
  async invite(store: string, email: string, role: "admin" | "cashier") {
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
    return result(
      supabase
        .from("retail_members")
        .delete()
        .eq("store_id", store)
        .eq("user_id", user),
    );
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
  async closeShift(shift: string, counted: number) {
    return result<number>(
      supabase.rpc("retail_close_shift", {
        p_shift: shift,
        p_counted: counted,
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
    const path = `${store}/${shiftId}/${crypto.randomUUID()}.${extension}`;
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
    const path = `${store}/${data.user.id}/${crypto.randomUUID()}.${extension}`;
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
  async approvePendingReplenishment(store: string, id: string, items?: PendingReplenishmentItem[]): Promise<string> {
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
      p_store: store, p_from_branch: fromBranch, p_to_branch: toBranch, p_items: items, p_notes: notes.trim() || null, p_request: requestId || crypto.randomUUID(),
    }));
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
