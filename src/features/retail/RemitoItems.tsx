import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Product, PendingReplenishmentItem } from './api';
import { rankCatalogMatches } from '../../services/invoiceMatchingService';
import { normalizeSupplierText } from '../../services/supplierMappingService';

export function RemitoItems({ items, products, onChange, disabled, linking = false }: {
  items: PendingReplenishmentItem[]; products: Product[]; onChange: (items: PendingReplenishmentItem[]) => void; disabled: boolean; linking?: boolean;
}) {
  const [queries, setQueries] = useState<Record<number, string>>({});
  const catalog = useMemo(() => products.filter(product => product.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name, 'es-AR')), [products]);
  const update = (index: number, patch: Partial<PendingReplenishmentItem>) => onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <div className="remito-items">
    {items.map((item, index) => {
      const product = catalog.find(product => product.id === item.product_id);
      const query = (queries[index] || '').trim();
      const matches = query ? [...catalog.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(normalizeSupplierText(query))).slice(0, 34), ...rankCatalogMatches(query, query, catalog, 6).map(match => match.product)] : catalog.slice(0, 40);
      const options = [...new Map([...(product ? [product] : []), ...matches].map(product => [product.id, product])).values()];
      return <div className="remito-item" key={index}>
        <div><strong>{product?.name || item.product_name}</strong><small>Remito: {item.invoice_line}</small>
          {!product && <span className="remito-warning">Sin vincular · requiere revisión del encargado</span>}
          {(item.pack_size || 1) > 1 && <small>Presentación ×{item.pack_size}. La cantidad de abajo ya está expresada en unidades individuales.</small>}
        </div>
        {linking && <div className="remito-product-picker">
          <label>Buscar producto<input value={queries[index] || ''} placeholder="Nombre o código" disabled={disabled} onChange={event => setQueries(previous => ({ ...previous, [index]: event.target.value }))} /></label>
          <label>Producto del catálogo<select value={product?.id || ''} disabled={disabled} onChange={event => {
            const selected = catalog.find(candidate => candidate.id === event.target.value);
            update(index, { product_id: selected?.id || null, product_name: selected?.name || item.invoice_line });
          }}><option value="">— Elegí un producto —</option>{options.map(product => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}</select></label>
          <small>Escribí para buscar en todo el catálogo. Hasta 40 coincidencias por búsqueda.</small>
        </div>}
        <div className="remito-item-actions"><label>Cantidad (unidades)<input aria-label={`Cantidad de ${item.invoice_line}`} type="number" min="1" max="1000000" step="1" value={item.quantity || ''} disabled={disabled} onChange={event => update(index, { quantity: Number(event.target.value) })} /></label>
          <button type="button" className="secondary-button" disabled={disabled} aria-label={`Quitar ${item.invoice_line}`} onClick={() => { onChange(items.filter((_, i) => i !== index)); setQueries({}); }}><Trash2 size={16} /> Quitar</button>
        </div>
      </div>;
    })}
    {!items.length && <p>La foto quedará disponible para que el encargado cargue los artículos manualmente.</p>}
    {linking && <button type="button" className="secondary-button" disabled={disabled || items.length >= 200} onClick={() => onChange([...items, { invoice_line: 'Artículo agregado en revisión', product_name: 'Elegí un producto', product_id: null, quantity: 1 }])}><Plus size={16} /> Agregar artículo</button>}
  </div>;
}
