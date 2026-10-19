# Activar la app multi-comercio en Supabase

El frontend está configurado en `.env.local` para el proyecto `lkahqqsduatkhxruiolo`. La clave pública permite autenticación y acceso sujeto a RLS; no permite crear el esquema.

## Errores 404 de Groq y 400 al guardar productos

- **Groq:** el frontend usa `llama-3.1-8b-instant` por defecto. `VITE_GROQ_MODEL` permite elegir otro modelo y tiene prioridad sobre ese valor. Si Groq devuelve `model_not_found`, verificá qué modelos están disponibles en tu cuenta y ajustá esa variable. En localhost, reiniciá el servidor de desarrollo después de cambiar `.env.local`; en Vercel, volvé a desplegar. El error queda dentro de la herramienta de IA: guardar productos, vender y cerrar turnos no requiere generar una respuesta.
- **Productos:** la revisión de solo lectura del 19/10/2026 obtuvo `42703: column retail_products.margin_group does not exist` en este proyecto. Para corregirlo, aplicá completa la migración pendiente [202610160004_margin_groups.sql](supabase/migrations/202610160004_margin_groups.sql) en el SQL Editor. Incluye columna, permiso, captura del grupo/costo en futuras ventas y recarga de caché del esquema. No basta con actualizar la web.
- Si el error menciona `pack_size`, revisá también la migración [202610160003_pack_size.sql](supabase/migrations/202610160003_pack_size.sql). No vuelvas a ejecutar migraciones ya aplicadas correctamente ni omitas campos del producto para esconder un esquema desactualizado.

### Si SQL devuelve «column margin_group already exists»

La columna ya existe en la base donde ejecutaste el SQL. Ese error no confirma por sí solo que también estén instalados el permiso, la función y el trigger. La versión actual de [202610160004_margin_groups.sql](supabase/migrations/202610160004_margin_groups.sql) se puede volver a ejecutar completa: no recrea la columna existente, conserva sus valores, asegura default/restricción/permiso y reemplaza la función y su trigger dentro de una transacción. Incluye `NOTIFY pgrst, 'reload schema'` al finalizar, siguiendo la [guía de Supabase](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema).

Copiá nuevamente el archivo actualizado y ejecutalo en una consulta nueva del SQL Editor del proyecto `lkahqqsduatkhxruiolo`. No uses la copia anterior que falla al crear la columna. Si hay valores existentes fuera de `standard`/`low_margin`, la restricción puede detener la transacción: no los borra ni los convierte automáticamente; en ese caso, revisá el error antes de continuar.

Guía de Pruebas: después de que el SQL termine correctamente, recargá http://localhost:3001/, guardá un producto con código nuevo y editá solo su precio. Debe guardar sin error de columna y conservar el grupo de margen. La migración actualizada solo fue revisada como archivo; no se ejecutó contra la base remota. Si continúa el 400, copiá el JSON de Network → solicitud `retail_products` → Response para identificar la causa vigente.

No se aplicaron migraciones remotas como parte de esa revisión. La aplicación ahora muestra una indicación específica si falta alguna de esas columnas y conserva el formulario al fallar el guardado.

### Guía de Pruebas

1. Reiniciá el servidor local y entrá a http://localhost:3001/. Abrí Ayuda → Consultar al asistente y enviá una consulta breve: el request a Groq debe usar `VITE_GROQ_MODEL` si está configurado, o `llama-3.1-8b-instant` en su ausencia. Si el proveedor rechaza el modelo o no hay conexión, debe mostrarse el error en el panel y permitir reintentar o cerrarlo para seguir operando.
2. Después de aplicar la migración pendiente, creá un producto con código nuevo. Esperado: confirmación de guardado y producto visible en el catálogo, sin error de columna inexistente. Editá grupo de margen y verificá que persiste al volver a abrirlo.
3. En producción, comprobá lo mismo en https://administrador-picking.vercel.app/ después del despliegue con la variable actualizada. Estas pruebas manuales siguen pendientes; el listado de modelos se consultó, pero no se ejecutaron análisis con datos del negocio ni escrituras de prueba en la base.

## 1. Instalar la base de datos

Para transferencias internas entre sucursales, aplicar `202610190003_stock_transfers.sql` antes de publicar el frontend. Registra traslados sin modificar el stock total. Ver [Guía de Pruebas](STOCK_TRANSFERS.md).

Para captura de remitos y aprobación de stock, aplicar `202610190002_pending_replenishments.sql` antes de publicar el frontend. Ver flujo, permisos y [Guía de Pruebas](PENDING_REPLENISHMENTS.md).

Para salidas de caja con comprobante, aplicar `202610190001_justified_withdrawal.sql` antes de publicar el frontend. Crea un bucket privado y restringe el acceso a comprobantes a administradores. Ver [Guía de Pruebas](JUSTIFIED_WITHDRAWALS.md).

Para precios diferenciados por sucursal, aplicar también `202610160005_branch_price_rules.sql` antes de publicar el frontend. Ver configuración y [Guía de Pruebas](BRANCH_PRICES.md).

Para separar rubros de bajo margen, aplicar también `202610160004_margin_groups.sql`. Ver configuración, criterios de cálculo y [Guía de Pruebas](MARGIN_GROUPS.md).

Para la conversión bulto/unidad, ejecutar también `202610160003_pack_size.sql` antes de publicar el frontend actualizado. Ver configuración, ejemplos y [Guía de Pruebas](PACK_SIZE.md).

1. Abrí https://supabase.com/dashboard/project/lkahqqsduatkhxruiolo/sql/new
2. Consultá el [orden completo de las 14 migraciones](docs/instalar-base-kiosco.md). En una base nueva se aplican todas en ese orden, de una en una; en una existente, ejecutá primero el [inventario de solo lectura](supabase/maintenance/check_kiosco_installation.sql) y revisá cuáles están pendientes. Copiá el contenido completo de cada archivo que corresponda.
3. En un proyecto existente, ejecutá solamente las migraciones pendientes. La nueva migración `202610130001_branches_prices_ledgers.sql` es transaccional: asigna las cajas y ventas existentes a la sucursal **Principal**, la **Lista madre** y el registro **General**, sin cambiar importes, stock ni cierres. Instalá esta migración antes de publicar el frontend actualizado.
4. Si aparece un error, compartí el texto del error, sin claves ni contraseñas. No vuelvas a ejecutar una migración que ya terminó correctamente.

## 2. Configurar el acceso

En **Authentication → Providers → Email**, habilitá email y contraseña, con confirmación de email activada. Las autorizaciones al equipo solo se aceptan con email confirmado.

En **Authentication → URL Configuration**, agregá la URL de la app a **Site URL** y **Redirect URLs**. Para desarrollo, usá la dirección que indique `npm run dev` (por ejemplo `http://localhost:3001`). Agregá también la URL de producción al publicar. Configurá SMTP propio antes de usar correos de alta/recuperación a escala.

No pongas una clave `service_role`, una contraseña de base de datos ni un token de administración en variables `VITE_*`.

## 3. Primer uso

1. Ejecutá `npm run dev`.
2. Creá tu cuenta y confirmá el email.
3. Ingresá y creá tu comercio. Se crea la caja principal y cuatro categorías iniciales editables.
4. En **Mi comercio**, personalizá nombre, dirección, teléfono, color y mensaje del ticket; agregá categorías y cajas.
5. En **Productos y stock**, cargá los productos de ese comercio.
6. En **Cajas y turnos**, seleccioná una caja y abrí el turno con su efectivo inicial.
7. Registrá ventas en **Nueva venta**. QR y tarjetas requieren haber confirmado el cobro en la plataforma externa.
8. Al terminar, registrá el efectivo contado y cerrá el turno. Ventas, movimientos y arqueos quedan guardados.

## Equipo

En **Mi comercio → Equipo y permisos**, el propietario puede crear una cuenta de cajero o administrador indicando email, contraseña inicial y su confirmación. Primero se autoriza ese email mediante las políticas existentes; después se registra la cuenta con un cliente de autenticación aislado, sin reemplazar la sesión del propietario ni guardar la contraseña en la base del comercio. No requiere una función Edge ni una migración nueva.

La confirmación de email sigue la configuración de Supabase Auth. Con confirmación activada, el colaborador debe abrir su correo antes de ingresar con la contraseña inicial; el comercio se vincula al iniciar sesión mediante `retail_accept_invitations`. Si la cuenta ya existía, su contraseña no se reemplaza: debe usar su acceso habitual o recuperar la contraseña. El registro usa el flujo estándar de [signUp de Supabase](https://supabase.com/docs/reference/javascript/auth-signup).

Para una persona que ya tiene cuenta, marcar **Ya tiene una cuenta en el sistema**: solo se autoriza el acceso y no se envía un correo. Si esa persona estaba conectada, puede usar **Actualizar accesos**. Las autorizaciones anteriores también sirven para completar el alta con contraseña; se reutilizan cuando coinciden los permisos. Si el registro falla, la autorización queda pendiente y se informa el error para poder reintentar. El propietario puede revocar autorizaciones pendientes y quitar miembros; su propio rol no se modifica desde la app.

- Propietario: ventas, cajas, catálogo, configuración y equipo.
- Administrador: ventas, cajas, catálogo y configuración; sin gestionar equipo.
- Cajero: consulta catálogo y registra ventas/movimientos en su turno; no modifica precios ni configuración. Puede consultar los registros del comercio.

Cada caja tiene un único turno abierto. Su cajero o un administrador pueden operar ese turno. El stock es compartido por comercio, no por caja.

## Sucursales, precios y registros de ventas

- **Mi comercio → Sucursales:** crear o renombrar locales y guardar su dirección. En **Cajas por sucursal**, crear cada punto de atención dentro de su local. Una sucursal nueva comienza sin cajas; agregá al menos una antes de vender. Los nombres de caja pueden repetirse entre sucursales. Las cajas existentes conservan su sucursal para mantener el historial.
- **Productos y stock → Listas de precios:** la Lista madre es el precio del catálogo. Crear listas con un ajuste porcentual (por ejemplo −10 para mayorista) y, opcionalmente, precios fijos por producto. Vaciar y guardar un precio fijo vuelve al cálculo porcentual. Cambiar la madre actualiza los precios derivados; los fijos se mantienen. Las listas se pueden desactivar y reactivar.
- **Mi comercio → Registros de ventas:** inicialmente hay General y Otras ventas. Se pueden renombrar y agregar otros según la operación. El registro General no puede desactivarse; los demás sí, sin borrar ventas. Un registro es una clasificación de ventas, independiente de la caja física y del estado de comprobante.
- **Nueva venta:** elegir sucursal, caja, lista y registro. La lista y el registro se bloquean mientras haya productos en el carrito. El servidor vuelve a validar precio y stock al cobrar. Los artículos manuales mantienen el importe ingresado, sin ajuste porcentual.
- **Cajas y turnos → Resumen del comercio:** propietarios y administradores consultan todas las sucursales por período (hora de Argentina), filtran por registro y estado de comprobante y exportan un CSV completo del período. La exportación incluye todas sus operaciones aunque la tabla esté filtrada. No tiene el límite de 500 ventas del contexto del asistente IA; las tablas muestran bloques de 50 con “Ver más”.
- **Asociar comprobante:** permite guardar la referencia de una factura emitida externamente. Guarda usuario y fecha; la referencia no se puede reemplazar ni eliminar desde la aplicación. El sistema no emite ni valida facturas fiscales. Las ventas anteriores quedan “Sin comprobante asociado”, sin inferir su situación fiscal real.

Las ventas guardan los nombres de sucursal, caja, lista y registro usados al cobrarse. Renombrarlos no reescribe el historial. Todos los registros participan del arqueo de la caja física y de los totales generales. El catálogo, stock, equipo y permisos se comparten dentro del comercio; no hay stock ni permisos independientes por sucursal.

Los precios calculados se redondean a dos decimales, con mínimo de $0,01. Las actualizaciones masivas de la lista madre se guardan completas o se rechazan completas (hasta 10.000 productos por operación). El CSV usa punto y coma como separador y coma decimal.

## Verificación

Para instalar la PWA y habilitar notificaciones de stock bajo/cierres de caja, continuar con [PUSH_SETUP.md](PUSH_SETUP.md). La migración adicional `202610140001_web_push.sql` crea las suscripciones privadas y la cola; las operaciones existentes no cambian.

- `npm run build`: TypeScript y compilación.
- `npm run test:db`: ejecuta la migración en PostgreSQL embebido (PGlite), con usuarios/roles de prueba; verifica aislamiento, permisos, ventas atómicas, stock, reintentos y cierres. No modifica el proyecto remoto.
- `npm run lint`: análisis estático.

Estas pruebas locales no reemplazan verificar Auth, RLS y correos en tu proyecto real una vez instalado el SQL.

## Alcance y operación

Las cajas preparadas guardan primero las operaciones en IndexedDB y las sincronizan con Supabase. Los permisos, precios y stock se vuelven a validar en el servidor; si hay conflictos, los pendientes permanecen guardados para revisión. No se importan automáticamente datos sin propietario/comercio confiable. El historial muestra hasta 200 turnos recientes; los anteriores siguen en la base. Ver [OFFLINE_POS.md](OFFLINE_POS.md).

La moneda implementada es ARS. No incluye facturación fiscal, integración automática con medios de pago, transferencias entre sucursales ni pagos de suscripción. Los tickets son comprobantes no fiscales.

Referencias: https://supabase.com/docs/guides/database/postgres/row-level-security y https://supabase.com/docs/guides/database/functions

## Emails, asignaciones y privacidad del cajero

Antes de publicar este frontend, ejecutá completa la migración pendiente [202610150001_cashier_access.sql](supabase/migrations/202610150001_cashier_access.sql) en el SQL Editor del proyecto. Requiere las migraciones anteriores. No borra ventas ni usuarios: los cajeros existentes conservan acceso a todas las ubicaciones hasta que se los asigne, pero pasan a consultar únicamente sus propias ventas, ingresos/retiros y turnos. El propietario y los administradores conservan la vista completa.

En **Mi comercio → Equipo y permisos**, propietarios y administradores ven el email actual de cada cuenta y pueden guardar una asignación para cajeros activos o accesos pendientes. Elegir una caja selecciona también su sucursal; **Todas las sucursales / Todas las cajas** quita la restricción. Estas son cajas de atención, independientes de los registros de ventas. Solo el propietario sigue dando altas, quitando miembros o revocando invitaciones. La asignación no permite cambiar roles ni permisos de otros administradores.

Si el cajero tiene un turno abierto fuera de la nueva asignación, debe cerrarlo primero. Al ingresar o tocar **Actualizar datos**, recibe solo las ubicaciones habilitadas y se selecciona su turno abierto, si lo tiene. Una única sucursal/caja queda seleccionada automáticamente. Si una caja está ocupada, ve ese estado sin conocer al operador, importes ni movimientos. En **Cajas y turnos** tiene una guía para abrir, ir a vender y cerrar; el historial muestra sus propios cierres. El saldo esperado de su propio turno incluye posibles ajustes del administrador, sin mostrar los movimientos ajenos, para mantener correcto el arqueo.

La base valida la asignación al abrir y operar turnos. RLS limita las consultas aunque se hagan directamente a Supabase. Los emails se consultan por una función autorizada, sin exponer la tabla de autenticación ni usar claves privadas en el navegador. Una asignación nueva se refleja en la interfaz al actualizar; el servidor la exige de inmediato.

Prueba manual: abrir http://localhost:3001/ como administrador, ir a **Mi comercio → Equipo y permisos**, asignar un cajero a una caja y guardar. Entrar como ese cajero en otro navegador, comprobar su selección automática, abrir turno y registrar una venta y un movimiento. Hacer otra operación con otro usuario: el cajero no debe verla y el administrador sí. Cerrar el turno del cajero; luego quitar la restricción y actualizar para comprobar que vuelve a poder elegir ubicaciones.

## Caja rápida y offline

Ejecutar también `202610160001_offline_pos.sql` y `202610160002_offline_queue.sql`, en ese orden, antes de publicar esta versión. Agregan transferencia/pago mixto, arqueo por componente en efectivo, botonera por sucursal, registro de reposiciones y sincronización idempotente. Ver preparación de dispositivos, límites, conflictos y pruebas en [OFFLINE_POS.md](OFFLINE_POS.md). No hace falta una nueva función Edge.
