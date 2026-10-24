export const CASH_DENOMINATIONS = [10, 20, 50, 100, 200, 500, 1000, 2000, 10000, 20000] as const;
export type CashDenomination = typeof CASH_DENOMINATIONS[number];
export type CashDenominations = Partial<Record<CashDenomination, number>>;
export type CashDenominationDraft = Partial<Record<CashDenomination, string>>;

export function cashDenominationsFromDraft(draft: CashDenominationDraft): CashDenominations | null {
  return normalizeCashDenominations(Object.fromEntries(CASH_DENOMINATIONS.map(amount => [amount, draft[amount]?.trim() ? Number(draft[amount]) : 0])));
}

/** Empty detail is omitted; integer quantities only. A partial breakdown is allowed. */
export function normalizeCashDenominations(value: unknown): CashDenominations | null {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Revisá el detalle de billetes.');
  const result: CashDenominations = {};
  for (const [denomination, quantity] of Object.entries(value)) {
    if (!CASH_DENOMINATIONS.some(amount => String(amount) === denomination)
      || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000)
      throw new Error('Las cantidades de billetes deben ser enteras entre 0 y 1.000.000.');
    if (quantity) result[Number(denomination) as CashDenomination] = quantity;
  }
  return Object.keys(result).length ? result : null;
}

export function cashDenominationsTotal(value: CashDenominations | null | undefined): number {
  return CASH_DENOMINATIONS.reduce((total, denomination) => total + denomination * (value?.[denomination] || 0), 0);
}

export function closingCashDenominations(value: unknown, counted: number): CashDenominations | null {
  const normalized = normalizeCashDenominations(value);
  if (!Number.isFinite(counted) || counted < 0) throw new Error('Ingresá un efectivo contado válido.');
  if (Math.round(cashDenominationsTotal(normalized) * 100) > Math.round(counted * 100))
    throw new Error('Los billetes detallados superan el efectivo contado. Revisá las cantidades o el total antes de cerrar.');
  return normalized;
}
