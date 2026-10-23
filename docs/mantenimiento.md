# Diagnóstico y mantenimiento

Estos procedimientos están separados de `supabase/schema.sql`. Ninguno se ejecuta al instalar la app. Confirmar siempre el proyecto y revisar cada archivo completo antes de una intervención autorizada.

## Inventario de AdministradorKiosco

[check_kiosco_installation.sql](../supabase/maintenance/check_kiosco_installation.sql) consulta estructura y metadatos sin extraer datos de clientes. Ayuda a detectar tablas/columnas/RPC faltantes; no cubre todas las migraciones actuales ni certifica cuerpos de funciones, políticas, datos o historial. No usar su resultado como baseline automático. Ver [instalación](../SUPABASE_SETUP.md).

## Incidente histórico: SQL en otro proyecto

Se reportó la instalación de objetos retail y de grupos de margen en FilmTracker. La revisión local de sus migraciones no demostró daños en datos remotos ni probó el estado de ese proyecto. Se conserva lo necesario para revisar el incidente, sin mantener informes de conversación ni asumir que sigue pendiente.

- [inspect_margin_groups.sql](../supabase/maintenance/inspect_margin_groups.sql): inspección de columna, función y trigger de margen.
- [audit_filmtracker_after_margin_migration.sql](../supabase/maintenance/audit_filmtracker_after_margin_migration.sql): inventario de objetos y estructura esperada de FilmTracker; no prueba integridad de filas, fechas de creación ni ausencia de cambios.
- [rollback_wrong_project_margin_groups.sql](../supabase/maintenance/rollback_wrong_project_margin_groups.sql): reversión manual **solo si se confirmó que esos objetos no existían antes y fueron agregados por error**. Elimina columna y valores; no restaura definiciones anteriores ni quita instantáneas ya capturadas en JSON históricos.
- [remove_initial_retail_from_filmtracker.sql](../supabase/maintenance/remove_initial_retail_from_filmtracker.sql): limpieza **destructiva** de las nueve tablas retail iniciales, sus filas y objetos conocidos en FilmTracker. Exige revisar/exportar lo que deba conservarse; sus validaciones rechazan estados inesperados. No es una desinstalación general ni una reparación automática.

Los dos últimos archivos **nunca se ejecutan en AdministradorKiosco (`lkahqqsduatkhxruiolo`)**, no forman parte de schema y no se aplican por el solo hecho de aparecer en esta guía. No agregar CASCADE para forzar dependencias ni repetir una limpieza sin revisar su resultado. La documentación local no identifica por sí sola el proyecto remoto abierto.

## Guía de Pruebas — manual pendiente

1. En el SQL Editor del proyecto correcto, ejecutar solo el inventario de lectura elegido y revisar ausencias/definiciones. No inferir pérdida de datos de una columna ausente ni aplicación completa de una migración de un nombre presente.
2. Si se autoriza una reparación del otro proyecto, verificar respaldos, condiciones y resultados descritos en su SQL. Un error significa que debe revisarse, no que terminó la limpieza.
3. Abrir http://localhost:3001/ y consultar productos/ventas de AdministradorKiosco: deben seguir disponibles. La limpieza de otro proyecto no se ejecuta aquí.

No se conectó a Supabase ni a FilmTracker para esta consolidación. La ejecución, los permisos y el estado de datos requieren validación manual del responsable.
