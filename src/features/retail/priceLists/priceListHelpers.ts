import type { Branch, Category, PriceList, PriceOverride, Product } from '../api';
import type { Run } from '../Management';

// Tipos y cálculos de las listas de precios.
export type Props = { storeId: string; lists: PriceList[]; overrides: PriceOverride[]; products: Product[]; categories?: Category[]; branches?: Branch[]; run: Run; busy: boolean; expanded?: boolean };
export type Session = { key: string; draft: PriceList; existing: boolean };
export const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
export const percent = (value: number) => `${value > 0 ? '+' : ''}${Number(value).toLocaleString('es-AR')}%`;
export const PAGE_SIZE = 20;
const ruleLabels = { category: 'Categoría', brand: 'Marca', product: 'Producto' } as const;
// Own changes of a list: its fixed price or a specific rule reaching the product.
// Principal has neither; its own change is the product percentage over cost.
export function ownChanges(product: Product, list: PriceList, fixed: PriceOverride | undefined): string[] {
  if (fixed) return ['Precio fijo'];
  const brand = (product.brand || '').trim().toLowerCase();
  const rules = (list.pricing_rules || []).filter(r => r.target === (r.scope === 'category' ? product.categoryId : r.scope === 'product' ? product.id : brand))
    .map(r => `${ruleLabels[r.scope]} ${percent(r.adjustment)}`);
  if (list.is_primary) {
    const markup = product.sale_markup == null ? [] : [`${percent(product.sale_markup)} sobre costo`];
    return [...markup, ...rules];
  }
  const generalAdjustment = Number(list.adjustment || 0);
  const general = generalAdjustment !== 0
    ? [list.base_kind === 'cost' ? `${percent(generalAdjustment)} sobre costo` : `General ${percent(generalAdjustment)}`]
    : [];
  return [...general, ...rules];
}
export const origin = (list: PriceList) => list.base_kind === 'list' ? list.parent_id || 'missing' : list.base_kind || 'catalog';
export const sourceName = (source: string, lists: PriceList[]) => source === 'cost' ? 'Costo' : source === 'catalog' ? 'Catálogo' : lists.find(l => l.id === source)?.name || 'Origen no disponible';

export function descendants(id: string, lists: PriceList[]): Set<string> {
  const found = new Set([id]);
  let changed = true;
  while (changed) { changed = false; for (const l of lists) if (l.parent_id && found.has(l.parent_id) && !found.has(l.id)) { found.add(l.id); changed = true; } }
  return found;
}
