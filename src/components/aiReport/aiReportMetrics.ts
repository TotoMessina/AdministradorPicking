import type { Shift, Product } from '../../features/retail/api';
import type { KioscoSale } from '../../types/kiosco';
import { marginSales, summarizeMargins } from '../../features/retail/marginAnalytics';
import type { PeriodType, PeriodCalculations } from './aiReportTypes';

// Cálculos locales del reporte (sin IA): ventas y turnos del período.
/**
 * Extracts a comparable Date object from a KioscoSale or Shift
 */
function extractDate(item: {
  date?: string;
  timestamp?: string;
  created_at?: string;
  createdAt?: string;
  opened_at?: string;
}): Date | null {
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  const anyItem = item as { created_at?: string };
  if (anyItem.created_at) {
    const d = new Date(anyItem.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.opened_at) {
    const d = new Date(item.opened_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.date) {
    // Check ISO: YYYY-MM-DD
    if (item.date.includes("-")) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) return d;
    }
    // Check Argentine locale: DD/MM/YYYY or D/M/YYYY
    if (item.date.includes("/")) {
      const parts = item.date.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.timestamp && (item.timestamp.includes("-") || item.timestamp.includes("T"))) {
    const d = new Date(item.timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Filters sales array according to selected period
 */
export function filterSales(sales: KioscoSale[], period: PeriodType, now: Date): KioscoSale[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return sales.filter((s) => {
    const d = extractDate(s);
    if (!d) return true; // If no date available, keep sale to avoid undercounting

    if (period === "today") {
      return d >= startOfToday && d <= endOfToday;
    }
    if (period === "7days") {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return d >= sevenDaysAgo && d <= endOfToday;
    }
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return d >= startOfMonth && d <= endOfToday;
    }
    return true;
  });
}

/**
 * Filters shifts array according to selected period
 */
export function filterShifts(shifts: Shift[], period: PeriodType, now: Date): Shift[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return shifts.filter((s) => {
    const d = extractDate(s);
    if (!d) return true;

    if (period === "today") {
      return d >= startOfToday && d <= endOfToday;
    }
    if (period === "7days") {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return d >= sevenDaysAgo && d <= endOfToday;
    }
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return d >= startOfMonth && d <= endOfToday;
    }
    return true;
  });
}

/**
 * Calculates local numerical metrics (sin IA)
 */
export function calculateLocalMetrics(
  filteredSales: KioscoSale[],
  filteredShifts: Shift[],
  products: Product[],
  period: PeriodType
): PeriodCalculations {
  const separation = summarizeMargins(filteredSales, products);
  filteredSales = marginSales(filteredSales, products, 'standard');
  const labels: Record<PeriodType, string> = {
    today: "Hoy",
    "7days": "Últimos 7 días",
    month: "Este mes",
  };

  const totalRevenue = filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const totalSalesCount = filteredSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Payments aggregation
  const paymentMap: Record<string, { count: number; amount: number }> = {};
  let totalUnitsSold = 0;

  // Products aggregation
  const productAgg: Record<string, { name: string; qty: number; subtotal: number }> = {};

  for (const s of filteredSales) {
    const method = s.paymentMethod || "Efectivo";
    if (!paymentMap[method]) {
      paymentMap[method] = { count: 0, amount: 0 };
    }
    paymentMap[method].count += 1;
    paymentMap[method].amount += Number(s.total) || 0;

    const rawItems = s.items;
    const items = Array.isArray(rawItems)
      ? rawItems
      : typeof rawItems === "string"
      ? (() => {
          try {
            return JSON.parse(rawItems);
          } catch {
            return [];
          }
        })()
      : [];

    for (const item of items) {
      const qty = Number(item.qty) || 0;
      const subtotal = Number(item.subtotal) || qty * (Number(item.unitPrice) || 0);
      totalUnitsSold += qty;

      const nameKey = item.name ? item.name.trim() : "Producto sin nombre";
      if (!productAgg[nameKey]) {
        productAgg[nameKey] = { name: nameKey, qty: 0, subtotal: 0 };
      }
      productAgg[nameKey].qty += qty;
      productAgg[nameKey].subtotal += subtotal;
    }
  }

  const paymentDistribution = Object.entries(paymentMap)
    .map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
      percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topProducts = Object.values(productAgg)
    .sort((a, b) => b.qty - a.qty || b.subtotal - a.subtotal)
    .slice(0, 5);

  const totalCost = separation.standard.cost;
  const profit = separation.standard.profit ?? undefined;
  const marginPercent = separation.standard.marginPercent ?? undefined;

  return {
    separation,
    period,
    periodLabel: labels[period],
    totalRevenue,
    totalSalesCount,
    averageTicket,
    totalUnitsSold,
    paymentDistribution,
    topProducts,
    shiftsCount: filteredShifts.length,
    estimatedMargin:
      profit !== undefined && marginPercent !== undefined
        ? {
            totalCost,
            profit,
            marginPercent,
          }
        : undefined,
  };
}
