import { NumberInput } from '../../components/NumberInput';
import { ProductMarkupField } from './ProductMarkupField';
import { draftMarkupPrice } from '../../services/productSalePrice';
import { AiIcon } from '../../components/AiIcon';
import { useState, useMemo, useEffect, useRef, useId } from "react";
import { BranchSettings, LedgerSettings } from './BusinessSettings';
import { SectionNav } from './SectionNav';
import { PushSettings } from './PushSettings';
import { StaffAccessForm } from './StaffAccessForm';
import { CashierAccess } from './CashierAccess';
import { StaffMemberAccessEditor } from './StaffMemberAccessEditor';
import { PermissionProfileSettings, StaffProfileAssignment, usePermissionProfiles } from './PermissionProfiles';
import { ProductPriceEditor } from './ProductPriceEditor';
import { CategoryLabelEditor } from './CategoryLabelEditor';
import { ProductMarginStatus } from './ProductMarginStatus';
import { MarginThresholdSettings } from './MarginThresholdSettings';
import { productMargin } from '../../services/productMarginService';
import { ProductDeletionEditor, DeletedProducts } from './ProductDeletionTools';
import { ProductCompositionEditor } from './ProductCompositionEditor';
import { NewCompositeEditor } from './NewCompositeEditor';
import { compositionCost, hasComposition, stockForSale } from '../../services/productComposition';
import { DepotSettings } from './DepotSettings';
import { DepotHistory } from './DepotHistory';
import { BillingSettings } from './BillingSettings';
import { errorMessage } from './api';
import { defaultProductCategory, resolveProductCategory } from '../../services/productCategoryService';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  Filter,
  History,
  Loader2,
  PackageCheck,
  Percent,
  Tag,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Receipt,
  RotateCcw,
  Building2,
  Users,
  SlidersHorizontal,
  Monitor,
  Pencil,
  Plus,
  PackagePlus,
  Layers,
  Trash2,
  Search,
  Store as StoreIcon,
  UserCheck,
  ShieldCheck,
  Clock,
  Mail,
  ArrowLeft,
  Smartphone,
  FolderTree,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { groqChat } from "../../services/groqService";
import { unitsPerPack } from '../../services/inventoryUnits';
import {
  replenishmentService,
  type StockReplenishment,
  type CsvParseResult,
} from "../../services/replenishmentService";
import type { KioscoSale } from "../../types/kiosco";
import type {
  Category,
  Product,
  Store,
  Role,
  Register,
  Member,
  Invitation,
  Branch,
  PendingReplenishment,
} from "./api";
import { retail } from "./api";
import { randomUUID } from "../../utils/uuid";
import { InvoiceAnalyzer } from "../../components/InvoiceAnalyzer";
import { PendingReplenishments } from './PendingReplenishments';
export type Run = (
  action: () => Promise<unknown>,
  message?: string,
) => Promise<boolean>;

export interface EanLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
  category_suggestion?: string;
  emoji?: string;
  source?: "ai" | "community" | "verified";
  confidence_score?: number;
}

interface ProductSuggestion {
  name: string;
  emoji: string;
  category: string;
  brand?: string;
  supplier?: string;
  unitType?: "unit" | "kg" | "lt" | "pack" | "box";
  tags?: string[];
  estimatedPrice?: number | string;
  estimatedCost?: number | string;
  disclaimer?: string;
  source?: "ai" | "community" | "verified";
  confidenceScore?: number;
}

interface PriceValidationAlert {
  alert: string;
  suggestion: number;
  reasoning: string;
}

function cleanSuggestionNumber(val: unknown): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$ ]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num;
  }
  return 0;
}

function extractJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.trim();
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      return JSON.parse(cleaned) as T;
    }
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match?.[1]) {
      return JSON.parse(match[1]) as T;
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
    }
  } catch {
    return null;
  }
  return null;
}

export type CatalogColumnId =
  | 'product'
  | 'code'
  | 'category'
  | 'brand'
  | 'supplier'
  | 'cost'
  | 'price'
  | 'margin'
  | 'stock'
  | 'minStock'
  | 'expiry';

export interface CatalogColumnDef {
  id: CatalogColumnId;
  label: string;
  defaultVisible: boolean;
}

export const CATALOG_COLUMNS: CatalogColumnDef[] = [
  { id: 'product', label: 'Producto', defaultVisible: true },
  { id: 'code', label: 'Código', defaultVisible: false },
  { id: 'category', label: 'Categoría', defaultVisible: true },
  { id: 'brand', label: 'Marca', defaultVisible: false },
  { id: 'supplier', label: 'Proveedor', defaultVisible: false },
  { id: 'cost', label: 'Costo', defaultVisible: false },
  { id: 'price', label: 'Precio', defaultVisible: true },
  { id: 'margin', label: '% Rentabilidad', defaultVisible: false },
  { id: 'stock', label: 'Stock', defaultVisible: true },
  { id: 'minStock', label: 'Stock mínimo', defaultVisible: false },
  { id: 'expiry', label: 'Vencimiento', defaultVisible: false },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<CatalogColumnId, boolean> = {
  product: true,
  code: false,
  category: true,
  brand: false,
  supplier: false,
  cost: false,
  price: true,
  margin: false,
  stock: true,
  minStock: false,
  expiry: false,
};

function getStoredCatalogColumns(storeId: string): Record<CatalogColumnId, boolean> {
  try {
    const raw = localStorage.getItem(`kiosco_catalog_columns_${storeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_VISIBLE_COLUMNS,
          ...parsed,
        };
      }
    }
  } catch {
    // fallback a valores por defecto
  }
  return { ...DEFAULT_VISIBLE_COLUMNS };
}

export function CatalogEditor({
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
  onRefreshRemitos = () => {},
  onReviewedRemito = () => {},
  guided = false,
  active = true,
  allowRestock = false,
  allowPriceEdit = false,
  permissions = [],
}: {
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
  onRefreshRemitos?: () => void;
  onReviewedRemito?: (id: string) => void;
  guided?: boolean;
  active?: boolean;
  allowRestock?: boolean;
  allowPriceEdit?: boolean;
  permissions?: import('./permissions').Permission[];
}) {
  const [editing, setEditing] = useState<Product | null>(null);
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
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
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
    markup: '' as string | null,
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
  const formSalePrice = pricingByMarkup ? draftMarkupPrice(pricingCost, formData.markup!) : Number(formData.price);
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
  const [bulkIsUpdating, setBulkIsUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const canEditCatalog = !role || role === "owner" || role === "admin" || permissions.includes('manage_products');
  const isManager = !role || role === 'owner' || role === 'admin';
  const can = (action: import('./permissions').Permission) => isManager || permissions.includes(action);
  const canRestock = canEditCatalog || allowRestock;
  const canCompose = can('manage_compositions');
  const canDelete = can('delete_products');
  const [newCompositeOpen, setNewCompositeOpen] = useState(false);
  const productEditing = canEditCatalog && (adding || !!editing || (newCompositeOpen && canCompose));
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

  const calculateNewPrice = (p: Product): number => {
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
  }, [bulkMatchedProducts, salesCountMap, bulkAdjustMode, bulkAdjustValue, bulkRoundMultiple]);

  const handleApplyBulkPriceChanges = async () => {
    if (bulkMatchedProducts.length === 0) return;
    const confirmed = window.confirm(
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
      markup: '',
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
      price: String(p.price),
      markup: p.sale_markup == null ? null : String(p.sale_markup),
      sellable: p.sellable !== false,
      cost: String(p.cost || 0),
      stock: String(p.stock),
      min: String(p.minStock),
      brand: p.brand || "",
      supplier: p.supplier || "",
      supplierCode: p.supplierCode || "",
      tags: p.tags ? [...p.tags] : [],
      unitType: (p.unitType as "unit" | "kg" | "lt" | "pack" | "box") || "unit",
      packSize: p.pack_size == null ? '' : String(p.pack_size),
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
  const [replenishByPack, setReplenishByPack] = useState(false);
  const replenishmentPackSize = unitsPerPack(replenishTarget?.pack_size);
  const replenishmentUnits = replenishQty * (replenishByPack ? replenishmentPackSize : 1);
  const [replenishCost, setReplenishCost] = useState<string>("0");
  const [replenishSupplier, setReplenishSupplier] = useState<string>("");
  const [replenishNotes, setReplenishNotes] = useState<string>("");
  const [replenishTask, setReplenishTask] = useState<'receive' | 'to_salon' | 'to_depot'>('receive');
  const [receiveInDepot, setReceiveInDepot] = useState(false);
  const [replenishError, setReplenishError] = useState('');
  const [replenishDepotMode, setReplenishDepotMode] = useState(false);
  const replenishSaving = useRef(false);
  const depotModeChanged = !!replenishTarget && replenishDepotMode !== !!store.depot_enabled;
  const receiving = !store.depot_enabled || replenishTask === 'receive';
  const replenishCurrent = products.find(p => p.id === replenishTarget?.id) || replenishTarget;
  const movingLimit = receiving ? 1000000 : replenishTask === 'to_salon'
    ? (replenishCurrent?.depotStock || 0) : replenishCurrent ? stockForSale(replenishCurrent) : 0;
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
    setReplenishTask(store.depot_enabled && p.depotStock ? 'to_salon' : 'receive');
    setReceiveInDepot(!!store.depot_enabled);
    setReplenishError('');
    setReplenishQty(store.depot_enabled && p.depotStock ? Math.min(12, p.depotStock) : 12);
    setReplenishByPack(false);
    setReplenishCost(String(p.cost || 0));
    setReplenishSupplier("");
    setReplenishNotes("");
  };

  const handleConfirmUnitaryReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || busy || replenishSaving.current || !canRestock || !replenishTarget || !Number.isSafeInteger(replenishQty) || !Number.isSafeInteger(replenishmentUnits) || replenishmentUnits <= 0 || replenishmentUnits > 1000000) return;
    if (depotModeChanged) { setReplenishError('Cambió la configuración de depósito. Cerrá y volvé a abrir Reponer para revisar el destino.'); return; }

    const newStock = (replenishCurrent?.stock || 0) + (receiving ? replenishmentUnits : 0);
    const numCost = parseFloat(replenishCost);
    const validCost = receiving && canEditCatalog && !isNaN(numCost) && numCost >= 0 ? numCost : undefined;
    const depotAction = store.depot_enabled && (!receiving || receiveInDepot);
    const note = receiving ? [replenishSupplier.trim(), replenishNotes.trim()].filter(Boolean).join(' · ') : undefined;
    const signature = JSON.stringify([store.id, replenishTarget.id, replenishmentUnits, validCost ?? null, depotAction ? replenishTask : 'salon', depotAction ? note : null]);
    if (restockRequest.current.signature !== signature) restockRequest.current = { signature, id: randomUUID(), at: new Date().toISOString() };

    replenishSaving.current = true; setReplenishError('');
    let success = false;
    try { success = await run(
      async () => { try {
        if (depotAction) return await retail.depotOperation(store.id, replenishTarget.id, replenishmentUnits, replenishTask, restockRequest.current.id, validCost, note);
        return await retail.replenishProductStock(
          store.id,
          replenishTarget.id,
          newStock,
          validCost,
          replenishmentUnits,
          restockRequest.current,
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
      () => retail.replenishStockBatch(store.id, batch),
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
    () => products.filter((p) => !hasComposition(p) && p.stock <= p.minStock),
    [products],
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
      expiry_date: formData.expiryDate ? formData.expiryDate : null,
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
    return products.filter((p) => (!stockFilter || stockForSale(p) <= p.minStock) && (!lowMarginFilter || p.margin_group === 'low_margin') &&
      (!q || (p.name + " " + p.code + " " + p.category).toLowerCase().includes(q)),
    );
  }, [products, stockFilter, lowMarginFilter, query]);

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
  return (
    <div className="retail-panel" ref={panelRef}>
      <div className="section-heading" hidden={!guided && (productEditing || priceEditing || compositionEditing || deletionEditing)}>
        <div>
          <h2>{guided ? 'Tus productos' : 'Productos e inventario'}</h2>
          <p>
            El catálogo y las existencias se comparten entre las cajas de este
            comercio.
          </p>
        </div>
        <div className="catalog-actions-row">
          {guided && <button type="button" className="text-button" disabled={busy || !categories.length} onClick={() => setIsCsvModalOpen(true)}>Importar desde CSV / Excel</button>}
          {!guided && (canEditCatalog || canRestock || can('edit_prices')) && <details className="catalog-tools" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}><summary>Más herramientas</summary><div className="catalog-tools-menu" onClick={e => { if ((e.target as HTMLElement).closest('button')) { const details = e.currentTarget.closest('details'); if (details) details.open = false; } }}>
          {store.depot_enabled && <small>CSV, facturas y remitos ingresan en salón. Para guardarlos en depósito, usá Reponer.</small>}
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={openHistoryModal}
            title="Ver historial de reposiciones de stock"
          >
            <History size={16} />
            <span>Historial reposición</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy || !categories.length}
            onClick={() => setIsCsvModalOpen(true)}
            hidden={!canRestock}
            title="Cargar stock masivo desde archivo CSV / Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Carga masiva (CSV)</span>
          </button>
          {can('edit_prices') && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !products.length}
              onClick={() => setIsBulkPriceModalOpen(true)}
              title="Ajuste masivo de precios por marca, distribuidor o categoría"
            >
              <Coins size={16} /> Ajustar precios
            </button>
          )}
          {canEditCatalog && (
            <button
              type="button"
              className="secondary-button ai-action"
              disabled={busy || !categories.length}
              onClick={() => setIsInvoiceModalOpen(true)}
              title="Analizar facturas de compra con IA e importar productos a tu stock"
            >
              <AiIcon />
              <span>Importar factura con IA</span>
            </button>
          )}
          </div></details>}
          {!guided && canEditCatalog && canCompose && <button type="button" className="secondary-button" disabled={busy || !categories.length}
            onClick={event => { editorTrigger.current = event.currentTarget; setNewCompositeOpen(true); }}>Crear combo o paquete</button>}
          <button
            type="button"
            className="primary-button"
            disabled={busy || !categories.length}
            hidden={!canEditCatalog || adding || !!editing}
            onClick={event => { editorTrigger.current = event.currentTarget; startAdd(); }}
          >
            + Agregar producto
          </button>
        </div>
      </div>

      {priceEditing && priceTarget && <ProductPriceEditor key={priceTarget.id} storeId={store.id} product={priceTarget} threshold={store.low_margin_threshold} busy={busy} run={run} active={active} onClose={closePriceEditor} />}
      {canDelete && deletionTarget && <ProductDeletionEditor key={deletionTarget.id} storeId={store.id} product={deletionTarget} busy={busy} run={run} active={active} onClose={closeDeletion} />}
      {canDelete && deletionHistoryOpen && <DeletedProducts storeId={store.id} busy={busy} run={run} active={active} onClose={closeDeletion} />}
      {compositionEditing && compositionTarget && <ProductCompositionEditor key={compositionTarget.id} storeId={store.id} product={compositionTarget} products={products} categories={categories} active={active} busy={busy} run={run} onClose={closeCompositionEditor} newProduct={newCompositionProduct} canCreateCombo={canEditCatalog} />}
      {canEditCatalog && canCompose && newCompositeOpen && <NewCompositeEditor key={store.id} storeId={store.id} products={products} categories={categories} active={active} busy={busy} run={run} onClose={closeNewComposite} />}
      {canEditCatalog && (adding || editing) && (
        <form
          key={editing?.id || "new"}
          ref={editorRef}
          className="retail-form product-editor"
          onSubmit={handleSubmit}
          onChangeCapture={invalidateProductSuggestions}
          onInvalidCapture={event => {
            if (!productOptionsRef.current?.contains(event.target as Node)) return;
            productOptionsRef.current.open = true;
            setProductOptionsOpen(true);
            if (invalidFocusPending.current) return;
            invalidFocusPending.current = true;
            requestAnimationFrame(() => {
              invalidFocusPending.current = false;
              editorRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>('input:invalid, select:invalid')?.focus();
            });
          }}
          onKeyDown={event => {
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && productOptionsOpen && productOptionsRef.current?.contains(event.target as Node)) {
              event.preventDefault();
              event.stopPropagation();
              setProductOptionsOpen(false);
              productOptionsRef.current.querySelector('summary')?.focus();
            } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
              // A scanner or a field edit must not implicitly save the whole product.
              event.preventDefault();
              if (event.target.name === 'code') void handleCodeBlur();
            }
          }}
        >
          <h3>{editing ? `Editar ${editing.name}` : creatingComposition ? 'Nuevo combo o paquete' : 'Nuevo producto'}</h3>
          <p className="product-editor-intro">{creatingComposition ? 'Guardá nombre, código y precio. Después elegís los componentes: el stock y el costo se calculan con ellos.' : 'Completá los datos del producto y guardá los cambios. Los demás atributos están en Más opciones.'}</p>

          {/* Feature A: Suggestion loading state */}
          {isSuggesting && (
            <div className="ai-suggest-loading">
              <Loader2 size={16} className="ai-spin-icon" />
              <span>Buscando sugerencias para este producto…</span>
            </div>
          )}

          {/* Feature A: Suggestion chips */}


          {suggestion && (
            <div
              className="ai-suggestion-box"
              role="region"
              aria-label="Sugerencias de catálogo"
            >
              <div className="ai-suggestion-header">
                <div className="ai-suggestion-title">
                  {suggestion.source === "community" ? (
                    <>
                      <span>📦</span>
                      <span>Catálogo comunitario:</span>
                    </>
                  ) : suggestion.source === "verified" ? (
                    <>
                      <span>✅</span>
                      <span>Catálogo verificado:</span>
                    </>
                  ) : (
                    <>
                      <AiIcon size={15} />
                      <span>Sugerencias de IA:</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="ai-suggestion-close"
                  onClick={() => setSuggestion(null)}
                  title="Descartar sugerencias"
                  aria-label="Descartar sugerencias"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="ai-suggestion-chips">
                {suggestion.name && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("name")}
                    title="Click para aplicar este nombre"
                  >
                    <span className="chip-label">Nombre:</span>
                    <strong>{suggestion.name}</strong>
                    {suggestion.source === "verified" && (
                      <span className="source-badge verified-badge">
                        ✅ Verificado
                      </span>
                    )}
                    {suggestion.source === "community" && (
                      <span className="source-badge community-badge">
                        📦 Catálogo comunitario
                      </span>
                    )}
                    {(!suggestion.source || suggestion.source === "ai") && (
                      <span className="source-badge ai-badge">
                        🤖 IA
                      </span>
                    )}
                  </button>
                )}
                {suggestion.emoji && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("emoji")}
                    title="Click para aplicar este emoji"
                  >
                    <span className="chip-label">Emoji:</span>
                    <span>{suggestion.emoji}</span>
                  </button>
                )}
                {suggestion.category && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("category")}
                    title="Click para aplicar esta categoría"
                  >
                    <span className="chip-label">Categoría:</span>
                    <strong>{suggestion.category}</strong>
                  </button>
                )}
                {suggestion.brand && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("brand")}
                    title="Click para aplicar esta marca"
                  >
                    <span className="chip-label">Marca:</span>
                    <strong>{suggestion.brand}</strong>
                  </button>
                )}
                {suggestion.supplier && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("supplier")}
                    title="Click para aplicar este distribuidor"
                  >
                    <span className="chip-label">Distribuidor:</span>
                    <strong>{suggestion.supplier}</strong>
                  </button>
                )}
                {suggestion.unitType && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("unitType")}
                    title="Click para aplicar esta unidad"
                  >
                    <span className="chip-label">Unidad:</span>
                    <strong>{suggestion.unitType}</strong>
                  </button>
                )}
                {suggestion.tags && suggestion.tags.length > 0 && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("tags")}
                    title="Click para agregar estos tags"
                  >
                    <span className="chip-label">Tags:</span>
                    <strong>{suggestion.tags.map((t) => `#${t}`).join(" ")}</strong>
                  </button>
                )}
                {suggestion.estimatedPrice && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("price")}
                    title="Click para aplicar este precio estimado"
                  >
                    <span className="chip-label">Precio est.:</span>
                    <strong>
                      $
                      {cleanSuggestionNumber(
                        suggestion.estimatedPrice,
                      ).toLocaleString("es-AR")}
                    </strong>
                  </button>
                )}
                {suggestion.estimatedCost && (
                  <button
                    type="button"
                    className="ai-chip-item"
                    onClick={() => applySuggestionField("cost")}
                    title="Click para aplicar este costo estimado"
                  >
                    <span className="chip-label">Costo est.:</span>
                    <strong>
                      $
                      {cleanSuggestionNumber(
                        suggestion.estimatedCost,
                      ).toLocaleString("es-AR")}
                    </strong>
                  </button>
                )}
                <button
                  type="button"
                  className="ai-chip-apply-all"
                  onClick={() => applySuggestionField("all")}
                  title="Aplicar todas las sugerencias"
                >
                  <Check size={14} />
                  <span>Aplicar todo</span>
                </button>
              </div>
              {suggestion.disclaimer && (
                <small className="ai-suggestion-disclaimer">
                  *{suggestion.disclaimer}
                </small>
              )}
            </div>
          )}

          <fieldset className="product-basic-group">
            <legend>Datos básicos</legend>
          <div className="form-grid product-basic-fields">
            <label>
              Nombre
              <input
                name="name"
                required
                maxLength={160}
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej. Alfajor Jorgito Chocolate o Coca-Cola 500ml"
              />
            </label>
            <label>
              Código de barras o interno
              <input
                name="code"
                required
                maxLength={100}
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                onBlur={guided ? undefined : handleCodeBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!guided) void handleCodeBlur();
                  }
                }}
                placeholder="Escaneá o ingresá el código EAN"
              />
            </label>
            {!creatingComposition && <label>
              Uso del producto
              <select value={formData.sellable ? 'sale' : 'ingredient'} onChange={e => setFormData(prev => ({ ...prev, sellable: e.target.value === 'sale' }))}>
                <option value="sale">Para vender</option>
                <option value="ingredient">Solo insumo</option>
              </select>
              {!formData.sellable && <small>Se repone y se usa en combos. No aparece en Vender ni necesita precio de venta.</small>}
            </label>}
            <label>
              Costo por {saleUnit} ($)
              <NumberInput
                name="cost"
                disabled={creatingComposition || (!!editing && hasComposition(editing))}
                type="number"
                min={pricingByMarkup ? '0.01' : '0'}
                step="0.01"
                required
                value={editingRecipeCost?.cost ?? (creatingComposition ? '' : formData.cost)}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, cost: e })); }
                }
                placeholder="0.00"
              />
              {(creatingComposition || (editing && hasComposition(editing))) && <small>Se calcula sumando el costo de los componentes. Para cambiarlo, editá el costo de los insumos.</small>}
              {!!editingRecipeCost?.missing.length && <small role="status">Falta cargar el costo de: {editingRecipeCost.missing.join(', ')}.</small>}
            </label>
            {formData.sellable && formData.markup !== null && <ProductMarkupField value={formData.markup}
              onChange={markup => { invalidateProductSuggestions(); setFormData(prev => ({ ...prev, markup })); }} />}
            {editing && formData.sellable && <label>Precio
              <select value={formData.markup === null ? 'manual' : 'markup'} onChange={event => setFormData(prev => ({ ...prev,
                price: String(formSalePrice || prev.price), markup: event.target.value === 'manual' ? null : prev.markup ?? (pricingCost > 0 ? String(Math.round((Number(prev.price) / pricingCost - 1) * 10000) / 100) : ''),
              }))}><option value="markup">Por porcentaje sobre costo</option><option value="manual">Manual</option></select>
            </label>}
            <label className="retail-price-field" hidden={!formData.sellable}>
              Precio en la lista principal por {saleUnit} ($)
              <NumberInput
                name="price"
                disabled={!formData.sellable}
                type="number"
                min="0.01"
                max="9999999999"
                step="0.01"
                required={formData.sellable && !pricingByMarkup}
                readOnly={pricingByMarkup}
                value={pricingByMarkup ? formSalePrice ?? '' : formData.price}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, price: e })); }
                }
                placeholder="0.00"
              />
              {isCheckingPrice && (
                <div className="price-ai-evaluating">
                  <Loader2 className="animate-spin" size={13} />
                  <span>Analizando margen con IA...</span>
                </div>
              )}
              {priceValidation && (
                <div
                  className="price-ai-alert-banner"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="price-ai-alert-top">
                    <div className="price-ai-alert-title-row">
                      <AlertTriangle className="price-ai-warn-icon" size={16} />
                      <span className="price-ai-alert-title">
                        {priceValidation.alert}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="price-ai-alert-close"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPriceValidation(null);
                      }}
                      title="Descartar aviso"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {priceValidation.reasoning && (
                    <p className="price-ai-reasoning">
                      {priceValidation.reasoning}
                    </p>
                  )}
                  {priceValidation.suggestion > 0 && (
                    <div className="price-ai-actions">
                      <button
                        type="button"
                        className="price-ai-suggestion-chip ai-action"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData((prev) => suggestedPriceDraft(prev, priceValidation.suggestion));
                          setPriceValidation(null);
                        }}
                        title={`Aplicar precio sugerido de $${priceValidation.suggestion.toLocaleString("es-AR")}`}
                      >
                        <AiIcon size={13} />
                        <span>
                          Usar precio sugerido: $
                          {priceValidation.suggestion.toLocaleString("es-AR")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </label>
            {formData.sellable && !creatingComposition && <ProductMarginStatus price={formSalePrice || 0} cost={pricingCost} threshold={store.low_margin_threshold} />}
            <label>
              Fecha de vencimiento (opcional)
              <input
                name="expiry_date"
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                }
              />
              <small>Si hay varios lotes, indicá el próximo vencimiento. No cambia precios ni bloquea ventas.</small>
            </label>
            <label>
              {store.depot_enabled ? 'Stock total' : 'Stock actual'} ({saleUnit === 'unidad' ? 'unidades' : saleUnit === 'litro' ? 'litros' : saleUnit === 'pack' ? 'packs' : saleUnit === 'caja' ? 'cajas' : saleUnit})
              <NumberInput
                name="stock"
                type="number"
                disabled={creatingComposition || (!!editing && hasComposition(editing))}
                min={editing?.depotStock || 0}
                step="1"
                required
                value={formData.stock}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, stock: e })); }
                }
              />
              {(creatingComposition || (editing && hasComposition(editing))) && <small>Disponibilidad calculada por componentes. Reponelos desde el listado.</small>}
              {!!editing?.depotStock && <small>{editing.depotStock.toLocaleString('es-AR')} unidades están en depósito. Cambiar este total ajusta el salón; para mover unidades usá Reponer.</small>}
            </label>
          </div>
          </fieldset>
          <div hidden={guided} className="product-help-actions" aria-label="Ayudas opcionales para el producto">
            <button type="button" className="text-button ai-action" disabled={busy || isSuggesting || (formData.name.trim().length < 2 && !formData.code.trim())} onClick={() => void suggestProductDetails()}>
              <AiIcon size={14} /> Sugerir datos
            </button>
            <button type="button" className="text-button ai-action" disabled={busy || isCheckingPrice || !formData.sellable || creatingComposition} onClick={() => void reviewProductPrice()}>
              <AiIcon size={14} /> Revisar precio
            </button>
            <button type="button" className="text-button ai-action" disabled={busy || isCheckingAnomalies} onClick={e => { if (editorRef.current?.reportValidity()) void handleSubmit(e, true); }}>
              <AiIcon size={14} />
              {isCheckingAnomalies ? 'Revisando…' : 'Revisar posibles errores'}
            </button>
            <small>Estas ayudas usan IA y son opcionales.</small>
          </div>
          {productSuggestionNote && <p className="product-help-note" role="status">{productSuggestionNote}</p>}
          {priceReviewNote && <p className="product-help-note" role="status">{priceReviewNote}</p>}
          {productReviewNote && <p className="product-help-note" role="status">{productReviewNote}</p>}
          <details className="product-more-options" ref={productOptionsRef} open={productOptionsOpen} onToggle={event => setProductOptionsOpen(event.currentTarget.open)}>
            <summary><strong>Más opciones</strong><span>{editing && productOptionsSummary ? productOptionsSummary : 'Categoría, proveedor, bultos y otros datos'}</span></summary>
            <fieldset className="product-options-group">
              <legend>Organización y proveedor</legend>
              <div className="form-grid">
            <label>
              Categoría
              <select
                name="category"
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
              >
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Marca
              <input
                name="brand"
                maxLength={80}
                value={formData.brand}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, brand: e.target.value }))
                }
                placeholder="Ej: Coca-Cola, Arcor, Bimbo"
              />
            </label>
            <label>
              Distribuidor
              <input
                name="supplier"
                maxLength={100}
                value={formData.supplier}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplier: e.target.value }))
                }
                placeholder="Ej: Distribuidora Norte SRL"
              />
            </label>
            <label>
              Cód. Proveedor
              <input
                name="supplierCode"
                maxLength={50}
                value={formData.supplierCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplierCode: e.target.value,
                  }))
                }
                placeholder="Código del proveedor (opcional)"
              />
            </label>
            <div className="product-tags-field">
              <label>
                Etiquetas / Tags
                <div className="tags-input-wrapper">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const tag = tagInput.trim().replace(/^#/, "");
                        if (tag && !formData.tags.includes(tag)) {
                          setFormData((prev) => ({
                            ...prev,
                            tags: [...prev.tags, tag],
                          }));
                        }
                        setTagInput("");
                      }
                    }}
                    placeholder="Escribí un tag y presioná Enter (ej: refrigerado, importado)"
                  />
                </div>
              </label>
              {formData.tags.length > 0 && (
                <div className="tags-chips-list">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tags: prev.tags.filter((t) => t !== tag),
                          }))
                        }
                        title="Eliminar tag"
                        aria-label={`Eliminar tag ${tag}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <label>
              Ícono
              <input
                name="emoji"
                maxLength={8}
                value={formData.emoji}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, emoji: e.target.value }))
                }
              />
            </label>
              </div>
            </fieldset>
            <fieldset className="product-options-group">
              <legend>Presentación y avisos</legend>
              <div className="form-grid">
            <label>
              Unidad
              <select
                name="unitType"
                value={formData.unitType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    unitType: e.target.value as
                      | "unit"
                      | "kg"
                      | "lt"
                      | "pack"
                      | "box",
                  }))
                }
              >
                <option value="unit">Unidad (unit)</option>
                <option value="kg">Kilo (kg)</option>
                <option value="lt">Litro (lt)</option>
                <option value="pack">Pack (pack)</option>
                <option value="box">Caja (box)</option>
              </select>
            </label>
            <label title="Cuántas unidades tiene cada bulto que comprás. Al reponer podés ingresar la cantidad de bultos y el sistema multiplica.">
              Unidades por bulto/pack
              <NumberInput name="pack_size" type="number" min="1" max="2147483647" step="1" value={formData.packSize} placeholder="Opcional, ej. 24" onValueChange={e => { invalidateProductSuggestions(); setFormData(prev => ({ ...prev, packSize: e })); }} />
              <small>El precio, el costo y el stock se expresan por {saleUnit}. El bulto se usa para convertir cantidades al reponer.</small>
            </label>
            <label>
              Avisar cuando queden
              <NumberInput
                name="min"
                type="number"
                min="0"
                step="1"
                required
                value={formData.min}
                onValueChange={(e) =>
                  { invalidateProductSuggestions(); setFormData((prev) => ({ ...prev, min: e })); }
                }
              />
            </label>
              </div>
            </fieldset>
          </details>
          <div className="button-row product-editor-actions">
            <button
              className="primary-button"
              disabled={busy}
            >
              {creatingComposition ? 'Crear y elegir componentes' : 'Guardar producto'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={cancelEdit}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Feature B: Confirmation Dialog for Anomalies */}
      {anomalyDialog && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="anomaly-dialog-title"
        >
          <div className="ai-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="anomaly-dialog-title">
                <AlertTriangle size={20} className="ai-warn-icon" />
                <h3>Advertencia de Catálogo</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => setAnomalyDialog(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ai-modal-body">
              <p>
                Detectamos posibles anomalías o duplicados para este producto:
              </p>
              <ul className="ai-warning-list">
                {anomalyDialog.warnings.map((w, idx) => (
                  <li key={idx}>
                    <AlertCircle size={16} />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <p className="ai-modal-note">
                Podés revisar los datos o guardar el producto de todas formas.
              </p>
            </div>
            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAnomalyDialog(null)}
              >
                Revisar y corregir
              </button>
              <button
                type="button"
                className="primary-button ai-modal-confirm-btn"
                disabled={busy}
                onClick={() => void doSaveProduct(anomalyDialog.product)}
              >
                Guardar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Reposición Unitaria de Stock */}
      {replenishTarget && canRestock && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="replenish-modal-title"
          ref={replenishDialog}
          onKeyDown={event => {
            if (!active) return;
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeReplenish(); }
            if (event.key !== 'Tab') return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), summary, a[href], [tabindex="0"]')).filter(control => control.getClientRects().length);
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
        >
          <div className="ai-modal-card replenish-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="replenish-modal-title">
                <PackageCheck size={20} className="ai-success-icon" />
                <h3>{store.depot_enabled ? receiving ? 'Recibir mercadería' : replenishTask === 'to_salon' ? 'Reponer salón' : 'Guardar en depósito' : 'Reponer stock de producto'}</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                disabled={busy || !active}
                onClick={closeReplenish}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleConfirmUnitaryReplenish}
              className="replenish-form"
            >
              <fieldset className="depot-restock-fields" disabled={busy || !active}>
              <div className="replenish-product-hero">
                <span className="replenish-product-emoji">
                  {replenishTarget.emoji || "📦"}
                </span>
                <div>
                  <h4 className="replenish-product-name">
                    {replenishTarget.name}
                  </h4>
                  <span className="replenish-product-code">
                    Código: {replenishTarget.code}
                  </span>
                </div>
              </div>

              {store.depot_enabled && <>
                <div className="depot-tasks" role="group" aria-label="Tarea de stock">
                  {([{ id: 'to_salon', label: 'Reponer salón' }, { id: 'receive', label: 'Recibir mercadería' }, { id: 'to_depot', label: 'Guardar en depósito' }] as const).map(task =>
                    <button key={task.id} type="button" className={replenishTask === task.id ? 'primary-button' : 'secondary-button'} aria-pressed={replenishTask === task.id}
                      onClick={() => { setReplenishTask(task.id); setReplenishError(''); }}>{task.label}</button>)}
                </div>
                <div className="depot-summary" role="status">
                  <span>Salón: <strong>{replenishCurrent ? stockForSale(replenishCurrent).toLocaleString('es-AR') : '0'}</strong></span>
                  <span>Depósito: <strong>{(replenishCurrent?.depotStock || 0).toLocaleString('es-AR')}</strong></span>
                  <span>Total: <strong>{replenishCurrent?.stock.toLocaleString('es-AR')}</strong></span>
                </div>
                {receiving ? <label>Ingresar en<select value={receiveInDepot ? 'depot' : 'salon'} onChange={event => { setReceiveInDepot(event.target.value === 'depot'); setReplenishError(''); }}>
                  <option value="depot">Depósito</option><option value="salon">Salón</option>
                </select></label> : <small>{replenishTask === 'to_salon' ? 'Del depósito al salón.' : 'Del salón al depósito.'} El total no cambia. Requiere conexión.</small>}
                {receiving && receiveInDepot && <small>Ingresa al depósito; no queda disponible para vender hasta reponer el salón. Requiere conexión.</small>}
                {!receiving && <small>Disponibles en el origen: {movingLimit.toLocaleString('es-AR')} unidades. Se verifica al confirmar.</small>}
              </>}
              <div className="replenish-stock-status-box" hidden={!!store.depot_enabled}>
                <div className="status-col">
                  <span className="col-label">Stock actual</span>
                  <span className="col-val">{replenishTarget.stock} u.</span>
                </div>
                <div className="status-divider">+</div>
                <div className="status-col">
                  <span className="col-label">A ingresar</span>
                  <span className="col-val accent">
                    +{replenishmentUnits || 0} u.
                  </span>
                </div>
                <div className="status-divider">=</div>
                <div className="status-col">
                  <span className="col-label">Stock resultante</span>
                  <span className="col-val final">
                    {replenishTarget.stock + (replenishmentUnits || 0)} u.
                  </span>
                </div>
              </div>

              {replenishmentPackSize > 1 && <label className="pack-mode-toggle">
                <input type="checkbox" checked={replenishByPack} onChange={e => { setReplenishByPack(e.target.checked); setReplenishQty(1); }} />
                Ingresar por bultos <small>({replenishmentPackSize} unidades por bulto)</small>
              </label>}
              <div className="replenish-quick-buttons">
                <span className="quick-label">Accesos rápidos:</span>
                {(replenishByPack ? [1, 2, 3, 5, 10] : [6, 12, 24, 48, 100]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`quick-chip ${replenishQty === num ? "active" : ""}`}
                    onClick={() => setReplenishQty(num)}
                  >
                    +{num}
                  </button>
                ))}
              </div>

              <div className="replenish-input-grid">
                <label>
                  {replenishByPack ? 'Cantidad de bultos' : 'Cantidad a ingresar (+)'}
                  <NumberInput
                    type="number"
                    min="1"
                    step="1"
                    max={Math.floor(1000000 / (replenishByPack ? replenishmentPackSize : 1))}
                    required
                    value={replenishQty}
                    onValueChange={(e) =>
                      setReplenishQty(
                        Number(e),
                      )
                    }
                  />
                  {replenishByPack && <small aria-live="polite">= {replenishmentUnits.toLocaleString('es-AR')} unidades individuales</small>}
                </label>
                <label hidden={!receiving}>
                  Nuevo costo unitario ($) <small>{canEditCatalog ? '(opcional)' : '(reservado a administración)'}</small>
                  <NumberInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={replenishCost}
                    disabled={!canEditCatalog || !receiving}
                    onValueChange={(e) => setReplenishCost(e)}
                    placeholder="0.00"
                  />
                </label>
                {receiving && <ProductMarginStatus price={replenishTarget.sale_markup == null ? replenishTarget.price : draftMarkupPrice(canEditCatalog && replenishCost.trim() ? Number(replenishCost) : replenishTarget.cost, String(replenishTarget.sale_markup)) ?? 0} cost={canEditCatalog && replenishCost.trim() ? Number(replenishCost) : replenishTarget.cost} threshold={store.low_margin_threshold} />}
              </div>

              <div className="replenish-input-grid" hidden={!receiving}>
                <label>
                  Proveedor o Distribuidor <small>(opcional)</small>
                  <input
                    type="text"
                    disabled={!receiving}
                    value={replenishSupplier}
                    onChange={(e) => setReplenishSupplier(e.target.value)}
                    placeholder="Ej. Arcor, Distribuidora Sur"
                  />
                </label>
                <label>
                  N° de Remito / Comprobante <small>(opcional)</small>
                  <input
                    type="text"
                    disabled={!receiving}
                    value={replenishNotes}
                    onChange={(e) => setReplenishNotes(e.target.value)}
                    placeholder="Ej. Remito R-000458"
                  />
                </label>
              </div>

              {replenishError && <p role="alert" className="movement-error">{replenishError}</p>}
              {depotModeChanged && <p role="alert">Cambió la configuración de depósito. Cerrá y volvé a abrir Reponer antes de guardar.</p>}
              <div className="ai-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={closeReplenish}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy || depotModeChanged || !Number.isSafeInteger(replenishQty) || !Number.isSafeInteger(replenishmentUnits) || replenishmentUnits <= 0 || replenishmentUnits > 1000000}
                >
                  {store.depot_enabled ? receiving ? 'Confirmar ingreso' : replenishTask === 'to_salon' ? 'Reponer salón' : 'Guardar en depósito' : 'Confirmar reposición'} ({replenishmentUnits.toLocaleString('es-AR')} u.)
                </button>
              </div>
              </fieldset>
              {store.depot_enabled && <DepotHistory key={replenishTarget.id} store={store.id} product={replenishTarget.id} active={active && !busy} />}
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Carga Masiva de Stock vía CSV / Excel */}
      {isCsvModalOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={csvTitleId}
        >
          <div className="ai-modal-card csv-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id={csvTitleId}>
                <FileSpreadsheet size={20} className="ai-brand-icon" />
                <h3>Carga Masiva de Stock (CSV / Excel)</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvParseResult(null);
                  setCsvFileName("");
                }}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="csv-modal-body">
              {/* Sección 1: Descargar planilla */}
              <div className="csv-step-box">
                <div className="step-badge">Paso 1</div>
                <div className="step-content">
                  <h4>Descargá la planilla modelo</h4>
                  <p>
                    Abrila en Excel o Google Sheets, completá las cantidades a
                    sumar en la columna <strong>cantidad_a_sumar</strong> y
                    guardala como .csv.
                  </p>
                  <div className="csv-download-buttons">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleDownloadCsv(true)}
                    >
                      <Download size={15} />
                      <span>
                        Descargar con mi catálogo ({products.length} productos)
                      </span>
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleDownloadCsv(false)}
                    >
                      <FileSpreadsheet size={15} />
                      <span>Plantilla vacía de ejemplo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sección 2: Cargar archivo */}
              <div className="csv-step-box">
                <div className="step-badge">Paso 2</div>
                <div className="step-content">
                  <h4>Subí el archivo .csv completado</h4>
                  <label className="csv-dropzone">
                    <Upload size={24} className="dropzone-icon" />
                    <span className="dropzone-title">
                      {csvFileName
                        ? csvFileName
                        : "Hacé click para seleccionar tu planilla .csv"}
                    </span>
                    <span className="dropzone-sub">
                      Compatible con Excel (separadores por coma o punto y coma)
                    </span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleCsvFileInput}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {/* Resumen de validación y previsualización */}
              {csvParseResult && (
                <div className="csv-preview-section">
                  <div className="csv-stats-bar">
                    <span className="stat-pill success">
                      <CheckCircle2 size={14} />
                      {csvParseResult.matchedCount} productos listos
                    </span>
                    <span className="stat-pill info">
                      +{csvParseResult.totalUnitsToAdd} unidades a sumar
                    </span>
                    {csvParseResult.notFoundCount > 0 && (
                      <span className="stat-pill warning">
                        <AlertTriangle size={14} />
                        {csvParseResult.notFoundCount} no encontrados
                      </span>
                    )}
                  </div>

                  <div className="table-scroll csv-preview-table-container">
                    <table className="csv-preview-table">
                      <thead>
                        <tr>
                          <th>Estado</th>
                          <th>Producto</th>
                          <th>Stock actual</th>
                          <th>A ingresar (+)</th>
                          <th>Stock final</th>
                          <th>Nuevo costo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvParseResult.validRows.map((r, i) => (
                          <tr key={`v-${i}`}>
                            <td>
                              <span className="badge-ok">✓ Coincide</span>
                            </td>
                            <td>
                              <strong>
                                {r.product?.emoji} {r.rawName}
                              </strong>
                              <small>{r.rawCode}</small>
                            </td>
                            <td>{r.product?.stock} u.</td>
                            <td>
                              <strong className="text-success">
                                +{r.quantityAdded} u.
                              </strong>
                              {r.warning && <small className="pack-conversion-warning"><AlertTriangle size={14} aria-hidden="true" />{r.warning}</small>}
                              {unitsPerPack(r.product?.pack_size) > 1 && <label className="csv-pack-choice">
                                Cantidad original: {r.rawQuantity}
                                <select aria-label={`Interpretar cantidad de ${r.rawName}, fila ${i + 1}`} value={r.interpretedAsPacks ? 'packs' : 'units'} disabled={busy || isProcessingCsv} onChange={e => {
                                  const asPacks = e.target.value === 'packs';
                                  setCsvParseResult(previous => {
                                    if (!previous) return previous;
                                    const validRows = previous.validRows.map((row, index) => {
                                      if (index !== i) return row;
                                      const raw = row.rawQuantity ?? row.quantityAdded;
                                      const size = unitsPerPack(row.product?.pack_size);
                                      return { ...row, interpretedAsPacks: asPacks, quantityAdded: raw * (asPacks ? size : 1), warning: asPacks ? `Se interpretó como bultos y se multiplicó por pack_size (${size}): ${raw} × ${size} = ${raw * size} unidades.` : undefined };
                                    });
                                    return { ...previous, validRows, totalUnitsToAdd: validRows.reduce((sum, row) => sum + row.quantityAdded, 0) };
                                  });
                                }}>
                                  <option value="units">Unidades individuales</option>
                                  <option value="packs" disabled={(r.rawQuantity || 0) * unitsPerPack(r.product?.pack_size) > 1000000}>Bultos ×{r.product?.pack_size}</option>
                                </select>
                              </label>}
                            </td>
                            <td>
                              <strong>
                                {(r.product?.stock || 0) + r.quantityAdded} u.
                              </strong>
                            </td>
                            <td>
                              {r.newCost
                                ? `$${r.newCost.toLocaleString("es-AR")}`
                                : "Sin cambio"}
                            </td>
                          </tr>
                        ))}
                        {csvParseResult.invalidRows.map((r, i) => (
                          <tr key={`inv-${i}`} className="row-invalid">
                            <td>
                              <span className="badge-err">⚠️ Error</span>
                            </td>
                            <td>
                              <strong>{r.rawName || "Sin nombre"}</strong>
                              <small>{r.rawCode || "Sin código"}</small>
                            </td>
                            <td colSpan={4} className="err-cell">
                              {r.errorMessage}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className="replenish-input-grid"
                    style={{ marginTop: "12px" }}
                  >
                    <label>
                      Proveedor / Distribuidor <small>(opcional)</small>
                      <input
                        type="text"
                        value={csvSupplier}
                        onChange={(e) => setCsvSupplier(e.target.value)}
                        placeholder="Ej. Distribuidora Mayorista"
                      />
                    </label>
                    <label>
                      N° de Remito / Observación <small>(opcional)</small>
                      <input
                        type="text"
                        value={csvNotes}
                        onChange={(e) => setCsvNotes(e.target.value)}
                        placeholder="Ej. Factura 0001-00045"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={busy || isProcessingCsv}
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvParseResult(null);
                  setCsvFileName("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={
                  busy ||
                  isProcessingCsv ||
                  !csvParseResult ||
                  csvParseResult.matchedCount === 0
                }
                onClick={handleConfirmBulkCsvReplenish}
              >
                {isProcessingCsv ? (
                  <>
                    <Loader2 size={16} className="ai-spin-icon" />
                    <span>Aplicando reposición…</span>
                  </>
                ) : (
                  `Confirmar reposición (${csvParseResult?.matchedCount || 0} prod. / +${csvParseResult?.totalUnitsToAdd || 0} u.)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Historial de Reposiciones de Stock */}
      {isHistoryModalOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
        >
          <div className="ai-modal-card history-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="history-modal-title">
                <History size={20} className="ai-brand-icon" />
                <h3>Historial de Reposiciones de Stock</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => setIsHistoryModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="history-modal-body">
              {historyList.length === 0 ? (
                <div className="history-empty-state">
                  <PackageCheck size={36} className="empty-icon" />
                  <h4>No hay reposiciones registradas todavía</h4>
                  <p>
                    Cada vez que repongas stock de forma unitaria o mediante
                    planilla CSV, el ingreso quedará registrado acá para tu
                    control y auditoría.
                  </p>
                </div>
              ) : (
                <div className="history-timeline">
                  {historyList.map((record) => {
                    const isExpanded = expandedRecordId === record.id;
                    const dateFormatted = new Date(
                      record.createdAt,
                    ).toLocaleString("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div key={record.id} className="history-item-card">
                        <div
                          className="history-item-header"
                          onClick={() =>
                            setExpandedRecordId(isExpanded ? null : record.id)
                          }
                        >
                          <div className="history-header-left">
                            <span
                              className={`replenish-type-badge ${record.type}`}
                            >
                              {record.type === "csv"
                                ? "Planilla CSV"
                                : "Unitaria"}
                            </span>
                            <span className="history-date">
                              {dateFormatted}
                            </span>
                          </div>

                          <div className="history-header-right">
                            <span className="history-units-badge">
                              +{record.totalUnits} u.
                            </span>
                            <span className="history-products-count">
                              ({record.itemsCount}{" "}
                              {record.itemsCount === 1
                                ? "producto"
                                : "productos"}
                              )
                            </span>
                          </div>
                        </div>

                        {(record.supplier || record.notes) && (
                          <div className="history-meta-row">
                            {record.supplier && (
                              <span className="history-supplier">
                                <strong>Proveedor:</strong> {record.supplier}
                              </span>
                            )}
                            {record.notes && (
                              <span className="history-notes">
                                <strong>Nota / Remito:</strong> {record.notes}
                              </span>
                            )}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="history-expanded-items">
                            <table className="history-items-table">
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Stock previo</th>
                                  <th>Ingreso</th>
                                  <th>Stock resultante</th>
                                  <th>Costo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <strong>{item.name}</strong>
                                      <small>{item.code}</small>
                                    </td>
                                    <td>{item.previousStock} u.</td>
                                    <td>
                                      <strong className="text-success">
                                        +{item.quantityAdded} u.
                                      </strong>
                                    </td>
                                    <td>
                                      <strong>{item.newStock} u.</strong>
                                    </td>
                                    <td>
                                      {item.cost
                                        ? `$${item.cost.toLocaleString("es-AR")}`
                                        : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Ajuste de Precios en Bloque */}
      {isBulkPriceModalOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-price-modal-title"
        >
          <div className="ai-modal-card bulk-price-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="bulk-price-modal-title">
                <Coins size={22} className="ai-brand-icon" />
                <h3>Ajuste de Precios en Bloque</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => {
                  if (!bulkIsUpdating) setIsBulkPriceModalOpen(false);
                }}
                disabled={bulkIsUpdating}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bulk-modal-body">
              {/* 1. SECCIÓN DE FILTROS */}
              <div className="bulk-section-box">
                <div className="bulk-section-title">
                  <Filter size={16} />
                  <span>1. Filtros de Segmentación (Opcionales y combinables)</span>
                  {(bulkFilterCategory ||
                    bulkFilterBrand ||
                    bulkFilterSupplier ||
                    bulkFilterSelectedTags.length > 0) && (
                    <button
                      type="button"
                      className="text-button clear-filters-btn"
                      onClick={() => {
                        setBulkFilterCategory("");
                        setBulkFilterBrand("");
                        setBulkFilterSupplier("");
                        setBulkFilterSelectedTags([]);
                      }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="bulk-filters-grid">
                  <label>
                    <span>Categoría:</span>
                    <select
                      value={bulkFilterCategory}
                      onChange={(e) => setBulkFilterCategory(e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Marca:</span>
                    <input
                      type="text"
                      value={bulkFilterBrand}
                      onChange={(e) => setBulkFilterBrand(e.target.value)}
                      placeholder="Búsqueda parcial (ej: Arcor)"
                    />
                  </label>

                  <label>
                    <span>Distribuidor:</span>
                    <input
                      type="text"
                      value={bulkFilterSupplier}
                      onChange={(e) => setBulkFilterSupplier(e.target.value)}
                      placeholder="Búsqueda parcial (ej: Norte)"
                    />
                  </label>
                </div>

                {availableCatalogTags.length > 0 && (
                  <div className="bulk-tags-filter-wrap">
                    <span className="bulk-tags-label">
                      <Tag size={13} /> Filtrar por Tags:
                    </span>
                    <div className="bulk-tags-chips">
                      {availableCatalogTags.map((tag) => {
                        const isSelected = bulkFilterSelectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`bulk-tag-chip-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setBulkFilterSelectedTags((prev) =>
                                isSelected
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag],
                              );
                            }}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. MODO DE AJUSTE */}
              <div className="bulk-section-box">
                <div className="bulk-section-title">
                  <DollarSign size={16} />
                  <span>2. Modo de Ajuste de Precios</span>
                </div>

                <div className="bulk-mode-options">
                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "increase_pct" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="increase_pct"
                      checked={bulkAdjustMode === "increase_pct"}
                      onChange={() => setBulkAdjustMode("increase_pct")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <ArrowUpRight size={15} /> % de aumento
                      </span>
                      <small>Sube el precio en un porcentaje</small>
                    </div>
                  </label>

                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "decrease_pct" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="decrease_pct"
                      checked={bulkAdjustMode === "decrease_pct"}
                      onChange={() => setBulkAdjustMode("decrease_pct")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <ArrowDownRight size={15} /> % de descuento
                      </span>
                      <small>Baja el precio en un porcentaje</small>
                    </div>
                  </label>

                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "fixed_margin" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="fixed_margin"
                      checked={bulkAdjustMode === "fixed_margin"}
                      onChange={() => setBulkAdjustMode("fixed_margin")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <Percent size={15} /> Nuevo margen fijo
                      </span>
                      <small>Aplica % sobre costo del producto</small>
                    </div>
                  </label>

                  <label
                    className={`bulk-mode-card ${bulkAdjustMode === "absolute_price" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bulkAdjustMode"
                      value="absolute_price"
                      checked={bulkAdjustMode === "absolute_price"}
                      onChange={() => setBulkAdjustMode("absolute_price")}
                    />
                    <div className="bulk-mode-info">
                      <span className="bulk-mode-name">
                        <Coins size={15} /> Precio absoluto
                      </span>
                      <small>Mismo precio para todos</small>
                    </div>
                  </label>
                </div>

                <div className="bulk-value-and-rounding-row">
                  <label className="bulk-value-input-wrap">
                    <span>
                      {bulkAdjustMode === "increase_pct" && "Porcentaje de aumento (%):"}
                      {bulkAdjustMode === "decrease_pct" && "Porcentaje de descuento (%):"}
                      {bulkAdjustMode === "fixed_margin" && "Margen sobre costo (%):"}
                      {bulkAdjustMode === "absolute_price" && "Nuevo precio final ($):"}
                    </span>
                    <NumberInput
                      type="number"
                      step={bulkAdjustMode === "absolute_price" ? "10" : "1"}
                      min="0"
                      value={bulkAdjustValue}
                      onValueChange={(e) => setBulkAdjustValue(e)}
                      placeholder={bulkAdjustMode === "absolute_price" ? "1500" : "15"}
                    />
                  </label>

                  <label className="bulk-rounding-wrap">
                    <span>Redondeo de precios:</span>
                    <select
                      value={bulkRoundMultiple}
                      onChange={(e) => setBulkRoundMultiple(Number(e.target.value))}
                    >
                      <option value={0}>Sin redondeo</option>
                      <option value={50}>Redondear a múltiplo de $50</option>
                      <option value={100}>Redondear a múltiplo de $100</option>
                      <option value={500}>Redondear a múltiplo de $500</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* 3. RESUMEN DE IMPACTO */}
              <div className="bulk-impact-summary-box">
                <div className="impact-metric">
                  <span className="metric-label">Productos afectados</span>
                  <strong className="metric-value">
                    {bulkMatchedProducts.length}
                  </strong>
                </div>

                <div className="impact-metric">
                  <span className="metric-label">Ingreso mensual estimado actual</span>
                  <strong className="metric-value">
                    ${currentEstRevenue.toLocaleString("es-AR")}
                  </strong>
                </div>

                <div className="impact-metric">
                  <span className="metric-label">Ingreso mensual estimado nuevo</span>
                  <strong className="metric-value highlight">
                    ${newEstRevenue.toLocaleString("es-AR")}
                  </strong>
                </div>

                <div className="impact-metric">
                  <span className="metric-label">Variación estimada</span>
                  <span
                    className={`delta-badge ${newEstRevenue >= currentEstRevenue ? "positive" : "negative"}`}
                  >
                    {newEstRevenue >= currentEstRevenue ? "+" : ""}
                    ${(newEstRevenue - currentEstRevenue).toLocaleString("es-AR")} (
                    {currentEstRevenue > 0
                      ? `${Math.round(((newEstRevenue - currentEstRevenue) / currentEstRevenue) * 100)}%`
                      : "0%"}
                    )
                  </span>
                </div>
              </div>

              {/* Progress Bar (visible during update) */}
              {bulkIsUpdating && (
                <div className="bulk-progress-container">
                  <div className="bulk-progress-header">
                    <Loader2 size={16} className="ai-spin-icon" />
                    <span>Actualizando precios en base de datos… ({bulkProgress}%)</span>
                  </div>
                  <div className="bulk-progress-track">
                    <div
                      className="bulk-progress-fill"
                      style={{ width: `${bulkProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 4. PREVISUALIZACIÓN DE PRODUCTOS */}
              <div className="bulk-preview-wrap">
                <div className="bulk-preview-header">
                  <h4>Previsualización de Cambios</h4>
                  <span className="preview-counter-badge">
                    {bulkMatchedProducts.length} productos seleccionados
                  </span>
                </div>

                {bulkMatchedProducts.length === 0 ? (
                  <div className="bulk-preview-empty">
                    <p>Ningún producto coincide con los filtros seleccionados.</p>
                  </div>
                ) : (
                  <div className="bulk-preview-table-scroll">
                    <table className="bulk-preview-table">
                      <thead>
                        <tr>
                          <th>Emoji</th>
                          <th>Nombre</th>
                          <th>Categoría</th>
                          <th>Marca</th>
                          <th>Distribuidor</th>
                          <th>Precio actual</th>
                          <th>Precio nuevo</th>
                          <th>Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkMatchedProducts.map((p) => {
                          const newPrice = calculateNewPrice(p);
                          const delta = newPrice - p.price;
                          return (
                            <tr key={p.id}>
                              <td className="center-cell">{p.emoji || "📦"}</td>
                              <td>
                                <strong>{p.name}</strong>
                                <small className="code-sub">{p.code}</small>
                              </td>
                              <td>{p.category}</td>
                              <td>{p.brand || <span className="muted-dash">-</span>}</td>
                              <td>{p.supplier || <span className="muted-dash">-</span>}</td>
                              <td className="price-cell">
                                ${p.price.toLocaleString("es-AR")}
                              </td>
                              <td className="new-price-cell">
                                <strong>${newPrice.toLocaleString("es-AR")}</strong>
                              </td>
                              <td className="delta-cell">
                                <span
                                  className={`table-delta ${delta >= 0 ? "plus" : "minus"}`}
                                >
                                  {delta >= 0 ? "+" : ""}
                                  ${delta.toLocaleString("es-AR")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={bulkIsUpdating}
                onClick={() => setIsBulkPriceModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button bulk-confirm-btn"
                disabled={busy || bulkIsUpdating || bulkMatchedProducts.length === 0}
                onClick={handleApplyBulkPriceChanges}
              >
                {bulkIsUpdating ? (
                  <>
                    <Loader2 size={16} className="ai-spin-icon" />
                    <span>Guardando cambios…</span>
                  </>
                ) : (
                  `Aplicar cambios a ${bulkMatchedProducts.length} productos`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Analizador de Facturas con IA */}
      {isInvoiceModalOpen && (
        <InvoiceAnalyzer
          storeId={store.id}
          products={products}
          categories={categories}
          onClose={() => setIsInvoiceModalOpen(false)}
          onImportDone={async (count) => {
            await run(
              async () => {},
              `Se importaron e impactaron ${count} productos desde la factura`,
            );
          }}
          onPricesUpdated={async () => { await run(async () => {}); }}
          catalogBusy={busy}
        />
      )}

      <div className="catalog-list" hidden={guided || productEditing || priceEditing || compositionEditing || deletionEditing}>
      <div className="catalog-search-toolbar">
        <label className="filter-label catalog-search-input-wrap">
          <Search size={15} className="catalog-search-icon" aria-hidden="true" />
          <input
            ref={catalogSearch}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, código o categoría…"
            aria-label="Buscar productos por nombre, código o categoría"
          />
        </label>
        <button className="secondary-button" aria-pressed={stockFilter} onClick={() => { setStockFilter(!stockFilter); setPage(1); }}><Filter size={15} />{stockFilter ? 'Mostrando stock bajo' : 'Stock bajo'}</button>
        <button className="secondary-button" aria-pressed={lowMarginFilter} onClick={() => { setLowMarginFilter(!lowMarginFilter); setPage(1); }}><Filter size={15} />{lowMarginFilter ? 'Mostrando bajo margen' : 'Bajo margen'}</button>
        {canDelete && <button type="button" className="secondary-button" disabled={busy} title="Ver productos eliminados" onClick={event => { editorTrigger.current = event.currentTarget; setDeletionHistoryOpen(true); }}><Trash2 size={13} aria-hidden="true" /><span>Eliminados</span></button>}
        <details className="catalog-columns-picker" ref={columnsDetailsRef}>
          <summary className="secondary-button" title="Configurar columnas visibles en la tabla">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Columnas</span>
          </summary>
          <div className="catalog-columns-dropdown" role="menu">
            <div className="catalog-columns-dropdown-header">
              <span>Columnas visibles</span>
              <button
                type="button"
                className="text-button-subtle"
                onClick={handleResetColumns}
                title="Restablecer columnas por defecto"
              >
                <RotateCcw size={11} aria-hidden="true" />
                <span>Restablecer</span>
              </button>
            </div>
            <div className="catalog-columns-list">
              {CATALOG_COLUMNS.map((col) => (
                <label key={col.id} className="catalog-column-option">
                  <input
                    type="checkbox"
                    checked={!!visibleColumns[col.id]}
                    onChange={() => handleToggleColumn(col.id)}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
        <span className="result-count" role="status">{filtered.length} productos</span>
      </div>
      <div className="table-scroll catalog-table-scroll" ref={tableScrollRef}>
        <table>
          <thead>
            <tr>
              {visibleColumns.product && <th className="th-product">Producto</th>}
              {visibleColumns.code && <th className="th-code">Código</th>}
              {visibleColumns.category && <th className="th-category">Categoría</th>}
              {visibleColumns.brand && <th className="th-brand">Marca</th>}
              {visibleColumns.supplier && <th className="th-supplier">Proveedor</th>}
              {visibleColumns.cost && <th className="th-cost">Costo</th>}
              {visibleColumns.price && <th className="th-price">Precio</th>}
              {visibleColumns.margin && <th className="th-margin">% Rentabilidad</th>}
              {visibleColumns.stock && <th className="th-stock">{store.depot_enabled ? 'Stock total' : 'Stock'}</th>}
              {visibleColumns.minStock && <th className="th-minstock">Stock mín.</th>}
              {visibleColumns.expiry && <th className="th-expiry">Vencimiento</th>}
              <th className="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((p) => {
              const effectiveCost = hasComposition(p)
                ? (compositionCost(p.stock_components || [], products).cost || undefined)
                : p.cost;
              const marginData = productMargin(p.price, effectiveCost, store.low_margin_threshold);
              return (
                <tr key={p.id}>
                  {visibleColumns.product && (
                    <td className="product-col">
                      <div className="product-title-wrap">
                        <span className="product-emoji" aria-hidden="true">{p.emoji || "📦"}</span>
                        <strong className="product-name-text">{p.name}</strong>
                      </div>
                      <div className="product-meta-row">
                        {!visibleColumns.code && <small className="product-code">{p.code}</small>}
                        {unitsPerPack(p.pack_size) > 1 && <small className="pack-size-badge">Pack ×{p.pack_size}</small>}
                        {hasComposition(p) && <small className="pack-size-badge">Stock compartido</small>}
                        {p.sellable === false && <small className="pack-size-badge">Solo insumo</small>}
                        {p.margin_group === 'low_margin' && <small className="low-margin-badge">↓ Margen bajo</small>}
                      </div>
                    </td>
                  )}
                  {visibleColumns.code && (
                    <td data-label="Código" className="code-col">
                      <code className="code-badge">{p.code || '—'}</code>
                    </td>
                  )}
                  {visibleColumns.category && (
                    <td data-label="Categoría" className="category-col">{p.category}</td>
                  )}
                  {visibleColumns.brand && (
                    <td data-label="Marca" className="brand-col">
                      {p.brand ? p.brand : <span className="text-muted">—</span>}
                    </td>
                  )}
                  {visibleColumns.supplier && (
                    <td data-label="Proveedor" className="supplier-col">
                      {p.supplier ? (
                        <span title={p.supplierCode ? `Cód. Prov: ${p.supplierCode}` : undefined}>
                          {p.supplier}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.cost && (
                    <td data-label="Costo" className="cost-col">
                      {typeof effectiveCost === 'number' && effectiveCost > 0 ? (
                        `$${effectiveCost.toLocaleString("es-AR")}`
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.price && (
                    <td data-label="Precio" className="price-col">
                      {p.sellable === false ? 'Solo insumo' : `$${p.price.toLocaleString("es-AR")}`}
                    </td>
                  )}
                  {visibleColumns.margin && (
                    <td data-label="% Rentabilidad" className="margin-col">
                      {marginData.percent !== null ? (
                        <span
                          className={`margin-badge ${
                            marginData.belowCost
                              ? 'margin-badge-loss'
                              : marginData.group === 'low_margin'
                              ? 'margin-badge-warning'
                              : 'margin-badge-good'
                          }`}
                          title={
                            marginData.belowCost
                              ? 'Venta bajo costo'
                              : marginData.group === 'low_margin'
                              ? 'Margen inferior al umbral configurado'
                              : 'Rentabilidad bruta'
                          }
                        >
                          {marginData.percent > 0 ? '+' : ''}{Math.round(marginData.percent)}%
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.stock && (
                    <td data-label="Stock" className="stock-col">
                      <span className={stockForSale(p) <= p.minStock ? "stock-low" : "stock-pill"}>
                        {p.stock.toLocaleString('es-AR')} {stockForSale(p) <= p.minStock && (hasComposition(p) ? '· Componentes' : '· Reponer')}
                      </span>
                      {store.depot_enabled && !hasComposition(p) && <small className="depot-stock-detail">Salón: {stockForSale(p).toLocaleString('es-AR')} · Depósito: {(p.depotStock || 0).toLocaleString('es-AR')}</small>}
                    </td>
                  )}
                  {visibleColumns.minStock && (
                    <td data-label="Stock mín." className="minstock-col">
                      {typeof p.minStock === 'number' ? p.minStock : '—'}
                    </td>
                  )}
                  {visibleColumns.expiry && (
                    <td data-label="Vencimiento" className="expiry-col">
                      {p.expiry_date ? p.expiry_date : <span className="text-muted">—</span>}
                    </td>
                  )}
                <td className="actions-col">
                  <div className="button-row">
                    <button
                      type="button"
                      className="action-icon-btn action-btn-replenish"
                      disabled={busy}
                      onClick={event => { replenishTrigger.current = event.currentTarget; startReplenish(p); }}
                      hidden={!canRestock || hasComposition(p)}
                      aria-label={`Reponer stock de ${p.name}`}
                      title="Reponer stock"
                    >
                      <PackagePlus size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn action-btn-edit"
                      disabled={busy}
                      onClick={event => { editorTrigger.current = event.currentTarget; startEdit(p); }}
                      hidden={!canEditCatalog}
                      aria-label={`Editar ${p.name}`}
                      title="Editar producto"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    {canCompose && (
                      <button
                        type="button"
                        className="action-icon-btn action-btn-combo"
                        disabled={busy}
                        aria-label={`${hasComposition(p) ? 'Editar componentes' : 'Configurar combo o cigarrillos sueltos'} de ${p.name}`}
                        title={hasComposition(p) ? 'Editar los componentes de este producto' : 'Armar un combo o configurar cigarrillos sueltos'}
                        onClick={event => { editorTrigger.current = event.currentTarget; setNewCompositionProduct(false); setCompositionTarget(p); }}
                      >
                        <Layers size={14} aria-hidden="true" />
                        <span>{hasComposition(p) ? 'Componentes' : 'Combo / sueltos'}</span>
                      </button>
                    )}
                    {!canEditCatalog && allowPriceEdit && p.sellable !== false && (
                      <button
                        type="button"
                        className="action-icon-btn action-btn-price"
                        disabled={busy}
                        onClick={event => { editorTrigger.current = event.currentTarget; setPriceTarget(p); }}
                        title="Editar precio"
                        aria-label={`Editar precio de ${p.name}`}
                      >
                        <DollarSign size={14} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="action-icon-btn action-btn-delete"
                      hidden={!canDelete}
                      disabled={busy}
                      aria-label={`Eliminar ${p.name} del catálogo`}
                      title="Eliminar producto"
                      onClick={event => { editorTrigger.current = event.currentTarget; setDeletionTarget(p); }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
            {!filtered.length && (
              <tr>
                <td colSpan={CATALOG_COLUMNS.filter(c => visibleColumns[c.id]).length + 1} className="table-empty">
                  {products.length
                    ? "No hay coincidencias."
                    : "Agregá tu primer producto para empezar a vender."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="catalog-pagination" role="navigation" aria-label="Paginación de inventario">
          <div className="pagination-info">
            <span>
              Mostrando <strong>{startIndex + 1}–{endIndex}</strong> de <strong>{filtered.length}</strong> productos
            </span>
            <label className="pagination-size-select">
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage <= 1 || busy}
                onClick={() => setPage(1)}
                title="Primera página"
                aria-label="Primera página"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage <= 1 || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Página anterior"
                aria-label="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="pagination-pages">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      className={`pagination-page-btn ${p === currentPage ? "active" : ""}`}
                      onClick={() => setPage(Number(p))}
                      disabled={busy}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage >= totalPages || busy}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="secondary-button pagination-nav-btn"
                disabled={currentPage >= totalPages || busy}
                onClick={() => setPage(totalPages)}
                title="Última página"
                aria-label="Última página"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
      </div>
      <div hidden={guided || productEditing || priceEditing || compositionEditing || deletionEditing}>
      {!guided && can('review_remitos') && <PendingReplenishments store={store.id} records={pendingRemitos} error={pendingRemitoError} branches={branches} products={products} run={run} busy={busy} onRefresh={onRefreshRemitos} onReviewed={onReviewedRemito} />}
      {/* AI Critical Stock Replenishment Card */}
      {!guided && can('use_ai') && criticalProducts.length > 0 && (
        <section
          className="stock-ai-card"
          aria-label="Análisis de stock con IA"
        >
          <div className="stock-ai-header">
            <div className="stock-ai-title-wrap">
              <span className="stock-ai-bell">🔔</span>
              <div>
                <div className="stock-ai-title-row">
                  <h4>Productos para reponer</h4>
                  <span className="stock-critical-badge">
                    {criticalProducts.length}{" "}
                    {criticalProducts.length === 1 ? "crítico" : "críticos"}
                  </span>
                </div>
                <p className="stock-ai-subtitle">
                  Hay {criticalProducts.length}{" "}
                  {criticalProducts.length === 1 ? "producto" : "productos"} por
                  debajo o en su stock mínimo (
                  {criticalProducts
                    .map((p) => p.name)
                    .slice(0, 3)
                    .join(", ")}
                  {criticalProducts.length > 3 ? "…" : ""}).
                </p>
              </div>
            </div>

            <div className="stock-ai-actions">
              <button
                type="button"
                className={`secondary-button ${stockFilter ? "active" : ""}`}
                onClick={() => setStockFilter((prev) => !prev)}
                title={stockFilter ? "Mostrar todos los productos" : "Filtrar tabla para ver solo los productos críticos"}
              >
                <Filter size={15} />
                <span>{stockFilter ? "Ver todos" : `Ver solo bajo stock (${criticalProducts.length})`}</span>
              </button>
              <button
                type="button"
                className="secondary-button ai-action"
                disabled={busy || isAnalyzingStock}
                onClick={handleAnalyzeCriticalStock}
              >
                {isAnalyzingStock ? (
                  <>
                    <Loader2 size={15} className="ai-spin-icon" />
                    <span>Analizando reposición…</span>
                  </>
                ) : (
                  <>
                    <AiIcon size={15} />
                    <span>Analizar stock</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {stockAiError && (
            <div className="stock-ai-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{stockAiError}</span>
            </div>
          )}

          {stockAiAnalysis && (
            <div className="stock-ai-result-box">
              <div className="stock-ai-result-header">
                <span className="stock-ai-result-title">
                  <PackageCheck size={16} />
                  <span>Orden de Compra y Prioridad Sugerida</span>
                </span>
                <div className="stock-ai-result-btns">
                  <button
                    type="button"
                    className="ai-report-copy-btn"
                    onClick={handleCopyOrder}
                    title="Copiar orden de compra para enviar a proveedor"
                  >
                    {copiedOrder ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedOrder ? "¡Copiado!" : "Copiar orden"}</span>
                  </button>
                  <button
                    type="button"
                    className="ai-modal-close"
                    onClick={() => setStockAiAnalysis(null)}
                    title="Cerrar análisis"
                    aria-label="Cerrar análisis"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="stock-ai-result-content">
                {stockAiAnalysis
                  .split("\n")
                  .filter(Boolean)
                  .map((line, idx) => {
                    const isUrgent = line.includes("[URGENTE]");
                    const isModerate = line.includes("[MODERADO]");
                    const isTotal =
                      line.toUpperCase().includes("INVERSIÓN TOTAL ESTIMADA") ||
                      line.toUpperCase().includes("INVERSION TOTAL ESTIMADA");

                    return (
                      <div
                        key={idx}
                        className={`stock-ai-line ${isUrgent ? "line-urgent" : isModerate ? "line-moderate" : isTotal ? "line-total" : ""}`}
                      >
                        {line}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      )}

      </div>
    </div>
  );
}
export function RegistersSettings({
  storeId,
  registers,
  branches,
  run,
  busy,
}: {
  storeId: string;
  registers: Register[];
  branches: Branch[];
  run: Run;
  busy: boolean;
}) {
  const [editingRegisterId, setEditingRegisterId] = useState<string | null>(null);
  const [deletingRegisterId, setDeletingRegisterId] = useState<string | null>(null);
  const activeRegisters = registers.filter((r) => r.active);

  return (
    <div className="store-settings-card">
      <div className="store-settings-header">
        <div className="store-settings-header-icon">
          <Monitor size={22} />
        </div>
        <div className="store-settings-header-text">
          <h3>Cajas de cobro</h3>
          <p>Puestos de atención y venta. Cada caja pertenece a un local y tiene sus turnos.</p>
        </div>
      </div>

      <div className="location-card-body">
        {/* Lista de cajas */}
        <div className="location-items-list">
          {activeRegisters.map((r) => {
            const branch = branches.find((b) => b.id === r.branch_id);
            const isEditing = editingRegisterId === r.id;
            const isDeleting = deletingRegisterId === r.id;

            if (isEditing) {
              return (
                <form
                  key={r.id}
                  className="location-inline-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const newName = String(f.get('name')).trim();
                    const newBranch = String(f.get('branch_id') || '');
                    if (!newName) return;
                    const success = await run(
                      () => retail.saveRegister(storeId, r.id, newName, newBranch || null),
                      'Caja actualizada',
                    );
                    if (success) setEditingRegisterId(null);
                  }}
                >
                  <div className="store-field-group">
                    <label className="store-field-label" htmlFor={`register-name-${r.id}`}>
                      Nombre de la caja
                    </label>
                    <input
                      id={`register-name-${r.id}`}
                      name="name"
                      required
                      maxLength={80}
                      defaultValue={r.name}
                      className="store-text-input"
                      autoFocus
                    />
                  </div>
                  {branches.length > 0 && (
                    <div className="store-field-group">
                      <label className="store-field-label" htmlFor={`register-branch-${r.id}`}>
                        Sucursal asignada
                      </label>
                      <select
                        id={`register-branch-${r.id}`}
                        name="branch_id"
                        defaultValue={r.branch_id || ''}
                        className="store-text-input"
                      >
                        <option value="">Sin sucursal asignada</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="location-edit-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => setEditingRegisterId(null)}
                    >
                      <RotateCcw size={14} /> Cancelar
                    </button>
                    <button className="primary-button" disabled={busy}>
                      <Check size={15} /> Guardar cambios
                    </button>
                  </div>
                </form>
              );
            }

            if (isDeleting) {
              return (
                <div key={r.id} className="location-confirm-box">
                  <span>
                    ¿Desactivar la caja <strong>"{r.name}"</strong>? (No borra el historial de turnos).
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busy}
                      onClick={async () => {
                        await run(
                          () => retail.deleteRegister(storeId, r.id),
                          `Caja "${r.name}" eliminada`,
                        );
                        setDeletingRegisterId(null);
                      }}
                    >
                      Sí, desactivar
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => setDeletingRegisterId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={r.id} className="location-item-row">
                <div className="location-item-left">
                  <div className="location-item-icon">
                    <Monitor size={18} />
                  </div>
                  <div className="location-item-info">
                    <strong className="location-item-name">{r.name}</strong>
                    <div className="location-item-meta">
                      <span className="location-pill-badge">
                        <Building2 size={11} /> {branch?.name || 'Sin sucursal'}
                      </span>
                      <span className="location-pill-badge active">Activa</span>
                    </div>
                  </div>
                </div>
                <div className="location-item-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      setEditingRegisterId(r.id);
                      setDeletingRegisterId(null);
                    }}
                    title={`Editar ${r.name}`}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    type="button"
                    className="danger-button-outline"
                    disabled={busy}
                    onClick={() => {
                      setDeletingRegisterId(r.id);
                      setEditingRegisterId(null);
                    }}
                    title={`Eliminar ${r.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {!activeRegisters.length && branches.length > 0 && (
            <div className="location-empty-notice">
              <Monitor size={24} />
              <p>No tenés cajas registradas en este comercio. Creá la primera caja para comenzar a vender.</p>
            </div>
          )}

          {!branches.length && (
            <div className="location-empty-notice warning">
              <AlertTriangle size={24} />
              <p>Agregá primero una sucursal en el panel de la izquierda para poder habilitar cajas.</p>
            </div>
          )}
        </div>

        {/* Sección Agregar Caja */}
        {branches.length > 0 && (
          <div className="location-add-section">
            <div className="location-add-header">
              <div className="location-add-title">
                <Plus size={16} />
                <span>Nueva caja de cobro</span>
              </div>
            </div>

            <form
              className="location-add-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const formEl = e.currentTarget;
                const name = String(f.get('name')).trim();
                const branch = String(f.get('branch'));
                if (!name || !branch) return;
                const success = await run(
                  () => retail.addRegister(storeId, name, branch),
                  'Caja agregada',
                );
                if (success) formEl.reset();
              }}
            >
              <div className="store-fields-2col">
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-register-name">
                    Nombre de la caja
                  </label>
                  <input
                    id="new-register-name"
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Ej. Mostrador 2"
                    className="store-text-input"
                  />
                </div>

                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-register-branch">
                    Sucursal asignada
                  </label>
                  {branches.length === 1 ? (
                    <div className="location-single-branch-info">
                      <span>{branches[0].name}</span>
                      <input type="hidden" name="branch" value={branches[0].id} />
                    </div>
                  ) : (
                    <select
                      id="new-register-branch"
                      name="branch"
                      required
                      className="store-select-input"
                      defaultValue={branches[0]?.id}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="location-add-footer">
                <button className="primary-button" disabled={busy || !branches.length}>
                  <Plus size={16} /> Agregar caja
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function StoreGeneralSettingsForm({
  store,
  busy,
  run,
}: {
  store: Store;
  busy: boolean;
  run: Run;
}) {
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [message, setMessage] = useState(store.receipt_message || '');
  const [color, setColor] = useState(store.accent_color || '#2563eb');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setName(store.name);
    setAddress(store.address || '');
    setPhone(store.phone || '');
    setMessage(store.receipt_message || '');
    setColor(store.accent_color || '#2563eb');
    setIsDirty(false);
  }, [store.id, store.name, store.address, store.phone, store.receipt_message, store.accent_color]);

  const handleReset = () => {
    setName(store.name);
    setAddress(store.address || '');
    setPhone(store.phone || '');
    setMessage(store.receipt_message || '');
    setColor(store.accent_color || '#2563eb');
    setIsDirty(false);
  };

  const PRESET_COLORS = [
    { name: 'Azul clásico', hex: '#2563eb' },
    { name: 'Índigo moderno', hex: '#6366f1' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Ámbar cálido', hex: '#f59e0b' },
    { name: 'Rosa intenso', hex: '#e11d48' },
    { name: 'Púrpura', hex: '#8b5cf6' },
    { name: 'Pizarra', hex: '#475569' },
  ];

  return (
    <form
      className="retail-form store-settings-container"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const success = await run(
          () =>
            retail.updateStore(store.id, {
              name: String(f.get("name")).trim(),
              address: String(f.get("address")),
              phone: String(f.get("phone")),
              receipt_message: String(f.get("message")),
              accent_color: String(f.get("color")),
            }),
          "Comercio actualizado",
        );
        if (success) {
          setIsDirty(false);
        }
      }}
    >
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div
            className="store-settings-header-icon"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            <StoreIcon size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Datos del comercio</h3>
            <p>Configurá la identidad visual, datos de contacto y el comprobante de tus ventas.</p>
          </div>
        </div>

        <fieldset disabled={busy} className="store-settings-body">
          {/* SECCIÓN 1: IDENTIDAD Y MARCA */}
          <section className="store-settings-section">
            <div className="store-section-header">
              <div className="store-section-header-title">
                <StoreIcon size={16} className="store-section-icon" />
                <h4>Identidad y marca</h4>
              </div>
              <p className="store-section-desc">Nombre comercial y color característico de tu negocio.</p>
            </div>

            <div className="store-section-fields">
              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-name">
                  Nombre
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-name"
                    name="name"
                    required
                    maxLength={100}
                    placeholder="Nombre de tu comercio"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Se muestra en la barra superior, en las pantallas de cobro y como encabezado en cada ticket.
                </p>
              </div>

              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-color-hex">
                  Color de marca
                </label>
                <div className="store-color-section">
                  <div className="store-color-controls">
                    <div
                      className="store-color-preview-swatch"
                      style={{ backgroundColor: color }}
                      title="Hacé clic para elegir un color personalizado"
                    >
                      <input
                        id="store-color-picker"
                        type="color"
                        name="color"
                        className="store-color-native-input"
                        value={color}
                        onChange={(e) => {
                          setColor(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                    <input
                      id="store-color-hex"
                      type="text"
                      className="store-color-hex-input"
                      maxLength={7}
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                    <span className="store-field-hint" style={{ margin: 0 }}>
                      Personaliza botones, detalles y recibos
                    </span>
                  </div>
                  <div className="store-color-palette" role="group" aria-label="Colores recomendados">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        className={`store-color-dot ${color.toLowerCase() === preset.hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                        onClick={() => {
                          setColor(preset.hex);
                          setIsDirty(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: UBICACIÓN Y CONTACTO */}
          <section className="store-settings-section">
            <div className="store-section-header">
              <div className="store-section-header-title">
                <MapPin size={16} className="store-section-icon" />
                <h4>Ubicación y contacto</h4>
              </div>
              <p className="store-section-desc">Información del local para que tus clientes sepan dónde encontrarte o comunicarse.</p>
            </div>

            <div className="store-section-fields store-fields-2col">
              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-address">
                  Dirección
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-address"
                    name="address"
                    maxLength={300}
                    placeholder="Ej. Av. Corrientes 1234, CABA"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Domicilio del local principal. Se imprime en el encabezado del ticket.
                </p>
              </div>

              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-phone">
                  Teléfono
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-phone"
                    name="phone"
                    maxLength={60}
                    placeholder="Ej. 11 5566-7788"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Teléfono de contacto o WhatsApp de atención al cliente.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: PERSONALIZACIÓN DEL TICKET */}
          <section className="store-settings-section">
            <div className="store-section-header">
              <div className="store-section-header-title">
                <Receipt size={16} className="store-section-icon" />
                <h4>Mensaje del ticket</h4>
              </div>
              <p className="store-section-desc">Frase de cortesía o agradecimiento que se imprime al pie de cada comprobante.</p>
            </div>

            <div className="store-section-fields">
              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-message">
                  Mensaje personalizado
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-message"
                    name="message"
                    maxLength={300}
                    placeholder="Ej. ¡Gracias por su compra! Vuelva pronto."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Aparece centrado y entre comillas al final de cada ticket emitido.
                </p>
              </div>
            </div>
          </section>
        </fieldset>

        <div className="store-settings-footer">
          <div className="store-settings-footer-left">
            <span>Moneda: <strong>Pesos Argentinos (ARS)</strong></span>
            {isDirty && (
              <span className="store-dirty-badge">
                ● Cambios sin guardar
              </span>
            )}
          </div>
          <div className="store-settings-footer-actions">
            <button
              type="button"
              className="text-button"
              disabled={busy || !isDirty}
              onClick={handleReset}
            >
              <RotateCcw size={14} /> Cancelar
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      <div className="store-preview-wrapper">
        <div className="store-preview-header">
          <div className="store-preview-header-title">
            <Receipt size={16} className="store-preview-header-icon" />
            <h4>Vista previa del ticket</h4>
          </div>
          <span className="store-preview-badge">Térmica 58/80mm</span>
        </div>

        <div className="thermal-ticket-card" style={{ '--store-accent': color } as React.CSSProperties}>
          <div className="thermal-ticket-accent-bar" style={{ backgroundColor: color }} />
          <div className="thermal-ticket-header">
            <h4 className="thermal-ticket-title">{name || 'MI COMERCIO'}</h4>
            <p className="thermal-ticket-meta">
              {address || 'Dirección de ejemplo 123'}
              <br />
              {phone ? `TEL: ${phone}` : 'TEL: 11 0000-0000'}
            </p>
          </div>

          <div className="thermal-ticket-body">
            <div className="thermal-ticket-row">
              <span>1x Café expreso</span>
              <strong>$ 1.500,00</strong>
            </div>
            <div className="thermal-ticket-row">
              <span>2x Medialunas</span>
              <strong>$ 1.600,00</strong>
            </div>
            <hr className="thermal-ticket-divider" />
            <div className="thermal-ticket-row thermal-ticket-total">
              <span>TOTAL</span>
              <span>$ 3.100,00</span>
            </div>
            <div className="thermal-ticket-row" style={{ color: '#78716c', fontSize: '11px' }}>
              <span>PAGO: EFECTIVO</span>
              <span>$ 3.100,00</span>
            </div>
          </div>

          <div className="thermal-ticket-footer">
            <p className="thermal-ticket-message">
              "{message || '¡Gracias por su compra!'}"
            </p>
          </div>
          <div className="thermal-ticket-bottom-scallop" />
        </div>

        <div className="preview-helper-badge">
          <Eye size={15} />
          <span>Actualización en tiempo real con los datos y el color seleccionado.</span>
        </div>
      </div>
    </form>
  );
}

export function StoreSettings({
  store,
  categories,
  registers,
  branches,
  ledgers,
  members,
  invitations,
  role,
  userId,
  run,
  busy,
  view: requestedView,
  onViewChange,
  onOpenPrices,
  stores,
  onSelectStore,
  onCreateStore,
  onRefreshAccess,
  onSignOut,
  userEmail,
  onOpenAi,
  active = true,
}: {
  store: Store;
  categories: Category[];
  registers: Register[];
  branches: import('./api').Branch[];
  ledgers: import('./api').SalesLedger[];
  members: Member[];
  invitations: Invitation[];
  role: Role;
  userId: string;
  run: Run;
  busy: boolean;
  view: string;
  onViewChange: (view: string) => void;
  onOpenPrices: () => void;
  stores?: Store[];
  onSelectStore?: (storeId: string) => void;
  onCreateStore?: () => void;
  onRefreshAccess?: () => void;
  onSignOut?: () => void;
  userEmail?: string;
  onOpenAi?: () => void;
  active?: boolean;
}) {
  const view = ['general', 'locations', 'team', 'more', 'app', 'ledgers'].includes(requestedView) ? requestedView : 'general';
  const setView = onViewChange;
  const staffProfiles = usePermissionProfiles(store.id, view === 'team' && (role === 'owner' || role === 'admin'));
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingInviteId, setEditingInviteId] = useState<string | null>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openMoreSection = (next: 'app' | 'ledgers', trigger: HTMLButtonElement) => {
    moreTriggerRef.current = trigger;
    setView(next);
    requestAnimationFrame(() => {
      const region = morePanelRef.current?.querySelector<HTMLElement>(`[data-settings-view="${next}"]`);
      if (region?.getClientRects().length) region.focus();
    });
  };
  const returnToMore = () => {
    setView('more');
    requestAnimationFrame(() => {
      if (!morePanelRef.current?.getClientRects().length) return;
      if (moreTriggerRef.current?.getClientRects().length) moreTriggerRef.current.focus();
      else morePanelRef.current.querySelector<HTMLButtonElement>('section:not([hidden]) button')?.focus();
    });
  };
  const [appVisited, setAppVisited] = useState(view === 'app');
  useEffect(() => { if (view === 'app') setAppVisited(true); }, [view]);
  const isDirectPrimary = ['general', 'locations', 'team'].includes(view);
  const isMoreSub = ['more', 'app', 'ledgers'].includes(view);
  const primaryView = isDirectPrimary ? view : (isMoreSub ? 'more' : '');
  const registerCountsByBranch = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of registers) {
      if (r.active) counts[r.branch_id] = (counts[r.branch_id] || 0) + 1;
    }
    return counts;
  }, [registers]);
  if (role !== 'owner' && role !== 'admin') return null;
  return (
    <SettingsEditorGroup><div className="settings-workspace settings-workspace-compact settings-workspace-sober">
      <SectionNav name="settings" label="Secciones de Mi comercio" value={primaryView} onChange={setView} disabled={busy}
        sections={[
          { id: 'general', label: 'Datos del comercio', icon: <StoreIcon size={16} /> },
          { id: 'locations', label: 'Locales y cajas', icon: <Building2 size={16} /> },
          { id: 'team', label: 'Personas con acceso', icon: <Users size={16} /> },
          { id: 'more', label: 'Más opciones', icon: <SlidersHorizontal size={16} /> },
        ]} />
      <div
        ref={morePanelRef}
        hidden={primaryView !== 'more'}
        role="tabpanel"
        id="settings-panel-more"
        aria-labelledby="settings-tab-more"
      >
        {view !== 'more' && (
          <div className="more-subview-header">
            <button
              type="button"
              className="secondary-button more-back-button"
              disabled={busy}
              onClick={returnToMore}
            >
              <ArrowLeft size={16} /> Volver a Más opciones
            </button>
            <div className="more-subview-breadcrumb">
              <span>Más opciones</span>
              <ChevronRight size={14} />
              <strong>{view === 'ledgers' ? 'Registros de ventas' : 'App y avisos'}</strong>
            </div>
          </div>
        )}

        {view === 'more' && (
          <div className="more-settings-container">
            {/* Columna Izquierda: Opciones y herramientas + Cuenta y comercios */}
            <div className="more-settings-column">
              <DepotSettings key={`depot-${store.id}`} store={store} busy={busy} run={run} active={view === 'more'} />
              {/* Tarjeta 1: Opciones y herramientas */}
              <div className="store-settings-card">
                <div className="store-settings-header">
                  <div className="store-settings-header-icon">
                    <SlidersHorizontal size={22} />
                  </div>
                  <div className="store-settings-header-text">
                    <h3>Opciones y herramientas</h3>
                    <p>Módulos complementarios para listas de precios, registros contables e instalación de la app.</p>
                  </div>
                </div>

                <div className="location-card-body">
                  <div className="more-nav-cards-list">
                    <button
                      type="button"
                      className="more-nav-card"
                      disabled={busy}
                      onClick={onOpenPrices}
                    >
                      <div className="more-nav-card-icon icon-prices">
                        <Tag size={20} />
                      </div>
                      <div className="more-nav-card-info">
                        <div className="more-nav-card-top">
                          <strong>Listas de precios</strong>
                          <span className="location-pill-badge">En Productos</span>
                        </div>
                        <small>Configurá precios diferenciales por mayorista, sucursal o cliente.</small>
                      </div>
                      <ChevronRight size={18} className="more-nav-arrow" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="more-nav-card"
                      disabled={busy}
                      onClick={(event) => openMoreSection('ledgers', event.currentTarget)}
                    >
                      <div className="more-nav-card-icon icon-ledgers">
                        <Receipt size={20} />
                      </div>
                      <div className="more-nav-card-info">
                        <div className="more-nav-card-top">
                          <strong>Registros de ventas</strong>
                          <span className="location-pill-badge active">
                            {ledgers.filter((l) => l.active).length} {ledgers.filter((l) => l.active).length === 1 ? 'activo' : 'activos'}
                          </span>
                        </div>
                        <small>Agrupaciones de ventas, medios de pago principales y reglas de imputación.</small>
                      </div>
                      <ChevronRight size={18} className="more-nav-arrow" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="more-nav-card"
                      disabled={busy}
                      onClick={(event) => openMoreSection('app', event.currentTarget)}
                    >
                      <div className="more-nav-card-icon icon-app">
                        <Smartphone size={20} />
                      </div>
                      <div className="more-nav-card-info">
                        <div className="more-nav-card-top">
                          <strong>App y avisos</strong>
                          <span className="location-pill-badge">PWA & Notificaciones</span>
                        </div>
                        <small>Instalación en tu dispositivo, notificaciones push y alertas de stock bajo.</small>
                      </div>
                      <ChevronRight size={18} className="more-nav-arrow" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Cuenta y comercios */}
              <div className="store-settings-card account-settings-card">
                <div className="store-settings-header">
                  <div className="store-settings-header-icon icon-account">
                    <UserCheck size={22} />
                  </div>
                  <div className="store-settings-header-text">
                    <h3>Cuenta y comercios</h3>
                    <p>Cambiá de comercio, gestioná accesos o cerrá tu sesión de trabajo.</p>
                  </div>
                </div>

                <div className="location-card-body account-settings-body">
                  {/* Selector / Indicador de comercio */}
                  <div className="account-store-section">
                    <span className="store-field-label">Comercio activo</span>
                    <div className="account-store-row">
                      {stores && stores.length > 1 ? (
                        <div className="account-select-wrap">
                          <StoreIcon size={16} className="account-select-icon" aria-hidden="true" />
                          <select
                            id="more-store-select"
                            className="store-select-field account-store-select"
                            disabled={busy}
                            value={store.id}
                            onChange={(e) => onSelectStore?.(e.target.value)}
                            aria-label="Seleccionar comercio"
                          >
                            {stores.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="account-store-info">
                          <span className="account-store-name">
                            <StoreIcon size={15} /> {store.name}
                          </span>
                          <span className="location-pill-badge active">Activo</span>
                        </div>
                      )}

                      {onCreateStore && (
                        <button
                          type="button"
                          className="secondary-button account-btn-create"
                          disabled={busy}
                          onClick={onCreateStore}
                        >
                          <Plus size={15} /> Crear otro comercio
                        </button>
                      )}
                    </div>
                  </div>

                  <hr className="account-divider" />

                  {/* Perfil de usuario y rol */}
                  <div className="account-user-card">
                    <div className="account-avatar" aria-hidden="true">
                      {(userEmail ? userEmail.charAt(0) : 'U').toUpperCase()}
                    </div>
                    <div className="account-user-details">
                      <div className="account-user-role-row">
                        <span className="account-role-badge">
                          <ShieldCheck size={13} />
                          {{
                            owner: 'Propietario',
                            admin: 'Administrador',
                            supervisor: 'Supervisor',
                            cashier: 'Cajero',
                          }[role] || role}
                        </span>
                      </div>
                      <span className="account-user-email" title={userEmail}>
                        {userEmail || 'Usuario'}
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="account-actions-list">
                    {onRefreshAccess && (
                      <button
                        type="button"
                        className="account-action-btn"
                        disabled={busy}
                        onClick={onRefreshAccess}
                      >
                        <RefreshCw size={16} />
                        <span>Actualizar accesos</span>
                      </button>
                    )}

                    {onOpenAi && (
                      <button
                        type="button"
                        className="account-action-btn ai-action"
                        disabled={busy}
                        onClick={onOpenAi}
                      >
                        <AiIcon />
                        <span>Consultar al asistente</span>
                      </button>
                    )}

                    {onSignOut && (
                      <button
                        type="button"
                        className="account-action-btn logout-btn"
                        disabled={busy}
                        onClick={onSignOut}
                      >
                        <LogOut size={16} />
                        <span>Cerrar sesión</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Categorías de consulta: provistas por la base de datos. */}
            <div className="more-settings-column">
              <div className="store-settings-card">
              <div className="store-settings-header">
                <div className="store-settings-header-icon">
                  <FolderTree size={22} />
                </div>
                <div className="store-settings-header-text">
                  <h3>Categorías de productos</h3>
                  <p>Vienen incluidas. Podés personalizar sus nombres para tu comercio.</p>
                </div>
              </div>

              <div className="location-card-body">
                <div className="team-summary-badges">
                  <span className="location-pill-badge active">
                    <Tag size={12} /> {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
                  </span>
                </div>

                <div className="location-items-list more-categories-list">
                  {categories.length === 0 ? (
                    <div className="location-empty-notice">
                      <Tag size={24} />
                      <p>No se cargaron las categorías. Actualizá los datos y verificá la migración de categorías estándar.</p>
                    </div>
                  ) : (
                    categories.map((c) => (
                      <div key={c.id} className="category-item-card">
                        <SettingsEditor label="Cambiar nombre" busy={busy} summary={<div className="category-summary-row">
                          <span className="category-pill-icon"><Tag size={13} /></span>
                          <strong>{c.name}</strong>
                          {c.canonicalName && c.canonicalName !== c.name && <small>{c.canonicalName}</small>}
                        </div>}>
                          {close => <CategoryLabelEditor storeId={store.id} category={c} busy={busy} run={run} close={close} />}
                        </SettingsEditor>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

        <div
          hidden={view !== 'app'}
          data-settings-view="app"
          tabIndex={-1}
          role="region"
          aria-label="App y avisos"
          className="more-subview-panel"
        >
          {(appVisited || view === 'app') && (
            <PushSettings key={store.id + userId} storeId={store.id} userId={userId} />
          )}
        </div>
        <div
          hidden={view !== 'ledgers'}
          data-settings-view="ledgers"
          tabIndex={-1}
          role="region"
          aria-label="Registros de ventas"
          className="more-subview-panel"
        >
          <LedgerSettings storeId={store.id} ledgers={ledgers} run={run} busy={busy} />
        </div>
      </div>
      <div className="settings-data settings-data-wide" hidden={view !== 'general'} role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general">
        <StoreGeneralSettingsForm store={store} busy={busy} run={run} />
        <BillingSettings key={`billing-${store.id}`} store={store} busy={busy} run={run} active={active && view === 'general'} />
        <MarginThresholdSettings key={`margin-${store.id}`} store={store} busy={busy} run={run} />
      </div>
      <div hidden={view !== 'locations'} role="tabpanel" id="settings-panel-locations" aria-labelledby="settings-tab-locations">
        <div className="locations-settings-container">
          <BranchSettings storeId={store.id} branches={branches} run={run} busy={busy} registerCounts={registerCountsByBranch} />
          <RegistersSettings storeId={store.id} registers={registers} branches={branches} run={run} busy={busy} />
        </div>
      </div>
      {(role === "owner" || role === "admin") && (
        <div
          hidden={view !== 'team'}
          role="tabpanel"
          id="settings-panel-team"
          aria-labelledby="settings-tab-team"
        >
          <div className="team-settings-container">
            {/* Tarjeta Izquierda: Equipo y accesos */}
            <div className="store-settings-card">
              <div className="store-settings-header">
                <div className="store-settings-header-icon">
                  <Users size={22} />
                </div>
                <div className="store-settings-header-text">
                  <h3>Personas con acceso</h3>
                  <p>Colaboradores que pueden ingresar al comercio. Si trabajás por tu cuenta, no necesitás agregar personas.</p>
                </div>
              </div>

              <div className="location-card-body">
                {/* Resumen de badges */}
                <div className="team-summary-badges">
                  <span className="location-pill-badge active">
                    <UserCheck size={12} /> {members.length} {members.length === 1 ? 'miembro activo' : 'miembros activos'}
                  </span>
                  {invitations.length > 0 && (
                    <span className="location-pill-badge" style={{ borderColor: 'var(--tone-warning-border, #fef08a)', background: 'var(--tone-warning-bg, #fefce8)', color: 'var(--tone-warning-text, #854d0e)' }}>
                      <Clock size={12} /> {invitations.length} {invitations.length === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  )}
                </div>

                {/* Alta de nueva persona */}
                {(role === 'owner' || role === 'admin') ? (
                  <div className="team-add-member-wrapper">
                    <SettingsEditor
                      label="Agregar persona"
                      busy={busy || staffProfiles.loading || !!staffProfiles.error}
                    >
                      {() => (
                        <div className="team-add-form-container">
                          <StaffAccessForm
                            storeId={store.id}
                            run={run}
                            busy={busy}
                            profiles={staffProfiles.profiles}
                            allowAdmin={role === 'owner'}
                          />
                        </div>
                      )}
                    </SettingsEditor>
                  </div>
                ) : (
                  <div className="team-helper-notice">
                    <ShieldCheck size={16} />
                    <span>El propietario puede agregar personas. Vos podés administrar perfiles y asignaciones de cajeros y supervisores.</span>
                  </div>
                )}

                {/* Invitaciones pendientes */}
                {invitations.length > 0 && (
                  <div className="team-section-block">
                    <div className="team-section-header">
                      <Clock size={15} />
                      <h4>Invitaciones pendientes ({invitations.length})</h4>
                    </div>
                    <div className="team-members-list">
                      {invitations.map((i) => {
                        const branchName = branches.find((b) => b.id === i.branch_id)?.name;
                        const registerName = registers.find((r) => r.id === i.register_id)?.name;
                        const profileName = staffProfiles.profiles.find((p) => p.id === i.profile_id)?.name;
                        const roleLabel = i.role === 'admin' ? 'Administrador' : i.role === 'supervisor' ? 'Supervisor' : 'Cajero';

                        const isEditing = editingInviteId === i.id;

                        return (
                          <div className={`team-member-item${isEditing ? ' is-editing' : ''}`} key={i.id}>
                            <div className="team-member-main">
                              <div className="team-avatar team-avatar-pending">
                                <Mail size={16} />
                              </div>
                              <div className="team-member-details">
                                <div className="team-member-email-row">
                                  <strong className="team-member-email">{i.email}</strong>
                                  <span className="team-role-badge role-pending">Pendiente</span>
                                  <span className={`team-role-badge role-${i.role}`}>{roleLabel}</span>
                                </div>
                                <div className="team-member-meta">
                                  {(i.role === 'cashier' || i.role === 'supervisor') && (
                                    <span className="team-sub-badge">
                                      <Building2 size={11} /> {branchName || 'Todas las sucursales'} · {registerName || 'Todas las cajas'}
                                    </span>
                                  )}
                                  {profileName && (
                                    <span className="team-sub-badge">
                                      <ShieldCheck size={11} /> {profileName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="team-member-actions">
                                {(i.role === 'cashier' || i.role === 'supervisor') && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className={`team-action-btn ${isEditing ? 'active' : ''}`}
                                    onClick={() => setEditingInviteId(isEditing ? null : i.id)}
                                    aria-expanded={isEditing}
                                    title={`Configurar acceso de ${i.email}`}
                                  >
                                    <SlidersHorizontal size={14} />
                                    <span>{isEditing ? 'Cerrar' : 'Editar acceso'}</span>
                                  </button>
                                )}
                                {role === 'owner' && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className="danger-button-outline"
                                    onClick={() =>
                                      void run(
                                        () => retail.revokeInvite(store.id, i.id),
                                        'Acceso pendiente eliminado',
                                      )
                                    }
                                    title={`Revocar acceso de ${i.email}`}
                                  >
                                    Revocar
                                  </button>
                                )}
                              </div>
                            </div>

                            {isEditing && (i.role === 'cashier' || i.role === 'supervisor') && (
                              <StaffMemberAccessEditor
                                storeId={store.id}
                                targetId={i.id}
                                email={i.email}
                                role={i.role as 'cashier' | 'supervisor'}
                                profileId={i.profile_id}
                                profiles={staffProfiles.profiles}
                                branchId={i.branch_id}
                                registerId={i.register_id}
                                branches={branches}
                                registers={registers}
                                pending
                                busy={busy}
                                run={run}
                                onClose={() => setEditingInviteId(null)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Miembros activos */}
                <div className="team-section-block">
                  <div className="team-section-header">
                    <UserCheck size={15} />
                    <h4>Miembros del comercio ({members.length})</h4>
                  </div>
                  <div className="team-members-list">
                    {members.map((m) => {
                      const branchName = branches.find((b) => b.id === m.branch_id)?.name;
                      const registerName = registers.find((r) => r.id === m.register_id)?.name;
                      const profileName = staffProfiles.profiles.find((p) => p.id === m.profile_id)?.name;
                      const roleLabel = {
                        owner: 'Propietario',
                        admin: 'Administrador',
                        supervisor: 'Supervisor',
                        cashier: 'Cajero',
                      }[m.role] || m.role;

                      const emailDisplay = m.email || 'Email no disponible';
                      const initial = (emailDisplay[0] || 'U').toUpperCase();
                      const isCurrentUser = m.user_id === userId;
                      const isEditing = editingMemberId === m.user_id;

                      return (
                        <div className={`team-member-item${isEditing ? ' is-editing' : ''}`} key={m.user_id}>
                          <div className="team-member-main">
                            <div className={`team-avatar avatar-${m.role}`}>
                              {initial}
                            </div>
                            <div className="team-member-details">
                              <div className="team-member-email-row">
                                <strong className="team-member-email">{emailDisplay}</strong>
                                {isCurrentUser && (
                                  <span className="team-you-badge">Vos</span>
                                )}
                                <span className={`team-role-badge role-${m.role}`}>{roleLabel}</span>
                              </div>
                              <div className="team-member-meta">
                                {(m.role === 'cashier' || m.role === 'supervisor') && (
                                  <span className="team-sub-badge">
                                    <Building2 size={11} /> {branchName || 'Todas las sucursales'} · {registerName || 'Todas las cajas'}
                                  </span>
                                )}
                                {profileName && (
                                  <span className="team-sub-badge">
                                    <ShieldCheck size={11} /> {profileName}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="team-member-actions">
                              {(m.role === 'cashier' || m.role === 'supervisor') && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  className={`team-action-btn ${isEditing ? 'active' : ''}`}
                                  onClick={() => setEditingMemberId(isEditing ? null : m.user_id)}
                                  aria-expanded={isEditing}
                                  title={`Configurar acceso de ${emailDisplay}`}
                                >
                                  <SlidersHorizontal size={14} />
                                  <span>{isEditing ? 'Cerrar' : 'Editar acceso'}</span>
                                </button>
                              )}
                              {role === 'owner' && m.role !== 'owner' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="danger-button-outline"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        '¿Quitar el acceso de este usuario al comercio?',
                                      )
                                    )
                                      void run(
                                        () => retail.removeMember(store.id, m.user_id),
                                        'Acceso revocado',
                                      );
                                  }}
                                  title={`Quitar acceso a ${m.email}`}
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing && (m.role === 'cashier' || m.role === 'supervisor') && (
                            <StaffMemberAccessEditor
                              storeId={store.id}
                              targetId={m.user_id}
                              email={emailDisplay}
                              role={m.role as 'cashier' | 'supervisor'}
                              profileId={m.profile_id}
                              profiles={staffProfiles.profiles}
                              branchId={m.branch_id}
                              registerId={m.register_id}
                              branches={branches}
                              registers={registers}
                              busy={busy}
                              run={run}
                              onClose={() => setEditingMemberId(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta Derecha: Perfiles y permisos */}
            <div className="store-settings-card">
              <div className="store-settings-header">
                <div className="store-settings-header-icon">
                  <ShieldCheck size={22} />
                </div>
                <div className="store-settings-header-text">
                  <h3>Perfiles y permisos</h3>
                  <p>Definí qué acciones pueden realizar los cajeros y supervisores en el sistema.</p>
                </div>
              </div>

              <div className="location-card-body team-profiles-body">
                <div className="team-helper-notice" style={{ marginBottom: 4 }}>
                  <ShieldCheck size={16} />
                  <span>Asigná a cada cajero o supervisor un perfil. El perfil define sus acciones; la asignación limita su sucursal y caja.</span>
                </div>

                {staffProfiles.loading && (
                  <div className="location-empty-state">
                    <Loader2 className="spinning-icon" size={20} />
                    <span>Cargando perfiles…</span>
                  </div>
                )}
                {staffProfiles.error && (
                  <div className="location-confirm-box">
                    <span role="alert">{staffProfiles.error}</span>
                    <button type="button" className="secondary-button" onClick={staffProfiles.reload}>
                      <RotateCcw size={14} /> Reintentar
                    </button>
                  </div>
                )}
                {!staffProfiles.loading && !staffProfiles.error && (
                  <PermissionProfileSettings
                    storeId={store.id}
                    profiles={staffProfiles.profiles}
                    busy={busy}
                    run={run}
                    onSaved={staffProfiles.reload}
                  />
                )}
                <button type="button" className="text-button team-refresh-profiles-btn" disabled={busy || staffProfiles.loading} onClick={staffProfiles.reload}>
                  <RotateCcw size={13} /> Actualizar perfiles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div></SettingsEditorGroup>
  );
}
