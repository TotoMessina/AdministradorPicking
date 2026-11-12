import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { CatalogEditorState } from '../useCatalogEditor';

/** Paginación de la lista. */
export function CatalogPagination({ s }: { s: CatalogEditorState }) {
  const {
    busy, setPage, pageSize, setPageSize, filtered, totalPages, currentPage, startIndex, endIndex,
    pageNumbers,
  } = s;
  return (
    <>
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
    </>
  );
}
