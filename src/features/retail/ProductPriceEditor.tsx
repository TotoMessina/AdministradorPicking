import { NumberInput } from '../../components/NumberInput';
import { useEffect, useRef, useState } from 'react';
import { askConfirm } from '../../components/ConfirmHost';
import { draftMarkupPrice, markupFromPrice } from '../../services/productSalePrice';
import { retail, type Product, type Store } from './api';
import type { Run } from './Management';
import { ProductMarginStatus } from './ProductMarginStatus';
import { ProductMarkupField, ProductRoundingField } from './ProductMarkupField';

/**
 * Por defecto el precio se edita con la ganancia sobre costo y el redondeo. El precio manual se pide aparte.
 * Send only pricing and the previous price, never a product snapshot.
 */
export function ProductPriceEditor({ storeId, store, product, threshold, busy, run, active, onClose }: {
  storeId: string; store: Store; product: Product; threshold?: number; busy: boolean; run: Run; active: boolean; onClose: () => void;
}) {
  // Sin la actualización 202611030007 (o sin costo) solo queda el precio manual, como antes.
  const costPricing = store.price_rounding !== undefined && product.cost > 0;
  const [manual, setManual] = useState(!costPricing);
  const [price, setPrice] = useState(String(product.price));
  const [markup, setMarkup] = useState(product.sale_markup != null ? String(product.sale_markup) : markupFromPrice(product.price, product.cost) || String(store.default_markup ?? ''));
  const [rounding, setRounding] = useState<number | null>(product.price_rounding ?? null);
  const storeStep = store.price_rounding ?? 0;
  const calculated = draftMarkupPrice(product.cost, markup, rounding ?? storeStep);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (active) input.current?.focus(); }, [active, manual]);
  const unchanged = manual
    ? Number(price) === product.price && product.sale_markup == null
    : product.sale_markup != null && Number(markup) === product.sale_markup && rounding === (product.price_rounding ?? null);
  const requestManual = async () => {
    if (!await askConfirm('¿Poner el precio a mano? Deja de seguir al costo: si el costo cambia, el precio no se actualiza. Podés volver al cálculo por costo cuando quieras.')) return;
    if (calculated) setPrice(String(calculated));
    setManual(true);
  };
  return <form className="retail-form product-editor" onSubmit={async event => {
    event.preventDefault();
    if (!active || busy) return;
    if (manual) {
      const value = Number(price);
      if (!Number.isFinite(value) || value <= 0) return;
      if (await run(() => retail.updateProductPrice(storeId, product.id, value, product.price), 'Precio actualizado')) onClose();
      return;
    }
    if (calculated === null) return;
    if (await run(() => retail.updateProductPricing(storeId, product.id, Number(markup), rounding, product.price), 'Precio actualizado por costo')) onClose();
  }}>
    <h3>Editar precio de {product.name}</h3>
    <p>Precio principal actual: ${product.price.toLocaleString('es-AR')}{product.sale_markup != null ? ` (costo + ${product.sale_markup.toLocaleString('es-AR')}%)` : ' (manual)'}. Las otras listas siguen calculándose desde este precio.</p>
    {manual ? <>
      <label>Precio manual ($)<NumberInput ref={input} type="number" required min="0.01" step="0.01" value={price} disabled={busy} onValueChange={event => setPrice(event)} /></label>
      {costPricing ? <div className="price-mode-row"><small role="note">No sigue al costo ni se redondea.</small>
        <button type="button" className="text-button" disabled={busy} onClick={() => setManual(false)}>Calcular por costo</button></div>
        : <small role="note">{product.cost > 0 ? 'Actualizá la base para calcular por costo.' : 'Cargá el costo del producto para calcular el precio por costo.'}</small>}
      <ProductMarginStatus price={Number(price)} cost={product.cost} threshold={threshold} />
    </> : <>
      <p>Costo: ${product.cost.toLocaleString('es-AR')}</p>
      <ProductMarkupField value={markup} onChange={setMarkup} disabled={busy} />
      <ProductRoundingField value={rounding} storeStep={storeStep} onChange={setRounding} disabled={busy} />
      <p role="status"><strong>Precio: {calculated === null ? '—' : `$${calculated.toLocaleString('es-AR')}`}</strong></p>
      <div className="price-mode-row"><small>El precio sigue al costo: si el costo cambia, se recalcula.</small>
        <button type="button" className="text-button" disabled={busy} onClick={() => void requestManual()}>Poner precio manual</button></div>
      <ProductMarginStatus price={calculated ?? 0} cost={product.cost} threshold={threshold} />
    </>}
    <div className="button-row"><button className="primary-button" disabled={busy || unchanged || (!manual && calculated === null)}>Guardar precio</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancelar</button></div>
  </form>;
}
