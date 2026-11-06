import { AiIcon } from '../../components/AiIcon';
import { AlertCircle, Check, Copy, Filter, Loader2, PackageCheck, X } from "lucide-react";
import type { CatalogEditorState } from './useCatalogEditor';

/** Análisis con IA de stock crítico. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogStockAi({ s }: { s: CatalogEditorState }) {
  const { busy, role, guided, active, stockFilter, setStockFilter, can, criticalProducts, isAnalyzingStock, stockAiAnalysis, setStockAiAnalysis, stockAiError, copiedOrder, handleAnalyzeCriticalStock, handleCopyOrder } = s;
  return (
    <>
      {/* AI Critical Stock Replenishment Card */}
      {!guided && can('use_ai') && criticalProducts.length > 0 && (
        <section
          className="stock-ai-card"
          aria-label="Análisis de stock con IA"
        >
          <div className="stock-ai-header">
            <div className="stock-ai-title-wrap">
              <span className="stock-ai-bell">🔔</span>
              <div>
                <div className="stock-ai-title-row">
                  <h4>Productos para reponer</h4>
                  <span className="stock-critical-badge">
                    {criticalProducts.length}{" "}
                    {criticalProducts.length === 1 ? "crítico" : "críticos"}
                  </span>
                </div>
                <p className="stock-ai-subtitle">
                  Hay {criticalProducts.length}{" "}
                  {criticalProducts.length === 1 ? "producto" : "productos"} por
                  debajo o en su stock mínimo (
                  {criticalProducts
                    .map((p) => p.name)
                    .slice(0, 3)
                    .join(", ")}
                  {criticalProducts.length > 3 ? "…" : ""}).
                </p>
              </div>
            </div>

            <div className="stock-ai-actions">
              <button
                type="button"
                className={`secondary-button ${stockFilter ? "active" : ""}`}
                onClick={() => setStockFilter((prev) => !prev)}
                title={stockFilter ? "Mostrar todos los productos" : "Filtrar tabla para ver solo los productos críticos"}
              >
                <Filter size={15} />
                <span>{stockFilter ? "Ver todos" : `Ver solo bajo stock (${criticalProducts.length})`}</span>
              </button>
              <button
                type="button"
                className="secondary-button ai-action"
                disabled={busy || isAnalyzingStock}
                onClick={handleAnalyzeCriticalStock}
              >
                {isAnalyzingStock ? (
                  <>
                    <Loader2 size={15} className="ai-spin-icon" />
                    <span>Analizando reposición…</span>
                  </>
                ) : (
                  <>
                    <AiIcon size={15} />
                    <span>Analizar stock</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {stockAiError && (
            <div className="stock-ai-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{stockAiError}</span>
            </div>
          )}

          {stockAiAnalysis && (
            <div className="stock-ai-result-box">
              <div className="stock-ai-result-header">
                <span className="stock-ai-result-title">
                  <PackageCheck size={16} />
                  <span>Orden de Compra y Prioridad Sugerida</span>
                </span>
                <div className="stock-ai-result-btns">
                  <button
                    type="button"
                    className="ai-report-copy-btn"
                    onClick={handleCopyOrder}
                    title="Copiar orden de compra para enviar a proveedor"
                  >
                    {copiedOrder ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedOrder ? "¡Copiado!" : "Copiar orden"}</span>
                  </button>
                  <button
                    type="button"
                    className="ai-modal-close"
                    onClick={() => setStockAiAnalysis(null)}
                    title="Cerrar análisis"
                    aria-label="Cerrar análisis"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="stock-ai-result-content">
                {stockAiAnalysis
                  .split("\n")
                  .filter(Boolean)
                  .map((line, idx) => {
                    const isUrgent = line.includes("[URGENTE]");
                    const isModerate = line.includes("[MODERADO]");
                    const isTotal =
                      line.toUpperCase().includes("INVERSIÓN TOTAL ESTIMADA") ||
                      line.toUpperCase().includes("INVERSION TOTAL ESTIMADA");

                    return (
                      <div
                        key={idx}
                        className={`stock-ai-line ${isUrgent ? "line-urgent" : isModerate ? "line-moderate" : isTotal ? "line-total" : ""}`}
                      >
                        {line}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
