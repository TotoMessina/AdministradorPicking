import { groqChat, GroqError } from './groqService';

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

/** Accept canonical JSON numbers and amounts printed in Argentine invoices. Unknown is never zero. */
function invoiceNumber(value: unknown): number | undefined {
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
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.search(/[\[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  let data: unknown;
  try { data = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned); }
  catch {
    throw new InvoiceOutputError('La IA devolvió una respuesta incompleta o con formato inválido.');
  }
  const rows = Array.isArray(data) ? data : record(data) ? data.items ?? data.productos : undefined;
  if (!Array.isArray(rows)) throw new InvoiceOutputError('La IA no devolvió una lista de productos.');
  const items = rows.map((row, index): ExtractedInvoiceItem => {
    if (!record(row)) throw new InvoiceOutputError(`La IA devolvió un renglón inválido (${index + 1}).`);
    const original = text(row.invoice_line) || text(row.rawName) || text(row.name);
    if (!original) throw new InvoiceOutputError(`El renglón ${index + 1} no tiene descripción.`);
    return {
      invoice_line: original, name: text(row.name) || original,
      code: text(row.code) || text(row.rawCode) || (typeof row.code === 'number' && Number.isSafeInteger(row.code) ? String(row.code) : undefined),
      // Missing/unreadable quantities remain invalid for manual review, never default to one.
      qty: invoiceNumber(row.qty) ?? 0,
      cost: invoiceNumber(row.cost), unitCost: invoiceNumber(row.unitCost),
      unitsPerPack: invoiceNumber(row.unitsPerPack),
      quantityUnit: row.quantityUnit === 'unit' || row.quantityUnit === 'pack' ? row.quantityUnit : undefined,
      category: text(row.category) || undefined,
    };
  });
  return { proveedor: record(data) ? text(data.proveedor) : '', items };
}

/** Bound both input and output. Completed parts survive a retry in the same editor. */
export async function extractInvoiceProducts(
  invoiceText: string,
  buildPrompt: (part: string) => string,
  options: { cache: Map<string, ExtractedInvoice>; onProgress: (message: string) => void; signal: AbortSignal },
): Promise<ExtractedInvoice> {
  const prepared = prepareInvoiceExtractionText(invoiceText);
  const parts: string[][] = [];
  let lines: string[] = [], length = 0;
  for (const line of prepared.text.split('\n').filter(Boolean)) {
    if (line.length > 6000) throw new Error('El texto tiene una línea demasiado larga. Separá los productos en renglones desde Ver / editar texto detectado y reintentá.');
    if (lines.length && (lines.length >= 35 || length + line.length > 3500)) {
      parts.push(lines); lines = []; length = 0;
    }
    lines.push(line); length += line.length + 1;
  }
  if (lines.length) parts.push(lines);
  const header = prepared.text.split('\n').slice(0, 8).join('\n').slice(0, 800);
  const readPart = async (part: string[], label: string, depth = 0): Promise<ExtractedInvoice> => {
    options.signal.throwIfAborted();
    options.onProgress(`Extrayendo productos: parte ${label}…`);
    const prompt = `Cabecera SOLO para identificar proveedor (quien emite/vende la factura, no el cliente receptor), no extraer sus productos:\n${header}\n\n${buildPrompt(part.join('\n'))}`;
    let parsed = options.cache.get(prompt);
    if (!parsed) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      options.signal.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(abort, 45000);
      try {
        const response = await groqChat([{ role: 'user', content: prompt }], {
          maxTokens: 3000, temperature: 0, responseFormat: 'json_object', signal: controller.signal,
        });
        options.signal.throwIfAborted();
        parsed = parseExtraction(response);
      } catch (error) {
        options.signal.throwIfAborted();
        if (controller.signal.aborted && !options.signal.aborted)
          throw new Error('No se recibió respuesta de Groq en 45 segundos. Revisá la conexión y reintentá; las partes completadas y el texto se conservan.');
        if (error instanceof GroqError && error.code === 'NETWORK_ERROR')
          throw new Error('No se pudo conectar con Groq. El texto y las partes completadas se conservan. Si tampoco cargan productos o ventas, revisá la conexión del navegador antes de reintentar.');
        const formatFailure = error instanceof InvoiceOutputError || error instanceof GroqError
          && ['OUTPUT_TRUNCATED', 'json_validate_failed', 'JSON_GENERATION_FAILED'].includes(error.code);
        if (formatFailure && depth < 2 && part.length > 1) {
          // Never accept the complete-looking prefix of a truncated response: re-read the whole failed part.
          clearTimeout(timeout);
          options.onProgress(`Releyendo la parte ${label} en bloques más chicos…`);
          const middle = Math.ceil(part.length / 2);
          const first = await readPart(part.slice(0, middle), `${label} · 1/2`, depth + 1);
          const second = await readPart(part.slice(middle), `${label} · 2/2`, depth + 1);
          parsed = { proveedor: first.proveedor || second.proveedor, items: [...first.items, ...second.items] };
        } else if (formatFailure) {
          throw new Error(`No se pudo interpretar la parte ${label}, que empieza con «${part[0].slice(0, 80)}». Revisá esos renglones en Ver / editar texto detectado. Lo completado se conserva y no se modificó el stock.`);
        } else throw error;
      } finally { clearTimeout(timeout); options.signal.removeEventListener('abort', abort); }
      // An empty extraction can be a header, but allow a subsequent attempt to review it again.
      if (parsed.items.length) options.cache.set(prompt, parsed);
    }
    return parsed;
  };
  const result: ExtractedInvoice = { proveedor: '', items: [] };
  for (let index = 0; index < parts.length; index++) {
    const parsed = await readPart(parts[index], `${index + 1} de ${parts.length}`);
    if (!result.proveedor) result.proveedor = parsed.proveedor;
    result.items.push(...parsed.items);
  }
  return result;
}
