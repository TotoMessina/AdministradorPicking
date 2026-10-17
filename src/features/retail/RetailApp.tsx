import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Store as StoreIcon,
  ShoppingBag,
  Wallet,
  Package,
  Settings2,
  LogOut,
  RefreshCw,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";
import { PosTab } from "../../components/PosTab";
import { ThermalReceiptModal } from "../../components/ThermalReceiptModal";
import { AiAssistantWidget } from "../../components/AiAssistantWidget";
import { AIReportPanel } from "../../components/AIReportPanel";
import { AIAssistant } from "../../components/AIAssistant";
import type { KioscoCartItem, KioscoSale } from "../../types/kiosco";
import {
  retail,
  errorMessage,
  type Store,
  type Role,
  type Category,
  type Product,
  type Register,
  type Shift,
  type Movement,
  type Member,
  type Invitation,
  type Branch, type PriceList, type PriceOverride, type SalesLedger,
} from "./api";
import { CatalogEditor, StoreSettings, type Run } from "./Management";
import { CashDesk } from "./CashDesk";
import { PriceListSettings } from './BusinessSettings';
import { SalesOverview } from './SalesOverview';
import { productsForList } from './pricing';
import { SectionNav } from './SectionNav';
import { disconnectPushOnLogout, initialPushIntent, readPushIntent } from './push';
import { PushWelcome } from './PushWelcome';
import { useMobileScreenMotion } from './useMobileExperience';
import { configureOffline, stopOffline, backgroundAuth } from './offline';
import { OfflineStatus } from './OfflineStatus';
import { useBranchPriceList } from './useBranchPriceList';
type Tab = "pos" | "cash" | "catalog" | "settings" | "ai";
export function RetailApp({ session }: { session: Session }) {
  useEffect(() => { if (session.access_token) void backgroundAuth(session).catch(() => {}); }, [session.access_token]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushWelcomeDone, setPushWelcomeDone] = useState(false);
  const finishPushWelcome = useCallback(() => setPushWelcomeDone(true), []);
  const load = useCallback(async () => {
    configureOffline(session.user.id);
    setLoading(true);
    setError("");
    try {
      await retail.acceptInvitations();
      const rows = await retail.stores();
      setStores(rows);
      setSelected((prev) =>
        rows.some((s) => s.id === prev) ? prev : rows.find(s => s.id === initialPushIntent()?.storeId)?.id || rows[0]?.id || "",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const signOut = async () => {
    // Logging out also disconnects notifications on shared shop devices.
    try { await disconnectPushOnLogout(); } catch { /* Logout must remain available. */ }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await stopOffline();
  };
  const store = stores.find((s) => s.id === selected);
  const accentColor = store?.accent_color;
  useEffect(() => {
    // Notifications rendered outside the workspace share the active palette.
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--store-accent");
    if (accentColor) root.style.setProperty("--store-accent", accentColor);
    return () => {
      if (previous) root.style.setProperty("--store-accent", previous);
      else root.style.removeProperty("--store-accent");
    };
  }, [accentColor]);
  if (store && !creating)
    return (
      <Workspace
        key={session.user.id + store.id}
        session={session}
        store={store}
        stores={stores}
        setSelected={setSelected}
        onCreate={() => setCreating(true)}
        onStores={async () => {
          const rows = await retail.stores();
          setStores(rows);
        }}
        onSignOut={signOut}
        pushWelcomeDone={pushWelcomeDone}
        onPushWelcomeDone={finishPushWelcome}
      />
    );
  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="brand-mark">
          <StoreIcon />
        </span>
        <h1>{creating ? "Sumá otro comercio" : "Tu negocio empieza acá"}</h1>
        <p>{session.user.email}</p>
        {loading ? (
          <p role="status">Buscando tus comercios…</p>
        ) : error ? (
          <>
            <div role="alert" className="error-banner">
              {error}
            </div>
            <button className="secondary-button" onClick={() => void load()}>
              Reintentar conexión
            </button>
          </>
        ) : (
          <>
            <p>
              Creá un comercio con su propia caja y catálogo. Si te autorizaron
              a uno existente, actualizá los accesos.
            </p>
            <form
              className="retail-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                const name = String(new FormData(e.currentTarget).get("name"));
                setBusy(true);
                try {
                  const id = await retail.createStore(name);
                  await load();
                  setSelected(id);
                  setCreating(false);
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nombre del comercio
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Ej. Almacén del barrio"
                />
              </label>
              <button disabled={busy} className="primary-button">
                {busy ? "Creando…" : "Crear comercio"}
              </button>
            </form>
          </>
        )}
        <div className="auth-links">
          <button disabled={busy} onClick={() => void load()}>
            Actualizar accesos
          </button>
          {creating && (
            <button onClick={() => setCreating(false)}>Volver</button>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void signOut().catch((e) => setError(errorMessage(e)))
            }
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}
function Workspace({
  session,
  store,
  stores,
  setSelected,
  onCreate,
  onStores,
  onSignOut,
  pushWelcomeDone,
  onPushWelcomeDone,
}: {
  session: Session;
  store: Store;
  stores: Store[];
  setSelected: (id: string) => void;
  onCreate: () => void;
  onStores: () => Promise<void>;
  onSignOut: () => Promise<void>;
  pushWelcomeDone: boolean;
  onPushWelcomeDone: () => void;
}) {
  const { notify } = useToast();
  const [role, setRole] = useState<Role>("cashier");
  const [pushEntry] = useState(() => {
    const intent = initialPushIntent();
    return intent?.storeId === store.id ? intent : null;
  });
  const [tab, setTab] = useState<Tab>(pushEntry?.view || 'pos');
  const mainRef = useRef<HTMLElement>(null);
  useMobileScreenMotion(mainRef, tab);
  const [cashView, setCashView] = useState(pushEntry?.view === 'cash' ? 'overview' : 'shift');
  const [catalogView, setCatalogView] = useState('products');
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [availability, setAvailability] = useState<{ register_id: string; occupied: boolean }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const branchSelection = useRef('');
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [ledgers, setLedgers] = useState<SalesLedger[]>([]);
  const [ledgerId, setLedgerId] = useState('');
  const [revision, setRevision] = useState(0);
  const [registerId, setRegisterId] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sales, setSales] = useState<KioscoSale[]>([]);
  const [lastSale, setLastSale] = useState<KioscoSale | null>(null);
  const [allStoreSales, setAllStoreSales] = useState<KioscoSale[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [cart, setCart] = useState<KioscoCartItem[]>([]);
  const [posMobileView, setPosMobileView] = useState<"catalog" | "checkout">("catalog");
  const [ticket, setTicket] = useState<KioscoSale | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const checkoutRequest = useRef({ signature: "", id: "" });
  const running = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const shift = shifts.find(
    (s) => s.register_id === registerId && !s.closed_at,
  );
  const register = registers.find((r) => r.id === registerId);
  const occupiedByOther = !shift && availability.some(r => r.register_id === registerId && r.occupied);
  const manager = role === "owner" || role === "admin";
  const branchPricing = useBranchPriceList(store.id, branchId, priceLists, manager);
  const priceListId = branchPricing.priceListId;
  const mobileTabs = ['pos', 'cash', ...(manager ? ['catalog', 'settings', 'ai'] : [])];
  const canOperate =
    !!shift && !!register?.active && (manager || shift.opened_by === session.user.id);
  const refresh = useCallback(async () => {
    const turn = ++generation.current;
    const [nextRole, cats, regs, nextShifts, nextBranches, lists, overrides, nextLedgers, nextAvailability] = await Promise.all([
      retail.role(store.id, session.user.id),
      retail.categories(store.id),
      retail.registers(store.id),
      retail.shifts(store.id),
      retail.branches(store.id),
      retail.priceLists(store.id),
      retail.priceOverrides(store.id),
      retail.ledgers(store.id),
      retail.registerAvailability(store.id),
    ]);
    const [prods, team, pending, storeSales] = await Promise.all([
      retail.products(store.id, cats),
      nextRole !== "cashier" ? retail.members(store.id) : Promise.resolve([]),
      nextRole !== "cashier" ? retail.invitations(store.id) : Promise.resolve([]),
      nextRole !== "cashier" ? retail.allSales(store.id).catch(() => []) : Promise.resolve([]),
    ]);
    if (!alive.current || turn !== generation.current) return;
    setRole(nextRole);
    setCategories(cats);
    setRegisters(regs);
    setAvailability(nextAvailability);
    setBranches(nextBranches);
    setPriceLists(lists);
    setPriceOverrides(overrides);
    setLedgers(nextLedgers);
    setLedgerId(prev => prev || nextLedgers.find(l => l.is_default)?.id || '');
    const ownOpenRegister = regs.find(r => r.active && nextShifts.some(s => s.register_id === r.id && !s.closed_at && s.opened_by === session.user.id));
    const nextBranch = nextBranches.some(b => b.id === branchSelection.current) ? branchSelection.current : ownOpenRegister?.branch_id || nextBranches[0]?.id || '';
    setBranchId(nextBranch);
    branchSelection.current = nextBranch;
    setRevision(n => n + 1);
    setShifts(nextShifts);
    setProducts(prods);
    setMembers(team);
    setInvitations(pending);
    setAllStoreSales(storeSales);
    setRegisterId((prev) =>
      regs.some((r) => r.id === prev && r.active && r.branch_id === nextBranch)
        ? prev
        : (ownOpenRegister?.branch_id === nextBranch ? ownOpenRegister.id : '')
          || regs.find(r => r.active && r.branch_id === nextBranch && !nextAvailability.some(a => a.register_id === r.id && a.occupied))?.id
          || regs.find((r) => r.active && r.branch_id === nextBranch)?.id || "",
    );
    setError("");
  }, [store.id, session.user.id]);
  useEffect(() => {
    alive.current = true;
    void refresh()
      .catch((e) => {
        if (alive.current) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [refresh]);

  // Detección en tiempo real de productos que caen en bajo stock tras ventas o ajustes
  const prevLowStockIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!products.length) return;
    const currentLowStock = products.filter((p) => p.active && p.stock <= p.minStock);

    if (prevLowStockIdsRef.current === null) {
      // Inicialización silenciosa al cargar el comercio
      prevLowStockIdsRef.current = new Set(currentLowStock.map((p) => p.id));
      return;
    }

    // Identificar productos que entraron a bajo stock en esta actualización
    const newlyEntered = currentLowStock.filter(
      (p) => !prevLowStockIdsRef.current!.has(p.id),
    );

    if (newlyEntered.length > 0) {
      if (newlyEntered.length === 1) {
        notify(
          "warning",
          `⚠️ Revisá el stock: "${newlyEntered[0].name}" llegó al nivel mínimo (quedan ${newlyEntered[0].stock} u., mín. ${newlyEntered[0].minStock}).`,
        );
      } else if (newlyEntered.length <= 3) {
        const list = newlyEntered
          .map((p) => `"${p.name}" (${p.stock} u.)`)
          .join(", ");
        notify("warning", `⚠️ Entraron a bajo stock: ${list}.`);
      } else {
        const sample = newlyEntered
          .slice(0, 2)
          .map((p) => `"${p.name}" (${p.stock} u.)`)
          .join(", ");
        notify(
          "warning",
          `⚠️ ${newlyEntered.length} nuevos productos entraron a bajo stock: ${sample} y más.`,
        );
      }
    }

    prevLowStockIdsRef.current = new Set(currentLowStock.map((p) => p.id));
  }, [products, notify]);
  const activeShiftId = shift?.id;
  const refreshLedger = useCallback(async () => {
    if (!activeShiftId) {
      setSales([]);
      setMovements([]);
      return;
    }
    const [nextSales, nextMovements] = await Promise.all([
      retail.sales(store.id, activeShiftId!),
      retail.movements(store.id, activeShiftId!),
      retail.shiftBalance(activeShiftId!),
    ]);
    if (alive.current) {
      setSales(nextSales);
      setMovements(nextMovements);
    }
  }, [store.id, activeShiftId]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => { clearTimeout(timer); timer = setTimeout(() => { void Promise.all([refresh(), refreshLedger()]).catch(() => {}); }, 200); };
    window.addEventListener('retail-local-change', update);
    return () => { clearTimeout(timer); window.removeEventListener('retail-local-change', update); };
  }, [refresh, refreshLedger]);
  useEffect(() => {
    let active = true;
    setSales([]);
    setMovements([]);
    if (!activeShiftId) {
      setLedgerLoading(false);
      return;
    }
    setLedgerLoading(true);
    Promise.all([
      retail.sales(store.id, activeShiftId!),
      retail.movements(store.id, activeShiftId!),
      retail.shiftBalance(activeShiftId!),
    ])
      .then(([ss, mm]) => {
        if (active) {
          setSales(ss);
          setMovements(mm);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLedgerLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store.id, activeShiftId]);
  const run: Run = async (action, message) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      if (message) notify("success", message);
      try {
        await Promise.all([refresh(), onStores()]);
        await refreshLedger();
      } catch (err) {
        setError(
          "El cambio se guardó, pero no se pudo actualizar la pantalla. " +
            errorMessage(err),
        );
      }
      return true;
    } catch (err) {
      setError(errorMessage(err));
      notify("error", errorMessage(err));
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const confirmLeave = () =>
    !cart.length ||
    window.confirm("Hay una venta sin cobrar. ¿Descartarla y continuar?");
  const showTicket = (sale: KioscoSale) =>
    setTicket({
      ...sale,
      storeName: store.name,
      storeAddress: store.address,
      storePhone: store.phone,
      receiptMessage: store.receipt_message,
    });
  const completeSale = async (sale: KioscoSale) => {
    if (branchPricing.loading || branchPricing.error) throw new Error(branchPricing.error || 'Esperá a que se apliquen los precios de la sucursal.');
    if (!shift || !canOperate || running.current)
      throw new Error("Abrí tu turno antes de vender.");
    running.current = true;
    setBusy(true);
    try {
      const signature = JSON.stringify([
        shift.id,
        sale.items,
        sale.paymentMethod,
        sale.amountPaid,
        sale.payments,
        priceListId,
        ledgerId,
      ]);
      if (checkoutRequest.current.signature !== signature)
        checkoutRequest.current = { signature, id: sale.id };
      const saved = await retail.checkout(store.id, shift.id, {
        ...sale,
        priceListId: priceListId || null,
        ledgerId,
        id: checkoutRequest.current.id,
      });
      checkoutRequest.current = { signature: "", id: "" };
      setLastSale(saved);
      void Promise.all([refresh(), refreshLedger()]).catch(err => {
        setError(
          "La venta se guardó. Actualizá los datos antes de seguir: " +
            errorMessage(err),
        );
      });
    } catch (err) {
      throw new Error(errorMessage(err));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const refreshAll = () => { branchPricing.reload(); void run(async () => {}, "Datos actualizados"); };
  useEffect(() => {
    if (pushEntry) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [pushEntry]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const openNotice = (event: MessageEvent) => {
      if (event.data?.type !== 'retail-push-open') return;
      const intent = readPushIntent(event.data);
      if (!intent) return;
      if (intent.storeId !== store.id) {
        notify('info', 'El aviso corresponde a otro comercio. Seleccionalo desde el menú para revisarlo.');
        return;
      }
      if (!manager || busy || cart.length) {
        notify('info', 'Tenés un aviso del comercio. Podés revisarlo cuando termines la operación actual.');
        return;
      }
      if (intent.view === 'cash') setCashView('overview');
      if (intent.view === 'catalog') {
        setCatalogView('products');
        const low = products.filter((p) => p.active && p.stock <= p.minStock);
        if (low.length > 0) {
          const list = low
            .slice(0, 3)
            .map((p) => `"${p.name}" (${p.stock} u.)`)
            .join(', ');
          notify(
            'warning',
            `⚠️ Revisá el stock (${low.length} en nivel crítico): ${list}${low.length > 3 ? '…' : ''}`,
          );
        }
      }
      setTab(intent.view);
    };
    navigator.serviceWorker.addEventListener('message', openNotice);
    return () => navigator.serviceWorker.removeEventListener('message', openNotice);
  }, [store.id, manager, busy, cart.length, notify, products]);
  const posStationControls = canOperate ? (
    <div className="pos-station-bar">
      <div className="pos-station-pickers">
        <label>
          Sucursal
          <select
            disabled={busy || loading || branches.length === 1}
            value={branchId}
            onChange={(e) => {
              if (confirmLeave()) {
                setCart([]);
                branchSelection.current = e.target.value;
                setBranchId(e.target.value);
                setRegisterId(
                  registers.find((r) => r.active && r.branch_id === e.target.value)?.id || ""
                );
              }
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Caja de atención
          <select
            disabled={busy || loading || registers.filter(r => r.active && r.branch_id === branchId).length === 1}
            value={registerId}
            onChange={(e) => {
              if (confirmLeave()) {
                setCart([]);
                setRegisterId(e.target.value);
              }
            }}
          >
            {registers
              .filter((r) => r.active && r.branch_id === branchId)
              .map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}{availability.some(a => a.register_id === r.id && a.occupied) && !shifts.some(s => s.register_id === r.id && !s.closed_at && s.opened_by === session.user.id) ? ' · Ocupada' : ''}
                </option>
              ))}
          </select>
        </label>
      </div>
      <details className="sale-options station-sale-options">
        <summary>
          <span>Opciones de venta</span>
          <strong>
            {priceLists.find((l) => l.id === priceListId)?.name || "Lista madre"}{" "}
            <span aria-hidden="true">·</span>{" "}
            {ledgers.find((l) => l.id === ledgerId)?.name || "General"}
          </strong>
        </summary>
        <div className="business-controls">
          <label>
            Lista de precios
            <select
              disabled={busy || cart.length > 0 || !manager || branchPricing.loading}
              value={priceListId}
              onChange={(e) => branchPricing.select(e.target.value)}
            >
              <option value="">Lista madre</option>
              {priceLists
                .filter((l) => (!l.branch_id || l.branch_id === branchId) && (l.active || l.id === priceListId))
                .map((l) => (
                  <option key={l.id} value={l.id} disabled={!l.active}>
                    {l.name}
                    {!l.active && " (inactiva)"}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Registro de ventas
            <select
              disabled={busy || cart.length > 0}
              value={ledgerId}
              onChange={(e) => setLedgerId(e.target.value)}
            >
              {ledgers
                .filter((l) => l.active || l.id === ledgerId)
                .map((l) => (
                  <option key={l.id} value={l.id} disabled={!l.active}>
                    {l.name}
                    {!l.active && " (inactivo)"}
                  </option>
                ))}
            </select>
          </label>
          <small>
            {cart.length
              ? "La lista y el registro se mantienen hasta terminar o vaciar la venta."
              : "Elegí la lista y el registro antes de agregar productos."}
          </small>
        </div>
      </details>
    </div>
  ) : undefined;
  return (
    <div
      className={`app-shell retail-app mobile-tab-${tab}${cart.length ? " has-mobile-cart" : ""}${tab === "pos" && canOperate ? " pos-shift-open" : ""}${tab === "pos" && posMobileView === "checkout" ? " pos-mobile-checkout-active" : ""}`}
      style={{ "--store-accent": store.accent_color } as React.CSSProperties}
    >
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      {manager && !loading && !pushWelcomeDone && <PushWelcome
        storeId={store.id} storeName={store.name} userId={session.user.id} onDone={onPushWelcomeDone} />}
      <header className={`app-sidebar${mobileAccountOpen ? " mobile-account-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <StoreIcon size={22} />
          </span>
          <span className="store-brand-name">
            {store.name}
            <span className="brand-sub">MI NEGOCIO</span>
          </span>
        </div>
        <button
          type="button"
          className="mobile-account-toggle icon-button"
          aria-label={mobileAccountOpen ? "Cerrar menú de cuenta" : "Abrir menú de cuenta"}
          aria-expanded={mobileAccountOpen}
          aria-controls="store-switcher account-actions"
          onClick={() => setMobileAccountOpen((open) => !open)}
        >
          {mobileAccountOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <label id="store-switcher" className="store-switch">
          Comercio
          <select
            disabled={busy}
            value={store.id}
            onChange={(e) => {
              if (confirmLeave()) setSelected(e.target.value);
            }}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Navegación principal" style={{ '--nav-count': mobileTabs.length, '--nav-index': Math.max(0, mobileTabs.indexOf(tab)) } as React.CSSProperties}>
          {(
            [
              { id: "pos", label: "Nueva venta", icon: ShoppingBag },
              { id: "cash", label: "Cajas y turnos", icon: Wallet },
              ...(manager
                ? [
                    {
                      id: "catalog",
                      label: "Productos y stock",
                      icon: Package,
                    },
                    { id: "settings", label: "Mi comercio", icon: Settings2 },
                  ]
                : []),
              ...(manager
                ? [
                    {
                      id: "ai",
                      label: "Asistente IA",
                      icon: Sparkles,
                    },
                  ]
                : []),
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              disabled={busy}
              className={`nav-item ${tab === id ? "active" : ""}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setTab(id as Tab);
                setPosMobileView("catalog");
                setMobileAccountOpen(false);
                if (window.matchMedia("(max-width: 760px)").matches) window.scrollTo(0, 0);
              }}
            >
              <Icon size={18} />
              <span className="desktop-nav-label">{label}</span>
              <span className="mobile-nav-label">{{ pos: "Vender", cash: "Caja", catalog: "Productos", settings: "Comercio", ai: "Asistente" }[id]}</span>
            </button>
          ))}
        </nav>
        <div id="account-actions" className="sidebar-bottom">
          <div className="account-info">
            <strong>
              {
                {
                  owner: "Propietario",
                  admin: "Administrador",
                  cashier: "Cajero",
                }[role]
              }
            </strong>
            <small>{session.user.email}</small>
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (confirmLeave()) onCreate();
            }}
          >
            + Crear otro comercio
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await retail.acceptInvitations();
              }, "Accesos actualizados")
            }
          >
            Actualizar accesos
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (confirmLeave())
                void onSignOut().catch((e) => notify("error", errorMessage(e)));
            }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </header>
      <main id="main-content" className="main-content" ref={mainRef}>
        <OfflineStatus />
        {lastSale && tab === 'pos' && <div className="last-sale"><span>Última venta: ${lastSale.total.toLocaleString('es-AR')}</span><button type="button" className="text-button" onClick={() => showTicket(sales.find(s => s.id === lastSale.id) || lastSale)}>Ver último ticket</button></div>}
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {store.name} /{" "}
              {
                {
                  pos: "MOSTRADOR",
                  cash: "CAJAS",
                  catalog: "CATÁLOGO",
                  settings: "CONFIGURACIÓN",
                  ai: "ASISTENTE",
                }[tab]
              }
            </span>
            <h1>
              <span className="desktop-page-title">
              {
                {
                  pos: "Nueva venta",
                  cash: "Caja y ventas",
                  catalog: "Productos y precios",
                  settings: "Mi comercio",
                  ai: "Asistente de negocio",
                }[tab]
              }
              </span>
              <span className="mobile-page-title">{{ pos: "Nueva venta", cash: "Caja y turnos", catalog: "Productos", settings: "Mi comercio", ai: "Asistente" }[tab]}</span>
            </h1>
            <p>{{ pos: 'Buscá, agregá y cobrá. Todo desde el mismo lugar.', cash: 'Abrí tu turno, revisá los movimientos y consultá tus ventas.', catalog: 'Mantené tus productos, existencias y precios al día.', settings: 'Organizá tu comercio y elegí cómo trabajar.', ai: 'Consultá los datos de tu comercio y prepará tu próximo paso.' }[tab]}</p>
          </div>
          <div className={`register-picker ${tab === 'pos' && canOperate ? 'pos-compact-refresh' : tab !== 'pos' && tab !== 'cash' ? 'context-picker-hidden' : ''}`}>
            {!(tab === 'pos' && canOperate && !branchPricing.loading && !branchPricing.error && !error) && (
              <>
                <label>Sucursal<select disabled={busy || loading || branches.length === 1} value={branchId} onChange={e => {
                  if (confirmLeave()) { setCart([]); branchSelection.current = e.target.value; setBranchId(e.target.value); setRegisterId(registers.find(r => r.active && r.branch_id === e.target.value)?.id || ''); }
                }}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
                <label>
                  Caja de atención
                  <select
                    disabled={busy || loading || registers.filter(r => r.active && r.branch_id === branchId).length === 1}
                    value={registerId}
                    onChange={(e) => {
                      if (confirmLeave()) {
                        setCart([]);
                        setRegisterId(e.target.value);
                      }
                    }}
                  >
                    {registers
                      .filter((r) => r.active && r.branch_id === branchId)
                      .map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.name}{availability.some(a => a.register_id === r.id && a.occupied) && !shifts.some(s => s.register_id === r.id && !s.closed_at && s.opened_by === session.user.id) ? ' · Ocupada' : ''}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}
            <button
              className="icon-button"
              disabled={busy || loading}
              aria-label="Actualizar datos"
              onClick={refreshAll}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        {!loading && (tab === 'pos' || tab === 'cash') && <div className="workspace-context">
          <span className={`status-pill ${canOperate ? 'status-open' : 'status-closed'}`}><span aria-hidden="true" />{canOperate ? 'Turno abierto' : shift ? 'Caja en uso' : 'Turno cerrado'}</span>
          <span>{branches.find(b => b.id === branchId)?.name} <span aria-hidden="true">/</span> {register?.name || 'Sin caja seleccionada'}</span>
          {tab === 'pos' && canOperate && <button className="text-button" disabled={busy} onClick={() => { setCashView('shift'); setTab('cash'); }}>Ver mi turno</button>}
        </div>}
        {(error || branchPricing.error) && (
          <div className="error-banner" role="alert">
            {error || branchPricing.error}
            <button
              className="text-button"
              disabled={busy}
              onClick={refreshAll}
            >
              Reintentar
            </button>
          </div>
        )}
        {loading || (tab === 'pos' && branchPricing.loading) ? (
          <div className="retail-panel workspace-loading" role="status">
            <RefreshCw size={24} className="loading-spin" aria-hidden="true" />
            Cargando los datos del comercio…
          </div>
        ) : (
          <>
            {tab === "pos" &&
              (!canOperate || error || branchPricing.error ? (
                <section className="retail-panel start-selling">
                  <span className="empty-icon"><Wallet size={28} /></span>
                  <h2>
                    {error || branchPricing.error
                      ? "Actualizá los datos antes de vender"
                      : !register
                        ? "Esta sucursal todavía no tiene cajas"
                      : shift || occupiedByOther
                        ? "Esta caja está en uso"
                        : "Primero, abrí tu caja"}
                  </h2>
                  <p>
                    {!register
                      ? 'Agregá una caja en Mi comercio, dentro de Cajas por sucursal. Si sos cajero, pedíselo al administrador.'
                      : occupiedByOther || (shift && !canOperate)
                      ? "Elegí otra caja disponible o esperá a que termine el turno actual. Usá Actualizar para comprobar si ya se liberó."
                      : "Ingresá el efectivo inicial para comenzar a registrar las ventas de este turno."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => { setCashView('shift'); setTab(!register && manager ? 'settings' : 'cash'); }}
                  >
                    {!register && manager ? 'Agregar una caja' : 'Ir a cajas y turnos'}
                  </button>
                </section>
              ) : (
                <PosTab
                  storeId={store.id}
                  branchId={branchId}
                  canCustomizeQuick={manager}
                  key={shift?.id}
                  storeName={store.name}
                  products={productsForList(products, priceLists.find(l => l.id === priceListId), priceOverrides)}
                  cart={cart}
                  setCart={setCart}
                  onCompleteSale={completeSale}
                  onTriggerChecklist={() => {}}
                  onGoToCreateProduct={
                    manager ? () => { setCatalogView('products'); setTab("catalog"); } : undefined
                  }
                  onOpenAi={() => setIsAiOpen(true)}
                  stationControls={posStationControls}
                  mobilePosView={posMobileView}
                  onMobilePosViewChange={setPosMobileView}
                />
              ))}
            {tab === "cash" && (
              <>
                {manager && <SectionNav name="cash" label="Vistas de caja" value={cashView} onChange={setCashView} disabled={busy} sections={[{ id: 'shift', label: 'Mi turno' }, { id: 'overview', label: 'Resumen y ventas' }]} />}
                {manager && cashView === 'overview' && <div role="tabpanel" id="cash-panel-overview" aria-labelledby="cash-tab-overview"><SalesOverview storeId={store.id} products={products} branches={branches} registers={registers} shifts={shifts} ledgers={ledgers} revision={revision} run={run} busy={busy} onTicket={showTicket} />
                  <AIReportPanel storeId={store.id} shifts={shifts} allSales={allStoreSales.length > 0 ? allStoreSales : sales} products={products} storeName={store.name} role={role} />
                </div>}
                <div hidden={manager && cashView !== 'shift'} role={manager ? 'tabpanel' : undefined} id="cash-panel-shift" aria-labelledby={manager ? 'cash-tab-shift' : undefined}>
                {ledgerLoading ? (
                  <div role="status">Cargando movimientos…</div>
                ) : (
                  <CashDesk
                    cashierMode={!manager}
                    occupiedByOther={occupiedByOther}
                    onSell={() => setTab('pos')}
                    key={registerId + shift?.id}
                    storeId={store.id}
                    register={register}
                    shift={shift}
                    shifts={shifts}
                    sales={sales}
                    movements={movements}
                    canOperate={canOperate}
                    run={run}
                    busy={busy}
                    onTicket={showTicket}
                    onRefresh={refreshAll}
                  />
                )}
                </div>
              </>
            )}
            {tab === "catalog" && manager && (
              <>
              <SectionNav name="catalog" label="Vistas de productos" value={catalogView} onChange={setCatalogView} disabled={busy} sections={[{ id: 'products', label: 'Catálogo y stock' }, { id: 'prices', label: 'Listas de precios' }]} />
              <div hidden={catalogView !== 'prices'} role="tabpanel" id="catalog-panel-prices" aria-labelledby="catalog-tab-prices"><PriceListSettings storeId={store.id} branches={branches} lists={priceLists} overrides={priceOverrides} products={products} run={run} busy={busy} expanded /></div>
              <div hidden={catalogView !== 'products'} role="tabpanel" id="catalog-panel-products" aria-labelledby="catalog-tab-products">
              <CatalogEditor
                store={store}
                products={products}
                categories={categories}
                allSales={allStoreSales.length > 0 ? allStoreSales : sales}
                run={run}
                busy={busy}
                role={role}
              />
              </div>
              </>
            )}
            {tab === "settings" && manager && (
              <StoreSettings
                initialView={pushEntry?.view === 'settings' ? 'app' : register ? 'general' : 'locations'}
                store={store}
                categories={categories}
                registers={registers}
                branches={branches}
                ledgers={ledgers}
                members={members}
                invitations={invitations}
                role={role}
                userId={session.user.id}
                run={run}
                busy={busy}
              />
            )}
            {tab === "ai" && manager && (
              <AIAssistant
                store={store}
                products={products}
                shifts={shifts}
                sales={allStoreSales.length > 0 ? allStoreSales : sales}
                movements={movements}
                role={role}
                ownerEmail={session.user.email}
              />
            )}
          </>
        )}
      </main>
      <ThermalReceiptModal
        sale={ticket}
        isOpen={!!ticket}
        onClose={() => setTicket(null)}
      />
      <AiAssistantWidget
        storeName={store.name}
        currentTab={tab === 'ai' ? undefined : tab}
        products={products}
        cart={cart}
        total={cart.reduce((sum, i) => sum + i.subtotal, 0)}
        shifts={shifts}
        sales={manager && allStoreSales.length > 0 ? allStoreSales : sales}
        movements={movements}
        role={role}
        isOpen={isAiOpen}
        onToggle={setIsAiOpen}
      />
    </div>
  );
}
