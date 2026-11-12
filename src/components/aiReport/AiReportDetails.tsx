import { TrendingUp, CreditCard } from 'lucide-react';
import type { AiReportPanelState } from './useAiReportPanel';

/** Medios de pago y productos más vendidos. */
export function AiReportDetails({ state }: { state: AiReportPanelState }) {
  const { metrics } = state;
  return (
    <>
      {/* Breakdown: Payments & Top Products (Calculated locally) */}
      <div className="ai-report-details-grid">
        {/* Payment Methods */}
        <div className="ai-report-section-box">
          <h3 className="ai-report-section-title">
            <CreditCard size={15} />
            <span>Distribución por Método de Pago</span>
          </h3>
          <div className="ai-report-payments-list">
            {metrics.paymentDistribution.length > 0 ? (
              metrics.paymentDistribution.map((p) => (
                <div key={p.method} className="ai-report-payment-row">
                  <span className="ai-report-payment-name">{p.method}</span>
                  <div className="ai-report-payment-stats">
                    <span className="ai-report-payment-amount">
                      ${p.amount.toLocaleString("es-AR")}
                    </span>
                    <span className="ai-report-payment-pct">
                      {p.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="ai-report-empty-data">
                No hay pagos registrados para este período.
              </p>
            )}
          </div>
        </div>

        {/* Top 5 Products */}
        <div className="ai-report-section-box">
          <h3 className="ai-report-section-title">
            <TrendingUp size={15} />
            <span>Top 5 Productos Vendidos</span>
          </h3>
          <div className="ai-report-products-list">
            {metrics.topProducts.length > 0 ? (
              metrics.topProducts.map((prod, idx) => (
                <div key={idx} className="ai-report-product-row">
                  <div className="ai-report-product-info">
                    <span className="ai-report-product-rank">{idx + 1}</span>
                    <span className="ai-report-product-name" title={prod.name}>
                      {prod.name}
                    </span>
                  </div>
                  <div className="ai-report-product-stats">
                    <span className="ai-report-product-qty">{prod.qty} u.</span>
                    <span className="ai-report-product-total">
                      ${prod.subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="ai-report-empty-data">
                No hay ventas de productos para este período.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
