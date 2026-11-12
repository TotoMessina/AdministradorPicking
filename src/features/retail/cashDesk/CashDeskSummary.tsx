import { money } from './money';
import type { CashDeskState } from './useCashDesk';

/** Encabezado y resumen del turno. */
export function CashDeskSummary({ state }: { state: CashDeskState }) {
  const {
    shift, sales, occupiedByOther, cashierMode, cash, electronic, expected, cashIncome, cashOut,
    cashOther,
  } = state;
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{shift ? 'Mi caja' : 'Abrir la caja'}</h2>
          <p>
            {shift
              ? `Desde ${new Date(shift.opened_at).toLocaleString("es-AR")}`
              : "Contá la plata antes de empezar a vender."}
          </p>
        </div>
        <span className="cash-turn-state">{shift ? 'Caja abierta' : occupiedByOther ? 'Caja ocupada' : 'Caja cerrada'}</span>
      </div>
      {shift && (
          <section className="cash-summary cash-turn-summary" aria-label="Resumen de la caja">
          <div className="cash-metrics">
            <div>
              <small>Plata al abrir</small>
              <strong>{money(shift.opening_cash)}</strong>
            </div>
            {cashierMode ? (
              <>
                <div>
                  <small>Ventas de esta caja</small>
                  <strong>{sales.length} {sales.length === 1 ? 'ticket' : 'tickets'}</strong>
                </div>
                <div>
                  <small>QR, transferencias y tarjetas</small>
                  <strong>{money(electronic)}</strong>
                </div>
                <div className="blind-audit-metric-card">
                  <small>Al cerrar la caja</small>
                  <strong className="blind-audit-status">
                    <span className="blind-audit-dot" aria-hidden="true" />
                    Contá el efectivo
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <small>Ventas en efectivo</small>
                  <strong>{money(cash)}</strong>
                </div>
                <div>
                  <small>QR, transferencias y tarjetas</small>
                  <strong>{money(electronic)}</strong>
                </div>
                <div className={expected < 0 ? 'is-negative' : undefined}>
                  <small>Debería haber</small>
                  <strong>{money(expected)}</strong>
                </div>
              </>
            )}
          </div>
          {!cashierMode && <details className="cash-expected" open={expected < 0}>
            <summary>¿De dónde sale «Debería haber»?</summary>
            <dl>
              <div><dt>Abriste con</dt><dd>{money(Number(shift.opening_cash || 0))}</dd></div>
              <div><dt>+ Ventas en efectivo</dt><dd>{money(cash)}</dd></div>
              {cashIncome > 0 && <div><dt>+ Ingresos de plata</dt><dd>{money(cashIncome)}</dd></div>}
              {cashOut > 0 && <div><dt>− Retiros y pagos</dt><dd>{money(cashOut)}</dd></div>}
              {cashOther !== 0 && <div><dt>{cashOther > 0 ? '+' : '−'} Otros (cobros de fiado y devoluciones en efectivo)</dt><dd>{money(Math.abs(cashOther))}</dd></div>}
              <div className="cash-expected-total"><dt>= Debería haber en la caja</dt><dd>{money(expected)}</dd></div>
            </dl>
            {expected < 0 && <p role="status" className="cash-expected-warning">Sacaste más efectivo del que entró en esta caja. Revisá los retiros: si alguno se pagó con plata de otro lado (una cuenta, otra caja), conviene registrarlo desde ahí. Al cerrar vas a ver la diferencia con lo que cuentes.</p>}
            <p className="cash-expected-note">QR, tarjetas y transferencias no están en la caja: van a tus cuentas.</p>
          </details>}
          </section>
      )}
    </>
  );
}
