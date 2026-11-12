import { NumberInput } from '../NumberInput';
import { X, Plus } from 'lucide-react';
import { randomUUID } from '../../utils/uuid';
import type { PosTabState } from './usePosTab';

/** Agregar un importe manual a la venta. */
export function PosManualItemModal({ state }: { state: PosTabState }) {
  const {
    active, isLoading, busy, manualModalOpen, setManualModalOpen, manualAmount, setManualAmount,
    manualDescription, setManualDescription, add,
  } = state;
  return (
    <>
      {manualModalOpen && (
        <div
          className="receipt-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 5000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setManualModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-modal-title"
            tabIndex={-1}
            className="manual-amount-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="manual-modal-header">
              <div className="manual-modal-icon">
                <Plus size={20} />
              </div>
              <div className="manual-modal-titles">
                <h3 id="manual-modal-title">Agregar importe manual</h3>
                <small>Para productos o servicios que no están en el catálogo</small>
              </div>
              <button
                type="button"
                className="icon-button manual-modal-close"
                aria-label="Cerrar ventana"
                onClick={() => setManualModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="manual-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (busy || isLoading || !active) return;
                const value = Number(manualAmount);
                if (!Number.isFinite(value) || value <= 0) return;
                add({
                  id: randomUUID(),
                  code: "MANUAL",
                  name: manualDescription.trim() || "Venta manual",
                  price: value,
                  category: "Varios",
                  stock: 999,
                  minStock: 0,
                  emoji: "🏷️",
                });
                setManualAmount("");
                setManualDescription("");
                setManualModalOpen(false);
              }}
            >
              <div className="manual-modal-field">
                <label htmlFor="manual-amount-input">
                  Importe a cobrar ($)
                </label>
                <div className="manual-amount-input-wrapper">
                  <span className="manual-currency-symbol">$</span>
                  <NumberInput
                    id="manual-amount-input"
                    autoFocus
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={manualAmount}
                    onValueChange={(e) => setManualAmount(e)}
                    placeholder="0.00"
                    className="manual-amount-input"
                  />
                </div>
              </div>

              <div className="manual-modal-field">
                <label htmlFor="manual-description-input">
                  Descripción <small>(opcional)</small>
                </label>
                <input
                  id="manual-description-input"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Ej. Fotocopia, golosinas, servicio..."
                  className="manual-description-input"
                />
              </div>

              <div className="manual-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setManualModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!manualAmount || Number(manualAmount) <= 0 || busy || isLoading}
                >
                  <Plus size={16} />
                  <span>Agregar a la venta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
