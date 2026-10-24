import { NumberInput } from '../../components/NumberInput';
import { useEffect, useRef, useState } from 'react';
import { retail, type Product } from './api';
import type { Run } from './Management';
import { ProductMarginStatus } from './ProductMarginStatus';

/** Send only price and its previous value, never a product snapshot. */
export function ProductPriceEditor({ storeId, product, threshold, busy, run, active, onClose }: {
  storeId: string; product: Product; threshold?: number; busy: boolean; run: Run; active: boolean; onClose: () => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (active) input.current?.focus(); }, [active]);
  return <form className="retail-form product-editor" onSubmit={async event => {
    event.preventDefault(); const value = Number(price);
    if (!active || busy || !Number.isFinite(value) || value <= 0) return;
    if (await run(() => retail.updateProductPrice(storeId, product.id, value, product.price), 'Precio actualizado')) onClose();
  }}>
    <h3>Editar precio de {product.name}</h3>
    <p>Precio base actual: ${product.price.toLocaleString('es-AR')}. El stock, costo, presentación y demás atributos se conservan. Las listas de precios mantienen sus reglas.</p>
    <label>Nuevo precio base ($)<NumberInput ref={input} type="number" required min="0.01" step="0.01" value={price} disabled={busy} onValueChange={event => setPrice(event)} /></label>
    <ProductMarginStatus price={Number(price)} cost={product.cost} threshold={threshold} />
    <div className="button-row"><button className="primary-button" disabled={busy || Number(price) === product.price}>Guardar precio</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancelar</button></div>
  </form>;
}
