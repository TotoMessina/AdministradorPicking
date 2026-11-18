import React from 'react';
import type { KioscoSale } from '../../types/kiosco';
import type { Store } from '../../features/retail/api';
import { useDialogFocus } from '../../features/retail/useDialogFocus';
import qrcode from 'qrcode-generator';
import { argentinaDate, formatCaeVto, formatComprobanteNro, formatCuit, getComprobanteTipoLabel, getCondicionIvaLabel, getReceptorIvaLabel } from '../../features/retail/billing';
import { buildArcaQrUrl } from '../../services/billingService';

/** Importe con dos decimales, como se informa a ARCA. */
export const fiscalMoney = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Nombre de cada alícuota según su Id de ARCA. */
const VAT_LABELS: Record<number, string> = { 3: 'IVA 0%', 4: 'IVA 10,5%', 5: 'IVA 21%', 6: 'IVA 27%', 8: 'IVA 5%', 9: 'IVA 2,5%' };

/** Imagen del QR generada en el equipo: imprime sin conexión y no manda datos de la factura a terceros. */
function qrImage(url: string) {
  if (!url) return '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createDataURL(4, 2);
  } catch {
    return '';
  }
}

/** Datos del ticket ya armados (comprobante fiscal, receptor, QR) y acciones de imprimir o descargar. */
export function receiptDetails({ sale, store }: { sale: KioscoSale; store?: Store | null }) {
  const isFiscal = (sale?.billingStatus === 'authorized' || !!sale?.cae) && !!sale?.cae;
  const cbteTipo = sale?.cbteTipo || (store?.condicion_iva === 'RI' ? 6 : 11);
  const tipoLabel = getComprobanteTipoLabel(cbteTipo);
  // Punto de venta y fecha informados a ARCA. Las facturas anteriores a guardarlos usan la configuración y el día de la venta.
  const ptoVta = sale?.invoicePtoVta || store?.punto_venta_afip || 1;
  const invoiceDate = sale?.invoiceDate?.slice(0, 10) || argentinaDate(sale?.created_at || sale?.createdAt || new Date());
  const invoiceDateLabel = invoiceDate.split('-').reverse().join('/');
  const saleDateLabel = sale?.created_at || sale?.createdAt ? argentinaDate(sale.created_at || sale.createdAt || '').split('-').reverse().join('/') : '';
  const billedLater = isFiscal && !!saleDateLabel && saleDateLabel !== invoiceDateLabel;
  const isTestInvoice = isFiscal && sale?.invoiceEnvironment === 'homo';
  // Neto e IVA informados. Sin datos guardados, el mismo cálculo que usa el servidor (21%).
  const discriminatesVat = cbteTipo === 1 || cbteTipo === 6;
  const total = Number(sale?.total || 0);
  const vatAmount = sale?.invoiceVat ?? (discriminatesVat ? Math.round((total - Math.round(total / 1.21 * 100) / 100) * 100) / 100 : 0);
  const exemptAmount = sale?.invoiceExempt ?? 0;
  const netAmount = sale?.invoiceNet ?? Math.round((total - vatAmount - exemptAmount) * 100) / 100;
  // Renglones de IVA de la Factura A: los informados, o todo al 21% en facturas anteriores al desglose.
  const vatLines = (sale?.invoiceVatDetail?.length
    ? sale.invoiceVatDetail
    : vatAmount > 0 ? [{ id: 5, base: netAmount, importe: vatAmount }] : []
  ).map(line => ({ ...line, label: VAT_LABELS[line.id] || 'IVA' }));
  const isCaea = sale?.authorizationType === 'A';
  const authLabel = isCaea ? 'CAEA' : 'CAE';
  const receptorIva = sale?.receptorIva ?? 5;
  const receptorIvaLabel = getReceptorIvaLabel(receptorIva);
  const toFinalConsumer = isFiscal && receptorIva === 5;
  // Ley 27.743: Factura B a consumidor final. Monotributo (C) y Factura A no la llevan.
  const showTransparency = toFinalConsumer && cbteTipo === 6;
  const showVatDetail = isFiscal && cbteTipo === 1;
  const receptorAddress = isFiscal && cbteTipo === 1 ? sale?.receptorAddress || '' : '';
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
        fecha: invoiceDate,
        cae: sale.cae || '',
        tipoDocRec: sale.receptorDocTipo ?? undefined,
        nroDocRec: sale.receptorDocNro ?? undefined,
        tipoCodAut: isCaea ? 'A' : 'E',
      })
    : '';
  const qrSrc = qrImage(qrUrl);
  const fiscalLegendLines = [
    ...(isTestInvoice ? ['COMPROBANTE DE PRUEBA (HOMOLOGACION)', 'SIN VALIDEZ FISCAL'] : []),
    ...(showTransparency ? [
      'Regimen de Transparencia Fiscal al',
      'Consumidor (Ley 27.743)',
      `IVA Contenido: ${fiscalMoney(vatAmount)}`,
      `Otros Impuestos Nacionales Indirectos: ${fiscalMoney(0)}`,
    ] : []),
  ];

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
          `Fecha comprobante: ${invoiceDateLabel}`,
          toFinalConsumer ? 'A CONSUMIDOR FINAL' : `Condicion IVA: ${receptorIvaLabel}`,
          receptorLine,
          receptorAddress ? `Domicilio: ${receptorAddress}` : '',
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
          `${authLabel}: ${sale.cae}`,
          `VTO. ${authLabel}: ${caeVtoStr}`,
          ...(isCaea ? ['Emitido en contingencia (CAEA)'] : []),
          `QR ARCA: ${qrUrl}`,
          ...(fiscalLegendLines.length ? ["--------------------------------", ...fiscalLegendLines] : []),
          "================================",
          isTestInvoice ? "Prueba en homologacion de ARCA" : "Comprobante fiscal electronico ARCA",
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
      ...(showVatDetail ? [
        `Neto gravado:   ${fiscalMoney(netAmount)}`,
        ...vatLines.map(line => `${`${line.label}:`.padEnd(16, ' ')}${fiscalMoney(line.importe)}`),
        ...(exemptAmount > 0 ? [`Exento:         ${fiscalMoney(exemptAmount)}`] : []),
      ] : []),
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
  return {
    isFiscal, cbteTipo, tipoLabel, ptoVta, cbteNroStr, cuitFormatted, ivaLabel, caeVtoStr, receptorDoc, receptorLine, qrUrl, qrSrc,
    invoiceDateLabel, saleDateLabel, billedLater, isTestInvoice, netAmount, vatAmount, exemptAmount, vatLines, isCaea, authLabel, receptorIvaLabel, toFinalConsumer,
    showTransparency, showVatDetail, receptorAddress, handlePrint, handleDownloadTxt,
  };
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
