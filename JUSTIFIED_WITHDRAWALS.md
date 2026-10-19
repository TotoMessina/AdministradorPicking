# Salidas de caja con comprobante

Aplicar [202610190001_justified_withdrawal.sql](supabase/migrations/202610190001_justified_withdrawal.sql) en Supabase después de las migraciones anteriores y antes de usar el frontend actualizado. La migración crea el bucket privado `retail-vouchers`, agrega los datos del movimiento y actualiza la sincronización offline. No requiere nuevas variables de entorno.

En **Caja → Mi turno → Registrar movimiento**, elegir **Retiro de efectivo** y una categoría:

- **General:** retiro habitual, sin adjunto obligatorio.
- **Pago a proveedor:** nombre del proveedor y comprobante obligatorios para cajeros y administradores.
- **Otro:** otro retiro justificado con su motivo.

Se admiten fotos JPG, PNG, WebP, GIF, HEIC, HEIF, AVIF, BMP, TIFF y documentos PDF de hasta 10 MB. Las imágenes muestran una vista previa local; si el navegador no puede visualizar el formato, conserva el archivo e indica que se adjuntará igualmente. Para PDF se muestra el nombre del archivo.

Al guardar, primero se sube el archivo y después se registra el retiro. El formulario muestra **Subiendo comprobante…** / **Guardando movimiento…**. Un fallo conserva importe, motivo, proveedor y archivo, con opción de reintentar. Si el archivo ya se subió y falla el registro del movimiento, se reutiliza esa carga y el identificador del movimiento mientras no se cambien sus datos. No se confirma un retiro sin su comprobante. La validación también se aplica en Supabase.

El bucket no es público. Se persiste una URL estable de referencia privada (`/storage/v1/object/authenticated/retail-vouchers/...`), sin token ni permiso de descarga. Un cajero puede subir al turno propio autorizado, pero no leer archivos guardados ni generar enlaces firmados. Los administradores del comercio ven **Ver comprobante** y generan un enlace firmado de 60 segundos al abrirlo. Si el navegador bloquea la pestaña, aparece un enlace alternativo. No se guardan enlaces firmados en los movimientos.

La consulta de movimientos usa `retail_movement_details`, que mantiene el alcance por comercio/autor y devuelve `voucher_url = null` para cajeros. Los permisos de columna impiden solicitar directamente `voucher_url` a la tabla mediante REST. Los permisos de Storage comprueban la pertenencia al comercio; los adjuntos de otros comercios no son accesibles. No se habilitan borrado ni sobrescritura de archivos desde el cliente.

Los movimientos conservan el cálculo habitual del arqueo: **RETIRO** resta efectivo esperado una sola vez. La cola offline conserva categoría, proveedor y referencia privada, y mantiene sus reintentos idempotentes. Subir un archivo nuevo requiere conexión y un turno ya sincronizado. Si la conexión se corta después de subirlo, el movimiento puede quedar guardado localmente para sincronizarse con sus datos completos; los conflictos se gestionan desde el flujo de sincronización existente.

La migración mantiene la RPC anterior de cinco argumentos para movimientos generales de clientes anteriores. La nueva consulta de movimientos requiere el frontend actualizado porque la lectura directa con `select('*')` ya no puede solicitar la columna privada.

## Guía de Pruebas

1. Aplicar la migración en Supabase y abrir `http://localhost:3001/`. Entrar como cajero con una caja habilitada y abrir un turno. Esperar a que se sincronice.
2. En **Registrar movimiento**, elegir **Retiro de efectivo → Pago a proveedor**. Ingresar importe $500, motivo y proveedor. Guardar sin archivo: debe mostrar **Adjuntá el comprobante para pagos a proveedores**, sin descontar efectivo.
3. Adjuntar una foto válida: debe aparecer su vista previa. Guardar: debe mostrar progreso y agregar un único retiro de $500 con el proveedor. Como cajero no debe aparecer **Ver comprobante**. Un reintento del mismo identificador no debe duplicarlo.
4. Entrar como administrador del mismo comercio y consultar el turno/caja. Debe aparecer el proveedor y **Ver comprobante**, que abre el adjunto en otra pestaña. Volver a abrirlo más de un minuto después debe generar un enlace nuevo.
5. Verificar el arqueo con fondo inicial de $1.000 y sin ventas: después del retiro, el efectivo esperado del administrador debe ser $500. El cajero conserva su arqueo a ciegas.
6. Probar PDF y un archivo mayor a 10 MB: el PDF debe poder adjuntarse y el archivo grande debe rechazarse sin registrar el movimiento.
7. Con una foto seleccionada, desconectar internet antes de guardar. Debe conservar el formulario y permitir reintentar al reconectar. No debe cerrar ni bloquear permanentemente el turno. Si el turno se abrió offline, sincronizarlo antes de volver a cargar el archivo.
8. Registrar un ingreso, un retiro general y uno de categoría **Otro**: no deben exigir comprobante y deben conservar sus signos en el arqueo. Tras sincronizar o recargar, deben conservar la categoría y el proveedor de los pagos correspondientes.
9. Comprobar permisos con sesiones separadas: el cajero debe recibir `voucher_url: null` al consultar movimientos; una solicitud directa a esa columna y los intentos de descargar o firmar el objeto deben ser rechazados. Un administrador de otro comercio tampoco debe acceder. La URL privada permanente no debe servir para descargar sin autorización.

Verificación técnica: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar build. Las pruebas de Storage/RPC requieren aplicar la migración y realizarlas con las cuentas indicadas.
