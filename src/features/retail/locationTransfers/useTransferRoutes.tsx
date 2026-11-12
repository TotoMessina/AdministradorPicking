import { useMemo } from 'react';
import { errorMessage } from '../api';
import { locationTransfers } from '../locationTransferApi';
import { accountKinds } from '../MoneyAccountEditor';
import type { TransferMapRoute } from '../TransferFlowMap';
import { money, transferKey } from './transferHelpers';
import type { LocationTransfersProps } from './useLocationTransfers';
import type { useTransferState } from './useTransferState';
import type { useTransferActions } from './useTransferActions';

/** Mapa de movimientos e historial filtrado. */
export function useTransferRoutes(ctx: LocationTransfersProps & ReturnType<typeof useTransferState> & ReturnType<typeof useTransferActions>) {
  const {
    store, branches, mode, setComposing, selectedNode, setSelectedNode, selectedRoute, setSelectedRoute,
    setStockFrom, stockTo, setStockTo, items, notes, fundFrom, setFundFrom, fundTo, setFundTo, fundKind,
    amount, fundNote, stockHistory, setStockHistory, stockSummary, fundHistory, setFundHistory, funds,
    fundsLoaded, stockError, fundError, setFormError, setActionError, loading, setLoading, filter,
    setStockMore, setFundMore, stockCursor, setStockCursor, fundCursor, setFundCursor, setVisible,
    generation, form, disabled, places, accountOf, balanceOf,
  } = ctx;
  // Entre ubicaciones, el destino recién suma cuando se confirma lo que llegó.
  const fundPreview = [fundKind === 'income' ? null : { id: fundFrom, sign: -1 }, fundKind === 'withdrawal' || fundKind === 'transfer' ? null : { id: fundTo, sign: 1 }]
    .filter((row): row is { id: string; sign: number } => !!row?.id)
    .map(row => { const before = balanceOf(row.id); return { id: row.id, before, after: before + row.sign * (Number(amount) || 0) }; });
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
    if (mode === 'stock' && !items.length && !selectedNode && stockSummary) {
      const fullest = [...stockSummary].sort((a, b) => Number(b.quantity) - Number(a.quantity))[0]?.location;
      const others = branches.filter(branch => branch.id !== fullest);
      if (fullest && places.some(place => place.id === fullest)) setStockFrom(fullest);
      if (others.length === 1) setStockTo(others[0].id);
    }
    if (selectedNode && (mode === 'stock' ? !items.length && !notes : !amount && !fundNote)) {
      if (mode === 'stock') { setStockFrom(selectedNode); if (stockTo === selectedNode) setStockTo(''); }
      else { setFundFrom(selectedNode); if (fundTo === selectedNode) setFundTo(''); }
    }
    setComposing(true); setFormError('');
    requestAnimationFrame(() => { const field = form.current?.querySelector<HTMLElement>('select, input'); if (field?.getClientRects().length) field.focus(); });
  };
  const locationSelect = (label: string, value: string, setValue: (value: string) => void, exclude?: string, list = places) => <label>{label}<select required value={value} onChange={event => setValue(event.target.value)}>
    <option value="">Elegir ubicación</option>{list.filter(place => place.id !== exclude).map(place => <option key={place.id} value={place.id}>{place.name}{accountOf(place.id) ? ` (${accountKinds[accountOf(place.id)!.kind].toLowerCase()})` : ''}</option>)}
  </select></label>;

  return { fundPreview, clearSelection, routes, nodes, matchesLocation, shownStock, shownFunds, more, newTransfer, locationSelect };
}
