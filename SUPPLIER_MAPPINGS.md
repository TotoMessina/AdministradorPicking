# Vinculación de artículos y memoria de proveedor

La extracción de PDF, imágenes y OCR se conserva. Después de extraer los artículos y el proveedor, una segunda fase compara cada descripción con candidatos del catálogo mediante códigos, nombres normalizados, abreviaturas y distancia de edición (errores de escritura/OCR). Groq recibe esos candidatos, su `pack_size`, los importes originales extraídos y los vínculos conocidos de ese proveedor que corresponden a las líneas analizadas.

La respuesta de vinculación incluye `invoice_line`, `matched_product_id`, `matched_product_name`, `confidence`, `pack_size_detected`, `unit_cost` y `reason`, además de un índice para distinguir renglones repetidos. La app valida que los IDs pertenezcan a los candidatos y calcula el stock/costo desde los importes originales: dos displays de 24 a $4.800 por display suman 48 unidades a $200 cada una. No se vuelve a dividir un costo que ya viene expresado por unidad individual.

- **Verde, auto-vinculado:** existe una memoria de ese proveedor para la descripción normalizada, el producto sigue activo, la confianza es al menos 0,8 y no hay un código incompatible.
- **Amarillo, requiere confirmación:** sugerencia nueva o de menor confianza. Se puede buscar/cambiar el producto y corregir la cantidad, presentación y costo antes de **Confirmar y recordar**.
- **Rojo, no encontrado:** buscar un producto del catálogo y usar **Vincular y recordar**. Se omite por defecto. La opción de crear un producto nuevo sigue disponible como decisión explícita.

No se puede aplicar una reposición con vínculos seleccionados pendientes de confirmar. Se puede elegir **Omitir** para excluirlos. Los renglones repetidos del mismo producto suman sus cantidades; si se actualiza el costo varias veces para ese producto, prevalece el último renglón seleccionado para actualizar costo. El guardado sigue usando `retail.replenishStockBatch`.

La memoria usa `localStorage` con la clave `kiosco_supplier_mappings_{storeId}` y grupos `{ supplier, mappings: [{ invoice_text, product_id, product_name, pack_size_detected? }] }`. Se ignoran mayúsculas, tildes, puntuación y espacios repetidos al comparar. Guardar de nuevo la misma descripción actualiza su vínculo. Un cambio de proveedor en la revisión exige confirmar de nuevo; una nueva factura vuelve a detectar el proveedor salvo que se haya escrito uno explícitamente en el campo opcional.

Los recuerdos pertenecen a este navegador/dispositivo; no se sincronizan con otros dispositivos. Se necesita un proveedor para guardarlos. Si el navegador impide guardar, se muestra un error y no se indica que se recordó el vínculo. Los vínculos a productos eliminados/inactivos no se auto-aplican. Si falla la fase de vinculación IA, se usan la memoria válida y sugerencias locales; las sugerencias nuevas siempre requieren confirmación.

No requiere migraciones SQL. Groq conserva la configuración existente.

## Guía de Pruebas

1. Abrir `http://localhost:3001/` como administrador. En **Productos y stock**, preparar un producto **Alfajor Jorgito Chocolate** con `pack_size=24`. Anotar su stock/costo.
2. Abrir **Analizador de facturas**, ingresar proveedor **Distribuidora Prueba**, activar **Ver / editar texto detectado** y pegar:

   ```text
   Distribuidora Prueba
   Cantidad Descripcion Precio unitario Importe
   2 ALFA JORG CHOC DISPLAY X24 4800.00 9600.00
   Total 9600.00
   ```

3. Pulsar **Analizar con IA**. Una vinculación nueva debe quedar amarilla para confirmar, incluso si la confianza es alta. Si no hay coincidencia, debe aparecer roja con búsqueda y selector.
4. Buscar/elegir **Alfajor Jorgito Chocolate**. Verificar presentación ×24, cantidad 48 y costo individual $200. Corregir los campos si la IA interpretó mal el comprobante y pulsar **Confirmar y recordar** o **Vincular y recordar**. No debe modificarse el stock todavía.
5. Pulsar **Aplicar reposición**. Deben sumarse 48 unidades una sola vez y actualizarse el costo a $200 si está seleccionada la acción **Stock + Costo**.
6. Cerrar y volver a analizar la misma descripción con el mismo proveedor. Si la confianza es al menos 0,8, debe aparecer **Auto-vinculado (ya conocido)**, sin pedir confirmación. Mayúsculas, puntuación y espacios extra no deben impedir reutilizar el vínculo.
7. Cambiar el proveedor durante la revisión: los vínculos deben pedir confirmación de nuevo. Analizar con otro proveedor o comercio tampoco debe reutilizar automáticamente la memoria del anterior.
8. Cambiar el producto o la presentación de un vínculo verde y volver a confirmarlo. Tras reabrir, la memoria debe reflejar la corrección. Omitir una línea pendiente debe permitir aplicar las demás sin incluirla.
9. Repetir con un PDF y una imagen habituales: la carga, extracción de texto y vista previa deben conservar su funcionamiento. Si hay renglones repetidos vinculados al mismo producto, el stock final debe sumar ambos.

Verificación técnica: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar build.
