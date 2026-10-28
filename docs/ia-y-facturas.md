# Asistencia, facturas y análisis locales

Guía vigente consolidada. Los nombres de migraciones indican dependencias, no el estado remoto: usar [schema y su historial](../SUPABASE_SETUP.md), sin repetir archivos individuales. Las Guías de Pruebas son recorridos manuales en **http://localhost:3001/**; no acreditan pruebas ejecutadas.

- [Lectura de facturas](#lectura-de-facturas)
- [Memoria de proveedor](#memoria-de-proveedor)
- [Propuestas de precios](#propuestas-de-precios)
- [Alertas operativas](#alertas-operativas)
- [Predicción de stock](#prediccion-de-stock)
- [Capital inmovilizado](#capital-inmovilizado)

## Lectura de facturas

**Productos → Más herramientas → Importar factura de compra** mantiene la lectura local con Tesseract y el análisis voluntario con Groq. Subir una imagen no modifica productos ni stock. El modelo general y la configuración por entorno se conservan; no se agrega otro proveedor de IA ni dependencias.

La lectura conserva proporciones de fotos y tickets largos, limita el tamaño total del lienzo y evita una compresión JPEG adicional. Si el primer OCR tiene poco texto o baja confianza, compara otra distribución de columnas. La limpieza conserva cantidades/códigos aislados y productos con «Original» en el nombre. Los PDF escaneados se leen página por página a resolución propia, en lugar de usar solo la miniatura de la primera. Si no puede leer una página, informa cuál y no presenta un documento parcial como completo.

PDF.js carga su worker desde el paquete instalado, servido por la app; ya no lo descarga desde unpkg. Los recursos `.mjs` se incluyen en el precache generado de la PWA. Pendiente comprobar entrega/caché en navegador y alojamiento publicado; no se ejecutó build para verificarlo. Supabase, Groq y las posibles descargas iniciales de Tesseract siguen sujetos a conectividad. Si varios dominios fallan con `ERR_TIMED_OUT`, ver [diagnóstico y guía manual](mantenimiento.md#html-inválido-y-timeouts-en-varios-servicios).

**Volver a leer**, **Girar 90° y leer**, **Ver / editar texto detectado** y **Restaurar texto original** permiten corregir la fuente antes de analizar. Una lectura de baja confianza avisa que se revisen cantidades y costos; no garantiza exactitud. Fallar al subir otro archivo conserva el texto anterior y exige revisarlo o volver a leer antes de analizarlo. HEIC no decodificable pide exportar a JPG/PNG/WEBP. Cargar el motor/idioma puede requerir conexión; Groq y la aplicación al catálogo siguen necesitando los servicios habituales.

El mensaje anterior «No se pudieron extraer productos…» mezclaba una lista vacía con JSON inválido/truncado. La extracción solicita ahora **JSON Object Mode** a Groq, además de instrucciones más breves. Es una opción exclusiva de esta extracción; las conversaciones y el modelo por entorno conservan su comportamiento. El proveedor documenta [validación de sintaxis JSON, sin garantizar el esquema ni la exactitud](https://console.groq.com/docs/structured-outputs#json-object-mode); la app sigue validando las filas.

Antes de consultar, se filtran líneas claramente administrativas (CUIT, CAE, contacto, totales aislados y fechas) y fragmentos de símbolos, conservando nombres, cantidades, códigos y costos. El texto original sigue editable y recuperable; la pantalla muestra cuántas líneas se enviarán. No se deduplican productos repetidos. Se usan bloques de hasta 10 líneas/1.800 caracteres como objetivo y hasta 3.000 tokens de salida. Una línea individual más larga se conserva entera hasta el límite de 6.000 caracteres: no se corta un renglón para forzar el tamaño.

Si la respuesta se corta, no respeta el formato o contiene filas con estructura inválida, se divide únicamente el bloque fallido, hasta dos niveles adicionales. No se aceptan prefijos aparentemente válidos de una respuesta cortada ni se completan números mediante una reparación de texto. Ante un bloque fallido, no se continúa a aplicar solo los anteriores como si todo hubiera sido leído. Los resultados válidos permanecen en la caché del editor, incluidos los subbloques completados durante la recuperación. Un límite, error de conexión o falta de clave se informa directamente; no dispara una subdivisión ni un bucle de reintentos. Al agotar las divisiones, el error identifica la parte y el comienzo del texto que debe revisarse. Cerrar/recargar no promete conservar esa caché.

Los importes JSON o texto argentino como `1.234,50` se normalizan; costos ilegibles y cantidades ausentes/ilegibles requieren revisión, sin reemplazarlos por cero válido ni inventar una unidad. La revisión manual sigue siendo necesaria, especialmente si un producto ocupa varias líneas o las columnas se leen fuera de orden. Más caracteres reconocidos no certifican mejor lectura.

Respuesta inválida, lista vacía, límite de Groq y espera agotada tienen mensajes distintos y abren el texto detectado. Una parte que tarda más de 45 segundos se cancela para reintentar. El límite muestra una espera orientativa y requiere una acción del usuario para volver a consultar: no reinicia solicitudes por sí solo. Doble clic no inicia dos análisis. Cerrar el editor cancela la extracción generativa activa e ignora resultados tardíos; el OCR local ya iniciado termina y libera su worker.

Si no se detectó proveedor, **Confirmar vínculo** confirma solo para esa factura, sin inventar proveedor ni guardar un alias. Con proveedor, **Confirmar y recordar** conserva la memoria compartida existente.

Para los productos no encontrados en catálogo, la acción predeterminada es **Crear nuevo** (`create_new`), seleccionable en cada fila junto con **Vincular** y **Omitir**. Al crear nuevo, se genera automáticamente un nombre comercial sugerido (`suggestedName`) expandiendo abreviaturas mayoristas (p. ej. «CIG.» a «Cigarrillos», «ALFAJ.» a «Alfajor»), eliminando repeticiones y formateando de forma legible; el usuario puede editarlo en su celda o restaurarlo desde Detalles.

La categoría y el código de barras se editan dentro de la tabla para productos nuevos. **El código es obligatorio**: se prioriza el EAN numérico del envase (formato existente de 8 a 14 dígitos). Si no se consigue, **Generar interno** completa un código `INT-...` por acción explícita. No se genera un código a escondidas al guardar ni se reemplaza uno repetido: un duplicado exige vincular el producto existente o corregirlo. Los códigos conservan su texto sin formato de importes. Detalles mantiene su procedencia y los accesos de búsqueda/restauración anteriores.

La revisión es una **grilla editable**, con producto, categoría, código, cantidad facturada, unidades por bulto, unidades a ingresar, **stock mínimo**, costo por unidad, aumento sobre costo, precio y acción. El mínimo de las altas empieza en 4 como antes, pero ahora se puede elegir un entero desde 0 y se guarda ese valor. En productos existentes se muestra el mínimo actual, sin modificarlo por una reposición. Los productos existentes muestran categoría/código/precio actuales como contexto: su edición de precio sigue en la propuesta posterior. Cambiar el precio de un alta lo deja manual; editar el aumento vuelve al cálculo por porcentaje. Los atajos de presentación y porcentaje, texto original, cálculo del bulto, explicación de división y gestión del vínculo están en **Detalles** por fila. No hay un formulario grande abierto para cada producto.

**Agregar producto manual** suma una fila a lo ya leído, limpia los filtros y enfoca su nombre, incluso en otra página. Permite completar artículos omitidos por el OCR/IA o vincularlos al catálogo. **Cargar producto manualmente**, junto a Analizar con IA, también permite empezar sin una extracción válida. No genera artículos de ejemplo: nombre/código/costo quedan pendientes y pasan por las mismas validaciones antes de aplicar. Omitir una fila conserva su borrador. Volver al texto sin analizar otra vez mantiene lo editado; reanalizar reemplaza las filas, como el flujo existente.

El botón violeta **Buscar IA**, visible en cada fila sin vínculo y no omitida, abre coincidencias en el detalle de esa fila. Consulta los productos cargados del comercio y `retail_global_catalog` por EAN/nombre, bajo los permisos existentes. Luego Groq puede ordenar hasta 16 registros reales: solo se admiten IDs proporcionados y nunca se toma un EAN inventado por el modelo. **Vincular** usa un producto del comercio y exige la confirmación existente; **Usar datos** copia nombre/código/categoría de un registro compartido al alta, conservando cantidad, costo, precio y mínimo. Tamaño/variante deben revisarse: una similitud no prueba identidad. No hay consultas al escribir ni solicitudes masivas automáticas. Cambiar nombre/código/acción durante la búsqueda invalida la respuesta para evitar pisar otra edición. Salir cancela la búsqueda y el tiempo total se limita a 25 segundos. Un error de Groq conserva las coincidencias obtenidas y un aviso dentro de la herramienta; agotar los 25 segundos cancela la búsqueda completa y ofrece reintentar; sin red se muestran solo coincidencias de los productos ya cargados. Catálogo compartido/IA requieren conexión; completar el borrador manualmente no depende de ellos.

Se muestran hasta **50 filas por página**, manteniendo los valores y búsquedas de vinculación en el estado de InvoiceAnalyzer al paginar, filtrar, plegar detalles o volver al texto. Aplicar reposición procesa todas las filas incluidas, sin limitarse a la página o filtro visible. Esta conservación es del editor abierto, no una promesa de recuperación al cerrar o recargar. Tab recorre controles; Enter / Mayús+Enter avanza/retrocede en la misma columna entre inputs editables de la página, sin reemplazar las teclas de los selectores. Encabezados y producto permanecen visibles al desplazar la tabla. En móvil se conserva la grilla con desplazamiento horizontal, sin convertir cada fila en una ficha grande.

Los estilos acotados de `invoice-review.css` se cargan desde `src/styles/app.ts`, sin reactivar `retail.css`. Los campos tienen nombres accesibles y foco visible. **Revisar vínculos** abre la página y el detalle del primer pendiente. Las validaciones revelan y enfocan nombre, código, mínimo, cantidad o costo, incluso en otra página/filtro, antes de iniciar operaciones. La nueva consulta IA es voluntaria y no altera precios ni stock. Apariencia, uso con cientos de filas y navegación con teclado/móvil siguen pendientes de comprobación manual; no hay mediciones de rendimiento ni de usabilidad.

La grilla usa color suave para orientar: datos con el acento del comercio, stock verde, precios azul e IA violeta. Los estados conservan sus textos (nuevo/manual, vínculo automático/confirmado, revisar vínculo y omitido); el verde de un vínculo no reemplaza las validaciones de los demás campos. Errores en rojo y subida de costo/pendientes en ámbar. Unidades a ingresar y precio del alta tienen mayor jerarquía sin colorear toda la fila.

Antes de aplicar, cantidades enteras, costos pendientes y costos positivos requeridos por productos con precio automático se validan con mensajes accionables. Elegir Solo Stock mantiene la alternativa cuando no corresponde actualizar costo. No se modifican las fórmulas de bultos, el servicio ni el panel de propuestas de precios, las reglas de stock ni los permisos del backend. No se prepara SQL para este ajuste.

### Guía de Pruebas — lectura, pendiente manual

En **http://localhost:3001/**, con un comercio de pruebas:

1. Subir la foto que mostraba el error → conserva imagen/texto, permite analizar y diferencia respuesta inválida de ausencia de productos. Comparar cada renglón, código, cantidad, presentación y costo con el original antes de aplicar; esta factura concreta aún no fue comprobada.
2. Foto lateral y ticket largo → Girar 90° y leer / Volver a leer no duplica productos ni stock; las cantidades aisladas y un producto llamado Original no desaparecen por limpieza. Restaurar texto recupera la lectura sin limpiar. Si la foto no es legible, permite corregir o pegar texto y muestra un aviso.
3. Factura de más de 10 renglones y PDF escaneado de varias páginas → muestra progreso por partes/páginas y revisar incluye los renglones leídos; no omite páginas por usar la miniatura. Mantener productos iguales repetidos y revisar una descripción dividida entre partes. Agregar CUIT/contacto/total en líneas separadas: disminuyen las líneas enviadas sin alterar el original ni borrar códigos o cantidades aislados.
4. En un entorno de prueba, provocar una respuesta JSON incompleta, finalización por límite de salida o formato incorrecto → divide solo esa parte y conserva las válidas; no carga stock ni acepta solo los primeros productos. Si persiste, identifica el bloque para corregirlo. Un límite de Groq o pérdida de red da un error específico; esperar el contador no envía consultas. Doble clic no dispara análisis simultáneos. Cerrar durante análisis no cambia otra pantalla al llegar la respuesta. Verificar que la consulta general al asistente sigue siendo texto, sin forzarle JSON.
5. Crear nuevo producto desde ítem no encontrado → aparece una fila con nombre sugerido, categoría y código editables en celdas. Con costo 100, escribir aumento 40 → precio 140, Calculado. Cambiar precio a 150 → indica Manual; cambiar costo a 110 conserva 150. Editar aumento a 40 → vuelve al cálculo y da 154. Abrir Detalles → conserva restaurar nombre, buscar/generar código, procedencia y atajos. Plegar no elimina lo editado.
6. Alternar a Vincular u Omitir → conserva el borrador del alta; Vincular abre búsqueda y selector de catálogo. Seleccionar producto y confirmar sin proveedor habilita la revisión sin guardar alias. Con proveedor, Confirmar y recordar mantiene la memoria compartida. Los alias con 2+ usos siguen identificados. Usar Revisar vínculos con un pendiente fuera de la página actual → lo muestra con su detalle. Solo stock no cambia costo; los precios existentes siguen mostrando Actual y conservan la propuesta posterior.
7. Revisar bulto de 24, cantidad 2 y costo por bulto 4.800 → 48 unidades, costo unitario 200, sin segunda división. Confirmar/omitir vínculos y aplicar solo en datos de prueba → se mantiene el flujo de reposición y las propuestas de precios. Cajero sin permisos no adquiere acceso a importación.
8. Con más de 100 renglones en datos de prueba: editar las filas 1, 51 y 101; cambiar de página, buscar y volver → conserva todos los valores. Aplicar incluye las filas de todas las páginas y no solo las visibles. Dejar una cantidad fraccionaria o costo sin detectar en otra página, filtrar para ocultarla e intentar aplicar → muestra el error, retira el filtro y enfoca la celda; no inicia reposición. Corregir/omitir según corresponda.
9. En escritorio, ventana angosta y móvil con teclado: desplazar horizontal/verticalmente → encabezados y producto sirven de referencia, celdas y acciones siguen accesibles, Detalles queda dentro del ancho visible. Tab cambia de control; Enter baja en la misma columna y Mayús+Enter sube dentro de la página. Los selectores conservan su teclado nativo y los detalles cerrados no reciben foco. Volver al texto y regresar a revisión sin analizar otra vez → conserva valores. Revisar foco, movimiento reducido y confirmación alcanzable; no se hizo esta evaluación.
10. Alta con código vacío → Aplicar bloquea y enfoca Código, sin modificar existencias. Escanear el EAN o pulsar Generar interno si no se consigue → deja el código visible antes de aplicar. Repetir un código de otra fila o del comercio → exige corregir o vincular; no lo sustituye silenciosamente. Poner mínimo 12 y aplicar únicamente en pruebas → el catálogo conserva mínimo 12. Mínimo vacío, negativo o fraccionario → bloquea y enfoca esa celda.
11. Agregar producto manual con un filtro activo o más de 50 filas → suma una fila, retira el filtro, abre la página correspondiente y enfoca Nombre. Completar sus campos y volver entre páginas → conserva el resto de la factura. Omitir la fila y volver a Crear nuevo recupera los valores. Desde la entrada, sin texto o después de un error de análisis, Cargar producto manualmente permite el mismo recorrido sin Groq.
12. Buscar IA con un nombre y/o EAN conocido del comercio y del catálogo compartido → muestra fuente, código, categoría y variantes reales. Vincular exige confirmación; Usar datos conserva costo/cantidad/precio/mínimo. Escribir otro nombre/código durante la espera y después intentar aplicar una sugerencia anterior → exige buscar de nuevo y conserva la edición. Probar Groq sin clave/límite, Supabase sin conexión y ausencia de coincidencias → aviso dentro de la herramienta, sin bloquear la edición manual. Sin red, solo consulta el catálogo ya cargado; volver/cerrar durante la búsqueda no aplica respuestas tardías. Requiere validación real del backend, IA y red.
13. Revisar colores en escritorio/móvil y con Tab: datos, stock y precios se distinguen por encabezado, sin perder sus nombres; el precio y las unidades a ingresar se identifican rápido. Un vínculo pendiente es ámbar, un campo inválido rojo y Omitido gris; todos conservan texto. Buscar IA sigue violeta y el foco se ve también sobre fondos coloreados. Cambiar cantidades/porcentaje → conserva los cálculos existentes. Esta comprobación visual está pendiente; TypeScript no valida colores ni contraste.

Verificación ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores. No se ejecutaron builds ni otras pruebas automatizadas. Pendientes: factura concreta, navegador, móvil, Groq/Tesseract reales, escritura/permisos y backend; no se realizaron reposiciones de prueba ni evaluación con personas.

<a id="memoria-de-proveedor"></a>

## Memoria de proveedor

### Aplicación

Schema incluye `202610200001_supplier_mappings.sql`: depende de `retail_stores`, `retail_products` (incluida su clave única `store_id, id`), membresías y `retail_private.role_for`. No necesita extensiones nuevas ni modifica productos, precios, stock o facturación.

La dependencia siguiente, `202610200002_supplier_alias_usage.sql`, también está incluida en schema. Reemplaza la firma del upsert por parámetros opcionales (conserva llamadas de seis argumentos), recibe confianza y agrega borrado autorizado por membresía. No borra ni reinicia los alias existentes.

Verificar el historial según SUPABASE_SETUP.md; no repetir archivos individuales. TypeScript no valida SQL, RLS ni PostgREST.

### Contratos y persistencia

- `getMappings(storeId, supplier)` devuelve ahora `Promise<SupplierMapping[]>`. Sincroniza pendientes y consulta Supabase; la lectura remota ordena por `times_used DESC, last_used_at DESC`. Ante un fallo usa los datos del dispositivo. `linkInvoiceItems` espera la lectura y mantiene Levenshtein, token overlap, umbral 0,4 y máximo 0,95.
- `saveMapping` conserva los argumentos posicionales, agrega opciones finales opcionales (`confidence`, `usageOnly`, `mappingId`) y devuelve el mapping guardado. Las confirmaciones manuales usan confianza 1. Intenta guardar en el dispositivo y en el servidor. Si solo queda guardado localmente, el vínculo puede confirmarse para esa factura y se indica que falta compartirlo, sin inventar un contador compartido. Si fallan ambos almacenamientos, no se confirma.
- `findMapping` conserva sus argumentos y retorno sincrónico. Consulta la caché local; para actualizarla con otros dispositivos, esperar antes `getMappings`. No hay otros consumidores actuales de `findMapping` en el repositorio.
- `kiosco_supplier_mappings_{storeId}` contiene los datos antiguos y escrituras pendientes. `migrateLocalMappings` sube cada vínculo, retira solo la versión confirmada y conserva lo que falla. Un JSON inválido se conserva y requiere revisar el almacenamiento; no se descarta para forzar una migración exitosa.
- `kiosco_supplier_mappings_cache_{storeId}` guarda el respaldo de lectura offline, separado de la cola que se limpia. La caché no se vuelve a importar como si fueran vínculos nuevos.
- `kiosco_mappings_migrated_{storeId}=1` se escribe al finalizar sin pendientes. La UI revisa solo la clave del comercio actual, no intenta migrar claves de otros comercios. Las escrituras offline posteriores se reintentan aunque ese indicador ya exista: al abrir el analizador, consultar vínculos o pulsar Reintentar sincronización. No hay un sincronizador global nuevo.
- Las operaciones se serializan por comercio dentro de la sesión del servicio y la confirmación bloquea el doble clic mientras está pendiente. La restricción única evita filas duplicadas para la misma combinación comercio/proveedor/texto exacto. `times_used` cuenta confirmaciones y usos automáticos, no facturas únicas: si el servidor guardó pero se perdió la respuesta, reintentar puede incrementar otra vez ese contador. Un cambio manual de producto o presentación reinicia el contador en 1 para no heredar la evidencia de otra equivalencia. Ante dos confirmaciones manuales, prevalece la última escritura. Una confirmación offline pendiente en otro dispositivo también puede volver a crear un alias eliminado cuando se sincronice; no se implementan tombstones para escrituras manuales.
- `suggested_alias` se solicita a Groq y se devuelve normalizado como dato opcional. El límite del batch pasa a 3200 tokens. No reemplaza `invoice_text`, no crea alias adicionales automáticamente ni confirma sugerencias. Se conserva el texto original usado al confirmar.

Las RPC usan `security invoker` y RLS de membresía, incluyendo propietario, administrador y cajero. La clave foránea compuesta impide vincular un producto ajeno al comercio. Los usuarios anónimos no tienen acceso. La segunda migración habilita borrar alias solo a miembros del comercio, con RPC delimitada por comercio, proveedor e ID.

### Alias y revisión de facturas

- Se conservan `id`, `confidence`, `times_used` y `last_used_at` en las lecturas remotas y en caché. El panel consulta por páginas para recuperar todos los alias y muestra texto original → producto recordado, bulto, usos y fecha. Abrirlo o actualizarlo no incrementa los usos; sincronizar confirmaciones pendientes sí puede hacerlo.
- Un alias exacto tras normalizar mayúsculas, tildes y puntuación se confirma automáticamente solo con confianza guardada ≥0,85, al menos 3 usos previos, confianza del matching ≥0,85 y sin contradicción de código o presentación. Las variantes nuevas por fuzzy matching siguen siendo sugerencias que requieren confirmación. No se cambiaron Levenshtein, token overlap ni sus umbrales.
- Groq recibe la instrucción de dar confianza ≥0,95 a equivalencias conocidas salvo evidencia contradictoria. Si Groq falla, una memoria exacta puede seguir resolviendo el vínculo con sus datos persistidos; el uso compartido debe poder verificarse en Supabase. Si esto falla, se mantiene la sugerencia para revisión manual.
- Los usos automáticos se registran una vez por alias en cada ejecución de `linkInvoiceItems` (incluye su consumidor de remitos rápidos). Repetir un análisis puede sumar otro uso. La RPC comprueba ID, texto, proveedor, producto, presentación y confianza vigentes antes de incrementar; no crea un alias ni reemplaza su producto mediante este camino. No encola usos automáticos offline que puedan resucitar datos eliminados.
- El badge «🔗 Usado N veces» aparece desde 2 usos. Cambiar producto o bulto retira ese indicador hasta volver a confirmar. No hay un efecto que reemplace la selección manual: solo se establece el estado automático al resolver inicialmente la factura, y una respuesta de guardado solo confirma la misma versión del renglón.
- Al corregir una equivalencia se conserva su texto persistido como clave, aunque la nueva factura varíe en mayúsculas o puntuación, para actualizar ese alias en vez de crear otro que compita con él.
- `division_reason` es opcional y se muestra como tooltip bajo el costo solo cuando el costo y la presentación devueltos por IA coinciden con los calculados. El texto visible explica siempre el cálculo local. Cambiar costo o bulto descarta la explicación anterior. No se modificaron fórmulas de precio, stock ni propuestas de precios.
- «🔗 Ver alias del proveedor» abre un panel dentro del analizador, con foco en el título y devolución al botón al cerrar. Eliminar requiere conexión y confirmación; no modifica el catálogo ni importaciones realizadas. Un vínculo automático de la factura actual pasa a revisión si se elimina su alias; una decisión manual se conserva. La lista se refresca con Actualizar o al volver a abrir, sin suscripción en tiempo real.

#### Guía de Pruebas de alias — pendiente de ejecución manual

En **http://localhost:3001/**, usar un comercio de pruebas y Productos → Más herramientas → Importar factura de compra. Aplicar las dos migraciones en orden en ese entorno; no importar stock ficticio en producción.

1. Procesar un comprobante con «ALF JORG CHOC X24», elegir el producto correcto y pulsar **Confirmar y recordar**. Verificar confianza 1, presentación 24 y contador 1 en Supabase. Abrir **Ver alias del proveedor**: debe figurar la equivalencia con su fecha.
2. Repetir la confirmación con el mismo proveedor hasta tener 3 usos. Desde el segundo aparece el badge; en el próximo análisis sin contradicciones debe aparecer **Auto-vinculado**, incrementarse una vez el contador y actualizarse la fecha. Repetir el renglón en una misma factura: no debe sumar varios usos automáticos del mismo alias.
3. Cambiar manualmente el producto de un renglón automático. Debe quedar pendiente, perder el badge anterior y conservar la selección mientras se actualiza el panel. Confirmar: confianza 1, contador reiniciado a 1 y producto corregido. Repetir con variación de mayúsculas/puntuación: debe corregir el alias existente. Cambiar de proveedor: no debe heredar la memoria del anterior.
4. Probar un código contradictorio, una presentación distinta y un sabor explícitamente diferente. Deben requerir revisión. Un texto parecido sin equivalencia exacta tampoco se confirma solo por similitud. Revisar costo de bulto $2400 / 24: $100 por unidad; al cambiar el bulto o costo, no debe permanecer un tooltip del cálculo anterior.
5. Abrir el panel por teclado, cancelar un borrado y luego confirmar otro. Cancelar conserva el alias; eliminar lo quita del proveedor del comercio sin tocar el producto. Recargar y consultar desde otro dispositivo: no debe reaparecer. Un uso automático iniciado antes del borrado debe fallar sin recrearlo. Confirmaciones manuales offline antiguas son la excepción documentada arriba.
6. Cargar la memoria, desconectar y abrir el panel: muestra la caché disponible. Eliminar debe explicar que necesita conexión; confirmar un vínculo manual conserva el aviso de pendiente de compartir. Reconectar y sincronizar. Groq no disponible no debe bloquear el editor manual ni inventar explicaciones.
7. Con dos comercios, intentar consultar/borrar/incrementar un ID ajeno mediante RPC y tabla: rechazo o ausencia de filas, sin cambios en ese comercio. Comprobar acceso de otro miembro autorizado, contadores y presentación con la migración aplicada. Verificar móvil, foco de cierre del panel y que sus controles ocultos no reciban Tab.

La validación de SQL, RLS, concurrencia entre dispositivos, Groq y presentación en navegador/móvil queda pendiente. El control TypeScript no reemplaza estas pruebas.

### Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/** con un comercio de pruebas, después de aplicar únicamente la migración correspondiente. No aplicar reposiciones ni ventas ficticias en producción para verificar la memoria.

1. **Datos antiguos:** conservar una copia del JSON local; abrir Productos → Más herramientas → Importar factura de compra. Esperado: subir los vínculos del comercio actual, limpiar su clave antigua al completar, guardar caché e indicador. Cerrar y abrir otra vez: no volver a incrementar los contadores por importar la caché.
2. **Confirmación:** procesar una factura, elegir un producto y Confirmar y recordar. Esperado: una fila con proveedor normalizado, descripción original, producto y bulto; `times_used=1`. Volver a confirmar la misma combinación: misma fila, contador incrementado y fecha actualizada. Un doble clic mientras guarda no debe enviar dos confirmaciones.
3. **Otro dispositivo/usuario:** entrar como otro miembro del mismo comercio desde un navegador sin datos locales, procesar el mismo texto y proveedor. Esperado: recuperar la memoria compartida y proponer el producto recordado, conservando las revisiones por código incompatible.
4. **Offline preparado:** cargar vínculos con conexión, desconectar y volver a consultarlos. Esperado: lectura desde caché. Confirmar otro vínculo: aviso de guardado local pendiente, sin perder el formulario. Reconectar y pulsar Reintentar sincronización: comprobar fila remota, limpieza de pendientes y disponibilidad desde el segundo dispositivo.
5. **Fallo parcial:** bloquear la red durante la subida de varios vínculos. Esperado: conservar los no confirmados; no marcar la migración inicial como completa. Reintentar y verificar que los ya retirados de la cola no se vuelvan a subir. Simular RPC ausente o almacenamiento bloqueado: mensaje accionable, sin borrado silencioso.
6. **Permisos reales:** con una cuenta miembro de A pero no de B, intentar consultar e insertar en B mediante RPC y directamente en la tabla. Esperado: rechazo/sin filas según la operación. Intentar vincular en A un `product_id` de B: rechazo por clave foránea. Repetir sin sesión. Verificar lecturas/escrituras autorizadas de todos los roles miembros de A.
7. **Groq y regresiones:** revisar una respuesta con `suggested_alias` y otra sin él o malformada. Esperado: campo opcional normalizado o ausente, sin cambiar las decisiones de matching ni el texto persistido. Deshabilitar Groq en pruebas: conservar las sugerencias locales. Revisar factura/remito y propuesta de precios; sus cálculos no fueron modificados.

<a id="propuestas-de-precios"></a>

## Proveedores y descuento por comercio

Cada comercio ve sus proveedores en **Mi comercio → Más opciones → Proveedores** (administradores; delegados con `manage_products` lo ven como sección Proveedores si acceden a Mi comercio). La lista une los proveedores con descuento guardado y los que solo tienen un formato de factura aprendido (aparecen con **Sin descuento** y la acción **Agregar descuento**). Cada proveedor tiene nombre, **descuento que te hace** (0 a menos de 100%, hasta dos decimales), notas y, si existe, la insignia **Factura conocida · N leídas sin IA** con la acción **Olvidar formato** dentro de su edición. Lectura para todo miembro; alta, edición, eliminación y olvido de formato por RPC con `manage_products` y control de revisión. Requiere conexión. Eliminar un proveedor no cambia productos, costos, alias ni su formato: solo deja de proponerse su descuento.

**Al cargar una factura**, el campo **Proveedor** ofrece en la lista los proveedores guardados y los de formato conocido, y debajo explica qué va a pasar: descuento que se aplicará, si su formato es conocido (se lee sin IA) o si es nuevo (al aplicar se recuerdan vínculos y formato). Vacío, el proveedor se detecta: primero por un nombre de formato conocido en la cabecera y, si no, con la IA.

**En la revisión**, el encabezado muestra **Proveedor** (botón accesible por teclado para cambiarlo) y **Descuento**. Si el proveedor tiene descuento guardado se propone, con la ayuda «Descuento guardado de …»; si se cambia, vale «Solo para esta factura» y aparecen **Usar X%** y **Guardar X% para próximas facturas**. Un proveedor sin guardar con descuento mayor a 0 ofrece **Guardar «nombre» con X%**, sin salir de la revisión; si falla (permisos o conexión) el descuento se aplica igual a esa factura. La tabla muestra el **costo facturado** y debajo el **neto** que se guarda: costo × (100 − descuento) ÷ 100, redondeado a centavos ($1.000 con 10% → $900). El neto se usa para actualizar costos, alta de productos, aumento sobre costo de productos nuevos (los precios manuales se conservan), aviso de suba y propuesta de precios. Usarlo solo cuando los renglones no traen ya el descuento, para no aplicarlo dos veces.

SQL: `202610270003_suppliers.sql` (tabla `retail_suppliers`, RLS de lectura, RPC `retail_save_supplier` y `retail_delete_supplier`). Incluido en schema y como sexto paquete individual; **no aplicado remotamente**.

<a id="formato-de-factura-por-proveedor"></a>

### Formato de factura por proveedor (lectura sin IA)

**Cuánto se gasta hoy.** Cada parte de hasta 35 renglones o 3.500 caracteres se envía a Groq (`llama-3.1-8b-instant`) con: instrucción base (~75 tokens), cabecera de la factura para identificar al proveedor (hasta 800 caracteres, ~250 tokens, repetida en cada parte), reglas y esquema JSON (~550 tokens), lista de categorías (~100–250) y bultos del catálogo que coinciden (0 a ~1.000), más el texto de la parte (~1.000–1.200). La respuesta es un JSON con 9 campos por renglón (~60–70 tokens cada uno): una factura de 30 renglones ronda 2.000–3.000 tokens de entrada y ~2.000 de salida, cerca del límite gratuito por minuto del modelo. Acortar el prompt con pistas del proveedor ahorraría como mucho un 10–20%, porque la salida pesa casi lo mismo y no se puede omitir. Groq además cuenta la salida **pedida** (no solo la usada) contra ese límite: antes cada parte pedía 3.000 tokens y el vinculado 3.200, así que un solo pedido con cabecera, categorías y bultos del catálogo podía superar 6.000 y ser rechazado siempre, aunque la factura fuera corta, mientras la pantalla mostraba una espera de segundos. Ahora la lectura pide 300 + 120 por renglón (tope 3.000) y el vinculado 300 + 150 por renglón (tope 3.200); una parte que no entra se divide antes de enviarse, y un rechazo por tamaño también la divide en lugar de mostrar una cuenta regresiva. Con el proveedor elegido no se envía la cabecera. Si Groq pide esperar por su límite por minuto (hasta 90 s), la lectura espera sola con cuenta regresiva y continúa, hasta 6 veces por análisis, con **Cancelar lectura** disponible (las partes completadas se conservan); la cuota diaria y el pedido demasiado grande no se esperan. El aviso distingue el límite por minuto de la cuota diaria. Si una respuesta queda cortada se reintenta una vez con más margen; si un renglón con mucho ruido de OCR sigue sin poder leerse tras dividirlo, ya no cancela la lectura: pasa a la revisión con cantidad 0 y sin costo, con un aviso para completarlo u omitirlo. Por eso se eligió **leer sin IA** cuando el formato coincide: esa factura consume **0 tokens**, no espera límites de Groq y da el mismo resultado cada vez.

**Qué se guarda.** Por comercio y proveedor (nombre normalizado, igual que los alias, así que funciona aunque no tenga descuento guardado): si el renglón empieza con el código de artículo, y en qué lugar están cantidad, precio por unidad facturada y subtotal, contando solo los números del renglón desde el final. Así no lo desordenan el ruido del OCR en la descripción ni las columnas de texto intermedias (`21%`, `3 x 1u.`, tildes de control como `10120\/ALF`). La descripción es el texto entre el código y el primer monto, sin esas columnas. No se guarda texto de facturas, precios ni productos.

**Cuándo se aprende o confirma.** Al **aplicar** una factura con proveedor indicado, a partir de los renglones confirmados (no omitidos, con costo y cantidad) y su texto leído. Cada renglón confirmado se ubica en el texto por sus montos (cantidad y costo presentes) y por al menos la mitad de sus palabras, porque la IA puede corregir errores de OCR en la descripción. Hacen falta al menos 3 renglones y el 60% de los confirmados con las mismas posiciones, y el formato debe volver a leer esos valores. Si la cantidad no coincide pero hay subtotal, se toma subtotal ÷ precio cuando da un número entero. Si coincide con el guardado suma confirmaciones; si es distinto lo reemplaza. Si no se puede aprender (descripción y montos en renglones separados, costo que figura solo como total) el proveedor sigue leyéndose con IA y el resultado final lo informa. Guardarlo es secundario: un fallo no deshace ni bloquea la reposición. Los formatos guardados con el criterio anterior (posiciones de palabras) se ignoran y se vuelven a aprender.

**Cuándo se usa y qué pasa si el formato cambia.** Al analizar, si el proveedor elegido (o detectado en la cabecera) tiene formato, se lee localmente. Se descarta la lectura local y se usa la IA, sin pasos extra, si ningún renglón coincide o si algún renglón con texto termina en montos y no encaja (para no perder productos en silencio); con columna de total, también si cantidad × precio no da el total (tolerancia 1%). La revisión indica **Leída sin IA con el formato guardado de …** con el enlace **volvé a leerla con IA** (pide confirmación porque descarta los cambios de la revisión), o que la factura no coincidió y se leyó con IA; al aplicarla, el formato se actualiza. Sin IA no hay categoría sugerida ni nombre breve: se usan la categoría por nombre o catálogo y la descripción de la factura, como en una alta manual; los vínculos, bultos, descuento y validaciones son los mismos.

SQL: `202610270005_supplier_invoice_formats.sql` (tabla `retail_supplier_invoice_formats` con RLS de lectura para miembros, RPC `retail_save_supplier_invoice_format` para cualquier miembro, como los alias, y `retail_delete_supplier_invoice_format` con `manage_products`). Incluido en schema y como octavo paquete individual; **no aplicado remotamente**. Sin esta migración todo funciona como antes: cada factura se lee con IA.

### Guía de Pruebas — pendiente de ejecución manual

1. Aplicar las actualizaciones pendientes en el SQL Editor del proyecto AdministradorKiosco según [Instalación](../SUPABASE_SETUP.md#actualización-individual-después-de-conciliar-34-migraciones). Esperado: 43 migraciones, última `202610280001_supplier_alias_usage_repair.sql` (repara la memoria de alias si la 202610200002 quedó registrada sin efecto).
2. En **http://localhost:3001/**, Mi comercio → Más opciones → Proveedores → Agregar proveedor: nombre igual al de una factura y 10%. Esperado: aparece con «Descuento 10%». Repetir el mismo nombre con otra grafía de mayúsculas o tildes: se rechaza como duplicado.
3. Productos → Importar factura: escribir el proveedor. Esperado: debajo «Descuento 10%.»; con un nombre nuevo, «Proveedor nuevo: …». Analizar: «Proveedor» y «Descuento» en 10 con «Descuento guardado de …», «Costo factura / u.» y «Neto $…» bajo cada costo.
4. Cambiar el descuento a 8: ayuda «Solo para esta factura», botones «Usar 10%» y «Guardar 8% para próximas facturas». Guardar: mensaje de confirmación y Proveedores muestra 8%. Ingresar 100: Aplicar reposición se bloquea y enfoca el campo. Con un proveedor sin guardar y 5%: aparece «Guardar «nombre» con 5%».
5. Navegar con Tab hasta el nombre del proveedor en la revisión y pulsar Enter: se puede editar; **Listo** lo cierra.
6. Aplicar una factura con columnas fijas y al menos 3 productos, por ejemplo la foto de una factura LYGA (`995 ALF SHOT PASTA DE MANI 54X44G x1 un 21% 3 3 x 1u. 606,91 1.820,73`). Esperado en la pantalla final: «Formato de … guardado». En Proveedores: insignia «Factura conocida».
7. Cargar otra factura del mismo proveedor con el mismo formato. Esperado: no aparece «Extrayendo productos: parte …», la revisión dice «Leída sin IA con el formato guardado de …» y cantidades/costos coinciden con la factura. En la pestaña de red del navegador no hay pedidos a `api.groq.com`. Al aplicar: «Formato de … confirmado» y la insignia suma «1 leída sin IA».
8. Agregar al texto un renglón de producto con una columna de menos. Esperado: la factura se lee con IA y la revisión avisa que no coincidió con el formato guardado.
9. En «volvé a leerla con IA», cancelar el diálogo: no cambia nada; aceptar: se relee con IA. En Proveedores → Editar → Olvidar formato: la insignia desaparece y la siguiente factura se lee con IA.
10. Con una cuenta sin `manage_products`, intentar «Guardar … con X%» u «Olvidar formato» por RPC: rechazo; aplicar una factura sí guarda el formato. Desde otro comercio, la tabla de formatos no devuelve filas ajenas.
11. En móvil, revisar que el campo de descuento, sus botones y el aviso de lectura sin IA no tapen Aplicar reposición.

## Propuestas de precios

En la revisión de artículos vinculados, un costo individual nuevo que supera en más del 2% al anterior muestra **⚠️ Subió X%**. Cambiar el producto, el costo o la presentación recalcula el aviso. Un costo anterior de cero muestra **Nuevo costo (antes $0)**, porque no permite calcular un porcentaje finito. Un aumento exactamente igual al 2% no dispara el aviso.

Después de aplicar la reposición, el analizador permanece abierto. **Ver propuesta de precios** aparece si se actualizaron costos de productos existentes con subas mayores al 2%. No incluye renglones omitidos, altas nuevas ni artículos donde se eligió **Solo Stock**. Si un producto aparece en varios renglones, se propone una sola vez con el último costo seleccionado para actualizar, el mismo que se guarda en la reposición.

El subpanel tiene controles propios, independientes de los cambios masivos de precios del catálogo:

- **Margen objetivo:** 30% inicial, calculado sobre la venta: `(precio − costo) / precio`.
- **Múltiplo de redondeo:** $50 inicial; siempre se redondea hacia arriba.
- **Precio sugerido:** `ceil((costo_nuevo / (1 − margen_objetivo)) / múltiplo) × múltiplo`.
- **∆ Margen:** margen con precio sugerido/costo nuevo menos el margen anterior a la factura, en puntos porcentuales. La columna de precio actual también muestra el margen que deja ese precio con el nuevo costo.

Se seleccionan inicialmente solo las sugerencias que aumentan el precio de venta. Es posible elegir individualmente las inferiores si se desea. Las sugerencias iguales al precio actual no requieren aplicación. Controles vacíos, márgenes negativos o mayores/iguales al 100%, múltiplos inválidos o importes fuera del rango permitido bloquean el guardado.

**Aplicar precios seleccionados** llama a `retail.bulkUpdatePrices`, muestra un toast y actualiza el catálogo. La reposición y la actualización de precios son acciones separadas: cerrar el analizador sin aplicar precios conserva la reposición y los precios anteriores. La actualización afecta el catálogo maestro; las listas derivadas por porcentaje usan ese valor, mientras los precios fijos de las listas conservan su configuración. No se modifica el flujo de `handleApplyBulkPriceChanges()`.

La IA se habilita con un control opcional y se consulta mediante **Sugerencia IA de redondeo**. Comenta las terminaciones comerciales, sin modificar la tabla ni aplicar cambios. Analiza hasta 50 productos pendientes por consulta. Cambiar los controles o los precios invalida el comentario anterior. Un error o una demora de Groq no bloquea la aplicación manual de los precios.

No requiere migración SQL ni nuevas variables de entorno. Usa la configuración existente de Groq y la función de actualización de precios ya instalada.

### Guía de Pruebas

1. Abrir `http://localhost:3001/` como administrador. Preparar un producto **Alfajor de prueba** con costo **$100** y precio **$150**.
2. Entrar a **Productos y stock → Analizador de facturas**. Cargar una factura o pegar texto desde **Ver / editar texto detectado** con una compra de ese producto a **$120 por unidad**. Confirmar el vínculo si corresponde.
3. Verificar el badge **⚠️ Subió 20%**. Seleccionar **Stock + Costo** y pulsar **Aplicar reposición**. El analizador debe permanecer abierto; el costo se actualiza a $120 y el precio sigue en $150.
4. Pulsar **Ver propuesta de precios**. Con margen 30% y múltiplo $50 debe sugerir **$200**: precio sin redondear $171,43; redondeo +$28,57. El margen anterior es 33,33%, el propuesto 40%, y el delta **+6,67 p.p.** El margen con costo nuevo y precio actual es 20%.
5. Cambiar el múltiplo a $10: debe sugerir **$180**. Volver a $50 y desmarcar el producto: el botón de aplicar debe quedar deshabilitado si no hay otros seleccionados. Seleccionarlo y aplicar: debe aparecer el toast y actualizarse a $200 en el catálogo, sin volver a sumar stock.
6. Usar margen 100%, borrar un control o poner múltiplo 0: no debe poder aplicar precios. Volver a valores válidos debe recuperar la propuesta.
7. En otra prueba, usar un producto con costo $100 y factura a $102: no debe marcar suba. Con $102,01 sí debe marcarla. Si se elige **Solo Stock**, no debe aparecer en el panel posterior de precios.
8. Probar un producto con precio actual $300, costo anterior $100 y costo nuevo $120: la propuesta $200 debe quedar inicialmente desmarcada y advertir **Menor al actual**. Se puede seleccionar explícitamente.
9. Habilitar **Consultar sugerencia IA** y pulsar **Sugerencia IA de redondeo**. La respuesta debe aparecer como comentario; los precios no deben cambiar hasta pulsar **Aplicar precios seleccionados**. Cambiar el margen o múltiplo debe limpiar el comentario anterior. Un fallo de Groq debe permitir aplicar igualmente.
10. Verificar un producto con bultos: el costo comparado y propuesto debe ser el costo individual, sin dividir dos veces. Repetir el producto en dos renglones debe generar una sola fila de precios usando el costo final actualizado.

<a id="alertas-operativas"></a>

## Alertas operativas

`src/services/anomalyDetectionService.ts` exporta `AnomalyAlert` y `detectAnomalies(sales, shifts, movements, products, members?, options?)`. No realiza lecturas de red/almacenamiento ni modifica los datos recibidos. Las alertas no son pruebas de fraude ni atribuyen intención a una persona.

### Criterios implementados

| Detección | Criterio | Interpretación y límites |
| --- | --- | --- |
| Ventas vacías | Al menos 3 ventas con total exactamente cero o array de renglones vacío, y más del 5% del turno. | `warning`. Un detalle ilegible no se trata como array vacío. El backend normal impide ventas con total cero y no registra carritos descartados: no se puede medir ese comportamiento con estos datos. |
| Caída de efectivo | Ratio efectivo/(efectivo+QR) menor al 60% del promedio de ratios de turnos previos del mismo comercio. QR entre el 80% y 120% del promedio de importes QR por turno. | `warning`. Ventana de 30 días anteriores al inicio del turno, al menos 3 turnos históricos con pagos clasificables; solo compara turnos cerrados. No ajusta por duración ni inflación. El asistente excluye conservadoramente el primer turno potencialmente incompleto de la muestra. |
| Genéricos | Más de la mitad de los renglones de una venta son manuales, carecen de productId o se llaman Varios/Producto manual; más de 3 ventas así y más del 30% del turno. | `warning`. Cuenta renglones, no cantidades ni importe. Conserva la clasificación solicitada incluso en tickets antiguos sin IDs. |
| Faltantes | Al menos 3 cierres consecutivos más recientes del mismo operador y comercio, con promedio de faltante superior a $500. | `critical`. Revisa hasta 10 cierres por defecto. Un cierre sin diferencia, con sobrante o con saldo faltante/oculto corta la secuencia. Usa expected_cash persistido, sin recalcularlo con datos parciales ni restar nuevamente retiros. |
| Madrugada | Ventas positivas entre 02:00 inclusive y 06:00 exclusive, agrupadas por turno y fecha local. | `info` con horario desconocido, como ocurre en el modelo actual. `options.is24Hours=true` las suprime; false permite `warning`. No se agregó una configuración de horarios a la tienda. |
| Ráfagas | Más de 5 ventas positivas en hasta 120 segundos e importes dentro de ±10% del promedio y del importe inicial del grupo. | `warning`, categoría pattern. Cada ticket participa en una sola alerta de ráfaga. Una fila de clientes o productos de precio similar puede explicarlo. |

Los pagos mixtos usan sus partes reales; efectivo utiliza el importe de venta, no lo entregado antes del vuelto. Un mixto sin desglose válido impide usar ese turno en la comparación de efectivo. Transferencia, débito y crédito no se cuentan como QR.

Las ventas y movimientos se vinculan por `shift_id`; si no existe, solo se usa el rango temporal cuando identifica un único turno compatible con comercio, caja y operador disponibles. Los rangos son inicio inclusivo/cierre exclusivo. Un identificador explícito desconocido no se reemplaza por una suposición temporal. Se deduplican IDs. Las nuevas ventas online conservan los IDs ya devueltos por el backend y los registros offline agregan esos mismos metadatos, sin cambiar operaciones o cálculos. La RPC de movimientos sigue recibiendo el mismo comercio y turno; se adjuntan esos IDs al resultado autorizado.

Cada alerta incluye contexto de ingresos/retiros cargados para ese turno. Un valor cero en ese contexto no acredita que no haya movimientos: la muestra puede estar incompleta. El motor no accede a movimientos de otros usuarios ni amplía permisos. `members` solo permite mostrar el correo ya cargado del responsable del turno; no infiere autoría de una irregularidad.

Los IDs son hashes deterministas de categoría y contexto, para reconocer una alerta en sucesivas consultas. `detected_at` usa `options.asOf` si se proporciona; sin él toma el último evento cargado, evitando un reloj global dentro del servicio. La zona predeterminada es `America/Argentina/Buenos_Aires`. Se puede indicar `timeZone`, `recentClosures` y `salesCompleteSince` sin cambiar el contrato de los cinco argumentos originales.

### Integración y alcance

El análisis completo del asistente recibe miembros ya cargados y ejecuta el motor al construir el prompt de una consulta. Agrega hasta 10 alertas, ordenadas por severidad y recencia del turno, y el total detectado con sus límites. El chip «¿Detectaste algo sospechoso en los turnos?» inicia una consulta voluntaria. No se agregan peticiones generativas automáticas.

La cobertura actual puede ser de solo 500 ventas, 200 cierres y movimientos del turno seleccionado. Las secuencias y porcentajes describen esos datos, no certifican el histórico completo. El prompt anterior exigía afirmar cobertura del 100%; se corrigió esa instrucción sin cambiar métricas de margen ni su separación de bajo margen. Las alertas operativas abarcan ambos grupos porque examinan tickets y efectivo, no rentabilidad.

No se agregaron tablas, migraciones ni dependencias. No se ejecutaron escrituras de prueba ni se modificaron cálculos de caja, precios o stock.

### Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/**. Usar un comercio de pruebas; no generar ventas, faltantes ni movimientos ficticios en producción. El motor también se puede inspeccionar manualmente desde la consola del navegador de desarrollo, importándolo con `await import('/src/services/anomalyDetectionService.ts')` y pasando arreglos de datos en memoria, sin guardarlos en Supabase.

1. **Asistente:** como administrador, Ayuda → Consultar al asistente → análisis completo → chip de turnos sospechosos. Esperado: consulta voluntaria y explicación basada en evidencia, sin acusaciones. Si hay más de 10 alertas, el contexto incluye solo 10 priorizadas. Un cajero sin `use_ai` no accede al análisis completo; con el permiso explícito solo puede utilizar datos autorizados, sin revelar diferencias de arqueo reservadas ni movimientos ajenos.
2. **Ventas vacías, con datos en memoria:** pasar un turno con 50 ventas, 3 de ellas de total cero o items vacíos. Esperado: voidCount 3, totalSales 50, voidPercent 6 y warning. Con 60 ventas y solo 3 vacías, 5% exacto: sin alerta. No intentar guardar total cero en el backend para esta prueba.
3. **Efectivo/QR:** preparar 3 turnos históricos completos de los últimos 30 días, cada uno con $900 efectivo y $100 QR; un turno posterior cerrado con $40 efectivo y $100 QR. Esperado: ratio actual aproximadamente 0,29 frente a 0,90 y warning. Con QR $150, sin alerta porque no está estable. En la UI, incluir historia adicional anterior porque el turno más antiguo cargado puede estar parcialmente cubierto y se excluye. Repetir con pagos mixtos equivalentes: mismo resultado; sin desglose válido o con turno abierto, omitir la comparación.
4. **Genéricos:** 4 de 10 ventas con mayoría de renglones manuales. Esperado: 40% y warning. Solo 3 ventas genéricas, o exactamente 50% de renglones manuales en cada ticket: no cumplen el criterio correspondiente.
5. **Cierres:** mismo operador/comercio, últimos tres cierres con faltantes de $600, $700 y $800. Esperado: critical, promedio $700 y total $2100. Agregar un cierre posterior equilibrado o con expected_cash null: sin secuencia vigente. Agregar un retiro a los movimientos cargados: cambia la evidencia contextual, no vuelve a descontarlo del faltante persistido.
6. **Horarios:** una venta a las 03:00 de Argentina produce info porque no hay horario configurado; a las 06:00 no. Probar el servicio con is24Hours true: suprimir la alerta. Seis ventas de $1000 en dos minutos: una alerta de ráfaga, no seis alertas superpuestas. Cinco ventas o importes muy diferentes: sin alerta. Revisar el rango y los tickets indicados.
7. **Varias cajas y calidad de datos:** con dos turnos simultáneos, una venta sin IDs suficientes no debe atribuirse arbitrariamente. Con shift_id válido, sí. Una venta o movimiento de otro comercio no debe entrar por un rango horario incompatible. Repetir IDs en los arreglos: no duplicar conteos. Las fechas inválidas no deben generar horarios inventados.
8. **Regresiones/offline:** preparar configuración con conexión, vender offline y sincronizar. Esperado: conservar pago, importe, stock y cola existentes; los metadatos de turno siguen disponibles. Consultar márgenes estándar y bajo margen: mismos cálculos y separación. Bloquear Groq: el motor local sigue siendo invocable con sus datos, aunque el chat no pueda redactar una respuesta.

Pendientes: ejecución manual de estos casos, navegador, backend, permisos efectivos, móvil y sincronización. La revisión de código no demuestra precisión de las heurísticas: conviene contrastar alertas con turnos reales revisados por el dueño antes de sacar conclusiones sobre personas.

<a id="prediccion-de-stock"></a>

## Predicción de stock

Se agregó `src/services/stockPredictionService.ts`, con `StockPrediction`, `predictStockLevels(products, sales, options?)` y `groupPredictionsBySupplier(predictions)`. El servicio recibe datos ya cargados, no consulta Supabase/Groq, no modifica arreglos recibidos ni escribe pedidos o stock.

### Fechas, promedios y criterios

- Se incluyen productos activos con stock finito mayor que cero. Los productos agotados siguen en `stockCritico`; no se inventa una rotación para pedirlos.
- `options.asOf` fija la fecha de consulta. El asistente siempre pasa el instante actual. Para mantener el servicio puro, si se omite se toma la fecha de la última venta fechada recibida, no el reloj del equipo. Sin fechas ni ventas se devuelve rotación cero, plazo infinito y fecha vacía.
- La zona predeterminada es `America/Argentina/Buenos_Aires`, configurable con `timeZone`. Se usan los 14 días calendario completos anteriores a la fecha de consulta; hoy no entra porque puede estar incompleto. Se reconocen timestamps con zona, fechas ISO y fechas antiguas DD/MM/YYYY válidas.
- Los días sin ventas cargadas cuentan como cero. Si faltan datos históricos, eso puede subestimar la demanda: no equivale a haber comprobado que el comercio no vendió. La consulta del asistente puede estar limitada a 500 ventas o al turno seleccionado.
- `dailyAvgSales = (2 × unidades de los últimos 7 días + unidades de los 7 anteriores) / 21`. Este campo siempre conserva el promedio ponderado global, sin redondear antes de calcular.
- `weekdayAvg[0..6]` es el promedio de las dos ocurrencias de cada día en esa ventana, incluidos sus ceros. Si el promedio del día actual es positivo y difiere más del 20% del global, se usa como tasa de proyección; `weekdayThreshold` permite ajustar ese umbral relativo. Un cero de un solo día no convierte en infinita la cobertura de un producto que se vende otros días: en ese caso se conserva la tasa global.
- El plazo es `Math.round(stock / tasa de proyección)`; por eso puede diferir de `stock / dailyAvgSales` cuando se aplica el ajuste semanal. La fecha es ese número de días calendario después de la consulta. Si no hay rotación, `daysUntilStockout=Infinity` y `stockoutDate=''`: no existe una fecha ISO finita que mostrar.
- El pedido cubre `coverageDays` (10 por defecto): `max(0, tasa × cobertura − stock)`. Se redondea hacia arriba al siguiente bulto usando `unitsPerPack`; sin bulto se redondea a unidades enteras y `suggestedOrderPacks=null`. Un pack_size de 1 equivale a unidad suelta. No se vuelve a multiplicar la cantidad vendida por el tamaño del bulto: `qty` ya expresa la unidad de stock utilizada por la venta.
- Tendencia: semana reciente al menos 20% mayor → `accelerating`; al menos 20% menor → `decelerating`; dentro de esos límites → `stable`. Cero ventas anteriores y ventas recientes → acelerando, sin inventar un porcentaje infinito. Ambas semanas en cero → estable.
- Prioridad: plazo redondeado ≤2 → `critical`, ≤5 → `soon`; stock superior a 60 días de la tasa de proyección → `overstocked`; resto → `ok`. Sin ventas observadas y con stock positivo se clasifica como sobrestock potencial, sujeto a revisar la cobertura histórica.

Se deduplican ventas por ID, se ignoran cantidades inválidas/no positivas y ventas sin importe positivo. Los renglones se vinculan por productId; si falta, solo se admite coincidencia exacta normalizada con un único nombre de catálogo, excluyendo Varios/Producto manual. No hay coincidencias aproximadas ni atribuciones entre productos de nombre ambiguo.

La agrupación devuelve un Map por proveedor, con `Sin proveedor` para valores vacíos. No modifica las predicciones ni los datos del catálogo. Las sugerencias contemplan ventas de ambos grupos de margen porque se trata de unidades de stock; no se modifican las métricas comerciales ni su separación.

### Contexto del asistente

Se conserva el chip de compras y se agrega «¿De qué me voy a quedar sin stock esta semana?». El prompt incorpora `prediccionStock` con `criticos`, `sobrestock` y `tendenciasAlAlza`.

El servicio devuelve todas las predicciones. Solo el resumen enviado a Groq se limita: hasta 10 críticos/próximos, 5 sobrestocks y 5 tendencias, y un máximo conjunto de **1.200 bytes UTF-8 de JSON compacto**. Se alternan categorías para reservar representación de cada una; pueden entrar menos productos. Los nombres se abrevian a 48 caracteres y se conserva su ID. Se omiten las siete medias semanales y otros campos que no necesita esa respuesta. El resto del contexto también se serializa sin sangría, conservando los mismos datos.

Este presupuesto y las instrucciones breves buscan mantener la adición alrededor de 800 tokens o menos; es una cota por bytes del resumen, no una medición exacta del tokenizer de Groq. No se agregaron dependencias para contar tokens ni se realizó una petición para medirlos.

Para compras, el asistente debe agrupar por proveedor y mencionar fecha estimada, unidades y bultos. Para sobrestock, el capital informado es **stock actual × costo actual**, no el valor de venta ni una pérdida confirmada. Cuando falta un costo válido se envía null. Sin ventas observadas no se afirma que no exista demanda. Las sugerencias no crean órdenes ni cambian inventario.

### Guía de Pruebas — pendiente de ejecución manual

Abrir **http://localhost:3001/** con un comercio de pruebas. Los casos numéricos también pueden revisarse manualmente en la consola del navegador de desarrollo con `await import('/src/services/stockPredictionService.ts')`, pasando arreglos en memoria y `{ asOf: '2026-10-20T15:00:00-03:00' }`. No generar ventas ficticias en producción para preparar el histórico.

1. **Consulta:** Ayuda → Consultar al asistente → análisis completo → nuevo chip. Esperado: sugerencias por proveedor con fechas y cantidades, aclarando la cobertura disponible; ninguna orden creada. Preguntar «¿Qué producto tiene sobrestock?»: mostrar capital al costo o indicar que falta ese dato.
2. **Rotación constante y packs:** producto activo con stock 20, pack_size 24 y 10 unidades vendidas cada día del 6 al 19 de octubre. Esperado: dailyAvgSales 10, todas las medias semanales 10, plazo 2, fecha 2026-10-22, critical y pedido de 96 unidades/4 bultos para cubrir 10 días. Sin pack_size: 80 unidades, packs null.
3. **Pesos y tendencia:** 7 unidades diarias en la semana anterior y 14 en la reciente. Esperado: `(2×98+49)/21 = 11,666…` diarias y accelerating. Con 12 frente a 10 diarias: accelerating en el límite +20%; con 8 frente a 10: decelerating. Las ventas de hoy no alteran estos promedios.
4. **Día semanal:** para consulta un martes, cargar 20 unidades en cada martes previo y 5 en cada uno de los otros días; usar stock 20. Esperado: media de martes 20, promedio global `100/14 ≈ 7,14`, proyección de 1 día y fecha 2026-10-21. Con `weekdayThreshold: 10`, se desactiva ese ajuste y se usa el promedio global.
5. **Cobertura y sobrestock:** repetir rotación 10 y stock 20 con coverageDays 3 y sin bulto: pedido 10. Con stock 601 y cobertura predeterminada: overstocked y pedido 0. A costo $100, capital del stock $60.100. Stock 600 no supera estrictamente los 60 días.
6. **Sin ventas y exclusiones:** producto activo con stock positivo sin ventas: Infinity, fecha vacía, pedido 0 y sobrestock potencial; el asistente debe aclarar que no hay ventas observadas. Un producto inactivo, con stock cero o negativo no aparece en las predicciones. Un día semanal en cero no debe anular la demanda de los otros días.
7. **Fechas y calidad:** ventas de hace 15 días, futuras o de hoy no entran. Una venta cerca de medianoche UTC debe asignarse al día correspondiente de Argentina. Repetir IDs no duplica cantidades; renglones manuales o nombres ambiguos no se atribuyen arbitrariamente a un producto. Las cantidades fraccionarias válidas se conservan en los promedios.
8. **Proveedor y tamaño:** llamar groupPredictionsBySupplier con varios proveedores y uno vacío: esperar grupos separados y Sin proveedor. En un catálogo grande, revisar el JSON del mensaje system: `prediccionStock` no supera 1.200 bytes compactos y sus listas respetan 10/5/5, aunque contengan menos filas por el presupuesto. No interpretar la lista reducida como inventario completo.
9. **Regresión:** consultar anomalías operativas y márgenes estándar/bajo margen: deben conservar sus datos y reglas. Bloquear Groq: el motor sigue invocable con datos en memoria, aunque el chat no pueda redactar. Ninguna predicción requiere conexión ni cambia stock, precios, carrito o sincronización.

Quedan pendientes navegador, validación funcional de estos ejemplos, comportamiento con datos reales incompletos y tamaño efectivo en tokens del modelo. La estimación no contempla faltantes históricos, estacionalidad larga, plazos de entrega, pedidos en tránsito ni cambios de demanda no observados.

<a id="capital-inmovilizado"></a>

## Capital inmovilizado

### Alcance y persistencia

Dependencia incluida en schema (no ejecutar por separado): localmente preparada `supabase/migrations/202610200003_product_expiry.sql` en el entorno correspondiente antes de desplegar el cliente. Agrega únicamente `expiry_date date` y `last_restocked_at timestamptz`, ambas opcionales, sin cambiar permisos, RLS, RPC ni datos existentes.  Revisar el historial del entorno antes de aplicar; no ejecutar otras migraciones pendientes indiscriminadamente.

Productos permite cargar, editar o quitar el vencimiento debajo del costo. Una edición de precio desde un llamador que omite estos campos no los borra. El formulario no reenvía una fecha de reposición vieja al guardar. Los SELECT existentes incluyen las columnas nuevas mediante `select('*')` y el mapeo las conserva en el producto y su caché.

`last_restocked_at` se admite en altas/ediciones por API y en reposiciones directas con una cantidad positiva explícita. Las operaciones habituales pueden pasar por la cola offline y la RPC existente de stock, que no se modifica en esta tarea: no se garantiza que todas las reposiciones actualicen esa columna. El análisis usa también el historial local del comercio (hasta 200 registros), tomando la fecha más reciente disponible. Ese respaldo no se comparte entre dispositivos y puede contener operaciones pendientes. Cuando no hay evidencia, `daysSinceRestock` queda en null. Completar la captura compartida de todos los flujos de reposición requeriría ampliar las RPC en otra migración; no se simula con fechas de lectura o sincronización.

### Criterios

`analyzeCapital` opera sobre los productos, ventas y reposiciones entregados, sin llamadas de red ni lecturas de almacenamiento. Admite `asOf` para fijar el instante de análisis; por defecto usa el actual. Los días usan el calendario de Argentina. Fechas inválidas/futuras, ventas de total no positivo e ítems sin cantidad positiva se excluyen. Solo se vincula por `productId`, nunca por nombres que podrían coincidir con otro artículo o importe manual.

Se incluyen productos activos con stock y costo finitos, positivos. El capital es costo por stock, redondeado a centavos. Las clases por días desde la última venta observada son fast (0–7), medium (8–21), slow (22–45) y dead (más de 45). Si no se observa una venta, la fecha queda null y se clasifica dead para revisión: no acredita que nunca se vendió ni que tuvo 45 días sin movimiento. Un producto recién incorporado también puede entrar en ese grupo; el asistente debe aclararlo y considerar la fecha de reposición disponible.

| Condición | Acción sugerida | Semáforo |
| --- | --- | --- |
| dead, capital mayor a $5000 | Liquidación, precio por definir revisando costo/margen | Rojo |
| dead, capital hasta $5000 | Rebaja 30 % | Rojo |
| slow, vencimiento entre hoy y 15 días | 2x1 | Rojo |
| slow, sin vencimiento próximo conocido | Descuento 20 % | Amarillo |
| medium, vencimiento entre hoy y 30 días | Combo | Amarillo |
| Resto | Ninguna | Verde |
| Fecha de vencimiento anterior a hoy | Revisar y retirar de venta, sin promoción | Rojo |

Los descuentos muestran el precio sugerido redondeado al peso, sin guardarlo. Liquidación no inventa un porcentaje. No se controla margen mínimo automáticamente: las propuestas requieren revisión, especialmente en artículos de bajo margen. Se conserva su separación en las métricas existentes. La excepción de vencidos evita recomendar ventas de mercadería vencida; no modifica su stock ni bloquea la venta desde este servicio.

Es un indicador de recencia según la matriz solicitada, no un modelo de unidades vendidas respecto al stock. La matriz no alerta por vencimiento próximo de un producto fast. Una fecha por producto tampoco representa lotes: cargar el próximo vencimiento relevante y revisar al reponer.

El asistente incorpora hasta 8 rojos y 5 amarillos, ordenados por urgencia y capital. Los totales se calculan sobre todos los resultados, no sobre esos 13. Capital inmovilizado suma rojos y amarillos; el denominador valora la misma población completa, incluidos verdes. Si no hay stock valorizado, el porcentaje es null. El historial del asistente puede limitarse a 500 ventas; la respuesta debe expresar esa cobertura, no asegurar un diagnóstico de toda la base. El nuevo chip consulta voluntariamente estos datos; no se generan promociones ni peticiones de IA automáticamente.

### Guía de Pruebas — pendiente de ejecución manual

En **http://localhost:3001/**, con administrador y un comercio de pruebas tras aplicar la migración:

1. **Producto:** agregar uno con costo, stock y vencimiento; guardar y recargar. Debe conservar la fecha. Editar solo precio y confirmar que fecha, bulto, margen y atributos se mantengan. Quitar la fecha, guardar y recargar: debe quedar vacía sin impedir el análisis.
2. **Matriz:** usar datos de prueba con últimas ventas a 7/8, 21/22 y 45/46 días. Esperado: fast/medium, medium/slow y slow/dead respectivamente. Para dead comparar capital $5000 y $5001: rebaja 30 % y liquidación. Con precio $140 la rebaja 30 % muestra $98.
3. **Vencimiento:** para slow usar fechas a 15 y 16 días: 2x1 rojo y descuento 20 % amarillo. Para medium, a 30 y 31 días: combo amarillo y ninguna verde. Fecha de ayer: rojo, revisar y retirar, sin promoción. Sin fecha: `daysToExpiry=null`, sin comparación accidental como si fuera cero.
4. **Asistente:** abrir el análisis completo y pulsar «¿Tengo mercadería clavada o por vencer?». Debe presentar promociones propuestas y el porcentaje de capital parado, sin afirmar cambios aplicados. Con más de 8 rojos/5 amarillos, los totales deben incluir también los omitidos de la lista. Un catálogo sin stock valorizado no debe producir NaN, Infinity ni un porcentaje inventado.
5. **Identidad e historia:** comprobar dos productos con igual nombre e IDs distintos y una venta manual con ese nombre. Solo el ID vendido recibe última venta. Un producto sin ventas observadas debe conservar fecha null; la respuesta debe reconocer la muestra incompleta y evitar asegurar 45 días sin venta.
6. **Reposiciones:** reponer unidades/bultos y comprobar la fecha disponible en el historial local. Una modificación de costo sin ingreso no cuenta como reposición. Otro dispositivo solo puede usar la columna persistida y su propio historial; si faltan ambas fuentes, debe mostrar desconocido, sin inventar antigüedad.
7. **Permisos y conexión:** cajero no gana permisos de edición por agregar columnas. Confirmar RLS real desde cuentas autorizadas y no autorizadas. Sin conexión, la configuración sigue requiriendo red y la venta preparada conserva su flujo habitual; la consulta conversacional necesita Groq. Probar un backend sin migración: guardar el campo debe mostrar el mensaje de migración faltante, sin fingir éxito.

No se realizaron verificaciones de navegador, Groq, SQL/RLS, dispositivo móvil ni sincronización entre dispositivos. No generar ventas ni reposiciones ficticias en producción.

