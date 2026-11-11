import { useMemo } from 'react';
import { extractTextFromFile } from '../../services/invoiceParserService';
import { normalizeSupplierText, saveMapping } from '../../services/supplierMappingService';
import { isSureLink, type InvoiceAnalyzerProps } from '../invoiceAnalyzerHelpers';
import type { useInvoiceInputState } from './useInvoiceInputState';
import type { useInvoiceCosts } from './useInvoiceCosts';
import type { useInvoiceParse } from './useInvoiceParse';
import type { useInvoiceImport } from './useInvoiceImport';
import type { useInvoiceReviewActions } from './useInvoiceReviewActions';

/** Confirmar vínculos, acciones masivas, conteos y filtros de la revisión, y carga del archivo. */
export function useInvoiceReviewSummary(ctx: InvoiceAnalyzerProps & ReturnType<typeof useInvoiceInputState> & ReturnType<typeof useInvoiceCosts> & ReturnType<typeof useInvoiceParse> & ReturnType<typeof useInvoiceImport> & ReturnType<typeof useInvoiceReviewActions>) {
  const {
    storeId, step, setInvoiceText, items, setItems, providerName, setProviderName, setError,
    setIsExtracting, setExtractProgress, setReadingNote, setOriginalText, setFileReadFailed, sourceFile,
    sourceRotation, fileReading, mounted, parsing, extractionCache, setUploadedFile, setIsDragging,
    setShowRawText, searchQuery, filterStatus, setMappingNotice, setMappingRetry, mappingBusy,
    setMappingBusy, mappingInProgress, mappingContext, startQrScan, setDiscountOverride, finalCostAt,
    clearRateLimitTimer,
  } = ctx;
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

  return { confirmMapping, confirmSureLinks, changeProvider, handleUpdatePackUnits, handleSetAllUnmatchedAction, handleApplyMarginToNew, handleSetDefaultCategoryForNew, matchedCount, newCount, skippedCount, unmatchedTotal, totalToImport, pendingCount, sureCount, confirmSureButton, filteredItems, processFile, handleFileUpload, handleDrop, STEP_LABELS, STEP_KEYS, stepIdx };
}
