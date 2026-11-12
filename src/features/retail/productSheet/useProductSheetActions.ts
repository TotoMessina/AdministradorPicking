import { useMemo, type KeyboardEvent } from 'react';
import { askConfirm } from '../../../components/ConfirmHost';
import { markupFromPrice } from '../../../services/productSalePrice';
import { presentationCodeConflict, sizesError, storedSizes } from '../../../services/productPresentation';
import { resolveProductCategory } from '../../../services/productCategoryService';
import { compositionCost } from '../../../services/productComposition';
import { errorMessage, retail } from '../api';
import { type Row, tagList } from './productSheetHelpers';
import type { ProductSheetProps } from './useProductSheet';
import type { useProductSheetRows } from './useProductSheetRows';

/** Validar, buscar el código en el catálogo y guardar. */
export function useProductSheetActions(ctx: ProductSheetProps & ReturnType<typeof useProductSheetRows>) {
  const {
    mode, store, products, categories, busy, run, operationBranch, onClose, notify, defaultMarkup,
    isCombo, rows, setRows, saving, setSaving, table, lookups, update, calc, filled, codesReady, pending,
  } = ctx;
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

  return { validate, requestManual, useCost, lookup, moveInColumn, codeKey, save, errors, totals, disabled };
}
