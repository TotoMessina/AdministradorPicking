import { NumberInput } from '../../components/NumberInput';
import { ProductMarkupField, ProductRoundingField } from './ProductMarkupField';
import { AiIcon } from '../../components/AiIcon';
import { ProductMarginStatus } from './ProductMarginStatus';
import { hasComposition } from '../../services/productComposition';
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { retail } from "./api";
import { cleanSuggestionNumber } from './catalogEditorShared';
import { presentationCodeWarning } from '../../services/productPresentation';
import type { CatalogEditorState } from './useCatalogEditor';

/** Formulario de alta y edición de producto. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogProductForm({ s }: { s: CatalogEditorState }) {
  const { store, categories, busy, role, guided, editing, adding, editorRef, productOptionsRef, invalidFocusPending, productReviewNote, productOptionsOpen, setProductOptionsOpen, priceReviewNote, productSuggestionNote, formData, setFormData, tagInput, setTagInput, saleUnit, editingRecipeCost, pricingByMarkup, pricingCost, storeRounding, displayReady, codesReady, formSalePrice, requestManualPrice, useCostPrice, suggestedPriceDraft, productOptionsSummary, invalidateProductSuggestions, canEditCatalog, openHistory, creatingComposition, suggestion, setSuggestion, isSuggesting, priceValidation, setPriceValidation, isCheckingPrice, isCheckingAnomalies, cancelEdit, handleCodeBlur, suggestProductDetails, reviewProductPrice, applySuggestionField, handleSubmit } = s;
  return (
    <>
      {canEditCatalog && (adding || editing) && (
        <form
          key={editing?.id || "new"}
          ref={editorRef}
          className="retail-form product-editor"
          onSubmit={handleSubmit}
          onChangeCapture={invalidateProductSuggestions}
          onInvalidCapture={event => {
            if (!productOptionsRef.current?.contains(event.target as Node)) return;
            productOptionsRef.current.open = true;
            setProductOptionsOpen(true);
            if (invalidFocusPending.current) return;
            invalidFocusPending.current = true;
            requestAnimationFrame(() => {
              invalidFocusPending.current = false;
              editorRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>('input:invalid, select:invalid')?.focus();
            });
          }}
          onKeyDown={event => {
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && productOptionsOpen && productOptionsRef.current?.contains(event.target as Node)) {
              event.preventDefault();
              event.stopPropagation();
              setProductOptionsOpen(false);
              productOptionsRef.current.querySelector('summary')?.focus();
            } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
              // A scanner or a field edit must not implicitly save the whole product.
              event.preventDefault();
              if (event.target.name === 'code') void handleCodeBlur();
            }
          }}
        >
          <h3>{editing ? `Editar ${editing.name}` : creatingComposition ? 'Nuevo combo o paquete' : 'Nuevo producto'}</h3>
          <p className="product-editor-intro">{creatingComposition ? 'Guardá nombre, código y precio. Después elegís los componentes: el stock y el costo se calculan con ellos.' : 'Completá los datos del producto y guardá los cambios. Los demás atributos están en Más opciones.'}</p>

          {/* Feature A: Suggestion loading state */}
          {isSuggesting && (
            <div className="ai-suggest-loading">
              <Loader2 size={16} className="ai-spin-icon" />
              <span>Buscando sugerencias para este producto…</span>
            </div>
          )}

          {/* Feature A: Suggestion chips */}

          {suggestion && (
            <div
              className="ai-suggestion-box"
              role="region"
              aria-label="Sugerencias de catálogo"
            >
              <div className="ai-suggestion-header">
                <div className="ai-suggestion-title">
                  {suggestion.source === "community" ? (
                    <>
                      <span>📦</span>
                      <span>Catálogo comunitario:</span>
                    </>
                  ) : suggestion.source === "verified" ? (
                    <>
                      <span>✅</span>
                      <span>Catálogo verificado:</span>
                    </>
                  ) : (
                    <>
                      <AiIcon size={15} />
                      <span>Sugerencias de IA:</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="ai-suggestion-close"
                  onClick={() => setSuggestion(null)}
                  title="Descartar sugerencias"
                  aria-label="Descartar sugerencias"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="ai-suggestion-chips">
                {suggestion.name && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("name")}
                    title="Click para aplicar este nombre"
                  >
                    <span className="chip-label">Nombre:</span>
                    <strong>{suggestion.name}</strong>
                    {suggestion.source === "verified" && (
                      <span className="source-badge verified-badge">
                        ✅ Verificado
                      </span>
                    )}
                    {suggestion.source === "community" && (
                      <span className="source-badge community-badge">
                        📦 Catálogo comunitario
                      </span>
                    )}
                    {(!suggestion.source || suggestion.source === "ai") && (
                      <span className="source-badge ai-badge">
                        🤖 IA
                      </span>
                    )}
                  </button>
                )}
                {suggestion.emoji && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("emoji")}
                    title="Click para aplicar este emoji"
                  >
                    <span className="chip-label">Emoji:</span>
                    <span>{suggestion.emoji}</span>
                  </button>
                )}
                {suggestion.category && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("category")}
                    title="Click para aplicar esta categoría"
                  >
                    <span className="chip-label">Categoría:</span>
                    <strong>{suggestion.category}</strong>
                  </button>
                )}
                {suggestion.brand && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("brand")}
                    title="Click para aplicar esta marca"
                  >
                    <span className="chip-label">Marca:</span>
                    <strong>{suggestion.brand}</strong>
                  </button>
                )}
                {suggestion.supplier && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("supplier")}
                    title="Click para aplicar este distribuidor"
                  >
                    <span className="chip-label">Distribuidor:</span>
                    <strong>{suggestion.supplier}</strong>
                  </button>
                )}
                {suggestion.unitType && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("unitType")}
                    title="Click para aplicar esta unidad"
                  >
                    <span className="chip-label">Unidad:</span>
                    <strong>{suggestion.unitType}</strong>
                  </button>
                )}
                {suggestion.tags && suggestion.tags.length > 0 && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("tags")}
                    title="Click para agregar estos tags"
                  >
                    <span className="chip-label">Tags:</span>
                    <strong>{suggestion.tags.map((t) => `#${t}`).join(" ")}</strong>
                  </button>
                )}
                {suggestion.estimatedPrice && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("price")}
                    title="Click para aplicar este precio estimado"
                  >
                    <span className="chip-label">Precio est.:</span>
                    <strong>
                      $
                      {cleanSuggestionNumber(
                        suggestion.estimatedPrice,
                      ).toLocaleString("es-AR")}
                    </strong>
                  </button>
                )}
                {suggestion.estimatedCost && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("cost")}
                    title="Click para aplicar este costo estimado"
                  >
                    <span className="chip-label">Costo est.:</span>
                    <strong>
                      $
                      {cleanSuggestionNumber(
                        suggestion.estimatedCost,
                      ).toLocaleString("es-AR")}
                    </strong>
                  </button>
                )}
                <button
                  type="button"
                  className="ai-chip-apply-all"
                  onClick={() => applySuggestionField("all")}
                  title="Aplicar todas las sugerencias"
                >
                  <Check size={14} />
                  <span>Aplicar todo</span>
                </button>
              </div>
              {suggestion.disclaimer && (
                <small className="ai-suggestion-disclaimer">
                  *{suggestion.disclaimer}
                </small>
              )}
            </div>
          )}

          <fieldset className="product-basic-group">
            <legend>Datos básicos</legend>
          <div className="form-grid product-basic-fields">
            <label>
              Nombre
              <input
                name="name"
                required
                maxLength={160}
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej. Alfajor Jorgito Chocolate o Coca-Cola 500ml"
              />
            </label>
            <label>
              Código de barras o interno
              <input
                name="code"
                required
                maxLength={100}
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                onBlur={guided ? undefined : handleCodeBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!guided) void handleCodeBlur();
                  }
                }}
                placeholder="Escaneá o ingresá el código EAN"
              />
            </label>
            {!creatingComposition && <label>
              Uso del producto
              <select value={formData.sellable ? 'sale' : 'ingredient'} onChange={e => setFormData(prev => ({ ...prev, sellable: e.target.value === 'sale' }))}>
                <option value="sale">Para vender</option>
                <option value="ingredient">Solo insumo</option>
              </select>
              {!formData.sellable && <small>Se repone y se usa en combos. No aparece en Vender ni necesita precio de venta.</small>}
            </label>}
            <label>
              Costo por {saleUnit} ($)
              <NumberInput
                name="cost"
                disabled={creatingComposition || (!!editing && hasComposition(editing))}
                type="number"
                min={pricingByMarkup ? '0.01' : '0'}
                step="0.01"
                required
                value={editingRecipeCost?.cost ?? (creatingComposition ? '' : formData.cost)}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, cost: e })); }
                }
                placeholder="0.00"
              />
              {(creatingComposition || (editing && hasComposition(editing))) && <small>Se calcula sumando el costo de los componentes. Para cambiarlo, editá el costo de los insumos.</small>}
              {!!editingRecipeCost?.missing.length && <small role="status">Falta cargar el costo de: {editingRecipeCost.missing.join(', ')}.</small>}
            </label>
            {formData.sellable && formData.markup !== null && <ProductMarkupField value={formData.markup}
              onChange={markup => { invalidateProductSuggestions(); setFormData(prev => ({ ...prev, markup })); }} />}
            {formData.sellable && formData.markup !== null && store.price_rounding !== undefined && <ProductRoundingField value={formData.rounding} storeStep={storeRounding}
              onChange={rounding => { invalidateProductSuggestions(); setFormData(prev => ({ ...prev, rounding })); }} />}
            {formData.sellable && <div className="price-mode-row">
              {formData.markup !== null
                ? <><small>El precio se calcula con el costo y la ganancia.</small>
                  <button type="button" className="text-button" disabled={busy} onClick={() => void requestManualPrice()}>Poner precio manual</button>
                  {editing && <button type="button" className="text-button" onClick={event => openHistory(editing, event.currentTarget)}>Ver historial de precios</button>}</>
                : <><small role="note">Precio manual: no sigue al costo.</small>
                  <button type="button" className="text-button" disabled={busy || creatingComposition} onClick={useCostPrice}>Calcular por costo</button>
                  {editing && <button type="button" className="text-button" onClick={event => openHistory(editing, event.currentTarget)}>Ver historial de precios</button>}</>}
            </div>}
            <label className="retail-price-field" hidden={!formData.sellable}>
              Precio en la lista principal por {saleUnit} ($)
              <NumberInput
                name="price"
                disabled={!formData.sellable}
                type="number"
                min="0.01"
                max="9999999999"
                step="0.01"
                required={formData.sellable && !pricingByMarkup}
                readOnly={pricingByMarkup}
                value={pricingByMarkup ? formSalePrice ?? '' : formData.price}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, price: e })); }
                }
                placeholder="0.00"
              />
              {isCheckingPrice && (
                <div className="price-ai-evaluating">
                  <Loader2 className="animate-spin" size={13} />
                  <span>Analizando margen con IA...</span>
                </div>
              )}
              {priceValidation && (
                <div
                  className="price-ai-alert-banner"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="price-ai-alert-top">
                    <div className="price-ai-alert-title-row">
                      <AlertTriangle className="price-ai-warn-icon" size={16} />
                      <span className="price-ai-alert-title">
                        {priceValidation.alert}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="price-ai-alert-close"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPriceValidation(null);
                      }}
                      title="Descartar aviso"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {priceValidation.reasoning && (
                    <p className="price-ai-reasoning">
                      {priceValidation.reasoning}
                    </p>
                  )}
                  {priceValidation.suggestion > 0 && (
                    <div className="price-ai-actions">
                      <button
                        type="button"
                        className="price-ai-suggestion-chip ai-action"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData((prev) => suggestedPriceDraft(prev, priceValidation.suggestion));
                          setPriceValidation(null);
                        }}
                        title={`Aplicar precio sugerido de $${priceValidation.suggestion.toLocaleString("es-AR")}`}
                      >
                        <AiIcon size={13} />
                        <span>
                          Usar precio sugerido: $
                          {priceValidation.suggestion.toLocaleString("es-AR")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </label>
            {formData.sellable && !creatingComposition && <ProductMarginStatus price={formSalePrice || 0} cost={pricingCost} threshold={store.low_margin_threshold} />}
            <label>
              Fecha de vencimiento (opcional)
              <input
                name="expiry_date"
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                }
              />
              <small>Si hay varios lotes, indicá el próximo vencimiento. No cambia precios ni bloquea ventas.</small>
            </label>
            <label>
              {store.depot_enabled ? 'Stock total' : 'Stock actual'} ({saleUnit === 'unidad' ? 'unidades' : saleUnit === 'litro' ? 'litros' : saleUnit === 'pack' ? 'packs' : saleUnit === 'caja' ? 'cajas' : saleUnit})
              <NumberInput
                name="stock"
                type="number"
                disabled={creatingComposition || (!!editing && hasComposition(editing))}
                min={editing?.depotStock || 0}
                step="1"
                required
                value={formData.stock}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, stock: e })); }
                }
              />
              {(creatingComposition || (editing && hasComposition(editing))) && <small>Disponibilidad calculada por componentes. Reponelos desde el listado.</small>}
              {!!editing?.depotStock && <small>{editing.depotStock.toLocaleString('es-AR')} unidades están en depósito. Cambiar este total ajusta el salón; para mover unidades usá Reponer.</small>}
            </label>
          </div>
          </fieldset>
          <div hidden={guided} className="product-help-actions" aria-label="Ayudas opcionales para el producto">
            <button type="button" className="text-button ai-action" disabled={busy || isSuggesting || (formData.name.trim().length < 2 && !formData.code.trim())} onClick={() => void suggestProductDetails()}>
              <AiIcon size={14} /> Sugerir datos
            </button>
            <button type="button" className="text-button ai-action" disabled={busy || isCheckingPrice || !formData.sellable || creatingComposition} onClick={() => void reviewProductPrice()}>
              <AiIcon size={14} /> Revisar precio
            </button>
            <button type="button" className="text-button ai-action" disabled={busy || isCheckingAnomalies} onClick={e => { if (editorRef.current?.reportValidity()) void handleSubmit(e, true); }}>
              <AiIcon size={14} />
              {isCheckingAnomalies ? 'Revisando…' : 'Revisar posibles errores'}
            </button>
            <small>Estas ayudas usan IA y son opcionales.</small>
          </div>
          {productSuggestionNote && <p className="product-help-note" role="status">{productSuggestionNote}</p>}
          {priceReviewNote && <p className="product-help-note" role="status">{priceReviewNote}</p>}
          {productReviewNote && <p className="product-help-note" role="status">{productReviewNote}</p>}
          <details className="product-more-options" ref={productOptionsRef} open={productOptionsOpen} onToggle={event => setProductOptionsOpen(event.currentTarget.open)}>
            <summary><strong>Más opciones</strong><span>{editing && productOptionsSummary ? productOptionsSummary : 'Categoría, proveedor, bultos y otros datos'}</span></summary>
            <fieldset className="product-options-group">
              <legend>Organización y proveedor</legend>
              <div className="form-grid">
            <label>
              Categoría
              <select
                name="category"
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
              >
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Marca
              <input
                name="brand"
                maxLength={80}
                value={formData.brand}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, brand: e.target.value }))
                }
                placeholder="Ej: Coca-Cola, Arcor, Bimbo"
              />
            </label>
            <label>
              Distribuidor
              <input
                name="supplier"
                maxLength={100}
                value={formData.supplier}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplier: e.target.value }))
                }
                placeholder="Ej: Distribuidora Norte SRL"
              />
            </label>
            <label>
              Cód. Proveedor
              <input
                name="supplierCode"
                maxLength={50}
                value={formData.supplierCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplierCode: e.target.value,
                  }))
                }
                placeholder="Código del proveedor (opcional)"
              />
            </label>
            <div className="product-tags-field">
              <label>
                Etiquetas / Tags
                <div className="tags-input-wrapper">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const tag = tagInput.trim().replace(/^#/, "");
                        if (tag && !formData.tags.includes(tag)) {
                          setFormData((prev) => ({
                            ...prev,
                            tags: [...prev.tags, tag],
                          }));
                        }
                        setTagInput("");
                      }
                    }}
                    placeholder="Escribí un tag y presioná Enter (ej: refrigerado, importado)"
                  />
                </div>
              </label>
              {formData.tags.length > 0 && (
                <div className="tags-chips-list">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tags: prev.tags.filter((t) => t !== tag),
                          }))
                        }
                        title="Eliminar tag"
                        aria-label={`Eliminar tag ${tag}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <label>
              Ícono
              <input
                name="emoji"
                maxLength={8}
                value={formData.emoji}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, emoji: e.target.value }))
                }
              />
            </label>
              </div>
            </fieldset>
            <fieldset className="product-options-group">
              <legend>Presentación y avisos</legend>
              <div className="form-grid">
            <label>
              Unidad
              <select
                name="unitType"
                value={formData.unitType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    unitType: e.target.value as
                      | "unit"
                      | "kg"
                      | "lt"
                      | "pack"
                      | "box",
                  }))
                }
              >
                <option value="unit">Unidad (unit)</option>
                <option value="kg">Kilo (kg)</option>
                <option value="lt">Litro (lt)</option>
                <option value="pack">Pack (pack)</option>
                <option value="box">Caja (box)</option>
              </select>
            </label>
            <div className="product-presentations" role="group" aria-label="Presentaciones de compra">
              <p className="product-presentations-help">Cada presentación con su código. Al reponer o cargar un remito o una factura, el código del display o del bulto se reconoce y se pasa a unidades. En Vender se escanea la unidad.</p>
              <div className="product-presentation" role="group" aria-label="Unidad">
                <strong>Unidad</strong>
                <p>Código (EAN): <span className="product-presentation-code">{formData.code.trim() || 'el código del producto'}</span><small>Precio, costo y stock van por {saleUnit}.</small></p>
              </div>
              {displayReady && <div className="product-presentation" role="group" aria-label="Display">
                <strong>Display</strong>
                <div className="product-presentation-fields">
                <label title="Cuántas unidades trae cada display. Un bulto con displays debe ser múltiplo del display.">
                  Unidades por display
                  <NumberInput name="display_size" type="number" min="1" max="2147483647" step="1" value={formData.displaySize} placeholder="Opcional, ej. 12"
                    onValueChange={e => { invalidateProductSuggestions(); setFormData(prev => ({ ...prev, displaySize: e })); }} />
                  {formData.displaySize.trim() && formData.packSize.trim() && Number(formData.packSize) % Number(formData.displaySize) !== 0
                    ? <small role="alert">El bulto ({formData.packSize} u.) tiene que ser múltiplo del display ({formData.displaySize} u.).</small>
                    : <small>{Number(formData.displaySize) > 1 && Number(formData.packSize) > 1 ? `Bulto = ${Number(formData.packSize) / Number(formData.displaySize)} displays × ${formData.displaySize} u.` : 'Permite reponer y cargar facturas por display.'}</small>}
                </label>
                {codesReady && <label>
                  Código del display (EAN-13)
                  <input name="display_code" inputMode="numeric" autoComplete="off" maxLength={40} pattern="[0-9A-Za-z\-]{1,40}" value={formData.displayCode} placeholder="Opcional"
                    onChange={event => setFormData(prev => ({ ...prev, displayCode: event.target.value.replace(/\s/g, '') }))} />
                  {presentationCodeWarning(formData.displayCode, 'display') ? <small role="status">{presentationCodeWarning(formData.displayCode, 'display')}</small>
                    : formData.displayCode.trim() && !formData.displaySize.trim() ? <small role="status">Completá las unidades por display para que el código cargue la cantidad correcta.</small> : null}
                </label>}
                </div>
              </div>}
              <div className="product-presentation" role="group" aria-label="Bulto">
                <strong>Bulto</strong>
                <div className="product-presentation-fields">
                <label title="Cuántas unidades tiene cada bulto que comprás. Al reponer podés ingresar la cantidad de bultos y el sistema multiplica.">
                  Unidades por bulto
                  <NumberInput name="pack_size" type="number" min="1" max="2147483647" step="1" value={formData.packSize} placeholder="Opcional, ej. 24" onValueChange={e => { invalidateProductSuggestions(); setFormData(prev => ({ ...prev, packSize: e })); }} />
                  <small>El bulto se usa para convertir cantidades al reponer.</small>
                </label>
                {codesReady && <>
                  <label>
                    Código del bulto (DUN-14)
                    <input name="pack_code" inputMode="numeric" autoComplete="off" maxLength={40} pattern="[0-9A-Za-z\-]{1,40}" value={formData.packCode} placeholder="Opcional"
                      onChange={event => setFormData(prev => ({ ...prev, packCode: event.target.value.replace(/\s/g, '') }))} />
                    {presentationCodeWarning(formData.packCode, 'pack') ? <small role="status">{presentationCodeWarning(formData.packCode, 'pack')}</small>
                      : formData.packCode.trim() && !formData.packSize.trim() ? <small role="status">Completá las unidades por bulto para que el código cargue la cantidad correcta.</small> : null}
                  </label>
                  <label>
                    Bultos por pallet
                    <NumberInput name="pallet_packs" type="number" min="1" max="100000" step="1" value={formData.palletPacks} placeholder="Opcional, ej. 60"
                      onValueChange={e => setFormData(prev => ({ ...prev, palletPacks: e }))} />
                    {Number(formData.palletPacks) > 0 && Number(formData.packSize) > 0 && <small>Pallet = {(Number(formData.palletPacks) * Number(formData.packSize)).toLocaleString('es-AR')} u.</small>}
                  </label>
                </>}
                </div>
              </div>
            </div>
            <label>
              Avisar cuando queden
              <NumberInput
                name="min"
                type="number"
                min="0"
                step="1"
                required
                value={formData.min}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, min: e })); }
                }
              />
            </label>
              </div>
            </fieldset>
          </details>
          <div className="button-row product-editor-actions">
            <button
              className="primary-button"
              disabled={busy}
            >
              {creatingComposition ? 'Crear y elegir componentes' : 'Guardar producto'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={cancelEdit}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </>
  );
}
