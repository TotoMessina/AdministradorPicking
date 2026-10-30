# Ventas, caja y mercadería

Guía vigente consolidada. Los nombres de migraciones indican dependencias, no el estado remoto: usar [schema y su historial](../SUPABASE_SETUP.md), sin repetir archivos individuales. Las Guías de Pruebas son recorridos manuales en **http://localhost:3001/**; no acreditan pruebas ejecutadas.

- [Mi turno](#mi-turno)
- [Precios por sucursal](#precios-por-sucursal)
- [Registros de ventas](#registros-de-ventas)
- [Retiros y comprobantes](#retiros-y-comprobantes)
- [Remitos pendientes](#remitos-pendientes)
- [Transferencias](#transferencias)

## Mi turno

### Tickets y billetes al cerrar

**Cerrar turno** muestra la cantidad de tickets, incluyendo efectivo, QR, transferencia, tarjetas y mixtos. Un mixto cuenta como una venta. La consulta autorizada obtiene el total del turno sin exponer importes ni movimientos ajenos. Si esa consulta no está disponible, se aclara que se muestran las ventas disponibles en el dispositivo. El backend fija el total definitivo al guardar el cierre; otro dispositivo sin red no puede conocer ventas concurrentes todavía no cargadas.

**Detallar billetes (opcional)** permite indicar cantidades de $10, $20, $50, $100, $200, $500, $1.000, $2.000, $10.000 y $20.000. No exige completar todas ni registrar billetes. Muestra un subtotal y ofrece **Usar este total como efectivo contado**, sin cambiar automáticamente el importe principal. Puede ser un detalle parcial: el total contado incluye monedas/billetes sin detallar. La suma detallada no puede superar el contado. Cantidades enteras entre 0 y 1.000.000 por denominación; sin cantidades positivas se guarda sin desglose.

Desactivar el detalle lo excluye del guardado y de la validación, conservando el borrador si se vuelve a activar. Alternar tareas/navegar conserva el borrador mientras el turno permanezca montado. Tras un cierre exitoso se limpia. En **Actividad → Cierres → Ver cierre**, se consultan cantidad de tickets, billetes, subtotal, contado y resto sin detallar, junto a las ventas autorizadas. No se muestra esperado/diferencia al cajero/supervisor. Los cierres antiguos no inventan billetes ni se rellenan mediante una migración; su cantidad de tickets puede consultarse al abrir el detalle si hay conexión/datos preparados.

Requiere la migración local **`202610240001_shift_closing_details.sql`**, incluida en **schema.sql** después del baseline fijo confirmado hasta `202610230002`. No avanzar ese baseline. Agrega `closing_denominations` y `ticket_count` a turnos, valida el detalle y captura todos los tickets en la transacción de cierre. Reutiliza la función de cierre existente para permisos y saldo esperado, sin cambiar fórmulas. Conserva llamadas antiguas de dos argumentos y operaciones offline anteriores.

El cierre con billetes usa `close_details` en la cola y conserva el desglose en IndexedDB. Un servidor anterior rechaza ese tipo en lugar de descartarlo silenciosamente; la app informa que hay que actualizar schema y mantiene la operación. Reintentar la misma operación usa el recibo existente y no duplica ni reemplaza el cierre. El service worker sincroniza el mismo contenido; el servidor confirma el recuento definitivo. El detalle permanece asociado al turno y se comparte entre dispositivos según RLS, no solo en este navegador.

Esta migración y el schema se preparan localmente, sin ejecutarse contra Supabase. Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0); sin builds ni otras pruebas automatizadas. Las nuevas funciones, RLS, concurrencia, navegador, PWA real y segundo dispositivo requieren validación manual; TypeScript no valida SQL ni el service worker.

#### Guía de Pruebas — tickets y billetes

En **http://localhost:3001/**, después de aplicar schema en un comercio de pruebas:

1. Registrar una venta en efectivo, una QR y una mixta. Entrar a Cerrar turno: deben verse **3 tickets**, no 4. Repetir con débito/crédito/transferencia; cada ticket suma uno, cualquiera sea su medio o registro de ventas. Volver a consultar/imprimir un ticket no suma otra venta.
2. Cerrar sin activar billetes: conserva el conteo manual y sus confirmaciones, sin exigir ningún desglose. En el cierre guardado, `closing_denominations=null` y cantidad de tickets correcta.
3. En otro turno, cargar 2 billetes de $1.000 y 1 de $10.000. Esperado: subtotal **$12.000**. Usar este total completa el contado; cambiarlo a $12.050 permite registrar $50 sin detallar. Guardar y revisar Ver cierre, recargar y consultar desde otro dispositivo autorizado: conserva cantidades, subtotal y contado.
4. Ingresar contado $11.000 con esos billetes: debe rechazar antes de la confirmación y pedir revisar total/cantidades. Probar fracciones/negativos: validación visible. Desactivar detalle: no valida ni guarda sus campos ocultos; reactivarlo antes de cerrar conserva el borrador.
5. Alternar movimiento/cierre y navegar con cantidades a medio completar: no debe reiniciar contado ni billetes. Cancelar la confirmación o fallar la red mantiene el formulario; doble envío/reintento no duplica el cierre.
6. Con PWA/caja preparadas, cerrar con detalle sin red, recargar y reconectar. Esperado: cola y desglose conservados, envío único, tickets definitivos del servidor y detalle recuperable en otro dispositivo. No borrar datos del sitio con pendientes. Si falta migración, conserva el cierre con aviso de actualizar schema, sin descartarlo.
7. Cajero/supervisor: solo turnos autorizados, sin efectivo esperado ni diferencias. Otro comercio no puede consultar contador/billetes ni cerrar ese turno mediante RPC. Revisar móvil/teclado, cierre antiguo sin desglose y fallo de IA sin bloquear cierre.

### Organización de Mi turno

**Caja → Mi turno** muestra el resumen sin desplegarlo. **Registrar movimiento** y **Cerrar turno** alternan formularios en el mismo espacio, sin descartar el importe, motivo, adjunto o conteo pendiente. Ingreso/Retiro se elige con botones; categoría y comprobante conservan sus condiciones. Un perfil sin movimientos habilitados accede directamente al cierre.

**Actividad del turno** concentra Movimientos, Ventas y Cierres; no hay cuatro acordeones abiertos a la vez. Con ancho suficiente se ubica junto al formulario; en pantallas menores, debajo. Ventas/cierres se convierten en fichas con etiquetas si el propio panel es angosto. Sin turno se prioriza el efectivo inicial y el historial queda secundario. No cambia autorización, asignación, efectivo esperado, stock ni sincronización. El cajero conserva conteo a ciegas y solo datos autorizados; la explicación IA sigue siendo voluntaria e independiente.

### Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, con cuentas y datos de prueba:

1. Sin turno: entrar desde Vender, confirmar efectivo inicial y abrir. Esperado: apertura directa en caja asignada y regreso a Vender; una caja ocupada bloquea apertura y ofrece Actualizar cajas, sin abrir automáticamente.
2. Con turno: entrar a Mi turno. Esperado: resumen visible, movimiento listo para completar y actividad en un único panel. Alternar con flechas/Inicio/Fin en las pestañas y Tab en campos: foco visible y ninguna validación de paneles ocultos.
3. Escribir importe/motivo y elegir Retiro → Pago a proveedor con adjunto. Volver a tocar Retiro ya seleccionado: no debe borrar categoría, proveedor ni archivo. Cambiar a Cerrar turno, ingresar conteo, navegar a otra pantalla y volver. Esperado: ambos borradores y archivo conservados mientras no cambie el turno; al guardar un movimiento se limpia solo su formulario.
4. Registrar ingreso y retiro con los permisos correspondientes. Esperado: una operación por envío, confirmación y lista actualizada. Si falla red/adjunto, mensaje accionable y borrador conservado. Sin permiso no hay botón ni escritura habilitada.
5. Cerrar con carrito pendiente: debe bloquear y permitir Volver a Vender. Resolver la venta, ingresar conteo y confirmar cierre: mantiene la confirmación existente y el mensaje de conteo guardado. Cajero/supervisor no ve esperado/diferencia; administrador conserva esos datos. Un fallo de IA no impide cerrar.
6. Probar Movimientos/Ventas/Cierres, Ver ticket, Ver ventas de un cierre y comprobante autorizado. Esperado: mismos datos y permisos, estado vacío claro cuando no hay cierres, ningún acceso a movimientos/archivos ajenos.
7. Revisar 320/390 px, tableta y escritorio amplio; también zoom 200% y teclado virtual. Esperado: una o dos columnas según espacio real, fichas legibles en panel angosto, botones alcanzables y sin desplazamiento horizontal de toda la página. Comprobar navegación de tablas con lector de pantalla y movimiento reducido.
8. En una PWA previamente preparada, registrar movimiento y cerrar offline en datos de prueba; reconectar. Esperado: cola/reintentos existentes, sin duplicaciones. Un nuevo adjunto sigue requiriendo conexión y turno sincronizado. La recarga offline completa no se valida con el servidor Vite.

Comprobación ejecutada del ajuste: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas. Este ajuste no prepara migraciones. Navegador, móvil, backend y offline real quedan pendientes; las guías anteriores no acreditan pruebas ejecutadas de esta presentación.

<a id="precios-por-sucursal"></a>

## Lista Principal y precios por sucursal

Dependencias incluidas en schema: reglas de sucursal, árbol 004, eliminación 005 y [Principal por porcentaje](../supabase/updates/202610270002_primary_product_markup.sql). Para la base conciliada, aplicar los paquetes de updates en orden según [Instalación](../SUPABASE_SETUP.md#actualización-individual-después-de-conciliar-34-migraciones), sin ejecutar fuentes sueltas. No se aplicó SQL remoto durante estos cambios.

**Productos → Listas de precios** muestra **Costo → Principal → derivadas**. Costo es solo consulta. Principal es única y global: los productos nuevos usan costo más su porcentaje; los anteriores conservan su precio manual hasta convertirlos desde Editar producto. **Crear lista** parte de Principal; **+ Lista** en otra lista crea una hija. Mayorista, Comerciante o Empleados pueden tener distintas ramas, siempre desde Principal. Principal se puede renombrar, pero no eliminar, desactivar ni restringir a un local; su porcentaje se define por producto.

Cada derivada elige Principal u otra lista como origen, un ajuste general y reglas opcionales por categoría, marca y producto. Los ajustes se aplican **en cadena**, en ese orden, redondeando a centavos en cada paso: costo $100, producto +30% → Principal $130; derivada +50% → $195; marca −10% → $175,50. No es un porcentaje de margen sobre venta. Cada destino admite una regla por lista. Un precio fijo reemplaza el cálculo completo para ese producto en esa lista; una derivada aplica luego sus propios ajustes sobre ese importe heredado. Vaciar el fijo recupera el cálculo.

Los cambios de costo recalculan el precio principal de productos con porcentaje; los manuales conservan su importe. Las derivadas reflejan cambios de precio/origen sin modificar tickets anteriores. Tocar el nombre consulta sus precios: el árbol es el selector, sin un segundo desplegable de listas. **Editar** o **+ Lista** abre el formulario en el lugar de la tabla. Alternar consulta/editores conserva borradores; **Continuar** recupera una edición y Cancelar descarta solo la elegida. Los porcentajes se cargan con **Aumentar / Descontar** y un número positivo; el valor guardado y el cálculo en cadena se conservan. **Agregar ajuste** incorpora categoría, marca o producto; la búsqueda de destino aparece cuando hay más de 100 opciones. La vista previa permanece visible y permite buscar un producto, sin guardar. Sucursal y disponibilidad están en **Más opciones**, con un resumen visible; sus controles plegados quedan deshabilitados y un error de sucursal revela/enfoca el campo. Los detalles se consultan en **Cómo se calcula**, sin párrafos explicativos abiertos de inicio.

La creación conserva un UUID entre reintentos y el backend verifica la revisión para evitar sobrescribir una lista editada desde otro dispositivo. Ante conflicto, actualizar datos y revisar/cancelar esa edición para abrir la versión actual; no se combina ni sobrescribe automáticamente.

**Editar porcentajes:** tocar el porcentaje con lápiz abre el formulario y enfoca el ajuste general, desde el árbol o la consulta. **Editar / Continuar** mantiene el acceso a nombre, origen, ajustes por categoría/marca/producto, sucursal y disponibilidad. Guardar mantiene el ID y los demás campos; Cancelar no escribe. Eliminar un ajuste específico con × no elimina la lista.

**Eliminar listas:** **Editar → Eliminar → Eliminar lista** pide una confirmación separada del guardado. Cancelar vuelve al mismo borrador. Si tiene listas derivadas (incluso inactivas), muestra cuáles y ofrece abrir su edición: hay que cambiar su origen o eliminarlas primero. El backend aplica la misma restricción; no hay eliminación en cadena ni reasignación automática. Costo es solo consulta. Principal se conserva y no admite fijos: se edita el precio o porcentaje del producto.

Eliminar hace una baja lógica: la lista desaparece de configuración/venta y queda inactiva, con `deleted_at` y `deleted_by` en Supabase. Conserva ID, reglas, fijos y referencias de tickets; los nombres e importes históricos no cambian. El nombre puede reutilizarse en una lista nueva con otro ID. RLS excluye las eliminadas y sus fijos de las lecturas de la app; las RPC rechazan editarlas o usarlas como origen, aunque el cliente tenga datos viejos. Se requiere `manage_price_lists`, conexión y operaciones locales sincronizadas. No se agregan permisos ni se modifica la fórmula de precios.

Si era la lista activa de una sucursal, la confirmación avisa que las próximas ventas usarán Principal. Los carritos iniciados se conservan y exigen revisar una lista eliminada, sin repriciar automáticamente. La caché local retira la lista/fijos y su regla de sucursal tras confirmar el servidor, con revisión para impedir que una lectura anterior la reponga. En otro dispositivo offline puede quedar visible hasta actualizar; su sincronización se rechaza si la venta aún no estaba guardada y requiere revisión, conservando el pendiente. Un reintento de una venta ya registrada sigue devolviendo su recibo habitual. Reintentar una eliminación confirmada no cambia fecha/autor ni duplica acciones; una revisión distinta por otra edición bloquea la baja.

**Cambio autorizado al instalar 202610270002:** se crea Principal por comercio y las listas existentes que partían de Costo o Catálogo pasan a depender de ella. Se conservan porcentajes, reglas, precios fijos, ramas, IDs y asignaciones. Sus precios se recalculan: antes costo $100 con +50% daba $150; si Principal vale $130, ahora da $195. Los fijos siguen prevaleciendo. Si ya existe el nombre Principal, se usa un nombre disponible. No se reescriben productos anteriores ni tickets. Se conserva el límite de 12 niveles: si agregar Principal lo supera, la actualización se revierte y exige revisar el árbol; no se aplana ni borra información. Un costo faltante bloquea solo los productos que dependan de él, con mensaje para cargarlo; no usa costo cero como precio ni inventa un precio alternativo. El fijo explícito de esa lista puede definir un precio sin depender del costo.

**Listas desde Costo (202610270004):** además de derivar de Principal, una lista nueva puede partir de **Costo** (botón **Derivar lista** en Costo de reposición, o **Desde → Costo** al editar). Costo $100 con +30% da $130 y sigue al costo del producto; sin costo cargado ese producto muestra el aviso en lugar de precio, salvo un fijo. La actualización solo cambia la validación del backend: no mueve ni recalcula las listas existentes. No se admiten nuevas raíces de Catálogo porque equivalen a Principal. Interfaz, backend y venta sin conexión calculan igual; crear o editar listas sigue requiriendo conexión.

**Consultar una lista:** muestra costo y precio en la lista, solo de los productos con cambios propios (precio fijo o ajuste por categoría/marca/producto; en Principal, porcentaje sobre costo), con el cambio indicado bajo el precio. Paginado de a 20 con Anterior/Siguiente. **Mostrar → Todos los productos** permite ver el resto y fijarles precio. Costo de reposición muestra todos los productos.

En **Productos y stock → Listas de precios**, cada lista tiene un campo **Sucursal**:

- **Todas las sucursales**: lista global. Un administrador puede elegirla desde cualquier local.
- Una sucursal concreta: lista exclusiva de ese local, seleccionada automáticamente en el POS mientras esté activa.

Cada sucursal admite una sola lista exclusiva activa. Puede tener varias inactivas para conservar configuraciones anteriores. Para asignar otra, desactivar la actual o cambiarla a global. Si no hay ninguna activa asignada, se usa **Principal**. Las asignaciones existentes se conservan. Una lista global puede originar listas globales o de sucursal; si el padre es exclusivo, sus hijas deben pertenecer a ese mismo local. Conviene mantener Base/Mayorista/Empleados globales y derivar la lista predeterminada de cada local cuando corresponda.

La lista de sucursal puede usar los mismos orígenes y reglas que las globales. Desactivar y reactivar conserva configuración y asignación. Una lista inactiva no se elige para vender, pero sus hijas siguen usando sus reglas como origen; no se borran relaciones ni se cambia de origen silenciosamente. No se permiten ciclos, padres de otra tienda ni más de 12 niveles.

Al entrar al POS o cambiar de local, la app consulta la regla de la sucursal antes de permitir el cobro. El administrador puede cambiar a otra lista válida para ese local o a Principal; su elección se conserva al actualizar datos en esa misma sucursal. Al cambiar de sucursal, se vuelve a aplicar el valor predeterminado del nuevo local. El cajero utiliza la lista asignada, sin cambiarla manualmente. Si hay productos en el carrito, se mantiene la confirmación para descartarlos antes de cambiar de local y el bloqueo para cambiar de lista durante el cobro.

Supabase valida la regla en la misma transacción del checkout y la sincronización offline. Rechaza una lista exclusiva de otro local y exige al cajero la regla de su sucursal. Un error revierte también el descuento de stock. Los reintentos de ventas ya registradas no vuelven a cobrarse ni se rechazan por cambios posteriores de asignación. La lectura queda limitada a miembros del comercio; la edición requiere administración o el permiso delegado manage_price_lists. La relación sucursal/lista impide asignar sucursales de otro comercio.

En modo offline se usa la asignación del catálogo local preparado en ese dispositivo. Si cambió en el servidor durante una desconexión, la sincronización puede requerir revisar los pendientes, como los demás cambios de precio. No se altera el historial de ventas ni se actualizan automáticamente sus importes al modificar listas.

### Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador.
2. Tener dos sucursales B1 y B2. Crear una lista **Precios B1**, asignarla a B1 y usar ajuste +20%. Mantener B2 sin lista exclusiva activa.
3. Abrir turno en B1: un producto de la madre a $100 debe mostrarse a $120 y el selector debe indicar **Precios B1**. Si hay un precio fijo para ese producto, debe prevalecer.
4. Cambiar a B2: debe usar la madre a $100 y no ofrecer la lista exclusiva de B1. Volver de B2 a B1: debe seleccionar nuevamente **Precios B1**.
5. Como administrador, elegir una lista global y tocar **Actualizar datos**. Debe conservar la elección mientras permanezca en B1. Volver a cambiar de sucursal debe restablecer el valor predeterminado.
6. Entrar como cajero: comprobar selección automática y selector bloqueado. Intentar asignar dos listas activas a B1 debe mostrar un error; desactivar la actual debe permitir usar la madre o activar otra.

### Guía de Pruebas — árbol de listas, pendiente manual

En **http://localhost:3001/**, con schema actualizado y datos de prueba:

1. Producto con costo $100 y porcentaje 0 (Principal $100): **Crear lista** → Base, desde Principal, **Aumentar 50%**. En Base, **+ Lista** → Mayorista, **Descontar 10%**; Comerciante desde Base con descuento 5%; Empleados desde Principal con aumento 10%. Esperado: árbol con padres correctos; $150, $135, $142,50 y $110, sin modificar el porcentaje del producto. Tocar cada nombre consulta la tabla sin otro selector; editar sustituye la tabla por el formulario.
2. En Base agregar +10% por categoría, −10% por marca y +5% para ese producto. Esperado: $150 → $165 → $148,50 → $155,93; Mayorista hereda $155,93 y aplica −10% → $140,34. Reglas de otro destino no lo afectan. Probar aumentos y descuentos en cada nivel.
3. Fijar Mayorista en $120 para ese producto: prevalece $120; una hija hereda $120 antes de aplicar su porcentaje. Vaciar fijo recupera el cálculo. Producto automático con costo faltante: no permite guardarlo hasta cargar costo. Un producto anterior manual puede conservar su precio sin costo; no inventa un porcentaje.
4. Editar Base, pasar a otra lista y volver: conserva el borrador. Cancelar esa lista no borra el otro. Cambiar costo a $200 actualiza derivadas, conservando fijos, atributos, stock y ventas anteriores. Recargar y revisar en otro dispositivo.
5. Intentar origen propio/descendiente, otra tienda, sucursal incompatible y dos reglas del mismo destino: rechaza sin guardar. Probar edición con perfil autorizado y RPC con cajero sin permiso: denegación efectiva. Intentar dos activas exclusivas en un local: conserva la restricción anterior.
6. Preparar un carrito, cambiar una regla desde otro dispositivo y actualizar: no repricia el carrito silenciosamente; el cobro exige revisar si el precio cambió. Sincronizar pendientes antes de editar listas. Dos ediciones concurrentes de la misma lista: la segunda no sobrescribe sin revisión. Doble clic, recarga tras guardar y reintento de respuesta perdida: un solo registro.
7. Preparar PWA, catálogo, listas y caja con conexión; desconectar y vender con lista derivada, reconectar: mismo cálculo, validación y cola sin duplicar. Si cambió el servidor, conflicto conservado para revisión. Configurar listas requiere conexión. Repetir navegación/edición con teclado y móvil: campos, errores y Guardar/Cancelar alcanzables.
8. Abrir **Más opciones**, cambiar sucursal/disponibilidad, plegar y volver: conserva los valores, sin foco/validaciones en campos ocultos. Elegir un origen exclusivo de otra sucursal e intentar guardar: revela Más opciones y enfoca Sucursal, conservando el borrador. Editar una lista con porcentajes negativos previos: aparece Descontar con el valor absoluto; guardar sin cambiar conserva los precios. Eliminar un ajuste intermedio conserva los otros destinos, búsquedas y porcentajes. **Cómo se calcula** mantiene las ayudas accesibles por teclado. Comprobación visual, foco y teclado móvil pendientes; no se observaron estos recorridos en navegador.
9. Tocar el porcentaje de Base: enfoca el número del ajuste general. Cambiar Aumentar 50% por 60%, con Principal $100 y Mayorista −10%: vista previa/guardado dan $160 y $144. Confirmar que reglas, fijos, nombre y sucursal no se pierdan; cancelar una edición posterior conserva los datos guardados.
10. En una lista sin derivadas, abrir Eliminar con campos a medio editar o inválidos: aparece la confirmación sin validar campos ocultos. Cancelar devuelve el borrador y foco; confirmar retira solo esa lista. Revisar ventas/tickets previos y exportación: mismos nombres históricos, importes y cantidades, sin cambios de stock. En SQL Editor autorizado comprobar fecha/autor y datos retenidos; la app no muestra los registros dados de baja.
11. Intentar eliminar Base con Mayorista/Comerciante dependientes: muestra los nombres, sin confirmar la baja. Abrir la edición de una derivada, cambiar su origen y regresar a Base: conserva el borrador/confirmación. Eliminar todas las dependencias por intención o cambiarlas permite eliminar Base. La RPC también debe rechazar una nueva dependencia agregada desde otro dispositivo después de abrir la confirmación.
12. Eliminar la lista exclusiva activa de un local: aviso de catálogo antes de confirmar; próximas ventas usan su regla vigente, carrito iniciado conserva contexto y exige revisión. Probar con administrador/perfil autorizado y cajero sin permiso: acceso/RPC denegados para este último. Dos dispositivos: una edición posterior impide borrar con revisión vieja. Respuesta perdida/doble clic/reintento: una baja, fecha/autor originales. Recrear el mismo nombre obtiene otro ID sin modificar tickets previos. Sin red o con pendientes locales no se elimina ni se borra la cola. Repetir con teclado y móvil.

Última comprobación ejecutada, después de agregar eliminación y acceso directo al porcentaje: `npx tsc --noEmit -p tsconfig.app.json`, salida 0. Schema regenerado localmente con 36 migraciones y baseline fijo; sin aplicación remota. Cambios de interfaz, API/caché y SQL de baja, sin modificar fórmulas de precio ni ventas. No se ejecutaron builds ni otras pruebas automatizadas. SQL, permisos/RPC, precios reales, navegador, móvil, offline y otro dispositivo siguen pendientes; TypeScript no valida esos recorridos ni el SQL. Las migraciones detienen la instalación si las definiciones de las funciones a ajustar son distintas de las esperadas. Actualizar también los clientes que editaban listas/fijos directamente: las escrituras usan RPC con permiso efectivo y coordinación con el cobro.

<a id="registros-de-ventas"></a>

## Registros de ventas

Cada tienda puede elegir un registro principal y definir el destino de Efectivo, QR, Transferencia, Débito, Crédito y Pago mixto. No se impone ninguna relación entre medio de pago y registro. Un medio sin regla usa el principal. Pago mixto clasifica el ticket completo según su propia regla; no reparte una venta entre registros.

General y Pruebas son agrupaciones de ventas reales: ambas integran caja, stock, márgenes, informes y exportaciones. El nombre Pruebas no activa una simulación. Elegir o cambiar el registro no emite, anula ni modifica un comprobante.

### Instalación

La dependencia `202610210001_ledger_routing.sql` está incluida en schema. El historial de instalación se gestiona desde SUPABASE_SETUP.md; TypeScript no valida SQL, RLS ni PostgREST.

La migración agrega las reglas a `retail_ledgers`, garantiza un único destino por medio y tienda mediante índices, crea las RPC de configuración/movimiento y el historial de cambios. Conserva los contratos de checkout y sincronización existentes. En comercios nuevos, la inicialización crea General como principal y Pruebas, reutilizando la sucursal inicial habitual.

### Accesos y comportamiento

- **Configurar:** Mi comercio → Más opciones → Registros de ventas → Configurar selección por medio de pago. Administración o perfil con manage_ledgers, con autorización efectiva en las RPC. Guardar principal y reglas es una transacción; los demás borradores se conservan.
- **Vender:** el registro inicia en Automático por medio de pago. El destino concreto aparece al cobrar y cambia al elegir el medio. Una elección manual antes de cargar productos se mantiene para las próximas ventas de la sesión hasta volver a Automático. La selección manual no modifica reglas compartidas.
- **Carrito en curso:** las reglas disponibles se fijan al comenzar la venta. Un cambio de configuración en otro dispositivo no redirige silenciosamente ese carrito. Si el destino se desactiva, hay que resolverlo antes de cobrar o sincronizar; no se traslada automáticamente a otro registro ni se descarta la venta.
- **Después de cobrar:** junto a Última venta, Pasar a Pruebas o Pasar a General cambia el registro con una acción, incluso si hay otros registros personalizados. Otros registros mantiene accesibles los demás destinos activos. Cambiar una venta terminada no altera el destino del carrito siguiente ni el modo Automático.
- **Ventas anteriores:** Caja → Resumen del comercio permite mover una venta y consultar Ver cambios de registro. Los filtros y totales de la consulta se actualizan al cambiarla. Si deja de pertenecer al registro filtrado, desaparece de ese filtro. Los totales del comercio y los importes de la venta se conservan.
- **Auditoría:** quedan origen, destino, nombres de ambos, usuario y fecha del servidor. El historial no se puede modificar ni borrar desde el cliente. Propietario/administrador puede consultar el del comercio; cajeros, solo el de sus propias ventas, respetando las lecturas existentes.
- **Permisos de movimiento:** propietario/administrador puede mover ventas del comercio, incluidas las de turnos cerrados. Cajero puede mover únicamente ventas propias con turno abierto y acceso vigente a la caja; el backend verifica las asignaciones. Ningún destino de otra tienda es válido.
- **Concurrencia:** el movimiento usa identificador de solicitud y comprueba el registro anterior. Un doble clic/reintento no duplica un movimiento aplicado; una venta cambiada a otro destino desde otro dispositivo pide actualizar antes de intentar sobrescribirla. Un reintento de una solicitud ya aplicada devuelve el estado actual y no revierte cambios posteriores.
- **Offline:** Vender usa las reglas cargadas y conserva el registro elegido dentro de la operación pendiente. No se recalcula el destino al sincronizar. Configurar reglas, mover una venta terminada y leer su auditoría requieren conexión. El movimiento se habilita después de sincronizar esa venta. Las demás operaciones de la caja conservan la cola y sus validaciones existentes.

### Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/** en una tienda de pruebas con la migración aplicada. No generar ventas ficticias en producción.

1. **Preparación:** como administrador, abrir Mi comercio → Más opciones → Registros de ventas. Pulsar Preparar General y Pruebas si aparece. Esperado: General principal y Pruebas activo; Otras ventas reutilizado si correspondía, sin perder ventas ni reglas. Repetir y comprobar IDs/cantidades en Supabase: no se duplican. Un comercio nuevo debe tener ambos desde su creación.
2. **Reglas por tienda:** configurar destinos diferentes para los seis medios, incluido Mixto; dejar uno en Usar el principal. Guardar, recargar y abrir otro dispositivo. Esperado: mismas reglas para esa tienda; otra tienda conserva las suyas. Cambiar principal debe afectar solo medios sin regla explícita.
3. **Venta:** con Automático, agregar productos y alternar medios de pago. Esperado: Se guardará en muestra el destino correspondiente. Cobrar por teclado, escanear nuevamente y comprobar el foco habitual. Confirmar un pago mixto: un solo ticket, pagos desglosados intactos y un único registro según Mixto.
4. **Elección manual:** con carrito vacío elegir un registro concreto, cargar y cobrar. Esperado: prevalece la elección manual; las reglas de configuración no cambian. Volver a Automático restaura la clasificación por medio.
5. **Cambio rápido:** esperar la sincronización y pulsar Pasar a Pruebas/General en Última venta. Esperado: destino actualizado, confirmación visible, mismo ticket, stock, total, pago y comprobante. Repetir rápido/doble clic: un único cambio efectivo por solicitud. El siguiente carrito conserva su selección previa.
6. **Historial e informes:** como administrador, ir a Caja → Resumen del comercio. Mover otra venta y abrir Ver cambios de registro. Esperado: origen/destino, usuario y hora argentina. Verificar filtros, CSV del período completo y totales generales; una venta movida sale del filtro anterior, pero no del total del comercio. Volver a Vender y comprobar también Última venta si era la misma.
7. **Permisos:** como cajero mover una venta propia del turno abierto. Intentar por RPC mover la de otra persona, usar un destino ajeno, operar tras cierre o tras revocar la asignación: rechazo sin modificación. Como administrador verificar corrección de turnos cerrados y rechazo de otra tienda. Intentar modificar/borrar auditoría directamente desde el cliente: sin permiso.
8. **Dos dispositivos:** iniciar un carrito y cambiar sus reglas desde otro dispositivo. Esperado: el carrito conserva las reglas iniciales; el siguiente usa las nuevas después de actualizar. Mover la misma venta a destinos distintos desde dos sesiones: no hay sobrescritura silenciosa de una selección desactualizada ni auditorías duplicadas por reintento.
9. **Offline preparado:** cargar catálogo/registros/reglas con conexión, desconectar y cobrar. Esperado: registro disponible, operación pendiente conservada, sin cambiarlo posteriormente en segundo plano. Intentar moverla antes de sincronizar: control deshabilitado con explicación. Reconectar, sincronizar y moverla; con la red desconectada, una venta ya sincronizada debe mostrar un error accionable al intentar el movimiento.
10. **Borradores y fallos:** modificar el formulario de reglas, cambiar de editor y volver; cancelar debe descartar solo ese borrador. Cortar la red al mover y reintentar: la solicitud aplicada no debe ejecutarse dos veces. Sin migración, la configuración debe indicar qué actualización falta; la venta habitual con el principal sigue usando los contratos anteriores.
11. **Concurrencia con configuración:** en dos sesiones de prueba de **http://localhost:3001/**, una mueve una venta General ↔ Pruebas mientras la otra guarda reglas. Repetir manualmente con ambos sentidos y consultar la auditoría. Esperado: las operaciones finalizan o informan un conflicto de estado; no se produce un interbloqueo causado por tomar origen y destino en distinto orden. El movimiento conserva importes y registra un solo cambio por solicitud. Confirmar también en registros del backend; esta comprobación está pendiente.

Queda pendiente comprobar navegador, teclado/lector real, móvil, Supabase/RLS, SQL, concurrencia entre dispositivos y sincronización offline. La revisión de código no reemplaza esas pruebas.

<a id="retiros-y-comprobantes"></a>

## Retiros y comprobantes

Dependencia incluida en schema (no ejecutar por separado): [202610190001_justified_withdrawal.sql](../supabase/migrations/202610190001_justified_withdrawal.sql) en Supabase después de las migraciones anteriores y antes de usar el frontend actualizado. La migración crea el bucket privado `retail-vouchers`, agrega los datos del movimiento y actualiza la sincronización offline. No requiere nuevas variables de entorno.

En **Caja → Mi turno → Registrar movimiento**, elegir **Retiro de efectivo** y una categoría:

- **General:** retiro habitual, sin adjunto obligatorio.
- **Pago a proveedor:** nombre del proveedor y comprobante obligatorios para cajeros y administradores.
- **Otro:** otro retiro justificado con su motivo.

Se admiten fotos JPG, PNG, WebP, GIF, HEIC, HEIF, AVIF, BMP, TIFF y documentos PDF de hasta 10 MB. Las imágenes muestran una vista previa local; si el navegador no puede visualizar el formato, conserva el archivo e indica que se adjuntará igualmente. Para PDF se muestra el nombre del archivo.

Al guardar, primero se sube el archivo y después se registra el retiro. El formulario muestra **Subiendo comprobante…** / **Guardando movimiento…**. Un fallo conserva importe, motivo, proveedor y archivo, con opción de reintentar. Si el archivo ya se subió y falla el registro del movimiento, se reutiliza esa carga y el identificador del movimiento mientras no se cambien sus datos. No se confirma un retiro sin su comprobante. La validación también se aplica en Supabase.

El bucket no es público. Se persiste una URL estable de referencia privada (`/storage/v1/object/authenticated/retail-vouchers/...`), sin token ni permiso de descarga. Un cajero puede subir al turno propio autorizado, pero no leer archivos guardados ni generar enlaces firmados. Los administradores del comercio ven **Ver comprobante** y generan un enlace firmado de 60 segundos al abrirlo. Si el navegador bloquea la pestaña, aparece un enlace alternativo. No se guardan enlaces firmados en los movimientos.

La consulta de movimientos usa `retail_movement_details`, que mantiene el alcance por comercio/autor y devuelve `voucher_url = null` para cajeros. Los permisos de columna impiden solicitar directamente `voucher_url` a la tabla mediante REST. Los permisos de Storage comprueban la pertenencia al comercio; los adjuntos de otros comercios no son accesibles. No se habilitan borrado ni sobrescritura de archivos desde el cliente.

Los movimientos conservan el cálculo habitual del arqueo: **RETIRO** resta efectivo esperado una sola vez. La cola offline conserva categoría, proveedor y referencia privada, y mantiene sus reintentos idempotentes. Subir un archivo nuevo requiere conexión y un turno ya sincronizado. Si la conexión se corta después de subirlo, el movimiento puede quedar guardado localmente para sincronizarse con sus datos completos; los conflictos se gestionan desde el flujo de sincronización existente.

La migración mantiene la RPC anterior de cinco argumentos para movimientos generales de clientes anteriores. La nueva consulta de movimientos requiere el frontend actualizado porque la lectura directa con `select('*')` ya no puede solicitar la columna privada.

### Guía de Pruebas

1. Aplicar la migración en Supabase y abrir `http://localhost:3001/`. Entrar como cajero con una caja habilitada y abrir un turno. Esperar a que se sincronice.
2. En **Registrar movimiento**, elegir **Retiro de efectivo → Pago a proveedor**. Ingresar importe $500, motivo y proveedor. Guardar sin archivo: debe mostrar **Adjuntá el comprobante para pagos a proveedores**, sin descontar efectivo.
3. Adjuntar una foto válida: debe aparecer su vista previa. Guardar: debe mostrar progreso y agregar un único retiro de $500 con el proveedor. Como cajero no debe aparecer **Ver comprobante**. Un reintento del mismo identificador no debe duplicarlo.
4. Entrar como administrador del mismo comercio y consultar el turno/caja. Debe aparecer el proveedor y **Ver comprobante**, que abre el adjunto en otra pestaña. Volver a abrirlo más de un minuto después debe generar un enlace nuevo.
5. Verificar el arqueo con fondo inicial de $1.000 y sin ventas: después del retiro, el efectivo esperado del administrador debe ser $500. El cajero conserva su arqueo a ciegas.
6. Probar PDF y un archivo mayor a 10 MB: el PDF debe poder adjuntarse y el archivo grande debe rechazarse sin registrar el movimiento.
7. Con una foto seleccionada, desconectar internet antes de guardar. Debe conservar el formulario y permitir reintentar al reconectar. No debe cerrar ni bloquear permanentemente el turno. Si el turno se abrió offline, sincronizarlo antes de volver a cargar el archivo.
8. Registrar un ingreso, un retiro general y uno de categoría **Otro**: no deben exigir comprobante y deben conservar sus signos en el arqueo. Tras sincronizar o recargar, deben conservar la categoría y el proveedor de los pagos correspondientes.
9. Comprobar permisos con sesiones separadas: el cajero debe recibir `voucher_url: null` al consultar movimientos; una solicitud directa a esa columna y los intentos de descargar o firmar el objeto deben ser rechazados. Un administrador de otro comercio tampoco debe acceder. La URL privada permanente no debe servir para descargar sin autorización.

<a id="remitos-pendientes"></a>

## Remitos pendientes

Dependencia incluida en schema (no ejecutar por separado): [202610190002_pending_replenishments.sql](../supabase/migrations/202610190002_pending_replenishments.sql) en Supabase después de las migraciones anteriores y antes de publicar el frontend. Crea la tabla, las funciones de envío/revisión y el bucket privado `retail-remitos`. No requiere nuevas variables de entorno: usa Supabase, Tesseract y la configuración existente de Groq.

### Empleado

Con `submit_remito`, la navegación incluye **Remito**, tanto en escritorio como en la PWA. No requiere abrir un turno ni habilitar reposición directa.

1. Elegir la sucursal disponible para la cuenta y tocar **Fotografiar remito**. En un dispositivo compatible se solicita la cámara trasera; también se puede seleccionar una imagen.
2. Revisar la foto y tocar **Procesar con IA**. Se reutiliza la extracción OCR existente y la vinculación con el catálogo/memoria de proveedor. Los bultos se convierten una sola vez a unidades individuales.
3. Corregir cantidades y quitar renglones incorrectos. Los productos no identificados quedan señalados para el encargado. Las cantidades deben ser enteros positivos de hasta 1.000.000 de unidades.
4. Agregar notas opcionales y tocar **Enviar para aprobación**. Aparece **Pendiente de validación** y el mensaje de envío. El stock permanece igual.

Si no se puede leer la foto o falla Groq, está disponible **Enviar solo foto para revisión manual**. El encargado podrá agregar y vincular los artículos. No se inventan cantidades cuando no se leen.

La imagen admite hasta 10 MB y formatos habituales de foto. Si el navegador no puede mostrar su formato, se informa en la vista previa y se permite enviarla igualmente. La carga y el envío requieren conexión. Si fallan, se conserva el borrador en esta pantalla para reintentar; una subida ya completada se reutiliza. El envío se identifica con el UUID de la foto para que un reintento de red no cree dos pendientes. El borrador también se conserva al cambiar de pestaña dentro del comercio, pero no al recargar/cerrar la app o cambiar de comercio.

### Encargado

En **Productos y stock → Catálogo y stock**, el panel **Remitos pendientes** muestra fecha, sucursal, notas, texto OCR, miniatura privada y artículos. Se cargan diez remitos por vez; **Mostrar más** permite continuar. El menú de Productos/Catálogo muestra la cantidad pendiente y la actualiza cada 30 segundos con la app visible, al recuperar foco/conexión y mediante **Actualizar remitos**.

Antes de aprobar se pueden buscar/cambiar productos, corregir cantidades, quitar líneas y agregar artículos de una foto sin analizar. Todos los renglones deben quedar vinculados a productos activos del comercio. La cantidad siempre se expresa en unidades individuales, incluso si la foto factura displays.

**Aprobar e ingresar unidades** envía las correcciones y aplica el stock en una única transacción SQL. Bloquea el remito y los productos, suma al stock vigente, agrupa renglones repetidos y registra el ingreso en `retail_stock_movements`, junto con el administrador y la fecha de revisión. Un remito ya aprobado devuelve su identificador sin volver a sumar stock. No modifica costos ni precios de venta. La sucursal identifica el origen del remito; el inventario sigue compartido entre las cajas del comercio, como en el sistema existente.

**Rechazar** exige un motivo y guarda la revisión, sin cambiar stock. Una revisión concurrente respeta la primera decisión: no permite aprobar un rechazado ni rechazar un aprobado. Los registros aprobados/rechazados se conservan en la tabla para auditoría y salen de la lista de pendientes.

### Permisos

El envío exige `submit_remito` y valida la sucursal asignada, que la imagen exista y pertenezca a quien la subió. Revisar, aprobar y rechazar requiere administración o `review_remitos`. Las lecturas mantienen el alcance autorizado del comercio; los clientes no pueden escribir directamente en la tabla para eludir la revisión. El permiso de enviar no concede reposición directa.

Las fotos son referencias privadas sin tokens. Storage comprueba pertenencia al comercio y carpeta de usuario; la lectura/firma de remitos exige administración o `review_remitos`. Los enlaces temporales duran cinco minutos; las miniaturas se renuevan y **Ver foto completa** genera otro. No hay acceso público, sobrescritura ni borrado desde el cliente. Este permiso no concede acceso a comprobantes privados de movimientos de caja.

### Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como cajero. En un celular real, usar la URL HTTPS publicada de la app (`https://administrador-picking.vercel.app/`) después de desplegar los cambios: el `localhost` del teléfono corresponde al propio teléfono.
2. Preparar un producto **Alfajor de prueba**, stock **10**, con `pack_size=24`. Entrar a **Remito**, verificar la sucursal habilitada y fotografiar un remito con **2 displays ×24** de ese producto. Revisar la vista previa.
3. Pulsar **Procesar con IA**. Verificar que la cantidad sea **48 unidades**; corregirla si la interpretación no fue correcta. Agregar una nota y enviar.
4. Debe aparecer **Remito enviado. El encargado lo revisará y aprobará el ingreso al stock.** y **Pendiente de validación**. El stock debe seguir en **10**. El cajero no debe obtener acceso de lectura a la foto almacenada ni a las RPC de aprobación/rechazo.
5. En otra sesión como administrador del mismo comercio, abrir **Productos y stock** y tocar **Actualizar remitos**. Deben verse el badge, fecha, sucursal, nota, foto y las 48 unidades. Abrir la foto completa.
6. Confirmar el producto/cantidad y aprobar: el stock debe quedar en **58**, el pendiente debe desaparecer y la tabla debe registrar `approved`, `reviewed_by` y `reviewed_at`. Repetir la llamada de aprobación o hacer doble toque no debe aumentar nuevamente el stock.
7. Enviar otro remito y rechazarlo con motivo: debe quedar `rejected`, conservar motivo/revisor/fecha y no modificar stock. Intentar aprobarlo después debe fallar.
8. Enviar una foto sin analizar. El administrador debe poder **Agregar artículo**, buscar el producto, ingresar cantidad y aprobar. Un producto sin vincular o una cantidad inválida debe impedir la aprobación.
9. Probar renglones repetidos del mismo producto: deben sumar ambas cantidades una sola vez por aprobación. Una aprobación y un rechazo simultáneos desde dos sesiones deben respetar una sola decisión.
10. Desconectar antes de enviar: debe mostrar error y conservar foto/cantidades/notas. Reconectar y reintentar: debe crear un único pendiente. Cambiar entre Caja, Vender y Remito sin recargar debe conservar el borrador no enviado.
11. Con otra cuenta de otro comercio, comprobar que no se puede consultar, aprobar ni abrir la imagen del remito. Un cajero debe poder enviar, pero no aprobar, rechazar ni modificar stock por llamadas directas a la API.

<a id="transferencias"></a>

## Transferencias

**Productos y stock → Transferencias** reúne un mapa de sucursales y depósito, las pestañas **Productos / Dinero** y su historial. Elegir un nodo o un recorrido filtra el historial; no cambia el origen de un borrador existente. Las líneas punteadas son conexiones posibles, no movimientos realizados. Las flechas y sus totales corresponden al historial cargado, no a todo el historial del comercio. Se consultan 100 registros nuevos por página y se muestran 25 por vez; **Cargar historial anterior** recupera páginas adicionales. Los aportes/retiros externos aparecen en el historial de dinero, sin inventar otra sucursal en el mapa.

Al crear una transferencia de productos se proponen el origen con más stock y, si hay una sola opción, el destino. Los productos se muestran en una planilla con desplazamiento: cada encabezado ordena esa columna y la cantidad se escribe en la celda **A transferir**; Enter y las flechas pasan a la fila siguiente o anterior, y **Todo** lleva lo disponible. **Faltan en destino** reúne lo que está en su stock mínimo o por debajo, **Agregar lo que falta** carga esas cantidades y **Elegidos** muestra lo cargado. También se puede filtrar por categoría, buscar o escanear. **Transferir ahora** registra y confirma en un paso; **Dejar pendiente** espera una confirmación.

### Activación y compatibilidad

SQL preparado localmente, **sin aplicar**: `202610280002_location_funds.sql` y `202610280003_location_inventory.sql`. Aplicar los paquetes homónimos de `supabase/updates/` en orden, después de los pasos anteriores y con su historial, según [Instalación de Supabase](../SUPABASE_SETUP.md#transferencias-por-ubicación-y-fondos). No ejecutar las fuentes de migrations sueltas ni adoptar historial manualmente. Publicar también el frontend actualizado.

Los comercios nuevos nacen con stock por sucursal y depósito. `202610300004_branch_inventory_always.sql` activa todos los existentes y asigna su salón a la sucursal principal; las demás empiezan en cero. La activación manual solo queda para un comercio con saldos inconsistentes, y el administrador debe:

1. Sincronizar **todos los dispositivos**, resolver conflictos y cerrar los turnos. La app comprueba la cola de este dispositivo y el servidor comprueba los turnos abiertos; el backend no puede descubrir colas que siguen desconectadas en otro equipo.
2. Confirmar o cancelar los registros anteriores pendientes. Son constancias: no se reproducen como movimientos de stock.
3. En Transferencias, elegir la sucursal que posee actualmente el stock del salón y pulsar **Activar stock por sucursal y depósito**. Si está repartido físicamente, elegir una ubicación inicial y registrar después los traslados necesarios para reflejar la distribución real.

La activación deja el depósito tal como estaba y asigna todo el saldo del salón a la sucursal elegida. Las demás empiezan en cero; no se duplican productos ni cantidades. Queda un registro de quién activó, cuándo y con qué sucursal. Reintentar la misma activación no redistribuye saldos. Una vez activado, no se permite apagar depósito ni volver a stock compartido borrando asignaciones.

`retail_products.stock` conserva el total físico del comercio. Las existencias de sucursales más depósito deben sumar ese total; las operaciones que no lo cumplen se revierten. Los nodos muestran unidades de productos activos sincronizadas con el servidor, no el saldo de ventas offline pendientes; ante un fallo se identifica el último dato o la falta de datos.

### Productos: traslado real y registro anterior

**Nueva transferencia** permite elegir origen/destino, buscar por nombre/código o agregar un código exacto con Enter. Incluye hasta 200 productos físicos, con cantidades enteras entre 1 y 1.000.000; los combos se trasladan por sus componentes. Las notas son opcionales. El selector de destino excluye el origen.

**Registrar pendiente** conserva la solicitud, pero no reserva ni mueve stock. **Confirmar traslado** descuenta del origen y suma al destino en una sola transacción, validando la disponibilidad actual. Si falta algún producto, no se mueve ninguno. **Cancelar** conserva la solicitud sin afectar existencias. Una decisión terminal no puede convertirse en la otra; repetir la misma confirmación no vuelve a descontar. Se guardan creador, revisor, fechas y nombres de productos.

El total físico, costos y precios no cambian por trasladar. Los movimientos con depósito también quedan en su auditoría. El historial anterior sigue visible con **Registro anterior · sin movimiento de stock**; confirmar un registro antiguo nunca lo transforma retroactivamente en un traslado de inventario.

Vender usa el saldo de la sucursal de la caja: paquetes, sueltos y combos consumen las unidades/componentes de esa misma sucursal, sin tomar mercadería de otra o del depósito. Reponer, ajustes, CSV y facturas muestran la sucursal de ingreso; un cambio de distribución mientras una importación está abierta exige confirmar la ubicación y conserva las filas. Los remitos con sucursal conservan su destino; los anteriores sin sucursal permiten elegirla al aprobar. El catálogo, las listas y la valoración total siguen siendo compartidos.

La venta offline preparada conserva su cola y descuenta localmente la sucursal conocida; al sincronizar se valida en el servidor. Una configuración vieja o existencias consumidas por otro dispositivo pueden producir un conflicto que se conserva para resolver, sin borrar la operación ni asignarla automáticamente a otro local. Crear/confirmar traslados y activar requieren conexión y cola local vacía.

### Dinero: fondos por ubicación

Cada sucursal y el depósito tienen un fondo independiente, inicialmente cero. La tabla de **Dinero** muestra saldos y, para administración, el efectivo en cajas abiertas. **Ingreso** registra dinero externo con motivo; **Enviar** descuenta de un fondo y acredita el otro; **Salida** registra una salida externa. El importe admite hasta dos decimales y el motivo es obligatorio. Los movimientos manuales no pueden sacar más que el saldo.

Con `202610300005_shift_cash_into_branch_funds.sql`, cada cierre de turno, en línea o sin conexión, suma al fondo de la sucursal de su caja el efectivo contado menos la apertura. Si contó menos que la apertura, descuenta la diferencia y el saldo puede quedar negativo. Cubre solo efectivo y cierres posteriores a la migración: QR, tarjetas y transferencias no entran al fondo.

Los movimientos manuales **no** alteran apertura, cierre, efectivo esperado, movimientos de caja, ventas ni métricas de un turno. No se deduce un saldo inicial de las ventas existentes. El historial conserva actor, fecha, origen, destino, importe y motivo, sin edición ni borrado. Los reintentos de una misma solicitud usan un identificador estable; una respuesta perdida no debe duplicar el movimiento. Dos solicitudes distintas son dos movimientos, aunque tengan el mismo importe.

Los fondos requieren conexión; no se encolan offline. Un error mantiene el borrador. **Cerrar y conservar**, cambiar de pestaña o navegar dentro de Productos conserva por separado los borradores de productos/dinero mientras la pantalla sigue montada. No se promete conservar un formulario no enviado después de cerrar la app.

### Permisos

`manage_transfers` permite consultar y revisar traslados de productos. El nuevo `manage_funds` permite consultar fondos y registrar aportes, retiros y transferencias; se concede explícitamente desde perfiles. Los perfiles anteriores no reciben este permiso automáticamente. Administrador/propietario conservan su alcance; un cajero/supervisor sin permiso no puede acceder por interfaz, REST ni RPC. La activación inicial es exclusiva de administrador/propietario. RLS limita las lecturas al comercio autorizado y las tablas de saldos/historial no admiten escritura directa.

### Guía de Pruebas

**Pendiente de ejecución manual**, en un comercio de prueba y http://localhost:3001/; no generar ventas ficticias en producción.

1. **SQL y compatibilidad:** aplicar los paquetes nuevos en orden y volver a ejecutarlos mediante su historial. Esperado: aplicación una vez, sin duplicar tablas/saldos; un comercio no activado conserva su stock compartido y sus registros anteriores.
2. **Distribución inicial:** preparar Centro y Barrio, stock físico 100 y depósito 20, sincronizar todos los dispositivos y cerrar turnos. Elegir Centro y activar. Esperado: Centro 80, Barrio 0, depósito 20, total 100. Repetir no vuelve a distribuir. Con un turno abierto o traslado antiguo pendiente, la activación se rechaza sin cambios.
3. **Mapa e historial:** seleccionar Centro y luego un recorrido, quitar filtros y navegar con Tab/Enter. Esperado: historial filtrado coherente, foco visible, borradores sin cambios. En móvil el diagrama se desplaza dentro de su región y no ensancha toda la página.
4. **Traslado:** crear Centro → Barrio por 12 unidades. Esperado: pendiente sin cambiar saldos; confirmar deja 68 / 12 / 20, total 100. Depósito → Barrio por 5 deja 68 / 17 / 15. Cancelar otro pendiente no mueve unidades. El registro anterior queda identificado y no descuenta.
5. **Concurrencia y red:** dos sesiones intentan mover el mismo stock insuficiente; esperado: nunca negativo ni traslado parcial. Repetir confirmación/doble clic/respuesta perdida no duplica el descuento. Desconectar conserva formulario y permite reintentar con la misma solicitud.
6. **Venta y reposición:** vender desde Barrio, luego un combo cuyos componentes estén allí. Esperado: solo Barrio pierde unidades, incluido consumo de componentes. Reponer por bultos, importar CSV/factura y aprobar remito: cantidades ingresan una vez en la sucursal indicada y se conserva la conversión. Un remito antiguo sin sucursal exige destino. Editar precio no redistribuye stock.
7. **Offline preparado:** cargar configuración y catálogo actualizados, desconectar y vender en la caja de Barrio. Esperado: disponibilidad local por sucursal y cola conservada; al reconectar sincroniza una vez. Si otro dispositivo agotó el saldo, se informa conflicto sin borrar el ticket pendiente. No se pueden confirmar traslados sin conexión.
8. **Fondos:** aportar $10.000 al depósito y transferir $2.000 a Centro. Esperado: $8.000 / $2.000, historial con motivo y ninguna modificación en efectivo esperado del turno. Retirar más del saldo se rechaza; concurrencia, doble clic y respuesta perdida no duplican una misma solicitud.
9. **Perfiles y aislamiento:** probar cajero sin permisos, con solo `manage_transfers`, con solo `manage_funds` y administrador; repetir contra otro comercio por REST/RPC. Esperado: solo las operaciones/lecturas autorizadas. Conceder/revocar fondos debe reflejarse al actualizar los permisos; no altera asignaciones ni acceso a movimientos de turnos ajenos.
10. **Borradores y tamaños:** escribir una transferencia de productos, cambiar a dinero y escribir otro borrador, navegar a Listas y volver. Esperado: ambos conservados; cerrar uno conserva el otro. Revisar una sucursal y muchas, nombres largos, teclado virtual y botones alcanzables en móvil. Falta de conexión/SQL muestra un error accionable, sin saldos ficticios ni bloqueo de Vender.

Comprobación de código ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, salida 0. No se aplicó SQL ni se probaron navegador, móvil, backend o concurrencia; TypeScript no valida migraciones, RLS ni la presentación visual.
