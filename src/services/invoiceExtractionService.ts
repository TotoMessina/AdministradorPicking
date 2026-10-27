import { groqChat } from './groqService';

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
    throw new Error('La IA devolvió una respuesta incompleta o con formato inválido. Reintentá el análisis; el texto y las partes ya leídas se conservan.');
  }
  const rows = Array.isArray(data) ? data : record(data) ? data.items ?? data.productos : undefined;
  if (!Array.isArray(rows)) throw new Error('La IA no devolvió una lista de productos. Revisá el texto detectado y reintentá; no se modificó el stock.');
  const items = rows.map((row, index): ExtractedInvoiceItem => {
    if (!record(row)) throw new Error(`La IA devolvió un renglón inválido (${index + 1}). Reintentá el análisis; el texto se conserva.`);
    const original = text(row.invoice_line) || text(row.rawName) || text(row.name);
    if (!original) throw new Error(`El renglón ${index + 1} no tiene descripción. Revisá el texto detectado y reintentá.`);
    return {
      invoice_line: original, name: text(row.name) || original,
      code: text(row.code) || text(row.rawCode) || (typeof row.code === 'number' && Number.isSafeInteger(row.code) ? String(row.code) : undefined),
      // Explicit but unreadable quantities remain invalid for manual review, never default to one.
      qty: row.qty == null ? undefined : invoiceNumber(row.qty) ?? 0,
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
  const parts: string[] = [];
  let lines: string[] = [], length = 0;
  for (const line of invoiceText.split(/\r?\n/).filter(line => line.trim())) {
    if (line.length > 6000) throw new Error('El texto tiene una línea demasiado larga. Separá los productos en renglones desde Ver / editar texto detectado y reintentá.');
    if (lines.length && (lines.length >= 20 || length + line.length > 3500)) {
      parts.push(lines.join('\n')); lines = []; length = 0;
    }
    lines.push(line); length += line.length + 1;
  }
  if (lines.length) parts.push(lines.join('\n'));
  const header = invoiceText.split(/\r?\n/).slice(0, 8).join('\n').slice(0, 1000);
  const result: ExtractedInvoice = { proveedor: '', items: [] };
  for (let index = 0; index < parts.length; index++) {
    options.signal.throwIfAborted();
    options.onProgress(`Extrayendo productos: parte ${index + 1} de ${parts.length}…`);
    const prompt = `Cabecera como contexto para identificar proveedor (no vuelvas a extraer productos de esta cabecera):\n${header}\n\n${buildPrompt(parts[index])}`;
    let parsed = options.cache.get(prompt);
    if (!parsed) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      options.signal.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(abort, 45000);
      try {
        const response = await groqChat([{ role: 'user', content: prompt }], { maxTokens: 4200, temperature: 0.1, signal: controller.signal });
        options.signal.throwIfAborted();
        parsed = parseExtraction(response);
      } catch (error) {
        if (controller.signal.aborted && !options.signal.aborted)
          throw new Error('La IA tardó demasiado en responder. Reintentá el análisis; las partes completadas y el texto se conservan.');
        throw error;
      } finally { clearTimeout(timeout); options.signal.removeEventListener('abort', abort); }
      // An empty extraction can be a header, but allow a subsequent attempt to review it again.
      if (parsed.items.length) options.cache.set(prompt, parsed);
    }
    if (!result.proveedor) result.proveedor = parsed.proveedor;
    result.items.push(...parsed.items);
  }
  return result;
}
