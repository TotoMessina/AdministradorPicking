# Mi negocio · Administrador multi-comercio

React + TypeScript + Vite, con Supabase Auth y PostgreSQL/RLS.

- Login, alta de cuenta y recuperación de contraseña.
- Comercios independientes y roles propietario/administrador/cajero.
- Catálogos y categorías propios, varias cajas y turnos por comercio.
- Ventas y stock transaccionales, historial, arqueos y tickets personalizados.
- Sucursales dentro de cada comercio, con cajas propias y resumen administrativo conjunto.
- Lista madre y listas con porcentajes o precios fijos por producto.
- Registros de ventas configurables, referencias de comprobantes externos y exportación completa por período.

Las novedades requieren instalar `supabase/migrations/202610130001_branches_prices_ledgers.sql` antes de usar el frontend actualizado; ver [activación y uso](./SUPABASE_SETUP.md). El stock continúa compartido por comercio. Los tickets siguen siendo no fiscales.

## Puesta en marcha

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar los datos públicos del proyecto.
3. Seguir [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para instalar la migración y configurar Auth.
4. `npm run dev`

## Verificación

- `npx tsc --noEmit -p tsconfig.app.json`
- `npx tsc --noEmit -p tsconfig.node.json`
- `npm run test:db` — integración PostgreSQL local, sin tocar Supabase remoto.
- `npm run test:ui` — flujos del mostrador en DOM de prueba, sin ventas reales.
- `npm run lint`
- `node check_connection.mjs` — disponibilidad de Auth/esquema, sin credenciales privadas ni escrituras.

La implementación activa está en `src/features/retail`. Los componentes administrativos antiguos permanecen en `src/components` como referencia y no forman parte de la navegación actual.

## PWA y pantallas adaptables

La app incluye instalación y notificaciones push de stock bajo y cierres de caja, configurables en **Mi comercio → App y avisos**. El envío funciona desde Supabase aunque la app esté cerrada. La configuración del servidor y los pasos de prueba están en [PUSH_SETUP.md](PUSH_SETUP.md); requiere aplicar la migración `202610140001_web_push.sql`, desplegar `push-dispatch`, cargar sus claves y habilitar la tarea programada.

### Interfaz y organización

La interfaz tiene una única entrada de estilos: `src/styles/app.ts`. Carga los CSS como módulos de Vite, sin encadenar `@import` de PostCSS: `foundation.css` (tokens y controles), `workspace.css` (navegación y operación), `tools.css` (diálogos, importación, asistente y avisos), `responsive.css` (distribución adaptable), `mobile-native.css` (presentación y movimiento móvil) y `print.css`, en ese orden. Los CSS anteriores permanecen como archivos históricos sin importar en la app.

La paleta usa superficies blancas y grises, tipografía del sistema y un único acento moderado a partir del color del comercio. Usar las variables `--tone-*` de `foundation.css` en nuevos componentes; evitar capas adicionales de overrides. Los errores tienen un tono diferenciado y el ticket se imprime en blanco y negro, respetando el ancho elegido.

- **Nueva venta:** búsqueda y productos como acción principal; lista y registro dentro de “Opciones de venta”, con sus valores siempre visibles. El carrito conserva el pedido ante un error y muestra el motivo junto al cobro. Los importes rápidos de efectivo se adaptan al total.
  “Agregar un importe manual” está junto al buscador, antes de las categorías y productos, y despliega el formulario sin recorrer el catálogo.
- **Productos:** vistas “Catálogo y stock” y “Listas de precios”. “Agregar producto” es la acción principal; importaciones, reposiciones y ajustes se agrupan en “Más herramientas”. El catálogo permite filtrar stock bajo y cargar más resultados por tandas.
- **Caja:** “Mi turno” reúne la operación diaria; “Resumen y ventas” concentra la consulta administrativa. El efectivo contado se conserva al alternar entre estas vistas.
- **Mi comercio:** General, Sucursales y cajas, Registros de ventas y Equipo y permisos. Los campos sin guardar se conservan al alternar estas secciones; salir de la pantalla completa no guarda esos cambios.
  El alta de colaboradores pide contraseña inicial y confirmación. Para cuentas existentes hay una opción de autorización sin cambiar su contraseña. Con confirmación de email habilitada, el colaborador debe confirmar el correo antes de entrar. El alta no reemplaza la sesión del propietario; detalles en [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- **Accesibilidad:** las pestañas internas aceptan flechas, Inicio y Fin; el ticket retiene el foco, se cierra con Escape y devuelve el foco al control anterior. El ingreso permite mostrar u ocultar la contraseña. Las animaciones respetan la preferencia de movimiento reducido.

`npm run test:ui` verifica los flujos de cobro, las listas y reportes, la navegación, la conservación de formularios, el cambio de sucursal con una venta pendiente y el foco del ticket. La revisión visual en navegador debe comprobar también ingreso, menús, tablas y modales en 320, 390, 768, 1024 y 1440 px.

En teléfonos de hasta 760 px, la interfaz usa encabezado fijo al desplazarse, navegación inferior con indicador animado, controles segmentados y paneles que entran desde abajo. Las pulsaciones, cantidades y el resumen del carrito tienen respuestas breves. Catálogo y cobro se alternan sin perder la venta. Se conservan la paleta y los formularios existentes; las animaciones no remontan el contenido. Los márgenes respetan las áreas seguras del dispositivo y el manifiesto comparte el fondo de la app.

`useMobileExperience.ts` usa [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) para transiciones cancelables y [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) para detectar el teclado, ocultar temporalmente la barra inferior y ajustar las ventanas. Si una API no está disponible, la operación sigue funcionando sin ese efecto. Movimiento reducido desactiva las animaciones; el zoom permanece disponible. `tests/mobile-experience.test.mjs` comprueba campos conservados, cancelación, movimiento reducido, escritorio y teclado frente a zoom.

Para revisar el diseño móvil en `http://localhost:3001`, usar 390 × 844 px y luego 320 px de ancho: abrir el menú superior, cambiar de sección con las pestañas, agregar productos y pulsar **Ver venta**. El menú debe permitir acceder al comercio y cerrar sesión; el carrito debe conservarse al cambiar de sección. Comprobar que las pestañas no tapen los últimos controles al desplazarse y que el ticket pueda recorrerse y cerrarse. Repetir en escritorio para comparar ambas presentaciones.

En la PWA instalada, probar también el teclado en una reposición y en el asistente: la navegación inferior debe desaparecer mientras el teclado reduce el espacio y volver al cerrarlo. Abrir y cerrar paneles, cambiar rápidamente de sección y activar “Reducir movimiento” en el dispositivo. Confirmar en un iPhone y un Android reales el área segura, la barra de estado y el teclado; la simulación de escritorio no sustituye esa revisión física.

La instalación se ofrece cuando el navegador la habilita. En iPhone/iPad, abrir en Safari y usar **Compartir → Agregar a pantalla de inicio**. El manifiesto incluye íconos PNG de 192 y 512 px y un ícono Apple de 180 px.

El aviso superior de instalación se puede cerrar y recuerda esa decisión en el navegador, incluso después de recargar. Rechazar el diálogo del navegador también lo oculta. La instalación sigue disponible en **Mi comercio → App y avisos**; el aviso de falta de conexión se mantiene aunque la invitación a instalar esté cerrada.

El service worker de producción guarda el shell de la aplicación; los datos de cada cuenta y su cola de operaciones se guardan por separado en IndexedDB. Las cajas preparadas siguen operando offline y sincronizan al reconectar. En desarrollo se puede habilitar `VITE_ENABLE_DEV_PWA=true` para probar push en localhost con un worker sin caché. Las actualizaciones esperan a que se cierren todas las ventanas de la app. Ver [OFFLINE_POS.md](OFFLINE_POS.md) para preparar dispositivos y conocer los límites de sincronización en segundo plano.

### Cómo probar

1. Diseño: ejecutar `npm run dev`, abrir `http://localhost:3001` y probar anchos de 320, 390, 768, 1024 y 1440 px. Revisar login, navegación, caja, catálogo, configuración, carrito, asistente y ticket. Las tablas tienen desplazamiento horizontal propio; formularios y venta se apilan en pantallas chicas.
2. PWA: cuando quieras preparar una versión de producción, ejecutar `npm run build` y luego `npm run preview -- --host 127.0.0.1`. Abrir `http://localhost:4173`. No usar el servidor de desarrollo para verificar el service worker.
3. En las herramientas del navegador, revisar **Application → Manifest / Service Workers**. Deben aparecer los íconos y un worker activado. En Chrome/Edge compatibles, usar **Instalar app** y abrirla como ventana independiente.
4. Tras preparar la caja con conexión y activar el nuevo worker, activar **Network → Offline** y recargar: la PWA publicada debe recuperar los datos locales y permitir operar. Volver a Online y comprobar que los pendientes se sincronizan sin duplicarse. Ver el recorrido completo en [OFFLINE_POS.md](OFFLINE_POS.md).
5. Para actualizaciones, servir una nueva compilación, abrir la app con conexión, luego cerrar todas sus ventanas y volver a abrirla. No se fuerza una recarga mientras está en uso.

En un teléfono real la instalación y el service worker necesitan **HTTPS**. Una URL HTTP de la red local no sirve para probar instalación; `localhost` es la excepción para las pruebas en la misma computadora. El alojamiento debe servir `sw.js` y `manifest.json` sin caché prolongada y publicar todo `dist` en conjunto. Publicar en la raíz del dominio, como está configurado actualmente.

### Accesos de cajeros

Instalá `supabase/migrations/202610150001_cashier_access.sql` antes de publicar esta versión. En **Mi comercio → Equipo y permisos**, propietarios y administradores ven emails y asignan opcionalmente una sucursal o una caja a cada cajero, incluidos accesos pendientes. Los cajeros consultan solo su propia actividad; la restricción se valida también en Supabase. Ver instrucciones y pruebas en [SUPABASE_SETUP.md](SUPABASE_SETUP.md#emails-asignaciones-y-privacidad-del-cajero).

### Caja por teclado y offline

F1 efectivo, F2 QR, F3 transferencia y F4 mixto; lector con Enter y botonera configurable de hasta 20 productos por sucursal. Las operaciones se guardan primero en IndexedDB y se sincronizan sin duplicar ventas/stock; los conflictos se conservan para revisión. Requiere las migraciones `202610160001` y `202610160002` y preparar cada dispositivo con conexión. Instrucciones en [OFFLINE_POS.md](OFFLINE_POS.md).
