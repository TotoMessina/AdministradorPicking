import { AiIcon } from '../AiIcon';
import type { InvoiceAnalyzerState } from '../useInvoiceAnalyzer';

/** Acciones para todos los renglones sin vincular. */
export function ReviewBulkActions({ s }: { s: InvoiceAnalyzerState }) {
  const {
    items, localCategories, handleSetAllUnmatchedAction, handleApplyMarginToNew,
    handleSetDefaultCategoryForNew, unmatchedTotal,
  } = s;
  return (
    <>
      {/* Bulk actions banner for unmatched items */}
      {unmatchedTotal > 0 && (
        <div className="inv-unmatched-banner">
          <div className="inv-unmatched-header" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AiIcon />
              <span>
                Factura con <strong>{unmatchedTotal}</strong> producto{unmatchedTotal !== 1 ? "s" : ""} sin vincular con tu catálogo
              </span>
            </div>
            {items.some((it) => it.isPack) && (
              <span className="inv-pack-summary-pill">
                📦 {items.filter((it) => it.isPack).length} en Display / Caja cerrada (costos calculados por unidad)
              </span>
            )}
          </div>
          <div className="inv-unmatched-actions">
            <button
              type="button"
              className="inv-small-btn primary"
              onClick={() => handleSetAllUnmatchedAction("create_new")}
            >
              ✨ Cargar todos como productos nuevos
            </button>
            <button
              type="button"
              className="inv-small-btn"
              onClick={() => handleSetAllUnmatchedAction("skip")}
            >
              Omitir todos los no encontrados
            </button>
            {localCategories.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <span style={{ color: "var(--tone-muted)" }}>Categoría común:</span>
                <select
                  className="inv-small-select"
                  aria-label="Asignar categoría a todos los productos nuevos"
                  onChange={(e) => handleSetDefaultCategoryForNew(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Asignar a todos los nuevos
                  </option>
                  {localCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <span style={{ color: "var(--tone-muted)" }}>Aumento sobre costo:</span>
              {[30, 40, 50, 100].map((m) => (
                <button
                  key={m}
                  type="button"
                  className="inv-small-btn"
                  onClick={() => handleApplyMarginToNew(m)}
                  title={`Calcular precio de venta con +${m}% sobre costo`}
                >
                  +{m}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
