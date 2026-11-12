import { groqChat } from '../../../services/groqService';
import { money } from './money';
import type { cashDeskProps } from './useCashDesk';
import type { useCashDeskState } from './useCashDeskState';

/** Análisis del turno con IA. */
export function useCashDeskAi(ctx: ReturnType<typeof cashDeskProps> & ReturnType<typeof useCashDeskState>) {
  const {
    shift, sales, movements, cashierMode, counted, setAiAnalysis, isAiLoading, setIsAiLoading,
    setAiError, aiController, cash, electronic, expected,
  } = ctx;
  const handleAnalyzeShift = async () => {
    if (cashierMode || !shift || isAiLoading) return;
    const controller = new AbortController();
    aiController.current = controller;
    setIsAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);

    try {
      // 1. Calculate top selling product(s) from sales[].items
      const productMap = new Map<string, { name: string; qty: number; subtotal: number }>();
      for (const sale of sales) {
        for (const item of sale.items || []) {
          const key = item.productId || item.name;
          const curr = productMap.get(key) || { name: item.name, qty: 0, subtotal: 0 };
          curr.qty += item.qty;
          curr.subtotal += item.subtotal;
          productMap.set(key, curr);
        }
      }
      const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
      const topProduct = sortedProducts[0]
        ? `${sortedProducts[0].name} (${sortedProducts[0].qty} u., ${money(sortedProducts[0].subtotal)})`
        : "Sin productos vendidos desde que abriste la caja";

      // 2. Dominant payment method
      const methodTotals: Record<string, { count: number; total: number }> = {};
      let grandTotal = 0;
      for (const sale of sales) {
        const m = sale.paymentMethod || "Efectivo";
        if (!methodTotals[m]) methodTotals[m] = { count: 0, total: 0 };
        methodTotals[m].count += 1;
        methodTotals[m].total += sale.total;
        grandTotal += sale.total;
      }
      const sortedMethods = Object.entries(methodTotals).sort((a, b) => b[1].total - a[1].total);
      const dominantMethod = sortedMethods[0]
        ? `${sortedMethods[0][0]} (${money(sortedMethods[0][1].total)}, ${Math.round((sortedMethods[0][1].total / (grandTotal || 1)) * 100)}% del total)`
        : "Sin ventas registradas";

      // 3. Difference evaluation
      const countedValue = counted !== "" ? Number(counted) : null;
      let diffEval = "Conteo físico aún no ingresado";
      if (countedValue !== null) {
        const diff = countedValue - expected;
        if (diff === 0) {
          diffEval = "Caja exacta ($0 de diferencia)";
        } else if (diff > 0) {
          diffEval = `Diferencia positiva / sobrante de ${money(diff)}`;
        } else {
          diffEval = `Diferencia negativa / faltante de ${money(Math.abs(diff))}`;
        }
      }

      // 4. Movements summary
      const movementsSummary = movements.length
        ? movements.map((m) => `${m.type}: ${money(Number(m.amount))} (${m.reason})`).join("; ")
        : "Sin movimientos manuales";

      const systemPrompt =
        "Sos un analista de negocio para kioscos argentinos. Analizás el " +
        "cierre de turno y brindás insights accionables. Sé conciso, práctico " +
        "y usá formato simple (sin markdown complejo). Hablá en primera persona " +
        "del plural (nosotros/nuestro negocio).";

      const userPrompt = `Analizá los siguientes datos de nuestro cierre de turno:
- Fondo inicial de caja: ${money(shift?.opening_cash || 0)}
- Ventas en efectivo: ${money(cash)}
- Ventas electrónicas (QR / tarjetas): ${money(electronic)}
- Facturación total del turno: ${money(grandTotal)} (${sales.length} ventas)
- Movimientos manuales: ${movementsSummary}
- Efectivo esperado en caja: ${money(expected)}
- Efectivo contado físicamente: ${countedValue !== null ? money(countedValue) : "No ingresado aún"}
- Evaluación de diferencia: ${diffEval}
- Producto más vendido: ${topProduct}
- Método dominante: ${dominantMethod}
- Otros productos destacados: ${sortedProducts.slice(1, 5).map((p) => `${p.name} (${p.qty}u)`).join(", ") || "Ninguno"}

Respondé obligatoriamente respetando exactamente este formato:
RESUMEN: [2 oraciones]
PRODUCTO ESTRELLA: [nombre y cantidad]
MÉTODO DOMINANTE: [método y porcentaje]
DIFERENCIA DE CAJA: [evaluación]
SUGERENCIAS: 1. [...] 2. [...] 3. [...]`;

      const response = await groqChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], { signal: controller.signal });

      if (!controller.signal.aborted) setAiAnalysis(response);
    } catch (err) {
      if (controller.signal.aborted) return;
      setAiError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el análisis de la caja."
      );
    } finally {
      if (!controller.signal.aborted) setIsAiLoading(false);
    }
  };

  return { handleAnalyzeShift };
}
