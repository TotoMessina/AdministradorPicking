import { askConfirm } from '../../../components/ConfirmHost';
import { markupFromPrice, priceFromMarkup } from '../../../services/productSalePrice';
import { useMemo } from 'react';
import type { Product } from '../api';
import { retail } from '../api';
import type { CatalogEditorProps } from './catalogEditorProps';
import type { useCatalogEditorState } from './useCatalogEditorState';

/** Ajuste de precios en bloque: filtros, vista previa y aplicación. */
export function useCatalogBulkPrice(ctx: CatalogEditorProps & ReturnType<typeof useCatalogEditorState>) {
  const {
    store, products, run, allSales, notify, setIsBulkPriceModalOpen, bulkFilterCategory, bulkFilterBrand,
    bulkFilterSupplier, bulkFilterSelectedTags, bulkAdjustMode, bulkAdjustValue, bulkRoundMultiple,
    costBulk, bulkMarkupMode, bulkMarkupValue, bulkRounding, setBulkIsUpdating, setBulkProgress,
  } = ctx;
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

  return { availableCatalogTags, bulkMatchedProducts, bulkPlan, calculateNewPrice, salesCountMap, currentEstRevenue, newEstRevenue, bulkPlans, bulkApplicable, bulkNoCost, bulkToCost, handleApplyBulkMarkup, handleApplyBulkPriceChanges };
}
