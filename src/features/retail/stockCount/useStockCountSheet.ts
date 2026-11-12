import type { KeyboardEvent } from 'react';
import { askConfirm } from '../../../components/ConfirmHost';
import { randomUUID } from '../../../utils/uuid';
import { normalizeSupplierText } from '../../../services/supplierMappingService';
import { errorMessage, type Product } from '../api';
import { parseCountSheet, stockCounts, type LineChange, type StockCount as Count } from '../stockCountApi';
import { money, type SheetSort } from './stockCountHelpers';
import type { StockCountProps } from './useStockCount';
import type { useStockCountState } from './useStockCountState';

/** Planilla: valores, orden, lector de códigos y acciones del conteo. */
export function useStockCountSheet(ctx: StockCountProps & ReturnType<typeof useStockCountState>) {
  const {
    store, products, run, canConfirm, counts, setCounts, current, setCurrent, lines, drafts, setDrafts,
    setSaveError, setLoadError, location, category, brand, setBrand, notes, setNotes, query, setQuery,
    view, setView, touched, setTouched, sort, setSheetText, setSheetMessage, history, setHistory,
    startRequest, searchRef, placeName, scope, systemAt, load, open, flush,
  } = ctx;
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

  return { valueOf, reasonOf, noteOf, expectedOf, differenceOf, viewKey, kept, change, setCounted, counted, different, missingReason, loss, searchText, sortValue, shown, columns, scan, importSheet, moveCell, start, confirm, cancel, showHistory, productName, openCounts };
}
