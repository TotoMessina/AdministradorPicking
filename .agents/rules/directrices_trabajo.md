---
trigger: always_on
---

# Directrices de trabajo — AdministradorKiosco

## Cómo trabajar

- Trabajar sobre el estado real del repositorio. Leer estas reglas antes de editar y consultar las guías desde README.md; no asumir que un paso anterior quedó perfecto.
- Preservar cambios locales ajenos al pedido, incluidos archivos sin seguimiento. No limpiar trabajo con reset/checkout ni restauraciones masivas.
- Buscar con `rg` y lecturas acotadas. Evitar volcados grandes y reescrituras innecesarias. Una consolidación explícitamente pedida autoriza generar su resultado desde las fuentes, sin imprimirlo entero.
- Reutilizar componentes, servicios y flujos existentes. Cambios acotados, sin dependencias ni rediseños globales innecesarios.
- Avanzar con criterio dentro del alcance autorizado. Consultar si falta una decisión funcional importante; no pedir confirmación por cada ajuste reversible.
- Ante un fallo, identificar la causa antes de actuar. No repetir a ciegas el mismo comando ni ocultar errores. Pedir ayuda si el bloqueo exige información o autorización del usuario.
- No delegar en subagentes salvo pedido explícito. El usuario realiza las comprobaciones manuales: no automatizar navegador/dispositivo para chequear sin que lo pida.
- Comunicar avances breves en español y limitaciones reales. No afirmar pruebas, despliegues ni mediciones que no ocurrieron.

## Verificación permitida

- Única comprobación de código: `npx tsc --noEmit -p tsconfig.app.json`.
- No ejecutar builds (`npm run build`, `next build` u otros), lint, suites automatizadas ni comprobaciones adicionales de código. No reiniciar ni interrumpir el servidor de desarrollo sin necesidad y autorización.
- No crear ventas, movimientos ni otros datos ficticios en producción para probar.
- Si solo cambia documentación/SQL y no TypeScript, no hace falta TypeScript; tampoco valida SQL, RLS ni apariencia.
- Generar schema con el script local es empaquetado de archivos, no aplicación de SQL ni prueba contra una base.

## Base de datos y seguridad

- No aplicar migraciones remotas, borrar datos ni ejecutar reparación por iniciativa propia. Preparar SQL local y explicar su aplicación y efectos.
- Entrada SQL: `supabase/schema.sql`, generada con `node scripts/generate-schema.mjs` desde `supabase/migrations/`. Regenerar tras agregar una migración; no editar bloques generados a mano.
- Actualización individual solicitada: `node scripts/generate-schema.mjs --individual-updates` genera `supabase/updates/` para la base conciliada hasta `202610260003_billing_fields.sql`. Usar esos paquetes en orden, uno por ejecución, con el mismo historial/checksums; no aplicar fuentes sueltas de migrations ni registrar pasos a mano. No supone autorización para ejecutar SQL remoto.
- Conservar migraciones originales como historial/fuente. Corregir una migración registrada mediante una nueva, no editándola. No ignorar errores ni agregar `CASCADE` para forzar instalación.
- Schema usa historial privado, checksums y una transacción. En bases manuales exige baseline confirmado; no inferirlo solo por columnas o productos existentes. El baseline confirmado el 23/10/2026 llega a `202610230002_ingredients_and_composition_costs.sql`: no avanzarlo automáticamente al agregar archivos ni asumir que vale para otro entorno.
- Excluir del instalador `maintenance/`, `tests/` y `push-schedule.sql`. La tarea push requiere despliegue y Vault; reparar otro proyecto es una operación aparte.
- Verificar el proyecto destino en acciones autorizadas. Hay antecedentes de SQL ejecutado en otro proyecto. No exponer `.env.local`, `.env.push.local`, tokens, claves privadas ni `service_role`.
- Ocultar controles no reemplaza permisos efectivos: conservar RLS, membresías, asignaciones, privacidad de movimientos/comprobantes y arqueo a ciegas del cajero.
- Perfiles de cajero/supervisor no equivalen a administrador. Mantener límites de delegación y evitar autoampliación de permisos.
- Mantener idempotencia, IDs de reintento y validaciones de concurrencia. Un error no debe marcar avance, duplicar operaciones ni descartar pendientes.

## Operación y reglas del producto

- No cambiar cálculos, facturación, precios, stock ni estados para simplificar una pantalla. Un cambio funcional expresamente pedido debe ser coherente en interfaz, backend y offline.
- Conservar lector/foco de venta, F1–F4, pagos mixtos, importe manual, botonera, carrito y protección al cambiar sucursal/lista/registro.
- Mantener borradores al navegar, importaciones y reposiciones en curso. Cancelar afecta solo al editor correspondiente.
- Conservar catálogo y stock total por comercio, bulto/unidad, recetas, listas por sucursal, remitos pendientes, transferencias y comprobantes privados. Stock compartido por defecto; un administrador puede activar inventario independiente por sucursal con distribución inicial explícita, tras sincronizar dispositivos y cerrar turnos.
- Depósito opcional: `stock` sigue siendo el total físico. Sin inventario por sucursal, salón/depósito son compartidos. Con inventario por sucursal, venta y componentes consumen solo la sucursal de la caja; depósito conserva su saldo central. Confirmar traslados mueve saldos, sin cambiar total ni costos; requiere conexión y deja historial. No duplicar stock al activar, borrar saldos al desactivar ni reproducir registros históricos como movimientos. Fondos por sucursal/depósito separados de turnos, con permiso explícito `manage_funds`; sin afectar arqueos, ventas ni efectivo esperado.
- Insumos: pueden tener stock/costo sin precio de venta, sin venta directa. Compuestos: consumen componentes, sin segundo stock físico; costo = cantidades × costos. No convertir ni borrar existencias por una opción visual.
- Crear combo o paquete abre el formulario específico con componentes desde el inicio y guardado atómico; no volver al alta normal seguida de una segunda configuración que pueda dejar productos incompletos.
- Cigarrillos: stock en unidades individuales, paquete/suelto con precios independientes y reposición por atados con una sola conversión.
- Bajo margen automático sobre `(precio − costo) / precio`, límite inicial 10% configurable. Costo 0 es desconocido; mantener separación estándar/bajo margen e instantáneas históricas.
- Alta de producto por porcentaje sobre costo: $100 +30% = $130. Principal única/global, derivadas en cadena conservando ajustes/fijos; lista exclusiva activa de sucursal tiene prioridad. Costo nuevo recalcula productos con porcentaje; anteriores conservan precio manual hasta convertirlos por intención. Una edición explícita incompatible de precio lo deja manual. No confundir aumento sobre costo con margen bruto; no reescribir tickets ni repriciar carritos en curso.
- Caja = puesto de cobro. Turno = período de trabajo abierto con efectivo y cerrado contando efectivo. Registro de ventas = agrupación; no es caja ni define condición fiscal.
- Conservar PWA, avisos, caché por cuenta y sincronización. No prometer configuración offline si requiere backend ni borrar colas para resolver errores.
- IA secundaria y voluntaria: no bloquea vender, guardar producto, registrar movimiento ni confirmar cierre. Fallos de Groq quedan en la herramienta; no simular respuestas. Conservar `llama-3.1-8b-instant` y configuración por entorno.
- No modificar `invoicePricingService.ts` ni `InvoicePriceProposal.tsx` salvo pedido posterior que incluya explícitamente esos módulos.

## UX/UI y accesibilidad

- Campos de importes, cantidades, stock y porcentajes: usar `NumberInput`, con puntos de miles y coma decimal (`1.234.567,50`). Mantener valores canónicos sin separadores en cálculos, formularios y persistencia, sin redondeos nuevos. No aplicar formato numérico a códigos de barras, teléfonos, documentos ni otros identificadores.
- Español claro, pocas decisiones simultáneas y acciones descriptivas. Mantener paleta y separación de secciones, con estilo sobrio.
- Jerarquía por agrupación, espacio y prioridad. Evitar botones duplicados, botones que llevan a otro menú de botones y encabezados/contextos redundantes.
- Distinguir consultar, crear y editar. Formularios por intención, títulos claros y Guardar/Cancelar alcanzables en móvil. Opciones avanzadas descubribles, sin competir con tareas habituales.
- Etiquetas, teclado y foco visible. Controles ocultos sin foco ni validaciones invisibles; pantallas ocultas sin listeners que interfieran. Un error plegado debe revelar y enfocar su campo.
- Respetar movimiento reducido, teclado virtual y áreas seguras. IA, instalación y avisos no deben cubrir Cobrar ni otras acciones principales.
- No exigir selecciones ya resueltas por asignaciones o por una única opción válida. Contexto compacto y selecciones protegidas en ventas en curso.

## Documentación y entrega

- Mantener guías vigentes por tema e índice en README.md. No crear un `.md` por cada ajuste. Consolidar información útil antes de retirar archivos y actualizar enlaces.
- `docs/ux-simplificacion-plan.md` conserva decisiones actuales, recorridos verificables y pendientes, sin historial interminable de intervenciones.
- Finalizar con cambios, comprobaciones ejecutadas y pendientes reales; indicar SQL preparado sin aplicar. Distinguir explícitamente pruebas ejecutadas de las propuestas.
- Incluir siempre **Guía de Pruebas** con **http://localhost:3001/**, acciones y resultado esperado. Añadir SQL Editor, móvil u otro dispositivo si corresponde, sin afirmar que se probaron.
- Una revisión de código no es una prueba de usabilidad con personas. Si se propone observar a alguien nuevo, registrar dónde se detiene y qué texto no entiende, sin inventar resultados.
