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

## Precios por sucursal

Dependencia incluida en schema (no ejecutar por separado): la migración pendiente [202610160005_branch_price_rules.sql](../supabase/migrations/202610160005_branch_price_rules.sql) en Supabase antes de publicar esta versión.

En **Productos y stock → Listas de precios**, cada lista tiene un campo **Sucursal**:

- **Todas las sucursales**: lista global. Un administrador puede elegirla desde cualquier local.
- Una sucursal concreta: lista exclusiva de ese local, seleccionada automáticamente en el POS mientras esté activa.

Cada sucursal admite una sola lista exclusiva activa. Puede tener varias inactivas para conservar configuraciones anteriores. Para asignar otra, desactivar la actual o cambiarla a global. Si no hay ninguna activa asignada, se usa **Lista madre**. Las listas anteriores quedan como globales y conservan ajustes y precios fijos.

La lista de la sucursal puede usar un ajuste porcentual sobre el catálogo maestro y precios fijos por producto, como las listas globales. La tabla indica la sucursal con una etiqueta diferenciada o **Global**. Desactivar y reactivar una lista conserva su asignación.

Al entrar al POS o cambiar de local, la app consulta la regla de la sucursal antes de permitir el cobro. El administrador puede cambiar a otra lista válida para ese local o a la madre; su elección se conserva al actualizar datos en esa misma sucursal. Al cambiar de sucursal, se vuelve a aplicar el valor predeterminado del nuevo local. El cajero utiliza la lista asignada, sin cambiarla manualmente. Si hay productos en el carrito, se mantiene la confirmación para descartarlos antes de cambiar de local y el bloqueo para cambiar de lista durante el cobro.

Supabase valida la regla en la misma transacción del checkout y la sincronización offline. Rechaza una lista exclusiva de otro local y exige al cajero la regla de su sucursal. Un error revierte también el descuento de stock. Los reintentos de ventas ya registradas no vuelven a cobrarse ni se rechazan por cambios posteriores de asignación. La lectura queda limitada a miembros del comercio; la edición requiere administración o el permiso delegado manage_price_lists. La relación sucursal/lista impide asignar sucursales de otro comercio.

En modo offline se usa la asignación del catálogo local preparado en ese dispositivo. Si cambió en el servidor durante una desconexión, la sincronización puede requerir revisar los pendientes, como los demás cambios de precio. No se altera el historial de ventas ni se actualizan automáticamente sus importes al modificar listas.

### Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador.
2. Tener dos sucursales B1 y B2. Crear una lista **Precios B1**, asignarla a B1 y usar ajuste +20%. Mantener B2 sin lista exclusiva activa.
3. Abrir turno en B1: un producto de la madre a $100 debe mostrarse a $120 y el selector debe indicar **Precios B1**. Si hay un precio fijo para ese producto, debe prevalecer.
4. Cambiar a B2: debe usar la madre a $100 y no ofrecer la lista exclusiva de B1. Volver de B2 a B1: debe seleccionar nuevamente **Precios B1**.
5. Como administrador, elegir una lista global y tocar **Actualizar datos**. Debe conservar la elección mientras permanezca en B1. Volver a cambiar de sucursal debe restablecer el valor predeterminado.
6. Entrar como cajero: comprobar selección automática y selector bloqueado. Intentar asignar dos listas activas a B1 debe mostrar un error; desactivar la actual debe permitir usar la madre o activar otra.

Verificaciones autorizadas: `npx tsc --noEmit -p tsconfig.app.json` y `node --test tests/experience.test.mjs`. No se ejecuta el build.

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

Dependencia incluida en schema (no ejecutar por separado): [202610190003_stock_transfers.sql](../supabase/migrations/202610190003_stock_transfers.sql) en Supabase después de las migraciones anteriores y publicar el frontend actualizado. No requiere variables de entorno nuevas.

El administrador accede desde **Productos y stock → Transferencias**. Elige sucursal de origen y destino, busca productos por nombre/código, los agrega y completa cantidades en unidades individuales. Repetir **Agregar** sobre el mismo producto aumenta su cantidad. El lector puede agregar un código exacto mediante Enter. Se permiten hasta 200 productos distintos y cantidades enteras positivas de hasta 1.000.000 por producto; las notas son opcionales y admiten 2.000 caracteres.

**Registrar transferencia pendiente** crea un registro de traslado físico. **Confirmar** marca su recepción/confirmación administrativa; **Cancelar** anula un pendiente y conserva su historial. Una transferencia confirmada no puede cancelarse y una cancelada no puede confirmarse. Se guardan creador/fecha y revisor/fecha. Los nombres de los productos se toman del catálogo al crear el registro y quedan como fotografía histórica.

El historial muestra origen, destino, fecha, artículos/cantidades, notas y estado, con filtro por **Todas / Pendientes / Confirmadas / Canceladas**. Se muestran 25 registros por vez con opción de cargar más. **Actualizar historial** vuelve a consultar, y al entrar en la subpestaña o recuperar foco/conexión se refrescan los datos. El borrador se conserva al pasar entre subpestañas del catálogo mientras el componente permanece abierto.

### Inventario y permisos

Las transferencias son exclusivamente registros internos. Crear, confirmar o cancelar no llama a reposición, no actualiza `retail_products.stock` y no genera entradas/salidas de inventario. El stock sigue siendo compartido por la tienda; no se calcula disponibilidad por sucursal ni se comprueba una existencia por local que el sistema no lleva.

Las funciones comprueban que las dos sucursales sean diferentes y pertenezcan al mismo comercio. Cada producto debe existir, estar activo al crear el registro y pertenecer al comercio. Se ignoran nombres proporcionados por el cliente y se guarda el nombre real del catálogo. Se rechazan productos repetidos en llamadas directas: hay que enviar una sola línea con su cantidad total.

La interfaz y las RPC de crear/confirmar/cancelar exigen administración o `manage_transfers`. Las lecturas mantienen RLS por comercio; ver metadatos no concede permiso de escritura. La tabla no permite eludir las funciones y su auditoría mediante escritura directa. No se habilita borrado de registros.

La creación usa un identificador opcional de solicitud para que reintentar el mismo formulario después de un fallo de red no duplique la transferencia. La RPC sigue aceptando los cinco parámetros principales; `p_request` es opcional. Confirmación/cancelación bloquean la fila y son idempotentes: repetir una decisión ya guardada devuelve su identificador. Una revisión simultánea conserva la primera decisión válida.

La consulta y las acciones requieren conexión. No se encolan transferencias como movimientos de stock offline. Un error conserva el formulario para reintentar; si la operación se guardó pero falla la carga del historial, usar **Actualizar historial**. La consulta del historial no fuerza la recarga de todos los datos offline del comercio.

### Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador. Tener dos sucursales **Centro** y **Barrio** y un producto con stock total **100**.
2. Entrar en **Productos y stock → Transferencias**. Seleccionar Centro como origen y Barrio como destino. Buscar el producto, agregarlo, ingresar **12** unidades y una nota. Registrar la transferencia.
3. Debe aparecer **Pendiente** en el historial con sucursales, producto, 12 unidades, nota y fecha. El stock total debe seguir en **100**.
4. Pulsar **Confirmar**: debe pasar a **Confirmada**, registrar el revisor/fecha y conservar stock **100**. Repetir la confirmación por API o desde dos sesiones no debe duplicar registros ni modificar inventario.
5. Crear otra transferencia y pulsar **Cancelar**: debe mostrarse **Cancelada**, conservar el registro y el stock **100**. No debe poder confirmarse después. Las confirmadas tampoco deben ofrecer cancelación.
6. Probar los filtros de estado, abrir el detalle de productos y actualizar el historial. Cambiar entre Listas de precios y Transferencias antes de guardar debe conservar el borrador dentro de Catálogo.
7. Intentar origen igual a destino, cantidad cero, fraccionaria, negativa o superior a 1.000.000: el formulario/RPC deben impedir el registro. Las llamadas con sucursales o productos de otro comercio también deben rechazarse.
8. Con una sola sucursal, debe indicarse que hacen falta dos. Un cajero sin `manage_transfers` no debe ver las acciones de transferencias ni poder crear/confirmar/cancelar por RPC. Con ese permiso explícito, debe poder usar esas acciones dentro de su comercio, sin modificar el stock global.
9. Desconectar antes de crear: debe mostrarse el error y conservar productos/cantidades/notas. Reconectar y reintentar con los mismos datos no debe duplicar la solicitud si el servidor ya la había guardado.

