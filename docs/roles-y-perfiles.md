# Supervisor y perfiles de permisos

## Presentación de permisos

En **Mi comercio → Personas con acceso → Perfiles de permisos**, las acciones se activan con interruptores, agrupados en **Caja y ventas** y **Productos**. Las etiquetas son breves; **Alcance de los permisos** conserva las explicaciones de stock compartido, privacidad y sincronización. El contador muestra cuántas acciones están activas. Cambiar un interruptor modifica el borrador; solo **Guardar perfil** lo persiste. Al asignar un perfil, **Ver permisos** despliega las acciones incluidas. No cambia la autorización ni los permisos predeterminados.

La presentación usa la paleta existente, dos columnas cuando hay espacio y una en móvil. Los interruptores tienen foco visible, se operan con Tab y Espacio y respetan movimiento reducido. La validación visual en navegador/móvil y con lector de pantalla queda pendiente; no se aplicaron migraciones en este ajuste.

Comprobación de código del ajuste: `npx tsc --noEmit -p tsconfig.app.json`, finalizó sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas.

### Guía de Pruebas del ajuste visual — pendiente

En **http://localhost:3001/**, como administrador de un comercio de prueba:

1. Abrir **Mi comercio → Personas con acceso → Crear perfil**. Esperado: nombre, rol y dos grupos de interruptores; las explicaciones extensas están plegadas.
2. Activar **Reponer stock** y desactivar **Retiros** con clic y después con Tab/Espacio. Esperado: se mueve el indicador, cambia el contador y el foco es visible, sin enviar el formulario.
3. Guardar y volver a editar. Esperado: persisten los mismos permisos. Cambiar un interruptor y cancelar: no persiste ese cambio. Alternar editores conserva los demás borradores según el flujo existente.
4. Abrir **Alcance de los permisos** y, al asignar un perfil, **Ver permisos**. Esperado: se puede consultar el detalle sin activarlo ni modificarlo.
5. Repetir con ancho móvil y movimiento reducido. Esperado: una columna, filas completas pulsables, Guardar alcanzable y sin animaciones cuando se solicitan movimientos reducidos.

## Acceso y alcance

En **Mi comercio → Personas con acceso**, propietario y administrador pueden crear y editar perfiles para los roles Cajero y Supervisor. Un perfil es el subrol: por ejemplo, «Cajero sin retiros», «Cajero de consulta» o «Supervisor sin cobro». Después se asigna a una persona o invitación pendiente mediante **Rol y perfil de [email]**. El propietario también puede elegirlo directamente en **Agregar persona** antes de crear/autorizar la cuenta.

Cada perfil habilita individualmente:

- Vender y cobrar.
- Registrar ingresos de efectivo.
- Registrar retiros de efectivo, incluidos pagos a proveedores.
- Cambiar ventas propias de registro.
- Enviar remitos para revisión.
- Consultar ventas e informes de las cajas/sucursales asignadas.
- Reponer stock compartido mediante unidades o bultos, sin descontar existencias ni cambiar costos.
- Editar exclusivamente el precio base de productos existentes.
- Personalizar la botonera rápida de sucursales asignadas.

Sin perfil personalizado, Cajero conserva las cinco primeras acciones y Supervisor agrega consulta de ventas. Abrir/cerrar el turno propio y consultar su actividad se conservan incluso con todas las acciones personalizadas deshabilitadas. Así, quitar acciones no deja a la persona con un turno imposible de cerrar. El arqueo de Cajero y Supervisor sigue siendo a ciegas.

Supervisor no recibe acceso automático al catálogo, configuración, gestión de personas, cambios de listas ni movimientos/comprobantes privados de otras personas. Reposición, edición de precios y botonera se habilitan por separado en un perfil personalizado. Aprobar remitos, descontar stock, cambiar costos, crear/archivar productos, CSV y las demás funciones administrativas siguen reservadas a administración.

### Acciones de productos delegadas

Administración debe marcar las acciones nuevas explícitamente: la ampliación no las agrega a roles ni perfiles existentes. Crear un perfil nuevo también las deja desmarcadas, incluso si su rol base es Supervisor. El acceso Productos y stock aparece para las personas con al menos una de estas tres acciones. Usa el catálogo existente y muestra únicamente los controles habilitados.

Stock y precio base son compartidos por todo el comercio, no por sucursal. Otorgar esos permisos autoriza cambios sobre ese stock/precio compartido; no crea inventarios ni precios separados por usuario. Las listas mantienen sus ajustes y precios fijos. La botonera sí se limita a la sucursal seleccionada y a las cajas habilitadas en la asignación de la persona.

Reponer reutiliza el formulario de unidades/bultos del catálogo. Personal delegado solo puede sumar cantidades positivas; costo, precio, stock negativo y archivado se conservan fuera de ese permiso. La solicitud conserva ID, fecha y contenido durante reintentos, y se procesa mediante los recibos de la cola existente. Cada reposición tiene su movimiento de stock y autor. Las reposiciones positivas también actualizan `last_restocked_at` con la fecha de la operación, sin retrocederla si llega una operación anterior.

Editar precio abre un formulario específico con precio y Cancelar/Guardar. La RPC solo modifica `price`, comprueba el precio anterior y conserva stock, costo, bulto, margen y todos los atributos. Un precio cambiado desde otro dispositivo pide revisar antes de sobrescribirlo. Reposición funciona con los permisos cargados offline; editar precios y guardar la botonera requieren conexión. Cambiar una regla o un precio no recalcula el carrito en curso; las validaciones de cobro existentes siguen vigentes.

Personalizar botonera usa el mismo editor de Vender. También se ofrece en Productos y stock para perfiles que no pueden vender. Guardar ahí actualiza la botonera visible de Vender en la misma sesión sin capturar teclas del lector. No concede acceso a catálogos de otra tienda ni a la configuración de sucursales.

El perfil establece qué puede hacer. La asignación existente de sucursal y caja establece dónde. Consultar otras ventas requiere la acción correspondiente y respeta esa asignación; la lectura de ventas propias históricas se conserva como antes. Los informes limitados se titulan **Ventas disponibles** y sus exportaciones/totales no se presentan como todo el comercio. Un perfil con permiso de consulta puede habilitar esta lectura también a un Cajero de forma explícita. Ninguno de los dos roles puede modificar ventas de otras personas ni asociar comprobantes emitidos.

Solo el propietario conserva la creación de accesos y revocación de miembros/invitaciones. Administración puede configurar los perfiles y convertir Cajero ↔ Supervisor. Este editor no permite promover a Administrador/Propietario ni modificar sus roles. Cambiar el rol base de una persona con turno abierto requiere cerrar ese turno primero; cambiar su perfil no cambia la asignación de sucursal/caja. El rol base de un perfil existente no se cambia, para no invalidar a todas las personas asignadas. No se borran perfiles ni asignaciones para simplificar la interfaz.

## Migración y autorización

Aplicar la migración local **`supabase/migrations/202610210002_staff_profiles.sql`** después de las anteriores, incluida `202610210001_ledger_routing.sql`, antes de desplegar el cliente. No se aplicó SQL remoto durante esta implementación. Revisar el historial del entorno antes de ejecutar migraciones; no aplicar indiscriminadamente archivos pendientes ajenos a este cambio.

La migración agrega Supervisor a los roles válidos, la tabla de perfiles por comercio y referencias opcionales en miembros e invitaciones. Las membresías actuales quedan sin perfil personalizado y conservan las acciones habituales. Las invitaciones aceptadas copian su perfil. Una validación impide asociar un perfil de otro comercio o rol base. La asignación, perfiles y permisos son persistentes y compartidos entre dispositivos.

Para las tres acciones de productos aplicar también **`supabase/migrations/202610210004_delegated_catalog_actions.sql`** después de las migraciones previas, incluida la columna de reposición de `202610200003_product_expiry.sql`. Extiende la lista permitida en perfiles y la RPC de consulta; agrega una RPC que actualiza solo precio y permite stock positivo y botonera a perfiles autorizados. No amplía los permisos generales de escritura en `retail_products`: intentar guardar un producto entero sigue reservado a administración. La RPC de sincronización conserva sus validaciones y recibos; en stock suma la comprobación del perfil y las restricciones del personal delegado. Esta migración está preparada localmente y no se aplicó a Supabase durante la implementación.

Las RPC heredadas que distinguen administrador/cajero reciben Supervisor como cajero a través de `retail_private.role_for`, manteniendo sus límites de seguridad y asignación. El rol real continúa en `retail_members.role` y en la RPC de equipo; la nueva función de permisos consulta ese rol real y el perfil. Supervisor no se transforma en administrador por comparación de cadenas ni por estilos.

Las escrituras se protegen en la base con triggers: venta, ingreso/retiro, cambio de registro y envío de remito. Esto cubre tanto REST/RPC como la repetición de operaciones offline. Se bloquean la membresía/perfil durante la validación de una acción para serializarla con cambios concurrentes. La política adicional de lectura de ventas comprueba el permiso y acceso a la caja; no concede lectura de movimientos o turnos ajenos. Los perfiles usan RLS y solo administración puede crearlos/editarlos. No se conceden actualizaciones directas de membresías al cliente.

El esquema y las RPC nuevas son requisito de esta versión; antes de preparar offline hay que cargar los permisos con conexión. Sin la migración, las llamadas nuevas no están disponibles y la aplicación debe indicar qué actualización falta. TypeScript no valida SQL, RLS ni que la migración esté aplicada en el proyecto correcto.

## Offline y cambios de permisos

El dispositivo guarda las acciones efectivas en su caché por cuenta y comercio. Vender/registrar movimientos comprueba esa copia antes de encolar. La sincronización vuelve a validar los permisos actuales en Supabase: una acción guardada offline puede quedar en conflicto si fue revocada antes de sincronizar. No se borra la operación ni se cambia su importe o su autor para eludir el conflicto.

Las lecturas de autorización pueden refrescarse con conexión aunque haya una cola pendiente, sin reemplazar stock, ventas ni saldos optimistas. Guardar perfiles/asignaciones refresca las entradas de autorización disponibles. Otra sesión ve los cambios después de actualizar sus datos; no se implementa expulsión instantánea ni revocación remota de datos que ya estaban en caché en un dispositivo desconectado. Crear/editar perfiles y asignarlos requiere conexión.

## Guía de Pruebas — pendiente de ejecución manual

En **http://localhost:3001/**, usar cuentas y comercios de prueba con la migración aplicada. No hacer ventas/reposiciones ficticias en producción.

1. **Compatibilidad:** entrar con un propietario, administrador y cajero existentes sin perfil. Esperado: mantienen sus funciones habituales; el Cajero no gana lectura de otras ventas. Verificar carrito, lector, F1–F4, pagos mixtos y cierre a ciegas.
2. **Perfil de Cajero:** en Mi comercio → Personas con acceso, crear «Cajero sin retiros», dejando venta e ingresos y quitando retiros. Asignarlo a una cuenta existente y actualizar esa sesión. Esperado: puede vender/ingresar efectivo, no aparece Retiro, y puede cerrar su turno. Intentar retiro por RPC directa: rechazo en backend, sin movimiento ni cambio del saldo.
3. **Supervisor:** crear una cuenta de Supervisor o cambiar un Cajero sin turno abierto. Asignarle una sucursal y, si corresponde, una caja. Esperado: aparece Supervisor, puede abrir su turno, y Caja → Ver ventas muestra solo las ventas autorizadas (más su actividad propia histórica). No aparecen Mi comercio ni Productos y no ve movimientos/comprobantes privados ni balances esperados ajenos.
4. **Supervisor personalizado:** crear «Supervisor sin cobro» quitando vender y retiros. Elegirlo al autorizar una cuenta y aceptar la invitación. Esperado: perfil aplicado desde el primer ingreso; no se abre el POS interactivo ni captura el lector desde la pantalla oculta. Puede consultar ventas autorizadas, abrir/cerrar su turno y realizar solo las demás acciones asignadas.
5. **Registro/remito:** quitar Cambiar ventas propias de registro y Enviar remitos. Esperado: desaparecen sus accesos operativos; los intentos directos a las RPC o a la tabla se rechazan. Mantener permiso de registro: permite solo ventas propias de turno abierto habilitado, no las de otro cajero ni las de otra tienda.
6. **Privacidad y alcance reales:** con Supervisor limitado a sucursal A/caja 1, consultar ventas, movimientos, turnos y archivos por REST/RPC para sucursal B/caja 2/otro usuario. Esperado: ventas ajenas fuera de asignación no visibles; movimientos, turnos y comprobantes privados ajenos inaccesibles. Cambiar asignación no permite ignorar esas restricciones. Al quitar consulta de ventas, desaparece Ver ventas y las consultas remotas vuelven al alcance propio.
7. **Escalamiento:** como Cajero/Supervisor intentar crear/editar perfiles, asignarse otro, promoverse a Administrador, cambiar miembros o usar perfiles de otra tienda/rol. Esperado: rechazo. Como administrador intentar cambiar un Propietario/Administrador mediante la RPC de perfiles: rechazo. Cambiar Cajero ↔ Supervisor con turno abierto: debe pedir cerrarlo primero.
8. **Perfil compartido y borradores:** asignar un perfil a dos personas, editarlo y actualizar ambas sesiones: mismas acciones. Alternar editores y navegar conservando borradores; Cancelar descarta solo el editor actual. Los perfiles de otras tiendas no aparecen. Un formulario oculto no recibe foco ni provoca validaciones invisibles.
9. **Offline y revocación:** cargar permisos con conexión, desconectar y operar una acción permitida. Esperado: cola conservada y validación local. Revocarla desde otro dispositivo y luego sincronizar: rechazo explícito del servidor sin borrar la operación. Revisar el conflicto con administración antes de reintentar. Una acción que ya estaba deshabilitada no debe encolarse. Cerrar el turno propio sigue disponible.
10. **Persistencia y sesiones:** recargar/ingresar desde otro dispositivo, aceptar una invitación con perfil y comprobar rol, perfil y asignación. Configurar sin conexión debe explicar que necesita red. No se debe prometer revocación instantánea en un dispositivo desconectado ni eliminación de su caché histórica.
11. **Activación explícita:** con la 004 aplicada, abrir perfiles anteriores y crear uno nuevo para cada rol. Esperado: las tres acciones nuevas desmarcadas. Crear «Cajero repositor» habilitando solo reposición y asignarlo. Actualizar su sesión: aparece Productos y stock con Reponer; no aparecen Editar precio, Agregar/Archivar producto, CSV, listas ni configuración.
12. **Reposición real:** producto con stock 10 y bulto de 24; reponer 2 bultos. Esperado: 48 unidades ingresadas, stock 58, costo y precio conservados. Reintentar la misma solicitud tras una respuesta perdida: un solo ingreso remoto. Verificar recibo y movimiento de stock. Repetir offline preparado y reconectar; revocar permiso antes de sincronizar debe conservar el conflicto y la operación pendiente. Como delegado intentar delta negativo/cero o enviar un costo mediante RPC: rechazo, sin escritura parcial. Comprobar que otro miembro del comercio ve el stock compartido actualizado.
13. **Edición de precio:** perfil con solo Editar precios, incluso sin Vender. Abrir Productos y stock → Editar precio. Guardar y recargar: cambia solo el precio base y se mantienen costo, bulto, margen, vencimiento, atributos y stock. Cancelar/navegar conserva el comportamiento de borradores; los campos ocultos no reciben foco. Modificar el precio desde otra sesión antes de guardar: pide actualizar. Sin conexión: mensaje de configuración que requiere red; el borrador sigue disponible.
14. **Botonera independiente:** perfil con solo Personalizar botonera, sin Vender. Productos y stock ofrece Personalizar para su sucursal. Guardar hasta 20 productos y después habilitar Vender o volver a la venta autorizada: mismos favoritos, sin agregar artículos al carrito al personalizar. Intentar guardar en sucursal no asignada u otro comercio mediante RPC: rechazo. Probar también un cajero con Vender y botonera: personalización disponible desde Vender.
15. **Separación de permisos:** stock sin precios no permite cambiar `price`; precios sin stock no permite reponer. Intentar REST directo para actualizar el producto completo, archivar o cambiar costos: rechazo para Cajero/Supervisor. Propietario/administrador conservan edición completa y las operaciones previas. No generar ventas ni entradas ficticias en producción.

Quedan pendientes las comprobaciones de navegador, móvil, lector real, cuentas/roles, SQL/RLS, almacenamiento privado, concurrencia y otro dispositivo. La revisión de código no demuestra esos resultados ni sustituye pruebas de usabilidad.

Ampliación de productos: `npx tsc --noEmit -p tsconfig.app.json` ejecutado sin errores (salida 0). No se ejecutaron builds, SQL ni pruebas automatizadas adicionales. La validación de la migración 004, las RPC de precio/botonera y la reposición con perfiles delegados sigue pendiente en un entorno de pruebas.

Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, salida 0. No se ejecutaron builds ni otras pruebas automatizadas. No se aplicaron migraciones remotas. Se conservaron los cambios locales previos de registros, presentación del POS y estilos.
