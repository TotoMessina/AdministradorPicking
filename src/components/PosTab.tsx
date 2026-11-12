import { ShoppingBag, Package } from 'lucide-react';
import { AiAssistantWidget } from './AiAssistantWidget';
import { money } from './pos/posHelpers';
import { usePosTab, type PosTabProps } from './pos/usePosTab';
import { PosCatalog } from './pos/PosCatalog';
import { PosSalePanel } from './pos/PosSalePanel';
import { PosMobileCartBar } from './pos/PosMobileCartBar';
import { PosCreditModal } from './pos/PosCreditModal';
import { PosManualItemModal } from './pos/PosManualItemModal';

/** Pantalla Vender: búsqueda, carrito, cobro y venta fiada. */
export function PosTab(props: PosTabProps) {
  const state = usePosTab(props);
  const {
    products, cart, storeName, onOpenAi, method, mobilePosView, internalAiOpen, setInternalAiOpen, total,
    count, showProducts, showSale,
  } = state;
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
      <PosCatalog state={state} />
      <PosSalePanel state={state} />
      <PosMobileCartBar state={state} />
      <PosCreditModal state={state} />
      <PosManualItemModal state={state} />
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
