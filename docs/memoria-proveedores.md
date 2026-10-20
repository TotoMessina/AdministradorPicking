# Memoria compartida de vinculaciones de facturas

## Aplicación

La migración local es `supabase/migrations/202610200001_supplier_mappings.sql`. Aplicarla en el proyecto Supabase correcto mediante el procedimiento de migraciones del comercio, antes de desplegar el cliente que usa las RPC nuevas. Requiere las tablas `retail_stores`, `retail_products` (incluida su clave única `store_id, id`), membresías y `retail_private.role_for` de la base existente. No necesita extensiones nuevas ni modifica productos, precios, stock o facturación.

No se ejecutó SQL contra ninguna base. Verificar primero el historial del entorno; no aplicar indiscriminadamente otras migraciones locales pendientes. La comprobación TypeScript no valida SQL, RLS ni configuración de PostgREST.

## Contratos y persistencia

- `getMappings(storeId, supplier)` devuelve ahora `Promise<SupplierMapping[]>`. Sincroniza pendientes y consulta Supabase; la lectura remota ordena por `times_used DESC, last_used_at DESC`. Ante un fallo usa los datos del dispositivo. `linkInvoiceItems` espera la lectura y mantiene Levenshtein, token overlap, umbral 0,4 y máximo 0,95.
- `saveMapping` conserva los argumentos y ahora devuelve `Promise<void>`; su llamada en `InvoiceAnalyzer` usa `await`. Intenta guardar en el dispositivo y en el servidor. Si solo queda guardado localmente, el vínculo puede confirmarse para esa factura y se indica que falta compartirlo. Si fallan ambos almacenamientos, no se confirma.
- `findMapping` conserva sus argumentos y retorno sincrónico. Consulta la caché local; para actualizarla con otros dispositivos, esperar antes `getMappings`. No hay otros consumidores actuales de `findMapping` en el repositorio.
- `kiosco_supplier_mappings_{storeId}` contiene los datos antiguos y escrituras pendientes. `migrateLocalMappings` sube cada vínculo, retira solo la versión confirmada y conserva lo que falla. Un JSON inválido se conserva y requiere revisar el almacenamiento; no se descarta para forzar una migración exitosa.
- `kiosco_supplier_mappings_cache_{storeId}` guarda el respaldo de lectura offline, separado de la cola que se limpia. La caché no se vuelve a importar como si fueran vínculos nuevos.
- `kiosco_mappings_migrated_{storeId}=1` se escribe al finalizar sin pendientes. La UI revisa solo la clave del comercio actual, no intenta migrar claves de otros comercios. Las escrituras offline posteriores se reintentan aunque ese indicador ya exista: al abrir el analizador, consultar vínculos o pulsar Reintentar sincronización. No hay un sincronizador global nuevo.
- Las operaciones se serializan por comercio dentro de la sesión del servicio y la confirmación bloquea el doble clic mientras está pendiente. La restricción única evita filas duplicadas para la misma combinación comercio/proveedor/texto exacto. `times_used` cuenta upserts, no lecturas: si el servidor guardó pero se perdió la respuesta, reintentar puede incrementar otra vez ese contador. No se promete exactamente una ejecución ni resolución de conflictos entre dispositivos; un nuevo upsert reemplaza la vinculación anterior.
- `suggested_alias` se solicita a Groq y se devuelve normalizado como dato opcional. El límite del batch pasa a 3200 tokens. No reemplaza `invoice_text`, no crea alias adicionales automáticamente ni confirma sugerencias. Se conserva el texto original usado al confirmar.

Las RPC usan `security invoker` y RLS de membresía, incluyendo propietario, administrador y cajero. La clave foránea compuesta impide vincular un producto ajeno al comercio. Los usuarios anónimos no tienen acceso y no se concede borrado de la tabla desde el cliente.

## Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/** con un comercio de pruebas, después de aplicar únicamente la migración correspondiente. No aplicar reposiciones ni ventas ficticias en producción para verificar la memoria.

1. **Datos antiguos:** conservar una copia del JSON local; abrir Productos → Más herramientas → Importar factura de compra. Esperado: subir los vínculos del comercio actual, limpiar su clave antigua al completar, guardar caché e indicador. Cerrar y abrir otra vez: no volver a incrementar los contadores por importar la caché.
2. **Confirmación:** procesar una factura, elegir un producto y Confirmar y recordar. Esperado: una fila con proveedor normalizado, descripción original, producto y bulto; `times_used=1`. Volver a confirmar la misma combinación: misma fila, contador incrementado y fecha actualizada. Un doble clic mientras guarda no debe enviar dos confirmaciones.
3. **Otro dispositivo/usuario:** entrar como otro miembro del mismo comercio desde un navegador sin datos locales, procesar el mismo texto y proveedor. Esperado: recuperar la memoria compartida y proponer el producto recordado, conservando las revisiones por código incompatible.
4. **Offline preparado:** cargar vínculos con conexión, desconectar y volver a consultarlos. Esperado: lectura desde caché. Confirmar otro vínculo: aviso de guardado local pendiente, sin perder el formulario. Reconectar y pulsar Reintentar sincronización: comprobar fila remota, limpieza de pendientes y disponibilidad desde el segundo dispositivo.
5. **Fallo parcial:** bloquear la red durante la subida de varios vínculos. Esperado: conservar los no confirmados; no marcar la migración inicial como completa. Reintentar y verificar que los ya retirados de la cola no se vuelvan a subir. Simular RPC ausente o almacenamiento bloqueado: mensaje accionable, sin borrado silencioso.
6. **Permisos reales:** con una cuenta miembro de A pero no de B, intentar consultar e insertar en B mediante RPC y directamente en la tabla. Esperado: rechazo/sin filas según la operación. Intentar vincular en A un `product_id` de B: rechazo por clave foránea. Repetir sin sesión. Verificar lecturas/escrituras autorizadas de todos los roles miembros de A.
7. **Groq y regresiones:** revisar una respuesta con `suggested_alias` y otra sin él o malformada. Esperado: campo opcional normalizado o ausente, sin cambiar las decisiones de matching ni el texto persistido. Deshabilitar Groq en pruebas: conservar las sugerencias locales. Revisar factura/remito y propuesta de precios; sus cálculos no fueron modificados.

Comprobación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas. No se realizaron verificaciones de navegador, backend, SQL, offline ni segundo dispositivo durante esta implementación.
