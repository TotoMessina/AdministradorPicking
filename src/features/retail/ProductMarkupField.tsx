import { NumberInput } from '../../components/NumberInput';
import { priceRoundingSteps, roundingLabel } from '../../services/productSalePrice';

export function ProductMarkupField({ value, onChange, disabled = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  return <label>Ganancia sobre costo (%)
    <NumberInput name="sale_markup" data-product-markup required min="-99.99" max="10000" step="0.01"
      value={value} onValueChange={onChange} disabled={disabled} placeholder="Ej. 30" />
    <small>Precio en la lista Principal. Costo $100 +30% = $130, después se redondea.</small>
  </label>;
}

/** Redondeo del precio por costo: el del comercio (null) o uno propio del producto. */
export function ProductRoundingField({ value, storeStep, onChange, disabled = false }: {
  value: number | null; storeStep: number; onChange: (value: number | null) => void; disabled?: boolean;
}) {
  return <label>Redondeo
    <select name="price_rounding" value={value === null ? 'store' : String(value)} disabled={disabled}
      onChange={event => onChange(event.target.value === 'store' ? null : Number(event.target.value))}>
      <option value="store">Como el comercio ({roundingLabel(storeStep).toLowerCase()})</option>
      {priceRoundingSteps.map(step => <option key={step} value={step}>{roundingLabel(step)}{step > 0 ? ', hacia arriba' : ''}</option>)}
    </select>
  </label>;
}
