---
trigger: model_decision
description: Leer antes de cambiar pantallas, formularios, estilos, textos visibles o navegación.
---

# UX/UI y accesibilidad — AdministradorKiosco

Complementa [directrices_trabajo.md](directrices_trabajo.md). Decisiones de acceso por tarea en [docs/ux-simplificacion-plan.md](../../docs/ux-simplificacion-plan.md); leer solo la fila o sección necesaria.

- Campos de importes, cantidades, stock y porcentajes: usar `NumberInput`, con puntos de miles y coma decimal (`1.234.567,50`). Mantener valores canónicos sin separadores en cálculos, formularios y persistencia, sin redondeos nuevos. No aplicar formato numérico a códigos de barras, teléfonos, documentos ni otros identificadores.
- Español claro, pocas decisiones simultáneas y acciones descriptivas. Mantener paleta y separación de secciones, con estilo sobrio.
- Jerarquía por agrupación, espacio y prioridad. Evitar botones duplicados, botones que llevan a otro menú de botones y encabezados/contextos redundantes.
- Distinguir consultar, crear y editar. Formularios por intención, títulos claros y Guardar/Cancelar alcanzables en móvil. Opciones avanzadas descubribles, sin competir con tareas habituales.
- Etiquetas, teclado y foco visible. Controles ocultos sin foco ni validaciones invisibles; pantallas ocultas sin listeners que interfieran. Un error plegado debe revelar y enfocar su campo.
- Respetar movimiento reducido, teclado virtual y áreas seguras. IA, instalación y avisos no deben cubrir Cobrar ni otras acciones principales.
- No exigir selecciones ya resueltas por asignaciones o por una única opción válida. Contexto compacto y selecciones protegidas en ventas en curso.
- Confirmaciones con `askConfirm` (`src/components/ConfirmHost.tsx`); desplegables con `<details data-dropdown>` ([dropdownMenus.ts](../../src/components/dropdownMenus.ts)).
- Una revisión de código no es una prueba de usabilidad con personas. Si se propone observar a alguien nuevo, registrar dónde se detiene y qué texto no entiende, sin inventar resultados.
