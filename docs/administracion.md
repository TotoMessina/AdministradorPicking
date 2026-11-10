# Mi comercio, inicio y permisos

Guía vigente consolidada. Los nombres de migraciones indican dependencias, no el estado remoto: usar [schema y su historial](../SUPABASE_SETUP.md), sin repetir archivos individuales. Las Guías de Pruebas son recorridos manuales en **http://localhost:3001/**; no acreditan pruebas ejecutadas.

- [Inicio guiado](#inicio-guiado)
- [Personas y perfiles](#personas-y-perfiles)
- [Facturación electrónica ARCA (ex AFIP)](#facturacion-electronica-arca)
- [Panel de plataforma](#panel-de-plataforma)
- [Catálogo global](#catalogo-global)

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

Esta sección reemplaza las restricciones históricas posteriores que reservaban toda la configuración a administración. La base de rol sigue siendo Cajero o Supervisor; un permiso no convierte a la persona en Administrador. En **Mi comercio → Equipo y permisos → Perfiles de permisos**, **Crear perfil** y **Editar [nombre]** reutilizan el formulario de interruptores. Guardar conserva el ID y las asignaciones del perfil. Cancelar descarta solo ese editor. Cambiar el rol de un perfil nuevo conserva los interruptores elegidos; un perfil ya asignado no cambia de rol silenciosamente.

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

1. Como propietario, Equipo y permisos → Crear perfil: esperar 23 interruptores en cinco grupos, foco visible y Tab/Espacio. Guardar uno con nombre único y volver a **Editar [nombre]**; cambiar nombre/permisos, guardar y reabrir: mismo ID y cambios persistentes. Cancelar no guarda ni descarta otros borradores.
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
  - El CAE lo registra solamente la función del servidor. Desde la app, `retail_update_sale_billing` solo marca pendiente, reintento o error, y nunca cambia una venta ya autorizada.
  - El certificado y la clave los carga solo el dueño o un administrador. La clave queda cifrada en Supabase Vault y únicamente la lee la función del servidor. El pedido de certificado (.csr) y la clave se generan en el navegador: el servidor nunca devuelve una clave.

### Fases 2 y 3 — Servicio de facturación y flujo de venta

- **Servicio y Edge Function (`billing-authorize`)**:
  - Función de Supabase en [supabase/functions/billing-authorize/index.ts](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/supabase/functions/billing-authorize/index.ts). Autentica la sesión del usuario mediante token Bearer y verifica permisos en el comercio.
  - **Receptor y Factura A:** al cobrar, «Elegir cliente (opcional)» sirve también para facturar a su nombre. Comercio Responsable Inscripto: cliente RI o Monotributista con CUIT → Factura A; otros → Factura B con su documento; sin cliente → consumidor final. Monotributo: siempre Factura C. Las ventas sin conexión salen a consumidor final.
  - **Notas de crédito:** al devolver o anular una venta facturada, la app pide la nota de crédito asociada a esa factura (A, B o C) por lo devuelto. En **Anular o devolver** se ve su estado, con **Emitir nota de crédito** o **Reintentar**. Si ARCA la rechaza, se puede cargar el número de una nota emitida por fuera.
  - Usa el certificado de cada comercio. Ya no hay certificado ni entorno global: los secretos `ARCA_CERT`, `ARCA_KEY` y `ARCA_ENVIRONMENT` no se usan. Sin certificado cargado, el comercio arranca en **homologación** (pruebas).
  - El navegador manda solo el comercio y la venta. Tipo (Factura B para Responsable Inscripto, C para Monotributo), importes con IVA 21%, CUIT y punto de venta salen de la base. La fecha es la de hoy en hora argentina.
  - Genera el código QR oficial de ARCA codificado en base64 según RG 4291/4892 (`https://www.afip.gob.ar/fe/qr/?p=...`).

- **Sin facturas duplicadas** (migración `202611030002_billing_safe_issue.sql`):
  - Cada pedido queda en `retail_billing_attempts`, que solo ven dueños y administradores. Hay un único pedido en curso por punto de venta, tipo y entorno, y uno por venta. Si otra caja está facturando, se espera y se reintenta.
  - El número se anota antes de mandarlo a ARCA. Si la respuesta no llega, ese número se consulta en ARCA (`FECompConsultar`) antes de usar otro. Si figura con el mismo importe y fecha, se toma su CAE; si no figura, se pide de nuevo. Si figura con otros datos, la venta queda con error para revisarla con el contador.
  - Una venta autorizada devuelve siempre el mismo comprobante. Si una autorización llega tarde para una venta que ya tenía factura, queda marcada como conflicto, no la reemplaza.
  - Cada llamada a ARCA tiene un tiempo máximo. Si ARCA no responde o está caído, la venta queda «reintentar» y la app vuelve a probar al minuto. Si ARCA rechaza el comprobante, queda «con error» con el motivo.
  - El permiso de ARCA (WSAA, 12 horas) se guarda en la base. Así un reinicio de la función no provoca el rechazo «ya posee un TA válido».

- **Flujo de venta no bloqueante**:
  - Al completar el cobro en caja, la venta se guarda inmediatamente (en estado `'pending'` si el comercio tiene la facturación activada) y se dispara la solicitud en segundo plano. El cajero nunca espera la respuesta de ARCA para continuar operando.
  - Si ARCA aprueba el comprobante, la venta se actualiza con CAE y número correlativo en la base de datos y se refresca el ticket en pantalla en tiempo real.
  - Si ARCA rechaza, la venta queda en `'error'` con el motivo y un botón de reintento en el historial de ventas. Si no hubo respuesta, queda en `'retry'` y se reintenta sola.

- **Ticket térmico con datos fiscales**:
  - Si la venta está autorizada (`billingStatus === 'authorized'`), [ThermalReceiptModal.tsx](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/components/ThermalReceiptModal.tsx) muestra la denominación fiscal oficial, CUIT, Condición IVA, punto de venta y número correlativo (ej. `Factura B N° 0001-00000042`), el código QR escaneable de ARCA, el CAE y su fecha de vencimiento.
  - Se suprime la leyenda de no validez fiscal cuando el comprobante está autorizado. Las ventas sin facturación o pendientes conservan el ticket convencional.

### Fase 4 — Administración, monitoreo y exportación fiscal

- **Panel de monitoreo en Mi Comercio ([BillingSettings.tsx](file:///c:/Users/Usr/OneDrive/Pruebas/AdministradorKiosco/src/features/retail/BillingSettings.tsx))**:
  - Al tener la facturación activa, muestra un monitor en vivo con el Punto de Venta fiscal, la denominación y número del último comprobante emitido correlativo con su fecha/hora, y el estado de la cola de emisión (comprobantes pendientes o con error).
  - Consulta los contadores solo al estar visible Mi comercio → Configuración. Al salir, cancela las solicitudes del monitor; los borradores fiscales siguen montados. El estado de credenciales tampoco se consulta desde esa pantalla oculta.
  - Un error o una espera de más de 15 segundos muestra **Reintentar consulta**. Los errores devueltos por Supabase y los contadores ausentes no se convierten en cero ni en “Al día”. Reintentar actualiza únicamente la lectura del monitor; no emite facturas ni cambia estados fiscales.
  - Guía manual pendiente en **http://localhost:3001/**: en Vender, con la pestaña Red abierta, no deben iniciarse las tres consultas de métricas fiscales; al abrir Configuración con facturación activa, debe aparecer una carga y luego datos válidos. Simular falta de conexión en datos de prueba: muestra error y reintento, sin “Al día”; restablecer conexión y reintentar: recupera métricas sin duplicar comprobantes. Navegar con un borrador fiscal: conserva sus campos. No se probaron estos recorridos en navegador/backend.
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

### Prueba en homologación sin duplicados

Hacerla en un **proyecto de Supabase de prueba**, nunca en producción: las facturas de homologación dejan un CAE de prueba en las ventas. Requiere el certificado de homologación de ARCA (WSASS, «Autogestión Certificados Homologación») y el servicio `wsfe` asociado. Ver [Copias de seguridad](respaldos.md) para armar el proyecto de prueba.

1. Aplicar la migración `202611030002_billing_safe_issue.sql` y publicar la función: `npx supabase functions deploy billing-authorize`.
2. En **Mi comercio → Facturación electrónica ARCA**, generar el pedido (.csr). La clave se descarga desde el navegador. Subir el .csr en WSASS, descargar el certificado y cargar los dos con **Homologación** marcado. **Probar conexión** muestra el último número.
3. **Factura C**, con Monotributo: cobrar una venta y ver en el ticket Factura C con CAE y QR. **Factura B**, con Responsable Inscripto: el ticket discrimina el IVA. Cobrar dos ventas seguidas desde dos cajas: los números quedan consecutivos y no se repiten.
4. **Doble pedido**: con la venta recién cobrada, tocar reintentar varias veces. Sigue siendo un solo comprobante y el mismo CAE.
5. **ARCA caído**: cortar internet del equipo justo después de cobrar, o bloquear `wswhomo.afip.gov.ar`. La venta queda «reintentar» y el cobro no se frena. Al volver la conexión, se factura sola una sola vez.
6. **Respuesta perdida**: en el SQL Editor del proyecto de prueba, ver los pedidos con `select status, cbte_nro, cae, error from retail_billing_attempts order by created_at desc limit 10;`. Un pedido «sent» se resuelve en el próximo intento, pasados 3 minutos, consultando ARCA, sin un número nuevo.
7. **Anulada**: anular una venta pendiente antes de facturar. No se emite factura.

8. **Factura A** (comercio RI): en Clientes, cargar un cliente con CUIT y condición Responsable Inscripto. En Vender, elegirlo en «Elegir cliente (opcional)» y cobrar con efectivo. El ticket dice Factura A, muestra el cliente y discrimina el IVA. Repetir con un Monotributista: también Factura A. Con un cliente RI sin CUIT, la venta queda con error «cargá el CUIT».
9. **Nota de crédito**: devolver una parte de una venta facturada. En **Anular o devolver** aparece la nota de crédito B (o A, o C) con su número y CAE. Tocar **Reintentar** no emite otra. Cortar internet antes de devolver: queda «reintentar» y se emite al volver, una sola vez.
10. En ARCA (Comprobantes en línea, consulta de homologación o el último número desde **Probar conexión**), comparar los números con los de la app: no hay saltos ni repetidos.

Las alícuotas distintas del 21% y los exentos quedan pendientes de confirmar con tu contador. Ver la [lista de control](facturacion-contador.md).

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






<a id="comparar-sucursales"></a>

## Comparar sucursales

En **Ganancias → Este mes**, debajo de lo que te quedó, una barra muestra de cada $100 vendidos cuánto fue al costo de la mercadería, gastos, comisiones de cobro y pérdidas de stock, y cuánto quedó. Si se gastó más de lo vendido, la parte que faltó se ve rayada en rojo con la marca de hasta dónde llegaron las ventas. Las tarjetas con los importes siguen debajo.

En **Ganancias → Comparar sucursales**, solo dueños y administradores, se elige el período: hoy, últimos 7 días, este mes, mes anterior o fechas a elección, de hasta un año. Cada sucursal tiene una tarjeta con:

- **Ventas:** netas de devoluciones, con la parte del total y lo devuelto.
- **Ganancia bruta:** ventas menos el costo guardado en cada ticket, con el margen. Los gastos siguen en «Este mes».
- **Tickets y ticket promedio.**
- **Más vendidos:** los 5 con más unidades. Los combos cuentan por sus componentes y las ventas anuladas no cuentan.
- **Sin rotación:** productos con stock en esa sucursal que no se vendieron en el período. Primero se muestran los que tienen más plata inmovilizada.

El cálculo es el mismo de Ganancias y se hace en el servidor. Si una parte de lo vendido no tiene costo cargado, se avisa cuánto es. Desde el 5% de las ventas sin costo, el panel indica que la ganancia no es confiable y marca la sucursal con «Faltan costos». En celular las tarjetas se apilan.

### Guía de Pruebas — comparar sucursales

En http://localhost:3001/, con un comercio de pruebas con dos sucursales.

1. **Ventas por sucursal:** vender en cada sucursal y abrir **Ganancias → Comparar sucursales** con «Hoy». Esperado: una tarjeta por sucursal, ordenadas por ventas, con tickets y ticket promedio correctos.
2. **Mismo cálculo que Ganancias:** con «Este mes», la suma de ventas coincide con «Vendiste» de «Este mes».
3. **Devoluciones:** hacer una devolución parcial. Esperado: bajan las ventas de esa sucursal y se muestra lo devuelto.
4. **Costos faltantes:** vender un producto sin costo por más del 5% del total. Esperado: aviso de ganancia no confiable y «Faltan costos» en la sucursal.
5. **Sin rotación:** un producto con stock que no se vendió en el período aparece en «Sin rotación» con su valor.
6. **Permisos:** un cajero o supervisor no ve Ganancias.
7. **Celular:** las tarjetas se apilan sin desplazamiento lateral y el período se cambia cómodo.


<a id="actividad"></a>

## Actividad: quién hizo qué

En **Mi comercio → Actividad**, solo dueños y administradores, se ve en un solo lugar quién hizo qué. Se ve como **tabla agrupada por día**, con columnas Hora, Tipo, Qué pasó (con su detalle o motivo), Cambio (antes tachado → después), Quién y Sucursal (si hay más de una). El encabezado y el día quedan fijos al desplazarse.

- **Filtros:** período con botones (Hoy, 7 días, 30 días o Elegir fechas), tipo con un toque en su chip (tocarlo de nuevo lo quita), persona, sucursal y texto. **Limpiar filtros** vuelve a ver todo.
- **Descargar CSV:** baja lo que se ve, con fecha, hora, tipo, qué pasó, detalle, cambios, quién y sucursal, para abrir en Excel. «Ver más antiguos» suma más filas a la tabla y al archivo.
Es de solo lectura: nadie puede editar ni borrar lo registrado.

| Qué | Dónde queda registrado |
| --- | --- |
| Cambios de precios y costos, precios fijos y listas | Registro nuevo de actividad, desde la migración 202611020009. |
| Ediciones de productos (nombre, código, aviso, categoría, bulto, proveedor) | Registro nuevo. |
| Stock editado desde la ficha del producto | Registro nuevo, con la sucursal. |
| Reposiciones, depósito, traslados y conteos | Su propio historial. |
| Aperturas y cierres de caja (esperado, contado y diferencia) | Historial de turnos. |
| Ingresos y retiros, movimientos de plata, gastos, pagos a proveedores y cobros a clientes | Su propio historial. |
| Anulaciones y devoluciones; pagos anulados; cambios de registro de una venta | Su propio historial. |
| Equipo y permisos, accesos pendientes, perfiles y permisos de roles | Registro nuevo. |
| Datos del comercio, locales, cajas y registros de ventas | Registro nuevo. |
| Productos eliminados y restaurados; gastos eliminados; borrados de configuración | Historial de bajas y registro nuevo. |

**Qué no se muestra:**
- **Las ventas una por una:** están en Caja y en los informes.
- **Antes de la migración 202611020009:** los cambios de precios, permisos y configuración anteriores no quedaron registrados.

**Qué nunca se guarda:** contraseñas, tokens ni certificados.

**Conservación:** los cambios de precios, productos, permisos y configuración se guardan 24 meses. Las ventas, cajas, plata, stock y demás historiales operativos no se borran.

### Guía de Pruebas — actividad

En http://localhost:3001/, con un comercio de pruebas y la migración aplicada.

1. **Cambio de precio:** cambiar el precio de un producto. En **Mi comercio → Actividad**, esperado: «Cambió producto «X»» con tu email y el precio anterior tachado y el nuevo.
2. **Stock desde la ficha:** editar el stock en la ficha. Esperado: aparece en Stock con la sucursal y antes/después. Una venta no aparece como cambio de stock.
3. **Caja:** abrir caja, hacer un retiro y cerrar. Esperado: apertura, retiro con su motivo y cierre con esperado, contado y diferencia.
4. **Anulación:** anular una venta. Esperado: «Anuló la venta T-…» con el motivo.
5. **Permisos:** dar acceso a una persona y cambiar un perfil. Esperado: aparecen en Permisos.
6. **Filtros:** filtrar por persona, por tipo y buscar un texto del motivo.
7. **Solo lectura:** desde el SQL Editor, intentar `delete from retail_audit_log;`. Esperado: error «solo lectura».
8. **Tabla y filtros:** elegir **7 días** y tocar el chip **Precios**. Esperado: solo cambios de precio, agrupados por día, con el antes tachado y el después en negrita. Tocar **Precios** otra vez vuelve a Todo. **Limpiar filtros** quita persona, sucursal y búsqueda.
9. **CSV:** tocar **Descargar CSV**. Esperado: abre en Excel con acentos y una fila por movimiento, con los cambios en una columna.
10. **Celular:** los botones de período ocupan el ancho, los filtros se apilan y la tabla se desplaza dentro de su recuadro, sin mover la página.

<a id="panel-de-plataforma"></a>
## Panel de plataforma

Herramientas del proveedor del servicio, solo para quien está en `retail_private.platform_admins` (se otorga desde el SQL Editor, [cómo](../SUPABASE_SETUP.md#administrador-de-plataforma-y-catálogo-global)). Requiere `202611060001_platform_admin_panel.sql`.

- **Dónde:** **Mi comercio → Más opciones → Panel de plataforma**. La tarjeta solo aparece para administradores de plataforma; cada función vuelve a validar el permiso en la base.
- **Resumen:** comercios, usuarios, ventas, IA y catálogo del período elegido (7, 30, 90 días o un año), y la lista de administradores de plataforma (solo lectura).
- **Comercios:** todos los comercios con dueño, personas, sucursales, productos, ventas del período, última venta y tokens de IA. **Ver detalle** muestra personas con su último ingreso, sucursales, cajas, turnos abiertos, opciones activas y la IA por pantalla.
- **Seguimiento interno:** estado (En prueba, Activo, Requiere atención, Dado de baja) y una nota por comercio. Es informativo: no bloquea ni habilita nada en el comercio.
- **Suspender comercio:** en el detalle, **Acceso al comercio** pide un motivo y confirmación (requiere `202611060002_store_suspension.sql`). Desde ese momento nadie del comercio puede leer ni operar: la base deja de reconocer su membresía en todos los permisos. Al entrar ven «Acceso suspendido» con el motivo, sin la opción de crear otro comercio. Una app ya abierta lo aplica en el próximo control (hasta 5 minutos) o en la próxima acción, que falla. No borra datos ni cierra turnos; **Reactivar comercio** devuelve el acceso tal como estaba y queda historial de ambas acciones. Las operaciones guardadas sin conexión quedan pendientes, sin marcarse con error, y se envían solas al reactivar. Los administradores de plataforma no quedan bloqueados.
- **Planes y abonos** (requiere `202611060004_plans_and_subscriptions.sql`): planes con precio mensual y límites de sucursales, cajas activas, personas e IA por día (vacío = sin límite). La pestaña muestra ingreso mensual estimado, lo cobrado en 30 días, comercios por estado y los que vencen en 7 días o ya vencieron. Ahí se elige el plan y la prueba gratis de los comercios nuevos y los días de gracia.
- **Abono de cada comercio:** en su detalle se asigna el plan, se da una prueba, se marca bonificado o se quita el abono, y se registran pagos (meses, importe, medio y referencia). Cada pago extiende el acceso desde lo más lejano entre hoy, lo pagado y el fin de la prueba; reintentar el mismo pago no lo duplica.
- **Estados del abono:** en prueba, al día, vencido (en gracia: sigue funcionando y el dueño ve el aviso), bloqueado (pasada la gracia, mismo bloqueo que la suspensión) y bonificado. Al registrar el pago, el acceso vuelve en el acto. **Un comercio sin abono no se controla**: así quedan todos los existentes hasta que se les asigne un plan.
- **Límites:** rigen al agregar sucursales, activar cajas, invitar o sumar personas; el mensaje dice el límite del plan. Lo que el comercio ya tiene no se borra. La IA usa el cupo del plan, salvo que el comercio tenga configuración propia.
- **Aviso al dueño:** dueños y administradores ven un aviso (fuera de Vender) cuando la prueba o el abono vencen en 7 días o ya vencieron.
- **Avisos** (requiere `202611060005_platform_announcements.sql`): título, mensaje, importancia, destinatarios (todos, dueños y administradores, comercios de un plan o un comercio por su ID) y cuántos días queda visible. Antes de enviar confirma cuántos usuarios y dispositivos alcanza; reintentar el mismo envío no lo duplica. Dentro de la app aparece arriba de cada pantalla hasta que la persona toca **Entendido** o vence; en Vender solo se muestran los urgentes, sin tapar el cobro. También se ve en la pantalla de acceso, incluso con el comercio suspendido. Con **Enviar también por push** llega a los dispositivos de quienes activaron los avisos: dueños y administradores desde **Mi comercio → App y avisos**; cajeros y supervisores desde **App y avisos** si tienen acceso a ajustes, o con **Activar avisos** junto a su cuenta. Cajeros y supervisores reciben solo los avisos del servicio, no stock bajo ni cierres de caja. La lista muestra cuántos lo leyeron y cuántos push salieron; **Cancelar** lo oculta y frena los push pendientes, pero no retira los ya entregados.
- **Publicidad** (requiere `202611060007_advertising.sql`): anunciantes y campañas en tres lugares, nunca en Vender ni en la caja:
  - **Ofertas en pedidos:** en Proveedores → pedidos, debajo de cada producto que se está pidiendo, «Publicidad · X lo tiene a $Y» con **Contactar** (WhatsApp con un mensaje armado o enlace). Se aparea por código de barras.
  - **Destacados del catálogo global:** tarjetas arriba de **Agregar desde el catálogo global** y la etiqueta «Destacado» o «Nuevo lanzamiento» en esas filas, que van primero. Con una marca, **Ver productos de…** elige esa marca.
  - **Tarjeta en Inicio:** al final, solo para dueños y administradores, con tope opcional de veces por comercio y día.
  - **Segmentación:** planes, zona (palabras de la dirección del comercio) o comercios por ID. Los planes con **Sin publicidad** no ven ninguna. Se puede terminar sola al llegar a un número de contactos.
  - **Medición e informe:** vistas, comercios alcanzados y contactos por día; un contacto es un toque en el botón, uno por comercio, producto y día. El informe estima lo que hay que facturar según el modelo (monto fijo, por contacto o por mil vistas) y descarga los contactos en CSV. Al anunciante no se le da ningún dato de ventas.
  - **Imágenes:** JPG, PNG o WEBP de hasta 1 MB, públicas.
- **Eliminar y limpiar** (requiere `202611060008_delete_campaigns_and_notices.sql`): cada campaña y cada aviso tiene **Eliminar**, con confirmación. Al pie de Publicidad y de Avisos, **Limpiar** borra de una vez las campañas terminadas o los avisos vencidos o cancelados hace más de los días indicados; antes muestra cuántos son. Se borra también lo asociado: vistas, contactos e imágenes sin uso de las campañas; lecturas y push de los avisos. No se puede deshacer: si una campaña se factura, descargar antes el informe.
  - Antes de publicar, revisar el rubro: la publicidad de tabaco está prohibida (Ley 26.687) y la de alcohol tiene restricciones (Ley 24.788).
- **Usuarios:** búsqueda por correo para soporte: alta, último ingreso, correo confirmado y comercios con su rol.
- **Uso de IA:** consultas, tokens, errores, por día, comercio, pantalla y modelo, y los últimos errores. Con el servidor de IA (sin `VITE_GROQ_API_KEY` en la app) el uso lo registra el servidor; si la app todavía tiene esa clave, lo informa cada dispositivo y es orientativo.
- **Control de la IA** (requiere `202611060003_ai_server_limits.sql` y la función `ai-proxy`): pausar la IA para todos y fijar un cupo diario de tokens por comercio. En el detalle de cada comercio, **IA de este comercio** permite deshabilitarla o darle otro cupo. Al llegar al cupo, las herramientas de IA avisan y vuelven al día siguiente (día de Argentina); vender, cobrar y guardar no se afectan. Además, cada persona tiene un freno de 30 consultas por minuto.
- **Privacidad:** muestra conteos y totales por comercio; no muestra tickets, clientes, movimientos ni comprobantes.

### Guía de Pruebas — panel de plataforma

1. **Sin permiso:** con una cuenta que no está en `platform_admins`, abrir **Mi comercio → Más opciones**. Esperado: no aparece «Panel de plataforma».
2. **Resumen:** con tu cuenta agregada, abrir el panel. Esperado: totales de comercios, usuarios y ventas; cambiar el período actualiza los números.
3. **Comercios:** buscar un comercio por nombre o correo del dueño y tocar **Ver detalle**. Guardar un estado y una nota. Esperado: aviso «Seguimiento guardado» y el estado aparece en la lista.
4. **IA:** usar el asistente en un comercio y volver a **Uso de IA → Actualizar**. Esperado: suma una consulta con sus tokens, en la pantalla Asistente.
5. **Suspender:** con un comercio de pruebas, suspenderlo con un motivo y entrar con una persona de ese comercio. Esperado: «Acceso suspendido» con el motivo y sin formulario para crear comercio. Reactivarlo y tocar **Actualizar accesos**: vuelve a entrar con sus datos.
6. **Planes:** crear un plan con 1 sucursal y asignarlo a un comercio de pruebas con 3 días de prueba. Intentar agregar una sucursal: aviso «Tu plan permite hasta 1 sucursales…». El dueño ve «Tu prueba gratis termina…».
7. **Pago:** registrar 1 mes. Esperado: acceso hasta un mes después del fin de la prueba y el pago en el historial. Con 0 días de prueba y 0 de gracia en otro comercio sin pagos, quien entra ve «Acceso suspendido» con «El abono venció…»; registrar el pago y **Actualizar accesos** lo devuelve.
8. **Avisos:** enviar un aviso informativo a «Un comercio» con el ID de un comercio de pruebas. Esperado: la confirmación indica cuántos usuarios alcanza; al entrar con una persona de ese comercio aparece arriba y desaparece con **Entendido**, también al recargar. Un aviso no urgente no aparece en Vender.
9. **Push:** con un dispositivo de dueño con avisos activados, enviar un aviso con push. Esperado: en uno o dos minutos llega la notificación y, al tocarla, abre Inicio. En la lista, «Push» pasa a «1 de 1».
10. **Publicidad:** crear un anunciante y una campaña «Ofertas en pedidos» con el código de un producto que esté por debajo del mínimo en un comercio de pruebas, con WhatsApp. Esperado: en Proveedores → pedidos aparece «Publicidad · … lo tiene a $…»; **Contactar** abre WhatsApp con el mensaje y el informe suma 1 vista y 1 contacto. Un segundo toque el mismo día no suma otro contacto.
11. **Destacados e Inicio:** una campaña de catálogo con una marca y otra de Inicio. Esperado: tarjeta arriba en **Agregar desde el catálogo global**, etiqueta en las filas; tarjeta al final de Inicio para el dueño, no para el cajero. Con el comercio en un plan **Sin publicidad**, no aparece ninguna.
12. **Celular:** las tablas se desplazan dentro de su recuadro, sin mover la página.

<a id="catalogo-global"></a>
## Catálogo global

Datos por código de barras (nombre, marca, categoría sugerida, emoji y descripción) que comparten todos los comercios y que se proponen al cargar un producto. Lo administra solo quien está en `retail_private.platform_admins`, un permiso aparte de ser dueño o administrador de un comercio que se otorga desde el SQL Editor ([cómo](../SUPABASE_SETUP.md#administrador-de-plataforma-y-catálogo-global)). Requiere la migración `202611030004_platform_admin_catalog.sql`.

- **Dónde:** **Mi comercio → Más opciones → Panel de plataforma → Catálogo global**. La tarjeta solo aparece para administradores de plataforma. Ocultarla no da el permiso: la base lo vuelve a validar en cada cambio.
- **Consultar:** por defecto muestra los productos sin verificar, primero los que más comercios aportaron. Se puede buscar por código exacto o por parte del nombre, y ver los verificados o todos.
- **Editar o agregar:** reemplaza los datos del código. **Verificado** deja el producto con confianza 100% y los comercios ya no pueden cambiarlo. Si se desmarca, vuelve a ser comunitario.
- **Eliminar:** borra el código del catálogo global. Los productos que los comercios ya cargaron no cambian, porque solo copiaron los datos.
- Los comercios siguen aportando solo cuando guardan un producto: completan campos vacíos y nunca pisan datos existentes.

### Trabajar con Excel

Requiere además `202611030005_global_catalog_import.sql`.

- **Descargar Excel:** baja todo el catálogo en un `.xlsx` con las columnas Código, Nombre, Marca, Categoría, Emoji, Descripción y Verificado. Aportes y Confianza % son informativos y se ignoran al subir. La hoja «Instrucciones» resume estas reglas.
- **Subir Excel:** sirve para corregir productos y para agregar nuevos. La primera fila tiene que tener los nombres de las columnas, y «Código» es obligatoria. Antes de guardar, la app muestra cuántos productos son nuevos, cuántos cambian, cuántos quedan igual y qué filas tienen error. Las filas con error no se guardan.
- **Celdas y columnas:** una celda vacía borra ese dato, salvo Nombre, que es obligatorio. Una columna que no está en la planilla no cambia. En Verificado, «Sí» lo deja oficial, «No» lo vuelve comunitario y vacío no cambia el estado. Un código nuevo sin «Sí» queda comunitario.
- **Códigos:** dejar la columna Código como texto. Si Excel la convirtió en número y perdió dígitos, la fila sale con error. Un código que perdió un cero adelante no se puede detectar: revisar los de 12 dígitos.
- **Archivos grandes:** se guarda de a 500 filas. Si se corta, lo ya guardado queda, y volver a subir el mismo archivo completa el resto sin duplicar.

#### Guía de Pruebas — Excel

1. **Descargar:** tocar **Descargar Excel**. Esperado: baja `catalogo_global_AAAA-MM-DD.xlsx` y Excel muestra los códigos completos, sin notación científica.
2. **Sin cambios:** subir el mismo archivo sin tocarlo. Esperado: todo «sin cambios» y el botón dice «No hay cambios para guardar».
3. **Corregir:** cambiar la marca de dos productos y poner «Sí» en Verificado a uno. Esperado: «2 con cambios» y, en «Ver qué cambia», los campos de cada uno. Al guardar, aparecen actualizados en la lista.
4. **Agregar:** sumar una fila con código nuevo y nombre. Esperado: «1 nuevo». Con «Sí» en Verificado queda verificado; sin él, comunitario.
5. **Errores:** dejar un nombre vacío, repetir un código y escribir «Quizás» en Verificado. Esperado: cada fila figura con su error y no se guarda. El resto se puede guardar igual.
6. **Columnas parciales:** subir un Excel con solo Código y Marca. Esperado: cambian solo las marcas; nombres y estado quedan igual.
7. **Archivo inválido:** subir un `.xlsx` sin columna Código. Esperado: aviso «Falta la columna «Código»…» sin cambios.
8. **Celular:** en el celular, la revisión se lee sin desplazamiento lateral y Cancelar/Guardar quedan alcanzables.

### Guía de Pruebas — catálogo global

En http://localhost:3001/, con la migración aplicada.

1. **Sin permiso:** con una cuenta que no está en `platform_admins`, abrir **Mi comercio → Más opciones**. Esperado: no aparece «Panel de plataforma».
2. **Con permiso:** agregar tu cuenta desde el SQL Editor, recargar la app y abrir **Panel de plataforma → Catálogo global**. Esperado: lista de productos sin verificar.
3. **Buscar:** buscar un código existente y después parte de un nombre. Esperado: aparece el producto. Con «Verificados» o «Todos» cambia la lista.
4. **Verificar:** editar un producto sin verificar, corregir el nombre, marcar **Verificado** y guardar. Esperado: aviso de guardado. El producto sale de «Sin verificar» y aparece en «Verificados».
5. **Protección:** en otro comercio, cargar un producto con ese código y otro nombre. Esperado: el catálogo global conserva el nombre verificado.
6. **Agregar y eliminar:** agregar un código nuevo y después eliminarlo, confirmando. Esperado: deja de aparecer en la búsqueda.
7. **Teclado y celular:** al abrir el editor, el foco va al título y Cancelar lo devuelve al botón que se usó. En el celular, los campos y los botones se apilan sin desplazamiento lateral.
