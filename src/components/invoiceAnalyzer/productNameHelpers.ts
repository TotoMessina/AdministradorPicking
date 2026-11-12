import { cigaretteAtadosPerPack } from '../../services/supplierInvoiceRules';

// Nombre, código, emoji y unidades por bulto sugeridos para productos nuevos de la factura.
export function formatSuggestedProductName(rawName: string, commercialName?: string): string {
  let text = (commercialName || rawName || '').trim();
  if (!text) return 'Nuevo Producto';

  // 1. Quitar códigos y números iniciales de renglón típicos de factura
  text = text.replace(/^[\d\s—\-_*•]+/, '');
  text = text.replace(/^[A-Za-z]\d{2,6}\s+/, '');
  text = text.replace(/^\d{1,4}\s+(?=[A-Za-z])/i, '');

  // 2. Expansiones comunes de abreviaturas de distribuidora de kiosco
  const abbreviations: [RegExp, string][] = [
    [/\bCIGRED\b/gi, 'Cigarrillos Red '],
    [/\bCIG\.?\s+/gi, 'Cigarrillos '],
    [/\bL\s+STRIKE\b/gi, 'Lucky Strike'],
    [/\bL\.?\s*STRIKE\b/gi, 'Lucky Strike'],
    [/\bALF\.?\s*/gi, 'Alfajor '],
    [/\bCHOCOL\.?\s*/gi, 'Chocolate '],
    [/\bGALLET\.?\s*/gi, 'Galletitas '],
    [/\bCARAM\.?\s*/gi, 'Caramelos '],
    [/\bCHICL\.?\s*/gi, 'Chicles '],
    [/\bCHUP\.?\s*/gi, 'Chupetines '],
    [/\bBEB\.?\s*/gi, 'Bebida '],
    [/\bGAS\.?\s*/gi, 'Gaseosa '],
    [/\bAG\.?\s+MIN\.?\s*/gi, 'Agua Mineral '],
    [/\bAG\.?\s*/gi, 'Agua '],
    [/\bJUG\.?\s*/gi, 'Jugo '],
    [/\bCERV\.?\s*/gi, 'Cerveza '],
    [/\bENERG\.?\s*/gi, 'Energizante '],
    [/\bPAQ\.?\s*/gi, 'Paquete '],
    [/\bP\/ARMAR\b/gi, 'Para Armar'],
    [/\bCONV\.\s*/gi, 'Convertible '],
    [/\bORIG\.\s*/gi, 'Original '],
  ];

  for (const [pattern, replacement] of abbreviations) {
    text = text.replace(pattern, replacement);
  }

  // Quitar sufijos de empaque al final como "(25)", "(10)", "x10 ATADOS"
  text = text.replace(/\s*\(\d{1,4}\)\s*$/g, '');
  text = text.replace(/\s*[xX]\s*10\s+ATADOS\b/gi, '');
  text = text.replace(/\s*xX\s*/g, ' x');
  text = text.replace(/[»«]/g, '');
  text = text.replace(/\s+/g, ' ').trim();

  // Convertir palabras a formato legible
  const words = text.split(' ').map((w) => {
    if (!w) return '';
    const upper = w.toUpperCase();
    if (['KS', 'BOX', 'ORIGEN', 'MIX'].includes(upper)) return upper;
    if (upper === 'U' || upper === 'U.') return 'u.';
    if (/^\d+[A-Z]+$/i.test(w)) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return words.join(' ').trim() || 'Nuevo Producto';
}

export function generateProductCode(existingCodes: Set<string>): string {
  let attempts = 0;
  while (attempts < 50) {
    const code = `INT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    if (!existingCodes.has(code.toLowerCase())) {
      existingCodes.add(code.toLowerCase());
      return code;
    }
    attempts++;
  }
  const fallback = `INT-${Math.floor(100000 + Math.random() * 900000)}`;
  existingCodes.add(fallback.toLowerCase());
  return fallback;
}

export function guessProductEmoji(name: string): string {
  const n = name.toLowerCase();
  if (
    n.includes("coca") ||
    n.includes("pepsi") ||
    n.includes("sprite") ||
    n.includes("fanta") ||
    n.includes("gaseosa") ||
    n.includes("agua") ||
    n.includes("jugo") ||
    n.includes("cerveza") ||
    n.includes("speed") ||
    n.includes("monster") ||
    n.includes("red bull") ||
    n.includes("vino") ||
    n.includes("fernet")
  ) {
    return "🥤";
  }
  if (
    n.includes("alfajor") ||
    n.includes("chocolate") ||
    n.includes("caramelo") ||
    n.includes("chupetin") ||
    n.includes("gomita") ||
    n.includes("bon o bon") ||
    n.includes("tita") ||
    n.includes("rhodesia") ||
    n.includes("turron") ||
    n.includes("oblita") ||
    n.includes("chicle") ||
    n.includes("mentaplus") ||
    n.includes("halls") ||
    n.includes("beldent") ||
    n.includes("topline")
  ) {
    return "🍫";
  }
  if (
    n.includes("galletita") ||
    n.includes("galleta") ||
    n.includes("bizcocho") ||
    n.includes("oreo") ||
    n.includes("pepas") ||
    n.includes("don satur") ||
    n.includes("rumba") ||
    n.includes("chocolinas") ||
    n.includes("sonrisas") ||
    n.includes("vocacion")
  ) {
    return "🍪";
  }
  if (
    n.includes("papa") ||
    n.includes("lays") ||
    n.includes("dorito") ||
    n.includes("snack") ||
    n.includes("mani") ||
    n.includes("chizito") ||
    n.includes("cheetos") ||
    n.includes("nacho") ||
    n.includes("saladix")
  ) {
    return "🍿";
  }
  if (
    n.includes("cigarrill") ||
    n.includes("cigarro") ||
    n.includes("philip") ||
    n.includes("marlboro") ||
    n.includes("chesterfield") ||
    n.includes("camel") ||
    n.includes("lucky") ||
    n.includes("parliament") ||
    n.includes("rothmans")
  ) {
    return "🚬";
  }
  if (
    n.includes("helado") ||
    n.includes("palito") ||
    n.includes("frigor") ||
    n.includes("arcor helado")
  ) {
    return "🍦";
  }
  if (
    n.includes("cafe") ||
    n.includes("café") ||
    n.includes("te") ||
    n.includes("té") ||
    n.includes("mate cocido") ||
    n.includes("saquito")
  ) {
    return "☕";
  }
  if (n.includes("preservativo") || n.includes("prime") || n.includes("tulipan")) {
    return "🛡️";
  }
  if (
    n.includes("pila") ||
    n.includes("bateria") ||
    n.includes("duracell") ||
    n.includes("energizer") ||
    n.includes("encendedor") ||
    n.includes("bic") ||
    n.includes("fosforo")
  ) {
    return "⚡";
  }
  return "📦";
}

// ─── Helpers: Detección de Bultos / Displays y Categorización ───────────────

/**
 * Detecta si el nombre del producto en la factura indica que viene en display,
 * caja o bulto cerrado y cuántas unidades contiene (ej: '36X70', 'X 24', 'CAJA X 12', '18X8').
 */
export function detectPackUnits(rawName: string): number {
  if (!rawName) return 1;
  const name = rawName.trim();
  // Cigarrillos: cartón "x10 ATADOS"; "x20u." son cigarrillos por atado, no bultos.
  const cigarettes = cigaretteAtadosPerPack(name);
  if (cigarettes) return cigarettes;

  // 1. Patrón explícito: 'Caja x 24', 'Display x 18', 'Pack x 6', 'CJ X 12', 'DP X 36'
  const explicitPack = name.match(
    /\b(?:caja|cj|disp|display|pack|bulto)\s*(?:x|de)?\s*(\d{1,3})\b/i,
  );
  if (explicitPack && parseInt(explicitPack[1], 10) > 1) {
    return parseInt(explicitPack[1], 10);
  }

  // 2. Patrón 'X 24', 'X24', 'X 36', 'X 18U', 'x 12 un'
  const xUnits = name.match(
    /(?:^|\s)[xX]\s*(\d{1,3})\s*(?:u|un|uds|unid|unidades)?(?:\s|$)/i,
  );
  if (xUnits && parseInt(xUnits[1], 10) > 1) {
    return parseInt(xUnits[1], 10);
  }

  // 3. Patrón '36X70', '18X8', '32X60', '16X1146', '36X 118' (Típico mayorista de golosinas: Cantidad x Gramaje)
  const multMatch = name.match(/\b(\d{1,3})\s*[xX]\s*(\d+)/i);
  if (multMatch) {
    const count = parseInt(multMatch[1], 10);
    // Filtrar falsos positivos de medidas tipo '500ML', '750ML', '100G'
    if (count >= 2 && count <= 500) {
      return count;
    }
  }

  // 4. Patrón '24 U', '18 UN', '12 UDS'
  const uMatch = name.match(/\b(\d{1,3})\s*(?:u|un|uds|unid|unidades)\b/i);
  if (uMatch && parseInt(uMatch[1], 10) > 1) {
    return parseInt(uMatch[1], 10);
  }

  return 1;
}

/**
 * Resuelve y empareja de forma inteligente la categoría sugerida o detectada
 * con las categorías estándar cargadas desde la base de datos.
 */
