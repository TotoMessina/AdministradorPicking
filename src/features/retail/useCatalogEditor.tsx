import { askConfirm } from '../../components/ConfirmHost';
import { markupFromPrice, priceFromMarkup } from '../../services/productSalePrice';
import { useState, useMemo, useEffect, useRef, useId, useCallback } from "react";
import { hasComposition, productsAtBranch, stockForSale } from '../../services/productComposition';
import { errorMessage } from './api';
import { History, X } from "lucide-react";
import { groqChat } from "../../services/groqService";
import { unitsPerPack } from '../../services/inventoryUnits';
import { replenishmentService, type StockReplenishment, type CsvParseResult } from "../../services/replenishmentService";
import type { KioscoSale } from "../../types/kiosco";
import type { Category, Product, Store, Role, Branch, PendingReplenishment } from "./api";
import { retail } from "./api";
import { randomUUID } from "../../utils/uuid";
import { useToast } from "../../context/ToastContext";
import { type CatalogColumnId, DEFAULT_VISIBLE_COLUMNS, getStoredCatalogColumns } from './catalogEditorShared';
import type { Run } from './managementTypes';

export type CatalogEditorProps = {
  store: Store;
  categories: Category[];
  products: Product[];
  run: Run;
  busy: boolean;
  allSales?: KioscoSale[];
  role?: Role;
  pendingRemitos?: PendingReplenishment[];
  pendingRemitoError?: string;
  branches?: Branch[];
  initialBranchId?: string;
  onRefreshRemitos?: () => void;
  onReviewedRemito?: (id: string) => void;
  guided?: boolean;
  active?: boolean;
  allowRestock?: boolean;
  allowPriceEdit?: boolean;
  permissions?: import('./permissions').Permission[];
  /** Cambia cuando Proveedores pide subir una factura; al cerrarla se avisa para volver. */
  invoiceRequest?: number;
  onInvoiceRequestClosed?: () => void;
};

/** Estado y acciones de la planilla de productos. Las vistas reciben el resultado como `s`. */
export function useCatalogEditor(props: CatalogEditorProps) {
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
  const can = (action: import('./permissions').Permission) => isManager || permissions.includes(action);
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

  const availableCatalogTags = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t && t.trim()) set.add(t.trim());
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-AR"));
  }, [products]);

  const bulkMatchedProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.sellable === false) return false;
      if (bulkFilterCategory && p.categoryId !== bulkFilterCategory) return false;
      if (
        bulkFilterBrand.trim() &&
        (!p.brand ||
          !p.brand.toLowerCase().includes(bulkFilterBrand.trim().toLowerCase()))
      )
        return false;
      if (
        bulkFilterSupplier.trim() &&
        (!p.supplier ||
          !p.supplier
            .toLowerCase()
            .includes(bulkFilterSupplier.trim().toLowerCase()))
      )
        return false;
      if (
        bulkFilterSelectedTags.length > 0 &&
        (!p.tags ||
          !bulkFilterSelectedTags.some((t) => p.tags?.includes(t)))
      )
        return false;
      return true;
    });
  }, [
    products,
    bulkFilterCategory,
    bulkFilterBrand,
    bulkFilterSupplier,
    bulkFilterSelectedTags,
  ]);

  /** Ganancia, redondeo y precio nuevos de un producto, o null si no se puede calcular por costo. */
  const bulkPlan = (p: Product): { markup: number; rounding: number | null; price: number } | null => {
    if (!(p.cost > 0)) return null;
    const value = Number(bulkMarkupValue);
    if (!bulkMarkupValue.trim() || !Number.isFinite(value)) return null;
    const current = p.sale_markup ?? Number(markupFromPrice(p.price, p.cost));
    const raw = bulkMarkupMode === 'set' ? value : bulkMarkupMode === 'raise' ? current + value : current - value;
    const markup = Math.round(raw * 100) / 100;
    if (markup <= -100 || markup > 10000) return null;
    const rounding = bulkRounding === 'keep' ? p.price_rounding ?? null : bulkRounding === 'store' ? null : Number(bulkRounding);
    try { return { markup, rounding, price: priceFromMarkup(p.cost, markup, rounding ?? store.price_rounding ?? 0) }; } catch { return null; }
  };

  const calculateNewPrice = (p: Product): number => {
    if (costBulk) return bulkPlan(p)?.price ?? p.price;
    const numVal = parseFloat(bulkAdjustValue) || 0;
    let newPrice = p.price;

    if (bulkAdjustMode === "increase_pct") {
      newPrice = p.price * (1 + numVal / 100);
    } else if (bulkAdjustMode === "decrease_pct") {
      newPrice = p.price * (1 - numVal / 100);
    } else if (bulkAdjustMode === "fixed_margin") {
      const baseCost = p.cost > 0 ? p.cost : p.price;
      newPrice = baseCost * (1 + numVal / 100);
    } else if (bulkAdjustMode === "absolute_price") {
      newPrice = numVal > 0 ? numVal : p.price;
    }

    if (newPrice <= 0) newPrice = p.price;

    if (bulkRoundMultiple > 0) {
      newPrice = Math.round(newPrice / bulkRoundMultiple) * bulkRoundMultiple;
      if (newPrice <= 0) newPrice = bulkRoundMultiple;
    } else {
      newPrice = Math.round(newPrice * 100) / 100;
    }

    return newPrice;
  };

  const salesCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (item.productId) {
          map.set(
            item.productId,
            (map.get(item.productId) || 0) + (item.qty || 1),
          );
        }
      });
    });
    return map;
  }, [allSales]);

  const { currentEstRevenue, newEstRevenue } = useMemo(() => {
    let cur = 0;
    let next = 0;
    bulkMatchedProducts.forEach((p) => {
      const sold7d = salesCountMap.get(p.id) || 0;
      const monthlyUnits = sold7d > 0 ? sold7d * 4.3 : Math.max(1, Math.min(p.stock, 5));
      const newP = calculateNewPrice(p);
      cur += p.price * monthlyUnits;
      next += newP * monthlyUnits;
    });
    return { currentEstRevenue: Math.round(cur), newEstRevenue: Math.round(next) };
  }, [bulkMatchedProducts, salesCountMap, bulkAdjustMode, bulkAdjustValue, bulkRoundMultiple, bulkMarkupMode, bulkMarkupValue, bulkRounding]);
  const bulkPlans = costBulk ? bulkMatchedProducts.map(product => ({ product, plan: bulkPlan(product) })) : [];
  const bulkApplicable = costBulk ? bulkPlans.filter(row => row.plan).length : bulkMatchedProducts.length;
  const bulkNoCost = bulkPlans.filter(row => !(row.product.cost > 0)).length;
  const bulkToCost = bulkPlans.filter(row => row.plan && row.product.sale_markup == null).length;

  const handleApplyBulkMarkup = async () => {
    const items = bulkPlans.filter(row => row.plan).map(({ product, plan }) => ({
      id: product.id, markup: plan!.markup, expected: product.price, ...(bulkRounding === 'keep' ? {} : { rounding: plan!.rounding }),
    }));
    if (!items.length) return;
    const extra = [bulkToCost ? `${bulkToCost} con precio manual pasan a seguir al costo.` : '', bulkNoCost ? `${bulkNoCost} sin costo no cambian.` : ''].filter(Boolean).join(' ');
    if (!await askConfirm(`¿Ajustar la ganancia de ${items.length} productos? Los precios se recalculan con su costo y redondeo. ${extra}`.trim())) return;
    setBulkIsUpdating(true); setBulkProgress(0);
    let updated = 0; let skipped = 0;
    const ok = await run(async () => {
      for (let i = 0; i < items.length; i += 500) {
        const result = await retail.bulkUpdatePricing(store.id, items.slice(i, i + 500));
        updated += result.updated; skipped += result.skipped.length;
        setBulkProgress(Math.round((Math.min(i + 500, items.length) / items.length) * 100));
      }
    });
    setBulkIsUpdating(false); setBulkProgress(0);
    if (!ok) return;
    notify(skipped ? 'warning' : 'success', `Se ajustó la ganancia de ${updated} productos.${skipped ? ` ${skipped} se omitieron porque cambiaron en otro dispositivo, no tienen costo o ya no se venden.` : ''}`);
    setIsBulkPriceModalOpen(false);
  };

  const handleApplyBulkPriceChanges = async () => {
    if (costBulk) { await handleApplyBulkMarkup(); return; }
    if (bulkMatchedProducts.length === 0) return;
    const confirmed = await askConfirm(
      `¿Estás seguro de que deseás actualizar los precios de ${bulkMatchedProducts.length} productos seleccionados? Esta acción modificará el catálogo de forma inmediata.`,
    );
    if (!confirmed) return;

    setBulkIsUpdating(true);
    setBulkProgress(0);

    try {
      const updates = bulkMatchedProducts.map((p) => ({
        id: p.id,
        price: calculateNewPrice(p),
      }));

      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const chunk = updates.slice(i, i + BATCH_SIZE);
        await retail.bulkUpdatePrices(store.id, chunk);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        setBulkProgress(Math.round((currentBatch / totalBatches) * 100));
      }

      await run(
        async () => {},
        `Se actualizaron exitosamente los precios de ${bulkMatchedProducts.length} productos`,
      );
      setIsBulkPriceModalOpen(false);
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "No se pudieron actualizar los precios en bloque.",
      );
    } finally {
      setBulkIsUpdating(false);
      setBulkProgress(0);
    }
  };

  // Stock Replenishment states (Unitary)
  const [replenishTarget, setReplenishTarget] = useState<Product | null>(null);
  const replenishDialog = useRef<HTMLDivElement>(null);
  const replenishTrigger = useRef<HTMLButtonElement | null>(null);
  const [replenishQty, setReplenishQty] = useState<number>(12);
  // Presentación con la que se ingresa: unidad, display o bulto. Cantidad y costo van por esa presentación.
  const [replenishBy, setReplenishBy] = useState<'unit' | 'display' | 'pack'>('unit');
  const replenishmentPackSize = unitsPerPack(replenishTarget?.pack_size);
  const replenishmentDisplaySize = replenishTarget?.display_size && replenishTarget.display_size > 1 ? replenishTarget.display_size : 1;
  const replenishSize = replenishBy === 'pack' ? replenishmentPackSize : replenishBy === 'display' ? replenishmentDisplaySize : 1;
  const replenishByPack = replenishBy !== 'unit';
  const replenishmentUnits = replenishQty * replenishSize;
  const [replenishCost, setReplenishCost] = useState<string>("0");
  const changeReplenishBy = (next: 'unit' | 'display' | 'pack') => {
    const size = (mode: typeof next) => mode === 'pack' ? replenishmentPackSize : mode === 'display' ? replenishmentDisplaySize : 1;
    // El costo escrito sigue siendo el mismo por unidad: se reexpresa para la presentación nueva.
    setReplenishCost(previous => previous.trim() && Number.isFinite(Number(previous)) ? String(Math.round(Number(previous) / size(replenishBy) * size(next) * 100) / 100) : previous);
    setReplenishBy(next); setReplenishQty(next === 'unit' ? 12 : 1);
  };
  const [replenishSupplier, setReplenishSupplier] = useState<string>("");
  const [replenishNotes, setReplenishNotes] = useState<string>("");
  const [replenishTask, setReplenishTask] = useState<'receive' | 'to_salon' | 'to_depot'>('receive');
  const [receiveInDepot, setReceiveInDepot] = useState(false);
  const [replenishError, setReplenishError] = useState('');
  const [replenishDepotMode, setReplenishDepotMode] = useState(false);
  const [replenishBranchMode, setReplenishBranchMode] = useState(false);
  const replenishSaving = useRef(false);
  const depotModeChanged = !!replenishTarget && (replenishDepotMode !== !!store.depot_enabled || replenishBranchMode !== !!store.branch_inventory_enabled);
  const receiving = !store.depot_enabled || replenishTask === 'receive';
  const replenishCurrent = products.find(p => p.id === replenishTarget?.id) || replenishTarget;
  const movingLimit = receiving ? 1000000 : replenishTask === 'to_salon'
    ? (replenishCurrent?.depotStock || 0) : replenishCurrent ? store.branch_inventory_enabled ? replenishCurrent.branchStocks?.[stockBranchId] || 0 : stockForSale(replenishCurrent) : 0;
  const closeReplenish = () => {
    if (busy || replenishSaving.current) return;
    setReplenishTarget(null);
    requestAnimationFrame(() => {
      if (replenishTrigger.current?.getClientRects().length) replenishTrigger.current.focus();
      else catalogSearch.current?.focus();
    });
  };
  useEffect(() => {
    if (active && replenishTarget) replenishDialog.current?.querySelector<HTMLInputElement>('input[inputmode]')?.focus();
  }, [active, replenishTarget?.id]);

  // Bulk CSV replenishment states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvStockBranch, setCsvStockBranch] = useState(operationBranch);
  const openCsv = () => { setCsvStockBranch(operationBranch); setIsCsvModalOpen(true); };
  const [csvParseResult, setCsvParseResult] = useState<CsvParseResult | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvSupplier, setCsvSupplier] = useState("");
  const [csvNotes, setCsvNotes] = useState("");
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // History modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<StockReplenishment[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const startReplenish = (p: Product) => {
    if (!canRestock) return;
    restockRequest.current = { signature: '', id: '', at: '' };
    setReplenishTarget(p);
    setReplenishDepotMode(!!store.depot_enabled);
    setReplenishBranchMode(!!store.branch_inventory_enabled);
    setReplenishTask(store.depot_enabled && p.depotStock ? 'to_salon' : 'receive');
    setReceiveInDepot(!!store.depot_enabled);
    setReplenishError('');
    setReplenishQty(store.depot_enabled && p.depotStock ? Math.min(12, p.depotStock) : 12);
    setReplenishBy('unit');
    setReplenishCost(String(p.cost || 0));
    setReplenishSupplier("");
    setReplenishNotes("");
  };

  const handleConfirmUnitaryReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || busy || replenishSaving.current || !canRestock || !replenishTarget || !Number.isSafeInteger(replenishQty) || !Number.isSafeInteger(replenishmentUnits) || replenishmentUnits <= 0 || replenishmentUnits > 1000000) return;
    if (depotModeChanged) { setReplenishError('Cambió la configuración de depósito. Cerrá y volvé a abrir Reponer para revisar el destino.'); return; }

    const newStock = (replenishCurrent?.stock || 0) + (receiving ? replenishmentUnits : 0);
    // El costo se escribe por la presentación elegida y se guarda por unidad.
    const numCost = parseFloat(replenishCost) / replenishSize;
    const validCost = receiving && canEditCatalog && !isNaN(numCost) && numCost >= 0 ? Math.round(numCost * 100) / 100 : undefined;
    const depotAction = store.depot_enabled && (!receiving || receiveInDepot);
    const note = receiving ? [replenishSupplier.trim(), replenishNotes.trim()].filter(Boolean).join(' · ') : undefined;
    const signature = JSON.stringify([store.id, replenishTarget.id, replenishmentUnits, validCost ?? null, depotAction ? replenishTask : 'salon', depotAction ? note : null, operationBranch]);
    if (restockRequest.current.signature !== signature) restockRequest.current = { signature, id: randomUUID(), at: new Date().toISOString() };

    replenishSaving.current = true; setReplenishError('');
    let success = false;
    try { success = await run(
      async () => { try {
        if (depotAction) return await retail.depotOperation(store.id, replenishTarget.id, replenishmentUnits, replenishTask, restockRequest.current.id, validCost, note, operationBranch);
        return await retail.replenishProductStock(
          store.id,
          replenishTarget.id,
          newStock,
          validCost,
          replenishmentUnits,
          { ...restockRequest.current, branch: operationBranch },
        );
      } catch (reason) { setReplenishError(errorMessage(reason)); throw reason; } },
      receiving ? `Mercadería recibida: +${replenishmentUnits.toLocaleString('es-AR')} u. de ${replenishTarget.name}` : 'Stock trasladado. El total no cambió.',
    ); } finally { replenishSaving.current = false; }

    if (success) {
      if (receiving) replenishmentService.saveRecord({
        id: randomUUID(),
        storeId: store.id,
        createdAt: new Date().toISOString(),
        type: "unitario",
        supplier: replenishSupplier.trim() || undefined,
        notes: [store.depot_enabled && receiveInDepot ? 'Destino: depósito' : '', replenishNotes.trim()].filter(Boolean).join(' · ') || undefined,
        totalUnits: replenishmentUnits,
        itemsCount: 1,
        items: [
          {
            productId: replenishTarget.id,
            code: replenishTarget.code,
            name: replenishTarget.name,
            quantityAdded: replenishmentUnits,
            previousStock: replenishCurrent?.stock || 0,
            newStock,
            cost: validCost,
          },
        ],
      });
      closeReplenish();
    }
  };

  const handleDownloadCsv = (withProducts: boolean) => {
    const content = replenishmentService.generateCsvTemplate(
      products,
      !withProducts,
    );
    const cleanStore = store.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = withProducts
      ? `planilla_reposicion_${cleanStore}_${dateStr}.csv`
      : `plantilla_modelo_reposicion.csv`;
    replenishmentService.downloadCsv(content, filename);
  };

  const handleCsvFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      const result = replenishmentService.parseCsv(text, products);
      setCsvParseResult(result);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleConfirmBulkCsvReplenish = async () => {
    if (!csvParseResult || csvParseResult.validRows.length === 0) return;
    if (csvStockBranch !== operationBranch || busy || isProcessingCsv) return;

    setIsProcessingCsv(true);
    const batch = csvParseResult.validRows.map((r) => ({
      id: r.product!.id,
      newStock: r.product!.stock + r.quantityAdded,
      quantityAdded: r.quantityAdded,
      newCost: r.newCost,
    }));

    const itemsSummary = csvParseResult.validRows.map((r) => ({
      productId: r.product!.id,
      code: r.product!.code,
      name: r.product!.name,
      quantityAdded: r.quantityAdded,
      previousStock: r.product!.stock,
      newStock: r.product!.stock + r.quantityAdded,
      cost: r.newCost,
    }));

    const success = await run(
      () => retail.replenishStockBatch(store.id, batch, operationBranch),
      `Reposición masiva aplicada: +${csvParseResult.totalUnitsToAdd} unidades en ${csvParseResult.matchedCount} productos`,
    );

    setIsProcessingCsv(false);

    if (success) {
      replenishmentService.saveRecord({
        id: randomUUID(),
        storeId: store.id,
        createdAt: new Date().toISOString(),
        type: "csv",
        supplier: csvSupplier.trim() || undefined,
        notes: csvNotes.trim() || undefined,
        totalUnits: csvParseResult.totalUnitsToAdd,
        itemsCount: csvParseResult.matchedCount,
        items: itemsSummary,
      });

      setIsCsvModalOpen(false);
      setCsvParseResult(null);
      setCsvFileName("");
      setCsvSupplier("");
      setCsvNotes("");
    }
  };

  const openHistoryModal = () => {
    setHistoryList(replenishmentService.getHistory(store.id));
    setIsHistoryModalOpen(true);
  };

  // Feature: AI Stock Analysis states and handlers
  const criticalProducts = useMemo(
    () => products.filter((p) => !hasComposition(p) && (operationBranch ? unitsHere(p) : p.stock) <= p.minStock),
    [products, operationBranch, unitsHere],
  );
  const [isAnalyzingStock, setIsAnalyzingStock] = useState(false);
  const [stockAiAnalysis, setStockAiAnalysis] = useState<string | null>(null);
  const [stockAiError, setStockAiError] = useState<string | null>(null);
  const [copiedOrder, setCopiedOrder] = useState(false);

  const handleAnalyzeCriticalStock = async () => {
    if (criticalProducts.length === 0 || isAnalyzingStock) return;

    setIsAnalyzingStock(true);
    setStockAiError(null);

    try {
      // Rotation calculation if allSales is available
      const rotationMap = new Map<string, number>();
      if (allSales && allSales.length > 0) {
        for (const s of allSales) {
          for (const item of s.items || []) {
            const idKey = item.productId || "";
            const nameKey = (item.name || "").toLowerCase().trim();
            const qty = item.qty || 0;
            if (idKey) rotationMap.set(idKey, (rotationMap.get(idKey) || 0) + qty);
            rotationMap.set(nameKey, (rotationMap.get(nameKey) || 0) + qty);
          }
        }
      }

      const criticalPayload = criticalProducts.map((p) => {
        const recentSold =
          rotationMap.get(p.id) ??
          rotationMap.get(p.name.toLowerCase().trim()) ??
          0;
        return {
          producto: p.name,
          codigo: p.code,
          categoria: p.category,
          stockActual: p.stock,
          stockMinimo: p.minStock,
          costoUnitario: p.cost || 0,
          precioVenta: p.price,
          unidadesVendidasRecientemente: recentSold,
        };
      });

      const systemPrompt =
        "Sos un asistente de compras para kiosco argentino. Dado el inventario " +
        "crítico, priorizás la reposición según urgencia y retorno de inversión. " +
        "Respondé con una lista ordenada, clara y accionable. Incluí el costo " +
        "estimado de reposición usando los costos provistos.\n\n" +
        "Formato de salida esperado de Groq:\n" +
        "1. [URGENTE] Nombre producto — Stock: X / Mínimo: Y — Pedir: Z unidades — Inversión: $NNN\n" +
        "2. [MODERADO] ...\n" +
        "...\n" +
        "INVERSIÓN TOTAL ESTIMADA: $NNN";

      const userPrompt = `Comercio: ${store.name}
Total de productos en estado crítico: ${criticalProducts.length}

LISTA DE PRODUCTOS CON STOCK CRÍTICO (stock <= stockMinimo):
${JSON.stringify(criticalPayload, null, 2)}

Por favor, analizá y priorizá la compra de estos productos críticos según su urgencia, rotación y costo.
Respetá estrictamente el formato de salida solicitado con la etiqueta de urgencia ([URGENTE], [MODERADO], etc.), unidades a pedir, inversión por ítem y al final la INVERSIÓN TOTAL ESTIMADA.`;

      const response = await groqChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.2 },
      );

      setStockAiAnalysis(response);
    } catch (err: unknown) {
      setStockAiError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el análisis de reposición con IA.",
      );
    } finally {
      setIsAnalyzingStock(false);
    }
  };

  const handleCopyOrder = async () => {
    if (!stockAiAnalysis) return;
    try {
      await navigator.clipboard.writeText(
        `📦 ORDEN DE COMPRA SUGERIDA - ${store.name}\n` +
          `Fecha: ${new Date().toLocaleDateString("es-AR")}\n\n` +
          stockAiAnalysis,
      );
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 2200);
    } catch {
      setCopiedOrder(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!stockFilter || unitsHere(p) <= p.minStock) && (!lowMarginFilter || p.margin_group === 'low_margin') &&
      (!q || (p.name + " " + p.code + " " + p.category + " " + (p.display_code || "") + " " + (p.pack_code || "")).toLowerCase().includes(q)),
    );
  }, [products, stockFilter, lowMarginFilter, query, unitsHere]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedProducts = filtered.slice(startIndex, endIndex);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);
  return {
    store,
    categories,
    products,
    run,
    busy,
    allSales,
    role,
    pendingRemitos,
    pendingRemitoError,
    branches,
    initialBranchId,
    onRefreshRemitos,
    onReviewedRemito,
    guided,
    active,
    allowRestock,
    allowPriceEdit,
    permissions,
    invoiceRequest,
    onInvoiceRequestClosed,
    notify,
    editing,
    setEditing,
    stockBranchId,
    setStockBranchId,
    operationBranch,
    branchUnits,
    unitsHere,
    adding,
    setAdding,
    query,
    setQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    stockFilter,
    setStockFilter,
    tableScrollRef,
    visibleColumns,
    setVisibleColumns,
    columnsDetailsRef,
    handleToggleColumn,
    handleResetColumns,
    lowMarginFilter,
    setLowMarginFilter,
    editorTrigger,
    panelRef,
    csvTitleId,
    storeRounding,
    isBulkPriceModalOpen,
    setIsBulkPriceModalOpen,
    bulkFilterCategory,
    setBulkFilterCategory,
    bulkFilterBrand,
    setBulkFilterBrand,
    bulkFilterSupplier,
    setBulkFilterSupplier,
    bulkFilterSelectedTags,
    setBulkFilterSelectedTags,
    bulkAdjustMode,
    setBulkAdjustMode,
    bulkAdjustValue,
    setBulkAdjustValue,
    bulkRoundMultiple,
    setBulkRoundMultiple,
    costBulk,
    bulkMarkupMode,
    setBulkMarkupMode,
    bulkMarkupValue,
    setBulkMarkupValue,
    bulkRounding,
    setBulkRounding,
    bulkIsUpdating,
    setBulkIsUpdating,
    bulkProgress,
    setBulkProgress,
    isInvoiceModalOpen,
    setIsInvoiceModalOpen,
    seenInvoiceRequest,
    invoiceFromSuppliers,
    canEditCatalog,
    isManager,
    can,
    canRestock,
    canCompose,
    canDelete,
    newCompositeOpen,
    setNewCompositeOpen,
    catalogAddOpen,
    setCatalogAddOpen,
    historyTarget,
    setHistoryTarget,
    evolutionOpen,
    setEvolutionOpen,
    evolutionTrigger,
    closeEvolution,
    historyTrigger,
    canSeeHistory,
    openHistory,
    closeHistory,
    sheet,
    setSheet,
    productEditing,
    closeCatalogAdd,
    closeNewComposite,
    deletionTarget,
    setDeletionTarget,
    deletionHistoryOpen,
    setDeletionHistoryOpen,
    deletionEditing,
    catalogSearch,
    closeDeletion,
    priceTarget,
    setPriceTarget,
    compositionTarget,
    setCompositionTarget,
    newCompositionProduct,
    setNewCompositionProduct,
    compositionEditing,
    closeCompositionEditor,
    priceEditing,
    closePriceEditor,
    restockRequest,
    availableCatalogTags,
    bulkMatchedProducts,
    bulkPlan,
    calculateNewPrice,
    salesCountMap,
    currentEstRevenue,
    newEstRevenue,
    bulkPlans,
    bulkApplicable,
    bulkNoCost,
    bulkToCost,
    handleApplyBulkMarkup,
    handleApplyBulkPriceChanges,
    replenishTarget,
    setReplenishTarget,
    replenishDialog,
    replenishTrigger,
    replenishQty,
    setReplenishQty,
    replenishBy,
    setReplenishBy,
    replenishmentPackSize,
    replenishmentDisplaySize,
    replenishSize,
    replenishByPack,
    replenishmentUnits,
    replenishCost,
    setReplenishCost,
    changeReplenishBy,
    replenishSupplier,
    setReplenishSupplier,
    replenishNotes,
    setReplenishNotes,
    replenishTask,
    setReplenishTask,
    receiveInDepot,
    setReceiveInDepot,
    replenishError,
    setReplenishError,
    replenishDepotMode,
    setReplenishDepotMode,
    replenishBranchMode,
    setReplenishBranchMode,
    replenishSaving,
    depotModeChanged,
    receiving,
    replenishCurrent,
    movingLimit,
    closeReplenish,
    isCsvModalOpen,
    setIsCsvModalOpen,
    csvStockBranch,
    setCsvStockBranch,
    openCsv,
    csvParseResult,
    setCsvParseResult,
    csvFileName,
    setCsvFileName,
    csvSupplier,
    setCsvSupplier,
    csvNotes,
    setCsvNotes,
    isProcessingCsv,
    setIsProcessingCsv,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    historyList,
    setHistoryList,
    expandedRecordId,
    setExpandedRecordId,
    startReplenish,
    handleConfirmUnitaryReplenish,
    handleDownloadCsv,
    handleCsvFileInput,
    handleConfirmBulkCsvReplenish,
    openHistoryModal,
    criticalProducts,
    isAnalyzingStock,
    setIsAnalyzingStock,
    stockAiAnalysis,
    setStockAiAnalysis,
    stockAiError,
    setStockAiError,
    copiedOrder,
    setCopiedOrder,
    handleAnalyzeCriticalStock,
    handleCopyOrder,
    filtered,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    paginatedProducts,
    pageNumbers,
  };
}

export type CatalogEditorState = ReturnType<typeof useCatalogEditor>;
