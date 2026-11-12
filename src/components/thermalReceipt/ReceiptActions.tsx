import { Printer, Download } from 'lucide-react';
import type { ReceiptView } from './receiptDetails';

/** Botones de imprimir, descargar y cerrar. */
export function ReceiptActions({ view }: { view: ReceiptView }) {
  const { handlePrint, handleDownloadTxt, onClose } = view;
  return (
    <>
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
    </>
  );
}
