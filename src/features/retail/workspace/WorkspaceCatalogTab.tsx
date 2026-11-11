import { CatalogEditor } from '../Management';
import { PriceListSettings } from '../BusinessSettings';
import { QuickProducts } from '../QuickProducts';
import { SectionNav } from '../SectionNav';
import { LocationTransfers } from '../LocationTransfers';
import { StockCount } from '../StockCount';
import type { WorkspaceState } from './useWorkspace';

/** Pestaña Productos (completa o delegada). */
export function WorkspaceCatalogTab({ state }: { state: WorkspaceState }) {
  const {
    store, role, permissions, tab, setTab, catalogView, setCatalogView, invoiceRequest, invoiceReturn,
    guiding, categories, products, branches, branchId, priceLists, priceOverrides, sales, allStoreSales,
    busy, manager, can, canOpenCatalog, managementLocationError, configurationBranches, pendingRemitos,
    run,
  } = state;
  return (
    <>
      {canOpenCatalog && <div hidden={tab !== 'catalog'}>
        <SectionNav name="catalog" label="Vistas de productos" value={catalogView} onChange={setCatalogView} disabled={busy} sections={[{ id: 'products', label: 'Productos' }, ...(can('manage_price_lists') ? [{ id: 'prices', label: 'Listas de precios' }] : []), ...(can('manage_transfers') ? [{ id: 'transfers', label: 'Mover mercadería' }] : []), ...(can('manage_products') || can('replenish_stock') ? [{ id: 'counts', label: 'Contar stock' }] : [])]} />
        {(can('manage_products') || can('replenish_stock')) && <div hidden={catalogView !== 'counts'} role="tabpanel" id="catalog-panel-counts" aria-labelledby="catalog-tab-counts"><StockCount key={store.id} store={store} branches={manager ? branches : configurationBranches} products={products} categories={categories} run={run} busy={busy} active={!guiding && tab === 'catalog' && catalogView === 'counts'} canConfirm={can('manage_products')} /></div>}
        {can('manage_price_lists') && <div hidden={catalogView !== 'prices'} role="tabpanel" id="catalog-panel-prices" aria-labelledby="catalog-tab-prices"><PriceListSettings storeId={store.id} branches={configurationBranches} categories={categories} lists={priceLists} overrides={priceOverrides} products={products} run={run} busy={busy} expanded /></div>}
      </div>}
      {manager && (
        <div hidden={tab !== 'catalog'}>
        <div hidden={catalogView !== 'transfers'} role="tabpanel" id="catalog-panel-transfers" aria-labelledby="catalog-tab-transfers">{can('manage_transfers') && <LocationTransfers key={store.id} store={store} branches={branches} products={products} run={run} busy={busy} canStock canFunds={false} only="stock" isAdmin={manager} active={!guiding && tab === 'catalog' && catalogView === 'transfers'} />}</div>
        <div hidden={catalogView !== 'products'} role="tabpanel" id="catalog-panel-products" aria-labelledby="catalog-tab-products">
        <CatalogEditor
          initialBranchId={branchId}
          active={!guiding && tab === 'catalog' && catalogView === 'products'}
          store={store}
          products={products}
          categories={categories}
          allSales={allStoreSales.length > 0 ? allStoreSales : sales}
          run={run}
          busy={busy}
          role={role}
          pendingRemitos={pendingRemitos.records}
          pendingRemitoError={pendingRemitos.error}
          branches={branches}
          onRefreshRemitos={() => void pendingRemitos.refresh()}
          onReviewedRemito={pendingRemitos.reviewed}
          invoiceRequest={invoiceRequest}
          onInvoiceRequestClosed={() => setTab(invoiceReturn.current)}
        />
        </div>
        </div>
      )}
      {!manager && canOpenCatalog && <div hidden={tab !== 'catalog'}>
        {managementLocationError && <p role="alert">{managementLocationError}</p>}
        {can('manage_transfers') && <div hidden={catalogView !== 'transfers'}><LocationTransfers key={store.id} store={store} branches={configurationBranches} products={products} run={run} busy={busy} canStock canFunds={false} only="stock" isAdmin={manager} active={!guiding && tab === 'catalog' && catalogView === 'transfers'} /></div>}
        <div hidden={catalogView !== 'products'}>
        {can('manage_quick_products') && branchId && <section className="retail-panel"><p>Sucursal de la botonera: <strong>{branches.find(branch => branch.id === branchId)?.name}</strong></p>
          <QuickProducts storeId={store.id} branchId={branchId} products={products} manager onAdd={() => {}} disabled={busy} editorOnly />
        </section>}
        <CatalogEditor initialBranchId={branchId} store={store} products={products} categories={categories} role={role} run={run} busy={busy}
          active={!guiding && tab === 'catalog' && catalogView === 'products'} allowRestock={can('replenish_stock')} allowPriceEdit={can('edit_prices')} permissions={permissions}
          pendingRemitos={pendingRemitos.records} pendingRemitoError={pendingRemitos.error} branches={configurationBranches} onRefreshRemitos={() => void pendingRemitos.refresh()} onReviewedRemito={pendingRemitos.reviewed} invoiceRequest={invoiceRequest} onInvoiceRequestClosed={() => setTab(invoiceReturn.current)} />
        </div>
      </div>}
    </>
  );
}
