import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { retail, errorMessage, type CostAdjustmentProduct } from './api';
import type { Run } from './Management';
import { formatMoney } from '../../services/purchaseInvoiceService';

const ADJUSTMENTS = [
  { id: 'add_21', label: 'Sumar IVA 21% (costos cargados sin IVA)', factor: 1.21 },
  { id: 'add_10_5', label: 'Sumar IVA 10,5% (costos cargados sin IVA)', factor: 1.105 },
  { id: 'remove_21', label: 'Quitar IVA 21% (deshacer un ajuste)', factor: 1 / 1.21 },
] as const;
type AdjustmentId = typeof ADJUSTMENTS[number]['id'];
const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * Lleva los costos existentes de un proveedor al costo final (con IVA), con vista previa y confirmación.
 * Las facturas nuevas ya cargan el costo final; esto corrige lo cargado antes.
 */
export function CostAdjustmentTool({ storeId, busy, run, active = true }: { storeId: string; busy: boolean; run: Run; active?: boolean }) {
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [supplier, setSupplier] = useState('');
  const [adjustment, setAdjustment] = useState<AdjustmentId>('add_21');
  const [products, setProducts] = useState<CostAdjustmentProduct[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void retail.getDistributors(storeId).then(rows => { if (!cancelled) setSuppliers(rows); }, () => undefined);
    return () => { cancelled = true; };
  }, [storeId, active]);

  const load = useCallback(async () => {
    if (!supplier) { setProducts([]); return; }
    setLoading(true); setError('');
    try { setProducts(await retail.productsForCostAdjustment(storeId, supplier)); setExcluded(new Set()); }
    catch (e) { setError(`No se pudieron cargar los productos: ${errorMessage(e)}`); }
    finally { setLoading(false); }
  }, [storeId, supplier]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const factor = ADJUSTMENTS.find(item => item.id === adjustment)!.factor;
  // Los combos toman el costo de sus componentes y los costos en 0 son desconocidos: no se ajustan.
  const eligible = useMemo(() => products.filter(product => product.cost > 0 && !(product.stock_components?.length)), [products]);
  const skipped = products.length - eligible.length;
  const selected = eligible.filter(product => !excluded.has(product.id));
  const withMarkup = selected.filter(product => product.sale_markup != null).length;

  const apply = async () => {
    if (!selected.length) return;
    const message = `¿Ajustar el costo de ${selected.length} producto${selected.length === 1 ? '' : 's'} de ${supplier}?`
      + (withMarkup ? ` ${withMarkup} tiene${withMarkup === 1 ? '' : 'n'} precio por porcentaje sobre costo y su precio de venta también cambia.` : '')
      + ' Los tickets anteriores no cambian.';
    if (!window.confirm(message)) return;
    const changes = selected.map(product => ({ id: product.id, expected: product.cost, cost: cents(product.cost * factor) }));
    if (await run(() => retail.adjustProductCosts(storeId, changes), `Costos ajustados: ${changes.length} producto${changes.length === 1 ? '' : 's'}`)) await load();
  };

  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><Calculator size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Ajustar costos existentes</h3>
        <p>Las facturas nuevas guardan el costo final (con IVA e impuestos internos). Usá esto para llevar al costo final los productos cargados antes sin IVA.</p>
      </div>
    </div>
    <div className="location-card-body">
      <div className="cost-adjust-controls">
        <label>Proveedor de los productos
          <select value={supplier} disabled={busy || loading} onChange={event => setSupplier(event.target.value)}>
            <option value="">Elegí un proveedor</option>
            {suppliers.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>Ajuste
          <select value={adjustment} disabled={busy || loading} onChange={event => setAdjustment(event.target.value as AdjustmentId)}>
            {ADJUSTMENTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      {supplier && !loading && !error && !eligible.length && <p className="cost-adjust-note">No hay productos activos de {supplier} con costo para ajustar.</p>}
      {eligible.length > 0 && <>
        <p className="cost-adjust-note">
          Revisá la lista y destildá los productos que ya tienen el costo final. {skipped > 0 && `${skipped} sin costo o combos no se incluyen. `}
          {withMarkup > 0 && `${withMarkup} con precio por porcentaje recalculan su precio de venta.`}
        </p>
        <div className="cost-adjust-list" role="group" aria-label={`Productos de ${supplier}`}>
          {eligible.map(product => {
            const next = cents(product.cost * factor);
            const checked = !excluded.has(product.id);
            return <label key={product.id} className={checked ? '' : 'is-excluded'}>
              <input type="checkbox" checked={checked} disabled={busy} onChange={event => setExcluded(previous => {
                const set = new Set(previous);
                if (event.target.checked) set.delete(product.id); else set.add(product.id);
                return set;
              })} />
              <span className="cost-adjust-name">{product.name}{product.sale_markup != null && <small>Precio por porcentaje</small>}</span>
              <span className="cost-adjust-values">{formatMoney(product.cost)} → <strong>{formatMoney(next)}</strong></span>
            </label>;
          })}
        </div>
        <div className="button-row">
          <button type="button" className="primary-button" disabled={busy || loading || !selected.length} onClick={() => void apply()}>
            Ajustar {selected.length} costo{selected.length === 1 ? '' : 's'}
          </button>
        </div>
      </>}
    </div>
  </div>;
}
