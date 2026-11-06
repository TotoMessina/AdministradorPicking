import { useState, type CSSProperties } from 'react';
import { Printer, X } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';
import type { Store } from './api';

/** Serie del recibo: la asigna la base según el movimiento (202611060010). */
export type ReceiptSeries = 'income' | 'payment' | 'transfer';
export const receiptTitles: Record<ReceiptSeries, string> = { income: 'Recibo de ingreso', payment: 'Recibo de pago', transfer: 'Constancia de movimiento entre cuentas' };

export interface MovementReceiptData {
  series: ReceiptSeries;
  number?: number | null;
  amount: number;
  at: string;
  concept: string;
  /** Proveedor u otra persona que recibe o entrega la plata. */
  counterpart?: string | null;
  source?: string | null;
  destination?: string | null;
  actor?: string | null;
}

export const receiptNumber = (number?: number | null) => number ? String(number).padStart(8, '0') : 'sin número';

const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
  'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis',
  'veintisiete', 'veintiocho', 'veintinueve'];
const tens = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
function belowThousand(value: number): string {
  if (value === 100) return 'cien';
  const hundred = Math.floor(value / 100), rest = value % 100;
  const restText = rest < 30 ? units[rest] : `${tens[Math.floor(rest / 10)]}${rest % 10 ? ` y ${units[rest % 10]}` : ''}`;
  return [hundreds[hundred], restText].filter(Boolean).join(' ');
}
function belowMillion(value: number): string {
  const thousands = Math.floor(value / 1000), rest = value % 1000;
  return [thousands === 1 ? 'mil' : thousands ? `${belowThousand(thousands)} mil` : '', rest ? belowThousand(rest) : ''].filter(Boolean).join(' ');
}
/** Importe en letras para el recibo, por ejemplo «ciento veinte mil pesos con 50/100». */
export function amountInWords(amount: number) {
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const millions = Math.floor(whole / 1_000_000), rest = whole % 1_000_000;
  const text = [millions === 1 ? 'un millón' : millions ? `${belowMillion(millions)} millones` : '', rest ? belowMillion(rest) : ''].filter(Boolean).join(' ') || 'cero';
  const currency = whole === 1 ? 'peso' : millions && !rest ? 'de pesos' : 'pesos';
  return `${text} ${currency} con ${String(cents % 100).padStart(2, '0')}/100`;
}

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

/** Recibo imprimible de un movimiento de plata. Usa el mismo papel que el ticket (print.css). No es fiscal. */
export function MovementReceipt({ store, receipt, onClose }: { store: Pick<Store, 'name' | 'address' | 'razon_social' | 'cuit'>; receipt: MovementReceiptData; onClose: () => void }) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const dialogRef = useDialogFocus(true, onClose);
  const title = receiptTitles[receipt.series];
  const verb = receipt.series === 'income' ? 'Recibimos' : receipt.series === 'payment' ? 'Entregamos' : 'Se movió';
  return <div className="receipt-modal-backdrop movement-receipt-backdrop" onClick={onClose}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${title} N° ${receiptNumber(receipt.number)}`} tabIndex={-1} className="movement-receipt-dialog" onClick={event => event.stopPropagation()}>
      <div className="movement-receipt-toolbar">
        <strong>{title}</strong>
        <div role="group" aria-label="Ancho del papel">
          {(['58mm', '80mm'] as const).map(width => <button key={width} type="button" className="secondary-button" aria-pressed={paperWidth === width} onClick={() => setPaperWidth(width)}>{width}</button>)}
        </div>
        <button type="button" className="primary-button" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
        <button type="button" className="icon-button" aria-label="Cerrar recibo" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="movement-receipt-body">
        <div className="receipt-paper movement-receipt-paper" style={{ '--receipt-width': paperWidth, width: paperWidth === '58mm' ? 300 : 360 } as CSSProperties}>
          <header>
            <strong>{store.razon_social || store.name}</strong>
            {store.cuit && <span>CUIT {store.cuit}</span>}
            {store.address && <span>{store.address}</span>}
          </header>
          <h2>{title}</h2>
          <p className="movement-receipt-number">N° {receiptNumber(receipt.number)}</p>
          <p>{new Date(receipt.at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
          <hr />
          <p>{verb} la suma de <strong>{amountInWords(receipt.amount)}</strong>.</p>
          <p className="movement-receipt-amount">{money(receipt.amount)}</p>
          <dl>
            <div><dt>Concepto</dt><dd>{receipt.concept}</dd></div>
            {receipt.counterpart && <div><dt>{receipt.series === 'payment' ? 'Pagado a' : receipt.series === 'income' ? 'Entregado por' : 'Detalle'}</dt><dd>{receipt.counterpart}</dd></div>}
            {receipt.source && <div><dt>Sale de</dt><dd>{receipt.source}</dd></div>}
            {receipt.destination && <div><dt>Va a</dt><dd>{receipt.destination}</dd></div>}
            {receipt.actor && <div><dt>Registró</dt><dd>{receipt.actor}</dd></div>}
          </dl>
          <div className="movement-receipt-sign"><span>Firma</span><span>Aclaración</span></div>
          <p className="movement-receipt-legal">Documento no válido como factura.</p>
        </div>
      </div>
    </div>
  </div>;
}
