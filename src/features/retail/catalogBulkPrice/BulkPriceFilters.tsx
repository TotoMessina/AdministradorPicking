import { Filter, Tag } from 'lucide-react';
import type { CatalogEditorState } from '../useCatalogEditor';

/** Filtros de los productos a ajustar. */
export function BulkPriceFilters({ s }: { s: CatalogEditorState }) {
  const {
    categories, bulkFilterCategory, setBulkFilterCategory, bulkFilterBrand, setBulkFilterBrand,
    bulkFilterSupplier, setBulkFilterSupplier, bulkFilterSelectedTags, setBulkFilterSelectedTags,
    availableCatalogTags,
  } = s;
  return (
    <>
      {/* 1. SECCIÓN DE FILTROS */}
      <div className="bulk-section-box">
        <div className="bulk-section-title">
          <Filter size={16} />
          <span>1. Filtros de Segmentación (Opcionales y combinables)</span>
          {(bulkFilterCategory ||
            bulkFilterBrand ||
            bulkFilterSupplier ||
            bulkFilterSelectedTags.length > 0) && (
            <button
              type="button"
              className="text-button clear-filters-btn"
              onClick={() => {
                setBulkFilterCategory("");
                setBulkFilterBrand("");
                setBulkFilterSupplier("");
                setBulkFilterSelectedTags([]);
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="bulk-filters-grid">
          <label>
            <span>Categoría:</span>
            <select
              value={bulkFilterCategory}
              onChange={(e) => setBulkFilterCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Marca:</span>
            <input
              type="text"
              value={bulkFilterBrand}
              onChange={(e) => setBulkFilterBrand(e.target.value)}
              placeholder="Búsqueda parcial (ej: Arcor)"
            />
          </label>

          <label>
            <span>Distribuidor:</span>
            <input
              type="text"
              value={bulkFilterSupplier}
              onChange={(e) => setBulkFilterSupplier(e.target.value)}
              placeholder="Búsqueda parcial (ej: Norte)"
            />
          </label>
        </div>

        {availableCatalogTags.length > 0 && (
          <div className="bulk-tags-filter-wrap">
            <span className="bulk-tags-label">
              <Tag size={13} /> Filtrar por Tags:
            </span>
            <div className="bulk-tags-chips">
              {availableCatalogTags.map((tag) => {
                const isSelected = bulkFilterSelectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`bulk-tag-chip-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setBulkFilterSelectedTags((prev) =>
                        isSelected
                          ? prev.filter((t) => t !== tag)
                          : [...prev, tag],
                      );
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
