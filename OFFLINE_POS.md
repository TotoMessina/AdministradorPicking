# Caja rápida y operación sin conexión

## Activación

1. Preparar la base con [supabase/schema.sql](supabase/schema.sql) según [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Incluye caja/offline y registra lo aplicado; no repetir migraciones individuales.
2. Publicar el código en Vercel. Cerrar todas las ventanas de la PWA anterior y volver a abrir con conexión para que se instale el nuevo service worker.
3. En cada dispositivo, iniciar sesión con la cuenta que va a usar esa caja. Elegir el comercio, sucursal y caja; dejar cargar el catálogo y abrir/consultar el turno. Cada cuenta tiene sus datos locales separados. Un dispositivo o una cuenta nuevos necesitan conexión para prepararse.
4. Probar sin conexión antes de comenzar la jornada. La PWA publicada guarda HTML, JavaScript, estilos e iconos. El servidor de desarrollo no precachea Vite/HMR: la recarga completa offline se prueba en la versión publicada.

## Teclado y lector

| Tecla | Acción |
| --- | --- |
| F1 | Confirma el cobro en efectivo. Si no se ingresó otro importe, usa monto exacto. |
| F2 | Confirma un cobro QR / Mercado Pago. |
| F3 | Confirma una transferencia. |
| F4 | Abre pago mixto; al completar un reparto válido, vuelve a presionarse para cobrar. |
| Enter en importe | Confirma efectivo o pago mixto. |
| Ctrl+K | Lleva el foco a la búsqueda. |
| Escape | Vuelve al catálogo y a la búsqueda. |
| Tab / Shift+Tab | Recorre los controles; Enter o Espacio activa botones. |

Los atajos son una declaración del cajero de que recibió el pago. La app no inicia ni verifica cobros en Mercado Pago/bancos/terminales. En equipos que usan las teclas F para brillo/volumen puede ser necesario Fn.

El lector USB/Bluetooth debe funcionar como teclado y terminar el código con Enter. En búsqueda se acepta el código completo, cualquiera sea su velocidad; fuera de campos de edición también se reconoce la secuencia rápida del lector. Los campos de importes y descripción conservan su edición normal: Escape o Ctrl+K devuelve el foco al lector. Los atajos de cobro ignoran teclas mantenidas y diálogos abiertos. El ticket se consulta desde **Ver último ticket**, sin interrumpir el siguiente escaneo.

Pago mixto reparte el total entre dos medios distintos (efectivo, QR, transferencia, débito o crédito). Solo la parte en efectivo se incorpora al arqueo. El detalle queda en la venta, ticket y exportación CSV.

## Botonera por sucursal

En **Vender → Venta rápida → Personalizar**, administración o un perfil con `manage_quick_products` elige hasta 20 productos vendibles. Si hay favoritos se muestran en su orden; si no, se usan los más vendidos disponibles de la sucursal. Para cambiar orden, quitar y volver a seleccionar. Un cajero sin ese permiso puede usarlos, pero no editarlos. Los insumos no se ofrecen para venta directa.

Para café, panchos, cargas u otros productos sin etiqueta, crear el producto con un código interno (por ejemplo `CAFE`) y fijarlo en la botonera. Sigue usando el precio de la lista seleccionada y el stock del catálogo. La personalización se comparte en la sucursal y se guarda con conexión; después puede usarse offline. Las sugerencias incluyen únicamente cantidades agregadas por producto, sin mostrar movimientos ni tickets de otros cajeros.

## Guardado y sincronización

- Cada venta, apertura, cierre, ingreso/retiro y reposición de stock se confirma después de una transacción de IndexedDB que guarda juntos la operación, su efecto en el stock/saldo y la cola de envío. No espera a Supabase. Si falla el almacenamiento local, no se confirma el cobro ni se limpia el carrito.
- El identificador UUID se conserva en los reintentos. El servidor aplica cada operación y guarda su recibo de sincronización en una misma transacción. Reenviar después de perder una respuesta no duplica stock ni importes. La cola conserva el orden de apertura, ventas/movimientos y cierre.
- Los tickets locales empiezan con `L-` y dicen **pendiente de sincronizar**. Al sincronizar, reciben el número `T-` del servidor. Se conservan fecha de operación y fecha de registro remoto.
- Con la app abierta se reintenta al recuperar conexión y cada 15 segundos. Background Sync permite continuar con la PWA cerrada cuando el navegador lo soporta y la sesión guardada aún es válida. No se copia el token de renovación al service worker; si expiró la sesión o el navegador suspendió la tarea, se continúa al abrir la app y recuperar la sesión.
- Cerrar sesión detiene la sincronización de esa cuenta. Sus operaciones permanecen guardadas; se reanudan cuando vuelve a ingresar esa misma cuenta. Otra cuenta no puede consultar ni enviar su cola.
- La barra superior muestra pendientes y errores, permite reintentar y descargar un respaldo JSON. No hay descarte automático ni botón de borrado de operaciones pendientes. El respaldo es para recuperación y revisión; no se importa automáticamente.

## Conflictos y límites operativos

Una caja desconectada solo conoce el catálogo, los permisos y el stock que preparó. No puede conocer en tiempo real las ventas de otro dispositivo, cambios de precios o una revocación de permisos. El servidor vuelve a comprobar autorización, precios, disponibilidad de caja y stock al sincronizar. Si hay un conflicto, la cola se detiene y se muestra la causa; la venta local permanece guardada y no se vuelve a cobrar al cliente. El administrador debe revisar la situación y corregir la causa antes de reintentar. Un cambio de precio o permisos puede requerir conciliación manual; no se modifica silenciosamente el importe cobrado ni se asigna una venta a otro cajero.

Usar un dispositivo por caja durante una desconexión evita aperturas simultáneas incompatibles. El stock continúa siendo compartido por comercio; las ventas offline descuentan inmediatamente su copia local y el stock remoto al sincronizar. Las reposiciones unitarias o por CSV de productos existentes también se guardan offline para administradores. Se sincronizan como cantidades a sumar/restar, sin reemplazar el stock remoto, y dejan un registro auditable. Crear productos, cambiar precios y otras configuraciones requieren conexión.

No borrar datos del sitio, desinstalar la PWA ni usar navegación privada mientras existan pendientes. La app solicita almacenamiento persistente, pero su concesión depende del navegador. Una falla o pérdida física del dispositivo antes de sincronizar no puede recuperarse desde el servidor; descargar el respaldo si una desconexión se prolonga.

Con [depósito opcional](docs/productos-y-stock.md#deposito-opcional), vender descuenta solo la disponibilidad de salón preparada en el catálogo, también para componentes/paquetes. El total físico baja y el depósito no cambia. Activar/desactivar, trasladar e ingresar al depósito requiere conexión y sincronizar antes los pendientes; no agrega tipos de operación a la cola ni al service worker. Recibir en salón conserva el flujo anterior. Preparar todos los dispositivos antes de distribuir stock: un equipo desconectado no conoce traslados concurrentes y conserva el conflicto si no alcanza el salón al sincronizar. No se toma stock del depósito ni se cambia una venta automáticamente para resolverlo.

## Cómo probar

1. En `http://localhost:3001/`, abrir turno, buscar un producto y cobrar con F1/F2/F3. F4 debe pedir el reparto y aceptar Enter. Verificar que no se abre un ticket automáticamente y que el foco vuelve al lector.
2. Personalizar una botonera y cambiar de sucursal: cada una mantiene sus propios favoritos. Entrar como cajero: debe poder usarlos sin ver el botón de edición.
3. En `https://administrador-picking.vercel.app/` después de publicar, preparar la caja con conexión. Desconectar la red, vender, registrar un retiro y cerrar. Como administrador, probar además una reposición de stock. Las operaciones deben aparecer pendientes y el saldo/stock local cambiar al instante.
4. Cerrar y volver a abrir la PWA sin conexión: deben conservarse los datos y operaciones. Reconectar y esperar a que la cola quede vacía. Confirmar una sola venta/movimiento por operación en Supabase y que el cierre mixto suma solo el efectivo.
5. Para probar un conflicto en datos de prueba, cambiar el precio o agotar el stock desde otro dispositivo mientras el primero está offline. Al reconectar, debe mostrarse el error y mantenerse el respaldo local, sin borrar ni duplicar operaciones.

Única comprobación de código autorizada: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar builds ni otras pruebas automatizadas. Los recorridos anteriores son comprobaciones manuales pendientes, no pruebas realizadas.
