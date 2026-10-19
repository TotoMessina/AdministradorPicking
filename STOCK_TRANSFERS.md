# Transferencias entre sucursales

Aplicar [202610190003_stock_transfers.sql](supabase/migrations/202610190003_stock_transfers.sql) en Supabase después de las migraciones anteriores y publicar el frontend actualizado. No requiere variables de entorno nuevas.

El administrador accede desde **Productos y stock → Transferencias**. Elige sucursal de origen y destino, busca productos por nombre/código, los agrega y completa cantidades en unidades individuales. Repetir **Agregar** sobre el mismo producto aumenta su cantidad. El lector puede agregar un código exacto mediante Enter. Se permiten hasta 200 productos distintos y cantidades enteras positivas de hasta 1.000.000 por producto; las notas son opcionales y admiten 2.000 caracteres.

**Registrar transferencia pendiente** crea un registro de traslado físico. **Confirmar** marca su recepción/confirmación administrativa; **Cancelar** anula un pendiente y conserva su historial. Una transferencia confirmada no puede cancelarse y una cancelada no puede confirmarse. Se guardan creador/fecha y revisor/fecha. Los nombres de los productos se toman del catálogo al crear el registro y quedan como fotografía histórica.

El historial muestra origen, destino, fecha, artículos/cantidades, notas y estado, con filtro por **Todas / Pendientes / Confirmadas / Canceladas**. Se muestran 25 registros por vez con opción de cargar más. **Actualizar historial** vuelve a consultar, y al entrar en la subpestaña o recuperar foco/conexión se refrescan los datos. El borrador se conserva al pasar entre subpestañas del catálogo mientras el componente permanece abierto.

## Inventario y permisos

Las transferencias son exclusivamente registros internos. Crear, confirmar o cancelar no llama a reposición, no actualiza `retail_products.stock` y no genera entradas/salidas de inventario. El stock sigue siendo compartido por la tienda; no se calcula disponibilidad por sucursal ni se comprueba una existencia por local que el sistema no lleva.

Las funciones comprueban que las dos sucursales sean diferentes y pertenezcan al mismo comercio. Cada producto debe existir, estar activo al crear el registro y pertenecer al comercio. Se ignoran nombres proporcionados por el cliente y se guarda el nombre real del catálogo. Se rechazan productos repetidos en llamadas directas: hay que enviar una sola línea con su cantidad total.

La interfaz se muestra solo a propietarios/administradores. En el servidor, cualquier miembro puede leer y crear transferencias de su comercio mediante la RPC; únicamente propietarios/administradores pueden confirmar o cancelar. La escritura directa a la tabla se restringe para mantener la validación y los datos de auditoría. No se habilita borrado de registros.

La creación usa un identificador opcional de solicitud para que reintentar el mismo formulario después de un fallo de red no duplique la transferencia. La RPC sigue aceptando los cinco parámetros principales; `p_request` es opcional. Confirmación/cancelación bloquean la fila y son idempotentes: repetir una decisión ya guardada devuelve su identificador. Una revisión simultánea conserva la primera decisión válida.

La consulta y las acciones requieren conexión. No se encolan transferencias como movimientos de stock offline. Un error conserva el formulario para reintentar; si la operación se guardó pero falla la carga del historial, usar **Actualizar historial**. La consulta del historial no fuerza la recarga de todos los datos offline del comercio.

## Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador. Tener dos sucursales **Centro** y **Barrio** y un producto con stock total **100**.
2. Entrar en **Productos y stock → Transferencias**. Seleccionar Centro como origen y Barrio como destino. Buscar el producto, agregarlo, ingresar **12** unidades y una nota. Registrar la transferencia.
3. Debe aparecer **Pendiente** en el historial con sucursales, producto, 12 unidades, nota y fecha. El stock total debe seguir en **100**.
4. Pulsar **Confirmar**: debe pasar a **Confirmada**, registrar el revisor/fecha y conservar stock **100**. Repetir la confirmación por API o desde dos sesiones no debe duplicar registros ni modificar inventario.
5. Crear otra transferencia y pulsar **Cancelar**: debe mostrarse **Cancelada**, conservar el registro y el stock **100**. No debe poder confirmarse después. Las confirmadas tampoco deben ofrecer cancelación.
6. Probar los filtros de estado, abrir el detalle de productos y actualizar el historial. Cambiar entre Listas de precios y Transferencias antes de guardar debe conservar el borrador dentro de Catálogo.
7. Intentar origen igual a destino, cantidad cero, fraccionaria, negativa o superior a 1.000.000: el formulario/RPC deben impedir el registro. Las llamadas con sucursales o productos de otro comercio también deben rechazarse.
8. Con una sola sucursal, debe indicarse que hacen falta dos. Como cajero no debe aparecer la subpestaña; una llamada autenticada de cajero a confirmar/cancelar debe ser rechazada, conservando la lectura/creación que le corresponden como miembro.
9. Desconectar antes de crear: debe mostrarse el error y conservar productos/cantidades/notas. Reconectar y reintentar con los mismos datos no debe duplicar la solicitud si el servidor ya la había guardado.

Verificación técnica: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar build. Las pruebas de RPC/RLS requieren instalar la migración y usar las cuentas indicadas.
