# Aviso de fallas

Cuando la app o una función de Supabase falla en un comercio, Sentry te manda un correo. Sin `VITE_SENTRY_DSN` ni `SENTRY_DSN`, no se envía nada y la app funciona igual.

## Por qué Sentry

Precios consultados el 01/11/2026; confirmarlos antes de decidir.

| | Sentry | GlitchTip | Tabla propia + aviso push |
| --- | --- | --- | --- |
| Gratis | 5.000 errores, 1 usuario, 30 días | 1.000 eventos por mes | Sin costo extra |
| Pago | Desde USD 26–29 por mes | Desde USD 15 por mes | No aplica |
| Correo y agrupación | Incluidos | Incluidos | Habría que construirlos |
| Si cae Supabase | Avisa igual | Avisa igual | **No avisa** |
| Qué hay que armar | Cuenta y variables | Cuenta y variables | Migración, pantalla y mantenimiento |

**Elegido: Sentry gratis.** Es lo más simple y deja más margen sin pagar. Si hiciera falta salir, GlitchTip debería requerir solo cambiar el DSN; esa compatibilidad no se probó.

## Qué se envía

- Comercio y sucursal, **solo como ID**. Para saber cuál es, en el SQL Editor: `select name from retail_stores where id = 'ID';`.
- Pantalla, versión y navegador.
- Tipo de error y dónde ocurrió en el código.

**Qué no se envía:** usuarios, correos, contraseñas, tokens, dirección de la página, ventas, importes ni datos de clientes. El envío usa una lista de campos permitidos y borra del texto correos, tokens, enlaces, números largos y textos entre comillas. Los fallos de base y de sincronización mandan solo el lugar y el código, nunca el mensaje.

Ese filtro por patrones no garantiza limpiar cualquier texto futuro. Por eso conviene activar también el filtro del lado de Sentry (paso 1).

**Qué dispara un aviso:**

- Errores no controlados y pantallas rotas.
- Fallos técnicos al guardar o cobrar. "Stock insuficiente" y otras reglas del negocio no avisan.
- Ventas u operaciones trabadas sin sincronizar.
- Fallos de facturación, incluidos los rechazos de ARCA, y un CAE autorizado que no se pudo guardar.
- Fallos de los avisos push, como máximo uno por hora.

Sin conexión tampoco se avisan los fallos de red. Los demás errores quedan guardados en el dispositivo y se envían al volver.

## Cómo cargarlo

**1. Crear el proyecto en Sentry**

1. Crear una cuenta en [sentry.io](https://sentry.io) y un proyecto **React**.
2. En la pantalla de alertas, elegir avisar en cada problema nuevo.
3. En **Settings → Security & Privacy**, activar **Prevent Storing of IP Addresses** y **Data Scrubber**.
4. Copiar el **DSN** desde **Settings → Client Keys (DSN)**. Es público por diseño, pero solo sirve para enviar errores.

**2. Probar en tu computadora**

Agregar a `.env.local`, que git ignora:

```text
VITE_SENTRY_DSN=TU_DSN
VITE_APP_VERSION=1.0.9
```

Reiniciar `npm run dev` cuando puedas: Vite lee estas variables al arrancar.

**3. Cargarlo en la versión publicada**

Cargar las mismas dos variables en el panel de tu hosting y publicar de nuevo. Quedan fijas al compilar, así que cada dispositivo informa la versión que tiene instalada. Subir `VITE_APP_VERSION` en cada publicación.

**4. Cargarlo en las funciones**

```powershell
npx supabase secrets set --project-ref lkahqqsduatkhxruiolo SENTRY_DSN=TU_DSN APP_VERSION=1.0.9
```

```powershell
npx supabase functions deploy push-dispatch --project-ref lkahqqsduatkhxruiolo
```

```powershell
npx supabase functions deploy billing-authorize --project-ref lkahqqsduatkhxruiolo
```

Esto publica en producción: revisá antes que sea el proyecto correcto. No hay SQL ni migración para aplicar.

## Guía de Pruebas

Propuesta manual; **nada de esto fue ejecutado**. Usar http://localhost:3001/ con un comercio de pruebas.

1. **Sin configurar:** sin `VITE_SENTRY_DSN`, abrir Mi comercio → App y avisos. Esperado: "Aviso de fallas" dice que no está configurado. Vender funciona igual.
2. **Aviso real:** con todo cargado, entrar como dueño o administrador y tocar **Probar aviso de fallas**. Esperado: mensaje de éxito y **dos correos** en unos minutos, uno de la app y otro de las funciones. Si solo llega uno, la pantalla indica cuál falló.
3. **Repetir:** tocar de nuevo. Esperado: dos correos más.
4. **Contenido:** abrir cada problema en Sentry. Esperado: etiquetas `comercio_id`, `pantalla`, `version` y `prueba=si`. La de la app también trae `sucursal_id`. Sin correo, usuario, IP, URL ni token.
5. **Permisos:** como supervisor con acceso a esa pantalla, tocar el botón. Esperado: la función lo rechaza y la pantalla avisa que no salió.
6. **Error real:** en la consola del navegador ejecutar `setTimeout(() => { throw new Error('prueba con ana@ejemplo.com y 12345678') })`. Esperado: llega un problema con `[correo]` y `[número]`, sin los valores.
7. **Sin conexión:** cortar internet, repetir el paso 6 y reconectar. Esperado: el problema llega después de volver la conexión, tras recargar la app.
8. **Regla del negocio:** en el comercio de pruebas, provocar un error de validación, como guardar un dato inválido. Esperado: se ve en pantalla y **no** llega aviso.

Archivar las pruebas en Sentry cuando termines. Si no llega nada, revisar el correo no deseado y las reglas de alerta del proyecto.

## Límites

- Si la app no llega a cargar o el dispositivo no tiene internet, no hay aviso inmediato.
- Algunos bloqueadores de anuncios impiden el envío a Sentry.
- Sin mapas de código, los errores de la versión publicada muestran código compilado. Se puede sumar más adelante.
- Plan gratuito: al llegar a 5.000 errores se dejan de recibir. Cada dispositivo envía hasta 20 por carga de la app.
