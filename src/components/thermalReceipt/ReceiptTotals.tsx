import type { ReceiptView } from './receiptDetails';

/** Totales y medios de pago. */
export function ReceiptTotals({ view }: { view: ReceiptView }) {
  const { sale } = view;
  return (
    <>
      {/* Totals */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          fontSize: "0.8125rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 900,
            fontSize: "1rem",
          }}
        >
          <span>TOTAL:</span>
          <span>${sale.total.toLocaleString("es-AR")}</span>
        </div>
        {sale.returnStatus && sale.returnStatus !== 'none' && <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>{sale.returnStatus === 'voided' ? 'VENTA ANULADA' : 'Devuelto:'}</span>
          {sale.returnStatus === 'partial' && <span>${(sale.returnedTotal || 0).toLocaleString('es-AR')}</span>}
        </div>}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#475569",
            fontSize: "0.75rem",
          }}
        >
          <span>Método de Pago:</span>
          <span style={{ fontWeight: 700 }}>{sale.paymentMethod}</span>
        </div>
        {sale.customerName && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cliente:</span><span style={{ fontWeight: 700 }}>{sale.customerName}</span></div>}
        {sale.payments && sale.payments.length > 1 && sale.payments.map(p => <div key={p.method} className="receipt-payment-part">{p.method}: ${p.amount.toLocaleString('es-AR')}</div>)}
        {sale.syncStatus === 'pending' && <p>Guardado local · pendiente de sincronizar</p>}
        {sale.paymentMethod === "Efectivo" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#475569",
                fontSize: "0.75rem",
              }}
            >
              <span>Paga con:</span>
              <span>${sale.amountPaid.toLocaleString("es-AR")}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                color: "#047857",
                fontSize: "0.875rem",
                background: "#ecfdf5",
                padding: "2px 6px",
                borderRadius: "4px",
                marginTop: "2px",
              }}
            >
              <span>VUELTO:</span>
              <span>${sale.change.toLocaleString("es-AR")}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
