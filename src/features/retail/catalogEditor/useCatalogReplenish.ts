import { useState, useEffect, useRef } from 'react';
import { stockForSale } from '../../../services/productComposition';
import { errorMessage } from '../api';
import { unitsPerPack } from '../../../services/inventoryUnits';
import { replenishmentService, type StockReplenishment, type CsvParseResult } from '../../../services/replenishmentService';
import type { Product } from '../api';
import { retail } from '../api';
import { randomUUID } from '../../../utils/uuid';
import type { CatalogEditorProps } from './catalogEditorProps';
import type { useCatalogEditorState } from './useCatalogEditorState';
import type { useCatalogBulkPrice } from './useCatalogBulkPrice';

/** Reposición de stock: de a un producto, por CSV e historial. */
export function useCatalogReplenish(ctx: CatalogEditorProps & ReturnType<typeof useCatalogEditorState> & ReturnType<typeof useCatalogBulkPrice>) {
  const {
    store, products, run, busy, active, stockBranchId, operationBranch, canEditCatalog, canRestock,
    catalogSearch, restockRequest,
  } = ctx;
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

  return { replenishTarget, setReplenishTarget, replenishDialog, replenishTrigger, replenishQty, setReplenishQty, replenishBy, setReplenishBy, replenishmentPackSize, replenishmentDisplaySize, replenishSize, replenishByPack, replenishmentUnits, replenishCost, setReplenishCost, changeReplenishBy, replenishSupplier, setReplenishSupplier, replenishNotes, setReplenishNotes, replenishTask, setReplenishTask, receiveInDepot, setReceiveInDepot, replenishError, setReplenishError, replenishDepotMode, setReplenishDepotMode, replenishBranchMode, setReplenishBranchMode, replenishSaving, depotModeChanged, receiving, replenishCurrent, movingLimit, closeReplenish, isCsvModalOpen, setIsCsvModalOpen, csvStockBranch, setCsvStockBranch, openCsv, csvParseResult, setCsvParseResult, csvFileName, setCsvFileName, csvSupplier, setCsvSupplier, csvNotes, setCsvNotes, isProcessingCsv, setIsProcessingCsv, isHistoryModalOpen, setIsHistoryModalOpen, historyList, setHistoryList, expandedRecordId, setExpandedRecordId, startReplenish, handleConfirmUnitaryReplenish, handleDownloadCsv, handleCsvFileInput, handleConfirmBulkCsvReplenish, openHistoryModal };
}
