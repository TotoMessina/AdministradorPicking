# Activar la app multi-comercio en Supabase

El frontend está configurado en `.env.local` para el proyecto `lkahqqsduatkhxruiolo`. La clave pública permite autenticación y acceso sujeto a RLS; no permite crear el esquema.

## 1. Instalar la base de datos

1. Abrí https://supabase.com/dashboard/project/lkahqqsduatkhxruiolo/sql/new
2. Ejecutá las migraciones de `supabase/migrations` en orden: `202610010001`, `202610020001`, `202610070001` y `202610130001`. Copiá el contenido completo de cada archivo.
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

El propietario autoriza emails como administrador o cajero. Esta autorización **no envía un correo**. El colaborador crea/confirma su cuenta con ese email y usa **Actualizar accesos**. El propietario puede revocar autorizaciones pendientes y quitar miembros. El rol propietario no se puede quitar ni cambiar desde la app.

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

Se requiere conexión para guardar; no hay ventas offline ni éxitos simulados en almacenamiento local. No se importan automáticamente los datos de la versión anterior porque no tienen propietario/comercio confiable. El historial muestra hasta 200 turnos recientes; los anteriores siguen en la base. El stock y los precios se vuelven a validar en el servidor al cobrar. Una venta se guarda junto con el descuento de stock o se rechaza completa.

La moneda implementada es ARS. No incluye facturación fiscal, integración automática con medios de pago, transferencias entre sucursales ni pagos de suscripción. Los tickets son comprobantes no fiscales.

Referencias: https://supabase.com/docs/guides/database/postgres/row-level-security y https://supabase.com/docs/guides/database/functions
