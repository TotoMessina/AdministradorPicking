# Revertir grupos de margen en el proyecto equivocado

Caso confirmado por el usuario: se ejecutó solamente `202610160004_margin_groups.sql` en otro proyecto y `margin_group` no existía antes. Esta guía aplica a ese caso, no a una desinstalación general de AdministradorKiosco.

## Procedimiento

1. Abrí el SQL Editor del **otro proyecto** y comprobá su identificador en la URL. No ejecutes la reversión en `lkahqqsduatkhxruiolo`, que es el proyecto correcto de AdministradorKiosco. El script no puede comprobar ese identificador por sí solo.
2. Para revisar el estado antes de quitarlo, ejecutá [inspect_margin_groups.sql](../supabase/maintenance/inspect_margin_groups.sql). Es solo lectura: muestra la columna, función y trigger si existen. Si aparecen definiciones ajenas a esta migración, detenerse y contrastar con el esquema anterior.
3. Copiá y ejecutá completo [rollback_wrong_project_margin_groups.sql](../supabase/maintenance/rollback_wrong_project_margin_groups.sql) en ese mismo editor.
4. El resultado final debe mostrar tres indicadores en `false`: columna, función y trigger ya no existen. Si hay un error dentro de la transacción, no lo interpretes como limpieza exitosa; copiá el error para revisar la dependencia o bloqueo. No agregues `CASCADE` para forzarlo.

La reversión elimina la columna agregada **y sus valores**, su restricción/permiso asociado y la función/trigger de la migración. No elimina filas de productos/ventas ni reescribe artículos históricos guardados en el JSON de las ventas. Si hubo ventas mientras el trigger estuvo activo, las claves que haya capturado en esos JSON quedan conservadas. No restaura definiciones previas de funciones/triggers si ya existían con esos nombres; en ese caso se necesita contrastar el esquema anterior.

Los archivos están fuera de `supabase/migrations`, para que no se ejecuten al instalar o actualizar la app. La reversión usa una transacción y `RESTRICT` para no forzar dependencias externas; ver [dependencias de PostgreSQL](https://www.postgresql.org/docs/18/ddl-depend.html). No se conectó ni se modificó el otro proyecto desde esta sesión.

## Guía de Pruebas

1. En el SQL Editor del otro proyecto, verificar el resultado de la reversión: los tres indicadores deben ser `false`. Repetir el inventario debe devolver cero filas en cada consulta.
2. Abrir la aplicación de ese otro proyecto y consultar productos y ventas existentes: deben seguir disponibles. No se conoce su URL en esta sesión.
3. En http://localhost:3001/, que corresponde a AdministradorKiosco, comprobar que el guardado de productos funciona con la migración instalada en su proyecto correcto. La limpieza del otro proyecto no debe ejecutarse sobre esta base.

Verificación realizada: revisión estática de los archivos y de los objetos que agrega la migración. Pendiente: ejecución manual en el proyecto equivocado y pruebas de ambas aplicaciones. No se ejecutó SQL remoto, TypeScript ni build; los cambios son únicamente SQL de mantenimiento y documentación.
