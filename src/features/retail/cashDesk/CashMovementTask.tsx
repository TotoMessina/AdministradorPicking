import { CashMovementForm } from '../CashMovementForm';
import type { CashDeskState } from './useCashDesk';

/** Registrar un ingreso o retiro. */
export function CashMovementTask({ state }: { state: CashDeskState }) {
  const {
    storeId, shift, run, busy, active, allowIncome, allowWithdrawal, canUseAccounts, currentTask,
    taskName, setMovementBusy,
  } = state;
  // Solo se muestra con la caja abierta.
  if (!shift) return null;
  return (
    <>
      <section className="retail-panel cash-task-panel" role="tabpanel" id={`${taskName}-panel-movement`} aria-labelledby={`${taskName}-tab-movement`} hidden={currentTask !== 'movement' || (!allowIncome && !allowWithdrawal)}>
        <h2 tabIndex={-1}>{allowIncome && allowWithdrawal ? 'Registrar ingreso o retiro' : allowIncome ? 'Registrar ingreso' : 'Registrar retiro'}</h2>
        <CashMovementForm key={shift.id} store={storeId} shift={shift.id} busy={busy} active={active && currentTask === 'movement'} run={run} onBusyChange={setMovementBusy} allowIncome={allowIncome} allowWithdrawal={allowWithdrawal} canUseAccounts={canUseAccounts} />
      </section>
    </>
  );
}
