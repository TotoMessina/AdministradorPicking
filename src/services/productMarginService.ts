import type { MarginGroup } from '../types/kiosco';

export const DEFAULT_LOW_MARGIN_THRESHOLD = 10;

export function lowMarginThreshold(value?: number | null): number {
  const parsed = Number(value);
  return value != null && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? Math.round(parsed * 100) / 100 : DEFAULT_LOW_MARGIN_THRESHOLD;
}

/** Gross margin on sale price, not markup on cost. Zero cost is unknown here. */
export function productMargin(price: number, cost: number | null | undefined, threshold?: number | null): {
  percent: number | null; group: MarginGroup; belowCost: boolean;
} {
  if (!Number.isFinite(price) || price <= 0 || cost == null || !Number.isFinite(cost) || cost <= 0) return { percent: null, group: 'standard', belowCost: false };
  const priceCents = Math.round(price * 100);
  const costCents = Math.round(cost * 100);
  if (!Number.isSafeInteger(priceCents) || !Number.isSafeInteger(costCents) || priceCents <= 0 || costCents <= 0) return { percent: null, group: 'standard', belowCost: false };
  // Compare exact cents/basis points; rounding the displayed percentage must
  // never push a product across the configured boundary.
  const low = (BigInt(priceCents) - BigInt(costCents)) * 10000n < BigInt(priceCents) * BigInt(Math.round(lowMarginThreshold(threshold) * 100));
  return { percent: (priceCents - costCents) / priceCents * 100, group: low ? 'low_margin' : 'standard', belowCost: costCents > priceCents };
}
