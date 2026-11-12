import { Filter, RotateCcw, SlidersHorizontal, Pencil, Trash2, Search } from 'lucide-react';
import { CATALOG_COLUMNS } from '../catalogEditorShared';
import type { CatalogEditorState } from '../useCatalogEditor';

/** Búsqueda, filtros y columnas visibles. */
export function CatalogToolbar({ s }: { s: CatalogEditorState }) {
  const {
    products, busy, guided, query, setQuery, setPage, stockFilter, setStockFilter, visibleColumns,
    columnsDetailsRef, handleToggleColumn, handleResetColumns, lowMarginFilter, setLowMarginFilter,
    editorTrigger, canEditCatalog, canDelete, setSheet, productEditing, setDeletionHistoryOpen,
    catalogSearch, filtered,
  } = s;
  return (
    <>
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
    </>
  );
}
