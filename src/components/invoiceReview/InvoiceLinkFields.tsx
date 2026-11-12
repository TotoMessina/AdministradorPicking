import { CheckCircle2 } from 'lucide-react';
import type { InvoiceItem } from '../InvoiceAnalyzer';
import { rankCatalogMatches } from '../../services/invoiceMatchingService';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import type { Props } from './invoiceReviewTableProps';

/** Producto vinculado a un renglón de la factura. */
export function InvoiceLinkFields(props: Props & { index: number; item: InvoiceItem }) {
  const { index, item, products, productSearch, onUpdate } = props;
  const pending = item.linkStatus === 'pending' || !item.matchedProduct;
  const query = normalizeSupplierText(productSearch[index] || '');
  const matches = pending ? (query ? products.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(query)).slice(0, 60) : products.slice(0, 60)) : [];
  const options = [...new Map([...(item.matchedProduct ? [item.matchedProduct] : []), ...matches,
    ...(pending && query ? rankCatalogMatches(query, query, products, 6).map(match => match.product) : []),
  ].map(product => [product.id, product])).values()];
  return <div className="invoice-sheet-link">
    {pending ? <>
      <div className="invoice-link-fields">
        <label>Buscar en catálogo<input value={productSearch[index] || ''} placeholder="Nombre o código"
          onChange={event => props.onSearchProduct(index, event.target.value)} /></label>
        <label>Producto del catálogo<select value={item.matchedProduct?.id || ''} onChange={event => props.onSelectProduct(index, event.target.value)}>
          <option value="">Elegir producto</option>
          {options.map(product => <option value={product.id} key={product.id}>{product.name}{product.code ? ` · ${product.code}` : ''}</option>)}
        </select></label>
      </div>
      <div className="invoice-sheet-detail-actions">
        <button type="button" className="primary-button" disabled={props.mappingBusy || !item.matchedProduct}
          onClick={() => props.onConfirmMapping(index)}><CheckCircle2 size={14} />{normalizeSupplierText(props.supplier) ? 'Confirmar y recordar' : 'Confirmar vínculo'}</button>
        <button type="button" onClick={() => onUpdate(index, { matchedProduct: null, action: 'create_new' })}>Crear como nuevo</button>
      </div>
    </> : <div className="invoice-sheet-detail-actions">
      <button type="button" onClick={() => onUpdate(index, { linkStatus: 'pending' })}>Cambiar vínculo</button>
      <button type="button" onClick={() => onUpdate(index, { matchedProduct: null, action: 'create_new' })}>Desvincular y crear como nuevo</button>
    </div>}
  </div>;
}
