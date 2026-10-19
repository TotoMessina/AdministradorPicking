# Remitos desde el celular y aprobación de stock

Aplicar [202610190002_pending_replenishments.sql](supabase/migrations/202610190002_pending_replenishments.sql) en Supabase después de las migraciones anteriores y antes de publicar el frontend. Crea la tabla, las funciones de envío/revisión y el bucket privado `retail-remitos`. No requiere nuevas variables de entorno: usa Supabase, Tesseract y la configuración existente de Groq.

## Empleado

La navegación del cajero incluye **Remito**, tanto en escritorio como en la barra inferior de la PWA. No requiere abrir un turno ni habilitar permisos de reposición.

1. Elegir la sucursal disponible para la cuenta y tocar **Fotografiar remito**. En un dispositivo compatible se solicita la cámara trasera; también se puede seleccionar una imagen.
2. Revisar la foto y tocar **Procesar con IA**. Se reutiliza la extracción OCR existente y la vinculación con el catálogo/memoria de proveedor. Los bultos se convierten una sola vez a unidades individuales.
3. Corregir cantidades y quitar renglones incorrectos. Los productos no identificados quedan señalados para el encargado. Las cantidades deben ser enteros positivos de hasta 1.000.000 de unidades.
4. Agregar notas opcionales y tocar **Enviar para aprobación**. Aparece **Pendiente de validación** y el mensaje de envío. El stock permanece igual.

Si no se puede leer la foto o falla Groq, está disponible **Enviar solo foto para revisión manual**. El encargado podrá agregar y vincular los artículos. No se inventan cantidades cuando no se leen.

La imagen admite hasta 10 MB y formatos habituales de foto. Si el navegador no puede mostrar su formato, se informa en la vista previa y se permite enviarla igualmente. La carga y el envío requieren conexión. Si fallan, se conserva el borrador en esta pantalla para reintentar; una subida ya completada se reutiliza. El envío se identifica con el UUID de la foto para que un reintento de red no cree dos pendientes. El borrador también se conserva al cambiar de pestaña dentro del comercio, pero no al recargar/cerrar la app o cambiar de comercio.

## Encargado

En **Productos y stock → Catálogo y stock**, el panel **Remitos pendientes** muestra fecha, sucursal, notas, texto OCR, miniatura privada y artículos. Se cargan diez remitos por vez; **Mostrar más** permite continuar. El menú de Productos/Catálogo muestra la cantidad pendiente y la actualiza cada 30 segundos con la app visible, al recuperar foco/conexión y mediante **Actualizar remitos**.

Antes de aprobar se pueden buscar/cambiar productos, corregir cantidades, quitar líneas y agregar artículos de una foto sin analizar. Todos los renglones deben quedar vinculados a productos activos del comercio. La cantidad siempre se expresa en unidades individuales, incluso si la foto factura displays.

**Aprobar e ingresar unidades** envía las correcciones y aplica el stock en una única transacción SQL. Bloquea el remito y los productos, suma al stock vigente, agrupa renglones repetidos y registra el ingreso en `retail_stock_movements`, junto con el administrador y la fecha de revisión. Un remito ya aprobado devuelve su identificador sin volver a sumar stock. No modifica costos ni precios de venta. La sucursal identifica el origen del remito; el inventario sigue compartido entre las cajas del comercio, como en el sistema existente.

**Rechazar** exige un motivo y guarda la revisión, sin cambiar stock. Una revisión concurrente respeta la primera decisión: no permite aprobar un rechazado ni rechazar un aprobado. Los registros aprobados/rechazados se conservan en la tabla para auditoría y salen de la lista de pendientes.

## Permisos

Cualquier miembro del comercio puede ver los registros y enviar remitos. El envío valida la sucursal asignada al cajero, que la imagen exista y que pertenezca a quien la subió. Solo propietarios/administradores pueden aprobar o rechazar; los clientes no tienen permisos de escritura directa a la tabla para eludir las funciones de revisión. El guard de reposición directa del cajero en `offline.ts` se conserva.

Las fotos se guardan como referencias privadas sin tokens. Storage permite subir a miembros autenticados del comercio bajo su carpeta de usuario, y leer/generar enlaces firmados únicamente a propietarios/administradores de ese mismo comercio. El encargado recibe enlaces temporales de cinco minutos; las miniaturas se renuevan y **Ver foto completa** genera un enlace nuevo. No hay acceso público, sobrescritura ni borrado desde el cliente.

## Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como cajero. En un celular real, usar la URL HTTPS publicada de la app (`https://administrador-picking.vercel.app/`) después de desplegar los cambios: el `localhost` del teléfono corresponde al propio teléfono.
2. Preparar un producto **Alfajor de prueba**, stock **10**, con `pack_size=24`. Entrar a **Remito**, verificar la sucursal habilitada y fotografiar un remito con **2 displays ×24** de ese producto. Revisar la vista previa.
3. Pulsar **Procesar con IA**. Verificar que la cantidad sea **48 unidades**; corregirla si la interpretación no fue correcta. Agregar una nota y enviar.
4. Debe aparecer **Remito enviado. El encargado lo revisará y aprobará el ingreso al stock.** y **Pendiente de validación**. El stock debe seguir en **10**. El cajero no debe obtener acceso de lectura a la foto almacenada ni a las RPC de aprobación/rechazo.
5. En otra sesión como administrador del mismo comercio, abrir **Productos y stock** y tocar **Actualizar remitos**. Deben verse el badge, fecha, sucursal, nota, foto y las 48 unidades. Abrir la foto completa.
6. Confirmar el producto/cantidad y aprobar: el stock debe quedar en **58**, el pendiente debe desaparecer y la tabla debe registrar `approved`, `reviewed_by` y `reviewed_at`. Repetir la llamada de aprobación o hacer doble toque no debe aumentar nuevamente el stock.
7. Enviar otro remito y rechazarlo con motivo: debe quedar `rejected`, conservar motivo/revisor/fecha y no modificar stock. Intentar aprobarlo después debe fallar.
8. Enviar una foto sin analizar. El administrador debe poder **Agregar artículo**, buscar el producto, ingresar cantidad y aprobar. Un producto sin vincular o una cantidad inválida debe impedir la aprobación.
9. Probar renglones repetidos del mismo producto: deben sumar ambas cantidades una sola vez por aprobación. Una aprobación y un rechazo simultáneos desde dos sesiones deben respetar una sola decisión.
10. Desconectar antes de enviar: debe mostrar error y conservar foto/cantidades/notas. Reconectar y reintentar: debe crear un único pendiente. Cambiar entre Caja, Vender y Remito sin recargar debe conservar el borrador no enviado.
11. Con otra cuenta de otro comercio, comprobar que no se puede consultar, aprobar ni abrir la imagen del remito. Un cajero debe poder enviar, pero no aprobar, rechazar ni modificar stock por llamadas directas a la API.

Verificación técnica: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar build. Las comprobaciones de RPC, RLS, Storage y cámara requieren la migración instalada y las sesiones indicadas.
