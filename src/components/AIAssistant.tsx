import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Send,
  Square,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Trophy,
  LayoutGrid,
  ShoppingCart,
  Copy,
  Check,
  User,
  Bot,
} from "lucide-react";
import { groqStream, isRateLimitError, getRetryDelay, DEFAULT_MODEL, FALLBACK_FAST_MODEL } from "../services/groqService";
import type { GroqMessage } from "../types/ai";
import { AiMarkdownRenderer } from "./AiMarkdownRenderer";
import { retail, type Store, type Product, type Shift, type Movement, type Role, type Member } from "../features/retail/api";
import type { KioscoSale } from "../types/kiosco";
import { marginSales, summarizeMargins, marginPrompt, type MarginSummary as MarginSummaryData } from '../features/retail/marginAnalytics';
import { MarginSummary } from '../features/retail/MarginSummary';
import { detectAnomalies } from '../services/anomalyDetectionService';
import { predictStockLevels, type StockPrediction } from '../services/stockPredictionService';
import { analyzeCapital } from '../services/capitalAnalysisService';
import { replenishmentService } from '../services/replenishmentService';
import { hasComposition, inventorySaleUnits } from '../services/productComposition';

export interface AIAssistantProps {
  store: Store;
  products: Product[];
  shifts: Shift[];
  sales: KioscoSale[];
  movements: Movement[];
  role: Role;
  ownerEmail?: string;
  members?: Member[];
}

const INITIAL_CAPABILITY_CHIPS = [
  { label: "¿Tengo mercadería clavada o por vencer?", icon: AlertTriangle },
  { label: "¿Cómo va el negocio esta semana?", icon: TrendingUp },
  { label: "¿Detectaste algo sospechoso en los turnos?", icon: AlertTriangle },
  { label: "¿Qué distribuidor me deja más margen?", icon: TrendingUp },
  { label: "Analizá mis productos sin movimiento", icon: AlertTriangle },
  { label: "¿Cuándo fue mi mejor turno del mes?", icon: Trophy },
  { label: "Sugerí categorías para reorganizar el catálogo", icon: LayoutGrid },
  { label: "¿Qué debería comprar esta semana?", icon: ShoppingCart },
  { label: "¿De qué me voy a quedar sin stock esta semana?", icon: ShoppingCart },
];

function compactStockPredictions(predictions: StockPrediction[], products: Product[]) {
  type Entry = Record<string, string | number | boolean | null>;
  const costs = new Map(products.map(p => [p.id, p.cost]));
  const capital = (p: StockPrediction) => {
    const cost = costs.get(p.productId);
    return typeof cost === 'number' && Number.isFinite(cost) && cost >= 0
      ? Math.round(p.currentStock * cost * 100) / 100 : null;
  };
  const short = (value: string) => [...value].length > 48 ? [...value].slice(0, 47).join('') + '…' : value;
  const base = (p: StockPrediction): Entry => ({ id: p.productId, producto: short(p.productName) });
  const candidates = {
    criticos: predictions.filter(p => p.priority === 'critical' || p.priority === 'soon').slice(0, 10).map(p => ({
      ...base(p), proveedor: short(p.supplier || 'Sin proveedor'), quiebre: p.stockoutDate || null,
      unidades: p.suggestedOrderQty, ...(p.suggestedOrderPacks !== null ? { bultos: p.suggestedOrderPacks } : {}),
    } as Entry)),
    sobrestock: predictions.filter(p => p.priority === 'overstocked')
      .sort((a, b) => (capital(b) ?? -1) - (capital(a) ?? -1)).slice(0, 5)
      .map(p => ({ ...base(p), stock: p.currentStock, capital: capital(p), ...(p.dailyAvgSales === 0 ? { sinVentasObservadas: true } : {}) } as Entry)),
    tendenciasAlAlza: predictions.filter(p => p.trend === 'accelerating')
      .sort((a, b) => b.dailyAvgSales - a.dailyAvgSales).slice(0, 5)
      .map(p => ({ ...base(p), diarias: Math.round(p.dailyAvgSales * 100) / 100 } as Entry)),
  };
  const summary = { criticos: [] as Entry[], sobrestock: [] as Entry[], tendenciasAlAlza: [] as Entry[] };
  const keys = ['criticos', 'sobrestock', 'tendenciasAlAlza'] as const;
  const encoder = new TextEncoder();
  // Compact fields and a byte budget keep this addition small without a tokenizer dependency.
  // Round-robin reserves room for each nonempty category, prioritizing shortages on ties.
  for (let index = 0; index < 10; index++) {
    for (const key of keys) {
      const row = candidates[key][index];
      if (!row) continue;
      summary[key].push(row);
      if (encoder.encode(JSON.stringify(summary)).length > 1200) summary[key].pop();
    }
  }
  return summary;
}

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
    if (item.date.includes("-")) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) return d;
    }
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

function isSaleToday(s: KioscoSale, now: Date): boolean {
  const d = extractDate(s);
  if (d) {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  const todayIso = now.toISOString().split("T")[0];
  const todayAr = now.toLocaleDateString("es-AR");
  if (s.date === todayIso || s.date === todayAr) return true;
  return false;
}

interface PeriodMetrics {
  separation: MarginSummaryData;
  tickets: number;
  facturado: number;
  cmv: number;
  gananciaBruta: number | null;
  margenPct: number | null;
  unidadesVendidas: number;
  ticketPromedio: number;
  diasActivos: number;
  diasConVenta: {
    fechaIso: string;
    fecha: string;
    tickets: number;
    facturado: number;
    cmv: number;
    ganancia: number | null;
    margenPct: number | null;
  }[];
  topProductos: {
    nombre: string;
    unidades: number;
    facturado: number;
    ganancia: number | null;
    margenPct: number | null;
  }[];
  metodosPago: {
    metodo: string;
    tickets: number;
    total: number;
    pct: number;
  }[];
}

function computeMetrics(salesList: KioscoSale[], products: Product[]): PeriodMetrics {
  const separation = summarizeMargins(salesList, products);
  salesList = marginSales(salesList, products, 'standard');
  let revenue = 0;
  let cmv = 0;
  let units = 0;
  const paymentMethods: Record<string, { count: number; amount: number }> = {};
  const productsAgg: Record<string, { name: string; qty: number; revenue: number; cost: number; missingCosts: number }> = {};
  const daysMap: Record<string, { date: string; dateObj: Date; tickets: number; revenue: number; cmv: number; profit: number; missingCosts: number }> = {};

  for (const s of salesList) {
    const total = Number(s.total) || 0;
    revenue += total;

    const pm = s.paymentMethod || "Efectivo";
    if (!paymentMethods[pm]) paymentMethods[pm] = { count: 0, amount: 0 };
    paymentMethods[pm].count += 1;
    paymentMethods[pm].amount += total;

    let saleCmv = 0;
    let missingCosts = 0;
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
      units += qty;
      const unitCost = item.unitCost ?? 0;
      if (item.unitCost == null) missingCosts++;
      const itemCost = unitCost * qty;
      const itemSubtotal = Number(item.subtotal) || (qty * (Number(item.unitPrice) || 0));
      saleCmv += itemCost;

      const name = item.name ? item.name.trim() : "Sin nombre";
      if (!productsAgg[name]) productsAgg[name] = { name, qty: 0, revenue: 0, cost: 0, missingCosts: 0 };
      productsAgg[name].qty += qty;
      productsAgg[name].revenue += itemSubtotal;
      productsAgg[name].cost += itemCost;
      if (item.unitCost == null) productsAgg[name].missingCosts++;
    }
    cmv += saleCmv;

    const d = extractDate(s);
    const dayKey = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : (s.date || "Fecha no especificada");
    const displayDate = d
      ? d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })
      : (s.date || "Fecha no especificada");

    if (!daysMap[dayKey]) {
      daysMap[dayKey] = {
        date: displayDate,
        dateObj: d || new Date(0),
        tickets: 0,
        revenue: 0,
        cmv: 0,
        profit: 0,
        missingCosts: 0,
      };
    }
    daysMap[dayKey].tickets += 1;
    daysMap[dayKey].revenue += total;
    daysMap[dayKey].cmv += saleCmv;
    daysMap[dayKey].profit += (total - saleCmv);
    daysMap[dayKey].missingCosts += missingCosts;
  }

  const profit = separation.standard.profit;
  const marginPct = separation.standard.marginPercent;
  const avgTicket = salesList.length > 0 ? revenue / salesList.length : 0;

  const topProductos = Object.values(productsAgg)
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 8)
    .map((p) => ({
      nombre: p.name,
      unidades: p.qty,
      facturado: p.revenue,
      ganancia: p.missingCosts ? null : p.revenue - p.cost,
      margenPct: p.missingCosts ? null : p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0,
    }));

  const sortedDays = Object.entries(daysMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, data]) => ({
      fechaIso: key,
      fecha: data.date,
      tickets: data.tickets,
      facturado: data.revenue,
      cmv: data.cmv,
      ganancia: data.missingCosts ? null : data.profit,
      margenPct: data.missingCosts ? null : data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0,
    }));

  return {
    separation,
    tickets: salesList.length,
    facturado: revenue,
    cmv,
    gananciaBruta: profit,
    margenPct: marginPct === null ? null : Math.round(marginPct * 10) / 10,
    unidadesVendidas: units,
    ticketPromedio: Math.round(avgTicket),
    diasActivos: sortedDays.length,
    diasConVenta: sortedDays,
    topProductos,
    metodosPago: Object.entries(paymentMethods).map(([m, val]) => ({
      metodo: m,
      tickets: val.count,
      total: val.amount,
      pct: revenue > 0 ? Math.round((val.amount / revenue) * 100) : 0,
    })),
  };
}

export function AIAssistant({
  store,
  products,
  shifts,
  sales,
  movements,
  role,
  ownerEmail,
  members,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<GroqMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [localSales, setLocalSales] = useState<KioscoSale[]>(sales);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync or fetch sales if manager and sales array is empty
  useEffect(() => {
    if (sales && sales.length > 0) {
      setLocalSales(sales);
    } else if (store?.id && (role === "owner" || role === "admin")) {
      retail
        .allSales(store.id)
        .then((data) => {
          if (data && data.length > 0) setLocalSales(data);
        })
        .catch(() => {});
    }
  }, [sales, store?.id, role]);

  const activeSales = localSales.length > 0 ? localSales : sales;
  const activeMovements = movements;

  // Compute comprehensive analytical metrics across multiple time periods
  const analytics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOf7Days = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const salesToday: KioscoSale[] = [];
    const sales7Days: KioscoSale[] = [];
    const salesMonth: KioscoSale[] = [];
    const salesLastMonth: KioscoSale[] = [];

    for (const s of activeSales) {
      const d = extractDate(s);
      if (d) {
        if (d >= startOfToday && d <= endOfToday) salesToday.push(s);
        if (d >= startOf7Days && d <= endOfToday) sales7Days.push(s);
        if (d >= startOfMonth && d <= endOfToday) salesMonth.push(s);
        if (d >= startOfLastMonth && d <= endOfLastMonth) salesLastMonth.push(s);
      } else if (isSaleToday(s, now)) {
        salesToday.push(s);
        sales7Days.push(s);
        salesMonth.push(s);
      }
    }

    const hoy = computeMetrics(salesToday, products);
    const estaSemana = computeMetrics(sales7Days, products);
    const esteMes = computeMetrics(salesMonth, products);
    const mesAnterior = computeMetrics(salesLastMonth, products);
    const historico = computeMetrics(activeSales, products);

    const criticalStock = products.filter((p) => !hasComposition(p) && p.stock <= p.minStock).length;
    const activeShift = shifts.find((s) => !s.closed_at);

    return {
      hoy,
      estaSemana,
      esteMes,
      mesAnterior,
      historico,
      criticalStock,
      activeShift: !!activeShift,
      totalProductos: products.length,
    };
  }, [products, activeSales, shifts]);

  // Autoscroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const buildSystemPrompt = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const monthName = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

    // Distribuidores y márgenes
    const supplierMap: Record<string, { count: number; totalMargin: number }> = {};
    for (const p of products) {
      if (p.margin_group !== 'low_margin' && p.supplier && p.price > 0 && typeof p.cost === "number" && p.cost > 0) {
        const sName = p.supplier.trim();
        const margin = ((p.price - p.cost) / p.price) * 100;
        if (!supplierMap[sName]) supplierMap[sName] = { count: 0, totalMargin: 0 };
        supplierMap[sName].count += 1;
        supplierMap[sName].totalMargin += margin;
      }
    }
    const margenPorDistribuidor = Object.entries(supplierMap)
      .map(([sup, data]) => ({
        distribuidor: sup,
        productos: data.count,
        margenPromedioPct: Math.round(data.totalMargin / data.count),
      }))
      .sort((a, b) => b.margenPromedioPct - a.margenPromedioPct)
      .slice(0, 6);

    // Productos sin movimiento
    const soldProductNames = new Set<string>();
    const soldProductIds = new Set<string>();
    for (const s of activeSales) {
      for (const item of (s.items || [])) {
        if (item.productId) soldProductIds.add(item.productId);
        for (const physical of inventorySaleUnits(item)) soldProductIds.add(physical.productId);
        if (item.name) soldProductNames.add(item.name.toLowerCase().trim());
      }
    }
    const productosSinVentas = products
      .filter(
        (p) =>
          p.active && !hasComposition(p) &&
          p.stock > 0 &&
          !soldProductIds.has(p.id) &&
          !soldProductNames.has(p.name.toLowerCase().trim()),
      )
      .slice(0, 8)
      .map((p) => ({
        nombre: p.name,
        stockInmovilizado: p.stock,
        capitalParado: p.cost ? p.cost * p.stock : 0,
        categoria: p.category,
      }));

    // Mejor turno del mes
    let mejorTurno: {
      id: string;
      fecha: string;
      cajero: string;
      recaudacion: number;
      diferencia: number | null;
    } | null = null;
    for (const sh of shifts) {
      const shDate = extractDate(sh);
      const shRecaudacion = sh.counted_cash ?? sh.expected_cash ?? 0;
      if (!mejorTurno || shRecaudacion > mejorTurno.recaudacion) {
        mejorTurno = {
          id: sh.id,
          fecha: shDate ? shDate.toLocaleDateString("es-AR") : sh.opened_at,
          cajero: sh.opened_by,
          recaudacion: shRecaudacion,
          diferencia:
            sh.counted_cash !== null && sh.expected_cash !== null
              ? sh.counted_cash - sh.expected_cash
              : null,
        };
      }
    }

    // Critical stock items
    const criticalProducts = products
      .filter((p) => !hasComposition(p) && p.stock <= p.minStock)
      .slice(0, 15)
      .map((p) => ({
        nombre: p.name,
        codigo: p.code,
        categoria: p.category,
        precio: p.price,
        costo: p.cost,
        stock: p.stock,
        minimo: p.minStock,
        grupoMargen: p.margin_group ?? 'standard',
        margenPct: p.price > 0 && p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : null,
      }));

    // Recent detailed sales (up to 15 to stay within free token limits)
    const ventasDetalladas = activeSales.slice(0, 15).map((s) => {
      const d = extractDate(s);
      const separation = summarizeMargins([s], products);
      const principal = marginSales([s], products, 'standard')[0];
      return {
        ticket: s.ticketNumber,
        fecha: d ? d.toLocaleDateString("es-AR") : (s.date || "Fecha no especificada"),
        hora: d ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : (s.timestamp || ""),
        total: separation.standard.revenue,
        totalRegistrado: Number(s.total) || 0,
        bajoMargen: separation.lowMargin,
        medio: s.paymentMethod,
        cmv: separation.standard.cost,
        gananciaBruta: separation.standard.profit,
        items: principal?.items.map((i) => `${i.qty}x ${i.name} ($${Number(i.unitPrice || (i.subtotal / i.qty))})`).join(", ") || "",
      };
    });

    // Date range of historical sales
    const validDates = activeSales
      .map(extractDate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const rangoHistorico = {
      totalVentasEnBD: activeSales.length,
      cobertura: `Muestra cargada de ${activeSales.length} ventas. La consulta histórica está limitada a 500 registros y puede usarse la del turno actual si no hay histórico disponible; no se acredita cobertura completa.`,
      primeraVenta: validDates.length > 0 ? validDates[0].toLocaleDateString("es-AR") : "No disponible",
      ultimaVenta: validDates.length > 0 ? validDates[validDates.length - 1].toLocaleDateString("es-AR") : "No disponible",
    };

    const alertasOperativas = role === 'owner' || role === 'admin'
      ? detectAnomalies(activeSales, shifts.filter(shift => shift.store_id === store.id), activeMovements, products, members, {
        asOf: now.toISOString(),
        // Conservatively exclude the earliest potentially partial shift from payment comparisons.
        salesCompleteSince: validDates[0]?.toISOString(),
      }) : [];
    const prediccionStock = compactStockPredictions(predictStockLevels(products, activeSales, { asOf: now.toISOString() }), products);
    const localRestocks = replenishmentService.getHistory(store.id);
    const capitalAlerts = analyzeCapital(products, activeSales, { asOf: now.toISOString(),
      replenishments: Array.isArray(localRestocks) ? localRestocks.filter(record => record?.storeId === store.id) : [],
    });
    const semaforoRojos = capitalAlerts.filter((a) => a.urgency === 'red');
    const semaforoAmarillos = capitalAlerts.filter((a) => a.urgency === 'yellow');
    const capitalTotalInmovilizado = capitalAlerts
      .filter((a) => a.urgency === 'red' || a.urgency === 'yellow')
      .reduce((sum, a) => sum + a.capitalLocked, 0);
    const productosMuertos = capitalAlerts.filter((a) => a.rotationSpeed === 'dead').length;
    // Same population and valuation as the numerator: active products with valid positive stock/cost.
    const stockTotalValorizado = capitalAlerts.reduce((sum, alert) => sum + alert.capitalLocked, 0);

    const contextPayload = {
      semaforoCapital: {
        rojos: semaforoRojos.slice(0, 8),
        amarillos: semaforoAmarillos.slice(0, 5),
        capitalTotalInmovilizado: Math.round(capitalTotalInmovilizado),
        productosMuertos,
        stockTotalValorizado: Math.round(stockTotalValorizado),
        porcentajeCapitalParado: stockTotalValorizado > 0 ? Math.round(capitalTotalInmovilizado / stockTotalValorizado * 10000) / 100 : null,
        productosSinVentaObservada: capitalAlerts.filter(alert => alert.daysSinceLastSale === null).length,
        alcance: 'Totales sobre todos los productos activos con stock y costo positivos; listas acotadas a 8 rojos y 5 amarillos. Rotación por días desde última venta en la muestra cargada, no por unidades/stock. Sin venta observada se clasifica dead para revisión, sin demostrar 45 días de inactividad. Reposición: fecha persistida o historial local de este dispositivo, que puede incluir pendientes de sincronización. No hay trazabilidad por lote.',
      },
      prediccionStock,
      alertasOperativas: alertasOperativas.slice(0, 10),
      alcanceAlertasOperativas: {
        totalDetectadas: alertasOperativas.length,
        ventasCargadas: activeSales.length,
        turnosCargados: shifts.length,
        movimientosCargados: activeMovements.length,
        limitaciones: 'Se analizan solo datos cargados: hasta 500 ventas históricas, hasta 200 cierres y movimientos del turno seleccionado. No hay eventos de carritos descartados ni horario 24hs configurado. Las ventas sin turno identificable de forma única se excluyen. No confundir falta de alertas con ausencia de problemas.',
        criterios: 'Efectivo/QR: turnos cerrados con al menos 3 turnos previos comparables en 30 días, QR contra promedio por turno, pagos mixtos desglosados. Faltantes: hasta 10 últimos cierres por operador; importes ocultos o faltantes interrumpen la secuencia. Ráfagas: más de 5 ventas en 2 minutos e importes ±10%. Horarios en Argentina; madrugada solo informativa sin horario confirmado.',
      },
      resumenEjecutivo: {
        hoy: {
          tickets: analytics.hoy.tickets,
          facturado: analytics.hoy.facturado,
          cmv: analytics.hoy.cmv,
          gananciaBruta: analytics.hoy.gananciaBruta,
          margenPct: analytics.hoy.margenPct,
        },
        estaSemanaUltimos7Dias: {
          tickets: analytics.estaSemana.tickets,
          facturado: analytics.estaSemana.facturado,
          cmv: analytics.estaSemana.cmv,
          gananciaBruta: analytics.estaSemana.gananciaBruta,
          margenPct: analytics.estaSemana.margenPct,
          diasActivos: analytics.estaSemana.diasActivos,
          topProductos: analytics.estaSemana.topProductos.slice(0, 5),
        },
        esteMes: {
          mes: monthName,
          tickets: analytics.esteMes.tickets,
          facturado: analytics.esteMes.facturado,
          cmv: analytics.esteMes.cmv,
          gananciaBruta: analytics.esteMes.gananciaBruta,
          margenPct: analytics.esteMes.margenPct,
          ticketPromedio: analytics.esteMes.ticketPromedio,
          diasConVenta: analytics.esteMes.diasConVenta,
          topProductos: analytics.esteMes.topProductos.slice(0, 5),
        },
        mesAnterior:
          analytics.mesAnterior.tickets > 0
            ? {
                tickets: analytics.mesAnterior.tickets,
                facturado: analytics.mesAnterior.facturado,
                cmv: analytics.mesAnterior.cmv,
                gananciaBruta: analytics.mesAnterior.gananciaBruta,
                margenPct: analytics.mesAnterior.margenPct,
              }
            : "Sin registros en el mes anterior",
        historicoConsolidado: {
          ...rangoHistorico,
          facturadoTotal: analytics.historico.facturado,
          cmvTotal: analytics.historico.cmv,
          gananciaBrutaTotal: analytics.historico.gananciaBruta,
          margenPromedioPct: analytics.historico.margenPct,
        },
      },
      stockCritico: criticalProducts,
      productosSinMovimiento: productosSinVentas,
      distribuidoresMargen: margenPorDistribuidor,
      separacionPorPeriodo: {
        hoy: analytics.hoy.separation,
        ultimos7Dias: analytics.estaSemana.separation,
        esteMes: analytics.esteMes.separation,
        mesAnterior: analytics.mesAnterior.separation,
        historico: analytics.historico.separation,
      },
      mejorTurno,
      movimientosCajaRecientes: activeMovements.slice(0, 10).map((m) => ({
        tipo: m.type,
        monto: m.amount,
        motivo: m.reason,
      })),
      ultimasVentasDetalladas: ventasDetalladas,
    };

    const roleName = role === "owner" ? "Dueño / Propietario" : role === "admin" ? "Administrador" : "Cajero";

    return `Sos el Socio de Negocio IA y Asesor Financiero de ${ownerEmail || "el usuario"} para su comercio '${store.name}'.
El usuario tiene rol de ${roleName.toUpperCase()}.
Como administrador/dueño, tiene acceso TOTAL e IRRESTRICTO a toda la información comercial y financiera: ventas históricas, costos, rentabilidad, márgenes brutos, desempeño por turnos y stock.

FECHA ACTUAL: ${formattedDate}.
MES EN CURSO: ${monthName}.

REGLAS FUNDAMENTALES DE RESPUESTA:
${marginPrompt(analytics.esteMes.separation)}
Estas reglas de separación aplican a todos los períodos del JSON. Mostrá siempre la facturación bajo margen por separado y no la sumes al ticket promedio ni margen principal. Los arqueos de caja y movimientos operativos incluyen ambos grupos y no son indicadores de rentabilidad.
1. DATOS DISPONIBLES: Usá las métricas del JSON para los períodos indicados. No inventes registros ausentes ni afirmes que se consultó la base completa.
2. COBERTURA: ${rangoHistorico.cobertura} Explicá las limitaciones cuando afecten una comparación o investigación operativa.
3. RENTABILIDAD: Cuando pregunten por la rentabilidad del último mes o de este mes:
   - Facturación real sin bajo margen: $...
   - Facturación bajo margen y su contribución a la ganancia bruta, por separado.
   - Costo de mercadería vendida (CMV): $...
   - Ganancia bruta: $...
   - Margen de ganancia bruto: ...%
   - Explicá que este cálculo corresponde a la rentabilidad comercial sobre productos vendidos (Ingresos - CMV).
4. DÍAS CON VENTAS: Si preguntan qué días tuvieron ventas este mes, usá 'actividadDiariaEsteMes' y listá cada día exacto con su fecha, cantidad de tickets y facturación.
5. PREGUNTAS CLAVE:
   - "¿Cómo va el negocio esta semana?": Usá 'estaSemanaUltimos7Dias' (facturación, tickets, ganancia, top productos) y cruzalo con el stock crítico.
   - "¿Qué distribuidor me deja más margen?": Usá 'distribuidoresMargen'.
   - "Analizá mis productos sin movimiento": Usá 'productosSinMovimiento' y mencioná el capital parado.
   - "¿Tengo mercadería clavada o por vencer?" / mercadería clavada / capital parado / vencimientos: Cuando pregunten por mercadería clavada, capital parado o vencimientos, usá 'semaforoCapital'. Sugerí las promociones concretas del campo 'suggestedPromoText'. Calculá el porcentaje de capital parado respecto al stock total valorizado.
   - Usá porcentajeCapitalParado ya calculado (null = sin base para calcular). Capital parado suma rojos y amarillos de toda la muestra, no solo los listados. Sin última venta conocida no afirmes que nunca se vendió ni que pasaron 45 días. Es un indicador por recencia, no una medición de demanda o rentabilidad. Los precios promocionales son propuestas sin aplicar; revisá su costo y margen, especialmente bajo margen, y no prometas ganancias ni inventes descuentos de liquidación. Un producto vencido se revisa y retira de la venta, nunca se promociona. No interpretes falta de fecha como ausencia de vencimiento; puede haber distintos lotes.
   - "¿Cuándo fue mi mejor turno del mes?": Usá 'mejorTurno'.
   - "¿Qué debería comprar esta semana?" / "¿De qué me voy a quedar sin stock esta semana?": Usá prediccionStock.criticos, agrupá por proveedor e indicá fecha estimada y unidades/bultos sugeridos; no recalcules ni generes pedidos.
   - "¿Qué producto tiene sobrestock?": Usá prediccionStock.sobrestock; capital es stock por costo, null si falta. Sin ventas observadas no prueba falta de demanda.
   - Predicción: resumen acotado de la muestra cargada, 14 días completos, última semana doble peso, ajuste por día y cobertura 10 días. Puede faltar historia. No es garantía; stock cero sigue en stockCritico.
6. TONO: Hablá en español rioplatense (porteño) profesional, natural y directo (usá vos, che, tenés, fijate, bárbaro). Sé claro, ejecutivo, analítico y enfocado en la rentabilidad y crecimiento del comercio. Nunca dejes oraciones o listas a medio terminar.
7. Si hay alertas operativas, mencionálas proactivamente cuando pregunten por el rendimiento del negocio o un turno. No acuses directamente a nadie, pero presentá los datos para que el dueño investigue. Son heurísticas locales sobre la muestra cargada, no pruebas de fraude. Conservá severidad, cifras y contexto; no transformes ventas sin detalle en carritos borrados comprobados ni ventas de madrugada en irregularidades con horario desconocido. Los movimientos cargados son contexto parcial; no vuelvas a descontarlos de expected_cash ni alteres métricas de margen. La ausencia de alertas no certifica que todo esté bien.

CONTEXTO_DEL_NEGOCIO (DATOS EN TIEMPO REAL):
${JSON.stringify(contextPayload)}`;
  };

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend !== undefined ? textToSend : input).trim();
    if (!promptText || isStreaming) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: GroqMessage = { role: "user", content: promptText };
    // Optimistically add user message and placeholder for assistant
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const dynamicSystemPrompt = buildSystemPrompt();
    // Keep conversation window bounded to prevent ballooning input tokens
    const recentHistory = messages
      .filter((m) => m.role !== "system" && m.content && !m.content.startsWith("⏳ *Aviso del Asistente"))
      .slice(-4);
    const apiMessages: GroqMessage[] = [
      { role: "system", content: dynamicSystemPrompt },
      ...recentHistory,
      userMessage,
    ];

    const MAX_RETRIES = 3;
    let attempt = 0;
    let chosenModel: string | undefined = undefined;

    try {
      while (attempt <= MAX_RETRIES) {
        if (controller.signal.aborted) return;
        let currentResponse = "";

        try {
          await groqStream(
            apiMessages,
            (delta: string) => {
              if (controller.signal.aborted) return;
              currentResponse += delta;
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: currentResponse,
                };
                return updated;
              });
            },
            {
              signal: controller.signal,
              temperature: 0.3,
              maxTokens: 1200,
              model: chosenModel,
            },
          );
          // Completed successfully
          break;
        } catch (err: unknown) {
          if (controller.signal.aborted) return;

          const isRateLimit = isRateLimitError(err);
          if (!isRateLimit || attempt >= MAX_RETRIES) {
            let errorMsg =
              err instanceof Error
                ? err.message
                : "No se pudo completar la respuesta con Groq.";

            if (isRateLimit) {
              errorMsg =
                "Se alcanzó temporalmente el límite de velocidad por minuto del proveedor Groq en todos los intentos. Aguardá unos segundos y volvé a consultar.";
            }

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant" && !last.content) {
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `⏳ *Aviso del Asistente:* ${errorMsg}`,
                };
              }
              return updated;
            });
            break;
          }

          // Rate limit detected: wait and retry with countdown
          attempt++;
          const waitSecs = getRetryDelay(err, attempt === 1 ? 3 : attempt === 2 ? 5 : 7);

          // Fallback to high-TPM lightweight model on attempt >= 2 if rate limit continues
          if (attempt >= 2 && !chosenModel && DEFAULT_MODEL !== FALLBACK_FAST_MODEL) {
            chosenModel = FALLBACK_FAST_MODEL;
          }

          const modelNote = chosenModel === FALLBACK_FAST_MODEL ? " (optimizando con modelo rápido)" : "";

          // Progressive countdown timer while waiting
          for (let s = waitSecs; s > 0; s--) {
            if (controller.signal.aborted) return;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: `⏳ *Aguardando disponibilidad de tokens gratuitos de Groq (${s}s)... intento ${attempt} de ${MAX_RETRIES}${modelNote}*`,
              };
              return updated;
            });

            await new Promise<void>((resolve) => {
              const timer = setTimeout(() => {
                controller.signal.removeEventListener("abort", onAbort);
                resolve();
              }, 1000);
              function onAbort() {
                clearTimeout(timer);
                resolve();
              }
              controller.signal.addEventListener("abort", onAbort);
            });
          }

          if (controller.signal.aborted) return;

          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `🔄 *Reintentando respuesta con tokens disponibles...*`,
            };
            return updated;
          });
        }
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleNewConversation = () => {
    handleStopStreaming();
    setMessages([]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const copyResponse = (content: string, index: number) => {
    void navigator.clipboard.writeText(content);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="ai-assistant-container">
      {/* Header */}
      <header className="ai-assistant-header">
        <div className="ai-header-left">
          <div className="ai-header-icon-badge">
            <Sparkles size={22} />
          </div>
          <div className="ai-header-title-box">
            <div className="ai-header-title">
              <span>Asistente del comercio</span>
            </div>
            <span className="ai-header-subtitle">
              {store.name}
            </span>
          </div>
        </div>

        <div className="ai-header-right">
          <button
            type="button"
            className="ai-new-chat-btn"
            onClick={handleNewConversation}
            title="Iniciar nueva conversación y limpiar historial"
          >
            <RotateCcw size={14} />
            <span>Nueva conversación</span>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="ai-messages-area">
        {messages.length === 0 ? (
          <div className="ai-welcome-card">
            <div className="ai-welcome-avatar">
              <Sparkles size={28} />
            </div>
            <h2 className="ai-welcome-title">
              ¿En qué te ayudo?
            </h2>
            <p className="ai-welcome-description">
              Consultá tu stock, revisá ventas o prepará una reposición.
            </p>

            {/* Quick Metrics Row */}
            <div className="ai-welcome-stats-row">
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  ${analytics.hoy.facturado.toLocaleString("es-AR")}
                </span>
                <span className="ai-welcome-stat-label">
                  Hoy sin bajo margen ({analytics.hoy.tickets} v.)
                </span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  ${analytics.estaSemana.facturado.toLocaleString("es-AR")}
                </span>
                <span className="ai-welcome-stat-label">
                  Semana sin bajo margen ({analytics.estaSemana.tickets} v.)
                </span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  ${analytics.esteMes.facturado.toLocaleString("es-AR")}
                </span>
                <span className="ai-welcome-stat-label">
                  Mes sin bajo margen ({analytics.esteMes.tickets} v.)
                </span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span
                  className="ai-welcome-stat-value"
                  style={{ color: "var(--tone-accent, #10b981)" }}
                >
                  {analytics.esteMes.margenPct !== null
                    ? `${analytics.esteMes.margenPct}%`
                    : "—"}
                </span>
                <span className="ai-welcome-stat-label">Margen bruto est.</span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span
                  className="ai-welcome-stat-value"
                  style={{
                    color:
                      analytics.criticalStock > 0
                        ? "var(--tone-danger)"
                        : "var(--tone-accent)",
                  }}
                >
                  {analytics.criticalStock}
                </span>
                <span className="ai-welcome-stat-label">Stock crítico</span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  {analytics.totalProductos}
                </span>
                <span className="ai-welcome-stat-label">Productos catálogo</span>
              </div>
            </div>

            {/* Capability Chips */}
            <MarginSummary summary={analytics.esteMes.separation} />
            <div className="ai-chips-section">
              <span className="ai-chips-title">Consultas rápidas sugeridas:</span>
              <div className="ai-chips-grid">
                {INITIAL_CAPABILITY_CHIPS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="ai-chip-btn"
                    onClick={() => handleSend(label)}
                    disabled={isStreaming}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const isLastMessage = idx === messages.length - 1;
            const isAssistantStreaming = !isUser && isStreaming && isLastMessage;

            return (
              <div
                key={idx}
                className={`ai-message-row ${isUser ? "user" : "assistant"}`}
              >
                {!isUser && (
                  <div className="ai-bubble-avatar assistant">
                    <Bot size={18} />
                  </div>
                )}

                <div className="ai-bubble-content-box">
                  <span className="ai-bubble-author">
                    {isUser ? "Vos" : "Socio de Negocio IA"}
                  </span>
                  <div className={`ai-bubble ${isUser ? "user" : "assistant"}`}>
                    {isUser ? (
                      msg.content
                    ) : (
                      <AiMarkdownRenderer
                        content={msg.content}
                        isStreaming={isAssistantStreaming}
                      />
                    )}
                  </div>

                  {!isUser && msg.content && !isAssistantStreaming && (
                    <div className="ai-bubble-footer">
                      <button
                        type="button"
                        className="ai-copy-btn"
                        onClick={() => copyResponse(msg.content, idx)}
                        title="Copiar respuesta"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check size={12} color="var(--tone-accent)" />
                            <span style={{ color: "var(--tone-accent)" }}>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="ai-bubble-avatar user">
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Bar */}
      <div className="ai-input-bar-container">
        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu consulta…"
            aria-label="Consulta para el asistente"
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              type="button"
              className="ai-stop-btn"
              onClick={handleStopStreaming}
              title="Detener respuesta"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="ai-send-btn"
              disabled={!input.trim()}
              title="Enviar mensaje (Enter)"
            >
              <Send size={16} />
            </button>
          )}
        </form>
        <span className="ai-input-hints">
          Enter para enviar · Shift+Enter para una nueva línea
        </span>
      </div>
    </div>
  );
}
