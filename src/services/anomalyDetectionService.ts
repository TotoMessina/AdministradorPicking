import type { Member, Movement, Product, Shift } from '../features/retail/api';
import type { KioscoSale } from '../types/kiosco';

export interface AnomalyAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'voids' | 'cash_drop' | 'generic_items' | 'cash_discrepancy' | 'timing' | 'pattern';
  title: string;
  description: string;
  shift_id?: string;
  user_id?: string;
  user_email?: string;
  evidence: Record<string, number | string>;
  detected_at: string;
}

export interface AnomalyOptions {
  /** Explicit clock keeps the service pure. Otherwise use the latest supplied event. */
  asOf?: string;
  timeZone?: string;
  /** Unknown hours produce an informational review, never a claim of irregularity. */
  is24Hours?: boolean;
  recentClosures?: number;
  /** Optional boundary for a truncated sales sample; exclude partially loaded shifts. */
  salesCompleteSince?: string;
}

const DAY = 86400000;
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
// Do not interpret a date-only/clock-only legacy value in the device's timezone.
function timestamp(value?: string | null): number {
  return value && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? Date.parse(value) : NaN;
}
const saleTime = (sale: KioscoSale) => timestamp(sale.created_at || sale.createdAt);
function hash(value: string): string {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ value.charCodeAt(i);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
function unique<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...new Map(rows.map(row => [row.id, row])).values()].sort((a, b) => a.id.localeCompare(b.id));
}
function saleItems(sale: KioscoSale): KioscoSale['items'] | null {
  let items: unknown = sale.items;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { return null; } }
  return Array.isArray(items) && items.every(item => item && typeof item === 'object') ? items : null;
}

type LinkedEvent = { shift_id?: string; store_id?: string; register_id?: string; created_by?: string };
function assignShift(event: LinkedEvent, at: number, shifts: readonly Shift[]): Shift | undefined {
  const compatible = (shift: Shift) => (!event.store_id || event.store_id === shift.store_id)
    && (!event.register_id || event.register_id === shift.register_id);
  if (event.shift_id) return shifts.find(shift => shift.id === event.shift_id && compatible(shift));
  if (!Number.isFinite(at)) return undefined;
  const candidates = shifts.filter(shift => compatible(shift)
    && (!event.created_by || event.created_by === shift.opened_by)
    && at >= timestamp(shift.opened_at) && (!shift.closed_at || at < timestamp(shift.closed_at)));
  return candidates.length === 1 ? candidates[0] : undefined;
}

function payments(sales: readonly KioscoSale[]) {
  let cash = 0, qr = 0, unknown = 0;
  for (const sale of sales) {
    if (!finite(sale.total) || sale.total <= 0) continue;
    const method = text(sale.paymentMethod || '');
    if (method === 'mixto') {
      const parts = sale.payments;
      if (!parts?.length || parts.some(part => !finite(part.amount) || part.amount < 0)
        || Math.abs(parts.reduce((sum, part) => sum + part.amount, 0) - sale.total) > 0.01) { unknown++; continue; }
      for (const part of parts) {
        if (text(part.method) === 'efectivo') cash += part.amount;
        if (text(part.method) === 'qr') qr += part.amount;
      }
    } else if (method === 'efectivo') cash += sale.total;
    else if (method === 'qr') qr += sale.total;
    else if (!['transferencia', 'tarjeta', 'debito', 'credito'].includes(method)) unknown++;
  }
  return { cash, qr, unknown, ratio: cash + qr > 0 ? cash / (cash + qr) : null };
}

/** Local heuristics over the supplied sample. Never infers guilt or missing events. */
export function detectAnomalies(
  sales: readonly KioscoSale[], shifts: readonly Shift[], movements: readonly Movement[],
  products: readonly Product[], members: readonly Member[] = [], options: AnomalyOptions = {},
): AnomalyAlert[] {
  const loadedShifts = unique(shifts);
  const loadedSales = unique(sales);
  const loadedMovements = unique(movements);
  const eventTimes = [...loadedSales.map(saleTime), ...loadedMovements.map(m => timestamp(m.created_at)),
    ...loadedShifts.flatMap(s => [timestamp(s.opened_at), timestamp(s.closed_at)])].filter(Number.isFinite);
  const reference = Number.isFinite(timestamp(options.asOf)) ? timestamp(options.asOf) : eventTimes.reduce((max, at) => Math.max(max, at), 0);
  if (!reference) return [];
  const detectedAt = new Date(reference).toISOString();
  const eligibleShifts = loadedShifts.filter(s => timestamp(s.opened_at) <= reference);
  const byShift = new Map(eligibleShifts.map(s => [s.id, [] as KioscoSale[]]));
  const movementsByShift = new Map(eligibleShifts.map(s => [s.id, [] as Movement[]]));
  for (const sale of loadedSales) {
    const at = saleTime(sale);
    if (Number.isFinite(at) && at > reference) continue;
    const shift = assignShift(sale, at, eligibleShifts);
    if (shift) byShift.get(shift.id)!.push(sale);
  }
  for (const movement of loadedMovements) {
    const at = timestamp(movement.created_at);
    if (Number.isFinite(at) && at > reference) continue;
    const shift = assignShift(movement, at, eligibleShifts);
    if (shift) movementsByShift.get(shift.id)!.push(movement);
  }
  const memberById = new Map(members.map(m => [m.user_id, m]));
  const productById = new Map(products.map(p => [p.id, p]));
  const alerts: AnomalyAlert[] = [];
  const operator = (shift: Shift) => memberById.get(shift.opened_by)?.email || shift.opened_by;
  function add(shift: Shift, category: AnomalyAlert['category'], severity: AnomalyAlert['severity'], title: string,
    description: string, evidence: AnomalyAlert['evidence'], identity = shift.id) {
    const moves = movementsByShift.get(shift.id) || [];
    const total = (type: Movement['type']) => round(moves.filter(m => m.type === type && finite(m.amount) && m.amount > 0).reduce((sum, m) => sum + m.amount, 0));
    alerts.push({ id: hash(`${shift.store_id}:${category}:${identity}`), severity, category, title, description,
      shift_id: shift.id, user_id: shift.opened_by, user_email: memberById.get(shift.opened_by)?.email,
      evidence: { ...evidence, storeId: shift.store_id, loadedMovements: moves.length,
        loadedIncome: total('INGRESO'), loadedWithdrawals: total('RETIRO') }, detected_at: detectedAt });
  }

  const paidByShift = new Map(eligibleShifts.map(s => [s.id, payments(byShift.get(s.id)!)]));
  const completeSince = timestamp(options.salesCompleteSince);
  const complete = (shift: Shift) => !Number.isFinite(completeSince) || timestamp(shift.opened_at) >= completeSince;
  let clock: Intl.DateTimeFormat;
  try { clock = new Intl.DateTimeFormat('en-CA', { timeZone: options.timeZone || 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }); }
  catch { clock = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }); }

  for (const shift of eligibleShifts) {
    const rows = byShift.get(shift.id)!;
    if (!rows.length) continue;
    const voidCount = rows.filter(s => s.total === 0 || saleItems(s)?.length === 0).length;
    if (voidCount >= 3 && voidCount / rows.length > 0.05) add(shift, 'voids', 'warning', 'Ventas sin importe o sin detalle',
      'Hay registros de venta vacíos o con total cero. Revisá su origen: estos datos no prueban anulaciones ni incluyen carritos descartados sin guardar.',
      { voidCount, totalSales: rows.length, voidPercent: round(voidCount / rows.length * 100), shiftId: shift.id, operator: operator(shift) });
    const genericCount = rows.filter(s => {
      const items = saleItems(s);
      return items && items.length > 0 && items.filter(item => !item.productId
        || /^(varios|producto manual)(\b|$)/.test(text(item.name || productById.get(item.productId)?.name || ''))).length / items.length > 0.5;
    }).length;
    if (genericCount > 3 && genericCount / rows.length > 0.3) add(shift, 'generic_items', 'warning', 'Uso frecuente de productos genéricos',
      'Varias ventas tienen mayoría de renglones manuales o genéricos. Revisá si corresponden a artículos aún sin catalogar; no implica una irregularidad.',
      { genericCount, totalSales: rows.length, genericPercent: round(genericCount / rows.length * 100) });

    const current = paidByShift.get(shift.id)!;
    // Compare completed shifts only: an in-progress shift has an incomplete QR total.
    if (shift.closed_at && timestamp(shift.closed_at) <= reference && complete(shift) && current.ratio !== null && !current.unknown) {
      const start = timestamp(shift.opened_at);
      const history = eligibleShifts.filter(s => s.store_id === shift.store_id && s.id !== shift.id && s.closed_at
        && timestamp(s.closed_at) <= start && timestamp(s.closed_at) >= start - 30 * DAY && complete(s))
        .map(s => paidByShift.get(s.id)!).filter(p => p.ratio !== null && !p.unknown);
      if (history.length >= 3) {
        const avgCashRatio = history.reduce((sum, p) => sum + p.ratio!, 0) / history.length;
        const avgQr = history.reduce((sum, p) => sum + p.qr, 0) / history.length;
        if (avgCashRatio > 0 && current.ratio < avgCashRatio * 0.6 && avgQr > 0 && Math.abs(current.qr / avgQr - 1) <= 0.2) {
          add(shift, 'cash_drop', 'warning', 'Menor proporción de efectivo con QR estable',
            'La proporción de ventas en efectivo cayó más del 40% respecto de los turnos anteriores cargados de los últimos 30 días. QR está dentro de ±20% de su promedio por turno. Revisá duración, demanda y medios de pago; los retiros no se descuentan de las ventas.',
            { cashRatioThisShift: round(current.ratio), avgCashRatio: round(avgCashRatio), qrTotal: round(current.qr), cashTotal: round(current.cash), avgQrTotal: round(avgQr), baselineShifts: history.length });
        }
      }
    }

    const timed = rows.filter(s => Number.isFinite(saleTime(s)) && finite(s.total) && s.total > 0)
      .sort((a, b) => saleTime(a) - saleTime(b) || a.id.localeCompare(b.id));
    if (options.is24Hours !== true) {
      const nights = new Map<string, KioscoSale[]>();
      for (const sale of timed) {
        const parts = Object.fromEntries(clock.formatToParts(new Date(saleTime(sale))).map(p => [p.type, p.value]));
        if (Number(parts.hour) >= 2 && Number(parts.hour) < 6) {
          const date = `${parts.year}-${parts.month}-${parts.day}`;
          nights.set(date, [...(nights.get(date) || []), sale]);
        }
      }
      for (const [date, night] of nights) add(shift, 'timing', options.is24Hours === false ? 'warning' : 'info', 'Ventas entre las 02:00 y las 06:00',
        options.is24Hours === false ? 'Revisá si estas ventas corresponden al horario autorizado del comercio.' : 'El horario habitual no está configurado. Confirmá si el comercio atiende de madrugada antes de considerar estas ventas atípicas.',
        { timeRange: `${date} 02:00–06:00 (${clock.resolvedOptions().timeZone})`, salesCount: night.length, avgAmount: round(night.reduce((sum, s) => sum + s.total, 0) / night.length) }, `${shift.id}:${date}`);
    }
    const used = new Set<string>();
    for (let i = 0; i < timed.length; i++) {
      if (used.has(timed[i].id)) continue;
      const cluster: KioscoSale[] = [];
      for (let j = i; j < timed.length && saleTime(timed[j]) - saleTime(timed[i]) <= 120000; j++) {
        if (!used.has(timed[j].id) && Math.abs(timed[j].total / timed[i].total - 1) <= 0.1) cluster.push(timed[j]);
      }
      const avg = cluster.reduce((sum, s) => sum + s.total, 0) / cluster.length;
      if (cluster.length > 5 && cluster.every(s => Math.abs(s.total / avg - 1) <= 0.1)) {
        cluster.forEach(s => used.add(s.id));
        add(shift, 'pattern', 'warning', 'Ventas consecutivas de importes similares',
          'Se registraron más de cinco ventas en hasta dos minutos, con importes dentro de ±10% del promedio. Revisá tickets y contexto de atención; una demanda intensa también puede explicarlo.',
          { timeRange: `${new Date(saleTime(cluster[0])).toISOString()} / ${new Date(saleTime(cluster[cluster.length - 1])).toISOString()}`, salesCount: cluster.length, avgAmount: round(avg), firstTicket: cluster[0].ticketNumber, lastTicket: cluster[cluster.length - 1].ticketNumber }, `${shift.id}:${cluster[0].id}`);
      }
    }
  }

  const operators = new Map<string, Shift[]>();
  for (const shift of eligibleShifts.filter(s => s.closed_at && timestamp(s.closed_at) <= reference)) {
    const key = `${shift.store_id}:${shift.opened_by}`;
    operators.set(key, [...(operators.get(key) || []), shift]);
  }
  const n = finite(options.recentClosures) ? Math.max(3, Math.floor(options.recentClosures)) : 10;
  for (const [identity, closures] of operators) {
    const recent = closures.sort((a, b) => timestamp(b.closed_at) - timestamp(a.closed_at) || a.id.localeCompare(b.id)).slice(0, n);
    const streak: Shift[] = [];
    for (const shift of recent) {
      // A missing/redacted balance breaks the observed sequence; never assume zero.
      if (!finite(shift.counted_cash) || !finite(shift.expected_cash) || shift.counted_cash >= shift.expected_cash) break;
      streak.push(shift);
    }
    const shortage = streak.reduce((sum, s) => sum + s.expected_cash! - s.counted_cash!, 0);
    if (streak.length >= 3 && shortage / streak.length > 500) add(streak[0], 'cash_discrepancy', 'critical', 'Faltantes en cierres consecutivos',
      'Los últimos cierres cargados de este operador tienen faltantes consecutivos con promedio superior a $500. Revisá conteos y comprobantes; se usan los importes esperados guardados, sin recalcular ni sumar nuevamente retiros.',
      { operator: operator(streak[0]), consecutiveShortages: streak.length, avgShortage: round(shortage / streak.length), totalShortage: round(shortage), reviewedClosures: recent.length, firstShift: streak[streak.length - 1].id, lastShift: streak[0].id }, `${identity}:${streak[0].id}`);
  }
  const priority = { critical: 0, warning: 1, info: 2 };
  const shiftDates = new Map(eligibleShifts.map(s => [s.id, timestamp(s.closed_at || s.opened_at)]));
  return alerts.sort((a, b) => priority[a.severity] - priority[b.severity]
    || (shiftDates.get(b.shift_id!) || 0) - (shiftDates.get(a.shift_id!) || 0) || a.id.localeCompare(b.id));
}
