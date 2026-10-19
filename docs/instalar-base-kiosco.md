# Orden de instalación de la base de AdministradorKiosco

Proyecto correcto: **lkahqqsduatkhxruiolo**. Abrir su [SQL Editor](https://supabase.com/dashboard/project/lkahqqsduatkhxruiolo/sql/new). No instalar estos archivos en FilmTracker.

## Primero: comprobar qué existe

Las nueve tablas vistas por error en FilmTracker las crea `202610010001_retail_multistore.sql`. Su presencia en FilmTracker no significa que falten en kiosco: la API de kiosco ya había reconocido `retail_products` al revisar el error de margen.

Ejecutar [check_kiosco_installation.sql](../supabase/maintenance/check_kiosco_installation.sql) en el proyecto correcto y copiar la celda `instalacion_kiosco` para revisar pendientes. Es solo lectura de estructura y metadatos, sin registros de clientes, productos o ventas.

- Si `tablas_base_faltantes` está vacío, no volver a ejecutar la migración inicial por suponer que no está instalada.
- Si faltan las nueve, la instalación inicial puede estar pendiente; revisar también las funciones/esquema del inventario antes de instalarla.
- Si faltan algunas, es un estado parcial: revisar el resultado antes de repetir scripts que crean tablas existentes.
- El inventario ayuda a detectar tablas, columnas y RPC faltantes; por sí solo no certifica que todos los permisos, políticas y cuerpos de funciones coincidan con las migraciones. Una migración que reemplaza funciones sin agregar objetos puede requerir revisar su definición o el historial de ejecución.

## Orden completo para una base nueva

Copiar el contenido completo de cada archivo y ejecutarlo **de uno en uno**, en el siguiente orden. En una base existente, aplicar solamente las migraciones pendientes confirmadas, conservando este orden entre ellas. No concatenar ni repetir todas por defecto.

| Orden | Archivo | Qué instala o actualiza |
| --- | --- | --- |
| 1 | [202610010001_retail_multistore.sql](../supabase/migrations/202610010001_retail_multistore.sql) | Base: comercios, miembros, categorías, cajas, productos, turnos, ventas, movimientos e invitaciones; permisos y RPC iniciales. |
| 2 | [202610020001_catalog_global_and_segmentation.sql](../supabase/migrations/202610020001_catalog_global_and_segmentation.sql) | Catálogo global, búsqueda EAN y atributos comerciales de productos. |
| 3 | [202610070001_harden_global_catalog_immutability.sql](../supabase/migrations/202610070001_harden_global_catalog_immutability.sql) | Protección de los datos del catálogo global al contribuir. |
| 4 | [202610130001_branches_prices_ledgers.sql](../supabase/migrations/202610130001_branches_prices_ledgers.sql) | Sucursales, listas, precios fijos y registros de ventas; adapta las cajas/ventas existentes. |
| 5 | [202610140001_web_push.sql](../supabase/migrations/202610140001_web_push.sql) | Suscripciones, cola y funciones de notificaciones push. El envío también requiere la función/configuración del servicio push. |
| 6 | [202610150001_cashier_access.sql](../supabase/migrations/202610150001_cashier_access.sql) | Asignaciones de cajero, privacidad de actividad y funciones de equipo/disponibilidad. |
| 7 | [202610160001_offline_pos.sql](../supabase/migrations/202610160001_offline_pos.sql) | Pagos mixtos, datos de efectivo y operación de caja para sincronización. |
| 8 | [202610160002_offline_queue.sql](../supabase/migrations/202610160002_offline_queue.sql) | Botonera por sucursal, comprobantes de sincronización e ingreso de operaciones offline. |
| 9 | [202610160003_pack_size.sql](../supabase/migrations/202610160003_pack_size.sql) | Unidades por bulto. |
| 10 | [202610160004_margin_groups.sql](../supabase/migrations/202610160004_margin_groups.sql) | Grupo de margen y captura de costo/grupo por artículo vendido. La versión actual admite completar una instalación manual existente. |
| 11 | [202610160005_branch_price_rules.sql](../supabase/migrations/202610160005_branch_price_rules.sql) | Asignación y validación de listas de precios por sucursal. |
| 12 | [202610190001_justified_withdrawal.sql](../supabase/migrations/202610190001_justified_withdrawal.sql) | Retiros justificados, comprobantes privados y adaptación del movimiento/sincronización. |
| 13 | [202610190002_pending_replenishments.sql](../supabase/migrations/202610190002_pending_replenishments.sql) | Remitos pendientes, aprobación/rechazo y almacenamiento privado. |
| 14 | [202610190003_stock_transfers.sql](../supabase/migrations/202610190003_stock_transfers.sql) | Registro interno de transferencias entre sucursales, sin cambiar stock total. |

No ejecutar archivos de `supabase/maintenance` como parte de la instalación. En particular, los scripts `remove_initial_retail_from_filmtracker.sql` y `rollback_wrong_project_margin_groups.sql` son para quitar objetos en el proyecto equivocado; no son migraciones de kiosco.

Si un archivo muestra error, conservar el mensaje y no seguir al siguiente suponiendo que se instaló. “Already exists” no significa que haya que borrar tablas para empezar de nuevo. La mayoría de los scripts de instalación se diseñaron para una sola aplicación; la excepción de margen no vuelve repetibles los demás.

## Guía de Pruebas

1. En el SQL Editor de `lkahqqsduatkhxruiolo`, ejecutar el inventario antes y después de aplicar pendientes. Esperado: ninguna de las nueve tablas base faltante y los objetos de las funciones requeridas presentes.
2. Entrar a http://localhost:3001/ con un comercio de prueba. Consultar productos y sucursales, crear un producto con código nuevo y editarlo. Esperado: persistencia sin errores de tabla/columna/RPC ausente.
3. Abrir turno con efectivo explícito y registrar una venta de prueba, solo en datos de prueba. Esperado: venta guardada y stock actualizado según la lógica existente; cierre disponible.
4. Probar los módulos instalados que se vayan a usar: listas por sucursal, bultos, retiros con comprobante, remitos y transferencias. Las migraciones no sustituyen configurar el servicio push ni preparar la PWA para operación offline.

Revisión realizada: nombres de archivos locales, objetos principales y orden de dependencias. No se ejecutaron migraciones remotas ni pruebas contra el proyecto. No se hizo build ni se ejecutó TypeScript porque esta entrega es exclusivamente SQL de diagnóstico y documentación.
