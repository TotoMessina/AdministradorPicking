import { AlertCircle, AlertTriangle, X } from "lucide-react";
import type { CatalogEditorState } from './useCatalogEditor';

/** Confirmación ante datos anómalos al guardar un producto. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogAnomalyDialog({ s }: { s: CatalogEditorState }) {
  const { busy, role, anomalyDialog, setAnomalyDialog, doSaveProduct } = s;
  return (
    <>
      {/* Feature B: Confirmation Dialog for Anomalies */}
      {anomalyDialog && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="anomaly-dialog-title"
        >
          <div className="ai-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="anomaly-dialog-title">
                <AlertTriangle size={20} className="ai-warn-icon" />
                <h3>Advertencia de Catálogo</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => setAnomalyDialog(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ai-modal-body">
              <p>
                Detectamos posibles anomalías o duplicados para este producto:
              </p>
              <ul className="ai-warning-list">
                {anomalyDialog.warnings.map((w, idx) => (
                  <li key={idx}>
                    <AlertCircle size={16} />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <p className="ai-modal-note">
                Podés revisar los datos o guardar el producto de todas formas.
              </p>
            </div>
            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAnomalyDialog(null)}
              >
                Revisar y corregir
              </button>
              <button
                type="button"
                className="primary-button ai-modal-confirm-btn"
                disabled={busy}
                onClick={() => void doSaveProduct(anomalyDialog.product)}
              >
                Guardar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
