import React, { useEffect, useMemo, useRef } from 'react';
import type { KioscoProduct, PaymentMethod, KioscoSale } from '../../types/kiosco';
import { playScannerBeep, playCashChime } from '../../utils/audio';
import { randomUUID } from '../../utils/uuid';
import { cents } from '../../features/retail/payments';
import { availableForCart, cartStockError } from '../../services/productComposition';
import { money, hasVisibleDialog, normalize } from './posHelpers';
import type { posTabProps } from './usePosTab';
import type { usePosState } from './usePosState';

/** Acciones: agregar productos, buscar, cobrar, atajos de teclado y lector de códigos. */
export function usePosActions(ctx: ReturnType<typeof posTabProps> & ReturnType<typeof usePosState>) {
  const {
    active, products, cart, setCart, onCompleteSale, onTriggerChecklist, isLoading, notify, query,
    setQuery, method, setMethod, cash, setCash, setSplitAmount, splitFirst, splitSecond,
    setConfirmedPayment, busy, setBusy, setManualModalOpen, setClearPending, setCheckoutError,
    setMobilePosView, searchRef, cartItemsRef, shouldScrollToBottom, submitting, activeRef, request,
    total, received, splitValue, splitValid, confirmed, setCreditCustomerId, setCreditQuery,
    setCreditOverOk, paymentOpen, setPaymentOpen, creditCustomer, creditOverLimit, creditReady,
  } = ctx;
  const add = (p: KioscoProduct) => {
    if (busy || isLoading || !active) return;
    if (p.pricingError) { notify('warning', `${p.name}: ${p.pricingError}`); return; }
    if (p.sellable === false) { notify('warning', 'Este producto es solo un insumo. Elegí el combo para venderlo.'); return; }
    const existing = cart.find((i) => i.product.id === p.id);
    if (existing && existing.product.price !== p.price) { notify('warning', 'Cambió el precio de este producto. Revisá el carrito antes de agregar más unidades.'); return; }
    if (p.code !== "MANUAL" && (existing?.qty || 0) >= availableForCart(p, cart, products)) {
      notify("warning", "No alcanza el stock compartido para agregar otra unidad. Revisá los productos y combos del carrito.");
      return;
    }
    shouldScrollToBottom.current = true;
    setCart((prev) => {
      if (p.code !== 'MANUAL' && (prev.find(i => i.product.id === p.id)?.qty || 0) >= availableForCart(p, prev, products)) return prev;
      const found = prev.find((i) => i.product.id === p.id);
      if (found) {
        const updated = { ...found, qty: found.qty + 1, subtotal: (found.qty + 1) * p.price };
        return [...prev.filter((i) => i.product.id !== p.id), updated];
      }
      return [...prev, { product: p, qty: 1, subtotal: p.price }];
    });
    setClearPending(false);
    playScannerBeep();
    onTriggerChecklist("scanner");
  };
  const updateItemQty = (productId: string, newQty: number) => {
    const product = cart.find(item => item.product.id === productId)?.product;
    if (!product || newQty > availableForCart(product, cart, products)) {
      notify('warning', 'No alcanza el stock compartido. Revisá las cantidades del carrito.');
      return;
    }
    shouldScrollToBottom.current = false;
    setCart((prev) =>
      newQty > availableForCart(product, prev, products) ? prev : prev.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              qty: newQty,
              subtotal: newQty * i.product.price,
            }
          : i,
      ),
    );
  };
  const searchMatches = useMemo(() => {
    const qTrim = query.trim();
    if (!qTrim) return [];
    const qNorm = normalize(qTrim);
    return products.filter(
      (p) => p.sellable !== false && (p.code.includes(qTrim) || normalize(p.name).includes(qNorm))
    );
  }, [products, query]);
  // El código del display o el DUN del bulto no se venden: se avisa qué producto es para escanear la unidad.
  const presentationHint = (code: string) => {
    const product = products.find(p => p.display_code === code || p.pack_code === code);
    return product ? `${code} es el código del ${product.display_code === code ? 'display' : 'bulto'} de ${product.name}. Para vender, escaneá la unidad.` : '';
  };
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const qTrim = query.trim();
    if (!qTrim) return;
    const exact = products.find((p) => p.sellable !== false && p.code === qTrim);
    const match = exact || (searchMatches.length === 1 ? searchMatches[0] : undefined);
    if (match) {
      add(match);
      setQuery("");
    } else if (searchMatches.length > 0) {
      notify("info", "Elegí un producto de los resultados para agregarlo.");
    } else {
      const pending = products.find((p) => p.price_pending && p.code === qTrim);
      notify("warning", pending ? `${pending.name} todavía no tiene precio. Cargalo en Productos para venderlo.` : presentationHint(qTrim) || `Código o producto no encontrado: ${qTrim}`);
    }
  };
  const checkout = async (chosen: PaymentMethod = method, shortcut = false) => {
    const tendered = shortcut && chosen === 'Efectivo' && !cash ? total : received;
    if (
      !active || isLoading || submitting.current ||
      !cart.length ||
      total <= 0 ||
      (chosen === "Efectivo"
        ? !Number.isFinite(tendered) || tendered < total
        : chosen === 'Fiado' ? !creditReady : (!shortcut && !confirmed) || (chosen === 'Mixto' && !splitValid) || (chosen === 'Mixto' && splitSecond === 'Fiado' && !creditReady))
    )
      return;
    const stockError = cartStockError(cart, products);
    if (stockError) { setCheckoutError(stockError); return; }
    submitting.current = true;
    setBusy(true);
    setCheckoutError('');
    setMethod(chosen);
    const payments = chosen === 'Mixto' ? [{ method: splitFirst, amount: splitValue }, { method: splitSecond, amount: (cents(total) - cents(splitValue)) / 100 }] : [{ method: chosen, amount: cents(total) / 100 }];
    const signature = JSON.stringify([cart, chosen, tendered, payments]);
    if (request.current.signature !== signature)
      request.current = { signature, id: randomUUID() };
    const sale: KioscoSale = {
      id: request.current.id,
      ticketNumber: `T-${Date.now().toString().slice(-8)}`,
      items: cart.map((i) => ({
        productId: i.product.code === "MANUAL" ? null : i.product.id,
        name: i.product.name,
        qty: i.qty,
        unitPrice: i.product.price,
        subtotal: i.subtotal,
        marginGroup: i.product.margin_group ?? 'standard',
        unitCost: i.product.cost && i.product.cost > 0 ? i.product.cost : null,
        stockComponents: i.product.stock_components?.map(component => ({ ...component })) || [],
      })),
      total,
      paymentMethod: chosen,
      payments,
      ...((chosen === 'Fiado' || (chosen === 'Mixto' && splitSecond === 'Fiado')) && creditCustomer ? { customerId: creditCustomer.id, customerName: creditCustomer.name, creditOverLimit }
        : creditCustomer ? { invoiceCustomerId: creditCustomer.id } : {}),
      amountPaid: chosen === "Efectivo" ? tendered : total,
      change: chosen === "Efectivo" ? (cents(tendered) - cents(total)) / 100 : 0,
      timestamp: new Date().toLocaleTimeString("es-AR"),
      date: new Date().toLocaleDateString("es-AR"),
    };
    try {
      await onCompleteSale(sale);
      setCart([]);
      request.current = { signature: "", id: "" };
      setCash("");
      setSplitAmount('');
      setConfirmedPayment("");
      setCreditCustomerId(''); setCreditQuery(''); setCreditOverOk(false);
      setPaymentOpen(false);
      setClearPending(false);
      setMobilePosView("catalog");
      playCashChime();
      onTriggerChecklist("ticket");
      onTriggerChecklist("stock");
      onTriggerChecklist(method === "QR" ? "qr" : "vuelto");
      notify("success", `Venta de ${money(total)} registrada.`);
      if (activeRef.current) searchRef.current?.focus();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'No se pudo registrar la venta. Tus productos siguen en el carrito.');
      notify(
        "error",
        error instanceof Error
          ? error.message
          : "No se pudo registrar la venta. Tu pedido sigue disponible.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const showProducts = () => {
    setMobilePosView('catalog');
    requestAnimationFrame(() => { if (activeRef.current) searchRef.current?.focus(); });
  };
  const showSale = () => {
    setMobilePosView('checkout');
    requestAnimationFrame(() => {
      if (!activeRef.current) return;
      if (cartItemsRef.current) {
        cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
      }
      const panel = document.getElementById('pos-sale-panel');
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  };
  const keyboard = useRef<(event: KeyboardEvent) => void>(() => {});
  keyboard.current = e => {
    if (e.defaultPrevented || e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey || submitting.current || busy || isLoading || hasVisibleDialog()) return;
    if (['F1', 'F2', 'F3', 'F4'].includes(e.key)) {
      e.preventDefault();
      if (!cart.length) { searchRef.current?.focus(); return; }
      if (e.key === 'F4') {
        if (method === 'Mixto' && splitValid) void checkout('Mixto', true);
        else { setMethod('Mixto'); setPaymentOpen(true); }
      } else {
        const chosen = e.key === 'F1' ? 'Efectivo' : e.key === 'F2' ? 'QR' : 'Transferencia';
        if (chosen === 'Efectivo' && cash && received < total) { setMethod(chosen); setPaymentOpen(true); }
        void checkout(chosen, true);
      }
    } else if (e.key === 'Escape' && paymentOpen) { e.preventDefault(); setPaymentOpen(false); }
    else if (e.key === 'Escape') { e.preventDefault(); setQuery(''); setManualModalOpen(false); showProducts(); }
    else if (e.key === 'Enter' && ['cash-received', 'mixed-amount'].includes((e.target as HTMLElement)?.id)) { e.preventDefault(); void checkout(method, true); }
  };
  const scanner = useRef({ text: '', at: 0 });
  const scanHandler = useRef<(code: string) => void>(() => {});
  scanHandler.current = code => { const product = products.find(p => p.code === code); if (product) { add(product); setQuery(''); searchRef.current?.focus(); } else notify('warning', presentationHint(code) || `Código no encontrado: ${code}`); };
  useEffect(() => {
    scanner.current.text = '';
    if (!active) return;
    searchRef.current?.focus();
    const keydown = (e: KeyboardEvent) => {
      keyboard.current(e);
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.isComposing || hasVisibleDialog()) return;
      const target = e.target as HTMLElement;
      if (target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const elapsed = performance.now() - scanner.current.at;
      if (e.key === 'Enter' && scanner.current.text.length >= 3 && elapsed < 100) { e.preventDefault(); scanHandler.current(scanner.current.text); scanner.current.text = ''; }
      else if (e.key.length === 1) { scanner.current.text = (elapsed < 100 ? scanner.current.text : '') + e.key; scanner.current.at = performance.now(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [active]);
  return { add, updateItemQty, searchMatches, presentationHint, search, checkout, showProducts, showSale, keyboard, scanner, scanHandler };
}
