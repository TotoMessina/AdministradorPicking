import { AiIcon } from './AiIcon';
import { Eye, EyeOff, FileImage, FileText, Filter, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { cleanInvoiceOcrText } from "../services/invoiceParserService";
import { type InvoiceAnalyzerState } from './useInvoiceAnalyzer';

/** Paso 1: cargar la factura (archivo, foto, QR o texto). El estado vive en el hook del analizador. */
export function InvoiceInputStep({ s }: { s: InvoiceAnalyzerState }) {
  const { onClose, catalogBusy, step, invoiceText, setInvoiceText, extractionText, supplierOverride, setSupplierOverride, error, setError, isExtracting, extractProgress, readingNote, setReadingNote, originalText, setOriginalText, fileReadFailed, setFileReadFailed, sourceFile, sourceRotation, extractionCache, uploadedFile, setUploadedFile, isDragging, setIsDragging, showRawText, setShowRawText, fileInputRef, textInputRef, suppliers, invoiceFormats, startQrScan, supplierHint, rateLimitCountdown, handleParse, addManualItem, processFile, handleFileUpload, handleDrop } = s;
  return (
    <>
        {/* INPUT */}
        {step === "input" && (
          <div className="invoice-body">
            <div className="invoice-hint">
              <AiIcon />
              <span>
                Subí tu factura en <strong>PDF</strong> o <strong>Foto / Imagen</strong> (PNG, JPG, WEBP). Revisá las sugerencias y aplicá la reposición cuando esté todo confirmado.
              </span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`invoice-dropzone ${isDragging ? "dragging" : ""} ${uploadedFile ? "has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isExtracting && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*,.png,.jpg,.jpeg,.webp,.bmp,.txt,.csv"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              {isExtracting ? (
                <div className="invoice-dropzone-loading">
                  <Loader2 size={34} className="spin" />
                  <h4>Procesando documento…</h4>
                  <p role="status">{extractProgress || "Leyendo y reconociendo el texto"}</p>
                </div>
              ) : uploadedFile ? (
                <div className="invoice-dropzone-file">
                  {uploadedFile.previewUrl ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Vista previa factura"
                      className="invoice-preview-thumb"
                      style={uploadedFile.type === 'image' ? { transform: `rotate(${sourceRotation.current}deg)` } : undefined}
                    />
                  ) : (
                    <div className={`invoice-file-icon ${uploadedFile.type}`}>
                      {uploadedFile.type === "pdf" ? <FileText size={30} /> : <FileImage size={30} />}
                    </div>
                  )}
                  <div className="invoice-file-meta">
                    <span className="invoice-file-name">{uploadedFile.name}</span>
                    <span className="invoice-file-sub">
                      {uploadedFile.type === "pdf" ? "Documento PDF" : "Imagen / Foto"} • {uploadedFile.size}
                    </span>
                    <span className="invoice-file-badge">{fileReadFailed ? 'Lectura pendiente de revisión' : 'Texto detectado · revisá cantidades y costos'}</span>
                  </div>
                  <button
                    type="button"
                    className="invoice-remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      startQrScan();
                      setInvoiceText("");
                      setOriginalText(''); setReadingNote(''); setFileReadFailed(false);
                      sourceFile.current = null; sourceRotation.current = 0;
                      extractionCache.current.clear();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Quitar archivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="invoice-dropzone-empty">
                  <div className="invoice-dropzone-icons">
                    <div className="dropzone-icon-pill pdf">
                      <FileText size={20} />
                      <span>PDF</span>
                    </div>
                    <div className="dropzone-icon-pill img">
                      <FileImage size={20} />
                      <span>Imagen / Foto</span>
                    </div>
                  </div>
                  <h4 style={{ margin: "10px 0 4px", fontSize: 15, fontWeight: 700, color: "var(--tone-accent)" }}>
                    Hacé click para seleccionar o arrastrá tu factura aquí
                  </h4>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--tone-muted)" }}>
                    Compatible con facturas electrónicas en <strong>PDF</strong>, escaneos o fotos de remitos en <strong>JPG / PNG / WEBP</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="button-row" aria-label="Opciones de lectura del comprobante">
              <button type="button" className="secondary-button" disabled={isExtracting} onClick={() => fileInputRef.current?.click()}><Upload size={14} /> {uploadedFile ? 'Cambiar archivo' : 'Elegir archivo'}</button>
              {sourceFile.current && <button type="button" className="text-button" disabled={isExtracting} onClick={() => void processFile(sourceFile.current!, sourceRotation.current)}><RefreshCw size={14} /> Volver a leer</button>}
              {uploadedFile?.type === 'image' && sourceFile.current && <button type="button" className="text-button" disabled={isExtracting} onClick={() => void processFile(sourceFile.current!, (sourceRotation.current + 90) % 360)}>Girar 90° y leer</button>}
            </div>
            {readingNote && <p role="status">{readingNote}</p>}
            {invoiceText && extractionText.omittedLines > 0 && <small role="status">Para analizar: {extractionText.retainedLines} de {extractionText.originalLines} líneas. Se omiten datos administrativos y ruido; el texto original se conserva.</small>}

            <label className="invoice-provider-field">
              Proveedor
              <input value={supplierOverride} onChange={e => setSupplierOverride(e.target.value)} placeholder="Elegí de la lista o dejalo vacío para detectarlo" list="invoice-supplier-options" />
              <datalist id="invoice-supplier-options">{[...new Set([...suppliers.map(supplier => supplier.name), ...invoiceFormats.map(row => row.supplier_name)])].map(name => <option key={name} value={name} />)}</datalist>
              <span>{supplierHint(supplierOverride)}</span>
            </label>

            {/* Extracted text preview toggle */}
            <div className="invoice-text-toggle-row">
              <button
                type="button"
                className="invoice-text-toggle-btn"
                onClick={() => setShowRawText(!showRawText)}
              >
                {showRawText ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>
                  {showRawText ? "Ocultar texto detectado" : "Ver / editar texto detectado"} {invoiceText ? `(${invoiceText.length} caracteres)` : ""}
                </span>
              </button>
              {invoiceText.length > 0 && !showRawText && !fileReadFailed && (
                <span className="invoice-text-status">
                  Listo para procesar con IA
                </span>
              )}
              {invoiceText.length > 0 && showRawText && (
                <button
                  type="button"
                  className="invoice-text-clean-btn"
                  disabled={isExtracting}
                  onClick={() => setInvoiceText((prev) => cleanInvoiceOcrText(prev))}
                  title="Eliminar líneas de ruido, símbolos sueltos y artefactos de OCR"
                >
                  <Filter size={12} /> Limpiar ruido OCR
                </button>
              )}
              {showRawText && originalText && originalText !== invoiceText && <button type="button" className="text-button" disabled={isExtracting} onClick={() => { setInvoiceText(originalText); setFileReadFailed(false); setError(null); }}>Restaurar texto original</button>}
              {fileReadFailed && invoiceText.trim() && <button type="button" className="text-button" disabled={isExtracting} onClick={() => { setFileReadFailed(false); setError(null); }}>Usar el texto que revisé</button>}
            </div>

            {showRawText && (
              <textarea
                ref={textInputRef}
                className="invoice-textarea"
                aria-label="Texto detectado de la factura"
                aria-describedby={error && rateLimitCountdown === null ? 'invoice-analysis-error' : undefined}
                placeholder="El texto de la factura aparecerá aquí automáticamente al subir el archivo PDF o imagen. También podés pegarlo o editarlo manualmente."
                value={invoiceText}
                disabled={isExtracting}
                onChange={(e) => { setInvoiceText(e.target.value); setFileReadFailed(false); }}
                rows={8}
              />
            )}

            <div className="invoice-actions">
              <button className="secondary-button" onClick={onClose}>Cancelar</button>
              <button type="button" className="secondary-button" onClick={addManualItem} disabled={isExtracting || catalogBusy}>
                <Plus size={14} /> Cargar producto manualmente
              </button>
              {invoiceText.trim().length > 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleParse({ skipAi: true })}
                  disabled={isExtracting || fileReadFailed}
                >
                  Continuar sin IA
                </button>
              )}
              <button
                className="primary-button ai-action ai-action-strong"
                onClick={() => void handleParse()}
                disabled={!invoiceText.trim() || isExtracting || fileReadFailed || (rateLimitCountdown ?? 0) > 0}
              >
                <AiIcon size={14} /> Analizar con IA
              </button>
            </div>
          </div>
        )}
    </>
  );
}
