import { Fragment, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Layers, Loader2, Plus, Trash2, X } from 'lucide-react';
import { PresentationChain } from './PresentationChain';
import { NumberInput } from '../../components/NumberInput';
import { askConfirm } from '../../components/ConfirmHost';
import { useToast } from '../../context/ToastContext';
import { draftMarkupPrice, markupFromPrice } from '../../services/productSalePrice';
import { describe, presentationCodeConflict, presentationCodeWarning, presentationLabels, sizesError, sizesOf, storedSizes, unitCost, unitsIn, type Presentation, type PresentationSizes } from '../../services/productPresentation';
import { defaultProductCategory, resolveProductCategory } from '../../services/productCategoryService';
import { compositionCost, hasComposition } from '../../services/productComposition';
import { ProductRoundingField } from './ProductMarkupField';
import { errorMessage, retail, type Category, type Product, type Store } from './api';
import type { Run } from './Management';
import { groqChat } from '../../services/groqService';
import { AiIcon } from '../../components/AiIcon';
import { extractJson, type ProductSuggestion } from './catalogEditorShared';
import './product-sheet.css';

interface Row extends PresentationSizes {
  key: string; original?: Product;
  code: string; name: string; categoryId: string;
  qty: string; cost: string; markup: string; manual: boolean; price: string; minStock: string;
  brand: string; supplier: string; supplierCode: string; expiry: string; sellable: boolean; unitType: string; emoji: string; rounding: number | null;
  /** EAN-13 del display, DUN-14 del bulto y bultos por pallet (202611060009). */
  displayCode: string; packCode: string; palletPacks: string;
  /** Etiquetas separadas por coma. */
  tags: string;
  open: boolean; error: string;
}
type Field = keyof Row;

let counter = 0;
const nextKey = () => `row-${Date.now()}-${counter++}`;
const money = (value: number) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
/** «sin TACC, importado» → ['sin TACC', 'importado'], sin repetidos ni vacíos. */
const tagList = (text: string) => [...new Set(text.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 30);
const unitTypes: Record<string, string> = { unit: 'Unidad', kg: 'Kilo', lt: 'Litro', pack: 'Pack', box: 'Caja' };

/**
 * Planilla para dar de alta o editar productos en filas, como la revisión de facturas.
 * La cantidad y el costo se cargan por la presentación elegida (unidad, display o bulto) y se guardan por unidad.
 * Guarda cada fila con el mismo retail.saveProduct de la ficha, así mantiene sucursal, precio por costo y permisos.
 */
export function ProductSheet({ mode, store, products, categories, initial, busy, run, operationBranch, onClose, onEditComposition }: {
  mode: 'new' | 'edit'; store: Store; products: Product[]; categories: Category[]; initial?: Product[];
  busy: boolean; run: Run; operationBranch?: string;
  /** Abre los componentes de un combo o paquete (su costo sale de ahí). */
  onEditComposition?: (product: Product) => void;
  onClose: () => void;
}) {
  const { notify } = useToast();
  const storeStep = store.price_rounding ?? 0;
  const defaultMarkup = store.default_markup != null ? String(store.default_markup) : '';
  const blank = (): Row => ({ key: nextKey(), code: '', name: '', categoryId: defaultProductCategory(categories), presentation: 'unit', packUnits: '', displayUnits: '',
    qty: '', cost: '', markup: defaultMarkup, manual: false, price: '', minStock: '4', brand: '', supplier: '', supplierCode: '', expiry: '', sellable: true,
    unitType: 'unit', emoji: '📦', rounding: null, displayCode: '', packCode: '', palletPacks: '', tags: '', open: false, error: '' });
  const fromProduct = (product: Product): Row => {
    const combo = hasComposition(product);
    const sizes = combo ? { presentation: 'unit' as const, packUnits: '', displayUnits: '' } : sizesOf(product);
    const units = unitsIn(sizes) || 1;
    return { key: product.id, original: product, code: product.code, name: product.name, categoryId: product.categoryId, ...sizes,
      qty: '', cost: combo ? String(compositionCost(product.stock_components || [], products).cost) : product.cost > 0 ? String(Math.round(product.cost * units * 100) / 100) : '',
      markup: product.sale_markup != null ? String(product.sale_markup) : product.price_pending ? defaultMarkup : '',
      manual: product.sale_markup == null && !product.price_pending && product.sellable !== false, price: product.price_pending ? '' : String(product.price),
      minStock: String(product.minStock), brand: product.brand || '', supplier: product.supplier || '', supplierCode: product.supplierCode || '',
      expiry: product.expiry_date || '', sellable: product.sellable !== false || product.price_pending === true, unitType: product.unitType || 'unit',
      emoji: product.emoji || '📦', rounding: product.price_rounding ?? null,
      displayCode: product.display_code || '', packCode: product.pack_code || '', palletPacks: product.pallet_packs == null ? '' : String(product.pallet_packs),
      tags: (product.tags || []).join(', '), open: false, error: '' };
  };
  const editable = initial || [];
  const isCombo = (row: Row) => !!row.original && hasComposition(row.original);
  const [rows, setRows] = useState<Row[]>(() => mode === 'edit' ? editable.map(fromProduct) : [blank()]);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  // Ayuda con IA por fila: voluntaria, completa solo lo vacío y nunca precio ni costo.
  const [aiRow, setAiRow] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<Record<string, string>>({});
  const suggest = async (row: Row) => {
    const name = row.name.trim();
    if (name.length < 2) { setAiNotes(previous => ({ ...previous, [row.key]: 'Escribí el nombre del producto para que la IA sugiera sus datos.' })); return; }
    setAiRow(row.key);
    try {
      const response = await groqChat([
        { role: 'system', content: `Sos experto en kioscos y almacenes de Argentina. Respondé SOLO un JSON con "brand" (marca), "supplier" (distribuidor típico en Argentina), "category" (elegida EXCLUSIVAMENTE de: ${categories.map(category => category.name).join(', ')}), "emoji" (uno) y "tags" (2 a 4, minúsculas, sin '#').` },
        { role: 'user', content: `Producto: "${name}". Código: ${row.code.trim() || 'sin código'}` },
      ], { temperature: 0.2 });
      const found = extractJson<ProductSuggestion>(response);
      if (!found) throw new Error('sin datos');
      const category = found.category ? resolveProductCategory(categories, found.category, name) : '';
      // Se decide con la fila del momento del pedido (no dentro del setState, que React puede repetir).
      const current = rows.find(item => item.key === row.key) ?? row;
      const patch: Partial<Row> = {};
      const filled: string[] = [];
      if (!current.brand.trim() && found.brand) { patch.brand = found.brand; filled.push('marca'); }
      if (!current.supplier.trim() && found.supplier) { patch.supplier = found.supplier; filled.push('proveedor'); }
      if (!current.tags.trim() && found.tags?.length) { patch.tags = found.tags.join(', '); filled.push('etiquetas'); }
      if ((!current.emoji.trim() || current.emoji === '📦') && found.emoji) { patch.emoji = found.emoji; filled.push('ícono'); }
      if (category && current.categoryId === defaultProductCategory(categories) && category !== current.categoryId) { patch.categoryId = category; filled.push('categoría'); }
      // Solo se completa lo que sigue vacío cuando llega la respuesta.
      setRows(previous => previous.map(item => item.key !== row.key ? item : {
        ...item, ...Object.fromEntries(Object.entries(patch).filter(([field]) => !String(item[field as keyof Row] ?? '').trim() || (field === 'emoji' && item.emoji === '📦') || (field === 'categoryId' && item.categoryId === defaultProductCategory(categories)))),
      }));
      setAiNotes(previous => ({ ...previous, [row.key]: filled.length ? `La IA completó: ${filled.join(', ')}. Revisalo antes de guardar.` : 'La IA no tenía nada nuevo para completar: los datos ya estaban cargados.' }));
    } catch {
      setAiNotes(previous => ({ ...previous, [row.key]: 'No se pudieron obtener sugerencias. Podés completar los datos a mano o reintentar.' }));
    } finally { setAiRow(null); }
  };
  const table = useRef<HTMLTableElement>(null);
  const lookups = useRef(new Set<string>());

  const update = (key: string, change: Partial<Row>) => setRows(previous => {
    const next = previous.map(row => row.key === key ? { ...row, ...change, error: '' } : row);
    // Como en una planilla: escribir en la última fila agrega otra vacía debajo.
    const last = next.at(-1);
    if (mode === 'new' && last && (last.code || last.name)) next.push(blank());
    return next;
  });
  const remove = (key: string) => setRows(previous => { const next = previous.filter(row => row.key !== key); return next.length || mode === 'edit' ? next : [blank()]; });

  const calc = (row: Row) => {
    const units = unitsIn(row);
    const cost = Number(row.cost);
    const perUnit = units && row.cost.trim() && cost >= 0 ? unitCost(cost, units) : null;
    const price = !row.sellable ? 0 : row.manual ? (Number(row.price) > 0 ? Number(row.price) : null)
      : perUnit && perUnit > 0 ? draftMarkupPrice(perUnit, row.markup, row.rounding ?? storeStep) : null;
    const stock = mode === 'new' && units ? Math.round(Number(row.qty || 0)) * units : null;
    return { units, perUnit, price, stock };
  };
  const filled = rows.filter(row => mode === 'edit' || row.code.trim() || row.name.trim());

  // Códigos por presentación: solo con la actualización 202611060009.
  const codesReady = products.some(product => product.display_code !== undefined);
  const changed = (row: Row) => {
    if (!row.original) return true;
    const fresh = fromProduct(row.original);
    const fields: Field[] = ['code', 'name', 'categoryId', 'presentation', 'packUnits', 'displayUnits', 'cost', 'markup', 'manual', 'price', 'minStock', 'brand', 'supplier', 'supplierCode', 'expiry', 'sellable', 'unitType', 'emoji', 'rounding', 'displayCode', 'packCode', 'palletPacks', 'tags'];
    return fields.some(field => String(row[field]) !== String(fresh[field]));
  };
  const pending = mode === 'edit' ? filled.filter(changed) : filled;

  const validate = (row: Row): string => {
    const { units, perUnit, price } = calc(row);
    const code = row.code.trim();
    if (!row.name.trim()) return 'Falta el nombre.';
    if (row.name.trim().length > 160) return 'El nombre admite hasta 160 caracteres.';
    if (!code) return 'Falta el código.';
    if (products.some(product => product.code.trim() === code && product.id !== row.original?.id)) return `El código ${code} ya es de otro producto.`;
    if (filled.some(other => other.key !== row.key && other.code.trim() === code)) return `El código ${code} está repetido en la planilla.`;
    if (codesReady) {
      const current = { id: row.original?.id, code, display_code: row.displayCode, pack_code: row.packCode };
      // Contra el catálogo y contra las otras filas de la planilla, como si ya estuvieran guardadas.
      const others = filled.filter(other => other.key !== row.key).map(other => ({ id: other.key, code: other.code, display_code: other.displayCode, pack_code: other.packCode, name: other.name.trim() || 'otra fila' }));
      const conflict = presentationCodeConflict([...products.filter(product => !filled.some(other => other.original?.id === product.id)), ...others], current);
      if (conflict) return conflict.message;
      if (row.palletPacks.trim() && !(Number.isInteger(Number(row.palletPacks)) && Number(row.palletPacks) >= 1 && Number(row.palletPacks) <= 100000)) return 'Los bultos por pallet deben ser un número entero entre 1 y 100.000.';
    }
    if (!row.categoryId) return 'Elegí la categoría.';
    if (!units) return `Completá cuántas unidades trae el ${row.presentation === 'display' ? 'display' : 'bulto'}.`;
    if (sizesError(row)) return sizesError(row);
    if (mode === 'new' && row.qty.trim() && !(Number.isInteger(Number(row.qty)) && Number(row.qty) >= 0)) return 'La cantidad debe ser un número entero.';
    if (row.cost.trim() && !(Number(row.cost) >= 0)) return 'Revisá el costo.';
    if (!Number.isInteger(Number(row.minStock)) || Number(row.minStock) < 0) return 'Revisá el mínimo.';
    if (row.sellable && price === null) return row.manual ? 'Escribí el precio.' : !(perUnit && perUnit > 0) ? 'Cargá el costo para calcular el precio, o pedí precio manual.' : 'Revisá la ganancia.';
    return '';
  };

  const requestManual = async (row: Row) => {
    if (!await askConfirm('¿Poner el precio a mano? Deja de seguir al costo: si el costo cambia, el precio no se actualiza.')) return;
    const { price } = calc(row);
    update(row.key, { manual: true, price: price ? String(price) : row.price });
  };
  const useCost = (row: Row) => { const { perUnit } = calc(row); update(row.key, { manual: false, markup: perUnit && Number(row.price) > 0 ? markupFromPrice(Number(row.price), perUnit) || defaultMarkup : row.markup || defaultMarkup }); };

  // Código leído o escrito: si el catálogo global lo conoce y la fila está vacía, completa nombre, marca y categoría.
  const lookup = async (row: Row) => {
    const code = row.code.trim();
    if (mode !== 'new' || !/^\d{8,14}$/.test(code) || row.name.trim() || lookups.current.has(code)) return;
    lookups.current.add(code);
    try {
      const found = await retail.lookupEan(code);
      if (!found.found || !found.name) return;
      setRows(previous => previous.map(item => item.key === row.key && !item.name.trim() ? { ...item, name: found.name!, brand: item.brand || found.brand || '',
        emoji: found.emoji || item.emoji, categoryId: resolveProductCategory(categories, found.category_suggestion, found.name) || item.categoryId } : item));
    } catch { /* La búsqueda es una ayuda: sin conexión se sigue cargando a mano. */ }
  };

  const moveInColumn = (event: KeyboardEvent<HTMLElement>) => {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.currentTarget instanceof HTMLSelectElement && event.key !== 'Enter') return;
    const cell = event.currentTarget.closest('td');
    const tr = cell?.parentElement;
    if (!cell || !tr) return;
    event.preventDefault();
    const column = cell.dataset.col;
    let next = (event.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling) as HTMLElement | null;
    while (next) {
      const target = next.querySelector<HTMLElement>(`td[data-col="${column}"] input:not(:disabled), td[data-col="${column}"] select:not(:disabled)`);
      if (target) { target.focus(); if (target instanceof HTMLInputElement) target.select(); return; }
      next = (event.key === 'ArrowUp' ? next.previousElementSibling : next.nextElementSibling) as HTMLElement | null;
    }
  };
  // El lector de códigos termina con Enter: pasa al nombre de la misma fila.
  const codeKey = (event: KeyboardEvent<HTMLInputElement>, row: Row) => {
    if (event.key !== 'Enter') { moveInColumn(event); return; }
    event.preventDefault();
    void lookup(row);
    event.currentTarget.closest('tr')?.querySelector<HTMLInputElement>('td[data-col="name"] input')?.focus();
  };

  const save = async () => {
    const checked = pending.map(row => ({ row, error: validate(row) }));
    if (checked.some(item => item.error)) {
      setRows(previous => previous.map(row => ({ ...row, error: checked.find(item => item.row.key === row.key)?.error || '' })));
      const first = checked.find(item => item.error)!;
      table.current?.querySelector<HTMLElement>(`tr[data-key="${first.row.key}"] input`)?.focus();
      return;
    }
    if (!checked.length) return;
    setSaving({ done: 0, total: checked.length });
    const failed = new Map<string, string>();
    let saved = 0;
    const ran = await run(async () => {
      for (const { row } of checked) {
        const { perUnit, price, stock } = calc(row);
        const sizes = storedSizes(row);
        try {
          await retail.saveProduct(store.id, {
            id: row.original?.id || '', categoryId: row.categoryId, code: row.code.trim(), name: row.name.trim(),
            price: row.sellable ? price || 0 : 0, sale_markup: row.sellable && !row.manual ? Number(row.markup) : null, sellable: row.sellable,
            cost: isCombo(row) ? compositionCost(row.original!.stock_components || [], products).cost : perUnit ?? row.original?.cost ?? 0, stock: row.original ? row.original.stock : stock ?? 0, minStock: Number(row.minStock), emoji: row.emoji.trim() || '📦', active: true,
            brand: row.brand.trim() || undefined, supplier: row.supplier.trim() || undefined, supplierCode: row.supplierCode.trim() || undefined,
            tags: tagList(row.tags), unitType: row.unitType, pack_size: sizes.pack_size, display_size: sizes.display_size,
            // Solo si cambió: hasta 202611100001 la base no deja editar el vencimiento y rechazaría toda la fila.
            ...((row.expiry || null) !== (row.original?.expiry_date ?? null) ? { expiry_date: row.expiry || null } : {}),
            stock_components: row.original?.stock_components,
            ...(store.price_rounding !== undefined ? { price_rounding: row.rounding } : {}),
            ...(row.original?.price_pending ? { price_pending: false } : {}),
            ...(codesReady ? { display_code: row.displayCode.trim() || null, pack_code: row.packCode.trim() || null, pallet_packs: row.palletPacks.trim() ? Number(row.palletPacks) : null } : {}),
          }, Boolean(row.original), row.original?.stock, operationBranch);
          saved += 1;
          const code = row.code.trim();
          if (!row.original && /^\d{8,14}$/.test(code)) {
            const category = categories.find(item => item.id === row.categoryId);
            void retail.contributeCatalog(code, row.name.trim(), row.brand.trim() || undefined, category?.canonicalName || category?.name || 'Varios', row.emoji, 'community');
          }
        } catch (e) {
          const message = errorMessage(e);
          failed.set(row.key, /display_code|pack_code|pallet_packs/.test(message) ? 'Falta aplicar la actualización 202611060009 en Supabase.' : /display_size|schema cache/.test(message) ? 'Falta aplicar la actualización 202611040005 en Supabase.' : message);
        }
        setSaving(current => current && { ...current, done: current.done + 1 });
      }
    });
    setSaving(null);
    // Otra operación en curso: no se guardó nada y la planilla queda como estaba.
    if (!ran && !saved && !failed.size) return;
    if (saved) notify(failed.size ? 'warning' : 'success', `${saved} ${saved === 1 ? 'producto guardado' : 'productos guardados'}${failed.size ? `. ${failed.size} con error quedaron en la planilla.` : '.'}`);
    if (!failed.size) { onClose(); return; }
    setRows(previous => previous.filter(row => failed.has(row.key) || (!pending.includes(row) && mode === 'edit')).map(row => ({ ...row, error: failed.get(row.key) || '' })));
  };

  const errors = rows.filter(row => row.error);
  const totals = useMemo(() => ({ rows: pending.length }), [pending.length]);
  const disabled = busy || Boolean(saving);

  return <section className="retail-form product-sheet" aria-labelledby="product-sheet-title">
    <div className="product-sheet-head">
      <div>
        <h3 id="product-sheet-title">{mode === 'new' ? 'Agregar productos' : rows.length === 1 ? `Editar ${rows[0].original?.name || 'producto'}` : `Editar ${rows.length} productos en planilla`}</h3>
        <p>Elegí si cargás por unidad, display o bulto: la cantidad y el costo van por esa presentación y se guardan por unidad. El precio sale del costo por unidad y la ganancia.</p>
      </div>
      <button type="button" className="icon-button" aria-label="Cerrar planilla" disabled={Boolean(saving)} onClick={onClose}><X size={18} /></button>
    </div>

    <div className="product-sheet-scroll" role="region" aria-label="Planilla de productos" tabIndex={-1}>
      <table ref={table}>
        <thead><tr>
          <th scope="col" className="col-n">#</th>
          <th scope="col">Código</th>
          <th scope="col" className="col-name">Nombre</th>
          <th scope="col">Categoría</th>
          <th scope="col" title="La cantidad y el costo de la fila se escriben por esta presentación">Compro por</th>
          <th scope="col" title="Cuántas unidades trae">Trae</th>
          {mode === 'new' && <th scope="col" className="num">Cantidad</th>}
          <th scope="col" className="num">Costo</th>
          <th scope="col" className="num">Costo x u.</th>
          {mode === 'new' && <th scope="col" className="num">Stock (u.)</th>}
          <th scope="col" className="num">Ganancia %</th>
          <th scope="col" className="num">Precio</th>
          <th scope="col" className="num">Mínimo</th>
          <th scope="col"><span className="visually-hidden">Acciones</span></th>
        </tr></thead>
        <tbody>{rows.map((row, index) => {
          const { units, perUnit, price, stock } = calc(row);
          const label = row.name || row.code || `fila ${index + 1}`;
          const presentationName = presentationLabels[row.presentation].toLowerCase();
          return <Fragment key={row.key}>
            <tr data-key={row.key} className={`${row.error ? 'has-error' : ''} ${row.original && changed(row) ? 'is-changed' : ''}`}>
              <td className="col-n">{row.error ? <AlertTriangle size={14} aria-label="Con error" /> : index + 1}</td>
              <td data-col="code"><input value={row.code} maxLength={100} inputMode="numeric" autoComplete="off" aria-label={`Código de ${label}`} disabled={disabled}
                onChange={event => update(row.key, { code: event.target.value })} onBlur={() => void lookup(row)} onKeyDown={event => codeKey(event, row)} /></td>
              <td data-col="name" className="col-name"><input value={row.name} maxLength={160} autoComplete="off" aria-label={`Nombre de ${label}`} disabled={disabled}
                onChange={event => update(row.key, { name: event.target.value })} onKeyDown={moveInColumn} /></td>
              <td data-col="category"><select value={row.categoryId} aria-label={`Categoría de ${label}`} disabled={disabled} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { categoryId: event.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td>
              <td data-col="presentation"><select value={row.presentation} aria-label={`Cómo comprás ${label}`} disabled={disabled || isCombo(row)} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { presentation: event.target.value as Presentation })}>
                {(Object.keys(presentationLabels) as Presentation[]).map(option => <option key={option} value={option}>{option === 'unit' ? 'Unidad suelta' : presentationLabels[option]}</option>)}</select></td>
              <td data-col="content" className="col-content">
                {isCombo(row) ? <span className="product-sheet-muted">Combo</span> : row.presentation === 'unit' ? <span className="product-sheet-muted">1 u.</span> : <span className="product-sheet-content">
                  <NumberInput min={1} step={1} value={row.presentation === 'pack' ? row.packUnits : row.displayUnits} placeholder="u." disabled={disabled}
                    aria-label={`Unidades que trae cada ${presentationName} de ${label}`} onKeyDown={moveInColumn}
                    onValueChange={value => update(row.key, row.presentation === 'pack' ? { packUnits: value } : { displayUnits: value })} />
                  <small>u.</small>
                </span>}
              </td>
              {mode === 'new' && <td data-col="qty" className="num"><NumberInput min={0} step={1} value={row.qty} placeholder="0" disabled={disabled} aria-label={`Cantidad en ${presentationName} de ${label}`}
                onKeyDown={moveInColumn} onValueChange={value => update(row.key, { qty: value })} /></td>}
              <td data-col="cost" className="num"><NumberInput min={0} step={0.01} value={row.cost} placeholder={`por ${presentationName}`} disabled={disabled || (!!row.original && hasComposition(row.original))}
                aria-label={`Costo por ${presentationName} de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { cost: value })} /></td>
              <td data-col="unitcost" className="num calc">{perUnit === null ? '—' : money(perUnit)}</td>
              {mode === 'new' && <td data-col="stock" className="num calc">{stock === null ? '—' : stock.toLocaleString('es-AR')}</td>}
              <td data-col="markup" className="num">{!row.sellable ? <span className="product-sheet-muted">Insumo</span> : row.manual
                ? <button type="button" className="text-button" disabled={disabled} onClick={() => useCost(row)}>Calcular por costo</button>
                : <NumberInput min={-99.99} max={10000} step={0.01} value={row.markup} disabled={disabled} aria-label={`Ganancia de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { markup: value })} />}</td>
              <td data-col="price" className={`num ${row.manual ? '' : 'calc'}`}>{!row.sellable ? '—' : row.manual
                ? <NumberInput min={0.01} step={0.01} value={row.price} disabled={disabled} aria-label={`Precio manual de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { price: value })} />
                : price === null ? <span className="product-sheet-muted">—</span> : <strong>{money(price)}</strong>}</td>
              <td data-col="min" className="num"><NumberInput min={0} step={1} value={row.minStock} disabled={disabled} aria-label={`Mínimo de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { minStock: value })} /></td>
              <td className="col-actions">
                <button type="button" className="icon-button" aria-expanded={row.open} aria-label={`Más datos de ${label}`} title="Más datos" disabled={disabled}
                  onClick={() => setRows(previous => previous.map(item => item.key === row.key ? { ...item, open: !item.open } : item))}>{row.open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                {isCombo(row) && onEditComposition && <button type="button" className="icon-button" aria-label={`Componentes de ${label}`} title="Componentes del combo (de ahí sale el costo)" disabled={disabled}
                  onClick={async () => { if (!changed(row) || await askConfirm('Hay cambios sin guardar en la planilla. ¿Abrir los componentes y descartarlos?')) onEditComposition(row.original!); }}><Layers size={15} /></button>}
                {mode === 'new' && <button type="button" className="icon-button" aria-label={`Quitar ${label}`} title="Quitar fila" disabled={disabled} onClick={() => remove(row.key)}><Trash2 size={15} /></button>}
              </td>
            </tr>
            {row.error && <tr className="product-sheet-error-row"><td /><td colSpan={mode === 'new' ? 13 : 11} role="alert">{row.error}</td></tr>}
            {row.open && <tr className="product-sheet-more"><td /><td colSpan={mode === 'new' ? 13 : 11}>
              {!isCombo(row) && <div className="product-sheet-presentations" role="group" aria-label={`Presentaciones de ${label}`}>
                <strong>Presentaciones</strong>
                <PresentationChain displayUnits={row.displayUnits} packUnits={row.packUnits} palletPacks={row.palletPacks} buying={row.presentation} />
                <label>Unidades por display<NumberInput min={1} step={1} value={row.displayUnits} placeholder="No tiene" disabled={disabled} onValueChange={value => update(row.key, { displayUnits: value })} /></label>
                {codesReady && <label>Código del display (EAN-13)<input value={row.displayCode} maxLength={40} inputMode="numeric" autoComplete="off" placeholder="Opcional" disabled={disabled}
                  onChange={event => update(row.key, { displayCode: event.target.value.replace(/\s/g, '') })} />
                  {presentationCodeWarning(row.displayCode, 'display') && <small role="status">{presentationCodeWarning(row.displayCode, 'display')}</small>}</label>}
                <label>Unidades por bulto<NumberInput min={1} step={1} value={row.packUnits} placeholder="No tiene" disabled={disabled} onValueChange={value => update(row.key, { packUnits: value })} />
                  {describe({ ...row, presentation: 'pack' }) && <small>{describe({ ...row, presentation: 'pack' })}</small>}</label>
                {codesReady && <label>Código del bulto (DUN-14)<input value={row.packCode} maxLength={40} inputMode="numeric" autoComplete="off" placeholder="Opcional" disabled={disabled}
                  onChange={event => update(row.key, { packCode: event.target.value.replace(/\s/g, '') })} />
                  {presentationCodeWarning(row.packCode, 'pack') && <small role="status">{presentationCodeWarning(row.packCode, 'pack')}</small>}</label>}
                {codesReady && <label>Bultos por pallet<NumberInput value={row.palletPacks} min="1" max="100000" step="1" placeholder="Opcional" disabled={disabled}
                  onValueChange={value => update(row.key, { palletPacks: value })} />
                  {Number(row.palletPacks) > 0 && Number(row.packUnits) > 0 && <small>Pallet = {(Number(row.palletPacks) * Number(row.packUnits)).toLocaleString('es-AR')} u.</small>}</label>}
                {sizesError(row) && <small role="alert">{sizesError(row)}</small>}
              </div>}
              <div className="product-sheet-ai">
                <button type="button" className="secondary-button ai-action" disabled={disabled || aiRow === row.key} onClick={() => void suggest(row)}>
                  {aiRow === row.key ? <Loader2 size={15} className="spin" /> : <AiIcon />} Completar con IA</button>
                <small>{aiNotes[row.key] ?? 'Sugiere marca, proveedor, categoría, ícono y etiquetas que falten. No cambia precios ni costos.'}</small>
              </div>
              <div className="product-sheet-more-grid">
                <label>Etiquetas<input value={row.tags} maxLength={400} placeholder="Ej. sin TACC, importado" disabled={disabled} onChange={event => update(row.key, { tags: event.target.value })} /></label>
                <label>Marca<input value={row.brand} maxLength={120} disabled={disabled} onChange={event => update(row.key, { brand: event.target.value })} /></label>
                <label>Proveedor<input value={row.supplier} maxLength={120} disabled={disabled} onChange={event => update(row.key, { supplier: event.target.value })} /></label>
                <label>Código del proveedor<input value={row.supplierCode} maxLength={120} disabled={disabled} onChange={event => update(row.key, { supplierCode: event.target.value })} /></label>
                <label>Vencimiento<input type="date" value={row.expiry} disabled={disabled} onChange={event => update(row.key, { expiry: event.target.value })} /></label>
                <label>Uso<select value={row.sellable ? 'sale' : 'ingredient'} disabled={disabled} onChange={event => update(row.key, { sellable: event.target.value === 'sale' })}>
                  <option value="sale">Para vender</option><option value="ingredient">Solo insumo</option></select></label>
                <label>Se vende por<select value={row.unitType} disabled={disabled} onChange={event => update(row.key, { unitType: event.target.value })}>
                  {Object.entries(unitTypes).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
                <label>Emoji<input value={row.emoji} maxLength={8} disabled={disabled} onChange={event => update(row.key, { emoji: event.target.value })} /></label>
                {row.sellable && !row.manual && store.price_rounding !== undefined && <ProductRoundingField value={row.rounding} storeStep={storeStep} disabled={disabled} onChange={rounding => update(row.key, { rounding })} />}
              </div>
              {row.sellable && <div className="price-mode-row">
                {row.manual ? <small>Precio manual: no sigue al costo ni se redondea.</small> : <small>El precio sigue al costo{describe(row) ? ` (${describe(row)})` : ''}.</small>}
                {!row.manual && <button type="button" className="text-button" disabled={disabled} onClick={() => void requestManual(row)}>Poner precio manual</button>}
              </div>}
            </td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>

    <div className="product-sheet-footer">
      {mode === 'new' && <button type="button" className="text-button" disabled={disabled} onClick={() => setRows(previous => [...previous, blank()])}><Plus size={15} /> Agregar fila</button>}
      <small>Enter o las flechas pasan a la misma columna de la fila de abajo. El lector de códigos salta solo al nombre.</small>
      {errors.length > 0 && <p role="alert" className="product-sheet-errors">{errors.length} {errors.length === 1 ? 'fila tiene' : 'filas tienen'} errores: revisalas antes de guardar.</p>}
      {saving && <p role="status"><Loader2 size={15} className="spin" /> Guardando {saving.done} de {saving.total}…</p>}
      <div className="product-sheet-actions">
        <button type="button" className="secondary-button" disabled={Boolean(saving)} onClick={onClose}>Cancelar</button>
        <button type="button" className="primary-button" disabled={disabled || !totals.rows} onClick={() => void save()}>
          {totals.rows ? `Guardar ${totals.rows} ${totals.rows === 1 ? 'producto' : 'productos'}` : mode === 'edit' ? 'Sin cambios' : 'Guardar'}</button>
      </div>
    </div>
  </section>;
}
