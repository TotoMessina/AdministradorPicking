import { useCallback, useEffect, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { retail, errorMessage, type PurchaseInvoice, type Supplier, type SupplierPayment } from './api';
import type { Run } from './Management';
import { SettingsEditor } from './SettingsEditor';
import { DataTable } from './DataTable';
import { formatMoney } from '../../services/purchaseInvoiceService';
import { paymentApplied, paymentRetentions, paymentTotal, paymentUnapplied } from '../../services/supplierAccount';
import { METHOD_LABELS, displayDate, cents, type PaymentIntent } from './supplierPayments/paymentHelpers';
import { PaymentForm } from './supplierPayments/PaymentForm';
import { PaymentDetail } from './supplierPayments/PaymentDetail';

export type { PaymentIntent } from './supplierPayments/paymentHelpers';

/** Pagos a proveedores aplicados a comprobantes, con retenciones y anticipos. Requiere conexión. */
export function SupplierPayments({ storeId, busy, run, active = true, version, onChanged, intent, onIntentDone }: {
  storeId: string; busy: boolean; run: Run; active?: boolean; version: number; onChanged: () => void; intent: PaymentIntent | null; onIntentDone: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [supplierRows, invoiceRows, paymentRows] = await Promise.all([retail.suppliers(storeId), retail.purchaseInvoices(storeId, '1900-01-01', '2999-12-31'), retail.supplierPayments(storeId)]);
      setSuppliers(supplierRows); setInvoices(invoiceRows); setPayments(paymentRows);
    } catch (e) { setError(`No se pudieron cargar los pagos. ${errorMessage(e)} Actualización necesaria: 202610300001.`); }
    finally { setLoading(false); }
  }, [storeId]);
  useEffect(() => { if (active) void load(); }, [active, load, version]);
  const advances = cents(payments.reduce((sum, payment) => sum + paymentUnapplied(payment), 0));
  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><HandCoins size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Pagos a proveedores</h3>
        <p>Registrá cada pago y qué facturas cubre. Si pagás de más, queda a tu favor como anticipo. Un pago no se borra: se anula con su motivo.</p>
      </div>
    </div>
    <div className="location-card-body">
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      {!error && intent && invoices.some(invoice => invoice.issuer_cuit === intent.cuit) && <div className="payment-intent">
        <PaymentForm key={intent.key} storeId={storeId} suppliers={suppliers} invoices={invoices} payments={payments} busy={busy} run={run} close={onIntentDone} onSaved={onChanged} intent={intent} />
        <button type="button" className="text-button" disabled={busy} onClick={onIntentDone}>Cancelar</button>
      </div>}
      {!error && !intent && <SettingsEditor label="Registrar pago" busy={busy || loading}>
        {close => <PaymentForm storeId={storeId} suppliers={suppliers} invoices={invoices} payments={payments} busy={busy} run={run} close={close} onSaved={onChanged} />}
      </SettingsEditor>}
      {advances > 0.005 && <div className="team-summary-badges"><span className="location-pill-badge active">A tu favor {formatMoney(advances)}</span></div>}
      <DataTable label="Pagos a proveedores" rows={payments.slice(0, 50)} rowKey={payment => `${payment.id}:${payment.voided_at}:${paymentApplied(payment)}`}
        empty="Todavía no registraste pagos." rowClass={payment => payment.voided_at ? 'is-muted' : undefined}
        columns={[
          { id: 'date', label: 'Fecha', cell: payment => displayDate(payment.paid_on) },
          { id: 'supplier', label: 'Proveedor', cell: payment => <strong>{payment.supplier_name}</strong> },
          { id: 'method', label: 'Medio', cell: payment => METHOD_LABELS[payment.method] },
          { id: 'total', label: 'Importe', num: true, cell: payment => formatMoney(paymentTotal(payment)) },
          { id: 'retentions', label: 'Retenciones', num: true, cell: payment => paymentRetentions(payment) > 0 ? formatMoney(paymentRetentions(payment)) : '—' },
          { id: 'status', label: 'Estado', cell: payment => payment.voided_at ? <span className="pill is-warning">Anulado</span>
            : paymentUnapplied(payment) > 0.005 ? <span className="pill is-pending">A tu favor {formatMoney(paymentUnapplied(payment))}</span> : <span className="pill is-ok">Aplicado</span> },
        ]}
        detail={payment => <PaymentDetail payment={payment} invoices={invoices} payments={payments} storeId={storeId} busy={busy} run={run} onSaved={onChanged} />} />
    </div>
  </div>;
}
