import { useEffect, useRef, useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { ProductMarkupField } from './ProductMarkupField';
import { draftMarkupPrice } from '../../services/productSalePrice';
import { randomUUID } from '../../utils/uuid';
import { compositionCost, hasComposition, withAvailableStock } from '../../services/productComposition';
import { defaultProductCategory } from '../../services/productCategoryService';
import { CompositionFields, type CompositionRow } from './CompositionFields';
import { errorMessage, retail, type Category, type Product } from './api';
import type { Run } from './Management';

export function NewCompositeEditor({ storeId, products, categories, active, busy, run, onClose, initialComponent, focusOnActivate = true }: {
  storeId: string; products: Product[]; categories: Category[]; active: boolean; busy: boolean; run: Run; onClose: () => void;
  initialComponent?: Product; focusOnActivate?: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [markup, setMarkup] = useState('');
  const [categoryId, setCategory] = useState(() => defaultProductCategory(categories));
  const [rows, setRows] = useState<CompositionRow[]>([{ product_id: initialComponent?.id || '', quantity: '1' }]);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const request = useRef({ signature: '', id: randomUUID() });
  useEffect(() => { if (active && focusOnActivate) first.current?.focus(); }, [active, focusOnActivate]);
  const components = rows.map(row => ({ product_id: row.product_id, quantity: Number(row.quantity) })).sort((a, b) => a.product_id.localeCompare(b.product_id));
  const cost = compositionCost(components, products);
  const price = draftMarkupPrice(cost.cost, markup);
  const draft: Product = { id: request.current.id, name, code, category: '', categoryId, price: Number(price), cost: cost.cost, stock: 0, minStock: 4, active: true, stock_components: components };
  const available = withAvailableStock([...products.filter(product => product.id !== draft.id), draft]).find(product => product.id === draft.id)?.stock || 0;
  const candidates = products.filter(product => !hasComposition(product));
  return <form className="retail-form product-editor" onKeyDown={event => {
    // A barcode reader's Enter must not submit the entire recipe.
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
  }} onSubmit={async event => {
    event.preventDefault();
    if (!active || busy || saving.current) return;
    if (new Set(components.map(row => row.product_id)).size !== components.length) { setError('Elegí cada componente una sola vez.'); return; }
    if (price === null || cost.missing.length) { setError('Completá el porcentaje y cargá el costo de todos los componentes.'); return; }
    const data = { name: name.trim(), code: code.trim(), price, sale_markup: Number(markup), categoryId, components };
    const signature = JSON.stringify(data);
    if (request.current.signature && request.current.signature !== signature) request.current.id = randomUUID();
    request.current.signature = signature;
    saving.current = true; setError('');
    try {
      if (await run(async () => {
        try { return await retail.createCompositeProduct(storeId, request.current.id, data); }
        catch (reason) { setError(errorMessage(reason)); throw reason; }
      }, 'Combo creado con sus componentes.')) onClose();
    } finally { saving.current = false; }
  }}>
    <h3>Nuevo combo o paquete</h3>
    <p>{initialComponent ? `${initialComponent.name} ya está agregado como componente. Completá los datos del combo y sumá los demás productos.` : 'Elegí qué productos consume cada venta. El costo y la disponibilidad se calculan con sus componentes.'}</p>
    <fieldset className="composition-fields" disabled={!active || busy}>
      <legend>Datos del combo</legend>
      <label>Nombre<input ref={first} required maxLength={160} value={name} onChange={event => setName(event.target.value)} placeholder="Ej. Pancho" /></label>
      <label>Código<input required maxLength={80} value={code} onChange={event => setCode(event.target.value)} placeholder="Ej. PANCHO" autoComplete="off" /></label>
      <label>Categoría<select required value={categoryId} onChange={event => setCategory(event.target.value)}><option value="">Elegí una categoría</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    </fieldset>
    {!candidates.length && <p role="status">Primero agregá los productos que componen el combo. Podés crearlos como Solo insumo, sin precio de venta.</p>}
    <CompositionFields rows={rows} onChange={setRows} products={products} disabled={!active || busy} available={available} calculatedCost={cost} />
    <fieldset className="composition-fields" disabled={!active || busy}>
      <legend>Precio de venta</legend>
      <ProductMarkupField value={markup} onChange={setMarkup} />
      <label>Precio en la lista principal ($)<NumberInput readOnly value={price ?? ''} placeholder="Completá costo y porcentaje" /></label>
    </fieldset>
    <small>Requiere conexión y sincronizar operaciones pendientes. No se crea stock propio ni se descuenta mercadería al guardar.</small>
    {error && <p role="alert">{error}</p>}
    <div className="product-editor-actions button-row">
      <button className="primary-button" disabled={!active || busy || !candidates.length}>Guardar combo</button>
      <button type="button" className="secondary-button" disabled={!active || busy} onClick={onClose}>Cancelar</button>
    </div>
  </form>;
}
