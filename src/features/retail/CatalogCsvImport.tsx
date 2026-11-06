import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { unitsPerPack } from '../../services/inventoryUnits';
import type { CatalogEditorState } from './useCatalogEditor';

/** Carga masiva de stock por CSV/Excel. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogCsvImport({ s }: { s: CatalogEditorState }) {
  const { products, busy, role, branches, operationBranch, csvTitleId, isCsvModalOpen, setIsCsvModalOpen, csvStockBranch, setCsvStockBranch, csvParseResult, setCsvParseResult, csvFileName, setCsvFileName, csvSupplier, setCsvSupplier, csvNotes, setCsvNotes, isProcessingCsv, handleDownloadCsv, handleCsvFileInput, handleConfirmBulkCsvReplenish } = s;
  return (
    <>
      {/* Modal 2: Carga Masiva de Stock vía CSV / Excel */}
      {isCsvModalOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={csvTitleId}
        >
          <div className="ai-modal-card csv-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id={csvTitleId}>
                <FileSpreadsheet size={20} className="ai-brand-icon" />
                <h3>Carga Masiva de Stock (CSV / Excel)</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvParseResult(null);
                  setCsvFileName("");
                }}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="csv-modal-body">
              {csvStockBranch !== operationBranch && <div className="info-banner" role="status">Cambió la distribución del inventario. La carga ingresará en {branches.find(branch => branch.id === operationBranch)?.name || 'el stock compartido'}. <button type="button" className="secondary-button" disabled={busy || isProcessingCsv} onClick={() => setCsvStockBranch(operationBranch)}>Confirmar ubicación</button></div>}
              {/* Sección 1: Descargar planilla */}
              <div className="csv-step-box">
                <div className="step-badge">Paso 1</div>
                <div className="step-content">
                  <h4>Descargá la planilla modelo</h4>
                  <p>
                    Abrila en Excel o Google Sheets, completá las cantidades a
                    sumar en la columna <strong>cantidad_a_sumar</strong> y
                    guardala como .csv.
                  </p>
                  <div className="csv-download-buttons">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleDownloadCsv(true)}
                    >
                      <Download size={15} />
                      <span>
                        Descargar con mi catálogo ({products.length} productos)
                      </span>
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleDownloadCsv(false)}
                    >
                      <FileSpreadsheet size={15} />
                      <span>Plantilla vacía de ejemplo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sección 2: Cargar archivo */}
              <div className="csv-step-box">
                <div className="step-badge">Paso 2</div>
                <div className="step-content">
                  <h4>Subí el archivo .csv completado</h4>
                  <label className="csv-dropzone">
                    <Upload size={24} className="dropzone-icon" />
                    <span className="dropzone-title">
                      {csvFileName
                        ? csvFileName
                        : "Hacé click para seleccionar tu planilla .csv"}
                    </span>
                    <span className="dropzone-sub">
                      Compatible con Excel (separadores por coma o punto y coma)
                    </span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleCsvFileInput}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {/* Resumen de validación y previsualización */}
              {csvParseResult && (
                <div className="csv-preview-section">
                  <div className="csv-stats-bar">
                    <span className="stat-pill success">
                      <CheckCircle2 size={14} />
                      {csvParseResult.matchedCount} productos listos
                    </span>
                    <span className="stat-pill info">
                      +{csvParseResult.totalUnitsToAdd} unidades a sumar
                    </span>
                    {csvParseResult.notFoundCount > 0 && (
                      <span className="stat-pill warning">
                        <AlertTriangle size={14} />
                        {csvParseResult.notFoundCount} no encontrados
                      </span>
                    )}
                  </div>

                  <div className="table-scroll csv-preview-table-container">
                    <table className="csv-preview-table">
                      <thead>
                        <tr>
                          <th>Estado</th>
                          <th>Producto</th>
                          <th>Stock actual</th>
                          <th>A ingresar (+)</th>
                          <th>Stock final</th>
                          <th>Nuevo costo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvParseResult.validRows.map((r, i) => (
                          <tr key={`v-${i}`}>
                            <td>
                              <span className="badge-ok">✓ Coincide</span>
                            </td>
                            <td>
                              <strong>
                                {r.product?.emoji} {r.rawName}
                              </strong>
                              <small>{r.rawCode}</small>
                            </td>
                            <td>{r.product?.stock} u.</td>
                            <td>
                              <strong className="text-success">
                                +{r.quantityAdded} u.
                              </strong>
                              {r.warning && <small className="pack-conversion-warning"><AlertTriangle size={14} aria-hidden="true" />{r.warning}</small>}
                              {(unitsPerPack(r.product?.pack_size) > 1 || (r.product?.display_size ?? 0) > 1) && <label className="csv-pack-choice">
                                Cantidad original: {r.rawQuantity}
                                <select aria-label={`Interpretar cantidad de ${r.rawName}, fila ${i + 1}`} value={r.interpretedAsPacks ? 'packs' : r.interpretedAsDisplays ? 'displays' : 'units'} disabled={busy || isProcessingCsv} onChange={e => {
                                  const as = e.target.value as 'units' | 'displays' | 'packs';
                                  setCsvParseResult(previous => {
                                    if (!previous) return previous;
                                    const validRows = previous.validRows.map((row, index) => {
                                      if (index !== i) return row;
                                      const raw = row.rawQuantity ?? row.quantityAdded;
                                      const size = as === 'packs' ? unitsPerPack(row.product?.pack_size) : as === 'displays' ? Math.max(1, row.product?.display_size ?? 1) : 1;
                                      const name = as === 'packs' ? 'bultos' : 'displays';
                                      return { ...row, interpretedAsPacks: as === 'packs', interpretedAsDisplays: as === 'displays', quantityAdded: raw * size,
                                        warning: as !== 'units' ? `Se interpretó como ${name} de ${size} unidades: ${raw} × ${size} = ${raw * size} unidades.` : undefined };
                                    });
                                    return { ...previous, validRows, totalUnitsToAdd: validRows.reduce((sum, row) => sum + row.quantityAdded, 0) };
                                  });
                                }}>
                                  <option value="units">Unidades individuales</option>
                                  {(r.product?.display_size ?? 0) > 1 && <option value="displays" disabled={(r.rawQuantity || 0) * (r.product?.display_size ?? 1) > 1000000}>Displays ×{r.product?.display_size}</option>}
                                  {unitsPerPack(r.product?.pack_size) > 1 && <option value="packs" disabled={(r.rawQuantity || 0) * unitsPerPack(r.product?.pack_size) > 1000000}>Bultos ×{r.product?.pack_size}</option>}
                                </select>
                              </label>}
                            </td>
                            <td>
                              <strong>
                                {(r.product?.stock || 0) + r.quantityAdded} u.
                              </strong>
                            </td>
                            <td>
                              {r.newCost
                                ? `$${r.newCost.toLocaleString("es-AR")}`
                                : "Sin cambio"}
                            </td>
                          </tr>
                        ))}
                        {csvParseResult.invalidRows.map((r, i) => (
                          <tr key={`inv-${i}`} className="row-invalid">
                            <td>
                              <span className="badge-err">⚠️ Error</span>
                            </td>
                            <td>
                              <strong>{r.rawName || "Sin nombre"}</strong>
                              <small>{r.rawCode || "Sin código"}</small>
                            </td>
                            <td colSpan={4} className="err-cell">
                              {r.errorMessage}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className="replenish-input-grid"
                    style={{ marginTop: "12px" }}
                  >
                    <label>
                      Proveedor / Distribuidor <small>(opcional)</small>
                      <input
                        type="text"
                        value={csvSupplier}
                        onChange={(e) => setCsvSupplier(e.target.value)}
                        placeholder="Ej. Distribuidora Mayorista"
                      />
                    </label>
                    <label>
                      N° de Remito / Observación <small>(opcional)</small>
                      <input
                        type="text"
                        value={csvNotes}
                        onChange={(e) => setCsvNotes(e.target.value)}
                        placeholder="Ej. Factura 0001-00045"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={busy || isProcessingCsv}
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvParseResult(null);
                  setCsvFileName("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={
                  busy ||
                  isProcessingCsv ||
                  csvStockBranch !== operationBranch ||
                  !csvParseResult ||
                  csvParseResult.matchedCount === 0
                }
                onClick={handleConfirmBulkCsvReplenish}
              >
                {isProcessingCsv ? (
                  <>
                    <Loader2 size={16} className="ai-spin-icon" />
                    <span>Aplicando reposición…</span>
                  </>
                ) : (
                  `Confirmar reposición (${csvParseResult?.matchedCount || 0} prod. / +${csvParseResult?.totalUnitsToAdd || 0} u.)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
