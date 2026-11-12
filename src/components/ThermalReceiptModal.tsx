import React, { useState } from 'react';
import type { KioscoSale } from '../types/kiosco';
import type { Store } from '../features/retail/api';
import { useDialogFocus } from '../features/retail/useDialogFocus';
import { receiptDetails } from './thermalReceipt/receiptDetails';
import { ReceiptModalHeader } from './thermalReceipt/ReceiptModalHeader';
import { ReceiptTicketHeader } from './thermalReceipt/ReceiptTicketHeader';
import { ReceiptItems } from './thermalReceipt/ReceiptItems';
import { ReceiptTotals } from './thermalReceipt/ReceiptTotals';
import { ReceiptFooter } from './thermalReceipt/ReceiptFooter';
import { ReceiptActions } from './thermalReceipt/ReceiptActions';

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

  const details = receiptDetails({ sale, store });
  const view = { ...details, sale, store, onClose, paperWidth, setPaperWidth, dialogRef };
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
        <ReceiptModalHeader view={view} />

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
            <ReceiptTicketHeader view={view} />

            <div
              style={{
                borderBottom: "1px dashed #cbd5e1",
                marginBottom: "0.6rem",
              }}
            />

            <ReceiptItems view={view} />

            <div
              style={{
                borderBottom: "1.5px dashed #0f172a",
                margin: "0.6rem 0",
              }}
            />

            <ReceiptTotals view={view} />

            <div
              style={{
                borderBottom: "1px dashed #cbd5e1",
                margin: "0.75rem 0",
              }}
            />

            <ReceiptFooter view={view} />
          </div>
        </div>

        <ReceiptActions view={view} />
      </div>
    </div>
  );
};
