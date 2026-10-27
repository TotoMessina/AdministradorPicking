import { NumberInput } from '../../components/NumberInput';

export function ProductMarkupField({ value, onChange, disabled = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  return <label>Margen sobre costo (%)
    <NumberInput name="sale_markup" data-product-markup required min="-99.99" max="10000" step="0.01"
      value={value} onValueChange={onChange} disabled={disabled} placeholder="Ej. 30" />
    <small>Precio en la lista Principal. Costo $100 +30% = $130.</small>
  </label>;
}
