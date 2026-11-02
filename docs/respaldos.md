# Copias de seguridad

Guía para respaldar AdministradorKiosco, guardar la copia y comprobar que se puede recuperar. Datos de Supabase consultados el 30/10/2026; precios y retenciones pueden cambiar, revisar los [enlaces oficiales](#fuentes) antes de decidir.

**Una copia no vale hasta que se restauró una vez.** Hacer la [prueba de restauración](#prueba-de-restauración-en-un-proyecto-aparte) antes de sumar clientes reales.

## Índice

- [Qué respaldos tengo según mi plan](#qué-respaldos-tengo-según-mi-plan)
- [Qué queda sin cubrir](#qué-queda-sin-cubrir)
- [Rutina recomendada](#rutina-recomendada)
- [Preparar la computadora](#preparar-la-computadora)
- [Copia manual](#copia-manual)
- [Guardar la copia](#guardar-la-copia)
- [Prueba de restauración en un proyecto aparte](#prueba-de-restauración-en-un-proyecto-aparte)
- [Recuperar el comercio ante un problema real](#recuperar-el-comercio-ante-un-problema-real)
- [Guía de Pruebas](#guía-de-pruebas)

## Qué respaldos tengo según mi plan

El plan se ve en **Supabase → Organization → Billing**. Las copias automáticas disponibles se ven en **Database → Backups** del proyecto.

| Plan | Copia automática | Se puede volver atrás | Cuánto se puede perder |
| --- | --- | --- | --- |
| Free | La documentación no ofrece una con la que contar: recomienda exportar por tu cuenta. | Solo con tu copia manual. | Todo lo posterior a tu última copia. |
| Pro | Diaria. | Últimos 7 días. | Hasta un día. |
| Team | Diaria. | Últimos 14 días. | Hasta un día. |
| Pro o Team con PITR | Continua; reemplaza a la diaria. | 7, 14 o 28 días, a elección. | Unos 2 minutos, en el peor caso. |

PITR cuesta desde unos USD 100 por mes y exige un servidor Small o mayor.

**Recomendación:** pasar a Pro antes de sumar clientes reales (desde USD 25 por mes, confirmar en la página de precios) y mantener igual la copia manual. PITR puede esperar hasta que perder un día de ventas sea inaceptable.

Las copias automáticas no se pueden descargar y viven dentro de tu proyecto: **si se elimina el proyecto, se borran con él**. Por eso la copia manual sigue haciendo falta en cualquier plan. Además, en Free el proyecto se pausa tras una semana con poca actividad.

## Qué queda sin cubrir

Lo más importante: **las copias de la base no incluyen los archivos**. Guardan solo sus nombres y datos, no la foto o el PDF.

| Dato | Copia automática | Copia manual de esta guía | Qué hacer |
| --- | --- | --- | --- |
| Productos, ventas, turnos, movimientos, proveedores, facturas cargadas, permisos | Sí | Sí | Nada más. |
| Usuarios y contraseñas (cifradas) | Sí | Sí | Tratar la copia como información sensible. |
| Comprobantes de retiros, `retail-vouchers` | **No** | Sí, con el paso de archivos | Descargarlos en cada copia. |
| Fotos de remitos, `retail-remitos` | **No** | Sí, con el paso de archivos | Descargarlos en cada copia. |
| Permisos de esos archivos | Sí | **No** | Ejecutar [restore_storage_policies.sql](../supabase/maintenance/restore_storage_policies.sql) al restaurar. |
| Certificado y clave de ARCA por comercio | Sí | Sí | Están como texto en `retail_private.store_billing_credentials`. Por eso la copia debe ir cifrada. |
| Funciones `push-dispatch` y `billing-authorize` | No | No | El código está en el repositorio: volver a publicarlas. |
| Secretos de funciones (claves push, `ARCA_CERT`, `ARCA_KEY`) | No | No | Guardar `.env.push.local` y los demás en un gestor de contraseñas. |
| Vault y tarea programada de avisos | Sí | No | Tras una copia manual, rearmar con [PUSH_SETUP.md](../PUSH_SETUP.md) y `supabase/push-schedule.sql`. |
| Ajustes de Auth, API keys y Realtime | No | No | Anotar URL del sitio, redirecciones y correo. |
| `.env.local` y datos de publicación de la app | No | No | Guardar en el gestor de contraseñas. |
| Ventas sin sincronizar en cada caja | No | No | Viven solo en ese dispositivo. No borrar datos del sitio y descargar su respaldo JSON ([OFFLINE_POS.md](../OFFLINE_POS.md)). |
| Borradores en el navegador | No | No | No se recuperan. |
| Código sin subir a GitHub | No | No | Hacer commit y push. Si el código solo está en esta computadora, se pierde con ella. |

## Rutina recomendada

| Cuándo | Qué |
| --- | --- |
| Cada semana, con el comercio cerrado | Copia manual completa, con archivos. |
| Antes de cada migración | Copia manual completa. |
| Cada 3 meses y tras cambios grandes de base | Prueba de restauración. |

Conservar las últimas 4 copias semanales y una por mes durante el último año. Anotar cada copia y cada prueba: fecha, dónde quedó y resultado.

## Preparar la computadora

Hacerlo una sola vez:

1. Instalar [Docker Desktop](https://docs.docker.com/desktop/) y dejarlo abierto al copiar; `supabase db dump` lo necesita.
2. Instalar PostgreSQL 17 para tener `psql` y confirmar con `psql --version`.
3. Instalar [7-Zip](https://www.7-zip.org/) para cifrar.
4. Crear una carpeta **fuera de OneDrive y del repositorio**, por ejemplo `C:\RespaldosKiosco`. La copia sin cifrar contiene datos de clientes y claves: no debe sincronizarse.
5. Ejecutar `npx supabase login`.

Para conectarte, buscá la dirección en **Connect** del panel de Supabase. Usá la conexión directa o, si falla por IPv6, la de **Session pooler**. Si la contraseña tiene símbolos, debe ir codificada para URL. No la pegues en el código, en commits ni en un chat.

El proyecto real es `lkahqqsduatkhxruiolo`. Confirmalo siempre: hay antecedentes de SQL ejecutado en otro proyecto.

## Copia manual

Estos pasos solo leen producción. En PowerShell, desde la carpeta del proyecto:

**1. Preparar la carpeta y la conexión**

```powershell
$env:PROD_DB_URL = "PEGAR_CONEXION_DE_PRODUCCION"
$carpeta = "C:\RespaldosKiosco\$(Get-Date -Format yyyy-MM-dd)"
New-Item -ItemType Directory -Force $carpeta
```

**2. Copiar la base**

```powershell
npx supabase db dump --db-url $env:PROD_DB_URL -f "$carpeta\roles.sql" --role-only
```

```powershell
npx supabase db dump --db-url $env:PROD_DB_URL -f "$carpeta\schema.sql"
```

```powershell
npx supabase db dump --db-url $env:PROD_DB_URL -f "$carpeta\data.sql" --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes" -x "storage.objects" -x "storage.prefixes"
```

`storage.objects` y `storage.prefixes` quedan afuera a propósito: al subir los archivos, Supabase vuelve a crear esas filas. Si estuvieran, la subida podría chocar con filas que ya existen.

**3. Copiar los archivos**

```powershell
npx supabase link --project-ref lkahqqsduatkhxruiolo
```

```powershell
npx supabase storage cp -r "ss:///retail-vouchers" "$carpeta\storage\retail-vouchers" --experimental --linked -j 4
```

```powershell
npx supabase storage cp -r "ss:///retail-remitos" "$carpeta\storage\retail-remitos" --experimental --linked -j 4
```

Revisar que dentro de cada carpeta haya una subcarpeta por comercio. Si un bucket todavía no tiene archivos, confirmarlo en **Storage** antes de seguir.

**4. Guardar el control**

En el SQL Editor de producción ejecutar [backup_verify_counts.sql](../supabase/maintenance/backup_verify_counts.sql), exportar el resultado como CSV y guardarlo en la carpeta como `conteos.csv`. Solo lee y no muestra datos de personas ni claves.

**5. Cerrar**

```powershell
Remove-Item Env:PROD_DB_URL
```

Si un comando falla, la copia no sirve: revisar el error y volver a empezar en una carpeta limpia.

## Guardar la copia

1. Cifrar con 7-Zip. Pide una contraseña; cifra también los nombres de los archivos:

   ```powershell
   & "C:\Program Files\7-Zip\7z.exe" a -p -mhe=on "$carpeta.7z" "$carpeta\*"
   ```

2. Comprobar que abre con la contraseña:

   ```powershell
   & "C:\Program Files\7-Zip\7z.exe" t "$carpeta.7z"
   ```

3. Guardar la contraseña en un gestor de contraseñas. Sin ella, la copia no se puede recuperar.
4. Dejar el `.7z` en **dos lugares distintos**: un disco externo y una nube, por ejemplo OneDrive. Nunca en Supabase ni en el repositorio.
5. Borrar la carpeta sin cifrar recién después de comprobar el `.7z`.

## Prueba de restauración en un proyecto aparte

Nada de esta prueba escribe en producción. Duración estimada: entre media hora y una hora la primera vez.

**No usar "Restore to a New Project" para esta prueba.** Copia también la tarea de avisos y Vault, y esa tarea empieza a llamar a la función de producción cada minuto. Tampoco copia los archivos.

**1. Crear el proyecto de prueba**

Crear un proyecto nuevo en Supabase, por ejemplo `kiosco-prueba-restauracion`. Free permite dos proyectos activos en total: si ya tenés dos, pausar temporalmente uno que no sea producción. En Pro, cada proyecto extra se cobra aparte hasta borrarlo.

**2. Descomprimir la copia**

Descomprimir el `.7z` en una carpeta nueva fuera de OneDrive. Probar con la copia guardada es parte de la prueba.

```powershell
$copia = "C:\RespaldosKiosco\prueba"
& "C:\Program Files\7-Zip\7z.exe" x "RUTA_DE_LA_COPIA.7z" "-o$copia"
```

**3. Restaurar la base**

La primera línea frena todo si la conexión apunta a producción.

```powershell
$env:TEST_DB_URL = "PEGAR_CONEXION_DEL_PROYECTO_DE_PRUEBA"
if ($env:TEST_DB_URL -match 'lkahqqsduatkhxruiolo') { throw 'Es producción. No continuar.' }
psql --single-transaction --variable ON_ERROR_STOP=1 --file "$copia\roles.sql" --file "$copia\schema.sql" --command "SET session_replication_role = replica" --file "$copia\data.sql" --dbname $env:TEST_DB_URL
```

Si termina con error, no se guarda nada. Errores conocidos:

- `supabase_admin`: comentar en `schema.sql` las líneas `ALTER ... OWNER TO "supabase_admin"`.
- `cli_login_postgres`: comentar en `roles.sql` la línea `GRANT "postgres" TO "cli_login_postgres"...`.

**4. Restaurar permisos de archivos**

En el SQL Editor **del proyecto de prueba**, con su nombre a la vista, ejecutar [restore_storage_policies.sql](../supabase/maintenance/restore_storage_policies.sql). Debe mostrar 4 filas.

**5. Subir los archivos al proyecto de prueba**

`supabase link` cambia `supabase/.temp/linked-project.json`, que está en git. Volver a vincular producción al cerrar (paso 8) y no incluir ese cambio en un commit.

```powershell
npx supabase link --project-ref REF_DEL_PROYECTO_DE_PRUEBA
```

```powershell
npx supabase storage cp -r "$copia\storage\retail-vouchers" "ss:///retail-vouchers" --experimental --linked -j 4
```

```powershell
npx supabase storage cp -r "$copia\storage\retail-remitos" "ss:///retail-remitos" --experimental --linked -j 4
```

**6. Comparar**

Ejecutar [backup_verify_counts.sql](../supabase/maintenance/backup_verify_counts.sql) en el proyecto de prueba y compararlo con `conteos.csv`. Cada fila debe dar igual. Una diferencia es un fallo de la prueba, salvo que el comercio haya seguido operando entre la copia y el conteo.

**7. Abrir la app contra el proyecto de prueba**

Crear `.env.restore.local` en la carpeta del proyecto. Git ya lo ignora. Las claves vacías evitan avisos, IA e integraciones reales:

```text
VITE_SUPABASE_URL=https://REF_DEL_PROYECTO_DE_PRUEBA.supabase.co
VITE_SUPABASE_ANON_KEY=CLAVE_ANON_DEL_PROYECTO_DE_PRUEBA
VITE_ENABLE_DEV_PWA=false
VITE_SENTRY_DSN=
VITE_VAPID_PUBLIC_KEY=
VITE_GROQ_API_KEY=
VITE_PICKINGUP_API_TOKEN=
```

En **Authentication → URL Configuration** del proyecto de prueba, poner `http://localhost:3002`. Después, en otra terminal:

```powershell
npx vite --mode restore --port 3002 --strictPort
```

Usar siempre el puerto 3002: al ser otro origen, no comparte caché ni cola offline con `http://localhost:3001/`. Seguir la [Guía de Pruebas](#guía-de-pruebas).

**Durante la prueba:**

- No publicar funciones en el proyecto de prueba. Sin `billing-authorize` no se puede emitir ante ARCA, y la copia puede contener certificados reales.
- No invitar personas ni enviar correos: los usuarios son reales.

**8. Cerrar**

1. Eliminar el proyecto de prueba: contiene datos reales.
2. Borrar `.env.restore.local` y la carpeta `C:\RespaldosKiosco\prueba`.
3. Volver a vincular producción y anotar el resultado:

```powershell
npx supabase link --project-ref lkahqqsduatkhxruiolo
```

## Recuperar el comercio ante un problema real

Antes de actuar: avisar al equipo, no borrar datos de ninguna caja y descargar el respaldo JSON de las que tengan pendientes.

**Se borró o dañó algo puntual, con plan pago.** Lo más seguro es restaurar en un proyecto nuevo y copiar a producción solo lo necesario, sin pisar las ventas posteriores. Hacerlo con ayuda: esa copia de filas se prepara caso por caso. Mientras dure ese proyecto, tener en cuenta la advertencia sobre la tarea de avisos.

**Hay que volver todo atrás.** En **Database → Backups**, elegir la copia. El proyecto queda sin servicio mientras tanto y se pierde todo lo posterior a esa copia. Hacer antes una copia manual del estado actual. Después, volver a subir los archivos que falten.

**Se perdió el proyecto.** Repetir los pasos 1 a 6 de la prueba en un proyecto nuevo y además:

1. Publicar `push-dispatch` y `billing-authorize`, y cargar sus secretos.
2. Rearmar Vault y la tarea de avisos con [PUSH_SETUP.md](../PUSH_SETUP.md).
3. Copiar los ajustes de Auth.
4. Publicar la app con la nueva dirección y clave.
5. Actualizar cada dispositivo y revisar sus pendientes.

**Después de restaurar una copia vieja:**

- Comparar el último comprobante en ARCA con el de la app antes de volver a facturar. Lo emitido después de la copia está en ARCA, pero no en la base.
- Revisar las colas de cada caja. Pueden contener operaciones que dependan de datos perdidos.
- Rehacer el arqueo y el stock de lo ocurrido desde la copia.

## Guía de Pruebas

Propuesta manual; **nada de esto fue ejecutado**. Usar `http://localhost:3002/` conectado al proyecto de prueba. `http://localhost:3001/` sigue apuntando a tu `.env.local`: no usarlo para esta prueba.

1. **Conexión:** abrir las herramientas del navegador, pestaña Red. Esperado: las llamadas van a la dirección del proyecto de prueba, nunca a `lkahqqsduatkhxruiolo`.
2. **Ingreso:** entrar con un usuario administrador. Esperado: ve su comercio, productos y sucursales.
3. **Datos:** revisar ventas, turnos y proveedores recientes. Esperado: coinciden con producción a la fecha de la copia.
4. **Comprobantes:** abrir el comprobante de un pago a proveedor. Esperado: se ve el archivo.
5. **Remitos:** abrir la foto de un remito pendiente. Esperado: se ve la imagen.
6. **Cajero:** entrar con un cajero. Esperado: no ve efectivo esperado ni diferencias, ni comprobantes de otros, y conserva sus permisos.
7. **Otro comercio:** si hay más de uno, entrar con un usuario de otro comercio. Esperado: no ve datos ajenos.
8. **Escritura:** en el proyecto de prueba, abrir turno, hacer una venta y subir un comprobante. Esperado: guarda una sola vez. **Hacerlo solo aquí, nunca en producción.**
9. **SQL Editor del proyecto de prueba:** ejecutar el conteo. Esperado: solo cambian las tablas tocadas en el paso 8.
10. **Producción:** revisar que no aparezca nada de lo anterior. Esperado: sin cambios.

La prueba aprueba si los pasos 1 a 10 dan lo esperado. Si algo falla, la copia no se considera confiable hasta corregirlo y repetir.

## Fuentes

- [Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project)
- [Storage en la CLI](https://supabase.com/docs/reference/cli/supabase-storage-cp)
- [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Precios](https://supabase.com/pricing)
