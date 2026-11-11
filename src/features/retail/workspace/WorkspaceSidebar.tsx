import { Store as StoreIcon, ShoppingBag, Wallet, Package, Settings2, LogOut, Camera, ChevronDown, MapPin, Truck, UserRound, TrendingUp, Landmark, House } from 'lucide-react';
import { AiIcon } from '../../../components/AiIcon';
import { retail, errorMessage } from '../api';
import { OfflineStatus } from '../OfflineStatus';
import { ServicePushToggle } from '../ServicePushToggle';
import type { Tab } from './workspaceTab';
import type { WorkspaceState } from './useWorkspace';

/** Menú lateral y barra inferior en el celular. */
export function WorkspaceSidebar({ state }: { state: WorkspaceState }) {
  const {
    session, store, onCreate, onSignOut, notify, role, tab, setTab, setOpenFromSale, guiding, branches,
    branchId, setPosMobileView, setBranchDrawerOpen, setIsAiOpen, busy, manager, can, canOpenCatalog,
    canOpenSettings, canOpenSuppliers, canUseCustomers, canUseMoney, pendingRemitos, mobileTabs, run,
    confirmLeave,
  } = state;
  return (
    <>
      <header className="app-sidebar">
        <div className="brand">
          <span className="brand-mark">
            <StoreIcon size={22} />
          </span>
          <span className="store-brand-name">
            <span className="store-brand-title">
              <span className="store-brand-text">{store.name}</span>
              <OfflineStatus />
              {branches.length > 1 && (
                <button
                  type="button"
                  className="branch-slide-trigger"
                  onClick={() => setBranchDrawerOpen(true)}
                  title={`Cambiar sucursal o caja (${branches.find((b) => b.id === branchId)?.name || 'Sucursal'})`}
                  aria-label={`Cambiar sucursal o caja. Sucursal actual: ${branches.find((b) => b.id === branchId)?.name || 'Sucursal'}`}
                >
                  <MapPin size={11} aria-hidden="true" />
                  <span className="branch-slide-name">
                    {branches.find((b) => b.id === branchId)?.name || 'Sucursal'}
                  </span>
                  <ChevronDown size={11} aria-hidden="true" />
                </button>
              )}
            </span>
          </span>
        </div>
        <nav aria-label="Navegación principal" style={{ '--nav-count': mobileTabs.length, '--nav-index': Math.max(0, mobileTabs.indexOf(tab)) } as React.CSSProperties}>
          {(
            [
              { id: "home", label: "Inicio", icon: House },
              { id: "pos", label: "Vender", icon: ShoppingBag },
              { id: "cash", label: "Caja", icon: Wallet },
              ...(manager
                ? [
                    {
                      id: "catalog",
                      label: "Productos y stock",
                      icon: Package,
                    },
                    { id: "suppliers", label: "Proveedores", icon: Truck },
                    { id: "finance", label: "Ganancias", icon: TrendingUp },
                    ...(canUseMoney ? [{ id: "money", label: "Plata", icon: Landmark }] : []),
                    { id: "customers", label: "Clientes", icon: UserRound },
                    { id: "settings", label: "Mi comercio", icon: Settings2 },
                  ]
                : [...(canOpenCatalog ? [{ id: 'catalog', label: 'Productos y stock', icon: Package }] : []), ...(canOpenSuppliers ? [{ id: 'suppliers', label: 'Proveedores', icon: Truck }] : []), ...(canUseMoney ? [{ id: 'money', label: 'Plata', icon: Landmark }] : []), ...(canUseCustomers ? [{ id: 'customers', label: 'Clientes', icon: UserRound }] : []), ...(canOpenSettings ? [{ id: 'settings', label: 'Mi comercio', icon: Settings2 }] : []), ...(can('submit_remito') ? [{ id: 'remito', label: 'Remito', icon: Camera }] : [])]),
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              disabled={busy || guiding}
              className={`nav-item ${tab === id ? "active" : ""}${id === 'finance' || id === 'money' || id === 'customers' ? ' nav-item-desktop' : ''}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setOpenFromSale(false);
                setTab(id as Tab);
                setIsAiOpen(false);
                setPosMobileView("catalog");
                if (window.matchMedia("(max-width: 760px)").matches) window.scrollTo(0, 0);
              }}
            >
              <Icon size={18} />
              <span className="desktop-nav-label">{label}</span>
              <span className="mobile-nav-label">{{ home: "Inicio", pos: "Vender", cash: "Caja", catalog: "Productos", suppliers: "Proveedores", finance: "Ganancias", money: "Plata", customers: "Clientes", settings: "Comercio", ai: "Asistente", remito: 'Remito' }[id]}</span>
              {id === 'catalog' && pendingRemitos.records.length > 0 && <span className="remito-nav-badge" aria-label={`${pendingRemitos.records.length} remitos pendientes`}>{pendingRemitos.records.length > 99 ? '99+' : pendingRemitos.records.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-ai-dock">
          <button
            type="button"
            className="sidebar-ai-btn ai-action ai-action-strong"
            disabled={busy || guiding}
            onClick={() => setIsAiOpen(true)}
            title="Abrir Asistente IA del comercio"
          >
            <AiIcon size={16} />
            <span className="sidebar-ai-btn-text">Asistente IA</span>
          </button>
        </div>
        <div id="account-actions" className="sidebar-bottom">
          <div className="account-info">
            <strong>
              {
                {
                  owner: "Propietario",
                  admin: "Administrador",
                  supervisor: "Supervisor",
                  cashier: "Cajero",
                }[role]
              }
            </strong>
            <small>{session.user.email}</small>
          </div>
          {/* Quien no tiene Mi comercio activa acá los avisos del servicio en su dispositivo. */}
          {!manager && !canOpenSettings && <ServicePushToggle storeId={store.id} userId={session.user.id} />}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (!guiding) void confirmLeave().then(ok => { if (ok) onCreate(); });
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
              void confirmLeave().then(ok => { if (ok) void onSignOut().catch((e) => notify("error", errorMessage(e))); });
            }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </header>
    </>
  );
}
