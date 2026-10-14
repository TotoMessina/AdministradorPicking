# PWA y notificaciones push

La app es instalable y ahora incluye avisos de **stock bajo** y **cierres de caja**. Cada propietario o administrador los activa desde **Mi comercio → App y avisos**. La instalación y las notificaciones son opciones independientes: el permiso push siempre se pide al tocar el botón.

## Estado de este entorno

- Dirección local: `http://localhost:3001/`.
- Contacto VAPID: `lucastotomessina@gmail.com`, configurado en `.env.push.local`.
- Las claves ya se generaron localmente. La clave pública está en `.env.local`; la privada y el secreto del programador están en `.env.push.local`, excluido por `.gitignore`. No regenerarlas al desplegar ni compartir ese archivo.
- Se habilitó `VITE_ENABLE_DEV_PWA=true` para probar en localhost. Este worker recibe push pero **no cachea ni intercepta** los archivos de Vite. Reiniciar `npm run dev` después de cambiar estas variables.
- **Pendiente en Supabase:** aplicar la migración, desplegar la función, cargar los secretos y activar la tarea programada. La implementación local por sí sola no envía notificaciones reales.

## Activar el servidor una sola vez

1. En el SQL Editor del proyecto, ejecutar `supabase/migrations/202610140001_web_push.sql`, después de las migraciones anteriores. No ejecutar de nuevo una migración ya aplicada.
2. Con una cuenta autorizada para administrar el proyecto, desde esta carpeta:

   ```powershell
   npx supabase login
   npx supabase secrets set --project-ref lkahqqsduatkhxruiolo --env-file .env.push.local
   npx supabase functions deploy push-dispatch --project-ref lkahqqsduatkhxruiolo
   ```

   La función verifica por sí misma el JWT del usuario o el secreto del programador. `supabase/config.toml` desactiva únicamente la comprobación automática de JWT de la pasarela para permitir ambas formas de acceso. La clave `service_role` la proporciona Supabase a la función; nunca se copia al frontend.

3. En **Supabase → Vault**, crear estos secretos (si existen, actualizarlos):

   | Nombre | Valor |
   | --- | --- |
   | `push_dispatch_url` | `https://lkahqqsduatkhxruiolo.supabase.co/functions/v1/push-dispatch` |
   | `push_dispatch_secret` | El valor de `PUSH_DISPATCH_SECRET` de `.env.push.local` |

4. Ejecutar `supabase/push-schedule.sql` en el SQL Editor. Crea la tarea `retail-web-push`, que procesa hasta 10 avisos por minuto. Para mayor volumen, aumentar la frecuencia/capacidad con una prueba de carga; no usar el navegador como programador.
5. Reiniciar `npm run dev` y abrir `http://localhost:3001/`. Entrar como propietario/administrador, ir a **Mi comercio → App y avisos**, elegir los avisos, tocar **Activar notificaciones** y aceptar el permiso del navegador. Luego tocar **Probar aviso**.

La prueba se envía desde la función usando Web Push real, no mediante una notificación simulada del navegador. Si la función no está disponible, la prueba queda en cola y la pantalla informa el problema. Se permite una prueba por minuto y dispositivo.

## Publicar e instalar

Publicar el frontend bajo **HTTPS** y configurar allí la misma `VITE_VAPID_PUBLIC_KEY`. Las claves privadas y `PUSH_DISPATCH_SECRET` solo van en Supabase. Para preparar la versión de publicación, usar `npm run build` y servir `dist`; este comando no es necesario para trabajar con `npm run dev`.

En Chrome/Edge se ofrece **Instalar app** cuando el navegador lo permite; también puede usarse su menú. En iPhone/iPad se agrega desde Safari a la pantalla de inicio y se abre desde ese ícono antes de activar los avisos. `localhost` sirve para probar en esta computadora; una dirección HTTP de la red local no sirve para instalar/probar push en otro dispositivo.

La versión publicada conserva una pantalla de recuperación sin conexión. **Las ventas necesitan internet**; la PWA no registra ventas offline. Las actualizaciones esperan a que se cierren las ventanas abiertas, para preservar las operaciones pendientes.

## Comportamiento

- **Stock bajo:** se genera al actualizar un producto activo y pasar de stock por encima del mínimo a stock igual o menor al mínimo. Cambiar el mínimo o reactivar un producto puede producir ese cruce. No se avisa por la carga inicial de productos. Los cruces del mismo comercio/dispositivo dentro de un minuto se agrupan; reponer y volver a bajar permite otro aviso.
- **Cierres de caja:** se genera después de guardar el cierre de cualquier caja/sucursal. No depende de que el administrador esté conectado.
- Cada dispositivo recibe avisos de un solo comercio a la vez. Cambiar de comercio en la navegación no cambia la suscripción; hay que activarlos expresamente en el otro comercio. El cambio elimina la cola del destinatario anterior.
- Cerrar sesión intenta quitar la suscripción del servidor y siempre intenta cancelarla en el navegador. Al volver a entrar hay que activarla otra vez. La pérdida temporal de conexión no equivale a cerrar sesión.
- Los permisos y preferencias se comprueban al enviar. Un usuario que dejó de ser administrador no recibe nuevos avisos; los mensajes ya aceptados por el proveedor podrían llegar todavía.
- Los avisos no contienen importes, nombres de productos ni datos de clientes. Al tocarlos se abre la sección correspondiente. Si hay una venta pendiente o corresponde a otro comercio, la app avisa sin cambiar ni recargar la operación.
- Las suscripciones vencidas (404/410) se eliminan. Los fallos temporales se reintentan con espera creciente, hasta cinco intentos y durante 24 horas. La cola se limpia a los siete días. El proveedor puede demorar o rechazar la entrega; una respuesta aceptada no confirma que el usuario vio el aviso.
- Los tags agrupan avisos del mismo tipo/comercio en el dispositivo. No reemplazan el historial de ventas, movimientos ni cierres.

## Cómo probar

1. `npx tsc --noEmit -p tsconfig.app.json` y `npx tsc --noEmit -p tsconfig.node.json`: tipado sin generar una compilación ni tocar el servidor de desarrollo.
2. `npm run test:push`: permisos, aislamiento entre comercios, preferencias, cruce de stock, cierre de turno, cambio de cuenta, reintentos, bloqueo de URLs externas y manejo de notificaciones del service worker.
3. `npx --yes deno check --config supabase/functions/deno.json supabase/functions/push-dispatch/index.ts`: tipado del servidor.
4. Con Supabase configurado, activar y probar un aviso. Cerrar la ventana y, desde otra sesión/dispositivo, bajar un producto de 5 a 4 con mínimo 4, o cerrar un turno. Esperar el próximo minuto y comprobar el aviso del sistema. No esperar otro aviso al bajar de 4 a 3.
5. Desmarcar un tipo de aviso, guardar preferencias y repetir su evento: no debe enviarse. Desactivar los avisos y repetir: no debe enviarse ninguno. Denegar permisos no debe impedir usar el resto de la app.
6. Mantener una venta sin cobrar y tocar un aviso: el carrito debe conservarse. Cerrar sesión, repetir un evento desde otro dispositivo y comprobar que este dispositivo ya no recibe nuevos envíos.
7. Revisar **Supabase Cron → retail-web-push** y la tabla `retail_push_deliveries` con una cuenta administrativa. `sent_at` indica aceptación por el servicio push; `attempts` y `last_error` muestran reintentos. No copiar endpoints o claves de suscripción en registros públicos.

Referencias: [Web Push y permisos](https://web.dev/articles/push-notifications-overview), [Web Push en iOS/iPadOS](https://webkit.org/blog/13878/), [programación de funciones en Supabase](https://supabase.com/docs/guides/functions/schedule-functions), [biblioteca Web Push](https://github.com/web-push-libs/web-push).
