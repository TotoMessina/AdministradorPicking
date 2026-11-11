import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Category } from '../../features/retail/api';
import { defaultLandedSettings, hasDiscriminatedVat, internalTaxPerUnit, landedUnitCost, vatRate, type LandedCostSettings } from '../../services/landedCostService';
import { retail, errorMessage } from '../../features/retail/api';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { applySupplierDiscount, findRegisteredSupplier, validDiscount } from '../../services/supplierDiscountService';
import { findInvoiceFormat } from '../../services/invoiceFormatService';
import type { InvoiceAnalyzerProps } from '../invoiceAnalyzerHelpers';
import type { useInvoiceInputState } from './useInvoiceInputState';

/** Descuento del proveedor, costo final por renglón, rubros y espera por límite de la IA. */
export function useInvoiceCosts(ctx: InvoiceAnalyzerProps & ReturnType<typeof useInvoiceInputState>) {
  const {
    storeId, products, categories, storeCondition, invoiceText, items, setItems, providerName, setError,
    mounted, suppliers, setSuppliers, invoiceFormats, purchaseDraft,
  } = ctx;
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

  return { discountOverride, setDiscountOverride, registeredSupplier, discountText, discountPercent, discountValid, effectiveDiscount, supplierHint, canRememberDiscount, supplierSaving, setSupplierSaving, supplierNotice, setSupplierNotice, rememberDiscount, landedOverride, setLandedOverride, internalTaxes, vatDiscriminated, landedDefault, landed, internalShares, finalCostAt, finalCostNote, importInProgress, sortedProducts, localCategories, setLocalCategories, rateLimitCountdown, setRateLimitCountdown, countdownTimerRef, clearRateLimitTimer, startRateLimitCountdown };
}
