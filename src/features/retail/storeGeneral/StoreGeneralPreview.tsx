import { Eye, Receipt } from 'lucide-react';
import type { StoreGeneralSettingsState } from './useStoreGeneralSettings';

/** Vista previa de cómo se ve el comercio. */
export function StoreGeneralPreview({ state }: { state: StoreGeneralSettingsState }) {
  const { name, address, phone, color, message } = state;
  return (
    <>
      <div className="store-preview-wrapper">
        <div className="store-preview-header">
          <div className="store-preview-header-title">
            <Receipt size={16} className="store-preview-header-icon" />
            <h4>Vista previa del ticket</h4>
          </div>
          <span className="store-preview-badge">Térmica 58/80mm</span>
        </div>

        <div className="thermal-ticket-card" style={{ '--store-accent': color } as React.CSSProperties}>
          <div className="thermal-ticket-accent-bar" style={{ backgroundColor: color }} />
          <div className="thermal-ticket-header">
            <h4 className="thermal-ticket-title">{name || 'MI COMERCIO'}</h4>
            <p className="thermal-ticket-meta">
              {address || 'Dirección de ejemplo 123'}
              <br />
              {phone ? `TEL: ${phone}` : 'TEL: 11 0000-0000'}
            </p>
          </div>

          <div className="thermal-ticket-body">
            <div className="thermal-ticket-row">
              <span>1x Café expreso</span>
              <strong>$ 1.500,00</strong>
            </div>
            <div className="thermal-ticket-row">
              <span>2x Medialunas</span>
              <strong>$ 1.600,00</strong>
            </div>
            <hr className="thermal-ticket-divider" />
            <div className="thermal-ticket-row thermal-ticket-total">
              <span>TOTAL</span>
              <span>$ 3.100,00</span>
            </div>
            <div className="thermal-ticket-row" style={{ color: '#78716c', fontSize: '11px' }}>
              <span>PAGO: EFECTIVO</span>
              <span>$ 3.100,00</span>
            </div>
          </div>

          <div className="thermal-ticket-footer">
            <p className="thermal-ticket-message">
              "{message || '¡Gracias por su compra!'}"
            </p>
          </div>
          <div className="thermal-ticket-bottom-scallop" />
        </div>

        <div className="preview-helper-badge">
          <Eye size={15} />
          <span>Actualización en tiempo real con los datos y el color seleccionado.</span>
        </div>
      </div>
    </>
  );
}
