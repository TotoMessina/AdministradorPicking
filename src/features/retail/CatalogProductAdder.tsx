import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NumberInput } from '../../components/NumberInput';
import { useToast } from '../../context/ToastContext';
import { askConfirm } from '../../components/ConfirmHost';
import { draftMarkupPrice, roundingLabel } from '../../services/productSalePrice';
import { errorMessage, type Category, type Product, type Store } from './api';
import type { Run } from './Management';
import { adImageUrl, adLabels, trackAd, useAdViews, useAds, type FeaturedAd } from './ads';
import './catalog-product-adder.css';
import './ads.css';

interface Facet { name: string; count: number }
interface Match { ean_code: string; name: string; brand: string | null; category_suggestion: string | null; emoji: string | null }
interface Line { selected: boolean; categoryId: string; price: string; cost: string; markup: string }

const chunk = 500;
const count = (value: number) => value.toLocaleString('es-AR');
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const missing = (message: string) => /retail_global_catalog_facets|retail_global_catalog_matches|retail_add_from_global_catalog|price_pending|schema cache/.test(message)
  ? 'Falta aplicar la actualización 202611030006 en Supabase.' : message;
const money = (value: number) => `$${value.toLocaleString('es-AR')}`;

/**
 * Alta de productos del comercio desde el catálogo global, por marca, categoría o las dos.
 * Siempre con stock 0. El precio sale del costo, la ganancia y el redondeo del comercio; el precio a mano se pide aparte.
 * Sin costo (o sin precio manual) se crean «sin precio» y no se venden hasta cargarlo.
 */
export function CatalogProductAdder({ storeId, store, products, categories, busy, run, active, onClose }: {
  storeId: string; store: Store; products: Product[]; categories: Category[]; busy: boolean; run: Run; active: boolean; onClose: () => void;
}) {
  // Sin la actualización 202611030007 la base todavía no acepta porcentaje: solo queda el precio manual.
  const costPricing = store.price_rounding !== undefined;
  const [manual, setManual] = useState(!costPricing);
  const step = store.price_rounding ?? 0;
  const defaultMarkup = store.default_markup != null ? String(store.default_markup) : '30';
  const [bulkMarkup, setBulkMarkup] = useState(defaultMarkup);
  const { notify } = useToast();
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [facets, setFacets] = useState<{ brands: Facet[]; categories: Facet[] }>({ brands: [], categories: [] });
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [total, setTotal] = useState(0);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [bulkCategory, setBulkCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const existing = useMemo(() => new Set(products.map(product => product.code.trim())), [products]);
  const fallback = categories.find(item => item.canonicalName === 'Varios' || normalize(item.name) === 'varios')?.id || categories[0]?.id || '';
  const categoryFor = (suggestion: string | null) => {
    if (!suggestion) return fallback;
    const wanted = normalize(suggestion);
    return categories.find(item => normalize(item.canonicalName || item.name) === wanted || normalize(item.name) === wanted)?.id || fallback;
  };

  useEffect(() => { requestAnimationFrame(() => title.current?.focus()); }, []);
  // Destacados patrocinados: tarjetas arriba y una etiqueta en sus filas.
  const featured = useAds<FeaturedAd>(storeId, 'catalog_featured', active);
  useAdViews(storeId, featured.map(ad => ad.id));
  const featuredCodes = useMemo(() => {
    const map = new Map<string, { label: string; campaign: string }>();
    for (const ad of featured) for (const item of ad.items) if (!map.has(item.ean_code)) map.set(item.ean_code, { label: adLabels[item.label || 'destacado'] || 'Destacado', campaign: ad.id });
    return map;
  }, [featured]);
  const showBrand = (ad: FeaturedAd) => {
    if (!ad.brand) return;
    trackAd(storeId, ad.id, 'click');
    setBrand(ad.brand); setCategory(''); setMatches(null);
    requestAnimationFrame(() => document.getElementById('catalog-adder-search')?.focus());
  };
  useEffect(() => {
    if (!active) return;
    let current = true;
    void supabase.rpc('retail_global_catalog_facets', { p_brand: brand || null, p_category: category || null }).then(({ data, error: rpcError }) => {
      if (!current) return;
      if (rpcError) { setError(missing(errorMessage(rpcError))); return; }
      setFacets(data as typeof facets); setError('');
    });
    return () => { current = false; };
  }, [active, brand, category]);

  const search = async () => {
    if (!brand && !category) { setError('Elegí una marca, una categoría o las dos.'); return; }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('retail_global_catalog_matches', { p_brand: brand || null, p_category: category || null });
      if (rpcError) throw rpcError;
      const result = data as { total: number; items: Match[] };
      setMatches(result.items); setTotal(result.total); setBulkCategory('');
      setLines(Object.fromEntries(result.items.map(item => [item.ean_code, { selected: !existing.has(item.ean_code), categoryId: categoryFor(item.category_suggestion), price: '', cost: '', markup: defaultMarkup }])));
      setError('');
      requestAnimationFrame(() => reviewTitle.current?.focus());
    } catch (e) { setError(missing(errorMessage(e))); }
    finally { setLoading(false); }
  };

  const available = (matches || []).filter(item => !existing.has(item.ean_code));
  const chosen = available.filter(item => lines[item.ean_code]?.selected);
  const rowPrice = (line: Line) => manual ? (Number(line.price) > 0 ? Number(line.price) : null)
    : Number(line.cost) > 0 ? draftMarkupPrice(Number(line.cost), line.markup, step) : null;
  const priced = chosen.filter(item => rowPrice(lines[item.ean_code]) !== null).length;
  const applyBulkMarkup = (value: string) => {
    setBulkMarkup(value);
    if (value.trim()) setLines(previous => Object.fromEntries(Object.entries(previous).map(([code, line]) => [code, { ...line, markup: value }])));
  };
  const toggleManual = async () => {
    if (!manual && !await askConfirm('¿Cargar los precios a mano? Esos productos no van a seguir al costo: si el costo cambia, el precio no se actualiza. Podés pasarlos a precio por costo desde su ficha.')) return;
    setManual(!manual);
  };
  const update = (code: string, change: Partial<Line>) => setLines(previous => ({ ...previous, [code]: { ...previous[code], ...change } }));
  const selectAll = (selected: boolean) => setLines(previous => Object.fromEntries(Object.entries(previous).map(([code, line]) => [code, { ...line, selected: existing.has(code) ? false : selected }])));
  const allChosen = available.length > 0 && chosen.length === available.length;
  const headerCheck = useRef<HTMLInputElement>(null);
  useEffect(() => { if (headerCheck.current) headerCheck.current.indeterminate = chosen.length > 0 && !allChosen; }, [chosen.length, allChosen]);
  // Como en una planilla: Enter y las flechas arriba/abajo pasan a la misma columna de la fila vecina.
  const moveInColumn = (event: KeyboardEvent<HTMLElement>) => {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.currentTarget instanceof HTMLSelectElement && event.key !== 'Enter') return;
    const cell = event.currentTarget.closest('td');
    const row = cell?.parentElement;
    if (!cell || !row) return;
    event.preventDefault();
    const column = [...row.children].indexOf(cell);
    let next = (event.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling) as HTMLElement | null;
    while (next) {
      const target = next.children[column]?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled)');
      if (target) { target.focus(); if (target instanceof HTMLInputElement) target.select(); return; }
      next = (event.key === 'ArrowUp' ? next.previousElementSibling : next.nextElementSibling) as HTMLElement | null;
    }
  };
  const applyBulkCategory = (value: string) => {
    setBulkCategory(value);
    setLines(previous => Object.fromEntries(Object.entries(previous).map(([code, line]) => {
      const item = matches?.find(row => row.ean_code === code);
      return [code, { ...line, categoryId: value || categoryFor(item?.category_suggestion ?? null) }];
    })));
  };

  const save = async () => {
    if (!chosen.length) return;
    const invalid = chosen.find(item => {
      const line = lines[item.ean_code];
      if (line.cost !== '' && !(Number(line.cost) >= 0)) return true;
      return manual ? line.price !== '' && !(Number(line.price) > 0) : Number(line.cost) > 0 && rowPrice(line) === null;
    });
    if (invalid) {
      setError(manual ? `Revisá el precio o el costo de ${invalid.name}.` : `Revisá el costo o la ganancia de ${invalid.name}.`);
      document.getElementById(`catalog-add-${manual ? 'price' : 'markup'}-${invalid.ean_code}`)?.focus(); return;
    }
    const items = chosen.map(item => {
      const line = lines[item.ean_code];
      const cost = line.cost !== '' ? { cost: Number(line.cost) } : {};
      if (manual) return { code: item.ean_code, category_id: line.categoryId || null, ...cost, ...(line.price !== '' ? { price: Number(line.price) } : {}) };
      return { code: item.ean_code, category_id: line.categoryId || null, ...cost, ...(rowPrice(line) !== null ? { markup: Number(line.markup) } : {}) };
    });
    setProgress({ done: 0, total: items.length });
    const outcome = { created: 0, priced: 0, pending: 0, skipped: 0 };
    const ok = await run(async () => {
      for (let index = 0; index < items.length; index += chunk) {
        const { data, error: rpcError } = await supabase.rpc('retail_add_from_global_catalog', { p_store: storeId, p_items: items.slice(index, index + chunk) });
        if (rpcError) {
          const done = outcome.created ? ` Ya se dieron de alta ${count(outcome.created)}; volver a confirmar no los duplica.` : '';
          throw new Error(`${missing(errorMessage(rpcError))}${done}`);
        }
        const result = data as { created: number; priced: number; pending: number; skipped: unknown[] };
        outcome.created += result.created; outcome.priced += result.priced; outcome.pending += result.pending; outcome.skipped += result.skipped.length;
        setProgress({ done: Math.min(index + chunk, items.length), total: items.length });
      }
    });
    setProgress(null);
    if (!ok) return;
    const skipped = outcome.skipped ? ` ${count(outcome.skipped)} ya existían en tu comercio (activos o archivados) y no se tocaron.` : '';
    notify('success', `Se dieron de alta ${count(outcome.created)} productos con stock 0: ${count(outcome.priced)} a la venta y ${count(outcome.pending)} sin precio.${skipped}`);
    onClose();
  };

  return <section className="retail-form catalog-product-adder" aria-labelledby="catalog-adder-title">
    <div className="catalog-adder-head">
      <div>
        <h3 id="catalog-adder-title" ref={title} tabIndex={-1}>Agregar desde el catálogo global</h3>
        <p>Elegí una marca, una categoría o las dos. Antes de dar de alta vas a ver la lista. Todos entran con stock 0.</p>
      </div>
      <button type="button" className="icon-button" aria-label="Cerrar" disabled={Boolean(progress)} onClick={onClose}><X size={18} /></button>
    </div>

    {featured.length > 0 && !matches && <div className="featured-ads" aria-label="Productos destacados">
      {featured.map(ad => <aside key={ad.id} className="featured-ad" aria-label={`Publicidad de ${ad.advertiser}`}>
        {ad.image_path && <img src={adImageUrl(ad.image_path)} alt="" loading="lazy" decoding="async" />}
        <div>
          <small className="ad-tag">Publicidad · {ad.advertiser}</small>
          <strong>{ad.title}</strong>
          {ad.body && <p>{ad.body}</p>}
          {ad.items.length > 0 && <small>{ad.items.slice(0, 4).map(item => item.name || item.ean_code).join(' · ')}{ad.items.length > 4 ? ` y ${ad.items.length - 4} más` : ''}</small>}
        </div>
        {ad.brand && <button type="button" className="secondary-button" disabled={loading || Boolean(progress)} onClick={() => showBrand(ad)}>Ver productos de {ad.brand}</button>}
      </aside>)}
    </div>}

    <form className="catalog-adder-filters" onSubmit={event => { event.preventDefault(); void search(); }}>
      <label>Marca<select value={brand} disabled={loading || Boolean(progress)} onChange={event => { setBrand(event.target.value); setMatches(null); }}>
        <option value="">Todas las marcas</option>
        {facets.brands.map(item => <option key={item.name} value={item.name}>{item.name} ({count(item.count)})</option>)}
        {brand && !facets.brands.some(item => item.name === brand) && <option value={brand}>{brand}</option>}
      </select></label>
      <label>Categoría<select value={category} disabled={loading || Boolean(progress)} onChange={event => { setCategory(event.target.value); setMatches(null); }}>
        <option value="">Todas las categorías</option>
        {facets.categories.map(item => <option key={item.name} value={item.name}>{item.name} ({count(item.count)})</option>)}
        {category && !facets.categories.some(item => item.name === category) && <option value={category}>{category}</option>}
      </select></label>
      <button id="catalog-adder-search" className="secondary-button" disabled={loading || Boolean(progress) || (!brand && !category)}>{loading ? <><Loader2 size={15} className="spin" /> Buscando…</> : 'Ver productos'}</button>
    </form>
    {error && <p role="alert" className="error-banner">{error}</p>}

    {matches && <div className="catalog-adder-review">
      <h4 ref={reviewTitle} tabIndex={-1}>{count(matches.length)} {matches.length === 1 ? 'producto encontrado' : 'productos encontrados'}{matches.length - available.length ? ` · ${count(matches.length - available.length)} ya están en tu catálogo` : ''}</h4>
      {total > matches.length && <p className="catalog-adder-note">Se muestran los primeros {count(matches.length)} de {count(total)}. Elegí marca y categoría juntas para ver menos.</p>}
      {available.length > 0 && <div className="catalog-adder-bulk">
        <label>Categoría en tu comercio<select value={bulkCategory} disabled={Boolean(progress)} onChange={event => applyBulkCategory(event.target.value)}>
          <option value="">Según el catálogo global</option>
          {categories.map(item => <option key={item.id} value={item.id}>Todos en {item.name}</option>)}
        </select></label>
        {!manual && <label>Ganancia para todos (%)<NumberInput min={-99.99} max={10000} step={0.01} value={bulkMarkup} disabled={Boolean(progress)} onValueChange={applyBulkMarkup} /></label>}
        {costPricing && <button type="button" className="text-button" disabled={Boolean(progress)} onClick={() => void toggleManual()}>{manual ? 'Calcular por costo' : 'Cargar precios a mano'}</button>}
        <small>{manual ? 'Precios a mano: no siguen al costo ni se redondean.' : `Precio = costo + ganancia, ${roundingLabel(step).toLowerCase()}${step > 0 ? ' hacia arriba' : ''}. Sin costo queda «sin precio».`}
          {' '}Escribir en una fila la elige. Enter o las flechas pasan a la fila de abajo.</small>
      </div>}
      {matches.length > 0 && <div className="catalog-adder-sheet" role="region" aria-label="Productos a dar de alta" tabIndex={-1}>
        <table>
          <thead><tr>
            <th scope="col" className="col-pick"><input ref={headerCheck} type="checkbox" aria-label="Elegir todos" checked={allChosen} disabled={!available.length || Boolean(progress)} onChange={event => selectAll(event.target.checked)} /></th>
            <th scope="col" className="col-code">Código</th>
            <th scope="col">Producto</th>
            <th scope="col" className="col-brand">Marca</th>
            <th scope="col" className="col-category">Categoría</th>
            <th scope="col" className="col-money">Costo</th>
            {!manual && <th scope="col" className="col-markup">Ganancia %</th>}
            <th scope="col" className="col-money">Precio</th>
          </tr></thead>
          <tbody>{[...matches].sort((a, b) => Number(featuredCodes.has(b.ean_code)) - Number(featuredCodes.has(a.ean_code))).map(item => {
            const line = lines[item.ean_code];
            const inStore = existing.has(item.ean_code);
            const selected = !inStore && Boolean(line?.selected);
            return <tr key={item.ean_code} className={inStore ? 'is-existing' : selected ? 'is-selected' : ''}>
              <td className="col-pick"><input type="checkbox" checked={selected} disabled={inStore || Boolean(progress)} aria-label={`Elegir ${item.name}`}
                onChange={event => update(item.ean_code, { selected: event.target.checked })} /></td>
              <td className="col-code">{item.ean_code}</td>
              <th scope="row"><span aria-hidden="true">{item.emoji || '📦'}</span> {item.name}{featuredCodes.has(item.ean_code) && <span className="featured-badge" title="Publicidad">{featuredCodes.get(item.ean_code)!.label}</span>}</th>
              <td className="col-brand">{item.brand || '—'}</td>
              {inStore ? <td colSpan={manual ? 3 : 4} className="catalog-adder-existing">Ya está en tu catálogo</td> : <>
                <td className="col-category"><select value={line.categoryId} disabled={Boolean(progress)} aria-label={`Categoría de ${item.name}`} onKeyDown={moveInColumn}
                  onChange={event => update(item.ean_code, { categoryId: event.target.value, selected: true })}>
                  {categories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select></td>
                <td className="col-money"><NumberInput min={0} step={0.01} value={line.cost} placeholder="—" disabled={Boolean(progress)}
                  aria-label={`Costo de ${item.name}`} onKeyDown={moveInColumn} onValueChange={cost => update(item.ean_code, { cost, ...(cost ? { selected: true } : {}) })} /></td>
                {!manual && <td className="col-markup"><NumberInput id={`catalog-add-markup-${item.ean_code}`} min={-99.99} max={10000} step={0.01} value={line.markup} disabled={Boolean(progress)}
                  aria-label={`Ganancia de ${item.name}`} onKeyDown={moveInColumn} onValueChange={markup => update(item.ean_code, { markup })} /></td>}
                {manual ? <td className="col-money"><NumberInput id={`catalog-add-price-${item.ean_code}`} min={0.01} step={0.01} value={line.price} placeholder="Sin precio" disabled={Boolean(progress)}
                  aria-label={`Precio de ${item.name}`} onKeyDown={moveInColumn} onValueChange={price => update(item.ean_code, { price, ...(price ? { selected: true } : {}) })} /></td>
                  : <td className={`col-money col-calculated${rowPrice(line) === null ? ' is-empty' : ''}`}>{rowPrice(line) === null ? 'Sin precio' : money(rowPrice(line)!)}</td>}
              </>}
            </tr>;
          })}</tbody>
        </table>
      </div>}
      {!matches.length && <p className="catalog-adder-note">No hay productos del catálogo global con esa marca y categoría.</p>}
    </div>}

    {matches && <div className="catalog-adder-footer">
      <p role="status">{chosen.length
        ? `Se van a dar de alta ${count(chosen.length)} con stock 0: ${count(priced)} a la venta y ${count(chosen.length - priced)} sin precio, que no se venden hasta cargarlo.`
        : 'Elegí al menos un producto.'}</p>
      {progress && <p role="status"><Loader2 size={15} className="spin" /> Dando de alta {count(progress.done)} de {count(progress.total)}…</p>}
      <div className="catalog-adder-actions">
        <button type="button" className="secondary-button" disabled={Boolean(progress)} onClick={onClose}>Cancelar</button>
        <button type="button" className="primary-button" disabled={busy || Boolean(progress) || !chosen.length} onClick={() => void save()}>
          Dar de alta {count(chosen.length)} {chosen.length === 1 ? 'producto' : 'productos'}</button>
      </div>
    </div>}
  </section>;
}
