# Mi comercio, inicio y permisos

Guía vigente consolidada. Los nombres de migraciones indican dependencias, no el estado remoto: usar [schema y su historial](../SUPABASE_SETUP.md), sin repetir archivos individuales. Las Guías de Pruebas son recorridos manuales en **http://localhost:3001/**; no acreditan pruebas ejecutadas.

- [Inicio guiado](#inicio-guiado)
- [Personas y perfiles](#personas-y-perfiles)
- [Facturación electrónica ARCA (ex AFIP)](#facturacion-electronica-arca)

<a id="inicio-guiado"></a>

## Inicio guiado

### Aplicación y compatibilidad

La dependencia `202610190001_store_onboarding.sql` está incluida en schema. Su instalación se gestiona desde SUPABASE_SETUP.md, sin repetirla individualmente.

La migración no inserta filas para comercios anteriores. Un trigger crea el estado solo al insertar un comercio nuevo. Sin fila no se abre el asistente, independientemente de cuántos productos tenga el comercio. Las tiendas anteriores conservan su operación. Antes de aplicar la migración, la creación de nuevos comercios muestra un error accionable; no recurre a una creación sin protección contra reintentos.

`retail_create_store_once` llama al `retail_create_store` existente. Con las migraciones actuales, crea propietario, las 19 categorías canónicas y Caja principal. Los triggers crean Principal y los registros General/Pruebas y asignan la sucursal de la caja. El asistente no duplica esos recursos. Si falta alguno, permite salir a Mi comercio y usar los formularios autorizados existentes.

### Avance y permisos

`retail_store_onboarding` guarda el paso, la confirmación de datos, la omisión, la finalización y una versión. Solo owner/admin pueden leerlo por RLS. Las escrituras pasan por un RPC que verifica el rol, bloquea la fila y exige la versión conocida. Un conflicto entre dispositivos requiere actualizar/reintentar; no se repite automáticamente la escritura.

El paso indica dónde retomar, no acredita tareas. Finalizar exige datos confirmados y un turno propio abierto en una caja activa. Si no hay productos activos, se guarda la omisión y se deja el paso de productos pendiente, sin `completed_at`. Omitir productos no crea artículos de ejemplo. Completar el inicio tampoco abre turnos para otros operadores.

Los borradores se conservan al retroceder o salir y retomar dentro de la sesión montada. Tras recargar o cambiar de dispositivo se recuperan el avance compartido y los registros guardados, no los campos todavía sin guardar. `localStorage` solo conserva la clave de solicitud de creación mientras falta una respuesta; no es la fuente del avance.

### Reintentos y conexión

- Creación: clave por solicitud, registrada en el servidor; bloqueo por usuario. Dos dispositivos del mismo propietario que creen el mismo nombre mientras su inicio siga pendiente reciben el mismo comercio. Tras completar ese inicio se permite crear otro con ese nombre.
- Producto: formulario básico existente, con la restricción única `(store_id, code)`. Repetir un envío con el mismo código no inserta otro producto. Si se pierde la respuesta, actualizar el catálogo y continuar con el producto guardado; no cambiar el código para eludir la restricción. No se agregó una operación de stock ni se alteró el precio.
- Turno: wrapper online que reutiliza `retail_open_shift`, sus validaciones y el índice único de turno abierto por caja. Los reintentos devuelven el turno propio ya abierto; una caja ocupada por otra persona se rechaza. Se impide abrir desde este recorrido otro turno propio en una caja distinta. Si falla guardar el avance después de abrir, se puede continuar sin repetir la apertura.
- La apertura guiada pasa por la capa de configuración online y refresca las cachés existentes. El inicio guiado no promete funcionar offline. La venta offline sigue usando su recorrido habitual.
- No se solicitan automáticamente permisos de cámara, instalación o notificaciones. Los accesos existentes siguen en Mi comercio. Un enlace de aviso tiene prioridad sobre el inicio automático; el recorrido queda disponible para retomar.

### Guía de Pruebas manuales

Usar http://localhost:3001/ con cuentas y datos de prueba, después de aplicar la migración en un entorno de prueba. No realizar ventas de prueba en producción.

1. Crear un comercio: comprobar una sucursal Principal, una Caja principal, cuatro categorías y los dos registros existentes. Confirmar el nombre, guardar un producto con código único y abrir turno con $2.000. Debe aparecer Vender, en el mismo contexto, sin pedir listas, equipo ni IA.
2. Pulsar Configurar después en cada paso, recargar y retomar desde Mi comercio. Los registros guardados y el avance deben mantenerse, sin acreditar tareas omitidas. Omitir productos y abrir turno debe dejar el acceso para retomar productos.
3. Escribir un producto sin guardar, retroceder y volver: el borrador debe conservarse. Probar el acceso secundario a CSV/Excel y cancelar sin crear artículos de ejemplo.
4. Abrir el mismo comercio con el mismo administrador en otro dispositivo. Avanzar en uno y enviar desde el otro: debe informar conflicto, permitir actualizar y no duplicar recursos. Enviar simultáneamente la apertura de la misma caja: debe existir un solo turno abierto.
5. Cortar la red antes de confirmar/guardar/abrir: no debe avanzar. Simular pérdida de respuesta después del guardado, reconectar y actualizar: reutilizar tienda/producto/turno existentes. Verificar también doble clic y recarga entre pasos.
6. Visitar una tienda anterior, incluso sin productos: no debe aparecer onboarding. Ingresar como cajero: no debe aparecer el recorrido ni tener permiso para leer/modificar su estado.
7. Con un turno propio abierto, retomar el paso final: debe ofrecer Continuar a Vender sin apertura adicional. Con una caja ocupada por otra persona, debe impedir abrirla y permitir elegir otra caja autorizada.
8. Abrir un aviso PWA: debe ir a la sección solicitada. Durante el recorrido no deben acumularse diálogos de permisos. Verificar teclado, foco y controles ocultos en escritorio y móvil.

La migración, concurrencia, backend, navegador, PWA y dispositivos requieren estas comprobaciones manuales; no se consideran validados por TypeScript.

<a id="personas-y-perfiles"></a>

## Personas y perfiles

### Ampliación vigente: perfiles editables y todas las áreas funcionales

Esta sección reemplaza las restricciones históricas posteriores que reservaban toda la configuración a administración. La base de rol sigue siendo Cajero o Supervisor; un permiso no convierte a la persona en Administrador. En **Mi comercio → Personas con acceso → Perfiles de permisos**, **Crear perfil** y **Editar [nombre]** reutilizan el formulario de interruptores. Guardar conserva el ID y las asignaciones del perfil. Cancelar descarta solo ese editor. Cambiar el rol de un perfil nuevo conserva los interruptores elegidos; un perfil ya asignado no cambia de rol silenciosamente.

Hay **23 permisos**, agrupados por tareas. Una acción puede abarcar varios accesos que escriben los mismos datos; por ejemplo, crear/editar productos incluye alta manual y factura. Las importaciones y reposiciones CSV usan el permiso de stock. No se presentan interruptores sin autorización efectiva.

| Grupo | Acciones configurables |
| --- | --- |
| Caja y ventas | Vender/cobrar; ingresos; retiros; cambiar registro de ventas propias; ventas/informes permitidos; asociar comprobantes a ventas accesibles. |
| Productos y stock | Crear/editar/importar productos; reponer; editar precios (incluido ajuste masivo); combos/atados/sueltos; eliminar/restaurar e historial; botonera asignada; listas y reglas por sucursal. |
| Mercadería | Enviar remitos; consultar/aprobar/rechazar remitos; crear/confirmar/cancelar transferencias. |
| Mi comercio | Datos y ticket; locales/cajas; nombres visibles de categorías; registros y automatización por medio de pago. |
| Personas y análisis | Accesos, perfiles/asignaciones y revocación; creación/edición de perfiles; análisis completo del asistente sobre datos accesibles. |

**Siempre disponibles:** abrir/cerrar el turno propio, arqueo a ciegas del cajero, actividad propia, tickets, lector/atajos y formas de cobro, sincronización, instalación y preferencias personales del navegador. Cámara/notificaciones se autorizan por la propia persona en el dispositivo. No se agregan interruptores que aparenten controlar permisos del navegador. Los pagos, importe manual y botonera siguen formando parte de Vender.

**Protecciones que se conservan:** asignación de sucursal/caja para operar; privacidad de movimientos ajenos; efectivo esperado del arqueo reservado a administradores; titularidad y alta de administradores reservadas al propietario. Administradores pueden agregar cajeros/supervisores. Un perfil delegado con Personas puede administrar únicamente cajeros/supervisores y no su propio acceso. Puede asignar solo permisos que ya tiene. Un perfil con Perfiles no puede conceder permisos que no tiene ni editar el perfil que él mismo utiliza. La gestión de personal no concede automáticamente la edición de perfiles, ni viceversa.

La configuración de locales dispone de una lectura de metadatos separada de la disponibilidad operativa: ver/editar nombres de todas las cajas no habilita cobrar en una caja no asignada ni consultar sus movimientos. Las escrituras de sucursal/caja usan RPC con permiso efectivo; mover o desactivar una caja con turno abierto pide cerrar ese turno. Quitar una persona con turno abierto también se rechaza sin revelar su actividad privada.

#### Persistencia y compatibilidad

Dependencia incluida en schema (no ejecutar por separado): **202610220005_category_labels.sql** y **202610220006_complete_permission_profiles.sql**, después de las anteriores y en orden. La 006 requiere las migraciones de composiciones, conversión de cigarrillos, historial de bajas y categorías estándar. No se aplicó ninguna migración remota. No se modifican las migraciones previas ni se ejecutan cambios de datos fuera de SQL preparado.

La 006 amplía el catálogo de permisos, mantiene todos los perfiles anteriores sin agregarles acciones y agrega revisión para evitar sobrescrituras entre dispositivos. El guardado de perfiles usa un RPC, comprobación de permisos concedibles, ID de solicitud estable y control de revisión. Una respuesta perdida puede reintentarse sin duplicar el perfil. Los clientes anteriores que escribían perfiles directamente deberán actualizarse: esas escrituras se revocan. Los permisos personales, asignaciones y RLS no se sustituyen por estilos ni se falsea el rol.

Las RPC existentes conservan sus cuerpos transaccionales de stock, precios, recetas, transferencias, remitos y caja, con comprobaciones explícitas de la capacidad correspondiente. El replay offline mantiene sus recibos y vuelve a validar permisos; un error no borra operaciones pendientes. Reposición limitada solo suma stock sin cambiar costo; Crear/editar productos sí permite costo y ajustes de stock, incluidos los controles y límites existentes. La configuración nueva continúa requiriendo conexión.

#### Guía de Pruebas — ampliación pendiente manual

En **http://localhost:3001/**, en un comercio de prueba y con las migraciones aplicadas:

1. Como propietario, Personas con acceso → Crear perfil: esperar 23 interruptores en cinco grupos, foco visible y Tab/Espacio. Guardar uno con nombre único y volver a **Editar [nombre]**; cambiar nombre/permisos, guardar y reabrir: mismo ID y cambios persistentes. Cancelar no guarda ni descarta otros borradores.
2. Verificar perfiles anteriores: ninguna acción nueva activada automáticamente. Asignar uno a dos personas; editarlo y actualizar ambas sesiones: deben recibir los mismos cambios. Cambiar una asignación o rol con turno abierto sigue protegido.
3. Habilitar Crear/editar productos sin Combos ni Eliminar: el cajero puede alta/edición/factura, pero no recetas ni bajas. Probar cada permiso de productos por separado: precio conserva atributos, reposición conserva restricciones de costo, combos consumen componentes, bajas registran/restauran, listas conservan sucursal y botonera respeta asignación. Comprobar también las RPC/REST con permiso desactivado.
4. Habilitar Revisar remitos y Transferencias: encontrar los accesos, consultar la imagen privada autorizada, aprobar/rechazar y crear/confirmar/cancelar en datos de prueba. Sin permisos, la UI no ofrece acciones y el servidor las rechaza; no deben alterarse cálculos ni recetas.
5. Activar por separado Datos/ticket, Locales/cajas, Categorías y Registros: Mi comercio muestra las secciones permitidas con formularios existentes. Crear/editar local y caja no cambia la asignación operativa del cajero. Intentar abrir una caja no asignada u ocupada: debe impedirlo. Nombres de categorías conservan identidad y alternativa Varios.
6. Habilitar Personas y Perfiles a un supervisor. Crear acceso de cajero, asignar perfil y caja, editar su perfil y revocar un pendiente. No puede promover a Administrador, tocar titular/administradores, modificar su propio acceso/perfil, conceder una acción ausente de su perfil ni usar IDs de otro comercio. Quitar acceso con turno abierto debe rechazarse. Probar tanto UI como API.
7. En Caja → Ver ventas, Asociar comprobantes actúa solo sobre ventas accesibles y no factura. Exportaciones/informes respetan asignaciones. Con Análisis con IA, Ayuda → Consultar al asistente → análisis completo utiliza únicamente datos accesibles; no revela movimientos ajenos ni diferencias de arqueo de cajero.
8. Desde dos dispositivos, editar el mismo perfil y guardar cambios distintos: el segundo guardado debe pedir actualizar; no sobreescribir silenciosamente. Doble clic/reintento de creación no duplica el perfil. Cambiar de pantalla y volver conserva borradores, sin capturar teclas del lector desde pantallas ocultas.
9. Quitar un permiso desde otro dispositivo, actualizar sesión y reintentar la acción: la interfaz y el servidor deben reflejar el cambio. Operaciones offline pendientes se conservan y se vuelven a validar al sincronizar; configuración sin conexión muestra error y no bloquea venta preparada. No hacer ventas de prueba en producción.
10. Repetir apertura → venta por teclado/pago mixto → retiro → cierre con perfil predeterminado. Arqueo a ciegas, confirmaciones y asistencia IA opcional permanecen iguales. Repetir con teclado, móvil y movimiento reducido.

Estas verificaciones de navegador, móvil, Supabase/RLS, Groq, concurrencia, otros dispositivos y sincronización real quedan pendientes. No se realizaron pruebas con personas ni SQL remoto. 

Sin perfil personalizado, Cajero conserva vender, ingresos, retiros, mover ventas propias de registro y enviar remitos; Supervisor agrega consulta de ventas asignadas. Reposición limitada solo suma stock sin cambiar costo; editar precio conserva atributos y comprueba el precio anterior. Supervisor se trata como cajero en RPC heredadas para conservar privacidad, sin falsear su rol real.

<a id="facturacion-electronica-arca"></a>

## Facturación electrónica ARCA (ex AFIP)

### Alcance de Fase 1 — Configuración fiscal y base de datos

La migración `supabase/migrations/202610260003_billing_fields.sql` (consolidada en `supabase/schema.sql`) añade la estructura requerida para emitir comprobantes fiscales electrónicos:

- **Datos fiscales del comercio (`retail_stores`)**:
  - `cuit`: CUIT de 11 dígitos, validado con algoritmo oficial Módulo 11.
  - `razon_social`: denominación comercial o fiscal (hasta 120 caracteres).
  - `condicion_iva`: `'MO'` (Monotributo - Factura C), `'RI'` (Responsable Inscripto - Facturas B y A), `'EX'` (IVA Exento).
  - `punto_venta_afip`: número de punto de venta electrónico (1 a 99998).
  - `iibb` e `inicio_actividades`: campos informativos opcionales.
  - `billing_enabled`: interruptor opt-in (predeterminado `false`). Restricción `CHECK` a nivel de base: no puede ser `true` si faltan CUIT, Razón Social, Condición IVA o Punto de Venta.

- **Campos fiscales por venta (`retail_sales`)**:
  - `cbte_tipo`: código ARCA (ej. 6 = Factura B, 11 = Factura C).
  - `cbte_nro`: número secuencial otorgado por ARCA.
  - `cae`: Código de Autorización Electrónico (14 dígitos).
  - `cae_vto`: fecha de vencimiento del CAE.
  - `billing_status`: `'none'`, `'pending'`, `'authorized'`, `'error'`, `'retry'`.
  - `billing_error`: descripción del último error de validación o comunicación.
  - `billing_attempts`: contador de intentos de emisión.
  - Trigger `retail_initialize_sale_billing`: asigna automáticamente `'pending'` al registrar ventas nuevas en comercios que tengan `billing_enabled = true`. Los comercios sin facturación o ventas anteriores permanecen en `'none'`.

- **Seguridad, permisos y secretos**:
  - Los datos fiscales solo pueden ser leídos por miembros del comercio y modificados por usuarios con permiso `manage_store` (owner o admin) mediante el RPC `retail_set_billing_settings`.
  - La actualización del estado fiscal de una venta se realiza mediante el RPC `retail_update_sale_billing`, accesible a usuarios con permiso `manage_store`, `sell` o `view_sales`.
  - Los certificados X.509 y claves privadas para el web service de ARCA (WSAA) se gestionan exclusivamente en el backend (Supabase Vault / Secrets). Nunca viajan ni se almacenan en el navegador del cliente.

### Fases 2 y 3 — Servicio de facturación y flujo de venta

- **Servicio y Edge Function (`billing-authorize`)**:
  - Función de Supabase en [supabase/functions/billing-authorize/index.ts](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/supabase/functions/billing-authorize/index.ts). Autentica la sesión del usuario mediante token Bearer y verifica permisos en el comercio.
  - Soporta certificados digitales X.509 en Supabase Vault (`ARCA_CERT` y `ARCA_KEY`) y modo de simulación/homologación inicial con correlatividad secuencial de comprobantes y formato de CAE oficial de 14 dígitos.
  - La lógica del cliente en [src/services/billingService.ts](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/services/billingService.ts) determina el tipo de comprobante (Factura B para Responsable Inscripto o Factura C para Monotributo) y calcula el desglose de IVA 21%.
  - Genera el código QR oficial de ARCA codificado en base64 según RG 4291/4892 (`https://www.afip.gob.ar/fe/qr/?p=...`).

- **Flujo de venta no bloqueante**:
  - Al completar el cobro en caja, la venta se guarda inmediatamente (en estado `'pending'` si el comercio tiene la facturación activada) y se dispara la solicitud en segundo plano. El cajero nunca espera la respuesta de ARCA para continuar operando.
  - Si ARCA aprueba el comprobante, la venta se actualiza con CAE y número correlativo en la base de datos y se refresca el ticket en pantalla en tiempo real.
  - Si ocurre un fallo de red o rechazo, la venta queda en estado `'error'` con el mensaje descriptivo y un botón de reintento en el historial de ventas.

- **Ticket térmico con datos fiscales**:
  - Si la venta está autorizada (`billingStatus === 'authorized'`), [ThermalReceiptModal.tsx](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/components/ThermalReceiptModal.tsx) muestra la denominación fiscal oficial, CUIT, Condición IVA, punto de venta y número correlativo (ej. `Factura B N° 0001-00000042`), el código QR escaneable de ARCA, el CAE y su fecha de vencimiento.
  - Se suprime la leyenda de no validez fiscal cuando el comprobante está autorizado. Las ventas sin facturación o pendientes conservan el ticket convencional.

### Fase 4 — Administración, monitoreo y exportación fiscal

- **Panel de monitoreo en Mi Comercio ([BillingSettings.tsx](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/features/retail/BillingSettings.tsx))**:
  - Al tener la facturación activa, muestra un monitor en vivo con el Punto de Venta fiscal, la denominación y número del último comprobante emitido correlativo con su fecha/hora, y el estado de la cola de emisión (comprobantes pendientes o con error).
  - Consulta los contadores solo al estar visible Mi comercio → Datos del comercio. Al salir, cancela las solicitudes del monitor; los borradores fiscales siguen montados. El estado de credenciales tampoco se consulta desde esa pantalla oculta.
  - Un error o una espera de más de 15 segundos muestra **Reintentar consulta**. Los errores devueltos por Supabase y los contadores ausentes no se convierten en cero ni en “Al día”. Reintentar actualiza únicamente la lectura del monitor; no emite facturas ni cambia estados fiscales.
  - Guía manual pendiente en **http://localhost:3001/**: en Vender, con la pestaña Red abierta, no deben iniciarse las tres consultas de métricas fiscales; al abrir Datos del comercio con facturación activa, debe aparecer una carga y luego datos válidos. Simular falta de conexión en datos de prueba: muestra error y reintento, sin “Al día”; restablecer conexión y reintentar: recupera métricas sin duplicar comprobantes. Navegar con un borrador fiscal: conserva sus campos. No se probaron estos recorridos en navegador/backend.
- **Métricas fiscales en el Historial de Ventas ([SalesOverview.tsx](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/features/retail/SalesOverview.tsx))**:
  - Tarjetas de resumen con el importe total facturado con CAE y la cantidad de comprobantes emitidos en el período consultado.
  - Alerta visible y conteo cuando existen comprobantes pendientes o con error.
- **Filtro de facturación ARCA**:
  - Permite filtrar el listado de ventas por: *Todos los estados fiscales*, *Autorizadas con CAE*, *Pendientes de CAE*, *Con error en ARCA* o *Sin comprobante fiscal (No fiscal)*.
- **Reintento masivo e individual**:
  - Cada venta en la tabla dispone de un botón de reintento directo en su badge de estado (`BillingStatusBadge`).
  - La administración dispone de un botón masivo (*"Reintentar facturación de N ventas con error"*) para reprocesar en serie todas las ventas fallidas con una sola acción.
- **Procesamiento de ventas offline reconectadas ([RetailApp.tsx](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/features/retail/RetailApp.tsx) y [billingService.ts](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/services/billingService.ts))**:
  - Cuando se restablece la conexión y la cola offline sincroniza ventas al backend (`retail_sync_operation`), el trigger de la base inicializa su estado fiscal en `pending`.
  - El sistema ejecuta un barrido automático en segundo plano (`processPendingSales`) para autorizar y obtener el CAE de cada venta sincronizada sin interrumpir las operaciones del cajero ni bloquear el punto de venta.
- **Exportación contable completa en CSV ([pricing.ts](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/features/retail/pricing.ts))**:
  - El archivo CSV de ventas incluye las columnas de auditoría fiscal: `Estado fiscal ARCA`, `Tipo comprobante`, `Nro comprobante`, `CAE` y `Vto CAE`.

### Guía de Pruebas manuales — Circuito completo

En **http://localhost:3001/**, con un comercio de prueba y schema aplicado en Supabase (`202610260003_billing_fields.sql`):

1. **Configuración fiscal**:
   - En **Mi comercio → Facturación electrónica ARCA**, cargar CUIT (`20-12345678-6`), Razón Social, Condición IVA (ej. Monotributo) y Punto de venta 1.
   - Activar el interruptor de facturación electrónica y guardar.
   - Verificar que aparece el panel de monitoreo con *Pto. Vta. N° 1* y estado *Al día*.
2. **Venta con emisión fiscal electrónica**:
   - Ir a **Vender**, armar un carrito y cobrar con cualquier medio de pago.
   - Observar que el cobro se confirma de inmediato sin demoras.
   - Abrir el ticket emitido: debe mostrar **Factura C**, número correlativo (ej. `0001-00000001`), CAE asignado de 14 dígitos, vencimiento a 10 días y el código QR de ARCA escaneable.
   - Probar descargar el archivo `.txt` del ticket: incluye los datos fiscales oficiales y el enlace del QR.
3. **Historial de ventas y filtros**:
   - En **Caja → Ver ventas**, verificar que la métrica *Facturado con CAE (ARCA)* refleja el total y la cantidad de comprobantes.
   - En la tabla de ventas, verificar el badge verde con el comprobante y CAE.
   - Probar el filtro *Facturación ARCA → Autorizadas con CAE* y verificar que filtre correctamente.
   - Probar la exportación CSV: abrir el archivo generado y comprobar las columnas de auditoría fiscal (`Estado fiscal ARCA`, `Tipo comprobante`, `Nro comprobante`, `CAE`, `Vto CAE`).
4. **Reintento de facturación**:
   - Si una venta queda en estado de error, verificar que en **Ver ventas** figure el banner de alerta y el botón de reintento (tanto individual en la fila como masivo).
5. **Modo no fiscal (opt-in)**:
   - Desactivar la facturación en **Mi comercio** y realizar una venta: debe generarse como ticket no fiscal estándar con la leyenda `COMPROBANTE NO VÁLIDO COMO FACTURA` y estado `none`.

### Guía de Puesta en Marcha Real con ARCA (AFIP)

Para que el sistema emita comprobantes reales con CAE y QR oficial ante ARCA (ex AFIP), el comerciante completa estos 4 pasos directamente desde la app en **Mi Comercio → Facturación electrónica ARCA**:

1. **Punto de Venta Web Services en AFIP**:
   - Ingresar con Clave Fiscal (nivel 3 o superior) a `afip.gob.ar`.
   - En *Administración de Puntos de Venta y Domicilios*, agregar un nuevo punto de venta.
   - **Crucial:** Seleccionar el sistema **"Factura Electrónica - Monotributo / Responsable Inscripto - Web Services"** (nunca Comprobantes en Línea ni Facturador Móvil).

2. **Generación de Certificado Digital y Clave**:
   - **Opción asistida (1 clic desde la app)**:
     - En **Mi Comercio → Facturación electrónica ARCA → Guía paso a paso**, hacer clic en *"⚡ Generar pedido (.csr) y clave privada (.key) en 1 clic"*.
     - El sistema genera el par de claves RSA-2048 y descarga automáticamente `pedido_afip.csr` y `privada_afip.key`.
     - La clave privada queda además precargada en el formulario de la app.
   - **Opción manual (OpenSSL)**:
     - Copiar los comandos OpenSSL disponibles en la app para generar la clave y el pedido CSR.
   - **En AFIP**:
     - Entrar a *Administración de Certificados Digitales* → *Agregar Alias* (ej. `kiosco_pos`).
     - Subir el archivo `pedido_afip.csr` y guardar.
     - Descargar el archivo `.crt` emitido por AFIP.

3. **Vincular el servicio Facturación Electrónica (WSFE)**:
   - En AFIP, entrar a *Administrador de Relaciones de Clave Fiscal* → *Nueva Relación* → *Buscar Servicio*.
   - Elegir **AFIP → Web Services → Facturación Electrónica** (WSFE).
   - En "Representante", buscar y seleccionar el alias creado en el Paso 2 (`kiosco_pos`).
   - Confirmar la relación.

4. **Carga en la App y Prueba de Conexión en Vivo**:
   - En **Mi Comercio → Facturación electrónica ARCA**:
     - Cargar el archivo `.crt` descargado de AFIP y confirmar la clave privada `.key`.
     - Seleccionar el entorno: **"Producción Oficial"**.
     - Guardar los certificados de ARCA.
     - Presionar el botón **"⚡ Probar conexión con ARCA"**:
       - La app invoca la Edge Function en tiempo real.
       - La función autentica en WSAA, consulta WSFE en AFIP y valida el Punto de Venta.
       - Muestra el resultado oficial: último comprobante autorizado registrado en AFIP.
     - Guardar los datos fiscales del comercio y activar el interruptor *"Activar facturación electrónica ARCA"*.

### Despliegue de la Edge Function en Supabase

Para que el backend procese las firmas CMS y solicitudes SOAP con AFIP:

1. **Migración de base de datos**:
   - Ejecutar en Supabase SQL Editor la migración [202610270001_store_billing_credentials.sql](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/supabase/migrations/202610270001_store_billing_credentials.sql) (crea `retail_private.store_billing_credentials` con RLS protegida para administradores).

2. **Despliegue de Edge Function**:
   ```bash
   npx supabase functions deploy billing-authorize
   ```
   *Nota: La función usa `npm:node-forge@1.3.1` para generar firmas PKCS#7 / CMS compatibles con el WSAA de AFIP y soporta tanto credenciales por comercio en la base como variables de entorno de respaldo.*




