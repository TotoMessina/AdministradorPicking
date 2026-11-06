import { askConfirm } from './ConfirmHost';
import { NumberInput } from './NumberInput';
import { AiIcon } from './AiIcon';
import { InvoiceReviewTable } from './InvoiceReviewTable';
import { Edit2, Filter, PackageCheck, RefreshCw, Search, X } from "lucide-react";
import type { Supplier } from "../features/retail/api";
import { PurchaseInvoicePanel } from './PurchaseInvoicePanel';
import { type LandedCostSettings } from '../services/landedCostService';
import { rankCatalogMatches } from '../services/invoiceMatchingService';
import { normalizeSupplierText } from '../services/supplierMappingService';
import { SupplierAliasPanel } from './SupplierAliasPanel';
import { isRealBarcode, isInvoiceProductCode, generateProductCode } from './invoiceAnalyzerHelpers';
import { type InvoiceAnalyzerState } from './useInvoiceAnalyzer';

/** Paso de revisión: proveedor, comprobante y grilla de productos. El estado vive en el hook del analizador. */
export function InvoiceReviewStep({ s }: { s: InvoiceAnalyzerState }) {
  const { storeId, stockBranchId, stockBranchName, products, categories, storeCuit, step, setStep, items, setItems, initialStockBranch, setInitialStockBranch, catalogSuggestions, providerName, invoiceDate, error, setError, expandedItems, setExpandedItems, searchQuery, setSearchQuery, filterStatus, setFilterStatus, reviewAttention, revealReviewItem, isEditingProvider, setIsEditingProvider, productSearch, setProductSearch, mappingBusy, mappingContext, readWithFormat, cuitNotice, purchaseDraft, setPurchaseDraft, qrStatus, registerPurchase, setRegisterPurchase, purchaseAiBusy, purchaseAiError, duplicatePurchase, purchaseChecks, fillPurchaseWithAi, formatsUnavailable, discountOverride, setDiscountOverride, registeredSupplier, discountText, discountPercent, discountValid, effectiveDiscount, canRememberDiscount, supplierSaving, supplierNotice, rememberDiscount, landedOverride, setLandedOverride, internalTaxes, landedDefault, landed, finalCostAt, finalCostNote, sortedProducts, localCategories, handleParse, handleImport, toggleExpand, updateItem, addManualItem, searchInvoiceCatalog, useCatalogCandidate, selectProduct, confirmMapping, changeProvider, handleUpdatePackUnits, handleSetAllUnmatchedAction, handleApplyMarginToNew, handleSetDefaultCategoryForNew, matchedCount, newCount, skippedCount, unmatchedTotal, totalToImport, pendingCount, sureCount, confirmSureButton, filteredItems } = s;
  return (
    <>
        {/* REVIEW */}
        {step === "review" && (
          <div className="invoice-body">
            {initialStockBranch !== stockBranchId && <div className="info-banner" role="status">
              <span>La mercadería ingresará en {stockBranchName || 'la sucursal seleccionada'}. El borrador se conserva.</span>
              <button type="button" className="secondary-button" onClick={() => { setInitialStockBranch(stockBranchId); setError(null); }}>Confirmar ubicación</button>
            </div>}
            {initialStockBranch === stockBranchId && stockBranchName && <p className="invoice-format-note" role="status">La mercadería ingresa en {stockBranchName}. Se cambia desde Productos, antes de abrir la factura.</p>}
            {/* Supplier and Date Header Bar */}
            <div className="inv-supplier-bar inv-supplier-bar-discount">
              <div className="inv-supplier-icon">🏭</div>
              <div className="inv-supplier-content">
                <span className="inv-supplier-label">Proveedor</span>
                {isEditingProvider ? (
                  <div className="inv-supplier-input-wrap">
                    <input
                      type="text"
                      className="inv-supplier-input"
                      value={providerName}
                      onChange={(e) => changeProvider(e.target.value)}
                      placeholder="Nombre del proveedor o distribuidora"
                      list="invoice-supplier-options"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingProvider(false);
                      }}
                    />
                    <button
                      type="button"
                      className="inv-small-btn primary"
                      onClick={() => setIsEditingProvider(false)}
                    >
                      Listo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inv-supplier-display"
                    onClick={() => setIsEditingProvider(true)}
                    aria-label={providerName ? `Proveedor ${providerName}. Cambiar` : 'Indicar proveedor'}
                  >
                    <strong>{providerName || "Indicar proveedor"}</strong>
                    <Edit2 size={13} className="inv-supplier-edit-icon" />
                  </button>
                )}
              </div>

              <div className="inv-supplier-discount">
                <label className="inv-supplier-label" htmlFor="invoice-supplier-discount">Descuento</label>
                <div className="inv-supplier-discount-field">
                  <NumberInput id="invoice-supplier-discount" min={0} max={99.99} step={0.01} value={discountText}
                    aria-invalid={!discountValid || undefined} aria-describedby="invoice-supplier-discount-help"
                    onValueChange={value => setDiscountOverride(value)} />
                  <span aria-hidden="true">%</span>
                  {discountOverride !== null && registeredSupplier && <button type="button" className="text-button" onClick={() => setDiscountOverride(null)}>
                    Usar {registeredSupplier.discount_percent.toLocaleString('es-AR')}%
                  </button>}
                </div>
                <small id="invoice-supplier-discount-help" className={!discountValid ? 'inv-supplier-discount-error' : undefined}>
                  {!discountValid ? 'Desde 0 y menor a 100.'
                    : registeredSupplier && discountOverride === null ? `Descuento guardado de ${registeredSupplier.name}`
                    : 'Solo para esta factura'}
                  {discountValid && effectiveDiscount > 0 && <> · Se descuenta del costo. Si los precios de la factura ya lo incluyen, dejalo en 0.</>}
                </small>
                {canRememberDiscount && <button type="button" className="text-button" disabled={supplierSaving} onClick={() => void rememberDiscount()}>
                  {registeredSupplier ? `Guardar ${effectiveDiscount.toLocaleString('es-AR')}% para próximas facturas` : `Guardar ${providerName.trim()} con ${effectiveDiscount.toLocaleString('es-AR')}%`}
                </button>}
                {supplierNotice && <small role="status">{supplierNotice}</small>}
              </div>

              {invoiceDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--tone-muted)" }}>
                  <span>📅</span>
                  <span>{invoiceDate}</span>
                </div>
              )}

              <button
                type="button"
                className="secondary-button"
                style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, height: "auto" }}
                onClick={() => setStep("input")}
              >
                <RefreshCw size={13} /> Volver a cargar
              </button>
            </div>

            <SupplierAliasPanel key={`${storeId}:${normalizeSupplierText(providerName)}`} storeId={storeId} supplier={providerName}
              disabled={mappingBusy} onDeleted={mapping => {
                if (mappingContext.current.storeId !== storeId || normalizeSupplierText(mappingContext.current.providerName) !== normalizeSupplierText(providerName)) return;
                setItems(previous => previous.map(item => item.mapping?.id === mapping.id ? {
                  ...item, mapping: undefined,
                  ...(item.linkStatus === 'auto' ? { linkStatus: 'pending' as const, linkReason: 'El alias fue eliminado. Revisá y confirmá el vínculo si querés volver a recordarlo.' } : {}),
                } : item));
              }} />
            <PurchaseInvoicePanel draft={purchaseDraft} onChange={setPurchaseDraft} checks={purchaseChecks} qrStatus={qrStatus}
              storeCuit={storeCuit} duplicate={duplicatePurchase} register={registerPurchase} onRegister={setRegisterPurchase}
              aiBusy={purchaseAiBusy} aiError={purchaseAiError} onFillWithAi={() => void fillPurchaseWithAi()} disabled={step !== 'review'} />
            <div className="landed-cost-panel" role="group" aria-labelledby="landed-cost-title">
              <strong id="landed-cost-title">Costo final que se guarda</strong>
              <label>IVA
                <select value={landed.vat} onChange={event => setLandedOverride({ ...landed, vat: event.target.value as LandedCostSettings['vat'] })}>
                  <option value="add_21">Sumar IVA 21% (precios sin IVA)</option>
                  <option value="add_10_5">Sumar IVA 10,5% (precios sin IVA)</option>
                  <option value="included">No sumar: los precios ya incluyen IVA</option>
                </select>
              </label>
              {internalTaxes > 0 && <label className="landed-cost-check">
                <input type="checkbox" checked={landed.spreadInternalTaxes} onChange={event => setLandedOverride({ ...landed, spreadInternalTaxes: event.target.checked })} />
                <span>Repartir impuestos internos ({internalTaxes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}) entre los artículos, según su importe</span>
              </label>}
              <small>{landedOverride ? 'Elegido para esta factura.' : landedDefault.reason} Las percepciones no se suman: son pagos a cuenta.
                {internalTaxes > 0 && landed.spreadInternalTaxes && ' Si algún artículo no lleva impuestos internos, ajustá su costo a mano.'}
                {internalTaxes === 0 && ' Si la factura tiene impuestos internos, cargalos en los datos fiscales para sumarlos.'}</small>
            </div>
            {cuitNotice && <p className="invoice-format-note" role="status">{cuitNotice}</p>}
            {readWithFormat.format ? <p className="invoice-format-note" role="status">
              Leída sin IA con el formato guardado de {readWithFormat.format.supplier_name}. Si algún renglón no coincide con la factura,{' '}
              <button type="button" className="text-button" onClick={async () => {
                if (await askConfirm('Se vuelve a leer la factura con IA y se descartan los cambios hechos en esta revisión. ¿Continuar?')) void handleParse({ useAi: true });
              }}>volvé a leerla con IA</button>.
            </p> : <p className="invoice-format-note" role="status">
              {readWithFormat.mismatch ? `La factura no coincidió con el formato guardado de ${readWithFormat.mismatch} y se leyó con IA. Al aplicarla se actualiza el formato.`
                : formatsUnavailable ? 'Leída con IA: no se pudo consultar la memoria de formatos de factura. Revisá la conexión y que la actualización 202610270005 esté aplicada en Supabase.'
                : normalizeSupplierText(providerName) ? `Leída con IA: todavía no hay un formato guardado de ${providerName.trim()}. Al aplicar esta factura se aprende, y la próxima con el mismo formato se lee sin IA.`
                : 'Leída con IA. Indicá el proveedor para que se aprenda su formato al aplicar la factura.'}
            </p>}
            <p className="invoice-link-summary" role="status">
              {items.filter(item => item.linkStatus === 'auto').length} reconocidos solos · {pendingCount} para revisar.
              {!normalizeSupplierText(providerName) && ' Indicá el proveedor para recordarlos la próxima vez.'}
              {' '}Revisá los productos nuevos y los dudosos antes de aplicar.
              {pendingCount > sureCount && sureCount > 0 && ` ${pendingCount - sureCount} con dudas quedan para revisar uno por uno.`}
            </p>
            {confirmSureButton}

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

            <InvoiceReviewTable
              rows={filteredItems}
              filterKey={`${filterStatus}:${searchQuery}`}
              products={sortedProducts}
              categories={localCategories}
              supplier={providerName}
              discountPercent={effectiveDiscount}
              finalCost={finalCostAt}
              finalCostNote={finalCostNote}
              mappingBusy={mappingBusy}
              expandedItems={expandedItems}
              productSearch={productSearch}
              attention={reviewAttention}
              catalogSuggestions={catalogSuggestions}
              onSearchCatalog={i => void searchInvoiceCatalog(i)}
              onUseCatalogCandidate={useCatalogCandidate}
              onAddRow={addManualItem}
              isValidCode={isInvoiceProductCode}
              onToggleDetails={toggleExpand}
              onUpdate={updateItem}
              onPackChange={handleUpdatePackUnits}
              onSelectProduct={(i, productId) => {
                selectProduct(i, productId);
                setExpandedItems(previous => new Set(previous).add(i));
              }}
              onConfirmMapping={i => void confirmMapping(i)}
              onSearchProduct={(i, query) => setProductSearch(previous => ({ ...previous, [i]: query }))}
              onCodeChange={(i, code) => updateItem(i, { newCode: code, codeDetected: isRealBarcode(code), codeSource: 'manual' })}
              onGenerateCode={i => {
                const used = new Set([...products.map(product => product.code.toLowerCase()), ...items.map(item => item.newCode.trim().toLowerCase())]);
                updateItem(i, { newCode: generateProductCode(used), codeDetected: true, codeSource: 'manual' });
              }}
              onFindCategory={i => {
                const item = items[i];
                const found = rankCatalogMatches(item.newName || item.suggestedName || item.rawName, null, products, 3)
                  .find(match => !!match.product.categoryId);
                if (found?.product.categoryId) updateItem(i, { newCategoryId: found.product.categoryId, categorySource: 'catalog' });
              }}
              onFindCode={i => {
                const item = items[i];
                const found = rankCatalogMatches(item.newName || item.suggestedName || item.rawName, null, products, 5)
                  .find(match => isRealBarcode(match.product.code));
                if (found) updateItem(i, {
                  newCode: found.product.code, codeDetected: true, codeSource: 'catalog',
                  newCategoryId: found.product.categoryId || item.newCategoryId, categorySource: 'catalog',
                });
                else setError('No se encontró un producto similar con código de barras. Ingresalo o generá un código interno desde Detalles.');
              }}
            />
            <div className="invoice-actions">
              <button className="secondary-button" onClick={() => setStep("input")}>
                Volver
              </button>
              <button
                className="primary-button"
                onClick={() => void handleImport()}
                disabled={(totalToImport === 0 && !registerPurchase) || pendingCount > 0}
              >
                <PackageCheck size={14} /> {totalToImport === 0 ? 'Registrar solo el comprobante' : `Aplicar reposición (${totalToImport} producto${totalToImport !== 1 ? "s" : ""})`}
                {newCount > 0 ? ` (${matchedCount} exist. + ${newCount} nuev.)` : ""}
              </button>
              {confirmSureButton}
              {pendingCount > 0 && <button type="button" className="text-button" onClick={() => {
                const index = items.findIndex(item => item.matchedProduct && item.action !== 'skip' && item.linkStatus === 'pending');
                if (index >= 0) {
                  setExpandedItems(previous => new Set(previous).add(index));
                  revealReviewItem(index, 'action');
                }
              }}>Revisar productos ({pendingCount})</button>}
            </div>
          </div>
        )}
    </>
  );
}
