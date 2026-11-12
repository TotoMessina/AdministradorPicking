import { NumberInput } from '../../../components/NumberInput';
import { AiIcon } from '../../../components/AiIcon';
import { AlertCircle, Loader2 } from 'lucide-react';
import { retail, errorMessage } from '../api';
import { CashDenominationFields } from '../CashDenominationFields';
import { cashDenominationsFromDraft, closingCashDenominations } from '../../../services/cashDenominations';
import { money } from './money';
import type { CashDeskState } from './useCashDesk';

/** Cerrar la caja: conteo, billetes y confirmación. */
export function CashCloseTask({ state }: { state: CashDeskState }) {
  const {
    register, shift, run, busy, cashierMode, onSell, active, hasPendingSale, currentTask, taskName,
    counted, setCounted, countedRef, includeDenominations, setIncludeDenominations, denominationDraft,
    setDenominationDraft, closingError, setClosingError, closeAsked, setCloseAsked, closingTickets,
    aiAnalysis, setAiAnalysis, isAiLoading, aiError, setAiError, movementBusy, serverBalance, expected,
    handleAnalyzeShift,
  } = state;
  // Solo se muestra con la caja abierta.
  if (!shift) return null;
  return (
    <>
      <section className="retail-panel cash-task-panel" role="tabpanel" id={`${taskName}-panel-close`} aria-labelledby={`${taskName}-tab-close`} hidden={currentTask !== 'close'}>
        <h2 tabIndex={-1}>Cerrar la caja</h2>

        <div className="cash-close-summary-card">
          <div>
            <small>Ventas de esta caja</small>
            <strong>{closingTickets} {closingTickets === 1 ? 'ticket' : 'tickets'}</strong>
          </div>
          {!cashierMode && (
            <div>
              <small>Debería haber</small>
              <strong>{money(expected)}</strong>
            </div>
          )}
        </div>

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
            if (!closeAsked) { setCloseAsked(true); return; }
            setCloseAsked(false);
            if (
              await run(
                () => retail.closeShift(shift.id, Number(counted), denominations),
                `Caja cerrada. Conteo guardado: ${money(Number(counted))}.`,
              )
            ) {
              setCounted("");
              setIncludeDenominations(false);
              setDenominationDraft({});
              setClosingError('');
              setAiAnalysis(null);
              setAiError(null);
            }
          }}
        >
          <label>
            ¿Cuánta plata contaste? ($)
            <NumberInput
              ref={countedRef}
              name="counted"
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              disabled={!active || currentTask !== 'close' || busy}
              value={counted}
              onValueChange={(e) => { setCounted(e); setClosingError(''); setCloseAsked(false); }}
            />
          </label>
          <CashDenominationFields enabled={includeDenominations} draft={denominationDraft} disabled={!active || currentTask !== 'close' || busy}
            onEnabledChange={value => { setIncludeDenominations(value); setClosingError(''); setCloseAsked(false); }}
            onChange={(denomination, value) => { setDenominationDraft(previous => ({ ...previous, [denomination]: value })); setClosingError(''); setCloseAsked(false); }}
            onUseTotal={total => { setCounted(String(total)); setClosingError(''); setCloseAsked(false); countedRef.current?.focus(); }} />
          {closingError && <p className="movement-error" role="alert">{closingError}</p>}
          {counted !== "" && (
            cashierMode ? (
              <div className="cash-close-feedback" role="status">
                <span>Efectivo a declarar:</span>
                <strong>{money(Number(counted))}</strong>
              </div>
            ) : (
              <div className={`cash-close-diff ${Number(counted) === expected ? 'cash-close-diff-exact' : Number(counted) > expected ? 'cash-close-diff-surplus' : 'cash-close-diff-deficit'}`}>
                <span>Diferencia:</span>
                <strong>
                  {Number(counted) === expected
                    ? '$0 (Exacto)'
                    : Number(counted) > expected
                      ? `+${money(Number(counted) - expected)} (Sobrante)`
                      : `${money(Number(counted) - expected)} (Faltante)`}
                </strong>
              </div>
            )
          )}

          {hasPendingSale && (
            <div className="info-banner" role="status">
              <span>Hay una venta en curso sin cobrar.</span>
              {onSell && <button type="button" className="text-button" onClick={onSell}>Ir a Vender</button>}
            </div>
          )}
          {closeAsked && (
            <div className="info-banner" role="status">
              <span>¿Cerrar {register?.name} con {money(Number(counted))} contados?{!cashierMode && shift && ` A la plata de la sucursal se suman ${money(Number(counted) - shift.opening_cash)}.`}</span>
              <button type="button" className="text-button" onClick={() => setCloseAsked(false)}>Volver</button>
            </div>
          )}
          <button disabled={!active || currentTask !== 'close' || busy || hasPendingSale || movementBusy || (cashierMode && serverBalance === null)} className="primary-button">
            {closeAsked ? 'Sí, cerrar la caja' : 'Cerrar la caja'}
          </button>
        </form>
        <div className="cash-optional-analysis" hidden={cashierMode}>
          {!cashierMode && (
            <button
              type="button"
              className="secondary-button shift-ai-analyze-btn ai-action"
              onClick={handleAnalyzeShift}
              disabled={busy || isAiLoading}
            >
              {isAiLoading ? (
                <>
                  <Loader2 size={16} className="ai-spin-icon" />
                  <span>Analizando la caja con IA…</span>
                </>
              ) : (
                <><AiIcon /><span>{aiError ? 'Reintentar explicación' : 'Explicar esta caja con IA'}</span></>
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
              aria-label="Análisis IA de la caja"
            >
              <div className="shift-ai-card-header">
                <AiIcon className="shift-ai-header-icon" />
                <h4>Análisis de la caja</h4>
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
    </>
  );
}
