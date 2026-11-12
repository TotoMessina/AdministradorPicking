import { productMargin } from '../../../services/productMarginService';
import { compositionCost, hasComposition, stockForSale } from '../../../services/productComposition';
import { StockBadge } from '../StockBadge';
import { DollarSign, Pencil, PackagePlus, Layers, Trash2, TrendingUp } from 'lucide-react';
import { unitsPerPack } from '../../../services/inventoryUnits';
import { CATALOG_COLUMNS } from '../catalogEditorShared';
import type { CatalogEditorState } from '../useCatalogEditor';

/** Tabla de productos. */
export function CatalogTable({ s }: { s: CatalogEditorState }) {
  const {
    store, products, busy, allowPriceEdit, operationBranch, unitsHere, tableScrollRef, visibleColumns,
    editorTrigger, canEditCatalog, canRestock, canCompose, canDelete, canSeeHistory, openHistory,
    setSheet, setDeletionTarget, setPriceTarget, setCompositionTarget, setNewCompositionProduct,
    replenishTrigger, startReplenish, filtered, paginatedProducts,
  } = s;
  return (
    <>
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
                      onClick={event => { editorTrigger.current = event.currentTarget; setSheet({ mode: 'edit', products: [p] }); }}
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
    </>
  );
}
