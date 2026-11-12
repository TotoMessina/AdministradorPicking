import { marginSales, summarizeMargins, marginPrompt } from '../../features/retail/marginAnalytics';
import { detectAnomalies } from '../../services/anomalyDetectionService';
import { predictStockLevels } from '../../services/stockPredictionService';
import { analyzeCapital } from '../../services/capitalAnalysisService';
import { replenishmentService } from '../../services/replenishmentService';
import { hasComposition, inventorySaleUnits } from '../../services/productComposition';
import type { AIAssistantProps } from './aiAssistantProps';
import { compactStockPredictions, extractDate } from './aiAssistantMetrics';
import type { useAiAssistantState } from './useAiAssistantState';

/** Arma las instrucciones y el contexto que recibe la IA. */
export function useAiSystemPrompt(ctx: AIAssistantProps & ReturnType<typeof useAiAssistantState>) {
  const { store, products, shifts, role, ownerEmail, members, activeSales, activeMovements, analytics } = ctx;
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
   - "¿Cuál fue mi mejor día de caja del mes?": Usá 'mejorTurno'.
   - "¿Qué debería comprar esta semana?" / "¿De qué me voy a quedar sin stock esta semana?": Usá prediccionStock.criticos, agrupá por proveedor e indicá fecha estimada y unidades/bultos sugeridos; no recalcules ni generes pedidos.
   - "¿Qué producto tiene sobrestock?": Usá prediccionStock.sobrestock; capital es stock por costo, null si falta. Sin ventas observadas no prueba falta de demanda.
   - Predicción: resumen acotado de la muestra cargada, 14 días completos, última semana doble peso, ajuste por día y cobertura 10 días. Puede faltar historia. No es garantía; stock cero sigue en stockCritico.
6. TONO: Hablá en español rioplatense (porteño) profesional, natural y directo (usá vos, che, tenés, fijate, bárbaro). Sé claro, ejecutivo, analítico y enfocado en la rentabilidad y crecimiento del comercio. Nunca dejes oraciones o listas a medio terminar.
7. Si hay alertas operativas, mencionálas proactivamente cuando pregunten por el rendimiento del negocio o un turno. No acuses directamente a nadie, pero presentá los datos para que el dueño investigue. Son heurísticas locales sobre la muestra cargada, no pruebas de fraude. Conservá severidad, cifras y contexto; no transformes ventas sin detalle en carritos borrados comprobados ni ventas de madrugada en irregularidades con horario desconocido. Los movimientos cargados son contexto parcial; no vuelvas a descontarlos de expected_cash ni alteres métricas de margen. La ausencia de alertas no certifica que todo esté bien.

CONTEXTO_DEL_NEGOCIO (DATOS EN TIEMPO REAL):
${JSON.stringify(contextPayload)}`;
  };

  return { buildSystemPrompt };
}
