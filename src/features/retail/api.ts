import { supabase, isValidUUID } from "../../lib/supabase";
import type { KioscoProduct, KioscoSale } from "../../types/kiosco";
import { withOffline } from './offline';
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
export interface PriceList { id: string; store_id: string; name: string; adjustment: number; active: boolean }
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
}
export interface Movement {
  id: string;
  type: "INGRESO" | "RETIRO";
  amount: number;
  reason: string;
  created_at: string;
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
  async savePriceList(store: string, name: string, adjustment: number, id?: string, active = true) {
    const query = supabase.from('retail_price_lists');
    return result(id ? query.update({ name: name.trim(), adjustment, active }).eq('store_id', store).eq('id', id).select('id').single() : query.insert({ store_id: store, name: name.trim(), adjustment }));
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
    return result<string>(
      supabase.rpc("retail_create_store", { p_name: name }),
    );
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
    return allRows<Movement>((from, to) =>
      supabase
        .from("retail_movements")
        .select("*")
        .eq("store_id", store)
        .eq("shift_id", shift)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
  },
  async saveProduct(
    store: string,
    p: Omit<Product, "category">,
    edit: boolean,
    expectedStock?: number,
  ) {
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
    const values: Record<string, unknown> = { stock: newStock };
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
    for (const item of items) {
      const values: Record<string, unknown> = { stock: item.newStock };
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
  ) {
    return result(
      supabase.rpc("retail_add_movement", {
        p_shift: shift,
        p_type: type,
        p_amount: amount,
        p_reason: reason,
        p_request: request,
      }),
    );
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
        timer = setTimeout(() => resolve({ found: false }), 3000);
      });

      const fetchPromise = (async (): Promise<EanLookupResult> => {
        const { data, error } = await supabase.rpc("retail_lookup_ean", {
          p_code: trimmed,
        });
        if (error || !data) return { found: false };
        return data as EanLookupResult;
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
