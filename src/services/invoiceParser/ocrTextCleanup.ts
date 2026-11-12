// Limpieza del texto leído por OCR: quita ruido y une renglones.
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
