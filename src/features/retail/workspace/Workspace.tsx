import { RefreshCw } from 'lucide-react';
import { ThermalReceiptModal } from '../../../components/ThermalReceiptModal';
import { AiAssistantWidget } from '../../../components/AiAssistantWidget';
import { HomeTab } from '../HomeTab';
import { SaleLedgerControl } from '../SaleLedgerControl';
import { PushWelcome } from '../PushWelcome';
import { QuickRemito } from '../QuickRemito';
import { GuidedStart } from '../GuidedStart';
import { SubscriptionNotice } from '../SubscriptionNotice';
import { PlatformAnnouncements } from '../PlatformAnnouncements';
import { SponsoredCard } from '../SponsoredCard';
import { useWorkspace, type WorkspaceProps } from './useWorkspace';
import { WorkspaceBranchDrawer } from './WorkspaceBranchDrawer';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspacePosTab } from './WorkspacePosTab';
import { WorkspaceCashTab } from './WorkspaceCashTab';
import { WorkspaceCatalogTab } from './WorkspaceCatalogTab';
import { WorkspaceSettingsTab } from './WorkspaceSettingsTab';
import { WorkspaceOtherTabs } from './WorkspaceOtherTabs';

/** Pantalla del comercio elegido: menú, pestañas y venta. */
export function Workspace(props: WorkspaceProps) {
  const state = useWorkspace(props);
  const {
    session, store, pushWelcomeDone, onPushWelcomeDone, role, pushEntry, tab, setTab, mainRef,
    settingsView, setSettingsView, guiding, guideReady, guideStatus, categories, products, registers,
    branches, branchId, setBranchId, branchSelection, ledgers, setRegisterId, shifts, sales, lastSale,
    allStoreSales, movements, cart, posMobileView, ticket, setTicket, isAiOpen, setIsAiOpen, loading,
    busy, error, shift, register, occupiedByOther, manager, can, canOpenCatalog, canUseCustomers,
    debtors, pendingRemitos, branchPricing, canOperate, lowStock, soldToday, soldWeek, goToProducts,
    homeActions, run, showTicket, handleSaleLedgerChange, refreshAll,
  } = state;
  return (
    <div
      className={`app-shell retail-app mobile-tab-${tab}${cart.length ? " has-mobile-cart" : ""}${tab === "pos" && canOperate ? " pos-shift-open" : ""}${tab === "pos" && posMobileView === "checkout" ? " pos-mobile-checkout-active" : ""}`}
      style={{ "--store-accent": store.accent_color } as React.CSSProperties}
    >
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      {manager && !loading && guideReady && !guiding && !pushWelcomeDone && tab === 'settings' && settingsView === 'app' && !isAiOpen && !busy && !cart.length && <PushWelcome
        storeId={store.id} storeName={store.name} userId={session.user.id} onDone={onPushWelcomeDone} />}
      <WorkspaceBranchDrawer state={state} />
      <WorkspaceSidebar state={state} />
      <main id="main-content" className="main-content" ref={mainRef}>
        {manager && !loading && <GuidedStart store={store} userId={session.user.id} branches={branches} registers={registers}
          register={register} shift={shift} occupied={occupiedByOther} categories={categories} products={products}
          busy={busy} run={run} showResume={tab === 'settings'} onStatus={guideStatus} autoStart={!pushEntry && !cart.length && !isAiOpen} hasPendingSale={cart.length > 0}
          onRegisterChange={id => { const next = registers.find(r => r.id === id); if (next) { branchSelection.current = next.branch_id; setBranchId(next.branch_id); setRegisterId(id); } }}
          onSell={() => setTab('pos')} onSettings={() => { setSettingsView('locations'); setTab('settings'); }} onRefresh={refreshAll} />}
        <div hidden={guiding}>
        {/* Fuera de Vender: el aviso no compite con el cobro. */}
        <PlatformAnnouncements selling={tab === 'pos'} />
        {manager && <div hidden={tab === 'pos'}><SubscriptionNotice storeId={store.id} /></div>}
        {lastSale && tab === 'pos' && <div className="last-sale"><span>Última venta: ${lastSale.total.toLocaleString('es-AR')}</span><button type="button" className="text-button" onClick={() => showTicket(sales.find(s => s.id === lastSale.id) || lastSale)}>Ver último ticket</button>
          <SaleLedgerControl key={lastSale.id} storeId={store.id} sale={sales.find(s => s.id === lastSale.id) || lastSale} ledgers={ledgers} disabled={busy} canMove={can('move_sale_ledger')}
            onMoved={handleSaleLedgerChange} />
        </div>}
        <div className="page-heading">
          <div>
            <h1>
              <span className="desktop-page-title">
              {
                {
                  home: "Inicio",
                  pos: "Vender",
                  cash: "Caja",
                  catalog: "Productos y precios",
                  suppliers: "Proveedores",
                  finance: "Ganancias",
                  money: "Plata",
                  customers: "Clientes",
                  settings: "Mi comercio",
                  ai: "Asistente de negocio",
                  remito: 'Cargar remito',
                }[tab]
              }
              </span>
              <span className="mobile-page-title">{{ home: "Inicio", pos: "Vender", cash: "Caja", catalog: "Productos", suppliers: "Proveedores", finance: "Ganancias", money: "Plata", customers: "Clientes", settings: "Mi comercio", ai: "Asistente", remito: 'Cargar remito' }[tab]}</span>
            </h1>
            <p>{{ home: '¿Qué querés hacer ahora?', pos: 'Buscá, agregá y cobrá. Todo desde el mismo lugar.', cash: 'Abrí la caja, poné o sacá plata y cerrala contando el efectivo.', catalog: 'Mantené tus productos, existencias y precios al día.', suppliers: 'Cuánto debés, qué pagaste y las facturas de cada proveedor.', money: 'Cuentas, efectivo de cada local, pases, ingresos y retiros.', finance: 'Cuánto vendiste, cuánto gastaste y cuánto te quedó.', customers: 'Quién te debe, el fiado y los cobros.', settings: 'Organizá tu comercio y elegí cómo trabajar.', ai: 'Consultá los datos de tu comercio y prepará tu próximo paso.', remito: 'Una foto, las cantidades y la aprobación del encargado.' }[tab]}</p>
          </div>
          <div className={`register-picker ${tab !== 'pos' && tab !== 'cash' ? 'context-picker-hidden' : ''}`}>
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
        {loading ? (
          <div className="retail-panel workspace-loading" role="status">
            <RefreshCw size={24} className="loading-spin" aria-hidden="true" />
            Cargando los datos del comercio…
          </div>
        ) : (
          <>
            <div hidden={tab !== 'home'}>
              <HomeTab place={[branches.find(branch => branch.id === branchId)?.name, register?.name].filter(Boolean).join(' · ') || store.name} cashOpen={!!shift} sold={soldToday} week={soldWeek} lowStock={lowStock}
                remitos={can('review_remitos') ? pendingRemitos.records.length : 0} actions={homeActions} disabled={busy || guiding}
                onLowStock={canOpenCatalog ? goToProducts : undefined} onRemitos={canOpenCatalog ? () => { goToProducts(); setTimeout(() => document.getElementById('pending-remitos')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250); } : undefined}
                debtors={canUseCustomers ? debtors : []} onCustomers={canUseCustomers ? () => setTab('customers') : undefined}
                sponsored={manager ? <SponsoredCard storeId={store.id} enabled={tab === 'home' && !guiding} /> : undefined} />
            </div>
            <WorkspacePosTab state={state} />
            <WorkspaceCashTab state={state} />
            <WorkspaceCatalogTab state={state} />
            <WorkspaceSettingsTab state={state} />
            <WorkspaceOtherTabs state={state} />
          </>
        )}
        {!manager && !loading && <div hidden={tab !== 'remito' || !can('submit_remito')}><QuickRemito key={store.id} store={store.id} branches={branches} branchId={branchId} products={products} run={run} busy={busy} /></div>}
        </div>
      </main>
      <ThermalReceiptModal
        sale={ticket}
        isOpen={!!ticket}
        onClose={() => setTicket(null)}
        store={store}
      />
      {!guiding && <AiAssistantWidget
        storeName={store.name}
        currentTab={tab}
        products={products}
        cart={cart}
        total={cart.reduce((sum, i) => sum + i.subtotal, 0)}
        shifts={shifts}
        sales={manager && allStoreSales.length > 0 ? allStoreSales : sales}
        movements={movements}
        role={role}
        isOpen={isAiOpen}
        onToggle={setIsAiOpen}
        onOpenFull={can('use_ai') ? () => { setIsAiOpen(false); setTab('ai'); } : undefined}
      />}
    </div>
  );
}
