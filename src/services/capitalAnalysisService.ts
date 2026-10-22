import type { Product } from '../features/retail/api';
import type { KioscoSale } from '../types/kiosco';
import type { StockReplenishment } from './replenishmentService';
import { hasComposition, inventorySaleUnits } from './productComposition';

export interface CapitalAlert {
  productId: string;
  productName: string;
  category: string;
  stock: number;
  cost: number;
  capitalLocked: number; // cost * stock
  daysSinceLastSale: number | null;
  daysSinceRestock: number | null;
  daysToExpiry: number | null;
  rotationSpeed: 'fast' | 'medium' | 'slow' | 'dead';
  suggestedAction: 'promo_2x1' | 'discount_20' | 'discount_30' | 'combo' | 'clearance' | 'none';
  suggestedPromoText: string; // ej: "2x1 Galletitas Oreo"
  urgency: 'green' | 'yellow' | 'red';
}

export interface CapitalAnalysisOptions {
  asOf?: string | Date;
  replenishments?: StockReplenishment[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' });
function calendarDay(date: Date): number {
  const parts = Object.fromEntries(calendar.formatToParts(date).map(part => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    const dateOnly = legacy ? `${legacy[3]}-${legacy[2].padStart(2, '0')}-${legacy[1].padStart(2, '0')}` : value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      // Date-only values refer to the commerce's calendar, never the device's timezone.
      const date = new Date(`${dateOnly}T03:00:00Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === dateOnly ? date : null;
    }
    if (!/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseSaleTimestamp(sale: KioscoSale): number | null {
  const candidates = [
    sale.created_at,
    sale.createdAt,
    sale.date,
  ];

  for (const candidate of candidates) {
    const parsed = parseDate(candidate);
    if (parsed) return parsed.getTime();
  }
  return null;
}

function generatePromoText(product: Product, action: CapitalAlert['suggestedAction']): string {
  const name = product.name;
  const price = product.price;

  switch (action) {
    case 'promo_2x1':
      return `2x1 ${name}`;
    case 'discount_30': {
      if (Number.isFinite(price) && price > 0) {
        const discounted = Math.round(price * 0.7);
        return `Rebaja 30% - ${name} $${price} → $${discounted}`;
      }
      return `Rebaja 30% - ${name}`;
    }
    case 'discount_20': {
      if (Number.isFinite(price) && price > 0) {
        const discounted = Math.round(price * 0.8);
        return `Descuento 20% - ${name} $${price} → $${discounted}`;
      }
      return `Descuento 20% - ${name}`;
    }
    case 'clearance': {
      return `Liquidación - ${name}: definir precio revisando costo y margen`;
    }
    case 'combo':
      return `Combo promocional con ${name}`;
    case 'none':
    default:
      return '';
  }
}

/**
 * Analiza el capital inmovilizado en stock y clasifica productos por rotación y riesgo de vencimiento.
 */
export function analyzeCapital(
  products: readonly Product[],
  sales: readonly KioscoSale[],
  options: CapitalAnalysisOptions = {},
): CapitalAlert[] {
  const now = options.asOf ? parseDate(options.asOf) : new Date();
  if (!now) return [];
  const nowMs = now.getTime();
  const nowStartOfDay = calendarDay(now);

  // Match only catalog IDs; names can be duplicated or belong to manual items.
  const lastSaleByProductId = new Map<string, number>();

  for (const sale of sales) {
    const saleTime = parseSaleTimestamp(sale);
    if (saleTime === null || saleTime > nowMs || !Number.isFinite(sale.total) || sale.total <= 0 || !Array.isArray(sale.items)) continue;

    for (const item of sale.items.flatMap(inventorySaleUnits)) {
      if (item?.productId && Number.isFinite(item.qty) && item.qty > 0) {
        const current = lastSaleByProductId.get(item.productId);
        if (current === undefined || saleTime > current) {
          lastSaleByProductId.set(item.productId, saleTime);
        }
      }
    }
  }

  // Indexar última reposición por productId si hay historial provisto
  const lastRestockByProductId = new Map<string, number>();
  if (Array.isArray(options.replenishments)) {
    for (const rep of options.replenishments) {
      const repDate = parseDate(rep?.createdAt);
      if (!repDate || repDate.getTime() > nowMs || !Array.isArray(rep.items)) continue;
      const repTime = repDate.getTime();
      for (const item of rep.items || []) {
        if (item?.productId && Number.isFinite(item.quantityAdded) && item.quantityAdded > 0) {
          const current = lastRestockByProductId.get(item.productId);
          if (current === undefined || repTime > current) {
            lastRestockByProductId.set(item.productId, repTime);
          }
        }
      }
    }
  }

  const alerts: CapitalAlert[] = [];

  for (const p of products) {
    // Filtro a: Solo activos con stock > 0 y costo > 0
    if (hasComposition(p) || p.active === false || !Number.isFinite(p.stock) || p.stock <= 0 || !Number.isFinite(p.cost) || p.cost <= 0 || !Number.isFinite(p.cost * p.stock)) {
      continue;
    }

    // 1. Días desde última venta
    const lastSaleTime = lastSaleByProductId.get(p.id);
    let daysSinceLastSale: number | null = null;
    if (lastSaleTime !== undefined) {
      const diffMs = nowStartOfDay - calendarDay(new Date(lastSaleTime));
      daysSinceLastSale = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
    }

    // 2. Capital inmovilizado
    const capitalLocked = Math.round(p.cost * p.stock * 100) / 100;

    // 3. Velocidad de rotación
    // 0-7 días sin venta = fast, 8-21 = medium, 22-45 = slow, >45 o sin ventas registradas = dead
    let rotationSpeed: CapitalAlert['rotationSpeed'] = 'dead';
    if (daysSinceLastSale !== null) {
      if (daysSinceLastSale <= 7) {
        rotationSpeed = 'fast';
      } else if (daysSinceLastSale <= 21) {
        rotationSpeed = 'medium';
      } else if (daysSinceLastSale <= 45) {
        rotationSpeed = 'slow';
      } else {
        rotationSpeed = 'dead';
      }
    } else {
      // Sin ventas registradas en todo el historial cargado
      rotationSpeed = 'dead';
    }

    // 4. Días desde última reposición
    let daysSinceRestock: number | null = null;
    if (p.last_restocked_at) {
      const restockDate = parseDate(p.last_restocked_at);
      if (restockDate && restockDate.getTime() <= nowMs) {
        daysSinceRestock = Math.max(0, Math.round((nowStartOfDay - calendarDay(restockDate)) / MS_PER_DAY));
      }
    }
    {
      const fallbackRestockTime = lastRestockByProductId.get(p.id);
      if (fallbackRestockTime !== undefined) {
        const localAge = Math.max(0, Math.round((nowStartOfDay - calendarDay(new Date(fallbackRestockTime))) / MS_PER_DAY));
        daysSinceRestock = Math.min(daysSinceRestock ?? Infinity, localAge);
      }
    }

    // 5. Días hasta vencimiento (si tiene expiry_date)
    let daysToExpiry: number | null = null;
    if (p.expiry_date) {
      const expDate = parseDate(p.expiry_date);
      if (expDate && !isNaN(expDate.getTime())) {
        const diffMs = calendarDay(expDate) - nowStartOfDay;
        daysToExpiry = Math.round(diffMs / MS_PER_DAY);
      }
    }

    // 6. Matriz de decisión para suggestedAction y urgency
    let suggestedAction: CapitalAlert['suggestedAction'] = 'none';
    let urgency: CapitalAlert['urgency'] = 'green';

    if (rotationSpeed === 'dead') {
      urgency = 'red';
      if (capitalLocked > 5000) {
        suggestedAction = 'clearance';
      } else {
        suggestedAction = 'discount_30';
      }
    } else if (rotationSpeed === 'slow') {
      if (daysToExpiry !== null && daysToExpiry <= 15) {
        suggestedAction = 'promo_2x1';
        urgency = 'red';
      } else {
        suggestedAction = 'discount_20';
        urgency = 'yellow';
      }
    } else if (rotationSpeed === 'medium') {
      if (daysToExpiry !== null && daysToExpiry <= 30) {
        suggestedAction = 'combo';
        urgency = 'yellow';
      } else {
        suggestedAction = 'none';
        urgency = 'green';
      }
    } else {
      // Otros (fast o normal)
      suggestedAction = 'none';
      urgency = 'green';
    }

    // Expired merchandise needs review, not an offer to sell it.
    if (daysToExpiry !== null && daysToExpiry < 0) { suggestedAction = 'none'; urgency = 'red'; }
    const suggestedPromoText = daysToExpiry !== null && daysToExpiry < 0
      ? `Vencido - ${p.name}: revisar y retirar de la venta; no promocionar`
      : generatePromoText(p, suggestedAction);

    alerts.push({
      productId: p.id,
      productName: p.name,
      category: p.category || 'Sin categoría',
      stock: p.stock,
      cost: p.cost,
      capitalLocked,
      daysSinceLastSale,
      daysSinceRestock,
      daysToExpiry,
      rotationSpeed,
      suggestedAction,
      suggestedPromoText,
      urgency,
    });
  }

  // Ordenar por urgency (red > yellow > green), luego por capitalLocked DESC
  const urgencyWeight: Record<CapitalAlert['urgency'], number> = {
    red: 0,
    yellow: 1,
    green: 2,
  };

  alerts.sort((a, b) => {
    const diffUrgency = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    if (diffUrgency !== 0) return diffUrgency;
    return b.capitalLocked - a.capitalLocked || a.productId.localeCompare(b.productId);
  });

  return alerts;
}
