import { useEffect, useState } from "react";
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
}) {
  const [counted, setCounted] = useState("");
  const [historyShift, setHistoryShift] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
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
    setAiAnalysis(null);
    setAiError(null);
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
    if (cashierMode) return;
    setIsAiLoading(true);
    setAiError(null);

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
      ]);

      setAiAnalysis(response);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el análisis del turno."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="cash-workspace">
      {cashierMode && <div className="info-banner cashier-guide">
        <strong>Tu jornada en tres pasos</strong>
        <span>1. Abrí tu turno con el efectivo inicial. 2. Registrá las ventas en Vender. 3. Contá el efectivo y confirmá el cierre.</span>
        <small>Acá ves tus turnos, ventas, ingresos y retiros. Los movimientos de otros usuarios son privados.</small>
        {canOperate && onSell && <button type="button" className="primary-button" onClick={onSell}>Ir a vender</button>}
      </div>}
      {balanceError && <p className="error-banner" role="alert">No se pudo consultar el saldo del turno. Tocá Actualizar antes de cerrar. {balanceError}</p>}
      <div className="section-heading">
        <div>
          <h2>{register?.name || "Seleccioná una caja"}</h2>
          <p>
            {shift
              ? `Turno abierto · ${new Date(shift.opened_at).toLocaleString("es-AR")}`
              : "Abrí un turno para registrar ventas y movimientos."}
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={onRefresh}
          disabled={busy}
        >
          Actualizar
        </button>
      </div>
      {!shift ? (
        <section className="retail-panel">
          <h2>Abrir turno</h2>
          {occupiedByOther && <p className="info-banner" role="status">Esta caja está ocupada. Elegí otra caja disponible o esperá a que cierre el turno actual y tocá Actualizar.</p>}
          <form
            className="retail-form"
            onSubmit={(e) => {
              e.preventDefault();
              const opening = Number(
                new FormData(e.currentTarget).get("opening"),
              );
              if (register && !occupiedByOther)
                void run(
                  () => retail.openShift(storeId, register.id, opening),
                  "Turno abierto",
                );
            }}
          >
            <label>
              Efectivo inicial ($)
              <input
                name="opening"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue="0"
              />
            </label>
            <button className="primary-button" disabled={busy || !register || occupiedByOther || !register.active}>
              Abrir {register?.name || "caja"}
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
          <div className="cash-metrics">
            <div>
              <small>Fondo inicial</small>
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
                  <small>Modalidad de arqueo</small>
                  <strong className="blind-audit-status">
                    <span className="blind-audit-dot" aria-hidden="true" />
                    Arqueo a ciegas
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
          {canOperate && (
            <div className="settings-grid">
              <section className="retail-panel">
                <h2>Registrar movimiento</h2>
                <CashMovementForm key={shift.id} store={storeId} shift={shift.id} busy={busy} run={run} onBusyChange={setMovementBusy} />
              </section>
              <section className="retail-panel">
                <h2>Cerrar turno</h2>
                {cashierMode ? (
                  <div className="blind-audit-indicator">
                    <div className="blind-audit-indicator-header">
                      <span className="blind-audit-badge">
                        🔒 Arqueo a ciegas activo
                      </span>
                    </div>
                    <p className="blind-audit-text">
                      Ingresá el total de efectivo físico que contaste en el cajón.
                      Por seguridad y transparencia operativa, el sistema no muestra el saldo teórico esperado ni las diferencias calculadas;
                      las diferencias (sobrantes o faltantes) quedan registradas únicamente para la administración.
                    </p>
                  </div>
                ) : (
                  <small>El saldo esperado incluye todos los ajustes de tu turno, incluso los realizados por un administrador.</small>
                )}
                <p>
                  Contá el dinero físico. El cierre guarda el arqueo y conserva
                  todas las ventas.
                </p>
                <form
                  className="retail-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (movementBusy || (cashierMode && serverBalance === null)) return;
                    if (
                      window.confirm(
                        `¿Cerrar el turno de ${register?.name} con ${money(Number(counted))} contados?`,
                      )
                    ) {
                      if (
                        await run(
                          () => retail.closeShift(shift.id, Number(counted)),
                          "Turno cerrado",
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
                        ? "🔒 Ingresá el conteo físico para completar el arqueo."
                        : `Efectivo físico declarado: ${money(Number(counted))}. El arqueo se auditará al registrar el cierre.`}
                    </div>
                  ) : (
                    <div className="info-banner">
                      Diferencia:{" "}
                      {counted === ""
                        ? "Ingresá el conteo"
                        : money(Number(counted) - expected)}
                    </div>
                  )}

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
                        <span>🤖 Analizar turno con IA</span>
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

                  <button disabled={busy || movementBusy || (cashierMode && serverBalance === null)} className="primary-button">
                    Confirmar cierre
                  </button>
                </form>
              </section>
            </div>
          )}
          <section className="retail-panel">
            <h2>Ventas del turno ({sales.length})</h2>
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
          </section>
          <section className="retail-panel">
            <h2>Movimientos del turno</h2>
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
          </section>
        </>
      )}
      <section className="retail-panel">
        {historyShift && (
          <ShiftHistory
            key={historyShift}
            storeId={storeId}
            shiftId={historyShift}
            onTicket={onTicket}
            onClose={() => setHistoryShift("")}
          />
        )}
        <h2>{cashierMode ? 'Tus últimos cierres en esta caja' : 'Últimos cierres de esta caja'}</h2>
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
      </section>
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
