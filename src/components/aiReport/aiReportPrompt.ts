import { marginPrompt } from '../../features/retail/marginAnalytics';
import type { PeriodCalculations } from './aiReportTypes';

// Textos que se mandan a la IA y el reporte que se copia.
export const SYSTEM_PROMPT =
  "Sos un consultor de negocios para kioscos y almacenes argentinos. " +
  "Analizás datos de ventas reales y brindás reportes ejecutivos concisos, " +
  "orientados a la acción. Usá números específicos del contexto. Evitá " +
  "generalidades. Tuteá al dueño del negocio.";
/**
 * Builds the Groq prompt with real calculated numerical data
 */
export function buildUserPrompt(storeName: string, m: PeriodCalculations): string {
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
export function buildClipboardReport(
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
