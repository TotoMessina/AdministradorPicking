import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, RotateCw } from 'lucide-react';
import type { KioscoSale } from '../../types/kiosco';
import {
  formatCaeVto,
  formatComprobanteNro,
  getComprobanteTipoLabel,
} from './billing';
import './billing.css';

export function BillingStatusBadge({
  sale,
  puntoVenta = 1,
  onRetry,
  disabled = false,
}: {
  sale: KioscoSale;
  puntoVenta?: number;
  onRetry?: (sale: KioscoSale) => Promise<void>;
  disabled?: boolean;
}) {
  const [retrying, setRetrying] = useState(false);
  const status = sale.billingStatus || 'none';

  if (status === 'none') {
    return null;
  }

  if (status === 'authorized') {
    const tipoLabel = getComprobanteTipoLabel(sale.cbteTipo);
    const cbteStr = sale.cbteNro
      ? formatComprobanteNro(puntoVenta, sale.cbteNro)
      : '';
    const vtoStr = sale.caeVto ? formatCaeVto(sale.caeVto) : '';

    return (
      <span
        className="billing-status-badge billing-status-authorized"
        title={`CAE: ${sale.cae || 'Autorizado'}${vtoStr ? ` · Vto: ${vtoStr}` : ''}`}
      >
        <CheckCircle2 size={12} />
        <span>
          {tipoLabel} {cbteStr}
        </span>
      </span>
    );
  }

  if (status === 'pending' || status === 'retry') {
    return (
      <span
        className="billing-status-badge billing-status-pending"
        title={
          status === 'retry'
            ? `Reintento ${sale.billingAttempts || 1}: procesando emisión en ARCA`
            : 'Pendiente de autorización en ARCA'
        }
      >
        <Clock size={12} />
        <span>ARCA: Pendiente</span>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        className="billing-status-badge billing-status-error"
        title={sale.billingError || 'Error al comunicarse con ARCA'}
      >
        <AlertCircle size={12} />
        <span>ARCA: Error</span>
        {onRetry && (
          <button
            type="button"
            className="billing-status-retry-btn"
            disabled={disabled || retrying}
            onClick={async (e) => {
              e.stopPropagation();
              setRetrying(true);
              try {
                await onRetry(sale);
              } finally {
                setRetrying(false);
              }
            }}
            title="Reintentar obtención de CAE"
          >
            {retrying ? '…' : 'Reintentar'}
          </button>
        )}
      </span>
    );
  }

  return null;
}
