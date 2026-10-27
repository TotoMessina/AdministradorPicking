/** Cent rounding matches PostgreSQL numeric: percentages are increases on cost. */
export function priceFromMarkup(cost: number, markup: number): number {
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('Cargá un costo mayor a cero para calcular el precio principal.');
  if (!Number.isFinite(markup) || markup <= -100 || markup > 10000 || Math.abs(markup * 100 - Math.round(markup * 100)) > 1e-6)
    throw new Error('El porcentaje debe estar entre -99,99 y 10.000, con hasta dos decimales.');
  const cents = BigInt(Math.round(cost * 100));
  const factor = 10000n + BigInt(Math.round(markup * 100));
  const price = Math.max(0.01, Number((cents * factor + 5000n) / 10000n) / 100);
  if (!Number.isFinite(price) || price > 9999999999) throw new Error('El precio calculado supera el límite permitido. Revisá el costo o el porcentaje.');
  return price;
}

export function draftMarkupPrice(cost: number, markup: string): number | null {
  if (!markup.trim()) return null;
  try { return priceFromMarkup(cost, Number(markup)); } catch { return null; }
}
