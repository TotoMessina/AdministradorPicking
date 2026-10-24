import { NumberInput } from '../../components/NumberInput';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { errorMessage, retail, type Branch, type Product, type StockTransfer, type StockTransferItem } from './api';
import type { Run } from './Management';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { randomUUID } from '../../utils/uuid';

const validQuantity = (qty: number) => Number.isSafeInteger(qty) && qty > 0 && qty <= 1000000;
const statusNames = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
type DraftItem = { product_id: string; qty: number };

export function StockTransfers({ storeId, branches, products, run, busy, active = true }: {
  storeId: string; branches: Branch[]; products: Product[]; run: Run; busy: boolean; active?: boolean;
}) {
  const [from, setFrom] = useState(branches[0]?.id || '');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [filter, setFilter] = useState<'all' | StockTransfer['status']>('all');
  const [visible, setVisible] = useState(25);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState('');
  const request = useRef({ signature: '', id: '' });
  const working = useRef(false);
  const generation = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => products.filter(product => product.active !== false), [products]);
  const byId = useMemo(() => new Map(catalog.map(product => [product.id, product])), [catalog]);
  const normalized = normalizeSupplierText(query);
  const matches = normalized ? catalog.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(normalized)).slice(0, 20) : [];
  const disabled = busy || !!saving;
  const valid = branches.some(branch => branch.id === from) && branches.some(branch => branch.id === to) && from !== to
    && items.length > 0 && items.length <= 200 && items.every(item => byId.has(item.product_id) && validQuantity(item.qty));
  const history = transfers.filter(transfer => filter === 'all' || transfer.status === filter);
  const branchName = (id: string) => branches.find(branch => branch.id === id)?.name || 'Sucursal no disponible';
  const load = useCallback(async () => {
    const turn = ++generation.current;
    setLoading(true);
    try {
      const records = await retail.stockTransfers(storeId);
      if (turn === generation.current) { setTransfers(records); setHistoryError(''); }
    } catch (err) { if (turn === generation.current) setHistoryError(errorMessage(err)); }
    finally { if (turn === generation.current) setLoading(false); }
  }, [storeId]);
  useEffect(() => {
    if (!active) return;
    void load();
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(); };
    window.addEventListener('online', refresh); window.addEventListener('focus', refresh);
    return () => { generation.current++; window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
  }, [active, load]);
  useEffect(() => {
    setFrom(previous => branches.some(branch => branch.id === previous) ? previous : branches[0]?.id || '');
    setTo(previous => branches.some(branch => branch.id === previous) && previous !== from ? previous : '');
  }, [branches, from]);

  const add = (product: Product) => {
    const previous = items.find(item => item.product_id === product.id);
    if (previous && previous.qty >= 1000000) { setFormError('La cantidad por producto no puede superar 1.000.000 de unidades.'); return; }
    if (!previous && items.length >= 200) { setFormError('Podés incluir hasta 200 productos por transferencia.'); return; }
    setItems(previous ? items.map(item => item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...items, { product_id: product.id, qty: 1 }]);
    setQuery(''); setFormError(''); searchInput.current?.focus();
  };

  const create = async () => {
    if (working.current || busy) return;
    if (!valid) { setFormError('Elegí dos sucursales diferentes y agregá productos con cantidades enteras positivas.'); return; }
    const payload: StockTransferItem[] = items.map(item => ({ ...item, product_name: byId.get(item.product_id)!.name }));
    const signature = JSON.stringify([storeId, from, to, [...items].sort((a, b) => a.product_id.localeCompare(b.product_id)), notes.trim()]);
    if (request.current.signature !== signature) request.current = { signature, id: randomUUID() };
    working.current = true; setSaving('new'); setFormError('');
    let failure: unknown;
    try {
      const saved = await run(async () => {
        try { await retail.createTransfer(storeId, from, to, payload, notes, request.current.id); }
        catch (err) { failure = err; throw err; }
      }, 'Transferencia registrada como pendiente');
      if (saved) {
        setItems([]); setNotes(''); setQuery(''); request.current = { signature: '', id: '' };
        setFilter('all'); setVisible(25);
        await load();
      } else setFormError(failure ? errorMessage(failure) : 'No se pudo registrar. Conservamos el borrador para que reintentes.');
    } catch (err) { setFormError(errorMessage(err)); }
    finally { working.current = false; setSaving(''); }
  };
  const review = async (transfer: StockTransfer, confirm: boolean) => {
    if (working.current || busy || transfer.status !== 'pending') return;
    working.current = true; setSaving(transfer.id); setActionError('');
    let failure: unknown;
    try {
      const saved = await run(async () => {
        try {
          if (confirm) await retail.confirmTransfer(storeId, transfer.id);
          else await retail.cancelTransfer(storeId, transfer.id);
        } catch (err) { failure = err; throw err; }
      }, confirm ? 'Transferencia confirmada' : 'Transferencia cancelada');
      if (saved) {
        setTransfers(previous => previous.map(record => record.id === transfer.id ? { ...record, status: confirm ? 'confirmed' : 'cancelled' } : record));
        await load();
      } else setActionError(failure ? errorMessage(failure) : 'No se pudo completar la acción. Actualizá el historial y reintentá.');
    } catch (err) { setActionError(errorMessage(err)); }
    finally { working.current = false; setSaving(''); }
  };

  return <section className="retail-panel stock-transfers" aria-labelledby="stock-transfers-heading">
    <div className="section-heading"><div><h2 id="stock-transfers-heading">Transferencias entre sucursales</h2><p>Registrá el traslado físico de mercadería. El inventario es compartido: crear, confirmar o cancelar conserva el stock total.</p></div></div>
    {branches.length < 2 && <p className="info-banner">Agregá al menos dos sucursales en Mi comercio → Sucursales y cajas para registrar transferencias.</p>}
    <form className="retail-form" onSubmit={event => { event.preventDefault(); void create(); }}>
      <fieldset className="stock-transfer-fields" disabled={disabled || branches.length < 2}>
        <div className="stock-transfer-route">
          <label>Sucursal origen<select value={from} required onChange={event => { setFrom(event.target.value); if (event.target.value === to) setTo(''); }}><option value="">Elegí una sucursal</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <ArrowRight size={20} aria-hidden="true" />
          <label>Sucursal destino<select value={to} required onChange={event => setTo(event.target.value)}><option value="">Elegí otra sucursal</option>{branches.filter(branch => branch.id !== from).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        </div>
        <label>Buscar producto<input ref={searchInput} value={query} placeholder="Nombre o código de barras" onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (!query.trim()) return;
          const exact = catalog.find(product => product.code?.trim() === query.trim());
          const product = exact || (matches.length === 1 ? matches[0] : null);
          if (product) add(product);
        }} /></label>
        {normalized && <div className="stock-transfer-search-results" role="region" aria-label="Productos encontrados">
          {matches.length ? matches.map(product => <button type="button" className="secondary-button" key={product.id} onClick={() => add(product)}><span><strong>{product.name}</strong><small>{product.code}</small></span><Plus size={16} /> Agregar</button>) : <p>No se encontraron productos activos.</p>}
          {matches.length === 20 && <small>Se muestran hasta 20 coincidencias. Escribí más para ajustar la búsqueda.</small>}
        </div>}
        {items.length > 0 ? <div className="table-scroll"><table><caption>Productos a trasladar</caption><thead><tr><th>Producto</th><th>Cantidad (unidades)</th><th>Acción</th></tr></thead><tbody>
          {items.map(item => { const product = byId.get(item.product_id); return <tr key={item.product_id}><td>{product?.name || 'Producto no disponible'}<small>{product?.code}</small></td><td><NumberInput type="number" min="1" max="1000000" step="1" required aria-label={`Cantidad de ${product?.name || 'producto no disponible'}`} value={item.qty || ''} onValueChange={event => setItems(previous => previous.map(row => row.product_id === item.product_id ? { ...row, qty: Number(event) } : row))} /></td><td><button type="button" className="secondary-button" aria-label={`Quitar ${product?.name || 'producto no disponible'}`} onClick={() => setItems(previous => previous.filter(row => row.product_id !== item.product_id))}><Trash2 size={15} /> Quitar</button></td></tr>; })}
        </tbody></table></div> : <p className="stock-transfer-help"><Search size={16} /> Buscá y agregá los productos que vas a trasladar.</p>}
        <label>Notas (opcional)<textarea value={notes} maxLength={2000} rows={2} placeholder="Ej. Reposición para cubrir faltantes en sucursal Centro" onChange={event => setNotes(event.target.value)} /></label>
      </fieldset>
      {formError && <p role="alert" className="stock-transfer-error">{formError}</p>}
      <div className="stock-transfer-form-actions"><span>{items.length} productos · {items.reduce((sum, item) => sum + (Number.isFinite(item.qty) ? item.qty : 0), 0).toLocaleString('es-AR')} unidades</span><button className="primary-button" disabled={disabled || !valid}>{saving === 'new' && <Loader2 size={16} className="spin" />} {saving === 'new' ? 'Registrando…' : 'Registrar transferencia pendiente'}</button></div>
    </form>

    <div className="section-heading stock-transfer-history-heading"><h3>Historial de transferencias</h3><button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void load()}><RefreshCw size={15} /> Actualizar historial</button></div>
    <label className="stock-transfer-filter">Estado<select value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setVisible(25); }}><option value="all">Todas</option><option value="pending">Pendientes</option><option value="confirmed">Confirmadas</option><option value="cancelled">Canceladas</option></select></label>
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Actualizando transferencias…</p>}
    {historyError && <p role="alert" className="stock-transfer-error">No se pudo actualizar el historial. {historyError}</p>}
    {actionError && <p role="alert" className="stock-transfer-error">{actionError}</p>}
    <div className="table-scroll"><table className="stock-transfer-history"><caption>Movimientos internos sin impacto en el stock total</caption><thead><tr><th>Fecha</th><th>Origen</th><th>Destino</th><th>Productos</th><th>Estado</th><th>Notas</th><th>Acciones</th></tr></thead><tbody>
      {history.slice(0, visible).map(transfer => <tr key={transfer.id}><td>{new Date(transfer.created_at).toLocaleString('es-AR')}</td><td>{branchName(transfer.from_branch_id)}</td><td>{branchName(transfer.to_branch_id)}</td>
        <td><details><summary>{transfer.items.length} productos · {transfer.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString('es-AR')} unidades</summary><ul>{transfer.items.map(item => <li key={item.product_id}>{item.product_name} × {item.qty.toLocaleString('es-AR')}</li>)}</ul></details></td>
        <td><span className={`stock-transfer-status ${transfer.status}`}>{statusNames[transfer.status]}</span>{transfer.reviewed_at && <small>Revisada el {new Date(transfer.reviewed_at).toLocaleString('es-AR')}</small>}</td><td className="stock-transfer-notes">{transfer.notes || '—'}</td>
        <td>{transfer.status === 'pending' ? <div className="stock-transfer-row-actions"><button type="button" className="primary-button" disabled={disabled} onClick={() => void review(transfer, true)}>{saving === transfer.id ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Confirmar</button><button type="button" className="secondary-button" disabled={disabled} onClick={() => void review(transfer, false)}><X size={14} /> Cancelar</button></div> : '—'}</td></tr>)}
      {!loading && !history.length && <tr><td colSpan={7}>No hay transferencias para este estado.</td></tr>}
    </tbody></table></div>
    {history.length > visible && <button type="button" className="secondary-button" onClick={() => setVisible(previous => previous + 25)}>Mostrar más transferencias</button>}
  </section>;
}
