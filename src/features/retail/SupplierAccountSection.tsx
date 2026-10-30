import { useCallback, useState } from 'react';
import type { Run } from './Management';
import { CostAdjustmentTool } from './CostAdjustmentTool';
import { PurchaseInvoiceList } from './PurchaseInvoiceList';
import { SupplierLedger } from './SupplierLedger';
import { SupplierPayments, type PaymentIntent } from './SupplierPayments';
import { SupplierSettings } from './SupplierSettings';

type SupplierView = 'accounts' | 'payments' | 'documents' | 'profiles';

/**
 * Proveedores en cuatro vistas, una por tarea. Las vistas quedan montadas para conservar
 * los borradores al cambiar; `version` actualiza los saldos después de cada cambio.
 */
export function SupplierAccountSection({ storeId, busy, run, active, canManage, canAccount, onUploadInvoice }: {
  storeId: string; busy: boolean; run: Run; active: boolean;
  /** Fichas, comprobantes y costos (`manage_products`). */
  canManage: boolean;
  /** Ver saldos y registrar pagos (`manage_supplier_accounts`). */
  canAccount: boolean;
  /** Abre el importador de facturas; requiere `manage_products` y al menos una categoría. */
  onUploadInvoice?: () => void;
}) {
  const views: { id: SupplierView; label: string }[] = [
    ...(canAccount ? [{ id: 'accounts' as const, label: 'Cuentas' }, { id: 'payments' as const, label: 'Pagos' }] : []),
    { id: 'documents', label: 'Facturas' },
    ...(canManage ? [{ id: 'profiles' as const, label: 'Fichas' }] : []),
  ];
  const [view, setView] = useState<SupplierView>(views[0].id);
  const [version, setVersion] = useState(0);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [documentFocus, setDocumentFocus] = useState<{ status: string; key: number } | null>(null);
  const changed = useCallback(() => setVersion(value => value + 1), []);
  const pay = useCallback((cuit: string, invoiceId?: string) => {
    setIntent({ cuit, invoiceId, key: Date.now() });
    setView('payments');
  }, []);
  const clearIntent = useCallback(() => setIntent(null), []);
  const showDocuments = useCallback((status: 'overdue' | 'week') => {
    setDocumentFocus({ status, key: Date.now() });
    setView('documents');
  }, []);
  const showing = (id: SupplierView) => active && view === id;
  return <div className="suppliers-settings-container">
    <div className="location-transfer-tabs purchase-view-tabs" role="group" aria-label="Vistas de proveedores">
      {views.map(item => <button key={item.id} type="button" className="secondary-button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}
    </div>
    {canAccount && <div hidden={view !== 'accounts'}>
      <SupplierLedger storeId={storeId} active={showing('accounts')} version={version} onPay={pay} onShowDocuments={showDocuments} />
    </div>}
    {canAccount && <div hidden={view !== 'payments'}>
      <SupplierPayments storeId={storeId} busy={busy} run={run} active={showing('payments')} version={version} onChanged={changed} intent={intent} onIntentDone={clearIntent} />
    </div>}
    <div hidden={view !== 'documents'}>
      <PurchaseInvoiceList storeId={storeId} busy={busy} run={run} active={showing('documents')} version={version} onChanged={changed} canManage={canManage} canAccount={canAccount} onPay={pay} focus={documentFocus} onUploadPhoto={onUploadInvoice} />
    </div>
    {canManage && <div hidden={view !== 'profiles'} className="suppliers-settings-container">
      <SupplierSettings storeId={storeId} busy={busy} run={run} active={showing('profiles')} />
      <details className="supplier-rules">
        <summary>Ajustar costos existentes <small>Herramienta de uso ocasional</small></summary>
        <CostAdjustmentTool storeId={storeId} busy={busy} run={run} active={showing('profiles')} />
      </details>
    </div>}
  </div>;
}
