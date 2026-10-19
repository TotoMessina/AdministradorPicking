# Plan de simplificación de uso — AdministradorKiosco

Fecha de revisión: 19 de octubre de 2026.

## Alcance y evidencia

Este documento conserva el diagnóstico inicial y registra la implementación de cinco mejoras: formulario de producto simple, lenguaje operativo, configuración progresiva, inicio guiado y ayuda IA contextual. Las secciones 1–10 son la línea base histórica; la sección 11 corresponde a la primera entrega. La revisión integrada está en la [sección 12](#12-revisión-integrada-de-los-cinco-cambios). La [sección 13](#13-jerarquía-visual-de-vender-y-caja) actualiza específicamente Vender y Caja con la siguiente mejora de UX/UI.

Se revisaron secciones de los componentes, servicios y migraciones citados. No se ejecutó la aplicación en navegador, no se consultó el esquema remoto, no se probaron dispositivos y no se realizaron pruebas con personas. Las cantidades de pasos de este documento son recorridos deducidos del código bajo condiciones declaradas, no mediciones de usabilidad, tiempos ni clics observados. La disponibilidad efectiva de las funciones SQL depende de las migraciones aplicadas en cada entorno.

### Fuentes principales

Las referencias usan nombres de componentes y funciones para seguir siendo útiles si cambian los números de línea.

| Fuente | Secciones revisadas / función en el recorrido |
| --- | --- |
| [AuthGate.tsx](../src/features/retail/AuthGate.tsx) | Inicio con email/contraseña, registro y recuperación. |
| [RetailApp.tsx](../src/features/retail/RetailApp.tsx) | Creación de comercio, `Workspace`, `refresh`, `canOperate`, `confirmLeave`, `completeSale`, `posStationControls`, navegación por rol y montaje de paneles. |
| [PosTab.tsx](../src/components/PosTab.tsx) | Búsqueda/lector, importe manual, `checkout`, F1–F4, cobro móvil, medios de pago y acceso al asistente. |
| [CashDesk.tsx](../src/features/retail/CashDesk.tsx) | Abrir turno, ingreso/retiro, cierre con confirmación, arqueo a ciegas y análisis IA opcional. |
| [Management.tsx](../src/features/retail/Management.tsx) | `CatalogEditor`, `startAdd`, `startEdit`, `handleSubmit`, sugerencias al salir de campos, reposición, herramientas y `StoreSettings`. |
| [BusinessSettings.tsx](../src/features/retail/BusinessSettings.tsx) | `BranchSettings`, `LedgerSettings`, `PriceListSettings`: formularios por registro y reglas de listas. |
| [SectionNav.tsx](../src/features/retail/SectionNav.tsx) | Pestañas accesibles con flechas, Home/End y foco. |
| [api.ts](../src/features/retail/api.ts), [offline.ts](../src/features/retail/offline.ts) | Contratos, RPC, caché/cola, operaciones que requieren conexión y guardas de reposición. |
| [202610010001_retail_multistore.sql](../supabase/migrations/202610010001_retail_multistore.sql), [202610130001_branches_prices_ledgers.sql](../supabase/migrations/202610130001_branches_prices_ledgers.sql) | `retail_create_store`, `initialize_location` y asignación de sucursal inicial a cajas. |
| [202610150001_cashier_access.sql](../supabase/migrations/202610150001_cashier_access.sql) | Asignación sucursal/caja, acceso a turnos y movimientos propios, permisos efectivos. |
| [workspace.css](../src/styles/workspace.css), [mobile-native.css](../src/styles/mobile-native.css) | Contextos ocultos, paneles móviles, teclado virtual y movimiento reducido. |

## 1. Línea base previa: recorrido del cajero

### Iniciar sesión y encontrar la caja

1. `AuthGate` pide email y contraseña y permite ingresar o recuperar acceso.
2. `RetailApp.load` acepta invitaciones y carga los comercios disponibles. Con acceso existente selecciona uno; con varios permite cambiarlo. Sin acceso ofrece crear comercio o actualizar accesos, no una explicación específica del problema de asignación del empleado.
3. `Workspace.refresh` carga rol, sucursales, cajas, disponibilidad y turnos. Prioriza un turno propio abierto y una caja disponible. Las opciones se reciben bajo las restricciones del backend; no debe agregarse un selector global que las amplíe.
4. La navegación del cajero presenta Nueva venta/Vender, Cajas y turnos/Caja y Remito. El asistente flotante también se monta fuera de Remito.

**Fricción:** escritorio y móvil nombran de forma diferente una misma tarea. Un único contexto se muestra con selectores deshabilitados, que visualmente siguen pareciendo decisiones. Un empleado sin acceso puede encontrarse con una invitación a crear comercio que no resuelve su necesidad.

### Abrir turno

Desde Nueva venta sin turno operativo, aparece “Primero, abrí tu caja” y “Ir a cajas y turnos”. Ese botón cambia a Mi turno. Allí se ingresa efectivo inicial, con valor predeterminado 0, y se confirma “Abrir [nombre de caja]”. Después se usa “Ir a vender”.

**Ya resuelto:** no se permite vender sin turno; hay estado de caja ocupada, disponibilidad y guía “Tu jornada en tres pasos”.

**Fricción:** se dice abrir caja y abrir turno para la misma transición. Abrir requiere salir de Vender y volver. No se debe eliminar la confirmación del efectivo para ahorrar un paso: abre una operación contable real.

### Agregar y cobrar

En `PosTab` se puede buscar por nombre/código, escanear, tocar productos o usar botonera rápida. El importe manual ya está cerca del buscador, no al final del catálogo. Los filtros incluyen disponibilidad y ocultar bajo margen.

El medio inicial es Efectivo. Con mouse/táctil se ingresa lo recibido o se pulsa Monto exacto y luego Cobrar. QR/transferencia/tarjeta exigen marcar la confirmación del pago antes de Cobrar. La app registra el pago; no lo procesa.

Los atajos F1 Efectivo, F2 QR, F3 Transferencia y F4 Mixto confirman pago recibido. F1 usa el total exacto si no se ingresó otro monto; F4 pide configurar el reparto si aún no es válido. Conservar esta distinción es esencial: no quitar una confirmación táctil solo porque el atajo ya expresa esa intención.

En móvil hay vistas Productos/Venta y un acceso “Ver venta”; por eso el recorrido táctil puede sumar un cambio de vista. No equivale al recorrido de escritorio con ambos paneles presentes.

**Ya resuelto:** total/vuelto, prevención de doble envío, identificador de reintento, carrito conservado al fallar y devolución del foco a búsqueda al cobrar.

**Fricción:** el contexto de sucursal/caja y Opciones de venta siguen presentes aun con una sola opción útil. Opciones de venta contiene lista y registro; un cajero no puede cambiar la lista, pero el selector igualmente aparece deshabilitado. El registro sí puede cambiarse con carrito vacío. El texto invita a elegir ambos antes de agregar productos aunque ya estén seleccionados.

### Registrar un movimiento y cerrar

En Caja/Mi turno están Registrar movimiento y Cerrar turno. `CashMovementForm` distingue ingreso/retiro y despliega categoría, proveedor y comprobante cuando corresponden. Los comprobantes de pagos a proveedores son obligatorios; su consulta queda reservada al administrador.

El cierre pide Efectivo contado, botón Confirmar cierre y una confirmación adicional del navegador. El cajero tiene arqueo a ciegas: no ve efectivo esperado ni diferencias y el cierre espera la disponibilidad del saldo requerido por la implementación. El administrador sí tiene un análisis IA voluntario; el submit del cierre no lo llama.

**Fricción:** hay explicaciones y avisos repetidos alrededor del arqueo, junto con métricas, ventas, movimientos y cierres anteriores en la misma vista. Se puede abreviar su presentación, conservando la regla y los estados de error. No reemplazar el conteo físico por un importe calculado.

## 2. Línea base previa: recorrido del administrador

### Crear o editar producto — tarea habitual

Ruta: Productos y stock → Catálogo y stock → Agregar producto, o Editar en una fila. `startAdd` abre un formulario en la página y lleva el foco al primer input; `startEdit` carga los atributos existentes.

El formulario expone 15 grupos de datos: código, nombre, categoría, marca, distribuidor, código de proveedor, unidad, unidades por bulto, grupo de margen, etiquetas, ícono, precio, costo, stock y umbral de aviso. No están separados en básico/avanzado.

Valores iniciales reales: primera categoría disponible, unidad `unit`, costo 0, stock 0, aviso 4, ícono de paquete, grupo `standard` y bulto vacío. Nombre, código y precio se deben completar; código es actualmente obligatorio. Agregar se deshabilita si no hay categorías. No proponer códigos vacíos sin cambiar conscientemente esa regla en otro alcance.

Además de los campos, salir del código puede buscar en catálogo comunitario y recurrir a Groq; salir del nombre puede pedir sugerencias; salir del precio puede consultar IA cuando el cálculo local detecta un recargo fuera del rango previsto.

**Hallazgo relevante:** `handleSubmit` consulta Groq para anomalías antes de `doSaveProduct`, con aborto a los 5 segundos. Si falla continúa guardando; si hay advertencias exige revisar o “Guardar de todas formas”. No es un requisito rígido de disponibilidad de IA, pero sí una espera y una decisión adicional en el guardado normal. Plegar campos por sí solo no resuelve esta dependencia.

### Reponer mercadería — tarea habitual

Ruta corta: Catálogo y stock → + Reponer en un producto → cantidad → Confirmar reposición. El modal muestra stock actual, ingreso y resultado. `startReplenish` inicia con cantidad 12, modo por unidades y costo actual precargado; proveedor y referencia quedan vacíos. No hace falta modificar el costo para reponer. Con `pack_size > 1` aparece el toggle por bultos y la equivalencia en unidades.

Rutas complementarias bajo Más herramientas: Carga masiva CSV/Excel, historial, ajuste masivo de precios e importar factura de compra. La factura tiene extracción, vinculación, revisión/reposición y propuesta posterior de precios; no es una variante del chat del asistente.

Los remitos pendientes aparecen dentro del catálogo con badge de navegación. Se revisan y aprueban/rechazan por administrador. Transferencias tiene subpestaña propia: audita movimiento interno, sin repartir stock por local ni modificar el total.

**Ya resuelto:** herramienta principal Agregar producto separada de Más herramientas; reposición unitaria corta con cantidades rápidas; bultos con preview; memoria de proveedor y revisión de vinculaciones nuevas; propuesta de precios independiente.

**Fricción:** reposición, factura y remito son entradas diferentes para “ingresar mercadería”; necesitan explicaciones breves sobre cuándo usar cada una, no unificar sus efectos ni permisos.

### Configurar el comercio — tarea ocasional

`StoreSettings` ya tiene pestañas: General, Sucursales y cajas, Registros de ventas, App y avisos, Equipo y permisos. No se muestran todas las secciones a la vez. General contiene identidad y categorías; Sucursales y cajas monta `BranchSettings` y edición de cajas; Registros monta `LedgerSettings`.

Dentro de esas secciones, sucursales y registros muestran un formulario por elemento más otro para crear. `PriceListSettings` muestra tabla, edición de todas las listas, alta, consulta y precios fijos. Aunque usa `details`, la subpestaña del catálogo le pasa `expanded`, por lo que llega desplegado. Las listas están en Productos y stock → Listas de precios, no duplicadas como editor en Mi comercio.

**Separación propuesta:** tareas diarias son vender, movimientos, stock, precios y revisión de ingresos. Identidad, categorías, nuevas cajas/sucursales, permisos, listas/registros y avisos se configuran ocasionalmente. El análisis puede consultarse cuando se necesita; no hace falta abrirlo para operar.

## 3. Inventario de ayudas, avisos y duplicaciones

| Elemento y ubicación real | Disparador actual | Decisión para la implementación |
| --- | --- | --- |
| `AIAssistant` en pestaña Asistente IA, solo administrador | Abrir pestaña y consultar | Conservar análisis completo en un acceso secundario; dejar de ocupar navegación principal. |
| `AiAssistantWidget` en `RetailApp` | Botón flotante, consultas/presets; oculto en Remito | Convertir en único panel de ayuda contextual accesible desde Ayuda. Respetar alcance de datos según rol. |
| Botón de consulta en catálogo del POS (`PosTab.handleOpenAi`) | Acción del usuario | Actualmente abre el mismo widget que el flotante: redundancia de entrada, no dos motores distintos. Quitar acceso genérico repetido del área de venta; conservar Ayuda. |
| Widget interno de `PosTab` | Solo si no recibe `onOpenAi` | Es fallback para uso independiente; `RetailApp` sí pasa el callback. No afirmar que se montan dos widgets en el POS actual. |
| `AIReportPanel` en Caja → Resumen y ventas | Generar reporte; métricas locales ya calculadas | Mantener métricas visibles; ofrecer “Explicar estos resultados” como acción secundaria. Sus efectos de carga de datos no son consultas generativas automáticas. |
| Análisis de turno en `CashDesk` | Botón explícito, administrador | Ya opcional y separado del submit. Conservarlo secundario; no reimplementar el cierre por este motivo. |
| Sugerencias código/nombre en `CatalogEditor` | Blur de inputs, más botón Completar con IA | Conservar lookup determinista por código; volver generativas solo por intención. No aplicar sugerencias sobre valores editados mientras llega una respuesta. |
| Validación IA de precio en `CatalogEditor` | Blur con recargo fuera de rango | Ayuda voluntaria; mantener validaciones numéricas deterministas. No cambiar fórmulas de margen/recargo en esta tarea. |
| Auditoría IA de producto y Advertencia de Catálogo | Guardar, espera con timeout y posible confirmación extra | Separar auditoría del guardado normal en el paso de IA. Conservar validaciones reales del API/base y avisos deterministas, sin depender de Groq. |
| Análisis de stock / orden sugerida | Acciones explícitas del catálogo | Mantener como herramienta contextual, dentro de Más herramientas. |
| `InvoiceAnalyzer` + `invoiceParserService` | Importar PDF/imagen o texto y analizar | Flujo operativo: preservar PDF/OCR y procesamiento por intención; no reemplazar por chat. |
| `invoiceMatchingService` + `supplierMappingService` | Vinculación tras análisis de factura | Fuzzy matching y memoria local por tienda/proveedor; mantener confianza/revisión y Confirmar y recordar. No confundir memoria local con estado compartido de onboarding. |
| `InvoicePriceProposal` | Tras reposición; sugerencia IA voluntaria | Conservar propuesta, selección y aplicación explícita; precio nunca cambiado por solo abrir una ayuda. |
| `QuickRemito` + `quickRemitoService` | Foto → Procesar con IA, o enviar solo foto | El cajero puede evitar IA y enviar para revisión manual. Stock solo cambia tras aprobación; preservar ese camino. |
| `PushWelcome` | Inicio de sesión de administrador, PWA instalada y condiciones de soporte/configuración | Ya tiene Ahora no y condicionamiento. Coordinar su aparición con onboarding sin eliminar el acceso o activar permisos sin gesto. |
| `PushSettings` | Mi comercio → App y avisos | Mantener activación y preferencias por dispositivo; avisos de stock/cierre. |
| `PwaStatus` | Soporte de instalación, conexión y estado local de descarte | El aviso ya se puede cerrar y no se mantiene siempre. Conservar entrada desde configuración; no rehacer lo resuelto. |
| `OfflineStatus` / estados de conexión | Conexión, cola y sincronización | Mensaje compacto pero visible; distinguir guardado local, sincronización pendiente y error. No ofrecer remitos/transferencias como offline si sus métodos requieren red. |
| Toasts, banners y badges de remitos | Guardado/error, actualización, pendientes | Mantener confirmación clara. Revisar textos duplicados sin ocultar “guardado pero no actualizado” ni errores reales. |
| Confirmaciones del carrito y cierre | Cambiar contexto con carrito; vaciar venta; cerrar turno | Preservar protección ante descarte y cierre; no sumar confirmaciones en acciones reversibles ordinarias. |
| Formularios de configuración por cada registro | Entrar a la sección/listas | Cambiar a resumen/listado + edición del elemento elegido; un solo editor activo por sección. |

No hay evidencia de que todo análisis IA actual se dispare automáticamente. Las principales llamadas implícitas identificadas están en el formulario de producto. El modelo predeterminado ya es `llama-3.1-8b-instant`, configurable por entorno; este plan no cambia modelos ni cuotas.

## 4. Términos y textos propuestos

Cambiar etiquetas visibles, no nombres internos de tablas, roles, RPC o estados guardados.

| Concepto real | Etiqueta visible | Explicación corta / acción |
| --- | --- | --- |
| `Branch` | Sucursal | Local donde trabajás. En accesos descriptivos: “Locales y cajas”. |
| `Register` | Caja | Puesto desde donde cobrás. En configuración: “Cajas de cobro”. |
| `Shift` | Turno | Tu jornada de trabajo en una caja. “Abrir turno” / “Cerrar turno”. |
| Importe de apertura | Efectivo inicial | Dinero que hay en la caja antes de empezar. |
| Importe declarado al cierre | Efectivo contado | Dinero físico que contaste al terminar. |
| Arqueo a ciegas | Conteo al cierre | “Contá el efectivo. El encargado revisará las diferencias”. Conservar regla, no exponer saldo esperado. |
| `SalesLedger` | Registro de ventas | Agrupación para organizar ventas. No determina si hay factura. |
| POS / checkout | Vender / Cobrar | Agregá productos y registrá el pago recibido. |
| `PriceList` base | Precio del catálogo | Valor base del producto; ayuda puede aclarar “Lista madre”. No renombrar listas creadas por usuarios. |
| Lista alternativa | Lista de precios | Precios para un contexto o sucursal. Mostrar cuál está vigente. |
| Replenishment | Ingresar mercadería | Agregar stock recibido; acción por producto puede decir “Reponer”. |
| Pending replenishment | Remito pendiente | Ingreso enviado para revisión; todavía no suma stock. |
| Transfer | Transferencia entre sucursales | Registro interno; no cambia el stock total del comercio. |
| Pack size | Unidades por bulto | Cuántas unidades contiene lo que comprás por pack/display. |
| Margin group | Grupo de margen | Separa bajo margen del análisis principal; dentro de Más opciones. |
| AI assistant | Consultar al asistente | Ayuda opcional con los datos disponibles. |
| Settings | Mi comercio | Datos, locales, personas y otras opciones. |

La navegación principal propuesta es Vender, Caja, Productos y Mi comercio para administradores; Vender, Caja y Remito para cajeros. Ayuda es una utilidad secundaria accesible por ambos, no una tarea obligatoria.

## 5. Mapa de pantallas y decisiones predeterminadas

### Un local y una caja

- **Vender:** buscador/lector, botonera, importe manual y cobro. Contexto compacto “Principal · Caja principal · Turno abierto/cerrado”. Sucursal/caja únicas como texto. Sin turno, acción directa Abrir turno con efectivo explícito; al terminar volver a Vender.
- **Opciones de venta:** precio/lista vigente y registro en resumen. Sin selección obligatoria si hay una sola opción válida. Si hay varias, desplegable accesible antes de armar el carrito; explicar el efecto. Una sucursal única no implica una lista o registro único.
- **Caja:** Mi turno como vista inicial. Movimiento y cierre como acciones claras; detalle de ventas/movimientos accesible. Resumen y ventas solo para administrador.
- **Productos:** lista, Agregar producto, Reponer e ingreso de mercadería; panel de remitos cuando existan. Más herramientas conserva CSV, historial, ajustes y factura. Subpestañas Listas de precios y Transferencias accesibles, aunque una transferencia requiere dos sucursales.
- **Producto:** cinco datos básicos, Más opciones cerrado. Mantener defaults actuales válidos; resumen de unidad/bulto/bajo margen al editar. Los errores secundarios abren la sección y enfocan el campo.
- **Mi comercio:** Datos del comercio; resumen Locales y cajas con Administrar; Personas con acceso con Agregar persona; Más opciones para categorías, registros, acceso a Listas de precios y App y avisos. El acceso a listas navega a su editor único en Productos, no lo duplica.
- **Ayuda:** un acceso estable, sin flotante sobre Cobrar. Desde allí, consulta contextual y acceso al análisis completo para administrador. Informes conserva Explicar estos resultados.

### Varias sucursales / varias cajas

Misma estructura, sin “modo avanzado” obligatorio. Mostrar selector solo cuando el usuario pueda elegir entre varias opciones permitidas. Mantener contexto actual y disponibilidad; las asignaciones del cajero siguen limitadas por backend.

Al seleccionar sucursal, aplicar la regla existente de lista predeterminada mediante `useBranchPriceList`. Solo administrador puede reemplazarla en el POS; lista y registro quedan bloqueados con carrito. Conservar confirmación de descarte antes de cambiar sucursal/caja/comercio.

Mi comercio muestra cantidad/resumen de locales y personas, y acceso a administrar cada uno. Listas sigue mostrando alcance Global/Sucursal; Transferencias conserva origen/destino, productos, cantidad, historial, confirmación/cancelación. Stock continúa compartido por tienda.

### Excepciones que no se resuelven ocultando controles

| Estado | Respuesta esperada |
| --- | --- |
| Sin caja o categoría válida | Explicar qué falta y llevar al administrador a la sección pertinente; al cajero, indicar que lo resuelve el encargado. |
| Caja ocupada / sin asignación | Mostrar estado y alternativas permitidas; nunca abrir otro turno automáticamente. |
| Lista de sucursal cargando o con error | Conservar bloqueo de cobro actual hasta tener precios válidos. |
| Carrito o formulario con borrador | Proteger contexto; no reiniciar por navegar entre resúmenes y editores. |
| Offline sin preparación | Explicar que debe prepararse la caja con conexión; no prometer disponibilidad general. |
| Subida/OCR/Groq fallidos | Reintento dentro de la tarea; preservar archivo/datos; conservar vías manuales existentes. |
| Una opción desactivada que figura en un histórico | Preservar contexto histórico, sin volverla seleccionable para nuevas operaciones. |

## 6. Línea base reproducible: pasos obligatorios anteriores

### Regla de conteo

Un paso es una acción intencional: abrir una sección, pulsar un botón/atajo, ingresar un valor completo, seleccionar una opción o responder una confirmación. No se cuenta cada tecla, foco/Tab, scroll, espera ni lectura. Escanear un código completo con Enter es una acción. Datos predeterminados válidos no requieren una acción. Procesos externos como tomar una foto o elegir archivo se agrupan como una acción y no representan todos los gestos del sistema operativo.

Condiciones comunes: sesión/datos disponibles, red activa, permisos correctos, sin avisos iniciales modales, sin errores ni anomalías IA salvo cuando se explicitan. Son conteos de la ruta elegida, no un mínimo universal para todos los dispositivos ni todas las configuraciones. Las consultas IA y esperas se registran aparte porque no agregan gestos, pero sí carga de uso.

| ID / tarea reproducible | Inicio y acciones actuales | Total actual |
| --- | --- | --- |
| T1 Ingresar como cajero | Login: email → contraseña → Ingresar. Acceso a comercio ya otorgado. | 3 |
| T2 Abrir turno con $2.000 | Vender sin turno: Ir a cajas y turnos → ingresar 2000 → Abrir caja. Caja disponible seleccionada. | 3; con efectivo 0 aceptado, 2 |
| T3 Vender una unidad por lector/F1 | Tras apertura en Caja: Ir a vender → escanear código existente con stock → F1, sin otro efectivo ingresado. | 3; si ya está en Vender, 2 |
| T4 Cobrar una unidad táctil en efectivo exacto | Vender escritorio con carrito vacío: tocar producto → Monto exacto → Cobrar. | 3; móvil suma 1 por Ver venta si el panel está oculto |
| T5 Cobrar una unidad por QR sin atajo | Vender escritorio: tocar producto → QR → confirmar pago recibido → Cobrar. | 4; móvil puede sumar 1 por Ver venta |
| T6 Cerrar turno con $3.000 | Desde Vender: Caja → ingresar 3000 contados → Confirmar cierre → aceptar confirmación del navegador. | 4 |
| T7 Crear producto con costo y stock reales | Desde Vender administrador: Productos y stock → Agregar producto → código `UX-PRUEBA-01` → nombre → precio 1000 → costo 600 → stock 10 → Guardar producto. Categoría inicial y aviso 4 se conservan. | 8; auditoría IA siempre se intenta; si exige Guardar de todas formas, 9 |
| T7b Crear producto mínimo con defaults | Igual T7, conservando costo 0 y stock 0. No implica que esos valores sean adecuados para un producto real. | 6; con advertencia IA, 7 |
| T8 Cambiar solo precio | Desde Vender: Productos y stock → Editar fila conocida → precio nuevo → Guardar producto. | 4; con advertencia IA, 5 |
| T9 Reponer 5 unidades | Ya en catálogo con producto visible: + Reponer → cantidad 5 → Confirmar reposición. Costo/proveedor/notas sin cambio. | 3; desde Vender, 4 |
| T10 Reponer 2 bultos de 24 | Igual T9, activar Ingresar por bultos → ingresar 2 → confirmar +48 u. | 4 desde catálogo; `startReplenish` inicia por unidades |
| T11 Cambiar nombre del comercio | Desde Vender, primera entrada a configuración General: Mi comercio → editar nombre → Guardar cambios. | 3; si otra sección quedó seleccionada, sumar General |
| T12 Crear sucursal | Desde Vender: Mi comercio → Sucursales y cajas → ingresar nombre único → Crear sucursal. Dirección opcional vacía. | 4 |
| T13 Crear lista global con ajuste +10% | Desde Vender: Productos y stock → Listas de precios → nombre único → ajuste 10 → Crear lista. Alcance Global predeterminado. | 5; para sucursal específica, sumar selección de sucursal |
| T14 Enviar remito solo foto | Cajero desde Vender: Remito → Fotografiar remito → seleccionar/tomar foto → Enviar solo foto para revisión manual → Enviar para aprobación. Sucursal ya seleccionada, notas vacías. | 5; no suma stock |
| T15 Abrir ayuda y preguntar | Fuera de Remito, widget cerrado: abrir asistente → escribir pregunta → Enviar. | 3; respuesta generada necesita Groq |
| T16 Crear tienda y quedar listo para vender | Desde Crear comercio: nombre → Crear comercio (2); T7 (8); Caja → efectivo inicial → Abrir caja → Ir a vender (4). | 14, sin login ni advertencias; no hay onboarding lineal |

Para T10, comprobar manualmente el reinicio por unidades que indica `startReplenish`; registrar cualquier divergencia de la app ejecutada. Para buscar filas que no estén visibles, sumar una acción de búsqueda. Cambiar cantidad o agregar productos suma acciones por artículo, no son parte del caso base.

La secuencia de cajero T1 + T2 + T3 + T6 da 13 acciones en estas condiciones, excluyendo cobro externo, conteo físico, avisos y espera. Esta suma sirve para reproducir un recorrido, no para concluir que la app es fácil.

## 7. Implementación propuesta y dependencias

Orden: producto simple → lenguaje operativo → configuración progresiva → inicio guiado → IA contextual → revisión integrada. Cada etapa conserva contratos y datos; las reglas siguientes resuelven las decisiones compartidas para no rehacerlas en cada prompt.

### Etapa A — Producto simple

- Editar `CatalogEditor`, con un componente extraído del bloque de campos si facilita mantener el diff acotado. No copiar la lógica de guardado en un segundo formulario.
- Primera vista: nombre, código, precio, costo y stock. Más opciones: categoría, marca/proveedor, código proveedor, unidad, bulto, etiquetas, margen, ícono y umbral de aviso.
- Mantener `formData` completo aun plegado, `startEdit` y payload de `handleSubmit`; no limpiar valores al cerrar el desplegable. Validación inválida abre Más opciones y enfoca el control antes de informar error.
- Unidad efectiva debe verse en etiquetas/resumen aun plegada para kg/lt. No corregir de paso el soporte de cantidades fraccionarias: registrar cualquier limitación actual fuera de alcance.
- Conservar auditoría actual hasta la etapa E, pero señalar explícitamente que el producto aún puede esperar IA. La dependencia no debe quedar olvidada por haber plegado campos.
- Resultado verificable: T7 conserva sus datos pero presenta cinco campos primero; T8 preserva todos los atributos secundarios. Menos campos visibles no necesariamente reduce gestos de T7.

### Etapa B — Lenguaje operativo

- Aplicar tabla de términos en `RetailApp`, `CashDesk`, `CashMovementForm`, `BusinessSettings`, `PosTab` y mensajes relacionados. Mantener IDs de pestañas (`pos`, `cash`, etc.) y API.
- Apertura desde Vender: presentar el formulario real de apertura en ese contexto usando un componente reutilizado desde `CashDesk`; mismo `retail.openShift`, `run`, caja y validaciones. Al éxito mantener/volver a Vender. No conservar dos implementaciones divergentes del formulario.
- Resumen de sucursal/caja única como texto. Selectores solo si hay elección real permitida. Opciones de venta resume selección vigente; no pedir elegir defaults de nuevo.
- No reemplazar valores explícitos de efectivo ni confirmaciones de cierre. Lista/registro se bloquean con carrito como hoy.
- Riesgo: `key={shift?.id}` y desmontaje de POS pueden reiniciar estado secundario; conservar carrito y recuperación del foco.

### Etapa C — Configuración progresiva

- Conservar `StoreSettings`/`SectionNav` y los permisos; reorganizar entradas/resúmenes sin construir otro sistema de navegación.
- Sucursales, cajas, equipo y registros: listado/resumen, botón Agregar y editor para el elemento seleccionado. Un solo editor activo por sección, con Cancelar y conservación de cambios no guardados al navegar según política de borradores.
- Las listas siguen en Catálogo → Listas de precios; Mi comercio puede enlazarlas mediante callback/intención de navegación a ese editor. Su listado reemplaza los múltiples formularios abiertos.
- Mantener categorías accesibles en Más opciones y su alta; no dejar un alta de producto imposible si faltan categorías.
- Transferencias con un solo local muestra requisito y acceso a Administrar locales, sin formulario inválido; con varios locales conserva el módulo completo.
- Conservar enlace de avisos a App y avisos y contenido correcto al cambiar una intención de navegación. `initialView` hoy inicializa un estado: no suponer que cambiar la prop siempre cambia una sección ya montada.

### Etapa D — Inicio guiado

**Bootstrap existente que debe reutilizarse:** `retail_create_store` crea tienda, propietario, cuatro categorías (Golosinas, Bebidas, Snacks, Varios) y Caja principal. `initialize_location`, disparado al insertar la tienda, crea sucursal Principal y registros General/Otras ventas. Otro trigger asigna sucursal predeterminada a la caja. Las listas alternativas no se crean por este recorrido. Verificar en implementación el orden completo de migraciones; no repetir estas inserciones desde React.

**Diseño de persistencia propuesto:** tabla mínima `retail_store_onboarding`, vinculada por `store_id` único, con paso reanudable, `completed_at`, `dismissed_at` y `updated_at`. Una migración futura crea fila por trigger solo para tiendas nuevas posteriores a su aplicación, sin insertar filas de tiendas existentes. Ausencia de fila significa experiencia existente, no “mostrar asistente porque no tiene productos”. Solo owner/admin pueden leer/actualizar el avance mediante RLS/RPC. No borrar ni reconstruir tiendas para habilitarlo.

- `step` guarda posición, no acredita por sí mismo que existe un producto o un turno. Derivar requisitos operativos de los datos reales y del usuario que opera; completar onboarding no abre un turno para el siguiente usuario.
- RPC de avance con bloqueo de fila/estado esperado e idempotencia de finalización para que dos dispositivos no retrocedan o sobreescriban un cierre del asistente. Reutilizar restricciones/idempotencia de operaciones de tienda y apertura; no declarar progreso si falló el guardado.
- Crear `StoreOnboarding` acotado e integrado después de crear/cargar la tienda, antes del recorrido normal; reutilizar alta simple de producto y apertura extraídas. Tres pasos: Tu comercio → Tus productos → Empezar a vender.
- Configurar después registra descarte voluntario y deja un acceso Retomar configuración en Mi comercio. Si aún falta algo, mostrarlo como pendiente; no marcar tareas realizadas por saltarlas.
- Sin fila/migración disponible o sin conexión, no bloquear un comercio que ya opera. Mostrar error/reintento del asistente cuando corresponda, sin intentar crear stock/recursos ficticios.
- Coordinar avisos de instalación/notificaciones: una sola capa interactiva a la vez. No autoactivar permisos. Preservar políticas actuales y posibilidad de posponer.
- No usar solo localStorage: el estado compartido debe poder reanudarse en otro dispositivo. La migración se prepara localmente; su despliegue y comprobación quedan explícitos.

### Etapa E — IA contextual

- Ayuda general abre el widget contextual existente. El administrador encuentra “Análisis del negocio” desde Ayuda y conserva el panel completo; sacar `ai` de navegación principal sin romper intenciones/rutas internas que deban seguir llegando allí.
- Mantener accesos operativos específicos de stock, factura, remito y propuesta de precios. No trasladarlos todos al chat ni quitar la vía de solo foto del remito.
- En `CatalogEditor`, consultas generativas solo por botón. Lookup EAN determinista puede seguir automático; su fallback Groq se ofrece explícitamente. Reemplazar la auditoría preguardado por revisión voluntaria separada; no omitir validaciones locales, restricciones únicas ni errores de la base.
- Asociar respuestas a la versión del producto/borrador que las solicitó; abortar/descartar respuestas viejas para que no sobrescriban una edición posterior. Aplicar valores sugeridos solo por confirmación.
- `CashDesk` ya separa análisis y cierre; verificar, no reescribir. `AIReportPanel` conserva cifras locales y cambia el protagonismo de su explicación.
- Foco y atajos: el asistente abierto recibe foco solo por intención; cerrado no captura lector; al salir vuelve al punto de entrada o búsqueda. Errores/rate limits quedan dentro de la ayuda.

### Etapa F — Revisión integrada

Actualizar este documento con cambios efectivamente implementados y conteos reproducidos. Recorrer T1–T16 según permisos, escritorio/móvil, local único/múltiple, reanudación y offline preparado. Medir acciones con la misma regla; anotar condiciones y divergencias, no fabricar mejoras numéricas.

Para cada etapa de código, validación permitida: `npx tsc --noEmit -p tsconfig.app.json`. Sin build ni otras pruebas automatizadas. Validaciones manuales y backend deben declararse como ejecutadas o pendientes, nunca implícitas.

## 8. Riesgos que acompañan los siguientes prompts

| Riesgo concreto | Salvaguarda / prueba requerida |
| --- | --- |
| Valores avanzados perdidos por plegar o desmontar | Estado único y payload completo. Editar solo precio de producto con bulto, bajo margen y proveedor; comparar atributos. |
| Input requerido inválido dentro de panel cerrado | Abrir/focalizar sección ante error; no dejar submit sin explicación ni foco en controles invisibles. |
| Reinicio de borradores al cambiar pestañas principales | `RetailApp` monta varios paneles por condición; mantener ciertos subpaneles con `hidden` no garantiza persistencia al salir de Catálogo. Revisar estado/montaje antes de cambiar navegación. No prometer persistencia universal actual. |
| Permisos relajados para simplificar selección | Mantener RLS/RPC y listas de opciones autorizadas. El cajero no ve otros movimientos ni puede hacer reposición por abrir un formulario. |
| Cambio de lista/sucursal con venta pendiente | Conservar `confirmLeave`, bloqueo lista/registro y control de solicitudes de `useBranchPriceList`. |
| Confundir agrupación de ventas con estado fiscal | Texto explícito y contratos intactos. No crear traducciones “facturado/no facturado” para registros arbitrarios. |
| Stock supuesto por sucursal | Advertencia de stock compartido visible donde importa. Transferencias solo audita; recepción de remito solo suma tras aprobación. |
| Duplicación de comercio/caja/producto/turno | Reusar bootstrap, bloqueos de envío e IDs/validaciones existentes. Ensayar reintentos y segundo dispositivo sin repetir efectos. |
| Borrar avisos necesarios para reducir ruido | Preservar errores de sincronización, precios, subidas y conteo; distinguir operación guardada de actualización fallida. |
| UI escondida que aún se ejecuta | Revisar efectos y listeners en paneles `hidden`; esconder un componente no cancela red, lector ni validación automáticamente. |
| Capas móviles y permisos superpuestos | Un diálogo a la vez, retorno de foco, teclado virtual y movimiento reducido; comprobar en PWA real. |

## 9. Guía histórica del diagnóstico y línea base

URL: **http://localhost:3001/**. Estas pruebas quedan para el usuario; no se ejecutaron en esta revisión. Usar un comercio de prueba, con administrador y cajero asignado, un producto con stock y otro con `pack_size: 24`, proveedor y bajo margen. Para comparar múltiples locales, preparar una segunda sucursal con su caja y regla de precios. Comprobar que las migraciones necesarias estén aplicadas en el entorno de prueba.

1. **Ingreso y turno (T1/T2):** salir e ingresar como cajero, usar Ir a cajas y turnos y abrir con $2.000. Esperado actual: email/contraseña, contexto asignado, navegación a Caja y confirmación de apertura; no acceso a configuración de administrador.
2. **Venta (T3/T4/T5):** Ir a vender, escanear una unidad y cobrar con F1 exacto; luego probar efectivo con Monto exacto y QR con confirmación. Esperado: ticket/confirmación, carrito vacío tras éxito, stock descontado según operación y foco de búsqueda. En móvil registrar si Ver venta suma un paso.
3. **Cierre (T6):** entrar a Caja, declarar efectivo contado y confirmar ambas instancias. Esperado: cierre guardado; cajero sin efectivo esperado/diferencias. No se necesita pedir análisis IA.
4. **Alta y edición (T7/T8):** como administrador, crear con código único, precio 1000, costo 600 y stock 10; observar campos y red/estados de IA al salir de inputs y guardar. Editar después solo precio de un producto con bulto/bajo margen. Esperado actual: formulario amplio, posible espera/advertencia IA y persistencia de atributos. Usar otro código si el de ejemplo ya existe.
5. **Reposición (T9/T10):** + Reponer, ingresar 5 unidades; repetir con 2 bultos de 24. Esperado: preview +48 en el segundo caso; proveedor/costo/notas opcionales. Verificar que “stock” no representa inventario separado por local.
6. **Configuración (T11/T12/T13):** visitar General, Sucursales y cajas, Registros y Listas de precios. Esperado actual: secciones separadas, pero múltiples editores dentro de sucursales/registros/listas. Guardar nombre de prueba, crear sucursal/lista solo en datos de prueba y registrar pasos.
7. **Comercio nuevo (T16):** con cuenta autorizada para prueba, crear tienda. Esperado: recursos iniciales generados, navegación normal a Vender sin guía de tres pasos; producto/apertura se completan en sus secciones. No concluir que faltan recursos solo porque no se ven en la primera pantalla.
8. **Ayudas y avisos (T15):** abrir pestaña Asistente, widget y botón contextual del POS; comprobar que este último usa el widget del workspace. Revisar App y avisos, descartar instalación y posponer push cuando aparezcan. Esperado: IA conversacional diferenciada de Importar factura y Remito; no se envían preguntas por abrir un informe con métricas locales.
9. **Remito y opciones avanzadas (T14):** como cajero, foto y envío sin IA; como administrador, revisar pendiente. Visitar factura, CSV, historial y Transferencias. Esperado: accesos disponibles según rol, comprobantes privados y stock del remito sin cambio hasta aprobar.
10. **Varias sucursales, borradores y offline:** armar carrito, intentar cambiar sucursal/caja y cancelar descarte; revisar lista de cada sucursal con carrito vacío. Preparar caja con conexión y luego probar operación offline con datos de prueba; volver a conectar. Esperado: protección del carrito, precios correctos, estados de cola visibles. Registrar por separado cualquier borrador de formulario perdido al salir de un panel.

En cada caso anotar rol, dispositivo, estado inicial, acciones realizadas, advertencias, resultado y diferencias contra el conteo deducido. Los pasos futuros deben actualizar esta línea base con evidencia, no reemplazarla por estimaciones presentadas como pruebas.

## 10. Entrega y pendientes del diagnóstico original

- Realizado: revisión estática de recorridos, inventario, glosario, mapa propuesto, secuencia de implementación y línea base condicional.
- Cambio de esta tarea: solo este documento; sin cambios funcionales, SQL ni configuración.
- No ejecutado: TypeScript, build, pruebas automatizadas, navegador, backend, PWA o pruebas con personas. TypeScript no corresponde a una entrega exclusivamente documental.
- Pendiente: ejecutar manualmente la guía, implementar cada etapa autorizada y validar persistencia/roles con las migraciones efectivas del entorno.
- Validación de facilidad de uso posterior: observar a una persona nueva creando un producto, cobrando y cerrando sin indicaciones; registrar dónde duda, qué busca y qué términos no entiende. Eso complementará los conteos; todavía no ocurrió.

## 11. Avance: formulario simple implementado

Registro histórico de la etapa A. La auditoría IA al guardar que se menciona aquí fue separada posteriormente; para el comportamiento vigente usar la sección 12.

La descripción de las secciones anteriores conserva la línea base previa. Se implementó la etapa del formulario simple en `CatalogEditor`, con estos cambios:

- Nombre, código, precio, costo y stock aparecen primero. El código conserva su obligatoriedad y los valores predeterminados no cambian.
- Más opciones empieza cerrada tanto al crear como al cambiar de producto para editar. Contiene organización/proveedor, presentación, bultos, grupo de margen y avisos. Los controles siguen montados y enlazados al mismo estado y payload, aunque estén plegados.
- Al editar, el resumen muestra unidad especial, bulto, bajo margen, marca y proveedor cuando corresponden. Precio/costo/stock indican la unidad de venta efectiva, incluidos kg y litros.
- Una validación nativa inválida dentro del desplegable lo abre antes de enfocar el primer campo inválido. Tab y el resumen conservan navegación nativa; Escape desde Más opciones vuelve a su resumen. Enter en etiquetas agrega la etiqueta y Enter en inputs no guarda el formulario implícitamente; para guardar con teclado se llega al botón y se pulsa Enter.
- La búsqueda determinista por código se conserva. Sugerir datos con IA y Revisar precio son acciones secundarias explícitas; nombre/precio ya no consultan Groq al perder foco. Las sugerencias se aplican solo al elegirlas, y respuestas de otro borrador o una edición anterior se descartan.
- La auditoría IA anterior a guardar sigue existente, como estaba previsto para esta etapa. Su separación del guardado corresponde a la etapa E; no se debe interpretar esta entrega como eliminación de todas las consultas IA automáticas.

Validación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores. No se ejecutó build ni pruebas automatizadas adicionales. Pendientes: comprobación manual visual, teclado, validaciones nativas, datos persistidos y móvil. No se modificaron API, SQL, permisos, POS ni cálculos de reposición.

### Guía de Pruebas de la etapa implementada

URL: **http://localhost:3001/**, cuenta administradora y comercio de prueba.

1. **Alta básica:** Productos y stock → Agregar producto. Esperado: foco en Nombre, cinco campos principales y Más opciones cerrada. Completar nombre, código único, precio 1000, costo 600 y stock 10; guardar sin abrir Más opciones. Esperado: producto guardado con categoría/defaults existentes. La auditoría de guardado puede mostrar su advertencia anterior.
2. **Conservar atributos:** editar un producto con marca/proveedor, bulto 24, etiquetas y bajo margen. Esperado: resumen de configuración con el desplegable cerrado. Cambiar solo precio y guardar; volver a editar y abrir Más opciones. Esperado: mismos valores secundarios, stock sin cambios y código conservado.
3. **Error dentro de opciones cerradas:** con los básicos válidos, abrir Más opciones, ingresar 0 como Unidades por bulto y cerrarla. Pulsar Guardar producto. Esperado: se abre la sección, foco y mensaje de validación en el campo; no se guarda. Repetir con aviso de stock negativo; corregir antes de continuar.
4. **Unidades:** en un producto de prueba cambiar Unidad a Kilo o Litro, plegar opciones y mirar los básicos. Esperado: precio/costo por kg o litro y stock en kg o litros; no se cambia la regla actual de cantidades ni el multiplicador de reposición.
5. **Teclado:** recorrer con Tab; abrir el resumen con Enter, agregar una etiqueta con Enter y cerrar opciones con Escape. Esperado: etiqueta agregada sin guardar; Escape enfoca el resumen sin perder datos. En Código, el Enter del lector no envía el producto. Tab hasta Guardar y Enter sí inicia el guardado validado.
6. **Ayuda opcional:** escribir nombre/código/precio y cambiar foco. Esperado: solo lookup determinista por código cuando se cumplen sus condiciones actuales, sin sugerencias IA generativas por blur. Pulsar Sugerir datos con IA; no aplicar nada y comprobar que los campos no cambian. Cambiar el borrador durante una respuesta pendiente: una respuesta vieja no debe presentarse para el producto nuevo.
7. **Móvil:** repetir alta y abrir/cerrar opciones en pantalla estrecha. Esperado: campos en una columna, sin desborde horizontal, acciones accesibles y desplegable operable con teclado virtual. Comprobar movimiento reducido al abrir el editor.

Los conteos y la facilidad de uso posteriores todavía no fueron medidos en navegador ni con personas; quedan por registrar al ejecutar estos casos.

## 12. Revisión integrada de los cinco cambios

Revisión del repositorio local del 19/10/2026. Evidencia: lectura acotada de componentes, handlers, payloads, caché offline y SQL local. No es una prueba de usabilidad con personas ni una ejecución de los recorridos en navegador. Los conteos siguientes se deducen del código y deben contrastarse manualmente; no se midieron tiempos, satisfacción ni tasa de éxito.

### Correcciones de integración

- Productos y Transferencias conservan sus componentes al cambiar de sección principal, incluidos producto, reposición, importación y transferencia en preparación. Los efectos de foco y la carga de transferencias respetan la pantalla activa. Los diálogos ocultos no bloquean el lector, los atajos ni el desplazamiento móvil; al volver al editor con un diálogo abierto, el foco vuelve a ese diálogo. Los títulos de importación CSV no comparten ID entre el inicio guiado y el catálogo.
- Caja mantiene su formulario durante la carga de movimientos. Una respuesta tardía de otro turno se descarta, para no presentar sus ventas/movimientos bajo el contexto nuevo. Cambiar de caja/turno sigue cambiando el formulario correspondiente; no se trasladan conteos entre turnos.
- Retomar el inicio guiado queda bloqueado mientras hay carrito, con explicación. La carga inicial también consulta la intención vigente antes de abrirse; una respuesta tardía no lo abre encima de una venta o consulta al asistente. Configurar después permite salir localmente sin conexión, sin acreditar tareas: si no se pudo guardar esa preferencia en el servidor, se informa al retomar en Mi comercio.
- Ayuda funciona aunque falle la consulta del estado de onboarding. Abrir un aviso de la PWA cierra la asistencia general antes de navegar. El aviso inicial de activación de notificaciones se limita a Mi comercio → Más opciones → App y avisos, sin carrito ni operación en curso; los controles existentes de permisos e instalación se conservan.
- Un enlace de administración abierto con un cajero vuelve a Vender, en vez de dejar una pantalla vacía. Las restricciones siguen en RLS/RPC; esta navegación no concede permisos. El estado vacío de Vender dice Ir a Productos porque ese acceso lleva al catálogo, donde está Agregar producto.

Se conservaron el payload completo al editar productos, la comprobación de stock concurrente, la conversión de bultos, la separación de bajo margen, el cierre y sus confirmaciones, los contratos de venta y la cola offline. No se modificaron precios, fórmulas, tablas, RPC, permisos ni datos en esta revisión.

### Antes / después: acciones obligatorias deducidas

Se usa la regla de la sección 6: una acción por entrada completa, botón, opción, escaneo o confirmación; no se cuentan Tab, scroll ni espera. Sesión preparada, permisos correctos, sin errores, escritorio salvo indicación, secciones inicialmente en su vista predeterminada. No es una medición observada ni un mínimo universal.

| Caso | Antes | Después y secuencia verificable |
| --- | --- | --- |
| T1 Ingreso de cajero asignado | 3 | 3: email → contraseña → Ingresar. |
| T2 Apertura con $2.000 desde Vender | 3 | 3: Abrir turno → efectivo 2000 → Abrir turno. Regresa automáticamente a Vender. Con 0 aceptado son 2, sin apertura automática. |
| T3 Venta por lector/F1 tras T2 | 3 | 2: escanear → F1. Si se abrió desde Caja sin venir de Vender, sumar Vender. |
| T4 Efectivo exacto táctil | 3 | 3: producto → Monto exacto → Cobrar. En móvil sumar Ver venta si el cobro no está visible. |
| T5 QR táctil | 4 | 4: producto → QR → confirmación de pago recibido → Cobrar; posible cambio de vista móvil adicional. |
| T6 Cierre desde Vender | 4 | 4: Caja → efectivo contado → Confirmar cierre → confirmación del navegador. Sin IA obligatoria. |
| T7 Alta con costo y stock | 8, o 9 con advertencia IA | 8: Productos → Agregar producto → nombre → código → precio → costo → stock → Guardar producto. Sin consulta generativa al guardar. |
| T7b Alta conservando costo/stock 0 | 6, o 7 con advertencia IA | 6. Conservar defaults no significa que sean los datos correctos de un producto real. |
| T8 Editar solo precio | 4, o 5 con advertencia IA | 4: Productos → Editar → precio → Guardar producto. Más opciones queda cerrada y sus valores siguen en el payload. |
| T9/T10 Reposición desde catálogo | 3 / 4 | 3 para unidades; 4 para bultos: Reponer → Ingresar por bultos → cantidad 2 → confirmar. Con bulto de 24, preview +48 unidades. |
| T11 Nombre del comercio | 3 | 4: Mi comercio → Editar datos del comercio → nombre → Guardar cambios. El formulario ya no está siempre abierto. |
| T12 Segunda sucursal | 4 | 6 con local/caja únicos: Mi comercio → Locales y cajas → Administrar locales y cajas → Agregar sucursal → nombre → Crear sucursal. Con administración de locales ya visible: 5. |
| T13 Lista global +10% | 5 | 6: Productos → Listas de precios → Crear lista → nombre → ajuste 10 → Crear lista. Elegir alcance de sucursal agrega una acción. |
| T14 Remito solo foto | 5 | 5; conserva envío para revisión y no acredita stock antes de aprobar. |
| T15 Consulta general | 3 | 4: Ayuda → Consultar al asistente → pregunta → Enviar. En móvil sumar abrir el menú de cuenta si está cerrado. |
| T16 Comercio nuevo listo para vender | 14 | 12: nombre → Crear comercio → Confirmar y continuar → cinco datos del producto → Guardar producto → Continuar → efectivo inicial → Abrir turno. Supone bootstrap válido, nombre sin corregir, costo/stock ingresados y apertura/avance exitosos. |

El recorrido comparable T1 + T2 + T3 + T6 pasa de 13 a 12 acciones deducidas al entrar a abrir desde Vender. La simplificación también agrega aperturas intencionales de editores de configuración y un acceso secundario a IA. No se presenta eso como una mejora de facilidad de uso ya comprobada. Un retiro agrega sus campos/confirmación al recorrido; no está incluido en esa suma.

### Accesos definitivos

| Necesidad | Acceso actual y alcance |
| --- | --- |
| Producto básico / atributos avanzados | Productos → Agregar producto o Editar → Más opciones para categoría, marca, proveedor, código de proveedor, etiquetas, unidad, bulto, margen, ícono y aviso de stock. |
| Reposición | Reponer en la fila; Historial reposición, Carga masiva (CSV), Ajustar precios e Importar factura de compra en Más herramientas. Procesamiento, vinculaciones, memoria de proveedor y propuestas de precios permanecen en factura/remito. |
| Remitos pendientes | Administrador: Productos, panel de pendientes. Cajero: Remito para capturar/enviar según permisos. |
| Listas y precios fijos | Ubicación principal: Productos → Listas de precios. Consultar precios y editar precios fijos abre la consulta; cada precio fijo se edita por intención. Mi comercio → Más opciones ofrece un enlace al mismo editor. |
| Transferencias | Productos → Transferencias, con origen/destino y registro auditado; no crea inventarios separados por sucursal. |
| Turno y ventas | Caja → Mi turno / Ver ventas para administrador. Cajero: turno y movimientos propios según backend, conteo a ciegas al cerrar. |
| Datos y locales | Mi comercio → Datos del comercio / Locales y cajas. Un local y una caja se presentan como resumen; Administrar locales y cajas descubre también la segunda sucursal. |
| Equipo | Mi comercio → Personas con acceso. Agregar persona para propietario; asignaciones de cajeros según rol. No es obligatorio crear empleados para operar. |
| Registros de ventas | Mi comercio → Más opciones → Registros de ventas. Agrupan ventas; no son puestos ni establecen condición fiscal. |
| PWA y notificaciones | Mi comercio → Más opciones → App y avisos; instalación también conserva su aviso global existente. Los enlaces de notificaciones abren la sección destino. |
| IA | Ayuda → Consultar al asistente; desde ahí, análisis completo para administradores. Productos conserva ayudas explícitas y Caja → Ver ventas → Explicar estos resultados conserva métricas del informe y generación voluntaria. |
| Retomar inicio | Mi comercio → Inicio del comercio → Retomar configuración. Requiere carrito vacío y conexión para guardar avance. |

### Guía de Pruebas integrada — pendiente de ejecución manual

Abrir **http://localhost:3001/**. Usar cuentas y comercio de pruebas; no realizar ventas ficticias en producción. Preparar propietario, administrador y cajero asignado; producto con stock y otro con bulto 24, bajo margen, proveedor y etiquetas; segundo local/caja y lista distinta. Registrar rol, entorno, estado inicial, acciones, mensaje exacto y resultado por caso.

1. **Administrador nuevo.** Crear comercio con nombre único: esperar sucursal Principal, Caja principal, categorías y registros iniciales, sin duplicados. Confirmar nombre: esperar Tus productos sin listas/equipo/IA obligatorios. Cargar cinco campos y guardar: esperar producto persistido; retroceder y volver con otro borrador, que debe seguir escrito. Continuar, ingresar efectivo y abrir: esperar Vender en la misma caja, con un solo turno. Repetir Configurar después, recarga y reanudación desde otro dispositivo: esperar avance compartido y datos ya guardados, no los campos sin guardar. Enviar simultáneamente desde dos dispositivos y simular respuesta perdida: esperar conflicto/reutilización, nunca recursos o turnos duplicados. Cortar conexión en la guía y salir: esperar acceso a la app y ninguna tarea acreditada por salir. Tienda anterior, incluso sin productos: no debe abrir la guía.
2. **Cajero asignado.** Ingresar: esperar contexto de su sucursal/caja sin selector de opción única ni accesos administrativos. Abrir desde Vender con 2000: esperar retorno a Vender. Escanear y F1: esperar venta única, carrito limpio y foco de lector; repetir F2/F3 y Mixto/F4 con reparto válido. En Caja, cargar un retiro con importe/motivo, navegar a Vender y regresar antes de enviar: esperar borrador conservado; registrarlo y comprobar resultado. Ingresar efectivo contado, Confirmar cierre y aceptar: esperar cierre confirmado sin IA, efectivo esperado ni diferencias visibles al cajero. Con otra cuenta, ocupar su caja: esperar bloqueo de apertura; comprobar en backend que no puede leer movimientos ajenos ni saltar asignaciones mediante una petición directa.
3. **Administrador existente.** Editar únicamente precio del producto con bulto/bajo margen/proveedor/etiquetas, ir a Caja y volver: esperar edición conservada; guardar, reabrir Más opciones y comparar todos los atributos. Introducir un bulto inválido, plegar y guardar: esperar sección abierta y error enfocado, sin escritura. Reponer dos bultos: esperar +48 unidades y costo/proveedor según los datos elegidos. Revisar un remito pendiente: esperar stock sin incremento antes de aprobar y comprobantes privados. Caja → Ver ventas: esperar ventas y separación de margen intactas. Probar factura, CSV y propuesta de precios con datos de prueba; cancelar debe conservar los otros borradores.
4. **Varias sucursales.** Con carrito, intentar cambiar sucursal/caja/lista/registro y retomar inicio: esperar controles bloqueados con explicación y venta intacta. Vaciar o terminar la venta; cambiar local: esperar lista predeterminada de ese local y cajas permitidas, con caja ocupada identificada. Crear/editar sucursal, caja y lista desde sus accesos; abrir otro editor y cancelar solo ese: esperar el primer borrador conservado. Ir desde Mi comercio a listas: esperar el mismo editor principal. Preparar transferencia, salir a Caja y volver: esperar origen/destino/artículos/notas conservados; stock total compartido sin alteración visual.
5. **PWA móvil y teclado.** Abrir editor con teclado virtual: esperar campos, Guardar y Cancelar alcanzables sin desborde. Probar Tab, Enter del lector, Escape y los botones Volver del inicio. Abrir un diálogo de producto, cambiar de sección cuando la interfaz lo permita y regresar: esperar borrador y foco en el diálogo; en Vender los diálogos ocultos no bloquean lector/scroll. Abrir/cerrar IA desde Ayuda: esperar foco dentro del panel abierto y lector operativo al cerrarlo. Abrir aviso de stock/cierre/App: esperar destino correcto y asistente cerrado, sin cambiar un carrito pendiente. Visitar App y avisos: comprobar instalación/activación solo por acción y sin dos diálogos de permisos simultáneos. Repetir con movimiento reducido. Probar Atrás del sistema por separado: la navegación interna usa estado React, no un historial de rutas; Atrás puede salir de la app y no se promete recuperar borradores no guardados tras salir/recargar.
6. **Offline preparado y fallos de herramientas.** Con conexión, abrir/preparar caja y cargar configuración/stock/lista; cortar red, vender y consultar cola: esperar operación local y estado pendiente de sincronizar, sin cambiar contexto/precios. Reconectar: esperar sincronización sin venta duplicada y confirmación del estado final. Intentar editar configuración, enviar remito/transferencia o consultar IA sin red: esperar explicación dentro de su herramienta y posibilidad de seguir en caja. Quitar configuración de Groq en entorno de prueba o bloquear solo su endpoint: alta manual, venta, movimiento y cierre deben seguir independientes. Verificar también recarga offline con caché existente y mensaje de preparación cuando falten datos.

### Migraciones, validación y pendientes reales

- Esta revisión no agrega SQL ni aplica migraciones remotas. Sigue pendiente de aplicación/validación en el entorno correcto [202610190001_store_onboarding.sql](../supabase/migrations/202610190001_store_onboarding.sql), preparada en la etapa anterior. Aplicarla después de sus migraciones previas y antes de habilitar la creación guiada; ver [inicio-guiado.md](inicio-guiado.md). Sin esa RPC, Crear comercio muestra una indicación de migración necesaria. No insertar estados retroactivos para comercios anteriores.
- El repositorio también contiene cambios locales previos en `202610160004_margin_groups.sql`. No se consultó qué migraciones tiene la base real: revisar el historial remoto y la guía de Supabase del proyecto antes de aplicar archivos, sin ejecutar migraciones indiscriminadamente.
- Comprobación ejecutada en esta revisión: `npx tsc --noEmit -p tsconfig.app.json`, finalizó sin errores (código de salida 0). No se ejecutaron builds ni otras pruebas automatizadas.
- Pendiente: todos los recorridos manuales anteriores, RLS/RPC efectivas, idempotencia y concurrencia real, persistencia desde otro dispositivo, entrega push, permisos del sistema, foco/teclado móvil, offline y sincronización. TypeScript no verifica estos comportamientos.
- Límite de persistencia: los borradores se conservan al navegar internamente en el mismo comercio y sesión montada. Recargar, salir de la app, cambiar comercio/cuenta o cambiar el contexto del turno no equivale a guardar un formulario. El avance guiado compartido guarda pasos y registros persistidos, no campos sin enviar. Los precios fijos de listas conservan el editor al navegar a otra sección; cambiar lista/filtro puede desmontar sus filas, por lo que se deben guardar o cancelar antes de cambiar esa consulta.

### Observación breve con una persona nueva — no realizada

En un comercio de pruebas preparado, pedir únicamente: «Creá este producto con estos datos; cobrá una unidad; cerrá tu turno contando este efectivo». No indicar botones ni explicar términos. Observar sin intervenir salvo riesgo de datos reales. Registrar cada detención, el control que busca, los textos que pregunta o interpreta de otra manera, errores y recuperación; separar observación de interpretación del observador. Al terminar, preguntar qué esperaba que hiciera cada texto confuso. Usar esos hallazgos para decidir ajustes posteriores; esta revisión de código no sustituye esa prueba ni permite afirmar que las personas completan las tareas sin ayuda.

## 13. Jerarquía visual de Vender y Caja

Implementación acotada posterior a la revisión integrada, conservando paleta y componentes. Cambios de código en `PosTab.tsx`, `CashDesk.tsx`, `RetailApp.tsx`, `workspace.css` y `mobile-native.css`. No se modificaron API, SQL, fórmulas, datos, permisos ni sincronización. Los cambios previos del repositorio siguen presentes.

### Presentación implementada

- **Vender:** zonas identificables de productos, carrito y total/cobro. En escritorio se conserva la distribución de productos y venta en dos columnas. El cobro tiene fondo de la paleta actual, título propio y botón principal más grande. El importe manual sigue junto al buscador, con su acción de agregar como secundaria.
- **Contexto:** sucursal, caja y estado se presentan una vez en la franja del workspace. Si hay alternativas autorizadas, Cambiar sucursal o caja despliega los selectores existentes; siguen bloqueados con carrito. Lista y registro se conservan en una franja secundaria de la venta, fuera del bloque de cobro. No se solicitan elecciones adicionales para operar con los valores ya válidos.
- **Ayuda:** Atajos de teclado despliega la explicación completa sin quitar F1–F4, Ctrl+K ni Escape. Filtros, categoría, botonera y acceso a importe manual siguen disponibles.
- **Móvil:** Productos / Venta conserva cantidad y total en el acceso a la venta. Ver venta lleva el foco y el desplazamiento al panel; volver a Productos recupera el buscador. Los movimientos respetan la preferencia de movimiento reducido. El carrito tiene una altura de consulta limitada y desplazamiento propio para acercar el cobro; con teclado visible se compacta más. El botón Cobrar permanece en el flujo del documento, sin agregar otra barra fija que cubra inputs. Continúa la ocultación de la navegación inferior y barra de carrito durante el teclado virtual.
- **Caja:** al abrir un turno, el efectivo inicial ocupa un formulario de ancho acotado. Con turno abierto se ofrecen Registrar ingreso o retiro y Cerrar turno, con una frase que explica cada tarea. Solo se muestra el formulario elegido, pero ambos permanecen montados: cambiar de tarea o volver a las acciones conserva lo escrito. El foco llega al título de la tarea y vuelve al acceso al regresar.
- **Cierre:** el acceso Cerrar turno desde Vender abre directamente el conteo, incluso si anteriormente se estaba registrando un movimiento. Conserva bloqueo por carrito/movimiento pendiente, validación del importe, confirmación del navegador y arqueo a ciegas. La confirmación de éxito identifica el conteo guardado. La explicación IA queda debajo del formulario, con estado y reintento propios.
- **Consulta:** resumen del turno, ventas, ingresos/retiros y cierres anteriores son desplegables después de las acciones. Se conservan todas las métricas y la visibilidad por rol. Ver ventas del administrador sigue en la navegación existente de Caja.

### Efecto en los recorridos

La apertura y el cobro conservan sus acciones obligatorias. Entrar por Caja para cerrar requiere ahora elegir Cerrar turno antes de ingresar el conteo: son 5 acciones desde Vender si se recorre Caja → Cerrar turno → conteo → Confirmar cierre → confirmación del navegador. El acceso directo Cerrar turno de la franja de Vender sigue siendo una ruta de 4 acciones, porque abre la tarea directamente. Estos conteos actualizan T6 de la sección 12 y son deducciones del código, no observaciones con personas. Consultar contexto editable, resumen o historial requiere desplegarlos; esa reducción de información inicial no equivale a una mejora medida de usabilidad.

### Guía de Pruebas de esta entrega

URL: **http://localhost:3001/**. Pendiente de ejecución por el usuario en comercio de pruebas, con cajero y administrador. No realizar ventas ficticias en producción.

1. **Apertura:** en Vender sin turno, pulsar Abrir turno, ingresar 2000 y confirmar. Esperado: misma sucursal/caja y retorno a Vender; no se exige elegir lista/registro ya resueltos ni se abre automáticamente. Con una sola caja no aparece Cambiar sucursal o caja innecesariamente.
2. **Lector y teclado:** escanear un producto con stock y cobrar con F1 exacto. Esperado: venta única, carrito limpio y foco recuperado. Repetir F2/F3 y Ctrl+K; desplegar Atajos de teclado para consultar su efecto. Probar importe manual y botonera, sin cambiar sus cálculos.
3. **Mixto:** agregar productos, F4, ingresar primer importe y segundo medio, confirmar con F4 o confirmar ambos pagos y Cobrar. Esperado: reparto y total originales, sin envío con reparto inválido. En efectivo, ingresar menos del total: Cobrar debe seguir bloqueado y explicar qué falta.
4. **Retiro y borradores:** Caja → Registrar ingreso o retiro; elegir retiro, completar importe y motivo. Pasar a Cerrar turno, escribir un conteo, volver al retiro y navegar a Vender/Caja. Esperado: ambos borradores conservados en ese turno. Registrar el retiro: esperar confirmación; un formulario oculto no produce validaciones ni recibe Tab. Mantener comprobante obligatorio para pago a proveedor y privacidad del acceso.
5. **Cierre:** desde Vender pulsar Cerrar turno; esperar foco en la tarea de conteo, sin escogerla nuevamente. Con carrito pendiente, el cierre debe seguir bloqueado. Terminar/vaciar la venta, contar efectivo, Confirmar cierre y aceptar la confirmación. Esperado: cierre guardado y mensaje con el conteo, sin esperar IA. Como cajero, nunca mostrar esperado/diferencia; como administrador, conservar ambos. Consultar cierres anteriores desde su desplegable y verificar el registro.
6. **Caja ocupada y contexto:** con otra persona ocupando una caja, abrir Cambiar sucursal o caja y seleccionarla. Esperado: identificación de caja ocupada y restricciones de apertura intactas. Con carrito, los selectores permanecen bloqueados; al terminarlo, cambiar local aplica su lista según las reglas existentes. Desplegar lista/registro y comprobar identificación y permisos.
7. **Móvil:** alternar Productos / Venta con varios artículos, comprobar cantidad/total, desplazamiento del carrito y botones de cantidad. Abrir el teclado de efectivo y del pago mixto; esperar acceso por desplazamiento a Cobrar, sin barras inferiores sobre los campos. Volver a Productos y escanear; verificar foco. Repetir con zoom de texto, orientación horizontal, movimiento reducido y PWA instalada. Abrir/cerrar el asistente y un aviso: comprobar que no quedan capas invisibles bloqueando la venta.
8. **Offline preparado:** preparar turno/configuración con conexión, desconectar y registrar una venta. Esperado: comportamiento existente de cola local, contexto y precios conservados; reconectar y comprobar sincronización sin duplicados. Provocar un fallo de Groq: su error queda en la herramienta y no bloquea cobrar, registrar movimiento o cerrar.

### Validación y pendientes

El inventario del navegador devolvió cero navegadores disponibles. No se observó la interfaz renderizada ni se realizaron pruebas visuales, de teclado real, backend, móvil, offline o PWA. La guía anterior sigue pendiente y no se afirma una mejora de facilidad de uso comprobada con personas.

Comprobación de código ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas. No se agregaron ni aplicaron migraciones; permanece la migración local de onboarding y las limitaciones de persistencia detalladas en la sección 12.
