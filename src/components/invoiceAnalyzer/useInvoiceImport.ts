import { askConfirm } from '../ConfirmHost';
import { useCallback } from 'react';
import { purchaseInvoicePayload } from '../../services/purchaseInvoiceService';
import { retail, errorMessage } from '../../features/retail/api';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { invoiceCostIncrease, type InvoiceCostChange } from '../../services/invoicePricingService';
import { findRegisteredSupplier } from '../../services/supplierDiscountService';
import { formatCuit } from '../../services/supplierInvoiceRules';
import { findInvoiceFormat, learnInvoiceFormat, sameInvoiceFormat } from '../../services/invoiceFormatService';
import { defaultProductCategory } from '../../services/productCategoryService';
import { type InvoiceItem, isInvoiceProductCode, type InvoiceAnalyzerProps, guessProductEmoji } from '../invoiceAnalyzerHelpers';
import type { useInvoiceInputState } from './useInvoiceInputState';
import type { useInvoiceCosts } from './useInvoiceCosts';
import type { useInvoiceParse } from './useInvoiceParse';

/** Importación: reposición, productos nuevos, comprobante de compra y formato aprendido. */
export function useInvoiceImport(ctx: InvoiceAnalyzerProps & ReturnType<typeof useInvoiceInputState> & ReturnType<typeof useInvoiceCosts> & ReturnType<typeof useInvoiceParse>) {
  const {
    storeId, stockBranchId, products, onImportDone, onReceived, setStep, items, initialStockBranch,
    providerName, setError, setImportedCount, setCreatedCount, setUpdatedCount, setCostChanges,
    setShowPriceProposal, mounted, revealReviewItem, suppliers, invoiceFormats, setInvoiceFormats,
    readSource, setFormatNotice, purchaseDraft, registerPurchase, duplicatePurchase, purchaseRequest,
    setPurchaseNotice, purchaseChecks, discountValid, finalCostAt, importInProgress, localCategories,
  } = ctx;
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

  return { rememberInvoiceFormat, savePurchase, handleImport };
}
