import React from 'react';
import type { KioscoSale } from '../../types/kiosco';
import type { Store } from '../../features/retail/api';
import { useDialogFocus } from '../../features/retail/useDialogFocus';
import { formatCaeVto, formatComprobanteNro, formatCuit, getComprobanteTipoLabel, getCondicionIvaLabel } from '../../features/retail/billing';
import { buildArcaQrUrl } from '../../services/billingService';

/** Datos del ticket ya armados (comprobante fiscal, receptor, QR) y acciones de imprimir o descargar. */
export function receiptDetails({ sale, store }: { sale: KioscoSale; store?: Store | null }) {
  const isFiscal = (sale?.billingStatus === 'authorized' || !!sale?.cae) && !!sale?.cae;
  const cbteTipo = sale?.cbteTipo || (store?.condicion_iva === 'RI' ? 6 : 11);
  const tipoLabel = getComprobanteTipoLabel(cbteTipo);
  const ptoVta = store?.punto_venta_afip || 1;
  const cbteNroStr = formatComprobanteNro(ptoVta, sale?.cbteNro);
  const cuitFormatted = formatCuit(store?.cuit);
  const ivaLabel = getCondicionIvaLabel(store?.condicion_iva);
  const caeVtoStr = formatCaeVto(sale?.caeVto);
  const receptorDoc = { 80: 'CUIT', 86: 'CUIL', 96: 'DNI' }[sale?.receptorDocTipo || 0];
  const receptorLine = isFiscal && receptorDoc && sale?.receptorDocNro
    ? `Cliente: ${sale.receptorName || ''} · ${receptorDoc} ${receptorDoc === 'DNI' ? sale.receptorDocNro : formatCuit(String(sale.receptorDocNro))}`
    : '';

  const qrUrl = isFiscal && sale
    ? buildArcaQrUrl({
        cuit: store?.cuit || '',
        puntoVenta: ptoVta,
        cbteTipo,
        cbteNro: sale.cbteNro || 0,
        importe: sale.total,
        fecha: sale.created_at || sale.createdAt || new Date().toISOString(),
        cae: sale.cae || '',
        tipoDocRec: sale.receptorDocTipo ?? undefined,
        nroDocRec: sale.receptorDocNro ?? undefined,
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
          receptorLine,
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
      ...(sale.returnStatus === 'voided' ? ['VENTA ANULADA'] : sale.returnStatus === 'partial' ? [`Devuelto:       $${(sale.returnedTotal || 0).toLocaleString('es-AR')}`] : []),
      `Forma de Pago:  ${sale.paymentMethod}`,
      ...(sale.customerName ? [`Cliente:        ${sale.customerName}`] : []),
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
  return { isFiscal, cbteTipo, tipoLabel, ptoVta, cbteNroStr, cuitFormatted, ivaLabel, caeVtoStr, receptorDoc, receptorLine, qrUrl, handlePrint, handleDownloadTxt };
}

/** Lo que reciben las partes del ticket. */
export type ReceiptView = ReturnType<typeof receiptDetails> & {
  sale: KioscoSale;
  store?: Store | null;
  onClose: () => void;
  paperWidth: "58mm" | "80mm";
  setPaperWidth: React.Dispatch<React.SetStateAction<"58mm" | "80mm">>;
  dialogRef: ReturnType<typeof useDialogFocus>;
};
