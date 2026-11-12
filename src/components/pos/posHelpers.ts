import { Banknote, QrCode, Link2, CreditCard } from 'lucide-react';
import type { PaymentMethod } from '../../types/kiosco';

export const money = (n: number) =>
  "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
// Los borradores de otras pantallas pueden conservar diálogos montados pero ocultos.
export const hasVisibleDialog = () => Array.from(document.querySelectorAll('[role="dialog"]:not([data-pos-payment])')).some(dialog => dialog.getClientRects().length > 0);
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "Efectivo", label: "Efectivo", icon: Banknote },
  { id: "QR", label: "QR", icon: QrCode },
  { id: "Transferencia", label: "Transferencia", icon: Banknote },
  { id: "Link", label: "Link de pago", icon: Link2 },
  { id: "Mixto", label: "Mixto", icon: CreditCard },
  { id: "Debito", label: "Débito", icon: CreditCard },
  { id: "Credito", label: "Crédito", icon: CreditCard },
];
