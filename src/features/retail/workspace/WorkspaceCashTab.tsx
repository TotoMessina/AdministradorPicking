import { AIReportPanel } from '../../../components/AIReportPanel';
import { AiIcon } from '../../../components/AiIcon';
import { CashDesk } from '../CashDesk';
import { SalesOverview } from '../SalesOverview';
import { SectionNav } from '../SectionNav';
import type { WorkspaceState } from './useWorkspace';

/** Pestaña Caja. */
export function WorkspaceCashTab({ state }: { state: WorkspaceState }) {
  const {
    session, store, role, tab, setTab, cashView, setCashView, openFromSale, setOpenFromSale,
    closeRequest, setCloseRequest, guiding, products, registers, branches, ledgers, revision, registerId,
    shifts, sales, allStoreSales, movements, cart, busy, ledgerLoading, shift, register, occupiedByOther,
    manager, can, canReviewSales, canOperate, run, showTicket, handleSaleLedgerChange, refreshAll,
  } = state;
  return (
    <>
      <div hidden={tab !== 'cash'}>
          {canReviewSales && <SectionNav name="cash" label="Vistas de caja" value={cashView} onChange={setCashView} disabled={busy} sections={[{ id: 'shift', label: 'Mi caja' }, { id: 'overview', label: 'Ver ventas' }]} />}
          {canReviewSales && cashView === 'overview' && <div role="tabpanel" id="cash-panel-overview" aria-labelledby="cash-tab-overview"><SalesOverview storeId={store.id} store={store} products={products} branches={branches} registers={registers} shifts={shifts} ledgers={ledgers} revision={revision} run={run} busy={busy} onTicket={showTicket} onSaleMoved={handleSaleLedgerChange} canRefund={can('refund_sales')} refundShift={canOperate ? shift?.id : undefined} canManage={manager} canAttachInvoice={can('attach_invoice')} canMoveSale={sale => can('move_sale_ledger') && (manager || (sale.created_by === session.user.id && shifts.some(own => own.id === sale.shift_id && !own.closed_at && own.opened_by === session.user.id)))} />
            <details className="retail-panel"><summary className="ai-action"><AiIcon /> Explicar estos resultados con IA</summary><AIReportPanel storeId={store.id} shifts={shifts} allSales={allStoreSales.length > 0 ? allStoreSales : sales} products={products} storeName={store.name} role={role} /></details>
          </div>}
          <div hidden={canReviewSales && cashView !== 'shift'} role={canReviewSales ? 'tabpanel' : undefined} id="cash-panel-shift" aria-labelledby={canReviewSales ? 'cash-tab-shift' : undefined}>
          {ledgerLoading && <div role="status">Cargando movimientos…</div>}
          <div hidden={ledgerLoading}>
            <CashDesk
              active={tab === 'cash' && !guiding && !ledgerLoading && (!canReviewSales || cashView === 'shift')}
              openFromSale={openFromSale}
              closeRequest={closeRequest}
              onCloseRequestHandled={() => setCloseRequest(0)}
              hasPendingSale={cart.length > 0}
              onOpened={() => { if (openFromSale) setTab('pos'); setOpenFromSale(false); }}
              cashierMode={!manager}
              allowIncome={can('cash_income')}
              allowWithdrawal={can('cash_withdrawal')}
              canUseAccounts={can('manage_funds')}
              occupiedByOther={occupiedByOther}
              onSell={() => setTab('pos')}
              key={registerId + shift?.id}
              storeId={store.id}
              storeInfo={store}
              register={register}
              shift={shift}
              shifts={shifts}
              sales={sales}
              movements={movements}
              canOperate={canOperate}
              run={run}
              busy={busy || ledgerLoading}
              onTicket={showTicket}
              onRefresh={refreshAll}
              canRefund={can('refund_sales')}
            />
          </div>
          </div>
      </div>
    </>
  );
}
