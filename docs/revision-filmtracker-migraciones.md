# Revisión de las migraciones de FilmTracker

Fecha: 19/10/2026. Revisión estática; no hubo conexión ni cambios en la base de FilmTracker.

## Archivos examinados

Ubicación original: `C:/Users/Usr/OneDrive/Pruebas/FilmTracker-main/supabase/migrations/`.

| Archivo | Objetos definidos / modificados |
| --- | --- |
| `20261007_awards_predictions.sql` | `public.awards_predictions`: predicciones por usuario/temporada, índices y políticas RLS. Referencia `profiles`. |
| `20261007_cineclubs.sql` | `public.cineclubs`, `cineclub_members`, `cineclub_polls`, `cineclub_messages`, sus índices, restricciones y políticas. Referencia `profiles` y `movies`. |
| `20261007_streaming_platforms.sql` | Agrega `public.profiles.streaming_platforms`, `integer[]` con default vacío, y comentario. |
| `20261013_movie_origin_country.sql` | Agrega `public.movies.origin_country`, `text[]`, sin completar datos; comentario y recarga de caché. |
| `20261013_trigger_warnings.sql` | Tablas `trigger_warnings` y `trigger_warning_votes`, índices, restricciones y políticas. Asume el esquema de búsqueda de la sesión; la auditoría comprueba `public`. |

Ninguno de estos cinco archivos define o referencia `retail_products`, `retail_sales`, `margin_group`, `retail_private.snapshot_margin_items` ni `retail_snapshot_margin_items`. La búsqueda de esos nombres en los SQL locales de `FilmTracker-main/supabase` tampoco produjo coincidencias. Esto no demuestra por sí solo que no existan en la base remota.

## Qué se puede concluir

La migración equivocada `202610160004_margin_groups.sql` modifica exclusivamente la columna/constraint/default/permiso de `public.retail_products.margin_group`, una función en `retail_private` y un trigger de `public.retail_sales`. Incluye notificación para recargar el esquema. No contiene cambios directos a tablas de películas, perfiles, clubes, predicciones ni advertencias.

Si se ejecutó el archivo completo y esas tablas retail no existían, debía fallar dentro de su transacción. En ese escenario no debería haber cambios persistidos por ese archivo. La afirmación depende de haber ejecutado el bloque completo, sin selección parcial ni otros comandos independientes.

En particular, si no existen `retail_sales`/`retail_products`, no hay que ejecutar la reversión anterior para intentar eliminarlas: puede fallar al referenciar tablas inexistentes, y no resuelve nada. La migración de margen tampoco crea esas tablas. Si aparecen tablas `retail_*` en FilmTracker, su origen necesita investigarse por separado; no deben borrarse basándose solo en estas cinco migraciones.

No puede certificarse que toda la base ni sus datos estén idénticos: estos archivos describen cambios esperados, no el estado remoto actual ni un respaldo completo anterior. Tampoco permiten conocer los valores de registros, historial de ejecuciones o definiciones sobrescritas. No se evaluó la seguridad general de las políticas de FilmTracker; se inventariaron para contrastar su estado.

## Cómo compartir el estado actual sin exportar la base

Preparado: [audit_filmtracker_after_margin_migration.sql](../supabase/maintenance/audit_filmtracker_after_margin_migration.sql).

1. Abrir el SQL Editor del proyecto **FilmTracker**, verificando su identificador en la URL. No es el proyecto `lkahqqsduatkhxruiolo` de AdministradorKiosco.
2. Copiar y ejecutar **todo** el archivo. Es una transacción de solo lectura, con una única consulta de resultado; no instala, elimina ni modifica objetos.
3. En Results, copiar el contenido de la celda `auditoria_filmtracker` y enviarlo en el chat. No hace falta exportar la base nueva ni compartir claves. El resultado describe estructura, políticas y restricciones, sin leer filas de usuarios, películas o mensajes.

El informe contiene tablas/columnas esperadas y faltantes, RLS, índices, tipos de las dos columnas agregadas, políticas/restricciones actuales y presencia de objetos retail. No inventaría credenciales, datos personales ni cantidades de filas. No comprueba todas las propiedades de todos los índices ni todos los objetos de la base.

## Interpretación del informe

- `objetos_del_kiosco.tablas_retail = []` y las tres banderas en `false`: no se detectan los objetos de esa migración; no hace falta una limpieza de esos objetos.
- Tablas retail presentes pero columna/función/trigger ausentes: no hay restos específicos del módulo de margen detectados; investigar esas tablas antes de cualquier limpieza adicional.
- Alguna bandera en `true`: revisar el objeto y su procedencia antes de usar la reversión. El informe no prueba cuándo se creó.
- `columnas_esperadas_faltantes = []`, RLS esperado satisfecho e índices esperados presentes: compatibilidad estructural parcial con los archivos entregados. No certifica datos intactos ni pruebas de funcionamiento.
- Una tabla, columna o índice faltante también puede significar que una migración de FilmTracker nunca se aplicó. No atribuir automáticamente esa ausencia al incidente.

## Guía de Pruebas

1. Ejecutar el informe en el SQL Editor de FilmTracker y compartir la celda de resultado. Si el editor muestra un error, compartir ese error en vez de interpretar un resultado vacío como aprobación.
2. Abrir FilmTracker en su URL habitual y consultar películas, perfil/plataformas, cineclubs, predicciones y advertencias. Confirmar acceso a datos existentes. No se conoce en esta sesión la URL de esa app.
3. En un entorno/cuenta de prueba, comprobar una edición de plataformas, una predicción y una interacción de cineclub; después comprobar que persisten. No es necesario crear datos de prueba en producción para ejecutar la consulta de estructura.
4. http://localhost:3001/ es la URL de AdministradorKiosco utilizada en esta conversación: no valida FilmTracker. Revisar allí el guardado de productos del proyecto correcto como comprobación independiente.

Verificación realizada: lectura de los cinco archivos y comparación de sus nombres/operaciones con la migración de margen y la reversión propuesta. El informe SQL fue preparado y revisado estáticamente; no ejecutado contra FilmTracker. Sin cambios en el repositorio FilmTracker, sin escrituras remotas, sin build ni pruebas automatizadas adicionales.

## Resultado recibido y limpieza de la instalación inicial

El usuario compartió el JSON del informe. Evidencia observada:

- Las nueve tablas de FilmTracker examinadas existen, no faltan sus columnas esperadas y no faltan los diez índices esperados por las cinco migraciones.
- Las siete tablas nuevas que requieren RLS lo tienen activado; `movies` y `profiles` también lo muestran activado. Las dos columnas especiales tienen los tipos/default esperados. Las restricciones listadas figuran validadas.
- `margin_group`, `snapshot_margin_items` y `retail_snapshot_margin_items` no existen en el alcance comprobado.
- Sin embargo, existen estas nueve tablas ajenas a FilmTracker: `retail_categories`, `retail_invitations`, `retail_members`, `retail_movements`, `retail_products`, `retail_registers`, `retail_sales`, `retail_shifts` y `retail_stores`.

Esos nombres coinciden con la migración inicial `202610010001_retail_multistore.sql`. La migración de margen por sí sola no las crea. Por lo tanto, la limpieza del margen no equivale a quitar la instalación inicial. El JSON anterior no inventarió todas las funciones ni el contenido de esas tablas: no se conoce si contienen registros.

### Reversión preparada para estas nueve tablas

Archivo: [remove_initial_retail_from_filmtracker.sql](../supabase/maintenance/remove_initial_retail_from_filmtracker.sql). Está fuera de las migraciones automáticas.

Esta operación **elimina las nueve tablas retail y todos sus registros**, junto con índices/políticas/restricciones/secuencias propias, seis RPC públicas conocidas, dos funciones auxiliares y el esquema privado una vez vacío. Si necesitás conservar algún dato de kiosco de ese proyecto, exportalo o retené un respaldo antes de ejecutarla. No selecciona ni elimina usuarios de `auth.users`, perfiles, películas o filas de FilmTracker.

Controles del archivo:

- Exige las nueve tablas de FilmTracker del informe, para rechazar un esquema distinto. Esto no sustituye comprobar el proyecto en la URL del SQL Editor.
- Rechaza otras tablas/vistas retail y funciones o referencias almacenadas fuera de la lista conocida. No usa un borrado por prefijo para elegir nuevos objetivos.
- Elimina las nueve tablas en un único grupo con `RESTRICT`, sin `CASCADE`, después de quitar la función cuyo retorno depende del tipo de fila `retail_shifts`.
- Dependencias externas conocidas por PostgreSQL impiden el borrado; ver [DROP TABLE](https://www.postgresql.org/docs/current/sql-droptable.html) y [seguimiento de dependencias](https://www.postgresql.org/docs/18/ddl-depend.html). Referencias textuales a retail en otras rutinas también detienen la operación; esa revisión textual no es un análisis completo de código dinámico o de aplicaciones externas.
- Usa una transacción y aborta si quedan relaciones/funciones retail contempladas por su comprobación o el esquema privado. No interpreta un error como limpieza exitosa.

### Pasos de ejecución y Guía de Pruebas

1. En el proyecto **FilmTracker**, comprobar su identificador en el SQL Editor. No ejecutar la limpieza en `lkahqqsduatkhxruiolo`.
2. Ejecutar nuevamente [el informe ampliado](../supabase/maintenance/audit_filmtracker_after_margin_migration.sql). Ahora incluye `schema_retail_private`, funciones retail, otras funciones que mencionan retail y otras relaciones prefijadas. Si no reconocés una función/objeto o necesitás conservar los registros retail, compartir ese resultado y conservar un respaldo antes de limpiar.
3. Ejecutar **todo** `remove_initial_retail_from_filmtracker.sql`. Si termina con un error por rutina/desconocido/dependencia/bloqueo, compartir el error junto con el informe; no forzar `CASCADE` ni correr fragmentos salteando controles.
4. Ejecutar el informe ampliado después de que la limpieza confirme éxito. Esperado: `tablas_retail`, `funciones_retail` y `otras_relaciones_retail` vacíos; `schema_retail_private` y las tres banderas anteriores en `false`; ninguna otra función mencionando retail. Los controles de FilmTracker deben conservar sus resultados anteriores.
5. En la URL habitual de FilmTracker, consultar películas/perfil/cineclubs/predicciones y comprobar una operación habitual autorizada. http://localhost:3001/ corresponde a AdministradorKiosco y debe seguir usando su propia base, con los objetos de kiosco instalados.

Verificación de esta entrega: lectura del resultado adjunto, comparación con las migraciones y revisión estática de los SQL. No se ejecutó la limpieza ni se conectó a FilmTracker. La confirmación de que no quedan objetos y la validación de sus datos requieren el resultado posterior y pruebas de la aplicación; no se certificó identidad de registros con una copia anterior.
