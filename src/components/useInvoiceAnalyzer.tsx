import { askConfirm } from './ConfirmHost';
import { type InvoiceReviewAttention } from './InvoiceReviewTable';
import { findInvoiceCatalogCandidates, type InvoiceCatalogCandidate } from '../services/invoiceCatalogService';
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GroqError } from "../services/groqService";
import { extractInvoiceProducts, invoiceNumber, prepareInvoiceExtractionText, type ExtractedInvoice } from '../services/invoiceExtractionService';
import { extractTextFromFile, cleanInvoiceOcrText } from "../services/invoiceParserService";
import { unitsPerPack as configuredPackSize } from '../services/inventoryUnits';
import type { Category, Supplier, PurchaseInvoice } from "../features/retail/api";
import { type QrStatus } from './PurchaseInvoicePanel';
import { checkPurchaseInvoice, draftFromQr, draftFromText, emptyPurchaseDraft, fillAmountsWithAi, purchaseInvoicePayload, scanArcaQr, type ArcaQrData, type PurchaseInvoiceDraft } from '../services/purchaseInvoiceService';
import { cuitDigits } from '../services/supplierInvoiceRules';
import { randomUUID } from '../utils/uuid';
import { defaultLandedSettings, hasDiscriminatedVat, internalTaxPerUnit, landedUnitCost, vatRate, type LandedCostSettings } from '../services/landedCostService';
import { retail, errorMessage } from "../features/retail/api";
import { linkInvoiceItems, rankCatalogMatches } from '../services/invoiceMatchingService';
import { migrateLocalMappings, normalizeSupplierText, saveMapping } from '../services/supplierMappingService';
import { invoiceCostIncrease, type InvoiceCostChange } from '../services/invoicePricingService';
import { applySupplierDiscount, findRegisteredSupplier, validDiscount } from '../services/supplierDiscountService';
import { applyInvoiceRules, cuitsInText, findSupplierByCuit, findSupplierByName, findSupplierBySimilarName, formatCuit, isStoreName } from '../services/supplierInvoiceRules';
import { detectInvoiceFormat, findInvoiceFormat, learnInvoiceFormat, readWithInvoiceFormat, sameInvoiceFormat, type StoredInvoiceFormat } from '../services/invoiceFormatService';
import { defaultProductCategory } from '../services/productCategoryService';
import { isSureLink, type InvoiceItem, isRealBarcode, isInvoiceProductCode, type InvoiceAnalyzerProps, formatSuggestedProductName, guessProductEmoji, detectPackUnits, resolveCategory, buildParsePrompt } from './invoiceAnalyzerHelpers';

/** Estado y acciones del analizador de facturas. Las vistas reciben el resultado como `s`. */
export function useInvoiceAnalyzer(props: InvoiceAnalyzerProps) {
  const {
  storeId,
  stockBranchId,
  stockBranchName,
  products,
  categories,
  onClose,
  onImportDone,
  onPricesUpdated,
  onReceived,
  catalogBusy = false,
  storeCuit,
  storeCondition,
  storeNames = [],
} = props;
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
  const [cuitNotice, setCuitNotice] = useState('');
  // Comprobante de compra (cabecera fiscal). Secundario: nunca bloquea la reposición.
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseInvoiceDraft>(emptyPurchaseDraft);
  const [qrData, setQrData] = useState<ArcaQrData | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus>('none');
  const qrScan = useRef(0);
  const [registerPurchase, setRegisterPurchase] = useState(true);
  const [purchaseAiBusy, setPurchaseAiBusy] = useState(false);
  const [purchaseAiError, setPurchaseAiError] = useState('');
  const [duplicatePurchase, setDuplicatePurchase] = useState<PurchaseInvoice | null>(null);
  const purchaseRequest = useRef(randomUUID());
  const [purchaseNotice, setPurchaseNotice] = useState<{ text: string; retry: boolean } | null>(null);
  const purchaseChecks = useMemo(() => checkPurchaseInvoice(purchaseDraft, qrData, storeCuit), [purchaseDraft, qrData, storeCuit]);
  const purchaseKeyReady = !purchaseChecks.missing.some(field => ['CUIT del proveedor', 'tipo de comprobante', 'punto de venta', 'número'].includes(field));
  const purchaseKey = purchaseKeyReady ? `${cuitDigits(purchaseDraft.issuer_cuit)}|${purchaseDraft.voucher_type}|${Number(purchaseDraft.point_of_sale)}|${Number(purchaseDraft.number)}` : '';
  useEffect(() => {
    if (!purchaseKey || step !== 'review') { setDuplicatePurchase(null); return; }
    let cancelled = false;
    const [issuer_cuit, voucher_type, point_of_sale, number] = purchaseKey.split('|');
    const timer = setTimeout(() => {
      // Sin la migración o sin conexión no hay aviso; el servidor igual rechaza el duplicado al registrar.
      void retail.findPurchaseInvoice(storeId, { issuer_cuit, voucher_type: Number(voucher_type), point_of_sale: Number(point_of_sale), number: Number(number) })
        .then(found => { if (!cancelled) setDuplicatePurchase(found); }, () => { if (!cancelled) setDuplicatePurchase(null); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [purchaseKey, storeId, step]);
  const startQrScan = (previewUrl?: string) => {
    const token = ++qrScan.current;
    setQrData(null);
    if (!previewUrl) { setQrStatus('none'); return; }
    setQrStatus('scanning');
    void scanArcaQr(previewUrl).then(found => {
      if (!mounted.current || token !== qrScan.current) return;
      setQrData(found);
      setQrStatus(found ? 'found' : 'not_found');
      // Si la revisión ya está abierta, el QR completa la cabecera con los datos oficiales.
      if (found) setPurchaseDraft(previous => draftFromQr(previous, found));
    }, () => { if (mounted.current && token === qrScan.current) setQrStatus('not_found'); });
  };
  const fillPurchaseWithAi = async () => {
    setPurchaseAiBusy(true); setPurchaseAiError('');
    try {
      const filled = await fillAmountsWithAi(invoiceText, purchaseDraft);
      if (mounted.current) setPurchaseDraft(filled);
    } catch (err) {
      if (mounted.current) setPurchaseAiError(`No se pudieron completar con IA: ${errorMessage(err)}. Completalos a mano.`);
    } finally { if (mounted.current) setPurchaseAiBusy(false); }
  };
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
  // Costo final que se guarda: neto con descuento + IVA (si la factura viene sin IVA) + internos repartidos.
  const [landedOverride, setLandedOverride] = useState<LandedCostSettings | null>(null);
  const internalTaxes = Number(purchaseDraft.amounts.internal_taxes) || 0;
  const vatDiscriminated = useMemo(() => hasDiscriminatedVat(invoiceText), [invoiceText]);
  const landedDefault = useMemo(() => defaultLandedSettings({
    rules: registeredSupplier?.invoice_rules ?? {}, voucherType: purchaseDraft.voucher_type, storeCondition, vatDiscriminated,
    net21: Number(purchaseDraft.amounts.net_21) || 0, net105: Number(purchaseDraft.amounts.net_10_5) || 0, internalTaxes,
  }), [registeredSupplier, purchaseDraft.voucher_type, purchaseDraft.amounts.net_21, purchaseDraft.amounts.net_10_5, internalTaxes, storeCondition, vatDiscriminated]);
  const landed = landedOverride ?? landedDefault;
  // Todos los renglones de la factura forman la base del reparto, también los omitidos.
  const internalShares = useMemo(() => internalTaxPerUnit(
    items.map(item => ({ amount: item.costKnown ? item.rawCost * item.rawQty : 0, units: item.qty })), internalTaxes,
  ), [items, internalTaxes]);
  const finalCostAt = useCallback((index: number, unitCost: number) =>
    landedUnitCost(applySupplierDiscount(unitCost, effectiveDiscount), landed, internalShares[index] ?? 0),
  [effectiveDiscount, landed, internalShares]);
  const finalCostNote = [
    effectiveDiscount > 0 ? `−${effectiveDiscount.toLocaleString('es-AR')}%` : '',
    landed.vat !== 'included' ? `+IVA ${(vatRate(landed.vat) * 100).toLocaleString('es-AR')}%` : '',
    landed.spreadInternalTaxes && internalTaxes > 0 ? '+internos' : '',
  ].filter(Boolean).join(' · ');
  // Calculated sale prices of new products follow the final cost; manual prices are kept.
  useEffect(() => {
    setItems(previous => {
      let changed = false;
      const next = previous.map((item, index) => {
        if (item.matchedProduct || item.isManualPrice || !item.costKnown || item.unitCost <= 0) return item;
        const newPrice = Math.max(1, Math.round(finalCostAt(index, item.unitCost) * (1 + (item.customMargin ?? 40) / 100)));
        if (newPrice === item.newPrice) return item;
        changed = true;
        return { ...item, newPrice };
      });
      return changed ? next : previous;
    });
  }, [finalCostAt]);
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
        // The supplier's CUIT on the invoice identifies it even when the AI misreads the name.
        // Without a readable CUIT, a registered supplier whose name appears in the text is used.
        // The ARCA QR carries the official issuer CUIT, even when the OCR cannot read the header.
        const qrSupplier = qrData ? suppliers.find(item => item.cuit === qrData.issuer_cuit) ?? null : null;
        const cuitSupplier = supplierOverride.trim() ? null : qrSupplier ?? findSupplierByCuit(suppliers, invoiceText) ?? findSupplierByName(suppliers, invoiceText, storeNames);
        const presetSupplier = supplierOverride.trim() || cuitSupplier?.name || '';
        const presetRules = (cuitSupplier ?? findRegisteredSupplier(suppliers, presetSupplier))?.invoice_rules ?? {};
        // A supplier with a learned layout is read locally: no tokens and no Groq limits.
        const known = presetSupplier ? findInvoiceFormat(invoiceFormats, presetSupplier) : detectInvoiceFormat(lines, invoiceFormats);
        // A fractional quantity means the columns shifted (OCR split an amount): use AI instead of a wrong read.
        const formatItems = known && !options.useAi ? readWithInvoiceFormat(lines, known.format) : null;
        const localItems = formatItems?.every(item => Number.isInteger(item.qty ?? 0)) ? formatItems : null;
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
            proveedor: presetSupplier,
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
          parsed = await extractInvoiceProducts(textToAnalyze, part => buildParsePrompt(part, localCategories, products, presetRules), {
            cache: extractionCache.current, signal: controller.signal, supplierKnown: !!presetSupplier,
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

        // The AI sometimes returns the buyer: the store's own names are never the supplier.
        const aiSupplier = parsed.proveedor?.trim() || '';
        const readSupplier = presetSupplier || (isStoreName(aiSupplier, storeNames) ? '' : aiSupplier);
        // A misspelled name read by the AI ("Castila") still finds the registered supplier and its rules.
        const similarSupplier = cuitSupplier || findRegisteredSupplier(suppliers, readSupplier) || !readSupplier ? null : findSupplierBySimilarName(suppliers, readSupplier);
        const registered = cuitSupplier ?? findRegisteredSupplier(suppliers, readSupplier) ?? similarSupplier;
        const supplier = registered?.name ?? readSupplier;
        setProviderName(supplier);
        setDiscountOverride(null);
        const parseDiscount = registered?.discount_percent ?? 0;
        // Unit of sale and bonus lines follow the supplier's rules, also for invoices read without AI.
        parsed = { ...parsed, items: applyInvoiceRules(parsed.items, registered?.invoice_rules ?? {}, invoiceText.split('\n')) };
        setCuitNotice(cuitSupplier ? (cuitSupplier === qrSupplier ? `Proveedor reconocido por el QR de ARCA (CUIT ${formatCuit(qrSupplier.cuit ?? '')}).`
          : cuitSupplier.cuit && cuitsInText(invoiceText).includes(cuitSupplier.cuit)
          ? `Proveedor reconocido por su CUIT ${formatCuit(cuitSupplier.cuit)}.` : `Proveedor reconocido por su nombre en la factura: ${cuitSupplier.name}.`)
          : similarSupplier ? `Proveedor reconocido por un nombre parecido: la factura dice «${readSupplier}» y se usó ${similarSupplier.name}. Cambialo si no corresponde.`
          : !presetSupplier && aiSupplier && !readSupplier ? 'La IA leyó el nombre de tu comercio como proveedor y se descartó: indicá el proveedor.' : '');
        const headerDraft = draftFromText(invoiceText, { supplierCuit: registered?.cuit, storeCuit });
        setPurchaseDraft(qrData ? draftFromQr(headerDraft, qrData) : headerDraft);
        purchaseRequest.current = randomUUID();
        setPurchaseAiError(''); setPurchaseNotice(null); setRegisterPurchase(true); setLandedOverride(null);
        setInvoiceDate("");
        setLinkProgress('Buscando en la memoria del proveedor y comparando con tu catálogo…');
        const links = await linkInvoiceItems(storeId, supplier, parsed.items.map(it => ({
          invoice_line: (it.invoice_line || it.name || '').trim(),
          commercial_name: (it.name && it.name !== it.invoice_line ? it.name : '').trim() || undefined,
          code: it.code,
          quantity: it.qty, quantity_unit: it.quantityUnit, invoiced_cost: it.cost ?? null,
          extracted_pack_size: it.quantityUnit === 'unit' ? 1 : detectPackUnits(it.invoice_line || it.name || '') > 1
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
          const unitsPerPack = link.code_units ?? (it.quantityUnit === 'unit' ? 1 : regexUnits > 1 ? regexUnits : link.pack_size_detected ?? (safeAiUnits > 1 ? safeAiUnits : catalogUnits));
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
    [invoiceText, products, localCategories, supplierOverride, suppliers, invoiceFormats, storeId, clearRateLimitTimer, startRateLimitCountdown, fileReadFailed, rateLimitCountdown, qrData, storeCuit, storeNames],
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

  // Secundario: un fallo acá no deshace la reposición; se puede reintentar con el mismo id.
  const savePurchase = useCallback(async (onlyVoucher = false) => {
    const registered = findRegisteredSupplier(suppliers, providerName);
    setPurchaseNotice({ text: 'Registrando el comprobante…', retry: false });
    try {
      await retail.savePurchaseInvoice(storeId, purchaseRequest.current, purchaseInvoicePayload(purchaseDraft, {
        supplier_id: registered?.id, supplier_name: providerName.trim() || formatCuit(purchaseDraft.issuer_cuit), qr_verified: purchaseChecks.qrVerified,
      }));
      if (mounted.current) setPurchaseNotice({ text: purchaseChecks.balanced
        ? 'Comprobante registrado para el contador (Proveedores → Comprobantes de compra).'
        : 'Comprobante registrado con la marca «Revisar»: sus importes no cierran. Revisalo en Proveedores → Comprobantes de compra.', retry: false });
      return true;
    } catch (err) {
      if (mounted.current) setPurchaseNotice({ text: onlyVoucher ? `No se registró el comprobante: ${errorMessage(err)}.`
        : `La reposición se aplicó, pero no se registró el comprobante: ${errorMessage(err)}.`, retry: !onlyVoucher });
      return false;
    }
  }, [suppliers, providerName, storeId, purchaseDraft, purchaseChecks]);

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

    // Todo omitido: se puede registrar solo el comprobante (mercadería ya cargada o corrección).
    const onlyVoucher = !toUpdate.length && !toCreate.length;
    if (onlyVoucher && !registerPurchase) {
      setError("No hay ítems para importar. Elegí al menos una acción distinta de 'Omitir', o marcá «Registrar el comprobante» para registrar solo la factura.");
      return;
    }
    if (!discountValid) {
      document.getElementById('invoice-supplier-discount')?.focus();
      setError('El descuento del proveedor debe ser un porcentaje desde 0 y menor a 100.');
      return;
    }
    let registerAfter = registerPurchase;
    if (registerPurchase && purchaseChecks.missing.length) {
      const panel = document.querySelector<HTMLDetailsElement>('.purchase-invoice-panel');
      if (panel) { panel.open = true; panel.scrollIntoView({ block: 'center' }); panel.querySelector('summary')?.focus(); }
      setError(`Completá los datos fiscales (faltan: ${purchaseChecks.missing.join(', ')}) o desmarcá «Registrar el comprobante».`);
      return;
    }
    if (onlyVoucher) {
      if (duplicatePurchase) { setError('Este comprobante ya está registrado. Para corregirlo, eliminalo primero en Proveedores → Comprobantes de compra.'); return; }
      importInProgress.current = true;
      setStep('importing'); setError(null);
      try {
        const saved = await savePurchase(true);
        setImportedCount(0); setUpdatedCount(0); setCreatedCount(0); setCostChanges([]);
        setStep(saved ? 'done' : 'review');
      } finally { importInProgress.current = false; }
      return;
    }
    if (duplicatePurchase) {
      if (!await askConfirm(`Este comprobante ya se registró el ${new Date(duplicatePurchase.created_at).toLocaleDateString('es-AR')}. ¿Aplicar igual la reposición? El comprobante no se registra de nuevo.`)) return;
      registerAfter = false;
    }
    const finalCost = (item: InvoiceItem, cost = item.unitCost) => finalCostAt(items.indexOf(item), cost);
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
              ? finalCost(it)
              : previous?.newCost;
          if (it.action === 'update_cost' || it.action === 'both') {
            importedCosts.set(prod.id, { id: prod.id, name: prod.name, previousCost: prod.cost, newCost: finalCost(it), currentPrice: prod.price });
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
            Number(it.newPrice) || Math.round(finalCost(it) * 1.4) || 100,
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
              cost: Math.max(0, finalCost(it, Number(it.unitCost) || 0)),
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
      if (registerAfter) void savePurchase(); else setPurchaseNotice(null);
      const receivedLines = toUpdate.filter(it => it.action === 'add_stock' || it.action === 'both').map(it => ({ product_id: it.matchedProduct!.id, name: it.matchedProduct!.name, qty: it.qty, unit_cost: it.costKnown ? finalCost(it) : null }));
      if (receivedLines.length && providerName.trim()) void Promise.resolve().then(() => onReceived?.({ supplierName: providerName.trim(), branchId: stockBranchId, lines: receivedLines })).catch(() => {});
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
  }, [items, storeId, stockBranchId, initialStockBranch, onImportDone, onReceived, products, localCategories, providerName, revealReviewItem, discountValid, finalCostAt, rememberInvoiceFormat, registerPurchase, purchaseChecks, duplicatePurchase, savePurchase]);

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
      return { ...item, matchedProduct: product, linkStatus: 'pending', matchConfidence: product ? 1 : 0,
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

  /** Confirma de una vez los vínculos sin dudas; si uno falla, los demás siguen pendientes para reintentar. */
  const confirmSureLinks = async () => {
    const sure = items.filter(isSureLink);
    if (!sure.length || mappingInProgress.current) return;
    mappingInProgress.current = true;
    setMappingBusy(true);
    const remember = !!normalizeSupplierText(providerName);
    const left = pendingCount - sure.length;
    let done = 0;
    try {
      for (const item of sure) {
        const saved = remember ? await saveMapping(storeId, providerName, item.mappingInvoiceText ?? item.invoiceLine, item.matchedProduct!.id, item.matchedProduct!.name, item.unitsPerPack, { confidence: 1 }) : undefined;
        if (mappingContext.current.storeId !== storeId || mappingContext.current.providerName !== providerName) return;
        setItems(previous => previous.map(current => current === item ? { ...current, linkStatus: 'confirmed', matchConfidence: 1, mapping: saved ?? current.mapping } : current));
        done += 1;
      }
      let pending = false;
      try { pending = remember && !!localStorage.getItem(`kiosco_supplier_mappings_${storeId}`); } catch { /* The server may still have saved them. */ }
      setMappingNotice(`${done} ${done === 1 ? 'vínculo confirmado' : 'vínculos confirmados'}.${left > 0 ? ` ${left === 1 ? 'Queda 1 dudoso' : `Quedan ${left} dudosos`} para revisar.` : ''}${pending ? ' Guardados en este dispositivo; reintentá con conexión para compartirlos.' : ''}`);
      setMappingRetry(pending);
      setError(null);
    } catch (err) { setError(`Se confirmaron ${done} de ${sure.length} vínculos. ${err instanceof Error ? err.message : 'No se pudo recordar la vinculación.'}`); }
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
      prev.map((it, index) => {
        if (!it.matchedProduct && it.action === "create_new") {
          const newPrice = Math.max(1, Math.round(finalCostAt(index, it.unitCost) * (1 + marginPct / 100)));
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
  const sureCount = items.filter(isSureLink).length;
  const confirmSureButton = sureCount > 0 && <button type="button" className="secondary-button" disabled={mappingBusy} onClick={() => void confirmSureLinks()}>
    {sureCount === 1 ? 'Confirmar el seguro' : `Confirmar los ${sureCount} seguros`}
  </button>;

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
      startQrScan(result.previewUrl);
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

  return {
    storeId,
    stockBranchId,
    stockBranchName,
    products,
    categories,
    onClose,
    onImportDone,
    onPricesUpdated,
    onReceived,
    catalogBusy,
    storeCuit,
    storeCondition,
    storeNames,
    step,
    setStep,
    invoiceText,
    setInvoiceText,
    extractionText,
    items,
    setItems,
    initialStockBranch,
    setInitialStockBranch,
    latestItems,
    catalogController,
    catalogSuggestions,
    setCatalogSuggestions,
    providerName,
    setProviderName,
    supplierOverride,
    setSupplierOverride,
    invoiceDate,
    setInvoiceDate,
    error,
    setError,
    importedCount,
    setImportedCount,
    createdCount,
    setCreatedCount,
    updatedCount,
    setUpdatedCount,
    costChanges,
    setCostChanges,
    showPriceProposal,
    setShowPriceProposal,
    pricesBusy,
    setPricesBusy,
    expandedItems,
    setExpandedItems,
    isExtracting,
    setIsExtracting,
    extractProgress,
    setExtractProgress,
    readingNote,
    setReadingNote,
    originalText,
    setOriginalText,
    fileReadFailed,
    setFileReadFailed,
    sourceFile,
    sourceRotation,
    fileReading,
    mounted,
    parseController,
    parsing,
    extractionCache,
    uploadedFile,
    setUploadedFile,
    isDragging,
    setIsDragging,
    showRawText,
    setShowRawText,
    fileInputRef,
    textInputRef,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    reviewAttention,
    setReviewAttention,
    revealReviewItem,
    isEditingProvider,
    setIsEditingProvider,
    productSearch,
    setProductSearch,
    linkProgress,
    setLinkProgress,
    mappingNotice,
    setMappingNotice,
    mappingRetry,
    setMappingRetry,
    mappingBusy,
    setMappingBusy,
    mappingInProgress,
    mappingContext,
    suppliers,
    setSuppliers,
    invoiceFormats,
    setInvoiceFormats,
    readSource,
    readWithFormat,
    setReadWithFormat,
    formatNotice,
    setFormatNotice,
    cuitNotice,
    setCuitNotice,
    purchaseDraft,
    setPurchaseDraft,
    qrData,
    setQrData,
    qrStatus,
    setQrStatus,
    qrScan,
    registerPurchase,
    setRegisterPurchase,
    purchaseAiBusy,
    setPurchaseAiBusy,
    purchaseAiError,
    setPurchaseAiError,
    duplicatePurchase,
    setDuplicatePurchase,
    purchaseRequest,
    purchaseNotice,
    setPurchaseNotice,
    purchaseChecks,
    purchaseKeyReady,
    purchaseKey,
    startQrScan,
    fillPurchaseWithAi,
    formatsUnavailable,
    setFormatsUnavailable,
    discountOverride,
    setDiscountOverride,
    registeredSupplier,
    discountText,
    discountPercent,
    discountValid,
    effectiveDiscount,
    supplierHint,
    canRememberDiscount,
    supplierSaving,
    setSupplierSaving,
    supplierNotice,
    setSupplierNotice,
    rememberDiscount,
    landedOverride,
    setLandedOverride,
    internalTaxes,
    vatDiscriminated,
    landedDefault,
    landed,
    internalShares,
    finalCostAt,
    finalCostNote,
    importInProgress,
    sortedProducts,
    localCategories,
    setLocalCategories,
    rateLimitCountdown,
    setRateLimitCountdown,
    countdownTimerRef,
    clearRateLimitTimer,
    startRateLimitCountdown,
    handleParse,
    rememberInvoiceFormat,
    savePurchase,
    handleImport,
    toggleExpand,
    updateItem,
    addManualItem,
    catalogQuery,
    catalogKey,
    searchInvoiceCatalog,
    useCatalogCandidate,
    selectProduct,
    confirmMapping,
    confirmSureLinks,
    changeProvider,
    handleUpdatePackUnits,
    handleSetAllUnmatchedAction,
    handleApplyMarginToNew,
    handleSetDefaultCategoryForNew,
    matchedCount,
    newCount,
    skippedCount,
    unmatchedTotal,
    totalToImport,
    pendingCount,
    sureCount,
    confirmSureButton,
    filteredItems,
    processFile,
    handleFileUpload,
    handleDrop,
    STEP_LABELS,
    STEP_KEYS,
    stepIdx,
  };
}

export type InvoiceAnalyzerState = ReturnType<typeof useInvoiceAnalyzer>;
