# Plan de simplificación de uso — estado vigente

Actualizado el 23/10/2026. Referencia de decisiones actuales, sin el historial de prompts y entregas anteriores. [Índice general](../README.md). La revisión de código no equivale a evaluación visual ni prueba de usabilidad con personas.

## Objetivo y criterios

Menos decisiones e información simultánea, manteniendo funciones, paleta y permisos reales. Cada tarea tiene un acceso principal claro. No agregar un modo simple/avanzado obligatorio, editores duplicados ni menús de botones que llevan a otro menú equivalente.

Caja es puesto de cobro; turno es período de trabajo con apertura/cierre; registro de ventas es una agrupación independiente del estado fiscal. Vender, guardar producto, registrar movimiento y cerrar turno no requieren IA.

## Accesos definitivos

| Tarea | Ubicación principal | Criterio vigente |
| --- | --- | --- |
| Vender | Vender | Búsqueda/lector y productos; carrito; total y cobro. Cobrar tiene prioridad con venta válida. |
| Comenzar sin turno | Vender → Abrir turno | Llegada directa a la caja correspondiente con contexto; confirmar efectivo, sin apertura automática. |
| Operar caja | Caja → Mi turno | Abrir turno, Registrar ingreso o retiro y Cerrar turno son tareas distintas. Historial e informes quedan secundarios. |
| Consultar ventas | Caja → Ver ventas / resumen permitido | Solo datos autorizados; cajero/supervisor conserva privacidad y arqueo a ciegas. |
| Productos | Productos → Catálogo y stock | Búsqueda/listado y Agregar producto. Editar y Reponer en cada fila. Formulario principal al crear/editar. |
| Atributos avanzados | Producto → Más opciones | Descubribles y conservados al editar precio. Errores plegados deben revelar y enfocar el campo. |
| Insumos y combos | Producto → Uso; Crear combo o paquete; Combo / sueltos | Solo insumo sin precio; costo compuesto automático; stock físico en componentes. |
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
| Crear pancho | Precio ficticio de ingredientes y costo manual del combo | Insumos con costo/stock → combo con precio → componentes → costo calculado. |
| Comercio de una caja | Formularios de varios registros abiertos y accesos repetidos | Resumen de local/caja → Administrar solo por intención, sin perder acceso al segundo local. |
| Cierre | El análisis podía retrasar la confirmación | Conteo → confirmaciones existentes → cierre guardado; resumen IA con estado/reintento independiente. |
| Inicio de comercio | Configuración dispersa y riesgo de duplicar recursos | Confirmar recursos creados → primer producto/omitir → apertura real/continuar turno válido. |
| Documentación/SQL | Prompts y guías duplicadas, instalación por archivos sueltos | Guías por tema y schema consolidado con historial; baseline explícitamente confirmado. |

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

En esta limpieza se generó el archivo SQL y se reorganizaron documentos. No se aplicó SQL remoto, no se alteró el código de la app, no se ejecutaron builds ni pruebas automatizadas, y no se probaron navegador, móvil o backend. Las comprobaciones TypeScript de entregas anteriores no acreditan estos recorridos ni la instalación remota actual.

Pendiente: validar schema en base nueva, adopción declarada y reejecución; permisos/RLS/Storage, concurrencia y otros dispositivos; comportamiento visual y foco en navegador/móvil; sincronización real; mensajes y accesos con perfiles distintos. Las reglas y límites detallados están en las guías enlazadas desde README.

## Observación breve con una persona nueva

Pedirle que cree un producto, cobre una venta y cierre su turno, sin indicarle dónde tocar. Observar dónde se detiene, qué acción espera y qué texto no entiende. Registrar intentos, ayuda solicitada y errores; recién después hacer preguntas. No se realizó esta observación ni se midió usabilidad con personas.
