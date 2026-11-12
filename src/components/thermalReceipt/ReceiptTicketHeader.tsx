import type { ReceiptView } from './receiptDetails';

/** Encabezado del ticket: comercio y datos fiscales. */
export function ReceiptTicketHeader({ view }: { view: ReceiptView }) {
  const { isFiscal, tipoLabel, cbteNroStr, cuitFormatted, ivaLabel, receptorLine, sale, store } = view;
  return (
    <>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
        <div
          style={{
            fontSize: "1.125rem",
            fontWeight: 900,
            letterSpacing: "1px",
          }}
        >
          {isFiscal
            ? (store?.razon_social || sale.storeName || "Mi comercio")
            : (sale.storeName || "Mi comercio")}
        </div>
        {isFiscal && cuitFormatted && (
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
            CUIT: {cuitFormatted}
          </div>
        )}
        {isFiscal && store?.condicion_iva && (
          <div style={{ fontSize: "0.6875rem", color: "#475569" }}>
            IVA: {ivaLabel}
          </div>
        )}
        {isFiscal && store?.iibb && (
          <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>
            Ing. Brutos: {store.iibb}
          </div>
        )}
        <div style={{ fontSize: "0.71875rem", color: "#64748b" }}>
          {sale.storePhone || (!isFiscal ? "Comprobante de venta" : "")}
        </div>
        <div
          style={{
            fontSize: "0.6875rem",
            color: "#94a3b8",
            marginTop: "2px",
          }}
        >
          {sale.storeAddress}
        </div>
        {isFiscal && (
          <div
            style={{
              margin: "0.5rem 0",
              padding: "0.4rem 0",
              borderTop: "2px solid #0f172a",
              borderBottom: "2px solid #0f172a",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.9375rem", fontWeight: 900, letterSpacing: "1px" }}>
              {tipoLabel.toUpperCase()}
            </div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
              N° {cbteNroStr}
            </div>
            <div style={{ fontSize: "0.5625rem", color: "#64748b", marginTop: "1px" }}>
              DOCUMENTO FISCAL ELECTRÓNICO
            </div>
            {receptorLine && <div style={{ fontSize: "0.6875rem", marginTop: "4px", textAlign: "left" }}>{receptorLine}</div>}
          </div>
        )}
        <div
          style={{
            borderBottom: "1px dashed #cbd5e1",
            margin: "0.6rem 0",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          <span>{sale.ticketNumber}</span>
          <span>{sale.timestamp}</span>
        </div>
        <div
          style={{
            fontSize: "0.6875rem",
            color: "#64748b",
            textAlign: "left",
          }}
        >
          Fecha: {sale.date || new Date().toLocaleDateString("es-AR")}
          {sale.branchName && <div>Sucursal: {sale.branchName} · {sale.registerName}</div>}
          {sale.priceListName && <div>Lista: {sale.priceListName}</div>}
          {sale.invoiceReference && <div>Comprobante externo: {sale.invoiceReference}</div>}
        </div>
      </div>
    </>
  );
}
