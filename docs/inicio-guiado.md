# Inicio guiado del comercio

## Aplicación y compatibilidad

Revisar y aplicar `supabase/migrations/202610190001_store_onboarding.sql` en la base del proyecto correcto, después de las migraciones anteriores del repositorio y antes de publicar esta versión del frontend. El archivo es transaccional. No se aplicó desde esta tarea.

La migración no inserta filas para comercios anteriores. Un trigger crea el estado solo al insertar un comercio nuevo. Sin fila no se abre el asistente, independientemente de cuántos productos tenga el comercio. Las tiendas anteriores conservan su operación. Antes de aplicar la migración, la creación de nuevos comercios muestra un error accionable; no recurre a una creación sin protección contra reintentos.

`retail_create_store_once` llama al `retail_create_store` existente. Este último crea propietario, Golosinas/Bebidas/Snacks/Varios y Caja principal. Los triggers existentes crean Principal, General/Otras ventas y asignan la sucursal de la caja. El asistente no vuelve a insertar esos recursos. Si falta alguno, permite salir a Mi comercio y usar los formularios autorizados existentes.

## Avance y permisos

`retail_store_onboarding` guarda el paso, la confirmación de datos, la omisión, la finalización y una versión. Solo owner/admin pueden leerlo por RLS. Las escrituras pasan por un RPC que verifica el rol, bloquea la fila y exige la versión conocida. Un conflicto entre dispositivos requiere actualizar/reintentar; no se repite automáticamente la escritura.

El paso indica dónde retomar, no acredita tareas. Finalizar exige datos confirmados y un turno propio abierto en una caja activa. Si no hay productos activos, se guarda la omisión y se deja el paso de productos pendiente, sin `completed_at`. Omitir productos no crea artículos de ejemplo. Completar el inicio tampoco abre turnos para otros operadores.

Los borradores se conservan al retroceder o salir y retomar dentro de la sesión montada. Tras recargar o cambiar de dispositivo se recuperan el avance compartido y los registros guardados, no los campos todavía sin guardar. `localStorage` solo conserva la clave de solicitud de creación mientras falta una respuesta; no es la fuente del avance.

## Reintentos y conexión

- Creación: clave por solicitud, registrada en el servidor; bloqueo por usuario. Dos dispositivos del mismo propietario que creen el mismo nombre mientras su inicio siga pendiente reciben el mismo comercio. Tras completar ese inicio se permite crear otro con ese nombre.
- Producto: formulario básico existente, con la restricción única `(store_id, code)`. Repetir un envío con el mismo código no inserta otro producto. Si se pierde la respuesta, actualizar el catálogo y continuar con el producto guardado; no cambiar el código para eludir la restricción. No se agregó una operación de stock ni se alteró el precio.
- Turno: wrapper online que reutiliza `retail_open_shift`, sus validaciones y el índice único de turno abierto por caja. Los reintentos devuelven el turno propio ya abierto; una caja ocupada por otra persona se rechaza. Se impide abrir desde este recorrido otro turno propio en una caja distinta. Si falla guardar el avance después de abrir, se puede continuar sin repetir la apertura.
- La apertura guiada pasa por la capa de configuración online y refresca las cachés existentes. El inicio guiado no promete funcionar offline. La venta offline sigue usando su recorrido habitual.
- No se solicitan automáticamente permisos de cámara, instalación o notificaciones. Los accesos existentes siguen en Mi comercio. Un enlace de aviso tiene prioridad sobre el inicio automático; el recorrido queda disponible para retomar.

## Guía de Pruebas manuales

Usar http://localhost:3001/ con cuentas y datos de prueba, después de aplicar la migración en un entorno de prueba. No realizar ventas de prueba en producción.

1. Crear un comercio: comprobar una sucursal Principal, una Caja principal, cuatro categorías y los dos registros existentes. Confirmar el nombre, guardar un producto con código único y abrir turno con $2.000. Debe aparecer Vender, en el mismo contexto, sin pedir listas, equipo ni IA.
2. Pulsar Configurar después en cada paso, recargar y retomar desde Mi comercio. Los registros guardados y el avance deben mantenerse, sin acreditar tareas omitidas. Omitir productos y abrir turno debe dejar el acceso para retomar productos.
3. Escribir un producto sin guardar, retroceder y volver: el borrador debe conservarse. Probar el acceso secundario a CSV/Excel y cancelar sin crear artículos de ejemplo.
4. Abrir el mismo comercio con el mismo administrador en otro dispositivo. Avanzar en uno y enviar desde el otro: debe informar conflicto, permitir actualizar y no duplicar recursos. Enviar simultáneamente la apertura de la misma caja: debe existir un solo turno abierto.
5. Cortar la red antes de confirmar/guardar/abrir: no debe avanzar. Simular pérdida de respuesta después del guardado, reconectar y actualizar: reutilizar tienda/producto/turno existentes. Verificar también doble clic y recarga entre pasos.
6. Visitar una tienda anterior, incluso sin productos: no debe aparecer onboarding. Ingresar como cajero: no debe aparecer el recorrido ni tener permiso para leer/modificar su estado.
7. Con un turno propio abierto, retomar el paso final: debe ofrecer Continuar a Vender sin apertura adicional. Con una caja ocupada por otra persona, debe impedir abrirla y permitir elegir otra caja autorizada.
8. Abrir un aviso PWA: debe ir a la sección solicitada. Durante el recorrido no deben acumularse diálogos de permisos. Verificar teclado, foco y controles ocultos en escritorio y móvil.

La migración, concurrencia, backend, navegador, PWA y dispositivos requieren estas comprobaciones manuales; no se consideran validados por TypeScript.
