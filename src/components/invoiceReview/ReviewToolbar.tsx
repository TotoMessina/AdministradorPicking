import { Search, X } from 'lucide-react';
import type { InvoiceAnalyzerState } from '../useInvoiceAnalyzer';

/** Búsqueda y filtros de renglones. */
export function ReviewToolbar({ s }: { s: InvoiceAnalyzerState }) {
  const { items, searchQuery, setSearchQuery, filterStatus, setFilterStatus, newCount, skippedCount } = s;
  return (
    <>
      {/* Toolbar: Search + Filter Tabs */}
      <div className="inv-toolbar">
        <div className="inv-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar producto por nombre o código..."
            aria-label="Buscar filas de la factura por nombre o código"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              title="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="inv-filter-tabs">
          <button
            type="button"
            className={`inv-tab ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            Todos ({items.length})
          </button>
          <button
            type="button"
            className={`inv-tab ${filterStatus === "matched" ? "active" : ""}`}
            onClick={() => setFilterStatus("matched")}
          >
            En Catálogo ({items.filter((it) => it.matchedProduct).length})
          </button>
          <button
            type="button"
            className={`inv-tab ${filterStatus === "new" ? "active" : ""}`}
            onClick={() => setFilterStatus("new")}
          >
            ✨ Nuevos ({newCount})
          </button>
          <button
            type="button"
            className={`inv-tab ${filterStatus === "skip" ? "active" : ""}`}
            onClick={() => setFilterStatus("skip")}
          >
            Omitidos ({skippedCount})
          </button>
        </div>
      </div>
    </>
  );
}
