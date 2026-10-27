# Diagnóstico y mantenimiento

Estos procedimientos están separados de `supabase/schema.sql`. Ninguno se ejecuta al instalar la app. Confirmar siempre el proyecto y revisar cada archivo completo antes de una intervención autorizada.

## Inventario de AdministradorKiosco

[check_kiosco_installation.sql](../supabase/maintenance/check_kiosco_installation.sql) consulta estructura y metadatos sin extraer datos de clientes. Ayuda a detectar tablas/columnas/RPC faltantes; no cubre todas las migraciones actuales ni certifica cuerpos de funciones, políticas, datos o historial. No usar su resultado como baseline automático. Ver [instalación](../SUPABASE_SETUP.md).

Para conflictos entre migraciones manuales posteriores al baseline y el instalador (por ejemplo, `closing_denominations` ya existe), usar [check_manual_schema_history.sql](../supabase/maintenance/check_manual_schema_history.sql). Devuelve un JSON de solo lectura con historial y metadatos de cierre, depósito, combos, facturación y listas. No adopta pasos ni certifica su aplicación completa; contrastar con las fuentes y las ejecuciones confirmadas antes de preparar una conciliación. Ver [procedimiento](../SUPABASE_SETUP.md#error-closing_denominations-ya-existe).

El diagnóstico compartido el 27/10/2026 permitió preparar [adopt_manual_history_20261027.sql](../supabase/maintenance/adopt_manual_history_20261027.sql): conciliación específica hasta `202610260003_billing_fields.sql`, con huellas de funciones, comprobaciones estructurales y permisos. No es un inventario de lectura: **escribe únicamente historial privado** y debe ejecutarse completo antes de schema, en esa instalación y tras revisar el [procedimiento y resultados esperados](../SUPABASE_SETUP.md#conciliación-preparada-para-el-diagnóstico-del-27102026). No adopta árbol ni eliminación de listas, no amplía el baseline general y no se aplica automáticamente desde el instalador. Preparado localmente, sin ejecución remota.

La recuperación actual incluye el manifiesto como variable JSON en un solo bloque `DO`, sin tablas temporales ni dependencia entre sesiones. Reemplaza la versión que podía fallar con `retail_manual_recovery_manifest` ausente. Ejecutar el archivo actualizado entero; no crear esa tabla manualmente ni reutilizar fragmentos de la versión anterior. Mantiene la validación de la firma original o del reemplazo exacto de facturación; registra 34 entradas y el schema actual completa 38. Si ya terminó la recuperación y falla el parche de checkout, usar el [schema actualizado con normalización CRLF](../SUPABASE_SETUP.md#error-la-definición-de-checkout-no-coincide); no repetir la adopción ni quitar la comprobación de checkout.

El instalador principal también incluye su manifiesto JSON dentro de un único `DO` con todas las migraciones. Reemplaza la dependencia de la tabla temporal `retail_schema_manifest`, sin alterar fuentes, checksums ni baseline. Si aparece el error de esa tabla, usar [schema actualizado completo](../SUPABASE_SETUP.md#error-retail_schema_manifest-no-existe); no crearla manualmente ni volver a ejecutar la conciliación que ya terminó. Preparado localmente, sin validación SQL remota.

## HTML inválido y timeouts en varios servicios

El registro compartido muestra dos problemas diferentes. `BillingSettings` contenía una lista `<ul>` dentro de un párrafo `<p>` en el primer paso de su guía. Se separan ambos elementos y se conserva la tipografía de la lista. Esto corrige el anidamiento, sin cambiar datos ni el flujo fiscal.

En el mismo registro, varias tablas/RPC de Supabase, Groq y `unpkg.com` terminan con `net::ERR_TIMED_OUT`. Es evidencia de solicitudes sin respuesta hacia varios dominios, no de una migración SQL faltante ni de JSON inválido. El registro por sí solo no identifica si el origen es red, navegador, intermediarios o servicios remotos; corregir el HTML no acredita resolver esa comunicación. No se aplicaron SQL remoto, cambios de claves/RLS ni reintentos masivos para tratar estos errores.

El worker de PDF.js ahora se referencia desde el paquete instalado mediante Vite, en el mismo origen de la app y con la misma versión del lector. Se elimina esa descarga desde unpkg. El precache de la PWA incluye los recursos `.mjs`; no se cambia su cola de operaciones. Esto no vuelve locales Supabase, Groq ni las descargas que Tesseract pueda necesitar. La extracción distingue conexión fallida y ausencia de respuesta en 45 segundos, conserva el texto y no subdivide bloques por un error de red.

### Guía de Pruebas — pendiente manual

En **http://localhost:3001/**:

1. Limpiar solo los mensajes de Consola y abrir Mi comercio → Datos del comercio → guía de facturación. Esperado: no vuelve el aviso de `<ul>` dentro de `<p>`; pasos, enlaces y formularios siguen disponibles.
2. Abrir Importar factura y cargar un PDF. En Red, el worker debe provenir del mismo servidor de la app, sin solicitar `unpkg.com/pdfjs-dist…`; no debería aparecer el fallback de fake worker por ese CDN. Verificar también MIME/CSP del recurso en el alojamiento publicado; TypeScript no comprueba su entrega.
3. Interrumpir la conexión a Groq en datos de prueba y analizar texto: debe mostrar conexión fallida o espera agotada, conservando el texto/partes completadas. No debe presentar un error de formato JSON ni cargar stock por ese fallo. Restablecer la conexión y reintentar por intención.
4. Si persisten timeouts de productos/ventas y Groq, comparar desde otro navegador o red. Registrar qué dominios fallan y los estados de Red. Si solo falla Supabase, seguir el [diagnóstico de comunicación](../SUPABASE_SETUP.md#error-failed-to-fetch-apisupabasecom) y revisar el proyecto; el éxito de SQL Editor no certifica REST desde el navegador. No ejecutar migraciones para intentar corregir un timeout.
5. En una PWA publicada y preparada, comprobar disponibilidad del worker local tras instalar la actualización. La descarga inicial del idioma OCR y el análisis con Groq pueden seguir necesitando conexión. Mantener la operación offline existente y verificar después su sincronización en datos de prueba.

Verificación ejecutada: lectura del registro/fuentes y `npx tsc --noEmit -p tsconfig.app.json`, salida 0. No se ejecutaron builds, otras pruebas automatizadas, conexiones al backend ni pruebas de navegador/dispositivo. La entrega del worker, la caché publicada y la causa de los timeouts quedan pendientes de validación manual. Este ajuste no prepara migraciones.

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
