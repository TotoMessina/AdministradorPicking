import { productMargin } from '../../services/productMarginService';
import { compositionCost, hasComposition, stockForSale } from '../../services/productComposition';
import { StockBadge } from './StockBadge';
import { DollarSign, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, SlidersHorizontal, Pencil, PackagePlus, Layers, Trash2, Search, TrendingUp } from "lucide-react";
import { unitsPerPack } from '../../services/inventoryUnits';
import { CATALOG_COLUMNS } from './catalogEditorShared';
import type { CatalogEditorState } from './useCatalogEditor';

/** Búsqueda, tabla y paginación de productos. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogList({ s }: { s: CatalogEditorState }) {
  const { store, products, busy, role, guided, active, allowPriceEdit, operationBranch, unitsHere, query, setQuery, page, setPage, pageSize, setPageSize, stockFilter, setStockFilter, tableScrollRef, visibleColumns, columnsDetailsRef, handleToggleColumn, handleResetColumns, lowMarginFilter, setLowMarginFilter, editorTrigger, canEditCatalog, canRestock, canCompose, canDelete, canSeeHistory, openHistory, setSheet, productEditing, setDeletionTarget, setDeletionHistoryOpen, deletionEditing, catalogSearch, setPriceTarget, setCompositionTarget, setNewCompositionProduct, compositionEditing, priceEditing, startEdit, replenishTrigger, startReplenish, filtered, totalPages, currentPage, startIndex, endIndex, paginatedProducts, pageNumbers } = s;
  return (
    <>
      <div className="catalog-list" hidden={guided || productEditing || priceEditing || compositionEditing || deletionEditing}>
      <div className="catalog-search-toolbar">
        <label className="filter-label catalog-search-input-wrap">
          <Search size={15} className="catalog-search-icon" aria-hidden="true" />
          <input
            ref={catalogSearch}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, código o categoría…"
            aria-label="Buscar productos por nombre, código o categoría"
          />
        </label>
        {canEditCatalog && !guided && <button type="button" className="secondary-button" disabled={busy || !filtered.length || productEditing}
          title={filtered.length > 300 ? 'Se abren los primeros 300 de la lista: filtrá para elegir otros.' : 'Editar los productos de la lista como planilla'}
          onClick={event => { editorTrigger.current = event.currentTarget; setSheet({ mode: 'edit', products: filtered.slice(0, 300) }); }}>
          <Pencil size={15} /> Editar en planilla{filtered.length < products.length ? ` (${Math.min(filtered.length, 300)})` : ''}</button>}
        <button className="secondary-button" aria-pressed={stockFilter} onClick={() => { setStockFilter(!stockFilter); setPage(1); }}><Filter size={15} />{stockFilter ? 'Mostrando stock bajo' : 'Stock bajo'}</button>
        <button className="secondary-button" aria-pressed={lowMarginFilter} onClick={() => { setLowMarginFilter(!lowMarginFilter); setPage(1); }}><Filter size={15} />{lowMarginFilter ? 'Mostrando bajo margen' : 'Bajo margen'}</button>
        {canDelete && <button type="button" className="secondary-button" disabled={busy} title="Ver productos eliminados" onClick={event => { editorTrigger.current = event.currentTarget; setDeletionHistoryOpen(true); }}><Trash2 size={13} aria-hidden="true" /><span>Eliminados</span></button>}
        <details className="catalog-columns-picker" ref={columnsDetailsRef} data-dropdown data-dropdown-keep-open>
          <summary className="secondary-button" title="Configurar columnas visibles en la tabla">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Columnas</span>
          </summary>
          <div className="catalog-columns-dropdown" role="menu" data-dropdown-menu>
            <div className="catalog-columns-dropdown-header">
              <span>Columnas visibles</span>
              <button
                type="button"
                className="text-button-subtle"
                onClick={handleResetColumns}
                title="Restablecer columnas por defecto"
              >
                <RotateCcw size={11} aria-hidden="true" />
                <span>Restablecer</span>
              </button>
            </div>
            <div className="catalog-columns-list">
              {CATALOG_COLUMNS.map((col) => (
                <label key={col.id} className="catalog-column-option">
                  <input
                    type="checkbox"
                    checked={!!visibleColumns[col.id]}
                    onChange={() => handleToggleColumn(col.id)}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
        <span className="result-count" role="status">{filtered.length} productos</span>
      </div>
      <div className="table-scroll catalog-table-scroll" ref={tableScrollRef}>
        <table>
          <thead>
            <tr>
              {visibleColumns.product && <th className="th-product">Producto</th>}
              {visibleColumns.code && <th className="th-code">Código</th>}
              {visibleColumns.category && <th className="th-category">Categoría</th>}
              {visibleColumns.brand && <th className="th-brand">Marca</th>}
              {visibleColumns.supplier && <th className="th-supplier">Proveedor</th>}
              {visibleColumns.cost && <th className="th-cost">Costo</th>}
              {visibleColumns.price && <th className="th-price">Precio</th>}
              {visibleColumns.margin && <th className="th-margin">% Rentabilidad</th>}
              {visibleColumns.stock && <th className="th-stock">{store.depot_enabled ? 'Stock total' : 'Stock'}</th>}
              {visibleColumns.minStock && <th className="th-minstock">Avisar con</th>}
              {visibleColumns.expiry && <th className="th-expiry">Vencimiento</th>}
              <th className="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((p) => {
              const effectiveCost = hasComposition(p)
                ? (compositionCost(p.stock_components || [], products).cost || undefined)
                : p.cost;
              const marginData = productMargin(p.price, effectiveCost, store.low_margin_threshold);
              return (
                <tr key={p.id}>
                  {visibleColumns.product && (
                    <td className="product-col">
                      <div className="product-title-wrap">
                        <span className="product-emoji" aria-hidden="true">{p.emoji || "📦"}</span>
                        {canSeeHistory
                          ? <button type="button" className="product-name-button" title="Ver historial de precios" aria-label={`${p.name}: ver historial de precios`}
                            onClick={event => openHistory(p, event.currentTarget)}><strong className="product-name-text">{p.name}</strong></button>
                          : <strong className="product-name-text">{p.name}</strong>}
                      </div>
                      <div className="product-meta-row">
                        {!visibleColumns.code && <small className="product-code">{p.code}</small>}
                        {unitsPerPack(p.pack_size) > 1 && <small className="pack-size-badge">Pack ×{p.pack_size}</small>}
                        {hasComposition(p) && <small className="pack-size-badge">Stock compartido</small>}
                        {p.price_pending ? <small className="pack-size-badge">Sin precio</small> : p.sellable === false && <small className="pack-size-badge">Solo insumo</small>}
                        {p.margin_group === 'low_margin' && <small className="low-margin-badge">↓ Margen bajo</small>}
                      </div>
                    </td>
                  )}
                  {visibleColumns.code && (
                    <td data-label="Código" className="code-col">
                      <code className="code-badge">{p.code || '—'}</code>
                    </td>
                  )}
                  {visibleColumns.category && (
                    <td data-label="Categoría" className="category-col">{p.category}</td>
                  )}
                  {visibleColumns.brand && (
                    <td data-label="Marca" className="brand-col">
                      {p.brand ? p.brand : <span className="text-muted">—</span>}
                    </td>
                  )}
                  {visibleColumns.supplier && (
                    <td data-label="Proveedor" className="supplier-col">
                      {p.supplier ? (
                        <span title={p.supplierCode ? `Cód. Prov: ${p.supplierCode}` : undefined}>
                          {p.supplier}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.cost && (
                    <td data-label="Costo" className="cost-col">
                      {typeof effectiveCost === 'number' && effectiveCost > 0 ? (
                        `$${effectiveCost.toLocaleString("es-AR")}`
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.price && (
                    <td data-label="Precio" className="price-col">
                      <span className="price-col-value">
                        {p.price_pending ? 'Sin precio' : p.sellable === false ? 'Solo insumo' : `$${p.price.toLocaleString("es-AR")}`}
                        {canSeeHistory && <button type="button" className="icon-button price-history-button" title="Historial de precios"
                          aria-label={`Historial de precios de ${p.name}`} onClick={event => openHistory(p, event.currentTarget)}><TrendingUp size={15} /></button>}
                      </span>
                    </td>
                  )}
                  {visibleColumns.margin && (
                    <td data-label="% Rentabilidad" className="margin-col">
                      {marginData.percent !== null ? (
                        <span
                          className={`margin-badge ${
                            marginData.belowCost
                              ? 'margin-badge-loss'
                              : marginData.group === 'low_margin'
                              ? 'margin-badge-warning'
                              : 'margin-badge-good'
                          }`}
                          title={
                            marginData.belowCost
                              ? 'Venta bajo costo'
                              : marginData.group === 'low_margin'
                              ? 'Margen inferior al umbral configurado'
                              : 'Rentabilidad bruta'
                          }
                        >
                          {marginData.percent > 0 ? '+' : ''}{Math.round(marginData.percent)}%
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.stock && (
                    <td data-label="Stock" className="stock-col">
                      <StockBadge units={unitsHere(p)} min={p.minStock} shown={operationBranch ? unitsHere(p) : p.stock} note={hasComposition(p) ? 'Revisar componentes' : undefined} />
                      {store.depot_enabled && !hasComposition(p) && <small className="depot-stock-detail">{store.branch_inventory_enabled ? `Total: ${p.stock.toLocaleString('es-AR')}` : `Salón: ${stockForSale(p).toLocaleString('es-AR')}`} · Depósito: {(p.depotStock || 0).toLocaleString('es-AR')}</small>}
                    </td>
                  )}
                  {visibleColumns.minStock && (
                    <td data-label="Avisar con" className="minstock-col">
                      {typeof p.minStock === 'number' ? p.minStock : '—'}
                    </td>
                  )}
                  {visibleColumns.expiry && (
                    <td data-label="Vencimiento" className="expiry-col">
                      {p.expiry_date ? p.expiry_date : <span className="text-muted">—</span>}
                    </td>
                  )}
                <td className="actions-col">
                  <div className="button-row">
                    <button
                      type="button"
                      className="action-icon-btn action-btn-replenish"
                      disabled={busy}
                      onClick={event => { replenishTrigger.current = event.currentTarget; startReplenish(p); }}
                      hidden={!canRestock || hasComposition(p)}
                      aria-label={`Reponer stock de ${p.name}`}
                      title="Reponer stock"
                    >
                      <PackagePlus size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn action-btn-edit"
                      disabled={busy}
                      onClick={event => { editorTrigger.current = event.currentTarget; if (hasComposition(p) || guided) startEdit(p); else setSheet({ mode: 'edit', products: [p] }); }}
                      hidden={!canEditCatalog}
                      aria-label={`Editar ${p.name}`}
                      title="Editar producto"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    {canCompose && (
                      <button
                        type="button"
                        className="action-icon-btn action-btn-combo"
                        disabled={busy}
                        aria-label={`${hasComposition(p) ? 'Editar componentes' : 'Configurar combo o cigarrillos sueltos'} de ${p.name}`}
                        title={hasComposition(p) ? 'Editar los componentes de este producto' : 'Armar un combo o configurar cigarrillos sueltos'}
                        onClick={event => { editorTrigger.current = event.currentTarget; setNewCompositionProduct(false); setCompositionTarget(p); }}
                      >
                        <Layers size={14} aria-hidden="true" />
                        <span>{hasComposition(p) ? 'Componentes' : 'Combo / sueltos'}</span>
                      </button>
                    )}
                    {!canEditCatalog && allowPriceEdit && p.sellable !== false && (
                      <button
                        type="button"
                        className="action-icon-btn action-btn-price"
                        disabled={busy}
                        onClick={event => { editorTrigger.current = event.currentTarget; setPriceTarget(p); }}
                        title="Editar precio"
                        aria-label={`Editar precio de ${p.name}`}
                      >
                        <DollarSign size={14} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="action-icon-btn action-btn-delete"
                      hidden={!canDelete}
                      disabled={busy}
                      aria-label={`Eliminar ${p.name} del catálogo`}
                      title="Eliminar producto"
                      onClick={event => { editorTrigger.current = event.currentTarget; setDeletionTarget(p); }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
            {!filtered.length && (
              <tr>
                <td colSpan={CATALOG_COLUMNS.filter(c => visibleColumns[c.id]).length + 1} className="table-empty">
                  {products.length
                    ? "No hay coincidencias."
                    : "Agregá tu primer producto para empezar a vender."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="catalog-pagination" role="navigation" aria-label="Paginación de inventario">
          <div className="pagination-info">
            <span>
              Mostrando <strong>{startIndex + 1}–{endIndex}</strong> de <strong>{filtered.length}</strong> productos
            </span>
            <label className="pagination-size-select">
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage <= 1 || busy}
                onClick={() => setPage(1)}
                title="Primera página"
                aria-label="Primera página"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage <= 1 || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Página anterior"
                aria-label="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="pagination-pages">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      className={`pagination-page-btn ${p === currentPage ? "active" : ""}`}
                      onClick={() => setPage(Number(p))}
                      disabled={busy}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage >= totalPages || busy}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage >= totalPages || busy}
                onClick={() => setPage(totalPages)}
                title="Última página"
                aria-label="Última página"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
