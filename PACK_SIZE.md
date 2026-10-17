# Bultos y unidades

Ejecutar en Supabase la migración pendiente [202610160003_pack_size.sql](supabase/migrations/202610160003_pack_size.sql) antes de publicar el frontend. Agrega un campo opcional, con valor mínimo 1, y habilita su edición bajo los permisos existentes del administrador. Los productos anteriores quedan con `pack_size = null`; no se recalculan existencias, precios ni ventas anteriores.

En **Productos y stock**, crear o editar el producto y completar **Unidades por bulto/pack**. Por ejemplo, un display de alfajores puede tener `pack_size = 24`. El precio de venta, costo y stock siguen correspondiendo a una unidad individual; el tipo de unidad no cambia la cantidad descontada por el POS.

En **+ Reponer**, activar **Ingresar por bultos**. Dos bultos de 24 muestran **= 48 unidades individuales** y guardan 48 en `quantityAdded`, en el historial y en la operación pendiente de sincronizar. Si se desactiva, se ingresan unidades sueltas. El campo de costo de esta pantalla continúa siendo el costo por unidad individual.

En la importación CSV, una cantidad menor que `pack_size × 0.8` se interpreta como bultos si el pack tiene más de una unidad. Ejemplo: para un pack de 24, una cantidad 2 se convierte en 48; una cantidad 24 permanece en 24 unidades. Cada conversión muestra una advertencia en la vista previa. Se puede elegir **Unidades individuales** o **Bultos ×24** en esa fila antes de confirmar; los totales se recalculan. Las cantidades deben ser enteras, sin separadores de miles. El costo del CSV se sigue interpretando por unidad individual.

El analizador de facturas incluye en el prompt los packs del catálogo que coinciden por código o nombre con el comprobante. La respuesta conserva el costo original por bulto y la aplicación lo divide una sola vez entre las unidades del pack. Si la factura indica unidades sueltas, se respeta esa presentación. Por ejemplo, 2 bultos de 24 a $4.800 por bulto incorporan 48 unidades con costo individual de $200. La vista previa permite revisar y ajustar la presentación antes de importar. Los productos nuevos creados desde una factura conservan el tamaño de pack detectado.

El catálogo muestra **Pack ×24**. El POS y la botonera muestran **Stock: 48 u. (2 displays)**; después de vender una unidad muestran **Stock: 47 u. (1 display + 23 u.)**.

## Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador.
2. Crear un producto con código `ALF24`, stock 0, costo individual 200 y pack 24. Guardar y editarlo: el valor 24 debe conservarse. Vaciar el campo debe permitir guardar sin pack; 0 o fracciones deben rechazarse.
3. Entrar a **+ Reponer**, activar **Ingresar por bultos** e ingresar 2. Debe mostrar 48 unidades y un stock resultante de 48. Confirmar: historial y stock deben registrar 48, no 2.
4. Abrir turno y vender una unidad. El stock debe quedar en 47; el importe cobrado es el precio individual.
5. Importar un CSV con `codigo;cantidad` y una fila `ALF24;2`. La vista previa debe advertir la conversión a 48. Cambiar a unidades individuales debe mostrar 2; volver a bultos debe mostrar 48. Una fila con cantidad 24 debe quedar inicialmente en unidades.
6. Analizar una factura que mencione `ALF24` o su nombre, con 2 bultos a $4.800 cada uno. Revisar que proponga 48 unidades y costo individual $200 antes de importar. Probar también un comprobante que indique explícitamente unidades sueltas.

Verificación de código: `npx tsc --noEmit -p tsconfig.app.json`. No se ejecuta `npm run build`.
