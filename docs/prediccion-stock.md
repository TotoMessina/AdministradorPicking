# Predicción local de quiebre de stock

Se agregó `src/services/stockPredictionService.ts`, con `StockPrediction`, `predictStockLevels(products, sales, options?)` y `groupPredictionsBySupplier(predictions)`. El servicio recibe datos ya cargados, no consulta Supabase/Groq, no modifica arreglos recibidos ni escribe pedidos o stock.

## Fechas, promedios y criterios

- Se incluyen productos activos con stock finito mayor que cero. Los productos agotados siguen en `stockCritico`; no se inventa una rotación para pedirlos.
- `options.asOf` fija la fecha de consulta. El asistente siempre pasa el instante actual. Para mantener el servicio puro, si se omite se toma la fecha de la última venta fechada recibida, no el reloj del equipo. Sin fechas ni ventas se devuelve rotación cero, plazo infinito y fecha vacía.
- La zona predeterminada es `America/Argentina/Buenos_Aires`, configurable con `timeZone`. Se usan los 14 días calendario completos anteriores a la fecha de consulta; hoy no entra porque puede estar incompleto. Se reconocen timestamps con zona, fechas ISO y fechas antiguas DD/MM/YYYY válidas.
- Los días sin ventas cargadas cuentan como cero. Si faltan datos históricos, eso puede subestimar la demanda: no equivale a haber comprobado que el comercio no vendió. La consulta del asistente puede estar limitada a 500 ventas o al turno seleccionado.
- `dailyAvgSales = (2 × unidades de los últimos 7 días + unidades de los 7 anteriores) / 21`. Este campo siempre conserva el promedio ponderado global, sin redondear antes de calcular.
- `weekdayAvg[0..6]` es el promedio de las dos ocurrencias de cada día en esa ventana, incluidos sus ceros. Si el promedio del día actual es positivo y difiere más del 20% del global, se usa como tasa de proyección; `weekdayThreshold` permite ajustar ese umbral relativo. Un cero de un solo día no convierte en infinita la cobertura de un producto que se vende otros días: en ese caso se conserva la tasa global.
- El plazo es `Math.round(stock / tasa de proyección)`; por eso puede diferir de `stock / dailyAvgSales` cuando se aplica el ajuste semanal. La fecha es ese número de días calendario después de la consulta. Si no hay rotación, `daysUntilStockout=Infinity` y `stockoutDate=''`: no existe una fecha ISO finita que mostrar.
- El pedido cubre `coverageDays` (10 por defecto): `max(0, tasa × cobertura − stock)`. Se redondea hacia arriba al siguiente bulto usando `unitsPerPack`; sin bulto se redondea a unidades enteras y `suggestedOrderPacks=null`. Un pack_size de 1 equivale a unidad suelta. No se vuelve a multiplicar la cantidad vendida por el tamaño del bulto: `qty` ya expresa la unidad de stock utilizada por la venta.
- Tendencia: semana reciente al menos 20% mayor → `accelerating`; al menos 20% menor → `decelerating`; dentro de esos límites → `stable`. Cero ventas anteriores y ventas recientes → acelerando, sin inventar un porcentaje infinito. Ambas semanas en cero → estable.
- Prioridad: plazo redondeado ≤2 → `critical`, ≤5 → `soon`; stock superior a 60 días de la tasa de proyección → `overstocked`; resto → `ok`. Sin ventas observadas y con stock positivo se clasifica como sobrestock potencial, sujeto a revisar la cobertura histórica.

Se deduplican ventas por ID, se ignoran cantidades inválidas/no positivas y ventas sin importe positivo. Los renglones se vinculan por productId; si falta, solo se admite coincidencia exacta normalizada con un único nombre de catálogo, excluyendo Varios/Producto manual. No hay coincidencias aproximadas ni atribuciones entre productos de nombre ambiguo.

La agrupación devuelve un Map por proveedor, con `Sin proveedor` para valores vacíos. No modifica las predicciones ni los datos del catálogo. Las sugerencias contemplan ventas de ambos grupos de margen porque se trata de unidades de stock; no se modifican las métricas comerciales ni su separación.

## Contexto del asistente

Se conserva el chip de compras y se agrega «¿De qué me voy a quedar sin stock esta semana?». El prompt incorpora `prediccionStock` con `criticos`, `sobrestock` y `tendenciasAlAlza`.

El servicio devuelve todas las predicciones. Solo el resumen enviado a Groq se limita: hasta 10 críticos/próximos, 5 sobrestocks y 5 tendencias, y un máximo conjunto de **1.200 bytes UTF-8 de JSON compacto**. Se alternan categorías para reservar representación de cada una; pueden entrar menos productos. Los nombres se abrevian a 48 caracteres y se conserva su ID. Se omiten las siete medias semanales y otros campos que no necesita esa respuesta. El resto del contexto también se serializa sin sangría, conservando los mismos datos.

Este presupuesto y las instrucciones breves buscan mantener la adición alrededor de 800 tokens o menos; es una cota por bytes del resumen, no una medición exacta del tokenizer de Groq. No se agregaron dependencias para contar tokens ni se realizó una petición para medirlos.

Para compras, el asistente debe agrupar por proveedor y mencionar fecha estimada, unidades y bultos. Para sobrestock, el capital informado es **stock actual × costo actual**, no el valor de venta ni una pérdida confirmada. Cuando falta un costo válido se envía null. Sin ventas observadas no se afirma que no exista demanda. Las sugerencias no crean órdenes ni cambian inventario.

## Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/** con un comercio de pruebas. Los casos numéricos también pueden revisarse manualmente en la consola del navegador de desarrollo con `await import('/src/services/stockPredictionService.ts')`, pasando arreglos en memoria y `{ asOf: '2026-10-20T15:00:00-03:00' }`. No generar ventas ficticias en producción para preparar el histórico.

1. **Consulta:** Ayuda → Consultar al asistente → análisis completo → nuevo chip. Esperado: sugerencias por proveedor con fechas y cantidades, aclarando la cobertura disponible; ninguna orden creada. Preguntar «¿Qué producto tiene sobrestock?»: mostrar capital al costo o indicar que falta ese dato.
2. **Rotación constante y packs:** producto activo con stock 20, pack_size 24 y 10 unidades vendidas cada día del 6 al 19 de octubre. Esperado: dailyAvgSales 10, todas las medias semanales 10, plazo 2, fecha 2026-10-22, critical y pedido de 96 unidades/4 bultos para cubrir 10 días. Sin pack_size: 80 unidades, packs null.
3. **Pesos y tendencia:** 7 unidades diarias en la semana anterior y 14 en la reciente. Esperado: `(2×98+49)/21 = 11,666…` diarias y accelerating. Con 12 frente a 10 diarias: accelerating en el límite +20%; con 8 frente a 10: decelerating. Las ventas de hoy no alteran estos promedios.
4. **Día semanal:** para consulta un martes, cargar 20 unidades en cada martes previo y 5 en cada uno de los otros días; usar stock 20. Esperado: media de martes 20, promedio global `100/14 ≈ 7,14`, proyección de 1 día y fecha 2026-10-21. Con `weekdayThreshold: 10`, se desactiva ese ajuste y se usa el promedio global.
5. **Cobertura y sobrestock:** repetir rotación 10 y stock 20 con coverageDays 3 y sin bulto: pedido 10. Con stock 601 y cobertura predeterminada: overstocked y pedido 0. A costo $100, capital del stock $60.100. Stock 600 no supera estrictamente los 60 días.
6. **Sin ventas y exclusiones:** producto activo con stock positivo sin ventas: Infinity, fecha vacía, pedido 0 y sobrestock potencial; el asistente debe aclarar que no hay ventas observadas. Un producto inactivo, con stock cero o negativo no aparece en las predicciones. Un día semanal en cero no debe anular la demanda de los otros días.
7. **Fechas y calidad:** ventas de hace 15 días, futuras o de hoy no entran. Una venta cerca de medianoche UTC debe asignarse al día correspondiente de Argentina. Repetir IDs no duplica cantidades; renglones manuales o nombres ambiguos no se atribuyen arbitrariamente a un producto. Las cantidades fraccionarias válidas se conservan en los promedios.
8. **Proveedor y tamaño:** llamar groupPredictionsBySupplier con varios proveedores y uno vacío: esperar grupos separados y Sin proveedor. En un catálogo grande, revisar el JSON del mensaje system: `prediccionStock` no supera 1.200 bytes compactos y sus listas respetan 10/5/5, aunque contengan menos filas por el presupuesto. No interpretar la lista reducida como inventario completo.
9. **Regresión:** consultar anomalías operativas y márgenes estándar/bajo margen: deben conservar sus datos y reglas. Bloquear Groq: el motor sigue invocable con datos en memoria, aunque el chat no pueda redactar. Ninguna predicción requiere conexión ni cambia stock, precios, carrito o sincronización.

Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas.

Quedan pendientes navegador, validación funcional de estos ejemplos, comportamiento con datos reales incompletos y tamaño efectivo en tokens del modelo. La estimación no contempla faltantes históricos, estacionalidad larga, plazos de entrega, pedidos en tránsito ni cambios de demanda no observados.
