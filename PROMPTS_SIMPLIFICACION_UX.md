# Prompts para simplificar la experiencia de uso

Objetivo: que una persona sin experiencia pueda empezar a vender con pocas decisiones, conservando las herramientas que necesita un comercio más grande.

Este archivo es una secuencia de instrucciones para implementar cambios. No implica que esos cambios ya estén hechos.

## Cómo usar este archivo

1. Ejecutá un prompt por vez, en el orden indicado.
2. Copiá primero el **Contexto común** y después el prompt del paso correspondiente. Así también podés usarlos en conversaciones separadas.
3. Revisá la Guía de Pruebas que entregue cada paso antes de continuar.
4. Si un paso anterior quedó incompleto, resolvé sus pendientes antes de implementar el siguiente.

## Contexto común — copiar con cada prompt

```text
Trabajás sobre AdministradorKiosco, una app React/TypeScript con Supabase, PWA y operación offline. Implementá el paso que te indique a continuación sobre el estado real del repositorio.

Buscamos menos decisiones y menos información visible al mismo tiempo. Conservá las funciones existentes y la paleta actual. No hagas un rediseño estético completo ni agregues dependencias sin necesidad.

Antes de editar, leé las instrucciones locales aplicables. Inspeccioná secciones concretas con búsquedas y lecturas acotadas. Aprovechá componentes existentes; evitá reescribir archivos grandes o modificar código ajeno al paso.

Referencias iniciales, que debés verificar porque pueden cambiar:
- src/features/retail/RetailApp.tsx: navegación, contexto de sucursal/caja, listas, registros de ventas y roles.
- src/features/retail/Management.tsx: CatalogEditor y StoreSettings.
- src/features/retail/BusinessSettings.tsx: sucursales, listas de precios y registros de ventas.
- src/features/retail/CashDesk.tsx: apertura, movimientos y cierre de turno.
- src/components/PosTab.tsx: venta, búsqueda, lector y cobro.
- src/features/retail/api.ts y offline.ts: persistencia, permisos y sincronización.
- src/styles/: estilos existentes, incluidos workspace.css y mobile-native.css.

Conservá:
- Roles y permisos efectivos en backend; ocultar controles no reemplaza autorización.
- Asignaciones de cajero a sucursal/caja y privacidad de movimientos de otros usuarios.
- Atajos de teclado, lector de barras, pagos mixtos, importe manual y botonera rápida.
- Borradores al navegar, carrito y operaciones en curso.
- Stock compartido por tienda, conversión bulto/unidad, listas por sucursal y grupos de margen.
- Reposición, remitos pendientes, transferencias y comprobantes privados.
- PWA, notificaciones y sincronización offline existentes.

No cambies fórmulas contables, precios, stock, facturación ni estados operativos para simplificar la interfaz. No borres datos ni apliques migraciones remotas. Si hace falta una migración, preparala localmente y explicá su aplicación.

Usá español claro y consistente. Controles con etiqueta, navegación por teclado, foco visible y mensajes de error accionables. Los controles ocultos no deben recibir foco ni provocar validaciones invisibles. Conservá el foco del lector durante la venta y respetá movimiento reducido en animaciones.

No ejecutes npm run build ni otros builds. Para verificar código usá exclusivamente npx tsc --noEmit -p tsconfig.app.json. No ejecutes pruebas automatizadas adicionales. Hacé cambios acotados; si solo modificás documentación, no hace falta ejecutar TypeScript.

Al finalizar, indicá qué cambió, qué validaste y qué quedó pendiente. Incluí siempre una Guía de Pruebas con http://localhost:3001/, acciones concretas y resultados esperados. Diferenciá las verificaciones ejecutadas de las que dejás para el usuario. No afirmes haber probado el navegador, el backend o un dispositivo si no lo hiciste.
```

## Paso 1 — Diagnóstico y plan de implementación

```text
Revisá la experiencia actual y prepará un plan concreto para los siguientes cinco cambios: producto simple, lenguaje operativo, configuración progresiva, inicio guiado y ayuda IA contextual.

En este paso no modifiques el comportamiento de la aplicación. Creá docs/ux-simplificacion-plan.md con:

1. Recorrido actual de un cajero: iniciar sesión, abrir turno, vender, cobrar y cerrar. Identificá decisiones innecesarias y puntos de confusión con referencia a archivos/componentes reales.
2. Recorrido actual de un administrador: crear producto, reponer mercadería y configurar el comercio. Separá tareas diarias de tareas ocasionales.
3. Inventario de ayudas IA, avisos, formularios y puntos de entrada duplicados. Distinguí ayuda conversacional de OCR, vinculación de facturas y otras herramientas operativas.
4. Tabla de términos propuesta: concepto real, etiqueta visible y explicación corta. Usá como base “Caja” para el puesto de cobro, “Turno” para la jornada abierta por una persona y “Registro de ventas” para la agrupación de ventas. No confundas registro con factura o estado fiscal.
5. Mapa de pantallas y decisiones predeterminadas para un local con una caja y para un comercio con varias sucursales. Cada función avanzada debe seguir teniendo un acceso claro.
6. Orden de implementación, componentes afectados y riesgos concretos para los siguientes prompts. Revisá si ya existe alguna parte de las soluciones para no duplicarla.

Definí una tarea manual reproducible por cada flujo principal y registrá la cantidad actual de pasos obligatorios. No inventes mediciones ni supongas pruebas con personas reales.

Criterio de aceptación: el plan debe ser específico para este repositorio y servir para ejecutar los pasos siguientes sin decidir otra vez toda la arquitectura.

Guía de Pruebas: enumerá qué recorridos revisar en http://localhost:3001/ para comprobar las observaciones del documento. No implementes las mejoras todavía.
```

## Paso 2 — Formulario de producto con lo esencial primero

```text
Implementá la simplificación del formulario de producto en CatalogEditor, usando el plan del paso 1 si existe.

Vista inicial, tanto al crear como al editar:
- Nombre.
- Código de barras/código, con las reglas actuales; si el sistema permite artículos sin código, no los vuelvas obligatorios.
- Precio de venta por unidad.
- Costo por unidad.
- Stock expresado en la unidad de venta.
- Acción principal “Guardar producto” y acción secundaria “Cancelar”.

Mové a una sección desplegable “Más opciones” la categoría, marca, proveedor, código de proveedor, tipo de unidad, unidades por bulto, etiquetas, grupo de margen, ícono y demás atributos secundarios que encuentres. Conservá sus valores, ayudas y validaciones. Agrupalos por tema dentro de esa sección si mejora la lectura.

Condiciones importantes:
1. Más opciones empieza cerrada al crear un producto; al editar, mostrale al usuario un resumen breve de configuraciones relevantes, por ejemplo “Bulto de 24 · Bajo margen”, sin desplegar todo.
2. Usá los valores predeterminados que ya admite el sistema. No inventes una categoría inexistente ni sobrescribas atributos guardados al editar con la sección cerrada.
3. Si hay una validación pendiente dentro de Más opciones, abrí la sección y llevá el foco al campo con error. Mantenerla cerrada no debe impedir guardar sin explicación.
4. Si un producto se vende por kg o litro, las etiquetas de precio/costo/stock deben reflejarlo para no inducir errores. Conservá el cálculo existente de bultos y su distinción respecto de la unidad de venta.
5. La ayuda de IA para completar datos debe quedar como acción secundaria explícita, sin consultas por cada pulsación ni cambios silenciosos en campos ingresados. Preservá búsquedas deterministas existentes por código.
6. Enter, Tab y Escape deben seguir funcionando sin provocar envíos accidentales al editar etiquetas o seleccionar resultados.

Criterios de aceptación: se puede crear un producto básico sin abrir Más opciones; se puede editar solamente el precio de uno existente sin alterar marca, proveedor, pack_size, margin_group u otros atributos.

Guía de Pruebas: crear un producto básico; editar un producto con bultos y bajo margen sin desplegar opciones; provocar un error en un campo secundario; comprobar el formulario en pantalla móvil y con teclado.
```

## Paso 3 — Lenguaje y acciones claras para caja y turno

```text
Implementá un lenguaje operativo consistente en navegación, venta, caja, configuración, ayudas y mensajes. Partí del glosario del paso 1.

Aplicá estas distinciones:
- Caja: puesto de cobro. En configuración puede decir “Cajas de cobro” y explicar “Los puestos desde donde atendés”.
- Turno: período de trabajo de una persona en una caja; se abre con un efectivo inicial y se cierra contando el efectivo.
- Registro de ventas: agrupación elegida para organizar ventas. No es un puesto de cobro y no determina si una venta tiene factura.

Cambios concretos:
1. Preferí acciones visibles como “Vender”, “Abrir turno”, “Registrar ingreso o retiro”, “Cerrar turno” y “Ver ventas”. Coordiná títulos de escritorio, móvil, ayudas y estados vacíos.
2. Desde Vender sin turno abierto, permití llegar directamente a la apertura de la caja correspondiente con el contexto conservado. No agregues pasos intermedios ni abras turnos automáticamente.
3. Mostrá sucursal, caja y estado actual de forma compacta. Si un dato ya está asignado al cajero y no puede cambiarlo, mostralo como contexto, sin un selector que aparente ser editable.
4. Si existe una única opción válida de registro/lista/caja, evitá exigir que el usuario la seleccione. Conservá su identificación visible cuando sea necesaria para entender dónde opera.
5. Si hay varias opciones, explicá su efecto con una frase breve y conservá las restricciones por sucursal y rol. No cambies una selección válida sin avisar ni cambies el contexto de una venta en curso.
6. Conservá la modalidad de arqueo a ciegas del cajero. Explicala en lenguaje cotidiano, sin mostrar el efectivo esperado ni las diferencias reservadas al administrador.

El alcance es interfaz y navegación: no renombres tablas, RPC, IDs, rutas internas ni contratos de datos. No asocies automáticamente un registro a una condición fiscal ni cambies el arqueo.

Criterios de aceptación: un cajero puede ubicar cómo empezar a vender y cómo terminar su turno sin leer un manual; las tres nociones no se presentan como variantes de la misma caja.

Guía de Pruebas: recorrer apertura → venta → cierre con un cajero; repetir con administrador; comprobar un comercio con una sola caja y otro con varias, incluida una caja ocupada por otro usuario.
```

## Paso 4 — Configuración progresiva para comercios chicos y grandes

```text
Simplificá Mi comercio y los accesos de configuración usando StoreSettings, BusinessSettings y la navegación existente.

No agregues un interruptor obligatorio “modo simple/modo avanzado” ni una nueva configuración que la persona deba comprender para empezar. Adaptá la información visible a las opciones activas y a los permisos reales.

Diseño esperado:
1. Entrada breve a Mi comercio con datos básicos y accesos descriptivos: “Datos del comercio”, “Locales y cajas”, “Personas con acceso” y “Más opciones”, reutilizando las secciones existentes cuando corresponda.
2. Con un local y una caja, mostrá un resumen compacto de ambos y una acción “Administrar locales y cajas”; evitá desplegar todos los formularios de edición desde el inicio.
3. Equipo debe mostrar un resumen y “Agregar persona”, sin exigir configurar empleados para operar un comercio unipersonal.
4. Listas de precios y registros de ventas deben seguir siendo accesibles, pero sin formularios extensos abiertos por defecto. Las listas deben tener una ubicación principal clara y accesos contextuales desde productos/precios, evitando duplicar editores.
5. Formularios de crear o editar aparecen por intención: “Agregar sucursal”, “Agregar caja”, “Crear lista” o “Editar”. Evitá una página con un formulario abierto por cada registro existente.
6. Conservá accesos de notificaciones y PWA. Un enlace desde un aviso debe abrir la sección correcta aunque normalmente esté plegada.
7. No ocultes opciones relevantes solo porque todavía no hay datos: un administrador debe poder descubrir cómo agregar la segunda sucursal, invitar al primer cajero o crear su primera lista.

Mantené las listas de sucursal, asignaciones de personal y configuraciones existentes. Si se desactiva una opción, nunca borres su información como efecto de un cambio visual. No simules permisos mediante estilos.

Criterios de aceptación: un comercio con una caja no necesita recorrer configuración de múltiples sucursales; uno con varias conserva el acceso a cada local y sus reglas sin perder datos ni contexto.

Guía de Pruebas: revisar ambos tamaños de comercio; crear y editar una sucursal/caja/lista; cancelar un formulario sin perder otros borradores; entrar desde un aviso de la PWA; verificar visibilidad para cajero y administrador.
```

## Paso 5 — Inicio guiado breve para un comercio nuevo

```text
Implementá un inicio guiado para el administrador de un comercio recién creado, reutilizando la creación real de tienda y los formularios simplificados de los pasos anteriores.

Antes de implementar, revisá qué crea retail.createStore y su RPC: sucursal, caja, categorías o registro predeterminado. Reutilizá esos registros; no crees duplicados para alimentar el asistente.

Flujo de tres pasos:
1. “Tu comercio”: confirmar nombre y mostrar el local/caja inicial que ya exista. Pedí solo datos imprescindibles. Si es necesario crear recursos faltantes, usá las operaciones autorizadas existentes.
2. “Tus productos”: permitir cargar el primer producto con el formulario básico y ofrecer un acceso secundario a la importación existente. El usuario puede agregar más o continuar. Si omite este paso, explicá cómo cargar productos después, sin inventar artículos de ejemplo.
3. “Empezar a vender”: mostrar el contexto de trabajo y pedir confirmar el efectivo inicial para abrir turno. Usá el flujo real de apertura, con sus validaciones, y luego llevá a Vender. Si ya hay un turno válido, ofrecé continuar sin abrir otro.

Requisitos:
- Ofrecé “Configurar después” y un acceso claro para retomar los pendientes. Salir del asistente no debe marcar como realizadas tareas que no se hicieron.
- No se lo muestres a cajeros ni obligues a comercios existentes a recorrerlo tras actualizar la app. Explicá cómo distinguís un comercio nuevo de uno existente; no uses únicamente “no tiene productos”.
- Resolvé de forma explícita persistencia y compatibilidad: el avance debe estar asociado al comercio y permitir retomar desde otro dispositivo. Reutilizá metadatos persistentes existentes si sirven; si no, prepará una migración mínima con permisos adecuados y una inicialización que respete comercios anteriores. localStorage puede ayudar como caché, pero no ser la única fuente del estado compartido.
- No marques el avance si falla la operación. Evitá creaciones/aperturas duplicadas por doble clic, recarga, reintentos o dos dispositivos; respetá la idempotencia y restricciones existentes.
- Conservá los borradores al retroceder. Un error de red permite reintentar y no repite pasos ya completados. No prometas configuración offline si el backend la requiere.
- No encadenes automáticamente solicitudes del navegador de instalación, cámara y notificaciones dentro de los pasos. Conservá el flujo de permisos existente sin acumular diálogos sobre el asistente.

Criterios de aceptación: un administrador nuevo llega a una caja lista para vender sin configurar listas, equipo ni IA; una tienda existente sigue funcionando sin onboarding intrusivo.

Guía de Pruebas: comercio nuevo, omisión y reanudación, recarga entre pasos, segundo dispositivo, fallo de red y comercio existente. Comprobá que solo se creen los recursos necesarios y que no haya turnos duplicados. No realices ventas de prueba en datos de producción.
```

## Paso 6 — IA como ayuda contextual y opcional

```text
Reducí la presencia de IA en la interfaz sin eliminar sus funciones ni alterar sus cálculos.

Revisá AIAssistant, AiAssistantWidget, AIReportPanel, PosTab, CatalogEditor y sus puntos de entrada reales.

Cambios esperados:
1. Dejá un acceso secundario y consistente al asistente, por ejemplo “Consultar al asistente”, desde Ayuda o una ubicación equivalente. Conservá el acceso al análisis completo para administradores.
2. Evitá tener a la vez una pestaña principal, un botón flotante y varios llamados destacados a la misma ayuda. Elegí un acceso general principal y accesos contextuales donde aporten una tarea concreta.
3. En Productos, usá acciones secundarias “Sugerir datos” o “Analizar stock”. En informes, “Explicar estos resultados”. En facturas/remitos, mantené acciones explícitas como “Procesar factura” o “Procesar con IA” según corresponda, sin perder claridad sobre el uso de IA.
4. Vender, cargar un producto manualmente, registrar movimientos y cerrar turno deben poder completarse sin abrir el asistente ni esperar una respuesta IA. El cierre persistido y su confirmación no deben depender de generar un análisis; si hay un resumen opcional, que tenga estado y reintento independientes.
5. La asistencia general no debe abrirse sola, tapar Cobrar, capturar teclas del lector ni generar peticiones sin intención del usuario. Revisá consultas automáticas actuales y convertí las generativas en acciones explícitas cuando corresponda.
6. Conservá el procesamiento específico de OCR, vinculaciones, memoria de proveedor, remitos y propuestas de precios. Estos módulos deben seguir accesibles en sus tareas, sin convertirse en una consulta conversacional obligatoria.
7. Un fallo o límite de Groq debe quedar dentro de la herramienta que lo originó. No debe bloquear el resto de la aplicación ni simular resultados. Conservá llama-3.1-8b-instant como valor predeterminado y la configuración por entorno.

No cambies las métricas ni su separación de bajo margen. No elimines ayudas accesibles solo para despejar visualmente la pantalla.

Criterios de aceptación: las tareas diarias siguen siendo evidentes sin usar IA; quien necesita análisis puede encontrarlo; no hay entradas generales redundantes ni esperas de IA bloqueando operaciones deterministas.

Guía de Pruebas: venta, alta manual y cierre sin IA; consulta contextual voluntaria; Groq no configurado o sin conexión; acceso a factura/remito y propuesta de precios; navegación móvil con el asistente abierto y cerrado.
```

## Paso 7 — Revisión integrada y ajustes finales

```text
Revisá los cinco cambios implementados como una única experiencia. Usá docs/ux-simplificacion-plan.md como referencia, sin suponer que cada paso anterior quedó perfecto.

Corregí incoherencias, accesos rotos, campos perdidos o decisiones repetidas que provengan de esta simplificación. No agregues funcionalidades nuevas ni otro rediseño global.

Revisá estos recorridos:
1. Administrador nuevo: crear comercio → configuración mínima → primer producto → abrir turno → quedar listo para vender.
2. Cajero asignado: iniciar sesión → abrir turno → escanear → cobrar por teclado → registrar retiro → cerrar turno. Sin acceso a administración ni movimientos de otras personas.
3. Administrador existente: editar precio sin alterar campos avanzados → reponer por bultos → revisar remito pendiente → consultar ventas.
4. Comercio con varias sucursales: cambiar local con carrito protegido, respetar lista predeterminada y restricciones de caja; encontrar listas y transferencias.
5. PWA móvil: teclado virtual, botones alcanzables, formularios, foco y navegación atrás; sin superposición de IA, avisos o instalación sobre acciones principales.
6. Venta offline con la configuración ya disponible: conservar operación y sincronización existentes; las herramientas que necesitan conexión deben explicarlo sin bloquear la caja.

Actualizá el documento del plan con una comparación antes/después de los pasos obligatorios que se puedan verificar, accesos avanzados definitivos y pendientes reales. No inventes mediciones de facilidad de uso.

Ejecutá solo npx tsc --noEmit -p tsconfig.app.json como comprobación de código. No ejecutes build ni pruebas automatizadas adicionales.

Entregá una Guía de Pruebas en http://localhost:3001/ que permita al dueño comprobar los recorridos, con resultado esperado por paso. Señalá si hay migraciones locales sin aplicar y qué partes requieren validación manual en navegador, móvil, backend u otro dispositivo.

La revisión no equivale a una prueba de usabilidad con personas. Agregá una propuesta breve para observar a una persona nueva creando un producto, cobrando y cerrando turno sin instrucciones; registrar dónde se detiene y qué texto no entiende, sin afirmar que esa prueba ya ocurrió.
```

## Guía de Pruebas de este documento

1. Abrí este archivo y comprobá que el contexto común y cada prompt estén en bloques separados que puedas copiar.
2. Empezá por el Paso 1: debe generar un plan basado en el repositorio sin cambiar la aplicación.
3. Para cada paso posterior, pegá el contexto común seguido del prompt correspondiente y revisá su entrega antes de avanzar.
4. Las pruebas de la app se realizan en http://localhost:3001/ después de implementar cada paso. Este documento por sí solo no modifica pantallas, datos ni permisos.
