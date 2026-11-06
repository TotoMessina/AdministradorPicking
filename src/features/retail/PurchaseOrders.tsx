import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCopy, Loader2, MessageCircle, RefreshCw, Save, X } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { askConfirm } from '../../components/ConfirmHost';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage, type Branch, type Product, type Store, type Supplier } from './api';
import type { Run } from './Management';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { hasComposition } from '../../services/productComposition';
import { compareReceipt, orderMessage, purchaseOrders, suggestOrders, suggestionFor, supplierGroup, whatsappLink, type PurchaseOrder, type SupplierGroup, type Velocity } from './purchaseOrderApi';
import { adContact, adLabels, trackAd, useAdViews, useAds, type SupplierOffer } from './ads';
import './purchase-orders.css';
import './ads.css';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const statuses = { draft: 'Guardado', sent: 'Enviado', received: 'Recibido', cancelled: 'Cancelado' };
const perDay = (value: number) => value ? value.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—';

/**
 * De «se está acabando» a «hacer el pedido»: sugiere qué pedir por proveedor y sucursal, guarda el pedido,
 * lo deja listo para mandar a mano y, cuando la factura se carga con el lector, compara lo pedido con lo recibido.
 */
export function PurchaseOrders({ store, branches, products, run, busy, active }: {
  store: Store; branches: Branch[]; products: Product[]; run: Run; busy: boolean; active: boolean;
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [coverDays, setCoverDays] = useState('7');
  const [salesDays, setSalesDays] = useState('28');
  const [velocity, setVelocity] = useState<Velocity[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  // Pedidos a mano: proveedores elegidos aunque no tengan sugerencias y productos agregados aunque no falten.
  const [manualSuppliers, setManualSuppliers] = useState<{ key: string; name: string }[]>([]);
  const [newSupplier, setNewSupplier] = useState('');
  const [extras, setExtras] = useState<Record<string, string[]>>({});
  const [searches, setSearches] = useState<Record<string, string>>({});
  const disabled = busy || !active;
  const days = Math.min(180, Math.max(1, Math.round(Number(salesDays) || 28)));
  const cover = Math.min(120, Math.max(1, Math.round(Number(coverDays) || 7)));
  const branchName = (id: string) => branches.find(branch => branch.id === id)?.name || 'Sucursal anterior';
  const orderable = useMemo(() => products.filter(product => product.active !== false && !hasComposition(product)), [products]);
  const supplierOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const supplier of suppliers) names.set(normalizeSupplierText(supplier.name), supplier.name);
    for (const product of orderable) if (product.supplier?.trim() && !names.has(normalizeSupplierText(product.supplier))) names.set(normalizeSupplierText(product.supplier), product.supplier.trim());
    return [...names].map(([key, name]) => ({ key, name })).filter(row => row.key).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [suppliers, orderable]);
  const groups = useMemo(() => {
    if (!branchId) return [];
    const suggested = suggestOrders(products, suppliers, velocity, branchId, days, cover);
    const merged = [...suggested];
    for (const manual of manualSuppliers) if (!merged.some(group => group.key === manual.key)) merged.push(supplierGroup(manual.key, manual.name, suppliers));
    return merged.map(group => {
      const added = (extras[group.key] || []).filter(id => !group.items.some(item => item.product.id === id))
        .map(id => orderable.find(product => product.id === id)).filter((product): product is Product => !!product)
        .map(product => suggestionFor(product, velocity, branchId, days, cover));
      return added.length ? { ...group, items: [...group.items, ...added] } : group;
    });
  }, [products, suppliers, velocity, branchId, days, cover, manualSuppliers, extras, orderable]);
  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
  // Ofertas patrocinadas para los productos que se están pidiendo (el código del producto es su código de barras).
  const offerCodes = useMemo(() => [...new Set(groups.flatMap(group => group.items.map(item => item.product.code.trim())))]
    .filter(code => /^[0-9A-Za-z-]{4,20}$/.test(code)).slice(0, 500), [groups]);
  const offers = useAds<SupplierOffer>(store.id, 'supplier_offer', active, offerCodes);
  const offersByCode = useMemo(() => {
    const map = new Map<string, SupplierOffer[]>();
    for (const offer of offers) map.set(offer.ean_code, [...(map.get(offer.ean_code) || []), offer].slice(0, 2));
    return map;
  }, [offers]);
  useAdViews(store.id, offers.filter(offer => offersByCode.get(offer.ean_code)?.includes(offer)).map(offer => `${offer.id}|${offer.ean_code}`));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sold, providers, saved] = await Promise.all([purchaseOrders.velocity(store.id, days), retail.suppliers(store.id), purchaseOrders.list(store.id)]);
      setVelocity(sold.map(row => ({ ...row, units: Number(row.units) }))); setSuppliers(providers); setOrders(saved); setError('');
    } catch (e) { setError(/retail_purchase_orders|retail_product_sales_velocity|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611020007 en Supabase.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [store.id, days]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const qtyFor = (key: string, productId: string, suggested: number, pack = 1) => quantities[`${key}|${productId}`] ?? String(suggested || (extras[key]?.includes(productId) ? pack : 0));
  const addProduct = (group: SupplierGroup, product: Product) => { setExtras(previous => ({ ...previous, [group.key]: [...(previous[group.key] || []).filter(id => id !== product.id), product.id] })); setSearches(previous => ({ ...previous, [group.key]: '' })); };
  const removeExtra = (group: SupplierGroup, productId: string) => { setExtras(previous => ({ ...previous, [group.key]: (previous[group.key] || []).filter(id => id !== productId) })); setQuantities(previous => { const next = { ...previous }; delete next[`${group.key}|${productId}`]; return next; }); };
  const startManual = () => { const option = supplierOptions.find(row => row.key === newSupplier); if (!option) return; setManualSuppliers(previous => previous.some(row => row.key === option.key) ? previous : [...previous, option]); setNewSupplier(''); };
  const openOrder = (group: SupplierGroup) => orders.find(order => ['draft', 'sent'].includes(order.status) && order.branch_id === branchId
    && (group.supplier ? order.supplier_id === group.supplier.id : order.supplier_name.toLowerCase() === group.name.toLowerCase()));

  const saveGroup = async (group: SupplierGroup) => {
    const lines = group.items.map(item => ({ product_id: item.product.id, qty: Math.max(0, Math.round(Number(qtyFor(group.key, item.product.id, item.suggested, item.pack)) || 0)), suggested: item.suggested }))
      .filter(line => line.qty > 0);
    if (!lines.length) { setError('Poné al menos una cantidad para guardar el pedido.'); return; }
    if (!group.key) { setError('Estos productos no tienen proveedor cargado. Asignalo en la ficha del producto para poder pedirlos.'); return; }
    const existing = openOrder(group);
    if (existing && !await askConfirm(`Ya hay un pedido abierto a ${group.name}. ¿Reemplazar sus cantidades con estas?`)) return;
    const id = existing?.id || randomUUID();
    if (await run(() => purchaseOrders.save(store.id, id, { supplier_id: group.supplier?.id || null, supplier_name: group.name, branch_id: branchId, notes: existing?.notes || '', lines }), 'Pedido guardado')) {
      setQuantities(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith(`${group.key}|`))));
      setExtras(previous => { const next = { ...previous }; delete next[group.key]; return next; });
      setManualSuppliers(previous => previous.filter(row => row.key !== group.key));
      await load();
    }
  };
  const send = async (order: PurchaseOrder, how: 'copy' | 'whatsapp') => {
    const text = orderMessage(order, store.name, branchName(order.branch_id), products);
    if (how === 'whatsapp') {
      const phone = suppliers.find(supplier => supplier.id === order.supplier_id)?.profile?.phone || '';
      window.open(whatsappLink(phone, text), '_blank', 'noopener');
    } else {
      try { await navigator.clipboard.writeText(text); setCopied(order.id); }
      catch { setError('No se pudo copiar. Seleccioná el texto del pedido y copialo a mano.'); setCopied(`manual:${order.id}`); }
    }
    if (order.status === 'draft') await run(() => purchaseOrders.setStatus(store.id, order.id, 'sent'), 'Pedido marcado como enviado').then(ok => { if (ok) void load(); });
  };
  const saveEdit = async (order: PurchaseOrder) => {
    const draft = editing[order.id] || {};
    const lines = order.lines.map(line => ({ product_id: line.product_id, qty: Math.max(0, Math.round(Number(draft[line.product_id] ?? line.qty) || 0)), suggested: line.suggested ?? undefined })).filter(line => line.qty > 0);
    if (!lines.length) { setError('Un pedido necesita al menos un producto. Si no lo vas a hacer, cancelalo.'); return; }
    if (await run(() => purchaseOrders.save(store.id, order.id, { supplier_id: order.supplier_id, supplier_name: order.supplier_name, branch_id: order.branch_id, notes: order.notes || '', lines }), 'Pedido actualizado')) {
      setEditing(previous => { const next = { ...previous }; delete next[order.id]; return next; }); await load();
    }
  };
  const cancel = async (order: PurchaseOrder) => {
    if (!await askConfirm(`¿Cancelar el pedido a ${order.supplier_name}? Queda en el historial.`)) return;
    if (await run(() => purchaseOrders.setStatus(store.id, order.id, 'cancelled'), 'Pedido cancelado')) await load();
  };

  return <section className="retail-panel purchase-orders" aria-labelledby="purchase-orders-title">
    <div className="section-heading"><div><h2 id="purchase-orders-title">Pedidos</h2>
      <p>Lo que conviene pedir según el stock, el aviso de cada producto y lo que se vendió. Revisá, ajustá y guardá.</p></div>
      <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="purchase-orders-filters">
      {branches.length > 1 && <label>Sucursal<select value={branchId} onChange={event => setBranchId(event.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
      <label>Cubrir (días)<NumberInput min={1} max={120} step={1} value={coverDays} onValueChange={setCoverDays} /></label>
      <label>Según ventas de los últimos (días)<NumberInput min={1} max={180} step={1} value={salesDays} onValueChange={setSalesDays} /></label>
    </div>
    <div className="purchase-orders-manual">
      <label>Armar un pedido para<select value={newSupplier} onChange={event => setNewSupplier(event.target.value)} disabled={disabled}>
        <option value="">Elegí un proveedor</option>{supplierOptions.map(row => <option key={row.key} value={row.key}>{row.name}</option>)}
      </select></label>
      <button type="button" className="secondary-button" disabled={disabled || !newSupplier} onClick={startManual}>Agregar al armado</button>
    </div>
    <small className="purchase-orders-help">Sugerido = aviso de stock + lo que se vende en {cover} {cover === 1 ? 'día' : 'días'} − lo que hay, redondeado a bultos.</small>
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Calculando…</p>}

    {!loading && !groups.length && <p className="purchase-orders-empty">No falta nada en {branchName(branchId)} con estos criterios. Igual podés armar un pedido eligiendo un proveedor arriba.</p>}
    {groups.map(group => {
      const existing = openOrder(group);
      const total = group.items.reduce((sum, item) => sum + (Number(qtyFor(group.key, item.product.id, item.suggested, item.pack)) || 0) * (item.product.cost || 0), 0);
      const search = normalizeSupplierText(searches[group.key] || '');
      // Primero los productos de este proveedor; también se puede agregar cualquier otro.
      const found = search ? orderable.filter(product => !group.items.some(item => item.product.id === product.id) && normalizeSupplierText(`${product.name} ${product.code}`).includes(search))
        .sort((a, b) => Number(normalizeSupplierText(b.supplier || '') === group.key) - Number(normalizeSupplierText(a.supplier || '') === group.key) || a.name.localeCompare(b.name, 'es')).slice(0, 8) : [];
      return <article key={group.key || 'none'} className="purchase-orders-group">
        <div className="purchase-orders-group-head">
          <div><h3>{group.name}</h3><small>{group.items.length} {group.items.length === 1 ? 'producto' : 'productos'}{group.phone ? ` · ${group.phone}` : ''}{existing ? ` · Pedido ${statuses[existing.status].toLowerCase()} el ${new Date(existing.created_at).toLocaleDateString('es-AR')}` : ''}</small></div>
          {total > 0 && <strong>{money(total)}</strong>}
        </div>
        <div className="location-transfer-sheet" role="region" aria-label={`Sugerencias de ${group.name}`} tabIndex={0}>
          <table><thead><tr><th scope="col"><span className="purchase-orders-head">Producto</span></th><th scope="col" className="is-number"><span className="purchase-orders-head">Hay</span></th>
            <th scope="col" className="is-number"><span className="purchase-orders-head">Aviso</span></th><th scope="col" className="is-number"><span className="purchase-orders-head">Vende/día</span></th>
            <th scope="col" className="is-number"><span className="purchase-orders-head">Sugerido</span></th><th scope="col" className="is-number"><span className="purchase-orders-head">Pedir</span></th></tr></thead>
            <tbody>{group.items.map(item => <tr key={item.product.id} className={item.stock <= item.min ? 'is-over' : undefined}>
              <th scope="row">{item.product.name}{item.pack > 1 && <small className="purchase-orders-meta">Bulto x {item.pack}</small>}
                {(offersByCode.get(item.product.code.trim()) || []).map(offer => {
                  const href = adContact(offer, `Hola, vi en la app del kiosco que tienen ${item.product.name} (${offer.ean_code})${offer.price ? ` a ${money(offer.price)}` : ''}. ¿Me pasan disponibilidad?`);
                  return <span key={offer.id} className="supplier-offer"><span className="ad-tag">Publicidad</span>
                    <span>{offer.label ? `${adLabels[offer.label] || offer.label}: ` : ''}{offer.advertiser} lo tiene{offer.price ? ` a ${money(offer.price)}` : ''}{offer.note ? ` (${offer.note})` : ''}</span>
                    {href && <a href={href} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackAd(store.id, offer.id, 'click', offer.ean_code)}
                      aria-label={`Contactar a ${offer.advertiser} por ${item.product.name}`}>{offer.cta_label || 'Contactar'}</a>}</span>;
                })}{extras[group.key]?.includes(item.product.id) && !item.suggested && <button type="button" className="text-button purchase-orders-remove" onClick={() => removeExtra(group, item.product.id)}>Quitar</button>}</th>
              <td className="is-number">{item.stock.toLocaleString('es-AR')}</td>
              <td className="is-number">{item.min.toLocaleString('es-AR')}</td>
              <td className="is-number">{perDay(item.dailySales)}</td>
              <td className="is-number">{item.suggested ? item.suggested.toLocaleString('es-AR') : '—'}</td>
              <td className="location-transfer-qty"><NumberInput min={0} step={1} value={qtyFor(group.key, item.product.id, item.suggested, item.pack)} disabled={disabled}
                aria-label={`Unidades a pedir de ${item.product.name}`} onFocus={event => event.currentTarget.select()}
                onValueChange={value => setQuantities(previous => ({ ...previous, [`${group.key}|${item.product.id}`]: value }))} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        {group.key && <div className="purchase-orders-add">
          <label>Agregar producto aunque no falte<input value={searches[group.key] || ''} disabled={disabled} placeholder="Nombre o código"
            onChange={event => setSearches(previous => ({ ...previous, [group.key]: event.target.value }))}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); const exact = orderable.find(product => product.code.trim() === (searches[group.key] || '').trim()) || (found.length === 1 ? found[0] : undefined); if (exact) addProduct(group, exact); } }} /></label>
          {found.length > 0 && <ul className="purchase-orders-found">{found.map(product => <li key={product.id}><button type="button" onClick={() => addProduct(group, product)}>
            <strong>{product.name}</strong><small>{product.code}{product.supplier && normalizeSupplierText(product.supplier) !== group.key ? ` · proveedor: ${product.supplier}` : ''}</small>
          </button></li>)}</ul>}
          {search && !found.length && <small>Sin coincidencias.</small>}
        </div>}
        {!group.items.length && <small>Buscá arriba los productos que querés pedirle.</small>}
        {group.key ? <div className="location-transfer-actions"><button type="button" className="primary-button" disabled={disabled} onClick={() => void saveGroup(group)}><Save size={15} /> {existing ? 'Actualizar pedido' : 'Guardar pedido'}</button></div>
          : <small>Estos productos no tienen proveedor. Asignalo en la ficha del producto para pedirlos.</small>}
      </article>;
    })}

    <h3>Pedidos guardados</h3>
    {!orders.length && !loading && <p className="purchase-orders-empty">Todavía no guardaste pedidos.</p>}
    <ol className="location-transfer-history">{orders.map(order => {
      const draft = editing[order.id];
      const comparison = order.status === 'received' ? compareReceipt(order) : [];
      const missing = comparison.filter(row => row.difference < 0), extra = comparison.filter(row => row.difference > 0), increases = comparison.filter(row => row.costIncrease);
      return <li key={order.id}><article>
        <div className="location-transfer-record-heading"><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString('es-AR')}</time>
          <span className={`stock-transfer-status ${order.status === 'received' ? 'confirmed' : order.status === 'cancelled' ? 'cancelled' : 'pending'}`}>{statuses[order.status]}</span></div>
        <strong className="location-transfer-record-route">{order.supplier_name} · {branchName(order.branch_id)}</strong>
        <small>{order.lines.length} {order.lines.length === 1 ? 'producto' : 'productos'}{order.actor_email ? ` · ${order.actor_email}` : ''}{order.received_email ? ` · Recibió ${order.received_email}` : ''}</small>
        {['draft', 'sent'].includes(order.status) && <>
          {draft ? <ul className="purchase-orders-edit">{order.lines.map(line => <li key={line.product_id}>
            <span>{line.product_name}</span>
            <NumberInput min={0} step={1} value={draft[line.product_id] ?? String(line.qty)} aria-label={`Unidades de ${line.product_name}`} disabled={disabled}
              onValueChange={value => setEditing(previous => ({ ...previous, [order.id]: { ...previous[order.id], [line.product_id]: value } }))} />
          </li>)}</ul>
            : <details><summary>Ver productos</summary><ul>{order.lines.map(line => <li key={line.product_id}>{line.product_name}: {line.qty.toLocaleString('es-AR')} u.</li>)}</ul></details>}
          {copied === `manual:${order.id}` && <textarea readOnly rows={6} className="purchase-orders-text" value={orderMessage(order, store.name, branchName(order.branch_id), products)} onFocus={event => event.currentTarget.select()} />}
          <div className="location-transfer-record-actions">
            {draft ? <>
              <button type="button" className="primary-button" disabled={disabled} onClick={() => void saveEdit(order)}>Guardar cambios</button>
              <button type="button" className="secondary-button" disabled={disabled} onClick={() => setEditing(previous => { const next = { ...previous }; delete next[order.id]; return next; })}>Descartar</button>
            </> : <>
              <button type="button" className="primary-button" disabled={disabled} onClick={() => void send(order, 'whatsapp')}><MessageCircle size={15} /> WhatsApp</button>
              <button type="button" className="secondary-button" disabled={disabled} onClick={() => void send(order, 'copy')}><ClipboardCopy size={15} /> {copied === order.id ? 'Copiado' : 'Copiar'}</button>
              <button type="button" className="secondary-button" disabled={disabled} onClick={() => setEditing(previous => ({ ...previous, [order.id]: {} }))}>Editar cantidades</button>
              <button type="button" className="text-button" disabled={disabled} onClick={() => void cancel(order)}><X size={14} /> Cancelar pedido</button>
            </>}
          </div>
          <small>WhatsApp abre el chat con el texto listo; vos lo enviás. Cuando llegue la mercadería, cargá la factura con el lector y se compara sola con este pedido.</small>
        </>}
        {order.status === 'received' && <>
          <p className="purchase-orders-summary">{missing.length ? `${missing.length} con faltantes` : 'Sin faltantes'} · {extra.length ? `${extra.length} con sobrantes o no pedidos` : 'sin sobrantes'} · {increases.length ? `${increases.length} con aumento de costo` : 'sin aumentos de costo'}</p>
          <div className="table-scroll"><table className="purchase-orders-compare"><thead><tr><th scope="col">Producto</th><th scope="col" className="is-number">Pedido</th><th scope="col" className="is-number">Llegó</th><th scope="col" className="is-number">Diferencia</th><th scope="col" className="is-number">Costo</th></tr></thead>
            <tbody>{comparison.map(row => <tr key={row.product_id}>
              <td>{row.name}{!row.ordered && <small>No estaba en el pedido</small>}</td>
              <td className="is-number">{row.ordered.toLocaleString('es-AR')}</td>
              <td className="is-number">{row.received.toLocaleString('es-AR')}</td>
              <td className={`is-number ${row.difference < 0 ? 'is-missing' : row.difference > 0 ? 'is-extra' : ''}`}>{row.difference === 0 ? 'OK' : row.difference < 0 ? `Faltan ${-row.difference}` : `Sobran ${row.difference}`}</td>
              <td className={`is-number ${row.costIncrease ? 'is-missing' : ''}`}>{row.receivedCost !== null ? money(row.receivedCost) : '—'}{row.costIncrease ? <small>+{Math.round(row.costIncrease * 1000) / 10}% (antes {money(row.orderedCost || 0)})</small> : null}</td>
            </tr>)}</tbody></table></div>
        </>}
      </article></li>;
    })}</ol>
    {productById.size === 0 && <p className="purchase-orders-empty">Cargá productos para recibir sugerencias.</p>}
  </section>;
}
