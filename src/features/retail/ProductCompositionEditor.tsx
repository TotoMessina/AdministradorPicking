import { NumberInput } from '../../components/NumberInput';
import { useEffect, useRef, useState } from 'react';
import { retail, errorMessage, type Product } from './api';
import type { Run } from './Management';
import { compositionCost, compositionKey, hasComposition, withAvailableStock } from '../../services/productComposition';
import { LooseCigaretteEditor } from './LooseCigaretteEditor';

export function ProductCompositionEditor({ storeId, product, products, active, busy, run, onClose, newProduct = false }: {
  storeId: string; product: Product; products: Product[]; active: boolean; busy: boolean; run: Run; onClose: () => void;
  newProduct?: boolean;
}) {
  const [linked, setLinked] = useState(hasComposition(product) || newProduct);
  const [rows, setRows] = useState(() => product.stock_components?.length
    ? product.stock_components.map(row => ({ product_id: row.product_id, quantity: String(row.quantity) })) : [{ product_id: '', quantity: '1' }]);
  const [error, setError] = useState('');
  const [loose, setLoose] = useState(false);
  const [looseVisited, setLooseVisited] = useState(false);
  const saving = useRef(false);
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (active && !loose) first.current?.focus(); }, [active, loose]);
  const components = linked ? rows.map(row => ({ product_id: row.product_id, quantity: Number(row.quantity) })).sort((a, b) => a.product_id.localeCompare(b.product_id)) : [];
  const available = withAvailableStock(products.map(row => row.id === product.id ? { ...row, stock_components: components } : row)).find(row => row.id === product.id)?.stock || 0;
  const hasOwnStock = !hasComposition(product) && product.stock > 0;
  const calculatedCost = compositionCost(components, products);
  return <section><div hidden={loose}>
    {!hasComposition(product) && <button type="button" className="secondary-button" disabled={busy} onClick={() => { setLooseVisited(true); setLoose(true); }}>Configurar cigarrillos sueltos desde este atado</button>}
    <form className="retail-form product-editor" onSubmit={async event => {
    event.preventDefault();
    if (!active || busy || saving.current) return;
    if (linked && (hasOwnStock || new Set(components.map(row => row.product_id)).size !== components.length)) {
      setError(hasOwnStock ? 'Este producto todavía tiene stock propio. Creá otro producto sin stock para vincularlo; no se convierten existencias automáticamente.' : 'Elegí cada componente una sola vez.');
      return;
    }
    saving.current = true; setError('');
    try {
      if (await run(async () => {
        try { return await retail.saveProductComposition(storeId, product.id, components, product.stock_components || []); }
        catch (error) { setError(errorMessage(error)); throw error; }
      }, 'Composición guardada')) onClose();
    } finally { saving.current = false; }
  }}>
    <h3>Componentes de {product.name}</h3>
    {newProduct && <p>El producto ya está guardado. Elegí qué descuenta al venderlo; también podés configurarlo después.</p>}
    <label>Cómo descuenta stock<select ref={first} disabled={busy} value={linked ? 'components' : 'own'} onChange={event => { setLinked(event.target.value === 'components'); setError(''); }}>
      <option value="own">Stock propio</option><option value="components">Consume otros productos</option>
    </select></label>
    <fieldset disabled={busy || !linked} hidden={!linked} className="composition-fields">
      <legend>Por cada unidad vendida</legend>
      <p>Pancho: consume 1 pan + 1 salchicha. Atado: consume 10 o 20 cigarrillos del producto suelto. El suelto no consume atados.</p>
      {rows.map((row, index) => <div className="composition-row" key={index}>
        <label>Producto<select required value={row.product_id} onChange={event => setRows(previous => previous.map((value, position) => position === index ? { ...value, product_id: event.target.value } : value))}>
          <option value="">Elegí un componente</option>
          {products.filter(candidate => candidate.id !== product.id && !hasComposition(candidate)).map(candidate => <option key={candidate.id} value={candidate.id} disabled={rows.some((value, position) => position !== index && value.product_id === candidate.id)}>{candidate.name} · {candidate.stock} u.</option>)}
        </select></label>
        <label>Unidades<NumberInput type="number" required min="1" max="1000000" step="1" value={row.quantity} onValueChange={event => setRows(previous => previous.map((value, position) => position === index ? { ...value, quantity: event } : value))} /></label>
        <small>{(() => {
          const source = products.find(candidate => candidate.id === row.product_id);
          const quantity = Number(row.quantity);
          return source && source.cost > 0 && Number.isInteger(quantity) && quantity > 0
            ? `${quantity} × $${source.cost.toLocaleString('es-AR')} = $${(Math.round(source.cost * 100) * quantity / 100).toLocaleString('es-AR')}`
            : 'Cargá el costo del componente para calcular el total.';
        })()}</small>
        <button type="button" className="text-button" disabled={rows.length === 1} aria-label={`Quitar componente ${index + 1}`} onClick={() => setRows(previous => previous.filter((_, position) => position !== index))}>Quitar</button>
      </div>)}
      <button type="button" className="secondary-button" disabled={rows.length >= 30} onClick={() => setRows(previous => [...previous, { product_id: '', quantity: '1' }])}>Agregar componente</button>
      <p>Disponibles con el stock actual: <strong>{available}</strong>. Reponé los componentes, no este producto.</p>
      <p aria-live="polite"><strong>Costo por unidad: {calculatedCost.missing.length ? 'pendiente' : `$${calculatedCost.cost.toLocaleString('es-AR')}`}</strong>
        {calculatedCost.missing.length > 0 && <small> · Falta costo o selección: {calculatedCost.missing.join(', ')}. Hasta completarlos no se informa un margen calculado con costos parciales.</small>}
      </p>
    </fieldset>
    {linked && hasOwnStock && <p role="alert">Tiene {product.stock} unidades de stock propio. No se trasladan ni se borran al vincular. Usá un producto nuevo con stock 0.</p>}
    {!linked && hasComposition(product) && <p>Al desvincular queda con stock propio 0. Las existencias de sus componentes se conservan.</p>}
    <small>Necesitás conexión para configurar. El precio de venta se conserva; el costo se calcula con los componentes y se actualiza al cambiar sus costos.</small>
    {error && <p role="alert">{error}</p>}
    <div className="product-editor-actions button-row">
      <button className="primary-button" disabled={busy || (linked && hasOwnStock) || compositionKey(components) === compositionKey(product.stock_components)}>Guardar composición</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>{newProduct ? 'Configurar después' : 'Cancelar'}</button>
    </div>
  </form></div>
    <div hidden={!loose}>{looseVisited && <LooseCigaretteEditor storeId={storeId} packet={product} products={products} busy={busy} active={active && loose} run={run} onSaved={onClose} onBack={() => setLoose(false)} />}</div>
  </section>;
}
