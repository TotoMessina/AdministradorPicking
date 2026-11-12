import { NumberInput } from '../../../components/NumberInput';
import type { CashDeskState } from './useCashDesk';

/** Abrir la caja. */
export function CashOpening({ state }: { state: CashDeskState }) {
  const { storeId, register, run, busy, onRefresh, occupiedByOther, active, onOpened, openShift, openingRef } = state;
  return (
    <>
      <section className="retail-panel cash-opening" aria-label="Abrir la caja">
        <p>Contá la plata que hay ahora en esta caja. Si no hay nada, dejá 0.</p>
        {occupiedByOther && <div className="info-banner" role="status"><span>Esta caja está ocupada. Elegí otra disponible o actualizá cuando se cierre.</span><button type="button" className="secondary-button" disabled={!active || busy} onClick={onRefresh}>Actualizar cajas</button></div>}
        <form
          className="retail-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const opening = Number(
              new FormData(e.currentTarget).get("opening"),
            );
            if (active && register?.active && !occupiedByOther && !busy && await run(
                () => openShift(storeId, register.id, opening),
                "Caja abierta",
              )) onOpened?.();
          }}
        >
          <label>
            ¿Cuánta plata hay en la caja? ($)
            <NumberInput
              ref={openingRef}
              disabled={!active || busy || !register?.active || occupiedByOther}
              name="opening"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue="0"
            />
          </label>
          <button className="primary-button" disabled={!active || busy || !register || occupiedByOther || !register.active}>
            Abrir la caja
          </button>
        </form>
      </section>
    </>
  );
}
