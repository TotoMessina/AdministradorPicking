import type { ReceiptView } from './receiptDetails';

/** Pie del ticket: CAE, QR y leyendas. */
export function ReceiptFooter({ view }: { view: ReceiptView }) {
  const { isFiscal, caeVtoStr, qrUrl, sale } = view;
  return (
    <>
      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: "0.6875rem",
          color: "#64748b",
        }}
      >
        {isFiscal ? (
          <div style={{ margin: "0.5rem 0", textAlign: "center" }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=110x110&margin=2`}
              alt="Código QR ARCA"
              style={{ width: "110px", height: "110px", margin: "0 auto", display: "block" }}
            />
            <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              CAE: {sale.cae}
            </div>
            <div style={{ fontSize: "0.625rem", fontWeight: 600, color: "#334155" }}>
              Fecha Vto. CAE: {caeVtoStr}
            </div>
            <div style={{ fontSize: "0.5625rem", color: "#64748b", marginTop: "2px" }}>
              Comprobante electrónico autorizado por ARCA
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, color: "#475569" }}>
              *** COMPROBANTE NO VÁLIDO COMO FACTURA ***
            </div>
            {sale.billingStatus === 'pending' && (
              <div style={{ background: "#fefce8", color: "#854d0e", border: "1px solid #fef08a", padding: "4px 8px", borderRadius: "4px", fontSize: "0.625rem", fontWeight: 700, margin: "6px 0" }}>
                ⏳ EN TRÁMITE DE AUTORIZACIÓN ANTE ARCA
              </div>
            )}
            {sale.billingStatus === 'error' && (
              <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: "4px", fontSize: "0.625rem", fontWeight: 700, margin: "6px 0" }}>
                ⚠️ EMISIÓN FISCAL PENDIENTE DE REINTENTO
              </div>
            )}
            <div style={{ marginTop: "3px" }}>
              {sale.receiptMessage || "¡Gracias por tu compra!"}
            </div>
            <div style={{ marginTop: "2px" }}>
              Conservar este ticket ante cambios
            </div>

            {/* Barcode graphic emulation */}
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                height: "24px",
                gap: "2px",
              }}
            >
              {[
                2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 3, 2, 1, 4, 2, 1, 3, 2, 1, 3,
              ].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: `${h}px`,
                    height: "100%",
                    background: "#0f172a",
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: "0.625rem",
                letterSpacing: "2px",
                marginTop: "2px",
              }}
            >
              {sale.ticketNumber}
            </div>
          </>
        )}
      </div>
    </>
  );
}
