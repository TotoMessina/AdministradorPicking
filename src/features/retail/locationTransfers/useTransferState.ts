import { useCallback, useMemo, useRef, useState } from 'react';
import { hasComposition } from '../../../services/productComposition';
import { normalizeSupplierText } from '../../../services/supplierMappingService';
import type { Product } from '../api';
import type { LocationTransfer, FundTransfer, LocationFund, OpenShiftCash, MoneyAccount } from '../locationTransferApi';
import type { MovementReceiptData } from '../MovementReceipt';
import type { HistoryStock, SheetSort } from './transferHelpers';
import type { LocationTransfersProps } from './useLocationTransfers';

/** Modo, ubicaciones, planilla de productos, cuentas e historial. */
export function useTransferState(ctx: LocationTransfersProps) {
  const { branches, products, busy, active, canStock, only } = ctx;
  const [mode, setMode] = useState<'stock' | 'money'>(only ?? (canStock ? 'stock' : 'money'));
  const [composing, setComposing] = useState(false);
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [stockFrom, setStockFrom] = useState('depot');
  const [stockTo, setStockTo] = useState('');
  const [items, setItems] = useState<{ product_id: string; qty: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [pickView, setPickView] = useState<'missing' | 'all' | 'chosen'>('missing');
  const [sheetSort, setSheetSort] = useState<{ key: SheetSort; descending: boolean }>({ key: 'name', descending: false });
  const [pickCategory, setPickCategory] = useState('');
  const [fundFrom, setFundFrom] = useState('depot');
  const [fundTo, setFundTo] = useState('');
  const [fundKind, setFundKind] = useState<'transfer' | 'income' | 'withdrawal'>('transfer');
  const [amount, setAmount] = useState('');
  const [fundNote, setFundNote] = useState('');
  const [initialBranch, setInitialBranch] = useState(branches.length === 1 ? branches[0].id : '');
  const [stockHistory, setStockHistory] = useState<HistoryStock[]>([]);
  const [stockSummary, setStockSummary] = useState<{ location: string; quantity: number }[] | null>(null);
  const [fundHistory, setFundHistory] = useState<FundTransfer[]>([]);
  const [receipt, setReceipt] = useState<MovementReceiptData | null>(null);
  const [funds, setFunds] = useState<LocationFund[]>([]);
  const [fundsLoaded, setFundsLoaded] = useState(false);
  const [openCash, setOpenCash] = useState<OpenShiftCash[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [accountEditor, setAccountEditor] = useState<MoneyAccount | 'new' | null>(null);
  const [accountsMissing, setAccountsMissing] = useState(false);
  const [stockError, setStockError] = useState('');
  const [fundError, setFundError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [filter, setFilter] = useState<'all' | LocationTransfer['status']>('all');
  const [stockMore, setStockMore] = useState(false);
  const [fundMore, setFundMore] = useState(false);
  const [stockCursor, setStockCursor] = useState<LocationTransfer | undefined>();
  const [fundCursor, setFundCursor] = useState<FundTransfer | undefined>();
  const [visible, setVisible] = useState(25);
  const generation = useRef(0);
  const working = useRef(false);
  const stockRequest = useRef({ signature: '', id: '' });
  const fundRequest = useRef({ signature: '', id: '' });
  const search = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const disabled = busy || !!saving || !active;
  const places = useMemo(() => [{ id: 'depot', name: 'Depósito' }, ...branches], [branches]);
  // En Dinero, las cuentas de banco o billetera son una ubicación más.
  const moneyPlaces = useMemo(() => [...places, ...accounts.map(account => ({ id: account.id, name: account.name }))], [places, accounts]);
  const accountOf = (id: string) => accounts.find(account => account.id === id);
  const balanceOf = (id: string) => accountOf(id)?.balance ?? (funds.find(fund => fund.location === id)?.balance || 0);
  const placeName = (id: string | null) => id === null ? 'Exterior' : moneyPlaces.find(place => place.id === id)?.name || 'Ubicación anterior';
  const catalog = useMemo(() => products.filter(product => product.active !== false && !hasComposition(product)), [products]);
  const byId = useMemo(() => new Map(catalog.map(product => [product.id, product])), [catalog]);
  const searchText = normalizeSupplierText(query);
  const atLocation = useCallback((product: Product, id: string) => id === 'depot' ? product.depotStock || 0 : product.branchStocks?.[id] || 0, []);
  // Lo que el destino necesita y el origen tiene: la lista se puede recorrer sin buscar.
  const inOrigin = useMemo(() => catalog.filter(product => atLocation(product, stockFrom) > 0).sort((a, b) => a.name.localeCompare(b.name)), [catalog, stockFrom, atLocation]);
  const missing = useMemo(() => stockTo ? inOrigin.filter(product => atLocation(product, stockTo) <= product.minStock) : [], [inOrigin, stockTo, atLocation]);
  const suggested = (product: Product) => Math.min(atLocation(product, stockFrom), Math.max(product.minStock - atLocation(product, stockTo), 1));
  const categories = useMemo(() => [...new Set(inOrigin.map(product => product.category))].filter(Boolean).sort(), [inOrigin]);
  const quantityOf = new Map(items.map(item => [item.product_id, item.qty]));
  const shownView = pickView === 'chosen' && items.length ? 'chosen' : pickView === 'missing' && missing.length ? 'missing' : 'all';
  const needAt = (product: Product) => stockTo ? Math.max(product.minStock - atLocation(product, stockTo), 0) : 0;
  const sheetValue = (product: Product, key: SheetSort) => key === 'name' ? product.name : key === 'code' ? product.code : key === 'category' ? product.category
    : key === 'origin' ? atLocation(product, stockFrom) : key === 'destination' ? (stockTo ? atLocation(product, stockTo) : 0)
    : key === 'min' ? product.minStock : key === 'need' ? needAt(product) : quantityOf.get(product.id) || 0;
  const matches = (searchText ? catalog.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(searchText)) : shownView === 'chosen' ? catalog.filter(product => quantityOf.has(product.id)) : shownView === 'missing' ? missing : inOrigin)
    .filter(product => !pickCategory || product.category === pickCategory)
    .sort((a, b) => {
      const left = sheetValue(a, sheetSort.key), right = sheetValue(b, sheetSort.key);
      const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'es', { numeric: true });
      return (sheetSort.descending ? -order : order) || a.name.localeCompare(b.name);
    });
  const units = items.reduce((total, item) => total + item.qty, 0);

  return { mode, setMode, composing, setComposing, selectedNode, setSelectedNode, selectedRoute, setSelectedRoute, stockFrom, setStockFrom, stockTo, setStockTo, items, setItems, notes, setNotes, query, setQuery, pickView, setPickView, sheetSort, setSheetSort, pickCategory, setPickCategory, fundFrom, setFundFrom, fundTo, setFundTo, fundKind, setFundKind, amount, setAmount, fundNote, setFundNote, initialBranch, setInitialBranch, stockHistory, setStockHistory, stockSummary, setStockSummary, fundHistory, setFundHistory, receipt, setReceipt, funds, setFunds, fundsLoaded, setFundsLoaded, openCash, setOpenCash, accounts, setAccounts, accountEditor, setAccountEditor, accountsMissing, setAccountsMissing, stockError, setStockError, fundError, setFundError, formError, setFormError, actionError, setActionError, loading, setLoading, saving, setSaving, filter, setFilter, stockMore, setStockMore, fundMore, setFundMore, stockCursor, setStockCursor, fundCursor, setFundCursor, visible, setVisible, generation, working, stockRequest, fundRequest, search, form, disabled, places, moneyPlaces, accountOf, balanceOf, placeName, catalog, byId, searchText, atLocation, inOrigin, missing, suggested, categories, quantityOf, shownView, needAt, sheetValue, matches, units };
}
