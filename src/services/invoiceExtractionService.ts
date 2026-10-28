import { estimateTokens, getRetryDelay, groqChat, GroqError, isRateLimitError, isRequestTooLarge, REQUEST_TOKEN_BUDGET } from './groqService';

export interface ExtractedInvoiceItem {
  invoice_line: string;
  name: string;
  code?: string;
  qty?: number;
  cost?: number;
  unitCost?: number;
  unitsPerPack?: number;
  quantityUnit?: 'unit' | 'pack';
  category?: string;
  /** The AI could not read this line: quantity and cost must be completed by hand. */
  unread?: boolean;
}
export interface ExtractedInvoice {
  proveedor: string;
  items: ExtractedInvoiceItem[];
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

/** Filter only clear metadata/noise for the request; never replace the user's source text. */
export function prepareInvoiceExtractionText(raw: string) {
  const lines = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200d\uFEFF]/g, '')
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const kept = lines.filter(line => {
    if (/^(?:cuit|cuil|c\.\s*u\.\s*i\.\s*t\.|iibb|ingresos\s+brutos|inicio\s+(?:de\s+)?actividades|condici[oó]n\s+(?:frente\s+al\s+)?iva|responsable\s+inscripto|monotributista|monotributo|consumidor\s+final)\b/i.test(line)) return false;
    if (/^(?:c\.?\s*a\.?\s*[ei]\.?|vencimiento\s+(?:del?\s+)?cae|fecha\s+(?:de\s+)?vto\.?\s*(?:cae)?)\s*[:.\s#-]*\d/i.test(line)) return false;
    if (/^(?:tel[eé]fono|tel\.?|celular|whatsapp)\s*[:.\s-]+[+(\d][\d\s()+.-]{5,}$/i.test(line)) return false;
    if (/^(?:e-?mail|correo\s+electr[oó]nico)\s*[:.\s-]+\S+@\S+/i.test(line)) return false;
    if (/^(?:https?:\/\/|www\.)\S+$/i.test(line) || /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(line)) return false;
    if (/^\[?p[aá]gina\s+\d+(?:\s*(?:de|\/)\s*\d+)?\]?$/i.test(line)) return false;
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s+\d{1,2}:\d{2})?$/.test(line)) return false;
    if (/^(?:sub\s*total|total(?:\s+general)?|importe\s+total|iva(?:\s+\d+(?:[.,]\d+)?\s*%)?)\s*[:$=\s]+[\d$.,\s%+-]+$/i.test(line)) return false;
    if (/^\d{22,}$/.test(line)) return false;
    if (/^[\d\s.,$%()+-]+$/.test(line) && /\d/.test(line)) {
      if (/^\d{1,2}$/.test(line.trim())) return false;
      return true;
    }
    const useful = (line.match(/[\p{L}\d]/gu) || []).length;
    // Keep isolated quantities, prices, codes and short descriptions. Remove only symbol-heavy fragments.
    return useful > 0 && !(line.length > 12 && useful < 3 && line.replace(/\s/g, '').length > useful * 3);
  }).map(line => line.replace(/[\t ]{3,}/g, '  '));
  return { text: kept.join('\n'), originalLines: lines.length, retainedLines: kept.length, omittedLines: lines.length - kept.length };
}

class InvoiceOutputError extends Error {}

/** Automatic waits for the per-minute limit in one analysis; after them the user decides. */
const MAX_RATE_WAITS = 6;

/** Accept canonical JSON numbers and amounts printed in Argentine invoices. Unknown is never zero. */
export function invoiceNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let number = value.trim().replace(/^(?:ARS|\$)\s*/i, '').replace(/\s/g, '');
  if (number.includes(',')) number = number.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(number)) number = number.replace(/\./g, '');
  if (!/^\d+(?:\.\d+)?$/.test(number)) return undefined;
  const parsed = Number(number);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseExtraction(raw: string): ExtractedInvoice {
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const startObj = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else if (startObj >= 0) start = startObj;
  else if (startArr >= 0) start = startArr;

  let data: unknown;
  if (start >= 0) {
    cleaned = cleaned.slice(start);
    try {
      data = JSON.parse(cleaned);
    } catch {
      // Intentar auto-reparación si el JSON quedó cortado al final o tiene caracteres de cierre faltantes
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace > 0) {
        const candidate = cleaned.slice(0, lastBrace + 1);
        const repairs = [
          candidate + ']}',
          candidate + '}',
          candidate + ']',
          candidate,
        ];
        for (const rep of repairs) {
          try {
            data = JSON.parse(rep);
            break;
          } catch {}
        }
      }
    }
  }
  if (!data) {
    try { data = JSON.parse(raw); }
    catch {
      throw new InvoiceOutputError('La IA devolvió una respuesta incompleta o con formato inválido.');
    }
  }
  const rows = Array.isArray(data) ? data : record(data) ? data.items ?? data.productos ?? data.articulos : undefined;
  if (!Array.isArray(rows)) throw new InvoiceOutputError('La IA no devolvió una lista de productos.');
  const items = rows.map((row, index): ExtractedInvoiceItem => {
    if (!record(row)) throw new InvoiceOutputError(`La IA devolvió un renglón inválido (${index + 1}).`);
    const original = text(row.invoice_line) || text(row.rawName) || text(row.descripcion) || text(row.name);
    if (!original) throw new InvoiceOutputError(`El renglón ${index + 1} no tiene descripción.`);
    return {
      invoice_line: original, name: text(row.name) || text(row.descripcion) || original,
      code: text(row.code) || text(row.codigo) || text(row.rawCode) || (typeof row.code === 'number' && Number.isSafeInteger(row.code) ? String(row.code) : undefined),
      // Missing/unreadable quantities remain invalid for manual review, never default to one.
      qty: invoiceNumber(row.qty ?? row.cantidad) ?? 0,
      cost: invoiceNumber(row.cost ?? row.precio ?? row.precio_unitario),
      unitCost: invoiceNumber(row.unitCost ?? row.costo_unitario),
      unitsPerPack: invoiceNumber(row.unitsPerPack ?? row.unidades_por_bulto),
      quantityUnit: row.quantityUnit === 'unit' || row.quantityUnit === 'pack' ? row.quantityUnit : undefined,
      category: text(row.category ?? row.categoria) || undefined,
    };
  });
  return { proveedor: record(data) ? text(data.proveedor ?? data.supplier) : '', items };
}

/** Bound both input and output. Completed parts survive a retry in the same editor. */
export async function extractInvoiceProducts(
  invoiceText: string,
  buildPrompt: (part: string) => string,
  options: { cache: Map<string, ExtractedInvoice>; onProgress: (message: string) => void; signal: AbortSignal; supplierKnown?: boolean },
): Promise<ExtractedInvoice> {
  const prepared = prepareInvoiceExtractionText(invoiceText);
  const allLines = prepared.text.split('\n').filter(Boolean);
  if (!allLines.length) {
    return { proveedor: '', items: [] };
  }

  // Las facturas habituales (hasta 60 líneas) se envían en una única consulta limpia y directa
  const CHUNK_SIZE = 50;
  const parts: string[][] = [];
  for (let i = 0; i < allLines.length; i += CHUNK_SIZE) {
    parts.push(allLines.slice(i, i + CHUNK_SIZE));
  }

  const result: ExtractedInvoice = { proveedor: '', items: [] };

  for (let index = 0; index < parts.length; index++) {
    options.signal.throwIfAborted();
    const part = parts[index];
    const label = parts.length > 1 ? ` (bloque ${index + 1} de ${parts.length})` : '';
    options.onProgress(`Analizando productos con IA${label}…`);

    const prompt = buildPrompt(part.join('\n'));
    let parsed = options.cache.get(prompt);

    if (!parsed) {
      const response = await groqChat([{ role: 'user', content: prompt }], {
        maxTokens: Math.min(3000, Math.max(1500, 500 + part.length * 100)),
        temperature: 0.1,
        signal: options.signal,
      });
      options.signal.throwIfAborted();
      parsed = parseExtraction(response);
      if (parsed.items.length) {
        options.cache.set(prompt, parsed);
      }
    }

    if (!result.proveedor && parsed.proveedor) {
      result.proveedor = parsed.proveedor;
    }
    result.items.push(...parsed.items);
  }

  return result;
}
