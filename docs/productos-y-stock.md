# Productos y stock

Guía vigente consolidada. Los nombres de migraciones indican dependencias, no el estado remoto: usar [schema y su historial](../SUPABASE_SETUP.md), sin repetir archivos individuales. Las Guías de Pruebas son recorridos manuales en **http://localhost:3001/**; no acreditan pruebas ejecutadas.

- [Insumos y costos automáticos](#insumos-y-costos-automaticos)
- [Combos y cigarrillos](#combos-y-cigarrillos)
- [Bultos y unidades](#bultos-y-unidades)
- [Depósito opcional](#deposito-opcional)
- [Bajo margen](#bajo-margen)
- [Métricas de margen](#metricas-de-margen)
- [Categorías](#categorias)
- [Eliminar y restaurar](#eliminar-y-restaurar)

<a id="deposito-opcional"></a>

## Depósito opcional

**Mi comercio → Más opciones → Usar depósito** activa un depósito compartido por comercio. Para perfiles delegados con `manage_store`, el mismo control está en Datos del comercio. De inicio está apagado: no agrega tareas al alta de comercio/productos ni decisiones al vender. Activarlo conserva todo el stock existente en salón y no crea unidades ni duplica artículos. Salón y depósito son comunes a los locales, siguiendo el stock compartido actual; no son inventarios independientes por sucursal/caja.

Con la opción encendida, Productos muestra total y desglose salón/depósito. **Reponer**, en la fila del producto, reutiliza cantidad/unidades/bultos y ofrece:

- **Reponer salón:** pasa unidades del depósito al salón, sin cambiar total, costo ni caja. Se propone al abrir si el producto tiene unidades en depósito, sin ejecutarse solo.
- **Recibir mercadería:** suma existencias, con destino visible Salón o Depósito (se propone Depósito). El costo unitario mantiene sus permisos y reglas actuales.
- **Guardar en depósito:** pasa unidades del salón al depósito. Sirve también para distribuir el stock inicial, sin modificar el total.

El formulario conserva cantidades, bultos, costo y referencias al alternar tareas o navegar mientras sigue montado. Los campos de recepción ocultos quedan deshabilitados durante un traslado; no validan ni cambian costos. Cancelar descarta ese formulario, sin reiniciar otros editores. Al cambiar la configuración del depósito con el formulario abierto, exige cerrarlo y revisar la operación antes de guardar. Foco inicial en cantidad, Tab contenido en el diálogo, Escape/Cancelar devuelve el foco a la acción de origen. No se automatizó la validación de estos recorridos.

La venta y la botonera usan solo salón, sin selector adicional ni consumo automático del depósito. Los combos calculan disponibilidad por componentes en salón, conservando receta/costo; no tienen depósito propio. Atados/sueltos comparten las unidades individuales actuales: ingresar o mover bultos convierte una sola vez. El stock total físico de los componentes sigue disponible para informes/compras; moverlo no cambia capital valorizado ni precios.

Crear un producto, importar CSV/factura o aprobar un remito sigue ingresando unidades en salón; no cambia su contrato ni reinterpreta borradores anteriores. Más herramientas informa ese destino con depósito activo. Para guardarlas, usar Reponer → Guardar en depósito. Editar Stock total ajusta el salón y no puede dejar el total por debajo del depósito. Para corregir una existencia del depósito, pasar primero esas unidades al salón y usar la corrección existente; no se agregó un segundo editor de ajustes.

**Historial de depósito**, dentro de Reponer, consulta a pedido los últimos 30 ingresos/traslados del producto. Guarda identificador, usuario, fecha, producto y cantidades posteriores en Supabase, compartidos entre dispositivos autorizados. No se borra historial al apagar la opción. Desactivar requiere depósito vacío; tampoco se permite eliminar un producto con unidades guardadas allí: primero moverlas al salón. No se redistribuye ni borra información silenciosamente.

### Persistencia y conexión

Migración local **`202610260001_optional_depot.sql`**, incluida en `supabase/schema.sql`, sin aplicación remota. `retail_products.stock` conserva el total; `retail_depot_balances` guarda la parte en depósito. Las tablas nuevas no admiten escritura directa para usuarios autenticados; las RPC validan comercio, producto físico, permisos, cantidades, existencia de origen y costo. Cada movimiento bloquea producto y configuración; el ID de solicitud permite reintentar sin duplicar. Un trigger impide que venta/edición/cliente anterior reduzca el total por debajo de lo reservado, incluso en una receta.

Activar/desactivar requiere `manage_store`. Recibir y trasladar requiere `manage_products` o `replenish_stock`; modificar costos exige `manage_products`. Consultar el historial requiere permiso de stock o configuración. Los balances se leen por membresía para calcular disponibilidad de venta. No se concede un rol administrativo por mostrar estas acciones.

Activación, traslados e ingresos a depósito requieren conexión y cola local vacía; no se encolan como reposiciones antiguas. Recibir en salón conserva la cola offline existente. La venta offline preparada descuenta total y salón de su copia, dejando depósito intacto, y el servidor vuelve a comprobar disponibilidad. No conoce traslados/ventas de otros dispositivos durante la desconexión: un conflicto conserva la venta en la cola para revisión, sin cobrar otra vez ni tomar stock del depósito automáticamente. Actualizar/preparar los dispositivos antes de distribuir mercadería. El service worker mantiene el replay existente, sin un nuevo tipo de operación.

Una lectura fallida de balances no se reemplaza por cero: se conserva caché preparada o se informa error. La compatibilidad con servidores anteriores solo usa cero si falta la tabla y el comercio no tiene depósito habilitado. El catálogo pagina los balances; no se limita a los primeros 1.000 productos. Tras mutaciones se invalida la revisión local y se refresca catálogo/configuración sin permitir que una lectura anterior sobrescriba esa copia. Una respuesta perdida se reintenta con el mismo ID; la RPC consulta el movimiento guardado antes de validar saldo actual. Si solo falla refrescar después de guardar, no se repite la escritura como nueva operación.

### Guía de Pruebas — depósito, pendiente manual

En **http://localhost:3001/** y un comercio de pruebas, después de aplicar schema en el proyecto correcto:

1. **Sin activar:** crear producto, recibir, vender y operar offline preparado. Esperado: flujo habitual, sin tareas/destino de depósito ni selector al cobrar; datos existentes intactos.
2. **Activar y distribuir:** producto con total 100 → activar → salón 100/depósito 0. Guardar 80 en depósito → salón 20/depósito 80/total 100. Recargar y consultar otro dispositivo autorizado: mismo desglose.
3. **Vender y reponer:** vender 3 por cualquier medio → 17/80/97. Reponer salón con 12 → 29/68/97. No cambia costo, precio, importe de caja ni cantidad total por el traslado.
4. **Recibir:** ingresar 2 bultos de 12 en depósito → 29/92/121; recibir 5 en salón → 34/92/126. Revisar costo unitario y referencia con y sin permiso de costos. CSV/factura/remito deben ingresar en salón, sin una segunda conversión de bultos.
5. **Límites y reintentos:** intentar mover más que el origen o vender por encima del salón, incluso con stock en depósito. Esperado: error visible, operación completa sin cambios parciales. Doble clic, pérdida de respuesta y reintento con los mismos datos: una sola operación, también si el primer movimiento agotó el origen.
6. **Borradores y teclado:** alternar tareas, navegar y volver, cancelar, Tab/Escape y teclado móvil. Esperado: campos conservados hasta cancelar/guardar, costos ocultos no validan ni se aplican, foco visible y botones alcanzables. Cambiar la opción desde otra sesión y actualizar: no convierte un traslado pendiente en compra.
7. **Combos y sueltos:** dejar pan o salchichas solo en depósito → no permite vender pancho hasta reponer esos componentes. Mover cigarrillos y vender paquete/suelto: descuenta unidades individuales de salón una sola vez, sin modificar receta ni precios.
8. **Permisos y concurrencia:** cajero sin reposición no puede operar por RPC ni leer historial; con `replenish_stock` puede trasladar/recibir sin editar costos. Otro comercio queda excluido. Dos dispositivos intentando consumir el mismo origen: nunca queda saldo negativo ni una venta consume unidades reservadas. Un traslado entre sucursales de la sección Transferencias sigue siendo solo registro, no reasignación de estos balances.
9. **Desactivar y bajas:** con depósito ocupado, desactivar/eliminar producto debe pedir mover primero. Pasar todo al salón, desactivar y consultar otra vez: total intacto e historial conservado. Total inferior a depósito al editar debe fallar sin cambiar otros atributos.
10. **Offline/PWA:** preparar salón 2/depósito 10, desconectar y vender 2 → salón 0/depósito 10/total 10 local. Una tercera unidad se rechaza; traslados/activación/ingresos a depósito requieren red. Reconectar: una sola venta y mismo balance. Con cambios concurrentes, conservar y mostrar el conflicto sin borrar pendientes. Repetir con catálogo grande y lectura de balances fallida: no tratar depósito desconocido como disponible.

Comprobación de código ejecutada: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0), tras integrar depósito y alta directa de combos. Sin builds ni otras pruebas automatizadas. Requieren validación manual SQL/RLS/RPC, concurrencia, navegador, móvil, segundo dispositivo y PWA. TypeScript no acredita esas pruebas; no se aplicaron migraciones ni se crearon datos remotos.

<a id="insumos-y-costos-automaticos"></a>

## Insumos y costos automáticos

En **Productos → Agregar / Editar → Uso del producto**, elegir **Solo insumo** para pan, salchichas u otras existencias que no se venden por separado. No necesita precio de venta. Sigue en catálogo, reposición, facturas/remitos y selección de componentes; no aparece en búsqueda ni botonera de Vender. El lector y el carrito tampoco permiten venderlo directamente. Un producto puede seguir siendo **Para vender** y usarse como componente a la vez.

Los registros anteriores siguen siendo vendibles: hay que elegir Solo insumo en los panes o salchichas existentes. Cambiar el uso conserva precio previamente cargado, atributos y stock. Volver a Para vender exige precio positivo. Los precios fijos de listas se conservan para una eventual vuelta a venta, aunque los insumos no se ofrecen en el editor de precios de listas ni en ajustes masivos.

**Crear combo o paquete** abre un formulario propio con nombre, código, precio, categoría y componentes desde el inicio. Muestra cantidad × costo de cada componente y el total por unidad; no pide cargar costo ni stock propio. Con pan a $150 y salchicha a $350, un pancho de 1 + 1 cuesta $500. No requiere precio de venta de sus insumos. **Combo / sueltos** conserva la edición de composiciones existentes.

El costo del compuesto es automático y no editable directamente. Cambia al guardar la receta o cambiar el costo de sus componentes mediante edición, reposición o importación existente. Se suma a centavos, sin modificar precios, existencias ni ventas anteriores. Costo 0 mantiene la representación existente de costo desconocido: si falta el costo de un componente, el total queda pendiente (0 en persistencia) y no se informa un margen a partir de una suma parcial. No se inventan costos ni se bloquea vender por falta de costo.

También rige para paquetes de cigarrillos: costo del paquete = cantidad de cigarrillos × costo unitario. Puede diferir por centavos del costo anterior si el unitario fue redondeado. Los precios de paquete y suelto siguen siendo independientes; stock y reposición no cambian. Desvincular una receta conserva su último costo; desde entonces es editable como producto con stock propio.

### Persistencia y compatibilidad

Dependencia incluida en schema (no ejecutar por separado): **`supabase/migrations/202610230002_ingredients_and_composition_costs.sql`**, después de las anteriores, incluida `202610230001_automatic_margin_groups.sql`.  Agrega `sellable` con predeterminado `true`, permite precio 0 únicamente en insumos y recalcula costos/márgenes actuales de compuestos existentes. No borra datos, cambia precios ni reescribe instantáneas de tickets históricos. Las líneas antiguas sin instantánea conservan la aproximación al catálogo actual que ya tenía el sistema.

Cambiar uso exige `manage_products`; configurar recetas mantiene `manage_compositions`. Los triggers derivan costo antes de clasificar margen, incluso con clientes anteriores o formularios desactualizados. Propagan el cambio en la misma transacción, sin conceder escritura directa de recetas. El servidor rechaza vender un insumo directamente y revierte el checkout completo; sí permite consumirlo dentro de la receta guardada.

Configurar uso y composición requiere conexión. Sincronizar operaciones pendientes antes de cambiar uso y preparar catálogo actualizado en los demás dispositivos. Un cliente antiguo/desconectado que todavía considere vendible un insumo puede encontrar un conflicto al sincronizar su venta directa. No se sustituye por un combo ni se descarta la cola. Offline preparado conserva consumo compartido y actualiza costos derivados en caché tras una reposición con costo permitida. El servidor recalcula con sus costos vigentes al sincronizar, conforme a la política existente de captura de costos.

La propagación usa bloqueos transaccionales y orden de IDs para dependientes. Concurrencia con checkout/edición requiere validación real en backend; un conflicto/deadlock puede rechazar una operación completa y requerir reintentar. No se promete ausencia de conflictos. TypeScript no valida SQL, permisos ni bloqueos.

### Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, comercio de pruebas, después de aplicar la migración:

1. Agregar Pan, **Solo insumo**, costo $150, stock 10, precio vacío. Repetir con Salchicha, costo $350, stock 8. Esperado: guardan sin precio ficticio, muestran Solo insumo y permiten reponer.
2. Crear **Pancho**, precio $1.000. Esperado: no pide costo manual; elegir 1 Pan + 1 Salchicha muestra **$500** y disponibilidad **8**. Guardar y editar: costo no editable, margen calculado.
3. Editar o reponer Pan con costo unitario $200. Esperado: Pancho cuesta **$550**, mismo precio y receta. Actualizar otro dispositivo conectado: mismo costo.
4. Cambiar costo de Salchicha a 0. Esperado: identifica costo faltante, total pendiente y margen desconocido. Restaurar $350: vuelve a $550.
5. Buscar/escanear insumos en Vender y revisar botonera, incluso si estaban fijados. Esperado: no se agregan directamente. Cobrar 2 Panchos solo en datos de prueba: descuenta 2 panes y 2 salchichas y captura costo vigente.
6. Cambiar un vendible a Solo insumo y volver: conserva stock, código, precio guardado y precios fijos; Para vender exige precio positivo. Carrito viejo con insumo: exige retirarlo. Cliente viejo/RPC: verificar rechazo sin descuentos parciales en backend.
7. Cancelar o navegar con borrador: cancelar descarta solo ese editor; navegar conserva formularios. Cajero sin `manage_products` no puede cambiar uso; permiso de reposición mantiene sus límites y permite sumar insumos.
8. Paquete de 20 con costo por suelto $100: paquete cuesta $2.000, ambos precios independientes. Paquete + 3 sueltos descuenta 23 cigarrillos; reposición por atados conserva conversión.
9. Preparar catálogo conectado, desconectar, vender combo y sincronizar: conserva consumo compartido. Configuración sin conexión explica el requisito y conserva borrador. Validar conflictos entre dispositivos sin descartar pendientes.

Pendientes: navegador, móvil, SQL/RLS, concurrencia, otro dispositivo y sincronización real. No se hicieron ventas de prueba ni evaluación con personas.

<a id="combos-y-cigarrillos"></a>

## Combos y cigarrillos

### Cómo configurarlos

En **Productos → Catálogo y stock**, administración dispone de **Crear combo o paquete**, junto a Agregar producto. Abre **Nuevo combo o paquete**, con componentes, costo y disponibilidad calculados desde el inicio; usa los mismos campos de receta que la edición existente. **Guardar combo** guarda datos y composición en una sola transacción. Para productos existentes, usar **Combo / sueltos** en su fila. Cada producto conserva precio, código, categoría y listas. El costo compuesto es automático; el grupo de margen se calcula con el límite del comercio. El cajero vende por búsqueda, lector o botonera sin elegir ingredientes ni abrir otro asistente.

Cancelar no crea ningún registro. Si falla una composición, tampoco queda un producto sin configurar. La RPC `retail_create_composite_product` de la migración local `202610260002_create_composite_product.sql` reutiliza las validaciones/costos existentes, requiere `manage_products` y `manage_compositions`, y guarda un recibo con ID estable para reintentar sin duplicar. No cambia precios, fórmulas ni existencias de componentes al crear. Necesita conexión y cola sincronizada; navegar conserva el formulario montado. Los atributos adicionales se pueden editar después desde Editar. Un combo sin costos conocidos muestra costo pendiente, sin inventar un costo parcial.

#### Pancho

1. Crear o reutilizar **Pan de pancho** y **Salchicha**, con stock contado en unidades y costo por unidad. Si no se venden por separado, elegir **Solo insumo**; no necesitan precio de venta. No crear duplicados si ya existen.
2. Pulsar **Crear combo o paquete**: debe abrir **Nuevo combo o paquete** con componentes visibles, sin campos para ingresar costo o stock. Completar Pancho, código, categoría y precio; agregar 1 Pan de pancho y 1 Salchicha en el mismo formulario. Esperado: costo $500 si sus costos son $150/$350 y disponibilidad limitada por ambos insumos de salón.
3. Pulsar **Guardar combo**: debe existir un solo producto con la receta completa, stock físico propio 0 y sin descontar insumos. Cancelar otro borrador no crea registros. Fallar la red/reintentar o provocar receta inválida por RPC no debe duplicar ni dejar un producto parcial. Si ya tiene receta, entrar desde **Componentes**; si es un producto vendible sin stock propio, **Combo / sueltos → Combo o paquete** muestra directamente los campos de componentes.
4. Con 10 panes y 8 salchichas, se muestran **8 panchos disponibles**. Vender 2 panchos consume 2 panes y 2 salchichas: quedan 8 panes, 6 salchichas y disponibilidad para 6 panchos. No se crea un segundo stock de panchos.

#### Cigarrillos sueltos y paquete

**Dirección correcta:** el atado consume 10 o 20 cigarrillos individuales; vender un suelto consume 1 cigarrillo. La composición de un suelto que consume 10 atados está invertida.

**Si hoy contás stock en atados:**

1. En la fila del **atado**, abrir **Combo / sueltos → Cigarrillos sueltos**. Confirmar que el stock actual esté contado en atados, no en cigarrillos individuales. Sincronizar las operaciones de todos los dispositivos antes de convertir.
2. Indicar explícitamente cuántos cigarrillos trae cada atado; no se infiere del nombre ni de las unidades por bulto.
3. Elegir crear el producto suelto o reutilizar uno existente. Se admite un producto sin stock propio o uno cuya composición esté vinculada solamente a ese atado, para corregir una relación inversa. No se suman stocks que podrían representar las mismas existencias.
4. Revisar nombre/código interno si es nuevo, precio y costo por cigarrillo. El costo vacío en un producto nuevo propone costo del atado dividido por unidades, redondeado a centavos; en uno existente conserva su costo salvo edición explícita.
5. Revisar **5 atados × 10 = 50 cigarrillos** y pulsar **Convertir stock y habilitar sueltos**. Es una conversión explícita y atómica: el atado conserva su ID, código, precio, pasa a descontar 10 unidades del suelto y deja de tener un segundo stock físico. No se cambian ventas anteriores. Si ya había un suelto inversamente vinculado se conserva su ID y se corrige la relación, sin duplicarlo.
6. Reponer desde el producto **suelto**, eligiendo bultos/atados. Su `pack_size` queda en 10 (o el valor indicado) y la unidad en unidad individual. Dos atados suman 20 cigarrillos. El suelto puede tener precio distinto del precio del atado dividido por 10.

Si el atado es usado por otros productos compuestos, hay que revisar esas composiciones antes de convertir: no se reescriben otras recetas automáticamente. La operación es una conversión inicial, no una reposición repetible; el registro administrativo conserva la cantidad de atados trasladada, los cigarrillos resultantes, la solicitud y el actor. Se registran los deltas de ambos productos en los movimientos de stock. Al reutilizar un producto se mantienen los demás atributos; al crear uno, se copian categoría, marca, proveedor, etiquetas, grupo de margen y vencimiento del atado, sin copiar su código de proveedor. El costo del atado se calcula sumando los cigarrillos y cambia con su costo unitario.

**Si ya contabas stock en cigarrillos individuales**, no hace falta convertir: el armado manual original sigue disponible:

1. Usar **Cigarrillo [marca/presentación] suelto** como producto con stock propio. El stock, costo y precio de ese producto se expresan por cigarrillo. Código interno propio; cada marca/presentación mantiene sus existencias.
2. Si la reposición se carga por paquetes de 20, configurar **Unidades por bulto/pack = 20** en ese producto. Ingresar 5 bultos suma 100 cigarrillos. Si se compra por cartón, ese campo debe indicar sus unidades individuales reales; no determina cuántos cigarrillos descuenta el paquete vendido.
3. Usar **Crear combo o paquete** para crear **Paquete [misma marca] ×20**, con código de barras del paquete y precio del paquete (su costo se calcula por componentes). No reutilizar el mismo código del suelto. El stock propio queda en **0**.
4. En ese mismo formulario, elegir 20 unidades del producto suelto y pulsar **Guardar combo**. Quedan dos productos vendibles con precios independientes y una única existencia física. El grupo de margen se clasifica automáticamente según precio base, costo y límite del comercio.
5. Con 100 cigarrillos, vender 1 paquete y 3 sueltos deja **77 cigarrillos**, disponibilidad para **3 paquetes completos** y posibilidad de vender los restantes como sueltos. No se ingresan fracciones de paquete ni se necesita registrar una apertura de paquete para vender un cigarrillo.

Los productos vinculados no muestran Reponer. Se reponen sus componentes, también desde CSV o facturas/remitos: vincular el ingreso al producto que guarda las unidades físicas, con la conversión de bultos que corresponda. Una fila CSV que intenta reponer un combo queda inválida con una explicación; no inventa ni reparte stock. Los flujos de facturas y propuestas de precios no cambian sus cálculos.

### Datos, límites y compatibilidad

- Composición fija: hasta 30 componentes, unidades enteras entre 1 y 1.000.000 por componente. No permite repetidos, autorreferencias, componentes de otra tienda, productos inactivos ni composiciones anidadas. Las variantes/adicionales elegidos durante la venta quedan fuera de este paso.
- Crear o cambiar composición necesita conexión y operaciones locales sincronizadas. Una selección inválida o un error mantiene el borrador. Cambiar de pantalla mantiene el editor montado; Cancelar descarta solo ese borrador.
- El producto vinculado guarda stock físico 0; su `stock` expuesto al cliente es disponibilidad calculada. Editar nombre, precio u otros atributos conserva la composición y no escribe esa disponibilidad como stock. El precio sigue siendo explícito; el costo se recalcula al cambiar costos de ingredientes.
- El editor genérico de composición no convierte existencias previas: si un producto tiene stock propio distinto de 0 no permite vincularlo. Para cigarrillos contados en atados, usar la conversión explícita descrita arriba, con vista previa y registro administrativo. No se multiplican ni borran stocks al cambiar una selección visual ni al instalar la migración.
- Volver a Stock propio deja stock 0, sin trasladar ni borrar existencias de componentes. No se puede archivar un componente usado por una composición activa ni eliminar uno referenciado. Los productos anteriores quedan con composición vacía y conservan sus existencias.
- El carrito suma el consumo de todos sus renglones antes de cobrar: combos, paquetes, sueltos y componentes vendidos directamente compiten por el mismo stock. La validación autoritativa de Supabase descuenta todo o nada y conserva el identificador de venta/reintentos.
- Cada venta guarda una copia de la composición utilizada. Offline preparado aplica el mismo consumo local, conserva esa copia en la cola y la envía a la RPC existente. Si otro dispositivo cambia la composición, la sincronización señala un conflicto y conserva la operación: no consume otra receta ni resuelve el conflicto automáticamente.
- Un cliente anterior puede seguir vendiendo productos de stock propio. Para vender una composición necesita actualizar app y catálogo; el servidor rechaza ventas sin la copia correspondiente. Antes de convertir un producto ya utilizado, coordinar la sincronización de los otros dispositivos para evitar conflictos con ventas pendientes.
- La valoración de capital y las sugerencias de reposición cuentan productos con stock propio y utilizan los componentes registrados en las ventas. No suman otra vez las disponibilidades virtuales del combo. Los ingresos, márgenes estándar/bajo margen y tickets siguen considerando el producto vendido con su precio y costo configurados. El historial anterior sin composición no se reinterpreta con recetas actuales.
- Las transferencias existentes siguen siendo constancias internas y no alteran el stock global; no se introduce stock por sucursal ni se cambian sus estados.

<a id="bultos-y-unidades"></a>

## Bultos y unidades

Dependencia incluida en schema (no ejecutar por separado): la migración pendiente [202610160003_pack_size.sql](../supabase/migrations/202610160003_pack_size.sql) antes de publicar el frontend. Agrega un campo opcional, con valor mínimo 1, y habilita su edición bajo los permisos existentes del administrador. Los productos anteriores quedan con `pack_size = null`; no se recalculan existencias, precios ni ventas anteriores.

En **Productos y stock**, crear o editar el producto y completar **Unidades por bulto/pack**. Por ejemplo, un display de alfajores puede tener `pack_size = 24`. El precio de venta, costo y stock siguen correspondiendo a una unidad individual; el tipo de unidad no cambia la cantidad descontada por el POS.

En **+ Reponer**, activar **Ingresar por bultos**. Dos bultos de 24 muestran **= 48 unidades individuales** y guardan 48 en `quantityAdded`, en el historial y en la operación pendiente de sincronizar. Si se desactiva, se ingresan unidades sueltas. El campo de costo de esta pantalla continúa siendo el costo por unidad individual.

En la importación CSV, una cantidad menor que `pack_size × 0.8` se interpreta como bultos si el pack tiene más de una unidad. Ejemplo: para un pack de 24, una cantidad 2 se convierte en 48; una cantidad 24 permanece en 24 unidades. Cada conversión muestra una advertencia en la vista previa. Se puede elegir **Unidades individuales** o **Bultos ×24** en esa fila antes de confirmar; los totales se recalculan. Las cantidades deben ser enteras, sin separadores de miles. El costo del CSV se sigue interpretando por unidad individual.

El analizador de facturas incluye en el prompt los packs del catálogo que coinciden por código o nombre con el comprobante. La respuesta conserva el costo original por bulto y la aplicación lo divide una sola vez entre las unidades del pack. Si la factura indica unidades sueltas, se respeta esa presentación. Por ejemplo, 2 bultos de 24 a $4.800 por bulto incorporan 48 unidades con costo individual de $200. La vista previa permite revisar y ajustar la presentación antes de importar. Los productos nuevos creados desde una factura conservan el tamaño de pack detectado.

El catálogo muestra **Pack ×24**. El POS y la botonera muestran **Stock: 48 u. (2 displays)**; después de vender una unidad muestran **Stock: 47 u. (1 display + 23 u.)**.

### Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador.
2. Crear un producto con código `ALF24`, stock 0, costo individual 200 y pack 24. Guardar y editarlo: el valor 24 debe conservarse. Vaciar el campo debe permitir guardar sin pack; 0 o fracciones deben rechazarse.
3. Entrar a **+ Reponer**, activar **Ingresar por bultos** e ingresar 2. Debe mostrar 48 unidades y un stock resultante de 48. Confirmar: historial y stock deben registrar 48, no 2.
4. Abrir turno y vender una unidad. El stock debe quedar en 47; el importe cobrado es el precio individual.
5. Importar un CSV con `codigo;cantidad` y una fila `ALF24;2`. La vista previa debe advertir la conversión a 48. Cambiar a unidades individuales debe mostrar 2; volver a bultos debe mostrar 48. Una fila con cantidad 24 debe quedar inicialmente en unidades.
6. Analizar una factura que mencione `ALF24` o su nombre, con 2 bultos a $4.800 cada uno. Revisar que proponga 48 unidades y costo individual $200 antes de importar. Probar también un comprobante que indique explícitamente unidades sueltas.

<a id="bajo-margen"></a>

## Bajo margen

Se elimina la selección manual del grupo en el producto. La clasificación compara **precio base de venta** y **costo de la misma unidad**:

`margen bruto (%) = (precio − costo) / precio × 100`

El límite inicial es **10%**. Un margen **estrictamente menor** al límite se guarda como `low_margin`; igual o superior, como `standard`. No es un recargo sobre costo ni ganancia neta. No se usan rubro, categoría, proveedor ni IA para decidirlo. Los bultos y las recetas mantienen sus conversiones y costos actuales.

| Precio | Costo | Margen | Con límite 10% |
| --- | --- | --- | --- |
| $1.000 | $950 | 5% | Bajo margen |
| $1.000 | $900 | 10% | Estándar |
| $1.000 | $800 | 20% | Estándar |
| $1.000 | $1.100 | −10% | Bajo margen, aviso de venta debajo del costo |
| $1.000 | $0 | Sin calcular | No supone 100% de ganancia; costo pendiente |

Precio/costo vacíos, inválidos o costo cero no permiten un cálculo fiable. Se mantiene el contrato de dos grupos: esos productos quedan en `standard` con el aviso **Margen sin calcular**, y el análisis conserva su tratamiento de costo faltante. No se inventa un costo ni se bloquea una venta válida. La comparación usa centavos y porcentaje sin redondear para clasificar; el texto redondeado no debe presentar un valor igual al límite como si fuera matemáticamente menor.

### Accesos y persistencia

- **Productos → Agregar/Editar:** indicador visible junto al costo, sin abrir Más opciones ni elegir un grupo. Cambia al escribir costo/precio y avisa si se vende debajo del costo. Guardar conserva las validaciones actuales.
- **Editar precio** delegado y **Reponer** con nuevo costo muestran el mismo indicador sobre los datos cargados. El servidor calcula la clasificación definitiva con sus valores actuales.
- **Catálogo → Ver solo bajo margen:** conserva filtro y etiquetas, ahora alimentados por el grupo automático persistido.
- **Mi comercio → Datos del comercio → Bajo margen:** permite cambiar el límite por comercio entre 0 y 100, con dos decimales. La sección empieza plegada y el valor por defecto no exige configuración. Lo pueden guardar propietario, administrador o perfiles con **Datos, ticket y margen** (`manage_store`). Cambiar un interruptor de producto ya no existe.
- Guardar el límite reclasifica todos los productos actuales del comercio, incluidos los eliminados/inactivos, sin cambiar precio, costo, stock, receta ni categoría. Otro comercio conserva su propio límite. Cancelar/navegar mantiene los demás borradores; cambiar solo el límite no reinicia el formulario de identidad del comercio.

Las listas de precios mantienen sus reglas. El grupo del producto se determina por el precio base, no por cada precio alternativo de sucursal. Los informes siguen calculando la utilidad con los precios/costos por renglón y separan ambos grupos como antes; no se cambia su fórmula ni la contribución del bajo margen. Los tickets ya sincronizados que tienen grupo/costo guardados conservan esos valores. **Compatibilidad histórica:** las líneas antiguas sin grupo guardado siguen usando la aproximación al producto actual que ya existía en `marginAnalytics`; su agrupación puede variar al reclasificar productos y no debe presentarse como una clasificación histórica verificada. No se reescriben ventas para rellenarla.

### Persistencia y compatibilidad

Dependencia incluida en schema (no ejecutar por separado): una vez `supabase/migrations/202610230001_automatic_margin_groups.sql`, después de `202610220006_complete_permission_profiles.sql` y sus anteriores. 

La migración agrega `retail_stores.low_margin_threshold`, inicializado en 10, y un trigger de productos que calcula `margin_group` al insertar o escribir precio/costo/grupo. Los intentos de enviar un grupo manual no reemplazan el cálculo. Cubre alta manual, precio delegado/masivo, importación de factura, propuesta de precios, CSV y reposición con costo, sin modificar los servicios de propuesta de precios.

El trigger se ejecuta al final de los BEFORE existentes: no obliga al editor de precio a tener permiso completo de productos. El RPC de configuración exige `manage_store`, verifica el valor anterior, conserva idempotencia de reintento y actualiza límite/clasificaciones en una transacción. Ordena los bloqueos de productos como las operaciones de precio/stock, antes del bloqueo de la tienda. No concede UPDATE directo del límite a los clientes. La reclasificación vuelve a escribir el mismo precio para ejecutar el cálculo; no modifica su importe ni produce movimientos de stock.

Cambiar el límite requiere conexión y sincronizar primero las operaciones locales pendientes. Se conserva el porcentaje ingresado si falla. La reposición offline con nuevo costo actualiza la clasificación local usando el límite del comercio disponible en la caché. Una caché anterior sin el campo utiliza 10 hasta actualizar con conexión; no conoce cambios hechos desde otro dispositivo mientras está desconectada. Al sincronizar ventas pendientes, el servidor conserva su validación existente y utiliza su clasificación vigente. No se borra la cola ni se promete configuración remota offline.

### Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, con comercio y productos de prueba después de aplicar la migración:

1. Agregar producto con precio 1000 y costo 950: esperar **Bajo margen automático · 5%**, sin selector/tilde. Guardar y usar Ver solo bajo margen: debe aparecer.
2. Cambiar costo a 900: con límite 10, esperar margen 10% sin bajo margen. Costo 800 muestra 20%; costo 1100 muestra aviso de venta debajo del costo. Verificar que el sistema no corrija precios ni stock por su cuenta. Probar costo cero: **Margen sin calcular**, nunca ganancia del 100%.
3. Mi comercio → Datos del comercio → Bajo margen: debe mostrar 10 inicialmente. Cambiar a 20 y guardar. Un producto de precio 1000/costo 850 (15%) debe pasar a bajo margen sin cambiar sus importes; actualizar otro dispositivo confirma el límite compartido. Otro comercio permanece sin cambios.
4. Cambiar a 0 y 100 en datos de prueba; probar valores negativos, mayores a 100, vacíos y más de dos decimales. Esperar validación visible y sin guardado inválido. Con 0, solo pérdidas clasificables quedan debajo del límite; sin costo no se infiere rentabilidad.
5. Con un perfil de precio únicamente, editar precio para cruzar el límite: debe permitir guardar sin exigir editar productos completos. Los atributos avanzados se conservan. Con reposición y costo autorizado, cambiar costo cruzando el límite: actualiza grupo y stock según la reposición real. Sin autorización no se puede cambiar costo ni el límite.
6. Probar factura/CSV/propuesta de precios y ajuste masivo existentes en datos de prueba. Tras guardar/actualizar, clasificación coherente con costo/precio finales. No se alteran cálculos de costo por bulto ni propuestas de precios. No hacer ventas ni reposiciones de prueba en producción.
7. Preparar un ticket en datos de prueba y comparar antes/después del cambio de límite: los renglones con clasificación guardada mantienen grupo, costo e importes. Verificar métricas separadas y aviso de aproximación para líneas legacy; las listas no cambian de precio ni quedan desasignadas.
8. Desde dos dispositivos, guardar límites distintos sobre el mismo valor anterior: el segundo pide actualizar, sin sobreescritura silenciosa. Reintentar el mismo guardado tras respuesta perdida no cambia importes ni duplica efectos. Probar cambio de precio/costo simultáneo al límite: clasificación final coherente o error transaccional recuperable, sin cambios parciales.
9. Crear borradores de producto y datos del comercio; navegar, abrir/cancelar configuración del límite, y volver: permanecen los demás borradores y el foco del lector no se captura. Probar teclado y ancho móvil; el indicador no recibe foco ni bloquea validaciones.
10. Sin conexión, vender con configuración preparada y reponer con costo si el perfil lo permite: la clasificación local usa el límite cargado y la cola se conserva. Guardar límite sin conexión o con operaciones pendientes muestra error accionable. Recuperar conexión y verificar sincronización, sin descartar operaciones.

Pendientes: aplicación SQL, RLS/permisos reales, navegador/móvil, importaciones, concurrencia, otros dispositivos y sincronización. No se ejecutaron estas pruebas ni una prueba de usabilidad con personas.

<a id="metricas-de-margen"></a>

## Métricas de margen

### Cálculos

- La facturación principal suma los subtotales de artículos estándar. La de bajo margen se muestra por separado.
- El ticket promedio principal divide la facturación estándar entre los tickets que contienen al menos un artículo estándar. En un ticket mixto se considera solo su parte estándar; los tickets exclusivamente de bajo margen no alteran ese promedio.
- Cada grupo tiene su costo de mercadería, ganancia bruta y margen sobre su propia facturación. El ranking principal y los márgenes por distribuidor excluyen bajo margen.
- **Contribución al margen** expresa qué porcentaje de la ganancia bruta total proviene del grupo de bajo margen: `ganancia bruta bajo margen / ganancia bruta total × 100`. No es el margen sobre las ventas de cigarrillos/cargas. Si la ganancia total no es positiva, se muestra como no disponible.
- Los costos faltantes no se interpretan como cero ni como una ganancia del 100%. Si faltan costos en un grupo, se informa que no se puede determinar su rentabilidad y la contribución total. El costo por defecto 0 del catálogo se considera sin informar. Los importes manuales siguen siendo estándar y sin costo conocido; para clasificar una carga u otro servicio, cargarlo como producto del catálogo con su costo correspondiente.
- Los prompts de los reportes y asistentes reciben esta separación y sus porcentajes observados. No se inventa un límite fijo de margen para estos rubros. Las métricas corresponden a las ventas consultadas por cada pantalla.

Ejemplo: un ticket contiene un producto estándar vendido a $100 con costo $60, y un rubro de bajo margen vendido a $1.000 con costo $980. La facturación principal es $100, su ganancia bruta $40 y su margen 40%; el bajo margen factura $1.000, deja $20 y tiene margen 2%. La facturación total es $1.100 y la contribución del bajo margen a la ganancia bruta es 33,3%. El ticket promedio principal es $100.

### Historial y conexión

Las ventas nuevas guardan el grupo y el costo por unidad de cada artículo. Supabase toma esos valores de los productos del comercio al registrar la venta; el cajero no puede definirlos en el pedido. Un cambio posterior de grupo o costo no recalcula esas ventas ya registradas.

Las ventas anteriores a esta migración carecen de esa información: usan la clasificación y el costo actuales del catálogo, y la pantalla lo aclara. Si el producto anterior ya no está disponible para identificarlo, no se inventa un costo o clasificación. Las ventas guardadas offline usan primero el catálogo local; al sincronizar, Supabase confirma la clasificación y costo con los datos del servidor. Los reportes siguientes utilizan esos valores definitivos.

<a id="categorias"></a>

## Categorías

Los usuarios eligen la categoría del producto; no crean categorías nuevas. La fuente de opciones es Supabase, no una lista generada en React. Administración, o un perfil con **Nombres de categorías**, puede personalizar el nombre visible para su comercio. La identidad original se conserva: Tabaco puede mostrarse en lugar de Cigarrillos sin cambiar IDs ni asociaciones. Productos → Más opciones conserva el selector. Sin coincidencia, se utiliza la categoría original **Varios**, aunque su nombre visible se haya personalizado; nunca la primera por orden alfabético.

La ampliación requiere `202610220005_category_labels.sql`, después de la 004. En Mi comercio → Más opciones → Categorías de productos, **Cambiar nombre** abre un editor con **Usar nombre original** para restaurar la etiqueta. Un perfil delegado accede por Mi comercio → Categorías. Los cambios persisten en Supabase para todos los dispositivos de ese comercio. No afectan otros comercios ni contaminan las contribuciones al catálogo comunitario. Se rechazan nombres visibles duplicados (sin distinguir tildes/mayúsculas) y cambios concurrentes sobre un nombre que otra persona ya modificó. 

El catálogo fijo contiene exactamente estas 19 etiquetas:

- Aderezos y conservas
- Aguas y saborizadas
- Alfajores
- Almacen
- Bebidas
- Bebidas Alcoholicas
- Cereales y barras
- Chocolates
- Cigarrillos
- Energizantes y deportivas
- Galletitas y obleas
- Golosinas
- Helados
- Infusiones
- Jugos
- Lacteos
- Panificados y reposteria
- Snacks
- Varios

### Persistencia y compatibilidad

Dependencia incluida en schema (no ejecutar por separado): una vez `supabase/migrations/202610220004_standard_categories.sql`, siguiendo el orden de migraciones del repositorio. 

- Crea el catálogo central y relaciona las categorías del comercio con sus nombres fijos. La lectura permanece disponible para miembros del comercio, incluidos cajeros; no concede administración.
- Carga las 19 categorías en los comercios existentes y en la creación real de comercios nuevos. Reutiliza los IDs de nombres exactos existentes. Mayúsculas, tildes y espacios repetidos se normalizan al buscar equivalencias anteriores.
- Los productos activos e inactivos cuya categoría ya coincide conservan esa asociación. Las variantes reconocidas se vinculan a la etiqueta canónica; los nombres sin equivalencia pasan a Varios. No se infiere una categoría histórica por el nombre del producto ni se recategoriza, por ejemplo, Golosinas a Alfajores automáticamente.
- Guarda las asociaciones modificadas en `retail_private.product_category_migrations` con producto, comercio, ID/nombre anterior, nuevo ID y fecha. Es un respaldo para revisión administrativa por SQL, sin acceso desde clientes. Las filas de categorías antiguas permanecen conservadas y dejan de ofrecerse en los selectores; no se borran datos.
- Revoca la creación/edición directa de categorías por clientes: las identidades canónicas provienen de la base. La ampliación de etiquetas permite personalizar solo el nombre visible mediante RPC autorizada. Un trigger resuelve IDs antiguos del mismo comercio hacia el catálogo fijo o Varios; rechaza IDs ajenos. Una categoría nula al crear se resuelve a Varios.
- No cambia stock, precios, márgenes, ventas, recetas ni las funciones de apertura/cierre. Se conserva el contrato de `retail_create_store` y su creación de propietario/caja; las categorías ahora se aprovisionan desde SQL.

El alta manual comienza con Varios. La consulta del catálogo comunitario y las sugerencias voluntarias usan las opciones reales del comercio; al aplicar una sugerencia, se reconoce el nombre normalizado o una familia conocida, con Varios como alternativa. La factura utiliza el mismo criterio y ya no puede crear categorías. Sus validaciones comprueban Varios antes de aplicar reposiciones cuando también hay altas nuevas. No se modifica la propuesta de precios ni sus cálculos.

La configuración continúa requiriendo conexión. Las categorías ya cargadas siguen disponibles en la caché de venta offline. Tras instalar, actualizar los datos con conexión en cada dispositivo; un dispositivo desconectado puede mantener temporalmente las opciones anteriores. No se vacía la cola ni se reinician borradores para actualizar las categorías. Un cliente anterior ya no podrá crear/renombrar categorías, por decisión del servidor.

### Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, después de instalar la migración y actualizar datos:

1. Entrar como administrador a Mi comercio → Más opciones. Esperado: las 19 categorías, sin Agregar. Cambiar nombre de Cigarrillos a Tabaco y guardar: Productos y otros dispositivos actualizados muestran Tabaco, con los mismos productos e IDs. Usar nombre original y guardar vuelve a Cigarrillos. Repetir con Varios: sigue siendo la alternativa predeterminada. Probar duplicados, Cancelar y dos dispositivos cambiando el mismo nombre: no deben sobrescribirse silenciosamente ni alterar otros borradores.
2. Productos → Agregar producto → Más opciones. Esperado: Varios seleccionada; el selector contiene únicamente las 19 etiquetas. Elegir Alfajores, completar un producto de prueba y guardar: debe conservar Alfajores al reabrir.
3. Crear un producto sin cambiar la categoría. Esperado: Varios, sin configurar previamente ninguna categoría ni abrir IA.
4. En un comercio anterior, comprobar productos con Golosinas y con una variante como Lácteos. Esperado: Golosinas intacta y Lacteos canónica; mismos precios, stock, presentación y atributos. Un nombre de categoría no reconocido debe quedar en Varios y su asociación anterior debe poder consultarse por SQL en el respaldo privado. Comprobar también productos eliminados/restaurados.
5. Crear un comercio de prueba mediante el flujo real. Esperado: 19 categorías provistas automáticamente, sin duplicados y sin una tarea de crear categorías en el inicio guiado; propietario, local y caja inicial conservados.
6. Aplicar voluntariamente datos de un producto existente en la base comunitaria, y revisar una factura de prueba. Esperado: categorías reconocidas respetadas; una sugerencia sin equivalencia queda en Varios, sin crear categorías. Alfajor debe poder resolverse a Alfajores; Bebidas Alcoholicas no debe terminar en Bebidas por una coincidencia parcial.
7. Con permisos de cajero/supervisor, confirmar que la lectura para vender sigue disponible. En backend, comprobar que ni estos perfiles ni administradores pueden insertar/renombrar categorías por REST, y que no se aceptan IDs pertenecientes a otro comercio.
8. Con datos previamente cargados, comprobar venta offline preparada y posterior sincronización. Una selección válida de categoría y otros borradores no deben reiniciarse al navegar. No hacer ventas de prueba en producción.

Pendientes: revisión visual en navegador/móvil, instalación SQL, RLS, creación real de comercio, importación, otros dispositivos y sincronización. No se realizaron estas pruebas ni una prueba de usabilidad con personas.

<a id="eliminar-y-restaurar"></a>

## Eliminar y restaurar

Administración puede ir a **Productos → Catálogo y stock → Eliminar** en la fila del producto. La confirmación permite un motivo opcional. El producto deja de aparecer en el catálogo activo y en Vender; se conserva la fila original con sus atributos, stock, recetas y referencias históricas. No se borran ventas, movimientos, comprobantes ni precios de listas. El código sigue reservado al mismo producto.

**Productos eliminados**, junto a los filtros del catálogo, muestra producto/código, acción, fecha, usuario y motivo. Permite buscar, cargar más registros y restaurar. Restaurar activa el mismo ID con sus datos actuales: no copia una versión histórica, no suma stock y registra otra acción. Los productos archivados antes de instalar el historial aparecen como anteriores al registro, sin inventar fecha ni usuario.

### Persistencia y compatibilidad

Dependencia incluida en schema (no ejecutar por separado): una vez la migración local `supabase/migrations/202610220003_product_deletion_history.sql`, después de las migraciones anteriores (requiere la 202610220001 de composiciones).  La migración crea la tabla de auditoría, su política RLS de lectura administrativa, un trigger que registra cambios de `active` y un RPC para eliminar/restaurar. Los clientes no pueden escribir ni borrar el historial. Las comprobaciones de rol se ejecutan también en el servidor; un perfil delegado de cajero/supervisor solo puede realizarla con delete_products, según la ampliación vigente de perfiles.

Cada evento conserva una instantánea completa del producto en la base de datos. La interfaz consulta un resumen paginado de 50 eventos. Los cambios se registran en la misma transacción que la eliminación/restauración. El identificador de solicitud se conserva al reintentar sin modificar el formulario: una respuesta perdida no debe duplicar el evento. Un nuevo intento tras recargar tampoco puede eliminar dos veces un producto ya inactivo. Una edición abierta antes de eliminarlo no puede reactivarlo al guardar.

Eliminar/restaurar requiere conexión y una cola local sincronizada. No se cambia la venta offline existente; otro dispositivo sin conexión puede conservar un catálogo anterior hasta sincronizar. No se promete invalidación instantánea de esos dispositivos. Una venta pendiente contra un producto eliminado debe resolverse mediante el flujo de sincronización existente; no se descarta automáticamente. Los borradores de venta y formularios se conservan al navegar.

Un ingrediente no puede eliminarse mientras lo use un combo/atado activo: el error identifica las dependencias y pide desvincularlas o eliminar primero esos productos. Para restaurar una receta deben estar activos sus componentes con stock propio. No se convierte stock ni se altera la configuración de pancho/atado/suelto.

### Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, usando un comercio de prueba y después de instalar la migración:

1. Como administrador, buscar un producto, pulsar Eliminar y Cancelar: sigue visible, sin evento nuevo. Repetir con motivo y confirmar: desaparece de Productos/Vender; la búsqueda en Productos eliminados muestra nombre, código, usuario, fecha y motivo.
2. Restaurar desde el historial y confirmar: reaparece una sola vez con el mismo ID, código, stock, precio y atributos; aparece el evento Restaurado. Ventas y movimientos anteriores permanecen intactos.
3. Probar un producto con listas, presentación, vencimiento y otros atributos avanzados: eliminar/restaurar debe conservarlos. No hacer ventas de prueba en producción.
4. Intentar eliminar pan o salchicha de un pancho activo, o el suelto de un atado: debe impedirlo y explicar la dependencia. En datos de prueba, eliminar primero el combo, luego el ingrediente; restaurar primero el ingrediente y luego el combo.
5. Abrir la eliminación, navegar a otra pantalla y volver: el motivo sigue escrito y no captura teclas fuera de Productos. Verificar foco, teclado y acciones en móvil. Cancelar vuelve al catálogo.
6. Sin conexión, eliminar/restaurar/consultar historial muestra un error y no finge guardar. Con operaciones locales pendientes se pide sincronizar. Recuperar conexión y reintentar sin cambiar el formulario: un único evento, incluso si se perdió la respuesta anterior.
7. Desde dos dispositivos, eliminar el mismo producto: solo uno realiza la baja; el otro recibe el estado actualizado/error. Una edición previa no puede reactivarlo. Validar las carreras con venta y stock sin ventas reales de producción.
8. Como cajero/supervisor sin `delete_products`, incluso con stock/precios, no debe poder eliminar/restaurar ni consultar su historial. Habilitar `delete_products` y comprobar las acciones delegadas dentro del comercio. Otro comercio no puede consultar el historial ajeno.
9. Con más de 50 eventos, buscar y pulsar Ver más registros: deben respetarse orden y paginación. Actualizar tras cambios de otro administrador. Los archivados anteriores no muestran fechas/autores inventados.

