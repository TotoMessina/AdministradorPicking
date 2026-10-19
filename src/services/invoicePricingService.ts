export interface InvoiceCostChange {
  id: string;
  name: string;
  previousCost: number;
  newCost: number;
  currentPrice: number;
}

/** Strictly greater than 2%; an unknown/zero previous cost has no finite percentage. */
export function invoiceCostIncrease(previousCost: number, newCost: number): { percent: number | null } | null {
  if (!Number.isFinite(previousCost) || !Number.isFinite(newCost) || previousCost < 0 || newCost <= 0) return null;
  const threshold = previousCost * 1.02;
  if (newCost - threshold <= Number.EPSILON * Math.max(1, newCost, threshold) * 8) return null;
  return { percent: previousCost > 0 ? (newCost / previousCost - 1) * 100 : null };
}

export function invoicePriceSuggestion(cost: number, marginPercent: number, multiple: number) {
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100
    || !Number.isFinite(multiple) || multiple < 0.01 || multiple > 1000000) return null;
  const multipleCents = Math.round(multiple * 100);
  if (Math.abs(multiple * 100 - multipleCents) > 0.00001) return null;
  const unrounded = cost / (1 - marginPercent / 100);
  const quotient = unrounded * 100 / multipleCents;
  // Avoid jumping an extra multiple for a floating-point residue at an exact boundary.
  const steps = Math.ceil(quotient - Number.EPSILON * Math.max(1, Math.abs(quotient)) * 8);
  const cents = steps * multipleCents;
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents >= 100000000000000) return null;
  const price = cents / 100;
  return { price, unrounded, roundingAdded: Math.max(0, price - unrounded), margin: (price - cost) / price * 100 };
}

export function invoiceSaleMargin(cost: number, price: number): number | null {
  return Number.isFinite(cost) && Number.isFinite(price) && price > 0 ? (price - cost) / price * 100 : null;
}
