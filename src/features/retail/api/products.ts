import { supabase, isValidUUID } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import type { StockComponent } from '../../../types/kiosco';
import { hasComposition, withAvailableStock } from '../../../services/productComposition';
import type { Store, Category, Product, ProductDeletionRecord } from './types';
import { result, allRows } from './request';

/** Productos: catálogo, combos, accesos rápidos y reposición de stock. */
export const productsApi = {
  async quickProducts(store: string, branch: string) {
    return result<{ product_id: string; position: number }[]>(supabase.from('retail_quick_products').select('product_id,position').eq('store_id', store).eq('branch_id', branch).order('position'));
  },
  async popularProducts(store: string, branch: string) {
    return result<{ product_id: string; units: number }[]>(supabase.rpc('retail_popular_products', { p_store: store, p_branch: branch }));
  },
  async saveQuickProducts(store: string, branch: string, products: string[]) {
    return result(supabase.rpc('retail_save_quick_products', { p_store: store, p_branch: branch, p_products: products }));
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
      price_pending?: boolean;
      price_rounding?: number | null;
      display_size?: number | null;
      display_code?: string | null;
      pack_code?: string | null;
      pallet_packs?: number | null;
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
    const locationMode = await result<{ branch_inventory_enabled?: boolean; price_rounding?: number }>(supabase.from('retail_stores').select('*').eq('id', store).single());
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
      ...(p.display_size !== undefined ? { display_size: p.display_size } : {}),
      ...(p.display_code !== undefined ? { display_code: p.display_code, pack_code: p.pack_code ?? null, pallet_packs: p.pallet_packs ?? null } : {}),
      sale_markup: p.sale_markup == null ? null : Number(p.sale_markup),
      margin_group: p.margin_group ?? 'standard',
      expiry_date: p.expiry_date ?? null,
      last_restocked_at: p.last_restocked_at ?? null,
      stock_components: p.stock_components || [],
      sellable: p.sellable !== false,
      price_pending: p.price_pending === true,
      ...(p.price_rounding !== undefined ? { price_rounding: p.price_rounding } : {}),
      price_step: Number(p.price_rounding ?? locationMode.price_rounding ?? 0),
    })));
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
      // Solo existe con la actualización 202611030006: guardar la ficha resuelve el «sin precio».
      ...(p.price_pending === false ? { price_pending: false } : {}),
      ...(p.price_rounding !== undefined ? { price_rounding: p.price_rounding } : {}),
      brand: p.brand?.trim() || null,
      supplier: p.supplier?.trim() || null,
      supplier_code: p.supplierCode?.trim() || null,
      tags: p.tags || [],
      unit_type: p.unitType || "unit",
      pack_size: p.pack_size ?? null,
      ...(p.display_size !== undefined ? { display_size: p.display_size } : {}),
      // Solo con la actualización 202611060009; quien no los manda no los borra.
      ...(p.display_code !== undefined ? { display_code: p.display_code?.trim() || null } : {}),
      ...(p.pack_code !== undefined ? { pack_code: p.pack_code?.trim() || null } : {}),
      ...(p.pallet_packs !== undefined ? { pallet_packs: p.pallet_packs ?? null } : {}),
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
};
