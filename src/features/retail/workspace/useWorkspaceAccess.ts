import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingBag, Wallet, Camera, ArrowLeftRight, Banknote, UserRound, ClipboardList, TrendingUp, Landmark, PackagePlus } from 'lucide-react';
import type { KioscoSale } from '../../../types/kiosco';
import { retail, type Register, type Branch } from '../api';
import type { HomeAction } from '../HomeTab';
import { resolveSaleLedger } from '../ledgerRouting';
import { catalogPermissions, settingsPermissions, type Permission } from '../permissions';
import { hasComposition, productsAtBranch, stockForSale } from '../../../services/productComposition';
import { useBranchPriceList } from '../useBranchPriceList';
import { usePendingReplenishments } from '../usePendingReplenishments';
import { saleNet } from '../SaleReturn';
import type { Customer } from '../api';
import type { WorkspaceProps } from './useWorkspace';
import type { useWorkspaceState } from './useWorkspaceState';

/** Permisos, caja y lista de la venta, y accesos de Inicio. */
export function useWorkspaceAccess(ctx: WorkspaceProps & ReturnType<typeof useWorkspaceState>) {
  const {
    session, store, notify, role, permissions, tab, setTab, cashView, setCashView, setCatalogView,
    uploadInvoice, categories, products, registers, availability, branches, branchId, customers,
    setCustomers, setOrdersFocus, priceLists, ledgers, ledgerId, setLedgerId, automaticLedger,
    ledgerSnapshot, registerId, shifts, sales, allStoreSales, cart, loading, busy,
  } = ctx;
  const shift = shifts.find(
    (s) => s.register_id === registerId && !s.closed_at,
  );
  const register = registers.find((r) => r.id === registerId);
  const occupiedByOther = !shift && availability.some(r => r.register_id === registerId && r.occupied);
  const manager = role === "owner" || role === "admin";
  const can = (action: Permission) => manager || permissions.includes(action);
  const canReviewSales = can('view_sales') || can('attach_invoice');
  const canOpenCatalog = manager || catalogPermissions.some(can);
  const canOpenSettings = manager || settingsPermissions.some(can);
  const canOpenSuppliers = can('manage_products') || can('manage_supplier_accounts');
  const canUseCustomers = can('sell') || can('manage_customers');
  // Plata: cuentas, efectivo de locales y depósito, pases, ingresos y retiros (antes en Productos → Dinero).
  const canUseMoney = can('manage_funds');
  const canManageCustomers = can('manage_customers');
  // Sin conexión o sin la actualización de Supabase, se conserva la última lista y Vender sigue funcionando.
  const loadCustomers = useCallback(async () => { if (canUseCustomers) setCustomers(await retail.customers(store.id).catch(() => customersRef.current)); }, [canUseCustomers, store.id]);
  const customersRef = useRef<Customer[]>([]);
  customersRef.current = customers;
  const debtors = useMemo(() => customers.filter(customer => customer.balance > 0), [customers]);
  // Saldos al día al entrar a Inicio, Vender o Clientes.
  useEffect(() => { if (tab === 'home' || tab === 'pos' || tab === 'customers') void loadCustomers(); }, [tab, loadCustomers]);
  const [managementLocations, setManagementLocations] = useState<{ branches: Branch[]; registers: Register[] } | null>(null);
  const [managementLocationError, setManagementLocationError] = useState('');
  const configurationBranches = !manager && managementLocations ? managementLocations.branches : branches;
  const configurationRegisters = !manager && managementLocations ? managementLocations.registers : registers;
  const pendingRemitos = usePendingReplenishments(store.id, can('review_remitos'));
  const branchPricing = useBranchPriceList(store.id, branchId, priceLists, manager, cart.length > 0);
  const priceListId = branchPricing.priceListId;
  const branchRegisters = registers.filter(r => r.active && r.branch_id === branchId);
  const saleLists = priceLists.filter(l => (!l.branch_id || l.branch_id === branchId) && (l.active || l.id === priceListId));
  const saleLedgers = ledgers.filter(l => l.active || l.id === ledgerId);
  const priceListName = priceListId ? priceLists.find(l => l.id === priceListId)?.name || 'Lista no disponible' : 'Precio del catálogo';
  if (!cart.length) ledgerSnapshot.current = null;
  else if (!ledgerSnapshot.current && ledgers.length) ledgerSnapshot.current = ledgers.map(l => ({ ...l, payment_methods: [...(l.payment_methods || [])] }));
  const routingLedgers = ledgerSnapshot.current || ledgers;
  const ledgerForPayment = (method: KioscoSale['paymentMethod']) => resolveSaleLedger(routingLedgers, method, automaticLedger ? undefined : ledgerId);
  const ledgerName = automaticLedger ? 'Automático por medio de pago' : ledgers.find(l => l.id === ledgerId)?.name || 'Sin registro disponible';
  const hasPrimaryList = saleLists.some(l => l.is_primary && l.active);
  const canChooseList = manager && (saleLists.filter(l => l.active).length + (hasPrimaryList ? 0 : 1) > 1);
  const canChooseLedger = saleLedgers.filter(l => l.active).length > 1 || saleLedgers.some(l => l.id === ledgerId && !l.active);
  const mobileTabs = ['home', 'pos', 'cash', ...(canOpenCatalog ? ['catalog'] : []), ...(canOpenSuppliers ? ['suppliers'] : []), ...(canOpenSettings ? ['settings'] : []), ...(!manager && can('submit_remito') ? ['remito'] : [])];
  const canOperate =
    !!shift && !!register?.active && (manager || shift.opened_by === session.user.id);
  const openableRegister = !shift && !occupiedByOther && !!register?.active;
  const lowStock = useMemo(() => productsAtBranch(products, store.branch_inventory_enabled ? branchId : undefined)
    .filter(product => !hasComposition(product) && product.code !== 'MANUAL' && stockForSale(product) <= product.minStock)
    .map(product => product.name), [products, store.branch_inventory_enabled, branchId]);
  const soldToday = useMemo(() => {
    if (!manager) return null;
    const today = new Date().toDateString();
    const rows = (allStoreSales.length > 0 ? allStoreSales : sales).filter(sale => sale.createdAt && new Date(sale.createdAt).toDateString() === today);
    return { total: rows.reduce((sum, sale) => sum + saleNet(sale), 0), tickets: rows.length };
  }, [manager, allStoreSales, sales]);
  const soldWeek = useMemo(() => {
    if (!manager) return [];
    const rows = allStoreSales.length > 0 ? allStoreSales : sales;
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - 6 + index);
      const day = date.toDateString();
      const total = rows.filter(sale => sale.createdAt && new Date(sale.createdAt).toDateString() === day).reduce((sum, sale) => sum + saleNet(sale), 0);
      return { day, total, label: index === 6 ? 'Hoy' : date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '') };
    });
  }, [manager, allStoreSales, sales]);
  const goToProducts = () => { setCatalogView('products'); setTab('catalog'); };
  const homeActions: HomeAction[] = [
    ...(can('sell') ? [{ id: 'sell', label: 'Vender', hint: cart.length ? 'Tenés una venta sin cobrar' : canOperate ? 'Buscá el producto y cobrá' : 'Primero abrís la caja', icon: ShoppingBag, main: true, onClick: () => setTab('pos') }] : []),
    { id: 'cash', label: 'Caja', hint: canOperate ? 'Contar la plata y cerrar' : 'Abrir o ver la caja', icon: Wallet, onClick: () => { setCashView('shift'); setTab('cash'); } },
    ...(can('manage_products') && categories.length ? [{ id: 'receive', label: 'Recibir mercadería', hint: 'Sacale una foto a la factura', icon: Camera, onClick: uploadInvoice }]
      : canOpenCatalog && can('replenish_stock') ? [{ id: 'receive', label: 'Recibir mercadería', hint: 'Sumá lo que llegó', icon: PackagePlus, onClick: goToProducts }] : []),
    ...(can('manage_transfers') ? [{ id: 'transfer', label: 'Pasar mercadería', hint: 'De un local a otro', icon: ArrowLeftRight, onClick: () => { setCatalogView('transfers'); setTab('catalog'); } }] : []),
    ...(can('manage_supplier_accounts') ? [{ id: 'pay', label: 'Pagar a proveedores', hint: 'Ver cuánto debo', icon: Banknote, onClick: () => setTab('suppliers') }] : []),
    ...(canOpenSuppliers && lowStock.length ? [{ id: 'order', label: 'Hacer pedido', hint: lowStock.length === 1 ? '1 producto por reponer' : `${lowStock.length} productos por reponer`, icon: ClipboardList, onClick: () => { setOrdersFocus(value => value + 1); setTab('suppliers'); } }] : []),
    ...(canUseCustomers ? [{ id: 'customers', label: 'Clientes', hint: debtors.length ? `${debtors.length} te deben` : 'Fiado y cobros', icon: UserRound, onClick: () => setTab('customers') }] : []),
    ...(manager ? [{ id: 'finance', label: 'Ganancias', hint: 'Cuánto te quedó este mes', icon: TrendingUp, onClick: () => setTab('finance') }] : []),
    ...(canUseMoney ? [{ id: 'money', label: 'Plata', hint: 'Cuentas, pases y retiros', icon: Landmark, onClick: () => setTab('money') }] : []),
  ];
  useEffect(() => {
    if (!loading && ((tab === 'settings' && !canOpenSettings) || (tab === 'ai' && !can('use_ai')) || (tab === 'catalog' && !canOpenCatalog) || (tab === 'suppliers' && !canOpenSuppliers) || (tab === 'finance' && !manager) || (tab === 'money' && !canUseMoney) || (tab === 'customers' && !canUseCustomers))) setTab('pos');
  }, [loading, manager, canOpenCatalog, canOpenSettings, permissions, tab]);
  useEffect(() => {
    if (!loading && tab === 'remito' && !manager && !permissions.includes('submit_remito')) setTab('cash');
    if (!loading && cashView === 'overview' && !manager && !permissions.includes('view_sales') && !permissions.includes('attach_invoice')) setCashView('shift');
  }, [loading, manager, permissions, tab, cashView]);
  const previousPricing = useRef({ branch: '', id: '' });
  useEffect(() => {
    if (branchPricing.loading || branchPricing.error || !branchId) return;
    if (previousPricing.current.branch === branchId && previousPricing.current.id !== priceListId) {
      notify('info', `Lista de precios para la próxima venta: ${priceListName}.`);
    }
    previousPricing.current = { branch: branchId, id: priceListId };
  }, [branchId, priceListId, priceListName, branchPricing.loading, branchPricing.error, notify]);
  useEffect(() => {
    if (loading || busy || cart.length || ledgers.some(l => l.id === ledgerId && l.active)) return;
    const next = ledgers.find(l => l.active && l.is_default) || ledgers.find(l => l.active);
    if (next) {
      setLedgerId(next.id);
      if (ledgerId && !automaticLedger) notify('info', `El registro anterior ya no está disponible. La próxima venta usará ${next.name}.`);
    }
  }, [loading, busy, cart.length, ledgers, ledgerId, automaticLedger, notify]);
  return { shift, register, occupiedByOther, manager, can, canReviewSales, canOpenCatalog, canOpenSettings, canOpenSuppliers, canUseCustomers, canUseMoney, canManageCustomers, loadCustomers, customersRef, debtors, managementLocations, setManagementLocations, managementLocationError, setManagementLocationError, configurationBranches, configurationRegisters, pendingRemitos, branchPricing, priceListId, branchRegisters, saleLists, saleLedgers, priceListName, routingLedgers, ledgerForPayment, ledgerName, hasPrimaryList, canChooseList, canChooseLedger, mobileTabs, canOperate, openableRegister, lowStock, soldToday, soldWeek, goToProducts, homeActions, previousPricing };
}
