import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Banknote, Check, Loader2, Package, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { randomUUID } from '../../utils/uuid';
import { hasComposition } from '../../services/productComposition';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { errorMessage, retail, type Store, type Branch, type Product } from './api';
import type { Run } from './Management';
import { locationTransfers, type LocationTransfer, type FundTransfer, type LocationFund } from './locationTransferApi';
import { TransferFlowMap, type TransferMapRoute } from './TransferFlowMap';

type HistoryStock = LocationTransfer & { legacy?: boolean };
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const statuses = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
const transferKey = (from: string, to: string) => `${from}>${to}`;

export function LocationTransfers({ store, branches, products, run, busy, active, canStock, canFunds, isAdmin }: {
  store: Store; branches: Branch[]; products: Product[]; run: Run; busy: boolean; active: boolean;
  canStock: boolean; canFunds: boolean; isAdmin: boolean;
}) {
  const [mode, setMode] = useState<'stock' | 'money'>(canStock ? 'stock' : 'money');
  const [composing, setComposing] = useState(false);
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [stockFrom, setStockFrom] = useState('depot');
  const [stockTo, setStockTo] = useState('');
  const [items, setItems] = useState<{ product_id: string; qty: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [fundFrom, setFundFrom] = useState('depot');
  const [fundTo, setFundTo] = useState('');
  const [fundKind, setFundKind] = useState<'transfer' | 'income' | 'withdrawal'>('transfer');
  const [amount, setAmount] = useState('');
  const [fundNote, setFundNote] = useState('');
  const [initialBranch, setInitialBranch] = useState(branches.length === 1 ? branches[0].id : '');
  const [stockHistory, setStockHistory] = useState<HistoryStock[]>([]);
  const [stockSummary, setStockSummary] = useState<{ location: string; quantity: number }[] | null>(null);
  const [fundHistory, setFundHistory] = useState<FundTransfer[]>([]);
  const [funds, setFunds] = useState<LocationFund[]>([]);
  const [fundsLoaded, setFundsLoaded] = useState(false);
  const [stockError, setStockError] = useState('');
  const [fundError, setFundError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [filter, setFilter] = useState<'all' | LocationTransfer['status']>('all');
  const [stockMore, setStockMore] = useState(false);
  const [fundMore, setFundMore] = useState(false);
  const [stockCursor, setStockCursor] = useState<LocationTransfer | undefined>();
  const [fundCursor, setFundCursor] = useState<FundTransfer | undefined>();
  const [visible, setVisible] = useState(25);
  const generation = useRef(0);
  const working = useRef(false);
  const stockRequest = useRef({ signature: '', id: '' });
  const fundRequest = useRef({ signature: '', id: '' });
  const search = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const disabled = busy || !!saving || !active;
  const places = useMemo(() => [{ id: 'depot', name: 'Depósito' }, ...branches], [branches]);
  const placeName = (id: string | null) => id === null ? 'Exterior' : places.find(place => place.id === id)?.name || 'Sucursal anterior';
  const catalog = useMemo(() => products.filter(product => product.active !== false && !hasComposition(product)), [products]);
  const byId = useMemo(() => new Map(catalog.map(product => [product.id, product])), [catalog]);
  const searchText = normalizeSupplierText(query);
  const matches = searchText ? catalog.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(searchText)).slice(0, 15) : [];
  const atLocation = (product: Product, id: string) => id === 'depot' ? product.depotStock || 0 : product.branchStocks?.[id] || 0;

  const load = useCallback(async () => {
    const turn = ++generation.current;
    setLoading(true);
    const results = await Promise.allSettled([
      canStock ? locationTransfers.stockHistory(store.id) : Promise.resolve([] as LocationTransfer[]),
      canStock ? retail.stockTransfers(store.id) : Promise.resolve([]),
      canFunds ? locationTransfers.funds(store.id) : Promise.resolve([] as LocationFund[]),
      canFunds ? locationTransfers.fundHistory(store.id) : Promise.resolve([] as FundTransfer[]),
      canStock ? locationTransfers.stockSummary(store.id) : Promise.resolve([] as { location: string; quantity: number }[]),
    ]);
    if (turn !== generation.current) return;
    const [stock, legacy, balances, cash, inventory] = results;
    if (stock.status === 'fulfilled') {
      const older: HistoryStock[] = legacy.status === 'fulfilled' ? legacy.value.map(row => ({ ...row, from_location: row.from_branch_id, to_location: row.to_branch_id, legacy: true })) : [];
      setStockHistory([...stock.value, ...older].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setStockCursor(stock.value.at(-1)); setStockMore(stock.value.length === 100);
      setStockError(legacy.status === 'rejected' ? errorMessage(legacy.reason) : '');
    } else {
      if (legacy.status === 'fulfilled') setStockHistory(previous => [...previous.filter(row => !row.legacy), ...legacy.value.map(row => ({ ...row, from_location: row.from_branch_id, to_location: row.to_branch_id, legacy: true }))].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setStockError(`No se pudo cargar el inventario por ubicación. ${errorMessage(stock.reason)}. Revisá la actualización de Supabase.`);
    }
    if (canFunds && balances.status === 'fulfilled') { setFunds(balances.value); setFundsLoaded(true); }
    if (cash.status === 'fulfilled') { setFundHistory(cash.value); setFundCursor(cash.value.at(-1)); setFundMore(cash.value.length === 100); }
    setFundError(balances.status === 'rejected' ? errorMessage(balances.reason) : cash.status === 'rejected' ? errorMessage(cash.reason) : '');
    if (canStock && inventory.status === 'fulfilled') setStockSummary(inventory.value);
    else if (canStock && inventory.status === 'rejected') setStockError(previous => `${previous ? `${previous} ` : ''}No se pudieron actualizar las existencias del mapa. ${errorMessage(inventory.reason)}`);
    setLoading(false);
  }, [store.id, canStock, canFunds]);
  useEffect(() => {
    if (!active) return;
    void load();
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(); };
    window.addEventListener('online', refresh);
    return () => { generation.current++; window.removeEventListener('online', refresh); };
  }, [active, load]);
  useEffect(() => { if (mode === 'stock' && !canStock && canFunds) setMode('money'); if (mode === 'money' && !canFunds && canStock) setMode('stock'); }, [mode, canStock, canFunds]);

  const execute = async (key: string, action: () => Promise<unknown>, message: string) => {
    if (working.current || disabled) return false;
    working.current = true; setSaving(key); setActionError(''); setFormError('');
    let failure: unknown;
    try {
      const saved = await run(async () => { try { await action(); } catch (error) { failure = error; throw error; } }, message);
      if (!saved) { setActionError(failure ? errorMessage(failure) : 'No se pudo guardar. El borrador se conserva; actualizá y reintentá.'); return false; }
      await load(); return true;
    } catch (error) { setActionError(errorMessage(error)); return false; }
    finally { working.current = false; setSaving(''); }
  };
  const add = (product: Product) => {
    if (disabled) return;
    if (!items.some(item => item.product_id === product.id) && items.length >= 200) { setFormError('Podés incluir hasta 200 productos.'); return; }
    setItems(previous => previous.some(item => item.product_id === product.id) ? previous.map(item => item.product_id === product.id ? { ...item, qty: Math.min(1000000, item.qty + 1) } : item) : [...previous, { product_id: product.id, qty: 1 }]);
    setQuery(''); search.current?.focus();
  };
  const submit = async () => {
    if (disabled || working.current) return;
    if (mode === 'stock') {
      if (!canStock || !store.branch_inventory_enabled || !places.some(place => place.id === stockFrom) || !places.some(place => place.id === stockTo) || stockFrom === stockTo || !items.length
        || items.some(item => !byId.has(item.product_id) || !Number.isSafeInteger(item.qty) || item.qty <= 0 || item.qty > 1000000)) { setFormError('Elegí dos ubicaciones diferentes y productos con cantidades enteras positivas.'); return; }
      const signature = JSON.stringify([store.id, stockFrom, stockTo, [...items].sort((a, b) => a.product_id.localeCompare(b.product_id)), notes.trim()]);
      if (stockRequest.current.signature !== signature) stockRequest.current = { signature, id: randomUUID() };
      if (await execute('stock', () => locationTransfers.create(store.id, stockFrom, stockTo, items, notes, stockRequest.current.id), 'Transferencia pendiente registrada')) {
        setItems([]); setNotes(''); setQuery(''); stockRequest.current = { signature: '', id: '' }; setComposing(false); setFilter('all');
      }
    } else {
      const from = fundKind === 'income' ? null : fundFrom, to = fundKind === 'withdrawal' ? null : fundTo;
      const numeric = Number(amount);
      if (!canFunds || (from !== null && !places.some(place => place.id === from)) || (to !== null && !places.some(place => place.id === to)) || from === to || !Number.isFinite(numeric) || numeric <= 0 || numeric > 999999999999.99 || !fundNote.trim()) { setFormError('Elegí ubicaciones diferentes, un importe positivo y el motivo.'); return; }
      const signature = JSON.stringify([store.id, from, to, amount, fundNote.trim()]);
      if (fundRequest.current.signature !== signature) fundRequest.current = { signature, id: randomUUID() };
      if (await execute('money', () => locationTransfers.moveFunds(store.id, from, to, numeric, fundNote, fundRequest.current.id), 'Movimiento de fondos guardado')) {
        setAmount(''); setFundNote(''); fundRequest.current = { signature: '', id: '' }; setComposing(false);
      }
    }
  };
  const review = (row: HistoryStock, confirm: boolean) => void execute(row.id,
    () => row.legacy ? confirm ? retail.confirmTransfer(store.id, row.id) : retail.cancelTransfer(store.id, row.id) : retail.reviewLocationTransfer(store.id, row.id, confirm),
    confirm ? row.legacy ? 'Registro anterior confirmado' : 'Stock trasladado entre ubicaciones' : 'Transferencia cancelada');
  const clearSelection = () => { setSelectedNode(''); setSelectedRoute(''); setVisible(25); };
  const routes = useMemo(() => {
    const grouped = new Map<string, TransferMapRoute>();
    if (mode === 'stock') for (const row of stockHistory) {
      const key = transferKey(row.from_location, row.to_location);
      const route = grouped.get(key) || { id: key, from: row.from_location, to: row.to_location, count: 0, summary: '' };
      route.count++; grouped.set(key, route);
    }
    else for (const row of fundHistory) if (row.from_location && row.to_location) {
      const key = transferKey(row.from_location, row.to_location);
      const route = grouped.get(key) || { id: key, from: row.from_location, to: row.to_location, count: 0, summary: '' };
      route.count++; grouped.set(key, route);
    }
    for (const route of grouped.values()) {
      if (mode === 'stock') {
        const entries = stockHistory.filter(row => transferKey(row.from_location, row.to_location) === route.id);
        const applied = entries.filter(row => row.status === 'confirmed' && !row.legacy).reduce((sum, row) => sum + row.items.reduce((total, item) => total + item.qty, 0), 0);
        route.summary = `${applied.toLocaleString('es-AR')} u. aplicadas · ${entries.filter(row => row.status === 'pending').length} pendientes`;
      } else route.summary = money(fundHistory.filter(row => row.from_location && row.to_location && transferKey(row.from_location, row.to_location) === route.id).reduce((sum, row) => sum + row.amount, 0));
    }
    return [...grouped.values()];
  }, [mode, stockHistory, fundHistory]);
  const nodes = places.map(place => ({ ...place, summary: mode === 'money'
    ? fundsLoaded ? `${fundError ? 'Último saldo: ' : ''}${money(funds.find(fund => fund.location === place.id)?.balance || 0)}` : 'Saldo no disponible'
    : store.branch_inventory_enabled || place.id === 'depot' ? stockSummary ? `${stockError ? 'Último dato: ' : ''}${Number(stockSummary.find(row => row.location === place.id)?.quantity || 0).toLocaleString('es-AR')} u. sincronizadas` : 'Stock no disponible' : 'Stock sin distribuir' }));
  const matchesLocation = (from: string | null, to: string | null) => (!selectedNode || from === selectedNode || to === selectedNode) && (!selectedRoute || (from && to && transferKey(from, to) === selectedRoute));
  const shownStock = stockHistory.filter(row => (filter === 'all' || row.status === filter) && matchesLocation(row.from_location, row.to_location));
  const shownFunds = fundHistory.filter(row => matchesLocation(row.from_location, row.to_location));
  const more = async () => {
    if (disabled || loading) return;
    const turn = ++generation.current; setLoading(true);
    try {
      if (mode === 'stock') { const rows = await locationTransfers.stockHistory(store.id, stockCursor); if (turn === generation.current) { setStockHistory(previous => [...new Map([...previous, ...rows].map(row => [row.id, row])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at))); setStockCursor(rows.at(-1)); setStockMore(rows.length === 100); } }
      else { const rows = await locationTransfers.fundHistory(store.id, fundCursor); if (turn === generation.current) { setFundHistory(previous => [...new Map([...previous, ...rows].map(row => [row.id, row])).values()]); setFundCursor(rows.at(-1)); setFundMore(rows.length === 100); } }
      if (turn === generation.current) setVisible(previous => previous + 100);
    } catch (error) { if (turn === generation.current) setActionError(errorMessage(error)); }
    finally { if (turn === generation.current) setLoading(false); }
  };
  const newTransfer = () => {
    if (selectedNode && (mode === 'stock' ? !items.length && !notes : !amount && !fundNote)) {
      if (mode === 'stock') { setStockFrom(selectedNode); if (stockTo === selectedNode) setStockTo(''); }
      else { setFundFrom(selectedNode); if (fundTo === selectedNode) setFundTo(''); }
    }
    setComposing(true); setFormError('');
    requestAnimationFrame(() => { const field = form.current?.querySelector<HTMLElement>('select, input'); if (field?.getClientRects().length) field.focus(); });
  };
  const locationSelect = (label: string, value: string, setValue: (value: string) => void, exclude?: string) => <label>{label}<select required value={value} onChange={event => setValue(event.target.value)}>
    <option value="">Elegir ubicación</option>{places.filter(place => place.id !== exclude).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}
  </select></label>;

  return <section className="retail-panel location-transfers" aria-labelledby="location-transfers-title">
    <div className="section-heading"><div><h2 id="location-transfers-title">Transferencias</h2><p>Sucursales y depósito · Productos y fondos</p></div>
      <button type="button" className="primary-button" disabled={disabled || (mode === 'stock' && !store.branch_inventory_enabled)} onClick={newTransfer}><Plus size={16} />{composing ? 'Retomar borrador' : 'Nueva transferencia'}</button>
    </div>
    <div className="location-transfer-tabs" role="group" aria-label="Tipo de transferencia">
      {canStock && <button type="button" aria-pressed={mode === 'stock'} disabled={!!saving} onClick={() => { setMode('stock'); clearSelection(); setFormError(''); }}><Package size={16} /> Productos</button>}
      {canFunds && <button type="button" aria-pressed={mode === 'money'} disabled={!!saving} onClick={() => { setMode('money'); clearSelection(); setFormError(''); }}><Banknote size={16} /> Dinero</button>}
    </div>
    {mode === 'stock' && !store.branch_inventory_enabled && <div className="location-transfer-setup">
      <h3>Distribuir el stock actual</h3><p>Lo guardado en depósito se conserva. Elegí dónde está hoy el stock del salón. Después podrás repartirlo con transferencias.</p>
      {isAdmin ? <><label>Sucursal inicial<select value={initialBranch} disabled={disabled} onChange={event => setInitialBranch(event.target.value)}><option value="">Elegir sucursal</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <p>Cerrá los turnos y sincronizá todos los dispositivos antes de activar.</p><button type="button" className="primary-button" disabled={disabled || !initialBranch} onClick={() => void execute('enable', () => retail.enableBranchInventory(store.id, initialBranch), 'Inventario distribuido sin duplicar existencias')}>Activar stock por sucursal y depósito</button></>
        : <p>Un administrador debe hacer la distribución inicial.</p>}
    </div>}
    <TransferFlowMap nodes={nodes} routes={routes} selectedNode={selectedNode} selectedRoute={selectedRoute}
      onNode={id => { setSelectedNode(previous => previous === id ? '' : id); setSelectedRoute(''); setVisible(25); }}
      onRoute={id => { setSelectedRoute(previous => previous === id ? '' : id); setSelectedNode(''); setVisible(25); }} onClear={clearSelection} />
    {composing && <form ref={form} className="location-transfer-composer retail-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="location-transfer-composer-heading"><h3>{mode === 'stock' ? 'Transferir productos' : 'Mover dinero'}</h3><button type="button" className="text-button" disabled={!!saving} onClick={() => setComposing(false)}><X size={15} /> Cerrar y conservar</button></div>
      <fieldset disabled={disabled || (mode === 'stock' && !store.branch_inventory_enabled)}>
        {mode === 'stock' ? <>
          <div className="location-transfer-route">{locationSelect('Origen', stockFrom, setStockFrom)}<ArrowRight size={18} aria-hidden="true" />{locationSelect('Destino', stockTo, setStockTo, stockFrom)}</div>
          <label>Agregar producto<input ref={search} value={query} placeholder="Nombre o código" onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key !== 'Enter') return; event.preventDefault();
            const product = catalog.find(row => row.code.trim() === query.trim()) || (matches.length === 1 ? matches[0] : undefined); if (product) add(product);
          }} /></label>
          {!!searchText && <div className="location-transfer-product-results">{matches.length ? matches.map(product => <button type="button" key={product.id} onClick={() => add(product)}><span>{product.name}<small>{atLocation(product, stockFrom).toLocaleString('es-AR')} disponibles en origen</small></span><Plus size={15} /></button>) : <p>Sin coincidencias. Los combos se trasladan por sus componentes.</p>}</div>}
          {items.length > 0 && <ul className="location-transfer-items">{items.map(item => <li key={item.product_id}><span><strong>{byId.get(item.product_id)?.name || 'Producto no disponible'}</strong><small>{byId.get(item.product_id) ? atLocation(byId.get(item.product_id)!, stockFrom).toLocaleString('es-AR') : '—'} disponibles en origen</small></span>
            <label>Unidades<NumberInput min={1} max={1000000} required value={item.qty} onValueChange={value => setItems(previous => previous.map(row => row.product_id === item.product_id ? { ...row, qty: Number(value) } : row))} /></label>
            <button type="button" className="icon-button" aria-label={`Quitar ${byId.get(item.product_id)?.name || 'producto'}`} onClick={() => setItems(previous => previous.filter(row => row.product_id !== item.product_id))}><Trash2 size={16} /></button></li>)}</ul>}
          <label>Nota (opcional)<textarea value={notes} maxLength={2000} rows={2} onChange={event => setNotes(event.target.value)} /></label>
          <p>El stock cambia al confirmar. Un pendiente no reserva unidades.</p>
        </> : <>
          <label>Movimiento<select value={fundKind} onChange={event => setFundKind(event.target.value as typeof fundKind)}><option value="transfer">Entre ubicaciones</option><option value="income">Aporte / saldo inicial</option><option value="withdrawal">Retiro del fondo</option></select></label>
          <div className="location-transfer-route">
            {fundKind !== 'income' && locationSelect('Desde', fundFrom, setFundFrom)}
            {fundKind === 'transfer' && <ArrowRight size={18} aria-hidden="true" />}
            {fundKind !== 'withdrawal' && locationSelect('Hacia', fundTo, setFundTo, fundKind === 'transfer' ? fundFrom : undefined)}
          </div>
          <label>Importe ($)<NumberInput min={0.01} max={999999999999.99} step={0.01} required value={amount} onValueChange={setAmount} /></label>
          {fundKind !== 'income' && <p>Saldo del fondo de origen: <strong>{fundsLoaded ? money(funds.find(row => row.location === fundFrom)?.balance || 0) : 'No disponible'}</strong></p>}
          <label>Motivo<textarea required value={fundNote} maxLength={1000} rows={2} onChange={event => setFundNote(event.target.value)} /></label>
          <p>Estos fondos están separados del efectivo de los turnos.</p>
        </>}
      </fieldset>
      {formError && <p role="alert" className="error-banner">{formError}</p>}
      <button className="primary-button" disabled={disabled || (mode === 'stock' && !store.branch_inventory_enabled)}>{saving && <Loader2 size={15} className="spin" />}{mode === 'stock' ? 'Registrar pendiente' : 'Guardar movimiento de dinero'}</button>
    </form>}
    <div className="section-heading location-transfer-history-heading"><div><h3>Historial {selectedNode ? `· ${placeName(selectedNode)}` : ''}</h3><small>Recorridos del historial cargado. Los registros anteriores no modificaron inventario.</small></div>
      <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button></div>
    {mode === 'stock' && <label className="stock-transfer-filter">Estado<select value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setVisible(25); }}><option value="all">Todos</option><option value="pending">Pendientes</option><option value="confirmed">Confirmadas</option><option value="cancelled">Canceladas</option></select></label>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Actualizando historial…</p>}
    {(mode === 'stock' ? stockError : fundError) && <p role="alert" className="error-banner">{mode === 'stock' ? stockError : fundError}</p>}
    {actionError && <p role="alert" className="error-banner">{actionError}</p>}
    <ol className="location-transfer-history">
      {mode === 'stock' ? shownStock.slice(0, visible).map(row => <li key={row.id}>
        <article><div className="location-transfer-record-heading"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR')}</time><span className={`stock-transfer-status ${row.status}`}>{statuses[row.status]}</span>{row.legacy && <small>Registro anterior · sin movimiento de stock</small>}</div>
          <strong className="location-transfer-record-route">{placeName(row.from_location)} <ArrowRight size={15} aria-hidden="true" /> {placeName(row.to_location)}</strong>
          <details><summary>{row.items.length} productos · {row.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString('es-AR')} unidades</summary><ul>{row.items.map(item => <li key={item.product_id}>{item.product_name} × {item.qty.toLocaleString('es-AR')}</li>)}</ul></details>
          {row.notes && <p>{row.notes}</p>}{row.actor_email && <small>{row.actor_email}</small>}{row.reviewed_at && <small>Revisada: {new Date(row.reviewed_at).toLocaleString('es-AR')}</small>}
          {row.status === 'pending' && <div className="location-transfer-record-actions"><button type="button" className="primary-button" disabled={disabled} onClick={() => review(row, true)}><Check size={14} />{row.legacy ? 'Confirmar registro' : 'Confirmar traslado'}</button><button type="button" className="secondary-button" disabled={disabled} onClick={() => review(row, false)}><X size={14} /> Cancelar</button></div>}
        </article>
      </li>) : shownFunds.slice(0, visible).map(row => <li key={row.id}><article>
        <div className="location-transfer-record-heading"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR')}</time><span className="stock-transfer-status confirmed">Guardado</span><strong>{money(row.amount)}</strong></div>
        <strong className="location-transfer-record-route">{row.from_location === null ? 'Aporte externo' : placeName(row.from_location)} <ArrowRight size={15} aria-hidden="true" /> {row.to_location === null ? 'Retiro externo' : placeName(row.to_location)}</strong>
        <p>{row.note}</p>{row.actor_email && <small>{row.actor_email}</small>}
      </article></li>)}
    </ol>
    {!(mode === 'stock' ? shownStock.length : shownFunds.length) && !loading && <p className="transfer-flow-empty">Sin movimientos para esta selección.</p>}
    {(mode === 'stock' ? shownStock.length : shownFunds.length) > visible && <button type="button" className="secondary-button" onClick={() => setVisible(previous => previous + 25)}>Mostrar más movimientos</button>}
    {(mode === 'stock' ? stockMore : fundMore) && <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void more()}>Cargar historial anterior</button>}
  </section>;
}
