import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import type { KioscoCartItem, KioscoSale } from '../../../types/kiosco';
import type { Role, Category, Product, Register, Shift, Movement, Member, Invitation, Branch, PriceList, PriceOverride, SalesLedger } from '../api';
import type { Permission } from '../permissions';
import { initialPushIntent } from '../push';
import { useMobileScreenMotion } from '../useMobileExperience';
import type { Customer } from '../api';
import { setErrorContext } from '../../../lib/errorReporting';
import { setAiUsageContext } from '../../../lib/aiUsage';
import type { Tab } from './workspaceTab';
import type { WorkspaceProps } from './useWorkspace';

/** Estado de la pantalla: pestaña, vistas, datos cargados y venta en curso. */
export function useWorkspaceState(ctx: WorkspaceProps) {
  const { store, onPushWelcomeDone } = ctx;
  const { notify } = useToast();
  const [role, setRole] = useState<Role>("cashier");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pushEntry] = useState(() => {
    const intent = initialPushIntent();
    return intent?.storeId === store.id ? intent : null;
  });
  const [tab, setTab] = useState<Tab>(pushEntry?.view === 'transfers' ? 'catalog' : pushEntry?.view || 'home');
  const mainRef = useRef<HTMLElement>(null);
  useMobileScreenMotion(mainRef, tab);
  const [cashView, setCashView] = useState(pushEntry?.view === 'cash' ? 'overview' : 'shift');
  const [openFromSale, setOpenFromSale] = useState(false);
  const [closeRequest, setCloseRequest] = useState(0);
  const [catalogView, setCatalogView] = useState(pushEntry?.view === 'transfers' ? 'transfers' : 'products');
  const [invoiceRequest, setInvoiceRequest] = useState(0);
  const invoiceReturn = useRef<Tab>('suppliers');
  const uploadInvoice = () => { invoiceReturn.current = tab; setCatalogView('products'); setTab('catalog'); setInvoiceRequest(value => value + 1); };
  const [settingsView, setSettingsView] = useState(pushEntry?.view === 'settings' ? 'app' : 'general');
  const [guiding, setGuiding] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const guideStatus = useCallback((ready: boolean, visible: boolean) => {
    setGuideReady(ready); setGuiding(visible);
    if (visible) onPushWelcomeDone();
  }, [onPushWelcomeDone]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [availability, setAvailability] = useState<{ register_id: string; occupied: boolean }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ordersFocus, setOrdersFocus] = useState(0);
  const [financeView, setFinanceView] = useState<'month' | 'branches' | 'bank'>('month');
  useEffect(() => {
    setErrorContext({ storeId: store.id, branchId, screen: tab });
    return () => setErrorContext(null);
  }, [store.id, branchId, tab]);
  const branchSelection = useRef('');
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [ledgers, setLedgers] = useState<SalesLedger[]>([]);
  const [ledgerId, setLedgerId] = useState('');
  const [automaticLedger, setAutomaticLedger] = useState(true);
  const ledgerSnapshot = useRef<SalesLedger[] | null>(null);
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
  const saleInProgress = useRef(false);
  saleInProgress.current = cart.length > 0;
  const [posMobileView, setPosMobileView] = useState<"catalog" | "checkout">("catalog");
  const [branchDrawerOpen, setBranchDrawerOpen] = useState(false);
  const [ticket, setTicket] = useState<KioscoSale | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  useEffect(() => {
    // Atribuye el uso de IA al comercio y a la pantalla; el asistente flotante cuenta como asistente.
    setAiUsageContext({ storeId: store.id, screen: isAiOpen ? 'ai' : tab });
    return () => setAiUsageContext(null);
  }, [store.id, tab, isAiOpen]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    if (!branchDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBranchDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [branchDrawerOpen]);
  const checkoutRequest = useRef({ signature: "", id: "" });
  const running = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  return { notify, role, setRole, permissions, setPermissions, pushEntry, tab, setTab, mainRef, cashView, setCashView, openFromSale, setOpenFromSale, closeRequest, setCloseRequest, catalogView, setCatalogView, invoiceRequest, setInvoiceRequest, invoiceReturn, uploadInvoice, settingsView, setSettingsView, guiding, setGuiding, guideReady, setGuideReady, guideStatus, categories, setCategories, products, setProducts, registers, setRegisters, availability, setAvailability, branches, setBranches, branchId, setBranchId, customers, setCustomers, ordersFocus, setOrdersFocus, financeView, setFinanceView, branchSelection, priceLists, setPriceLists, priceOverrides, setPriceOverrides, ledgers, setLedgers, ledgerId, setLedgerId, automaticLedger, setAutomaticLedger, ledgerSnapshot, revision, setRevision, registerId, setRegisterId, shifts, setShifts, sales, setSales, lastSale, setLastSale, allStoreSales, setAllStoreSales, movements, setMovements, members, setMembers, invitations, setInvitations, cart, setCart, saleInProgress, posMobileView, setPosMobileView, branchDrawerOpen, setBranchDrawerOpen, ticket, setTicket, isAiOpen, setIsAiOpen, loading, setLoading, busy, setBusy, error, setError, ledgerLoading, setLedgerLoading, checkoutRequest, running, generation, alive };
}
