import { askConfirm } from './ConfirmHost';
import { InvoiceReviewTable } from './InvoiceReviewTable';
import { PackageCheck } from 'lucide-react';
import { PurchaseInvoicePanel } from './PurchaseInvoicePanel';
import type { LandedCostSettings } from '../services/landedCostService';
import { rankCatalogMatches } from '../services/invoiceMatchingService';
import { normalizeSupplierText } from '../services/supplierMappingService';
import { SupplierAliasPanel } from './SupplierAliasPanel';
import { isRealBarcode, isInvoiceProductCode, generateProductCode } from './invoiceAnalyzerHelpers';
import type { InvoiceAnalyzerState } from './useInvoiceAnalyzer';
import { ReviewSupplierBar } from './invoiceReview/ReviewSupplierBar';
import { ReviewToolbar } from './invoiceReview/ReviewToolbar';
import { ReviewBulkActions } from './invoiceReview/ReviewBulkActions';

/** Paso de revisión: proveedor, comprobante y grilla de productos. El estado vive en el hook del analizador. */
export function InvoiceReviewStep({ s }: { s: InvoiceAnalyzerState }) {
  const {
    storeId, stockBranchId, stockBranchName, products, storeCuit, step, setStep, items, setItems,
    initialStockBranch, setInitialStockBranch, catalogSuggestions, providerName, setError, expandedItems,
    setExpandedItems, searchQuery, filterStatus, reviewAttention, revealReviewItem, productSearch,
    setProductSearch, mappingBusy, mappingContext, readWithFormat, cuitNotice, purchaseDraft,
    setPurchaseDraft, qrStatus, registerPurchase, setRegisterPurchase, purchaseAiBusy, purchaseAiError,
    duplicatePurchase, purchaseChecks, fillPurchaseWithAi, formatsUnavailable, effectiveDiscount,
    landedOverride, setLandedOverride, internalTaxes, landedDefault, landed, finalCostAt, finalCostNote,
    sortedProducts, localCategories, handleParse, handleImport, toggleExpand, updateItem, addManualItem,
    searchInvoiceCatalog, useCatalogCandidate, selectProduct, confirmMapping, handleUpdatePackUnits,
    matchedCount, newCount, totalToImport, pendingCount, sureCount, confirmSureButton, filteredItems,
  } = s;
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
            <ReviewSupplierBar s={s} />

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

            <ReviewToolbar s={s} />

            <ReviewBulkActions s={s} />

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
