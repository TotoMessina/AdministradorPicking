import React, { useState } from "react";
import { Printer, Download, X, Check, ShieldCheck } from "lucide-react";
import type { KioscoSale } from "../types/kiosco";
import type { Store } from "../features/retail/api";
import { useDialogFocus } from '../features/retail/useDialogFocus';
import {
  formatCaeVto,
  formatComprobanteNro,
  formatCuit,
  getComprobanteTipoLabel,
  getCondicionIvaLabel,
} from "../features/retail/billing";
import { buildArcaQrUrl } from "../services/billingService";

interface ThermalReceiptModalProps {
  sale: KioscoSale | null;
  isOpen: boolean;
  onClose: () => void;
  store?: Store | null;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  store,
}) => {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const dialogRef = useDialogFocus(isOpen, onClose);

  if (!isOpen || !sale) return null;

  const isFiscal = (sale?.billingStatus === 'authorized' || !!sale?.cae) && !!sale?.cae;
  const cbteTipo = sale?.cbteTipo || (store?.condicion_iva === 'RI' ? 6 : 11);
  const tipoLabel = getComprobanteTipoLabel(cbteTipo);
  const ptoVta = store?.punto_venta_afip || 1;
  const cbteNroStr = formatComprobanteNro(ptoVta, sale?.cbteNro);
  const cuitFormatted = formatCuit(store?.cuit);
  const ivaLabel = getCondicionIvaLabel(store?.condicion_iva);
  const caeVtoStr = formatCaeVto(sale?.caeVto);

  const qrUrl = isFiscal && sale
    ? buildArcaQrUrl({
        cuit: store?.cuit || '',
        puntoVenta: ptoVta,
        cbteTipo,
        cbteNro: sale.cbteNro || 0,
        importe: sale.total,
        fecha: sale.created_at || sale.createdAt || new Date().toISOString(),
        cae: sale.cae || '',
      })
    : '';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const headerLines = isFiscal
      ? [
          "================================",
          store?.razon_social || sale.storeName || "Mi comercio",
          cuitFormatted ? `CUIT: ${cuitFormatted}` : "",
          store?.condicion_iva ? `IVA: ${ivaLabel}` : "",
          store?.iibb ? `IIBB: ${store.iibb}` : "",
          [sale.storeAddress, sale.storePhone].filter(Boolean).join(" · "),
          "================================",
          `${tipoLabel.toUpperCase()} NRO ${cbteNroStr}`,
          `Ticket ref: ${sale.ticketNumber}`,
        ].filter(Boolean)
      : [
          "================================",
          sale.storeName || "Mi comercio",
          [sale.storeAddress, sale.storePhone].filter(Boolean).join(" · "),
          "================================",
          `Ticket: ${sale.ticketNumber}`,
        ];

    const footerLines = isFiscal
      ? [
          "================================",
          `CAE: ${sale.cae}`,
          `VTO. CAE: ${caeVtoStr}`,
          `QR ARCA: ${qrUrl}`,
          "================================",
          "Comprobante fiscal electronico ARCA",
          sale.receiptMessage || "¡Gracias por tu compra!",
          "================================",
        ]
      : [
          "================================",
          "  COMPROBANTE NO VALIDO COMO    ",
          "           FACTURA              ",
          sale.receiptMessage || "¡Gracias por tu compra!",
          "================================",
        ];

    const lines = [
      ...headerLines,
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
      ...(sale.payments || []).map(p => `${p.method}: $${p.amount.toLocaleString('es-AR')}`),
      ...(sale.syncStatus === 'pending' ? ['GUARDADO LOCAL · PENDIENTE DE SINCRONIZAR'] : []),
      `Paga Con:       $${sale.amountPaid.toLocaleString("es-AR")}`,
      `Vuelto:         $${sale.change.toLocaleString("es-AR")}`,
      ...footerLines,
    ];

    const element = document.createElement("a");
    const file = new Blob([lines.join("\r\n")], {
      type: "text/plain;charset=utf-8",
    });
    element.href = URL.createObjectURL(file);
    element.download = isFiscal
      ? `${tipoLabel.replace(/\s+/g, '_')}_${cbteNroStr || sale.ticketNumber}.txt`
      : `Ticket_${sale.ticketNumber}.txt`;
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
        background: "#18202c66",
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
          borderRadius: "14px",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
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
                {isFiscal
                  ? `${tipoLabel} N° ${cbteNroStr || sale.ticketNumber}`
                  : `Comprobante de Venta ${sale.ticketNumber}`}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: isFiscal ? "#16a34a" : "var(--text-muted, #64748b)",
                  fontWeight: isFiscal ? 600 : 400,
                }}
              >
                {isFiscal
                  ? `Comprobante Fiscal Autorizado ARCA · CAE ${sale.cae}`
                  : "Ticket Térmico Listo para Imprimir"}
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
              "--receipt-width": paperWidth,
              width: paperWidth === "58mm" ? "300px" : "360px",
              background: "#ffffff",
              color: "#0f172a",
              padding: "1.25rem",
              borderRadius: "0.5rem",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.78125rem",
              lineHeight: 1.35,
            } as React.CSSProperties}
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
