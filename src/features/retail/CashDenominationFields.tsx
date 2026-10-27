import { NumberInput } from '../../components/NumberInput';
import { useId } from 'react';
import { CASH_DENOMINATIONS, cashDenominationsFromDraft, cashDenominationsTotal, type CashDenomination, type CashDenominationDraft } from '../../services/cashDenominations';

const money = (value: number) => '$' + value.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export function CashDenominationFields({ enabled, draft, disabled, onEnabledChange, onChange, onUseTotal }: {
  enabled: boolean; draft: CashDenominationDraft; disabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onChange: (denomination: CashDenomination, value: string) => void;
  onUseTotal: (total: number) => void;
}) {
  const id = useId();
  let total = 0;
  let error = '';
  try { total = cashDenominationsTotal(cashDenominationsFromDraft(draft)); }
  catch (reason) { error = reason instanceof Error ? reason.message : 'Revisá las cantidades.'; }
  return <div className="cash-denominations">
    <button type="button" className="secondary-button" aria-expanded={enabled} aria-controls={id} disabled={disabled} onClick={() => onEnabledChange(!enabled)}>
      {enabled ? 'Ocultar conteo de billetes' : '💵 Contar por billetes (opcional)'}
    </button>
    <fieldset id={id} hidden={!enabled} disabled={disabled || !enabled}>
      <legend>Conteo de billetes</legend>
      <div className="cash-denomination-grid">
        {CASH_DENOMINATIONS.map(amount => <label key={amount}>
          <span>{money(amount)}</span>
          <NumberInput name={`bill-${amount}`} type="number" inputMode="numeric" min="0" max="1000000" step="1" placeholder="0" value={draft[amount] || ''}
            aria-label={`Cantidad de billetes de ${money(amount)}`} onValueChange={event => onChange(amount, event)} />
        </label>)}
      </div>
      {error && <p role="alert" className="movement-error">{error}</p>}
      <div className="cash-denomination-total" aria-live="polite"><span>Total billetes</span><strong>{money(total)}</strong></div>
      <button type="button" className="text-button" disabled={!!error || total <= 0} onClick={() => onUseTotal(total)}>Aplicar al efectivo contado</button>
    </fieldset>
  </div>;
}
