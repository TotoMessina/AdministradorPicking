import { groqChat } from './groqService';
import { invoiceNumber } from './invoiceExtractionService';
import { cuitDigits, cuitsInText, validCuit } from './supplierInvoiceRules';
import { PURCHASE_AMOUNT_FIELDS, type PurchaseAmountField } from './purchaseInvoiceFields';

export { PURCHASE_AMOUNT_FIELDS, type PurchaseAmountField } from './purchaseInvoiceFields';

/** Códigos de comprobante de ARCA más usados en compras de un kiosco. */
export const VOUCHER_TYPES = [
  { code: 1, label: 'Factura A' }, { code: 6, label: 'Factura B' }, { code: 11, label: 'Factura C' }, { code: 51, label: 'Factura M' },
  { code: 3, label: 'Nota de crédito A' }, { code: 8, label: 'Nota de crédito B' }, { code: 13, label: 'Nota de crédito C' },
  { code: 2, label: 'Nota de débito A' }, { code: 7, label: 'Nota de débito B' }, { code: 12, label: 'Nota de débito C' },
] as const;
export const voucherLabel = (code: number) => VOUCHER_TYPES.find(type => type.code === code)?.label ?? `Comprobante ${code}`;

/** Borrador editable; los importes son texto canónico de NumberInput ("1234.5"). */
export interface PurchaseInvoiceDraft {
  issuer_cuit: string;
  receiver_cuit: string;
  voucher_type: number | null;
  point_of_sale: string;
  number: string;
  issue_date: string;
  authorization_type: 'E' | 'A' | '';
  authorization_code: string;
  amounts: Record<PurchaseAmountField, string>;
}

export const emptyPurchaseDraft = (): PurchaseInvoiceDraft => ({
  issuer_cuit: '', receiver_cuit: '', voucher_type: null, point_of_sale: '', number: '', issue_date: '',
  authorization_type: '', authorization_code: '',
  amounts: Object.fromEntries(PURCHASE_AMOUNT_FIELDS.map(field => [field.id, ''])) as Record<PurchaseAmountField, string>,
});

/** Datos oficiales del QR de ARCA (RG 4892). No incluye el desglose de IVA ni percepciones. */
export interface ArcaQrData {
  issue_date: string;
  issuer_cuit: string;
  point_of_sale: number;
  voucher_type: number;
  number: number;
  total: number;
  receiver_cuit: string;
  authorization_type: 'E' | 'A' | '';
  authorization_code: string;
}

/** Interpreta la URL del QR (afip.gob.ar o arca.gob.ar, parámetro p en base64). */
export function decodeArcaQr(content: string): ArcaQrData | null {
  try {
    const url = new URL(content.trim());
    if (!/(?:^|\.)(?:afip|arca)\.gob\.ar$/i.test(url.hostname)) return null;
    const encoded = url.searchParams.get('p');
    if (!encoded) return null;
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '+');
    const json = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4))) as Record<string, unknown>;
    const issuer = cuitDigits(String(json.cuit ?? ''));
    const total = Number(json.importe);
    const date = String(json.fecha ?? '');
    if (!validCuit(issuer) || !Number.isFinite(total) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const receiver = Number(json.tipoDocRec) === 80 ? cuitDigits(String(json.nroDocRec ?? '')) : '';
    const authType = String(json.tipoCodAut ?? '').toUpperCase();
    return {
      issue_date: date, issuer_cuit: issuer,
      point_of_sale: Number(json.ptoVta), voucher_type: Number(json.tipoCmp), number: Number(json.nroCmp), total,
      receiver_cuit: validCuit(receiver) ? receiver : '',
      authorization_type: authType === 'E' || authType === 'A' ? authType : '',
      authorization_code: /^\d{14}$/.test(String(json.codAut ?? '')) ? String(json.codAut) : '',
    };
  } catch { return null; }
}

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('No se pudo abrir la imagen'));
  image.src = source;
});

/** Zonas donde buscar, en fracciones de la imagen: primero entera y después recortes del pie. */
const QR_REGIONS = [
  { x: 0, y: 0, width: 1, height: 1 },
  // El QR de ARCA está en la mitad inferior; en fotos reenviadas por WhatsApp mide ~100 px y hay que ampliarlo.
  // Recortes superpuestos para que el QR entre entero en al menos uno.
  ...[0.45, 0.6, 0.75].flatMap(y => [0, 0.15, 0.3, 0.45, 0.6].map(x => ({ x, y, width: 0.4, height: 0.25 }))),
];

/**
 * Busca el QR de ARCA en la imagen o vista previa de la factura: la imagen entera y recortes del pie
 * ampliados hasta 5 veces, para fotos de baja resolución. Devuelve null si no lo encuentra.
 */
export async function scanArcaQr(source: string): Promise<ArcaQrData | null> {
  // El lector se descarga solo al abrir una factura con imagen.
  const [{ default: jsQR }, image] = await Promise.all([import('jsqr'), loadImage(source)]);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.imageSmoothingQuality = 'high';
  try {
    for (const [index, region] of QR_REGIONS.entries()) {
      const sourceX = Math.round(image.naturalWidth * region.x);
      const sourceY = Math.round(image.naturalHeight * region.y);
      const sourceWidth = Math.min(image.naturalWidth - sourceX, Math.round(image.naturalWidth * region.width));
      const sourceHeight = Math.min(image.naturalHeight - sourceY, Math.round(image.naturalHeight * region.height));
      if (sourceWidth < 20 || sourceHeight < 20) continue;
      // La imagen entera se reduce a 1600 px; los recortes se amplían hasta 5x sin pasar de 2000 px.
      const scale = index === 0
        ? Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight))
        : Math.min(5, 2000 / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
      const data = code ? decodeArcaQr(code.data) : null;
      if (data) return data;
      // Ceder el hilo entre intentos para no congelar la pantalla en teléfonos.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return null;
  } finally { canvas.width = canvas.height = 0; }
}

const pad = (value: number, length: number) => String(value).padStart(length, '0');

/** Completa la cabecera con el QR: son datos oficiales y reemplazan lo leído del texto. */
export function draftFromQr(draft: PurchaseInvoiceDraft, qr: ArcaQrData): PurchaseInvoiceDraft {
  return {
    ...draft,
    issuer_cuit: qr.issuer_cuit,
    receiver_cuit: qr.receiver_cuit || draft.receiver_cuit,
    voucher_type: qr.voucher_type || draft.voucher_type,
    point_of_sale: qr.point_of_sale ? String(qr.point_of_sale) : draft.point_of_sale,
    number: qr.number ? String(qr.number) : draft.number,
    issue_date: qr.issue_date,
    authorization_type: qr.authorization_type || draft.authorization_type,
    authorization_code: qr.authorization_code || draft.authorization_code,
    amounts: { ...draft.amounts, total: String(qr.total) },
  };
}

const VOUCHER_BY_WORD: Record<string, Record<string, number>> = {
  factura: { A: 1, B: 6, C: 11, M: 51 },
  credito: { A: 3, B: 8, C: 13 },
  debito: { A: 2, B: 7, C: 12 },
};

/** Lectura local de la cabecera (sin IA): número, tipo, fecha, CAE y CUIT de emisor y receptor. */
export function draftFromText(text: string, options: { supplierCuit?: string | null; storeCuit?: string | null } = {}): PurchaseInvoiceDraft {
  const draft = emptyPurchaseDraft();
  const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const number = plain.match(/\b[A-Z]?(\d{4,5})\s*-\s*(\d{8})\b/) || plain.match(/factura[^\n]{0,40}?\b(\d{4,5})\s+(\d{8})\b/i);
  if (number) { draft.point_of_sale = String(Number(number[1])); draft.number = String(Number(number[2])); }
  const kind = /nota\s+de\s+credito/i.test(plain) ? 'credito' : /nota\s+de\s+debito/i.test(plain) ? 'debito' : 'factura';
  const letter = plain.match(/\b(?:factura|nota\s+de\s+(?:credito|debito))\b[^\n]{0,25}?\b([ABCM])\b/i)?.[1]
    ?? plain.match(/^\s*([ABCM])\s*$/m)?.[1];
  const code = plain.match(/\bcod(?:igo)?\.?\s*0?(\d{1,3})\b/i)?.[1];
  if (code && VOUCHER_TYPES.some(type => type.code === Number(code))) draft.voucher_type = Number(code);
  else if (letter) draft.voucher_type = VOUCHER_BY_WORD[kind][letter.toUpperCase()] ?? null;
  const date = plain.match(/fecha(?:\s+de)?\s+emisi[o]n[^\d]{0,20}(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i)
    || plain.match(/fecha[^\d\n]{0,12}(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i)
    || plain.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (date) {
    const year = Number(date[3]) < 100 ? 2000 + Number(date[3]) : Number(date[3]);
    draft.issue_date = `${year}-${pad(Number(date[2]), 2)}-${pad(Number(date[1]), 2)}`;
  }
  const cae = plain.match(/\bC\.?\s*A\.?\s*E\.?\s*(A)?\b[^\d\n]{0,15}(\d{14})\b/i);
  if (cae) { draft.authorization_type = cae[1] ? 'A' : 'E'; draft.authorization_code = cae[2]; }
  const cuits = cuitsInText(text);
  const store = options.storeCuit ? cuitDigits(options.storeCuit) : '';
  const supplier = options.supplierCuit ? cuitDigits(options.supplierCuit) : '';
  // Con un proveedor registrado, su CUIT es el emisor aunque el OCR no lo haya leído; el otro CUIT es el comprador.
  draft.issuer_cuit = supplier || (cuits.find(cuit => cuit !== store) ?? '');
  draft.receiver_cuit = store && cuits.includes(store) ? store : cuits.find(cuit => cuit !== draft.issuer_cuit) ?? '';
  return draft;
}

/** Completa con la IA solo los campos vacíos: nunca pisa lo que vino del QR o se editó a mano. */
export async function fillAmountsWithAi(text: string, draft: PurchaseInvoiceDraft, signal?: AbortSignal): Promise<PurchaseInvoiceDraft> {
  const source = text.length > 9000 ? `${text.slice(0, 3000)}\n…\n${text.slice(-6000)}` : text;
  const response = await groqChat([{ role: 'user', content: `Extraé los datos fiscales del pie y la cabecera de esta factura de compra argentina.
Respondé SOLO un objeto JSON con estas claves (números sin signo $; 0 si el concepto no figura; null si no se puede leer):
{"tipo":"A|B|C|M","punto_venta":7,"numero":366648,"fecha":"AAAA-MM-DD","cae":"14 dígitos",
"net_21":0,"vat_21":0,"net_10_5":0,"vat_10_5":0,"net_27":0,"vat_27":0,"untaxed":0,"internal_taxes":0,
"vat_perceptions":0,"iibb_perceptions":0,"other_taxes":0,"total":0}
Reglas: net_* es el neto gravado (subtotal sin IVA) de cada alícuota; vat_* el IVA de esa alícuota. internal_taxes = impuestos internos.
vat_perceptions = percepción de IVA (RG 5329 u otras). iibb_perceptions = percepción de Ingresos Brutos. total = total del comprobante.
No uses importes de renglones de productos.

TEXTO:
${source}` }], { responseFormat: 'json_object', temperature: 0, maxTokens: 600, signal });
  let data: Record<string, unknown>;
  try { data = JSON.parse(response) as Record<string, unknown>; }
  catch { throw new Error('La IA devolvió una respuesta inválida. Completá los importes a mano.'); }
  const next: PurchaseInvoiceDraft = { ...draft, amounts: { ...draft.amounts } };
  // Un 0 de la IA no se escribe: el campo vacío ya cuenta como 0 y no parece un dato leído.
  const found = PURCHASE_AMOUNT_FIELDS.filter(field => (invoiceNumber(data[field.id]) ?? 0) > 0);
  if (!found.length) throw new Error('La IA no encontró los importes del pie en el texto leído (suele pasar si la foto corta o borronea el pie)');
  for (const field of found) {
    const value = invoiceNumber(data[field.id])!;
    if (next.amounts[field.id] === '') next.amounts[field.id] = String(Math.round(value * 100) / 100);
  }
  const letter = String(data.tipo ?? '').trim().toUpperCase();
  if (next.voucher_type === null && VOUCHER_BY_WORD.factura[letter]) next.voucher_type = VOUCHER_BY_WORD.factura[letter];
  const pos = invoiceNumber(data.punto_venta), num = invoiceNumber(data.numero);
  if (!next.point_of_sale && pos && Number.isInteger(pos)) next.point_of_sale = String(pos);
  if (!next.number && num && Number.isInteger(num)) next.number = String(num);
  if (!next.issue_date && /^\d{4}-\d{2}-\d{2}$/.test(String(data.fecha ?? ''))) next.issue_date = String(data.fecha);
  if (!next.authorization_code && /^\d{14}$/.test(String(data.cae ?? ''))) { next.authorization_code = String(data.cae); next.authorization_type ||= 'E'; }
  return next;
}

const amount = (value: string) => { const number = Number(value); return value.trim() === '' || !Number.isFinite(number) ? 0 : number; };
const cents = (value: number) => Math.round(value * 100) / 100;
export const formatMoney = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

export interface PurchaseInvoiceChecks {
  /** Campos obligatorios sin completar. */
  missing: string[];
  /** IVA que no coincide con neto × alícuota (±$0,05). */
  vatIssues: string[];
  /** Suma de conceptos − total; 0 cuando cierra. */
  difference: number;
  balanced: boolean;
  qrVerified: boolean;
  qrIssues: string[];
  /** La factura está a nombre de otro CUIT que el del comercio. */
  receiverMismatch: boolean;
}

export function checkPurchaseInvoice(draft: PurchaseInvoiceDraft, qr: ArcaQrData | null, storeCuit?: string | null): PurchaseInvoiceChecks {
  const missing: string[] = [];
  if (!validCuit(draft.issuer_cuit)) missing.push('CUIT del proveedor');
  if (!draft.voucher_type) missing.push('tipo de comprobante');
  if (!(Number(draft.point_of_sale) >= 1 && Number(draft.point_of_sale) <= 99999 && Number.isInteger(Number(draft.point_of_sale)))) missing.push('punto de venta');
  if (!(Number(draft.number) >= 1 && Number(draft.number) <= 99999999 && Number.isInteger(Number(draft.number)))) missing.push('número');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.issue_date)) missing.push('fecha');
  if (!(amount(draft.amounts.total) > 0)) missing.push('total');
  const vatIssues = ([['net_21', 'vat_21', 0.21, '21%'], ['net_10_5', 'vat_10_5', 0.105, '10,5%'], ['net_27', 'vat_27', 0.27, '27%']] as const)
    .flatMap(([net, vat, rate, label]) => {
      const expected = cents(amount(draft.amounts[net]) * rate);
      return Math.abs(expected - amount(draft.amounts[vat])) > 0.05 ? [`IVA ${label}: el neto da ${formatMoney(expected)} y figura ${formatMoney(amount(draft.amounts[vat]))}`] : [];
    });
  const parts = PURCHASE_AMOUNT_FIELDS.filter(field => field.id !== 'total').reduce((sum, field) => sum + amount(draft.amounts[field.id]), 0);
  const difference = cents(parts - amount(draft.amounts.total));
  const qrIssues: string[] = [];
  if (qr) {
    if (qr.issuer_cuit !== cuitDigits(draft.issuer_cuit)) qrIssues.push('CUIT del proveedor');
    if (qr.voucher_type !== draft.voucher_type) qrIssues.push('tipo');
    if (qr.point_of_sale !== Number(draft.point_of_sale)) qrIssues.push('punto de venta');
    if (qr.number !== Number(draft.number)) qrIssues.push('número');
    if (Math.abs(qr.total - amount(draft.amounts.total)) > 0.01) qrIssues.push('total');
  }
  const store = storeCuit ? cuitDigits(storeCuit) : '';
  const receiver = cuitDigits(draft.receiver_cuit);
  return {
    missing, vatIssues, difference,
    balanced: !vatIssues.length && Math.abs(difference) <= 0.05 && amount(draft.amounts.total) > 0,
    qrVerified: !!qr && !qrIssues.length, qrIssues,
    receiverMismatch: !!store && !!receiver && store !== receiver,
  };
}

/** Datos que se envían al servidor; el servidor vuelve a calcular si el comprobante cierra. */
export function purchaseInvoicePayload(draft: PurchaseInvoiceDraft, extra: { supplier_id?: string | null; supplier_name: string; qr_verified: boolean }) {
  return {
    supplier_id: extra.supplier_id || null,
    supplier_name: extra.supplier_name.trim(),
    issuer_cuit: cuitDigits(draft.issuer_cuit),
    receiver_cuit: validCuit(draft.receiver_cuit) ? cuitDigits(draft.receiver_cuit) : null,
    voucher_type: draft.voucher_type,
    point_of_sale: Number(draft.point_of_sale),
    number: Number(draft.number),
    issue_date: draft.issue_date,
    authorization_type: draft.authorization_type || null,
    authorization_code: /^\d{14}$/.test(draft.authorization_code) ? draft.authorization_code : null,
    ...Object.fromEntries(PURCHASE_AMOUNT_FIELDS.map(field => [field.id, cents(amount(draft.amounts[field.id]))])),
    qr_verified: extra.qr_verified,
  };
}

export const voucherNumber = (pointOfSale: number | string, number: number | string) =>
  `${pad(Number(pointOfSale) || 0, 5)}-${pad(Number(number) || 0, 8)}`;
