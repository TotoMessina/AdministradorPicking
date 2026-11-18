import { fiscalMoney, type ReceiptView } from './receiptDetails';

/** Pie del ticket: CAE, QR y leyendas. */
export function ReceiptFooter({ view }: { view: ReceiptView }) {
  const { isFiscal, caeVtoStr, qrSrc, sale, isTestInvoice, showTransparency, vatAmount, authLabel, isCaea } = view;
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
            {/* Ley 27.743: abajo a la izquierda, con el IVA contenido informado. */}
            {showTransparency && (
              <div style={{ textAlign: "left", fontSize: "0.625rem", color: "#0f172a", borderTop: "1px dashed #cbd5e1", paddingTop: "4px", marginBottom: "6px" }}>
                <div style={{ fontWeight: 700 }}>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</div>
                <div>IVA Contenido: {fiscalMoney(vatAmount)}</div>
                <div>Otros Impuestos Nacionales Indirectos: {fiscalMoney(0)}</div>
              </div>
            )}
            {qrSrc && <img
              src={qrSrc}
              alt="Código QR ARCA"
              style={{ width: "110px", height: "110px", margin: "0 auto", display: "block", imageRendering: "pixelated" }}
            />}
            <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {authLabel}: {sale.cae}
            </div>
            <div style={{ fontSize: "0.625rem", fontWeight: 600, color: "#334155" }}>
              Fecha Vto. {authLabel}: {caeVtoStr}
            </div>
            {isCaea && <div style={{ fontSize: "0.5625rem", color: "#64748b" }}>Emitido en contingencia (CAEA)</div>}
            {isTestInvoice ? (
              <div style={{ fontSize: "0.625rem", fontWeight: 800, color: "#991b1b", marginTop: "2px" }}>
                PRUEBA EN HOMOLOGACIÓN DE ARCA · SIN VALIDEZ FISCAL
              </div>
            ) : (
              <div style={{ fontSize: "0.5625rem", color: "#64748b", marginTop: "2px" }}>
                Comprobante electrónico autorizado por ARCA
              </div>
            )}
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
