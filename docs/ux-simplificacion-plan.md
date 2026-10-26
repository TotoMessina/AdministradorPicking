# Plan de simplificación de uso — estado vigente

Actualizado el 26/10/2026. Referencia de decisiones actuales, sin el historial de prompts y entregas anteriores. [Índice general](../README.md). La revisión de código no equivale a evaluación visual ni prueba de usabilidad con personas.

## Objetivo y criterios

Menos decisiones e información simultánea, manteniendo funciones, paleta y permisos reales. Cada tarea tiene un acceso principal claro. No agregar un modo simple/avanzado obligatorio, editores duplicados ni menús de botones que llevan a otro menú equivalente.

Caja es puesto de cobro; turno es período de trabajo con apertura/cierre; registro de ventas es una agrupación independiente del estado fiscal. Vender, guardar producto, registrar movimiento y cerrar turno no requieren IA.

## Accesos definitivos

| Tarea | Ubicación principal | Criterio vigente |
| --- | --- | --- |
| Vender | Vender | Búsqueda/lector y productos; carrito; total y cobro. Cobrar tiene prioridad con venta válida. |
| Comenzar sin turno | Vender → Abrir turno | Llegada directa a la caja correspondiente con contexto; confirmar efectivo, sin apertura automática. |
| Operar caja | Caja → Mi turno | Resumen visible; formulario directo con pestañas de movimiento/cierre. Actividad en un único panel de Movimientos, Ventas y Cierres, adaptable al ancho disponible. |
| Consultar ventas | Caja → Ver ventas / resumen permitido | Solo datos autorizados; cajero/supervisor conserva privacidad y arqueo a ciegas. |
| Productos | Productos → Catálogo y stock | Búsqueda/listado y Agregar producto. Editar y Reponer en cada fila. Formulario principal al crear/editar. |
| Atributos avanzados | Producto → Más opciones | Descubribles y conservados al editar precio. Errores plegados deben revelar y enfocar el campo. |
| Insumos y combos | Producto → Uso; Crear combo o paquete; Combo / sueltos | Alta de combo en un solo formulario con componentes visibles y guardado atómico; insumos sin precio, costo calculado y stock físico en componentes. |
| Depósito opcional | Mi comercio → Más opciones → Usar depósito; Productos → Reponer | Apagado de inicio. Salón/depósito compartidos por comercio, sin decisiones al cobrar ni stock duplicado. Recibir o mover desde el formulario existente; historial a pedido. |
| Listas | Productos → Listas de precios | Editor único; los accesos de configuración llevan al mismo destino. Respeta sucursal y carrito. |
| Comercio | Mi comercio | Datos del comercio, Locales y cajas, Personas con acceso, Más opciones. Separación actual con presentación sobria. |
| Categorías y registros | Mi comercio → Más opciones | Categorías canónicas con nombre visible personalizable; registros con reglas por pago y cambios auditados. |
| Equipo y perfiles | Mi comercio → Personas con acceso | Agregar persona y perfiles editables según permisos; no obligatorio en comercio unipersonal. |
| Inicio guiado | Mi comercio → Retomar pendientes | Tres pasos: comercio, productos, apertura. Solo altas nuevas elegibles; estado compartido en backend. |
| Asistente general | Ayuda → Consultar al asistente | Acceso secundario y voluntario; análisis completo según permisos, sin entradas generales redundantes. |
| Facturas/remitos | Productos → Más herramientas / Remitos pendientes; Remito autorizado | OCR, memoria, vínculos y propuestas siguen en sus tareas, sin conversación obligatoria. |
| Transferencias | Productos → Transferencias | Acceso con permiso; constancia interna, no cambio del stock global. |
| PWA y avisos | Mi comercio → Más opciones → App y avisos | Instalación y permisos por intención. Un aviso abre la sección aunque esté plegada, protegiendo el carrito. |

Los perfiles delegados ven las áreas autorizadas, sin simular administración con estilos ni cambiar asignaciones operativas por ver metadatos de locales.

## Antes / después verificable por recorrido

Comparación cualitativa deducida de implementaciones e instrucciones anteriores. No representa mediciones de tiempo, clics ni facilidad observada.

| Caso | Antes de la simplificación correspondiente | Recorrido vigente a verificar |
| --- | --- | --- |
| Empezar a vender | Textos de caja/turno mezclados y navegación intermedia | Vender → Abrir turno → efectivo → Abrir turno → Vender. |
| Alta de producto | Atributos y ayudas competían; revisión IA podía interponerse | Agregar producto → datos básicos → Guardar; Más opciones y revisión voluntarias. |
| Editar precio | Riesgo de competir con atributos y formularios extensos | Editar precio o precio en Editar → Guardar, conservando los demás atributos. |
| Crear pancho | Precio ficticio de ingredientes, costo manual y alta seguida de otra pantalla de componentes | Insumos con costo/stock → nombre/precio/componentes juntos, con costo calculado → Guardar combo. |
| Comercio de una caja | Formularios de varios registros abiertos y accesos repetidos | Resumen de local/caja → Administrar solo por intención, sin perder acceso al segundo local. |
| Cierre | El análisis podía retrasar la confirmación | Conteo → confirmaciones existentes → cierre guardado; resumen IA con estado/reintento independiente. |
| Inicio de comercio | Configuración dispersa y riesgo de duplicar recursos | Confirmar recursos creados → primer producto/omitir → apertura real/continuar turno válido. |
| Documentación/SQL | Prompts y guías duplicadas, instalación por archivos sueltos | Guías por tema y schema consolidado con historial; baseline explícitamente confirmado. |

## Mi turno: operación directa y consulta adaptable

Se reemplazan los cuatro desplegables de resumen, ventas, movimientos e historial por un resumen visible y una única zona de actividad con pestañas. Registrar movimiento se muestra directamente al operar; Cerrar turno cambia al formulario de conteo sin un paso intermedio ni enlace de volver a acciones. Ingreso/Retiro usa botones con estado visible, manteniendo categoría y comprobante cuando corresponden.

Con espacio suficiente, operación y consulta se distribuyen en dos columnas; con menos ancho, quedan apiladas. Las tablas se presentan como fichas etiquetadas cuando el panel es angosto, incluso en escritorio. Apertura y conteo mantienen botones en el flujo de la página, sin barras fijas que cubran campos con teclado virtual. Se conservan borradores al alternar tareas, arqueo a ciegas, confirmaciones, privacidad y análisis IA voluntario. Actualizar cajas/saldo y Volver a Vender ante un carrito pendiente son accesos directos al flujo existente.

Cambios en CashDesk, CashMovementForm y estilos acotados a Mi turno. Sin cambios de SQL, cálculos ni permisos. Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0), también después del ajuste que preserva el adjunto al volver a pulsar el tipo ya seleccionado. No se ejecutaron builds ni otras pruebas automatizadas. Verificación visual, móvil, foco/lector de pantalla y recorridos reales pendientes; no se evaluó la interfaz en navegador ni con personas durante este ajuste.

Ampliación posterior del cierre: muestra tickets de todos los medios y permite detallar billetes por intención, sin obligación ni cambio automático del contado. El desglose puede ser parcial y se recupera desde Ver cierre. La migración local `202610240001_shift_closing_details.sql`, incluida en schema sin avanzar el baseline, persiste desglose y cantidad definitiva de tickets; mantiene arqueo a ciegas, fórmula de saldo y recibos offline. SQL todavía sin aplicar; pruebas manuales en [Mi turno](operacion-y-mercaderia.md#mi-turno), incluidos segundo dispositivo y PWA. Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0), después de incorporar la etiqueta del nuevo cierre en operaciones pendientes y el ajuste del mensaje de historial. Sin builds ni otras pruebas automatizadas; sin validación en navegador, backend o dispositivos. TypeScript no valida SQL ni el service worker.

## Campos numéricos legibles

Importes, cantidades, stock y porcentajes comparten `NumberInput`: al escribir `1000` se ve `1.000`; `1234567` se ve `1.234.567`. Los decimales se muestran con coma (`1.234,50`), sin redondear ni agregar decimales obligatorios. Incluye Vender/carrito, apertura/movimientos/cierre y billetes, catálogo/reposición, composición/sueltos, listas, transferencias, remitos, facturas y los dos controles de propuestas de precios; estos últimos solo cambian de campo visual, sin modificar el servicio de cálculo. Códigos, teléfonos y otros identificadores conservan su texto.

El control conserva la posición del cursor al agrupar, permite selección/borrado/pegado y entrega el valor canónico sin agrupación a los manejadores y a FormData. El foco, etiquetas, Enter/F1–F4 y validación visible permanecen en el campo que se edita. Conserva mínimos, máximos, incrementos, campos opcionales y reset de formularios; no agrega listeners globales ni requiere SQL. El carrito amplía el ancho de la cantidad según sus cifras. El pegado acepta formato argentino y decimales sin agrupación como `1234.50`; no interpreta formatos mezclados como `1,234.50`. Para tres decimales usar coma (`1,234`); `1.234` identifica mil doscientos treinta y cuatro.

Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0), también después de ajustar el pegado y preservar la invalidación de sugerencias al editar números. No se ejecutaron builds ni otras pruebas automatizadas. Escritura, selección, foco, teclado móvil, persistencia y operación offline quedan pendientes de validación manual; no se evaluaron en navegador ni contra backend.

Guía de Pruebas pendiente en **http://localhost:3001/**, con datos de prueba:

1. Producto: precio `1234567,50`, costo `1000,25` y stock `1234` → `1.234.567,50`, `1.000,25` y `1.234`. Guardar/volver a editar: mismos valores numéricos y atributos, sin convertir mil en uno.
2. Editar en el medio, seleccionar todo, borrar junto al punto y pegar `1.234.567,50` o `1234.50` → mantiene posición y decimales; pegar texto inválido no cambia el valor. Códigos con ceros iniciales no reciben separadores.
3. Apertura y movimiento `10000,50` → `10.000,50`, guardado por el importe correcto; después del movimiento el formulario se limpia. Listas: probar ajuste negativo permitido y precio fijo opcional vacío, sin cambios de reglas.
4. Vender: efectivo recibido/importe manual/pago mixto con miles → total y vuelto correctos, Enter y F1–F4 conservados. Cantidad `1000` con stock suficiente → `1.000` y mil unidades, sin perder foco del lector.
5. Cierre y billetes: cantidad `1000` de billetes de $10 → `1.000` y subtotal $10.000. Cantidades fraccionarias/negativas, máximos y campos obligatorios siguen mostrando errores en el control visible; desactivar detalle no valida sus campos ocultos.
6. Reposición por bultos, composición, remitos, transferencias y propuestas: verificar que los separadores no cambien cantidades, conversiones, porcentajes ni redondeos existentes. Probar teclado móvil, flechas, navegar/volver con borradores y venta offline preparada; no se realizaron estas comprobaciones manuales.

## Depósito sin complejidad obligatoria

Se agrega una única opción de activación por comercio, sin pasos nuevos en onboarding ni alta básica. Sin depósito, Reponer conserva la reposición habitual. Con depósito, la misma acción permite Reponer salón, Recibir mercadería (destino visible) o Guardar en depósito. Se conservan cantidad/bultos, borradores y permisos; costo/proveedor/referencia solo intervienen al recibir. El catálogo muestra total/desglose y Vender usa salón, sin selector adicional. Los componentes también se descuentan de salón; no se crea stock físico de combos. No se modifica el total al trasladar, los precios o el capital valorizado.

El depósito y salón siguen siendo compartidos entre locales, no inventario por sucursal; Transferencias conserva su registro anterior. CSV/facturas/remitos continúan ingresando en salón y se informa en Más herramientas. Desactivar requiere vaciar depósito explícitamente y conserva historia; activar no distribuye existencias ni crea duplicados. Los traslados/ingresos a depósito y configuración necesitan conexión y cola vacía. Venta offline preparada conserva la cola existente y el conflicto si cambió la disponibilidad; no se toma automáticamente mercadería guardada.

SQL local `202610260001_optional_depot.sql`, incluido en schema con baseline fijo, sin aplicar remotamente. Guía manual y límites en [Productos y stock](productos-y-stock.md#deposito-opcional). Comprobación final ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0), también tras integrar el alta directa de combos. Sin builds ni otras pruebas automatizadas. Pendientes: ejecución SQL/RLS/RPC en entorno de prueba, concurrencia, respuesta perdida, navegador, foco/teclado móvil, PWA y segundo dispositivo. No se realizaron esas pruebas ni una evaluación con personas.

## Alta directa de combos

Crear combo o paquete deja de reutilizar el alta normal seguida de una segunda pantalla. Abre un formulario específico con datos básicos, componentes, costo calculado y disponibilidad de salón. Guardar combo crea producto y composición en una transacción, con recibo de reintento y permisos efectivos; un error/cancelación no deja productos parciales. La edición de recetas reutiliza los mismos campos y conserva el acceso a sueltos. Más atributos permanecen en Editar, sin pedir costo o stock propio al crear el combo.

SQL local `202610260002_create_composite_product.sql` incluido en schema, sin aplicación remota. Recorridos manuales pendientes en [Productos y stock](productos-y-stock.md#combos-y-cigarrillos): acceso directo, costo/disponibilidad, cancelar, reintentar, permisos, navegación móvil y edición de composiciones existentes. No se probaron en navegador/backend ni con personas.

Comprobación final ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). Schema regenerado localmente con 33 migraciones, baseline sin cambios; no se ejecutó SQL remoto, builds ni otras pruebas automatizadas. TypeScript no valida las funciones SQL, RLS ni la apariencia.

## Límites que deben conservarse

- Carrito y contexto protegidos al cambiar sucursal/lista/registro; no redirigir ventas en curso silenciosamente.
- Borradores y operaciones montadas al navegar; cancelar descarta solo el editor elegido. Formularios ocultos sin foco/validación/listeners activos que interfieran con Vender.
- Un único contexto compacto de sucursal, caja y turno; asignaciones no editables como contexto, no selector aparente. Una única opción válida no exige elección.
- Lector, F1–F4, pagos mixtos, importe manual, botonera, stock compartido, bultos, recetas, remitos, transferencias y comprobantes privados.
- En móvil, teclado virtual y áreas seguras sin cubrir Cobrar/Guardar; movimiento reducido respetado. IA, instalación y avisos no se superponen a acciones principales.
- Configuración nueva requiere conexión cuando depende del backend. La venta offline preparada conserva cola, IDs y validación al sincronizar; no inventar una resolución de conflictos.

## Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, usando datos de prueba y schema confirmado:

1. **Administrador nuevo:** crear comercio → confirmar datos → primer producto → efectivo inicial → abrir turno. Esperado: reutiliza local/caja y queda listo para vender; omitir/retomar y recargar recupera avance guardado, sin tareas ficticias ni aperturas duplicadas. Repetir en otro dispositivo y con fallo de red.
2. **Cajero asignado:** ingresar → abrir turno → escanear → F1/F2/F3 → pago mixto con F4 → retiro → cierre. Esperado: foco de lector, importes correctos, retiro separado, confirmación persistida y arqueo a ciegas; sin datos ajenos ni permisos ausentes.
3. **Administrador existente:** editar precio de producto con atributos avanzados → guardar → reponer 2 bultos de 24 → revisar remito → consultar ventas. Esperado: atributos conservados, +48 unidades una vez, aprobación explícita y reportes con separación de margen intacta.
4. **Sucursales:** con carrito cargado intentar cambiar local; luego usar el flujo de confirmación existente. Esperado: no cambia el pedido silenciosamente; nueva sucursal aplica su lista/cajas válidas. Probar caja ocupada por otra persona, listas y transferencias con permisos.
5. **Productos/comercio:** crear, editar, guardar y cancelar; provocar error en Más opciones; alternar editores. Esperado: campos visibles/foco correcto, borradores conservados y sin validaciones invisibles. Revisar uno y varios locales, perfiles y categorías.
6. **PWA móvil:** teclado abierto en venta/reposición, botones principales, navegación atrás, formularios, asistente abierto/cerrado, avisos y movimiento reducido. Esperado: acciones alcanzables y contexto conservado. Tocar aviso con carrito: protege venta y abre sección correcta cuando corresponda.
7. **Offline preparado:** en PWA publicada preparada, vender, retirar y cerrar sin red; reconectar. Esperado: conserva operaciones y sincroniza sin duplicar. Herramientas con red explican el requisito sin bloquear caja; conflictos mantienen los pendientes. Localhost de desarrollo no certifica recarga offline de la PWA publicada.

## Evidencia y pendientes reales

La consolidación previa generó el archivo SQL y reorganizó documentos sin cambiar la app. El ajuste posterior de Mi turno modifica presentación y navegación en CashDesk/CashMovementForm con estilos propios, sin migraciones ni cambios de cálculos. No se aplicó SQL remoto ni se probaron navegador, móvil o backend. La comprobación TypeScript de este ajuste se registra en su sección; no acredita los recorridos ni la instalación remota actual.

Pendiente: validar schema en base nueva, adopción declarada y reejecución; permisos/RLS/Storage, concurrencia y otros dispositivos; comportamiento visual y foco en navegador/móvil; sincronización real; mensajes y accesos con perfiles distintos. Las reglas y límites detallados están en las guías enlazadas desde README.

## Observación breve con una persona nueva

Pedirle que cree un producto, cobre una venta y cierre su turno, sin indicarle dónde tocar. Observar dónde se detiene, qué acción espera y qué texto no entiende. Registrar intentos, ayuda solicitada y errores; recién después hacer preguntas. No se realizó esta observación ni se midió usabilidad con personas.
