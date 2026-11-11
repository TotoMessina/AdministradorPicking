import { AIAssistant } from '../../../components/AIAssistant';
import { DelegatedSettings } from '../DelegatedSettings';
import { FinanceTab } from '../FinanceTab';
import { SettingsEditorGroup } from '../SettingsEditor';
import { SupplierAccountSection } from '../SupplierAccountSection';
import { SectionNav } from '../SectionNav';
import { LocationTransfers } from '../LocationTransfers';
import { CustomersTab } from '../CustomersTab';
import { PurchaseOrders } from '../PurchaseOrders';
import { BranchComparison } from '../BranchComparison';
import { BankReconciliation } from '../BankReconciliation';
import type { WorkspaceState } from './useWorkspace';

/** Proveedores, Plata, Clientes, Finanzas, configuración delegada e IA. */
export function WorkspaceOtherTabs({ state }: { state: WorkspaceState }) {
  const {
    session, store, role, permissions, tab, uploadInvoice, settingsView, setSettingsView, guiding,
    categories, products, branches, customers, ordersFocus, financeView, setFinanceView, ledgers, shifts,
    sales, allStoreSales, movements, members, invitations, busy, shift, manager, can, canOpenSettings,
    canOpenSuppliers, canUseCustomers, canUseMoney, canManageCustomers, loadCustomers,
    managementLocationError, configurationBranches, configurationRegisters, canOperate, run,
  } = state;
  return (
    <>
      {canOpenSuppliers && <div hidden={tab !== 'suppliers'}><SettingsEditorGroup><section className="retail-panel settings-workspace settings-workspace-sober">
        <SupplierAccountSection key={`suppliers-${store.id}`} storeId={store.id} busy={busy} run={run} active={!guiding && tab === 'suppliers'} canManage={can('manage_products')} canAccount={can('manage_supplier_accounts')} onUploadInvoice={categories.length ? uploadInvoice : undefined}
          ordersPanel={<PurchaseOrders store={store} branches={manager ? branches : configurationBranches} products={products} run={run} busy={busy} active={!guiding && tab === 'suppliers'} />} focusOrders={ordersFocus} />
      </section></SettingsEditorGroup></div>}
      {canUseMoney && <div hidden={tab !== 'money'}><LocationTransfers key={`money-${store.id}`} store={store} branches={manager ? branches : configurationBranches} products={products} run={run} busy={busy}
        canStock={false} canFunds only="money" isAdmin={manager} active={!guiding && tab === 'money'} /></div>}
      {canUseCustomers && <div hidden={tab !== 'customers'}><CustomersTab storeId={store.id} customers={customers} shiftId={canOperate ? shift?.id : undefined} canManage={canManageCustomers} run={run} busy={busy} active={!guiding && tab === 'customers'} onChanged={loadCustomers} /></div>}
      {manager && <div hidden={tab !== 'finance'}>
        <SectionNav name="finance" label="Vistas de Ganancias" value={financeView} onChange={value => setFinanceView(value as 'month' | 'branches' | 'bank')} disabled={busy} sections={[{ id: 'month', label: 'Este mes' }, { id: 'branches', label: 'Comparar sucursales' }, { id: 'bank', label: 'Para el contador' }]} />
        <div hidden={financeView !== 'month'} role="tabpanel" id="finance-panel-month" aria-labelledby="finance-tab-month"><FinanceTab storeId={store.id} branches={branches} busy={busy} run={run} active={!guiding && tab === 'finance' && financeView === 'month'} /></div>
        <div hidden={financeView !== 'branches'} role="tabpanel" id="finance-panel-branches" aria-labelledby="finance-tab-branches"><BranchComparison storeId={store.id} active={!guiding && tab === 'finance' && financeView === 'branches'} /></div>
        <div hidden={financeView !== 'bank'} role="tabpanel" id="finance-panel-bank" aria-labelledby="finance-tab-bank"><BankReconciliation storeId={store.id} run={run} busy={busy} active={!guiding && tab === 'finance' && financeView === 'bank'} /></div>
      </div>}
      {!manager && canOpenSettings && <div hidden={tab !== 'settings'}><DelegatedSettings store={store} branches={configurationBranches} categories={categories} registers={configurationRegisters} ledgers={ledgers} members={members} invitations={invitations} permissions={permissions} userId={session.user.id} view={settingsView} onViewChange={setSettingsView} busy={busy} run={run} active={!guiding && tab === 'settings'} locationError={managementLocationError} /></div>}
      {tab === "ai" && can('use_ai') && (
        <AIAssistant
          store={store}
          members={members}
          products={products}
          shifts={shifts}
          sales={allStoreSales.length > 0 ? allStoreSales : sales}
          movements={movements}
          role={role}
          ownerEmail={session.user.email}
        />
      )}
    </>
  );
}
