import { X, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { availableForCart } from '../../services/productComposition';
import { money } from './posHelpers';
import { CartQuantityInput } from './CartQuantityInput';
import type { PosTabState } from './usePosTab';

/** Renglones del carrito. */
export function PosCartItems({ state }: { state: PosTabState }) {
  const {
    products, cart, setCart, notify, busy, cartItemsRef, shouldScrollToBottom, add, updateItemQty,
    showProducts,
  } = state;
  return (
    <>
      <div className="cart-items" ref={cartItemsRef}>
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
              onClick={showProducts}
            >
              <ArrowLeft size={15} />
              <span>Ir a productos</span>
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
                  onClick={() => {
                    shouldScrollToBottom.current = false;
                    setCart((prev) =>
                      prev.filter((i) => i.product.id !== item.product.id),
                    );
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="cart-item-bottom">
                <div className="quantity-control">
                  <button
                    disabled={busy}
                    aria-label={`Restar una unidad de ${item.product.name}`}
                    onClick={() => {
                      shouldScrollToBottom.current = false;
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
                      );
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <CartQuantityInput
                    item={item}
                    availableStock={availableForCart(item.product, cart, products)}
                    disabled={busy}
                    onUpdateQty={(qty) => updateItemQty(item.product.id, qty)}
                    onNotify={(msg) => notify("warning", msg)}
                  />
                  <button
                    disabled={
                      busy ||
                      (item.product.code !== "MANUAL" &&
                        item.qty >= availableForCart(item.product, cart, products))
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
    </>
  );
}
