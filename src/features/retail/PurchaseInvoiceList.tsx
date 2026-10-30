import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, QrCode } from 'lucide-react';
import { retail, errorMessage, type PurchaseInvoice, type SupplierPayment } from './api';
import type { Run } from './Management';
import { SettingsEditor } from './SettingsEditor';
import { ManualPurchaseInvoiceForm } from './ManualPurchaseInvoiceForm';
import { PURCHASE_AMOUNT_FIELDS, formatMoney, voucherLabel, voucherNumber } from '../../services/purchaseInvoiceService';
import { formatCuit } from '../../services/supplierInvoiceRules';
import { downloadCsv, purchasePerceptionsCsv, purchaseVatBookCsv } from '../../services/purchaseInvoiceExport';
import {
  CREDIT_NOTE_TYPES, DEBIT_NOTE_TYPES, INVOICE_TYPES, STATUS_LABELS, documentAccount, dueLabel, type DocumentAccount,
} from '../../services/supplierAccount';

// Mes local: toISOString usaría UTC y cerca de fin de mes mostraría el siguiente.
const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
const displayDate = (date: string) => date.split('-').reverse().join('/');
const voucherName = (row: PurchaseInvoice) => `${voucherLabel(row.voucher_type)} ${voucherNumber(row.point_of_sale, row.number)}`;

function StatusBadge({ account }: { account: DocumentAccount }) {
  const tone = account.status === 'overdue' || account.status === 'review' ? ' is-warning'
    : account.status === 'cancelled' || account.status === 'credit_applied' ? ' active' : '';
  return <span className={`location-pill-badge${tone}`} title={account.reviewNote ?? undefined}>{STATUS_LABELS[account.status]}</span>;
}

/** Vencimiento, revisión, aceptación de nota de débito y vínculo con su factura. Nunca cambia importes. */
function TrackingEditor({ row, rows, payments, showBalance, storeId, busy, run, onSaved }: {
  row: PurchaseInvoice; rows: PurchaseInvoice[]; payments: SupplierPayment[]; showBalance: boolean; storeId: string; busy: boolean; run: Run; onSaved: () => void;
}) {
  const account = documentAccount(row, rows, payments);
  const isCredit = CREDIT_NOTE_TYPES.has(row.voucher_type);
  const isDebitNote = DEBIT_NOTE_TYPES.has(row.voucher_type);
  const [due, setDue] = useState(row.due_date ?? '');
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState(row.applies_to ?? '');
  const invoices = rows.filter(other => INVOICE_TYPES.has(other.voucher_type) && other.issuer_cuit === row.issuer_cuit && other.id !== row.id);
  const credits = rows.filter(other => other.applies_to === row.id);
  const save = async (changes: Parameters<typeof retail.updatePurchaseInvoiceTracking>[2], message: string) => {
    if (await run(() => retail.updatePurchaseInvoiceTracking(storeId, row.id, changes), message)) onSaved();
  };
  if (!row.due_date) return <p className="purchase-tracking-note">Para ver vencimientos y estados, aplicá la actualización 202610290007 en Supabase.</p>;
  return <div className="purchase-tracking">
    <h4>Cuenta corriente</h4>
    <p className="purchase-tracking-note">
      {isCredit ? (row.applies_to ? 'Nota de crédito aplicada a su factura.' : 'Crédito a favor: vinculalo con la factura a la que corresponde.')
        : showBalance ? <>Saldo {formatMoney(account.balance)}{account.credits > 0 || account.paid > 0 ? ` (total ${formatMoney(row.total)}${account.credits > 0 ? ` − notas de crédito ${formatMoney(account.credits)}` : ''}${account.paid > 0 ? ` − pagos ${formatMoney(account.paid)}` : ''})` : ''} · {STATUS_LABELS[account.status]}{dueLabel(account) ? `, ${dueLabel(account)}` : ''}.</> : 'Los saldos se ven con el permiso de cuenta corriente de proveedores.'}
    </p>
    {!isCredit && <div className="purchase-tracking-row">
      <label>Vencimiento<input type="date" min={row.issue_date} value={due} disabled={busy} onChange={event => setDue(event.target.value)} /></label>
      <button type="button" className="secondary-button" disabled={busy || !due || due === row.due_date}
        onClick={() => void save({ due_date: due }, 'Vencimiento actualizado')}>Guardar vencimiento</button>
    </div>}
    {isDebitNote && !row.accepted_at && <div className="purchase-tracking-row">
      <span>Esta nota de débito queda «En revisión» hasta aceptarla. Revisá su respaldo antes.</span>
      <button type="button" className="secondary-button" disabled={busy} onClick={() => {
        if (window.confirm(`¿Aceptar la ${voucherName(row).replace('Nota', 'nota')} por ${formatMoney(row.total)}? Pasa a formar parte de lo que se debe.`)) void save({ accept: true }, 'Nota de débito aceptada');
      }}>Aceptar nota de débito</button>
    </div>}
    {!isCredit && (row.review_reason
      ? <div className="purchase-tracking-row">
        <span>En revisión: {row.review_reason}</span>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void save({ review_reason: null }, 'Comprobante fuera de revisión')}>Quitar de revisión</button>
      </div>
      : <div className="purchase-tracking-row">
        <label>Marcar en revisión (reclamo o diferencia)<input maxLength={300} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Ej.: faltaron 2 displays; se pidió nota de crédito" /></label>
        <button type="button" className="secondary-button" disabled={busy || !reason.trim()} onClick={() => void save({ review_reason: reason.trim() }, 'Comprobante en revisión')}>Marcar en revisión</button>
      </div>)}
    {(isCredit || isDebitNote) && <div className="purchase-tracking-row">
      <label>Corresponde a la factura
        <select value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>
          <option value="">Sin vincular</option>
          {invoices.map(invoice => <option key={invoice.id} value={invoice.id}>
            {voucherName(invoice)} · {displayDate(invoice.issue_date)} · {formatMoney(invoice.total)} (saldo {formatMoney(documentAccount(invoice, rows, payments).balance)})
          </option>)}
        </select>
      </label>
      <button type="button" className="secondary-button" disabled={busy || target === (row.applies_to ?? '')}
        onClick={() => void save({ applies_to: target || null }, target ? 'Nota vinculada con su factura' : 'Vínculo quitado')}>Guardar vínculo</button>
    </div>}
    {(isCredit || isDebitNote) && !invoices.length && <p className="purchase-tracking-note">No hay facturas registradas de este proveedor para vincular.</p>}
    {credits.length > 0 && <p className="purchase-tracking-note">Notas vinculadas: {credits.map(credit => `${voucherName(credit)} (${formatMoney(credit.total)})`).join(', ')}.</p>}
  </div>;
}

/** Comprobantes de compra: por mes para el contador y con saldo pendiente para la cuenta corriente. Requiere conexión. */
export function PurchaseInvoiceList({ storeId, busy, run, active = true, version = 0, onChanged, canManage = true, canAccount = true }: {
  storeId: string; busy: boolean; run: Run; active?: boolean; version?: number; onChanged?: () => void; canManage?: boolean; canAccount?: boolean;
}) {
  const [selectedView, setView] = useState<'month' | 'open'>('month');
  const view = canAccount ? selectedView : 'month';
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [all, setAll] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    // Todos los comprobantes: los saldos dependen de notas de crédito de otros meses.
    try {
      const [rows, paid] = await Promise.all([
        retail.purchaseInvoices(storeId, '1900-01-01', '2999-12-31'),
        // Sin la migración de pagos los saldos no descuentan pagos, pero la lista sigue funcionando.
        canAccount ? retail.supplierPayments(storeId).catch(() => []) : Promise.resolve([]),
      ]);
      setAll(rows); setPayments(paid);
    }
    catch (e) { setError(`No se pudieron cargar los comprobantes: ${errorMessage(e)}`); }
    finally { setLoading(false); }
  }, [storeId, canAccount]);
  useEffect(() => { if (active) void load(); }, [active, load, version]);
  const changed = () => { if (onChanged) onChanged(); else void load(); };

  const accounts = useMemo(() => new Map(all.map(row => [row.id, documentAccount(row, all, payments)])), [all, payments]);
  const tracked = all.some(row => row.due_date);
  const monthRows = /^\d{4}-\d{2}$/.test(month) ? all.filter(row => row.issue_date.startsWith(month)) : [];
  // Sin la migración de seguimiento no hay vencimientos: no se muestran saldos que parecerían vencidos.
  const openRows = !tracked ? [] : all.filter(row => { const status = accounts.get(row.id)?.status; return status && status !== 'cancelled' && status !== 'credit_applied'; })
    .sort((a, b) => (a.due_date ?? a.issue_date).localeCompare(b.due_date ?? b.issue_date));
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const openSuppliers = [...new Map(openRows.map(row => [row.issuer_cuit, row.supplier_name])).entries()];
  const filteredOpen = openRows.filter(row => (!statusFilter || accounts.get(row.id)?.status === statusFilter) && (!supplierFilter || row.issuer_cuit === supplierFilter));
  const rows = view === 'month' ? monthRows : filteredOpen;

  // Las notas de crédito restan.
  const sign = (row: PurchaseInvoice) => CREDIT_NOTE_TYPES.has(row.voucher_type) ? -1 : 1;
  const sum = (pick: (row: PurchaseInvoice) => number) => monthRows.reduce((total, row) => total + sign(row) * pick(row), 0);
  const totals = [
    { label: 'Neto gravado', value: sum(row => row.net_21 + row.net_10_5 + row.net_27) },
    { label: 'IVA crédito fiscal', value: sum(row => row.vat_21 + row.vat_10_5 + row.vat_27) },
    { label: 'Impuestos internos', value: sum(row => row.internal_taxes) },
    { label: 'Percepciones IVA', value: sum(row => row.vat_perceptions) },
    { label: 'Percepciones IIBB', value: sum(row => row.iibb_perceptions) },
    { label: 'Total comprado', value: sum(row => row.total) },
  ];
  const debtOf = (status: string) => openRows.filter(row => accounts.get(row.id)?.status === status).reduce((total, row) => total + (accounts.get(row.id)?.balance ?? 0), 0);
  const openTotals = [
    { label: 'Total adeudado', value: openRows.filter(row => !CREDIT_NOTE_TYPES.has(row.voucher_type)).reduce((total, row) => total + (accounts.get(row.id)?.balance ?? 0), 0) },
    { label: 'Vencido', value: debtOf('overdue') },
    { label: 'En revisión', value: debtOf('review') },
    { label: 'Créditos a favor', value: debtOf('credit_available') },
  ];
  const unbalanced = monthRows.filter(row => !row.balanced).length;
  const withPerceptions = monthRows.filter(row => row.vat_perceptions > 0 || row.iibb_perceptions > 0).length;

  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><FileText size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Comprobantes de compra</h3>
        <p>Facturas y notas de proveedores con sus datos fiscales, vencimiento y saldo. Registrar o eliminar un comprobante no cambia el stock.</p>
      </div>
    </div>
    <div className="location-card-body">
      <div className="purchase-list-controls">
        {canAccount && <div className="location-transfer-tabs purchase-view-tabs" role="group" aria-label="Qué comprobantes ver">
          <button type="button" className="secondary-button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Por mes</button>
          <button type="button" className="secondary-button" aria-pressed={view === 'open'} onClick={() => setView('open')}>Con saldo pendiente</button>
        </div>}
        {view === 'month' && <label className="purchase-list-month">Mes<input type="month" value={month} disabled={loading} onChange={event => setMonth(event.target.value)} /></label>}
      </div>
      {canManage && <SettingsEditor label="Cargar comprobante manual" busy={busy || loading}>
        {close => <ManualPurchaseInvoiceForm storeId={storeId} invoices={all} payments={payments} busy={busy} run={run} close={close} onSaved={changed} />}
      </SettingsEditor>}
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      {!error && !loading && !rows.length && <div className="location-empty-notice">
        <FileText size={24} />
        <p>{view === 'month' ? 'No hay comprobantes en este mes. Se registran desde Importar factura o con «Cargar comprobante manual».' : tracked || !all.length ? 'No hay saldos pendientes con proveedores.' : 'Para ver saldos y vencimientos, aplicá la actualización 202610290007 en Supabase.'}</p>
      </div>}
      {view === 'month' && monthRows.length > 0 && <>
        <div className="team-summary-badges">
          <span className="location-pill-badge active">{monthRows.length} {monthRows.length === 1 ? 'comprobante' : 'comprobantes'}</span>
          {unbalanced > 0 && <span className="location-pill-badge"><AlertTriangle size={11} /> {unbalanced} con importes que no cierran</span>}
        </div>
        <dl className="purchase-list-totals">
          {totals.map(total => <div key={total.label}><dt>{total.label}</dt><dd>{formatMoney(total.value)}</dd></div>)}
        </dl>
        <div className="purchase-list-export">
          <button type="button" className="secondary-button" disabled={loading} onClick={() => downloadCsv(purchaseVatBookCsv(monthRows), `libro-iva-compras-${month}.csv`)}>
            <Download size={15} /> Libro IVA compras (Excel)
          </button>
          <button type="button" className="secondary-button" disabled={loading || !withPerceptions} onClick={() => downloadCsv(purchasePerceptionsCsv(monthRows), `percepciones-compras-${month}.csv`)}>
            <Download size={15} /> Percepciones ({withPerceptions})
          </button>
          <p>{monthRows.length === 1 ? 'Incluye el comprobante del mes' : `Incluye los ${monthRows.length} comprobantes del mes`} por fecha de emisión. {unbalanced > 0
            ? `Hay ${unbalanced} con importes que no cierran: corregilos antes de enviar la planilla.`
            : 'Revisá la planilla con tu contador antes de presentarla.'}</p>
        </div>
      </>}
      {view === 'open' && openRows.length > 0 && <div className="purchase-list-controls">
        <label className="purchase-list-month">Estado
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="">Todos</option>
            {(['pending', 'overdue', 'review', 'credit_available'] as const).map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        <label className="purchase-list-month">Proveedor
          <select value={supplierFilter} onChange={event => setSupplierFilter(event.target.value)}>
            <option value="">Todos</option>
            {openSuppliers.map(([cuit, name]) => <option key={cuit} value={cuit}>{name}</option>)}
          </select>
        </label>
      </div>}
      {view === 'open' && openRows.length > 0 && <dl className="purchase-list-totals">
        {openTotals.map(total => <div key={total.label}><dt>{total.label}</dt><dd>{formatMoney(total.value)}</dd></div>)}
      </dl>}
      {rows.map(row => {
        const account = accounts.get(row.id)!;
        return <SettingsEditor key={`${row.id}:${row.due_date}:${row.review_reason}:${row.accepted_at}:${row.applies_to}`} label="Ver detalle" busy={busy || loading}
          summary={<div className="category-summary-row supplier-summary-row">
            <strong>{row.supplier_name}</strong>
            <span className="location-pill-badge">{voucherName(row)}</span>
            <span className="location-pill-badge">{displayDate(row.issue_date)}</span>
            <span className="location-pill-badge active">{formatMoney(sign(row) * row.total)}</span>
            {canAccount && row.due_date && <StatusBadge account={account} />}
            {canAccount && row.due_date && !CREDIT_NOTE_TYPES.has(row.voucher_type) && account.status !== 'cancelled' && <span className="location-pill-badge">
              Saldo {formatMoney(account.balance)} · {dueLabel(account)}
            </span>}
            {row.balanced ? <span className="location-pill-badge active"><CheckCircle2 size={11} /> Cierra</span>
              : <span className="location-pill-badge"><AlertTriangle size={11} /> Importes no cierran</span>}
            {row.qr_verified && <span className="location-pill-badge active"><QrCode size={11} /> QR</span>}
          </div>}>
          {close => <div className="purchase-list-detail">
            <dl>
              <div><dt>CUIT proveedor</dt><dd>{formatCuit(row.issuer_cuit)}</dd></div>
              {row.receiver_cuit && <div><dt>CUIT receptor</dt><dd>{formatCuit(row.receiver_cuit)}</dd></div>}
              {row.authorization_code && <div><dt>{row.authorization_type === 'A' ? 'CAEA' : 'CAE'}</dt><dd>{row.authorization_code}</dd></div>}
              {row.due_date && <div><dt>Vencimiento</dt><dd>{displayDate(row.due_date)}</dd></div>}
              {PURCHASE_AMOUNT_FIELDS.filter(field => row[field.id] !== 0).map(field => <div key={field.id}><dt>{field.label}</dt><dd>{formatMoney(row[field.id])}</dd></div>)}
              {row.actor_email && <div><dt>Registró</dt><dd>{row.actor_email}</dd></div>}
            </dl>
            {canManage && <TrackingEditor row={row} rows={all} payments={payments} showBalance={canAccount} storeId={storeId} busy={busy} run={run} onSaved={changed} />}
            <p>Los importes no se editan: para corregirlos, eliminá el comprobante y volvé a registrarlo. Las diferencias comerciales se resuelven con notas de crédito o débito.</p>
            {canManage && <button type="button" className="text-button danger-text" disabled={busy} onClick={async () => {
              if (!window.confirm(`¿Eliminar el comprobante ${voucherName(row)} de ${row.supplier_name}? El stock no cambia; las notas vinculadas quedan sin vincular.`)) return;
              if (await run(() => retail.deletePurchaseInvoice(storeId, row.id), 'Comprobante eliminado')) { close(); changed(); }
            }}>Eliminar comprobante</button>}
          </div>}
        </SettingsEditor>;
      })}
    </div>
  </div>;
}
