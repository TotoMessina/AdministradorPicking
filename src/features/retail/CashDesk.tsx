import { SectionNav } from './SectionNav';
import { useCashDesk, type CashDeskProps } from './cashDesk/useCashDesk';
import { CashDeskSummary } from './cashDesk/CashDeskSummary';
import { CashOpening } from './cashDesk/CashOpening';
import { CashMovementTask } from './cashDesk/CashMovementTask';
import { CashCloseTask } from './cashDesk/CashCloseTask';
import { CashActivity } from './cashDesk/CashActivity';

/** Caja: abrir, registrar ingresos y retiros, cerrar y consultar la actividad. */
export function CashDesk(props: CashDeskProps) {
  const state = useCashDesk(props);
  const {
    shift, canOperate, busy, onRefresh, openingOnly, allowIncome, allowWithdrawal, setTask, currentTask,
    taskName, taskPanel, taskActions, movementBusy, balanceError,
  } = state;
  return (
    <div className="cash-workspace cash-workspace-adaptive">
      {balanceError && <div className="error-banner" role="alert"><p>No se pudo consultar cuánto hay en la caja. Actualizá antes de cerrar. {balanceError}</p><button type="button" className="secondary-button" disabled={busy} onClick={onRefresh}>Actualizar caja</button></div>}
      <CashDeskSummary state={state} />
      <div className="cash-shift-layout" data-operating={!shift || canOperate} data-single={openingOnly}>
      <div className="cash-operation">
      {!shift ? (
        <CashOpening state={state} />
      ) : (
        <>
          {!canOperate && (
            <div className="info-banner">
              Esta caja no está disponible para operar. Actualizá los datos y seleccioná una caja habilitada.
            </div>
          )}
          {canOperate && <div className="cash-operation-nav" ref={taskActions}>
            <SectionNav name={taskName} label="Acciones de tu caja" value={currentTask} disabled={busy || movementBusy}
              onChange={value => setTask(value as 'movement' | 'close')}
              sections={[...(allowIncome || allowWithdrawal ? [{ id: 'movement', label: 'Poner o sacar plata' }] : []), { id: 'close', label: 'Cerrar la caja' }]} />
          </div>}
          {canOperate && (
            <div className="cash-task-panels" ref={taskPanel}>
              <CashMovementTask state={state} />
              <CashCloseTask state={state} />
            </div>
          )}
        </>
      )}
      </div>
      <CashActivity state={state} />
      </div>
    </div>
  );
}
