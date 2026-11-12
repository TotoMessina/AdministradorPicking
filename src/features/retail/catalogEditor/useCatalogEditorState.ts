import { useState, useMemo, useEffect, useRef, useId, useCallback } from 'react';
import { productsAtBranch, stockForSale } from '../../../services/productComposition';
import type { Product } from '../api';
import { useToast } from '../../../context/ToastContext';
import { type CatalogColumnId, DEFAULT_VISIBLE_COLUMNS, getStoredCatalogColumns } from '../catalogEditorShared';
import type { CatalogEditorProps } from './catalogEditorProps';

/** Estado de la planilla: sucursal, columnas, página, permisos, edición e historial. */
export function useCatalogEditorState(props: CatalogEditorProps) {
  const {
  store,
  categories,
  products,
  run,
  busy,
  allSales = [],
  role = "admin",
  pendingRemitos = [],
  pendingRemitoError = '',
  branches = [],
  initialBranchId,
  onRefreshRemitos = () => {},
  onReviewedRemito = () => {},
  guided = false,
  active = true,
  allowRestock = false,
  allowPriceEdit = false,
  permissions = [],
  invoiceRequest = 0,
  onInvoiceRequestClosed,
} = props;
  const { notify } = useToast();
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockBranchId, setStockBranchId] = useState(initialBranchId || branches.find(branch => branch.is_default)?.id || branches[0]?.id || '');
  useEffect(() => {
    if (!stockBranchId && branches.length) setStockBranchId(initialBranchId || branches.find(branch => branch.is_default)?.id || branches[0].id);
  }, [stockBranchId, initialBranchId, branches]);
  useEffect(() => { if (initialBranchId) setStockBranchId(initialBranchId); }, [initialBranchId]);
  const operationBranch = store.branch_inventory_enabled ? stockBranchId : undefined;
  const branchUnits = useMemo(() => operationBranch ? new Map(productsAtBranch(products, operationBranch).map(product => [product.id, stockForSale(product)])) : null, [products, operationBranch]);
  const unitsHere = useCallback((product: Product) => branchUnits?.get(product.id) ?? stockForSale(product), [branchUnits]);
  // El inicio guiado abre la planilla de alta, igual que «Agregar → Productos».
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [stockFilter, setStockFilter] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<CatalogColumnId, boolean>>(() =>
    getStoredCatalogColumns(store.id)
  );
  const columnsDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setVisibleColumns(getStoredCatalogColumns(store.id));
  }, [store.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (columnsDetailsRef.current?.open && !columnsDetailsRef.current.contains(e.target as Node)) {
        columnsDetailsRef.current.removeAttribute('open');
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleToggleColumn = (colId: CatalogColumnId) => {
    setVisibleColumns((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (prev[colId] && checkedCount <= 1) {
        return prev;
      }
      const next = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem(`kiosco_catalog_columns_${store.id}`, JSON.stringify(next));
      } catch {
        // storage fallback
      }
      return next;
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS });
    try {
      localStorage.removeItem(`kiosco_catalog_columns_${store.id}`);
    } catch {
      // storage fallback
    }
  };

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);
  const [lowMarginFilter, setLowMarginFilter] = useState(false);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const csvTitleId = useId();
  useEffect(() => {
    if (!active) return;
    const dialog = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="dialog"]') || []).find(element => element.getClientRects().length > 0);
    if (dialog) {
      dialog.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])')?.focus();
      return;
    }
  }, [adding, editing, active]);
  useEffect(() => {
    if (!active || busy || adding || editing || !editorTrigger.current || editorTrigger.current.closest('[hidden]')) return;
    editorTrigger.current.focus();
    editorTrigger.current = null;
  }, [adding, editing, active, busy]);

  const storeRounding = store.price_rounding ?? 0;
  // Sub-feature B: Modal Ajuste de Precios en Bloque states
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkFilterCategory, setBulkFilterCategory] = useState("");
  const [bulkFilterBrand, setBulkFilterBrand] = useState("");
  const [bulkFilterSupplier, setBulkFilterSupplier] = useState("");
  const [bulkFilterSelectedTags, setBulkFilterSelectedTags] = useState<string[]>([]);
  const [bulkAdjustMode, setBulkAdjustMode] = useState<
    "increase_pct" | "decrease_pct" | "fixed_margin" | "absolute_price"
  >("increase_pct");
  const [bulkAdjustValue, setBulkAdjustValue] = useState<string>("15");
  const [bulkRoundMultiple, setBulkRoundMultiple] = useState<number>(0);
  // Con la actualización 202611030007 el ajuste masivo cambia la ganancia sobre costo, no el precio.
  const costBulk = store.price_rounding !== undefined;
  const [bulkMarkupMode, setBulkMarkupMode] = useState<'set' | 'raise' | 'lower'>('raise');
  const [bulkMarkupValue, setBulkMarkupValue] = useState('5');
  const [bulkRounding, setBulkRounding] = useState('keep');
  const [bulkIsUpdating, setBulkIsUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const seenInvoiceRequest = useRef(invoiceRequest);
  const invoiceFromSuppliers = useRef(false);
  useEffect(() => {
    if (invoiceRequest === seenInvoiceRequest.current) return;
    seenInvoiceRequest.current = invoiceRequest;
    invoiceFromSuppliers.current = true;
    setIsInvoiceModalOpen(true);
  }, [invoiceRequest]);

  const canEditCatalog = !role || role === "owner" || role === "admin" || permissions.includes('manage_products');
  const isManager = !role || role === 'owner' || role === 'admin';
  const can = (action: import('../permissions').Permission) => isManager || permissions.includes(action);
  const canRestock = canEditCatalog || allowRestock;
  const canCompose = can('manage_compositions');
  const canDelete = can('delete_products');
  const [newCompositeOpen, setNewCompositeOpen] = useState(false);
  const [catalogAddOpen, setCatalogAddOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Product | null>(null);
  const [evolutionOpen, setEvolutionOpen] = useState(false);
  const evolutionTrigger = useRef<HTMLElement | null>(null);
  const closeEvolution = () => {
    setEvolutionOpen(false);
    requestAnimationFrame(() => { if (evolutionTrigger.current?.isConnected) evolutionTrigger.current.focus(); else catalogSearch.current?.focus(); });
  };
  const historyTrigger = useRef<HTMLElement | null>(null);
  const canSeeHistory = canEditCatalog || can('edit_prices');
  const openHistory = (product: Product, trigger: HTMLElement) => { historyTrigger.current = trigger; setHistoryTarget(product); };
  const closeHistory = () => {
    setHistoryTarget(null);
    requestAnimationFrame(() => { if (historyTrigger.current?.isConnected) historyTrigger.current.focus(); });
  };
  // Planilla de productos: alta de uno o varios, o edición de los que se ven en la lista.
  const [sheet, setSheet] = useState<{ mode: 'new' } | { mode: 'edit'; products: Product[] } | null>(guided ? { mode: 'new' } : null);
  const productEditing = canEditCatalog && (adding || !!editing || (newCompositeOpen && canCompose) || catalogAddOpen || !!sheet);
  const closeCatalogAdd = () => {
    setCatalogAddOpen(false);
    requestAnimationFrame(() => { if (editorTrigger.current?.getClientRects().length) editorTrigger.current.focus(); else catalogSearch.current?.focus(); });
  };
  const closeNewComposite = () => {
    setNewCompositeOpen(false);
    requestAnimationFrame(() => { if (editorTrigger.current?.getClientRects().length) editorTrigger.current.focus(); else catalogSearch.current?.focus(); });
  };
  const [deletionTarget, setDeletionTarget] = useState<Product | null>(null);
  const [deletionHistoryOpen, setDeletionHistoryOpen] = useState(false);
  const deletionEditing = canDelete && (!!deletionTarget || deletionHistoryOpen);
  const catalogSearch = useRef<HTMLInputElement>(null);
  const closeDeletion = () => {
    setDeletionTarget(null); setDeletionHistoryOpen(false);
    requestAnimationFrame(() => {
      if (editorTrigger.current?.getClientRects().length) editorTrigger.current.focus();
      else if (catalogSearch.current?.getClientRects().length) catalogSearch.current.focus();
    });
  };
  const [priceTarget, setPriceTarget] = useState<Product | null>(null);
  const [compositionTarget, setCompositionTarget] = useState<Product | null>(null);
  const [newCompositionProduct, setNewCompositionProduct] = useState(false);
  const compositionEditing = canCompose && !!compositionTarget;
  const closeCompositionEditor = () => {
    setCompositionTarget(null);
    requestAnimationFrame(() => { if (editorTrigger.current?.getClientRects().length) editorTrigger.current.focus(); });
  };
  const priceEditing = !canEditCatalog && allowPriceEdit && !!priceTarget;
  const closePriceEditor = () => { setPriceTarget(null); requestAnimationFrame(() => editorTrigger.current?.focus()); };
  const restockRequest = useRef({ signature: '', id: '', at: '' });

  return { store, categories, products, run, busy, allSales, role, pendingRemitos, pendingRemitoError, branches, initialBranchId, onRefreshRemitos, onReviewedRemito, guided, active, allowRestock, allowPriceEdit, permissions, invoiceRequest, onInvoiceRequestClosed, notify, editing, setEditing, stockBranchId, setStockBranchId, operationBranch, branchUnits, unitsHere, adding, setAdding, query, setQuery, page, setPage, pageSize, setPageSize, stockFilter, setStockFilter, tableScrollRef, visibleColumns, setVisibleColumns, columnsDetailsRef, handleToggleColumn, handleResetColumns, lowMarginFilter, setLowMarginFilter, editorTrigger, panelRef, csvTitleId, storeRounding, isBulkPriceModalOpen, setIsBulkPriceModalOpen, bulkFilterCategory, setBulkFilterCategory, bulkFilterBrand, setBulkFilterBrand, bulkFilterSupplier, setBulkFilterSupplier, bulkFilterSelectedTags, setBulkFilterSelectedTags, bulkAdjustMode, setBulkAdjustMode, bulkAdjustValue, setBulkAdjustValue, bulkRoundMultiple, setBulkRoundMultiple, costBulk, bulkMarkupMode, setBulkMarkupMode, bulkMarkupValue, setBulkMarkupValue, bulkRounding, setBulkRounding, bulkIsUpdating, setBulkIsUpdating, bulkProgress, setBulkProgress, isInvoiceModalOpen, setIsInvoiceModalOpen, seenInvoiceRequest, invoiceFromSuppliers, canEditCatalog, isManager, can, canRestock, canCompose, canDelete, newCompositeOpen, setNewCompositeOpen, catalogAddOpen, setCatalogAddOpen, historyTarget, setHistoryTarget, evolutionOpen, setEvolutionOpen, evolutionTrigger, closeEvolution, historyTrigger, canSeeHistory, openHistory, closeHistory, sheet, setSheet, productEditing, closeCatalogAdd, closeNewComposite, deletionTarget, setDeletionTarget, deletionHistoryOpen, setDeletionHistoryOpen, deletionEditing, catalogSearch, closeDeletion, priceTarget, setPriceTarget, compositionTarget, setCompositionTarget, newCompositionProduct, setNewCompositionProduct, compositionEditing, closeCompositionEditor, priceEditing, closePriceEditor, restockRequest };
}
