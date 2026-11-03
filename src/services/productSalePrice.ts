/** Pasos de redondeo de los precios por costo, siempre hacia arriba. 0 = centavos (sin redondeo). */
export const priceRoundingSteps = [0, 1, 5, 10, 50, 100] as const;
export const roundingLabel = (step: number) => step > 0 ? `A $${step.toLocaleString('es-AR')}` : 'Sin redondeo';

/** Cent rounding matches PostgreSQL numeric: percentages are increases on cost. Then rounds up to the step. */
export function priceFromMarkup(cost: number, markup: number, step = 0): number {
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('Cargá un costo mayor a cero para calcular el precio principal.');
  if (!Number.isFinite(markup) || markup <= -100 || markup > 10000 || Math.abs(markup * 100 - Math.round(markup * 100)) > 1e-6)
    throw new Error('El porcentaje debe estar entre -99,99 y 10.000, con hasta dos decimales.');
  const cents = BigInt(Math.round(cost * 100));
  const factor = 10000n + BigInt(Math.round(markup * 100));
  let priceCents = (cents * factor + 5000n) / 10000n;
  if (priceCents < 1n) priceCents = 1n;
  const stepCents = BigInt(Math.round(step * 100));
  // Mirrors ceil(price/step)*step in retail_private.markup_price.
  if (stepCents > 0n) priceCents = ((priceCents + stepCents - 1n) / stepCents) * stepCents;
  const price = Number(priceCents) / 100;
  if (!Number.isFinite(price) || price > 9999999999) throw new Error('El precio calculado supera el límite permitido. Revisá el costo o el porcentaje.');
  return price;
}

export function draftMarkupPrice(cost: number, markup: string, step = 0): number | null {
  if (!markup.trim()) return null;
  try { return priceFromMarkup(cost, Number(markup), step); } catch { return null; }
}

/** Porcentaje sobre costo que corresponde a un precio, con dos decimales. */
export const markupFromPrice = (price: number, cost: number) => cost > 0 && price > 0 ? String(Math.round((price / cost - 1) * 10000) / 100) : '';
