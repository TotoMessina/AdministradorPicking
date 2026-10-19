import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  BarChart3,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  Loader2,
  DollarSign,
  Receipt,
  CreditCard,
  Package,
  Calendar,
  Lock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { groqStream } from "../services/groqService";
import { retail, type Shift, type Product, type Role } from "../features/retail/api";
import type { KioscoSale } from "../types/kiosco";
import { AiMarkdownRenderer } from "./AiMarkdownRenderer";
import { marginSales, summarizeMargins, marginPrompt, type MarginSummary as MarginSummaryData } from '../features/retail/marginAnalytics';
import { MarginSummary } from '../features/retail/MarginSummary';

export type PeriodType = "today" | "7days" | "month";
export type AIReportStatus = "idle" | "loading" | "streaming" | "done" | "error";

export interface AIReportPanelProps {
  shifts: Shift[];
  allSales: KioscoSale[];
  products: Product[];
  storeName: string;
  role?: Role | string;
  storeId?: string;
}

export interface PeriodCalculations {
  separation: MarginSummaryData;
  period: PeriodType;
  periodLabel: string;
  totalRevenue: number;
  totalSalesCount: number;
  averageTicket: number;
  totalUnitsSold: number;
  paymentDistribution: {
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  topProducts: {
    name: string;
    qty: number;
    subtotal: number;
  }[];
  shiftsCount: number;
  estimatedMargin?: {
    totalCost: number;
    profit: number;
    marginPercent: number;
  };
}

const SYSTEM_PROMPT =
  "Sos un consultor de negocios para kioscos y almacenes argentinos. " +
  "Analizás datos de ventas reales y brindás reportes ejecutivos concisos, " +
  "orientados a la acción. Usá números específicos del contexto. Evitá " +
  "generalidades. Tuteá al dueño del negocio.";

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
function filterSales(sales: KioscoSale[], period: PeriodType, now: Date): KioscoSale[] {
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
function filterShifts(shifts: Shift[], period: PeriodType, now: Date): Shift[] {
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
function calculateLocalMetrics(
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

/**
 * Builds the Groq prompt with real calculated numerical data
 */
function buildUserPrompt(storeName: string, m: PeriodCalculations): string {
  if (m.separation.totalTickets === 0) {
    return `Comercio: "${storeName || "Kiosco Express"}"
Período analizado: ${m.periodLabel}

No se registran ventas para este período (${m.periodLabel}).
Brindá un breve informe ejecutivo indicando que no hubo transacciones registradas en el período seleccionado, recomendá revisar si hay turnos de caja pendientes o ventas sin registrar, y brindá 3 sugerencias comerciales y operativas prácticas para impulsar las ventas.`;
  }

  const paymentLines =
    m.paymentDistribution.length > 0
      ? m.paymentDistribution
          .map(
            (p) =>
              `  • ${p.method}: $${p.amount.toLocaleString("es-AR")} (${p.percentage.toFixed(1)}% del total - ${p.count} ventas)`
          )
          .join("\n")
      : "  • Sin ventas registradas";

  const topProductLines =
    m.topProducts.length > 0
      ? m.topProducts
          .map(
            (p, idx) =>
              `  ${idx + 1}. ${p.name}: ${p.qty} unidades vendidas ($${p.subtotal.toLocaleString("es-AR")})`
          )
          .join("\n")
      : "  • No hay productos vendidos en este período";

  const marginSection = m.estimatedMargin
    ? `\n- Ganancia bruta estimada: $${Math.round(m.estimatedMargin.profit).toLocaleString("es-AR")} (Margen aproximado: ${m.estimatedMargin.marginPercent.toFixed(1)}%)`
    : "";

  const shiftsSection =
    m.shiftsCount > 0 ? `\n- Turnos de caja operados: ${m.shiftsCount} turnos` : "";

  return `Comercio: "${storeName || "Kiosco Express"}"
Período analizado: ${m.periodLabel}

MÉTRICAS LOCALES CALCULADAS:
- Facturación principal sin bajo margen: $${m.totalRevenue.toLocaleString("es-AR")}
- Cantidad de tickets / ventas: ${m.totalSalesCount}
- Ticket promedio: $${Math.round(m.averageTicket).toLocaleString("es-AR")}
- Unidades totales vendidas: ${m.totalUnitsSold} u.${marginSection}${shiftsSection}

DISTRIBUCIÓN POR MÉTODO DE PAGO:
${paymentLines}

TOP 5 PRODUCTOS MÁS VENDIDOS:
${topProductLines}

${marginPrompt(m.separation)}

INSTRUCCIONES DE RESPUESTA:
Respondé en formato Markdown estructurado con estas 4 secciones indispensables:

### 📈 Rendimiento Ejecutivo
(Párrafo ejecutivo conciso de rendimiento con números concretos analizados)

### 🧭 Tendencia Detectada
(Indicá claramente si la tendencia es Crecimiento, Estable o Caída, fundamentando con el ticket y las unidades)

### 💡 3 Recomendaciones de Negocio Específicas
1. **[Recomendación 1]**: (Acción concreta sobre stock o los productos del Top 5)
2. **[Recomendación 2]**: (Estrategia comercial o de medios de pago para aumentar ticket)
3. **[Recomendación 3]**: (Optimización operativa de turnos o reposición)

### 🔮 Proyección Próximo Período
(Proyección informal y realista para el siguiente período similar)`;
}

/**
 * Builds clean plain-text output for clipboard copying
 */
function buildClipboardReport(
  storeName: string,
  m: PeriodCalculations,
  narrativeText: string
): string {
  const paymentsText = m.paymentDistribution
    .map(
      (p) =>
        `  - ${p.method}: $${p.amount.toLocaleString("es-AR")} (${p.percentage.toFixed(1)}%)`
    )
    .join("\n");

  const productsText = m.topProducts
    .map(
      (p, i) =>
        `  ${i + 1}. ${p.name}: ${p.qty} un. ($${p.subtotal.toLocaleString("es-AR")})`
    )
    .join("\n");

  return `📊 REPORTE EJECUTIVO - ${storeName || "Kiosco Express"}
Período: ${m.periodLabel}
Fecha de emisión: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}

=== RESUMEN NUMÉRICO DEL PERÍODO ===
• Facturación real (sin bajo margen): $${m.totalRevenue.toLocaleString("es-AR")}
• Facturación bajo margen: $${m.separation.lowMargin.revenue.toLocaleString('es-AR')}
• Contribución del bajo margen a la ganancia bruta: ${m.separation.lowMarginContributionPercent === null ? 'No disponible' : m.separation.lowMarginContributionPercent.toFixed(1) + '%'}
• Ventas registradas: ${m.totalSalesCount}
• Ticket Promedio: $${Math.round(m.averageTicket).toLocaleString("es-AR")}
• Unidades vendidas: ${m.totalUnitsSold}
• Métodos de pago:
${paymentsText || "  - Sin datos"}
• Top 5 productos:
${productsText || "  - Sin datos"}

=== ANÁLISIS ESTRATÉGICO IA ===
${narrativeText}
`;
}

export function AIReportPanel({
  shifts = [],
  allSales = [],
  products = [],
  storeName = "Kiosco Express",
  role = "owner",
  storeId,
}: AIReportPanelProps) {
  const [period, setPeriod] = useState<PeriodType>("7days");
  const [status, setStatus] = useState<AIReportStatus>("idle");
  const [reportText, setReportText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [localSales, setLocalSales] = useState<KioscoSale[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Gating: Only visible/accessible for owner or admin
  const isAuthorized = !role || role === "owner" || role === "admin";

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Sync or fetch sales
  useEffect(() => {
    if (allSales && allSales.length > 0) {
      setLocalSales(allSales);
    } else if (storeId) {
      retail
        .allSales(storeId)
        .then((data) => {
          if (data && data.length > 0) setLocalSales(data);
        })
        .catch(() => {});
    }
  }, [allSales, storeId]);

  const activeSales = localSales.length > 0 ? localSales : allSales;

  // Filter sales and shifts based on current selected period
  const filteredSales = useMemo(() => {
    return filterSales(activeSales, period, new Date());
  }, [activeSales, period]);

  const filteredShifts = useMemo(() => {
    return filterShifts(shifts, period, new Date());
  }, [shifts, period]);

  // Local metric calculations (sin IA)
  const metrics = useMemo(() => {
    return calculateLocalMetrics(filteredSales, filteredShifts, products, period);
  }, [filteredSales, filteredShifts, products, period]);
  const metricsSignature = JSON.stringify(metrics);
  useEffect(() => {
    abortControllerRef.current?.abort();
    setStatus('idle'); setReportText(''); setErrorMessage('');
  }, [metricsSignature]);

  // Handle stream generation
  const handleGenerateReport = async () => {
    if (!isAuthorized) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setReportText("");
    setErrorMessage("");

    try {
      const userPrompt = buildUserPrompt(storeName, metrics);
      let started = false;

      await groqStream(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        (delta) => {
          if (controller.signal.aborted) return;
          if (!started) {
            started = true;
            setStatus("streaming");
          }
          setReportText((prev) => prev + delta);
        },
        {
          signal: controller.signal,
          temperature: 0.3,
          maxTokens: 1200,
        }
      );

      if (!controller.signal.aborted) setStatus("done");
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      setStatus("error");
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo conectar con Groq para generar el reporte.";
      setErrorMessage(msg);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setStatus("idle");
  };

  const handleCopyClipboard = async () => {
    if (!reportText) return;
    const textToCopy = buildClipboardReport(storeName, metrics, reportText);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div
      className="ai-report-panel-container ai-report-light"
      role="region"
      aria-label="Panel de reportes ejecutivos con IA"
    >
      {/* Header */}
      <div className="ai-report-header">
        <div className="ai-report-title-group">
          <div className="ai-report-badge">
            <Sparkles size={13} />
            <span>Explicación opcional con IA</span>
          </div>
          <h2 className="ai-report-title">
            <BarChart3 size={22} className="ai-report-kpi-icon" />
            <span>Reporte del Negocio</span>
          </h2>
          <p className="ai-report-subtitle">
            {storeName} · Diagnóstico y proyecciones basadas en datos reales
          </p>
        </div>

        {/* Period Selector */}
        <div
          className="ai-report-period-selector"
          role="radiogroup"
          aria-label="Seleccionar período"
        >
          <button
            type="button"
            className={`ai-report-period-btn ${period === "today" ? "active" : ""}`}
            onClick={() => {
              setPeriod("today");
              if (status === "done" || status === "error") setStatus("idle");
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`ai-report-period-btn ${period === "7days" ? "active" : ""}`}
            onClick={() => {
              setPeriod("7days");
              if (status === "done" || status === "error") setStatus("idle");
            }}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            className={`ai-report-period-btn ${period === "month" ? "active" : ""}`}
            onClick={() => {
              setPeriod("month");
              if (status === "done" || status === "error") setStatus("idle");
            }}
          >
            Este mes
          </button>
        </div>
      </div>

      <MarginSummary summary={metrics.separation} />
      {/* Numerical KPI Grid (Calculated locally, without IA) */}
      <div className="ai-report-kpi-grid">
        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Facturación sin bajo margen</span>
            <DollarSign size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value accent-green">
            ${metrics.totalRevenue.toLocaleString("es-AR")}
          </div>
          <p className="ai-report-kpi-sub">
            {metrics.totalSalesCount} transacciones en {metrics.periodLabel.toLowerCase()}
          </p>
        </div>

        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Ticket Promedio</span>
            <Receipt size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value">
            ${Math.round(metrics.averageTicket).toLocaleString("es-AR")}
          </div>
          <p className="ai-report-kpi-sub">Gasto promedio por cliente</p>
        </div>

        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Unidades Vendidas</span>
            <Package size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value">{metrics.totalUnitsSold}</div>
          <p className="ai-report-kpi-sub">
            {metrics.topProducts.length > 0
              ? `Líder: ${metrics.topProducts[0].name.slice(0, 18)}`
              : "Sin productos vendidos"}
          </p>
        </div>

        <div className="ai-report-kpi-card">
          <div className="ai-report-kpi-header">
            <span className="ai-report-kpi-label">Turnos Operados</span>
            <Calendar size={16} className="ai-report-kpi-icon" />
          </div>
          <div className="ai-report-kpi-value">
            {metrics.shiftsCount} {metrics.shiftsCount === 1 ? "turno" : "turnos"}
          </div>
          <p className="ai-report-kpi-sub">Historial de caja registrado</p>
        </div>
      </div>

      {/* Breakdown: Payments & Top Products (Calculated locally) */}
      <div className="ai-report-details-grid">
        {/* Payment Methods */}
        <div className="ai-report-section-box">
          <h3 className="ai-report-section-title">
            <CreditCard size={15} />
            <span>Distribución por Método de Pago</span>
          </h3>
          <div className="ai-report-payments-list">
            {metrics.paymentDistribution.length > 0 ? (
              metrics.paymentDistribution.map((p) => (
                <div key={p.method} className="ai-report-payment-row">
                  <span className="ai-report-payment-name">{p.method}</span>
                  <div className="ai-report-payment-stats">
                    <span className="ai-report-payment-amount">
                      ${p.amount.toLocaleString("es-AR")}
                    </span>
                    <span className="ai-report-payment-pct">
                      {p.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="ai-report-empty-data">
                No hay pagos registrados para este período.
              </p>
            )}
          </div>
        </div>

        {/* Top 5 Products */}
        <div className="ai-report-section-box">
          <h3 className="ai-report-section-title">
            <TrendingUp size={15} />
            <span>Top 5 Productos Vendidos</span>
          </h3>
          <div className="ai-report-products-list">
            {metrics.topProducts.length > 0 ? (
              metrics.topProducts.map((prod, idx) => (
                <div key={idx} className="ai-report-product-row">
                  <div className="ai-report-product-info">
                    <span className="ai-report-product-rank">{idx + 1}</span>
                    <span className="ai-report-product-name" title={prod.name}>
                      {prod.name}
                    </span>
                  </div>
                  <div className="ai-report-product-stats">
                    <span className="ai-report-product-qty">{prod.qty} u.</span>
                    <span className="ai-report-product-total">
                      ${prod.subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="ai-report-empty-data">
                No hay ventas de productos para este período.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="ai-report-action-bar">
        {isAuthorized ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleGenerateReport}
              disabled={status === "loading" || status === "streaming"}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={18} className="ai-report-loading-spinner" />
                  <span>Conectando con IA…</span>
                </>
              ) : status === "streaming" ? (
                <>
                  <Loader2 size={18} className="ai-report-loading-spinner" />
                  <span>Generando reporte en vivo…</span>
                </>
              ) : (
                <>
                  <BarChart3 size={18} />
                  <span>Explicar estos resultados</span>
                </>
              )}
            </button>

            {(status === "loading" || status === "streaming") && (
              <button
                type="button"
                className="ai-report-secondary-btn"
                onClick={handleCancel}
                title="Detener generación"
              >
                <XCircle size={16} />
                <span>Cancelar</span>
              </button>
            )}

            {status === "done" && (
              <button
                type="button"
                className="ai-report-secondary-btn"
                onClick={handleGenerateReport}
                title="Volver a generar el reporte"
              >
                <RefreshCw size={15} />
                <span>Regenerar</span>
              </button>
            )}
          </div>
        ) : (
          <div className="ai-report-role-notice">
            <Lock size={15} />
            <span>
              La generación de reportes ejecutivos con IA está reservada para
              administradores y dueños del comercio.
            </span>
          </div>
        )}
      </div>

      {/* AI Output / Status Section */}
      {status === "loading" && (
        <div className="ai-report-output-box">
          <div className="ai-report-loading-box">
            <Loader2 size={32} className="ai-report-loading-spinner" />
            <p>
              Analizando ventas de <strong>{metrics.periodLabel}</strong> y
              consultando con Groq IA…
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="ai-report-error-box" role="alert">
          <AlertCircle size={20} />
          <div className="ai-report-error-body">
            <strong>No se pudo generar el reporte ejecutivo</strong>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="ai-report-retry-btn"
              onClick={handleGenerateReport}
            >
              Reintentar generación
            </button>
          </div>
        </div>
      )}

      {(status === "streaming" || status === "done") && reportText && (
        <div
          className="ai-report-output-box"
          role="region"
          aria-label="Reporte narrativo IA"
        >
          <div className="ai-report-output-header">
            <div className="ai-report-output-title">
              <Sparkles size={16} style={{ color: "var(--tone-accent)" }} />
              <span>Análisis Estratégico · {metrics.periodLabel}</span>
              <span
                className={`badge-status ${status === "streaming" ? "streaming" : "done"}`}
              >
                {status === "streaming" ? "Streaming…" : "Completado"}
              </span>
            </div>

            <div className="ai-report-output-actions">
              <button
                type="button"
                className={`ai-report-copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopyClipboard}
                title="Copiar reporte completo como texto plano al portapapeles"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "¡Copiado!" : "Copiar reporte"}</span>
              </button>
            </div>
          </div>

          <AiMarkdownRenderer
            content={reportText}
            isStreaming={status === "streaming"}
          />
        </div>
      )}
    </div>
  );
}

export default AIReportPanel;
