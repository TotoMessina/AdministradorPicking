import { NumberInput } from '../../components/NumberInput';
import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Bot, Loader2, Sparkles } from "lucide-react";
import type { KioscoSale } from "../../types/kiosco";
import { groqChat } from "../../services/groqService";
import {
  retail,
  errorMessage,
  type Movement,
  type Register,
  type Shift,
} from "./api";
import type { Run } from "./Management";
import { cashInSale } from './payments';
import { CashMovementForm } from './CashMovementForm';
import { MovementVoucherLink } from './MovementVoucherLink';
import { SectionNav } from './SectionNav';
import { CashDenominationFields } from './CashDenominationFields';
import { CASH_DENOMINATIONS, cashDenominationsFromDraft, cashDenominationsTotal, closingCashDenominations, type CashDenominationDraft } from '../../services/cashDenominations';
import './cash-desk.css';
const money = (v: number) =>
  "$" + Number(v).toLocaleString("es-AR", { maximumFractionDigits: 2 });
export function CashDesk({
  storeId,
  register,
  shift,
  shifts,
  sales,
  movements,
  canOperate,
  run,
  busy,
  onTicket,
  onRefresh,
  occupiedByOther = false,
  cashierMode = false,
  onSell,
  active = true,
  openFromSale = false,
  onOpened,
  hasPendingSale = false,
  openShift = retail.openShift,
  openingOnly = false,
  closeRequest = 0,
  onCloseRequestHandled,
  allowIncome = true,
  allowWithdrawal = true,
}: {
  storeId: string;
  register: Register | undefined;
  shift: Shift | undefined;
  shifts: Shift[];
  sales: KioscoSale[];
  movements: Movement[];
  canOperate: boolean;
  run: Run;
  busy: boolean;
  onTicket: (sale: KioscoSale) => void;
  onRefresh: () => void;
  occupiedByOther?: boolean;
  cashierMode?: boolean;
  onSell?: () => void;
  active?: boolean;
  openFromSale?: boolean;
  onOpened?: () => void;
  hasPendingSale?: boolean;
  openShift?: (store: string, register: string, opening: number) => Promise<unknown>;
  openingOnly?: boolean;
  closeRequest?: number;
  onCloseRequestHandled?: () => void;
  allowIncome?: boolean;
  allowWithdrawal?: boolean;
}) {
  const taskId = useId();
  const [task, setTask] = useState<'movement' | 'close'>('movement');
  const currentTask = allowIncome || allowWithdrawal ? task : 'close';
  const [activity, setActivity] = useState('movements');
  const currentActivity = shift ? activity : 'history';
  const activityName = `${taskId}-activity`;
  const taskName = `${taskId}-task`;
  const taskPanel = useRef<HTMLDivElement>(null);
  const taskActions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active && closeRequest) {
      setTask('close');
      onCloseRequestHandled?.();
    }
  }, [active, closeRequest, onCloseRequestHandled]);
  useEffect(() => {
    if (active && !taskActions.current?.contains(document.activeElement))
      taskPanel.current?.querySelector<HTMLElement>('section:not([hidden]) h2')?.focus();
  }, [active, currentTask]);
  const openingRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active && openFromSale && !shift && !occupiedByOther) openingRef.current?.focus();
  }, [active, openFromSale, shift, occupiedByOther]);
  const [counted, setCounted] = useState("");
  const countedRef = useRef<HTMLInputElement>(null);
  const [includeDenominations, setIncludeDenominations] = useState(false);
  const [denominationDraft, setDenominationDraft] = useState<CashDenominationDraft>({});
  const [closingError, setClosingError] = useState('');
  const [ticketCount, setTicketCount] = useState<number | null>(shift?.ticket_count ?? null);
  const availableTickets = new Set(sales.map(sale => sale.id)).size;
  const closingTickets = Math.max(ticketCount ?? 0, availableTickets);
  useEffect(() => {
    let current = true;
    setTicketCount(shift?.ticket_count ?? null);
    if (active && shift) void retail.shiftTicketCount(shift.id)
      .then(total => { if (current) setTicketCount(total); })
      .catch(() => { /* The available local sales remain visible; closing is not blocked. */ });
    return () => { current = false; };
  }, [active, shift?.id, shift?.ticket_count, sales]);
  const [historyShift, setHistoryShift] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiController = useRef<AbortController | null>(null);
  const [movementBusy, setMovementBusy] = useState(false);
  const [serverBalance, setServerBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState('');
  useEffect(() => {
    let active = true;
    setServerBalance(null); setBalanceError('');
    if (cashierMode && shift) void retail.shiftBalance(shift.id)
      .then(value => { if (active) setServerBalance(value); })
      .catch(error => { if (active) setBalanceError(errorMessage(error)); });
    return () => { active = false; };
  }, [cashierMode, shift?.id, sales, movements]);

  // Reset analysis when shift changes
  useEffect(() => {
    aiController.current?.abort();
    setIsAiLoading(false);
    setAiAnalysis(null);
    setAiError(null);
    return () => aiController.current?.abort();
  }, [shift?.id]);

  const cash = sales
    .reduce((n, s) => n + cashInSale(s), 0);
  const electronic = sales
    .reduce((n, s) => n + s.total - cashInSale(s), 0);
  const expected = serverBalance ?? (
    Number(shift?.opening_cash || 0) +
    cash +
    movements.reduce(
      (n, m) => n + (m.type === "INGRESO" ? 1 : -1) * Number(m.amount),
      0,
    ));

  const handleAnalyzeShift = async () => {
    if (cashierMode || !shift || isAiLoading) return;
    const controller = new AbortController();
    aiController.current = controller;
    setIsAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);

    try {
      // 1. Calculate top selling product(s) from sales[].items
      const productMap = new Map<string, { name: string; qty: number; subtotal: number }>();
      for (const sale of sales) {
        for (const item of sale.items || []) {
          const key = item.productId || item.name;
          const curr = productMap.get(key) || { name: item.name, qty: 0, subtotal: 0 };
          curr.qty += item.qty;
          curr.subtotal += item.subtotal;
          productMap.set(key, curr);
        }
      }
      const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
      const topProduct = sortedProducts[0]
        ? `${sortedProducts[0].name} (${sortedProducts[0].qty} u., ${money(sortedProducts[0].subtotal)})`
        : "Sin productos vendidos en este turno";

      // 2. Dominant payment method
      const methodTotals: Record<string, { count: number; total: number }> = {};
      let grandTotal = 0;
      for (const sale of sales) {
        const m = sale.paymentMethod || "Efectivo";
        if (!methodTotals[m]) methodTotals[m] = { count: 0, total: 0 };
        methodTotals[m].count += 1;
        methodTotals[m].total += sale.total;
        grandTotal += sale.total;
      }
      const sortedMethods = Object.entries(methodTotals).sort((a, b) => b[1].total - a[1].total);
      const dominantMethod = sortedMethods[0]
        ? `${sortedMethods[0][0]} (${money(sortedMethods[0][1].total)}, ${Math.round((sortedMethods[0][1].total / (grandTotal || 1)) * 100)}% del total)`
        : "Sin ventas registradas";

      // 3. Difference evaluation
      const countedValue = counted !== "" ? Number(counted) : null;
      let diffEval = "Conteo físico aún no ingresado";
      if (countedValue !== null) {
        const diff = countedValue - expected;
        if (diff === 0) {
          diffEval = "Caja exacta ($0 de diferencia)";
        } else if (diff > 0) {
          diffEval = `Diferencia positiva / sobrante de ${money(diff)}`;
        } else {
          diffEval = `Diferencia negativa / faltante de ${money(Math.abs(diff))}`;
        }
      }

      // 4. Movements summary
      const movementsSummary = movements.length
        ? movements.map((m) => `${m.type}: ${money(Number(m.amount))} (${m.reason})`).join("; ")
        : "Sin movimientos manuales";

      const systemPrompt =
        "Sos un analista de negocio para kioscos argentinos. Analizás el " +
        "cierre de turno y brindás insights accionables. Sé conciso, práctico " +
        "y usá formato simple (sin markdown complejo). Hablá en primera persona " +
        "del plural (nosotros/nuestro negocio).";

      const userPrompt = `Analizá los siguientes datos de nuestro cierre de turno:
- Fondo inicial de caja: ${money(shift?.opening_cash || 0)}
- Ventas en efectivo: ${money(cash)}
- Ventas electrónicas (QR / tarjetas): ${money(electronic)}
- Facturación total del turno: ${money(grandTotal)} (${sales.length} ventas)
- Movimientos manuales: ${movementsSummary}
- Efectivo esperado en caja: ${money(expected)}
- Efectivo contado físicamente: ${countedValue !== null ? money(countedValue) : "No ingresado aún"}
- Evaluación de diferencia: ${diffEval}
- Producto más vendido: ${topProduct}
- Método dominante: ${dominantMethod}
- Otros productos destacados: ${sortedProducts.slice(1, 5).map((p) => `${p.name} (${p.qty}u)`).join(", ") || "Ninguno"}

Respondé obligatoriamente respetando exactamente este formato:
RESUMEN: [2 oraciones]
PRODUCTO ESTRELLA: [nombre y cantidad]
MÉTODO DOMINANTE: [método y porcentaje]
DIFERENCIA DE CAJA: [evaluación]
SUGERENCIAS: 1. [...] 2. [...] 3. [...]`;

      const response = await groqChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], { signal: controller.signal });

      if (!controller.signal.aborted) setAiAnalysis(response);
    } catch (err) {
      if (controller.signal.aborted) return;
      setAiError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el análisis del turno."
      );
    } finally {
      if (!controller.signal.aborted) setIsAiLoading(false);
    }
  };

  return (
    <div className="cash-workspace cash-workspace-adaptive">
      {balanceError && <div className="error-banner" role="alert"><p>No se pudo consultar el saldo del turno. Actualizá antes de cerrar. {balanceError}</p><button type="button" className="secondary-button" disabled={busy} onClick={onRefresh}>Actualizar turno</button></div>}
      <div className="section-heading">
        <div>
          <h2>{shift ? 'Mi turno' : 'Abrir turno'}</h2>
          <p>
            {shift
              ? `Desde ${new Date(shift.opened_at).toLocaleString("es-AR")}`
              : "Confirmá el efectivo inicial antes de vender."}
          </p>
        </div>
        <span className="cash-turn-state">{shift ? 'Turno abierto' : occupiedByOther ? 'Caja ocupada' : 'Sin turno abierto'}</span>
      </div>
      {shift && (
          <section className="cash-summary cash-turn-summary" aria-label="Resumen del turno">
          <div className="cash-metrics">
            <div>
              <small>Efectivo inicial</small>
              <strong>{money(shift.opening_cash)}</strong>
            </div>
            {cashierMode ? (
              <>
                <div>
                  <small>Ventas del turno</small>
                  <strong>{sales.length} {sales.length === 1 ? 'ticket' : 'tickets'}</strong>
                </div>
                <div>
                  <small>QR, transferencias y tarjetas</small>
                  <strong>{money(electronic)}</strong>
                </div>
                <div className="blind-audit-metric-card">
                  <small>Al cerrar turno</small>
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
                <div>
                  <small>Efectivo esperado</small>
                  <strong>{money(expected)}</strong>
                </div>
              </>
            )}
          </div>
          </section>
      )}
      <div className="cash-shift-layout" data-operating={!shift || canOperate} data-single={openingOnly}>
      <div className="cash-operation">
      {!shift ? (
        <section className="retail-panel cash-opening" aria-label="Apertura de turno">
          <p>Ingresá el efectivo que hay en esta caja antes de empezar.</p>
          {occupiedByOther && <div className="info-banner" role="status"><span>Esta caja está ocupada. Elegí otra disponible o actualizá cuando termine el turno actual.</span><button type="button" className="secondary-button" disabled={!active || busy} onClick={onRefresh}>Actualizar cajas</button></div>}
          <form
            className="retail-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const opening = Number(
                new FormData(e.currentTarget).get("opening"),
              );
              if (active && register?.active && !occupiedByOther && !busy && await run(
                  () => openShift(storeId, register.id, opening),
                  "Turno abierto",
                )) onOpened?.();
            }}
          >
            <label>
              Efectivo inicial ($)
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
              Abrir turno
            </button>
          </form>
        </section>
      ) : (
        <>
          {!canOperate && (
            <div className="info-banner">
              Esta caja no está disponible para operar. Actualizá los datos y seleccioná una caja habilitada.
            </div>
          )}
          {canOperate && <div className="cash-operation-nav" ref={taskActions}>
            <SectionNav name={taskName} label="Acciones de tu turno" value={currentTask} disabled={busy || movementBusy}
              onChange={value => setTask(value as 'movement' | 'close')}
              sections={[...(allowIncome || allowWithdrawal ? [{ id: 'movement', label: 'Registrar movimiento' }] : []), { id: 'close', label: 'Cerrar turno' }]} />
          </div>}
          {canOperate && (
            <div className="cash-task-panels" ref={taskPanel}>
              <section className="retail-panel cash-task-panel" role="tabpanel" id={`${taskName}-panel-movement`} aria-labelledby={`${taskName}-tab-movement`} hidden={currentTask !== 'movement' || (!allowIncome && !allowWithdrawal)}>
                <h2 tabIndex={-1}>{allowIncome && allowWithdrawal ? 'Registrar ingreso o retiro' : allowIncome ? 'Registrar ingreso' : 'Registrar retiro'}</h2>
                <CashMovementForm key={shift.id} store={storeId} shift={shift.id} busy={busy} active={active && currentTask === 'movement'} run={run} onBusyChange={setMovementBusy} allowIncome={allowIncome} allowWithdrawal={allowWithdrawal} />
              </section>
              <section className="retail-panel cash-task-panel" role="tabpanel" id={`${taskName}-panel-close`} aria-labelledby={`${taskName}-tab-close`} hidden={currentTask !== 'close'}>
                <h2 tabIndex={-1}>Cerrar turno</h2>
                <div className="cash-close-tickets" aria-live="polite">
                  <strong>{closingTickets} {closingTickets === 1 ? 'ticket' : 'tickets'}</strong>
                  <span>Todos los medios de pago; cada venta cuenta una vez.</span>
                  <small>{ticketCount === null ? 'Recuento de las ventas disponibles en este dispositivo.' : 'El total definitivo se confirma al sincronizar el cierre.'}</small>
                </div>
                <p>
                  Contá todo el efectivo de esta caja. Al confirmar, se guarda el conteo y termina el turno.
                </p>
                <small>{cashierMode ? 'Administración revisará las diferencias. Solo tenés que ingresar lo que contaste.' : 'El esperado incluye todos los ajustes del turno, también los de administración.'}</small>
                <form
                  className="retail-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!active || currentTask !== 'close' || busy || hasPendingSale || movementBusy || (cashierMode && serverBalance === null)) return;
                    let denominations: ReturnType<typeof closingCashDenominations>;
                    try {
                      denominations = closingCashDenominations(includeDenominations ? cashDenominationsFromDraft(denominationDraft) : null, Number(counted));
                      setClosingError('');
                    } catch (error) {
                      setClosingError(errorMessage(error));
                      countedRef.current?.focus();
                      return;
                    }
                    if (
                      window.confirm(
                        `¿Cerrar el turno de ${register?.name} con ${money(Number(counted))} contados?`,
                      )
                    ) {
                      if (
                        await run(
                          () => retail.closeShift(shift.id, Number(counted), denominations),
                          `Turno cerrado. Conteo guardado: ${money(Number(counted))}.`,
                        )
                      ) {
                        setCounted("");
                        setIncludeDenominations(false);
                        setDenominationDraft({});
                        setClosingError('');
                        setAiAnalysis(null);
                        setAiError(null);
                      }
                    }
                  }}
                >
                  <label>
                    Efectivo contado ($)
                    <NumberInput
                      ref={countedRef}
                      name="counted"
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!active || currentTask !== 'close' || busy}
                      value={counted}
                      onValueChange={(e) => { setCounted(e); setClosingError(''); }}
                    />
                  </label>
                  <CashDenominationFields enabled={includeDenominations} draft={denominationDraft} disabled={!active || currentTask !== 'close' || busy}
                    onEnabledChange={value => { setIncludeDenominations(value); setClosingError(''); }}
                    onChange={(denomination, value) => { setDenominationDraft(previous => ({ ...previous, [denomination]: value })); setClosingError(''); }}
                    onUseTotal={total => { setCounted(String(total)); setClosingError(''); countedRef.current?.focus(); }} />
                  {closingError && <p className="movement-error" role="alert">{closingError}</p>}
                  {cashierMode ? (
                    <div className="info-banner blind-audit-banner">
                      {counted === ""
                        ? "Ingresá el efectivo que contaste para cerrar el turno."
                        : `Efectivo contado: ${money(Number(counted))}.`}
                    </div>
                  ) : (
                    <div className="info-banner">
                      Diferencia:{" "}
                      {counted === ""
                        ? "Ingresá el conteo"
                        : money(Number(counted) - expected)}
                    </div>
                  )}

                  {hasPendingSale && <p role="status">Tenés una venta pendiente. {onSell ? <button type="button" className="text-button" onClick={onSell}>Volver a Vender</button> : 'Volvé a Vender'} para cobrarla o vaciarla antes de cerrar el turno.</p>}
                  <button disabled={!active || currentTask !== 'close' || busy || hasPendingSale || movementBusy || (cashierMode && serverBalance === null)} className="primary-button">
                    Confirmar cierre
                  </button>
                </form>
                <div className="cash-optional-analysis" hidden={cashierMode}>
                  {!cashierMode && (
                    <button
                      type="button"
                      className="secondary-button shift-ai-analyze-btn"
                      onClick={handleAnalyzeShift}
                      disabled={busy || isAiLoading}
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 size={16} className="ai-spin-icon" />
                          <span>Analizando turno con IA…</span>
                        </>
                      ) : (
                        <span>{aiError ? 'Reintentar explicación del turno' : 'Explicar este turno con IA'}</span>
                      )}
                    </button>
                  )}

                  {!cashierMode && aiError && (
                    <div className="shift-ai-error-banner" role="alert">
                      <AlertCircle size={16} />
                      <div>
                        <strong>No se pudo completar el análisis IA</strong>
                        <p>{aiError}</p>
                      </div>
                    </div>
                  )}

                  {!cashierMode && aiAnalysis && (
                    <div
                      className="shift-ai-analysis-card"
                      role="region"
                      aria-label="Análisis IA del turno"
                    >
                      <div className="shift-ai-card-header">
                        <Sparkles size={16} className="shift-ai-header-icon" />
                        <h4>Análisis Inteligente del Turno</h4>
                      </div>
                      <div className="shift-ai-card-content">
                        {aiAnalysis
                          .split("\n")
                          .filter(Boolean)
                          .map((line, idx) => {
                            const separatorIndex = line.indexOf(":");
                            if (separatorIndex !== -1) {
                              const label = line.slice(0, separatorIndex).trim();
                              const val = line.slice(separatorIndex + 1).trim();
                              return (
                                <div key={idx} className="shift-ai-metric-row">
                                  <span className="shift-ai-label">
                                    {label}:
                                  </span>
                                  <span className="shift-ai-value">{val}</span>
                                </div>
                              );
                            }
                            return (
                              <p key={idx} className="shift-ai-text-line">
                                {line}
                              </p>
                            );
                          })}
                      </div>
                    </div>
                  )}

                </div>
              </section>
            </div>
          )}
        </>
      )}
      </div>
      {!openingOnly && <section className="retail-panel cash-activity" aria-label="Actividad de esta caja">
        <h2>{shift ? 'Actividad del turno' : cashierMode ? 'Tus últimos cierres' : 'Últimos cierres de esta caja'}</h2>
        {shift && <SectionNav name={activityName} label="Consultar actividad" value={currentActivity} onChange={setActivity}
          sections={[{ id: 'movements', label: `Movimientos (${movements.length})` }, { id: 'sales', label: `Ventas (${sales.length})` }, { id: 'history', label: 'Cierres' }]} />}
        {shift && <>
          <section role="tabpanel" id={`${activityName}-panel-sales`} aria-labelledby={`${activityName}-tab-sales`} hidden={currentActivity !== 'sales'}>
            <h3>Ventas del turno</h3>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Lista de ventas del turno">
              <table className="cash-responsive-table" role="table" aria-label="Ventas del turno">
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
                      <td role="cell" data-label="Ticket">{s.ticketNumber}<small>{s.priceListName} · {s.ledgerName}</small></td>
                      <td role="cell" data-label="Hora">{s.timestamp}</td>
                      <td role="cell" data-label="Medio">{s.paymentMethod}</td>
                      <td role="cell" data-label="Total">{money(s.total)}</td>
                      <td role="cell" data-label="Comprobante">
                        <button
                          className="text-button"
                          onClick={() => onTicket(s)}
                        >
                          Ver ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!sales.length && (
                    <tr>
                      <td colSpan={5} className="table-empty">
                        Todavía no hay ventas en este turno.
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
                </span>
                <strong>
                  {m.type === "RETIRO" ? "−" : "+"}
                  {money(m.amount)}
                </strong>
              </div>
            ))}
            {!movements.length && <p>No se registraron ingresos ni retiros.</p>}
            </div>
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
      </div>
    </div>
  );
}

function ShiftHistory({
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
        <p>No hay ventas disponibles para consultar en este turno.</p>
      )}
    </section>
  );
}
