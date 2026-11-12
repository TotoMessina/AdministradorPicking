import { NumberInput } from '../NumberInput';
import { Edit2, RefreshCw } from 'lucide-react';
import type { InvoiceAnalyzerState } from '../useInvoiceAnalyzer';

/** Proveedor, fecha y descuento de la factura. */
export function ReviewSupplierBar({ s }: { s: InvoiceAnalyzerState }) {
  const {
    setStep, providerName, invoiceDate, isEditingProvider, setIsEditingProvider, discountOverride,
    setDiscountOverride, registeredSupplier, discountText, discountValid, effectiveDiscount,
    canRememberDiscount, supplierSaving, supplierNotice, rememberDiscount, changeProvider,
  } = s;
  return (
    <>
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
    </>
  );
}
