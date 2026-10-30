import { useCallback, useState } from 'react';
import type { Run } from './Management';
import { PurchaseInvoiceList } from './PurchaseInvoiceList';
import { SupplierLedger } from './SupplierLedger';
import { SupplierPayments } from './SupplierPayments';

/** Pagos y comprobantes de proveedores: un cambio en uno actualiza los saldos del otro. */
export function SupplierAccountSection({ storeId, busy, run, active, canManage, canAccount }: {
  storeId: string; busy: boolean; run: Run; active: boolean;
  /** Registrar y editar comprobantes (`manage_products`). */
  canManage: boolean;
  /** Ver saldos y registrar pagos (`manage_supplier_accounts`). */
  canAccount: boolean;
}) {
  const [version, setVersion] = useState(0);
  const changed = useCallback(() => setVersion(value => value + 1), []);
  return <>
    {canAccount && <SupplierLedger storeId={storeId} active={active} version={version} />}
    {canAccount && <SupplierPayments storeId={storeId} busy={busy} run={run} active={active} version={version} onChanged={changed} />}
    <PurchaseInvoiceList storeId={storeId} busy={busy} run={run} active={active} version={version} onChanged={changed} canManage={canManage} canAccount={canAccount} />
  </>;
}
