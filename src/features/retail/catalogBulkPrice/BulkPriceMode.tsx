import { NumberInput } from '../../../components/NumberInput';
import { priceRoundingSteps, roundingLabel } from '../../../services/productSalePrice';
import { ArrowDownRight, ArrowUpRight, Coins, DollarSign, Percent } from 'lucide-react';
import type { CatalogEditorState } from '../useCatalogEditor';

/** Modo y valor del ajuste, y redondeo. */
export function BulkPriceMode({ s }: { s: CatalogEditorState }) {
  const {
    store, bulkAdjustMode, setBulkAdjustMode, bulkAdjustValue, setBulkAdjustValue, bulkRoundMultiple,
    setBulkRoundMultiple, costBulk, bulkMarkupMode, setBulkMarkupMode, bulkMarkupValue,
    setBulkMarkupValue, bulkRounding, setBulkRounding, bulkNoCost, bulkToCost,
  } = s;
  return (
    <>
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
    </>
  );
}
