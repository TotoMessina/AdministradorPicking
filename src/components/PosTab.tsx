import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Barcode,
  X,
  Plus,
  Minus,
  Trash2,
  Banknote,
  QrCode,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Package,
  Check,
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
  Wallet,
} from "lucide-react";
import type {
  KioscoProduct,
  KioscoCartItem,
  PaymentMethod,
  KioscoSale,
} from "../types/kiosco";
import { playScannerBeep, playCashChime } from "../utils/audio";
import { randomUUID } from "../utils/uuid";
import { useToast } from "../context/ToastContext";
import { AiAssistantWidget } from "./AiAssistantWidget";
import { QuickProducts } from '../features/retail/QuickProducts';
import { cents } from '../features/retail/payments';
import { formatPackStock, unitsPerPack } from '../services/inventoryUnits';
import { availableForCart, cartStockError } from '../services/productComposition';
interface Props {
  active?: boolean;
  products: KioscoProduct[];
  cart: KioscoCartItem[];
  setCart: React.Dispatch<React.SetStateAction<KioscoCartItem[]>>;
  onCompleteSale: (sale: KioscoSale) => void | Promise<void>;
  onTriggerChecklist: (key: string) => void;
  onGoToCreateProduct?: () => void;
  isLoading?: boolean;
  storeName?: string;
  onOpenAi?: () => void;
  stationControls?: React.ReactNode;
  saleLedgerLabel?: (method: PaymentMethod) => string;
  storeId?: string;
  branchId?: string;
  canCustomizeQuick?: boolean;
  mobilePosView?: "catalog" | "checkout";
  onMobilePosViewChange?: (view: "catalog" | "checkout") => void;
}
const money = (n: number) =>
  "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
// Los borradores de otras pantallas pueden conservar diálogos montados pero ocultos.
const hasVisibleDialog = () => Array.from(document.querySelectorAll('[role="dialog"]')).some(dialog => dialog.getClientRects().length > 0);
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "Efectivo", label: "Efectivo", icon: Banknote },
  { id: "QR", label: "QR", icon: QrCode },
  { id: "Transferencia", label: "Transferencia", icon: Banknote },
  { id: "Mixto", label: "Mixto", icon: CreditCard },
  { id: "Debito", label: "Débito", icon: CreditCard },
  { id: "Credito", label: "Crédito", icon: CreditCard },
];

function CartQuantityInput({
  item,
  availableStock,
  disabled,
  onUpdateQty,
  onNotify,
}: {
  item: KioscoCartItem;
  availableStock: number;
  disabled?: boolean;
  onUpdateQty: (qty: number) => void;
  onNotify?: (msg: string) => void;
}) {
  const [text, setText] = useState(String(item.qty));
  const isFocused = useRef(false);
  const isManual = item.product.code === "MANUAL";
  const maxStock = isManual ? 999999 : Math.max(1, availableStock);

  useEffect(() => {
    if (!isFocused.current) {
      setText(String(item.qty));
    }
  }, [item.qty]);

  const commitValue = (val: number) => {
    let finalQty = val;
    if (isNaN(finalQty) || finalQty < 1) {
      finalQty = 1;
    } else if (!isManual && finalQty > maxStock) {
      finalQty = maxStock;
      onNotify?.(`Stock máximo disponible para ${item.product.name}: ${maxStock} u.`);
    }
    setText(String(finalQty));
    onUpdateQty(finalQty);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setText("");
      return;
    }
    const num = parseInt(raw, 10);
    if (!isManual && num > maxStock) {
      commitValue(maxStock);
      return;
    }
    setText(raw);
    if (num >= 1) {
      onUpdateQty(num);
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    const num = parseInt(text, 10);
    commitValue(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const num = parseInt(text, 10);
      commitValue(num);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setText(String(item.qty));
      e.currentTarget.blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = parseInt(text, 10) || item.qty;
      commitValue(current + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = parseInt(text, 10) || item.qty;
      commitValue(Math.max(1, current - 1));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      className="cart-qty-input"
      value={text}
      title="Hacé clic para escribir la cantidad con el teclado"
      aria-label={`Cantidad de ${item.product.name}`}
      onFocus={(e) => {
        isFocused.current = true;
        e.currentTarget.select();
      }}
      onChange={handleInputChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

export function PosTab({
  active = true,
  products,
  cart,
  setCart,
  onCompleteSale,
  onTriggerChecklist,
  onGoToCreateProduct,
  isLoading,
  storeName,
  onOpenAi,
  stationControls,
  saleLedgerLabel,
  storeId,
  branchId,
  canCustomizeQuick = false,
  mobilePosView: controlledMobileView,
  onMobilePosViewChange,
}: Props) {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [cash, setCash] = useState("");
  const [splitAmount, setSplitAmount] = useState('');
  const [splitFirst, setSplitFirst] = useState<Exclude<PaymentMethod, 'Mixto'>>('Efectivo');
  const [splitSecond, setSplitSecond] = useState<Exclude<PaymentMethod, 'Mixto'>>('QR');
  const [confirmedPayment, setConfirmedPayment] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [clearPending, setClearPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [internalMobileView, setInternalMobileView] = useState<"catalog" | "checkout">("catalog");
  const mobilePosView = controlledMobileView ?? internalMobileView;
  const setMobilePosView = (view: "catalog" | "checkout") => {
    setInternalMobileView(view);
    onMobilePosViewChange?.(view);
  };
  const [internalAiOpen, setInternalAiOpen] = useState(false);
  const handleOpenAi = onOpenAi || (() => setInternalAiOpen(true));
  const searchRef = useRef<HTMLInputElement>(null);
  const cartItemsRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);
  const prevCartLength = useRef(cart.length);
  const submitting = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const request = useRef({ signature: "", id: "" });
  const total = cents(cart.reduce((sum, i) => sum + i.subtotal, 0)) / 100;
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const received = Number(cash);
  const paymentSignature = JSON.stringify([method, cart, splitAmount, splitFirst, splitSecond]);
  const splitValue = cents(Number(splitAmount)) / 100;
  const splitValid = Number.isFinite(splitValue) && splitValue > 0 && cents(splitValue) < cents(total) && splitFirst !== splitSecond;
  const confirmed = confirmedPayment === paymentSignature;

  useLayoutEffect(() => {
    const isNewItem = cart.length > prevCartLength.current;
    prevCartLength.current = cart.length;

    if ((shouldScrollToBottom.current || isNewItem) && cart.length > 0 && cartItemsRef.current) {
      cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
      const raf = requestAnimationFrame(() => {
        if (cartItemsRef.current) {
          cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
        }
      });
      shouldScrollToBottom.current = false;
      return () => cancelAnimationFrame(raf);
    }
  }, [cart]);

  useEffect(() => {
    if (!active) return;
    const focus = (e: KeyboardEvent) => {
      if (!hasVisibleDialog() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, [active]);
  const add = (p: KioscoProduct) => {
    if (busy || isLoading || !active) return;
    if (p.sellable === false) { notify('warning', 'Este producto es solo un insumo. Elegí el combo para venderlo.'); return; }
    const existing = cart.find((i) => i.product.id === p.id);
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
      notify("warning", `Código o producto no encontrado: ${qTrim}`);
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
        : (!shortcut && !confirmed) || (chosen === 'Mixto' && !splitValid))
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
        else { setMethod('Mixto'); setMobilePosView('checkout'); setTimeout(() => document.getElementById('mixed-amount')?.focus(), 0); }
      } else {
        const chosen = e.key === 'F1' ? 'Efectivo' : e.key === 'F2' ? 'QR' : 'Transferencia';
        if (chosen === 'Efectivo' && cash && received < total) { setMethod(chosen); setMobilePosView('checkout'); document.getElementById('cash-received')?.focus(); }
        void checkout(chosen, true);
      }
    } else if (e.key === 'Escape') { e.preventDefault(); setQuery(''); setManualModalOpen(false); showProducts(); }
    else if (e.key === 'Enter' && ['cash-received', 'mixed-amount'].includes((e.target as HTMLElement)?.id)) { e.preventDefault(); void checkout(method, true); }
  };
  const scanner = useRef({ text: '', at: 0 });
  const scanHandler = useRef<(code: string) => void>(() => {});
  scanHandler.current = code => { const product = products.find(p => p.code === code); if (product) { add(product); setQuery(''); searchRef.current?.focus(); } else notify('warning', `Código no encontrado: ${code}`); };
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
  return (
    <div
      className={`pos-layout ${mobilePosView === "checkout" ? "pos-mobile-checkout-active" : "pos-mobile-catalog-active"}`}
      data-mobile-view={mobilePosView}
    >
      <div className="pos-mobile-view-tabs" role="group" aria-label="Vista de la venta">
        <button
          type="button"
          aria-pressed={mobilePosView === "catalog"}
          className={`pos-mobile-tab-btn ${mobilePosView === "catalog" ? "active" : ""}`}
          onClick={showProducts}
        >
          <Package size={15} />
          <span>Productos</span>
        </button>
        <button
          type="button"
          aria-pressed={mobilePosView === "checkout"}
          className={`pos-mobile-tab-btn ${mobilePosView === "checkout" ? "active" : ""}`}
          onClick={showSale}
        >
          <ShoppingBag size={15} />
          <span>Venta {count > 0 && <span className="pos-mobile-tab-badge">{count}</span>}<small>{money(total)}</small></span>
        </button>
      </div>
      <section className="catalog" aria-label="Botonera de venta">
        <form className="search-box" onSubmit={search}>
          <Search size={21} />
          <input
            ref={searchRef}
            aria-label="Buscar producto o escanear código"
            placeholder="Buscá un producto o escaneá su código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          ) : null}
          <Barcode size={22} />
        </form>

        {query.trim() ? (
          <div className="pos-search-results" aria-label="Resultados de búsqueda">
            <div className="pos-search-results-header">
              <span>Resultados para "{query.trim()}" ({searchMatches.length})</span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                Cerrar búsqueda
              </button>
            </div>
            {searchMatches.length === 0 ? (
              <div className="empty-state">
                <Search size={28} />
                <p>No encontramos productos con ese nombre o código.</p>
              </div>
            ) : (
              <div className="pos-search-grid">
                {searchMatches.slice(0, 16).map((p) => {
                  const qty = cart.find((i) => i.product.id === p.id)?.qty || 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={busy || availableForCart(p, cart, products) <= qty}
                      className={`pos-search-item ${qty ? "in-cart" : ""}`}
                      onClick={() => {
                        add(p);
                        setQuery("");
                      }}
                      aria-label={`Agregar ${p.name}, ${money(p.price)}`}
                    >
                      <span className="pos-search-emoji">{p.emoji || "📦"}</span>
                      <div className="pos-search-info">
                        <strong>{p.name}</strong>
                        <small>{p.category} · {unitsPerPack(p.pack_size) > 1 ? formatPackStock(p.stock, p.pack_size) : p.stock <= 0 ? "Sin stock" : `${p.stock} disp.`}</small>
                      </div>
                      <strong className="pos-search-price">{money(p.price)}</strong>
                      <span className="add-product"><Plus size={16} /></span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {storeId && branchId && (
          <QuickProducts
            storeId={storeId}
            branchId={branchId}
            products={products}
            manager={canCustomizeQuick}
            onAdd={add}
            onOpenManual={() => setManualModalOpen(true)}
            disabled={busy || !!isLoading}
          />
        )}
      </section>
      <aside id="pos-sale-panel" className="sale-panel" aria-label="Venta actual" tabIndex={-1}>
        <div className="pos-mobile-checkout-header">
          <button
            type="button"
            className="pos-mobile-back-btn"
            onClick={showProducts}
            aria-label="Volver a productos"
          >
            <ArrowLeft size={16} />
            <span>Productos</span>
          </button>
          <div className="pos-mobile-checkout-title">
            <h2>Carrito</h2>
            <span className="pos-mobile-item-badge">
              {count} {count === 1 ? "ítem" : "ítems"}
            </span>
          </div>
          <button
            className="icon-button pos-mobile-clear-btn"
            aria-label="Vaciar venta"
            title="Vaciar venta"
            disabled={!cart.length || busy}
            onClick={() => setClearPending(!clearPending)}
          >
            <Trash2 size={17} />
          </button>
        </div>
        <section className="sale-cart" aria-label="Carrito de la venta">
        {stationControls && <div className="pos-cart-top-bar">{stationControls}</div>}
        <div className="sale-header">
          <div>
            <h2>
              Carrito <span>{count}</span>
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Vaciar venta"
            title="Vaciar venta"
            disabled={!cart.length || busy}
            onClick={() => setClearPending(!clearPending)}
          >
            <Trash2 size={18} />
          </button>
        </div>
        {clearPending && (
          <div className="clear-confirm" role="alert">
            <span>¿Quitar todos los productos?</span>
            <button
              onClick={() => {
                setCart([]);
                setCash("");
                setClearPending(false);
                setMobilePosView("catalog");
              }}
            >
              Sí, vaciar
            </button>
            <button onClick={() => setClearPending(false)}>Cancelar</button>
          </div>
        )}
        <div className="cart-items" ref={cartItemsRef}>
          {!cart.length ? (
            <div className="cart-empty">
              <span className="empty-icon">
                <ShoppingBag size={30} />
              </span>
              <h3>Tu carrito está vacío</h3>
              <p>
                Elegí un producto o escaneá su código para armar la venta.
              </p>
              <button
                type="button"
                className="secondary-button pos-empty-back-btn"
                onClick={showProducts}
              >
                <ArrowLeft size={15} />
                <span>Ir a productos</span>
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={item.product.id}>
                <div className="cart-item-top">
                  <strong>{item.product.name}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Quitar ${item.product.name}`}
                    disabled={busy}
                    onClick={() => {
                      shouldScrollToBottom.current = false;
                      setCart((prev) =>
                        prev.filter((i) => i.product.id !== item.product.id),
                      );
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="cart-item-bottom">
                  <div className="quantity-control">
                    <button
                      disabled={busy}
                      aria-label={`Restar una unidad de ${item.product.name}`}
                      onClick={() => {
                        shouldScrollToBottom.current = false;
                        setCart((prev) =>
                          prev.flatMap((i) =>
                            i.product.id !== item.product.id
                              ? [i]
                              : i.qty === 1
                                ? []
                                : [
                                    {
                                      ...i,
                                      qty: i.qty - 1,
                                      subtotal: (i.qty - 1) * i.product.price,
                                    },
                                  ],
                          ),
                        );
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <CartQuantityInput
                      item={item}
                      availableStock={availableForCart(item.product, cart, products)}
                      disabled={busy}
                      onUpdateQty={(qty) => updateItemQty(item.product.id, qty)}
                      onNotify={(msg) => notify("warning", msg)}
                    />
                    <button
                      disabled={
                        busy ||
                        (item.product.code !== "MANUAL" &&
                          item.qty >= availableForCart(item.product, cart, products))
                      }
                      aria-label={`Sumar una unidad de ${item.product.name}`}
                      onClick={() => add(item.product)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <small>{money(item.product.price)} c/u</small>
                  <strong>{money(item.subtotal)}</strong>
                </div>
              </div>
            ))
          )}
        </div>
        </section>
        <section className="checkout" aria-label="Total y cobro">
          <div className="total-line">
            <span>
              Total a cobrar
              <small>
                {count} {count === 1 ? "unidad" : "unidades"}
              </small>
            </span>
            <strong>{money(total)}</strong>
          </div>
          <fieldset disabled={busy || !cart.length}>
            <legend>¿Cómo te pagan?</legend>
            <div className="payment-methods">
              {methods.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={method === id}
                  className={method === id ? "selected" : ""}
                  onClick={() => setMethod(id)}
                >
                  <Icon size={19} />
                  {label}
                </button>
              ))}
            </div>
            {method === 'Mixto' && <div className="mixed-payment">
              <label>Primer medio<select value={splitFirst} onChange={e => { const next = e.target.value as typeof splitFirst; if (next === splitSecond) setSplitSecond(splitFirst); setSplitFirst(next); }}>{methods.filter(m => m.id !== 'Mixto').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
              <label>Importe del primer medio<input id="mixed-amount" type="number" min="0.01" step="0.01" value={splitAmount} onChange={e => setSplitAmount(e.target.value)} /></label>
              <label>Resto del pago<select value={splitSecond} onChange={e => setSplitSecond(e.target.value as typeof splitSecond)}>{methods.filter(m => m.id !== 'Mixto' && m.id !== splitFirst).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
              <strong>Restante: {money(Math.max(0, (cents(total) - cents(splitValue || 0)) / 100))}</strong>
              <small>Ingresá lo recibido por el primer medio. Enter o F4 confirma ambos pagos. El importe debe ser menor al total.</small>
            </div>}
            {method === "Efectivo" ? (
              <>
                <label className="cash-label" htmlFor="cash-received">
                  Recibís en efectivo
                  <button
                    type="button"
                    className="text-button"
                    disabled={!total}
                    onClick={() => setCash(String(total))}
                  >
                    Monto exacto
                  </button>
                </label>
                <div className="cash-input">
                  <span>$</span>
                  <input
                    id="cash-received"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                  />
                </div>
                <div className="quick-bills">
                  {[...new Set([500, 1000, 5000, 10000].map(step => Math.ceil((total + 0.01) / step) * step))].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setCash(String(n))}
                    >
                      {money(n)}
                    </button>
                  ))}
                </div>
                <div
                  className={`change-line ${total > 0 && received >= total ? "ready" : ""}`}
                  aria-live="polite"
                >
                  <span>
                    {cash && received < total
                      ? "Falta recibir"
                      : "Vuelto a entregar"}
                  </span>
                  <strong>
                    {money(
                      cash && received < total
                        ? total - received
                        : Math.max(0, received - total),
                    )}
                  </strong>
                </div>
              </>
            ) : (
              <label className="payment-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) =>
                    setConfirmedPayment(
                      e.target.checked ? paymentSignature : "",
                    )
                  }
                />
                <span>
                  Confirmé el pago de {money(total)} en{" "}
                  {method === "QR"
                    ? "la billetera virtual"
                    : method === 'Transferencia' ? 'la cuenta bancaria' : method === 'Mixto' ? 'ambos medios' : "la terminal de tarjetas"}
                  .<small>Esta web registra el pago; no lo procesa.</small>
                </span>
              </label>
            )}
          </fieldset>
          {checkoutError && <div role="alert" className="error-banner checkout-error"><AlertCircle size={18} /><span>{checkoutError}</span></div>}
          {saleLedgerLabel && (
            <div className="checkout-ledger-target">
              <Wallet size={13} className="checkout-ledger-icon" aria-hidden="true" />
              <span>
                Se guardará en: <strong>{saleLedgerLabel(method)}</strong>
              </span>
            </div>
          )}
          <button
            className="primary-button checkout-button"
            disabled={
              busy || isLoading ||
              !cart.length ||
              total <= 0 ||
              (method === "Efectivo"
                ? !Number.isFinite(received) || received < total
                : !confirmed || (method === 'Mixto' && !splitValid))
            }
            onClick={() => void checkout()}
          >
            {busy ? (
              "Registrando venta…"
            ) : (
              <>
                <Check size={19} /> Cobrar {money(total)}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          {cart.length > 0 && (
            <p className="checkout-hint">
              {method === "Efectivo" && received < total
                ? "Ingresá cuánto recibiste para continuar"
                : method !== 'Efectivo' && !confirmed
                  ? 'Confirmá el pago recibido para habilitar el cobro'
                  : "Al cobrar, se genera el ticket de la venta"}
            </p>
          )}
        </section>
      </aside>
      {cart.length > 0 && (
        <aside className="mobile-cart-bar" aria-label="Resumen móvil de venta">
          <div className="mobile-cart-bar-info">
            <span className="mobile-cart-bar-qty">
              {count} {count === 1 ? "ítem" : "ítems"}
            </span>
            <strong className="mobile-cart-bar-total" key={total}>{money(total)}</strong>
          </div>
          <button
            type="button"
            className="primary-button mobile-cart-bar-btn"
            onClick={showSale}
          >
            <span>Ver venta</span>
            <ArrowRight size={15} />
          </button>
        </aside>
      )}
      {manualModalOpen && (
        <div
          className="receipt-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 5000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setManualModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-modal-title"
            tabIndex={-1}
            className="manual-amount-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="manual-modal-header">
              <div className="manual-modal-icon">
                <Plus size={20} />
              </div>
              <div className="manual-modal-titles">
                <h3 id="manual-modal-title">Agregar importe manual</h3>
                <small>Para productos o servicios que no están en el catálogo</small>
              </div>
              <button
                type="button"
                className="icon-button manual-modal-close"
                aria-label="Cerrar ventana"
                onClick={() => setManualModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="manual-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (busy || isLoading || !active) return;
                const value = Number(manualAmount);
                if (!Number.isFinite(value) || value <= 0) return;
                add({
                  id: randomUUID(),
                  code: "MANUAL",
                  name: manualDescription.trim() || "Venta manual",
                  price: value,
                  category: "Varios",
                  stock: 999,
                  minStock: 0,
                  emoji: "🏷️",
                });
                setManualAmount("");
                setManualDescription("");
                setManualModalOpen(false);
              }}
            >
              <div className="manual-modal-field">
                <label htmlFor="manual-amount-input">
                  Importe a cobrar ($)
                </label>
                <div className="manual-amount-input-wrapper">
                  <span className="manual-currency-symbol">$</span>
                  <input
                    id="manual-amount-input"
                    autoFocus
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="0.00"
                    className="manual-amount-input"
                  />
                </div>
              </div>

              <div className="manual-modal-field">
                <label htmlFor="manual-description-input">
                  Descripción <small>(opcional)</small>
                </label>
                <input
                  id="manual-description-input"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Ej. Fotocopia, golosinas, servicio..."
                  className="manual-description-input"
                />
              </div>

              <div className="manual-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setManualModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!manualAmount || Number(manualAmount) <= 0 || busy || isLoading}
                >
                  <Plus size={16} />
                  <span>Agregar a la venta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {!onOpenAi && (
        <AiAssistantWidget
          storeName={storeName}
          currentTab="pos"
          products={products}
          cart={cart}
          total={total}
          paymentMethod={method}
          isOpen={internalAiOpen}
          onToggle={setInternalAiOpen}
        />
      )}
    </div>
  );
}
