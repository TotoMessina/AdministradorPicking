# Semáforo de capital inmovilizado

## Alcance y persistencia

Aplicar localmente preparada `supabase/migrations/202610200003_product_expiry.sql` en el entorno correspondiente antes de desplegar el cliente. Agrega únicamente `expiry_date date` y `last_restocked_at timestamptz`, ambas opcionales, sin cambiar permisos, RLS, RPC ni datos existentes. No se aplicó a una base remota. Revisar el historial del entorno antes de aplicar; no ejecutar otras migraciones pendientes indiscriminadamente.

Productos permite cargar, editar o quitar el vencimiento debajo del costo. Una edición de precio desde un llamador que omite estos campos no los borra. El formulario no reenvía una fecha de reposición vieja al guardar. Los SELECT existentes incluyen las columnas nuevas mediante `select('*')` y el mapeo las conserva en el producto y su caché.

`last_restocked_at` se admite en altas/ediciones por API y en reposiciones directas con una cantidad positiva explícita. Las operaciones habituales pueden pasar por la cola offline y la RPC existente de stock, que no se modifica en esta tarea: no se garantiza que todas las reposiciones actualicen esa columna. El análisis usa también el historial local del comercio (hasta 200 registros), tomando la fecha más reciente disponible. Ese respaldo no se comparte entre dispositivos y puede contener operaciones pendientes. Cuando no hay evidencia, `daysSinceRestock` queda en null. Completar la captura compartida de todos los flujos de reposición requeriría ampliar las RPC en otra migración; no se simula con fechas de lectura o sincronización.

## Criterios

`analyzeCapital` opera sobre los productos, ventas y reposiciones entregados, sin llamadas de red ni lecturas de almacenamiento. Admite `asOf` para fijar el instante de análisis; por defecto usa el actual. Los días usan el calendario de Argentina. Fechas inválidas/futuras, ventas de total no positivo e ítems sin cantidad positiva se excluyen. Solo se vincula por `productId`, nunca por nombres que podrían coincidir con otro artículo o importe manual.

Se incluyen productos activos con stock y costo finitos, positivos. El capital es costo por stock, redondeado a centavos. Las clases por días desde la última venta observada son fast (0–7), medium (8–21), slow (22–45) y dead (más de 45). Si no se observa una venta, la fecha queda null y se clasifica dead para revisión: no acredita que nunca se vendió ni que tuvo 45 días sin movimiento. Un producto recién incorporado también puede entrar en ese grupo; el asistente debe aclararlo y considerar la fecha de reposición disponible.

| Condición | Acción sugerida | Semáforo |
| --- | --- | --- |
| dead, capital mayor a $5000 | Liquidación, precio por definir revisando costo/margen | Rojo |
| dead, capital hasta $5000 | Rebaja 30 % | Rojo |
| slow, vencimiento entre hoy y 15 días | 2x1 | Rojo |
| slow, sin vencimiento próximo conocido | Descuento 20 % | Amarillo |
| medium, vencimiento entre hoy y 30 días | Combo | Amarillo |
| Resto | Ninguna | Verde |
| Fecha de vencimiento anterior a hoy | Revisar y retirar de venta, sin promoción | Rojo |

Los descuentos muestran el precio sugerido redondeado al peso, sin guardarlo. Liquidación no inventa un porcentaje. No se controla margen mínimo automáticamente: las propuestas requieren revisión, especialmente en artículos de bajo margen. Se conserva su separación en las métricas existentes. La excepción de vencidos evita recomendar ventas de mercadería vencida; no modifica su stock ni bloquea la venta desde este servicio.

Es un indicador de recencia según la matriz solicitada, no un modelo de unidades vendidas respecto al stock. La matriz no alerta por vencimiento próximo de un producto fast. Una fecha por producto tampoco representa lotes: cargar el próximo vencimiento relevante y revisar al reponer.

El asistente incorpora hasta 8 rojos y 5 amarillos, ordenados por urgencia y capital. Los totales se calculan sobre todos los resultados, no sobre esos 13. Capital inmovilizado suma rojos y amarillos; el denominador valora la misma población completa, incluidos verdes. Si no hay stock valorizado, el porcentaje es null. El historial del asistente puede limitarse a 500 ventas; la respuesta debe expresar esa cobertura, no asegurar un diagnóstico de toda la base. El nuevo chip consulta voluntariamente estos datos; no se generan promociones ni peticiones de IA automáticamente.

## Guía de Pruebas — pendiente de ejecución manual

En **http://localhost:3001/**, con administrador y un comercio de pruebas tras aplicar la migración:

1. **Producto:** agregar uno con costo, stock y vencimiento; guardar y recargar. Debe conservar la fecha. Editar solo precio y confirmar que fecha, bulto, margen y atributos se mantengan. Quitar la fecha, guardar y recargar: debe quedar vacía sin impedir el análisis.
2. **Matriz:** usar datos de prueba con últimas ventas a 7/8, 21/22 y 45/46 días. Esperado: fast/medium, medium/slow y slow/dead respectivamente. Para dead comparar capital $5000 y $5001: rebaja 30 % y liquidación. Con precio $140 la rebaja 30 % muestra $98.
3. **Vencimiento:** para slow usar fechas a 15 y 16 días: 2x1 rojo y descuento 20 % amarillo. Para medium, a 30 y 31 días: combo amarillo y ninguna verde. Fecha de ayer: rojo, revisar y retirar, sin promoción. Sin fecha: `daysToExpiry=null`, sin comparación accidental como si fuera cero.
4. **Asistente:** abrir el análisis completo y pulsar «¿Tengo mercadería clavada o por vencer?». Debe presentar promociones propuestas y el porcentaje de capital parado, sin afirmar cambios aplicados. Con más de 8 rojos/5 amarillos, los totales deben incluir también los omitidos de la lista. Un catálogo sin stock valorizado no debe producir NaN, Infinity ni un porcentaje inventado.
5. **Identidad e historia:** comprobar dos productos con igual nombre e IDs distintos y una venta manual con ese nombre. Solo el ID vendido recibe última venta. Un producto sin ventas observadas debe conservar fecha null; la respuesta debe reconocer la muestra incompleta y evitar asegurar 45 días sin venta.
6. **Reposiciones:** reponer unidades/bultos y comprobar la fecha disponible en el historial local. Una modificación de costo sin ingreso no cuenta como reposición. Otro dispositivo solo puede usar la columna persistida y su propio historial; si faltan ambas fuentes, debe mostrar desconocido, sin inventar antigüedad.
7. **Permisos y conexión:** cajero no gana permisos de edición por agregar columnas. Confirmar RLS real desde cuentas autorizadas y no autorizadas. Sin conexión, la configuración sigue requiriendo red y la venta preparada conserva su flujo habitual; la consulta conversacional necesita Groq. Probar un backend sin migración: guardar el campo debe mostrar el mensaje de migración faltante, sin fingir éxito.

No se realizaron verificaciones de navegador, Groq, SQL/RLS, dispositivo móvil ni sincronización entre dispositivos. No generar ventas ni reposiciones ficticias en producción.

Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, salida 0. No se ejecutaron builds ni otras pruebas automatizadas. No se aplicaron migraciones remotas.
