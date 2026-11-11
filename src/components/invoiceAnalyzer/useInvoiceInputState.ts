import type { InvoiceReviewAttention } from '../InvoiceReviewTable';
import type { InvoiceCatalogCandidate } from '../../services/invoiceCatalogService';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { prepareInvoiceExtractionText, type ExtractedInvoice } from '../../services/invoiceExtractionService';
import { cleanInvoiceOcrText } from '../../services/invoiceParserService';
import type { Supplier, PurchaseInvoice } from '../../features/retail/api';
import type { QrStatus } from '../PurchaseInvoicePanel';
import { checkPurchaseInvoice, draftFromQr, emptyPurchaseDraft, fillAmountsWithAi, scanArcaQr, type ArcaQrData, type PurchaseInvoiceDraft } from '../../services/purchaseInvoiceService';
import { cuitDigits } from '../../services/supplierInvoiceRules';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage } from '../../features/retail/api';
import { migrateLocalMappings } from '../../services/supplierMappingService';
import type { InvoiceCostChange } from '../../services/invoicePricingService';
import type { StoredInvoiceFormat } from '../../services/invoiceFormatService';
import type { InvoiceItem, InvoiceAnalyzerProps } from '../invoiceAnalyzerHelpers';

/** Estado del analizador: texto, renglones, archivo, revisión, proveedor y comprobante de compra. */
export function useInvoiceInputState(props: InvoiceAnalyzerProps) {
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
  return { storeId, stockBranchId, stockBranchName, products, categories, onClose, onImportDone, onPricesUpdated, onReceived, catalogBusy, storeCuit, storeCondition, storeNames, step, setStep, invoiceText, setInvoiceText, extractionText, items, setItems, initialStockBranch, setInitialStockBranch, latestItems, catalogController, catalogSuggestions, setCatalogSuggestions, providerName, setProviderName, supplierOverride, setSupplierOverride, invoiceDate, setInvoiceDate, error, setError, importedCount, setImportedCount, createdCount, setCreatedCount, updatedCount, setUpdatedCount, costChanges, setCostChanges, showPriceProposal, setShowPriceProposal, pricesBusy, setPricesBusy, expandedItems, setExpandedItems, isExtracting, setIsExtracting, extractProgress, setExtractProgress, readingNote, setReadingNote, originalText, setOriginalText, fileReadFailed, setFileReadFailed, sourceFile, sourceRotation, fileReading, mounted, parseController, parsing, extractionCache, uploadedFile, setUploadedFile, isDragging, setIsDragging, showRawText, setShowRawText, fileInputRef, textInputRef, searchQuery, setSearchQuery, filterStatus, setFilterStatus, reviewAttention, setReviewAttention, revealReviewItem, isEditingProvider, setIsEditingProvider, productSearch, setProductSearch, linkProgress, setLinkProgress, mappingNotice, setMappingNotice, mappingRetry, setMappingRetry, mappingBusy, setMappingBusy, mappingInProgress, mappingContext, suppliers, setSuppliers, invoiceFormats, setInvoiceFormats, readSource, readWithFormat, setReadWithFormat, formatNotice, setFormatNotice, cuitNotice, setCuitNotice, purchaseDraft, setPurchaseDraft, qrData, setQrData, qrStatus, setQrStatus, qrScan, registerPurchase, setRegisterPurchase, purchaseAiBusy, setPurchaseAiBusy, purchaseAiError, setPurchaseAiError, duplicatePurchase, setDuplicatePurchase, purchaseRequest, purchaseNotice, setPurchaseNotice, purchaseChecks, purchaseKeyReady, purchaseKey, startQrScan, fillPurchaseWithAi, formatsUnavailable, setFormatsUnavailable };
}
