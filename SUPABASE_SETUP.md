# Supabase: instalación y actualización desde schema

El archivo único para instalar/actualizar la base es **[supabase/schema.sql](supabase/schema.sql)**. Contiene las **30 migraciones actuales**, en orden de nombre completo, y registra cada una en `retail_private.schema_migrations`. No hay que pegar treinta archivos por separado.

## Proyecto y alcance

El proyecto de AdministradorKiosco documentado en este repositorio es **lkahqqsduatkhxruiolo**. Confirmar el destino en el [SQL Editor](https://supabase.com/dashboard/project/lkahqqsduatkhxruiolo/sql/new); no ejecutar sobre FilmTracker ni sobre otro proyecto. El SQL no puede comprobar por sí mismo el identificador que muestra el dashboard.

Schema incluye tablas, RLS, funciones, buckets y ajustes de datos de las migraciones. No conecta desde la app ni requiere copiar claves privadas. Quedan fuera:

- `supabase/maintenance/`: diagnóstico y reparación manual, incluidos scripts destructivos para otro proyecto.
- `supabase/tests/`: datos y comprobaciones de prueba, no instalación.
- `supabase/push-schedule.sql`: requiere desplegar `push-dispatch` y configurar Vault; ver [PUSH_SETUP.md](PUSH_SETUP.md).

## Base actual: migraciones manuales ya ejecutadas

El responsable confirmó el **23/10/2026** que ejecutó todos los SQL actuales. Por eso el baseline del archivo queda fijado en **`202610230002_ingredients_and_composition_costs.sql`**.

Al ejecutar schema en una base retail existente sin su historial, registra como **`adopted`** los 30 archivos hasta ese punto, **sin volver a ejecutarlos**. La fecha es de registro de esa declaración, no la fecha histórica de aplicación. No se deduce el estado remoto por tener productos o una columna; tampoco se certifica que los cuerpos instalados coincidan con el repositorio.

Este baseline es una declaración para esa instalación confirmada. **Para otro entorno cuya instalación no esté confirmada, vaciar o corregir `retail.schema_baseline` antes de ejecutar.** Una base existente sin historial y sin baseline se detiene sin aplicar migraciones. La presencia de las nueve tablas base es una comprobación mínima adicional, no una auditoría de todos los objetos.

Si faltan migraciones intermedias o hubo una ejecución fallida, no declarar como completo un prefijo que no lo está. Revisar [el inventario de solo lectura](supabase/maintenance/check_kiosco_installation.sql), las definiciones y el historial real; ese inventario es parcial y no prueba la aplicación de todas las funciones/permisos. Resolver instalaciones parciales por separado, sin borrar tablas ni ignorar errores.

## Ejecutar el archivo completo

1. Conservar un respaldo apropiado del entorno antes de aplicar cambios pendientes y confirmar proyecto/baseline.
2. Abrir `supabase/schema.sql`, copiar **todo** y ejecutar una sola vez en el SQL Editor con la cuenta administrativa del proyecto.
3. Revisar errores y el resultado final: `filename`, `origin` y `registered_at`. Un error revierte la transacción completa, incluido su historial; no continuar ejecutando fragmentos.
4. Actualizar la app y el catálogo en los dispositivos una vez confirmada la instalación.

En una **base nueva de Supabase**, sin objetos retail, el archivo ejecuta las 30 migraciones y registra `origin=schema`; el baseline de adopción no omite nada en ese caso. Se requieren los servicios habituales de Supabase Auth/Storage.

En una **base con historial de schema**, comprueba nombres, orden y SHA-256 de los archivos registrados, y ejecuta solo los posteriores pendientes. Repetirlo sin archivos nuevos no vuelve a hacer backfills, renombrados o altas predeterminadas. Si hay checksums distintos, huecos o entradas desconocidas, se detiene. No es un reparador de objetos borrados o alterados manualmente después de instalar.

Todo corre en una transacción y toma un bloqueo para serializar ejecuciones concurrentes de este mismo instalador. Esto no coordina ejecuciones individuales por otros mecanismos: no combinar instalaciones simultáneas.

## Agregar un cambio futuro

1. Agregar una migración nueva en `supabase/migrations/`, con nombre completo único y transacción exterior `begin; ... commit;`.
2. Ejecutar localmente `node scripts/generate-schema.mjs` y revisar el cambio generado.
3. **No cambiar el baseline fijo al último archivo**: las migraciones nuevas deben ejecutarse como pendientes, no adoptarse como realizadas.
4. Revisar/aplicar el schema en el entorno correspondiente cuando el usuario lo decida. No modificar archivos históricos registrados: preparar otra migración para corregirlos.

Las migraciones originales se conservan como fuente, historial y referencia de herramientas existentes. El orden usa el nombre completo: hay dos archivos `202610190001_*`, por lo que la versión numérica sola no identifica cada cambio. Este historial privado no se importa automáticamente desde `supabase_migrations` ni reemplaza el historial de Supabase CLI. No alternar ambos mecanismos sin conciliar explícitamente sus registros.

## Auth, cuentas y configuración

- Habilitar email/contraseña y confirmación en Authentication. Configurar Site URL y Redirect URLs para desarrollo y producción; SMTP propio si corresponde.
- Completar únicamente variables públicas en `.env.local` desde `.env.example`. `service_role`, contraseñas de base y secretos de administración nunca van en `VITE_*`.
- El alta de colaboradores usa un cliente Auth separado y no reemplaza la sesión del propietario. Una cuenta existente conserva su contraseña; una autorización pendiente se acepta al ingresar con email confirmado. Crear/administrar accesos respeta los roles y perfiles descritos en [Administración](docs/administracion.md).
- Un error de RPC/columna ausente requiere revisar instalación, no inventar datos ni desactivar RLS. Un fallo de Groq no se arregla cambiando permisos de la base.
- Instalar SQL no despliega Edge Functions ni publica frontend. Push requiere los pasos adicionales de [su guía](PUSH_SETUP.md).

## Guía de Pruebas — manual pendiente

1. En una base Supabase desechable nueva, ejecutar schema completo: deben quedar las 30 entradas `schema` y los objetos de la app. Repetir: mismas entradas y sin recursos ni ajustes duplicados.
2. En la instalación manual confirmada, ejecutar con su baseline: entradas `adopted`, sin repetir los cuerpos SQL. Repetir: sin cambios. Verificar tablas, RPC y RLS con las cuentas correspondientes; el historial por sí solo no certifica esos permisos.
3. En un entorno de pruebas existente sin historial, vaciar baseline: debe detenerse antes de aplicar cambios. Restaurarlo solo después de confirmar el estado de ese entorno.
4. Para ensayar una migración futura, usar una copia desechable: agregar un cambio después del baseline, regenerar y aplicar. Debe ejecutarse una vez como `schema`, sin adoptarse ni repetir lo anterior. No cambiar archivos históricos de producción para probar checksums.
5. Abrir http://localhost:3001/: ingresar, consultar catálogo, editar un producto y recorrer apertura → venta → cierre solo en datos de prueba. Repetir con cajero/administrador, insumos/combos y otro dispositivo según las guías.

Ejecutado durante la consolidación: generación local del archivo y revisión de fuentes/enlaces. No se ejecutó SQL en ningún entorno, no se verificó el backend y no se hicieron builds ni pruebas automatizadas. TypeScript no valida el SQL generado.
