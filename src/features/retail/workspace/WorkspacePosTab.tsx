import { Wallet, Tag, BookOpen, ChevronDown } from 'lucide-react';
import { PosTab } from '../../../components/PosTab';
import { retail } from '../api';
import { NumberInput } from '../../../components/NumberInput';
import { productsForList } from '../pricing';
import { productsAtBranch } from '../../../services/productComposition';
import type { WorkspaceState } from './useWorkspace';

/** Pestaña Vender, con lista y registro de la venta. */
export function WorkspacePosTab({ state }: { state: WorkspaceState }) {
  const {
    store, tab, setTab, setCashView, setOpenFromSale, setCatalogView, setSettingsView, guiding, products,
    branchId, customers, priceLists, priceOverrides, ledgerId, setLedgerId, automaticLedger,
    setAutomaticLedger, cart, setCart, posMobileView, setPosMobileView, isAiOpen, setIsAiOpen, busy,
    error, shift, register, occupiedByOther, manager, can, canUseCustomers, canManageCustomers,
    branchPricing, priceListId, saleLists, saleLedgers, priceListName, ledgerForPayment, ledgerName,
    hasPrimaryList, canChooseList, canChooseLedger, canOperate, openableRegister, run, completeSale,
  } = state;
  const nonPrimaryList = !!priceListId && !saleLists.find(l => l.id === priceListId)?.is_primary;
  const posStationControls = canOperate && (canChooseList || canChooseLedger || nonPrimaryList) ? (
    <div className="pos-station-buttons" role="toolbar" aria-label="Opciones de venta">
      {canChooseList ? (
        <label
          className="pos-station-btn-pill"
          title={cart.length > 0 ? "Vaciá el carrito para cambiar la lista de precios" : "Cambiar lista de precios"}
        >
          <span className="pos-station-btn-icon" aria-hidden="true">
            <Tag size={13} />
          </span>
          <span className="pos-station-btn-text">
            <span className="pos-station-btn-tag">Precios</span>
            <strong className="pos-station-btn-val">{priceListName}</strong>
          </span>
          <span className="pos-station-btn-arrow" aria-hidden="true">
            <ChevronDown size={13} />
          </span>
          <select
            disabled={busy || cart.length > 0 || branchPricing.loading}
            value={priceListId}
            onChange={e => branchPricing.select(e.target.value)}
            className="pos-station-btn-select"
            aria-label="Seleccionar lista de precios"
          >
            {(!hasPrimaryList || !priceListId) && <option value="">Precio del catálogo</option>}
            {saleLists.map(l => (
              <option key={l.id} value={l.id} disabled={!l.active}>
                {l.name}{!l.active && ' (inactiva)'}
              </option>
            ))}
          </select>
        </label>
      ) : nonPrimaryList ? (
        // Sin poder elegir, se avisa solo si este local no vende con la Principal.
        <div className="pos-station-btn-pill static" title="Lista de precios de este local">
          <span className="pos-station-btn-icon" aria-hidden="true"><Tag size={13} /></span>
          <span className="pos-station-btn-text"><span className="pos-station-btn-tag">Precios</span><strong className="pos-station-btn-val">{priceListName}</strong></span>
        </div>
      ) : null}

      {canChooseLedger ? (
        <label
          className="pos-station-btn-pill"
          title={cart.length > 0 ? "Vaciá el carrito para cambiar el registro de ventas" : "Cambiar registro de ventas"}
        >
          <span className="pos-station-btn-icon" aria-hidden="true">
            <BookOpen size={13} />
          </span>
          <span className="pos-station-btn-text">
            <span className="pos-station-btn-tag">Venta va a</span>
            <strong className="pos-station-btn-val">{automaticLedger ? 'Según el pago' : ledgerName}</strong>
          </span>
          <span className="pos-station-btn-arrow" aria-hidden="true">
            <ChevronDown size={13} />
          </span>
          <select
            disabled={busy || cart.length > 0}
            value={automaticLedger ? '' : ledgerId}
            onChange={e => {
              setAutomaticLedger(!e.target.value);
              if (e.target.value) setLedgerId(e.target.value);
            }}
            className="pos-station-btn-select"
            aria-label="Seleccionar registro de ventas"
          >
            <option value="">Según el medio de pago</option>
            {saleLedgers.map(l => (
              <option key={l.id} value={l.id} disabled={!l.active}>
                {l.name}{!l.active && ' (inactivo)'}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  ) : undefined;
  return (
    <>
      <div hidden={tab !== 'pos'}>
        {!canOperate ? (
          <section className="retail-panel start-selling">
            <span className="empty-icon"><Wallet size={28} /></span>
            <h2>
              {error || branchPricing.error
                ? "Actualizá los datos antes de vender"
                : !register
                  ? "No tenés una caja disponible"
                : shift || occupiedByOther
                  ? "Esta caja está en uso"
                  : "Abrí la caja para vender"}
            </h2>
            <p>
              {!register
                ? manager ? 'Agregá una caja en Mi comercio, dentro de Cajas de cobro.' : 'Pedile al administrador que revise tu asignación de sucursal y caja.'
                : occupiedByOther || (shift && !canOperate)
                ? "Elegí otra caja disponible o esperá a que se cierre. Usá Actualizar para comprobar si ya se liberó."
                : "Contá la plata que hay ahora en la caja. Si no hay nada, dejá 0."}
            </p>
            {openableRegister ? <form className="start-selling-form" onSubmit={event => {
              event.preventDefault();
              const opening = Number(new FormData(event.currentTarget).get('opening'));
              if (!busy) void run(() => retail.openShift(store.id, register!.id, opening), 'Caja abierta. ¡A vender!');
            }}>
              <label>¿Cuánta plata hay en la caja?<NumberInput name="opening" type="number" min="0" step="0.01" required defaultValue="0" disabled={busy} /></label>
              <button className="primary-button" disabled={busy}>Abrir caja y vender</button>
            </form> : <button
              className="primary-button"
              disabled={busy || (!register && !manager) || occupiedByOther || (!!shift && !canOperate)}
              onClick={() => { setOpenFromSale(true); setCashView('shift'); if (!register && manager) setSettingsView('locations'); setTab(!register && manager ? 'settings' : 'cash'); }}
            >
              {!register && manager ? 'Agregar una caja' : 'Abrir la caja'}
            </button>}
          </section>
        ) : (
          <>
          {!can('sell') && <p role="status">Tu perfil no habilita vender. Podés operar las acciones de Caja que tengas asignadas.</p>}
          <div hidden={!can('sell')}><PosTab
            active={tab === 'pos' && !guiding && !isAiOpen && can('sell')}
            isLoading={branchPricing.loading || !!branchPricing.error}
            storeId={store.id}
            branchId={branchId}
            canCustomizeQuick={can('manage_quick_products')}
            key={shift?.id}
            storeName={store.name}
            products={productsForList(productsAtBranch(products, store.branch_inventory_enabled ? branchId : undefined), priceLists.find(l => l.id === priceListId), priceOverrides, priceLists)}
            cart={cart}
            setCart={setCart}
            onCompleteSale={completeSale}
            customers={canUseCustomers ? customers : undefined}
            canOverLimit={canManageCustomers}
            billingEnabled={!!store.billing_enabled}
            saleLedgerLabel={method => ledgerForPayment(method)?.name || 'No disponible'}
            onTriggerChecklist={() => {}}
            onGoToCreateProduct={
              manager ? () => { setCatalogView('products'); setTab("catalog"); } : undefined
            }
            onOpenAi={() => setIsAiOpen(true)}
            stationControls={posStationControls}
            mobilePosView={posMobileView}
            onMobilePosViewChange={setPosMobileView}
          /></div></>
        )}
      </div>
    </>
  );
}
