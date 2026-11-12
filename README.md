# AdministradorKiosco

Aplicación React/TypeScript con Supabase, PWA y operación offline. Ventas, caja, catálogo compartido, stock por comercio o por sucursal/depósito con activación explícita, fondos por ubicación y permisos efectivos en backend. Emisión optativa de comprobantes fiscales electrónicos ARCA (ex AFIP) con CAE y QR oficial.

## Empezar

1. Instalar dependencias con `npm install`.
2. Completar `.env.local` desde `.env.example`, sin claves privadas ni `service_role`.
3. Seguir [Instalación de Supabase](SUPABASE_SETUP.md). El instalador completo es [supabase/schema.sql](supabase/schema.sql); para la base conciliada está la [actualización en cinco archivos pequeños](SUPABASE_SETUP.md#actualización-individual-después-de-conciliar-34-migraciones).
4. Usar `npm run dev` y abrir http://localhost:3001/ si ese es el puerto disponible. No reiniciar un servidor ya abierto sin necesidad.

## Documentación vigente

| Tema | Guía |
| --- | --- |
| Reglas de trabajo (siempre) y por tema: [base de datos](.agents/rules/base-de-datos.md), [producto](.agents/rules/producto.md), [UI](.agents/rules/ui.md) | [.agents/rules/directrices_trabajo.md](.agents/rules/directrices_trabajo.md) |
| Instalación, historial y actualización SQL | [SUPABASE_SETUP.md](SUPABASE_SETUP.md) |
| Copias de seguridad, restauración y datos sin cubrir | [Copias de seguridad](docs/respaldos.md) |
| Avisos cuando la app falla en un comercio | [Aviso de fallas](docs/aviso-de-fallas.md) |
| Productos, insumos, combos, bultos, margen, categorías, conteo físico y bajas | [Productos y stock](docs/productos-y-stock.md) |
| Inicio guiado, Mi comercio, datos fiscales ARCA, equipo, perfiles, comparar sucursales y actividad | [Administración](docs/administracion.md) |
| Pasar la facturación a producción con el contador | [Lista de control](docs/facturacion-contador.md) |
| Registros, listas, clientes y fiado, anulaciones y devoluciones, retiros, remitos, transferencias, plata en camino y conciliación | [Operación y mercadería](docs/operacion-y-mercaderia.md) |
| Memoria del proveedor, propuestas de precios, pedidos a proveedores y análisis locales | [IA y facturas](docs/ia-y-facturas.md) |
| Caja preparada y sincronización | [OFFLINE_POS.md](OFFLINE_POS.md) |
| Instalación PWA, notificaciones y servidor push | [PUSH_SETUP.md](PUSH_SETUP.md) |
| Decisiones UX actuales y recorridos pendientes | [Plan vigente](docs/ux-simplificacion-plan.md) |
| Diagnóstico y reparación separados del instalador | [Mantenimiento](docs/mantenimiento.md) |
| Contrato de integración PickingUp | [Especificación](pickingup_integration_specification.md) |

Las guías reunieron documentos anteriores por funcionalidad. Los prompts ya ejecutados y los informes de cada intervención se retiraron; las migraciones originales y los procedimientos útiles se conservan.

## Estructura y verificación

La app activa está en `src/features/retail`; Vender usa `src/components/PosTab.tsx` (partes en `src/components/pos/`). Los estilos se cargan desde `src/styles/app.ts`. Reutilizar componentes y tokens existentes, con la paleta actual.

### Mapa de código

Rutas bajo `src/`; `retail/` = `src/features/retail/`. Archivos chicos, con una responsabilidad cada uno (objetivo: menos de ~300 líneas). Un componente grande queda como `X.tsx`, que compone. Su carpeta (`retail/x/` o `components/x/`) tiene `useX.ts`, que arma el estado con los sub-hooks `useX*.ts` en orden, y las vistas, que reciben ese estado como `state` y desestructuran lo que usan. Las vistas `Catalog*`/`Invoice*Step` reciben el estado del hook como `s`. Las carpetas `api/` y `offline/` tienen un `index.ts` que reexporta, así los imports no cambian.

| Área | Dónde mirar |
| --- | --- |
| Shell, navegación y pestañas | `retail/RetailApp.tsx` (sesión y comercio), `retail/workspace/` (`Workspace.tsx`, `useWorkspace*.ts`, una vista por pestaña), `retail/SectionNav.tsx`, `retail/HomeTab.tsx` |
| Vender (lector, carrito, cobro, ticket) | `components/PosTab.tsx` y `components/pos/` (carrito, cobro, fiado, importe manual), `components/ThermalReceiptModal.tsx` y `components/thermalReceipt/`, `retail/QuickProducts.tsx`, `retail/payments.ts` |
| Offline y sincronización | `retail/offline/` (`offlineStore`: caché y cola; `offlineSync`; `offlineLocal`: operaciones sin conexión; `withOffline`), `pwa/sw.js`, `retail/OfflineStatus.tsx` |
| Caja, turnos, retiros y arqueo | `retail/CashDesk.tsx` y `retail/cashDesk/` (apertura, cierre, actividad, historial), `retail/CashMovementForm.tsx`, `retail/CashDenominationFields.tsx`; recibos numerados de movimientos en `retail/MovementReceipt.tsx` |
| Ventas, devoluciones y registros | `retail/SalesOverview.tsx`, `retail/SaleReturn.tsx`, `retail/SaleLedgerControl.tsx`, `retail/ledgerRouting.ts`; sucursales y registros de ventas en `retail/BranchSettings.tsx`, `retail/LedgerSettings.tsx` (`retail/businessSettings/`) |
| Catálogo de productos (planilla) | `retail/CatalogEditor.tsx` compone las vistas; estado y acciones en `retail/useCatalogEditor.tsx` (sub-hooks en `retail/catalogEditor/`). Vistas: `CatalogList` (`retail/catalogList/`), `ProductSheet` (planilla: único editor de productos y combos), `CatalogReplenishDialog`, `CatalogReplenishHistory`, `CatalogCsvImport`, `CatalogBulkPrice` (`retail/catalogBulkPrice/`), `CatalogStockAi`; columnas y tipos en `retail/catalogEditorShared.ts` |
| Mi comercio: registros, datos, configuración | `retail/StoreSettings.tsx` (`retail/storeSettings/`), `retail/RegistersSettings.tsx` (`retail/registersSettings/`), `retail/StoreGeneralSettingsForm.tsx` (`retail/storeGeneral/`), `retail/StoreConfiguration.tsx`, `retail/SettingsEditor.tsx`. `retail/Management.tsx` solo reexporta (y `Run` está en `retail/managementTypes.ts`) |
| Planilla, precios y márgenes de producto | `retail/ProductSheet.tsx` (`retail/productSheet/`), `retail/ProductPriceEditor.tsx`, `retail/ProductMarkupField.tsx`, `retail/pricing.ts`, `services/productPresentation.ts` (presentaciones y sus códigos), `services/productSalePrice.ts`, `services/productMarginService.ts` |
| Listas de precios y redondeo | `retail/PriceListSettings.tsx` y `retail/priceLists/` (también se importa desde `retail/BusinessSettings.tsx`), `retail/useBranchPriceList.ts`, `retail/PriceRoundingSettings.tsx` |
| Combos, insumos, sueltos | `retail/NewCompositeEditor.tsx`, `retail/ProductCompositionEditor.tsx`, `services/productComposition.ts`, `retail/LooseCigaretteEditor.tsx` |
| Stock, depósito, conteo, transferencias | `retail/StockCount.tsx` (`retail/stockCount/`), `retail/DepotSettings.tsx`, `retail/LocationTransfers.tsx` (`retail/locationTransfers/`), `services/inventoryUnits.ts` |
| Remitos y reposición | `retail/QuickRemito.tsx`, `retail/PendingReplenishments.tsx`, `retail/remitos.ts`, `services/replenishmentService.ts` (tipos en `services/replenishment/`) |
| Facturas de compra (OCR/IA) | `components/InvoiceAnalyzer.tsx` (compone), `components/useInvoiceAnalyzer.tsx` (estado y acciones; sub-hooks y helpers en `components/invoiceAnalyzer/`), `components/InvoiceInputStep.tsx`, `components/InvoiceReviewStep.tsx` y `components/InvoiceReviewTable.tsx` (partes en `components/invoiceReview/`), `components/invoiceAnalyzerHelpers.ts`, `services/invoice*Service.ts` (OCR en `services/invoiceParser/`), `services/purchaseInvoiceService.ts` (QR de ARCA en `services/purchaseInvoice/`), `services/supplierInvoiceRules.ts` |
| Proveedores, cuentas y pagos | `retail/SupplierAccountSection.tsx`, `retail/SupplierLedger.tsx`, `retail/SupplierPayments.tsx` (`retail/supplierPayments/`), `retail/SupplierSettings.tsx`, `services/supplierAccount.ts` |
| Clientes y fiado | `retail/CustomersTab.tsx` |
| Ganancias, gastos, fondos, conciliación | `retail/FinanceTab.tsx`, `retail/financeApi.ts`, `retail/FundsInTransit.tsx`, `retail/BankReconciliation.tsx` |
| Personas, perfiles y permisos | `retail/permissions.ts`, `retail/PermissionProfiles.tsx`, `retail/StaffAccessForm.tsx`, `retail/staffAccounts.ts` |
| Facturación ARCA | `retail/BillingSettings.tsx` (`retail/billingSettings/`), `retail/billing.ts`, `services/billingService.ts`, `supabase/functions/billing-authorize/` |
| Asistente IA | `components/AIAssistant.tsx` (`components/aiAssistant/`), `components/AIReportPanel.tsx` (`components/aiReport/`), `components/AiAssistantWidget.tsx` (`components/aiWidget/`), `components/AiMarkdownRenderer.tsx` (`components/markdown/`), `services/groqService.ts`; registro de uso y servidor de IA en `lib/aiUsage.ts`; función `supabase/functions/ai-proxy/` |
| Panel de plataforma (superadministrador) | `retail/PlatformAdmin.tsx` (resumen, comercios, usuarios, uso de IA; secciones en `retail/platformAdmin/`), `retail/PlatformBilling.tsx` (planes, abonos y pagos), `retail/PlatformNotices.tsx` (avisos), `retail/PlatformAds.tsx` (publicidad, partes en `retail/platformAds/`; en la app `retail/ads.ts`, `retail/SponsoredCard.tsx`), `retail/PlatformAnnouncements.tsx` (avisos dentro de la app), `retail/platformShared.tsx`, `retail/SubscriptionNotice.tsx` (aviso al dueño), `retail/GlobalCatalog.tsx`; SQL en `202611060001`…`202611060007` |
| Push y avisos de fallas | `retail/push.ts`, `retail/PushSettings.tsx`, `supabase/functions/push-dispatch/`, `lib/errorReporting.ts` |
| Llamadas a Supabase (RPC) | `retail/api/` (un archivo por tema: `products`, `shifts`, `sales`, `suppliers`…; tipos en `api/types.ts`; `api/index.ts` arma `retail`) y `retail/*Api.ts`; SQL fuente en `supabase/migrations/` |
| Tipos y campos numéricos | `types/kiosco.ts`, `components/NumberInput.tsx`, `utils/numberInput.ts` |

Única comprobación de código autorizada: `npx tsc --noEmit -p tsconfig.app.json`. No ejecutar builds, lint ni otras pruebas automatizadas durante el trabajo habitual. Las comprobaciones de navegador, móvil y backend las realiza el usuario y no se dan por hechas.

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) corre TypeScript, lint y `npm test` en cada push a `main` y en cada pull request. No usa secretos ni datos reales: la base es una simulación local en PGlite y las pruebas no salen a internet.

Para actualizar el archivo SQL consolidado después de agregar una migración: `node scripts/generate-schema.mjs`. Genera archivos locales; no conecta a una base ni compila la app. No editar las migraciones ya registradas ni avanzar automáticamente el baseline confirmado.

## Guía de Pruebas

En http://localhost:3001/, con un comercio de pruebas y el backend preparado:

1. Ingresar, abrir turno desde Vender y confirmar efectivo inicial: queda en la caja correspondiente y listo para vender.
2. Buscar/escanear, cobrar por teclado y revisar el último ticket: conserva foco, importe y stock. Probar pago mixto.
3. Agregar un producto, editar precio y reponer por bultos: conserva atributos y convierte una sola vez a unidades.
4. Registrar un retiro y cerrar contando efectivo: guarda una vez; el cajero no ve efectivo esperado ni diferencias reservadas.
5. Revisar permisos y venta offline preparada según las guías específicas. La recarga completa sin red requiere una PWA publicada ya preparada; localhost de desarrollo no reemplaza esa prueba.

Estos pasos son una propuesta manual, no un informe de pruebas ejecutadas. No usar producción para crear ventas ficticias.
