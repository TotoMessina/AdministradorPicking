import { NumberInput } from '../../../components/NumberInput';
import { formatMoney, voucherLabel, voucherNumber } from '../../../services/purchaseInvoiceService';
import { displayDate, cents, openDocuments } from './paymentHelpers';

/** Montos aplicados a cada comprobante pendiente. */
export function AllocationFields({ documents, values, onChange, available, disabled }: {
  documents: ReturnType<typeof openDocuments>; values: Record<string, string>; onChange: (values: Record<string, string>) => void; available: number; disabled: boolean;
}) {
  if (!documents.length) return <p className="purchase-tracking-note">Este proveedor no tiene comprobantes con saldo: el importe queda a tu favor como anticipo.</p>;
  return <div className="payment-allocations">
    <div className="payment-allocations-head">
      <strong>¿Qué factura estás pagando?</strong>
      <button type="button" className="text-button" disabled={disabled || available <= 0} onClick={() => {
        let left = available;
        const next: Record<string, string> = {};
        for (const { invoice, balance } of documents) {
          if (left <= 0.005) break;
          const value = cents(Math.min(left, balance));
          next[invoice.id] = String(value);
          left = cents(left - value);
        }
        onChange(next);
      }}>Completar desde la más antigua</button>
    </div>
    {documents.map(({ invoice, balance }) => <label key={invoice.id}>
      <span>{voucherLabel(invoice.voucher_type)} {voucherNumber(invoice.point_of_sale, invoice.number)} · vence {displayDate(invoice.due_date ?? invoice.issue_date)} · saldo {formatMoney(balance)}</span>
      <NumberInput step="0.01" min="0" max={balance} value={values[invoice.id] ?? ''} disabled={disabled} placeholder="0" aria-label={`Importe aplicado a ${voucherNumber(invoice.point_of_sale, invoice.number)}`}
        onValueChange={value => onChange({ ...values, [invoice.id]: value })} />
    </label>)}
  </div>;
}
