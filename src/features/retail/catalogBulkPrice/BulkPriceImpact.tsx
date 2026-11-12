import { Loader2 } from 'lucide-react';
import type { CatalogEditorState } from '../useCatalogEditor';

/** Resumen del impacto y avance de la actualización. */
export function BulkPriceImpact({ s }: { s: CatalogEditorState }) {
  const { bulkIsUpdating, bulkProgress, bulkMatchedProducts, currentEstRevenue, newEstRevenue } = s;
  return (
    <>
      {/* 3. RESUMEN DE IMPACTO */}
      <div className="bulk-impact-summary-box">
        <div className="impact-metric">
          <span className="metric-label">Productos afectados</span>
          <strong className="metric-value">
            {bulkMatchedProducts.length}
          </strong>
        </div>

        <div className="impact-metric">
          <span className="metric-label">Ingreso mensual estimado actual</span>
          <strong className="metric-value">
            ${currentEstRevenue.toLocaleString("es-AR")}
          </strong>
        </div>

        <div className="impact-metric">
          <span className="metric-label">Ingreso mensual estimado nuevo</span>
          <strong className="metric-value highlight">
            ${newEstRevenue.toLocaleString("es-AR")}
          </strong>
        </div>

        <div className="impact-metric">
          <span className="metric-label">Variación estimada</span>
          <span
            className={`delta-badge ${newEstRevenue >= currentEstRevenue ? "positive" : "negative"}`}
          >
            {newEstRevenue >= currentEstRevenue ? "+" : ""}
            ${(newEstRevenue - currentEstRevenue).toLocaleString("es-AR")} (
            {currentEstRevenue > 0
              ? `${Math.round(((newEstRevenue - currentEstRevenue) / currentEstRevenue) * 100)}%`
              : "0%"}
            )
          </span>
        </div>
      </div>

      {/* Progress Bar (visible during update) */}
      {bulkIsUpdating && (
        <div className="bulk-progress-container">
          <div className="bulk-progress-header">
            <Loader2 size={16} className="ai-spin-icon" />
            <span>Actualizando precios en base de datos… ({bulkProgress}%)</span>
          </div>
          <div className="bulk-progress-track">
            <div
              className="bulk-progress-fill"
              style={{ width: `${bulkProgress}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
