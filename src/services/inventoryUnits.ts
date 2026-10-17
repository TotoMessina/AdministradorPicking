export function unitsPerPack(packSize?: number | null): number {
  return Number.isInteger(packSize) && Number(packSize) > 1 ? Number(packSize) : 1;
}

export function formatPackStock(stock: number, packSize?: number | null): string {
  const size = unitsPerPack(packSize);
  const units = stock.toLocaleString('es-AR');
  if (size === 1) return `Stock: ${units} u.`;
  const packs = Math.floor(stock / size);
  const remainder = stock % size;
  return `Stock: ${units} u. (${packs.toLocaleString('es-AR')} ${packs === 1 ? 'display' : 'displays'}${remainder ? ` + ${remainder.toLocaleString('es-AR')} u.` : ''})`;
}
