import { cuitDigits, validCuit } from '../supplierInvoiceRules';

// QR de ARCA del comprobante: lectura de la imagen y datos que trae.
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
