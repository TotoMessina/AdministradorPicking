import { useEffect, useState } from 'react';
import type { KioscoProduct } from '../../types/kiosco';
import { retail, errorMessage } from './api';
import { formatPackStock, unitsPerPack } from '../../services/inventoryUnits';
import { stockForSale } from '../../services/productComposition';
export function QuickProducts({ storeId, branchId, products: inventory, manager, onAdd, onOpenManual, disabled, editorOnly = false }: {
  storeId: string; branchId: string; products: KioscoProduct[]; manager: boolean; onAdd: (p: KioscoProduct) => void; onOpenManual?: () => void; disabled: boolean;
  editorOnly?: boolean;
}) {
  const products = inventory.filter(product => product.sellable !== false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    let changed = false;
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ store: string; branch?: string; ids?: string[] }>).detail;
      if (detail?.store === storeId) {
        if (detail.branch === branchId && detail.ids) {
          changed = true;
          setPinned(detail.ids);
        } else if (!detail.branch || detail.branch === branchId) {
          retail.quickProducts(storeId, branchId)
            .then(pins => { if (active) setPinned(pins.map(p => p.product_id)); })
            .catch(() => {});
          retail.popularProducts(storeId, branchId)
            .then(top => { if (active) setPopular(top.map(p => p.product_id)); })
            .catch(() => {});
        }
      }
    };
    window.addEventListener('retail-quick-products-changed', receive);
    setPinned([]); setPopular([]); setEditing(false); setError('');
    Promise.all([retail.quickProducts(storeId, branchId), retail.popularProducts(storeId, branchId)])
      .then(([pins, top]) => { if (active) { if (!changed) setPinned(pins.map(p => p.product_id)); setPopular(top.map(p => p.product_id)); } })
      .catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; window.removeEventListener('retail-quick-products-changed', receive); };
  }, [storeId, branchId]);

  // Priorizar estrictamente los productos seleccionados por el usuario
  const userSelected = pinned.filter(id => products.some(p => p.id === id));
  const ids = userSelected.length > 0
    ? userSelected
    : popular.filter(id => products.some(p => p.id === id)).slice(0, 19);

  return <section className="quick-products" aria-label="Botonera de venta rápida">
    <div className="section-heading"><div><h3>Venta rápida</h3><small>{userSelected.length > 0 ? 'Tus productos seleccionados para esta caja' : 'Favoritos y más vendidos de esta sucursal'}</small></div>
      {manager && <button type="button" className="text-button" disabled={disabled || saving} onClick={() => { setSelection(pinned.filter(id => products.some(p => p.id === id))); setEditing(!editing); }}>{editing ? 'Cerrar' : 'Personalizar'}</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {editing && manager ? <form className="quick-editor retail-form" onSubmit={async e => {
      e.preventDefault(); if (saving || !manager) return; setSaving(true); setError('');
      const validSelection = selection.filter(id => products.some(p => p.id === id));
      try { await retail.saveQuickProducts(storeId, branchId, validSelection); setPinned(validSelection); setEditing(false);
        window.dispatchEvent(new CustomEvent('retail-quick-products-changed', { detail: { store: storeId, branch: branchId, ids: validSelection } }));
      }
      catch (error) { setError(errorMessage(error)); } finally { setSaving(false); }
    }}>
      <p>Elegí hasta 20 productos. Los seleccionados aparecen primero, en el orden en que los agregás.</p>
      <label>Buscar para la botonera<input value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="quick-editor-list">{products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.code.includes(query)).slice(0, 60).map(p => <label key={p.id}>
        <input type="checkbox" checked={selection.includes(p.id)} disabled={saving || (!selection.includes(p.id) && selection.length >= 20)} onChange={e => setSelection(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))} />{p.emoji} {p.name}{selection.includes(p.id) ? ` · ${selection.indexOf(p.id) + 1}` : ''}
      </label>)}</div>
      <div><button className="primary-button" disabled={saving}>Guardar botonera ({selection.length}/20)</button><button type="button" className="text-button" disabled={saving} onClick={() => setEditing(false)}>Cancelar</button></div>
    </form> : editorOnly ? <p>Elegí Personalizar para cambiar los productos de venta rápida de esta sucursal.</p> : <div className="quick-products-grid">
      {ids.map(id => {
        const p = products.find(p => p.id === id);
        if (!p) return null;
        return <button type="button" key={id} disabled={disabled || !!p.pricingError || stockForSale(p) <= 0} onClick={() => onAdd(p)} aria-label={p.pricingError ? `${p.name}: ${p.pricingError}` : `Venta rápida: ${p.name}`}>
          <span aria-hidden="true">{p.emoji || '📦'}</span><strong>{p.name}</strong><small>{p.pricingError || `$${p.price.toLocaleString('es-AR')}`}{stockForSale(p) <= 0 ? ' · Sin stock' : ''}</small>
          {unitsPerPack(p.pack_size) > 1 && <small>{formatPackStock(stockForSale(p), p.pack_size)}</small>}
          {!!p.depotStock && stockForSale(p) <= 0 && <small>{p.depotStock.toLocaleString('es-AR')} en depósito</small>}
        </button>;
      })}
      {onOpenManual && (
        <button
          type="button"
          className="quick-manual-card"
          disabled={disabled}
          onClick={onOpenManual}
          aria-label="Agregar un importe manual"
        >
          <span aria-hidden="true">🏷️</span>
          <strong>Importe manual</strong>
          <small>Monto libre / varios</small>
        </button>
      )}
    </div>}
    {!editing && !editorOnly && ids.length === 0 && (
      <p className="quick-empty-hint">{manager ? 'Personalizá la botonera desde "Personalizar" para elegir tus productos favoritos.' : 'Los favoritos de la sucursal aparecerán acá.'}</p>
    )}
  </section>;
}
