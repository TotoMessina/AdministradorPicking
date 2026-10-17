# Separación de rubros por margen

Aplicar en Supabase la migración pendiente [202610160004_margin_groups.sql](supabase/migrations/202610160004_margin_groups.sql) antes de publicar esta versión. Agrega `margin_group` a los productos, con valor inicial `standard`, y mantiene los permisos existentes de administración. No clasifica productos automáticamente por nombre, categoría o tags.

En **Productos y stock**, editar cada rubro y elegir **Grupo de margen → Bajo margen (Cigarrillos, Cargas, etc.)**. Estos productos muestran una etiqueta naranja **↓ Margen bajo** y se pueden buscar con **Ver solo bajo margen**. Se puede combinar este filtro con categoría, texto y stock bajo.

Los grupos son independientes de los registros de ventas (`SalesLedger`). Un mismo ticket y un mismo registro pueden incluir ambos grupos. Los importes cobrados, tickets, arqueos y exportaciones completas mantienen la facturación total. En el POS, ocultar temporalmente los productos de bajo margen agiliza la grilla y la botonera; un código escaneado sigue reconociéndose y los artículos que ya estaban en el carrito no se eliminan.

## Cálculos

- La facturación principal suma los subtotales de artículos estándar. La de bajo margen se muestra por separado.
- El ticket promedio principal divide la facturación estándar entre los tickets que contienen al menos un artículo estándar. En un ticket mixto se considera solo su parte estándar; los tickets exclusivamente de bajo margen no alteran ese promedio.
- Cada grupo tiene su costo de mercadería, ganancia bruta y margen sobre su propia facturación. El ranking principal y los márgenes por distribuidor excluyen bajo margen.
- **Contribución al margen** expresa qué porcentaje de la ganancia bruta total proviene del grupo de bajo margen: `ganancia bruta bajo margen / ganancia bruta total × 100`. No es el margen sobre las ventas de cigarrillos/cargas. Si la ganancia total no es positiva, se muestra como no disponible.
- Los costos faltantes no se interpretan como cero ni como una ganancia del 100%. Si faltan costos en un grupo, se informa que no se puede determinar su rentabilidad y la contribución total. El costo por defecto 0 del catálogo se considera sin informar. Los importes manuales siguen siendo estándar y sin costo conocido; para clasificar una carga u otro servicio, cargarlo como producto del catálogo con su costo correspondiente.
- Los prompts de los reportes y asistentes reciben esta separación y sus porcentajes observados. No se inventa un límite fijo de margen para estos rubros. Las métricas corresponden a las ventas consultadas por cada pantalla.

Ejemplo: un ticket contiene un producto estándar vendido a $100 con costo $60, y un rubro de bajo margen vendido a $1.000 con costo $980. La facturación principal es $100, su ganancia bruta $40 y su margen 40%; el bajo margen factura $1.000, deja $20 y tiene margen 2%. La facturación total es $1.100 y la contribución del bajo margen a la ganancia bruta es 33,3%. El ticket promedio principal es $100.

## Historial y conexión

Las ventas nuevas guardan el grupo y el costo por unidad de cada artículo. Supabase toma esos valores de los productos del comercio al registrar la venta; el cajero no puede definirlos en el pedido. Un cambio posterior de grupo o costo no recalcula esas ventas ya registradas.

Las ventas anteriores a esta migración carecen de esa información: usan la clasificación y el costo actuales del catálogo, y la pantalla lo aclara. Si el producto anterior ya no está disponible para identificarlo, no se inventa un costo o clasificación. Las ventas guardadas offline usan primero el catálogo local; al sincronizar, Supabase confirma la clasificación y costo con los datos del servidor. Los reportes siguientes utilizan esos valores definitivos.

## Guía de Pruebas

1. Aplicar la migración y abrir `http://localhost:3001/` como administrador.
2. Crear un producto estándar con precio 100 y costo 60, y otro de bajo margen con precio 1.000 y costo 980. Darles stock. Guardar y volver a editar: la selección debe conservarse; el segundo debe mostrar la etiqueta naranja y aparecer en **Ver solo bajo margen**.
3. Vender uno de cada producto en el mismo ticket. En **Cajas y turnos → Resumen y ventas**, comprobar total $1.100, facturación sin bajo margen $100 y bajo margen $1.000. La fila de la sucursal **Ventas excluyendo bajo margen** debe mostrar $100.
4. En el panel IA y el asistente, comprobar ticket promedio principal $100, margen estándar 40%, margen del rubro 2% y contribución 33,3%. Generar un análisis y verificar que trate los dos grupos por separado.
5. Registrar otro ticket solo con el producto de bajo margen. La facturación y ticket promedio principales deben seguir en $100; el total registrado debe aumentar.
6. Cambiar luego el grupo o costo del segundo producto: los tickets nuevos deben usar la configuración nueva y las ventas ya guardadas deben conservar su clasificación y costo originales.
7. Probar un producto sin costo: debe mostrarse la falta de información, sin atribuirle una ganancia del 100%. Probar también el filtro temporal del POS y escanear un producto oculto.

Verificación de código: `npx tsc --noEmit -p tsconfig.app.json`. No se ejecuta el build.
