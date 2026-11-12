import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasComposition } from '../../../services/productComposition';
import { errorMessage, type Branch, type Product } from '../api';
import { stockCounts, type LineChange, type StockCount as Count, type StockCountLine } from '../stockCountApi';
import type { View, SheetSort } from './stockCountHelpers';
import type { StockCountProps } from './useStockCount';

/** Conteo abierto, renglones cargados, filtros y guardado automático. */
export function useStockCountState(ctx: StockCountProps) {
  const { store, branches, products, categories, busy, active } = ctx;
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

  return { counts, setCounts, current, setCurrent, lines, setLines, drafts, setDrafts, saving, setSaving, saveError, setSaveError, loadError, setLoadError, loading, setLoading, location, setLocation, category, setCategory, brand, setBrand, notes, setNotes, query, setQuery, view, setView, touched, setTouched, sort, setSort, sheetText, setSheetText, sheetMessage, setSheetMessage, history, setHistory, startRequest, timer, searchRef, disabled, places, placeName, categoryName, sameBrand, sectionName, countable, brands, sectionSize, scope, systemAt, load, open, flush };
}
