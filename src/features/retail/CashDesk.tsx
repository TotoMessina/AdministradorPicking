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
}) {
  const taskId = useId();
  const [task, setTask] = useState<'movement' | 'close' | ''>('');
  const taskPanel = useRef<HTMLDivElement>(null);
  const taskActions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active && closeRequest) {
      setTask('close');
      onCloseRequestHandled?.();
    }
  }, [active, closeRequest, onCloseRequestHandled]);
  useEffect(() => {
    if (active && task) taskPanel.current?.querySelector<HTMLElement>('section:not([hidden]) h2')?.focus();
  }, [active, task]);
  const returnToActions = () => {
    const previous = task;
    setTask('');
    taskActions.current?.querySelector<HTMLButtonElement>(`button[data-task="${previous}"]`)?.focus();
  };
  const openingRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active && openFromSale && !shift && !occupiedByOther) openingRef.current?.focus();
  }, [active, openFromSale, shift, occupiedByOther]);
  const [counted, setCounted] = useState("");
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
    <div className="cash-workspace">
      {balanceError && <p className="error-banner" role="alert">No se pudo consultar el saldo del turno. Tocá Actualizar antes de cerrar. {balanceError}</p>}
      <div className="section-heading">
        <div>
          <h2>{shift ? 'Tu turno' : 'Empezar a trabajar'}</h2>
          <p>
            {shift
              ? `Desde ${new Date(shift.opened_at).toLocaleString("es-AR")}`
              : "Confirmá el efectivo inicial antes de vender."}
          </p>
        </div>
        {canOperate && onSell && <button type="button" className="secondary-button" disabled={busy} onClick={onSell}>Volver a Vender</button>}
        <button
          className="text-button"
          onClick={onRefresh}
          disabled={busy}
        >
          Actualizar
        </button>
      </div>
      {!shift ? (
        <section className="retail-panel cash-opening">
          <h2>Abrir turno</h2>
          <p>Tu turno es el tiempo que trabajás en esta caja. Ingresá el efectivo que hay antes de empezar.</p>
          {occupiedByOther && <p className="info-banner" role="status">Esta caja está ocupada. Elegí otra caja disponible o esperá a que cierre el turno actual y tocá Actualizar.</p>}
          <form
            className="retail-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const opening = Number(
                new FormData(e.currentTarget).get("opening"),
              );
              if (register?.active && !occupiedByOther && !busy && await run(
                  () => openShift(storeId, register.id, opening),
                  "Turno abierto",
                )) onOpened?.();
            }}
          >
            <label>
              Efectivo inicial ($)
              <input
                ref={openingRef}
                disabled={busy || !register?.active || occupiedByOther}
                name="opening"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue="0"
              />
            </label>
            <button className="primary-button" disabled={busy || !register || occupiedByOther || !register.active}>
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
          {canOperate && <div className="cash-task-actions" ref={taskActions} aria-label="Acciones de tu turno">
            <button type="button" className="cash-task-choice" data-task="movement" aria-expanded={task === 'movement'} aria-controls={`${taskId}-movement`} disabled={busy || movementBusy} onClick={() => setTask('movement')}>
              <strong>Registrar ingreso o retiro</strong><span>Movimientos de efectivo durante el turno.</span>
            </button>
            <button type="button" className="cash-task-choice" data-task="close" aria-expanded={task === 'close'} aria-controls={`${taskId}-close`} disabled={busy || movementBusy} onClick={() => setTask('close')}>
              <strong>Cerrar turno</strong><span>Contá el efectivo y guardá tu cierre.</span>
            </button>
          </div>}
          {canOperate && (
            <div className="cash-task-panels" ref={taskPanel} hidden={!task}>
              {task && <button type="button" className="text-button" disabled={busy || movementBusy} onClick={returnToActions}>Volver a las acciones · conservar borrador</button>}
              <section className="retail-panel cash-task-panel" id={`${taskId}-movement`} hidden={task !== 'movement'}>
                <h2 tabIndex={-1}>Registrar ingreso o retiro</h2>
                <CashMovementForm key={shift.id} store={storeId} shift={shift.id} busy={busy} run={run} onBusyChange={setMovementBusy} />
              </section>
              <section className="retail-panel cash-task-panel" id={`${taskId}-close`} hidden={task !== 'close'}>
                <h2 tabIndex={-1}>Cerrar turno</h2>
                {cashierMode ? (
                  <div className="blind-audit-indicator">
                    <div className="blind-audit-indicator-header">
                      <span className="blind-audit-badge">
                        Conteo al cierre
                      </span>
                    </div>
                    <p className="blind-audit-text">
                      Contá el efectivo e ingresá el total. El administrador revisará las diferencias; vos no necesitás calcularlas.
                    </p>
                  </div>
                ) : (
                  <small>El saldo esperado incluye todos los ajustes de tu turno, incluso los realizados por un administrador.</small>
                )}
                <p>
                  Ingresá todo el efectivo que contaste en esta caja. Al confirmar, se guarda el conteo y termina el turno.
                </p>
                <form
                  className="retail-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (hasPendingSale || movementBusy || (cashierMode && serverBalance === null)) return;
                    if (
                      window.confirm(
                        `¿Cerrar el turno de ${register?.name} con ${money(Number(counted))} contados?`,
                      )
                    ) {
                      if (
                        await run(
                          () => retail.closeShift(shift.id, Number(counted)),
                          `Turno cerrado. Conteo guardado: ${money(Number(counted))}.`,
                        )
                      ) {
                        setCounted("");
                        setAiAnalysis(null);
                        setAiError(null);
                      }
                    }
                  }}
                >
                  <label>
                    Efectivo contado ($)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={counted}
                      onChange={(e) => setCounted(e.target.value)}
                    />
                  </label>
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

                  {hasPendingSale && <p role="status">Tenés una venta pendiente. Volvé a Vender para cobrarla o vaciarla antes de cerrar el turno.</p>}
                  <button disabled={busy || hasPendingSale || movementBusy || (cashierMode && serverBalance === null)} className="primary-button">
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
          <details className="cash-summary retail-panel">
          <summary>Consultar resumen del turno</summary>
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
          </details>
          <details className="retail-panel">
            <summary>Ver ventas del turno ({sales.length})</summary>
            <div className="table-scroll">
              <table>
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
                    <tr key={s.id}>
                      <td>{s.ticketNumber}<small>{s.priceListName} · {s.ledgerName}</small></td>
                      <td>{s.timestamp}</td>
                      <td>{s.paymentMethod}</td>
                      <td>{money(s.total)}</td>
                      <td>
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
          </details>
          <details className="retail-panel">
            <summary>Ver ingresos y retiros del turno</summary>
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
          </details>
        </>
      )}
      <details className="retail-panel cash-history" hidden={openingOnly}>
        <summary>{cashierMode ? 'Consultar tus últimos cierres' : 'Consultar últimos cierres de esta caja'}</summary>
        {historyShift && (
          <ShiftHistory
            key={historyShift}
            storeId={storeId}
            shiftId={historyShift}
            onTicket={onTicket}
            onClose={() => setHistoryShift("")}
          />
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cierre</th>
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
                    <tr key={s.id}>
                      <td>{new Date(s.closed_at!).toLocaleString("es-AR")}</td>
                      {!cashierMode && <td>{money(s.expected_cash || 0)}</td>}
                      <td>{money(s.counted_cash || 0)}</td>
                      {!cashierMode && (
                        <td>
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
                        <td>
                          <span className="blind-audit-badge-closed">
                            Arqueado y cerrado
                          </span>
                        </td>
                      )}
                      <td>
                        <button
                          className="text-button"
                          onClick={() => setHistoryShift(s.id)}
                        >
                          Ver ventas
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function ShiftHistory({
  storeId,
  shiftId,
  onTicket,
  onClose,
}: {
  storeId: string;
  shiftId: string;
  onTicket: (sale: KioscoSale) => void;
  onClose: () => void;
}) {
  const [sales, setSales] = useState<KioscoSale[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
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
  }, [storeId, shiftId]);
  return (
    <section className="history-detail">
      <div className="section-heading">
        <h3>Ventas del turno cerrado</h3>
        <button className="text-button" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
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
        <p>No hubo ventas en este turno.</p>
      )}
    </section>
  );
}
