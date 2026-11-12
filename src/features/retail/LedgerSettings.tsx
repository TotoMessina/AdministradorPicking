import { useLedgerSettings, type LedgerSettingsProps } from './businessSettings/useLedgerSettings';
import { LedgerListCard } from './businessSettings/LedgerListCard';
import { LedgerRoutingCard } from './businessSettings/LedgerRoutingCard';

/** Registros de ventas y a cuál va cada medio de pago. */

export function LedgerSettings(props: LedgerSettingsProps) {
  const state = useLedgerSettings(props);
  return (
    <div className="ledgers-settings-container">
      <LedgerListCard state={state} />

      <LedgerRoutingCard state={state} />
    </div>
  );
}
