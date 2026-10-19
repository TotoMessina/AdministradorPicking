import { useState, useMemo, useEffect, useRef, useId } from "react";
import { BranchSettings, LedgerSettings } from './BusinessSettings';
import { SectionNav } from './SectionNav';
import { PushSettings } from './PushSettings';
import { StaffAccessForm } from './StaffAccessForm';
import { CashierAccess } from './CashierAccess';
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
  Filter,
  History,
  Loader2,
  PackageCheck,
  Percent,
  Sparkles,
  Tag,
  Upload,
  X,
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
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(guided);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [stockFilter, setStockFilter] = useState(false);
  const [lowMarginFilter, setLowMarginFilter] = useState(false);
  const editorRef = useRef<HTMLFormElement>(null);
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
    const dialog = panelRef.current?.querySelector<HTMLElement>('[role="dialog"]');
    if (dialog) {
      dialog.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])')?.focus();
      return;
    }
    if (!adding && !editing) return;
    editorRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, [adding, editing, active]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    categoryId: categories[0]?.id || "",
    emoji: "📦",
    price: "",
    cost: "0",
    stock: "0",
    min: "4",
    brand: "",
    supplier: "",
    supplierCode: "",
    tags: [] as string[],
    unitType: "unit" as "unit" | "kg" | "lt" | "pack" | "box",
    packSize: '',
    marginGroup: 'standard' as 'standard' | 'low_margin',
  });
  const [tagInput, setTagInput] = useState("");
  const latestProductDraft = useRef(formData);
  latestProductDraft.current = formData;
  const saleUnit = { unit: 'unidad', kg: 'kg', lt: 'litro', pack: 'pack', box: 'caja' }[formData.unitType];
  const productOptionsSummary = [
    formData.unitType !== 'unit' ? `Venta por ${saleUnit}` : '',
    Number(formData.packSize) > 1 ? `Bulto de ${formData.packSize}` : '',
    formData.marginGroup === 'low_margin' ? 'Bajo margen' : '',
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

  const isManager = !role || role === "owner" || role === "admin";

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

  const startAdd = () => {
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
      categoryId: categories[0]?.id || "",
      emoji: "📦",
      price: "",
      cost: "0",
      stock: "0",
      min: "4",
      brand: "",
      supplier: "",
      supplierCode: "",
      tags: [],
      unitType: "unit",
      packSize: '',
      marginGroup: 'standard',
    });
  };

  const startEdit = (p: Product) => {
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
      cost: String(p.cost || 0),
      stock: String(p.stock),
      min: String(p.minStock),
      brand: p.brand || "",
      supplier: p.supplier || "",
      supplierCode: p.supplierCode || "",
      tags: p.tags ? [...p.tags] : [],
      unitType: (p.unitType as "unit" | "kg" | "lt" | "pack" | "box") || "unit",
      packSize: p.pack_size == null ? '' : String(p.pack_size),
      marginGroup: p.margin_group ?? 'standard',
    });
  };

  const cancelEdit = () => {
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
  const [replenishQty, setReplenishQty] = useState<number>(12);
  const [replenishByPack, setReplenishByPack] = useState(false);
  const replenishmentPackSize = unitsPerPack(replenishTarget?.pack_size);
  const replenishmentUnits = replenishQty * (replenishByPack ? replenishmentPackSize : 1);
  const [replenishCost, setReplenishCost] = useState<string>("0");
  const [replenishSupplier, setReplenishSupplier] = useState<string>("");
  const [replenishNotes, setReplenishNotes] = useState<string>("");

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
    setReplenishTarget(p);
    setReplenishQty(12);
    setReplenishByPack(false);
    setReplenishCost(String(p.cost || 0));
    setReplenishSupplier("");
    setReplenishNotes("");
  };

  const handleConfirmUnitaryReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishTarget || !Number.isSafeInteger(replenishQty) || !Number.isSafeInteger(replenishmentUnits) || replenishmentUnits <= 0 || replenishmentUnits > 1000000) return;

    const newStock = replenishTarget.stock + replenishmentUnits;
    const numCost = parseFloat(replenishCost);
    const validCost = !isNaN(numCost) && numCost >= 0 ? numCost : undefined;

    const success = await run(
      () =>
        retail.replenishProductStock(
          store.id,
          replenishTarget.id,
          newStock,
          validCost,
          replenishmentUnits,
        ),
      `Reposición registrada: +${replenishmentUnits} u. de ${replenishTarget.name}`,
    );

    if (success) {
      replenishmentService.saveRecord({
        id: crypto.randomUUID(),
        storeId: store.id,
        createdAt: new Date().toISOString(),
        type: "unitario",
        supplier: replenishSupplier.trim() || undefined,
        notes: replenishNotes.trim() || undefined,
        totalUnits: replenishmentUnits,
        itemsCount: 1,
        items: [
          {
            productId: replenishTarget.id,
            code: replenishTarget.code,
            name: replenishTarget.name,
            quantityAdded: replenishmentUnits,
            previousStock: replenishTarget.stock,
            newStock,
            cost: validCost,
          },
        ],
      });
      setReplenishTarget(null);
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
        id: crypto.randomUUID(),
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
    () => products.filter((p) => p.stock <= p.minStock),
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

  // Automatic barcode lookup is deterministic; generative suggestions are explicit.
  const handleCodeBlur = async () => {
    const code = formData.code.trim();
    if (!code || formData.name.trim() || isSuggesting) return;

    const requestId = ++suggestionRequest.current;
    const draft = formData;
    setIsSuggesting(true);
    setSuggestion(null);
    setProductSuggestionNote('');

    try {
      // PASO 1 — Lookup en catálogo global comunitario (sin IA)
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
      setProductSuggestionNote('No encontramos datos para ese código. Podés completarlos o pedir una sugerencia con IA.');
    } catch {
      if (requestId === suggestionRequest.current && latestProductDraft.current === draft) {
        setProductSuggestionNote('No se pudo consultar el catálogo. Podés completar los datos manualmente.');
      }
    } finally {
      if (requestId === suggestionRequest.current) setIsSuggesting(false);
    }
  };

  const suggestProductDetails = async () => {
    const name = formData.name.trim();
    const code = formData.code.trim();
    if ((name.length < 2 && !code) || isSuggesting) return;

    const requestId = ++suggestionRequest.current;
    const draft = formData;
    setIsSuggesting(true);
    setSuggestion(null);
    setProductSuggestionNote('');

    try {
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
          { role: "user", content: name.length >= 2 ? `Producto: "${name}". Código: ${code || 'sin código'}` : `Código de producto: ${code}. Si no podés identificarlo con certeza, no inventes atributos.` },
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
    const priceNum = parseFloat(formData.price);
    const costNum = parseFloat(formData.cost);

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
        categories.find((c) => c.id === formData.categoryId)?.name || "General";

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
      const matched =
        categories.find(
          (c) => c.name.toLowerCase() === suggestion.category.toLowerCase(),
        ) ||
        categories.find(
          (c) =>
            c.name.toLowerCase().includes(suggestion.category.toLowerCase()) ||
            suggestion.category.toLowerCase().includes(c.name.toLowerCase()),
        );
      if (matched) {
        setFormData((prev) => ({ ...prev, categoryId: matched.id }));
      }
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
        setFormData((prev) => ({ ...prev, price: String(numPrice) }));
      }
    } else if (field === "cost" && suggestion.estimatedCost) {
      const numCost = cleanSuggestionNumber(suggestion.estimatedCost);
      if (numCost) {
        setFormData((prev) => ({ ...prev, cost: String(numCost) }));
      }
    } else if (field === "all") {
      const matched =
        categories.find(
          (c) => c.name.toLowerCase() === suggestion.category.toLowerCase(),
        ) ||
        categories.find(
          (c) =>
            c.name.toLowerCase().includes(suggestion.category.toLowerCase()) ||
            suggestion.category.toLowerCase().includes(c.name.toLowerCase()),
        );
      const numPrice = cleanSuggestionNumber(suggestion.estimatedPrice);
      const numCost = cleanSuggestionNumber(suggestion.estimatedCost);
      const mergedTags = suggestion.tags
        ? Array.from(new Set([...formData.tags, ...suggestion.tags]))
        : formData.tags;

      setFormData((prev) => ({
        ...prev,
        name: suggestion.name || prev.name,
        emoji: suggestion.emoji || prev.emoji,
        categoryId: matched ? matched.id : prev.categoryId,
        price: numPrice ? String(numPrice) : prev.price,
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
  }) => {
    if (
      await run(
        () =>
          retail.saveProduct(
            store.id,
            productToSave,
            !!editing,
            editing?.stock,
          ),
        "Producto guardado",
      )
    ) {
      // PASO 2 — Contribuir al catálogo comunitario ÚNICAMENTE cuando es un producto NUEVO (nunca al editar uno existente)
      const cleanCode = productToSave.code.trim();
      const isNumericEan = /^\d{8,14}$/.test(cleanCode);
      const isInternalCode = /^[a-zA-Z]/.test(cleanCode);

      if (!editing && isNumericEan && !isInternalCode) {
        const categoryName =
          categories.find((c) => c.id === productToSave.categoryId)?.name || "";
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
    }
  };

  // El guardado es independiente de la revisión opcional con IA.
  const handleSubmit = async (e: React.FormEvent, review = false) => {
    e.preventDefault();
    if (busy || (review && isCheckingAnomalies)) return;

    const p = {
      id: editing?.id || "",
      categoryId: formData.categoryId,
      code: formData.code.trim(),
      name: formData.name.trim(),
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      minStock: Number(formData.min),
      emoji: formData.emoji.trim() || "📦",
      active: true,
      brand: formData.brand.trim() || undefined,
      supplier: formData.supplier.trim() || undefined,
      supplierCode: formData.supplierCode.trim() || undefined,
      tags: formData.tags,
      unitType: formData.unitType,
      pack_size: formData.packSize.trim() ? Number(formData.packSize) : null,
      margin_group: formData.marginGroup,
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

  const filtered = products.filter((p) => (!stockFilter || p.stock <= p.minStock) && (!lowMarginFilter || p.margin_group === 'low_margin') &&
    (p.name + " " + p.code + " " + p.category)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="retail-panel" ref={panelRef}>
      {!guided && isManager && <PendingReplenishments store={store.id} records={pendingRemitos} error={pendingRemitoError} branches={branches} products={products} run={run} busy={busy} onRefresh={onRefreshRemitos} onReviewed={onReviewedRemito} />}
      <div className="section-heading">
        <div>
          <h2>{guided ? 'Tus productos' : 'Productos e inventario'}</h2>
          <p>
            El catálogo y las existencias se comparten entre las cajas de este
            comercio.
          </p>
        </div>
        <div className="catalog-actions-row">
          {guided && <button type="button" className="text-button" disabled={busy || !categories.length} onClick={() => setIsCsvModalOpen(true)}>Importar desde CSV / Excel</button>}
          {!guided && <details className="catalog-tools" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}><summary>Más herramientas</summary><div className="catalog-tools-menu" onClick={e => { if ((e.target as HTMLElement).closest('button')) { const details = e.currentTarget.closest('details'); if (details) details.open = false; } }}>
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
            title="Cargar stock masivo desde archivo CSV / Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Carga masiva (CSV)</span>
          </button>
          {isManager && (
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
          {isManager && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !categories.length}
              onClick={() => setIsInvoiceModalOpen(true)}
              title="Analizar facturas de compra con IA e importar productos a tu stock"
            >
              <FileText size={16} />
              <span>Importar factura de compra</span>
            </button>
          )}
          </div></details>}
          <button
            type="button"
            className="primary-button"
            disabled={busy || !categories.length}
            onClick={startAdd}
          >
            + Agregar producto
          </button>
        </div>
      </div>

      {/* AI Critical Stock Replenishment Card */}
      {!guided && criticalProducts.length > 0 && (
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
                className="secondary-button"
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
                    <Sparkles size={15} />
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

      {(adding || editing) && (
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
          <h3>{editing ? "Editar producto" : "Nuevo producto"}</h3>

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
                      <Sparkles size={15} />
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
                placeholder="Escaneá o ingresá el código EAN"
              />
            </label>
            <label className="retail-price-field">
              Precio de venta por {saleUnit} ($)
              <input
                name="price"
                type="number"
                min="0.01"
                max="9999999999"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
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
                        className="price-ai-suggestion-chip"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData((prev) => ({
                            ...prev,
                            price: String(priceValidation.suggestion),
                          }));
                          setPriceValidation(null);
                        }}
                        title={`Aplicar precio sugerido de $${priceValidation.suggestion.toLocaleString("es-AR")}`}
                      >
                        <Sparkles size={13} />
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
            <label>
              Costo por {saleUnit} ($)
              <input
                name="cost"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0.00"
              />
            </label>
            <label>
              Stock actual ({saleUnit === 'unidad' ? 'unidades' : saleUnit === 'litro' ? 'litros' : saleUnit === 'pack' ? 'packs' : saleUnit === 'caja' ? 'cajas' : saleUnit})
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                required
                value={formData.stock}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stock: e.target.value }))
                }
              />
            </label>
          </div>
          <div hidden={guided} className="product-help-actions" aria-label="Ayudas opcionales para el producto">
            <button type="button" className="text-button" disabled={busy || isSuggesting || (formData.name.trim().length < 2 && !formData.code.trim())} onClick={() => void suggestProductDetails()}>
              <Sparkles size={14} aria-hidden="true" /> Sugerir datos
            </button>
            <button type="button" className="text-button" disabled={busy || isCheckingPrice} onClick={() => void reviewProductPrice()}>
              Revisar precio
            </button>
            <button type="button" className="text-button" disabled={busy || isCheckingAnomalies} onClick={e => { if (editorRef.current?.reportValidity()) void handleSubmit(e, true); }}>
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
              <input name="pack_size" type="number" min="1" max="2147483647" step="1" value={formData.packSize} placeholder="Opcional, ej. 24" onChange={e => setFormData(prev => ({ ...prev, packSize: e.target.value }))} />
              <small>El precio, el costo y el stock se expresan por {saleUnit}. El bulto se usa para convertir cantidades al reponer.</small>
            </label>
            <label>Grupo de margen
              <select name="margin_group" value={formData.marginGroup} onChange={e => setFormData(prev => ({ ...prev, marginGroup: e.target.value as 'standard' | 'low_margin' }))}>
                <option value="standard">Estándar</option>
                <option value="low_margin">Bajo margen (Cigarrillos, Cargas, etc.)</option>
              </select>
              <small>Separa estos productos del análisis principal de rentabilidad.</small>
            </label>
            <label>
              Avisar cuando queden
              <input
                name="min"
                type="number"
                min="0"
                step="1"
                required
                value={formData.min}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, min: e.target.value }))
                }
              />
            </label>
              </div>
            </fieldset>
          </details>
          <div className="button-row">
            <button
              className="primary-button"
              disabled={busy}
            >
              Guardar producto
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
      {replenishTarget && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="replenish-modal-title"
        >
          <div className="ai-modal-card replenish-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="replenish-modal-title">
                <PackageCheck size={20} className="ai-success-icon" />
                <h3>Reponer Stock de Producto</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => setReplenishTarget(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleConfirmUnitaryReplenish}
              className="replenish-form"
            >
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

              <div className="replenish-stock-status-box">
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
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={Math.floor(1000000 / (replenishByPack ? replenishmentPackSize : 1))}
                    required
                    value={replenishQty}
                    onChange={(e) =>
                      setReplenishQty(
                        Number(e.target.value),
                      )
                    }
                  />
                  {replenishByPack && <small aria-live="polite">= {replenishmentUnits.toLocaleString('es-AR')} unidades individuales</small>}
                </label>
                <label>
                  Nuevo costo unitario ($) <small>(opcional)</small>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={replenishCost}
                    onChange={(e) => setReplenishCost(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="replenish-input-grid">
                <label>
                  Proveedor o Distribuidor <small>(opcional)</small>
                  <input
                    type="text"
                    value={replenishSupplier}
                    onChange={(e) => setReplenishSupplier(e.target.value)}
                    placeholder="Ej. Arcor, Distribuidora Sur"
                  />
                </label>
                <label>
                  N° de Remito / Comprobante <small>(opcional)</small>
                  <input
                    type="text"
                    value={replenishNotes}
                    onChange={(e) => setReplenishNotes(e.target.value)}
                    placeholder="Ej. Remito R-000458"
                  />
                </label>
              </div>

              <div className="ai-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setReplenishTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy || !Number.isSafeInteger(replenishQty) || !Number.isSafeInteger(replenishmentUnits) || replenishmentUnits <= 0 || replenishmentUnits > 1000000}
                >
                  Confirmar reposición (+{replenishmentUnits} u.)
                </button>
              </div>
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
                    <input
                      type="number"
                      step={bulkAdjustMode === "absolute_price" ? "10" : "1"}
                      min="0"
                      value={bulkAdjustValue}
                      onChange={(e) => setBulkAdjustValue(e.target.value)}
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

      <div hidden={guided}>
      <div className="catalog-search-toolbar"><label className="filter-label">
        Buscar productos
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setVisibleCount(50); }}
          placeholder="Nombre, código o categoría"
        />
      </label>
      <button className="secondary-button" aria-pressed={stockFilter} onClick={() => { setStockFilter(!stockFilter); setVisibleCount(50); }}><Filter size={16} />{stockFilter ? 'Mostrando stock bajo' : 'Ver stock bajo'}</button>
      <button className="secondary-button" aria-pressed={lowMarginFilter} onClick={() => { setLowMarginFilter(!lowMarginFilter); setVisibleCount(50); }}><Filter size={16} />{lowMarginFilter ? 'Mostrando bajo margen' : 'Ver solo bajo margen'}</button>
      <span className="result-count" role="status">{filtered.length} productos</span></div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>
                    {p.emoji} {p.name}
                  </strong>
                  <small>{p.code}</small>
                  {unitsPerPack(p.pack_size) > 1 && <small className="pack-size-badge">Pack ×{p.pack_size}</small>}
                  {p.margin_group === 'low_margin' && <small className="low-margin-badge">↓ Margen bajo</small>}
                </td>
                <td>{p.category}</td>
                <td>${p.price.toLocaleString("es-AR")}</td>
                <td>
                  <span className={p.stock <= p.minStock ? "stock-low" : ""}>
                    {p.stock} {p.stock <= p.minStock && "· Reponer"}
                  </span>
                </td>
                <td>
                  <div className="button-row">
                    <button
                      className="text-button accent-text"
                      disabled={busy}
                      onClick={() => startReplenish(p)}
                      title="Reponer stock de este producto"
                    >
                      + Reponer
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => startEdit(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-button danger-text"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Archivar ${p.name}? Las ventas anteriores se conservan.`,
                          )
                        )
                          void run(
                            () => retail.archiveProduct(store.id, p.id),
                            "Producto archivado",
                          );
                      }}
                    >
                      Archivar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={5} className="table-empty">
                  {products.length
                    ? "No hay coincidencias."
                    : "Agregá tu primer producto para empezar a vender."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > visibleCount && <div className="load-more"><span>{visibleCount} de {filtered.length} productos</span><button className="secondary-button" onClick={() => setVisibleCount(n => n + 50)}>Ver más productos</button></div>}
      </div>
    </div>
  );
}
function RenameRow({
  name,
  onSave,
  busy,
}: {
  name: string;
  onSave: (name: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [value, setValue] = useState(name);
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(value);
      }}
    >
      <input
        aria-label={`Nombre de ${name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        maxLength={80}
      />
      <button className="secondary-button" disabled={busy || value === name}>
        Guardar
      </button>
    </form>
  );
}
function RegisterRow({
  register,
  onSave,
  onDelete,
  busy,
}: {
  register: Register;
  onSave: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  busy: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <SettingsEditor busy={busy} label={`Editar ${register.name}`} summary={<strong>{register.name}</strong>} onClose={() => setConfirmDelete(false)}>
      {close => <div className="register-row">
      <form
        className="inline-form"
        style={{ flex: 1 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSave(String(new FormData(e.currentTarget).get('name')))) close();
        }}
      >
        <input
          aria-label={`Nombre de caja ${register.name}`}
          name="name"
          defaultValue={register.name}
          required
          maxLength={80}
        />
        <button className="secondary-button" disabled={busy}>
          Guardar
        </button>
      </form>
      {!confirmDelete ? (
        <button
          type="button"
          className="danger-button-outline"
          title="Eliminar caja"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          style={{ marginLeft: 8, whiteSpace: 'nowrap' }}
        >
          🗑️ Eliminar
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <span style={{ fontSize: 12, color: '#dc2626', whiteSpace: 'nowrap' }}>¿Confirmar?</span>
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              await onDelete();
              setConfirmDelete(false);
            }}
          >
            Sí, eliminar
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => setConfirmDelete(false)}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>}
    </SettingsEditor>
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
  view,
  onViewChange,
  onOpenPrices,
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
}) {
  const setView = onViewChange;
  const [manageLocations, setManageLocations] = useState(false);
  const [appVisited, setAppVisited] = useState(view === 'app');
  useEffect(() => { if (view === 'app') setAppVisited(true); }, [view]);
  const activeRegisters = registers.filter(r => r.active);
  const singleLocation = branches.length === 1 && activeRegisters.length === 1;
  const primaryView = ['general', 'locations', 'team'].includes(view) ? view : 'more';
  const openLocations = () => { setManageLocations(true); setView('locations'); };
  if (role !== 'owner' && role !== 'admin') return null;
  return (
    <SettingsEditorGroup><div className="settings-workspace">
      <SectionNav name="settings" label="Secciones de configuración" value={primaryView} onChange={setView} disabled={busy} sections={[{ id: 'general', label: 'Datos del comercio' }, { id: 'locations', label: 'Locales y cajas' }, { id: 'team', label: 'Personas con acceso' }, { id: 'more', label: 'Más opciones' }]} />
      <div hidden={primaryView !== 'more'} role="tabpanel" id="settings-panel-more" aria-labelledby="settings-tab-more">
        <section className="retail-panel">
          <h2>Más opciones</h2>
          <div className="business-controls">
            <button type="button" className="secondary-button" disabled={busy} onClick={onOpenPrices}>Listas de precios · Abrir en Productos</button>
            <button type="button" className="secondary-button" disabled={busy} aria-pressed={view === 'ledgers'} onClick={() => setView('ledgers')}>Registros de ventas</button>
            <button type="button" className="secondary-button" disabled={busy} aria-pressed={view === 'app'} onClick={() => setView('app')}>App y avisos</button>
            <button type="button" className="secondary-button" disabled={busy} aria-pressed={view === 'more'} onClick={() => setView('more')}>Categorías propias</button>
          </div>
          <p>Organizá precios y ventas, instalá la app o elegí qué notificaciones recibir.</p>
        </section>
      </div>
      <div hidden={view !== 'app'} role="region" aria-label="App y avisos">
        {(appVisited || view === 'app') && <PushSettings key={store.id + userId} storeId={store.id} userId={userId} />}
      </div>
      <div className="settings-grid" hidden={view !== 'general'} role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general">
      <section className="retail-panel">
        <h2>Datos del comercio</h2>
        <p><strong>{store.name}</strong>{store.address && <> · {store.address}</>}{store.phone && <> · {store.phone}</>}</p>
        <SettingsEditor label="Editar datos del comercio" busy={busy}>
        {close => <form
          className="retail-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (await run(
              () =>
                retail.updateStore(store.id, {
                  name: String(f.get("name")).trim(),
                  address: String(f.get("address")),
                  phone: String(f.get("phone")),
                  receipt_message: String(f.get("message")),
                  accent_color: String(f.get("color")),
                }),
              "Comercio actualizado",
            )) close();
          }}
        >
          <label>
            Nombre
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={store.name}
            />
          </label>
          <label>
            Dirección
            <input
              name="address"
              maxLength={300}
              defaultValue={store.address}
            />
          </label>
          <label>
            Teléfono
            <input name="phone" maxLength={60} defaultValue={store.phone} />
          </label>
          <label>
            Mensaje del ticket
            <input
              name="message"
              maxLength={300}
              defaultValue={store.receipt_message}
            />
          </label>
          <label>
            Color de marca
            <input
              name="color"
              type="color"
              defaultValue={store.accent_color}
            />
          </label>
          <p>Moneda: pesos argentinos (ARS).</p>
          <button className="primary-button" disabled={busy}>
            Guardar cambios
          </button>
        </form>}
        </SettingsEditor>
      </section>
      <section className="retail-panel">
        <h2>Locales y cajas</h2>
        <p>{singleLocation ? `${branches[0].name} · ${activeRegisters[0].name}` : `${branches.length} sucursales · ${activeRegisters.length} cajas de cobro`}</p>
        <button type="button" className="secondary-button" disabled={busy} onClick={openLocations}>Administrar locales y cajas</button>
        <h2>Personas con acceso</h2>
        <p>{members.length} {members.length === 1 ? 'persona con acceso' : 'personas con acceso'} · {invitations.length} accesos pendientes. Si trabajás por tu cuenta, no necesitás agregar personas.</p>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => setView('team')}>Administrar personas</button>
      </section>
      </div>
      <section className="retail-panel" hidden={view !== 'more'}>
        <h2>Categorías propias</h2>
        <p>Organizá el catálogo según tu actividad.</p>
        {categories.map((c) => (
          <SettingsEditor key={c.id} label={`Editar ${c.name}`} summary={<strong>{c.name}</strong>} busy={busy}>{close => <RenameRow
            name={c.name}
            busy={busy}
            onSave={async (name) => {
              const saved = await run(
                () => retail.renameCategory(store.id, c.id, name),
                "Categoría actualizada",
              );
              if (saved) close();
              return saved;
            }}
          />}</SettingsEditor>
        ))}
        <SettingsEditor label="Agregar categoría" busy={busy}>{close => <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = String(new FormData(form).get("name"));
            if (
              await run(
                () => retail.addCategory(store.id, name),
                "Categoría agregada",
              )
            )
              close();
          }}
        >
          <input
            name="name"
            aria-label="Nueva categoría"
            placeholder="Ej. Panadería"
            required
            maxLength={80}
          />
          <button className="primary-button" disabled={busy}>
            Agregar
          </button>
        </form>}</SettingsEditor>
      </section>
      <div hidden={view !== 'locations'} role="tabpanel" id="settings-panel-locations" aria-labelledby="settings-tab-locations">
      {singleLocation && !manageLocations && <section className="retail-panel">
        <h2>Locales y cajas</h2><p>{branches[0].name} · {activeRegisters[0].name}</p>
        <button type="button" className="secondary-button" disabled={busy} onClick={openLocations}>Administrar locales y cajas</button>
      </section>}
      <div className="settings-grid" hidden={singleLocation && !manageLocations}>
      <BranchSettings storeId={store.id} branches={branches} run={run} busy={busy} />
      <section className="retail-panel">
        <h2>Cajas de cobro</h2>
        <p>Los puestos desde donde atendés. Cada caja pertenece a una sucursal y tiene sus propios turnos. Eliminar una caja la desactiva sin borrar el historial.</p>
        {registers.filter(r => r.active).map((r) => (
          <div key={r.id}><small>{branches.find(b => b.id === r.branch_id)?.name}</small>
          <RegisterRow
            key={r.id}
            register={r}
            busy={busy}
            onSave={(name) =>
              run(
                () => retail.saveRegister(store.id, r.id, name),
                "Caja actualizada",
              )
            }
            onDelete={() =>
              run(
                () => retail.deleteRegister(store.id, r.id),
                `Caja "${r.name}" eliminada`,
              )
            }
          />
          </div>
        ))}
        {!branches.length && <p>Agregá una sucursal para poder crear una caja.</p>}
        <SettingsEditor label="Agregar caja" busy={busy || !branches.length}>{close => <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = String(new FormData(form).get("name"));
            if (
              await run(
                () => retail.addRegister(store.id, name, String(new FormData(form).get('branch'))),
                "Caja agregada",
              )
            )
              close();
          }}
        >
          <label>Nombre de la caja<input
            name="name"
            aria-label="Nueva caja"
            placeholder="Ej. Mostrador 2"
            required
            maxLength={80}
          /></label>
          {branches.length === 1 ? <span>Sucursal: {branches[0].name}<input type="hidden" name="branch" value={branches[0].id} /></span> : <label>Sucursal<select name="branch" required>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
          <button className="primary-button" disabled={busy}>
            Agregar
          </button>
        </form>}</SettingsEditor>
      </section>
      </div>
      </div>
      <div hidden={view !== 'ledgers'} role="region" aria-label="Registros de ventas"><LedgerSettings storeId={store.id} ledgers={ledgers} run={run} busy={busy} /></div>
      {(role === "owner" || role === "admin") && (
        <section className="retail-panel" hidden={view !== 'team'} role="tabpanel" id="settings-panel-team" aria-labelledby="settings-tab-team">
          <h2>Personas con acceso</h2>
          <p>{members.length} personas con acceso · {invitations.length} pendientes. Agregá personas solo si alguien más trabaja con vos.</p>
          <p>Asigná a cada cajero la sucursal y la caja donde puede trabajar. La caja es el puesto desde donde cobra; el registro de ventas agrupa las ventas.</p>
          {role === 'owner' ? <SettingsEditor label="Agregar persona" busy={busy}>{() => <StaffAccessForm storeId={store.id} run={run} busy={busy} />}</SettingsEditor> : <p>El propietario puede agregar personas. Vos podés administrar las asignaciones de los cajeros.</p>}
          <h3>Accesos pendientes</h3>
          {invitations.length ? (
            invitations.map((i) => (
              <div className="staff-member" key={i.id}>
              <div className="team-row">
                <span>
                  {i.email}
                  <small>
                    {i.role === "admin" ? "Administrador" : "Cajero"}
                  </small>
                </span>
                {role === 'owner' && <button
                  disabled={busy}
                  className="text-button danger-text"
                  onClick={() =>
                    void run(
                      () => retail.revokeInvite(store.id, i.id),
                      "Acceso pendiente eliminado",
                    )
                  }
                >
                  Revocar
                </button>}
              </div>
              {i.role === 'cashier' && <SettingsEditor label={`Editar asignación de ${i.email}`} summary={<small>{branches.find(b => b.id === i.branch_id)?.name || 'Todas las sucursales'} · {registers.find(r => r.id === i.register_id)?.name || 'Todas las cajas permitidas'}</small>} busy={busy}>{() => <CashierAccess storeId={store.id} targetId={i.id} email={i.email} branchId={i.branch_id} registerId={i.register_id} branches={branches} registers={registers} pending busy={busy} run={run} />}</SettingsEditor>}
              </div>
            ))
          ) : (
            <p>No hay accesos pendientes.</p>
          )}
          <h3>Miembros</h3>
          {members.map((m) => (
            <div className="staff-member" key={m.user_id}>
            <div className="team-row">
              <span>
                {m.email || 'Email no disponible'}{m.user_id === userId ? ' · Vos' : ''}
                <small>
                  {
                    {
                      owner: "Propietario",
                      admin: "Administrador",
                      cashier: "Cajero",
                    }[m.role]
                  }
                </small>
              </span>
              {role === 'owner' && m.role !== "owner" && (
                <button
                  disabled={busy}
                  className="text-button danger-text"
                  onClick={() => {
                    if (
                      window.confirm(
                        "¿Quitar el acceso de este usuario al comercio?",
                      )
                    )
                      void run(
                        () => retail.removeMember(store.id, m.user_id),
                        "Acceso revocado",
                      );
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
            {m.role === 'cashier' && <SettingsEditor label={`Editar asignación de ${m.email}`} summary={<small>{branches.find(b => b.id === m.branch_id)?.name || 'Todas las sucursales'} · {registers.find(r => r.id === m.register_id)?.name || 'Todas las cajas permitidas'}</small>} busy={busy}>{() => <CashierAccess storeId={store.id} targetId={m.user_id} email={m.email} branchId={m.branch_id} registerId={m.register_id} branches={branches} registers={registers} busy={busy} run={run} />}</SettingsEditor>}
            </div>
          ))}
        </section>
      )}
    </div></SettingsEditorGroup>
  );
}
