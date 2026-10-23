# Mi comercio, inicio y permisos

Guía vigente consolidada. Los nombres de migraciones indican dependencias, no el estado remoto: usar [schema y su historial](../SUPABASE_SETUP.md), sin repetir archivos individuales. Las Guías de Pruebas son recorridos manuales en **http://localhost:3001/**; no acreditan pruebas ejecutadas.

- [Inicio guiado](#inicio-guiado)
- [Personas y perfiles](#personas-y-perfiles)

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

