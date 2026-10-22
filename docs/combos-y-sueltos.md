# Combos fijos y venta por paquete/suelto

## Cómo configurarlos

En **Productos → Catálogo y stock**, administración dispone de **Crear combo o paquete**, junto a Agregar producto. Guarda primero los datos del producto con stock propio 0 y abre directamente sus componentes. Para productos existentes, usar **Combo / sueltos** en su fila. Cada producto conserva su precio, costo, código, categoría, grupo de margen y listas de precios. El cajero vende por búsqueda, lector o botonera sin elegir ingredientes ni abrir otro asistente.

Si se cancela el primer formulario, no se crea el producto. Después de **Crear y elegir componentes**, el producto ya existe: **Configurar después** lo conserva con stock 0 y sin composición; se retoma desde Combo / sueltos. Un error al guardar componentes conserva su borrador y no vuelve a crear el producto.

### Pancho

1. Crear o reutilizar **Pan de pancho** y **Salchicha**, con stock contado en unidades. No crear duplicados si ya existen.
2. Pulsar **Crear combo o paquete** y completar **Pancho**, con su código, precio y costo. El stock propio queda en **0**. Pulsar **Crear y elegir componentes**.
3. En los componentes que se abren, agregar 1 Pan de pancho y 1 Salchicha y guardar. Si el producto ya existía, entrar desde **Combo / sueltos → Consume otros productos**.
4. Con 10 panes y 8 salchichas, se muestran **8 panchos disponibles**. Vender 2 panchos consume 2 panes y 2 salchichas: quedan 8 panes, 6 salchichas y disponibilidad para 6 panchos. No se crea un segundo stock de panchos.

### Cigarrillos sueltos y paquete

**Dirección correcta:** el atado consume 10 o 20 cigarrillos individuales; vender un suelto consume 1 cigarrillo. La composición de un suelto que consume 10 atados está invertida.

**Si hoy contás stock en atados:**

1. En la fila del **atado**, abrir **Combo / sueltos → Configurar cigarrillos sueltos desde este atado**. Sincronizar las operaciones de todos los dispositivos antes de convertir.
2. Indicar explícitamente cuántos cigarrillos trae cada atado; no se infiere del nombre ni de las unidades por bulto.
3. Elegir crear el producto suelto o reutilizar uno existente. Se admite un producto sin stock propio o uno cuya composición esté vinculada solamente a ese atado, para corregir una relación inversa. No se suman stocks que podrían representar las mismas existencias.
4. Revisar nombre/código interno si es nuevo, precio y costo por cigarrillo. El costo vacío en un producto nuevo propone costo del atado dividido por unidades, redondeado a centavos; en uno existente conserva su costo salvo edición explícita.
5. Revisar **5 atados × 10 = 50 cigarrillos** y pulsar **Convertir stock y habilitar sueltos**. Es una conversión explícita y atómica: el atado conserva su ID, código, precio y costo, pasa a descontar 10 unidades del suelto y deja de tener un segundo stock físico. No se cambian ventas anteriores. Si ya había un suelto inversamente vinculado se conserva su ID y se corrige la relación, sin duplicarlo.
6. Reponer desde el producto **suelto**, eligiendo bultos/atados. Su `pack_size` queda en 10 (o el valor indicado) y la unidad en unidad individual. Dos atados suman 20 cigarrillos. El suelto puede tener precio distinto del precio del atado dividido por 10.

Si el atado es usado por otros productos compuestos, hay que revisar esas composiciones antes de convertir: no se reescriben otras recetas automáticamente. La operación es una conversión inicial, no una reposición repetible; el registro administrativo conserva la cantidad de atados trasladada, los cigarrillos resultantes, la solicitud y el actor. Se registran los deltas de ambos productos en los movimientos de stock. Al reutilizar un producto se mantienen los demás atributos; al crear uno, se copian categoría, marca, proveedor, etiquetas, grupo de margen y vencimiento del atado, sin copiar su código de proveedor. El costo del atado sigue siendo independiente del costo unitario y se edita según las reglas habituales.

**Si ya contabas stock en cigarrillos individuales**, no hace falta convertir: el armado manual original sigue disponible:

1. Usar **Cigarrillo [marca/presentación] suelto** como producto con stock propio. El stock, costo y precio de ese producto se expresan por cigarrillo. Código interno propio; cada marca/presentación mantiene sus existencias.
2. Si la reposición se carga por paquetes de 20, configurar **Unidades por bulto/pack = 20** en ese producto. Ingresar 5 bultos suma 100 cigarrillos. Si se compra por cartón, ese campo debe indicar sus unidades individuales reales; no determina cuántos cigarrillos descuenta el paquete vendido.
3. Usar **Crear combo o paquete** para crear **Paquete [misma marca] ×20**, con código de barras del paquete y precio/costo del paquete. No reutilizar el mismo código del suelto. El stock propio queda en **0**.
4. Al pulsar **Crear y elegir componentes**, elegir 20 unidades del producto suelto y guardar. Quedan dos productos vendibles con precios independientes y una única existencia física. Configurar Bajo margen en los productos que correspondan; no se copia ni cambia el grupo automáticamente.
5. Con 100 cigarrillos, vender 1 paquete y 3 sueltos deja **77 cigarrillos**, disponibilidad para **3 paquetes completos** y posibilidad de vender los restantes como sueltos. No se ingresan fracciones de paquete ni se necesita registrar una apertura de paquete para vender un cigarrillo.

Los productos vinculados no muestran Reponer. Se reponen sus componentes, también desde CSV o facturas/remitos: vincular el ingreso al producto que guarda las unidades físicas, con la conversión de bultos que corresponda. Una fila CSV que intenta reponer un combo queda inválida con una explicación; no inventa ni reparte stock. Los flujos de facturas y propuestas de precios no cambian sus cálculos.

## Datos, límites y compatibilidad

- Composición fija: hasta 30 componentes, unidades enteras entre 1 y 1.000.000 por componente. No permite repetidos, autorreferencias, componentes de otra tienda, productos inactivos ni composiciones anidadas. Las variantes/adicionales elegidos durante la venta quedan fuera de este paso.
- Crear o cambiar composición necesita conexión y operaciones locales sincronizadas. Una selección inválida o un error mantiene el borrador. Cambiar de pantalla mantiene el editor montado; Cancelar descarta solo ese borrador.
- El producto vinculado guarda stock físico 0; su `stock` expuesto al cliente es disponibilidad calculada. Editar nombre, precio u otros atributos conserva la composición y no escribe esa disponibilidad como stock. Precio y costo siguen siendo explícitos, no se recalculan al cambiar costos de ingredientes.
- El editor genérico de composición no convierte existencias previas: si un producto tiene stock propio distinto de 0 no permite vincularlo. Para cigarrillos contados en atados, usar la conversión explícita descrita arriba, con vista previa y registro administrativo. No se multiplican ni borran stocks al cambiar una selección visual ni al instalar la migración.
- Volver a Stock propio deja stock 0, sin trasladar ni borrar existencias de componentes. No se puede archivar un componente usado por una composición activa ni eliminar uno referenciado. Los productos anteriores quedan con composición vacía y conservan sus existencias.
- El carrito suma el consumo de todos sus renglones antes de cobrar: combos, paquetes, sueltos y componentes vendidos directamente compiten por el mismo stock. La validación autoritativa de Supabase descuenta todo o nada y conserva el identificador de venta/reintentos.
- Cada venta guarda una copia de la composición utilizada. Offline preparado aplica el mismo consumo local, conserva esa copia en la cola y la envía a la RPC existente. Si otro dispositivo cambia la composición, la sincronización señala un conflicto y conserva la operación: no consume otra receta ni resuelve el conflicto automáticamente.
- Un cliente anterior puede seguir vendiendo productos de stock propio. Para vender una composición necesita actualizar app y catálogo; el servidor rechaza ventas sin la copia correspondiente. Antes de convertir un producto ya utilizado, coordinar la sincronización de los otros dispositivos para evitar conflictos con ventas pendientes.
- La valoración de capital y las sugerencias de reposición cuentan productos con stock propio y utilizan los componentes registrados en las ventas. No suman otra vez las disponibilidades virtuales del combo. Los ingresos, márgenes estándar/bajo margen y tickets siguen considerando el producto vendido con su precio y costo configurados. El historial anterior sin composición no se reinterpreta con recetas actuales.
- Las transferencias existentes siguen siendo constancias internas y no alteran el stock global; no se introduce stock por sucursal ni se cambian sus estados.

## Migración local

Aplicar **[202610220001_product_compositions.sql](../supabase/migrations/202610220001_product_compositions.sql)** en el entorno correspondiente, después de las migraciones previas, incluida `202610210004_delegated_catalog_actions.sql`. Hacerlo antes de configurar o vender composiciones. No se ejecutó SQL remoto durante esta implementación.

Para el flujo de conversión desde atados, aplicar después **[202610220002_loose_cigarettes.sql](../supabase/migrations/202610220002_loose_cigarettes.sql)**. Si la 001 ya está aplicada y el pancho funciona, no repetirla: la 002 agrega la RPC administrativa y el registro de conversiones con RLS y permisos propios. No cambia el checkout ni la composición del pancho y no ejecuta ninguna conversión al instalarse.

La conversión necesita conexión y cola local vacía; valida stock, nombre/código, precio, costo y composiciones contra la versión revisada. La solicitud conserva su ID al reintentar sin cambiar datos. La auditoría impide convertir otra vez el mismo atado; un reintento de la misma solicitud devuelve el producto creado sin repetir stocks, movimientos ni creaciones. Una respuesta de red perdida puede corresponder a una operación ya confirmada: reintentar sin cambiar los datos. Cambiar la receta mientras otros dispositivos conservan operaciones offline antiguas puede generar conflictos explícitos; no se reinterpretan ventas pendientes con la nueva relación.

La migración agrega `retail_products.stock_components` con valor predeterminado `[]`, la RPC administrativa `retail_save_product_composition` y validaciones de integridad. Actualiza el cuerpo de `retail_checkout` conservando su firma y validaciones de caja, precio, lista, registro y pagos. Las protecciones existentes de permisos, sucursal y captura de margen siguen como triggers; no reemplaza RLS ni concede escritura directa del campo de composición a usuarios autenticados. La sincronización sigue usando la RPC existente y sus recibos.

Configurar composición y cobrar toman el mismo bloqueo por comercio antes de bloquear productos en orden estable. Esto prioriza integridad al cobrar desde varias cajas y serializa esos cobros/configuraciones dentro de cada comercio; su comportamiento y rendimiento concurrente requieren validación en backend. TypeScript no comprueba SQL, RLS ni bloqueos.

## Guía de Pruebas — pendiente manual

En **http://localhost:3001/**, con la migración aplicada en un comercio de pruebas; no hacer ventas ni ajustes ficticios en producción:

1. **Compatibilidad:** vender un producto normal con stock 10. Esperado: queda 9; lector, F1–F4, pagos mixtos, listas, registro y cierre siguen igual.
2. **Pancho:** preparar 10 panes y 8 salchichas y configurar el pancho según la guía. Esperado: 8 disponibles. Vender 2: 8 panes, 6 salchichas y 6 panchos disponibles. Ticket y total contienen 2 panchos, sin cobrar ingredientes como renglones adicionales.
3. **Stock compartido en el carrito:** con 3 panes y 3 salchichas, agregar 2 panchos y 1 pan. Esperado: no admite otro pancho ni otro pan; quitar un pancho libera sus componentes. Repetir por lector, botonera, + y cantidad escrita.
4. **Paquete y suelto:** stock 100 cigarrillos y composición de paquete ×20. Vender 1 paquete + 3 sueltos con sus precios propios. Esperado: stock 77, disponibilidad 3 paquetes y total igual a precio del paquete + tres precios de suelto. Con 20 cigarrillos, un paquete en el carrito impide agregar un suelto; con un suelto impide agregar un paquete.
5. **Reposición:** reponer 2 bultos ×20 sobre el producto suelto. Esperado: suma 40 cigarrillos y recalcula los paquetes disponibles; no duplica stock. Reponer pan/salchicha actualiza disponibilidad del pancho. CSV con un combo debe mostrar su fila inválida; factura/remito se vincula al componente físico correspondiente.
6. **Edición y borradores:** editar solo precio de un compuesto, guardar y recargar. Esperado: composición, disponibilidad, atributos y componentes intactos. En Composición, modificar cantidades, navegar y volver: borrador conservado. Cancelar no cambia la receta ni otros borradores. Una cantidad vacía, cero o fraccionaria debe impedir guardar con validación visible; elegir Stock propio oculta/deshabilita esos campos sin validaciones invisibles.
7. **Integridad/permisos:** como administrador intentar repetir componentes, vincular un compuesto a otro, autorreferencia, otro comercio o producto inactivo mediante RPC. Esperado: rechazo sin cambios parciales. Intentar archivar un componente activo utilizado: rechazo con explicación. Cajero/supervisor no configura composiciones mediante UI ni RPC, aunque tenga permiso de reponer; sí puede venderlas si tiene permiso de venta.
8. **Offline:** preparar catálogo, permisos y turno con conexión; desconectar, vender 1 pancho y un paquete + sueltos. Esperado: consumo correcto local, cola y ticket conservados. Recargar aún offline y sincronizar después: un solo descuento y una sola venta por identificador. Reintentar una respuesta perdida no debe repetir consumos.
9. **Otro dispositivo/conflicto:** con una venta offline pendiente, cambiar la receta desde otro dispositivo conectado y reconectar el primero. Esperado: conflicto explícito y operación conservada; no debe consumir ingredientes nuevos ni marcarse sincronizada. Sincronizar antes de cambiar receta en el propio dispositivo debe ser requisito.
10. **Concurrencia/red:** dos cajas intentan vender el último paquete/pancho. Esperado: solo una venta confirmada; la otra informa falta de stock sin descuento parcial. Cortar red durante guardar composición y reintentar la misma: sin duplicados. Guardados simultáneos con composiciones distintas deben pedir actualizar a quien parte de una versión anterior.
11. **Informes y móvil:** revisar capital y predicción después de ventas compuestas: valorar componentes una vez y contar su consumo; márgenes usan el SKU vendido y su grupo. En móvil y con teclado, comprobar foco, campos, botón Guardar y Cancelar; las pantallas ocultas no capturan lector ni validan.

No se realizaron estas pruebas de navegador, dispositivo, backend ni concurrencia durante la implementación. La comprobación de código permitida es `npx tsc --noEmit -p tsconfig.app.json`; SQL/RLS y aplicación efectiva de la migración requieren validación independiente.

### Conversión de atados a cigarrillos — pendiente manual

Con la migración 002 aplicada, en **http://localhost:3001/** y un comercio de pruebas:

1. Preparar un atado con stock 5, precio/costo conocidos. Abrir su fila → Combo / sueltos → Configurar cigarrillos sueltos desde este atado. Indicar 10 unidades y precio del suelto. Esperado: vista previa 50 cigarrillos y costo unitario propuesto; nada cambia antes de guardar.
2. Guardar. Esperado: un suelto con stock 50 y `pack_size=10`; atado disponible 5 con la misma identidad/precio/costo. Vender un suelto: stock 49 y 4 atados completos disponibles. Vender un atado: stock 39. Con 9 cigarrillos no se admite otro atado completo. Repetir con un atado de 20.
3. Reponer desde el suelto por 2 bultos/atados de 10. Esperado: suma 20 cigarrillos, conserva el precio del atado y no convierte el stock otra vez. No reponer el producto compuesto del atado.
4. Preparar un suelto mal vinculado que consume 10 unidades de ese atado, sin stock físico propio. Elegirlo en Producto suelto al convertir desde el atado. Esperado: conserva su ID, no se crea otro suelto, desaparece la relación inversa y el atado consume 10 cigarrillos de ese producto. Otras composiciones permanecen intactas; si consumen el atado, deben impedir la conversión hasta revisarlas.
5. Volver entre componentes/conversión y navegar a otra pantalla sin guardar. Esperado: borradores conservados y ningún movimiento. Elegir producto existente oculta y deshabilita los campos de alta, sin validaciones invisibles; revisar teclado/foco en escritorio y móvil.
6. Cortar la respuesta de red después del guardado y reintentar la misma solicitud sin cambiar campos; repetir desde dos dispositivos. Esperado: una conversión, un producto suelto y un par de movimientos de stock. El segundo intento con datos distintos debe pedir actualizar, sin cambios parciales. Una cola local pendiente u operar sin conexión debe bloquear la configuración y conservar el borrador.
7. Como cajero/supervisor, intentar la RPC: rechazo sin cambios. Como administrador intentar productos de otro comercio, producto ya convertido, producto suelto con stock propio positivo, cantidad inválida y código interno repetido: rechazo sin perder stock ni crear registros parciales. Verificar RLS del registro de conversiones con ambas cuentas.
8. Repetir una venta de pancho antes y después: mismo consumo de pan y salchicha. Preparar la nueva configuración online y vender atado/suelto offline: consumo en unidades y una sola sincronización. Las ventas históricas no se reescriben ni se proyectan retroactivamente como consumo del SKU nuevo; revisar por separado comparaciones de rotación que crucen esa conversión.

Comprobación de código de este ajuste: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se aplicó la migración 002 ni se ejecutaron pruebas de navegador, backend, dispositivos, builds u otras pruebas automatizadas.

Comprobación ejecutada al finalizar: `npx tsc --noEmit -p tsconfig.app.json`, sin errores (salida 0). No se ejecutaron builds ni otras pruebas automatizadas. No se modificaron `invoicePricingService.ts`, `InvoicePriceProposal.tsx` ni las pruebas automatizadas locales preexistentes.
