# AdministradorKiosco

Aplicación React/TypeScript con Supabase, PWA y operación offline. Ventas, caja, catálogo, stock compartido por comercio, sucursales y permisos efectivos en backend. Emisión optativa de comprobantes fiscales electrónicos ARCA (ex AFIP) con CAE y QR oficial.

## Empezar

1. Instalar dependencias con `npm install`.
2. Completar `.env.local` desde `.env.example`, sin claves privadas ni `service_role`.
3. Seguir [Instalación de Supabase](SUPABASE_SETUP.md). El instalador completo es [supabase/schema.sql](supabase/schema.sql); para la base conciliada está la [actualización en cinco archivos pequeños](SUPABASE_SETUP.md#actualización-individual-después-de-conciliar-34-migraciones).
4. Usar `npm run dev` y abrir http://localhost:3001/ si ese es el puerto disponible. No reiniciar un servidor ya abierto sin necesidad.

## Documentación vigente

| Tema | Guía |
| --- | --- |
| Reglas de trabajo y preferencias | [.agents/rules/directrices_trabajo.md](.agents/rules/directrices_trabajo.md) |
| Instalación, historial y actualización SQL | [SUPABASE_SETUP.md](SUPABASE_SETUP.md) |
| Productos, insumos, combos, bultos, margen, categorías y bajas | [Productos y stock](docs/productos-y-stock.md) |
| Inicio guiado, Mi comercio, datos fiscales ARCA, equipo y perfiles | [Administración](docs/administracion.md) |
| Registros, listas, retiros, remitos y transferencias | [Operación y mercadería](docs/operacion-y-mercaderia.md) |
| Memoria del proveedor, propuestas de precios y análisis locales | [IA y facturas](docs/ia-y-facturas.md) |
| Caja preparada y sincronización | [OFFLINE_POS.md](OFFLINE_POS.md) |
| Instalación PWA, notificaciones y servidor push | [PUSH_SETUP.md](PUSH_SETUP.md) |
| Decisiones UX actuales y recorridos pendientes | [Plan vigente](docs/ux-simplificacion-plan.md) |
| Diagnóstico y reparación separados del instalador | [Mantenimiento](docs/mantenimiento.md) |
| Contrato de integración PickingUp | [Especificación](pickingup_integration_specification.md) |

Las guías reunieron documentos anteriores por funcionalidad. Los prompts ya ejecutados y los informes de cada intervención se retiraron; las migraciones originales y los procedimientos útiles se conservan.

## Estructura y verificación

La app activa está en `src/features/retail`; Vender usa `src/components/PosTab.tsx`. Los estilos se cargan desde `src/styles/app.ts`. Reutilizar componentes y tokens existentes, con la paleta actual.

Única comprobación de código autorizada: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar builds, lint ni otras pruebas automatizadas durante el trabajo habitual. Las comprobaciones de navegador, móvil y backend las realiza el usuario y no se dan por hechas.

Para actualizar el archivo SQL consolidado después de agregar una migración: `node scripts/generate-schema.mjs`. Genera archivos locales; no conecta a una base ni compila la app. No editar las migraciones ya registradas ni avanzar automáticamente el baseline confirmado.

## Guía de Pruebas

En http://localhost:3001/, con un comercio de pruebas y el backend preparado:

1. Ingresar, abrir turno desde Vender y confirmar efectivo inicial: queda en la caja correspondiente y listo para vender.
2. Buscar/escanear, cobrar por teclado y revisar el último ticket: conserva foco, importe y stock. Probar pago mixto.
3. Agregar un producto, editar precio y reponer por bultos: conserva atributos y convierte una sola vez a unidades.
4. Registrar un retiro y cerrar contando efectivo: guarda una vez; el cajero no ve efectivo esperado ni diferencias reservadas.
5. Revisar permisos y venta offline preparada según las guías específicas. La recarga completa sin red requiere una PWA publicada ya preparada; localhost de desarrollo no reemplaza esa prueba.

Estos pasos son una propuesta manual, no un informe de pruebas ejecutadas. No usar producción para crear ventas ficticias.
