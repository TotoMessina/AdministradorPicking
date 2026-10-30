import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { retail, errorMessage, type PurchaseInvoice, type Supplier, type SupplierPayment } from './api';
import { SettingsEditor } from './SettingsEditor';
import { formatMoney, voucherLabel, voucherNumber } from '../../services/purchaseInvoiceService';
import { formatCuit } from '../../services/supplierInvoiceRules';
import { documentAccount, isDueThisWeek, paymentRetentions, supplierLedger, supplierSummaries } from '../../services/supplierAccount';
import { downloadCsv, supplierBalancesCsv, supplierLedgerCsv, supplierPaymentsCsv, supplierRetentionsCsv } from '../../services/purchaseInvoiceExport';

const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
const displayDate = (date: string) => date.split('-').reverse().join('/');
const describe = (invoice: PurchaseInvoice) => `${voucherLabel(invoice.voucher_type)} ${voucherNumber(invoice.point_of_sale, invoice.number)}`;

/** Saldo por proveedor, movimientos con saldo acumulado y planillas para el contador. Requiere conexión. */
export function SupplierLedger({ storeId, active = true, version, onPay, onShowDocuments }: {
  storeId: string; active?: boolean; version: number; onPay: (cuit: string) => void; onShowDocuments: (filter: 'overdue' | 'week') => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [supplierRows, invoiceRows, paymentRows] = await Promise.all([retail.suppliers(storeId), retail.purchaseInvoices(storeId, '1900-01-01', '2999-12-31'), retail.supplierPayments(storeId)]);
      setSuppliers(supplierRows); setInvoices(invoiceRows); setPayments(paymentRows);
    } catch (e) { setError(`No se pudo cargar la cuenta corriente. ${errorMessage(e)}`); }
    finally { setLoading(false); }
  }, [storeId]);
  useEffect(() => { if (active) void load(); }, [active, load, version]);

  const nameOf = useCallback((cuit: string) => suppliers.find(supplier => supplier.cuit === cuit)?.name
    ?? invoices.find(invoice => invoice.issuer_cuit === cuit)?.supplier_name ?? payments.find(payment => payment.issuer_cuit === cuit)?.supplier_name ?? formatCuit(cuit), [suppliers, invoices, payments]);
  const summaries = useMemo(() => supplierSummaries(invoices, payments), [invoices, payments]);
  const sum = (pick: (row: typeof summaries[number]) => number) => summaries.reduce((total, row) => total + pick(row), 0);
  const totals = [
    { label: 'Saldo total', value: sum(row => row.balance) }, { label: 'Vencido', value: sum(row => row.overdue) },
    { label: 'A 7 días', value: sum(row => row.next7) }, { label: 'A 30 días', value: sum(row => row.next30) },
    { label: 'Más adelante', value: sum(row => row.later) }, { label: 'A tu favor', value: sum(row => row.favor) },
  ];
  // Lo urgente: mismos criterios que los filtros de Facturas, para que al tocar se vea lo mismo que se contó.
  const accounts = invoices.map(invoice => documentAccount(invoice, invoices, payments));
  const overdue = accounts.filter(account => account.status === 'overdue');
  const week = accounts.filter(isDueThisWeek);
  const totalOf = (rows: typeof accounts) => rows.reduce((total, account) => total + account.balance, 0);
  const documentsLabel = (count: number) => `${count} ${count === 1 ? 'factura' : 'facturas'}`;
  const monthPayments = payments.filter(payment => payment.paid_on.startsWith(month));
  const monthRetentions = monthPayments.filter(payment => !payment.voided_at && paymentRetentions(payment) > 0).length;

  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><BookOpen size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Cuánto debo a cada proveedor</h3>
        <p>Saldo y vencimientos de cada cuenta. Las facturas suman; las devoluciones y los pagos restan.</p>
      </div>
    </div>
    <div className="location-card-body">
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      {!error && !loading && !summaries.length && <div className="location-empty-notice">
        <BookOpen size={24} />
        <p>Todavía no hay movimientos con proveedores.</p>
      </div>}
      {summaries.length > 0 && <>
        <div className="supplier-urgent" role="status">
          {overdue.length > 0 && <button type="button" className="supplier-urgent-item is-overdue" onClick={() => onShowDocuments('overdue')}>
            <strong>Vencido {formatMoney(totalOf(overdue))}</strong><span>{documentsLabel(overdue.length)} · Ver</span>
          </button>}
          {week.length > 0 && <button type="button" className="supplier-urgent-item" onClick={() => onShowDocuments('week')}>
            <strong>Vence esta semana {formatMoney(totalOf(week))}</strong><span>{documentsLabel(week.length)} · Ver</span>
          </button>}
          {!overdue.length && !week.length && <p>Nada vencido ni por vencer esta semana.</p>}
        </div>
        <dl className="purchase-list-totals">
          {totals.map(total => <div key={total.label}><dt>{total.label}</dt><dd>{formatMoney(total.value)}</dd></div>)}
        </dl>
        <div className="purchase-list-export">
          <button type="button" className="secondary-button" onClick={() => downloadCsv(supplierBalancesCsv(summaries.map(summary => ({ name: nameOf(summary.cuit), summary }))), 'saldos-proveedores.csv')}>
            <Download size={15} /> Saldos por proveedor
          </button>
          <label className="purchase-list-month">Mes de pagos<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
          <button type="button" className="secondary-button" disabled={!monthPayments.length} onClick={() => downloadCsv(supplierPaymentsCsv(monthPayments, invoices), `pagos-proveedores-${month}.csv`)}>
            <Download size={15} /> Pagos ({monthPayments.length})
          </button>
          <button type="button" className="secondary-button" disabled={!monthRetentions} onClick={() => downloadCsv(supplierRetentionsCsv(monthPayments), `retenciones-${month}.csv`)}>
            <Download size={15} /> Retenciones ({monthRetentions})
          </button>
        </div>
      </>}
      {summaries.map(summary => {
        const name = nameOf(summary.cuit);
        return <SettingsEditor key={summary.cuit} label="Ver movimientos" busy={loading}
          summary={<div className="category-summary-row supplier-summary-row">
            <strong>{name}</strong>
            <span className="location-pill-badge active">Saldo {formatMoney(summary.balance)}</span>
            {summary.overdue > 0 && <span className="location-pill-badge is-warning">Vencido {formatMoney(summary.overdue)}</span>}
            {summary.next7 > 0 && <span className="location-pill-badge">A 7 días {formatMoney(summary.next7)}</span>}
            {summary.inReview > 0 && <span className="location-pill-badge">En revisión {formatMoney(summary.inReview)}</span>}
            {summary.favor > 0 && <span className="location-pill-badge">A tu favor {formatMoney(summary.favor)}</span>}
            {summary.overdue + summary.next7 + summary.next30 + summary.later > 0.005 && <button type="button" className="primary-button supplier-pay-button" onClick={() => onPay(summary.cuit)}>Pagar</button>}
          </div>}>
          {() => {
            const entries = supplierLedger(summary.cuit, invoices, payments, describe);
            return <div className="purchase-list-detail">
              <div className="ledger-scroll" role="region" aria-label={`Movimientos de ${name}`} tabIndex={0}>
                <table className="supplier-ledger">
                  <caption className="sr-only">Movimientos de {name} con saldo acumulado</caption>
                  <thead><tr><th scope="col">Fecha</th><th scope="col">Concepto</th><th scope="col">Importe</th><th scope="col">Saldo adeudado</th></tr></thead>
                  <tbody>{entries.map(entry => <tr key={entry.id}>
                    <td>{displayDate(entry.date)}</td>
                    <td>{entry.concept}{entry.note && <small>{entry.note}</small>}</td>
                    <td>{formatMoney(entry.amount)}</td>
                    <td>{formatMoney(entry.balance)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="purchase-tracking-note">Saldo final: {formatMoney(entries.at(-1)?.balance ?? 0)} {summary.balance >= 0 ? 'a pagar al proveedor' : 'a favor del comercio'}.</p>
              <button type="button" className="secondary-button" onClick={() => downloadCsv(supplierLedgerCsv(entries), `cuenta-corriente-${summary.cuit}.csv`)}>
                <Download size={15} /> Descargar movimientos
              </button>
            </div>;
          }}
        </SettingsEditor>;
      })}
    </div>
  </div>;
}
