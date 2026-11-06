import { NumberInput } from '../../components/NumberInput';
import { priceRoundingSteps, roundingLabel } from '../../services/productSalePrice';
import { ArrowDownRight, ArrowUpRight, Coins, DollarSign, Filter, Loader2, Percent, Tag, X } from "lucide-react";
import type { CatalogEditorState } from './useCatalogEditor';

/** Ajuste de precios en bloque. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogBulkPrice({ s }: { s: CatalogEditorState }) {
  const { store, categories, busy, role, active, isBulkPriceModalOpen, setIsBulkPriceModalOpen, bulkFilterCategory, setBulkFilterCategory, bulkFilterBrand, setBulkFilterBrand, bulkFilterSupplier, setBulkFilterSupplier, bulkFilterSelectedTags, setBulkFilterSelectedTags, bulkAdjustMode, setBulkAdjustMode, bulkAdjustValue, setBulkAdjustValue, bulkRoundMultiple, setBulkRoundMultiple, costBulk, bulkMarkupMode, setBulkMarkupMode, bulkMarkupValue, setBulkMarkupValue, bulkRounding, setBulkRounding, bulkIsUpdating, bulkProgress, availableCatalogTags, bulkMatchedProducts, bulkPlan, calculateNewPrice, currentEstRevenue, newEstRevenue, bulkApplicable, bulkNoCost, bulkToCost, handleApplyBulkPriceChanges } = s;
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
              {/* 1. SECCIÓN DE FILTROS */}
              <div className="bulk-section-box">
                <div className="bulk-section-title">
                  <Filter size={16} />
                  <span>1. Filtros de Segmentación (Opcionales y combinables)</span>
                  {(bulkFilterCategory ||
                    bulkFilterBrand ||
                    bulkFilterSupplier ||
                    bulkFilterSelectedTags.length > 0) && (
                    <button
                      type="button"
                      className="text-button clear-filters-btn"
                      onClick={() => {
                        setBulkFilterCategory("");
                        setBulkFilterBrand("");
                        setBulkFilterSupplier("");
                        setBulkFilterSelectedTags([]);
                      }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="bulk-filters-grid">
                  <label>
                    <span>Categoría:</span>
                    <select
                      value={bulkFilterCategory}
                      onChange={(e) => setBulkFilterCategory(e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Marca:</span>
                    <input
                      type="text"
                      value={bulkFilterBrand}
                      onChange={(e) => setBulkFilterBrand(e.target.value)}
                      placeholder="Búsqueda parcial (ej: Arcor)"
                    />
                  </label>

                  <label>
                    <span>Distribuidor:</span>
                    <input
                      type="text"
                      value={bulkFilterSupplier}
                      onChange={(e) => setBulkFilterSupplier(e.target.value)}
                      placeholder="Búsqueda parcial (ej: Norte)"
                    />
                  </label>
                </div>

                {availableCatalogTags.length > 0 && (
                  <div className="bulk-tags-filter-wrap">
                    <span className="bulk-tags-label">
                      <Tag size={13} /> Filtrar por Tags:
                    </span>
                    <div className="bulk-tags-chips">
                      {availableCatalogTags.map((tag) => {
                        const isSelected = bulkFilterSelectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`bulk-tag-chip-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setBulkFilterSelectedTags((prev) =>
                                isSelected
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag],
                              );
                            }}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. MODO DE AJUSTE */}
              <div className="bulk-section-box">
                <div className="bulk-section-title">
                  <DollarSign size={16} />
                  <span>{costBulk ? '2. Ganancia sobre costo' : '2. Modo de Ajuste de Precios'}</span>
                </div>

                {costBulk ? <>
                <div className="bulk-mode-options">
                  {([['raise', 'Subir ganancia', 'Suma puntos a la ganancia de cada producto'], ['lower', 'Bajar ganancia', 'Resta puntos a la ganancia de cada producto'], ['set', 'Fijar ganancia', 'Misma ganancia sobre costo para todos']] as const).map(([mode, label, help]) => (
                    <label key={mode} className={`bulk-mode-card ${bulkMarkupMode === mode ? 'active' : ''}`}>
                      <input type="radio" name="bulkMarkupMode" value={mode} checked={bulkMarkupMode === mode} onChange={() => setBulkMarkupMode(mode)} />
                      <div className="bulk-mode-info">
                        <span className="bulk-mode-name">{mode === 'raise' ? <ArrowUpRight size={15} /> : mode === 'lower' ? <ArrowDownRight size={15} /> : <Percent size={15} />} {label}</span>
                        <small>{help}</small>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="bulk-value-and-rounding-row">
                  <label className="bulk-value-input-wrap">
                    <span>{bulkMarkupMode === 'set' ? 'Ganancia sobre costo (%):' : 'Puntos de ganancia:'}</span>
                    <NumberInput type="number" step="0.01" min={bulkMarkupMode === 'set' ? '-99.99' : '0'} max="10000" value={bulkMarkupValue} onValueChange={setBulkMarkupValue} placeholder="5" />
                  </label>
                  <label className="bulk-rounding-wrap">
                    <span>Redondeo:</span>
                    <select value={bulkRounding} onChange={event => setBulkRounding(event.target.value)}>
                      <option value="keep">Mantener el de cada producto</option>
                      <option value="store">Como el comercio ({roundingLabel(store.price_rounding ?? 0).toLowerCase()})</option>
                      {priceRoundingSteps.map(option => <option key={option} value={String(option)}>{roundingLabel(option)}{option > 0 ? ', hacia arriba' : ''}</option>)}
                    </select>
                  </label>
                </div>
                <p className="bulk-markup-note">Ejemplo: ganancia 30% + 5 puntos = 35%. El precio sale de costo + ganancia con el redondeo.
                  {bulkToCost > 0 && ` ${bulkToCost} con precio manual pasan a seguir al costo.`}{bulkNoCost > 0 && ` ${bulkNoCost} sin costo no cambian.`}</p>
                </> : <>
                <div className="bulk-mode-options">
                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "increase_pct" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="increase_pct"
                      checked={bulkAdjustMode === "increase_pct"}
                      onChange={() => setBulkAdjustMode("increase_pct")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <ArrowUpRight size={15} /> % de aumento
                      </span>
                      <small>Sube el precio en un porcentaje</small>
                    </div>
                  </label>

                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "decrease_pct" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="decrease_pct"
                      checked={bulkAdjustMode === "decrease_pct"}
                      onChange={() => setBulkAdjustMode("decrease_pct")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <ArrowDownRight size={15} /> % de descuento
                      </span>
                      <small>Baja el precio en un porcentaje</small>
                    </div>
                  </label>

                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "fixed_margin" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="fixed_margin"
                      checked={bulkAdjustMode === "fixed_margin"}
                      onChange={() => setBulkAdjustMode("fixed_margin")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <Percent size={15} /> Nuevo margen fijo
                      </span>
                      <small>Aplica % sobre costo del producto</small>
                    </div>
                  </label>

                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "absolute_price" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="absolute_price"
                      checked={bulkAdjustMode === "absolute_price"}
                      onChange={() => setBulkAdjustMode("absolute_price")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <Coins size={15} /> Precio absoluto
                      </span>
                      <small>Mismo precio para todos</small>
                    </div>
                  </label>
                </div>

                <div className="bulk-value-and-rounding-row">
                  <label className="bulk-value-input-wrap">
                    <span>
                      {bulkAdjustMode === "increase_pct" && "Porcentaje de aumento (%):"}
                      {bulkAdjustMode === "decrease_pct" && "Porcentaje de descuento (%):"}
                      {bulkAdjustMode === "fixed_margin" && "Margen sobre costo (%):"}
                      {bulkAdjustMode === "absolute_price" && "Nuevo precio final ($):"}
                    </span>
                    <NumberInput
                      type="number"
                      step={bulkAdjustMode === "absolute_price" ? "10" : "1"}
                      min="0"
                      value={bulkAdjustValue}
                      onValueChange={(e) => setBulkAdjustValue(e)}
                      placeholder={bulkAdjustMode === "absolute_price" ? "1500" : "15"}
                    />
                  </label>

                  <label className="bulk-rounding-wrap">
                    <span>Redondeo de precios:</span>
                    <select
                      value={bulkRoundMultiple}
                      onChange={(e) => setBulkRoundMultiple(Number(e.target.value))}
                    >
                      <option value={0}>Sin redondeo</option>
                      <option value={50}>Redondear a múltiplo de $50</option>
                      <option value={100}>Redondear a múltiplo de $100</option>
                      <option value={500}>Redondear a múltiplo de $500</option>
                    </select>
                  </label>
                </div>
                </>}
              </div>

              {/* 3. RESUMEN DE IMPACTO */}
              <div className="bulk-impact-summary-box">
                <div className="impact-metric">
                  <span className="metric-label">Productos afectados</span>
                  <strong className="metric-value">
                    {bulkMatchedProducts.length}
                  </strong>
                </div>

                <div className="impact-metric">
                  <span className="metric-label">Ingreso mensual estimado actual</span>
                  <strong className="metric-value">
                    ${currentEstRevenue.toLocaleString("es-AR")}
                  </strong>
                </div>

                <div className="impact-metric">
                  <span className="metric-label">Ingreso mensual estimado nuevo</span>
                  <strong className="metric-value highlight">
                    ${newEstRevenue.toLocaleString("es-AR")}
                  </strong>
                </div>

                <div className="impact-metric">
                  <span className="metric-label">Variación estimada</span>
                  <span
                    className={`delta-badge ${newEstRevenue >= currentEstRevenue ? "positive" : "negative"}`}
                  >
                    {newEstRevenue >= currentEstRevenue ? "+" : ""}
                    ${(newEstRevenue - currentEstRevenue).toLocaleString("es-AR")} (
                    {currentEstRevenue > 0
                      ? `${Math.round(((newEstRevenue - currentEstRevenue) / currentEstRevenue) * 100)}%`
                      : "0%"}
                    )
                  </span>
                </div>
              </div>

              {/* Progress Bar (visible during update) */}
              {bulkIsUpdating && (
                <div className="bulk-progress-container">
                  <div className="bulk-progress-header">
                    <Loader2 size={16} className="ai-spin-icon" />
                    <span>Actualizando precios en base de datos… ({bulkProgress}%)</span>
                  </div>
                  <div className="bulk-progress-track">
                    <div
                      className="bulk-progress-fill"
                      style={{ width: `${bulkProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 4. PREVISUALIZACIÓN DE PRODUCTOS */}
              <div className="bulk-preview-wrap">
                <div className="bulk-preview-header">
                  <h4>Previsualización de Cambios</h4>
                  <span className="preview-counter-badge">
                    {bulkMatchedProducts.length} productos seleccionados
                  </span>
                </div>

                {bulkMatchedProducts.length === 0 ? (
                  <div className="bulk-preview-empty">
                    <p>Ningún producto coincide con los filtros seleccionados.</p>
                  </div>
                ) : (
                  <div className="bulk-preview-table-scroll">
                    <table className="bulk-preview-table">
                      <thead>
                        <tr>
                          <th>Emoji</th>
                          <th>Nombre</th>
                          <th>Categoría</th>
                          <th>Marca</th>
                          <th>Distribuidor</th>
                          {costBulk && <th>Ganancia</th>}
                          <th>Precio actual</th>
                          <th>Precio nuevo</th>
                          <th>Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkMatchedProducts.map((p) => {
                          const newPrice = calculateNewPrice(p);
                          const delta = newPrice - p.price;
                          const plan = costBulk ? bulkPlan(p) : null;
                          return (
                            <tr key={p.id}>
                              <td className="center-cell">{p.emoji || "📦"}</td>
                              <td>
                                <strong>{p.name}</strong>
                                <small className="code-sub">{p.code}</small>
                              </td>
                              <td>{p.category}</td>
                              <td>{p.brand || <span className="muted-dash">-</span>}</td>
                              <td>{p.supplier || <span className="muted-dash">-</span>}</td>
                              {costBulk && <td>{plan
                                ? <>{p.sale_markup != null ? `${p.sale_markup.toLocaleString('es-AR')}%` : 'Manual'} → <strong>{plan.markup.toLocaleString('es-AR')}%</strong></>
                                : <span className="muted-dash">{p.cost > 0 ? 'Revisá el valor' : 'Sin costo: no cambia'}</span>}</td>}
                              <td className="price-cell">
                                ${p.price.toLocaleString("es-AR")}
                              </td>
                              <td className="new-price-cell">
                                <strong>${newPrice.toLocaleString("es-AR")}</strong>
                              </td>
                              <td className="delta-cell">
                                <span
                                  className={`table-delta ${delta >= 0 ? "plus" : "minus"}`}
                                >
                                  {delta >= 0 ? "+" : ""}
                                  ${delta.toLocaleString("es-AR")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
