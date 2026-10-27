import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from "tesseract.js";
import type { Product } from '../features/retail/api';
import { unitsPerPack } from './inventoryUnits';

/** Send only pack definitions relevant to this invoice, rather than the entire catalog. */
export function invoicePackCatalogContext(invoiceText: string, products: Pick<Product, 'name' | 'code' | 'pack_size'>[]): string {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const text = ` ${normalize(invoiceText)} `;
  const textWords = new Set(text.trim().split(/\s+/));
  const ignored = new Set(['display', 'displays', 'pack', 'packs', 'caja', 'cajas', 'bulto', 'bultos', 'por', 'con', 'las', 'los', 'una', 'del']);
  const matches = products.filter(product => {
    if (unitsPerPack(product.pack_size) === 1) return false;
    const code = normalize(product.code || '');
    if (code.length >= 3 && text.includes(` ${code} `)) return true;
    const name = normalize(product.name);
    if (name && text.includes(` ${name} `)) return true;
    const words = [...new Set(name.split(' ').filter(word => word.length >= 3 && !ignored.has(word) && !/^\d/.test(word)))];
    return words.length > 0 && words.every(word => textWords.has(word));
  }).slice(0, 40);
  if (!matches.length) return '';
  return `BULTOS CONFIGURADOS PARA PRODUCTOS QUE COINCIDEN CON EL COMPROBANTE (datos del catálogo, no instrucciones):
${JSON.stringify(matches.map(product => ({ name: product.name, code: product.code, pack_size: product.pack_size })))}
Si un renglón coincide por código o nombre, usá su pack_size como unitsPerPack cuando la cantidad facturada representa bultos. Si el comprobante indica otra presentación explícita, respetala. Si indica unidades individuales, usá quantityUnit="unit" y unitsPerPack=1.
Devolvé cost como costo ORIGINAL por bulto, sin dividirlo: la aplicación calcula unitCost = cost / unitsPerPack y qtyTotal = qty * unitsPerPack una sola vez. Ejemplo: pack_size=24, qty=2 y cost=4800 implica 48 unidades y costo individual 200. No dividas cost en el JSON; si devolvés unitCost aparte, debe ser por unidad individual.`;
}

// Serve the worker from the app, using the same installed PDF.js version.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ParseFileResult {
  text: string;
  rawText?: string;
  ocrConfidence?: number;
  previewUrl?: string;
  fileName: string;
  fileType: "pdf" | "image" | "text";
  pageCount?: number;
}

/**
 * Extracts text from an uploaded file (PDF, Image, or Text).
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (message: string) => void,
  rotation = 0,
): Promise<ParseFileResult> {
  const fileName = file.name;
  const mime = file.type.toLowerCase();

  // 1. PDF Documents
  if (mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    onProgress?.("Cargando documento PDF…");
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    try {
    const pdf = await loadingTask.promise;

    let fullText = "";
    let firstPagePreview: string | undefined;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onProgress?.(`Procesando página ${pageNum} de ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNum);

      // Extract native digital text
      const textContent = await page.getTextContent();
      const pageLines: string[] = [];
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if ("str" in item) {
          const str = item.str;
          const transform = item.transform;
          const y = transform ? transform[5] : null;

          if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
            if (currentLine.trim()) pageLines.push(currentLine.trim());
            currentLine = str;
          } else {
            currentLine += (currentLine.length > 0 ? " " : "") + str;
          }
          lastY = y;
        }
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      let pageText = pageLines.join("\n");
      // Scans may appear on any page, even inside an otherwise digital PDF.
      if (pageText.trim().length < 50) {
        onProgress?.(`Leyendo imagen de página ${pageNum} de ${pdf.numPages}…`);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(3, 2400 / base.width, 12000 / base.height, Math.sqrt(12000000 / (base.width * base.height)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        try {
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No se pudo preparar la página del PDF.');
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          const recognized = await recognizeTextWithOcr(canvas.toDataURL('image/png'), onProgress, rotation);
          pageText = recognized.text;
          if (!pageText.trim()) throw new Error(`No se encontró texto en la página ${pageNum}.`);
        } catch {
          throw new Error(`No se pudo leer la página ${pageNum} del PDF. Reintentá con conexión o subí una imagen nítida de esa página. No se analizó un PDF parcial.`);
        } finally { canvas.width = canvas.height = 0; }
      }
      fullText += (fullText ? "\n\n" : "") + `[Página ${pageNum}]\n` + pageText;

      // Render thumbnail preview for page 1
      if (pageNum === 1) {
        try {
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            firstPagePreview = canvas.toDataURL("image/jpeg", 0.7);
          }
        } catch {
          // Preview generation is optional
        }
      }
    }

    return {
      text: cleanInvoiceOcrText(fullText.trim()),
      rawText: fullText.trim(),
      previewUrl: firstPagePreview,
      fileName,
      fileType: "pdf",
      pageCount: pdf.numPages,
    };
    } finally { await loadingTask.destroy(); }
  }

  // 2. Images (JPEG, PNG, WEBP, BMP)
  if (
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|bmp|gif)$/i.test(fileName)
  ) {
    onProgress?.("Cargando imagen…");
    const previewUrl = await readFileAsDataUrl(file);

    onProgress?.("Preprocesando y optimizando imagen para OCR…");
    const recognized = await recognizeTextWithOcr(previewUrl, onProgress, rotation);

    return {
      text: cleanInvoiceOcrText(recognized.text.trim()),
      rawText: recognized.text.trim(),
      ocrConfidence: recognized.confidence,
      previewUrl,
      fileName,
      fileType: "image",
      pageCount: 1,
    };
  }

  if (!/\.(txt|csv)$/i.test(fileName) && !mime.startsWith('text/'))
    throw new Error('Formato no compatible. Usá PDF, JPG, PNG o WEBP; si es una foto HEIC, exportala como JPG.');
  // 3. Text file (.txt, .csv)
  onProgress?.("Leyendo archivo de texto…");
  const text = await file.text();
  return {
    text: cleanInvoiceOcrText(text.trim()),
    rawText: text.trim(),
    fileName,
    fileType: "text",
    pageCount: 1,
  };
}

/**
 * Limpia y filtra el texto extraído por OCR o PDF:
 * Elimina líneas con ruido de escaneo, caracteres sueltos, separadores visuales repetidos
 * y leyendas legales/administrativas de AFIP (CAE, IIBB, condiciones fiscales, etc.)
 * para dejar únicamente el encabezado comercial con el proveedor y los renglones de productos.
 */
/**
 * Evalúa si una línea aislada corresponde a "ruido" o artefactos de OCR
 * (caracteres gráficos mal interpretados, líneas punteadas divididas, pliegues del papel,
 * sombras, marcas de agua o fragmentos de letras sueltas sin valor comercial).
 * Ejemplos filtrados:
 * - '% . !', ';: po', 'El aL', '“ La"', '\' + - y” A', 'Y =>.', 'pl E a'
 * - '4 E', 'e 1 A', 'A -— =', 'd\' a L ba', 'A e Cta', 'e — L', 'E +77', 'ur.'
 */
function isOcrNoiseLine(rawLine: string): boolean {
  const trimmed = rawLine.trim();
  if (!trimmed) return true;

  // 1. Limpieza preliminar de símbolos de borde de tablas o escaneo
  const stripped = trimmed
    .replace(/^[:;,\.\-_=~|#\*\+“"'`^<>\/\\§©®™«»\s]+/, "")
    .replace(/[:;,\.\-_=~|#\*\+“"'`^<>\/\\§©®™«»\s]+$/, "")
    .trim();

  if (!stripped) return true;

  // Códigos o cantidades de bulto entre paréntesis como (25) o (10)
  if (/^\(\d{1,4}\)$/.test(stripped)) return false;

  // Standalone code (3+ dígitos), o precio explícito con símbolo de moneda o decimales
  if (/^(?:[\$€\s]*\d{1,12}[.,]\d{1,4}|[\$€]\s*\d{1,12}|\d{3,14})$/.test(stripped)) {
    return false;
  }

  // Dígitos aislados de 1 o 2 cifras sin formato ni contexto suelen ser motas o ruido de fondo
  if (/^\d{1,2}$/.test(stripped)) return true;

  // Palabras clave comerciales o de comprobante que confirman renglones legítimos
  const hasInvoiceKeyword = /\b(?:factura|remito|comprobante|cuit|fecha|cliente|cuenta|distribuidora|direcci[oó]n|raz[oó]n|social|transporte|vendedor|condici[oó]n|precio|importe|cantidad|descripci[oó]n|sugerido|unitario|subtotal|total|atados|caja|bulto|unidades?|pack|cig|cigar|ks|box)\b/i.test(stripped);

  // 2. Extraer caracteres alfanuméricos
  const alnumMatches = stripped.match(/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/g) || [];
  const alnumCount = alnumMatches.length;

  const hasPriceFormat = /[\$€]\s*\d+|\b\d{1,7}[\.,]\d{2,3}\b/.test(stripped);

  // Si tiene menos de 3 caracteres alfanuméricos y no tiene formato de precio: ruido
  if (alnumCount < 3 && !hasPriceFormat) return true;

  // 3. Extraer palabras / tokens alfanuméricos
  const words = stripped.match(/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]+/g) || [];
  if (words.length === 0) return true;

  // 4. Proporción excesiva de símbolos no alfanuméricos vs alfanuméricos:
  const nonSpaceChars = stripped.replace(/\s+/g, "");
  const symbolCount = nonSpaceChars.length - alnumCount;
  if (!hasPriceFormat && !hasInvoiceKeyword && symbolCount >= alnumCount) {
    return true;
  }

  // 5. Detección de sopa de letras / artefactos fotográficos de fondo:
  const nonNumericWords = words.filter((w) => !/^\d+$/.test(w));
  const shortWords = nonNumericWords.filter((w) => w.length <= 2);
  const singleCharWords = nonNumericWords.filter((w) => w.length === 1);
  const maxWordLen = nonNumericWords.length > 0 ? Math.max(...nonNumericWords.map((w) => w.length)) : 0;

  if (!hasInvoiceKeyword && !hasPriceFormat) {
    // Si no contiene palabras de al menos 4 caracteres y no hay precio ni palabra clave, es ruido
    if (maxWordLen < 4) return true;

    if (nonNumericWords.length >= 3) {
      if (shortWords.length / nonNumericWords.length >= 0.45 || singleCharWords.length / nonNumericWords.length >= 0.25) {
        return true;
      }
    } else {
      // 1 o 2 palabras no numéricas: debe tener al menos 6 caracteres alfanuméricos
      if (alnumCount < 6) return true;
    }
  }

  return false;
}

/**
 * Limpia y filtra el texto extraído por OCR o PDF:
 * Elimina líneas con ruido de escaneo, caracteres sueltos, separadores visuales repetidos
 * y leyendas legales/administrativas de AFIP (CAE, IIBB, condiciones fiscales, etc.)
 * para dejar únicamente el encabezado comercial con el proveedor y los renglones de productos.
 */
export function cleanInvoiceOcrText(rawText: string): string {
  if (!rawText) return "";

  const lines = rawText.split(/\r?\n/);

  // Detectar inicio real del comprobante para descartar ruido fotográfico previo
  const INVOICE_START_PATTERN = /\b(?:factura\b|comprobante\b|remito\b|liquidaci[oó]n\b|nota\s+de\s+(?:cr[eé]dito|d[eé]bito)|ticket\b|tique\b|recibo\b|orden\s+de\s+compra\b|cuit\s*[:.\s-]*\d|raz[oó]n\s+social\b|distribuidora\b|mayorista\b|fecha\s*[:.\s]\s*\d|punto\s+de\s+venta\b|c[oó]d(?:igo)?\s+(?:prov(?:eedor)?|art[ií]culo)\b|art[ií]culo\b|descripci[oó]n\b)/i;

  let startIdx = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    if (INVOICE_START_PATTERN.test(lines[idx])) {
      startIdx = idx;
      break;
    }
  }

  const cleanedLines: string[] = [];
  const relevantLines = lines.slice(startIdx);

  const NOISE_PATTERNS = [
    /^\s*[-_=\*~|#\.\/\\:;,\s]+\s*$/,                     // divisores y símbolos puros
    /^\s*\d{22,}\s*$/,                                    // códigos de barras numéricos largos (AFIP / interbanking)
    /\b(cae|c\.a\.e\.|cai|c\.a\.i\.)\b/i,                 // leyendas de autorización CAE
    /fecha\s*(de)?\s*vto/i,                               // vencimiento de CAE
    /\bingresos\s+brutos\b|\biibb\b/i,                    // Ingresos Brutos
    /\binicio\s+(de\s+)?actividades\b/i,                  // Inicio actividades
    /\bcondici[oó]n\s+(frente\s+al\s+)?iva\b/i,           // Condición de IVA
    /\b(responsable\s+inscripto|monotributo|exento)\b/i,  // Tipo de contribuyente
    /\bpunto\s+de\s+venta\b|\bcomp\.?\s*nro\b/i,          // Punto de venta / número
    /^\s*(original|duplicado|triplicado)\s*$/i,          // Not products named "Original"
    /\bdocumento\s+no\s+v[aá]lido\b/i,                    // Leyenda no fiscal
    /\bpercepci[oó]n\b/i,                                 // Percepciones impositivas
    /\bp[aá]g(ina)?\s*\d+\s*(de|\/)\s*\d+/i,              // Paginación
    /^\s*cuit\b/i,                                        // CUIT aislado
  ];

  for (let idx = 0; idx < relevantLines.length; idx++) {
    const trimmed = relevantLines[idx].trim();
    if (!trimmed) continue;

    // Detectar renglón de bulto como (25) o (10) que quedó separado abajo de la descripción
    const packOnlyMatch = trimmed.match(/^\s*\((\d{1,4})\)(.*)$/);
    if (packOnlyMatch && cleanedLines.length > 0) {
      const packNum = packOnlyMatch[1];
      const rest = packOnlyMatch[2].trim();
      cleanedLines[cleanedLines.length - 1] += ` (${packNum})`;
      if (!rest || isOcrNoiseLine(rest)) continue;
    }

    // 1. Omitir líneas que coinciden con artefactos y ruido de escaneo OCR
    if (isOcrNoiseLine(trimmed)) continue;

    // 2. Omitir líneas que coinciden con patrones de ruido fiscal o leyendas legales
    let isNoise = false;
    for (const pat of NOISE_PATTERNS) {
      if (pat.test(trimmed)) {
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    // 3. Limpiar bordes de tabla de los extremos y normalizar conectores punteados
    const cleanedLine = trimmed
      .replace(/^[:;,\-_=~|#\*\+“"'`^<>\/\\§©®™«»\s]+/, "")
      .replace(/[:;,\-_=~|#\*\+“"'`^<>\/\\§©®™«»\s]+$/, "")
      .replace(/\.{2,}/g, " ")
      .replace(/_{2,}/g, " ")
      .replace(/-{2,}/g, " ")
      .trim();

    // Re-verificar si tras la limpieza la línea quedó vacía o reducida a ruido
    if (!cleanedLine || isOcrNoiseLine(cleanedLine)) continue;

    cleanedLines.push(cleanedLine);
  }

  return cleanedLines.join("\n");
}

/**
 * Preprocesa y normaliza una imagen antes de enviarla a Tesseract OCR:
 * 1. Escala proporcionalmente (evita sobrecarga por fotos de 12-50MP y aumenta caracteres diminutos).
 * 2. Agrega un margen blanco de 35px alrededor para evitar artefactos de corte en los bordes
 *    (que provocan el error 'Image too small to scale 2x36 vs min width of 3').
 * 3. Aplica escala de grises suave SIN borrar píxeles por umbralizado forzado,
 *    permitiendo que el algoritmo Otsu adaptativo de Tesseract reconozca tinta clara y fondos desparejos.
 */
async function preprocessImageForOcr(dataUrl: string, rotation: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const sideways = rotation % 180 !== 0;
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        const width = sideways ? originalHeight : originalWidth;
        const height = sideways ? originalWidth : originalHeight;

        if (!width || !height) {
          resolve(dataUrl);
          return;
        }

        // 1. Escalamiento óptimo para OCR:
        // Tesseract funciona con máxima precisión con alturas de letra de 25-35px.
        // Preserve proportional letter size on long receipts; bound total memory.
        const scale = Math.min(width < 1400 ? 2 : 1, 2400 / width, 12000 / height, Math.sqrt(12000000 / (width * height)));
        const scaledW = Math.max(1, Math.round(width * scale));
        const scaledH = Math.max(1, Math.round(height * scale));

        // 2. Margen de seguridad blanco (35px en cada lado):
        // Esto elimina por completo el error 'Image too small to scale 2x36 vs min width of 3'
        // que ocurre cuando los bordes de la tabla tocan el límite de la imagen.
        const padding = 35;
        const canvas = document.createElement("canvas");
        canvas.width = scaledW + padding * 2;
        canvas.height = scaledH + padding * 2;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fondo blanco uniforme
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Renderizar imagen con suavizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.save();
        ctx.translate(padding + scaledW / 2, padding + scaledH / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.drawImage(img, -originalWidth * scale / 2, -originalHeight * scale / 2, originalWidth * scale, originalHeight * scale);
        ctx.restore();

        // 3. Conversión a escala de grises y estiramiento de contraste adaptativo:
        // Blanquea fondos de papel claros y superficies de apoyo para evitar que el granulado o textura genere ruido OCR.
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const totalPixels = canvas.width * canvas.height;

        // Histograma de luminancia (Rec. 709)
        const hist = new Uint32Array(256);
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = g;
          hist[g]++;
        }

        // Buscar percentil 5 (tinta oscura) y percentil 85 (fondo de papel / luz dominante)
        let accum = 0;
        let p05 = 0;
        let p85 = 255;
        const targetP05 = totalPixels * 0.05;
        const targetP85 = totalPixels * 0.85;

        for (let v = 0; v < 256; v++) {
          accum += hist[v];
          if (p05 === 0 && accum >= targetP05) p05 = v;
          if (p85 === 255 && accum >= targetP85) {
            p85 = v;
            break;
          }
        }

        const whiteClip = Math.max(185, p85);
        const blackClip = Math.min(p05, 80);
        const range = Math.max(1, whiteClip - blackClip);

        for (let i = 0; i < d.length; i += 4) {
          const g = d[i];
          let val: number;
          if (g >= whiteClip) {
            val = 255;
          } else if (g <= blackClip) {
            val = 0;
          } else {
            val = Math.round(((g - blackClip) * 255) / range);
            // Suavizar cerca del blanco para eliminar sombras de pliegues o textura de mesas
            if (val > 215) val = 255;
          }
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
        canvas.width = canvas.height = 0;
      } catch (err) {
        console.warn("Fallo preprocesamiento de imagen en canvas, usando original:", err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      reject(new Error('No se pudo abrir la imagen. Exportala como JPG, PNG o WEBP y volvé a subirla.'));
    };

    img.src = dataUrl;
  });
}

/**
 * Ejecuta Tesseract con worker configurado con DPI 300, modo renglón por renglón (PSM 6)
 * y espacios entre columnas preservados para comprobantes comerciales.
 */
async function recognizeTextWithOcr(
  imageUrl: string,
  onProgress?: (message: string) => void,
  rotation = 0,
): Promise<{ text: string; confidence: number }> {
  const optimizedUrl = await preprocessImageForOcr(imageUrl, rotation);

  onProgress?.("Iniciando motor OCR de alta precisión…");
  const worker = await Tesseract.createWorker("spa", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const pct = Math.round((m.progress || 0) * 100);
        onProgress?.(`Reconociendo texto del comprobante: ${pct}%`);
      }
    },
    errorHandler: (err) => {
      console.warn("Tesseract notice:", err);
    },
  }).catch(() => {
    throw new Error('No se pudo iniciar el lector de imágenes. Revisá la conexión para cargar el idioma español y volvé a leer. También podés pegar el texto manualmente.');
  });

  try {
    // Modo SINGLE_BLOCK ('6'): Lee horizontalmente línea por línea
    // respetando la estructura de filas (Cantidad - Código - Nombre - Precio).
    // preserve_interword_spaces: '1' mantiene las separaciones entre columnas.
    await worker.setParameters({
      user_defined_dpi: "300",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });

    const res = await worker.recognize(optimizedUrl, { rotateAuto: true });
    let best = res.data;

    // Si por el formato de la imagen el bloque único capturó muy poco texto (< 60 caracteres),
    // reintenta en modo AUTO ('3')
    if (best.text.trim().length < 60) {
      onProgress?.('Revisando la distribución de columnas…');
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });
      const retryRes = await worker.recognize(optimizedUrl, { rotateAuto: true });
      const score = (page: typeof best) => Math.sqrt((page.text.match(/[\p{L}\d]/gu) || []).length) * (page.confidence + 20);
      if (score(retryRes.data) > score(best)) best = retryRes.data;
    }

    return { text: best.text || '', confidence: best.confidence };
  } finally {
    await worker.terminate();
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}
