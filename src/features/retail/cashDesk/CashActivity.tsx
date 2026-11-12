import { MovementVoucherLink } from '../MovementVoucherLink';
import { MovementReceipt, receiptNumber } from '../MovementReceipt';
import { SectionNav } from '../SectionNav';
import { SaleReturn, SaleReturnBadge, saleNet } from '../SaleReturn';
import { money } from './money';
import { ShiftHistory } from './ShiftHistory';
import type { CashDeskState } from './useCashDesk';

/** Actividad de la caja y cierres anteriores. */
export function CashActivity({ state }: { state: CashDeskState }) {
  const {
    storeId, register, shift, shifts, sales, movements, canOperate, run, busy, onTicket, cashierMode,
    openingOnly, canRefund, storeInfo, setActivity, currentActivity, activityName, historyShift,
    setHistoryShift, receipt, setReceipt,
  } = state;
  return (
    <>
      {!openingOnly && <section className="retail-panel cash-activity" aria-label="Actividad de esta caja">
        <h2>{shift ? 'Qué pasó en esta caja' : cashierMode ? 'Tus últimos cierres' : 'Últimos cierres de esta caja'}</h2>
        {shift && <SectionNav name={activityName} label="Consultar actividad" value={currentActivity} onChange={setActivity}
          sections={[{ id: 'movements', label: `Movimientos (${movements.length})` }, { id: 'sales', label: `Ventas (${sales.length})` }, { id: 'history', label: 'Cierres' }]} />}
        {shift && <>
          <section role="tabpanel" id={`${activityName}-panel-sales`} aria-labelledby={`${activityName}-tab-sales`} hidden={currentActivity !== 'sales'}>
            <h3>Ventas de esta caja</h3>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Lista de ventas de esta caja">
              <table className="cash-responsive-table" role="table" aria-label="Ventas de esta caja">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Hora</th>
                    <th>Medio</th>
                    <th>Total</th>
                    <th>Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} role="row">
                      <td role="cell" data-label="Ticket">{s.ticketNumber}<SaleReturnBadge sale={s} /><small>{s.priceListName} · {s.ledgerName}</small></td>
                      <td role="cell" data-label="Hora">{s.timestamp}</td>
                      <td role="cell" data-label="Medio">{s.paymentMethod}</td>
                      <td role="cell" data-label="Total">{money(saleNet(s))}{!!s.returnedTotal && <small className="sale-amount-original">{money(s.total)}</small>}</td>
                      <td role="cell" data-label="Comprobante">
                        <button
                          className="text-button"
                          onClick={() => onTicket(s)}
                        >
                          Ver ticket
                        </button>
                        <SaleReturn storeId={storeId} sale={s} shiftId={canOperate ? shift?.id : undefined} canRefund={canRefund} run={run} busy={busy} />
                      </td>
                    </tr>
                  ))}
                  {!sales.length && (
                    <tr>
                      <td colSpan={5} className="table-empty">
                        Todavía no hay ventas en esta caja.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section role="tabpanel" id={`${activityName}-panel-movements`} aria-labelledby={`${activityName}-tab-movements`} hidden={currentActivity !== 'movements'}>
            <h3>Ingresos y retiros</h3>
            <div className="cash-movement-list" tabIndex={0} role="region" aria-label="Lista de ingresos y retiros">
            {movements.map((m) => (
              <div key={m.id} className="team-row">
                <span>
                  {m.reason}
                  <small>
                    {m.type} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("es-AR")}
                  </small>
                  {m.category === 'supplier_payment' && <small>Pago a proveedor · {m.supplier_name}</small>}
                  {m.category === 'other' && <small>Otro retiro</small>}
                  {!cashierMode && m.voucher_url && shift && <MovementVoucherLink store={storeId} shift={shift.id} reference={m.voucher_url} />}
                  {storeInfo && <button type="button" className="text-button" onClick={() => setReceipt({ series: m.type === 'INGRESO' ? 'income' : 'payment', number: m.receipt_number, amount: m.amount, at: m.created_at,
                    concept: m.reason, counterpart: m.supplier_name, source: m.type === 'RETIRO' ? `Efectivo · ${register?.name || 'Caja'}` : null,
                    destination: m.type === 'INGRESO' ? `Efectivo · ${register?.name || 'Caja'}` : null, actor: m.actor_email })}>
                    {m.receipt_number ? `Recibo N° ${receiptNumber(m.receipt_number)}` : 'Recibo'}</button>}
                </span>
                <strong>
                  {m.type === "RETIRO" ? "−" : "+"}
                  {money(m.amount)}
                </strong>
              </div>
            ))}
            {!movements.length && <p>No se registraron ingresos ni retiros.</p>}
            </div>
            {receipt && storeInfo && <MovementReceipt store={storeInfo} receipt={receipt} onClose={() => setReceipt(null)} />}
          </section>
        </>}
      <section className="cash-history" role={shift ? 'tabpanel' : undefined} id={`${activityName}-panel-history`} aria-labelledby={shift ? `${activityName}-tab-history` : undefined} hidden={currentActivity !== 'history'}>
        {shift && <h3>{cashierMode ? 'Tus últimos cierres' : 'Últimos cierres de esta caja'}</h3>}
        {historyShift && (
          <ShiftHistory
            key={historyShift}
            storeId={storeId}
            shiftId={historyShift}
            closure={shifts.find(closed => closed.id === historyShift)}
            onTicket={onTicket}
            onClose={() => setHistoryShift("")}
          />
        )}
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Lista de cierres">
          <table className="cash-responsive-table" role="table" aria-label={cashierMode ? 'Tus últimos cierres' : 'Cierres de esta caja'}>
            <thead>
              <tr>
                <th>Cierre</th>
                <th>Tickets</th>
                {!cashierMode && <th>Esperado</th>}
                <th>{cashierMode ? 'Efectivo declarado' : 'Contado'}</th>
                {!cashierMode && <th>Diferencia</th>}
                {cashierMode && <th>Estado</th>}
                <th>Historial</th>
              </tr>
            </thead>
            <tbody>
              {shifts
                .filter((s) => s.register_id === register?.id && s.closed_at)
                .map((s) => {
                  const diff = Number(s.counted_cash) - Number(s.expected_cash);
                  return (
                    <tr key={s.id} role="row">
                      <td role="cell" data-label="Cierre">{new Date(s.closed_at!).toLocaleString("es-AR")}</td>
                      <td role="cell" data-label="Tickets">{s.ticket_count ?? '—'}</td>
                      {!cashierMode && <td role="cell" data-label="Esperado">{money(s.expected_cash || 0)}</td>}
                      <td role="cell" data-label={cashierMode ? 'Efectivo declarado' : 'Contado'}>{money(s.counted_cash || 0)}</td>
                      {!cashierMode && (
                        <td role="cell" data-label="Diferencia">
                          {diff === 0 ? (
                            <span className="diff-badge-exact">$0 (Exacto)</span>
                          ) : diff > 0 ? (
                            <span className="diff-badge-surplus">+{money(diff)} (Sobrante)</span>
                          ) : (
                            <span className="diff-badge-deficit">{money(diff)} (Faltante)</span>
                          )}
                        </td>
                      )}
                      {cashierMode && (
                        <td role="cell" data-label="Estado">
                          <span className="blind-audit-badge-closed">
                            Arqueado y cerrado
                          </span>
                        </td>
                      )}
                      <td role="cell" data-label="Historial">
                        <button
                          className="text-button"
                          onClick={() => setHistoryShift(s.id)}
                        >
                          Ver cierre
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {!shifts.some(s => s.register_id === register?.id && s.closed_at) && <tr><td colSpan={cashierMode ? 5 : 6} className="table-empty">Todavía no hay cierres disponibles para esta caja.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      </section>}
    </>
  );
}
