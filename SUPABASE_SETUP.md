# Supabase: instalación y actualización desde schema

El instalador completo es **[supabase/schema.sql](supabase/schema.sql)**. Contiene las **39 migraciones actuales**, en orden de nombre completo, y registra cada una en `retail_private.schema_migrations`. Para la instalación ya conciliada hasta la 003, también está disponible la [actualización en cinco archivos pequeños](#actualización-individual-después-de-conciliar-34-migraciones), con el mismo historial. Una instalación manual con historial desalineado requiere primero la conciliación específica descrita abajo.

## Proyecto y alcance

El proyecto de AdministradorKiosco documentado en este repositorio es **lkahqqsduatkhxruiolo**. Confirmar el destino en el [SQL Editor](https://supabase.com/dashboard/project/lkahqqsduatkhxruiolo/sql/new); no ejecutar sobre FilmTracker ni sobre otro proyecto. El SQL no puede comprobar por sí mismo el identificador que muestra el dashboard.

Schema incluye tablas, RLS, funciones, buckets y ajustes de datos de las migraciones. No conecta desde la app ni requiere copiar claves privadas. Quedan fuera:

- `supabase/maintenance/`: diagnóstico y reparación manual, incluidos scripts destructivos para otro proyecto.
- `supabase/updates/`: paquetes generados por paso como alternativa al instalador completo; no son migraciones nuevas ni se incluyen otra vez dentro de schema.
- `supabase/tests/`: datos y comprobaciones de prueba, no instalación.
- `supabase/push-schedule.sql`: requiere desplegar `push-dispatch` y configurar Vault; ver [PUSH_SETUP.md](PUSH_SETUP.md).

## Base actual: migraciones manuales ya ejecutadas

El responsable confirmó el **23/10/2026** que ejecutó todos los SQL actuales. Por eso el baseline del archivo queda fijado en **`202610230002_ingredients_and_composition_costs.sql`**.

Al ejecutar schema en una base retail existente sin su historial, registra como **`adopted`** los 30 archivos hasta ese punto, **sin volver a ejecutarlos**. Las migraciones posteriores de tickets/billetes, depósito opcional, alta atómica de combos, campos de facturación (`202610260003_billing_fields.sql`), árbol de listas (`202610260004_price_list_tree.sql`) y posteriores se aplican como pendientes, incluida Principal por porcentaje (`202610270002_primary_product_markup.sql`). No se aplicaron remotamente durante su preparación. La fecha de adopción no es la fecha histórica de ejecución. No se deduce el estado remoto por tener productos o una columna; tampoco se certifica que los cuerpos instalados coincidan con el repositorio.

Este baseline es una declaración para esa instalación confirmada. **Para otro entorno cuya instalación no esté confirmada, vaciar o corregir `retail.schema_baseline` antes de ejecutar.** Una base existente sin historial y sin baseline se detiene sin aplicar migraciones. La presencia de las nueve tablas base es una comprobación mínima adicional, no una auditoría de todos los objetos.

Si faltan migraciones intermedias o hubo una ejecución fallida, no declarar como completo un prefijo que no lo está. Revisar [el inventario de solo lectura](supabase/maintenance/check_kiosco_installation.sql), las definiciones y el historial real; ese inventario es parcial y no prueba la aplicación de todas las funciones/permisos. Resolver instalaciones parciales por separado, sin borrar tablas ni ignorar errores.

## Ejecutar el archivo completo

1. Conservar un respaldo apropiado del entorno antes de aplicar cambios pendientes y confirmar proyecto/baseline.
2. Abrir `supabase/schema.sql`, copiar **todo** y ejecutar una sola vez en el SQL Editor con la cuenta administrativa del proyecto.
3. Revisar errores y el resultado final: `filename`, `origin` y `registered_at`. Un error revierte la transacción completa, incluido su historial; no continuar ejecutando fragmentos.
4. Actualizar la app y el catálogo en los dispositivos una vez confirmada la instalación.

En una **base nueva de Supabase**, sin objetos retail, el archivo ejecuta las 39 migraciones y registra `origin=schema`; el baseline de adopción no omite nada en ese caso. Se requieren los servicios habituales de Supabase Auth/Storage.

El depósito se instala **apagado** para todos los comercios, sin redistribuir existencias. La activación es posterior y voluntaria desde Mi comercio. El total sigue en productos; los balances y movimientos se protegen con RLS/RPC y un trigger de disponibilidad. No modifica las transferencias entre sucursales. Ver [alcance, permisos y pruebas](docs/productos-y-stock.md#deposito-opcional). Instalar SQL no certifica la operación offline, la concurrencia ni los permisos: validar en un entorno de prueba antes de usarlo.

En una **base con historial de schema**, comprueba nombres, orden y SHA-256 de los archivos registrados, y ejecuta solo los posteriores pendientes. Repetirlo sin archivos nuevos no vuelve a hacer backfills, renombrados o altas predeterminadas. Si hay checksums distintos, huecos o entradas desconocidas, se detiene. No es un reparador de objetos borrados o alterados manualmente después de instalar.

Manifiesto, comprobaciones y migraciones corren en **un único bloque `DO` atómico**, que toma un bloqueo para serializar ejecuciones concurrentes de este mismo instalador. Un error revierte todos los cambios de ese bloque, incluido el historial; no hay commits entre migraciones. El `SELECT` final solo muestra metadatos persistidos. Esto no coordina ejecuciones individuales por otros mecanismos: no combinar instalaciones simultáneas.

## Actualización individual después de conciliar 34 migraciones

Se prepararon cinco archivos en `supabase/updates/`, con un paso por consulta. Esto reduce el SQL enviado en cada consulta, pero no demuestra que el tamaño causara `Failed to fetch`: si ni `select 1` responde, resolver primero la comunicación con el dashboard.

Estos paquetes requieren que el historial ya tenga registradas todas las migraciones hasta `202610260003_billing_fields.sql` (34 entradas), mediante la conciliación o una instalación normal. **No volver a ejecutar los archivos originales de migrations para este recorrido:** los paquetes conservan las fuentes, normalizan CRLF, validan dependencias y registran el checksum en la misma operación que aplica el cambio.

En el SQL Editor de AdministradorKiosco, ejecutar **un archivo completo por vez**, en este orden. Si la sesión está abortada (`25P02`), ejecutar primero `ROLLBACK;`. Esperar el resultado antes de abrir el siguiente:

| Orden | Archivo preparado | Cambio | Total esperado si se parte de 34 |
| --- | --- | --- | --- |
| 1 | [202610260004_price_list_tree.sql](supabase/updates/202610260004_price_list_tree.sql) | Árbol de listas y cálculo de precios heredados | 35 |
| 2 | [202610260005_delete_price_lists.sql](supabase/updates/202610260005_delete_price_lists.sql) | Eliminación de listas con conservación de historial | 36 |
| 3 | [202610260006_billing_update_robustness.sql](supabase/updates/202610260006_billing_update_robustness.sql) | Corrección de firma de la función de facturación | 37 |
| 4 | [202610270001_store_billing_credentials.sql](supabase/updates/202610270001_store_billing_credentials.sql) | Almacenamiento privado de credenciales fiscales por comercio | 38 |
| 5 | [202610270002_primary_product_markup.sql](supabase/updates/202610270002_primary_product_markup.sql) | Principal global, porcentaje por producto y recálculo de listas existentes | 39 |

Cada archivo incluye su manifiesto JSON en un solo `DO`, sin tablas temporales. Toma el mismo bloqueo que schema (espera máxima de bloqueo de 10 segundos), rechaza checksums distintos, entradas desconocidas, huecos o dependencias faltantes. **Si el archivo ya está registrado con el mismo checksum, lo omite**, incluso si el intento anterior perdió su respuesta. No adopta migraciones ni amplía el baseline. El `SELECT` final devuelve cantidad y última migración; si la instalación ya tiene las 39, permanecerá en 39 en cada paso.

Cada archivo confirma su propia transacción: si falla el segundo, el primero sigue registrado y el segundo no. No continuar con el siguiente hasta resolver el error. Tras perder una respuesta, consultar el historial antes de repetir; no ejecutar varios paquetes en paralelo ni mezclarlos con schema. Al terminar, el instalador completo también reconocerá estos pasos y no volverá a ejecutarlos. Completar el recorrido antes de usar las funciones nuevas.

Para regenerarlos desde las mismas fuentes: `node scripts/generate-schema.mjs --individual-updates`. Este comando solo empaqueta archivos locales. La frontera de esta actualización es la 003 ya conciliada; agregar una migración no amplía el baseline. No editar los paquetes ni las migraciones históricas para resolver un error de checksum.

Verificaciones ejecutadas: lectura de fuentes/dependencias y generación local de los cinco paquetes. La app pasó `npx tsc --noEmit -p tsconfig.app.json` tras integrar el porcentaje por producto. No se ejecutaron SQL remoto, builds ni otras pruebas automatizadas; TypeScript no valida estos paquetes SQL. Pendiente manual: comprobar conteos 35 → 36 → 37 → 38 → 39 (o salto de pasos ya aplicados), reejecución sin duplicados, validaciones de permisos y funcionamiento del backend. Guía en **http://localhost:3001/**, con datos de prueba: editar un porcentaje y recargar (persiste), cobrar con lista derivada y pago mixto (precio correcto y un ticket), eliminar una lista sin derivadas (conserva ventas) e intentar eliminar otra con derivadas (se bloquea). Consultar un cierre anterior (conserva conteo y billetes). No crear ventas ficticias en producción.

### Error: retail_schema_manifest no existe

`retail_schema_manifest` era una tabla temporal del instalador anterior, distinta del manifiesto temporal que usaba la recuperación. El error `42P01` indica que no estaba disponible al consultarla; puede ocurrir al ejecutar fragmentos, finalizar su transacción o cambiar de sesión. El mensaje aislado no confirma cuál fue el caso.

El schema actual **no crea ni consulta esa tabla**. El manifiesto JSON y todos los pasos se encuentran dentro del mismo `DO`, sin necesitar una tabla ni conservarla entre sentencias o sesiones. Se mantienen el baseline fijo, la validación de nombres/orden/SHA-256, los permisos del historial, la normalización CRLF y las comprobaciones de cierre/checkout/listas. Las migraciones originales y sus checksums no cambian.

Para continuar:

1. Si la sesión está abortada (`25P02`), ejecutar `ROLLBACK;`.
2. Vaciar la consulta anterior del SQL Editor y pegar **todo supabase/schema.sql actualizado**, sin mezclar fragmentos viejos ni ejecutar solo una selección. El comienzo declara `DO $retail_install$` y su manifiesto JSON; no debe contener `CREATE TEMPORARY TABLE retail_schema_manifest`.
3. Ejecutar completo. Si ya se conciliaron las 34 migraciones, no repetir la recuperación: schema debe omitirlas y terminar con las **39 entradas actuales**.
4. Repetir schema completo: debe conservar las mismas entradas sin duplicar operaciones. No crear la tabla faltante a mano ni borrar historial para avanzar. Si aparece otro error, detenerse y compartirlo completo.

Se revisó el generador y se empaquetó schema localmente. No se ejecutó SQL remoto ni se validaron estas ejecuciones en el backend. Guía manual posterior en **http://localhost:3001/**: abrir listas, editar un porcentaje y recargar (conserva el valor); eliminar una lista de prueba sin derivadas (desaparece sin cambiar ventas); consultar un cierre existente (conserva tickets y billetes). Los cobros de prueba deben hacerse en un comercio de pruebas, nunca creando ventas ficticias en producción.

### Error: Failed to fetch (api.supabase.com)

Este mensaje del dashboard no incluye un SQLSTATE ni confirma qué ocurrió en la base: puede haberse perdido la respuesta aunque la consulta haya llegado a ejecutarse. No concluir que schema falló o terminó, no borrar historial ni repetir reparaciones antes de consultar su estado.

1. Revisar [estado oficial de Supabase](https://status.supabase.com/). Un estado general operativo no descarta un problema de sesión, navegador, red o un proyecto concreto.
2. Recargar el dashboard y volver a ingresar si lo pide. Si persiste, probar una ventana privada sin extensiones habilitadas. Supabase documenta [extensiones como una posible causa de Failed to Fetch](https://supabase.com/kb/troubleshooting/failed-to-fetch-in-dashboard-and-other-areas----browser-extension-dyDTRU); eso no identifica por sí solo la causa de este incidente.
3. En el proyecto AdministradorKiosco, abrir una consulta nueva y ejecutar solo `select 1 as conexion;`: debe devolver `1`. Si falla con el mismo mensaje, continuar resolviendo el acceso al dashboard; no cambiar SQL, claves ni RLS para corregirlo.
4. Si funciona y la conciliación ya había creado el historial, ejecutar esta consulta de **solo lectura**:

```sql
select count(*) as migraciones,
       max(filename) as ultima_migracion
from retail_private.schema_migrations;
```

Con las fuentes actuales, 39 entradas y último archivo `202610270002_primary_product_markup.sql` indican que todos los pasos están registrados; comprobar igualmente checksum/orden mediante schema y funcionamiento según las guías, sin repetir la recuperación manual. 34 entradas hasta `202610260003_billing_fields.sql` indican que no se ven cambios posteriores confirmados: la instalación puede no haber terminado o seguir ejecutándose. Compartir el resultado y revisar actividad antes de reenviarla. Si el historial no existe o hay otra cantidad/último archivo, compartir ese resultado; no inventar registros para completar el número esperado.

Si la consulta pequeña funciona pero schema vuelve a perder la respuesta, registrar cuánto tardó y el error completo. El SQL Editor tiene un [límite de un minuto para consultas largas](https://supabase.com/kb/troubleshooting/avoiding-timeouts-in-long-running-queries-6nmbdN); el mensaje de fetch aislado no demuestra que se alcanzó ese límite. Revisar actividad/logs y estado registrado antes de elegir otro método de aplicación autorizado. No aumentar timeouts ni cancelar consultas por iniciativa propia.

Procedimiento preparado desde documentación oficial y lectura local; no se ejecutó ninguna consulta contra el proyecto del usuario. Guía manual pendiente en **http://localhost:3001/**, cuando vuelva la conexión y se confirme la instalación: abrir Productos y listas (cargan sin errores de RPC), consultar ventas y un cierre existente (se conservan importes, tickets y billetes). No crear operaciones ficticias en producción para diagnosticar la conexión.

### Error: la definición de checkout no coincide

La migración `202610260004_price_list_tree.sql` reemplaza únicamente el cálculo de precio y agrega el bloqueo de listas en checkout. Exige encontrar el código anterior para conservar stock, componentes, caja, pagos, permisos e idempotencia. El texto anterior está presente en la fuente local de checkout y coincide con la versión informada en el diagnóstico; eso no prueba que la función remota siga igual después de ese diagnóstico.

Se identificó una fragilidad de formato: el parche elimina retornos de carro de `pg_get_functiondef`, pero su texto de comparación podía conservarlos si el portapapeles/editor convertía el schema a CRLF. El generador ahora ejecuta cada cuerpo SQL normalizando CRLF a LF, igual que las fuentes usadas para calcular checksums. **No modifica migraciones históricas, sus checksums, el baseline ni omite la validación de checkout**. Si la definición todavía no coincide, conserva el error y agrega la huella normalizada del cuerpo como detalle para distinguir otro estado instalado.

Después de este error, si la conciliación ya terminó con 34 entradas, no repetirla. Si la sesión está abortada (`25P02`), ejecutar `ROLLBACK;`. Reemplazar la consulta vieja por **todo schema.sql actualizado** y ejecutarlo completo: debe omitir lo registrado y terminar con las **39 entradas actuales**, incluidas las migraciones locales posteriores de facturación/credenciales que ya estaban en el repositorio. La transacción fallida no convierte la 004 en aplicada. No crear sus columnas a mano ni cambiar checksums para forzar el avance.

Si vuelve a fallar por checkout, compartir el error con su detalle y ejecutar [check_manual_schema_history.sql](supabase/maintenance/check_manual_schema_history.sql), de solo lectura. Revisar esa diferencia antes de reemplazar código remoto; no hacer sustituciones amplias ni quitar el bloqueo. Se revisaron las fuentes y se regeneró schema localmente; no se ejecutó SQL remoto ni se validó la hipótesis de formato en el SQL Editor del usuario.

Guía manual pendiente en **http://localhost:3001/**, con datos de prueba: consultar las listas y editar un porcentaje, recargar y comprobar persistencia; cobrar usando una lista derivada, verificar el total y una sola baja de stock, incluidos componentes y pago mixto; reintentar una operación según el flujo existente sin duplicar ticket; intentar eliminar una lista con derivadas (debe bloquearse) y una lista de prueba sin derivadas (debe desaparecer conservando ventas anteriores). Repetir schema debe omitir lo registrado. No crear ventas ficticias en producción.

### Error: no existe retail_save_price_list_tree

`202610260005_delete_price_lists.sql` necesita las funciones creadas por `202610260004_price_list_tree.sql`. Ejecutar únicamente el archivo de eliminación puede producir `42883` al buscar la función del árbol. No hay que crear una función vacía ni omitir ese bloqueo: también protege las relaciones y permisos de las listas eliminadas.

Si las migraciones previas están registradas correctamente o todavía no se instalaron, confirmar el proyecto/baseline y ejecutar **supabase/schema.sql completo y actualizado**, no fragmentos ni solo la migración 005. El instalador ejecuta la 004 antes de la 005 y omite archivos ya registrados. **Si se aplicaron archivos posteriores al baseline manualmente, conciliar primero su historial mediante el diagnóstico siguiente:** repetir schema puede intentar crear objetos que ya existen. Si la sesión quedó con error `25P02`, ejecutar `ROLLBACK;` antes de comenzar el diagnóstico. No registrar manualmente la migración fallida como realizada ni avanzar el baseline.

El schema generado comprueba las tres funciones del árbol antes de ejecutar el cuerpo de eliminación y devuelve un mensaje con la dependencia faltante. No repara automáticamente un historial que diga aplicada la 004 si sus funciones no existen: detenerse y consultar el [diagnóstico de solo lectura](supabase/maintenance/check_kiosco_installation.sql). Si aparecen columnas existentes, checksums distintos o huecos, no borrar datos/historial ni continuar con fragmentos; revisar qué se instaló manualmente.

Guía manual pendiente, después de conciliar el historial: ejecutar schema completo en el SQL Editor del proyecto confirmado; debe finalizar con el historial y las migraciones 004/005 registradas. En **http://localhost:3001/**, editar un porcentaje y guardar; luego eliminar una lista de prueba sin derivadas: debe desaparecer sin modificar tickets. Repetir schema sin cambios debe omitir los pasos ya registrados. Se regeneró el archivo localmente; no se ejecutó SQL remoto ni se validó la instalación/backend. Sin cambios de TypeScript, builds ni pruebas automatizadas.

### Error: closing_denominations ya existe

El error `42701` al ejecutar schema indica que intenta aplicar `202610240001_shift_closing_details.sql`, pero ya existe alguna de sus columnas. Esa presencia no acredita que también estén instalados sus funciones, trigger, permisos y sincronización. No eliminar las columnas ni agregar `IF NOT EXISTS` para saltar el problema: podría dejar una instalación parcial como si estuviera completa.

El 26/10/2026 el responsable indicó que el último archivo ejecutado completo y sin errores fue `202610260004_price_list_tree.sql`. Esa declaración ayuda a conciliar la instalación manual, pero no demuestra por sí sola que todos los archivos intermedios o sus versiones coincidan. El baseline general sigue fijo en los 30 archivos confirmados el 23/10; no se lo amplía automáticamente. El fallo previo de la 005 tampoco la convierte en aplicada.

1. Confirmar el proyecto correcto. Si la sesión sigue abortada (`25P02`), ejecutar `ROLLBACK;`.
2. Ejecutar completo [check_manual_schema_history.sql](supabase/maintenance/check_manual_schema_history.sql). Es de **solo lectura**: consulta historial, columnas, firmas y huellas de funciones, permisos, triggers, restricciones, índices y RLS; no lee ventas ni altera datos o historial.
3. Compartir el resultado `diagnostico_historial` y contrastarlo con las fuentes y las ejecuciones manuales confirmadas. No volver a ejecutar schema mientras persista este conflicto. Un inventario sin objetos faltantes tampoco certifica todos los cuerpos SQL: ante dudas, comparar las definiciones antes de adoptar una migración.
4. Preparar la conciliación para esta instalación una vez identificados los pasos completos y los pendientes. Registrar únicamente migraciones completas confirmadas con sus checksums exactos; resolver instalaciones parciales explícitamente. Luego aplicar schema y verificar su resultado. No borrar historial ni marcar la 005 como hecha para forzar el avance.

El instalador actualizado detecta las columnas del cierre sin historial antes de repetir su SQL y remite a este diagnóstico con un error accionable. Esta protección **no repara ni adopta** la instalación. Se preparó localmente; su ejecución y la conciliación remota siguen pendientes.

### Conciliación preparada para el diagnóstico del 27/10/2026

El resultado compartido por el responsable muestra **historial ausente**, cierre, depósito, alta de combos y campos de facturación presentes. Las huellas de las **13 funciones** definidas en las migraciones 31–34 coinciden con sus cuerpos locales normalizados a LF; también se revisaron los triggers y políticas informados. En cambio, no existen las cuatro columnas ni las funciones del árbol de listas, ni las columnas de eliminación. Por eso **no se adopta la 004**, aunque se recordara como última ejecución: el límite respaldado por este diagnóstico es `202610260003_billing_fields.sql` (34 archivos). Esto no es una auditoría integral del backend ni prueba que otro proyecto tenga el mismo estado.

Se preparó [adopt_manual_history_20261027.sql](supabase/maintenance/adopt_manual_history_20261027.sql) **para esta instalación**, separado del instalador habitual. Valida en vivo cuerpos, firmas, tipo de retorno, `search_path` y permisos de funciones; columnas, tipos, obligatoriedad y predeterminados; triggers habilitados, restricciones e índices presentes; RLS y permisos del depósito; ausencia de árbol/bajas e integridad de cualquier historial previo. Si algo cambió, se detiene y revierte la transacción. No ejecuta ninguna operación de venta, stock o caja. Solo crea/completa el historial privado como `adopted`, conservando sus entradas anteriores y fechas; no reescribe las migraciones ni cambia el baseline general.

Pasos manuales para este incidente:

1. Confirmar el proyecto AdministradorKiosco y conservar el respaldo correspondiente. Si la sesión está abortada, ejecutar `ROLLBACK;`.
2. Ejecutar **todo** `supabase/maintenance/adopt_manual_history_20261027.sql`. Resultado esperado: **34 entradas**, hasta `202610260003_billing_fields.sql`, sin repetir sus cuerpos SQL. La fecha registrada corresponde a la adopción. Repetir antes de schema no duplica entradas. Si falla una validación, detenerse y compartir el error; no quitar validaciones ni insertar filas a mano.
3. Solo si terminó correctamente, ejecutar **todo** `supabase/schema.sql` actualizado. Debe omitir esas 34 y aplicar las pendientes: árbol 004, eliminación 005, robustez de facturación 006 credenciales por comercio `202610270001_store_billing_credentials.sql` y Principal por porcentaje `202610270002_primary_product_markup.sql`. El archivo actual contiene **39 entradas**; se conservaron esas fuentes de facturación incorporadas por otro trabajo.
4. Revisar el resultado final y repetir schema: debe omitir todos los pasos registrados. Desde entonces usar schema, **no repetir el script específico de recuperación** después de instalar migraciones posteriores, porque rechaza historiales que exceden su límite fijo.
5. En **http://localhost:3001/**, abrir Productos → Listas de precios, editar un porcentaje de prueba y recargar: conserva el valor. Eliminar una lista de prueba sin derivadas: desaparece sin modificar tickets anteriores. Intentar eliminar una con derivadas: se bloquea y permite revisar el origen. Consultar un cierre existente: conserva conteo, tickets y billetes. No crear ventas ficticias en producción.

El manifiesto de recuperación se empaqueta explícitamente con `node scripts/generate-schema.mjs --manual-history-recovery-20261027`. El límite de 34 archivos está fijado y no crece al agregar migraciones. Se revisó el diagnóstico entregado y se generaron los archivos localmente; **no se ejecutó la conciliación ni SQL remoto**. La instalación y los recorridos de navegador/backend siguen pendientes de ejecución manual.

Si la recuperación informa que falta `retail_update_sale_billing(...,date,text)`, el diagnóstico anterior ya no coincide con la instalación. La migración 006 elimina esa firma y crea otra con `text` para el vencimiento. La recuperación actualizada acepta **una sola variante**: la original de la 003 o el reemplazo exacto de la 006, comprobando cuerpo, tipos y permisos. No basta con que exista una función del mismo nombre. Si faltan ambas, hay sobrecargas adicionales o no coincide la huella, se detiene y pide un diagnóstico actualizado.

Para este error, usar el archivo de recuperación actualizado completo (si aparece `25P02`, primero `ROLLBACK;`) y, solo si termina con 34 entradas, ejecutar schema completo. **No reinstalar manualmente la firma antigua ni registrar la 006 fuera de orden**. Si se reconoce el reemplazo, schema volverá a instalar esa función al llegar a la 006 después de aplicar las listas; el SQL de esa migración cambia funciones/permisos, sin actualizar filas de ventas. El baseline se conserva: la recuperación registra 34 entradas y el schema actual completa 39. Este reconocimiento se preparó desde la fuente local; aún requiere ejecución manual en la base.

El error `42P01: relation "retail_manual_recovery_manifest" does not exist` corresponde a la tabla temporal de una versión anterior de la recuperación. Podía faltar al ejecutar fragmentos, finalizar su transacción o cambiar de sesión; el error aislado no determina cuál de esos casos ocurrió. **La versión actual no crea ni usa esa tabla:** declara el manifiesto JSON dentro del único bloque `DO` que valida y registra el historial. Un error revierte ese bloque completo, sin depender de tablas entre sentencias o sesiones. El `SELECT` final solo muestra el historial persistido.

Para continuar tras ese error, reemplazar todo el contenido viejo del editor con el archivo de recuperación actualizado y ejecutarlo completo, sin seleccionar solo una parte. Si la sesión está abortada, ejecutar primero `ROLLBACK;`. Debe devolver las 34 entradas; recién entonces ejecutar schema completo, que actualmente debe terminar con 39. No crear la tabla temporal a mano ni ejecutar solo el `SELECT` final. El manifiesto, los checksums, los permisos y el límite de adopción se conservan; no se modifica información del comercio para resolver este error. Cambio preparado y empaquetado localmente, todavía sin validación SQL remota.

### Timeout de retail_sales al consultar pendientes fiscales

La URL `retail_sales?select=id&store_id=...&billing_status=in.(pending,retry)` corresponde a una consulta `HEAD` con conteo exacto del monitor de facturación de `BillingSettings`, filtrada por comercio. `net::ERR_TIMED_OUT` indica que el navegador no completó la solicitud; el mensaje aislado no prueba sobrecarga, permisos incorrectos ni migraciones faltantes. Todavía no se comprobó si también fallan productos/ventas en el proyecto afectado.

Se corrigió el monitor en el frontend: solo consulta en la sección visible, cancela sus solicitudes al salir y limita la espera de sus tres lecturas a 15 segundos. Revisa los errores de cada respuesta de Supabase antes de mostrar contadores y ofrece reintento explícito; ya no presenta respuestas fallidas como cero pendientes. La consulta de credenciales queda limitada a la sección activa. No cambia la emisión, la cola offline, los datos fiscales ni la autorización del backend; tampoco modifica SQL por este timeout.

Diagnóstico manual pendiente: comparar en la pestaña Red la carga de productos/ventas con la apertura de Datos del comercio. Si fallan todas las solicitudes al dominio del proyecto, revisar conexión y salud del proyecto antes de tocar schema. Si únicamente fallan los conteos, revisar la solicitud, logs y el plan de consulta con el rol correspondiente; no desactivar RLS ni crear índices duplicados a ciegas. Un `select 1` correcto desde SQL Editor solo comprueba ese canal, no certifica el acceso REST del navegador.

Validación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, salida 0 después del ajuste. No se ejecutó SQL remoto, build ni otras pruebas automatizadas. Guía manual en **http://localhost:3001/**: permanecer en Vender (el monitor oculto no consulta); abrir Datos del comercio (consulta una vez); simular falta de red (error sin métricas inventadas); salir/volver (borrador conservado); reconectar y usar Reintentar consulta (datos válidos sin emitir comprobantes). La conectividad real, RLS y navegador siguen pendientes.

## Principal por porcentaje: efectos de la actualización 202610270002

El quinto paquete individual requiere las 38 migraciones anteriores registradas. **Sincronizar pendientes de todos los dispositivos y revisar carritos antes de aplicarlo**: las listas existentes basadas en Costo o Catálogo pasarán a heredar Principal, conservando ajustes, fijos, ramas y sucursales. Esto cambia sus precios futuros, como se solicitó: costo $100, Principal $130, derivada +50% = $195. No modifica tickets anteriores ni stock. No se aplicó SQL remoto al preparar estos archivos.

Principal es única, global y no eliminable. Los productos existentes mantienen precio manual (`sale_markup = null`); el alta usa costo y porcentaje. Cambiar el costo recalcula productos automáticos, incluidos combos. Una modificación explícita de precio incompatible con su fórmula lo deja manual, manteniendo los flujos de precio delegado/importación. Los insumos no requieren precio. Se agregan validaciones de permisos y costo positivo, sin conceder administración a cajeros.

El árbol conserva su límite de 12 niveles: si incorporar Principal lo supera, el paquete revierte y pide revisar las ramas, sin aplanarlas. La creación de combos verifica la definición instalada antes de extender su alta atómica; una diferencia detiene la operación completa, sin omitirla ni registrar éxito. Reintentar el paquete ya registrado no crea otra Principal ni vuelve a recalcular relaciones. El baseline de adopción permanece en 30.

Guía manual en **http://localhost:3001/**: [producto/porcentaje, combos y offline](docs/productos-y-stock.md#precio-principal-por-porcentaje) y [listas/sucursales](docs/operacion-y-mercaderia.md#precios-por-sucursal). Pendiente validar SQL en backend, permisos, concurrencia, otro dispositivo y la interfaz móvil; TypeScript no certifica esos recorridos.

## Agregar un cambio futuro

1. Agregar una migración nueva en `supabase/migrations/`, con nombre completo único y transacción exterior `begin; ... commit;`.
2. Ejecutar localmente `node scripts/generate-schema.mjs` y revisar el cambio generado.
3. **No cambiar el baseline fijo al último archivo**: las migraciones nuevas deben ejecutarse como pendientes, no adoptarse como realizadas.
4. Revisar/aplicar el schema en el entorno correspondiente cuando el usuario lo decida. No modificar archivos históricos registrados: preparar otra migración para corregirlos.

Las migraciones originales se conservan como fuente, historial y referencia de herramientas existentes. El orden usa el nombre completo: hay dos archivos `202610190001_*`, por lo que la versión numérica sola no identifica cada cambio. Este historial privado no se importa automáticamente desde `supabase_migrations` ni reemplaza el historial de Supabase CLI. No alternar ambos mecanismos sin conciliar explícitamente sus registros.

## Auth, cuentas y configuración

- Habilitar email/contraseña y confirmación en Authentication. Configurar Site URL y Redirect URLs para desarrollo y producción; SMTP propio si corresponde.
- Completar únicamente variables públicas en `.env.local` desde `.env.example`. `service_role`, contraseñas de base y secretos de administración nunca van en `VITE_*`.
- El alta de colaboradores usa un cliente Auth separado y no reemplaza la sesión del propietario. Una cuenta existente conserva su contraseña; una autorización pendiente se acepta al ingresar con email confirmado. Crear/administrar accesos respeta los roles y perfiles descritos en [Administración](docs/administracion.md).
- Un error de RPC/columna ausente requiere revisar instalación, no inventar datos ni desactivar RLS. Un fallo de Groq no se arregla cambiando permisos de la base.
- Instalar SQL no despliega Edge Functions ni publica frontend. Push requiere los pasos adicionales de [su guía](PUSH_SETUP.md).

## Guía de Pruebas — manual pendiente

1. En una base Supabase desechable nueva, ejecutar schema completo: deben quedar las 39 entradas `schema` y los objetos de la app. Repetir: mismas entradas y sin recursos ni ajustes duplicados.
2. En una instalación manual que coincida exactamente con el baseline confirmado, ejecutar con su baseline: 30 entradas `adopted`, sin repetir sus cuerpos SQL, y las nueve posteriores como `schema`. **La instalación diagnosticada el 27/10 ya tiene cuatro posteriores:** seguir primero su conciliación específica; el resultado esperado es 34 `adopted` y cinco `schema`. Si ya hay historial, solo agrega las pendientes. Verificar tablas, RPC y RLS con las cuentas correspondientes; el historial por sí solo no certifica esos permisos.
3. En un entorno de pruebas existente sin historial, vaciar baseline: debe detenerse antes de aplicar cambios. Restaurarlo solo después de confirmar el estado de ese entorno.
4. Para ensayar una migración futura, usar una copia desechable: agregar un cambio después del baseline, regenerar y aplicar. Debe ejecutarse una vez como `schema`, sin adoptarse ni repetir lo anterior. No cambiar archivos históricos de producción para probar checksums.
5. Abrir http://localhost:3001/: ingresar, consultar catálogo, editar un producto y recorrer apertura → venta → cierre solo en datos de prueba. Repetir con cajero/administrador, insumos/combos y otro dispositivo según las guías.

Ejecutado durante la consolidación: generación local del archivo y revisión de fuentes/enlaces. No se ejecutó SQL en ningún entorno, no se verificó el backend y no se hicieron builds ni pruebas automatizadas. TypeScript no valida el SQL generado.
