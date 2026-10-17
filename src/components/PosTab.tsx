import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import type {
  KioscoProduct,
  KioscoCartItem,
  PaymentMethod,
  KioscoSale,
} from "../types/kiosco";
import { playScannerBeep, playCashChime } from "../utils/audio";
import { useToast } from "../context/ToastContext";
import { AiAssistantWidget } from "./AiAssistantWidget";
import { QuickProducts } from '../features/retail/QuickProducts';
import { cents } from '../features/retail/payments';
import { formatPackStock, unitsPerPack } from '../services/inventoryUnits';
interface Props {
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
  storeId?: string;
  branchId?: string;
  canCustomizeQuick?: boolean;
  mobilePosView?: "catalog" | "checkout";
  onMobilePosViewChange?: (view: "catalog" | "checkout") => void;
}
const money = (n: number) =>
  "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
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
export function PosTab({
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
  storeId,
  branchId,
  canCustomizeQuick = false,
  mobilePosView: controlledMobileView,
  onMobilePosViewChange,
}: Props) {
  const { notify } = useToast();
  const categories = ["", ...new Set(products.map((p) => p.category))];
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [cash, setCash] = useState("");
  const [splitAmount, setSplitAmount] = useState('');
  const [splitFirst, setSplitFirst] = useState<Exclude<PaymentMethod, 'Mixto'>>('Efectivo');
  const [splitSecond, setSplitSecond] = useState<Exclude<PaymentMethod, 'Mixto'>>('QR');
  const [confirmedPayment, setConfirmedPayment] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [clearPending, setClearPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [hideLowMargin, setHideLowMargin] = useState(false);
  const [internalMobileView, setInternalMobileView] = useState<"catalog" | "checkout">("catalog");
  const mobilePosView = controlledMobileView ?? internalMobileView;
  const setMobilePosView = (view: "catalog" | "checkout") => {
    setInternalMobileView(view);
    onMobilePosViewChange?.(view);
  };
  const [internalAiOpen, setInternalAiOpen] = useState(false);
  const handleOpenAi = onOpenAi || (() => setInternalAiOpen(true));
  const searchRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const request = useRef({ signature: "", id: "" });
  const total = cents(cart.reduce((sum, i) => sum + i.subtotal, 0)) / 100;
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const received = Number(cash);
  const paymentSignature = JSON.stringify([method, cart, splitAmount, splitFirst, splitSecond]);
  const splitValue = cents(Number(splitAmount)) / 100;
  const splitValid = Number.isFinite(splitValue) && splitValue > 0 && cents(splitValue) < cents(total) && splitFirst !== splitSecond;
  const confirmed = confirmedPayment === paymentSignature;
  useEffect(() => {
    const focus = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, []);
  const add = (p: KioscoProduct) => {
    if (busy) return;
    const existing = cart.find((i) => i.product.id === p.id);
    if (p.code !== "MANUAL" && (existing?.qty || 0) >= p.stock) {
      notify("warning", "No quedan más unidades disponibles de este producto.");
      return;
    }
    setCart((prev) => {
      if (p.code !== 'MANUAL' && (prev.find(i => i.product.id === p.id)?.qty || 0) >= p.stock) return prev;
      return prev.some(i => i.product.id === p.id)
        ? prev.map((i) =>
            i.product.id === p.id
              ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * p.price }
              : i,
          )
        : [...prev, { product: p, qty: 1, subtotal: p.price }];
    });
    setClearPending(false);
    playScannerBeep();
    onTriggerChecklist("scanner");
  };
  const filtered = products.filter(
    (p) =>
      (category === "" || p.category === category) &&
      (!availableOnly || p.stock > 0) &&
      (!hideLowMargin || p.margin_group !== 'low_margin') &&
      (normalize(p.name).includes(normalize(query)) ||
        p.code.includes(query.trim())),
  );
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const exact = products.find((p) => p.code === query.trim());
    const match = exact || (filtered.length === 1 ? filtered[0] : undefined);
    if (query.trim() && match) {
      add(match);
      setQuery("");
    } else if (query.trim())
      notify("info", "Elegí un producto de los resultados para agregarlo.");
  };
  const checkout = async (chosen: PaymentMethod = method, shortcut = false) => {
    const tendered = shortcut && chosen === 'Efectivo' && !cash ? total : received;
    if (
      submitting.current ||
      !cart.length ||
      total <= 0 ||
      (chosen === "Efectivo"
        ? !Number.isFinite(tendered) || tendered < total
        : (!shortcut && !confirmed) || (chosen === 'Mixto' && !splitValid))
    )
      return;
    submitting.current = true;
    setBusy(true);
    setCheckoutError('');
    setMethod(chosen);
    const payments = chosen === 'Mixto' ? [{ method: splitFirst, amount: splitValue }, { method: splitSecond, amount: (cents(total) - cents(splitValue)) / 100 }] : [{ method: chosen, amount: cents(total) / 100 }];
    const signature = JSON.stringify([cart, chosen, tendered, payments]);
    if (request.current.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
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
      searchRef.current?.focus();
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
  const keyboard = useRef<(event: KeyboardEvent) => void>(() => {});
  keyboard.current = e => {
    if (e.defaultPrevented || e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey || submitting.current || busy || isLoading || document.querySelector('[role="dialog"]')) return;
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
    } else if (e.key === 'Escape') { e.preventDefault(); setQuery(''); setManual(false); setMobilePosView('catalog'); searchRef.current?.focus(); }
    else if (e.key === 'Enter' && ['cash-received', 'mixed-amount'].includes((e.target as HTMLElement)?.id)) { e.preventDefault(); void checkout(method, true); }
  };
  const scanner = useRef({ text: '', at: 0 });
  const scanHandler = useRef<(code: string) => void>(() => {});
  scanHandler.current = code => { const product = products.find(p => p.code === code); if (product) { add(product); setQuery(''); searchRef.current?.focus(); } else notify('warning', `Código no encontrado: ${code}`); };
  useEffect(() => {
    searchRef.current?.focus();
    const keydown = (e: KeyboardEvent) => {
      keyboard.current(e);
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.isComposing || document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement;
      if (target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const elapsed = performance.now() - scanner.current.at;
      if (e.key === 'Enter' && scanner.current.text.length >= 3 && elapsed < 100) { e.preventDefault(); scanHandler.current(scanner.current.text); scanner.current.text = ''; }
      else if (e.key.length === 1) { scanner.current.text = (elapsed < 100 ? scanner.current.text : '') + e.key; scanner.current.at = performance.now(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  return (
    <div
      className={`pos-layout ${mobilePosView === "checkout" ? "pos-mobile-checkout-active" : "pos-mobile-catalog-active"}`}
      data-mobile-view={mobilePosView}
    >
      <div className="pos-mobile-view-tabs" role="tablist" aria-label="Modo de venta">
        <button
          type="button"
          role="tab"
          aria-selected={mobilePosView === "catalog"}
          className={`pos-mobile-tab-btn ${mobilePosView === "catalog" ? "active" : ""}`}
          onClick={() => setMobilePosView("catalog")}
        >
          <Package size={15} />
          <span>Catálogo</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePosView === "checkout"}
          className={`pos-mobile-tab-btn ${mobilePosView === "checkout" ? "active" : ""}`}
          onClick={() => setMobilePosView("checkout")}
        >
          <ShoppingBag size={15} />
          <span>Cobro {count > 0 && <span className="pos-mobile-tab-badge">{count}</span>}</span>
        </button>
      </div>
      <section className="catalog" aria-label="Catálogo de productos">
        <p className="keyboard-shortcuts">F1 Efectivo · F2 QR / Mercado Pago · F3 Transferencia · F4 Mixto · Ctrl+K Buscar · Esc Volver. Los atajos confirman el pago recibido; F1 usa el monto exacto si no ingresaste otro.</p>
        <div className="catalog-step"><span className="step-number">1</span><h2>Agregá productos</h2><span>Buscá o escaneá un código</span></div>
        <form className="search-box" onSubmit={search}>
          <Search size={21} />
          <input
            ref={searchRef}
            aria-label="Buscar producto o escanear código"
            placeholder="Buscá un producto o escaneá su código"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(60); }}
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
          ) : (
            <kbd>Ctrl K</kbd>
          )}
          <Barcode size={22} />
        </form>
        <div className="manual-panel">
          <button
            className="manual-toggle"
            aria-expanded={manual}
            onClick={() => setManual(!manual)}
          >
            <span className="manual-icon">
              <Plus size={18} />
            </span>
            <span>
              <strong>Agregar un importe manual</strong>
              <small>Para productos que todavía no están en el catálogo</small>
            </span>
            <span>{manual ? <Minus size={18} /> : <Plus size={18} />}</span>
          </button>
          {manual && (
            <form
              className="manual-form"
              onSubmit={(e) => {
                e.preventDefault();
                const value = Number(amount);
                if (!Number.isFinite(value) || value <= 0) return;
                add({
                  id: crypto.randomUUID(),
                  code: "MANUAL",
                  name: description.trim() || "Venta manual",
                  price: value,
                  category: "Varios",
                  stock: 999,
                  minStock: 0,
                  emoji: "🏷️",
                });
                setAmount("");
                setDescription("");
              }}
            >
              <label>
                Descripción
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Fotocopia"
                />
              </label>
              <label>
                Importe ($)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </label>
              <button className="primary-button" disabled={busy}>
                Agregar
              </button>
            </form>
          )}
        </div>
        <label className="margin-pos-filter"><input type="checkbox" checked={hideLowMargin} onChange={e => setHideLowMargin(e.target.checked)} />Ocultar temporalmente productos de bajo margen</label>
        {storeId && branchId && <QuickProducts storeId={storeId} branchId={branchId} products={hideLowMargin ? products.filter(p => p.margin_group !== 'low_margin') : products} manager={canCustomizeQuick} onAdd={add} disabled={busy || !!isLoading} />}
        <div className="category-list" aria-label="Categorías">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              className={category === c ? "selected" : ""}
              onClick={() => { setCategory(c); setVisibleCount(60); }}
            >
              {c || "Todos"}
            </button>
          ))}
        </div>
        <div className="catalog-meta">
          <span>
            <strong>{filtered.length}</strong> productos{" "}
            {category !== "" && `en ${category.toLowerCase()}`}
          </span>
          <div className="catalog-meta-actions">
            <button
              type="button"
              className="catalog-ai-btn"
              onClick={handleOpenAi}
              title="Abrir Asistente IA"
              aria-label="Abrir Asistente IA"
            >
              <Sparkles size={14} />
              <span>Asistente IA</span>
            </button>
            <button
              className={`text-button ${availableOnly ? "selected" : ""}`}
              aria-pressed={availableOnly}
              onClick={() => { setAvailableOnly(!availableOnly); setVisibleCount(60); }}
            >
              <SlidersHorizontal size={15} />
              {availableOnly ? "Solo disponibles" : "Filtrar disponibles"}
            </button>
          </div>
        </div>
        <div className="product-grid-scroll-wrap" tabIndex={0} aria-label="Catálogo de productos disponibles">
        <div className="product-grid" aria-busy={isLoading}>
          {isLoading ? (
            <div className="empty-state">
              <Package size={32} />
              <h2>Cargando tu catálogo…</h2>
              <p>Estamos preparando los productos.</p>
            </div>
          ) : !products.length ? (
            <div className="empty-state welcome-empty">
              <span className="empty-icon">
                <Package size={34} />
              </span>
              <span className="eyebrow">TODO LISTO PARA EMPEZAR</span>
              <h2>Tu primera venta empieza acá</h2>
              <p>
                Agregá tus productos para encontrarlos rápido, controlar el
                stock y vender con tranquilidad.
              </p>
              {onGoToCreateProduct ? (
                <button
                  className="primary-button"
                  onClick={onGoToCreateProduct}
                >
                  <Plus size={18} /> Agregar mi primer producto
                </button>
              ) : (
                <p>
                  Pedile a un administrador que agregue los productos del
                  comercio.
                </p>
              )}
              <span className="empty-hint">
                También podés usar “Agregar un importe manual”, junto al buscador.
              </span>
            </div>
          ) : !filtered.length ? (
            <div className="empty-state">
              <Search size={32} />
              <h2>No encontramos productos</h2>
              <p>Probá con otro nombre, código o categoría.</p>
              <button
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setAvailableOnly(false);
                }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filtered.slice(0, visibleCount).map((p) => {
              const qty = cart.find((i) => i.product.id === p.id)?.qty || 0;
              return (
                <button
                  key={p.id}
                  disabled={busy || p.stock <= qty}
                  className={`product-card ${qty ? "in-cart" : ""}`}
                  onClick={() => add(p)}
                  aria-label={`Agregar ${p.name}, ${money(p.price)}. ${p.stock} disponibles`}
                >
                  <div
                    className={`product-art category-${p.category.toLowerCase()}`}
                  >
                    <span aria-hidden="true">{p.emoji || "📦"}</span>
                    {qty > 0 && (
                      <span className="product-quantity" key={qty}>{qty} en venta</span>
                    )}
                  </div>
                  <div className="product-info">
                    <small>{p.category}</small>
                    <h3>{p.name}</h3>
                    <span
                      className={
                        p.stock <= p.minStock ? "stock-low" : "stock-ok"
                      }
                    >
                      {unitsPerPack(p.pack_size) > 1 ? formatPackStock(p.stock, p.pack_size) : p.stock === 0 ? "Sin stock" : `${p.stock} disponibles`}
                    </span>
                    <div className="product-price">
                      <strong>{money(p.price)}</strong>
                      <span className="add-product">
                        <Plus size={18} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {filtered.length > visibleCount && <div className="load-more"><span>{visibleCount} de {filtered.length} productos</span><button className="secondary-button" onClick={() => setVisibleCount(n => n + 60)}>Ver más productos</button></div>}

        </div>
      </section>
      <aside id="pos-sale-panel" className="sale-panel" aria-label="Venta actual">
        <div className="pos-mobile-checkout-header">
          <button
            type="button"
            className="pos-mobile-back-btn"
            onClick={() => setMobilePosView("catalog")}
            aria-label="Volver al catálogo"
          >
            <ArrowLeft size={16} />
            <span>Catálogo</span>
          </button>
          <div className="pos-mobile-checkout-title">
            <h2>Cobro</h2>
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
        {stationControls && (
          <div className="pos-station-controls">
            {stationControls}
          </div>
        )}
        <div className="sale-header">
          <div>
            <span className="eyebrow">2 · REVISÁ Y COBRÁ</span>
            <h2>
              Venta actual <span>{count}</span>
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
        <div className="cart-items">
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
                onClick={() => setMobilePosView("catalog")}
              >
                <ArrowLeft size={15} />
                <span>Ir al catálogo</span>
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
                    onClick={() =>
                      setCart((prev) =>
                        prev.filter((i) => i.product.id !== item.product.id),
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="cart-item-bottom">
                  <div className="quantity-control">
                    <button
                      disabled={busy}
                      aria-label={`Restar una unidad de ${item.product.name}`}
                      onClick={() =>
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
                        )
                      }
                    >
                      <Minus size={14} />
                    </button>
                    <span>{item.qty}</span>
                    <button
                      disabled={
                        busy ||
                        (item.product.code !== "MANUAL" &&
                          item.qty >= item.product.stock)
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
        <div className="checkout">
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
          <button
            className="primary-button checkout-button"
            disabled={
              busy ||
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
          <p className="checkout-hint">
            {!cart.length
              ? "Agregá productos para comenzar"
              : method === "Efectivo" && received < total
                ? "Ingresá cuánto recibiste para continuar"
                : method !== 'Efectivo' && !confirmed
                  ? 'Confirmá el pago recibido para habilitar el cobro'
                  : "Al cobrar, se genera el ticket de la venta"}
          </p>
        </div>
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
            onClick={() => {
              setMobilePosView("checkout");
              document
                .getElementById("pos-sale-panel")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span>Ver venta</span>
            <ArrowRight size={15} />
          </button>
        </aside>
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
