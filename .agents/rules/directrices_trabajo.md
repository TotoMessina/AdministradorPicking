---
trigger: always_on
---

# Directrices de Trabajo y Operación

Aplica a todas las interacciones, tareas y prompts de desarrollo en este repositorio:

## 1. 🧪 Guía de Pruebas Obligatoria al Finalizar
Al concluir cada tarea o prompt, debes incluir siempre una sección final clara, concisa y práctica titulada **"Guía de Pruebas"** o **"Cómo Probar"**, que contenga:
- Ruta o URL local a visitar en el navegador o endpoint a probar.
- Pasos de acción reproducibles (qué botones presionar, qué inputs llenar o qué comando ejecutar).
- Comportamiento y resultado esperado para confirmar que todo funciona correctamente.

## 2. ⚠️ Gestión y Consulta de Consumo de Tokens
- Si una operación requiere inspeccionar, leer o generar grandes volúmenes de código/archivos que disparen el consumo de tokens (ej. volcados masivos, reescritura innecesaria de archivos enormes sin diffs específicos), **consulta primero al usuario**.
- Propón alternativas más ligeras y eficientes (ej. análisis de secciones específicas con ripgrep/grep_search o ediciones específicas con replace_file_content) antes de proceder con lecturas o reescrituras masivas.

## 3. 🛑 Prevención de Bucles e Iteraciones Repetitivas
- No intentes la misma solución fallida repetidamente. Si una corrección, compilación o comando falla o no produce el efecto esperado tras un intento:
  - Detén el ciclo inmediatamente.
  - Explica al usuario la causa raíz del bloqueo o comportamiento inesperado.
  - Plantea las alternativas viables y pide confirmación antes de continuar.

No uses modo agente para hacer los chequeos, esos los hago yo

## 4. 🚫 Prohibido ejecutar `npm run build` en verificaciones de desarrollo
- **No ejecutes `npm run build` o `next build`** para verificar cambios rutinarios. Al hacerlo se sobrescribe la carpeta `.next/`, lo que rompe la sesión de `npm run dev` que el usuario tiene corriendo en su terminal (causando errores 404 en chunks estáticos y bloqueos de archivos `EINVAL`).
- Para verificar tipado, sintaxis, JSX e imports utiliza **exclusivamente `npx tsc --noEmit`**, el cual valida el 100% del código sin tocar el directorio `.next/` ni interferir con el servidor local.