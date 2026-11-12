import { useEffect, useState } from 'react';
import type { KioscoSale } from '../../../types/kiosco';
import { retail, errorMessage, type Shift } from '../api';
import { CASH_DENOMINATIONS, cashDenominationsTotal } from '../../../services/cashDenominations';
import { money } from './money';

/** Cierres anteriores de la caja, con su detalle. */
export function ShiftHistory({
  storeId,
  shiftId,
  closure,
  onTicket,
  onClose,
}: {
  storeId: string;
  shiftId: string;
  closure?: Shift;
  onTicket: (sale: KioscoSale) => void;
  onClose: () => void;
}) {
  const [sales, setSales] = useState<KioscoSale[]>([]);
  const [tickets, setTickets] = useState<number | null>(closure?.ticket_count ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (closure?.ticket_count == null) void retail.shiftTicketCount(shiftId)
      .then(total => { if (active) setTickets(total); }).catch(() => {});
    retail
      .sales(storeId, shiftId)
      .then((rows) => {
        if (active) setSales(rows);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId, shiftId, closure?.ticket_count]);
  return (
    <section className="history-detail">
      <div className="section-heading">
        <h3>Detalle del cierre</h3>
        <button className="text-button" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
      {(closure?.ticket_count ?? tickets) != null && <p><strong>{closure?.ticket_count ?? tickets} tickets</strong> · Todos los medios de pago.</p>}
      {closure?.closing_denominations && <div className="cash-closing-breakdown">
        <h4>Billetes declarados</h4>
        <dl>{CASH_DENOMINATIONS.filter(amount => (closure.closing_denominations?.[amount] || 0) > 0).map(amount => <div key={amount}>
          <dt>{money(amount)}</dt><dd>{closure.closing_denominations?.[amount]} billetes</dd>
        </div>)}</dl>
        <p>Subtotal detallado: <strong>{money(cashDenominationsTotal(closure.closing_denominations))}</strong></p>
        <p>Efectivo contado: <strong>{money(Number(closure.counted_cash))}</strong></p>
        {Number(closure.counted_cash) > cashDenominationsTotal(closure.closing_denominations) && <small>Sin detallar: {money(Number(closure.counted_cash) - cashDenominationsTotal(closure.closing_denominations))}</small>}
      </div>}
      {loading ? (
        <p role="status">Cargando historial…</p>
      ) : error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : sales.length ? (
        sales.map((s) => (
          <div className="team-row" key={s.id}>
            <span>
              {s.ticketNumber} · {s.date} {s.timestamp}
              <small>
                {s.paymentMethod} · {money(s.total)}
              </small>
            </span>
            <button className="text-button" onClick={() => onTicket(s)}>
              Ver ticket
            </button>
          </div>
        ))
      ) : (
        <p>No hay ventas para consultar en esta caja.</p>
      )}
    </section>
  );
}
