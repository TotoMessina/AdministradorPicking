import React, { useState } from "react";
import { Printer, Download, X, Check } from "lucide-react";
import type { KioscoSale } from "../types/kiosco";
import { useDialogFocus } from '../features/retail/useDialogFocus';

interface ThermalReceiptModalProps {
  sale: KioscoSale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const dialogRef = useDialogFocus(isOpen, onClose);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const lines = [
      "================================",
      sale.storeName || "Mi comercio",
      [sale.storeAddress, sale.storePhone].filter(Boolean).join(" · "),
      "================================",
      `Ticket: ${sale.ticketNumber}`,
      ...[sale.branchName && `Sucursal: ${sale.branchName}`, sale.registerName && `Caja: ${sale.registerName}`, sale.priceListName && `Lista: ${sale.priceListName}`, sale.invoiceReference && `Comprobante externo: ${sale.invoiceReference}`].filter((v): v is string => !!v),
      `Fecha:  ${sale.date || new Date().toLocaleDateString("es-AR")} ${sale.timestamp}`,
      "--------------------------------",
      "CANT  ARTICULO           TOTAL  ",
      "--------------------------------",
      ...sale.items.map((i) => {
        const name = i.name.slice(0, 16).padEnd(16, " ");
        const qty = String(i.qty).padStart(2, " ");
        const sub = `$${i.subtotal.toLocaleString("es-AR")}`.padStart(9, " ");
        return `${qty}x  ${name} ${sub}`;
      }),
      "--------------------------------",
      `TOTAL:          $${sale.total.toLocaleString("es-AR")}`,
      `Forma de Pago:  ${sale.paymentMethod}`,
      `Paga Con:       $${sale.amountPaid.toLocaleString("es-AR")}`,
      `Vuelto:         $${sale.change.toLocaleString("es-AR")}`,
      "================================",
      "  COMPROBANTE NO VALIDO COMO    ",
      "           FACTURA              ",
      sale.receiptMessage || "¡Gracias por tu compra!",
      "================================",
    ];

    const element = document.createElement("a");
    const file = new Blob([lines.join("\r\n")], {
      type: "text/plain;charset=utf-8",
    });
    element.href = URL.createObjectURL(file);
    element.download = `Ticket_${sale.ticketNumber}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11, 15, 25, 0.78)",
        backdropFilter: "blur(8px)",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      className="receipt-modal-backdrop"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Ticket ${sale.ticketNumber}`}
        tabIndex={-1}
        style={{
          background: "var(--bg-surface, #ffffff)",
          borderRadius: "1.25rem",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-light, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-elevated, #f8fafc)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "0.5rem",
                background: "var(--tone-soft)",
                color: "var(--tone-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 800,
                  color: "var(--text-main, #0f172a)",
                }}
              >
                Comprobante de Venta {sale.ticketNumber}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted, #64748b)",
                }}
              >
                Ticket Térmico Listo para Imprimir
              </div>
            </div>
          </div>

          {/* Width Toggle */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <button
              onClick={() => setPaperWidth("58mm")}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.375rem",
                fontSize: "0.6875rem",
                fontWeight: 700,
                border: "1px solid var(--border-light, #e2e8f0)",
                background: paperWidth === "58mm" ? "var(--tone-accent)" : "transparent",
                color:
                  paperWidth === "58mm"
                    ? "#ffffff"
                    : "var(--text-muted, #64748b)",
                cursor: "pointer",
              }}
            >
              58mm
            </button>
            <button
              onClick={() => setPaperWidth("80mm")}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.375rem",
                fontSize: "0.6875rem",
                fontWeight: 700,
                border: "1px solid var(--border-light, #e2e8f0)",
                background: paperWidth === "80mm" ? "var(--tone-accent)" : "transparent",
                color:
                  paperWidth === "80mm"
                    ? "#ffffff"
                    : "var(--text-muted, #64748b)",
                cursor: "pointer",
              }}
            >
              80mm
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #64748b)",
                cursor: "pointer",
                padding: "0.35rem",
                marginLeft: "0.25rem",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Paper Container Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            background: "var(--bg-app, #f4f6fa)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* Printable Ticket */}
          <div
            id="printable-ticket"
            className="receipt-paper"
            style={{
              width: paperWidth === "58mm" ? "300px" : "360px",
              background: "#ffffff",
              color: "#0f172a",
              padding: "1.25rem",
              borderRadius: "0.5rem",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.78125rem",
              lineHeight: 1.35,
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 900,
                  letterSpacing: "1px",
                }}
              >
                {sale.storeName || "Mi comercio"}
              </div>
              <div style={{ fontSize: "0.71875rem", color: "#64748b" }}>
                {sale.storePhone || "Comprobante de venta"}
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

            <div
              style={{
                borderBottom: "1px dashed #cbd5e1",
                marginBottom: "0.6rem",
              }}
            />

            {/* Items */}
            <div style={{ marginBottom: "0.75rem" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.75rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      color: "#64748b",
                      fontSize: "0.6875rem",
                    }}
                  >
                    <th style={{ textAlign: "left", paddingBottom: "4px" }}>
                      CANT
                    </th>
                    <th style={{ textAlign: "left", paddingBottom: "4px" }}>
                      ARTICULO
                    </th>
                    <th style={{ textAlign: "right", paddingBottom: "4px" }}>
                      SUBTOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: "1px dotted #f1f5f9" }}
                    >
                      <td style={{ fontWeight: 800, padding: "3px 0" }}>
                        {item.qty}x
                      </td>
                      <td style={{ padding: "3px 4px" }}>{item.name}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          padding: "3px 0",
                        }}
                      >
                        ${item.subtotal.toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                borderBottom: "1.5px dashed #0f172a",
                margin: "0.6rem 0",
              }}
            />

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

            <div
              style={{
                borderBottom: "1px dashed #cbd5e1",
                margin: "0.75rem 0",
              }}
            />

            {/* Footer */}
            <div
              style={{
                textAlign: "center",
                fontSize: "0.6875rem",
                color: "#64748b",
              }}
            >
              <div style={{ fontWeight: 700, color: "#475569" }}>
                *** COMPROBANTE NO VÁLIDO COMO FACTURA ***
              </div>
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
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border-light, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-elevated, #f8fafc)",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={handleDownloadTxt}
            style={{
              padding: "0.6rem 0.85rem",
              borderRadius: "0.625rem",
              border: "1px solid var(--border-light, #cbd5e1)",
              background: "#ffffff",
              color: "var(--text-main, #0f172a)",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Download size={15} /> Descargar .txt
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onClose}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "0.625rem",
                border: "1px solid var(--border-light, #cbd5e1)",
                background: "#ffffff",
                color: "var(--text-muted, #64748b)",
                fontSize: "0.8125rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: "0.6rem 1.25rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "var(--tone-accent)",
                color: "#ffffff",
                fontSize: "0.8125rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Printer size={16} /> Imprimir Ticket (ESC/POS)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
