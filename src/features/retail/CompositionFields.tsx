import { NumberInput } from '../../components/NumberInput';
import type { Product } from './api';
import { compositionCost, hasComposition, stockForSale } from '../../services/productComposition';

export interface CompositionRow { product_id: string; quantity: string }
export function CompositionFields({ rows, onChange, products, excludeId, disabled, hidden, available, calculatedCost }: {
  rows: CompositionRow[]; onChange: (rows: CompositionRow[]) => void; products: Product[]; excludeId?: string;
  disabled: boolean; hidden?: boolean; available: number; calculatedCost: ReturnType<typeof compositionCost>;
}) {
  return <fieldset disabled={disabled} hidden={hidden} className="composition-fields">
    <legend>Por cada unidad vendida</legend>
    <p>Por ejemplo, cada pancho consume 1 pan y 1 salchicha. Elegí los productos que lo componen.</p>
    {rows.map((row, index) => <div className="composition-row" key={index}>
      <label>Componente<select required value={row.product_id} onChange={event => onChange(rows.map((value, position) => position === index ? { ...value, product_id: event.target.value } : value))}>
        <option value="">Elegí un componente</option>
        {products.filter(candidate => candidate.id !== excludeId && !hasComposition(candidate)).map(candidate => <option key={candidate.id} value={candidate.id}
          disabled={rows.some((value, position) => position !== index && value.product_id === candidate.id)}>{candidate.name} · {stockForSale(candidate).toLocaleString('es-AR')} disponibles</option>)}
      </select></label>
      <label>Unidades<NumberInput type="number" required min="1" max="1000000" step="1" value={row.quantity} onValueChange={quantity => onChange(rows.map((value, position) => position === index ? { ...value, quantity } : value))} /></label>
      <small>{(() => {
        const source = products.find(candidate => candidate.id === row.product_id);
        const quantity = Number(row.quantity);
        return source && source.cost > 0 && Number.isInteger(quantity) && quantity > 0
          ? `${quantity.toLocaleString('es-AR')} × $${source.cost.toLocaleString('es-AR')} = $${(Math.round(source.cost * 100) * quantity / 100).toLocaleString('es-AR')}`
          : 'Cargá el costo del componente para calcular el total.';
      })()}</small>
      <button type="button" className="text-button" disabled={rows.length === 1} aria-label={`Quitar componente ${index + 1}`} onClick={() => onChange(rows.filter((_, position) => position !== index))}>Quitar</button>
    </div>)}
    <button type="button" className="secondary-button" disabled={rows.length >= 30} onClick={() => onChange([...rows, { product_id: '', quantity: '1' }])}>Agregar componente</button>
    <p>Disponibles para vender: <strong>{available.toLocaleString('es-AR')}</strong>. Reponé los componentes, no el combo.</p>
    <p aria-live="polite"><strong>Costo por unidad: {calculatedCost.missing.length ? 'pendiente' : `$${calculatedCost.cost.toLocaleString('es-AR')}`}</strong>
      {calculatedCost.missing.length > 0 && <small> · Falta costo o selección: {calculatedCost.missing.join(', ')}. No se informa un costo parcial como completo.</small>}
    </p>
  </fieldset>;
}
