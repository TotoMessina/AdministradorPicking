import { Loader2, Plus, X } from 'lucide-react';
import './product-sheet.css';
import { useProductSheet, type ProductSheetProps } from './productSheet/useProductSheet';
import { ProductSheetTable } from './productSheet/ProductSheetTable';

export function ProductSheet(props: ProductSheetProps) {
  const state = useProductSheet(props);
  const { mode, onClose, blank, rows, setRows, saving, save, errors, totals, disabled } = state;
  return <section className="retail-form product-sheet" aria-labelledby="product-sheet-title">
    <div className="product-sheet-head">
      <div>
        <h3 id="product-sheet-title">{mode === 'new' ? 'Agregar productos' : rows.length === 1 ? `Editar ${rows[0].original?.name || 'producto'}` : `Editar ${rows.length} productos en planilla`}</h3>
        <p>Elegí si cargás por unidad, display o bulto: la cantidad y el costo van por esa presentación y se guardan por unidad. El precio sale del costo por unidad y la ganancia.</p>
      </div>
      <button type="button" className="icon-button" aria-label="Cerrar planilla" disabled={Boolean(saving)} onClick={onClose}><X size={18} /></button>
    </div>

    <ProductSheetTable state={state} />

    <div className="product-sheet-footer">
      {mode === 'new' && <button type="button" className="text-button" disabled={disabled} onClick={() => setRows(previous => [...previous, blank()])}><Plus size={15} /> Agregar fila</button>}
      <small>Enter o las flechas pasan a la misma columna de la fila de abajo. El lector de códigos salta solo al nombre.</small>
      {errors.length > 0 && <p role="alert" className="product-sheet-errors">{errors.length} {errors.length === 1 ? 'fila tiene' : 'filas tienen'} errores: revisalas antes de guardar.</p>}
      {saving && <p role="status"><Loader2 size={15} className="spin" /> Guardando {saving.done} de {saving.total}…</p>}
      <div className="product-sheet-actions">
        <button type="button" className="secondary-button" disabled={Boolean(saving)} onClick={onClose}>Cancelar</button>
        <button type="button" className="primary-button" disabled={disabled || !totals.rows} onClick={() => void save()}>
          {totals.rows ? `Guardar ${totals.rows} ${totals.rows === 1 ? 'producto' : 'productos'}` : mode === 'edit' ? 'Sin cambios' : 'Guardar'}</button>
      </div>
    </div>
  </section>;
}
