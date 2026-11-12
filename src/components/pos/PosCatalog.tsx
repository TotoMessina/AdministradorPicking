import { Search, Barcode, X, Plus } from 'lucide-react';
import { QuickProducts } from '../../features/retail/QuickProducts';
import { formatPackStock, unitsPerPack } from '../../services/inventoryUnits';
import { availableForCart, stockForSale } from '../../services/productComposition';
import { money } from './posHelpers';
import type { PosTabState } from './usePosTab';

/** Búsqueda y botonera de productos. */
export function PosCatalog({ state }: { state: PosTabState }) {
  const {
    products, cart, isLoading, storeId, branchId, canCustomizeQuick, query, setQuery, busy,
    setManualModalOpen, searchRef, add, searchMatches, search,
  } = state;
  return (
    <>
      <section className="catalog" aria-label="Botonera de venta">
        <form className="search-box" onSubmit={search}>
          <Search size={21} />
          <input
            ref={searchRef}
            aria-label="Buscar producto o escanear código"
            placeholder="Buscá un producto o escaneá su código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          ) : null}
          <Barcode size={22} />
        </form>

        {query.trim() ? (
          <div className="pos-search-results" aria-label="Resultados de búsqueda">
            <div className="pos-search-results-header">
              <span>Resultados para "{query.trim()}" ({searchMatches.length})</span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                Cerrar búsqueda
              </button>
            </div>
            {searchMatches.length === 0 ? (
              <div className="empty-state">
                <Search size={28} />
                <p>No encontramos productos con ese nombre o código.</p>
              </div>
            ) : (
              <div className="pos-search-grid">
                {searchMatches.slice(0, 16).map((p) => {
                  const qty = cart.find((i) => i.product.id === p.id)?.qty || 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={busy || !!p.pricingError || availableForCart(p, cart, products) <= qty}
                      className={`pos-search-item ${qty ? "in-cart" : ""}`}
                      onClick={() => {
                        add(p);
                        setQuery("");
                      }}
                      aria-label={p.pricingError ? `${p.name}: ${p.pricingError}` : `Agregar ${p.name}, ${money(p.price)}`}
                    >
                      <span className="pos-search-emoji">{p.emoji || "📦"}</span>
                      <div className="pos-search-info">
                        <strong>{p.name}</strong>
                        <small>{p.category} · {unitsPerPack(p.pack_size) > 1 ? formatPackStock(stockForSale(p), p.pack_size) : stockForSale(p) <= 0 ? "Sin stock" : `${stockForSale(p).toLocaleString('es-AR')} disp.`}{p.depotStock ? ` · ${p.depotStock.toLocaleString('es-AR')} en depósito` : ''}</small>
                      </div>
                      <strong className="pos-search-price">{p.pricingError || money(p.price)}</strong>
                      <span className="add-product"><Plus size={16} /></span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {storeId && branchId && (
          <QuickProducts
            storeId={storeId}
            branchId={branchId}
            products={products}
            manager={canCustomizeQuick}
            onAdd={add}
            onOpenManual={() => setManualModalOpen(true)}
            disabled={busy || !!isLoading}
          />
        )}
      </section>
    </>
  );
}
