import type { PaymentMethod } from '../../types/kiosco';
import type { SalesLedger } from './api';

export const ledgerPaymentMethods: { id: PaymentMethod; label: string }[] = [
  { id: 'Efectivo', label: 'Efectivo' }, { id: 'QR', label: 'QR' },
  { id: 'Transferencia', label: 'Transferencia' }, { id: 'Debito', label: 'Débito' },
  { id: 'Credito', label: 'Crédito' }, { id: 'Mixto', label: 'Pago mixto' },
];

export function resolveSaleLedger(ledgers: readonly SalesLedger[], method: PaymentMethod, manualId?: string): SalesLedger | undefined {
  if (manualId) return ledgers.find(ledger => ledger.id === manualId && ledger.active);
  return ledgers.find(ledger => ledger.active && ledger.payment_methods?.includes(method))
    || ledgers.find(ledger => ledger.active && ledger.is_default)
    || ledgers.find(ledger => ledger.active);
}
