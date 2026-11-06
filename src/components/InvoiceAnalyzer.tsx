import { AiIcon } from './AiIcon';
import { AlertTriangle, CheckCircle2, Clock, Loader2, PackageCheck, RefreshCw, X } from "lucide-react";
import { errorMessage } from "../features/retail/api";
import { migrateLocalMappings } from '../services/supplierMappingService';
import { InvoicePriceProposal } from './InvoicePriceProposal';
import { type InvoiceAnalyzerProps } from './invoiceAnalyzerHelpers';
import { useInvoiceAnalyzer } from './useInvoiceAnalyzer';
import { InvoiceInputStep } from './InvoiceInputStep';
import { InvoiceReviewStep } from './InvoiceReviewStep';

// Compatibilidad: estos nombres se importaban desde este archivo.
export type { InvoiceItem, InvoiceAnalyzerProps } from './invoiceAnalyzerHelpers';
export { isRealBarcode, isInvoiceProductCode, formatSuggestedProductName } from './invoiceAnalyzerHelpers';

/** Analizador de facturas: arma el estado con useInvoiceAnalyzer y compone sus pasos. */
export function InvoiceAnalyzer(props: InvoiceAnalyzerProps) {
  const s = useInvoiceAnalyzer(props);
  const { storeId, products, onClose, onPricesUpdated, catalogBusy, step, setStep, invoiceText, error, setError, importedCount, createdCount, updatedCount, costChanges, showPriceProposal, setShowPriceProposal, pricesBusy, setPricesBusy, parseController, parsing, linkProgress, setLinkProgress, mappingNotice, setMappingNotice, mappingRetry, setMappingRetry, mappingBusy, setMappingBusy, mappingInProgress, formatNotice, purchaseNotice, rateLimitCountdown, clearRateLimitTimer, handleParse, savePurchase, STEP_LABELS, STEP_KEYS, stepIdx } = s;
  return (
    <div className="invoice-overlay" role="dialog" aria-modal="true" aria-label="Analizador de Facturas">
      <div className={`invoice-modal${step === 'review' ? ' invoice-modal-review' : ''}`}>
        {/* Header */}
        <div className="invoice-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AiIcon size={22} />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Analizador de Facturas con IA</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--tone-muted)" }}>
                Importá productos de una factura en PDF o imagen a tu stock automáticamente
              </p>
            </div>
          </div>
          <button className="invoice-close-btn" onClick={onClose} disabled={step === 'importing' || pricesBusy} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="invoice-steps">
          {STEP_KEYS.map((s, idx) => (
            <div
              key={s}
              className={`invoice-step-dot-wrap ${idx < stepIdx ? "done" : idx === stepIdx ? "active" : "pending"}`}
            >
              <div className="invoice-step-dot">{idx < stepIdx ? "✓" : idx + 1}</div>
              <span className="invoice-step-lbl">{STEP_LABELS[idx]}</span>
            </div>
          ))}
        </div>

        {/* Rate Limit Countdown Banner */}
        {rateLimitCountdown !== null && (
          <div className="invoice-rate-limit-banner">
            <Clock size={18} className="spin-slow" />
            <div className="rate-limit-info">
              <strong>Groq alcanzó su límite temporal</strong>
              <span>
                {rateLimitCountdown > 0 ? <>Podés reintentar en <strong>{rateLimitCountdown}s</strong>.</> : 'Ya podés reintentar.'} Tu lectura se conserva.
              </span>
            </div>
            <div className="rate-limit-actions">
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "5px 12px", fontSize: 12, height: "auto" }}
                onClick={() => void handleParse({ skipAi: true })}
              >
                Continuar sin IA
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ padding: "5px 12px", fontSize: 12, height: "auto" }}
                disabled={rateLimitCountdown > 0}
                onClick={() => void handleParse()}
              >
                <RefreshCw size={12} /> Reintentar
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "5px 10px", fontSize: 12, height: "auto" }}
                onClick={clearRateLimitTimer}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mappingNotice && <div className="info-banner" role="status">
          <span>{mappingNotice}</span>
          {mappingRetry && <button type="button" className="text-button" disabled={mappingBusy} onClick={async () => {
            if (mappingInProgress.current) return;
            mappingInProgress.current = true;
            setMappingBusy(true);
            try { await migrateLocalMappings(storeId); setMappingNotice('Memoria compartida con el comercio.'); setMappingRetry(false); }
            catch (err) { setMappingNotice(`No se pudieron compartir los vínculos guardados en este dispositivo (${errorMessage(err)}). Se conservan acá; reintentá con conexión.`); }
            finally { mappingInProgress.current = false; setMappingBusy(false); }
          }}>Reintentar sincronización</button>}
        </div>}
        {/* Error */}
        {error && rateLimitCountdown === null && (
          <div className="invoice-error" id="invoice-analysis-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 200 }}>{error}</span>
            {step === 'input' && invoiceText.trim().length > 0 && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: 12, padding: "4px 10px", height: "auto", whiteSpace: "nowrap" }}
                onClick={() => void handleParse({ skipAi: true })}
              >
                Continuar a revisión sin IA
              </button>
            )}
            <button aria-label="Cerrar mensaje de error" onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}

        <InvoiceInputStep s={s} />

        {/* PARSING */}
        {step === "parsing" && (
          <div className="invoice-body invoice-loading-state">
            <Loader2 size={38} className="spin" />
            <h3>Analizando la factura…</h3>
            <p role="status">{linkProgress}<br />Puede tardar unos segundos.</p>
            <button type="button" className="secondary-button" onClick={() => {
              // Completed parts stay cached, so analyzing again continues where it stopped.
              parseController.current?.abort();
              setLinkProgress('');
              setStep('input');
            }}>Cancelar lectura</button>
          </div>
        )}

        <InvoiceReviewStep s={s} />

        {/* IMPORTING */}
        {step === "importing" && (
          <div className="invoice-body invoice-loading-state">
            <Loader2 size={38} className="spin" />
            <h3>Importando productos…</h3>
            <p>Guardando productos nuevos y actualizando existencias en tu catálogo.</p>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="invoice-body">
            <div className="invoice-done-state">
            <CheckCircle2 size={54} color="var(--tone-accent)" />
            <h3>{importedCount ? '¡Importación completada!' : 'Comprobante registrado'}</h3>
            {importedCount > 0 && <p>
              Se procesaron exitosamente <strong>{importedCount}</strong> producto{importedCount !== 1 ? "s" : ""} en tu catálogo.
            </p>}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
                margin: "4px 0 14px",
              }}
            >
              {updatedCount > 0 && (
                <span className="inv-chip ok">
                  <CheckCircle2 size={13} /> {updatedCount} stock / costo actualizado{updatedCount !== 1 ? "s" : ""}
                </span>
              )}
              {createdCount > 0 && (
                <span className="inv-chip indigo">
                  <PackageCheck size={13} /> {createdCount} nuevo{createdCount !== 1 ? "s" : ""} producto{createdCount !== 1 ? "s" : ""} creado{createdCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {formatNotice && <p role="status">{formatNotice}</p>}
            {purchaseNotice && <p role="status">{purchaseNotice.text}{purchaseNotice.retry && <>{' '}
              <button type="button" className="text-button" onClick={() => void savePurchase()}>Reintentar registro</button></>}</p>}
            {costChanges.length > 0 ? <>
              <p><AlertTriangle size={15} /> {costChanges.length} producto{costChanges.length === 1 ? '' : 's'} con suba de costo mayor al 2%. Podés revisar su precio de venta.</p>
              {!showPriceProposal && <button type="button" className="primary-button" onClick={() => setShowPriceProposal(true)}>Ver propuesta de precios</button>}
            </> : <p>No se detectaron subas mayores al 2% entre los costos actualizados.</p>}
            <button className="secondary-button" onClick={onClose} disabled={pricesBusy}>
              Cerrar
            </button>
            </div>
            {showPriceProposal && <InvoicePriceProposal storeId={storeId} changes={costChanges} products={products} onApplied={onPricesUpdated} onBusyChange={setPricesBusy} catalogBusy={catalogBusy} />}
          </div>
        )}
      </div>
    </div>
  );
}
