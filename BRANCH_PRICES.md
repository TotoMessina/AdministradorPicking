# Precios por sucursal

Aplicar la migración pendiente [202610160005_branch_price_rules.sql](supabase/migrations/202610160005_branch_price_rules.sql) en Supabase antes de publicar esta versión.

En **Productos y stock → Listas de precios**, cada lista tiene un campo **Sucursal**:

- **Todas las sucursales**: lista global. Un administrador puede elegirla desde cualquier local.
- Una sucursal concreta: lista exclusiva de ese local, seleccionada automáticamente en el POS mientras esté activa.

Cada sucursal admite una sola lista exclusiva activa. Puede tener varias inactivas para conservar configuraciones anteriores. Para asignar otra, desactivar la actual o cambiarla a global. Si no hay ninguna activa asignada, se usa **Lista madre**. Las listas anteriores quedan como globales y conservan ajustes y precios fijos.

La lista de la sucursal puede usar un ajuste porcentual sobre el catálogo maestro y precios fijos por producto, como las listas globales. La tabla indica la sucursal con una etiqueta diferenciada o **Global**. Desactivar y reactivar una lista conserva su asignación.

Al entrar al POS o cambiar de local, la app consulta la regla de la sucursal antes de permitir el cobro. El administrador puede cambiar a otra lista válida para ese local o a la madre; su elección se conserva al actualizar datos en esa misma sucursal. Al cambiar de sucursal, se vuelve a aplicar el valor predeterminado del nuevo local. El cajero utiliza la lista asignada, sin cambiarla manualmente. Si hay productos en el carrito, se mantiene la confirmación para descartarlos antes de cambiar de local y el bloqueo para cambiar de lista durante el cobro.

Supabase valida la regla en la misma transacción del checkout y la sincronización offline. Rechaza una lista exclusiva de otro local y exige al cajero la regla de su sucursal. Un error revierte también el descuento de stock. Los reintentos de ventas ya registradas no vuelven a cobrarse ni se rechazan por cambios posteriores de asignación. La lectura queda limitada a miembros del comercio; la edición sigue reservada a propietarios y administradores. La relación sucursal/lista impide asignar sucursales de otro comercio.

En modo offline se usa la asignación del catálogo local preparado en ese dispositivo. Si cambió en el servidor durante una desconexión, la sincronización puede requerir revisar los pendientes, como los demás cambios de precio. No se altera el historial de ventas ni se actualizan automáticamente sus importes al modificar listas.

## Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador.
2. Tener dos sucursales B1 y B2. Crear una lista **Precios B1**, asignarla a B1 y usar ajuste +20%. Mantener B2 sin lista exclusiva activa.
3. Abrir turno en B1: un producto de la madre a $100 debe mostrarse a $120 y el selector debe indicar **Precios B1**. Si hay un precio fijo para ese producto, debe prevalecer.
4. Cambiar a B2: debe usar la madre a $100 y no ofrecer la lista exclusiva de B1. Volver de B2 a B1: debe seleccionar nuevamente **Precios B1**.
5. Como administrador, elegir una lista global y tocar **Actualizar datos**. Debe conservar la elección mientras permanezca en B1. Volver a cambiar de sucursal debe restablecer el valor predeterminado.
6. Entrar como cajero: comprobar selección automática y selector bloqueado. Intentar asignar dos listas activas a B1 debe mostrar un error; desactivar la actual debe permitir usar la madre o activar otra.

Verificaciones autorizadas: `npx tsc --noEmit -p tsconfig.app.json` y `node --test tests/experience.test.mjs`. No se ejecuta el build.
