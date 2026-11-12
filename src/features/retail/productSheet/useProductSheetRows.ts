import { useRef, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { draftMarkupPrice } from '../../../services/productSalePrice';
import { sizesOf, unitCost, unitsIn } from '../../../services/productPresentation';
import { defaultProductCategory, resolveProductCategory } from '../../../services/productCategoryService';
import { compositionCost, hasComposition } from '../../../services/productComposition';
import type { Product } from '../api';
import { groqChat } from '../../../services/groqService';
import { extractJson, type ProductSuggestion } from '../catalogEditorShared';
import { type Row, type Field, nextKey } from './productSheetHelpers';
import type { ProductSheetProps } from './useProductSheet';

/** Renglones de la planilla, avance del guardado y cálculo de precios. */
export function useProductSheetRows(ctx: ProductSheetProps) {
  const { mode, store, products, categories, initial } = ctx;
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

  return { notify, storeStep, defaultMarkup, blank, fromProduct, editable, isCombo, rows, setRows, saving, setSaving, aiRow, setAiRow, aiNotes, setAiNotes, suggest, table, lookups, update, remove, calc, filled, codesReady, changed, pending };
}
