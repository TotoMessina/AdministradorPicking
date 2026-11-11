import { supabase, isValidUUID } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import type { PriceList, PriceOverride } from './types';
import { result, allRows } from './request';

/** Listas de precios, precios por producto y ajustes masivos. */
export const pricingApi = {
  async priceLists(store: string) {
    return result<PriceList[]>(supabase.from('retail_price_lists').select('*').eq('store_id', store).order('name'));
  },
  async branchPriceRule(store: string, branch: string): Promise<string | null> {
    return result<string | null>(supabase.rpc('retail_active_price_list_for_branch', { p_store: store, p_branch: branch }));
  },
  async priceOverrides(store: string) {
    return allRows<PriceOverride>((from, to) => supabase.from('retail_price_overrides').select('*').eq('store_id', store).order('list_id').order('product_id').range(from, to));
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
  async deletePriceList(store: string, list: string, revision: number) {
    const { data, error } = await supabase.rpc('retail_delete_price_list', { p_store: store, p_list: list, p_revision: revision });
    if (error?.code === 'PGRST202') throw new Error('Falta actualizar la eliminación de listas en Supabase. Aplicá schema.sql y reintentá. La lista sigue disponible.');
    if (error) throw error;
    return data as string;
  },
  /** Precio por costo: porcentaje y redondeo propio (null = el del comercio). Requiere conexión. */
  async updateProductPricing(store: string, product: string, markup: number, rounding: number | null, expected: number) {
    return result<number>(supabase.rpc('retail_update_product_pricing', { p_store: store, p_product: product, p_markup: markup, p_rounding: rounding, p_expected: expected }));
  },
  /** Ajuste masivo por ganancia: la base recalcula cada precio con su costo y redondeo. */
  async bulkUpdatePricing(store: string, items: { id: string; markup: number; rounding?: number | null; expected: number }[]) {
    return result<{ updated: number; skipped: { id: string; reason: 'unavailable' | 'no_cost' | 'changed' }[] }>(supabase.rpc('retail_bulk_update_pricing', { p_store: store, p_items: items }));
  },
  async setStorePricing(store: string, rounding: number, defaultMarkup: number) {
    return result<number>(supabase.rpc('retail_set_store_pricing', { p_store: store, p_rounding: rounding, p_default_markup: defaultMarkup }));
  },
  async updateProductPrice(store: string, product: string, price: number, expected: number) {
    return result(supabase.rpc('retail_update_product_price', { p_store: store, p_product: product, p_price: price, p_expected: expected }));
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
  async saveMarginThreshold(store: string, threshold: number, expected: number) {
    return result(supabase.rpc('retail_set_margin_threshold', { p_store: store, p_threshold: threshold, p_expected: expected }));
  },
};
