---
trigger: always_on
---

# Directrices de trabajo — AdministradorKiosco

Reglas que valen siempre. Las de cada tema se leen **solo si la tarea lo toca**:

| Si la tarea toca… | Leer antes |
| --- | --- |
| SQL, migraciones, RLS, funciones de Supabase | [base-de-datos.md](base-de-datos.md) |
| Ventas, caja, precios, stock, depósito, combos, offline, IA | [producto.md](producto.md) |
| Pantallas, formularios, estilos, textos visibles | [ui.md](ui.md) |

Para ubicar código, usar el **Mapa de código** de [README.md](../../README.md#mapa-de-código) antes de buscar.

## Cómo trabajar

- Trabajar sobre el estado real del repositorio; no asumir que un paso anterior quedó perfecto.
- Preservar cambios locales ajenos al pedido, incluidos archivos sin seguimiento. No limpiar trabajo con reset/checkout ni restauraciones masivas.
- Buscar con `rg` y leer rangos acotados, no archivos enteros grandes. No leer `supabase/schema.sql`, `supabase/updates/` ni `package-lock.json` (generados). Evitar volcados y reescrituras innecesarias.
- Reutilizar componentes, servicios y flujos existentes. Cambios acotados, sin dependencias ni rediseños globales innecesarios.
- Avanzar con criterio dentro del alcance autorizado. Consultar solo si falta una decisión funcional importante.
- Ante un fallo, identificar la causa antes de actuar. No repetir a ciegas el mismo comando ni ocultar errores.
- No delegar en subagentes salvo pedido explícito. El usuario realiza las comprobaciones manuales: no automatizar navegador/dispositivo sin que lo pida.
- Comunicar en español, breve. No afirmar pruebas, despliegues ni mediciones que no ocurrieron.

## Verificación permitida

- Única comprobación de código: `npx tsc --noEmit -p tsconfig.app.json`, **una vez al terminar** los cambios de TypeScript (no después de cada edición). Si solo cambia documentación o SQL, no hace falta.
- No ejecutar builds, lint, suites automatizadas ni otras comprobaciones. No reiniciar ni interrumpir el servidor de desarrollo sin necesidad y autorización.
- No crear ventas, movimientos ni otros datos ficticios en producción para probar.

## Seguridad (siempre)

- No aplicar migraciones remotas, borrar datos ni ejecutar reparaciones por iniciativa propia. Preparar SQL local y explicar su aplicación y efectos.
- No exponer `.env.local`, `.env.push.local`, tokens, claves privadas ni `service_role`.
- Ocultar controles no reemplaza permisos efectivos: conservar RLS, membresías, asignaciones, privacidad de movimientos/comprobantes y arqueo a ciegas del cajero. Cajero/supervisor no equivalen a administrador; evitar autoampliación de permisos.
- Mantener idempotencia, IDs de reintento y validaciones de concurrencia. Un error no debe marcar avance, duplicar operaciones ni descartar pendientes.

## Documentación

- Actualizar una guía **solo si cambia un comportamiento, una decisión o un procedimiento**; no por ajustes visuales menores ni para registrar la intervención. No crear un `.md` por ajuste; índice en README.md.
- `docs/ux-simplificacion-plan.md` se toca solo si cambia una decisión de acceso o UX vigente.

## Entrega

Respuesta final corta, en este orden:

1. **Cambios**: qué se hizo, en pocas líneas.
2. **Verificación**: qué se ejecutó (o "ninguna") y SQL preparado sin aplicar, si lo hay.
3. **Guía de Pruebas** (solo si cambia algo visible o de comportamiento): 3 a 5 pasos en **http://localhost:3001/** con resultado esperado; agregar SQL Editor o móvil si corresponde. Es una propuesta, no una prueba ejecutada.
4. **Pendientes reales**, si los hay.
