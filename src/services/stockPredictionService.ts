import type { Product } from '../features/retail/api';
import type { KioscoSale } from '../types/kiosco';
import { unitsPerPack } from './inventoryUnits';
import { hasComposition, inventorySaleUnits } from './productComposition';

export interface StockPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  dailyAvgSales: number;
  weekdayAvg: Record<number, number>;
  daysUntilStockout: number;
  /** YYYY-MM-DD; empty when no finite stockout date can be estimated. */
  stockoutDate: string;
  suggestedOrderQty: number;
  suggestedOrderPacks: number | null;
  supplier: string | null;
  priority: 'critical' | 'soon' | 'ok' | 'overstocked';
  trend: 'accelerating' | 'stable' | 'decelerating';
}

export interface StockPredictionOptions {
  /** Pass the current instant explicitly. Default: latest dated sale (no global clock). */
  asOf?: string;
  timeZone?: string;
  coverageDays?: number;
  /** Relative difference required to use today's positive weekday average. Default 0.2. */
  weekdayThreshold?: number;
}

const DAY = 86400000;
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function calendarDay(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return NaN;
  const at = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value ? at / DAY : NaN;
}

function datedDay(value: string | undefined, calendar: Intl.DateTimeFormat): number {
  if (!value) return NaN;
  const dateOnly = calendarDay(value);
  if (Number.isFinite(dateOnly)) return dateOnly;
  const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (legacy) return calendarDay(`${legacy[3]}-${legacy[2].padStart(2, '0')}-${legacy[1].padStart(2, '0')}`);
  if (!/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return NaN;
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return NaN;
  const parts = Object.fromEntries(calendar.formatToParts(new Date(at)).map(p => [p.type, p.value]));
  return calendarDay(`${parts.year}-${parts.month}-${parts.day}`);
}

/** Predictions over supplied sales only. No I/O, mutations, implicit current date or AI. */
export function predictStockLevels(
  products: readonly Product[], sales: readonly KioscoSale[], options: StockPredictionOptions = {},
): StockPrediction[] {
  let calendar: Intl.DateTimeFormat;
  try { calendar = new Intl.DateTimeFormat('en-CA', { timeZone: options.timeZone || 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  const datedSales = [...new Map(sales.map(s => [s.id, s])).values()].map(sale => {
    const at = [sale.created_at, sale.createdAt, sale.date].map(value => datedDay(value, calendar)).find(Number.isFinite);
    return { sale, day: at ?? NaN };
  });
  const explicitToday = datedDay(options.asOf, calendar);
  const today = Number.isFinite(explicitToday) ? explicitToday : datedSales.reduce((last, s) => Number.isFinite(s.day) ? Math.max(last, s.day) : last, -Infinity);
  const coverage = finite(options.coverageDays) && options.coverageDays > 0 ? options.coverageDays : 10;
  const threshold = finite(options.weekdayThreshold) && options.weekdayThreshold >= 0 ? options.weekdayThreshold : 0.2;
  const catalog = [...new Map(products.map(p => [p.id, p])).values()];
  const eligible = catalog.filter(p => !hasComposition(p) && p.active && finite(p.stock) && p.stock > 0);
  const daily = new Map(eligible.map(p => [p.id, Array<number>(14).fill(0)]));
  // Legacy names only match an unambiguous catalog name, never an invented/manual item.
  const byName = new Map<string, string[]>();
  for (const p of catalog) {
    const name = normal(p.name);
    byName.set(name, [...(byName.get(name) || []), p.id]);
  }
  for (const { sale, day } of datedSales) {
    const age = today - day;
    if (!Number.isFinite(age) || age < 1 || age > 14 || !finite(sale.total) || sale.total <= 0) continue;
    let items: unknown = sale.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch { continue; } }
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || !finite(item.qty) || item.qty <= 0) continue;
      let id = item.productId;
      if (!id && typeof item.name === 'string') {
        const name = normal(item.name);
        const matches = byName.get(name);
        if (!/^(varios|producto manual)(\b|$)/.test(name) && matches?.length === 1) id = matches[0];
      }
      for (const physical of inventorySaleUnits({ ...item, productId: id })) {
        const counts = daily.get(physical.productId);
        if (counts) counts[age - 1] += physical.qty;
      }
    }
  }

  const predictions = eligible.map((product): StockPrediction => {
    const counts = daily.get(product.id)!;
    const recent = counts.slice(0, 7).reduce((sum, qty) => sum + qty, 0);
    const previous = counts.slice(7).reduce((sum, qty) => sum + qty, 0);
    const dailyAvgSales = (recent * 2 + previous) / 21;
    const weekdayAvg: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    if (Number.isFinite(today)) counts.forEach((qty, index) => { weekdayAvg[new Date((today - index - 1) * DAY).getUTCDay()] += qty / 2; });
    const todayAvg = Number.isFinite(today) ? weekdayAvg[new Date(today * DAY).getUTCDay()] : 0;
    // A zero for this weekday alone is not evidence of no future demand on other weekdays.
    const rate = dailyAvgSales > 0 && todayAvg > 0 && Math.abs(todayAvg / dailyAvgSales - 1) > threshold ? todayAvg : dailyAvgSales;
    const daysUntilStockout = rate > 0 ? Math.round(product.stock / rate) : Infinity;
    const dateMs = (today + daysUntilStockout) * DAY;
    const stockoutDate = Number.isFinite(dateMs) && Math.abs(dateMs) <= 8640000000000000
      ? new Date(dateMs).toISOString().slice(0, 10) : '';
    const size = unitsPerPack(product.pack_size);
    const needed = Math.max(0, rate * coverage - product.stock);
    const suggestedOrderQty = needed > 0 ? Math.ceil(needed / size) * size : 0;
    const trend = previous === 0 ? (recent > 0 ? 'accelerating' : 'stable')
      : recent >= previous * 1.2 ? 'accelerating' : recent <= previous * 0.8 ? 'decelerating' : 'stable';
    const priority = daysUntilStockout <= 2 ? 'critical' : daysUntilStockout <= 5 ? 'soon'
      : product.stock > rate * 60 ? 'overstocked' : 'ok';
    return { productId: product.id, productName: product.name, currentStock: product.stock, dailyAvgSales,
      weekdayAvg, daysUntilStockout, stockoutDate, suggestedOrderQty,
      suggestedOrderPacks: size > 1 ? suggestedOrderQty / size : null,
      supplier: product.supplier?.trim() || null, priority, trend };
  });
  const priorityOrder = { critical: 0, soon: 1, ok: 2, overstocked: 3 };
  return predictions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    || (a.daysUntilStockout === b.daysUntilStockout ? 0 : a.daysUntilStockout < b.daysUntilStockout ? -1 : 1)
    || a.productName.localeCompare(b.productName) || a.productId.localeCompare(b.productId));
}

export function groupPredictionsBySupplier(predictions: readonly StockPrediction[]): Map<string, StockPrediction[]> {
  const grouped = new Map<string, StockPrediction[]>();
  for (const prediction of predictions) {
    const supplier = prediction.supplier?.trim() || 'Sin proveedor';
    grouped.set(supplier, [...(grouped.get(supplier) || []), prediction]);
  }
  return grouped;
}
