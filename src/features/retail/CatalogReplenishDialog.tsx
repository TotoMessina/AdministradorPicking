import { NumberInput } from '../../components/NumberInput';
import { draftMarkupPrice } from '../../services/productSalePrice';
import { ProductMarginStatus } from './ProductMarginStatus';
import { stockForSale } from '../../services/productComposition';
import { DepotHistory } from './DepotHistory';
import { PackageCheck, X } from "lucide-react";
import type { CatalogEditorState } from './useCatalogEditor';

/** Reposición de un producto (unidades, bultos, depósito). Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogReplenishDialog({ s }: { s: CatalogEditorState }) {
  const { store, busy, role, branches, active, stockBranchId, canEditCatalog, canRestock, replenishTarget, replenishDialog, replenishQty, setReplenishQty, replenishBy, replenishmentPackSize, replenishmentDisplaySize, replenishSize, replenishByPack, replenishmentUnits, replenishCost, setReplenishCost, changeReplenishBy, replenishSupplier, setReplenishSupplier, replenishNotes, setReplenishNotes, replenishTask, setReplenishTask, receiveInDepot, setReceiveInDepot, replenishError, setReplenishError, depotModeChanged, receiving, replenishCurrent, movingLimit, closeReplenish, handleConfirmUnitaryReplenish } = s;
  return (
    <>
      {/* Modal 1: Reposición Unitaria de Stock */}
      {replenishTarget && canRestock && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="replenish-modal-title"
          ref={replenishDialog}
          onKeyDown={event => {
            if (!active) return;
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeReplenish(); }
            if (event.key !== 'Tab') return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), summary, a[href], [tabindex="0"]')).filter(control => control.getClientRects().length);
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
        >
          <div className="ai-modal-card replenish-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="replenish-modal-title">
                <PackageCheck size={20} className="ai-success-icon" />
                <h3>{store.depot_enabled ? receiving ? 'Recibir mercadería' : replenishTask === 'to_salon' ? 'Reponer salón' : 'Guardar en depósito' : 'Reponer stock de producto'}</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                disabled={busy || !active}
                onClick={closeReplenish}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleConfirmUnitaryReplenish}
              className="replenish-form"
            >
              <fieldset className="depot-restock-fields" disabled={busy || !active}>
              <div className="replenish-product-hero">
                <span className="replenish-product-emoji">
                  {replenishTarget.emoji || "📦"}
                </span>
                <div>
                  <h4 className="replenish-product-name">
                    {replenishTarget.name}
                  </h4>
                  <span className="replenish-product-code">
                    Código: {replenishTarget.code}
                  </span>
                </div>
              </div>

              {store.depot_enabled && <>
                <div className="depot-tasks" role="group" aria-label="Tarea de stock">
                  {([{ id: 'to_salon', label: 'Reponer salón' }, { id: 'receive', label: 'Recibir mercadería' }, { id: 'to_depot', label: 'Guardar en depósito' }] as const).map(task =>
                    <button key={task.id} type="button" className={replenishTask === task.id ? 'primary-button' : 'secondary-button'} aria-pressed={replenishTask === task.id}
                      onClick={() => { setReplenishTask(task.id); setReplenishError(''); }}>{task.label}</button>)}
                </div>
                <div className="depot-summary" role="status">
                  <span>{store.branch_inventory_enabled ? branches.find(branch => branch.id === stockBranchId)?.name || 'Sucursal' : 'Salón'}: <strong>{replenishCurrent ? (store.branch_inventory_enabled ? replenishCurrent.branchStocks?.[stockBranchId] || 0 : stockForSale(replenishCurrent)).toLocaleString('es-AR') : '0'}</strong></span>
                  <span>Depósito: <strong>{(replenishCurrent?.depotStock || 0).toLocaleString('es-AR')}</strong></span>
                  <span>Total: <strong>{replenishCurrent?.stock.toLocaleString('es-AR')}</strong></span>
                </div>
                {receiving ? <label>Ingresar en<select value={receiveInDepot ? 'depot' : 'salon'} onChange={event => { setReceiveInDepot(event.target.value === 'depot'); setReplenishError(''); }}>
                  <option value="depot">Depósito</option><option value="salon">Salón</option>
                </select></label> : <small>{replenishTask === 'to_salon' ? 'Del depósito al salón.' : 'Del salón al depósito.'} El total no cambia. Requiere conexión.</small>}
                {receiving && receiveInDepot && <small>Ingresa al depósito; no queda disponible para vender hasta reponer el salón. Requiere conexión.</small>}
                {!receiving && <small>Disponibles en el origen: {movingLimit.toLocaleString('es-AR')} unidades. Se verifica al confirmar.</small>}
              </>}
              <div className="replenish-stock-status-box" hidden={!!store.depot_enabled}>
                <div className="status-col">
                  <span className="col-label">Stock actual</span>
                  <span className="col-val">{replenishTarget.stock} u.</span>
                </div>
                <div className="status-divider">+</div>
                <div className="status-col">
                  <span className="col-label">A ingresar</span>
                  <span className="col-val accent">
                    +{replenishmentUnits || 0} u.
                  </span>
                </div>
                <div className="status-divider">=</div>
                <div className="status-col">
                  <span className="col-label">Stock resultante</span>
                  <span className="col-val final">
                    {replenishTarget.stock + (replenishmentUnits || 0)} u.
                  </span>
                </div>
              </div>

              {(replenishmentPackSize > 1 || replenishmentDisplaySize > 1) && <div className="replenish-presentation" role="group" aria-label="Ingresar por">
                <span>Ingresar por</span>
                <button type="button" className={replenishBy === 'unit' ? 'is-active' : ''} aria-pressed={replenishBy === 'unit'} onClick={() => changeReplenishBy('unit')}>Unidad</button>
                {replenishmentDisplaySize > 1 && <button type="button" className={replenishBy === 'display' ? 'is-active' : ''} aria-pressed={replenishBy === 'display'} onClick={() => changeReplenishBy('display')}>Display <small>({replenishmentDisplaySize} u.)</small></button>}
                {replenishmentPackSize > 1 && <button type="button" className={replenishBy === 'pack' ? 'is-active' : ''} aria-pressed={replenishBy === 'pack'} onClick={() => changeReplenishBy('pack')}>Bulto <small>({replenishmentDisplaySize > 1 && replenishmentPackSize % replenishmentDisplaySize === 0 ? `${replenishmentPackSize / replenishmentDisplaySize} displays × ${replenishmentDisplaySize} = ` : ''}{replenishmentPackSize} u.)</small></button>}
              </div>}
              <div className="replenish-quick-buttons">
                <span className="quick-label">Accesos rápidos:</span>
                {(replenishByPack ? [1, 2, 3, 5, 10] : [6, 12, 24, 48, 100]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`quick-chip ${replenishQty === num ? "active" : ""}`}
                    onClick={() => setReplenishQty(num)}
                  >
                    +{num}
                  </button>
                ))}
              </div>

              <div className="replenish-input-grid">
                <label>
                  {replenishBy === 'pack' ? 'Cantidad de bultos' : replenishBy === 'display' ? 'Cantidad de displays' : 'Cantidad a ingresar (+)'}
                  <NumberInput
                    type="number"
                    min="1"
                    step="1"
                    max={Math.floor(1000000 / replenishSize)}
                    required
                    value={replenishQty}
                    onValueChange={(e) =>
                      setReplenishQty(
                        Number(e),
                      )
                    }
                  />
                  {replenishByPack && <small aria-live="polite">= {replenishmentUnits.toLocaleString('es-AR')} unidades individuales</small>}
                </label>
                <label hidden={!receiving}>
                  {replenishBy === 'pack' ? 'Nuevo costo por bulto ($)' : replenishBy === 'display' ? 'Nuevo costo por display ($)' : 'Nuevo costo unitario ($)'} <small>{canEditCatalog ? '(opcional)' : '(reservado a administración)'}</small>
                  <NumberInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={replenishCost}
                    disabled={!canEditCatalog || !receiving}
                    onValueChange={(e) => setReplenishCost(e)}
                    placeholder="0.00"
                  />
                </label>
                {receiving && replenishByPack && canEditCatalog && replenishCost.trim() && <small className="replenish-unit-cost" aria-live="polite">= ${(Math.round(Number(replenishCost) / replenishSize * 100) / 100).toLocaleString('es-AR')} por unidad</small>}
                {receiving && <ProductMarginStatus price={replenishTarget.sale_markup == null ? replenishTarget.price : draftMarkupPrice(canEditCatalog && replenishCost.trim() ? Number(replenishCost) / replenishSize : replenishTarget.cost, String(replenishTarget.sale_markup), replenishTarget.price_step ?? 0) ?? 0} cost={canEditCatalog && replenishCost.trim() ? Number(replenishCost) / replenishSize : replenishTarget.cost} threshold={store.low_margin_threshold} />}
              </div>

              <div className="replenish-input-grid" hidden={!receiving}>
                <label>
                  Proveedor o Distribuidor <small>(opcional)</small>
                  <input
                    type="text"
                    disabled={!receiving}
                    value={replenishSupplier}
                    onChange={(e) => setReplenishSupplier(e.target.value)}
                    placeholder="Ej. Arcor, Distribuidora Sur"
                  />
                </label>
                <label>
                  N° de Remito / Comprobante <small>(opcional)</small>
                  <input
                    type="text"
                    disabled={!receiving}
                    value={replenishNotes}
                    onChange={(e) => setReplenishNotes(e.target.value)}
                    placeholder="Ej. Remito R-000458"
                  />
                </label>
              </div>

              {replenishError && <p role="alert" className="movement-error">{replenishError}</p>}
              {depotModeChanged && <p role="alert">Cambió la configuración de depósito. Cerrá y volvé a abrir Reponer antes de guardar.</p>}
              <div className="ai-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={closeReplenish}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy || depotModeChanged || !Number.isSafeInteger(replenishQty) || !Number.isSafeInteger(replenishmentUnits) || replenishmentUnits <= 0 || replenishmentUnits > 1000000}
                >
                  {store.depot_enabled ? receiving ? 'Confirmar ingreso' : replenishTask === 'to_salon' ? 'Reponer salón' : 'Guardar en depósito' : 'Confirmar reposición'} ({replenishmentUnits.toLocaleString('es-AR')} u.)
                </button>
              </div>
              </fieldset>
              {store.depot_enabled && <DepotHistory key={replenishTarget.id} store={store.id} product={replenishTarget.id} active={active && !busy} />}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
