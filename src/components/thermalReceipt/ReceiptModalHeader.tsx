import { X, Check } from 'lucide-react';
import type { ReceiptView } from './receiptDetails';

/** Encabezado del modal con el ancho de papel. */
export function ReceiptModalHeader({ view }: { view: ReceiptView }) {
  const { isFiscal, tipoLabel, cbteNroStr, sale, onClose, paperWidth, setPaperWidth } = view;
  return (
    <>
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
    </>
  );
}
