import { useCallback, useEffect, type KeyboardEvent } from 'react';
import { randomUUID } from '../../../utils/uuid';
import { errorMessage, retail, type Product } from '../api';
import { locationTransfers, type LocationTransfer, type FundTransfer, type LocationFund, type OpenShiftCash, type MoneyAccount } from '../locationTransferApi';
import type { HistoryStock, SheetSort } from './transferHelpers';
import type { LocationTransfersProps } from './useLocationTransfers';
import type { useTransferState } from './useTransferState';

/** Cargar historial, ejecutar acciones y enviar transferencias. */
export function useTransferActions(ctx: LocationTransfersProps & ReturnType<typeof useTransferState>) {
  const {
    store, run, active, canStock, canFunds, mode, setMode, setComposing, stockFrom, stockTo, items,
    setItems, notes, setNotes, setQuery, setSheetSort, fundFrom, setFundFrom, fundTo, setFundTo,
    fundKind, setFundKind, amount, setAmount, fundNote, setFundNote, setStockHistory, setStockSummary,
    setFundHistory, setFunds, setFundsLoaded, setOpenCash, setAccounts, setAccountsMissing,
    setStockError, setFundError, setFormError, setActionError, setLoading, setSaving, setFilter,
    setStockMore, setFundMore, setStockCursor, setFundCursor, generation, working, stockRequest,
    fundRequest, search, form, disabled, places, moneyPlaces, placeName, byId, atLocation, missing,
    suggested, quantityOf,
  } = ctx;
  const load = useCallback(async () => {
    const turn = ++generation.current;
    setLoading(true);
    const results = await Promise.allSettled([
      canStock ? locationTransfers.stockHistory(store.id) : Promise.resolve([] as LocationTransfer[]),
      canStock ? retail.stockTransfers(store.id) : Promise.resolve([]),
      canFunds ? locationTransfers.funds(store.id) : Promise.resolve([] as LocationFund[]),
      canFunds ? locationTransfers.fundHistory(store.id) : Promise.resolve([] as FundTransfer[]),
      canStock ? locationTransfers.stockSummary(store.id) : Promise.resolve([] as { location: string; quantity: number }[]),
      canFunds ? locationTransfers.openShiftCash(store.id) : Promise.resolve([] as OpenShiftCash[]),
      canFunds ? locationTransfers.accounts(store.id) : Promise.resolve([] as MoneyAccount[] | null),
    ]);
    if (turn !== generation.current) return;
    const [stock, legacy, balances, cash, inventory, shiftCash, moneyAccounts] = results;
    setOpenCash(shiftCash.status === 'fulfilled' ? shiftCash.value : []);
    if (moneyAccounts.status === 'fulfilled') { setAccounts(moneyAccounts.value ?? []); setAccountsMissing(moneyAccounts.value === null); }
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
    if ((quantityOf.get(product.id) || 0) >= atLocation(product, stockFrom)) { setFormError(`No hay más ${product.name} en ${placeName(stockFrom)}.`); return; }
    setFormError('');
    setItems(previous => previous.some(item => item.product_id === product.id) ? previous.map(item => item.product_id === product.id ? { ...item, qty: Math.min(1000000, item.qty + 1) } : item) : [...previous, { product_id: product.id, qty: 1 }]);
    setQuery(''); search.current?.focus();
  };
  const setQuantity = (product: Product, value: string) => {
    const qty = Math.min(Math.floor(Number(value)) || 0, atLocation(product, stockFrom));
    setFormError('');
    setItems(previous => qty <= 0 ? previous.filter(item => item.product_id !== product.id)
      : previous.some(item => item.product_id === product.id) ? previous.map(item => item.product_id === product.id ? { ...item, qty } : item)
      : previous.length >= 200 ? previous : [...previous, { product_id: product.id, qty }]);
    if (qty > 0 && !quantityOf.has(product.id) && items.length >= 200) setFormError('Podés incluir hasta 200 productos.');
  };
  const sortBy = (key: SheetSort, numeric?: boolean) => setSheetSort(previous => previous.key === key ? { key, descending: !previous.descending } : { key, descending: !!numeric });
  const moveCell = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!['Enter', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const cells = [...(form.current?.querySelectorAll<HTMLInputElement>('.location-transfer-sheet input') ?? [])];
    const next = cells[cells.indexOf(event.currentTarget) + (event.key === 'ArrowUp' ? -1 : 1)];
    next?.focus(); next?.select();
  };
  const addMissing = () => {
    if (disabled) return;
    const pending = missing.filter(product => !quantityOf.has(product.id));
    const fresh = pending.slice(0, 200 - items.length);
    setItems(previous => [...previous, ...fresh.map(product => ({ product_id: product.id, qty: suggested(product) }))]);
    setFormError(fresh.length < pending.length ? 'Podés incluir hasta 200 productos. Agregá el resto en otra transferencia.' : '');
  };
  const submit = async (now = true) => {
    if (disabled || working.current) return;
    if (mode === 'stock') {
      if (!canStock || !store.branch_inventory_enabled || !places.some(place => place.id === stockFrom) || !places.some(place => place.id === stockTo) || stockFrom === stockTo || !items.length
        || items.some(item => !byId.has(item.product_id) || !Number.isSafeInteger(item.qty) || item.qty <= 0 || item.qty > 1000000)) { setFormError('Elegí dos ubicaciones diferentes y productos con cantidades enteras positivas.'); return; }
      const signature = JSON.stringify([store.id, stockFrom, stockTo, [...items].sort((a, b) => a.product_id.localeCompare(b.product_id)), notes.trim()]);
      if (stockRequest.current.signature !== signature) stockRequest.current = { signature, id: randomUUID() };
      const created = async () => {
        await locationTransfers.create(store.id, stockFrom, stockTo, items, notes, stockRequest.current.id);
        if (now) await locationTransfers.review(store.id, stockRequest.current.id, true);
      };
      if (await execute('stock', created, now ? 'Stock trasladado entre ubicaciones' : 'Transferencia pendiente registrada')) {
        setItems([]); setNotes(''); setQuery(''); stockRequest.current = { signature: '', id: '' }; setComposing(false); setFilter('all');
      }
    } else {
      const from = fundKind === 'income' ? null : fundFrom, to = fundKind === 'withdrawal' ? null : fundTo;
      const numeric = Number(amount);
      if (!canFunds || (from !== null && !moneyPlaces.some(place => place.id === from)) || (to !== null && !moneyPlaces.some(place => place.id === to)) || from === to || !Number.isFinite(numeric) || numeric <= 0 || numeric > 999999999999.99 || !fundNote.trim()) { setFormError('Elegí ubicaciones diferentes, un importe positivo y el motivo.'); return; }
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
  const openFund = (kind: typeof fundKind, location: string) => {
    setFundKind(kind);
    if (kind !== 'income') setFundFrom(location);
    if (kind !== 'transfer') setFundTo(location);
    if (kind === 'transfer') setFundTo(previous => previous === location ? '' : previous);
    setComposing(true); setFormError('');
  };
  return { load, execute, add, setQuantity, sortBy, moveCell, addMissing, submit, review, openFund };
}
