import { NumberInput } from './NumberInput';
import { AiIcon } from './AiIcon';
import { InvoiceReviewTable, type InvoiceReviewAttention } from './InvoiceReviewTable';
import { findInvoiceCatalogCandidates, type InvoiceCatalogCandidate } from '../services/invoiceCatalogService';
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Filter,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { GroqError } from "../services/groqService";
import { extractInvoiceProducts, invoiceNumber, prepareInvoiceExtractionText, type ExtractedInvoice } from '../services/invoiceExtractionService';
import { extractTextFromFile, cleanInvoiceOcrText, invoicePackCatalogContext } from "../services/invoiceParserService";
import { unitsPerPack as configuredPackSize } from '../services/inventoryUnits';
import type { Product, Category, Supplier } from "../features/retail/api";
import { retail, errorMessage } from "../features/retail/api";
import { linkInvoiceItems, rankCatalogMatches } from '../services/invoiceMatchingService';
import { migrateLocalMappings, normalizeSupplierText, saveMapping, type SupplierMapping } from '../services/supplierMappingService';
import { invoiceCostIncrease, type InvoiceCostChange } from '../services/invoicePricingService';
import { InvoicePriceProposal } from './InvoicePriceProposal';
import { SupplierAliasPanel } from './SupplierAliasPanel';
import { applySupplierDiscount, findRegisteredSupplier, validDiscount } from '../services/supplierDiscountService';
import { detectInvoiceFormat, findInvoiceFormat, learnInvoiceFormat, readWithInvoiceFormat, sameInvoiceFormat, type StoredInvoiceFormat } from '../services/invoiceFormatService';
import { defaultProductCategory, resolveProductCategory } from '../services/productCategoryService';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  invoiceLine: string;
  linkStatus: 'auto' | 'pending' | 'confirmed';
  linkReason: string;
  mapping?: SupplierMapping;
  mappingInvoiceText?: string;
  divisionReason?: string;
  costKnown: boolean;
  /** Nombre original tal como aparece en la factura */
  rawName: string;
  /** Código EAN/barcode si figura */
  rawCode?: string;
  /** Cantidad de bultos o cajas facturadas */
  rawQty: number;
  /** Costo facturado para ese renglón (precio por bulto/caja) */
  rawCost: number;
  /** Unidades individuales que contiene cada display/caja (1 si es suelto) */
  unitsPerPack: number;
  quantityUnit?: 'unit' | 'pack';
  /** Indica si se detectó o configuró como display/caja cerrada */
  isPack: boolean;
  /** Cantidad total de unidades individuales que ingresarán al stock (rawQty * unitsPerPack) */
  qty: number;
  /** Costo unitario real por producto suelto para vender en kiosco (rawCost / unitsPerPack) */
  unitCost: number;
  /** Producto del catálogo local emparejado (puede ser null = no encontrado) */
  matchedProduct: Product | null;
  /** Confianza del match: 0-1 */
  matchConfidence: number;
  /** Acción a realizar al importar */
  action: "add_stock" | "update_cost" | "both" | "create_new" | "skip";
  /** Nombre sugerido por el análisis / IA */
  suggestedName: string;
  /** Nombre editable si se crea como nuevo */
  newName: string;
  /** Código de barras / interno para producto nuevo */
  newCode: string;
  newMinStock: number;
  manual?: boolean;
  /** Si el código de barras es un EAN real detectado */
  codeDetected?: boolean;
  /** Origen del código de barras */
  codeSource?: 'invoice' | 'catalog' | 'manual' | 'none';
  /** Precio de venta sugerido y editable para producto nuevo */
  newPrice: number;
  /** Margen de ganancia porcentual sobre costo (ej: 40 para +40%) */
  customMargin?: number;
  /** Indica si el usuario fijó un precio exacto manual en lugar de calcular por margen */
  isManualPrice?: boolean;
  /** Categoría seleccionada si es nuevo */
  newCategoryId: string;
  /** Origen de la categoría asignada */
  categorySource?: 'ai' | 'catalog' | 'manual';
}

export function isRealBarcode(code?: string | null): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  return /^\d{8,14}$/.test(trimmed);
}

export function isInvoiceProductCode(code: string): boolean {
  return isRealBarcode(code) || /^INT-\d{6,20}$/i.test(code.trim());
}

export interface InvoiceAnalyzerProps {
  storeId: string;
  stockBranchId?: string;
  stockBranchName?: string;
  products: Product[];
  categories?: Category[];
  onClose: () => void;
  onImportDone?: (updatedCount: number) => void | Promise<void>;
  onPricesUpdated?: () => void | Promise<void>;
  catalogBusy?: boolean;
}

// ─── Code and Emoji Helpers ─────────────────────────────────────────────────

/**
 * Limpia y formatea un nombre sugerido comercial listo para el catálogo de kiosco:
 * - Elimina códigos y números iniciales del renglón (ej: "3182300 Cos18 3 ...")
 * - Expande abreviaturas típicas de distribuidoras (CIG. -> Cigarrillos, ALF. -> Alfajor, etc.)
 * - Remueve sufijos de empaque repetidos al final si ya están como bulto (ej: (25), (10), x10 ATADOS)
 * - Convierte a Title Case legible respetando siglas comunes (KS, BOX, etc.)
 */
export function formatSuggestedProductName(rawName: string, commercialName?: string): string {
  let text = (commercialName || rawName || '').trim();
  if (!text) return 'Nuevo Producto';

  // 1. Quitar códigos y números iniciales de renglón típicos de factura
  text = text.replace(/^[\d\s—\-_*•]+/, '');
  text = text.replace(/^[A-Za-z]\d{2,6}\s+/, '');
  text = text.replace(/^\d{1,4}\s+(?=[A-Za-z])/i, '');

  // 2. Expansiones comunes de abreviaturas de distribuidora de kiosco
  const abbreviations: [RegExp, string][] = [
    [/\bCIGRED\b/gi, 'Cigarrillos Red '],
    [/\bCIG\.?\s+/gi, 'Cigarrillos '],
    [/\bL\s+STRIKE\b/gi, 'Lucky Strike'],
    [/\bL\.?\s*STRIKE\b/gi, 'Lucky Strike'],
    [/\bALF\.?\s*/gi, 'Alfajor '],
    [/\bCHOCOL\.?\s*/gi, 'Chocolate '],
    [/\bGALLET\.?\s*/gi, 'Galletitas '],
    [/\bCARAM\.?\s*/gi, 'Caramelos '],
    [/\bCHICL\.?\s*/gi, 'Chicles '],
    [/\bCHUP\.?\s*/gi, 'Chupetines '],
    [/\bBEB\.?\s*/gi, 'Bebida '],
    [/\bGAS\.?\s*/gi, 'Gaseosa '],
    [/\bAG\.?\s+MIN\.?\s*/gi, 'Agua Mineral '],
    [/\bAG\.?\s*/gi, 'Agua '],
    [/\bJUG\.?\s*/gi, 'Jugo '],
    [/\bCERV\.?\s*/gi, 'Cerveza '],
    [/\bENERG\.?\s*/gi, 'Energizante '],
    [/\bPAQ\.?\s*/gi, 'Paquete '],
    [/\bP\/ARMAR\b/gi, 'Para Armar'],
    [/\bCONV\.\s*/gi, 'Convertible '],
    [/\bORIG\.\s*/gi, 'Original '],
  ];

  for (const [pattern, replacement] of abbreviations) {
    text = text.replace(pattern, replacement);
  }

  // Quitar sufijos de empaque al final como "(25)", "(10)", "x10 ATADOS"
  text = text.replace(/\s*\(\d{1,4}\)\s*$/g, '');
  text = text.replace(/\s*[xX]\s*10\s+ATADOS\b/gi, '');
  text = text.replace(/\s*xX\s*/g, ' x');
  text = text.replace(/[»«]/g, '');
  text = text.replace(/\s+/g, ' ').trim();

  // Convertir palabras a formato legible
  const words = text.split(' ').map((w) => {
    if (!w) return '';
    const upper = w.toUpperCase();
    if (['KS', 'BOX', 'ORIGEN', 'MIX'].includes(upper)) return upper;
    if (upper === 'U' || upper === 'U.') return 'u.';
    if (/^\d+[A-Z]+$/i.test(w)) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return words.join(' ').trim() || 'Nuevo Producto';
}

function generateProductCode(existingCodes: Set<string>): string {
  let attempts = 0;
  while (attempts < 50) {
    const code = `INT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    if (!existingCodes.has(code.toLowerCase())) {
      existingCodes.add(code.toLowerCase());
      return code;
    }
    attempts++;
  }
  const fallback = `INT-${Math.floor(100000 + Math.random() * 900000)}`;
  existingCodes.add(fallback.toLowerCase());
  return fallback;
}

function guessProductEmoji(name: string): string {
  const n = name.toLowerCase();
  if (
    n.includes("coca") ||
    n.includes("pepsi") ||
    n.includes("sprite") ||
    n.includes("fanta") ||
    n.includes("gaseosa") ||
    n.includes("agua") ||
    n.includes("jugo") ||
    n.includes("cerveza") ||
    n.includes("speed") ||
    n.includes("monster") ||
    n.includes("red bull") ||
    n.includes("vino") ||
    n.includes("fernet")
  ) {
    return "🥤";
  }
  if (
    n.includes("alfajor") ||
    n.includes("chocolate") ||
    n.includes("caramelo") ||
    n.includes("chupetin") ||
    n.includes("gomita") ||
    n.includes("bon o bon") ||
    n.includes("tita") ||
    n.includes("rhodesia") ||
    n.includes("turron") ||
    n.includes("oblita") ||
    n.includes("chicle") ||
    n.includes("mentaplus") ||
    n.includes("halls") ||
    n.includes("beldent") ||
    n.includes("topline")
  ) {
    return "🍫";
  }
  if (
    n.includes("galletita") ||
    n.includes("galleta") ||
    n.includes("bizcocho") ||
    n.includes("oreo") ||
    n.includes("pepas") ||
    n.includes("don satur") ||
    n.includes("rumba") ||
    n.includes("chocolinas") ||
    n.includes("sonrisas") ||
    n.includes("vocacion")
  ) {
    return "🍪";
  }
  if (
    n.includes("papa") ||
    n.includes("lays") ||
    n.includes("dorito") ||
    n.includes("snack") ||
    n.includes("mani") ||
    n.includes("chizito") ||
    n.includes("cheetos") ||
    n.includes("nacho") ||
    n.includes("saladix")
  ) {
    return "🍿";
  }
  if (
    n.includes("cigarrill") ||
    n.includes("cigarro") ||
    n.includes("philip") ||
    n.includes("marlboro") ||
    n.includes("chesterfield") ||
    n.includes("camel") ||
    n.includes("lucky") ||
    n.includes("parliament") ||
    n.includes("rothmans")
  ) {
    return "🚬";
  }
  if (
    n.includes("helado") ||
    n.includes("palito") ||
    n.includes("frigor") ||
    n.includes("arcor helado")
  ) {
    return "🍦";
  }
  if (
    n.includes("cafe") ||
    n.includes("café") ||
    n.includes("te") ||
    n.includes("té") ||
    n.includes("mate cocido") ||
    n.includes("saquito")
  ) {
    return "☕";
  }
  if (n.includes("preservativo") || n.includes("prime") || n.includes("tulipan")) {
    return "🛡️";
  }
  if (
    n.includes("pila") ||
    n.includes("bateria") ||
    n.includes("duracell") ||
    n.includes("energizer") ||
    n.includes("encendedor") ||
    n.includes("bic") ||
    n.includes("fosforo")
  ) {
    return "⚡";
  }
  return "📦";
}

// ─── Helpers: Detección de Bultos / Displays y Categorización ───────────────

/**
 * Detecta si el nombre del producto en la factura indica que viene en display,
 * caja o bulto cerrado y cuántas unidades contiene (ej: '36X70', 'X 24', 'CAJA X 12', '18X8').
 */
function detectPackUnits(rawName: string): number {
  if (!rawName) return 1;
  const name = rawName.trim();

  // 1. Patrón explícito: 'Caja x 24', 'Display x 18', 'Pack x 6', 'CJ X 12', 'DP X 36'
  const explicitPack = name.match(
    /\b(?:caja|cj|disp|display|pack|bulto)\s*(?:x|de)?\s*(\d{1,3})\b/i,
  );
  if (explicitPack && parseInt(explicitPack[1], 10) > 1) {
    return parseInt(explicitPack[1], 10);
  }

  // 2. Patrón 'X 24', 'X24', 'X 36', 'X 18U', 'x 12 un'
  const xUnits = name.match(
    /(?:^|\s)[xX]\s*(\d{1,3})\s*(?:u|un|uds|unid|unidades)?(?:\s|$)/i,
  );
  if (xUnits && parseInt(xUnits[1], 10) > 1) {
    return parseInt(xUnits[1], 10);
  }

  // 3. Patrón '36X70', '18X8', '32X60', '16X1146', '36X 118' (Típico mayorista de golosinas: Cantidad x Gramaje)
  const multMatch = name.match(/\b(\d{1,3})\s*[xX]\s*(\d+)/i);
  if (multMatch) {
    const count = parseInt(multMatch[1], 10);
    // Filtrar falsos positivos de medidas tipo '500ML', '750ML', '100G'
    if (count >= 2 && count <= 500) {
      return count;
    }
  }

  // 4. Patrón '24 U', '18 UN', '12 UDS'
  const uMatch = name.match(/\b(\d{1,3})\s*(?:u|un|uds|unid|unidades)\b/i);
  if (uMatch && parseInt(uMatch[1], 10) > 1) {
    return parseInt(uMatch[1], 10);
  }

  return 1;
}

/**
 * Resuelve y empareja de forma inteligente la categoría sugerida o detectada
 * con las categorías estándar cargadas desde la base de datos.
 */
function resolveCategory(
  suggestedCategory: string | undefined,
  productName: string,
  availableCategories: Category[],
): string {
  return resolveProductCategory(availableCategories, suggestedCategory, productName);
}

function buildParsePrompt(invoiceText: string, categories: Category[] = [], _products: Product[] = []): string {
  const categoryNames = categories.map((c) => c.name.trim()).filter(Boolean);
  const categoriesHint = categoryNames.length > 0 ? `Categorías disponibles: ${categoryNames.slice(0, 15).join(', ')}.` : '';

  return `Analizá el siguiente texto de una factura o remito de compra de kiosco.
Identificá el proveedor y extraé la lista completa de todos los productos facturados.
Ignorá datos fiscales, CUIT, direcciones, fechas, subtotales y totales generales.

Respondé ÚNICAMENTE un objeto JSON válido con esta estructura, sin texto explicativo ni formato markdown:
{
  "proveedor": "Nombre del proveedor o distribuidora",
  "items": [
    {
      "invoice_line": "Renglón original del producto tal como figura en la factura",
      "name": "Nombre comercial claro del producto",
      "code": "Código de barras o código interno si figura, o null",
      "qty": 1,
      "cost": 1500.0,
      "unitsPerPack": 1,
      "category": "Golosinas"
    }
  ]
}

Reglas:
- Extraé cada producto o artículo facturado.
- qty: cantidad comprada (número).
- cost: precio de costo unitario facturado (número sin signo $).
- unitsPerPack: si viene en bulto/display/caja (ej: X24, X12, Pack x 6), poné la cantidad de unidades; si es suelto o no especifica, poné 1.
${categoriesHint ? `- category: asigná la categoría más adecuada (${categoriesHint}) o "Varios".` : ''}

TEXTO DEL COMPROBANTE:
${invoiceText}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InvoiceAnalyzer({
  storeId,
  stockBranchId,
  stockBranchName,
  products,
  categories,
  onClose,
  onImportDone,
  onPricesUpdated,
  catalogBusy = false,
}: InvoiceAnalyzerProps) {
  const [step, setStep] = useState<"input" | "parsing" | "review" | "importing" | "done">("input");
  const [invoiceText, setInvoiceText] = useState("");
  const extractionText = useMemo(() => {
    const prepared = prepareInvoiceExtractionText(cleanInvoiceOcrText(invoiceText));
    const originalLines = invoiceText.split(/\r?\n/).filter(line => line.trim()).length;
    return { ...prepared, originalLines, omittedLines: originalLines - prepared.retainedLines };
  }, [invoiceText]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [initialStockBranch, setInitialStockBranch] = useState(stockBranchId);
  const latestItems = useRef(items);
  latestItems.current = items;
  const catalogController = useRef<AbortController | null>(null);
  const [catalogSuggestions, setCatalogSuggestions] = useState<{
    index: number; key: string; loading: boolean; candidates: InvoiceCatalogCandidate[]; notice: string;
  } | null>(null);
  const [providerName, setProviderName] = useState("");
  const [supplierOverride, setSupplierOverride] = useState('');
  const [invoiceDate, setInvoiceDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [costChanges, setCostChanges] = useState<InvoiceCostChange[]>([]);
  const [showPriceProposal, setShowPriceProposal] = useState(false);
  const [pricesBusy, setPricesBusy] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [readingNote, setReadingNote] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [fileReadFailed, setFileReadFailed] = useState(false);
  const sourceFile = useRef<File | null>(null);
  const sourceRotation = useRef(0);
  const fileReading = useRef(false);
  const mounted = useRef(true);
  const parseController = useRef<AbortController | null>(null);
  const parsing = useRef(false);
  const extractionCache = useRef(new Map<string, ExtractedInvoice>());
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; parseController.current?.abort(); catalogController.current?.abort(); };
  }, []);
  useEffect(() => {
    if (step !== 'review') {
      const controller = catalogController.current;
      catalogController.current = null;
      controller?.abort();
      setCatalogSuggestions(null);
    }
  }, [step]);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: "pdf" | "image" | "text";
    previewUrl?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (step === 'input' && error && showRawText && !isExtracting) textInputRef.current?.focus();
  }, [step, error, showRawText, isExtracting]);

  // Filtros y búsqueda para el paso de revisión
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "matched" | "skip">("all");
  const [reviewAttention, setReviewAttention] = useState<InvoiceReviewAttention | null>(null);
  const revealReviewItem = useCallback((index: number, column: InvoiceReviewAttention['column']) => {
    setFilterStatus('all');
    setSearchQuery('');
    setReviewAttention(previous => ({ index, column, sequence: (previous?.sequence ?? 0) + 1 }));
  }, []);
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [linkProgress, setLinkProgress] = useState('');
  const [mappingNotice, setMappingNotice] = useState('');
  const [mappingRetry, setMappingRetry] = useState(false);
  const [mappingBusy, setMappingBusy] = useState(false);
  const mappingInProgress = useRef(false);
  const mappingContext = useRef({ storeId, providerName });
  mappingContext.current = { storeId, providerName };
  useEffect(() => {
    let cancelled = false;
    try {
      const pending = localStorage.getItem(`kiosco_supplier_mappings_${storeId}`);
      const migrated = localStorage.getItem(`kiosco_mappings_migrated_${storeId}`) === '1';
      // A completed legacy migration does not suppress later offline writes.
      if (pending || !migrated) {
        void migrateLocalMappings(storeId).then(() => {
          if (!cancelled && pending) { setMappingNotice('Las vinculaciones de este dispositivo ya están compartidas con el comercio.'); setMappingRetry(false); }
        }).catch(err => {
          if (!cancelled) { setMappingNotice(`No se pudieron compartir los vínculos guardados en este dispositivo (${errorMessage(err)}). Se conservan acá; reintentá con conexión.`); setMappingRetry(true); }
        });
      }
    } catch {
      setMappingNotice('No se pudo acceder a la memoria local. Revisá los permisos de almacenamiento del navegador.');
      setMappingRetry(true);
    }
    return () => { cancelled = true; };
  }, [storeId]);
  // Registered suppliers are optional: without connection the discount is entered per invoice.
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  useEffect(() => {
    let cancelled = false;
    void retail.suppliers(storeId).then(rows => { if (!cancelled) setSuppliers(rows); }, () => { /* Manual discount still works. */ });
    // Without the learned layouts (offline or migration pending) every invoice is read with AI.
    void retail.supplierInvoiceFormats(storeId).then(rows => { if (!cancelled) { setInvoiceFormats(rows); setFormatsUnavailable(false); } }, () => { if (!cancelled) setFormatsUnavailable(true); });
    return () => { cancelled = true; };
  }, [storeId]);
  const [invoiceFormats, setInvoiceFormats] = useState<StoredInvoiceFormat[]>([]);
  // Lines and layout used for the invoice under review, to learn or confirm it after importing.
  const readSource = useRef<{ lines: string[]; format: StoredInvoiceFormat | null; mismatch: string }>({ lines: [], format: null, mismatch: '' });
  const [readWithFormat, setReadWithFormat] = useState<{ format: StoredInvoiceFormat | null; mismatch: string }>({ format: null, mismatch: '' });
  const [formatNotice, setFormatNotice] = useState('');
  const [formatsUnavailable, setFormatsUnavailable] = useState(false);
  // null = use the registered supplier discount; a string = edited for this invoice only.
  const [discountOverride, setDiscountOverride] = useState<string | null>(null);
  const registeredSupplier = findRegisteredSupplier(suppliers, providerName);
  const discountText = discountOverride ?? String(registeredSupplier?.discount_percent ?? 0);
  const discountPercent = discountText.trim() === '' ? 0 : Number(discountText);
  const discountValid = validDiscount(discountPercent);
  const effectiveDiscount = discountValid ? discountPercent : 0;
  const supplierHint = (name: string) => {
    if (!normalizeSupplierText(name)) return 'Opcional. Si ya le compraste, se aplica su descuento y, si su formato es conocido, se lee sin IA.';
    const registered = findRegisteredSupplier(suppliers, name);
    const format = findInvoiceFormat(invoiceFormats, name);
    const parts = [registered ? (registered.discount_percent > 0 ? `Descuento ${registered.discount_percent.toLocaleString('es-AR')}%` : 'Sin descuento')
      : format ? 'Sin descuento guardado' : 'Proveedor nuevo: al aplicar la factura se recuerdan sus vínculos y su formato'];
    if (format) parts.push('formato conocido: se lee sin IA si la factura coincide');
    return parts.join(' · ') + '.';
  };
  // Offer to keep a discount typed during the review, so the next invoice proposes it.
  const canRememberDiscount = discountValid && !!normalizeSupplierText(providerName)
    && (registeredSupplier ? discountOverride !== null && effectiveDiscount !== registeredSupplier.discount_percent : effectiveDiscount > 0);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierNotice, setSupplierNotice] = useState('');
  const rememberDiscount = async () => {
    const name = providerName.trim();
    setSupplierSaving(true); setSupplierNotice('');
    try {
      const saved = await retail.saveSupplier(storeId, registeredSupplier
        ? { id: registeredSupplier.id, name: registeredSupplier.name, discount_percent: effectiveDiscount, notes: registeredSupplier.notes, revision: registeredSupplier.revision }
        : { name, discount_percent: effectiveDiscount });
      if (!mounted.current) return;
      setSuppliers(previous => [...previous.filter(supplier => supplier.id !== saved.id), { ...saved, discount_percent: Number(saved.discount_percent) }]);
      setDiscountOverride(null);
      setSupplierNotice(`Guardado: las próximas facturas de ${saved.name} proponen ${Number(saved.discount_percent).toLocaleString('es-AR')}%.`);
    } catch (err) {
      if (mounted.current) setSupplierNotice(`No se pudo guardar el descuento: ${errorMessage(err)}. Se aplica igual a esta factura.`);
    } finally { if (mounted.current) setSupplierSaving(false); }
  };
  // Calculated sale prices of new products follow the net cost; manual prices are kept.
  useEffect(() => {
    setItems(previous => {
      let changed = false;
      const next = previous.map(item => {
        if (item.matchedProduct || item.isManualPrice || !item.costKnown || item.unitCost <= 0) return item;
        const newPrice = Math.max(1, Math.round(applySupplierDiscount(item.unitCost, effectiveDiscount) * (1 + (item.customMargin ?? 40) / 100)));
        if (newPrice === item.newPrice) return item;
        changed = true;
        return { ...item, newPrice };
      });
      return changed ? next : previous;
    });
  }, [effectiveDiscount]);
  const importInProgress = useRef(false);
  const sortedProducts = useMemo(() => products.filter(product => product.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name, 'es-AR')), [products]);

  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
    } else {
      void retail.categories(storeId).then((cats) => {
        if (cats && cats.length > 0) {
          setLocalCategories(cats);
        }
      });
    }
  }, [categories, storeId]);

  // ── Rate limit retry & timer state ───────────────────────────────────────
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRateLimitTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRateLimitCountdown(null);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const startRateLimitCountdown = useCallback((seconds: number) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    let remaining = Math.max(5, Math.ceil(seconds));
    setRateLimitCountdown(remaining);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setRateLimitCountdown(0);
        setError('Ya podés reintentar el análisis. El texto y las partes completadas se conservaron.');
      } else {
        setRateLimitCountdown(remaining);
      }
    }, 1000);
  }, []);

  // ── Parse invoice ───────────────────────────────────────────────────────

  const handleParse = useCallback(
    async (options: { useAi?: boolean; skipAi?: boolean } = {}) => {
      if (parsing.current || fileReading.current || fileReadFailed || ((rateLimitCountdown ?? 0) > 0 && !options.skipAi)) return;
      if (!invoiceText.trim()) {
        setError("Pegá o escribí el texto de la factura antes de continuar.");
        return;
      }
      clearRateLimitTimer();
      parsing.current = true;
      const controller = new AbortController();
      parseController.current = controller;
      setError(null);
      setStep("parsing");
      setLinkProgress(options.skipAi ? 'Organizando los renglones para revisión…' : 'Extrayendo los artículos y el proveedor…');
      try {
        // Filtrar caracteres innecesarios y ruido de escaneo/AFIP antes de enviar al LLM
        const cleanText = cleanInvoiceOcrText(invoiceText);
        const lines = prepareInvoiceExtractionText(cleanText).text.split('\n').filter(Boolean);
        // A supplier with a learned layout is read locally: no tokens and no Groq limits.
        const known = supplierOverride.trim() ? findInvoiceFormat(invoiceFormats, supplierOverride) : detectInvoiceFormat(lines, invoiceFormats);
        const localItems = known && !options.useAi ? readWithInvoiceFormat(lines, known.format) : null;
        readSource.current = { lines, format: localItems ? known : null, mismatch: known && !localItems && !options.useAi ? known.supplier_name : '' };
        let parsed: ExtractedInvoice;
        if (localItems && known) {
          parsed = { proveedor: known.supplier_name, items: localItems };
        } else if (options.skipAi) {
          const NON_PRODUCT_HEADER = /^(?:cuit|cuil|iibb|ingresos\s+brutos|inicio\s+actividades|condici[oó]n|iva|responsable|monotributo|factura|remito|comprobante|recibo|ticket|punto\s+de\s+venta|comp\.?\s*nro|fecha|vto|vencimiento|domicilio|direcci[oó]n|tel[eé]fono|celular|cliente|se[ñn]or|cuenta|transporte|c[oó]d(?:igo)?\s+descripci[oó]n|cant(?:idad)?\s+descripci[oó]n|descripci[oó]n\s+precio)\b/i;
          const SUMMARY_RE = /^(?:sub\s*total|total|neto|importe|saldo|son\s+pesos|iva|percepci[oó]n|perc\.?|bonificaci[oó]n|descuento|dto\.?|recargo|flete|env[ií]o|redondeo|impuesto|ii\.?\s*bb|iibb)\b/i;
          const candidateLines = lines.filter(l => {
            const trimmed = l.trim();
            if (trimmed.length < 4) return false;
            if (SUMMARY_RE.test(trimmed) || NON_PRODUCT_HEADER.test(trimmed)) return false;
            return /\p{L}{2,}/u.test(trimmed) && /\d/.test(trimmed);
          });
          const effectiveLines = candidateLines.length ? candidateLines : lines.filter(l => /\p{L}{2,}/u.test(l) && !SUMMARY_RE.test(l.trim()));
          parsed = {
            proveedor: supplierOverride.trim(),
            items: effectiveLines.map(line => {
              const toks = line.replace(/(?<!\d)[\\/|√✓]+|[\\/|√✓]+(?!\d)/g, ' ').replace(/\$\s+/g, '$').split(/\s+/).filter(Boolean);
              const nums: number[] = [];
              for (let i = toks.length - 1; i >= 0 && nums.length < 4; i--) {
                const val = invoiceNumber(toks[i]);
                if (val !== undefined && val > 0) nums.push(val);
              }
              let cost: number | undefined;
              let qty = 1;
              if (nums.length === 1) {
                cost = nums[0];
              } else if (nums.length >= 2) {
                cost = nums[0];
                const possibleQty = nums.find(n => Number.isInteger(n) && n > 0 && n <= 1000 && n !== cost);
                if (possibleQty) qty = possibleQty;
              }
              const desc = formatSuggestedProductName(line);
              return {
                invoice_line: line,
                name: desc || line,
                qty,
                cost,
                unread: false,
              };
            }),
          };
        } else try {
          const textToAnalyze = cleanText.trim().length >= 20 ? cleanText : invoiceText;
          parsed = await extractInvoiceProducts(textToAnalyze, part => buildParsePrompt(part, localCategories, products), {
            cache: extractionCache.current, signal: controller.signal, supplierKnown: !!supplierOverride.trim(),
            onProgress: message => { if (mounted.current) setLinkProgress(message); },
          });
        } catch (errFirst) {
          const isRateLimit =
            errFirst instanceof GroqError &&
            (errFirst.status === 429 ||
              errFirst.code === "rate_limit_exceeded" ||
              errFirst.message.toLowerCase().includes("rate limit") ||
              errFirst.message.toLowerCase().includes("tokens per minute"));

          if (isRateLimit) {
            const waitSec = errFirst.retryAfter || 25;
            startRateLimitCountdown(waitSec);
            // The daily quota does not recover in seconds; say which limit it was.
            const daily = /per day|\(TPD\)|\(RPD\)/i.test(errFirst.message);
            throw new Error(daily
              ? `Se agotó la cuota diaria de Groq de esta clave. Podés cargar la factura a mano, continuar sin IA o reintentar más tarde (Groq indica ${Math.ceil(waitSec)} s); el texto detectado se conserva.`
              : `Groq alcanzó su límite por minuto. Podés continuar a revisión sin IA o esperar ${Math.ceil(waitSec)} segundos para reintentar; el texto detectado se conserva.`,
            );
          } else {
            throw errFirst;
          }
        }

        if (!mounted.current || controller.signal.aborted) return;
        if (!parsed.items.length) {
          throw new Error(options.skipAi
            ? 'No se detectaron renglones con texto en la factura. Podés cargar productos manualmente o revisar el texto detectado.'
            : 'La IA no encontró renglones de productos en el texto leído. Abrí Ver / editar texto detectado: si faltan, usá Volver a leer o Girar y leer. También podés continuar sin IA.');
        }

        const supplier = supplierOverride.trim() || parsed.proveedor?.trim() || '';
        setProviderName(supplier);
        setDiscountOverride(null);
        const parseDiscount = findRegisteredSupplier(suppliers, supplier)?.discount_percent ?? 0;
        setInvoiceDate("");
        setLinkProgress('Buscando en la memoria del proveedor y comparando con tu catálogo…');
        const links = await linkInvoiceItems(storeId, supplier, parsed.items.map(it => ({
          invoice_line: (it.invoice_line || it.name || '').trim(),
          commercial_name: (it.name && it.name !== it.invoice_line ? it.name : '').trim() || undefined,
          code: it.code,
          quantity: it.qty, quantity_unit: it.quantityUnit, invoiced_cost: it.cost ?? null,
          extracted_pack_size: detectPackUnits(it.invoice_line || it.name || '') > 1
            ? detectPackUnits(it.invoice_line || it.name || '') : it.unitsPerPack,
        })), products, controller.signal);
        if (!mounted.current || controller.signal.aborted) return;

        const existingCodes = new Set(
          products.map((p) => p.code?.trim().toLowerCase()).filter(Boolean),
        );

        const resolvedItems: InvoiceItem[] = parsed.items.map((it, index) => {
          const rawInvoiceLine = (it.invoice_line || it.name || "").trim();
          const cleanCommercialName = (it.name || rawInvoiceLine).trim();
          const rawCode = (it.code || "").trim();
          const link = links[index];
          const matchedProduct = products.find(product => product.id === link.matched_product_id) || null;

          // Respect explicit individual units; otherwise use the presentation, catalog pack, or AI suggestion.
          const regexUnits = detectPackUnits(link.invoice_line || rawInvoiceLine);
          const aiUnits = Number(it.unitsPerPack);
          const catalogUnits = configuredPackSize(matchedProduct?.pack_size);
          const safeAiUnits = Number.isInteger(aiUnits) && aiUnits > 1 ? aiUnits : 1;
          const unitsPerPack = it.quantityUnit === 'unit' ? 1 : regexUnits > 1 ? regexUnits : link.pack_size_detected ?? (safeAiUnits > 1 ? safeAiUnits : catalogUnits);
          const isPack = unitsPerPack > 1;

          const rawQty = it.qty == null ? 1 : Number(it.qty);
          const costKnown = (it.cost != null && Number.isFinite(Number(it.cost)) && Number(it.cost) >= 0)
            || (it.unitCost != null && Number.isFinite(Number(it.unitCost)) && Number(it.unitCost) >= 0);
          const rawCost = Math.max(0, Number(it.cost ?? (Number(it.unitCost) * unitsPerPack)) || 0);

          // Si viene en display/caja: el costo unitario real es rawCost / unitsPerPack
          // y el stock total a ingresar es rawQty * unitsPerPack
          const unitCost = isPack && rawCost > 0
            ? Math.round((rawCost / unitsPerPack) * 100) / 100
            : rawCost;
          const qty = rawQty * unitsPerPack;

          // Búsqueda inteligente en catálogo para sugerir categoría y EAN
          const isBarcode = isRealBarcode(rawCode);
          const catalogMatches = rankCatalogMatches(cleanCommercialName || rawInvoiceLine, rawCode, products, 3);
          const bestCatalogMatch = catalogMatches.length > 0 && catalogMatches[0].confidence >= 0.4 ? catalogMatches[0].product : null;

          let newCode = "";
          let codeDetected = false;
          let codeSource: InvoiceItem["codeSource"] = "none";

          if (isBarcode) {
            newCode = rawCode;
            codeDetected = true;
            codeSource = "invoice";
          } else if (bestCatalogMatch?.code && isRealBarcode(bestCatalogMatch.code)) {
            newCode = bestCatalogMatch.code;
            codeDetected = true;
            codeSource = "catalog";
          }

          // Categorización entre las opciones provistas por la base de datos o catálogo.
          let assignedCategoryId = resolveCategory(it.category || undefined, cleanCommercialName || rawInvoiceLine, localCategories);
          let categorySource: InvoiceItem["categorySource"] = it.category ? "ai" : "manual";

          const defaultCat = defaultProductCategory(localCategories);
          if ((!assignedCategoryId || assignedCategoryId === defaultCat) && bestCatalogMatch?.categoryId) {
            assignedCategoryId = bestCatalogMatch.categoryId;
            categorySource = "catalog";
          }

          const hasMatch = !!matchedProduct;
          const defaultMargin = 40;
          const suggestedPrice = unitCost > 0 ? Math.max(1, Math.round(applySupplierDiscount(unitCost, parseDiscount) * (1 + defaultMargin / 100))) : 100;
          const suggestedName = formatSuggestedProductName(rawInvoiceLine, cleanCommercialName);

          return {
            invoiceLine: link.invoice_line || rawInvoiceLine,
            linkStatus: link.autoLinked && (!link.mapping?.pack_size_detected || link.mapping.pack_size_detected === unitsPerPack) ? 'auto' : 'pending',
            linkReason: it.unread ? `La IA no pudo leer este renglón. Completá cantidad y costo mirando la factura. ${link.reason}` : link.reason,
            mapping: link.mapping,
            mappingInvoiceText: link.mapping_invoice_text,
            // The model explanation is supplemental; never use it to calculate the cost.
            divisionReason: costKnown && link.pack_size_detected === unitsPerPack && link.unit_cost !== null && Math.abs(link.unit_cost - unitCost) < 0.01 ? link.division_reason : undefined,
            costKnown,
            rawName: rawInvoiceLine || "Producto sin nombre",
            rawCode: rawCode || undefined,
            rawQty,
            rawCost,
            unitsPerPack,
            quantityUnit: it.quantityUnit,
            isPack,
            qty,
            unitCost,
            matchedProduct,
            matchConfidence: link.confidence,
            action: hasMatch ? (costKnown ? 'both' : 'add_stock') : 'create_new',
            suggestedName,
            newName: suggestedName,
            newCode,
            newMinStock: 4,
            codeDetected,
            codeSource,
            newPrice: suggestedPrice,
            customMargin: defaultMargin,
            isManualPrice: false,
            newCategoryId: assignedCategoryId,
            categorySource,
          };
        });

        setItems(resolvedItems);
        setReadWithFormat({ format: readSource.current.format, mismatch: readSource.current.mismatch });
        const unread = parsed.items.filter(item => item.unread).length;
        if (unread) {
          setError(`${unread === 1 ? 'Un renglón no se pudo leer' : `${unread} renglones no se pudieron leer`} con IA y ${unread === 1 ? 'quedó' : 'quedaron'} con cantidad 0 y sin costo. Completalos mirando la factura u omitilos antes de aplicar.`);
        } else if (options.skipAi) {
          setError('Revisión directa sin IA: verificá cantidades, costos y nombres antes de aplicar la reposición.');
        }
        setFormatNotice('');
        catalogController.current?.abort();
        setCatalogSuggestions(null);
        setReviewAttention(null);
        setProductSearch({});
        setSearchQuery('');
        setFilterStatus('all');
        setExpandedItems(new Set());
        setStep("review");
      } catch (err) {
        if (!mounted.current || controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Error desconocido al analizar la factura.";
        setError(msg);
        setShowRawText(true);
        setStep("input");
      } finally { parsing.current = false; }
    },
    [invoiceText, products, localCategories, supplierOverride, suppliers, invoiceFormats, storeId, clearRateLimitTimer, startRateLimitCountdown, fileReadFailed, rateLimitCountdown],
  );

  // ── Supplier invoice layout ─────────────────────────────────────────────

  // Secondary: a failure here never undoes or blocks the import; the next invoice simply uses AI.
  const rememberInvoiceFormat = useCallback(() => {
    const supplier = providerName.trim();
    if (!normalizeSupplierText(supplier)) { setFormatNotice('No se aprendió el formato de la factura porque no tiene proveedor indicado.'); return; }
    const { lines, format: used } = readSource.current;
    const learned = learnInvoiceFormat(lines, items.filter(item => item.action !== 'skip' && item.costKnown)
      .map(item => ({ invoiceLine: item.invoiceLine, code: item.rawCode, qty: item.rawQty, cost: item.rawCost })));
    if ('failure' in learned) {
      if (!findInvoiceFormat(invoiceFormats, supplier)) setFormatNotice(`No se pudo aprender el formato de ${supplier}: ${learned.failure}. Sus facturas se seguirán leyendo con IA.`);
      return;
    }
    const localRead = !!used && used.supplier_key === normalizeSupplierText(supplier) && sameInvoiceFormat(used.format, learned.format);
    void retail.saveSupplierInvoiceFormat(storeId, supplier, learned.format, learned.samples, localRead).then(() => {
      if (!mounted.current) return;
      setFormatNotice(localRead ? `Formato de ${supplier} confirmado.` : `Formato de ${supplier} guardado: la próxima factura igual se leerá sin IA.`);
      void retail.supplierInvoiceFormats(storeId).then(rows => { if (mounted.current) setInvoiceFormats(rows); }, () => undefined);
    }, () => {
      if (mounted.current) setFormatNotice(`La reposición se guardó, pero no se pudo recordar el formato de ${supplier}. La próxima factura se leerá con IA.`);
    });
  }, [providerName, items, invoiceFormats, storeId]);

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (importInProgress.current) return;
    if (initialStockBranch !== stockBranchId) { setError('Cambió la ubicación del inventario. Confirmá la sucursal de ingreso antes de aplicar; los datos se conservan.'); return; }
    const toUpdate = items.filter((it) => it.matchedProduct && it.action !== "skip");
    const toCreate = items.filter((it) => !it.matchedProduct && it.action === "create_new");

    if (toUpdate.some(item => item.linkStatus === 'pending')) {
      setError('Confirmá las vinculaciones pendientes u omití esos artículos antes de aplicar la reposición.');
      return;
    }
    const seenCodes = new Set(products.map(product => product.code.trim().toLowerCase()));
    for (const item of toCreate) {
      const index = items.indexOf(item);
      if (!item.newName.trim()) {
        revealReviewItem(index, 'name');
        setError(`Completá el nombre del producto en la fila ${index + 1}.`);
        return;
      }
      const code = item.newCode.trim();
      if (!isInvoiceProductCode(code)) {
        revealReviewItem(index, 'code');
        setError(`Completá el EAN de ${item.newName}. Si no lo conseguís, usá Generar interno en esa fila.`);
        return;
      }
      if (seenCodes.has(code.toLowerCase())) {
        revealReviewItem(index, 'code');
        setError(`El código ${code} ya está en el catálogo o se repite en esta carga. Vinculá el producto existente o corregí el código.`);
        return;
      }
      seenCodes.add(code.toLowerCase());
      if (!Number.isSafeInteger(item.newMinStock) || item.newMinStock < 0 || item.newMinStock > 2147483647) {
        revealReviewItem(index, 'minimum');
        setError(`Completá un stock mínimo entero de 0 a 2.147.483.647 para ${item.newName}.`);
        return;
      }
    }
    const fractionalQuantity = [...toUpdate, ...toCreate].find(item => !Number.isSafeInteger(item.qty));
    if (fractionalQuantity) {
      revealReviewItem(items.indexOf(fractionalQuantity), 'qty');
      setError('El stock usa unidades enteras. Revisá la cantidad recibida y las unidades por bulto antes de aplicar.');
      return;
    }
    const missingAutomaticCost = toUpdate.find(item => item.matchedProduct?.sale_markup != null
      && (item.action === 'both' || item.action === 'update_cost') && (!item.costKnown || item.unitCost <= 0));
    if (missingAutomaticCost) {
      revealReviewItem(items.indexOf(missingAutomaticCost), 'cost');
      setError(`Completá un costo mayor a cero para ${missingAutomaticCost.matchedProduct!.name}, o elegí Solo Stock. Su precio principal se calcula desde el costo.`);
      return;
    }
    const invalidItem = [...toUpdate, ...toCreate].find(item => !Number.isFinite(item.qty) || item.qty <= 0 || item.qty > 1000000
      || !Number.isSafeInteger(item.unitsPerPack) || item.unitsPerPack < 1
      || !Number.isFinite(item.unitCost) || item.unitCost < 0
      || (!item.costKnown && (item.action === 'both' || item.action === 'update_cost' || item.action === 'create_new')));
    if (invalidItem) {
      const column = !Number.isFinite(invalidItem.qty) || invalidItem.qty <= 0 || invalidItem.qty > 1000000 ? 'qty'
        : !Number.isSafeInteger(invalidItem.unitsPerPack) || invalidItem.unitsPerPack < 1 ? 'pack' : 'cost';
      revealReviewItem(items.indexOf(invalidItem), column);
      setError('Revisá cantidades y costos: usá cantidades positivas de hasta 1.000.000 y completá el costo antes de actualizarlo o crear un producto.');
      return;
    }

    if (!toUpdate.length && !toCreate.length) {
      setError("No hay ítems para importar. Elegí al menos una acción distinta de 'Omitir'.");
      return;
    }
    if (!discountValid) {
      document.getElementById('invoice-supplier-discount')?.focus();
      setError('El descuento del proveedor debe ser un porcentaje desde 0 y menor a 100.');
      return;
    }
    const netCost = (cost: number) => applySupplierDiscount(cost, effectiveDiscount);
    importInProgress.current = true;
    setStep("importing");
    setError(null);

    try {
      // Validate category availability before applying any stock/cost changes.
      let fallbackCatId = defaultProductCategory(localCategories);
      if (toCreate.length && !fallbackCatId) fallbackCatId = defaultProductCategory(await retail.categories(storeId));
      if (toCreate.length && !fallbackCatId) throw new Error('No se cargó la categoría Varios. Actualizá los datos y verificá la migración de categorías estándar antes de importar.');
      const importedCosts = new Map<string, InvoiceCostChange>();
      // 1. Actualización de productos existentes
      if (toUpdate.length > 0) {
        const batchItems = new Map<string, { id: string; newStock: number; newCost?: number; quantityAdded: number }>();
        for (const it of toUpdate) {
          const prod = it.matchedProduct!;
          const previous = batchItems.get(prod.id);
          const quantityAdded = (previous?.quantityAdded || 0) + (it.action === 'add_stock' || it.action === 'both' ? it.qty : 0);
          if (quantityAdded > 1000000) throw new Error(`La reposición de ${prod.name} supera 1.000.000 de unidades.`);
          const newCost =
            it.action === "update_cost" || it.action === "both"
              ? netCost(it.unitCost)
              : previous?.newCost;
          if (it.action === 'update_cost' || it.action === 'both') {
            importedCosts.set(prod.id, { id: prod.id, name: prod.name, previousCost: prod.cost, newCost: netCost(it.unitCost), currentPrice: prod.price });
          }
          batchItems.set(prod.id, { id: prod.id, newStock: prod.stock + quantityAdded, newCost, quantityAdded });
        }
        await retail.replenishStockBatch(storeId, [...batchItems.values()], stockBranchId);
      }

      // 2. Alta de productos nuevos en catálogo
      if (toCreate.length > 0) {
        for (const it of toCreate) {
          const code = it.newCode.trim();

          const price = Math.max(
            1,
            Number(it.newPrice) || Math.round(netCost(it.unitCost) * 1.4) || 100,
          );
          const name = (it.newName || it.rawName).trim().slice(0, 160);
          const emoji = guessProductEmoji(name);

          await retail.saveProduct(
            storeId,
            {
              id: "",
              categoryId: it.newCategoryId || fallbackCatId,
              code,
              name,
              price,
              cost: Math.max(0, netCost(Number(it.unitCost) || 0)),
              stock: Math.max(1, Number(it.qty) || 1),
              minStock: it.newMinStock,
              emoji,
              active: true,
              supplier: providerName?.trim() || undefined,
              pack_size: it.unitsPerPack > 1 ? it.unitsPerPack : null,
            },
            false,
            undefined,
            stockBranchId,
          );

          // Contribuir al catálogo comunitario si tiene código EAN numérico
          const cleanCode = code.trim();
          const isNumericEan = /^\d{8,14}$/.test(cleanCode);
          const isInternalCode = /^[a-zA-Z]/.test(cleanCode);
          if (isNumericEan && !isInternalCode) {
            const catName =
              localCategories.find((c) => c.id === (it.newCategoryId || fallbackCatId))
                ?.name || "";
            void retail.contributeCatalog(cleanCode, name, undefined, catName, emoji);
          }
        }
      }

      const totalCount = toUpdate.length + toCreate.length;
      setImportedCount(totalCount);
      setUpdatedCount(toUpdate.length);
      setCreatedCount(toCreate.length);
      setCostChanges([...importedCosts.values()].filter(change => invoiceCostIncrease(change.previousCost, change.newCost)));
      setShowPriceProposal(false);
      setStep("done");
      rememberInvoiceFormat();
      void Promise.resolve().then(() => onImportDone?.(totalCount)).catch(() => {
        setError('La reposición se guardó, pero no se pudo actualizar el catálogo en pantalla. Actualizá los datos al cerrar.');
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al importar productos.";
      setError(msg);
      setStep("review");
    } finally {
      importInProgress.current = false;
    }
  }, [items, storeId, stockBranchId, initialStockBranch, onImportDone, products, localCategories, providerName, revealReviewItem, discountValid, effectiveDiscount, rememberInvoiceFormat]);

  // ── UI helpers ──────────────────────────────────────────────────────────

  const toggleExpand = (i: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const updateItem = (i: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch,
      ...(patch.qty !== undefined ? { rawQty: patch.qty / it.unitsPerPack } : {}),
      ...(patch.unitCost !== undefined ? { unitCost: Number.isFinite(patch.unitCost) ? patch.unitCost : 0, rawCost: Number.isFinite(patch.unitCost) ? patch.unitCost * it.unitsPerPack : 0, costKnown: Number.isFinite(patch.unitCost) && patch.unitCost >= 0, divisionReason: undefined } : {}),
      ...(patch.matchedProduct !== undefined ? { linkStatus: 'pending' as const, mapping: undefined, divisionReason: undefined } : {}),
    } : it));
  };

  const addManualItem = () => {
    const index = items.length;
    setItems(previous => [...previous, {
      invoiceLine: 'Agregado manualmente', rawName: '', rawQty: 1, rawCost: 0,
      unitsPerPack: 1, quantityUnit: 'unit', isPack: false, qty: 1, unitCost: 0, costKnown: false,
      matchedProduct: null, matchConfidence: 0, linkStatus: 'pending', linkReason: 'Carga manual.',
      action: 'create_new', suggestedName: '', newName: '', newCode: '', codeSource: 'none',
      newMinStock: 4, newPrice: 1, customMargin: 40, isManualPrice: false, manual: true,
      newCategoryId: defaultProductCategory(localCategories), categorySource: 'manual',
    }]);
    setStep('review');
    setError(null);
    revealReviewItem(index, 'name');
  };

  const catalogQuery = (item: InvoiceItem) => ({
    name: item.matchedProduct?.name || item.newName.trim() || (item.manual ? '' : item.rawName),
    code: item.matchedProduct?.code || item.newCode.trim(),
  });
  const catalogKey = (item: InvoiceItem) => JSON.stringify({ ...catalogQuery(item), action: item.action });

  const searchInvoiceCatalog = async (index: number) => {
    const item = items[index];
    if (!item || (catalogSuggestions?.loading && catalogSuggestions.index === index)) return;
    const query = catalogQuery(item);
    if (query.name.length < 2 && !isRealBarcode(query.code)) return;
    catalogController.current?.abort();
    const controller = new AbortController();
    catalogController.current = controller;
    const key = catalogKey(item);
    setExpandedItems(previous => new Set(previous).add(index));
    setCatalogSuggestions({ index, key, loading: true, candidates: [], notice: '' });
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const result = await findInvoiceCatalogCandidates(query.name, query.code, sortedProducts, controller.signal);
      if (!mounted.current || catalogController.current !== controller || controller.signal.aborted) return;
      const current = latestItems.current[index];
      setCatalogSuggestions(current && catalogKey(current) === key
        ? { index, key, loading: false, ...result }
        : { index, key, loading: false, candidates: [], notice: 'Cambiaste la fila. Volvé a buscar para usar los datos actuales.' });
    } catch {
      if (mounted.current && catalogController.current === controller) setCatalogSuggestions({
        index, key, loading: false, candidates: [],
        notice: 'No se pudo completar la búsqueda. Revisá la conexión y reintentá; podés seguir completando la carga manualmente.',
      });
    } finally { clearTimeout(timeout); }
  };

  const useCatalogCandidate = (index: number, candidateId: string) => {
    const item = items[index];
    const candidate = catalogSuggestions?.index === index ? catalogSuggestions.candidates.find(row => row.id === candidateId) : null;
    if (!item || !candidate || catalogKey(item) !== catalogSuggestions?.key) {
      setCatalogSuggestions(previous => previous ? { ...previous, candidates: [], notice: 'La fila cambió. Volvé a buscar antes de aplicar una sugerencia.' } : null);
      return;
    }
    if (candidate.productId) selectProduct(index, candidate.productId);
    else updateItem(index, {
      matchedProduct: null, action: 'create_new',
      newName: candidate.name, newCode: candidate.code, codeDetected: true, codeSource: 'catalog',
      newCategoryId: resolveCategory(candidate.category, candidate.name, localCategories), categorySource: 'catalog',
    });
    setCatalogSuggestions(previous => previous ? { ...previous, candidates: [], notice: candidate.productId
      ? 'Producto vinculado. Revisá la presentación y confirmá el vínculo.' : 'Datos del catálogo aplicados. Cantidad, costo, precio y stock mínimo se conservan.' } : null);
  };

  const selectProduct = (i: number, productId: string) => {
    setItems(previous => previous.map((item, index) => {
      if (index !== i) return item;
      const product = sortedProducts.find(candidate => candidate.id === productId) || null;
      const explicit = detectPackUnits(item.invoiceLine);
      const catalogSize = configuredPackSize(product?.pack_size);
      const size = item.quantityUnit === 'unit' ? 1 : explicit > 1 ? explicit : catalogSize > 1 ? catalogSize : item.unitsPerPack;
      return { ...item, matchedProduct: product, linkStatus: 'pending',
        mapping: undefined, divisionReason: undefined,
        linkReason: 'Selección manual. Confirmá para recordarla para este proveedor.',
        action: product ? (item.costKnown ? 'both' : 'add_stock') : 'skip',
        unitsPerPack: size, isPack: size > 1, qty: item.rawQty * size,
        unitCost: Math.round(item.rawCost / size * 100) / 100,
      };
    }));
  };

  const confirmMapping = async (i: number) => {
    const item = items[i];
    if (!item?.matchedProduct || mappingInProgress.current) return;
    mappingInProgress.current = true;
    setMappingBusy(true);
    try {
      if (!Number.isFinite(item.qty) || item.qty <= 0 || item.qty > 1000000) throw new Error('Revisá la cantidad recibida antes de confirmar.');
      if (!normalizeSupplierText(providerName)) {
        setItems(previous => previous.map((current, index) => index === i && current === item ? { ...current, linkStatus: 'confirmed', matchConfidence: 1 } : current));
        setMappingNotice('Vínculo confirmado para esta factura. Agregá el proveedor si querés recordarlo para otras compras.');
        setError(null);
        return;
      }
      const saved = await saveMapping(storeId, providerName, item.mappingInvoiceText ?? item.invoiceLine, item.matchedProduct.id, item.matchedProduct.name, item.unitsPerPack, { confidence: 1 });
      if (mappingContext.current.storeId !== storeId || mappingContext.current.providerName !== providerName) return;
      setItems(previous => previous.map((current, index) => index === i && current === item ? { ...current, linkStatus: 'confirmed', matchConfidence: 1, mapping: saved } : current));
      let pending = false;
      try { pending = !!localStorage.getItem(`kiosco_supplier_mappings_${storeId}`); } catch { /* The server may still have saved it. */ }
      setMappingNotice(pending ? 'Vínculo guardado en este dispositivo. Hay vinculaciones pendientes de compartir; reintentá con conexión.' : 'Vínculo guardado para los usuarios del comercio.');
      setMappingRetry(pending);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo recordar la vinculación.'); }
    finally { mappingInProgress.current = false; setMappingBusy(false); }
  };

  const changeProvider = (value: string) => {
    if (normalizeSupplierText(value) !== normalizeSupplierText(providerName)) {
      setItems(previous => previous.map(item => ({ ...item, linkStatus: 'pending', mapping: undefined, mappingInvoiceText: undefined, linkReason: 'Cambiaste de proveedor. Confirmá el vínculo para recordarlo en este proveedor.' })));
      setDiscountOverride(null);
    }
    setProviderName(value);
  };

  const handleUpdatePackUnits = (originalIndex: number, newUnits: number) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== originalIndex) return it;
        const unitsPerPack = Math.max(1, Math.round(newUnits) || 1);
        const isPack = unitsPerPack > 1;
        const unitCost =
          isPack && it.rawCost > 0
            ? Math.round((it.rawCost / unitsPerPack) * 100) / 100
            : it.rawCost;
        const qty = it.rawQty * unitsPerPack;

        const currentMargin =
          it.unitCost > 0 ? (it.newPrice - it.unitCost) / it.unitCost : 0.4;
        const newPrice =
          unitCost > 0
            ? Math.max(1, Math.round(unitCost * (1 + currentMargin)))
            : it.newPrice;

        return {
          ...it,
          linkStatus: unitsPerPack !== it.unitsPerPack ? 'pending' : it.linkStatus,
          mapping: unitsPerPack !== it.unitsPerPack ? undefined : it.mapping,
          divisionReason: unitsPerPack !== it.unitsPerPack ? undefined : it.divisionReason,
          quantityUnit: isPack ? 'pack' : 'unit',
          unitsPerPack,
          isPack,
          unitCost,
          qty,
          newPrice,
        };
      }),
    );
  };

  const handleSetAllUnmatchedAction = (action: "create_new" | "skip") => {
    setItems((prev) =>
      prev.map((it) => (!it.matchedProduct ? { ...it, action } : it)),
    );
  };

  const handleApplyMarginToNew = (marginPct: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (!it.matchedProduct && it.action === "create_new") {
          const newPrice = Math.max(1, Math.round(applySupplierDiscount(it.unitCost, effectiveDiscount) * (1 + marginPct / 100)));
          return { ...it, newPrice, customMargin: marginPct, isManualPrice: false };
        }
        return it;
      }),
    );
  };

  const handleSetDefaultCategoryForNew = (catId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (!it.matchedProduct) {
          return { ...it, newCategoryId: catId };
        }
        return it;
      }),
    );
  };

  const matchedCount = items.filter((it) => it.matchedProduct && it.action !== "skip").length;
  const newCount = items.filter((it) => !it.matchedProduct && it.action === "create_new").length;
  const skippedCount = items.filter((it) => it.action === "skip").length;
  const unmatchedTotal = items.filter((it) => !it.matchedProduct).length;
  const totalToImport = matchedCount + newCount;
  const pendingCount = items.filter(item => item.matchedProduct && item.action !== 'skip' && item.linkStatus === 'pending').length;

  const filteredItems = useMemo(() => {
    return items
      .map((it, originalIndex) => ({ it, originalIndex }))
      .filter(({ it }) => {
        if (filterStatus === "new" && (it.matchedProduct || it.action !== "create_new")) return false;
        if (filterStatus === "matched" && !it.matchedProduct) return false;
        if (filterStatus === "skip" && it.action !== "skip") return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = it.rawName.toLowerCase().includes(q) || it.newName.toLowerCase().includes(q);
          const matchCode = (it.rawCode || "").toLowerCase().includes(q) || it.newCode.toLowerCase().includes(q);
          const matchMatched = it.matchedProduct?.name.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchMatched) return false;
        }
        return true;
      });
  }, [items, filterStatus, searchQuery]);

  const processFile = async (file: File, rotation = 0) => {
    if (fileReading.current || parsing.current) return;
    fileReading.current = true;
    clearRateLimitTimer();
    setError(null);
    setIsExtracting(true);
    setExtractProgress("Iniciando procesamiento…");

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    try {
      const result = await extractTextFromFile(file, (msg) => {
        if (mounted.current) setExtractProgress(msg);
      }, rotation);
      if (!mounted.current) return;
      sourceFile.current = file; sourceRotation.current = rotation;
      extractionCache.current.clear();
      setOriginalText(result.rawText || result.text);
      setInvoiceText(result.text);
      setFileReadFailed(false);
      setReadingNote(result.ocrConfidence != null && result.ocrConfidence < 75
        ? 'La lectura tiene baja confianza. Revisá cantidades y costos contra la imagen antes de continuar.' : '');
      setUploadedFile({
        name: result.fileName,
        size: sizeFormatted,
        type: result.fileType,
        previewUrl: result.previewUrl,
      });
      if (!result.text || result.text.length < 5) {
        setShowRawText(true);
        throw new Error('No se encontró texto legible. Probá Girar y leer, subí una foto nítida o pegá los renglones en Ver / editar texto detectado.');
      }
    } catch (err) {
      if (!mounted.current) return;
      const msg =
        err instanceof Error ? err.message : "Error al procesar el archivo.";
      setError(msg);
      setFileReadFailed(true);
      setShowRawText(true);
    } finally {
      fileReading.current = false;
      if (mounted.current) { setIsExtracting(false); setExtractProgress(''); }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const STEP_LABELS = ["Cargar", "Analizando", "Revisar", "Importando", "Listo"] as const;
  const STEP_KEYS = ["input", "parsing", "review", "importing", "done"] as const;
  const stepIdx = STEP_KEYS.indexOf(step);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="invoice-overlay" role="dialog" aria-modal="true" aria-label="Analizador de Facturas">
      <div className={`invoice-modal${step === 'review' ? ' invoice-modal-review' : ''}`}>
        {/* Header */}
        <div className="invoice-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AiIcon size={22} />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Analizador de Facturas con IA</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--tone-muted)" }}>
                Importá productos de una factura en PDF o imagen a tu stock automáticamente
              </p>
            </div>
          </div>
          <button className="invoice-close-btn" onClick={onClose} disabled={step === 'importing' || pricesBusy} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="invoice-steps">
          {STEP_KEYS.map((s, idx) => (
            <div
              key={s}
              className={`invoice-step-dot-wrap ${idx < stepIdx ? "done" : idx === stepIdx ? "active" : "pending"}`}
            >
              <div className="invoice-step-dot">{idx < stepIdx ? "✓" : idx + 1}</div>
              <span className="invoice-step-lbl">{STEP_LABELS[idx]}</span>
            </div>
          ))}
        </div>

        {/* Rate Limit Countdown Banner */}
        {rateLimitCountdown !== null && (
          <div className="invoice-rate-limit-banner">
            <Clock size={18} className="spin-slow" />
            <div className="rate-limit-info">
              <strong>Groq alcanzó su límite temporal</strong>
              <span>
                {rateLimitCountdown > 0 ? <>Podés reintentar en <strong>{rateLimitCountdown}s</strong>.</> : 'Ya podés reintentar.'} Tu lectura se conserva.
              </span>
            </div>
            <div className="rate-limit-actions">
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "5px 12px", fontSize: 12, height: "auto" }}
                onClick={() => void handleParse({ skipAi: true })}
              >
                Continuar sin IA
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ padding: "5px 12px", fontSize: 12, height: "auto" }}
                disabled={rateLimitCountdown > 0}
                onClick={() => void handleParse()}
              >
                <RefreshCw size={12} /> Reintentar
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "5px 10px", fontSize: 12, height: "auto" }}
                onClick={clearRateLimitTimer}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mappingNotice && <div className="info-banner" role="status">
          <span>{mappingNotice}</span>
          {mappingRetry && <button type="button" className="text-button" disabled={mappingBusy} onClick={async () => {
            if (mappingInProgress.current) return;
            mappingInProgress.current = true;
            setMappingBusy(true);
            try { await migrateLocalMappings(storeId); setMappingNotice('Memoria compartida con el comercio.'); setMappingRetry(false); }
            catch (err) { setMappingNotice(`No se pudieron compartir los vínculos guardados en este dispositivo (${errorMessage(err)}). Se conservan acá; reintentá con conexión.`); }
            finally { mappingInProgress.current = false; setMappingBusy(false); }
          }}>Reintentar sincronización</button>}
        </div>}
        {/* Error */}
        {error && rateLimitCountdown === null && (
          <div className="invoice-error" id="invoice-analysis-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 200 }}>{error}</span>
            {step === 'input' && invoiceText.trim().length > 0 && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: 12, padding: "4px 10px", height: "auto", whiteSpace: "nowrap" }}
                onClick={() => void handleParse({ skipAi: true })}
              >
                Continuar a revisión sin IA
              </button>
            )}
            <button aria-label="Cerrar mensaje de error" onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* INPUT */}
        {step === "input" && (
          <div className="invoice-body">
            <div className="invoice-hint">
              <AiIcon />
              <span>
                Subí tu factura en <strong>PDF</strong> o <strong>Foto / Imagen</strong> (PNG, JPG, WEBP). Revisá las sugerencias y aplicá la reposición cuando esté todo confirmado.
              </span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`invoice-dropzone ${isDragging ? "dragging" : ""} ${uploadedFile ? "has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isExtracting && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*,.png,.jpg,.jpeg,.webp,.bmp,.txt,.csv"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              {isExtracting ? (
                <div className="invoice-dropzone-loading">
                  <Loader2 size={34} className="spin" />
                  <h4>Procesando documento…</h4>
                  <p role="status">{extractProgress || "Leyendo y reconociendo el texto"}</p>
                </div>
              ) : uploadedFile ? (
                <div className="invoice-dropzone-file">
                  {uploadedFile.previewUrl ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Vista previa factura"
                      className="invoice-preview-thumb"
                      style={uploadedFile.type === 'image' ? { transform: `rotate(${sourceRotation.current}deg)` } : undefined}
                    />
                  ) : (
                    <div className={`invoice-file-icon ${uploadedFile.type}`}>
                      {uploadedFile.type === "pdf" ? <FileText size={30} /> : <FileImage size={30} />}
                    </div>
                  )}
                  <div className="invoice-file-meta">
                    <span className="invoice-file-name">{uploadedFile.name}</span>
                    <span className="invoice-file-sub">
                      {uploadedFile.type === "pdf" ? "Documento PDF" : "Imagen / Foto"} • {uploadedFile.size}
                    </span>
                    <span className="invoice-file-badge">{fileReadFailed ? 'Lectura pendiente de revisión' : 'Texto detectado · revisá cantidades y costos'}</span>
                  </div>
                  <button
                    type="button"
                    className="invoice-remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setInvoiceText("");
                      setOriginalText(''); setReadingNote(''); setFileReadFailed(false);
                      sourceFile.current = null; sourceRotation.current = 0;
                      extractionCache.current.clear();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Quitar archivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="invoice-dropzone-empty">
                  <div className="invoice-dropzone-icons">
                    <div className="dropzone-icon-pill pdf">
                      <FileText size={20} />
                      <span>PDF</span>
                    </div>
                    <div className="dropzone-icon-pill img">
                      <FileImage size={20} />
                      <span>Imagen / Foto</span>
                    </div>
                  </div>
                  <h4 style={{ margin: "10px 0 4px", fontSize: 15, fontWeight: 700, color: "var(--tone-accent)" }}>
                    Hacé click para seleccionar o arrastrá tu factura aquí
                  </h4>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--tone-muted)" }}>
                    Compatible con facturas electrónicas en <strong>PDF</strong>, escaneos o fotos de remitos en <strong>JPG / PNG / WEBP</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="button-row" aria-label="Opciones de lectura del comprobante">
              <button type="button" className="secondary-button" disabled={isExtracting} onClick={() => fileInputRef.current?.click()}><Upload size={14} /> {uploadedFile ? 'Cambiar archivo' : 'Elegir archivo'}</button>
              {sourceFile.current && <button type="button" className="text-button" disabled={isExtracting} onClick={() => void processFile(sourceFile.current!, sourceRotation.current)}><RefreshCw size={14} /> Volver a leer</button>}
              {uploadedFile?.type === 'image' && sourceFile.current && <button type="button" className="text-button" disabled={isExtracting} onClick={() => void processFile(sourceFile.current!, (sourceRotation.current + 90) % 360)}>Girar 90° y leer</button>}
            </div>
            {readingNote && <p role="status">{readingNote}</p>}
            {invoiceText && extractionText.omittedLines > 0 && <small role="status">Para analizar: {extractionText.retainedLines} de {extractionText.originalLines} líneas. Se omiten datos administrativos y ruido; el texto original se conserva.</small>}

            <label className="invoice-provider-field">
              Proveedor
              <input value={supplierOverride} onChange={e => setSupplierOverride(e.target.value)} placeholder="Elegí de la lista o dejalo vacío para detectarlo" list="invoice-supplier-options" />
              <datalist id="invoice-supplier-options">{[...new Set([...suppliers.map(supplier => supplier.name), ...invoiceFormats.map(row => row.supplier_name)])].map(name => <option key={name} value={name} />)}</datalist>
              <span>{supplierHint(supplierOverride)}</span>
            </label>

            {/* Extracted text preview toggle */}
            <div className="invoice-text-toggle-row">
              <button
                type="button"
                className="invoice-text-toggle-btn"
                onClick={() => setShowRawText(!showRawText)}
              >
                {showRawText ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>
                  {showRawText ? "Ocultar texto detectado" : "Ver / editar texto detectado"} {invoiceText ? `(${invoiceText.length} caracteres)` : ""}
                </span>
              </button>
              {invoiceText.length > 0 && !showRawText && !fileReadFailed && (
                <span className="invoice-text-status">
                  Listo para procesar con IA
                </span>
              )}
              {invoiceText.length > 0 && showRawText && (
                <button
                  type="button"
                  className="invoice-text-clean-btn"
                  disabled={isExtracting}
                  onClick={() => setInvoiceText((prev) => cleanInvoiceOcrText(prev))}
                  title="Eliminar líneas de ruido, símbolos sueltos y artefactos de OCR"
                >
                  <Filter size={12} /> Limpiar ruido OCR
                </button>
              )}
              {showRawText && originalText && originalText !== invoiceText && <button type="button" className="text-button" disabled={isExtracting} onClick={() => { setInvoiceText(originalText); setFileReadFailed(false); setError(null); }}>Restaurar texto original</button>}
              {fileReadFailed && invoiceText.trim() && <button type="button" className="text-button" disabled={isExtracting} onClick={() => { setFileReadFailed(false); setError(null); }}>Usar el texto que revisé</button>}
            </div>

            {showRawText && (
              <textarea
                ref={textInputRef}
                className="invoice-textarea"
                aria-label="Texto detectado de la factura"
                aria-describedby={error && rateLimitCountdown === null ? 'invoice-analysis-error' : undefined}
                placeholder="El texto de la factura aparecerá aquí automáticamente al subir el archivo PDF o imagen. También podés pegarlo o editarlo manualmente."
                value={invoiceText}
                disabled={isExtracting}
                onChange={(e) => { setInvoiceText(e.target.value); setFileReadFailed(false); }}
                rows={8}
              />
            )}

            <div className="invoice-actions">
              <button className="secondary-button" onClick={onClose}>Cancelar</button>
              <button type="button" className="secondary-button" onClick={addManualItem} disabled={isExtracting || catalogBusy}>
                <Plus size={14} /> Cargar producto manualmente
              </button>
              {invoiceText.trim().length > 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleParse({ skipAi: true })}
                  disabled={isExtracting || fileReadFailed}
                >
                  Continuar sin IA
                </button>
              )}
              <button
                className="primary-button ai-action ai-action-strong"
                onClick={() => void handleParse()}
                disabled={!invoiceText.trim() || isExtracting || fileReadFailed || (rateLimitCountdown ?? 0) > 0}
              >
                <AiIcon size={14} /> Analizar con IA
              </button>
            </div>
          </div>
        )}

        {/* PARSING */}
        {step === "parsing" && (
          <div className="invoice-body invoice-loading-state">
            <Loader2 size={38} className="spin" />
            <h3>Analizando la factura…</h3>
            <p role="status">{linkProgress}<br />Puede tardar unos segundos.</p>
            <button type="button" className="secondary-button" onClick={() => {
              // Completed parts stay cached, so analyzing again continues where it stopped.
              parseController.current?.abort();
              setLinkProgress('');
              setStep('input');
            }}>Cancelar lectura</button>
          </div>
        )}

        {/* REVIEW */}
        {step === "review" && (
          <div className="invoice-body">
            {initialStockBranch !== stockBranchId && <div className="info-banner" role="status">
              <span>La mercadería ingresará en {stockBranchName || 'la sucursal seleccionada'}. El borrador se conserva.</span>
              <button type="button" className="secondary-button" onClick={() => { setInitialStockBranch(stockBranchId); setError(null); }}>Confirmar ubicación</button>
            </div>}
            {/* Supplier and Date Header Bar */}
            <div className="inv-supplier-bar inv-supplier-bar-discount">
              <div className="inv-supplier-icon">🏭</div>
              <div className="inv-supplier-content">
                <span className="inv-supplier-label">Proveedor</span>
                {isEditingProvider ? (
                  <div className="inv-supplier-input-wrap">
                    <input
                      type="text"
                      className="inv-supplier-input"
                      value={providerName}
                      onChange={(e) => changeProvider(e.target.value)}
                      placeholder="Nombre del proveedor o distribuidora"
                      list="invoice-supplier-options"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingProvider(false);
                      }}
                    />
                    <button
                      type="button"
                      className="inv-small-btn primary"
                      onClick={() => setIsEditingProvider(false)}
                    >
                      Listo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inv-supplier-display"
                    onClick={() => setIsEditingProvider(true)}
                    aria-label={providerName ? `Proveedor ${providerName}. Cambiar` : 'Indicar proveedor'}
                  >
                    <strong>{providerName || "Indicar proveedor"}</strong>
                    <Edit2 size={13} className="inv-supplier-edit-icon" />
                  </button>
                )}
              </div>

              <div className="inv-supplier-discount">
                <label className="inv-supplier-label" htmlFor="invoice-supplier-discount">Descuento</label>
                <div className="inv-supplier-discount-field">
                  <NumberInput id="invoice-supplier-discount" min={0} max={99.99} step={0.01} value={discountText}
                    aria-invalid={!discountValid || undefined} aria-describedby="invoice-supplier-discount-help"
                    onValueChange={value => setDiscountOverride(value)} />
                  <span aria-hidden="true">%</span>
                  {discountOverride !== null && registeredSupplier && <button type="button" className="text-button" onClick={() => setDiscountOverride(null)}>
                    Usar {registeredSupplier.discount_percent.toLocaleString('es-AR')}%
                  </button>}
                </div>
                <small id="invoice-supplier-discount-help" className={!discountValid ? 'inv-supplier-discount-error' : undefined}>
                  {!discountValid ? 'Desde 0 y menor a 100.'
                    : registeredSupplier && discountOverride === null ? `Descuento guardado de ${registeredSupplier.name}`
                    : 'Solo para esta factura'}
                  {discountValid && effectiveDiscount > 0 && <> · Se descuenta del costo. Si los precios de la factura ya lo incluyen, dejalo en 0.</>}
                </small>
                {canRememberDiscount && <button type="button" className="text-button" disabled={supplierSaving} onClick={() => void rememberDiscount()}>
                  {registeredSupplier ? `Guardar ${effectiveDiscount.toLocaleString('es-AR')}% para próximas facturas` : `Guardar ${providerName.trim()} con ${effectiveDiscount.toLocaleString('es-AR')}%`}
                </button>}
                {supplierNotice && <small role="status">{supplierNotice}</small>}
              </div>

              {invoiceDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--tone-muted)" }}>
                  <span>📅</span>
                  <span>{invoiceDate}</span>
                </div>
              )}

              <button
                type="button"
                className="secondary-button"
                style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, height: "auto" }}
                onClick={() => setStep("input")}
              >
                <RefreshCw size={13} /> Volver a cargar
              </button>
            </div>

            <SupplierAliasPanel key={`${storeId}:${normalizeSupplierText(providerName)}`} storeId={storeId} supplier={providerName}
              disabled={mappingBusy} onDeleted={mapping => {
                if (mappingContext.current.storeId !== storeId || normalizeSupplierText(mappingContext.current.providerName) !== normalizeSupplierText(providerName)) return;
                setItems(previous => previous.map(item => item.mapping?.id === mapping.id ? {
                  ...item, mapping: undefined,
                  ...(item.linkStatus === 'auto' ? { linkStatus: 'pending' as const, linkReason: 'El alias fue eliminado. Revisá y confirmá el vínculo si querés volver a recordarlo.' } : {}),
                } : item));
              }} />
            {readWithFormat.format ? <p className="invoice-format-note" role="status">
              Leída sin IA con el formato guardado de {readWithFormat.format.supplier_name}. Si algún renglón no coincide con la factura,{' '}
              <button type="button" className="text-button" onClick={() => {
                if (window.confirm('Se vuelve a leer la factura con IA y se descartan los cambios hechos en esta revisión. ¿Continuar?')) void handleParse({ useAi: true });
              }}>volvé a leerla con IA</button>.
            </p> : <p className="invoice-format-note" role="status">
              {readWithFormat.mismatch ? `La factura no coincidió con el formato guardado de ${readWithFormat.mismatch} y se leyó con IA. Al aplicarla se actualiza el formato.`
                : formatsUnavailable ? 'Leída con IA: no se pudo consultar la memoria de formatos de factura. Revisá la conexión y que la actualización 202610270005 esté aplicada en Supabase.'
                : normalizeSupplierText(providerName) ? `Leída con IA: todavía no hay un formato guardado de ${providerName.trim()}. Al aplicar esta factura se aprende, y la próxima con el mismo formato se lee sin IA.`
                : 'Leída con IA. Indicá el proveedor para que se aprenda su formato al aplicar la factura.'}
            </p>}
            <p className="invoice-link-summary" role="status">
              {items.filter(item => item.linkStatus === 'auto').length} auto-vinculados · {pendingCount} pendientes de confirmar.
              {!normalizeSupplierText(providerName) && ' Indicá el proveedor para recordar las vinculaciones.'}
              {' '}Revisá los nuevos y los vínculos antes de aplicar.
            </p>


            {/* Toolbar: Search + Filter Tabs */}
            <div className="inv-toolbar">
              <div className="inv-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  aria-label="Buscar filas de la factura por nombre o código"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="inv-filter-tabs">
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "all" ? "active" : ""}`}
                  onClick={() => setFilterStatus("all")}
                >
                  Todos ({items.length})
                </button>
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "matched" ? "active" : ""}`}
                  onClick={() => setFilterStatus("matched")}
                >
                  En Catálogo ({items.filter((it) => it.matchedProduct).length})
                </button>
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "new" ? "active" : ""}`}
                  onClick={() => setFilterStatus("new")}
                >
                  ✨ Nuevos ({newCount})
                </button>
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "skip" ? "active" : ""}`}
                  onClick={() => setFilterStatus("skip")}
                >
                  Omitidos ({skippedCount})
                </button>
              </div>
            </div>

            {/* Bulk actions banner for unmatched items */}
            {unmatchedTotal > 0 && (
              <div className="inv-unmatched-banner">
                <div className="inv-unmatched-header" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AiIcon />
                    <span>
                      Factura con <strong>{unmatchedTotal}</strong> producto{unmatchedTotal !== 1 ? "s" : ""} sin vincular con tu catálogo
                    </span>
                  </div>
                  {items.some((it) => it.isPack) && (
                    <span className="inv-pack-summary-pill">
                      📦 {items.filter((it) => it.isPack).length} en Display / Caja cerrada (costos calculados por unidad)
                    </span>
                  )}
                </div>
                <div className="inv-unmatched-actions">
                  <button
                    type="button"
                    className="inv-small-btn primary"
                    onClick={() => handleSetAllUnmatchedAction("create_new")}
                  >
                    ✨ Cargar todos como productos nuevos
                  </button>
                  <button
                    type="button"
                    className="inv-small-btn"
                    onClick={() => handleSetAllUnmatchedAction("skip")}
                  >
                    Omitir todos los no encontrados
                  </button>
                  {localCategories.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <span style={{ color: "var(--tone-muted)" }}>Categoría común:</span>
                      <select
                        className="inv-small-select"
                        aria-label="Asignar categoría a todos los productos nuevos"
                        onChange={(e) => handleSetDefaultCategoryForNew(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Asignar a todos los nuevos
                        </option>
                        {localCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <span style={{ color: "var(--tone-muted)" }}>Aumento sobre costo:</span>
                    {[30, 40, 50, 100].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="inv-small-btn"
                        onClick={() => handleApplyMarginToNew(m)}
                        title={`Calcular precio de venta con +${m}% sobre costo`}
                      >
                        +{m}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <InvoiceReviewTable
              rows={filteredItems}
              filterKey={`${filterStatus}:${searchQuery}`}
              products={sortedProducts}
              categories={localCategories}
              supplier={providerName}
              discountPercent={effectiveDiscount}
              mappingBusy={mappingBusy}
              expandedItems={expandedItems}
              productSearch={productSearch}
              attention={reviewAttention}
              catalogSuggestions={catalogSuggestions}
              onSearchCatalog={i => void searchInvoiceCatalog(i)}
              onUseCatalogCandidate={useCatalogCandidate}
              onAddRow={addManualItem}
              isValidCode={isInvoiceProductCode}
              onToggleDetails={toggleExpand}
              onUpdate={updateItem}
              onPackChange={handleUpdatePackUnits}
              onSelectProduct={(i, productId) => {
                selectProduct(i, productId);
                setExpandedItems(previous => new Set(previous).add(i));
              }}
              onConfirmMapping={i => void confirmMapping(i)}
              onSearchProduct={(i, query) => setProductSearch(previous => ({ ...previous, [i]: query }))}
              onCodeChange={(i, code) => updateItem(i, { newCode: code, codeDetected: isRealBarcode(code), codeSource: 'manual' })}
              onGenerateCode={i => {
                const used = new Set([...products.map(product => product.code.toLowerCase()), ...items.map(item => item.newCode.trim().toLowerCase())]);
                updateItem(i, { newCode: generateProductCode(used), codeDetected: true, codeSource: 'manual' });
              }}
              onFindCategory={i => {
                const item = items[i];
                const found = rankCatalogMatches(item.newName || item.suggestedName || item.rawName, null, products, 3)
                  .find(match => !!match.product.categoryId);
                if (found?.product.categoryId) updateItem(i, { newCategoryId: found.product.categoryId, categorySource: 'catalog' });
              }}
              onFindCode={i => {
                const item = items[i];
                const found = rankCatalogMatches(item.newName || item.suggestedName || item.rawName, null, products, 5)
                  .find(match => isRealBarcode(match.product.code));
                if (found) updateItem(i, {
                  newCode: found.product.code, codeDetected: true, codeSource: 'catalog',
                  newCategoryId: found.product.categoryId || item.newCategoryId, categorySource: 'catalog',
                });
                else setError('No se encontró un producto similar con código de barras. Ingresalo o generá un código interno desde Detalles.');
              }}
            />
            <div className="invoice-actions">
              <button className="secondary-button" onClick={() => setStep("input")}>
                Volver
              </button>
              <button
                className="primary-button"
                onClick={() => void handleImport()}
                disabled={totalToImport === 0 || pendingCount > 0}
              >
                <PackageCheck size={14} /> Aplicar reposición ({totalToImport} producto{totalToImport !== 1 ? "s" : ""})
                {newCount > 0 ? ` (${matchedCount} exist. + ${newCount} nuev.)` : ""}
              </button>
              {pendingCount > 0 && <button type="button" className="text-button" onClick={() => {
                const index = items.findIndex(item => item.matchedProduct && item.action !== 'skip' && item.linkStatus === 'pending');
                if (index >= 0) {
                  setExpandedItems(previous => new Set(previous).add(index));
                  revealReviewItem(index, 'action');
                }
              }}>Revisar vínculos ({pendingCount})</button>}
            </div>
          </div>
        )}

        {/* IMPORTING */}
        {step === "importing" && (
          <div className="invoice-body invoice-loading-state">
            <Loader2 size={38} className="spin" />
            <h3>Importando productos…</h3>
            <p>Guardando productos nuevos y actualizando existencias en tu catálogo.</p>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="invoice-body">
            <div className="invoice-done-state">
            <CheckCircle2 size={54} color="var(--tone-accent)" />
            <h3>¡Importación completada!</h3>
            <p>
              Se procesaron exitosamente <strong>{importedCount}</strong> producto{importedCount !== 1 ? "s" : ""} en tu catálogo.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
                margin: "4px 0 14px",
              }}
            >
              {updatedCount > 0 && (
                <span className="inv-chip ok">
                  <CheckCircle2 size={13} /> {updatedCount} stock / costo actualizado{updatedCount !== 1 ? "s" : ""}
                </span>
              )}
              {createdCount > 0 && (
                <span className="inv-chip indigo">
                  <PackageCheck size={13} /> {createdCount} nuevo{createdCount !== 1 ? "s" : ""} producto{createdCount !== 1 ? "s" : ""} creado{createdCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {formatNotice && <p role="status">{formatNotice}</p>}
            {costChanges.length > 0 ? <>
              <p><AlertTriangle size={15} /> {costChanges.length} producto{costChanges.length === 1 ? '' : 's'} con suba de costo mayor al 2%. Podés revisar su precio de venta.</p>
              {!showPriceProposal && <button type="button" className="primary-button" onClick={() => setShowPriceProposal(true)}>Ver propuesta de precios</button>}
            </> : <p>No se detectaron subas mayores al 2% entre los costos actualizados.</p>}
            <button className="secondary-button" onClick={onClose} disabled={pricesBusy}>
              Cerrar
            </button>
            </div>
            {showPriceProposal && <InvoicePriceProposal storeId={storeId} changes={costChanges} products={products} onApplied={onPricesUpdated} onBusyChange={setPricesBusy} catalogBusy={catalogBusy} />}
          </div>
        )}
      </div>
    </div>
  );
}
