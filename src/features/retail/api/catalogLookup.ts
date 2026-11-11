import { supabase } from '../../../lib/supabase';
import type { EanLookupResult } from './types';
import { allRows } from './request';
import { lookupOpenFoodFacts } from './openFoodFacts';

/** Catálogo compartido: distribuidores, marcas, etiquetas y búsqueda por código de barras. */
export const catalogLookupApi = {
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
          void catalogLookupApi.contributeCatalog(
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
