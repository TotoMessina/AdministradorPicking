import type { EanLookupResult } from './types';

export async function lookupOpenFoodFacts(code: string): Promise<EanLookupResult> {
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
