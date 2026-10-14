import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Filter,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { groqChat, GroqError } from "../services/groqService";
import { extractTextFromFile, cleanInvoiceOcrText } from "../services/invoiceParserService";
import type { Product, Category } from "../features/retail/api";
import { retail } from "../features/retail/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvoiceItem {
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
  /** Nombre editable si se crea como nuevo */
  newName: string;
  /** Código de barras / interno para producto nuevo */
  newCode: string;
  /** Precio de venta sugerido y editable para producto nuevo */
  newPrice: number;
  /** Categoría seleccionada si es nuevo */
  newCategoryId: string;
}

export interface InvoiceAnalyzerProps {
  storeId: string;
  products: Product[];
  categories?: Category[];
  onClose: () => void;
  onImportDone?: (updatedCount: number) => void;
}

// ─── Code and Emoji Helpers ─────────────────────────────────────────────────

function generateProductCode(existingCodes: Set<string>): string {
  let attempts = 0;
  while (attempts < 50) {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const code = `779${randomSuffix}`;
    if (!existingCodes.has(code.toLowerCase())) {
      existingCodes.add(code.toLowerCase());
      return code;
    }
    attempts++;
  }
  const fallback = `INT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
  existingCodes.add(fallback.toLowerCase());
  return fallback;
}

function guessProductEmoji(name: string): string {
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
function detectPackUnits(rawName: string): number {
  if (!rawName) return 1;
  const name = rawName.trim();

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
 * con las categorías reales registradas en el kiosco del usuario.
 */
function resolveCategory(
  suggestedCategory: string | undefined,
  productName: string,
  availableCategories: Category[],
): string {
  if (!availableCategories.length) return "";

  const cleanSuggested = (suggestedCategory || "").trim().toLowerCase();
  const cleanName = productName.toLowerCase();

  // 1. Coincidencia directa o parcial con la categoría devuelta por IA
  if (cleanSuggested) {
    const exact = availableCategories.find(
      (c) => c.name.trim().toLowerCase() === cleanSuggested,
    );
    if (exact) return exact.id;

    const partial = availableCategories.find(
      (c) =>
        c.name.toLowerCase().includes(cleanSuggested) ||
        cleanSuggested.includes(c.name.toLowerCase()),
    );
    if (partial) return partial.id;
  }

  // 2. Mapeo semántico por palabras clave típicas de rubros de kiosco
  const KEYWORD_MAP: { keywords: string[]; categoryTerms: string[] }[] = [
    {
      keywords: [
        "alfajor",
        "chicle",
        "caramelo",
        "chupetin",
        "beldent",
        "bubbaloo",
        "milka",
        "bon o bon",
        "chocolate",
        "confite",
        "gomitas",
        "pastillas",
        "turron",
        "oblea",
        "shot",
        "mentoplus",
        "halls",
        "block",
        "cofler",
        "aguila",
        "marroc",
        "rocklets",
        "moritas",
        "yapa",
      ],
      categoryTerms: ["golosina", "dulce", "kiosco", "chocolate", "candy", "alfajor"],
    },
    {
      keywords: [
        "coca",
        "pepsi",
        "sprite",
        "fanta",
        "agua",
        "soda",
        "jugo",
        "clight",
        "tang",
        "aquarius",
        "levite",
        "villavicencio",
        "speed",
        "monster",
        "red bull",
        "cerveza",
        "vino",
        "fernet",
        "gaseosa",
        "branca",
        "quilmes",
        "brahma",
        "heineken",
        "corona",
        "gatorade",
        "powerade",
      ],
      categoryTerms: ["bebida", "gaseosa", "jugo", "agua", "cerveza", "alcohol", "fresco"],
    },
    {
      keywords: [
        "galletita",
        "galleta",
        "oreo",
        "pepa",
        "rumba",
        "chocolina",
        "merengada",
        "don satur",
        "bizcocho",
        "tostada",
        "crackers",
        "traviata",
        "opera",
        "criollitas",
        "terrabusi",
        "bagley",
        "pepitos",
        "sonrisas",
      ],
      categoryTerms: ["galletita", "galleta", "bizcocho", "panaderia", "snack"],
    },
    {
      keywords: [
        "papas",
        "lays",
        "doritos",
        "cheetos",
        "chizitos",
        "mani",
        "snack",
        "palitos",
        "saladix",
        "pehuamar",
        "nachos",
        "twistos",
        "krachitos",
      ],
      categoryTerms: ["snack", "salado", "copetin"],
    },
    {
      keywords: [
        "marlboro",
        "philip",
        "chesterfield",
        "camel",
        "lucky",
        "cigarrillo",
        "tabaco",
        "encendedor",
        "sedas",
        "papelillo",
        "filtros",
        "clipper",
        "bic",
      ],
      categoryTerms: ["cigarrillo", "tabaco", "fumador"],
    },
    {
      keywords: [
        "leche",
        "yogur",
        "queso",
        "manteca",
        "crema",
        "dulce de leche",
        "postre",
        "serenisima",
        "sancor",
        "ilolay",
      ],
      categoryTerms: ["lacteo", "fresco", "refrigerado"],
    },
  ];

  for (const group of KEYWORD_MAP) {
    const matchesName = group.keywords.some((kw) => cleanName.includes(kw));
    if (matchesName) {
      const matchedCat = availableCategories.find((c) => {
        const cName = c.name.toLowerCase();
        return group.categoryTerms.some((term) => cName.includes(term));
      });
      if (matchedCat) return matchedCat.id;
    }
  }

  // 3. Fallback a la primera categoría disponible
  return availableCategories[0].id;
}

function buildParsePrompt(invoiceText: string, categories: Category[] = []): string {
  const categoryNames = categories.map((c) => c.name.trim()).filter(Boolean);
  const categoryGuide =
    categoryNames.length > 0
      ? `CATEGORÍAS EXISTENTES EN EL KIOSCO (Elegí la más adecuada para cada producto):
${JSON.stringify(categoryNames)}
- Asigná a cada producto el nombre EXACTO de la categoría que mejor corresponda de esa lista en el campo "category".`
      : "";

  return `Sos un extractor de facturas y remitos de distribuidoras mayoristas para un kiosco.
Tu tarea es extraer:
1. El PROVEEDOR o distribuidora ("proveedor").
2. La lista completa de PRODUCTOS comprados ("items").

${categoryGuide}

Reglas obligatorias:
- NO extraigas fechas, CUIT, impuestos, números de comprobante, CAE, subtotales ni totales generales.
- Ignorá cualquier línea o fragmento residual con símbolos sueltos o letras aisladas de ruido OCR.
- Extraé ABSOLUTAMENTE TODOS los renglones de productos sin omitir ninguno.
- Por cada producto extraé:
  - "name": Nombre o descripción comercial limpia del producto (ej: "MILKA EXTRA DDL BCO").
  - "code": Código de barras (EAN-13 o interno) si figura en ese renglón, caso contrario null.
  - "qty": Cantidad de bultos o cajas facturadas (entero >= 1, por defecto 1).
  - "cost": Costo facturado de ese renglón (precio del bulto/caja o total / qty).
  - "unitsPerPack": Si el producto viene en display, caja o bulto cerrado (ej: "36X70" -> 36, "X 24" -> 24, "CAJA X 12" -> 12, "18X8" -> 18, "32X60" -> 32), indicá cuántas unidades individuales contiene. Si es un producto que viene suelto por unidad, indicá 1.
  - "category": La categoría correspondiente elegida de la lista de categorías del kiosco.

Respondé ÚNICAMENTE un objeto JSON válido (sin markdown ni texto explicativo):
{
  "proveedor": "Nombre del proveedor o distribuidora",
  "items": [
    {
      "name": "MILKA EXTRA DDL BCO",
      "code": null,
      "qty": 1,
      "cost": 18000.0,
      "unitsPerPack": 36,
      "category": "Golosinas"
    }
  ]
}

TEXTO DEL COMPROBANTE:
${invoiceText}`;
}

// ─── Local Catalog Matching Engine (0 tokens, 0ms) ─────────────────────────

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "por",
  "en",
  "con",
  "sin",
  "para",
  "x",
  "y",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeaningfulTokens(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function findBestCatalogMatch(
  rawName: string,
  rawCode: string | null | undefined,
  products: Product[],
): { matchedProduct: Product | null; confidence: number } {
  const cleanCode = rawCode?.trim().toLowerCase();
  // 1. Coincidencia exacta por código de barras / EAN
  if (cleanCode && cleanCode.length >= 4) {
    const codeMatch = products.find(
      (p) => p.code && p.code.trim().toLowerCase() === cleanCode,
    );
    if (codeMatch) {
      return { matchedProduct: codeMatch, confidence: 1.0 };
    }
  }

  const normName = normalizeText(rawName);
  if (!normName) return { matchedProduct: null, confidence: 0 };

  // 2. Coincidencia exacta por nombre normalizado
  const exactNameMatch = products.find((p) => normalizeText(p.name) === normName);
  if (exactNameMatch) {
    return { matchedProduct: exactNameMatch, confidence: 0.98 };
  }

  const nameTokens = extractMeaningfulTokens(rawName);
  if (nameTokens.length === 0) return { matchedProduct: null, confidence: 0 };

  let bestProduct: Product | null = null;
  let bestScore = 0;

  for (const p of products) {
    const normProdName = normalizeText(p.name);

    // Contención como subcadena
    if (normName.includes(normProdName) || normProdName.includes(normName)) {
      const lenRatio =
        Math.min(normName.length, normProdName.length) /
        Math.max(normName.length, normProdName.length);
      const subScore = 0.8 + lenRatio * 0.15;
      if (subScore > bestScore) {
        bestScore = subScore;
        bestProduct = p;
      }
      continue;
    }

    // Similitud de tokens ponderada
    const prodTokens = extractMeaningfulTokens(p.name);
    if (p.brand) {
      prodTokens.push(...extractMeaningfulTokens(p.brand));
    }

    const prodSet = new Set(prodTokens);
    let common = 0;
    for (const t of nameTokens) {
      if (prodSet.has(t)) {
        common += 1;
      } else {
        // Coincidencia de prefijos para abreviaciones (ej: "alf" <-> "alfajor")
        for (const pt of prodSet) {
          if (
            (t.length >= 3 && pt.startsWith(t)) ||
            (pt.length >= 3 && t.startsWith(pt))
          ) {
            common += 0.7;
            break;
          }
        }
      }
    }

    const score = (2 * common) / (nameTokens.length + prodTokens.length);
    if (score > bestScore) {
      bestScore = score;
      bestProduct = p;
    }
  }

  if (bestProduct && bestScore >= 0.45) {
    return {
      matchedProduct: bestProduct,
      confidence: Math.min(0.95, Number(bestScore.toFixed(2))),
    };
  }

  return { matchedProduct: null, confidence: 0 };
}

function extractJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.trim();
    if (cleaned.startsWith("{") || cleaned.startsWith("[")) return JSON.parse(cleaned) as T;
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match?.[1]) return JSON.parse(match[1]) as T;
    const first = cleaned.search(/[{[]/);
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const last = Math.max(lastBrace, lastBracket);
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(cleaned.substring(first, last + 1)) as T;
    }
  } catch {
    return null;
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InvoiceAnalyzer({
  storeId,
  products,
  categories,
  onClose,
  onImportDone,
}: InvoiceAnalyzerProps) {
  const [step, setStep] = useState<"input" | "parsing" | "review" | "importing" | "done">("input");
  const [invoiceText, setInvoiceText] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [providerName, setProviderName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: "pdf" | "image" | "text";
    previewUrl?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros y búsqueda para el paso de revisión
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "matched" | "skip">("all");
  const [isEditingProvider, setIsEditingProvider] = useState(false);

  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
    } else {
      void retail.categories(storeId).then((cats) => {
        if (cats && cats.length > 0) {
          setLocalCategories(cats);
        }
      });
    }
  }, [categories, storeId]);

  // ── Rate limit retry & timer state ───────────────────────────────────────
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleParseRef = useRef<(isRetry?: boolean) => Promise<void>>(async () => {});

  const clearRateLimitTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRateLimitCountdown(null);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const startRateLimitCountdown = useCallback((seconds: number) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    let remaining = Math.max(5, Math.ceil(seconds));
    setRateLimitCountdown(remaining);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setRateLimitCountdown(null);
        void handleParseRef.current(true);
      } else {
        setRateLimitCountdown(remaining);
      }
    }, 1000);
  }, []);

  // ── Parse invoice ───────────────────────────────────────────────────────

  const handleParse = useCallback(
    async (isRetry = false) => {
      if (!invoiceText.trim()) {
        setError("Pegá o escribí el texto de la factura antes de continuar.");
        return;
      }
      clearRateLimitTimer();
      setError(null);
      setStep("parsing");
      try {
        // Filtrar caracteres innecesarios y ruido de escaneo/AFIP antes de enviar al LLM
        const cleanText = cleanInvoiceOcrText(invoiceText);
        let parseRaw = "";
        try {
          parseRaw = await groqChat(
            [{ role: "user", content: buildParsePrompt(cleanText, localCategories) }],
            { maxTokens: 1400, temperature: 0.1 },
          );
        } catch (errFirst) {
          const isRateLimit =
            errFirst instanceof GroqError &&
            (errFirst.status === 429 ||
              errFirst.code === "rate_limit_exceeded" ||
              errFirst.message.toLowerCase().includes("rate limit") ||
              errFirst.message.toLowerCase().includes("tokens per minute"));

          if (isRateLimit) {
            // Reintentar con modelo de respaldo (openai/gpt-oss-120b)
            try {
              parseRaw = await groqChat(
                [{ role: "user", content: buildParsePrompt(cleanText, localCategories) }],
                { model: "openai/gpt-oss-120b", maxTokens: 1400, temperature: 0.1 },
              );
            } catch (errSecond) {
              const waitSec =
                (errFirst instanceof GroqError ? errFirst.retryAfter : undefined) ||
                (errSecond instanceof GroqError ? errSecond.retryAfter : undefined) ||
                25;
              startRateLimitCountdown(waitSec);
              throw new Error(
                `Límite de velocidad de Groq (1.000 tokens/min en Free Tier). Reintentando automáticamente en ${Math.ceil(waitSec)}s...`,
              );
            }
          } else {
            throw errFirst;
          }
        }

        type RawExtractedItem = {
          name?: string;
          rawName?: string;
          code?: string | null;
          rawCode?: string | null;
          qty?: number;
          cost?: number;
          unitCost?: number;
          unitsPerPack?: number;
          category?: string | null;
        };

        type ParseResult = {
          proveedor?: string;
          items?: RawExtractedItem[];
        };

        const parsed = extractJson<ParseResult>(parseRaw);
        if (!parsed?.items?.length) {
          setError("No se pudieron extraer productos de la factura. Revisá el formato del texto.");
          setStep("input");
          return;
        }

        // Proveedor extraído exclusivamente
        setProviderName(parsed.proveedor?.trim() || "");
        setInvoiceDate("");

        const existingCodes = new Set(
          products.map((p) => p.code?.trim().toLowerCase()).filter(Boolean),
        );

        const resolvedItems: InvoiceItem[] = parsed.items.map((it) => {
          const rawName = (it.name || it.rawName || "").trim();
          const rawCode = (it.code || it.rawCode || "").trim();

          // Detección de unidades por display/caja (prioriza regex verificado de mayorista y luego sugerencia de IA)
          const regexUnits = detectPackUnits(rawName);
          const aiUnits = Number(it.unitsPerPack);
          const unitsPerPack = Math.max(1, regexUnits > 1 ? regexUnits : (aiUnits > 1 ? aiUnits : 1));
          const isPack = unitsPerPack > 1;

          const rawQty = Math.max(1, Number(it.qty) || 1);
          const rawCost = Math.max(0, Number(it.cost ?? it.unitCost) || 0);

          // Si viene en display/caja: el costo unitario real es rawCost / unitsPerPack
          // y el stock total a ingresar es rawQty * unitsPerPack
          const unitCost = isPack && rawCost > 0
            ? Math.round((rawCost / unitsPerPack) * 100) / 100
            : rawCost;
          const qty = rawQty * unitsPerPack;

          // Categorización automática en las categorías del usuario
          const assignedCategoryId = resolveCategory(it.category || undefined, rawName, localCategories);

          // Coincidencia local en catálogo en 0ms sin consumir tokens de IA
          const { matchedProduct, confidence } = findBestCatalogMatch(rawName, rawCode, products);

          const hasMatch = !!matchedProduct;
          let newCode = rawCode;
          if (!newCode || existingCodes.has(newCode.toLowerCase())) {
            newCode = generateProductCode(existingCodes);
          } else {
            existingCodes.add(newCode.toLowerCase());
          }

          // Margen estimado inicial del 40% sobre el costo unitario real
          const suggestedPrice = unitCost > 0 ? Math.round(unitCost * 1.4) : 100;

          return {
            rawName: rawName || "Producto sin nombre",
            rawCode: rawCode || undefined,
            rawQty,
            rawCost,
            unitsPerPack,
            isPack,
            qty,
            unitCost,
            matchedProduct,
            matchConfidence: confidence,
            action: hasMatch ? "both" : "create_new", // Por defecto cargar no existentes como productos nuevos
            newName: rawName || "Nuevo Producto",
            newCode,
            newPrice: suggestedPrice,
            newCategoryId: assignedCategoryId,
          };
        });

        setItems(resolvedItems);
        setStep("review");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido al analizar la factura.";
        setError(msg);
        setStep("input");
      }
    },
    [invoiceText, products, localCategories, clearRateLimitTimer, startRateLimitCountdown],
  );

  useEffect(() => {
    handleParseRef.current = handleParse;
  }, [handleParse]);

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const toUpdate = items.filter((it) => it.matchedProduct && it.action !== "skip");
    const toCreate = items.filter((it) => !it.matchedProduct && it.action === "create_new");

    if (!toUpdate.length && !toCreate.length) {
      setError("No hay ítems para importar. Elegí al menos una acción distinta de 'Omitir'.");
      return;
    }
    setStep("importing");
    setError(null);

    try {
      // 1. Actualización de productos existentes
      if (toUpdate.length > 0) {
        const batchItems: { id: string; newStock: number; newCost?: number }[] = [];
        for (const it of toUpdate) {
          const prod = it.matchedProduct!;
          const newStock =
            it.action === "add_stock" || it.action === "both"
              ? prod.stock + it.qty
              : prod.stock;
          const newCost =
            it.action === "update_cost" || it.action === "both"
              ? it.unitCost
              : undefined;
          batchItems.push({ id: prod.id, newStock, newCost });
        }
        await retail.replenishStockBatch(storeId, batchItems);
      }

      // 2. Alta de productos nuevos en catálogo
      if (toCreate.length > 0) {
        let fallbackCatId = localCategories[0]?.id || "";
        if (!fallbackCatId) {
          const cats = await retail.categories(storeId);
          if (cats && cats.length > 0) {
            fallbackCatId = cats[0].id;
          } else {
            const newCat = await retail.addCategory(storeId, "Varios");
            fallbackCatId = newCat.id;
          }
        }

        const usedCodes = new Set(
          products.map((p) => p.code?.trim().toLowerCase()).filter(Boolean),
        );

        for (const it of toCreate) {
          let code = it.newCode?.trim() || "";
          if (!code || usedCodes.has(code.toLowerCase())) {
            code = generateProductCode(usedCodes);
          }
          usedCodes.add(code.toLowerCase());

          const price = Math.max(
            1,
            Number(it.newPrice) || Math.round(it.unitCost * 1.4) || 100,
          );
          const name = (it.newName || it.rawName).trim().slice(0, 160);
          const emoji = guessProductEmoji(name);

          await retail.saveProduct(
            storeId,
            {
              id: "",
              categoryId: it.newCategoryId || fallbackCatId,
              code,
              name,
              price,
              cost: Math.max(0, Number(it.unitCost) || 0),
              stock: Math.max(1, Number(it.qty) || 1),
              minStock: 4,
              emoji,
              active: true,
              supplier: providerName?.trim() || undefined,
            },
            false,
          );

          // Contribuir al catálogo comunitario si tiene código EAN numérico
          const cleanCode = code.trim();
          const isNumericEan = /^\d{8,14}$/.test(cleanCode);
          const isInternalCode = /^[a-zA-Z]/.test(cleanCode);
          if (isNumericEan && !isInternalCode) {
            const catName =
              localCategories.find((c) => c.id === (it.newCategoryId || fallbackCatId))
                ?.name || "";
            void retail.contributeCatalog(cleanCode, name, undefined, catName, emoji);
          }
        }
      }

      const totalCount = toUpdate.length + toCreate.length;
      setImportedCount(totalCount);
      setUpdatedCount(toUpdate.length);
      setCreatedCount(toCreate.length);
      setStep("done");
      onImportDone?.(totalCount);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al importar productos.";
      setError(msg);
      setStep("review");
    }
  }, [items, storeId, onImportDone, products, localCategories, providerName]);

  // ── UI helpers ──────────────────────────────────────────────────────────

  const toggleExpand = (i: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const updateItem = (i: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const handleUpdatePackUnits = (originalIndex: number, newUnits: number) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== originalIndex) return it;
        const unitsPerPack = Math.max(1, Math.round(newUnits) || 1);
        const isPack = unitsPerPack > 1;
        const unitCost =
          isPack && it.rawCost > 0
            ? Math.round((it.rawCost / unitsPerPack) * 100) / 100
            : it.rawCost;
        const qty = it.rawQty * unitsPerPack;

        const currentMargin =
          it.unitCost > 0 ? (it.newPrice - it.unitCost) / it.unitCost : 0.4;
        const newPrice =
          unitCost > 0
            ? Math.max(1, Math.round(unitCost * (1 + currentMargin)))
            : it.newPrice;

        return {
          ...it,
          unitsPerPack,
          isPack,
          unitCost,
          qty,
          newPrice,
        };
      }),
    );
  };

  const handleUpdateCategory = (originalIndex: number, newCategoryId: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === originalIndex ? { ...it, newCategoryId } : it)),
    );
  };

  const handleSetAllUnmatchedAction = (action: "create_new" | "skip") => {
    setItems((prev) =>
      prev.map((it) => (!it.matchedProduct ? { ...it, action } : it)),
    );
  };

  const handleApplyMarginToNew = (marginPct: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (!it.matchedProduct && it.action === "create_new") {
          const newPrice = Math.max(1, Math.round(it.unitCost * (1 + marginPct / 100)));
          return { ...it, newPrice };
        }
        return it;
      }),
    );
  };

  const handleSetDefaultCategoryForNew = (catId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (!it.matchedProduct) {
          return { ...it, newCategoryId: catId };
        }
        return it;
      }),
    );
  };

  const matchedCount = items.filter((it) => it.matchedProduct && it.action !== "skip").length;
  const newCount = items.filter((it) => !it.matchedProduct && it.action === "create_new").length;
  const skippedCount = items.filter((it) => it.action === "skip").length;
  const unmatchedTotal = items.filter((it) => !it.matchedProduct).length;
  const totalToImport = matchedCount + newCount;

  const confidenceColor = (c: number) =>
    c >= 0.8 ? "var(--tone-accent)" : c >= 0.5 ? "var(--tone-accent)" : "var(--tone-danger)";
  const confidenceLabel = (c: number) =>
    c >= 0.8 ? "Alta" : c >= 0.5 ? "Media" : "Baja";

  const filteredItems = useMemo(() => {
    return items
      .map((it, originalIndex) => ({ it, originalIndex }))
      .filter(({ it }) => {
        if (filterStatus === "new" && (it.matchedProduct || it.action !== "create_new")) return false;
        if (filterStatus === "matched" && !it.matchedProduct) return false;
        if (filterStatus === "skip" && it.action !== "skip") return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = it.rawName.toLowerCase().includes(q) || it.newName.toLowerCase().includes(q);
          const matchCode = (it.rawCode || "").toLowerCase().includes(q) || it.newCode.toLowerCase().includes(q);
          const matchMatched = it.matchedProduct?.name.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchMatched) return false;
        }
        return true;
      });
  }, [items, filterStatus, searchQuery]);

  const processFile = async (file: File) => {
    setError(null);
    setIsExtracting(true);
    setExtractProgress("Iniciando procesamiento…");

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    try {
      const result = await extractTextFromFile(file, (msg) => {
        setExtractProgress(msg);
      });

      if (!result.text || result.text.length < 5) {
        setShowRawText(true);
        throw new Error(
          "No se pudo extraer texto suficiente de la imagen. Asegurate de que la foto esté bien iluminada y nítida, o pegá los datos directamente en el cuadro de texto inferior."
        );
      }

      setInvoiceText(result.text);
      setUploadedFile({
        name: result.fileName,
        size: sizeFormatted,
        type: result.fileType,
        previewUrl: result.previewUrl,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al procesar el archivo.";
      setError(msg);
      setShowRawText(true);
    } finally {
      setIsExtracting(false);
      setExtractProgress("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const STEP_LABELS = ["Cargar", "Analizando", "Revisar", "Importando", "Listo"] as const;
  const STEP_KEYS = ["input", "parsing", "review", "importing", "done"] as const;
  const stepIdx = STEP_KEYS.indexOf(step);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="invoice-overlay" role="dialog" aria-modal="true" aria-label="Analizador de Facturas">
      <div className="invoice-modal">
        {/* Header */}
        <div className="invoice-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={22} />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Analizador de Facturas con IA</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--tone-muted)" }}>
                Importá productos de una factura en PDF o imagen a tu stock automáticamente
              </p>
            </div>
          </div>
          <button className="invoice-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="invoice-steps">
          {STEP_KEYS.map((s, idx) => (
            <div
              key={s}
              className={`invoice-step-dot-wrap ${idx < stepIdx ? "done" : idx === stepIdx ? "active" : "pending"}`}
            >
              <div className="invoice-step-dot">{idx < stepIdx ? "✓" : idx + 1}</div>
              <span className="invoice-step-lbl">{STEP_LABELS[idx]}</span>
            </div>
          ))}
        </div>

        {/* Rate Limit Countdown Banner */}
        {rateLimitCountdown !== null && (
          <div className="invoice-rate-limit-banner">
            <Clock size={18} className="spin-slow" />
            <div className="rate-limit-info">
              <strong>Límite de velocidad de Groq (1.000 tokens/minuto en Free Tier)</strong>
              <span>
                Reintentando automáticamente en <strong>{rateLimitCountdown}s</strong>...
              </span>
            </div>
            <div className="rate-limit-actions">
              <button
                type="button"
                className="primary-button"
                style={{ padding: "5px 12px", fontSize: 12, height: "auto" }}
                onClick={() => void handleParse(true)}
              >
                <RefreshCw size={12} /> Reintentar ahora
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "5px 10px", fontSize: 12, height: "auto" }}
                onClick={clearRateLimitTimer}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && rateLimitCountdown === null && (
          <div className="invoice-error">
            <AlertTriangle size={15} />
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* INPUT */}
        {step === "input" && (
          <div className="invoice-body">
            <div className="invoice-hint">
              <Sparkles size={16} />
              <span>
                Subí tu factura en <strong>PDF</strong> o <strong>Foto / Imagen</strong> (PNG, JPG, WEBP). La IA procesa el documento, reconoce automáticamente los productos y actualiza tu inventario.
              </span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`invoice-dropzone ${isDragging ? "dragging" : ""} ${uploadedFile ? "has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isExtracting && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*,.png,.jpg,.jpeg,.webp,.bmp,.txt,.csv"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              {isExtracting ? (
                <div className="invoice-dropzone-loading">
                  <Loader2 size={34} className="spin" />
                  <h4>Procesando documento…</h4>
                  <p>{extractProgress || "Leyendo y reconociendo el texto"}</p>
                </div>
              ) : uploadedFile ? (
                <div className="invoice-dropzone-file">
                  {uploadedFile.previewUrl ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Vista previa factura"
                      className="invoice-preview-thumb"
                    />
                  ) : (
                    <div className={`invoice-file-icon ${uploadedFile.type}`}>
                      {uploadedFile.type === "pdf" ? <FileText size={30} /> : <FileImage size={30} />}
                    </div>
                  )}
                  <div className="invoice-file-meta">
                    <span className="invoice-file-name">{uploadedFile.name}</span>
                    <span className="invoice-file-sub">
                      {uploadedFile.type === "pdf" ? "Documento PDF" : "Imagen / Foto"} • {uploadedFile.size}
                    </span>
                    <span className="invoice-file-badge">✓ Texto extraído exitosamente</span>
                  </div>
                  <button
                    type="button"
                    className="invoice-remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setInvoiceText("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Quitar archivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="invoice-dropzone-empty">
                  <div className="invoice-dropzone-icons">
                    <div className="dropzone-icon-pill pdf">
                      <FileText size={20} />
                      <span>PDF</span>
                    </div>
                    <div className="dropzone-icon-pill img">
                      <FileImage size={20} />
                      <span>Imagen / Foto</span>
                    </div>
                  </div>
                  <h4 style={{ margin: "10px 0 4px", fontSize: 15, fontWeight: 700, color: "var(--tone-accent)" }}>
                    Hacé click para seleccionar o arrastrá tu factura aquí
                  </h4>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--tone-muted)" }}>
                    Compatible con facturas electrónicas en <strong>PDF</strong>, escaneos o fotos de remitos en <strong>JPG / PNG / WEBP</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Extracted text preview toggle */}
            <div className="invoice-text-toggle-row">
              <button
                type="button"
                className="invoice-text-toggle-btn"
                onClick={() => setShowRawText(!showRawText)}
              >
                {showRawText ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>
                  {showRawText ? "Ocultar texto detectado" : "Ver / editar texto detectado"} {invoiceText ? `(${invoiceText.length} caracteres)` : ""}
                </span>
              </button>
              {invoiceText.length > 0 && !showRawText && (
                <span className="invoice-text-status">
                  Listo para procesar con IA
                </span>
              )}
              {invoiceText.length > 0 && showRawText && (
                <button
                  type="button"
                  className="invoice-text-clean-btn"
                  onClick={() => setInvoiceText((prev) => cleanInvoiceOcrText(prev))}
                  title="Eliminar líneas de ruido, símbolos sueltos y artefactos de OCR"
                >
                  <Sparkles size={12} /> Limpiar ruido OCR
                </button>
              )}
            </div>

            {showRawText && (
              <textarea
                className="invoice-textarea"
                placeholder="El texto de la factura aparecerá aquí automáticamente al subir el archivo PDF o imagen. También podés pegarlo o editarlo manualmente."
                value={invoiceText}
                onChange={(e) => setInvoiceText(e.target.value)}
                rows={8}
              />
            )}

            <div className="invoice-actions">
              <button className="secondary-button" onClick={onClose}>Cancelar</button>
              <button
                className="primary-button"
                onClick={() => void handleParse()}
                disabled={!invoiceText.trim() || isExtracting}
              >
                <Sparkles size={14} /> Analizar con IA
              </button>
            </div>
          </div>
        )}

        {/* PARSING */}
        {step === "parsing" && (
          <div className="invoice-body invoice-loading-state">
            <Loader2 size={38} className="spin" />
            <h3>Analizando la factura…</h3>
            <p>Extrayendo productos y buscando coincidencias en tu catálogo.<br />Puede tardar unos segundos.</p>
          </div>
        )}

        {/* REVIEW */}
        {step === "review" && (
          <div className="invoice-body">
            {/* Supplier and Date Header Bar */}
            <div className="inv-supplier-bar">
              <div className="inv-supplier-icon">🏭</div>
              <div className="inv-supplier-content">
                <span className="inv-supplier-label">Proveedor detectado</span>
                {isEditingProvider ? (
                  <div className="inv-supplier-input-wrap">
                    <input
                      type="text"
                      className="inv-supplier-input"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      placeholder="Nombre del proveedor o distribuidora"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingProvider(false);
                      }}
                    />
                    <button
                      type="button"
                      className="inv-small-btn primary"
                      onClick={() => setIsEditingProvider(false)}
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div
                    className="inv-supplier-display"
                    onClick={() => setIsEditingProvider(true)}
                    title="Click para editar el nombre del proveedor"
                  >
                    <strong>{providerName || "Sin proveedor detectado"}</strong>
                    <Edit2 size={13} className="inv-supplier-edit-icon" />
                  </div>
                )}
              </div>

              {invoiceDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--tone-muted)" }}>
                  <span>📅</span>
                  <span>{invoiceDate}</span>
                </div>
              )}

              <button
                type="button"
                className="secondary-button"
                style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, height: "auto" }}
                onClick={() => setStep("input")}
              >
                <RefreshCw size={13} /> Volver a cargar
              </button>
            </div>

            {/* Toolbar: Search + Filter Tabs */}
            <div className="inv-toolbar">
              <div className="inv-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="inv-filter-tabs">
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "all" ? "active" : ""}`}
                  onClick={() => setFilterStatus("all")}
                >
                  Todos ({items.length})
                </button>
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "matched" ? "active" : ""}`}
                  onClick={() => setFilterStatus("matched")}
                >
                  En Catálogo ({items.filter((it) => it.matchedProduct).length})
                </button>
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "new" ? "active" : ""}`}
                  onClick={() => setFilterStatus("new")}
                >
                  ✨ Nuevos ({newCount})
                </button>
                <button
                  type="button"
                  className={`inv-tab ${filterStatus === "skip" ? "active" : ""}`}
                  onClick={() => setFilterStatus("skip")}
                >
                  Omitidos ({skippedCount})
                </button>
              </div>
            </div>

            {/* Bulk actions banner for unmatched items */}
            {unmatchedTotal > 0 && (
              <div className="inv-unmatched-banner">
                <div className="inv-unmatched-header" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} />
                    <span>
                      Factura con <strong>{unmatchedTotal}</strong> producto{unmatchedTotal !== 1 ? "s" : ""} sin coincidencia exacta en tu catálogo
                    </span>
                  </div>
                  {items.some((it) => it.isPack) && (
                    <span className="inv-pack-summary-pill">
                      📦 {items.filter((it) => it.isPack).length} en Display / Caja cerrada (costos calculados por unidad)
                    </span>
                  )}
                </div>
                <div className="inv-unmatched-actions">
                  <button
                    type="button"
                    className="inv-small-btn primary"
                    onClick={() => handleSetAllUnmatchedAction("create_new")}
                  >
                    ✨ Cargar todos como productos nuevos
                  </button>
                  <button
                    type="button"
                    className="inv-small-btn"
                    onClick={() => handleSetAllUnmatchedAction("skip")}
                  >
                    Omitir todos los no encontrados
                  </button>
                  {localCategories.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <span style={{ color: "var(--tone-muted)" }}>Categoría común:</span>
                      <select
                        className="inv-small-select"
                        onChange={(e) => handleSetDefaultCategoryForNew(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Asignar a todos los nuevos
                        </option>
                        {localCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <span style={{ color: "var(--tone-muted)" }}>Margen de venta:</span>
                    {[30, 40, 50, 100].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="inv-small-btn"
                        onClick={() => handleApplyMarginToNew(m)}
                        title={`Calcular precio de venta con +${m}% sobre costo`}
                      >
                        +{m}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Product Cards List */}
            <div className="invoice-items">
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    color: "var(--tone-muted)",
                    fontSize: 13,
                    background: "var(--tone-canvas)",
                    borderRadius: 12,
                    border: "1px dashed var(--tone-border)",
                  }}
                >
                  <Filter size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>No hay productos que coincidan con la búsqueda o filtro seleccionado.</p>
                </div>
              ) : (
                filteredItems.map(({ it, originalIndex: i }) => {
                  const isMatched = !!it.matchedProduct;
                  const isNew = !isMatched && it.action === "create_new";
                  const isSkipped = it.action === "skip";

                  const cardClass = isMatched
                    ? "is-matched"
                    : isNew
                    ? "is-new"
                    : "is-skipped";

                  const categoryName =
                    localCategories.find((c) => c.id === it.newCategoryId)?.name ||
                    "Sin categoría";

                  const currentSalePrice = isMatched ? it.matchedProduct!.price : it.newPrice;
                  const marginPct =
                    it.unitCost > 0
                      ? Math.round(((currentSalePrice - it.unitCost) / it.unitCost) * 100)
                      : 0;

                  const emoji = isMatched ? (it.matchedProduct!.emoji || "📦") : (isNew ? "✨" : "🚫");
                  const displayName = isMatched
                    ? it.matchedProduct!.name
                    : isNew
                    ? (it.newName || it.rawName)
                    : it.rawName;

                  return (
                    <div key={i} className={`inv-card ${cardClass}`}>
                      <div className="inv-card-main">
                        {/* Product Info */}
                        <div className="inv-card-product">
                          <div className="inv-card-avatar">{emoji}</div>
                          <div className="inv-card-names">
                            <span className="inv-card-raw-name">{displayName}</span>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                              {isMatched ? (
                                <>
                                  <span className="inv-match-pill ok">
                                    En Catálogo ({Math.round(it.matchConfidence * 100)}%)
                                  </span>
                                  {it.matchedProduct!.category && (
                                    <span className="inv-tag-cat">{it.matchedProduct!.category}</span>
                                  )}
                                  <span style={{ fontSize: 11, color: "var(--tone-muted)" }}>
                                    Factura: {it.rawName}
                                  </span>
                                </>
                              ) : isNew ? (
                                <>
                                  <span className="inv-match-pill new">
                                    ✨ Cargar como Nuevo
                                  </span>
                                  {/* Selector interactivo de Categoría directamente en la tarjeta */}
                                  <div className="inv-card-cat-wrap">
                                    <label className="inv-card-cat-label">📁</label>
                                    <select
                                      className="inv-card-cat-select"
                                      value={it.newCategoryId}
                                      onChange={(e) => handleUpdateCategory(i, e.target.value)}
                                      title="Categoría del producto (detectada automáticamente por IA, podés cambiarla aquí)"
                                    >
                                      {localCategories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  {it.newCode && <span className="inv-tag-code">EAN: {it.newCode}</span>}
                                </>
                              ) : (
                                <span className="inv-match-pill skip">
                                  🚫 Se omitirá de la importación
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Metrics: Qty, Cost, Price, Stock */}
                        <div className="inv-card-metrics">
                          <div className="inv-metric">
                            <span className="inv-metric-label">
                              {it.isPack ? "UNIDADES STOCK" : "CANTIDAD"}
                            </span>
                            <span className="inv-metric-val qty">×{it.qty}</span>
                            {it.isPack && (
                              <span className="inv-metric-sub">
                                {it.rawQty} dsp. × {it.unitsPerPack} u.
                              </span>
                            )}
                          </div>

                          <div className="inv-metric">
                            <span className="inv-metric-label">
                              {it.isPack ? "COSTO UNIT. REAL" : "COSTO UNIT."}
                            </span>
                            <span className="inv-metric-val cost">
                              ${it.unitCost.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {it.isPack && (
                              <span className="inv-metric-sub">
                                bulto: ${it.rawCost.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          {!isSkipped && (
                            <div className="inv-metric">
                              <span className="inv-metric-label">PRECIO VENTA</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span className="inv-metric-val price">
                                  ${currentSalePrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {marginPct > 0 && (
                                  <span className="inv-margin-badge">+{marginPct}%</span>
                                )}
                              </div>
                            </div>
                          )}

                          {isMatched && (
                            <div className="inv-metric">
                              <span className="inv-metric-label">STOCK</span>
                              <span className="inv-metric-val" style={{ color: "var(--tone-text)", fontSize: 12 }}>
                                {it.matchedProduct!.stock}
                                {it.action === "both" || it.action === "add_stock" ? (
                                  <strong style={{ color: "var(--tone-accent)", marginLeft: 3 }}>
                                    → {it.matchedProduct!.stock + it.qty}
                                  </strong>
                                ) : null}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Action Selector + Expand Toggle */}
                        <div className="inv-card-actions">
                          {isMatched ? (
                            <select
                              className={`inv-action-select ${it.action}`}
                              value={it.action}
                              onChange={(e) =>
                                updateItem(i, { action: e.target.value as InvoiceItem["action"] })
                              }
                            >
                              <option value="both">Stock + Costo</option>
                              <option value="add_stock">Solo Stock</option>
                              <option value="update_cost">Solo Costo</option>
                              <option value="skip">Omitir</option>
                            </select>
                          ) : (
                            <select
                              className={`inv-action-select ${it.action}`}
                              value={it.action}
                              onChange={(e) =>
                                updateItem(i, { action: e.target.value as InvoiceItem["action"] })
                              }
                            >
                              <option value="create_new">✨ Crear Nuevo</option>
                              <option value="skip">Omitir</option>
                            </select>
                          )}

                          <button
                            type="button"
                            className={`inv-expand-btn ${expandedItems.has(i) ? "open" : ""}`}
                            onClick={() => toggleExpand(i)}
                            title={expandedItems.has(i) ? "Contraer detalles" : "Expandir para editar detalles"}
                          >
                            {expandedItems.has(i) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Barra de Presentación y Unidades por Display / Bulto Cerrado */}
                      <div className="inv-card-pack-bar">
                        <div className="inv-pack-badge-group">
                          <span className={`inv-pack-indicator ${it.isPack ? "pack" : "single"}`}>
                            {it.isPack ? `📦 Display ×${it.unitsPerPack} u.` : "🏷️ Unidad suelta"}
                          </span>
                          <span className="inv-pack-hint">
                            {it.isPack
                              ? `Factura: ${it.rawQty} dsp. a $${it.rawCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })} c/u → Costo por unidad: $${it.unitCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                              : `Facturado por unidad individual`}
                          </span>
                        </div>

                        <div className="inv-pack-presets">
                          <span style={{ fontSize: 11, color: "var(--tone-muted)", fontWeight: 600 }}>Presentación:</span>
                          {[1, 6, 12, 18, 20, 24, 32, 36].map((u) => (
                            <button
                              key={u}
                              type="button"
                              className={`inv-pack-btn ${it.unitsPerPack === u ? "active" : ""}`}
                              onClick={() => handleUpdatePackUnits(i, u)}
                              title={u === 1 ? "Marcar como producto suelto (1 unidad)" : `Ajustar a Display / Caja de ${u} unidades`}
                            >
                              {u === 1 ? "Suelto (x1)" : `×${u}`}
                            </button>
                          ))}
                          <div className="inv-pack-custom">
                            <span>Otro:</span>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={it.unitsPerPack}
                              onChange={(e) => handleUpdatePackUnits(i, Number(e.target.value))}
                              className="inv-pack-input"
                              title="Ingresar cantidad manual de unidades por caja o display"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expandable Detail Drawer */}
                      {expandedItems.has(i) && (
                        <div className="inv-card-drawer">
                          {!isMatched ? (
                            /* Editing New Product */
                            <div className="inv-drawer-card">
                              <span className="inv-drawer-title">
                                <Sparkles size={14} color="var(--tone-accent)" /> Configuración del producto nuevo
                              </span>
                              <div className="invoice-detail-fields">
                                <label style={{ gridColumn: "span 2" }}>
                                  Nombre a registrar en catálogo
                                  <input
                                    type="text"
                                    value={it.newName}
                                    onChange={(e) =>
                                      updateItem(i, { newName: e.target.value })
                                    }
                                    placeholder="Nombre comercial del producto"
                                  />
                                </label>

                                <label>
                                  Código de barras / EAN
                                  <div style={{ display: "flex", gap: 5 }}>
                                    <input
                                      type="text"
                                      value={it.newCode}
                                      onChange={(e) =>
                                        updateItem(i, { newCode: e.target.value })
                                      }
                                      placeholder="Código"
                                      style={{ flex: 1 }}
                                    />
                                    <button
                                      type="button"
                                      className="inv-small-btn"
                                      title="Generar código de barras automático"
                                      onClick={() => {
                                        const used = new Set(
                                          products.map((p) => p.code.toLowerCase()),
                                        );
                                        updateItem(i, {
                                          newCode: generateProductCode(used),
                                        });
                                      }}
                                    >
                                      <RefreshCw size={12} />
                                    </button>
                                  </div>
                                </label>

                                <label>
                                  Categoría
                                  <select
                                    value={it.newCategoryId}
                                    onChange={(e) =>
                                      updateItem(i, { newCategoryId: e.target.value })
                                    }
                                  >
                                    {localCategories.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label>
                                  Unidades por Display / Caja
                                  <input
                                    type="number"
                                    min={1}
                                    value={it.unitsPerPack}
                                    onChange={(e) =>
                                      handleUpdatePackUnits(i, Number(e.target.value))
                                    }
                                    title="Cantidad de unidades individuales por display o caja"
                                  />
                                </label>

                                <label>
                                  Stock inicial (unidades)
                                  <input
                                    type="number"
                                    min={1}
                                    value={it.qty}
                                    onChange={(e) =>
                                      updateItem(i, {
                                        qty: Math.max(1, Number(e.target.value)),
                                      })
                                    }
                                  />
                                </label>

                                <label>
                                  Costo unitario real ($)
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={it.unitCost}
                                    onChange={(e) => {
                                      const cost = Math.max(0, Number(e.target.value));
                                      updateItem(i, {
                                        unitCost: cost,
                                        newPrice: Math.round(cost * 1.4) || 100,
                                      });
                                    }}
                                  />
                                </label>

                                <label>
                                  Precio de venta ($)
                                  <input
                                    type="number"
                                    min={1}
                                    step={0.01}
                                    value={it.newPrice}
                                    onChange={(e) =>
                                      updateItem(i, {
                                        newPrice: Math.max(1, Number(e.target.value)),
                                      })
                                    }
                                  />
                                  <span style={{ fontSize: 10.5, color: "var(--tone-accent)", marginTop: 2 }}>
                                    Margen calculado: {marginPct > 0 ? `+${marginPct}%` : "0%"}
                                  </span>
                                </label>

                                {it.isPack && (
                                  <div
                                    style={{
                                      gridColumn: "span 2",
                                      fontSize: 11.5,
                                      color: "var(--tone-accent)",
                                      background: "var(--tone-canvas)",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      border: "1px solid var(--tone-hover)",
                                    }}
                                  >
                                    💡 <strong>Cálculo automático de bulto:</strong> Costo facturado (${it.rawCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}) ÷ {it.unitsPerPack} unidades = <strong>${it.unitCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong> costo unitario. Ingresarán <strong>{it.qty}</strong> unidades al stock ({it.rawQty} dsp. × {it.unitsPerPack} u.).
                                  </div>
                                )}
                              </div>

                              {/* Manual Link with existing catalog product */}
                              <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px dashed var(--tone-hover)" }}>
                                <div style={{ fontSize: 11.5, color: "var(--tone-muted)", marginBottom: 6 }}>
                                  ¿Este producto ya existe en tu stock? Vincúlalo manualmente:
                                </div>
                                <div className="invoice-manual-search">
                                  <Search size={14} />
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const prod =
                                        products.find((p) => p.id === e.target.value) || null;
                                      if (prod) {
                                        updateItem(i, {
                                          matchedProduct: prod,
                                          action: "both",
                                          matchConfidence: 1,
                                        });
                                      }
                                    }}
                                  >
                                    <option value="">
                                      — Seleccionar producto existente del catálogo —
                                    </option>
                                    {products
                                      .slice()
                                      .sort((a, b) => a.name.localeCompare(b.name, "es-AR"))
                                      .map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.emoji} {p.name} (stock actual: {p.stock} | costo: ${p.cost})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Editing Matched Product */
                            <div className="inv-drawer-card">
                              <span className="inv-drawer-title">
                                <CheckCircle2 size={14} color="var(--tone-accent)" /> Parámetros de actualización
                              </span>
                              <div className="invoice-detail-fields">
                                <label>
                                  Unidades por Display / Caja
                                  <input
                                    type="number"
                                    min={1}
                                    value={it.unitsPerPack}
                                    onChange={(e) =>
                                      handleUpdatePackUnits(i, Number(e.target.value))
                                    }
                                  />
                                </label>
                                <label>
                                  Cantidad recibida (unidades)
                                  <input
                                    type="number"
                                    min={1}
                                    value={it.qty}
                                    onChange={(e) =>
                                      updateItem(i, {
                                        qty: Math.max(1, Number(e.target.value)),
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Nuevo Costo unitario real ($)
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={it.unitCost}
                                    onChange={(e) =>
                                      updateItem(i, {
                                        unitCost: Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Acción al importar
                                  <select
                                    value={it.action}
                                    onChange={(e) =>
                                      updateItem(i, {
                                        action: e.target.value as InvoiceItem["action"],
                                      })
                                    }
                                  >
                                    <option value="both">Stock + Actualizar costo</option>
                                    <option value="add_stock">Solo agregar stock</option>
                                    <option value="update_cost">Solo actualizar costo</option>
                                    <option value="skip">Omitir</option>
                                  </select>
                                </label>

                                {it.isPack && (
                                  <div
                                    style={{
                                      gridColumn: "span 3",
                                      fontSize: 11.5,
                                      color: "var(--tone-accent)",
                                      background: "var(--tone-canvas)",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      border: "1px solid var(--tone-hover)",
                                    }}
                                  >
                                    💡 <strong>Display de {it.unitsPerPack} unidades:</strong> Costo facturado ${it.rawCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ÷ {it.unitsPerPack} u. = <strong>${it.unitCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong> costo unitario. Se sumarán <strong>+{it.qty}</strong> unidades al stock actual.
                                  </div>
                                )}
                              </div>

                              <div className="invoice-stock-preview">
                                Stock actual <strong>{it.matchedProduct!.stock}</strong>
                                {(it.action === "add_stock" || it.action === "both") && (
                                  <> → Nuevo total: <strong>{it.matchedProduct!.stock + it.qty}</strong></>
                                )}
                                {(it.action === "update_cost" || it.action === "both") && (
                                  <>
                                    {" "}
                                    | Costo actual: <strong>${it.matchedProduct!.cost}</strong> → Nuevo:{" "}
                                    <strong>${it.unitCost.toFixed(2)}</strong>
                                  </>
                                )}
                              </div>

                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                                <button
                                  type="button"
                                  className="inv-small-btn"
                                  style={{ color: "var(--tone-accent)" }}
                                  onClick={() =>
                                    updateItem(i, {
                                      matchedProduct: null,
                                      action: "create_new",
                                      newName: it.rawName,
                                    })
                                  }
                                >
                                  Desvincular y cargar como producto nuevo independiente
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="invoice-actions">
              <button className="secondary-button" onClick={() => setStep("input")}>
                Volver
              </button>
              <button
                className="primary-button"
                onClick={() => void handleImport()}
                disabled={totalToImport === 0}
              >
                <PackageCheck size={14} /> Importar {totalToImport} producto{totalToImport !== 1 ? "s" : ""}
                {newCount > 0 ? ` (${matchedCount} exist. + ${newCount} nuev.)` : ""}
              </button>
            </div>
          </div>
        )}

        {/* IMPORTING */}
        {step === "importing" && (
          <div className="invoice-body invoice-loading-state">
            <Loader2 size={38} className="spin" />
            <h3>Importando productos…</h3>
            <p>Guardando productos nuevos y actualizando existencias en tu catálogo.</p>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="invoice-body invoice-done-state">
            <CheckCircle2 size={54} color="var(--tone-accent)" />
            <h3>¡Importación completada!</h3>
            <p>
              Se procesaron exitosamente <strong>{importedCount}</strong> producto{importedCount !== 1 ? "s" : ""} en tu catálogo.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
                margin: "4px 0 14px",
              }}
            >
              {updatedCount > 0 && (
                <span className="inv-chip ok">
                  <CheckCircle2 size={13} /> {updatedCount} stock / costo actualizado{updatedCount !== 1 ? "s" : ""}
                </span>
              )}
              {createdCount > 0 && (
                <span className="inv-chip indigo">
                  <Sparkles size={13} /> {createdCount} nuevo{createdCount !== 1 ? "s" : ""} producto{createdCount !== 1 ? "s" : ""} creado{createdCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button className="primary-button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
