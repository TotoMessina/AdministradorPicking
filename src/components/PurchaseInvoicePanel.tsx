import { useId } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, QrCode, Sparkles } from 'lucide-react';
import { NumberInput } from './NumberInput';
import type { PurchaseInvoice } from '../features/retail/api';
import {
  PURCHASE_AMOUNT_FIELDS, VOUCHER_TYPES, formatMoney, voucherNumber,
  type PurchaseInvoiceChecks, type PurchaseInvoiceDraft,
} from '../services/purchaseInvoiceService';
import { cuitDigits, formatCuit } from '../services/supplierInvoiceRules';

export type QrStatus = 'none' | 'scanning' | 'found' | 'not_found';

/** Cabecera fiscal y pie de la factura para el contador. Independiente del stock. */
export function PurchaseInvoicePanel({
  draft, onChange, checks, qrStatus, storeCuit, duplicate, register, onRegister, aiBusy, aiError, onFillWithAi, disabled, manual = false,
}: {
  draft: PurchaseInvoiceDraft;
  onChange: (draft: PurchaseInvoiceDraft) => void;
  checks: PurchaseInvoiceChecks;
  qrStatus: QrStatus;
  storeCuit?: string | null;
  duplicate: PurchaseInvoice | null;
  register: boolean;
  onRegister: (register: boolean) => void;
  aiBusy: boolean;
  aiError: string;
  onFillWithAi: () => void;
  disabled: boolean;
  /** Carga manual desde Proveedores: sin QR, sin IA y sin la opción de registrar al aplicar. */
  manual?: boolean;
}) {
  const id = useId();
  const set = (patch: Partial<PurchaseInvoiceDraft>) => onChange({ ...draft, ...patch });
  const ready = !checks.missing.length;
  const status = !ready ? `Faltan: ${checks.missing.join(', ')}` : checks.balanced ? 'Cierra con el total' : 'Revisar importes';
  return (
    <details className="purchase-invoice-panel" open>
      <summary>
        Datos fiscales para el contador
        <small className={ready && checks.balanced ? 'is-ok' : 'is-warning'}>{status}</small>
      </summary>
      <p className="purchase-invoice-intro">Se registran aparte de la mercadería: no cambian stock ni costos. Revisalos contra la factura.</p>

      {!manual && <p className={`purchase-invoice-status ${qrStatus === 'found' ? (checks.qrVerified ? 'is-ok' : 'is-warning') : ''}`} role="status">
        {qrStatus === 'scanning' && <><Loader2 size={14} className="loading-spin" aria-hidden="true" /> Buscando el código QR de ARCA en la imagen…</>}
        {qrStatus === 'found' && (checks.qrVerified
          ? <><QrCode size={14} aria-hidden="true" /> Verificado con el QR de ARCA: CUIT, número, fecha y total son los oficiales.</>
          : <><AlertTriangle size={14} aria-hidden="true" /> No coincide con el QR de ARCA: {checks.qrIssues.join(', ')}. Revisá esos datos.</>)}
        {qrStatus === 'not_found' && 'No se encontró el QR de ARCA en la imagen. Completá la cabecera mirando la factura.'}
        {qrStatus === 'none' && 'Sin imagen para buscar el QR de ARCA. Completá la cabecera mirando la factura.'}
      </p>}

      {checks.receiverMismatch && <p className="purchase-invoice-alert" role="alert">
        <AlertTriangle size={15} aria-hidden="true" /> La factura está a nombre del CUIT {formatCuit(draft.receiver_cuit)}, no del comercio ({formatCuit(storeCuit || '')}). Ese crédito fiscal no es de tu sociedad: confirmalo con tu contador.
      </p>}
      {duplicate && <p className="purchase-invoice-alert" role="alert">
        <AlertTriangle size={15} aria-hidden="true" /> Este comprobante ya se registró el {new Date(duplicate.created_at).toLocaleDateString('es-AR')}
        {duplicate.actor_email ? ` (${duplicate.actor_email})` : ''}. Revisá que la mercadería no se esté cargando dos veces.
      </p>}

      <div className="purchase-invoice-grid">
        <label>Tipo
          <select value={draft.voucher_type ?? ''} disabled={disabled} onChange={event => set({ voucher_type: event.target.value ? Number(event.target.value) : null })}>
            <option value="">Elegí el tipo</option>
            {VOUCHER_TYPES.map(type => <option key={type.code} value={type.code}>{type.label}</option>)}
          </select>
        </label>
        <label>Punto de venta
          <input inputMode="numeric" autoComplete="off" maxLength={5} value={draft.point_of_sale} disabled={disabled}
            onChange={event => set({ point_of_sale: event.target.value.replace(/\D/g, '') })} placeholder="Ej.: 7" />
        </label>
        <label>Número
          <input inputMode="numeric" autoComplete="off" maxLength={8} value={draft.number} disabled={disabled}
            onChange={event => set({ number: event.target.value.replace(/\D/g, '') })} placeholder="Ej.: 366648" />
        </label>
        <label>Fecha de emisión
          <input type="date" value={draft.issue_date} disabled={disabled} onChange={event => set({ issue_date: event.target.value })} />
        </label>
        <label>CUIT del proveedor
          <input inputMode="numeric" autoComplete="off" maxLength={13} value={draft.issuer_cuit} disabled={disabled}
            onChange={event => set({ issuer_cuit: event.target.value })}
            onBlur={() => { if (cuitDigits(draft.issuer_cuit).length === 11) set({ issuer_cuit: formatCuit(draft.issuer_cuit) }); }} />
        </label>
        <label>CUIT receptor
          <input inputMode="numeric" autoComplete="off" maxLength={13} value={draft.receiver_cuit} disabled={disabled}
            onChange={event => set({ receiver_cuit: event.target.value })}
            onBlur={() => { if (cuitDigits(draft.receiver_cuit).length === 11) set({ receiver_cuit: formatCuit(draft.receiver_cuit) }); }} />
        </label>
        <label>{draft.authorization_type === 'A' ? 'CAEA' : 'CAE'}
          <input inputMode="numeric" autoComplete="off" maxLength={14} value={draft.authorization_code} disabled={disabled}
            onChange={event => set({ authorization_code: event.target.value.replace(/\D/g, ''), authorization_type: draft.authorization_type || 'E' })} />
        </label>
      </div>
      {draft.voucher_type && draft.point_of_sale && draft.number && <p className="purchase-invoice-intro">
        Comprobante {voucherNumber(draft.point_of_sale, draft.number)}
      </p>}

      <div className="purchase-invoice-amounts">
        {PURCHASE_AMOUNT_FIELDS.map(field => <label key={field.id} className={field.id === 'total' ? 'is-total' : undefined}>{field.label}
          <NumberInput step="0.01" min="0" value={draft.amounts[field.id]} disabled={disabled} placeholder="0"
            onValueChange={value => set({ amounts: { ...draft.amounts, [field.id]: value } })} />
        </label>)}
      </div>
      {!manual && <div className="purchase-invoice-actions">
        <button type="button" className="secondary-button" disabled={disabled || aiBusy} onClick={onFillWithAi}>
          {aiBusy ? <Loader2 size={14} className="loading-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} Completar importes vacíos con IA
        </button>
        {aiError && <span role="alert">{aiError}</span>}
      </div>}

      <div className={`purchase-invoice-check ${checks.balanced ? 'is-ok' : 'is-warning'}`} role="status">
        {checks.balanced
          ? <><CheckCircle2 size={15} aria-hidden="true" /> Cierra: IVA por alícuota correcto y la suma de conceptos da el total.</>
          : <><AlertTriangle size={15} aria-hidden="true" /> <span>
            {Math.abs(checks.difference) > 0.05 && `La suma de conceptos ${checks.difference > 0 ? 'supera al' : 'no llega al'} total por ${formatMoney(Math.abs(checks.difference))}. `}
            {checks.vatIssues.join('. ')}{checks.vatIssues.length ? '.' : ''}
            {Math.abs(checks.difference) <= 0.05 && !checks.vatIssues.length && 'Completá el total.'}
          </span></>}
      </div>

      {!manual && <label className="purchase-invoice-register" htmlFor={`${id}-register`}>
        <input id={`${id}-register`} type="checkbox" checked={register} disabled={disabled} onChange={event => onRegister(event.target.checked)} />
        <span>Registrar el comprobante al aplicar la reposición{!ready && register ? ` (faltan: ${checks.missing.join(', ')})` : ''}</span>
      </label>}
    </details>
  );
}
