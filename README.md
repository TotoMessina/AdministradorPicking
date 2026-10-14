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

La interfaz activa usa un diseño común para ingreso, mostrador, catálogo, caja, configuración y asistente. Las reglas visuales están en `src/features/retail/experience.css`, cargadas después de los estilos anteriores.

La paleta común se define en `src/features/retail/palette.css`, cargada al final. Fondos, bordes, textos y acciones usan variables `--tone-*` derivadas del color del comercio; también se aplican a notificaciones y modales. Para mantener la coherencia, usar estas variables en nuevos componentes. Los errores conservan un tono diferenciado y el papel del ticket mantiene sus colores de impresión.

- **Nueva venta:** búsqueda y productos como acción principal; lista y registro dentro de “Opciones de venta”, con sus valores siempre visibles. El carrito conserva el pedido ante un error y muestra el motivo junto al cobro. Los importes rápidos de efectivo se adaptan al total.
- **Productos:** vistas “Catálogo y stock” y “Listas de precios”. “Agregar producto” es la acción principal; importaciones, reposiciones y ajustes se agrupan en “Más herramientas”. El catálogo permite filtrar stock bajo y cargar más resultados por tandas.
- **Caja:** “Mi turno” reúne la operación diaria; “Resumen y ventas” concentra la consulta administrativa. El efectivo contado se conserva al alternar entre estas vistas.
- **Mi comercio:** General, Sucursales y cajas, Registros de ventas y Equipo y permisos. Los campos sin guardar se conservan al alternar estas secciones; salir de la pantalla completa no guarda esos cambios.
- **Accesibilidad:** las pestañas internas aceptan flechas, Inicio y Fin; el ticket retiene el foco, se cierra con Escape y devuelve el foco al control anterior. El ingreso permite mostrar u ocultar la contraseña. Las animaciones respetan la preferencia de movimiento reducido.

`npm run test:ui` verifica los flujos de cobro, las listas y reportes, la navegación, la conservación de formularios, el cambio de sucursal con una venta pendiente y el foco del ticket. La revisión visual en navegador debe comprobar también ingreso, menús, tablas y modales en 320, 390, 768, 1024 y 1440 px.

En teléfonos de hasta 760 px, la interfaz usa navegación inferior persistente, encabezado compacto y menú de cuenta desplegable. La venta en curso aparece sobre las pestañas; el ticket se presenta como panel inferior. Los estilos de esta presentación están en `src/mobile-app.css`.

Para revisar el diseño móvil en `http://localhost:3001`, usar 390 × 844 px y luego 320 px de ancho: abrir el menú superior, cambiar de sección con las pestañas, agregar productos y pulsar **Ver venta**. El menú debe permitir acceder al comercio y cerrar sesión; el carrito debe conservarse al cambiar de sección. Comprobar que las pestañas no tapen los últimos controles al desplazarse y que el ticket pueda recorrerse y cerrarse. Repetir en escritorio para comparar ambas presentaciones.

La instalación se ofrece cuando el navegador la habilita. En iPhone/iPad, abrir en Safari y usar **Compartir → Agregar a pantalla de inicio**. El manifiesto incluye íconos PNG de 192 y 512 px y un ícono Apple de 180 px.

El service worker de producción guarda recursos públicos y una pantalla de recuperación sin conexión; no guarda respuestas de Supabase, sesiones ni ventas en su caché. En desarrollo se puede habilitar `VITE_ENABLE_DEV_PWA=true` para probar push en localhost con un worker sin caché. No hay ventas offline ni sincronización en segundo plano. Una pantalla ya abierta muestra un aviso al perder conexión. Las actualizaciones esperan a que se cierren todas las ventanas de la app, evitando recargar ventas en curso.

### Cómo probar

1. Diseño: ejecutar `npm run dev`, abrir `http://localhost:3001` y probar anchos de 320, 390, 768, 1024 y 1440 px. Revisar login, navegación, caja, catálogo, configuración, carrito, asistente y ticket. Las tablas tienen desplazamiento horizontal propio; formularios y venta se apilan en pantallas chicas.
2. PWA: cuando quieras preparar una versión de producción, ejecutar `npm run build` y luego `npm run preview -- --host 127.0.0.1`. Abrir `http://localhost:4173`. No usar el servidor de desarrollo para verificar el service worker.
3. En las herramientas del navegador, revisar **Application → Manifest / Service Workers**. Deben aparecer los íconos y un worker activado. En Chrome/Edge compatibles, usar **Instalar app** y abrirla como ventana independiente.
4. Tras la primera visita con conexión y la activación del worker, activar **Network → Offline** y recargar: debe aparecer la pantalla “Estás sin conexión”. Volver a Online y pulsar “Volver a intentar”. Con la app abierta, desconectar internet debe mostrar el aviso de conexión.
5. Para actualizaciones, servir una nueva compilación, abrir la app con conexión, luego cerrar todas sus ventanas y volver a abrirla. No se fuerza una recarga mientras está en uso.

En un teléfono real la instalación y el service worker necesitan **HTTPS**. Una URL HTTP de la red local no sirve para probar instalación; `localhost` es la excepción para las pruebas en la misma computadora. El alojamiento debe servir `sw.js` y `manifest.json` sin caché prolongada y publicar todo `dist` en conjunto. Publicar en la raíz del dominio, como está configurado actualmente.
