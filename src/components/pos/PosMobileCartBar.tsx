import { ArrowRight } from 'lucide-react';
import { money } from './posHelpers';
import type { PosTabState } from './usePosTab';

/** Resumen de la venta en el celular. */
export function PosMobileCartBar({ state }: { state: PosTabState }) {
  const { cart, total, count, showSale } = state;
  return (
    <>
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
    </>
  );
}
