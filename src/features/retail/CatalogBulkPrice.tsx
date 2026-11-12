import { Coins, Loader2, X } from 'lucide-react';
import type { CatalogEditorState } from './useCatalogEditor';
import { BulkPriceFilters } from './catalogBulkPrice/BulkPriceFilters';
import { BulkPriceMode } from './catalogBulkPrice/BulkPriceMode';
import { BulkPriceImpact } from './catalogBulkPrice/BulkPriceImpact';
import { BulkPricePreview } from './catalogBulkPrice/BulkPricePreview';

/** Ajuste de precios en bloque. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogBulkPrice({ s }: { s: CatalogEditorState }) {
  const {
    busy, isBulkPriceModalOpen, setIsBulkPriceModalOpen, costBulk, bulkIsUpdating, bulkApplicable,
    handleApplyBulkPriceChanges,
  } = s;
  return (
    <>
      {/* Modal 4: Ajuste de Precios en Bloque */}
      {isBulkPriceModalOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-price-modal-title"
        >
          <div className="ai-modal-card bulk-price-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="bulk-price-modal-title">
                <Coins size={22} className="ai-brand-icon" />
                <h3>{costBulk ? 'Ajuste de ganancia en bloque' : 'Ajuste de Precios en Bloque'}</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => {
                  if (!bulkIsUpdating) setIsBulkPriceModalOpen(false);
                }}
                disabled={bulkIsUpdating}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bulk-modal-body">
              <BulkPriceFilters s={s} />

              <BulkPriceMode s={s} />

              <BulkPriceImpact s={s} />

              <BulkPricePreview s={s} />
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={bulkIsUpdating}
                onClick={() => setIsBulkPriceModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button bulk-confirm-btn"
                disabled={busy || bulkIsUpdating || bulkApplicable === 0}
                onClick={handleApplyBulkPriceChanges}
              >
                {bulkIsUpdating ? (
                  <>
                    <Loader2 size={16} className="ai-spin-icon" />
                    <span>Guardando cambios…</span>
                  </>
                ) : (
                  `Aplicar cambios a ${bulkApplicable} productos`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
