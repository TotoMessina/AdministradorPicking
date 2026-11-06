import { X } from "lucide-react";
import type { Product, Category } from "../features/retail/api";
import type { CondicionIva } from '../features/retail/billing';
import { type SupplierMapping } from '../services/supplierMappingService';
import { cigaretteAtadosPerPack, invoiceRulesPrompt, type SupplierInvoiceRules } from '../services/supplierInvoiceRules';
import { resolveProductCategory } from '../services/productCategoryService';

/** Vínculo pendiente sin dudas: confianza alta, costo leído y sin conflicto de código ni de presentación. */
export const isSureLink = (item: InvoiceItem) => {
  const product = item.matchedProduct;
  if (!product || item.action === 'skip' || item.linkStatus !== 'pending') return false;
  const code = item.rawCode?.trim().toLowerCase();
  const codeConflict = !!code && !!product.code?.trim() && code !== product.code.trim().toLowerCase();
  const packConflict = !!item.mapping?.pack_size_detected && item.mapping.pack_size_detected !== item.unitsPerPack;
  return item.matchConfidence >= 0.85 && item.costKnown && Number.isFinite(item.qty) && item.qty > 0 && item.qty <= 1000000 && !codeConflict && !packConflict;
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  invoiceLine: string;
  linkStatus: 'auto' | 'pending' | 'confirmed';
  linkReason: string;
  mapping?: SupplierMapping;
  mappingInvoiceText?: string;
  divisionReason?: string;
  costKnown: boolean;
  /** Nombre original tal como aparece en la factura */
  rawName: string;
  /** Código EAN/barcode si figura */
  rawCode?: string;
  /** Cantidad de bultos o cajas facturadas */
  rawQty: number;
  /** Costo facturado para ese renglón (precio por bulto/caja) */
  rawCost: number;
  /** Unidades individuales que contiene cada display/caja (1 si es suelto) */
  unitsPerPack: number;
  quantityUnit?: 'unit' | 'pack';
  /** Indica si se detectó o configuró como display/caja cerrada */
  isPack: boolean;
  /** Cantidad total de unidades individuales que ingresarán al stock (rawQty * unitsPerPack) */
  qty: number;
  /** Costo unitario real por producto suelto para vender en kiosco (rawCost / unitsPerPack) */
  unitCost: number;
  /** Producto del catálogo local emparejado (puede ser null = no encontrado) */
  matchedProduct: Product | null;
  /** Confianza del match: 0-1 */
  matchConfidence: number;
  /** Acción a realizar al importar */
  action: "add_stock" | "update_cost" | "both" | "create_new" | "skip";
  /** Nombre sugerido por el análisis / IA */
  suggestedName: string;
  /** Nombre editable si se crea como nuevo */
  newName: string;
  /** Código de barras / interno para producto nuevo */
  newCode: string;
  newMinStock: number;
  manual?: boolean;
  /** Si el código de barras es un EAN real detectado */
  codeDetected?: boolean;
  /** Origen del código de barras */
  codeSource?: 'invoice' | 'catalog' | 'manual' | 'none';
  /** Precio de venta sugerido y editable para producto nuevo */
  newPrice: number;
  /** Margen de ganancia porcentual sobre costo (ej: 40 para +40%) */
  customMargin?: number;
  /** Indica si el usuario fijó un precio exacto manual en lugar de calcular por margen */
  isManualPrice?: boolean;
  /** Categoría seleccionada si es nuevo */
  newCategoryId: string;
  /** Origen de la categoría asignada */
  categorySource?: 'ai' | 'catalog' | 'manual';
}

export function isRealBarcode(code?: string | null): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  return /^\d{8,14}$/.test(trimmed);
}

export function isInvoiceProductCode(code: string): boolean {
  return isRealBarcode(code) || /^INT-\d{6,20}$/i.test(code.trim());
}

export interface InvoiceAnalyzerProps {
  storeId: string;
  stockBranchId?: string;
  stockBranchName?: string;
  products: Product[];
  categories?: Category[];
  onClose: () => void;
  onImportDone?: (updatedCount: number) => void | Promise<void>;
  onPricesUpdated?: () => void | Promise<void>;
  /** Lo que entró por esta factura, para compararlo con el pedido: unidades y costo final por unidad. */
  onReceived?: (receipt: { supplierName: string; branchId?: string; lines: { product_id: string; name: string; qty: number; unit_cost: number | null }[] }) => void | Promise<void>;
  catalogBusy?: boolean;
  /** CUIT del comercio, para avisar si la factura está a nombre de otra sociedad. */
  storeCuit?: string | null;
  /** Condición frente al IVA: si no se conoce el tipo de factura, decide si los precios vienen sin IVA. */
  storeCondition?: CondicionIva | null;
  /** Nombre y razón social del comercio: la IA a veces los toma como proveedor. */
  storeNames?: string[];
}

// ─── Code and Emoji Helpers ─────────────────────────────────────────────────

/**
 * Limpia y formatea un nombre sugerido comercial listo para el catálogo de kiosco:
 * - Elimina códigos y números iniciales del renglón (ej: "3182300 Cos18 3 ...")
 * - Expande abreviaturas típicas de distribuidoras (CIG. -> Cigarrillos, ALF. -> Alfajor, etc.)
 * - Remueve sufijos de empaque repetidos al final si ya están como bulto (ej: (25), (10), x10 ATADOS)
 * - Convierte a Title Case legible respetando siglas comunes (KS, BOX, etc.)
 */
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
export function resolveCategory(
  suggestedCategory: string | undefined,
  productName: string,
  availableCategories: Category[],
): string {
  return resolveProductCategory(availableCategories, suggestedCategory, productName);
}

export function buildParsePrompt(invoiceText: string, categories: Category[] = [], _products: Product[] = [], rules: SupplierInvoiceRules = {}): string {
  const categoryNames = categories.map((c) => c.name.trim()).filter(Boolean);
  const categoriesHint = categoryNames.length > 0 ? `Categorías disponibles: ${categoryNames.slice(0, 15).join(', ')}.` : '';

  return `Analizá el siguiente texto de una factura o remito de compra de kiosco.
Identificá el proveedor (la empresa que EMITE la factura) y extraé la lista completa de todos los productos facturados.
Ignorá datos fiscales, CUIT, direcciones, fechas, subtotales y totales generales.

Respondé ÚNICAMENTE un objeto JSON válido con esta estructura, sin texto explicativo ni formato markdown:
{
  "proveedor": "Nombre de la empresa emisora, o vacío si no se lee",
  "items": [
    {
      "invoice_line": "Renglón original del producto tal como figura en la factura",
      "name": "Nombre comercial claro del producto",
      "code": "Código de barras o código interno si figura, o null",
      "qty": 1,
      "cost": 1500.0,
      "unitsPerPack": 1,
      "category": "Golosinas"
    }
  ]
}

Reglas:
- Extraé cada producto o artículo facturado.
- qty: cantidad comprada (número).
- proveedor: es quien vende y emite la factura (logo o razón social del encabezado, junto a su CUIT). Nunca uses el cliente o comprador (Cliente, Razón Social del receptor, Sr./Señores, Domicilio de entrega). Si no se lee, dejalo vacío.
- cost: precio unitario de COMPRA facturado (columnas como Unitario, P. Unit., Pr Unit, Precio o P. Lista; número sin signo $). Nunca uses columnas de precio Sugerido, P.V.P., Precio público o de venta al público: son precios de venta, no costo.
- unitsPerPack: si viene en bulto/display/caja (ej: X24, X12, Pack x 6), poné la cantidad de unidades; si es suelto o no especifica, poné 1.
- Cigarrillos: el atado es la unidad. Los cigarrillos por atado ("x20u.", "KS 20", "BOX 20", "SOF 20") NO son unitsPerPack: poné 1. Si dice "x10 ATADOS" es un cartón: unitsPerPack 10.
${categoriesHint ? `- category: asigná la categoría más adecuada (${categoriesHint}) o "Varios".` : ''}${invoiceRulesPrompt(rules)}

TEXTO DEL COMPROBANTE:
${invoiceText}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

