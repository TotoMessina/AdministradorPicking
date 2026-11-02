import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ClipboardList, Loader2, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { askConfirm } from '../../components/ConfirmHost';
import { randomUUID } from '../../utils/uuid';
import { hasComposition } from '../../services/productComposition';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { errorMessage, type Store, type Branch, type Product, type Category } from './api';
import type { Run } from './Management';
import './stock-count.css';
import { countReasons, parseCountSheet, stockCounts, type CountReason, type LineChange, type StockCount as Count, type StockCountLine } from './stockCountApi';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const statuses = { open: 'Abierto', confirmed: 'Confirmado', cancelled: 'Cancelado' };
type View = 'pending' | 'counted' | 'different';
type SheetSort = 'name' | 'code' | 'category' | 'system' | 'counted' | 'difference';
const sheetLimit = 300;

/**
 * Conteo físico por sucursal o depósito. Lo contado se guarda solo al cargarlo: el servidor anota en ese momento
 * cuánto decía el sistema, así lo que se venda después no aparece como diferencia.
 * Quien no puede editar productos cuenta a ciegas: no ve el stock del sistema ni las diferencias.
 */
export function StockCount({ store, branches, products, categories, run, busy, active, canConfirm }: {
  store: Store; branches: Branch[]; products: Product[]; categories: Category[]; run: Run; busy: boolean; active: boolean; canConfirm: boolean;
}) {
  const [counts, setCounts] = useState<Count[]>([]);
  const [current, setCurrent] = useState<Count | null>(null);
  const [lines, setLines] = useState<Map<string, StockCountLine>>(new Map());
  const [drafts, setDrafts] = useState<Map<string, LineChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(branches.length === 1 ? branches[0].id : '');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('pending');
  // Renglones tocados en la vista actual: siguen a la vista hasta cambiarla, para poder escribir varias cifras.
  const [touched, setTouched] = useState<{ key: string; ids: Set<string> }>({ key: '', ids: new Set() });
  const [sort, setSort] = useState<{ key: SheetSort; descending: boolean }>({ key: 'name', descending: false });
  const [sheetText, setSheetText] = useState('');
  const [sheetMessage, setSheetMessage] = useState('');
  const [history, setHistory] = useState<Record<string, StockCountLine[]>>({});
  const startRequest = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const disabled = busy || !active;
  const places = useMemo(() => [...branches, ...(store.depot_enabled ? [{ id: 'depot', name: 'Depósito' } as Branch] : [])], [branches, store.depot_enabled]);
  const placeName = (id: string) => places.find(place => place.id === id)?.name || (id === 'depot' ? 'Depósito' : 'Sucursal anterior');
  const categoryName = (id: string | null) => id ? categories.find(row => row.id === id)?.name || 'Categoría anterior' : 'Todo';
  const sameBrand = (left?: string | null, right?: string | null) => (left || '').trim().toLowerCase() === (right || '').trim().toLowerCase();
  // Una sección puede ser todo, una categoría, una marca o una marca dentro de una categoría.
  const sectionName = (count: Pick<Count, 'category_id' | 'brand'>) => [count.category_id ? categoryName(count.category_id) : '', count.brand || ''].filter(Boolean).join(' · ') || 'Todo';
  const countable = useMemo(() => products.filter(product => product.active !== false && !hasComposition(product)), [products]);
  const brands = useMemo(() => {
    const names = new Map<string, string>();
    for (const product of countable) if (product.brand?.trim() && (!category || product.categoryId === category)) names.set(product.brand.trim().toLowerCase(), product.brand.trim());
    return [...names.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [countable, category]);
  const sectionSize = countable.filter(product => (!category || product.categoryId === category) && (!brand || sameBrand(product.brand, brand))).length;
  const scope = useMemo(() => current ? products.filter(product => product.active !== false && !hasComposition(product)
    && (!current.category_id || product.categoryId === current.category_id) && (!current.brand || sameBrand(product.brand, current.brand))) : [], [current, products]);
  const systemAt = useCallback((product: Product) => !current ? 0 : current.location === 'depot' ? product.depotStock || 0
    : product.branchStocks?.[current.location] ?? Math.max(0, product.stock - (product.depotStock || 0)), [current]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await stockCounts.list(store.id);
      setCounts(rows); setLoadError('');
      setCurrent(previous => previous ? rows.find(row => row.id === previous.id && row.status === 'open') || null : null);
    } catch (e) { setLoadError(/retail_stock_counts|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611020002 en Supabase.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [store.id]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const open = async (count: Count) => {
    setCurrent(count); setDrafts(new Map()); setSaveError(''); setView('pending');
    try { setLines(new Map((await stockCounts.lines(store.id, count.id)).map(line => [line.product_id, line]))); }
    catch (e) { setLoadError(errorMessage(e)); }
  };

  // Guardado automático y en lote; si falla, lo cargado queda en pantalla para reintentar.
  const flush = useCallback(async (pending: Map<string, LineChange>) => {
    if (!current || !pending.size) return;
    setSaving(true);
    try {
      const changes = [...pending.values()];
      await stockCounts.save(store.id, current.id, changes);
      const fresh = await stockCounts.lines(store.id, current.id);
      setLines(new Map(fresh.map(line => [line.product_id, line])));
      setDrafts(previous => { const next = new Map(previous); for (const change of changes) if (next.get(change.product_id) === change) next.delete(change.product_id); return next; });
      setSaveError('');
    } catch (e) { setSaveError(`No se guardó lo último que cargaste. ${errorMessage(e)}`); }
    finally { setSaving(false); }
  }, [current, store.id]);
  useEffect(() => {
    if (!drafts.size || saving) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(drafts), 700);
    return () => clearTimeout(timer.current);
  }, [drafts, saving, flush]);

  const valueOf = (id: string) => drafts.has(id) ? drafts.get(id)!.counted : lines.get(id)?.counted ?? null;
  const reasonOf = (id: string) => drafts.has(id) && drafts.get(id)!.reason !== undefined ? drafts.get(id)!.reason ?? null : lines.get(id)?.reason ?? null;
  const noteOf = (id: string) => drafts.has(id) && drafts.get(id)!.note !== undefined ? drafts.get(id)!.note ?? '' : lines.get(id)?.note ?? '';
  // La diferencia se calcula contra lo que decía el sistema cuando se guardó lo contado.
  const expectedOf = (product: Product) => { const saved = lines.get(product.id); return saved && saved.counted === valueOf(product.id) ? saved.expected : systemAt(product); };
  const differenceOf = (product: Product) => { const counted = valueOf(product.id); return counted === null ? 0 : counted - expectedOf(product); };
  const viewKey = `${view}|${current?.id}|${query}`;
  const kept = touched.key === viewKey ? touched.ids : new Set<string>();
  const change = (product: Product, patch: Partial<LineChange>) => {
    setTouched(previous => previous.key === viewKey ? (previous.ids.has(product.id) ? previous : { key: viewKey, ids: new Set(previous.ids).add(product.id) }) : { key: viewKey, ids: new Set([product.id]) });
    setDrafts(previous => {
    const next = new Map(previous);
    next.set(product.id, { product_id: product.id, counted: valueOf(product.id), reason: reasonOf(product.id), note: noteOf(product.id) || null, ...patch });
    return next;
    });
  };
  const setCounted = (product: Product, value: string) => change(product, { counted: value === '' ? null : Math.max(0, Math.floor(Number(value))) });

  const counted = scope.filter(product => valueOf(product.id) !== null);
  const different = counted.filter(product => differenceOf(product) !== 0);
  const missingReason = different.filter(product => !reasonOf(product.id));
  const loss = different.reduce((sum, product) => sum + Math.min(0, differenceOf(product)) * -(product.cost || 0), 0);
  const searchText = normalizeSupplierText(query);
  const sortValue = (product: Product, key: SheetSort) => key === 'name' ? product.name : key === 'code' ? product.code : key === 'category' ? product.category
    : key === 'system' ? expectedOf(product) : key === 'counted' ? valueOf(product.id) ?? -1 : differenceOf(product);
  const shown = (searchText ? scope.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(searchText))
    : scope.filter(product => kept.has(product.id) || (view === 'counted' ? valueOf(product.id) !== null : view === 'different' ? valueOf(product.id) !== null && differenceOf(product) !== 0 : valueOf(product.id) === null)))
    .sort((a, b) => {
      const left = sortValue(a, sort.key), right = sortValue(b, sort.key);
      const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'es', { numeric: true });
      return (sort.descending ? -order : order) || a.name.localeCompare(b.name);
    });
  const columns: { key: SheetSort; label: string; numeric?: boolean }[] = [
    { key: 'name', label: 'Producto' }, { key: 'code', label: 'Código' }, { key: 'category', label: 'Categoría' },
    ...(canConfirm ? [{ key: 'system' as const, label: 'Sistema', numeric: true }] : []), { key: 'counted', label: 'Contado', numeric: true },
    ...(canConfirm ? [{ key: 'difference' as const, label: 'Diferencia', numeric: true }] : []),
  ];

  // Cada lectura del escáner suma una unidad al producto, sin salir del buscador.
  const scan = () => {
    const code = query.trim();
    const product = scope.find(row => row.code.trim() === code) || (searchText && shown.length === 1 ? shown[0] : undefined);
    if (!product) { setSheetMessage(code ? `«${code}» no está en este conteo.` : ''); return; }
    setCounted(product, String((valueOf(product.id) || 0) + 1));
    setSheetMessage(`${product.name}: ${(valueOf(product.id) || 0) + 1}`);
    setQuery(''); searchRef.current?.focus();
  };
  const importSheet = (text: string) => {
    const { rows, invalid } = parseCountSheet(text);
    const byCode = new Map(scope.map(product => [product.code.trim(), product]));
    const unknown: string[] = [];
    setDrafts(previous => {
      const next = new Map(previous);
      for (const row of rows) {
        const product = byCode.get(row.code);
        if (!product) { unknown.push(row.code); continue; }
        next.set(product.id, { product_id: product.id, counted: row.qty, reason: reasonOf(product.id), note: noteOf(product.id) || null });
      }
      return next;
    });
    const loaded = rows.length - unknown.length;
    setSheetMessage(`Se cargaron ${loaded} ${loaded === 1 ? 'producto' : 'productos'}.${unknown.length ? ` Sin coincidencia: ${unknown.slice(0, 8).join(', ')}${unknown.length > 8 ? '…' : ''}.` : ''}${invalid.length ? ` ${invalid.length} renglones no se entendieron.` : ''}`);
    setSheetText('');
  };
  const moveCell = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const inputs = [...(event.currentTarget.closest('table')?.querySelectorAll<HTMLInputElement>('td.location-transfer-qty input') || [])];
    inputs[inputs.indexOf(event.currentTarget) + (event.key === 'ArrowUp' ? -1 : 1)]?.focus();
  };

  const start = async () => {
    if (!location) return;
    startRequest.current ||= randomUUID();
    const id = startRequest.current;
    const ok = await run(() => stockCounts.start(store.id, id, location, category || null, brand || null, notes), 'Conteo iniciado');
    if (!ok) return;
    startRequest.current = ''; setNotes(''); setBrand('');
    const rows = await stockCounts.list(store.id).catch(() => counts);
    setCounts(rows);
    const created = rows.find(row => row.id === id);
    if (created) await open(created);
  };
  const confirm = async () => {
    if (!current) return;
    if (drafts.size) { await flush(drafts); return; }
    if (missingReason.length) { setSaveError(`Elegí el motivo de cada diferencia. Faltan ${missingReason.length}.`); setView('different'); return; }
    if (!await askConfirm(`¿Confirmar el conteo de ${placeName(current.location)}? Se ajustan ${different.length} ${different.length === 1 ? 'producto' : 'productos'}${loss ? ` con una pérdida de ${money(loss)}` : ''}. Los productos sin contar no cambian.`)) return;
    if (await run(() => stockCounts.confirm(store.id, current.id), 'Ajustes confirmados')) { setCurrent(null); await load(); }
  };
  const cancel = async () => {
    if (!current || !await askConfirm(`¿Cancelar el conteo de ${placeName(current.location)}? No se ajusta nada y lo contado queda en el historial.`)) return;
    if (await run(() => stockCounts.cancel(store.id, current.id), 'Conteo cancelado')) { setCurrent(null); await load(); }
  };
  const showHistory = async (count: Count) => {
    if (history[count.id]) return;
    try { const rows = await stockCounts.lines(store.id, count.id); setHistory(previous => ({ ...previous, [count.id]: rows })); }
    catch (e) { setLoadError(errorMessage(e)); }
  };
  const productName = (id: string) => products.find(product => product.id === id)?.name || 'Producto eliminado';
  const openCounts = counts.filter(row => row.status === 'open');

  return <section className="retail-panel stock-count" aria-labelledby="stock-count-title">
    <div className="section-heading"><div><h2 id="stock-count-title"><ClipboardList size={20} aria-hidden="true" /> Conteo físico</h2>
      <p>Contá lo que hay en una sucursal o en el depósito y ajustá las diferencias con su motivo.</p></div>
      {!current && <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>}
    </div>
    {loadError && <p role="alert" className="error-banner">{loadError}</p>}

    {!current && <>
      {openCounts.length > 0 && <ul className="stock-count-open">{openCounts.map(row => <li key={row.id}>
        <span><strong>{placeName(row.location)}</strong> · {sectionName(row)} · empezó {new Date(row.created_at).toLocaleString('es-AR')}{row.actor_email ? ` · ${row.actor_email}` : ''}</span>
        <button type="button" className="primary-button" disabled={disabled} onClick={() => void open(row)}>Seguir contando</button>
      </li>)}</ul>}
      <form className="retail-form stock-count-start" onSubmit={event => { event.preventDefault(); void start(); }}>
        <h3>Nuevo conteo</h3>
        <fieldset disabled={disabled}>
          <label>Dónde<select required value={location} onChange={event => setLocation(event.target.value)}>
            <option value="">Elegí sucursal o depósito</option>{places.map(place => { const busyHere = openCounts.filter(row => row.location === place.id).length; return <option key={place.id} value={place.id}>{place.name}{busyHere ? ` · ${busyHere} ${busyHere === 1 ? 'conteo abierto' : 'conteos abiertos'}` : ''}</option>; })}
          </select></label>
          <label>Categoría<select value={category} onChange={event => { setCategory(event.target.value); setBrand(''); }}>
            <option value="">Todas las categorías</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <label>Marca<select value={brand} onChange={event => setBrand(event.target.value)} disabled={!brands.length}>
            <option value="">{brands.length ? 'Todas las marcas' : 'Sin marcas cargadas'}</option>{brands.map(name => <option key={name} value={name}>{name}</option>)}
          </select></label>
          <label>Nota (opcional)<input maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Ej.: conteo de fin de mes" /></label>
        </fieldset>
        <p className="stock-count-message">Vas a contar <strong>{sectionSize} {sectionSize === 1 ? 'producto' : 'productos'}</strong>{category || brand ? ` de ${sectionName({ category_id: category || null, brand: brand || null })}` : ', todo el lugar'}. Si no te da el tiempo, contá por sección: se pueden tener varias abiertas en el mismo lugar.</p>
        <button className="primary-button" disabled={disabled || !location || !sectionSize}><Plus size={15} /> Empezar a contar</button>
      </form>
    </>}

    {current && <div className="location-transfer-composer retail-form stock-count-sheet">
      <div className="location-transfer-composer-heading">
        <h3>Contando {placeName(current.location)} · {sectionName(current)}</h3>
        <button type="button" className="text-button" onClick={() => { if (drafts.size) void flush(drafts); setCurrent(null); }}><X size={15} /> Cerrar y seguir después</button>
      </div>
      <div className="location-transfer-picker-tools">
        <label>Buscar o escanear<input ref={searchRef} value={query} placeholder="Nombre o código" disabled={disabled}
          onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); scan(); } }} /></label>
        <label className="stock-count-file secondary-button"><Upload size={15} aria-hidden="true" /> Cargar planilla (.csv)
          <input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={disabled} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (file) void file.text().then(importSheet);
          }} /></label>
      </div>
      <details className="stock-count-paste"><summary>Pegar desde una planilla</summary>
        <label>Una fila por producto: código y cantidad, separados por punto y coma o tabulación<textarea rows={4} value={sheetText} onChange={event => setSheetText(event.target.value)} placeholder={'7790001;12\n7790002;0'} /></label>
        <button type="button" className="secondary-button" disabled={disabled || !sheetText.trim()} onClick={() => importSheet(sheetText)}>Cargar lo pegado</button>
      </details>
      {sheetMessage && <p role="status" className="stock-count-message">{sheetMessage}</p>}
      {!searchText && <div className="location-transfer-tabs purchase-view-tabs" role="group" aria-label="Qué productos ver">
        <button type="button" className="secondary-button" aria-pressed={view === 'pending'} onClick={() => setView('pending')}>Sin contar ({scope.length - counted.length})</button>
        <button type="button" className="secondary-button" aria-pressed={view === 'counted'} onClick={() => setView('counted')}>Contados ({counted.length})</button>
        {canConfirm && <button type="button" className="secondary-button" aria-pressed={view === 'different'} onClick={() => setView('different')}>Con diferencia ({different.length})</button>}
      </div>}
      <div className="location-transfer-sheet" role="region" aria-label="Productos para contar" tabIndex={0}>
        <table>
          <caption className="sr-only">Productos del conteo. Los encabezados ordenan la lista.</caption>
          <thead><tr>{columns.map(column => {
            const sorted = sort.key === column.key;
            return <th key={column.key} scope="col" className={column.numeric ? 'is-number' : column.key === 'code' || column.key === 'category' ? 'stock-count-meta' : undefined} aria-sort={sorted ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
              <button type="button" onClick={() => setSort(previous => ({ key: column.key, descending: previous.key === column.key ? !previous.descending : !!column.numeric }))}>
                {column.label}{sorted ? (sort.descending ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />) : <ArrowUpDown size={12} aria-hidden="true" />}
              </button>
            </th>;
          })}{canConfirm && <th scope="col"><span className="stock-count-head">Motivo</span></th>}</tr></thead>
          <tbody>{shown.slice(0, sheetLimit).map(product => {
            const value = valueOf(product.id), difference = differenceOf(product);
            return <tr key={product.id} className={value === null ? undefined : difference && canConfirm ? 'is-over' : 'is-chosen'}>
              <th scope="row"><span aria-hidden="true">{product.emoji || '📦'}</span> {product.name}<small className="stock-count-product-meta">{[product.code, product.category].filter(Boolean).join(' · ')}</small></th>
              <td className="stock-count-meta">{product.code}</td>
              <td className="stock-count-meta">{product.category}</td>
              {canConfirm && <td className="is-number">{expectedOf(product).toLocaleString('es-AR')}</td>}
              <td className="location-transfer-qty">
                <NumberInput min={0} step={1} value={value ?? ''} placeholder="—" disabled={disabled} aria-label={`Unidades contadas de ${product.name}`}
                  onFocus={event => event.currentTarget.select()} onKeyDown={moveCell} onValueChange={next => setCounted(product, next)} />
              </td>
              {canConfirm && <td className={`is-number${difference < 0 ? ' stock-count-loss' : ''}`}>{value === null ? '—' : difference > 0 ? `+${difference}` : difference}</td>}
              {canConfirm && <td className="stock-count-reason">{value !== null && difference !== 0 && <>
                <select aria-label={`Motivo de la diferencia de ${product.name}`} value={reasonOf(product.id) || ''} disabled={disabled} onChange={event => change(product, { reason: (event.target.value || null) as CountReason | null })}>
                  <option value="">Elegí motivo</option>{(Object.keys(countReasons) as CountReason[]).map(key => <option key={key} value={key}>{countReasons[key]}</option>)}
                </select>
                {reasonOf(product.id) === 'otro' && <input aria-label={`Detalle de la diferencia de ${product.name}`} maxLength={300} value={noteOf(product.id)} disabled={disabled} onChange={event => change(product, { note: event.target.value })} placeholder="Detalle" />}
              </>}</td>}
            </tr>;
          })}</tbody>
        </table>
        {!shown.length && <p>{searchText ? 'Sin coincidencias. Los combos se cuentan por sus componentes.' : view === 'pending' ? 'Ya contaste todos los productos de este conteo.' : 'Todavía no hay productos en esta vista.'}</p>}
      </div>
      {shown.length > sheetLimit && <small>Mostrando {sheetLimit} de {shown.length}. Buscá para ver el resto.</small>}
      <div className="location-transfer-sheet-total">
        <strong>Contados {counted.length} de {scope.length}{canConfirm ? ` · ${different.length} con diferencia${loss ? ` · pérdida ${money(loss)}` : ''}` : ''}</strong>
        <span role="status">{saving ? <><Loader2 size={14} className="spin" /> Guardando…</> : drafts.size ? 'Cambios sin guardar' : 'Todo guardado'}</span>
      </div>
      {saveError && <p role="alert" className="error-banner">{saveError} <button type="button" className="text-button" disabled={saving || !drafts.size} onClick={() => void flush(drafts)}>Reintentar</button></p>}
      <p>Lo que cargás se guarda solo. Los productos sin contar no se ajustan.{canConfirm ? '' : ' Un encargado revisa las diferencias y confirma los ajustes.'}</p>
      <div className="location-transfer-actions">
        {canConfirm && <button type="button" className="primary-button" disabled={disabled || saving || !counted.length} onClick={() => void confirm()}><Check size={15} /> Confirmar ajustes</button>}
        <button type="button" className="secondary-button" disabled={disabled || saving} onClick={() => void cancel()}>Cancelar conteo</button>
      </div>
    </div>}

    {!current && <>
      <h3>Historial</h3>
      <ol className="location-transfer-history">{counts.filter(row => row.status !== 'open').map(row => <li key={row.id}><article>
        <div className="location-transfer-record-heading"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR')}</time><span className={`stock-transfer-status ${row.status === 'confirmed' ? 'confirmed' : 'cancelled'}`}>{statuses[row.status]}</span></div>
        <strong className="location-transfer-record-route">{placeName(row.location)} · {sectionName(row)}</strong>
        <small>Contó: {row.actor_email || 'Usuario'}{row.closed_email ? ` · ${row.status === 'confirmed' ? 'Confirmó' : 'Canceló'}: ${row.closed_email}` : ''}</small>
        {row.notes && <p>{row.notes}</p>}
        <details onToggle={event => { if (event.currentTarget.open) void showHistory(row); }}><summary>Ver productos</summary>
          {!history[row.id] ? <p role="status">Cargando…</p> : <ul>{history[row.id].map(line => <li key={line.product_id}>
            {productName(line.product_id)}: contó {line.counted}{canConfirm && line.adjustment ? ` · ajuste ${line.adjustment > 0 ? '+' : ''}${line.adjustment}` : ''}{line.reason ? ` · ${countReasons[line.reason]}` : ''}{line.note ? ` (${line.note})` : ''}{canConfirm && line.adjustment && line.adjustment < 0 && line.unit_cost ? ` · ${money(-line.adjustment * line.unit_cost)}` : ''}{line.counted_email ? ` · ${line.counted_email}` : ''}
          </li>)}</ul>}
        </details>
      </article></li>)}</ol>
      {!counts.some(row => row.status !== 'open') && !loading && <p className="transfer-flow-empty">Todavía no hay conteos cerrados.</p>}
    </>}
  </section>;
}
