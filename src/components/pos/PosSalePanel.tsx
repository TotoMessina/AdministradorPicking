import { Trash2, ArrowLeft } from 'lucide-react';
import type { PosTabState } from './usePosTab';
import { PosCartItems } from './PosCartItems';
import { PosCheckout } from './PosCheckout';

/** Panel de la venta actual: carrito y cobro. */
export function PosSalePanel({ state }: { state: PosTabState }) {
  const {
    cart, setCart, stationControls, setCash, busy, clearPending, setClearPending, setMobilePosView,
    count, showProducts,
  } = state;
  return (
    <>
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
        <PosCartItems state={state} />
        </section>
        <PosCheckout state={state} />
      </aside>
    </>
  );
}
