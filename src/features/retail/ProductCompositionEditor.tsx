import { CompositionFields } from './CompositionFields';
import { useEffect, useRef, useState } from 'react';
import { retail, errorMessage, type Product, type Category } from './api';
import type { Run } from './Management';
import { compositionCost, compositionKey, hasComposition, withAvailableStock } from '../../services/productComposition';
import { LooseCigaretteEditor } from './LooseCigaretteEditor';
import { SectionNav } from './SectionNav';
import { NewCompositeEditor } from './NewCompositeEditor';
import './composition-editor.css';

export function ProductCompositionEditor({ storeId, product, products, categories, active, busy, run, onClose, newProduct = false, canCreateCombo = false }: {
  storeId: string; product: Product; products: Product[]; active: boolean; busy: boolean; run: Run; onClose: () => void;
  newProduct?: boolean;
  categories: Category[]; canCreateCombo?: boolean;
}) {
  const [rows, setRows] = useState(() => product.stock_components?.length
    ? product.stock_components.map(row => ({ product_id: row.product_id, quantity: String(row.quantity) })) : [{ product_id: '', quantity: '1' }]);
  const [error, setError] = useState('');
  const [loose, setLoose] = useState(false);
  const [looseVisited, setLooseVisited] = useState(false);
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (active) heading.current?.focus(); }, [active]);
  const components = rows.map(row => ({ product_id: row.product_id, quantity: Number(row.quantity) })).sort((a, b) => a.product_id.localeCompare(b.product_id));
  const available = withAvailableStock(products.map(row => row.id === product.id ? { ...row, stock_components: components } : row)).find(row => row.id === product.id)?.stock || 0;
  const hasOwnStock = !hasComposition(product) && product.stock > 0;
  const needsNewCombo = hasOwnStock || (!hasComposition(product) && product.sellable === false);
  const calculatedCost = compositionCost(components, products);
  const nav = `composition-${product.id}`;
  const save = async (next: NonNullable<Product['stock_components']>) => {
    if (!active || loose || busy || saving.current) return;
    if (next.length && (hasOwnStock || new Set(next.map(row => row.product_id)).size !== next.length)) {
      setError(hasOwnStock ? 'Este producto todavía tiene stock propio. Creá otro producto sin stock para vincularlo; no se convierten existencias automáticamente.' : 'Elegí cada componente una sola vez.');
      return;
    }
    saving.current = true; setError('');
    try {
      if (await run(async () => {
        try { return await retail.saveProductComposition(storeId, product.id, next, product.stock_components || []); }
        catch (error) { setError(errorMessage(error)); throw error; }
      }, 'Composición guardada')) onClose();
    } finally { saving.current = false; }
  };
  return <section className="composition-workspace">
    <h3 ref={heading} tabIndex={-1}>{hasComposition(product) ? 'Componentes' : 'Formas de venta'} · {product.name}</h3>
    {!hasComposition(product) && <SectionNav name={nav} label={`Cómo vender ${product.name}`} value={loose ? 'loose' : 'combo'}
      disabled={busy || !active} sections={[{ id: 'combo', label: 'Combo o paquete' }, { id: 'loose', label: 'Cigarrillos sueltos' }]}
      onChange={value => { setLoose(value === 'loose'); if (value === 'loose') setLooseVisited(true); setError(''); }} />}
    <div hidden={loose} id={`${nav}-panel-combo`} role={hasComposition(product) ? 'region' : 'tabpanel'} aria-label={hasComposition(product) ? `Componentes de ${product.name}` : undefined} aria-labelledby={!hasComposition(product) ? `${nav}-tab-combo` : undefined}>
    {needsNewCombo && canCreateCombo ? <NewCompositeEditor storeId={storeId} products={products} categories={categories} active={active && !loose} busy={busy} run={run} onClose={onClose} initialComponent={product} focusOnActivate={false} /> : needsNewCombo ? <div className="composition-start">
      <p><strong>{product.name}</strong> tiene {product.stock.toLocaleString('es-AR')} unidades de stock propio.</p>
      <p>Creá otro producto que lo consuma junto a los demás componentes. Sus existencias se conservan.</p>
      <p>Pedile a administración permiso para crear productos y armar un combo nuevo.</p>
      <button type="button" className="secondary-button" disabled={busy || !active} onClick={onClose}>Cancelar</button>
    </div> : <form className="retail-form product-editor" onSubmit={event => { event.preventDefault(); void save(components); }}>
    <p>{hasComposition(product) ? 'Cada venta descuenta estas cantidades de los componentes.' : `Elegí qué productos consume cada venta de ${product.name}. El costo y la disponibilidad se calculan solos.`}</p>
    <CompositionFields rows={rows} onChange={setRows} products={products} excludeId={product.id}
      disabled={busy || !active || loose} available={available} calculatedCost={calculatedCost} />
    <small>Necesitás conexión para configurar. El precio de venta se conserva; el costo se calcula con los componentes y se actualiza al cambiar sus costos.</small>
    {error && <p role="alert">{error}</p>}
    <div className="product-editor-actions button-row">
      <button className="primary-button" disabled={busy || !active || loose || compositionKey(components) === compositionKey(product.stock_components)}>Guardar componentes</button>
      <button type="button" className="secondary-button" disabled={busy || !active || loose} onClick={onClose}>{newProduct ? 'Configurar después' : 'Cancelar'}</button>
    </div>
    {hasComposition(product) && <details className="composition-other-options"><summary>Más opciones</summary>
      <p>Quitar los componentes deja este producto con stock propio 0. No borra ni modifica las existencias de sus ingredientes.</p>
      <button type="button" className="text-button danger-text" disabled={busy || !active || loose} onClick={() => {
        if (window.confirm(`¿Quitar los componentes de ${product.name}? Sus ingredientes conservan sus existencias; este producto queda con stock propio 0.`)) void save([]);
      }}>Quitar componentes</button>
    </details>}
  </form>}
    {error && needsNewCombo && <p role="alert">{error}</p>}
    </div>
    {!hasComposition(product) && <div hidden={!loose} id={`${nav}-panel-loose`} role="tabpanel" aria-labelledby={`${nav}-tab-loose`}>
      {looseVisited && <LooseCigaretteEditor storeId={storeId} packet={product} products={products} busy={busy} active={active && loose} run={run} onSaved={onClose} onBack={onClose} focusOnActivate={false} />}
    </div>}
  </section>;
}
