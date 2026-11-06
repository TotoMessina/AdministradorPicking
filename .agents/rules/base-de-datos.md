---
trigger: model_decision
description: Leer antes de crear o cambiar SQL, migraciones, RLS, funciones de Supabase o el instalador schema.sql.
---

# Base de datos y SQL — AdministradorKiosco

Complementa [directrices_trabajo.md](directrices_trabajo.md). Procedimiento completo y errores conocidos en [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md): consultar solo la sección necesaria.

- Entrada SQL: `supabase/schema.sql`, generada con `node scripts/generate-schema.mjs` desde `supabase/migrations/`. Regenerar tras agregar una migración; no editar bloques generados a mano ni leer `schema.sql` entero (es generado y muy grande).
- Actualización individual solicitada: `node scripts/generate-schema.mjs --individual-updates` genera `supabase/updates/` para la base conciliada hasta `202610260003_billing_fields.sql`. Usar esos paquetes en orden, uno por ejecución, con el mismo historial/checksums; no aplicar fuentes sueltas de migrations ni registrar pasos a mano. No supone autorización para ejecutar SQL remoto.
- Conservar migraciones originales como historial/fuente. Corregir una migración registrada mediante una nueva, no editándola. No ignorar errores ni agregar `CASCADE` para forzar instalación.
- Schema usa historial privado, checksums y una transacción. En bases manuales exige baseline confirmado; no inferirlo solo por columnas o productos existentes. El baseline confirmado el 23/10/2026 llega a `202610230002_ingredients_and_composition_costs.sql`: no avanzarlo automáticamente al agregar archivos ni asumir que vale para otro entorno.
- Excluir del instalador `maintenance/`, `tests/` y `push-schedule.sql`. La tarea push requiere despliegue y Vault; reparar otro proyecto es una operación aparte.
- Verificar el proyecto destino en acciones autorizadas. Hay antecedentes de SQL ejecutado en otro proyecto.
- Generar schema con el script local es empaquetado de archivos, no aplicación de SQL ni prueba contra una base. TypeScript no valida SQL, RLS ni apariencia.
