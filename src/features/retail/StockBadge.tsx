export const stockLevel = (units: number, min: number) => units <= 0 ? 'out' : units <= min ? 'low' : 'ok';
const labels = { out: 'Sin stock', low: 'Queda poco', ok: 'Hay stock' };

/** Semáforo de stock: color, punto y texto, para no depender solo del color. */
export function StockBadge({ units, min, shown = units, note }: { units: number; min: number; shown?: number; note?: string }) {
  const level = stockLevel(units, min);
  return <span className={`stock-badge is-${level}`} title={labels[level]}>
    <span className="stock-badge-dot" aria-hidden="true" />
    <strong>{shown.toLocaleString('es-AR')}</strong>
    <span className={level === 'ok' ? 'sr-only' : undefined}>{note && level !== 'ok' ? note : labels[level]}</span>
  </span>;
}
