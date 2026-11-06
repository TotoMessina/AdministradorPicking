import { AiIcon } from '../../components/AiIcon';
import { ProductPriceEditor } from './ProductPriceEditor';
import { ProductDeletionEditor, DeletedProducts } from './ProductDeletionTools';
import { ProductCompositionEditor } from './ProductCompositionEditor';
import { NewCompositeEditor } from './NewCompositeEditor';
import { Coins, FileSpreadsheet, History, Plus, PackagePlus, Layers, Globe, TrendingUp } from "lucide-react";
import { retail } from "./api";
import { InvoiceAnalyzer } from "../../components/InvoiceAnalyzer";
import { purchaseOrders } from "./purchaseOrderApi";
import { CatalogProductAdder } from "./CatalogProductAdder";
import { ProductSheet } from "./ProductSheet";
import { ProductPriceHistory } from "./ProductPriceHistory";
import { PriceEvolution } from "./PriceEvolution";
import { PendingReplenishments } from './PendingReplenishments';
import { useCatalogEditor, type CatalogEditorProps } from './useCatalogEditor';
import { CatalogProductForm } from './CatalogProductForm';
import { CatalogAnomalyDialog } from './CatalogAnomalyDialog';
import { CatalogReplenishDialog } from './CatalogReplenishDialog';
import { CatalogCsvImport } from './CatalogCsvImport';
import { CatalogReplenishHistory } from './CatalogReplenishHistory';
import { CatalogBulkPrice } from './CatalogBulkPrice';
import { CatalogList } from './CatalogList';
import { CatalogStockAi } from './CatalogStockAi';

/** Planilla de productos: arma el estado con useCatalogEditor y compone sus vistas. */
export function CatalogEditor(props: CatalogEditorProps) {
  const s = useCatalogEditor(props);
  const { store, categories, products, run, busy, pendingRemitos, pendingRemitoError, branches, onRefreshRemitos, onReviewedRemito, guided, active, onInvoiceRequestClosed, notify, editing, stockBranchId, setStockBranchId, operationBranch, adding, editorTrigger, panelRef, setIsBulkPriceModalOpen, costBulk, isInvoiceModalOpen, setIsInvoiceModalOpen, invoiceFromSuppliers, canEditCatalog, can, canRestock, canCompose, canDelete, newCompositeOpen, setNewCompositeOpen, catalogAddOpen, setCatalogAddOpen, historyTarget, evolutionOpen, setEvolutionOpen, evolutionTrigger, closeEvolution, canSeeHistory, openHistory, closeHistory, sheet, setSheet, productEditing, closeCatalogAdd, closeNewComposite, deletionTarget, deletionHistoryOpen, deletionEditing, catalogSearch, closeDeletion, priceTarget, compositionTarget, newCompositionProduct, compositionEditing, closeCompositionEditor, priceEditing, closePriceEditor, startAdd, startEdit, replenishTarget, isCsvModalOpen, openCsv, openHistoryModal } = s;
  return (
    <div className="retail-panel" ref={panelRef}>
      {store.branch_inventory_enabled && <label className="inventory-branch-context">Sucursal para ingresos y ajustes
        <select aria-label="Sucursal donde ingresa o se ajusta el stock" value={stockBranchId} disabled={busy || !active || productEditing || priceEditing || compositionEditing || deletionEditing || !!replenishTarget || isInvoiceModalOpen || isCsvModalOpen} onChange={event => setStockBranchId(event.target.value)}>
          <option value="" disabled>Elegir sucursal</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select><small>El total del comercio no se duplica. El ajuste se asigna a esta sucursal.</small>
      </label>}
      <div className="section-heading" hidden={!guided && (productEditing || priceEditing || compositionEditing || deletionEditing)}>
        <div>
          <h2>{guided ? 'Tus productos' : 'Productos e inventario'}</h2>
          <p>
            {store.branch_inventory_enabled ? 'Catálogo compartido. Existencias independientes por sucursal.' : 'El catálogo y las existencias se comparten entre las cajas de este comercio.'}
          </p>
        </div>
        <div className="catalog-actions-row">
          {guided && <button type="button" className="text-button" disabled={busy || !categories.length} onClick={openCsv}>Importar desde CSV / Excel</button>}
          {!guided && (canEditCatalog || canRestock || can('edit_prices')) && <details className="catalog-tools" data-dropdown><summary>Más herramientas</summary><div className="catalog-tools-menu" data-dropdown-menu onClick={e => { if ((e.target as HTMLElement).closest('button')) { const details = e.currentTarget.closest('details'); if (details) details.open = false; } }}>
          {store.depot_enabled && <small>CSV, facturas y remitos ingresan en salón. Para guardarlos en depósito, usá Reponer.</small>}
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={openHistoryModal}
            title="Ver historial de reposiciones de stock"
          >
            <History size={16} />
            <span>Historial reposición</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy || !categories.length}
            onClick={openCsv}
            hidden={!canRestock}
            title="Cargar stock masivo desde archivo CSV / Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Carga masiva (CSV)</span>
          </button>
          {can('edit_prices') && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !products.length}
              onClick={() => setIsBulkPriceModalOpen(true)}
              title="Ajuste masivo de precios por marca, distribuidor o categoría"
            >
              <Coins size={16} /> {costBulk ? 'Ajustar ganancia' : 'Ajustar precios'}
            </button>
          )}
          {canSeeHistory && (
            <button type="button" className="secondary-button" disabled={!products.length}
              onClick={event => { evolutionTrigger.current = (event.currentTarget.closest('details')?.querySelector('summary') as HTMLElement | null) ?? event.currentTarget; setEvolutionOpen(true); }}
              title="Índices de costo y precio por categoría, marca o proveedor">
              <TrendingUp size={16} /> Evolución de precios
            </button>
          )}
          </div></details>}
          {/* Un solo punto de alta: la decisión es «cómo agrego», no cinco botones compitiendo. */}
          {!guided && canEditCatalog && !adding && !editing && <details className="catalog-tools add-menu" data-dropdown>
            <summary className="add-menu-summary" aria-disabled={busy || !categories.length || undefined}
              onClick={event => { if (busy || !categories.length) event.preventDefault(); }}><Plus size={16} /> Agregar</summary>
            <div className="catalog-tools-menu add-menu-list" data-dropdown-menu onClick={e => {
              if (!(e.target as HTMLElement).closest('button')) return;
              const details = e.currentTarget.closest('details');
              editorTrigger.current = details?.querySelector('summary') ?? null;
              if (details) details.open = false;
            }}>
              <button type="button" className="secondary-button" disabled={busy || !categories.length || !!sheet} onClick={() => setSheet({ mode: 'new' })}>
                <PackagePlus size={16} /><span><strong>Productos</strong><small>Uno o varios en planilla, por unidad, display o bulto.</small></span></button>
              <button type="button" className="secondary-button" disabled={busy || !categories.length || catalogAddOpen} onClick={() => setCatalogAddOpen(true)}>
                <Globe size={16} /><span><strong>Desde el catálogo global</strong><small>Varios a la vez, por marca o categoría.</small></span></button>
              {canCompose && <button type="button" className="secondary-button" disabled={busy || !categories.length} onClick={() => setNewCompositeOpen(true)}>
                <Layers size={16} /><span><strong>Combo o paquete</strong><small>Un producto que se arma con otros.</small></span></button>}
              <button type="button" className="secondary-button ai-action" disabled={busy || !categories.length} onClick={() => setIsInvoiceModalOpen(true)}>
                <AiIcon /><span><strong>Desde una factura</strong><small>Sacale una foto: se cargan productos y stock.</small></span></button>
            </div>
          </details>}
          {guided && <button
            type="button"
            className="primary-button"
            disabled={busy || !categories.length}
            hidden={!canEditCatalog || adding || !!editing}
            onClick={event => { editorTrigger.current = event.currentTarget; startAdd(); }}
          >
            + Agregar producto
          </button>}
        </div>
      </div>

      {priceEditing && priceTarget && <ProductPriceEditor key={priceTarget.id} storeId={store.id} store={store} product={priceTarget} threshold={store.low_margin_threshold} busy={busy} run={run} active={active} onClose={closePriceEditor} />}
      {canDelete && deletionTarget && <ProductDeletionEditor key={deletionTarget.id} storeId={store.id} product={deletionTarget} busy={busy} run={run} active={active} onClose={closeDeletion} />}
      {canDelete && deletionHistoryOpen && <DeletedProducts storeId={store.id} busy={busy} run={run} active={active} onClose={closeDeletion} />}
      {compositionEditing && compositionTarget && <ProductCompositionEditor key={compositionTarget.id} storeId={store.id} priceStep={store.price_rounding ?? 0} defaultMarkup={store.default_markup} product={compositionTarget} products={products} categories={categories} active={active} busy={busy} run={run} onClose={closeCompositionEditor} newProduct={newCompositionProduct} canCreateCombo={canEditCatalog} />}
      {canSeeHistory && evolutionOpen && <PriceEvolution key={store.id} storeId={store.id} products={products} categories={categories} onOpenProduct={openHistory} onClose={closeEvolution} />}
      {canSeeHistory && historyTarget && <ProductPriceHistory key={historyTarget.id} storeId={store.id} product={historyTarget} onClose={closeHistory} />}
      {canEditCatalog && sheet && <ProductSheet key={sheet.mode} mode={sheet.mode} store={store} products={products} categories={categories}
        initial={sheet.mode === 'edit' ? sheet.products : undefined} busy={busy} run={run} operationBranch={operationBranch}
        onOpenForm={() => { setSheet(null); startAdd(); }}
        onOpenProductForm={product => { setSheet(null); startEdit(product); }}
        onClose={() => { setSheet(null); requestAnimationFrame(() => { if (editorTrigger.current?.getClientRects().length) editorTrigger.current.focus(); else catalogSearch.current?.focus(); }); }} />}
      {canEditCatalog && catalogAddOpen && <CatalogProductAdder key={store.id} storeId={store.id} store={store} products={products} categories={categories} busy={busy} run={run} active={active} onClose={closeCatalogAdd} />}
      {canEditCatalog && canCompose && newCompositeOpen && <NewCompositeEditor key={store.id} storeId={store.id} priceStep={store.price_rounding ?? 0} defaultMarkup={store.default_markup} products={products} categories={categories} active={active} busy={busy} run={run} onClose={closeNewComposite} />}
      <CatalogProductForm s={s} />

      <CatalogAnomalyDialog s={s} />

      <CatalogReplenishDialog s={s} />

      <CatalogCsvImport s={s} />

      <CatalogReplenishHistory s={s} />

      <CatalogBulkPrice s={s} />

      {/* Modal 5: Analizador de Facturas con IA */}
      {isInvoiceModalOpen && (
        <InvoiceAnalyzer
          storeId={store.id}
          storeCuit={store.cuit}
          storeCondition={store.condicion_iva}
          storeNames={[store.name, store.razon_social ?? ''].filter(Boolean)}
          stockBranchId={operationBranch}
          stockBranchName={branches.find(branch => branch.id === operationBranch)?.name}
          products={products}
          categories={categories}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            if (invoiceFromSuppliers.current) { invoiceFromSuppliers.current = false; onInvoiceRequestClosed?.(); }
          }}
          onImportDone={async (count) => {
            await run(
              async () => {},
              `Se importaron e impactaron ${count} productos desde la factura`,
            );
          }}
          onPricesUpdated={async () => { await run(async () => {}); }}
          onReceived={async receipt => {
            // Si había un pedido abierto a ese proveedor para esa sucursal, queda recibido para comparar.
            const order = await purchaseOrders.receive(store.id, receipt.supplierName, receipt.branchId, receipt.lines).catch(() => null);
            if (order) notify('success', `La factura se comparó con el pedido a ${receipt.supplierName}. Revisalo en Proveedores → Pedidos.`);
          }}
          catalogBusy={busy}
        />
      )}

      <CatalogList s={s} />
      <div hidden={guided || productEditing || priceEditing || compositionEditing || deletionEditing}>
      {!guided && can('review_remitos') && <PendingReplenishments store={store.id} branchInventory={!!store.branch_inventory_enabled} records={pendingRemitos} error={pendingRemitoError} branches={branches} products={products} run={run} busy={busy} onRefresh={onRefreshRemitos} onReviewed={onReviewedRemito} />}
      <CatalogStockAi s={s} />

      </div>
    </div>
  );
}
