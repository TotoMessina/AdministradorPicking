# Propuesta de precios después de reponer desde una factura

En la revisión de artículos vinculados, un costo individual nuevo que supera en más del 2% al anterior muestra **⚠️ Subió X%**. Cambiar el producto, el costo o la presentación recalcula el aviso. Un costo anterior de cero muestra **Nuevo costo (antes $0)**, porque no permite calcular un porcentaje finito. Un aumento exactamente igual al 2% no dispara el aviso.

Después de aplicar la reposición, el analizador permanece abierto. **Ver propuesta de precios** aparece si se actualizaron costos de productos existentes con subas mayores al 2%. No incluye renglones omitidos, altas nuevas ni artículos donde se eligió **Solo Stock**. Si un producto aparece en varios renglones, se propone una sola vez con el último costo seleccionado para actualizar, el mismo que se guarda en la reposición.

El subpanel tiene controles propios, independientes de los cambios masivos de precios del catálogo:

- **Margen objetivo:** 30% inicial, calculado sobre la venta: `(precio − costo) / precio`.
- **Múltiplo de redondeo:** $50 inicial; siempre se redondea hacia arriba.
- **Precio sugerido:** `ceil((costo_nuevo / (1 − margen_objetivo)) / múltiplo) × múltiplo`.
- **∆ Margen:** margen con precio sugerido/costo nuevo menos el margen anterior a la factura, en puntos porcentuales. La columna de precio actual también muestra el margen que deja ese precio con el nuevo costo.

Se seleccionan inicialmente solo las sugerencias que aumentan el precio de venta. Es posible elegir individualmente las inferiores si se desea. Las sugerencias iguales al precio actual no requieren aplicación. Controles vacíos, márgenes negativos o mayores/iguales al 100%, múltiplos inválidos o importes fuera del rango permitido bloquean el guardado.

**Aplicar precios seleccionados** llama a `retail.bulkUpdatePrices`, muestra un toast y actualiza el catálogo. La reposición y la actualización de precios son acciones separadas: cerrar el analizador sin aplicar precios conserva la reposición y los precios anteriores. La actualización afecta el catálogo maestro; las listas derivadas por porcentaje usan ese valor, mientras los precios fijos de las listas conservan su configuración. No se modifica el flujo de `handleApplyBulkPriceChanges()`.

La IA se habilita con un control opcional y se consulta mediante **Sugerencia IA de redondeo**. Comenta las terminaciones comerciales, sin modificar la tabla ni aplicar cambios. Analiza hasta 50 productos pendientes por consulta. Cambiar los controles o los precios invalida el comentario anterior. Un error o una demora de Groq no bloquea la aplicación manual de los precios.

No requiere migración SQL ni nuevas variables de entorno. Usa la configuración existente de Groq y la función de actualización de precios ya instalada.

## Guía de Pruebas

1. Abrir `http://localhost:3001/` como administrador. Preparar un producto **Alfajor de prueba** con costo **$100** y precio **$150**.
2. Entrar a **Productos y stock → Analizador de facturas**. Cargar una factura o pegar texto desde **Ver / editar texto detectado** con una compra de ese producto a **$120 por unidad**. Confirmar el vínculo si corresponde.
3. Verificar el badge **⚠️ Subió 20%**. Seleccionar **Stock + Costo** y pulsar **Aplicar reposición**. El analizador debe permanecer abierto; el costo se actualiza a $120 y el precio sigue en $150.
4. Pulsar **Ver propuesta de precios**. Con margen 30% y múltiplo $50 debe sugerir **$200**: precio sin redondear $171,43; redondeo +$28,57. El margen anterior es 33,33%, el propuesto 40%, y el delta **+6,67 p.p.** El margen con costo nuevo y precio actual es 20%.
5. Cambiar el múltiplo a $10: debe sugerir **$180**. Volver a $50 y desmarcar el producto: el botón de aplicar debe quedar deshabilitado si no hay otros seleccionados. Seleccionarlo y aplicar: debe aparecer el toast y actualizarse a $200 en el catálogo, sin volver a sumar stock.
6. Usar margen 100%, borrar un control o poner múltiplo 0: no debe poder aplicar precios. Volver a valores válidos debe recuperar la propuesta.
7. En otra prueba, usar un producto con costo $100 y factura a $102: no debe marcar suba. Con $102,01 sí debe marcarla. Si se elige **Solo Stock**, no debe aparecer en el panel posterior de precios.
8. Probar un producto con precio actual $300, costo anterior $100 y costo nuevo $120: la propuesta $200 debe quedar inicialmente desmarcada y advertir **Menor al actual**. Se puede seleccionar explícitamente.
9. Habilitar **Consultar sugerencia IA** y pulsar **Sugerencia IA de redondeo**. La respuesta debe aparecer como comentario; los precios no deben cambiar hasta pulsar **Aplicar precios seleccionados**. Cambiar el margen o múltiplo debe limpiar el comentario anterior. Un fallo de Groq debe permitir aplicar igualmente.
10. Verificar un producto con bultos: el costo comparado y propuesto debe ser el costo individual, sin dividir dos veces. Repetir el producto en dos renglones debe generar una sola fila de precios usando el costo final actualizado.

Verificación técnica: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar build.
