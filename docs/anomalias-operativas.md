# Alertas operativas locales

`src/services/anomalyDetectionService.ts` exporta `AnomalyAlert` y `detectAnomalies(sales, shifts, movements, products, members?, options?)`. No realiza lecturas de red/almacenamiento ni modifica los datos recibidos. Las alertas no son pruebas de fraude ni atribuyen intención a una persona.

## Criterios implementados

| Detección | Criterio | Interpretación y límites |
| --- | --- | --- |
| Ventas vacías | Al menos 3 ventas con total exactamente cero o array de renglones vacío, y más del 5% del turno. | `warning`. Un detalle ilegible no se trata como array vacío. El backend normal impide ventas con total cero y no registra carritos descartados: no se puede medir ese comportamiento con estos datos. |
| Caída de efectivo | Ratio efectivo/(efectivo+QR) menor al 60% del promedio de ratios de turnos previos del mismo comercio. QR entre el 80% y 120% del promedio de importes QR por turno. | `warning`. Ventana de 30 días anteriores al inicio del turno, al menos 3 turnos históricos con pagos clasificables; solo compara turnos cerrados. No ajusta por duración ni inflación. El asistente excluye conservadoramente el primer turno potencialmente incompleto de la muestra. |
| Genéricos | Más de la mitad de los renglones de una venta son manuales, carecen de productId o se llaman Varios/Producto manual; más de 3 ventas así y más del 30% del turno. | `warning`. Cuenta renglones, no cantidades ni importe. Conserva la clasificación solicitada incluso en tickets antiguos sin IDs. |
| Faltantes | Al menos 3 cierres consecutivos más recientes del mismo operador y comercio, con promedio de faltante superior a $500. | `critical`. Revisa hasta 10 cierres por defecto. Un cierre sin diferencia, con sobrante o con saldo faltante/oculto corta la secuencia. Usa expected_cash persistido, sin recalcularlo con datos parciales ni restar nuevamente retiros. |
| Madrugada | Ventas positivas entre 02:00 inclusive y 06:00 exclusive, agrupadas por turno y fecha local. | `info` con horario desconocido, como ocurre en el modelo actual. `options.is24Hours=true` las suprime; false permite `warning`. No se agregó una configuración de horarios a la tienda. |
| Ráfagas | Más de 5 ventas positivas en hasta 120 segundos e importes dentro de ±10% del promedio y del importe inicial del grupo. | `warning`, categoría pattern. Cada ticket participa en una sola alerta de ráfaga. Una fila de clientes o productos de precio similar puede explicarlo. |

Los pagos mixtos usan sus partes reales; efectivo utiliza el importe de venta, no lo entregado antes del vuelto. Un mixto sin desglose válido impide usar ese turno en la comparación de efectivo. Transferencia, débito y crédito no se cuentan como QR.

Las ventas y movimientos se vinculan por `shift_id`; si no existe, solo se usa el rango temporal cuando identifica un único turno compatible con comercio, caja y operador disponibles. Los rangos son inicio inclusivo/cierre exclusivo. Un identificador explícito desconocido no se reemplaza por una suposición temporal. Se deduplican IDs. Las nuevas ventas online conservan los IDs ya devueltos por el backend y los registros offline agregan esos mismos metadatos, sin cambiar operaciones o cálculos. La RPC de movimientos sigue recibiendo el mismo comercio y turno; se adjuntan esos IDs al resultado autorizado.

Cada alerta incluye contexto de ingresos/retiros cargados para ese turno. Un valor cero en ese contexto no acredita que no haya movimientos: la muestra puede estar incompleta. El motor no accede a movimientos de otros usuarios ni amplía permisos. `members` solo permite mostrar el correo ya cargado del responsable del turno; no infiere autoría de una irregularidad.

Los IDs son hashes deterministas de categoría y contexto, para reconocer una alerta en sucesivas consultas. `detected_at` usa `options.asOf` si se proporciona; sin él toma el último evento cargado, evitando un reloj global dentro del servicio. La zona predeterminada es `America/Argentina/Buenos_Aires`. Se puede indicar `timeZone`, `recentClosures` y `salesCompleteSince` sin cambiar el contrato de los cinco argumentos originales.

## Integración y alcance

El análisis completo del asistente recibe miembros ya cargados y ejecuta el motor al construir el prompt de una consulta. Agrega hasta 10 alertas, ordenadas por severidad y recencia del turno, y el total detectado con sus límites. El chip «¿Detectaste algo sospechoso en los turnos?» inicia una consulta voluntaria. No se agregan peticiones generativas automáticas.

La cobertura actual puede ser de solo 500 ventas, 200 cierres y movimientos del turno seleccionado. Las secuencias y porcentajes describen esos datos, no certifican el histórico completo. El prompt anterior exigía afirmar cobertura del 100%; se corrigió esa instrucción sin cambiar métricas de margen ni su separación de bajo margen. Las alertas operativas abarcan ambos grupos porque examinan tickets y efectivo, no rentabilidad.

No se agregaron tablas, migraciones ni dependencias. No se ejecutaron escrituras de prueba ni se modificaron cálculos de caja, precios o stock.

## Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/**. Usar un comercio de pruebas; no generar ventas, faltantes ni movimientos ficticios en producción. El motor también se puede inspeccionar manualmente desde la consola del navegador de desarrollo, importándolo con `await import('/src/services/anomalyDetectionService.ts')` y pasando arreglos de datos en memoria, sin guardarlos en Supabase.

1. **Asistente:** como administrador, Ayuda → Consultar al asistente → análisis completo → chip de turnos sospechosos. Esperado: consulta voluntaria y explicación basada en evidencia, sin acusaciones. Si hay más de 10 alertas, el contexto incluye solo 10 priorizadas. Como cajero, no aparece el análisis administrativo ni se revelan diferencias reservadas.
2. **Ventas vacías, con datos en memoria:** pasar un turno con 50 ventas, 3 de ellas de total cero o items vacíos. Esperado: voidCount 3, totalSales 50, voidPercent 6 y warning. Con 60 ventas y solo 3 vacías, 5% exacto: sin alerta. No intentar guardar total cero en el backend para esta prueba.
3. **Efectivo/QR:** preparar 3 turnos históricos completos de los últimos 30 días, cada uno con $900 efectivo y $100 QR; un turno posterior cerrado con $40 efectivo y $100 QR. Esperado: ratio actual aproximadamente 0,29 frente a 0,90 y warning. Con QR $150, sin alerta porque no está estable. En la UI, incluir historia adicional anterior porque el turno más antiguo cargado puede estar parcialmente cubierto y se excluye. Repetir con pagos mixtos equivalentes: mismo resultado; sin desglose válido o con turno abierto, omitir la comparación.
4. **Genéricos:** 4 de 10 ventas con mayoría de renglones manuales. Esperado: 40% y warning. Solo 3 ventas genéricas, o exactamente 50% de renglones manuales en cada ticket: no cumplen el criterio correspondiente.
5. **Cierres:** mismo operador/comercio, últimos tres cierres con faltantes de $600, $700 y $800. Esperado: critical, promedio $700 y total $2100. Agregar un cierre posterior equilibrado o con expected_cash null: sin secuencia vigente. Agregar un retiro a los movimientos cargados: cambia la evidencia contextual, no vuelve a descontarlo del faltante persistido.
6. **Horarios:** una venta a las 03:00 de Argentina produce info porque no hay horario configurado; a las 06:00 no. Probar el servicio con is24Hours true: suprimir la alerta. Seis ventas de $1000 en dos minutos: una alerta de ráfaga, no seis alertas superpuestas. Cinco ventas o importes muy diferentes: sin alerta. Revisar el rango y los tickets indicados.
7. **Varias cajas y calidad de datos:** con dos turnos simultáneos, una venta sin IDs suficientes no debe atribuirse arbitrariamente. Con shift_id válido, sí. Una venta o movimiento de otro comercio no debe entrar por un rango horario incompatible. Repetir IDs en los arreglos: no duplicar conteos. Las fechas inválidas no deben generar horarios inventados.
8. **Regresiones/offline:** preparar configuración con conexión, vender offline y sincronizar. Esperado: conservar pago, importe, stock y cola existentes; los metadatos de turno siguen disponibles. Consultar márgenes estándar y bajo margen: mismos cálculos y separación. Bloquear Groq: el motor local sigue siendo invocable con sus datos, aunque el chat no pueda redactar una respuesta.

Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas.

Pendientes: ejecución manual de estos casos, navegador, backend, permisos efectivos, móvil y sincronización. La revisión de código no demuestra precisión de las heurísticas: conviene contrastar alertas con turnos reales revisados por el dueño antes de sacar conclusiones sobre personas.
