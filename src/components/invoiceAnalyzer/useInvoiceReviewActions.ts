import { findInvoiceCatalogCandidates } from '../../services/invoiceCatalogService';
import { unitsPerPack as configuredPackSize } from '../../services/inventoryUnits';
import { defaultProductCategory } from '../../services/productCategoryService';
import { type InvoiceItem, isRealBarcode, type InvoiceAnalyzerProps, detectPackUnits, resolveCategory } from '../invoiceAnalyzerHelpers';
import type { useInvoiceInputState } from './useInvoiceInputState';
import type { useInvoiceCosts } from './useInvoiceCosts';
import type { useInvoiceParse } from './useInvoiceParse';
import type { useInvoiceImport } from './useInvoiceImport';

/** Acciones de la revisión: editar renglones y buscar o elegir productos del catálogo. */
export function useInvoiceReviewActions(ctx: InvoiceAnalyzerProps & ReturnType<typeof useInvoiceInputState> & ReturnType<typeof useInvoiceCosts> & ReturnType<typeof useInvoiceParse> & ReturnType<typeof useInvoiceImport>) {
  const {
    setStep, items, setItems, latestItems, catalogController, catalogSuggestions, setCatalogSuggestions,
    setError, setExpandedItems, mounted, revealReviewItem, sortedProducts, localCategories,
  } = ctx;
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

  return { toggleExpand, updateItem, addManualItem, catalogQuery, catalogKey, searchInvoiceCatalog, useCatalogCandidate, selectProduct };
}
