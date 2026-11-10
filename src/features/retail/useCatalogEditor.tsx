import { askConfirm } from '../../components/ConfirmHost';
import { draftMarkupPrice, markupFromPrice, priceFromMarkup } from '../../services/productSalePrice';
import { useState, useMemo, useEffect, useRef, useId, useCallback } from "react";
import { productMargin } from '../../services/productMarginService';
import { compositionCost, hasComposition, productsAtBranch, stockForSale } from '../../services/productComposition';
import { errorMessage } from './api';
import { defaultProductCategory, resolveProductCategory } from '../../services/productCategoryService';
import { History, X } from "lucide-react";
import { groqChat } from "../../services/groqService";
import { unitsPerPack } from '../../services/inventoryUnits';
import { replenishmentService, type StockReplenishment, type CsvParseResult } from "../../services/replenishmentService";
import type { KioscoSale } from "../../types/kiosco";
import type { Category, Product, Store, Role, Branch, PendingReplenishment } from "./api";
import { retail } from "./api";
import { randomUUID } from "../../utils/uuid";
import { useToast } from "../../context/ToastContext";
import { presentationCodeConflict } from '../../services/productPresentation';
import { type ProductSuggestion, type PriceValidationAlert, cleanSuggestionNumber, extractJson, type CatalogColumnId, DEFAULT_VISIBLE_COLUMNS, getStoredCatalogColumns } from './catalogEditorShared';
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
  const [adding, setAdding] = useState(guided);
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
  const editorRef = useRef<HTMLFormElement>(null);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const csvTitleId = useId();
  const productOptionsRef = useRef<HTMLDetailsElement>(null);
  const invalidFocusPending = useRef(false);
  const suggestionRequest = useRef(0);
  const priceReviewRequest = useRef(0);
  const anomalyRequest = useRef(0);
  const [productReviewNote, setProductReviewNote] = useState('');
  const [productOptionsOpen, setProductOptionsOpen] = useState(false);
  const [priceReviewNote, setPriceReviewNote] = useState('');
  const [productSuggestionNote, setProductSuggestionNote] = useState('');
  useEffect(() => {
    if (!active) return;
    const dialog = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="dialog"]') || []).find(element => element.getClientRects().length > 0);
    if (dialog) {
      dialog.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])')?.focus();
      return;
    }
    if (!adding && !editing) return;
    editorRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, [adding, editing, active]);
  useEffect(() => {
    if (!active || busy || adding || editing || !editorTrigger.current || editorTrigger.current.closest('[hidden]')) return;
    editorTrigger.current.focus();
    editorTrigger.current = null;
  }, [adding, editing, active, busy]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    categoryId: defaultProductCategory(categories),
    emoji: "📦",
    price: "",
    markup: (store.default_markup != null ? String(store.default_markup) : '') as string | null,
    rounding: null as number | null,
    sellable: true,
    cost: "0",
    stock: "0",
    min: "4",
    brand: "",
    supplier: "",
    supplierCode: "",
    tags: [] as string[],
    unitType: "unit" as "unit" | "kg" | "lt" | "pack" | "box",
    packSize: '',
    displaySize: '',
    displayCode: '',
    packCode: '',
    palletPacks: '',
    expiryDate: '',
  });
  useEffect(() => {
    const fallback = defaultProductCategory(categories);
    if (!formData.categoryId && fallback) setFormData(previous => previous.categoryId ? previous : { ...previous, categoryId: fallback });
  }, [categories, formData.categoryId]);
  const [tagInput, setTagInput] = useState("");
  const latestProductDraft = useRef(formData);
  latestProductDraft.current = formData;
  const saleUnit = { unit: 'unidad', kg: 'kg', lt: 'litro', pack: 'pack', box: 'caja' }[formData.unitType];
  const editingRecipeCost = editing && hasComposition(editing) ? compositionCost(editing.stock_components!, products) : null;
  const pricingByMarkup = formData.sellable && formData.markup !== null;
  const pricingCost = editingRecipeCost?.cost ?? Number(formData.cost);
  const storeRounding = store.price_rounding ?? 0;
  const displayReady = editing ? editing.display_size !== undefined : products.some(product => product.display_size !== undefined);
  // Códigos por presentación y pallet: solo con la actualización 202611060009.
  const codesReady = editing ? editing.display_code !== undefined : products.some(product => product.display_code !== undefined);
  const formSalePrice = pricingByMarkup ? draftMarkupPrice(pricingCost, formData.markup!, formData.rounding ?? storeRounding) : Number(formData.price);
  // El precio manual se pide: deja de seguir al costo hasta volver al cálculo.
  const requestManualPrice = async () => {
    if (!await askConfirm('¿Poner el precio a mano? Deja de seguir al costo: si el costo cambia, el precio no se actualiza. Podés volver al cálculo por costo cuando quieras.')) return;
    setFormData(prev => ({ ...prev, price: String(formSalePrice || prev.price), markup: null }));
    requestAnimationFrame(() => editorRef.current?.querySelector<HTMLInputElement>('input[name="price"]')?.focus());
  };
  const useCostPrice = () => setFormData(prev => ({ ...prev,
    markup: markupFromPrice(Number(prev.price), pricingCost) || (store.default_markup != null ? String(store.default_markup) : ''),
  }));
  const draftMargin = productMargin(formSalePrice || 0, pricingCost, store.low_margin_threshold);
  const suggestedPriceDraft = (previous: typeof formData, price: number) => ({
    ...previous, price: String(price),
    markup: previous.markup === null ? null : Number(previous.cost) > 0
      ? String(Math.round((price / Number(previous.cost) - 1) * 10000) / 100) : previous.markup,
  });
  const productOptionsSummary = [
    formData.unitType !== 'unit' ? `Venta por ${saleUnit}` : '',
    Number(formData.packSize) > 1 ? `Bulto de ${formData.packSize}` : '',
    formData.sellable && draftMargin.group === 'low_margin' ? 'Bajo margen automático' : '',
    formData.brand.trim(),
    formData.supplier.trim(),
  ].filter(Boolean).join(' · ');

  const invalidateProductSuggestions = () => {
    anomalyRequest.current++;
    setIsCheckingAnomalies(false);
    setProductReviewNote('');
    setAnomalyDialog(null);
    suggestionRequest.current++;
    priceReviewRequest.current++;
    setSuggestion(null);
    setPriceValidation(null);
    setIsSuggesting(false);
    setIsCheckingPrice(false);
    setPriceReviewNote('');
    setProductSuggestionNote('');
  };

  useEffect(() => () => {
    anomalyRequest.current++;
    suggestionRequest.current++;
    priceReviewRequest.current++;
  }, []);

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
  const [sheet, setSheet] = useState<{ mode: 'new' } | { mode: 'edit'; products: Product[] } | null>(null);
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
  const [creatingComposition, setCreatingComposition] = useState(false);
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

  // Feature A: AI Suggestion state
  const [suggestion, setSuggestion] = useState<ProductSuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // AI Price Validation state
  const [priceValidation, setPriceValidation] = useState<PriceValidationAlert | null>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);

  // Feature B: Anomaly Detection state
  const [isCheckingAnomalies, setIsCheckingAnomalies] = useState(false);
  const [anomalyDialog, setAnomalyDialog] = useState<{
    warnings: string[];
    product: {
      id: string;
      categoryId: string;
      code: string;
      name: string;
      price: number;
      sellable: boolean;
      cost: number;
      stock: number;
      minStock: number;
      emoji: string;
      active: boolean;
      brand?: string;
      supplier?: string;
      supplierCode?: string;
      tags?: string[];
      unitType?: string;
      pack_size?: number | null;
      margin_group?: 'standard' | 'low_margin' | null;
    };
  } | null>(null);

  const startAdd = (asComposition = false) => {
    setCreatingComposition(asComposition);
    invalidateProductSuggestions();
    setProductOptionsOpen(false);
    setEditing(null);
    setAdding(true);
    setSuggestion(null);
    setAnomalyDialog(null);
    setPriceValidation(null);
    setTagInput("");
    setFormData({
      name: "",
      code: "",
      categoryId: defaultProductCategory(categories),
      emoji: "📦",
      price: "",
      markup: store.default_markup != null ? String(store.default_markup) : '',
      rounding: null,
      sellable: true,
      cost: "0",
      stock: "0",
      min: "4",
      brand: "",
      supplier: "",
      supplierCode: "",
      tags: [],
      unitType: "unit",
      packSize: '',
      displaySize: '',
      displayCode: '',
      packCode: '',
      palletPacks: '',
      expiryDate: '',
    });
  };

  const startEdit = (p: Product) => {
    setCreatingComposition(false);
    invalidateProductSuggestions();
    setProductOptionsOpen(false);
    setAdding(false);
    setEditing(p);
    setSuggestion(null);
    setAnomalyDialog(null);
    setPriceValidation(null);
    setTagInput("");
    setFormData({
      name: p.name,
      code: p.code,
      categoryId: p.categoryId,
      emoji: p.emoji || "📦",
      price: p.price_pending ? '' : String(p.price),
      // Un «sin precio» se completa por costo; un manual existente sigue manual hasta que se pida el cálculo.
      markup: p.sale_markup != null ? String(p.sale_markup) : p.price_pending ? (store.default_markup != null ? String(store.default_markup) : '') : null,
      rounding: p.price_rounding ?? null,
      // Un producto «sin precio» se abre como producto a la venta para completarle el precio.
      sellable: p.sellable !== false || p.price_pending === true,
      cost: String(p.cost || 0),
      stock: String(p.stock),
      min: String(p.minStock),
      brand: p.brand || "",
      supplier: p.supplier || "",
      supplierCode: p.supplierCode || "",
      tags: p.tags ? [...p.tags] : [],
      unitType: (p.unitType as "unit" | "kg" | "lt" | "pack" | "box") || "unit",
      packSize: p.pack_size == null ? '' : String(p.pack_size),
      displaySize: p.display_size == null ? '' : String(p.display_size),
      displayCode: p.display_code || '',
      packCode: p.pack_code || '',
      palletPacks: p.pallet_packs == null ? '' : String(p.pallet_packs),
      expiryDate: p.expiry_date || '',
    });
  };

  const cancelEdit = () => {
    setCreatingComposition(false);
    invalidateProductSuggestions();
    setProductOptionsOpen(false);
    setEditing(null);
    setAdding(false);
    setSuggestion(null);
    setAnomalyDialog(null);
    setPriceValidation(null);
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

  // Automatic barcode lookup checks local catalog, global community catalog, and Open Food Facts.
  const handleCodeBlur = async () => {
    const code = formData.code.trim();
    if (!code || isSuggesting) return;

    // PASO 1 — Verificar si ya existe en el catálogo local de este comercio
    const existing = products.find(
      (p) => p.code?.trim().toLowerCase() === code.toLowerCase() && p.id !== editing?.id,
    );
    if (existing) {
      setProductSuggestionNote(
        `⚠️ Este código ya pertenece a "${existing.name}" en tu catálogo (Precio: $${existing.price.toLocaleString("es-AR")}, Stock: ${existing.stock} u.).`,
      );
      return;
    }

    if (formData.name.trim()) return;

    const requestId = ++suggestionRequest.current;
    const draft = formData;
    setIsSuggesting(true);
    setSuggestion(null);
    setProductSuggestionNote('');

    try {
      // PASO 2 — Lookup en catálogo global comunitario y Open Food Facts
      const globalResult = await retail.lookupEan(code);
      if (requestId !== suggestionRequest.current || latestProductDraft.current !== draft) return;
      if (
        globalResult &&
        globalResult.found &&
        (globalResult.name || globalResult.category_suggestion)
      ) {
        setSuggestion({
          name: globalResult.name || "",
          emoji: globalResult.emoji || "📦",
          category: globalResult.category_suggestion || "",
          brand: globalResult.brand,
          source: globalResult.source || "community",
          confidenceScore: globalResult.confidence_score,
        });
        return;
      }
      setProductSuggestionNote('No encontramos datos para ese código. Podés ingresar el nombre o pedir una sugerencia con IA.');
    } catch {
      if (requestId === suggestionRequest.current && latestProductDraft.current === draft) {
        setProductSuggestionNote('No se pudo consultar el catálogo. Podés completar los datos manualmente.');
      }
    } finally {
      if (requestId === suggestionRequest.current) setIsSuggesting(false);
    }
  };

  const suggestProductDetails = async () => {
    let name = formData.name.trim();
    const code = formData.code.trim();
    if ((name.length < 2 && !code) || isSuggesting) return;

    const requestId = ++suggestionRequest.current;
    const draft = formData;
    setIsSuggesting(true);
    setSuggestion(null);
    setProductSuggestionNote('');

    try {
      // Si no hay nombre pero sí código, buscar primero en base de datos de productos (local y global/OFF)
      if (name.length < 2 && code) {
        // 1. Catálogo local
        const existing = products.find(
          (p) => p.code?.trim().toLowerCase() === code.toLowerCase() && p.id !== editing?.id,
        );
        if (existing) {
          setSuggestion({
            name: existing.name,
            emoji: existing.emoji || "📦",
            category: existing.category || "",
            brand: existing.brand,
            supplier: existing.supplier,
            estimatedPrice: existing.price,
            estimatedCost: existing.cost,
            source: "community",
            disclaimer: "Datos obtenidos de tu catálogo existente",
          });
          setProductSuggestionNote(`Encontrado en tu catálogo: "${existing.name}".`);
          setIsSuggesting(false);
          return;
        }

        // 2. Catálogo global / Open Food Facts
        const eanRes = await retail.lookupEan(code);
        if (requestId !== suggestionRequest.current || latestProductDraft.current !== draft) return;
        if (eanRes && eanRes.found && eanRes.name) {
          name = eanRes.name;
          setFormData((prev) => ({
            ...prev,
            name: eanRes.name || prev.name,
            brand: eanRes.brand || prev.brand,
            emoji: eanRes.emoji || prev.emoji,
          }));
        } else {
          setProductSuggestionNote('No encontramos ese código en tu catálogo ni en la base comunitaria. Escribí el nombre del producto (ej: Alfajor Jorgito) para que la IA sugiera precios y categorías.');
          setIsSuggesting(false);
          return;
        }
      }

      const categoryListStr = categories.map((c) => c.name).join(", ");
      const systemPrompt = `Sos un experto en retail, kioscos y almacenes de Argentina.
Dado el nombre de un producto (o descripción informal), completá sus atributos comerciales para el catálogo.
Respondé EXCLUSIVAMENTE con un JSON estricto con:
- "name": nombre comercial prolijo y normalizado (ej: "Alfajor Jorgito Chocolate 50g")
- "emoji": un único emoji muy representativo (ej: 🍫, 🥤, 🚬, 🍪, 🍺, 🥪, 🧴, 🍬, 🥔)
- "category": categoría más adecuada elegida EXCLUSIVAMENTE de esta lista: [${categoryListStr}]
- "brand": marca del producto (ej: "Jorgito", "Coca-Cola", "Arcor", "Bimbo", "Marlboro", "Quilmes", "Lays")
- "supplier": distribuidor o preventista típico en Argentina (ej: "Distribuidora Jorgito", "Coca-Cola FEMSA", "Arcor Mayorista", "Massalin Particulares", "PepsiCo Snacks", "Cervecería Quilmes")
- "unitType": unidad ("unit" | "kg" | "lt" | "pack" | "box")
- "tags": array con 2 a 4 tags breves en minúsculas sin '#' (ej: ["alfajores", "chocolate", "golosinas"])
- "estimatedPrice": precio de venta al público orientativo en pesos argentinos (número entero, ej: 1200)
- "estimatedCost": costo de compra mayorista orientativo en pesos argentinos (número entero, ej: 800)
- "disclaimer": breve nota aclaratoria (ej: "Valores estimativos de mercado en Argentina")`;

      const response = await groqChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Producto: "${name}". Código: ${code || 'sin código'}` },
        ],
        { temperature: 0.2 },
      );

      if (requestId !== suggestionRequest.current || latestProductDraft.current !== draft) return;
      const parsed = extractJson<ProductSuggestion>(response);
      if (parsed && (parsed.name || parsed.category || parsed.brand || parsed.supplier)) {
        setSuggestion({
          ...parsed,
          source: "ai",
        });
      } else {
        setProductSuggestionNote('No se obtuvieron sugerencias para este producto. Podés completar los datos manualmente.');
      }
    } catch {
      if (requestId === suggestionRequest.current && latestProductDraft.current === draft) {
        setProductSuggestionNote('No se pudieron obtener sugerencias. Podés reintentar o completar los datos manualmente.');
      }
    } finally {
      if (requestId === suggestionRequest.current) setIsSuggesting(false);
    }
  };

  // Optional price review, requested by the user rather than by leaving an input.
  const reviewProductPrice = async () => {
    const priceNum = formSalePrice || 0;
    const costNum = editingRecipeCost?.cost ?? parseFloat(formData.cost);

    // Solo si tiene cost cargado (> 0) y price válido (> 0)
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(costNum) || costNum <= 0) {
      setPriceValidation(null);
      setPriceReviewNote('Ingresá un precio y un costo mayores a cero para revisar el precio.');
      return;
    }

    // Cálculos locales previos
    const margin = ((priceNum - costNum) / costNum) * 100;

    // Solo llamar a Groq si margen < 20% OR margen > 250%
    if (margin >= 20 && margin <= 250) {
      setPriceValidation(null);
      setPriceReviewNote('El cálculo local no detectó un precio fuera del rango de revisión. No se consultó a la IA.');
      return;
    }

    if (isCheckingPrice) return;

    const requestId = ++priceReviewRequest.current;
    const draft = formData;
    setIsCheckingPrice(true);
    setPriceValidation(null);
    setPriceReviewNote('');

    try {
      const categoryName =
        categories.find((c) => c.id === formData.categoryId)?.name || "Varios";

      const payload = {
        productName: formData.name.trim() || "Producto",
        price: priceNum,
        cost: costNum,
        margin: Math.round(margin * 10) / 10,
        category: categoryName,
      };

      const systemPrompt =
        "Sos un experto en pricing para kioscos y almacenes argentinos. Dado el nombre del producto, su costo y precio de venta, evaluás si el margen es adecuado y sugerís un precio óptimo. Considerá la inflación argentina y márgenes típicos del sector (25%-120%). Respondé SOLO con JSON: { alert, suggestion, reasoning }";

      const response = await groqChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ],
        { temperature: 0.2 },
      );

      if (requestId !== priceReviewRequest.current || latestProductDraft.current !== draft) return;
      const parsed = extractJson<PriceValidationAlert>(response);
      const suggestedPrice = cleanSuggestionNumber(parsed?.suggestion);

      if (parsed?.alert && suggestedPrice > 0) {
        setPriceValidation({
          alert: parsed.alert,
          suggestion: suggestedPrice,
          reasoning: parsed.reasoning || "",
        });
      } else {
        setPriceValidation(null);
        setPriceReviewNote('La revisión no devolvió una sugerencia de precio.');
      }
    } catch {
      if (requestId !== priceReviewRequest.current || latestProductDraft.current !== draft) return;
      setPriceValidation(null);
      setPriceReviewNote('No se pudo revisar el precio. Podés reintentar o guardar los datos ingresados.');
    } finally {
      if (requestId === priceReviewRequest.current) setIsCheckingPrice(false);
    }
  };

  const applySuggestionField = (
    field:
      | "name"
      | "emoji"
      | "category"
      | "brand"
      | "supplier"
      | "unitType"
      | "tags"
      | "price"
      | "cost"
      | "all",
  ) => {
    if (!suggestion) return;

    if (field === "name" && suggestion.name) {
      setFormData((prev) => ({ ...prev, name: suggestion.name }));
    } else if (field === "emoji" && suggestion.emoji) {
      setFormData((prev) => ({ ...prev, emoji: suggestion.emoji }));
    } else if (field === "category" && suggestion.category) {
      setFormData((prev) => ({ ...prev, categoryId: resolveProductCategory(categories, suggestion.category, suggestion.name || prev.name) }));
    } else if (field === "brand" && suggestion.brand) {
      setFormData((prev) => ({ ...prev, brand: suggestion.brand || prev.brand }));
    } else if (field === "supplier" && suggestion.supplier) {
      setFormData((prev) => ({
        ...prev,
        supplier: suggestion.supplier || prev.supplier,
      }));
    } else if (field === "unitType" && suggestion.unitType) {
      setFormData((prev) => ({
        ...prev,
        unitType: suggestion.unitType || prev.unitType,
      }));
    } else if (field === "tags" && suggestion.tags && suggestion.tags.length > 0) {
      setFormData((prev) => ({
        ...prev,
        tags: Array.from(new Set([...prev.tags, ...suggestion.tags!])),
      }));
    } else if (field === "price" && suggestion.estimatedPrice) {
      const numPrice = cleanSuggestionNumber(suggestion.estimatedPrice);
      if (numPrice) {
        setFormData((prev) => suggestedPriceDraft(prev, numPrice));
      }
    } else if (field === "cost" && suggestion.estimatedCost) {
      const numCost = cleanSuggestionNumber(suggestion.estimatedCost);
      if (numCost) {
        setFormData((prev) => ({ ...prev, cost: String(numCost) }));
      }
    } else if (field === "all") {
      const categoryId = resolveProductCategory(categories, suggestion.category, suggestion.name || formData.name);
      const numPrice = cleanSuggestionNumber(suggestion.estimatedPrice);
      const numCost = cleanSuggestionNumber(suggestion.estimatedCost);
      const mergedTags = suggestion.tags
        ? Array.from(new Set([...formData.tags, ...suggestion.tags]))
        : formData.tags;

      setFormData((prev) => ({
        ...prev,
        name: suggestion.name || prev.name,
        emoji: suggestion.emoji || prev.emoji,
        categoryId,
        price: numPrice ? String(numPrice) : prev.price,
        markup: prev.markup === null ? null : numPrice && Number(numCost || prev.cost) > 0
          ? String(Math.round((numPrice / Number(numCost || prev.cost) - 1) * 10000) / 100) : prev.markup,
        cost: numCost ? String(numCost) : prev.cost,
        brand: suggestion.brand || prev.brand,
        supplier: suggestion.supplier || prev.supplier,
        unitType: suggestion.unitType || prev.unitType,
        tags: mergedTags,
      }));
    }
  };

  const doSaveProduct = async (productToSave: {
    id: string;
    categoryId: string;
    code: string;
    name: string;
    price: number;
    sale_markup?: number | null;
    sellable: boolean;
    cost: number;
    stock: number;
    minStock: number;
    emoji: string;
    active: boolean;
    brand?: string;
    supplier?: string;
    supplierCode?: string;
    tags?: string[];
    unitType?: string;
    pack_size?: number | null;
    display_size?: number | null;
    display_code?: string | null;
    pack_code?: string | null;
    pallet_packs?: number | null;
    margin_group?: 'standard' | 'low_margin' | null;
    expiry_date?: string | null;
    last_restocked_at?: string | null;
  }) => {
    const configureAfterSave = creatingComposition && !editing;
    let savedId = '';
    if (
      await run(
        async () => {
          const saved = await retail.saveProduct(
            store.id,
            { ...productToSave, stock_components: editing?.stock_components },
            !!editing,
            editing && hasComposition(editing) ? 0 : editing?.stock,
            operationBranch,
          );
          savedId = saved.id;
          return saved;
        },
        "Producto guardado",
      )
    ) {
      // PASO 2 — Contribuir al catálogo comunitario ÚNICAMENTE cuando es un producto NUEVO (nunca al editar uno existente)
      const cleanCode = productToSave.code.trim();
      const isNumericEan = /^\d{8,14}$/.test(cleanCode);
      const isInternalCode = /^[a-zA-Z]/.test(cleanCode);

      if (!editing && isNumericEan && !isInternalCode) {
        const categoryName =
          categories.find((c) => c.id === productToSave.categoryId)?.canonicalName || categories.find((c) => c.id === productToSave.categoryId)?.name || "Varios";
        void retail.contributeCatalog(
          cleanCode,
          productToSave.name,
          productToSave.brand,
          categoryName,
          productToSave.emoji,
          "community",
        );
      }

      cancelEdit();
      if (configureAfterSave) {
        setNewCompositionProduct(true);
        setCompositionTarget({ ...productToSave, id: savedId, stock: 0, stock_components: [], category: categories.find(category => category.id === productToSave.categoryId)?.name || 'Sin categoría' });
      }
    }
  };

  // El guardado es independiente de la revisión opcional con IA.
  const handleSubmit = async (e: React.FormEvent, review = false) => {
    e.preventDefault();
    if (busy || (review && isCheckingAnomalies)) return;
    if (displayReady && formData.displaySize.trim() && formData.packSize.trim() && Number(formData.packSize) % Number(formData.displaySize) !== 0) {
      setProductOptionsOpen(true);
      requestAnimationFrame(() => editorRef.current?.querySelector<HTMLInputElement>('input[name="display_size"]')?.focus());
      return;
    }
    if (codesReady) {
      const conflict = presentationCodeConflict(products, { id: editing?.id, code: formData.code, display_code: formData.displayCode, pack_code: formData.packCode });
      if (conflict) {
        setProductOptionsOpen(true);
        setProductReviewNote(conflict.message);
        requestAnimationFrame(() => editorRef.current?.querySelector<HTMLInputElement>(`input[name="${conflict.field}"]`)?.focus());
        return;
      }
    }
    if (pricingByMarkup && formSalePrice === null) {
      setProductReviewNote('Completá un costo mayor a cero y un porcentaje válido para calcular el precio principal.');
      editorRef.current?.querySelector<HTMLInputElement>('[data-product-markup]')?.focus();
      return;
    }

    const p = {
      id: editing?.id || "",
      categoryId: formData.categoryId,
      code: formData.code.trim(),
      name: formData.name.trim(),
      price: formSalePrice || 0,
      sale_markup: pricingByMarkup ? Number(formData.markup) : null,
      sellable: formData.sellable,
      ...(editing?.price_pending ? { price_pending: false } : {}),
      ...(store.price_rounding !== undefined ? { price_rounding: formData.rounding } : {}),
      cost: editingRecipeCost?.cost ?? (creatingComposition ? 0 : Number(formData.cost)),
      stock: creatingComposition ? 0 : Number(formData.stock),
      minStock: Number(formData.min),
      emoji: formData.emoji.trim() || "📦",
      active: true,
      brand: formData.brand.trim() || undefined,
      supplier: formData.supplier.trim() || undefined,
      supplierCode: formData.supplierCode.trim() || undefined,
      tags: formData.tags,
      unitType: formData.unitType,
      pack_size: formData.packSize.trim() ? Number(formData.packSize) : null,
      // Solo con la actualización 202611040005, que carga display_size en los productos.
      ...(displayReady ? { display_size: formData.displaySize.trim() ? Number(formData.displaySize) : null } : {}),
      ...(codesReady ? { display_code: formData.displayCode.trim() || null, pack_code: formData.packCode.trim() || null, pallet_packs: formData.palletPacks.trim() ? Number(formData.palletPacks) : null } : {}),
      // Solo si cambió: hasta 202611100001 la base no deja editar el vencimiento y rechazaría el guardado.
      ...((formData.expiryDate || null) !== (editing?.expiry_date ?? null) ? { expiry_date: formData.expiryDate || null } : {}),
    };

    if (!review) {
      invalidateProductSuggestions();
      await doSaveProduct(p);
      return;
    }
    const reviewId = ++anomalyRequest.current;
    const reviewDraft = formData;
    setProductReviewNote('');
    setIsCheckingAnomalies(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let warnings: string[] = [];

    try {
      const categoryName =
        categories.find((c) => c.id === p.categoryId)?.name || "";
      const catalogSample = products
        .filter((prod) => prod.id !== p.id)
        .slice(0, 50)
        .map((prod) => ({
          nombre: prod.name,
          codigo: prod.code,
          categoria: prod.category,
          precio: prod.price,
          costo: prod.cost,
          stockMinimo: prod.minStock,
        }));

      const anomalySystemPrompt = `Sos un auditor de catálogo para comercios de retail y kioscos en Argentina.
Analizás si un producto nuevo a guardar presenta anomalías o posibles duplicados respecto a los productos ya existentes en el catálogo.

Debes detectar:
1. Si ya existe un producto similar o duplicado (por nombre fonético, variación o sinónimo, ej: "Coca Cola" vs "Coca-Cola", "Alfajor Jorgito" vs "Jorgito Chocolate", o código idéntico).
2. Si el precio de venta parece anómalo respecto al costo:
   - Margen negativo: precio menor o igual al costo (se vende a pérdida).
   - Margen excesivamente alto: precio superior al 300% del costo (precio > costo * 4).
3. Si el stock mínimo parece inadecuado para la categoría.

Respondé EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura:
{
  "hasAnomaly": boolean,
  "warnings": [
    "Descripción breve y clara de la anomalía 1",
    "Descripción de la anomalía 2"
  ]
}
Si no encontrás ninguna anomalía ni duplicado, respondé {"hasAnomaly": false, "warnings": []}.`;

      const anomalyUserPrompt = `Producto a guardar:
${JSON.stringify(
  {
    nombre: p.name,
    codigo: p.code,
    categoria: categoryName,
    precioVenta: p.price,
    costo: p.cost,
    stock: p.stock,
    stockMinimo: p.minStock,
    esEdicion: !!editing,
  },
  null,
  2,
)}

Muestra de productos existentes en el catálogo (primeros 50):
${JSON.stringify(catalogSample, null, 2)}`;

      const response = await groqChat(
        [
          { role: "system", content: anomalySystemPrompt },
          { role: "user", content: anomalyUserPrompt },
        ],
        { signal: controller.signal, temperature: 0.1 },
      );
      clearTimeout(timeoutId);

      const parsed = extractJson<{ hasAnomaly: boolean; warnings: string[] }>(
        response,
      );
      if (!parsed || typeof parsed.hasAnomaly !== 'boolean' || !Array.isArray(parsed.warnings) || !parsed.warnings.every(warning => typeof warning === 'string') || (parsed.hasAnomaly && !parsed.warnings.length)) throw new Error('La revisión no devolvió una respuesta válida.');
      if (
        parsed?.hasAnomaly &&
        Array.isArray(parsed.warnings) &&
        parsed.warnings.length > 0
      ) {
        warnings = parsed.warnings;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (reviewId === anomalyRequest.current && reviewDraft === latestProductDraft.current) {
        setProductReviewNote(`${error instanceof Error ? error.message : 'No se pudo revisar el producto.'} Podés reintentar o guardarlo sin revisión.`);
      }
      return;
    } finally {
      if (reviewId === anomalyRequest.current) setIsCheckingAnomalies(false);
    }

    if (reviewId !== anomalyRequest.current || reviewDraft !== latestProductDraft.current) return;
    if (warnings.length > 0) {
      setAnomalyDialog({
        warnings,
        product: p,
      });
      return;
    }

    setProductReviewNote('La revisión con IA no señaló alertas. Revisá los datos y usá Guardar producto cuando quieras.');
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
    editorRef,
    editorTrigger,
    panelRef,
    csvTitleId,
    productOptionsRef,
    invalidFocusPending,
    suggestionRequest,
    priceReviewRequest,
    anomalyRequest,
    productReviewNote,
    setProductReviewNote,
    productOptionsOpen,
    setProductOptionsOpen,
    priceReviewNote,
    setPriceReviewNote,
    productSuggestionNote,
    setProductSuggestionNote,
    formData,
    setFormData,
    tagInput,
    setTagInput,
    latestProductDraft,
    saleUnit,
    editingRecipeCost,
    pricingByMarkup,
    pricingCost,
    storeRounding,
    displayReady,
    codesReady,
    formSalePrice,
    requestManualPrice,
    useCostPrice,
    draftMargin,
    suggestedPriceDraft,
    productOptionsSummary,
    invalidateProductSuggestions,
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
    creatingComposition,
    setCreatingComposition,
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
    suggestion,
    setSuggestion,
    isSuggesting,
    setIsSuggesting,
    priceValidation,
    setPriceValidation,
    isCheckingPrice,
    setIsCheckingPrice,
    isCheckingAnomalies,
    setIsCheckingAnomalies,
    anomalyDialog,
    setAnomalyDialog,
    startAdd,
    startEdit,
    cancelEdit,
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
    handleCodeBlur,
    suggestProductDetails,
    reviewProductPrice,
    applySuggestionField,
    doSaveProduct,
    handleSubmit,
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
