import { invoiceNumber, type ExtractedInvoiceItem } from './invoiceExtractionService';
import { normalizeSupplierText } from './supplierMappingService';

/**
 * Layout of a supplier's product lines, learned from a confirmed import.
 * Amount positions count only the numbers of the line, from the end (0 = last number), so
 * OCR noise inside the description or between text columns (21%, "3 x 1u.") does not move them.
 * The description is the text between the article code and the first amount used.
 */
export interface InvoiceFormat {
  version: 1;
  /** The line starts with the supplier's article code. */
  code: boolean;
  qty: number;
  cost: number;
  total?: number;
}

export interface StoredInvoiceFormat {
  supplier_key: string;
  supplier_name: string;
  format: InvoiceFormat;
  samples: number;
  local_reads: number;
}

export interface InvoiceFormatSample { invoiceLine: string; code?: string; qty: number; cost: number }

const MIN_SAMPLES = 3;
const MAX_AMOUNTS = 8;
const SUMMARY = /^(?:sub\s*total|total|neto|importe|saldo|son\s+pesos|iva|percepci[oó]n|perc\.?|bonificaci[oó]n|descuento|dto\.?|recargo|flete|env[ií]o|redondeo|impuesto|ii\.?\s*bb|iibb)\b/i;

// Photos add check marks next to the code ("10120\/ALF"); dates such as 29/09/2026 keep their slashes.
// "$ 4.800,00" is one amount, not a symbol and a number.
const tokens = (line: string) => line.replace(/(?<!\d)[\\/|√✓]+|[\\/|√✓]+(?!\d)/g, ' ').replace(/\$\s+/g, '$').split(/\s+/).filter(Boolean);
const same = (a: number, b: number) => Math.abs(a - b) < 0.005;
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.02, Math.abs(b) * 0.01);
const hasWord = (text: string) => /\p{L}{2,}/u.test(text);
const isCode = (token: string | undefined) => !!token && /\d/.test(token) && !/\p{L}{3,}/u.test(token) && /^[\p{L}\d.-]{2,20}$/u.test(token);

/** Numbers of the line from the end, with the token index where each one is. */
function amounts(all: string[]) {
  const found: { value: number; index: number }[] = [];
  for (let index = all.length - 1; index >= 0 && found.length < MAX_AMOUNTS; index--) {
    const value = invoiceNumber(all[index]);
    if (value !== undefined) found.push({ value, index });
  }
  return found;
}

/** Reads one line with the layout, or null when it does not fit. */
function readLine(line: string, format: InvoiceFormat): ExtractedInvoiceItem | null {
  const all = tokens(line);
  const numbers = amounts(all);
  const cost = numbers[format.cost];
  const total = format.total === undefined ? undefined : numbers[format.total];
  if (!cost || (format.total !== undefined && !total)) return null;
  let qty: { value: number; index: number } | undefined = numbers[format.qty];
  if (total && (!qty || !close(qty.value * cost.value, total.value))) {
    // A merged or misread quantity column: recover it only when subtotal ÷ price is a whole number.
    const derived = cost.value > 0 ? total.value / cost.value : 0;
    qty = derived >= 0.99 && Math.abs(derived - Math.round(derived)) < 0.01 ? { value: Math.round(derived), index: cost.index } : undefined;
  }
  if (!qty || qty.value <= 0) return null;
  const start = format.code && isCode(all[0]) ? 1 : 0;
  let end = Math.min(qty.index, cost.index, total?.index ?? Infinity);
  // Text columns between the description and the amounts (21%, x, 1u.) have no words.
  while (end > start && !hasWord(all[end - 1])) end--;
  const description = all.slice(start, end).join(' ');
  if (!hasWord(description)) return null;
  return { invoice_line: description, name: description, code: start ? all[0] : undefined, qty: qty.value, cost: cost.value };
}

/**
 * Local reading without AI. Returns null (use AI) when nothing matches or a line looks like
 * a product but does not fit the layout: missing a product is worse than spending tokens.
 */
export function readWithInvoiceFormat(lines: string[], format: InvoiceFormat): ExtractedInvoiceItem[] | null {
  const items: ExtractedInvoiceItem[] = [];
  for (const line of lines) {
    const item = readLine(line, format);
    if (item) { items.push(item); continue; }
    const all = tokens(line);
    let trailingNumbers = 0;
    while (trailingNumbers < all.length && invoiceNumber(all[all.length - 1 - trailingNumbers]) !== undefined) trailingNumbers++;
    if (hasWord(line) && !SUMMARY.test(line) && trailingNumbers >= 2) return null;
  }
  return items.length ? items : null;
}

const words = (text: string) => normalizeSupplierText(text).split(' ').filter(word => word.length >= 3 && /\p{L}/u.test(word));

/** Learns the layout shared by most confirmed lines, or explains in Spanish why it is not clear enough. */
export function learnInvoiceFormat(lines: string[], samples: InvoiceFormatSample[]): { format: InvoiceFormat; samples: number } | { failure: string } {
  const valid = samples.filter(sample => sample.qty > 0 && sample.cost > 0 && words(sample.invoiceLine).length);
  const used = new Set<number>();
  const rows: { all: string[]; numbers: number[]; sample: InvoiceFormatSample }[] = [];
  for (const sample of valid) {
    // The AI may fix OCR errors in the description: match by shared words plus both amounts.
    const wanted = words(sample.invoiceLine);
    let best = -1, bestScore = 0.5;
    lines.forEach((line, index) => {
      if (used.has(index)) return;
      const numbers = amounts(tokens(line)).map(amount => amount.value);
      if (!numbers.some(value => same(value, sample.cost)) || !numbers.some(value => same(value, sample.qty))) return;
      const present = new Set(words(line));
      const score = wanted.filter(word => present.has(word)).length / wanted.length;
      if (score >= bestScore) { best = index; bestScore = score; }
    });
    if (best < 0) continue;
    used.add(best);
    const all = tokens(lines[best]);
    rows.push({ all, numbers: amounts(all).map(amount => amount.value), sample });
  }
  const needed = Math.max(MIN_SAMPLES, Math.ceil(valid.length * 0.6));
  if (valid.length < MIN_SAMPLES) return { failure: `hay ${valid.length} renglones aplicados con cantidad y costo; hacen falta al menos ${MIN_SAMPLES}` };
  if (rows.length < needed) return { failure: `solo ${rows.length} de ${valid.length} renglones se encontraron en el texto leído con su cantidad, su costo y sus palabras` };
  // Most frequent position for each amount; ties prefer the leftmost (price before subtotal, quantity first).
  const pick = (test: (value: number, row: typeof rows[number]) => boolean, exclude: number[] = []) => {
    let best: number | undefined, bestCount = 0;
    for (let position = 0; position < MAX_AMOUNTS; position++) {
      if (exclude.includes(position)) continue;
      const count = rows.filter(row => row.numbers[position] !== undefined && test(row.numbers[position], row)).length;
      if (count >= bestCount && count >= needed) { best = position; bestCount = count; }
    }
    return best;
  };
  const cost = pick((value, row) => same(value, row.sample.cost));
  if (cost === undefined) return { failure: 'el costo no está en la misma columna en la mayoría de los renglones' };
  const total = pick((value, row) => close(row.sample.qty * row.sample.cost, value), [cost]);
  const qty = pick((value, row) => same(value, row.sample.qty), [cost, ...(total === undefined ? [] : [total])]);
  // Without a quantity column the subtotal recovers it; without both the line is not reliable.
  if (qty === undefined && total === undefined) return { failure: 'no se encontró una columna fija de cantidad ni de subtotal' };
  const format: InvoiceFormat = {
    version: 1, code: rows.filter(row => isCode(row.all[0])).length >= needed,
    qty: qty ?? MAX_AMOUNTS, cost, ...(total !== undefined ? { total } : {}),
  };
  // The layout must read back the same values in most of the lines it learned from.
  const confirmed = rows.filter(row => {
    const item = readLine(row.all.join(' '), format);
    return item && same(item.qty ?? 0, row.sample.qty) && same(item.cost ?? -1, row.sample.cost);
  }).length;
  return confirmed >= needed ? { format, samples: confirmed } : { failure: `el formato releyó bien ${confirmed} de ${rows.length} renglones` };
}

/** Known supplier whose name appears in the first lines of the invoice. */
export function detectInvoiceFormat(lines: string[], formats: StoredInvoiceFormat[]): StoredInvoiceFormat | null {
  const header = ` ${normalizeSupplierText(lines.slice(0, 15).join(' '))} `;
  return formats.filter(row => header.includes(` ${row.supplier_key} `))
    .sort((a, b) => b.supplier_key.length - a.supplier_key.length)[0] || null;
}

export function findInvoiceFormat(formats: StoredInvoiceFormat[], supplier: string): StoredInvoiceFormat | null {
  const key = normalizeSupplierText(supplier);
  return key ? formats.find(row => row.supplier_key === key) || null : null;
}

const amountPosition = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_AMOUNTS ? value as number : undefined;

/** Server rows are data: anything unexpected (including the first column layout) means "use AI", never a crash. */
export function toInvoiceFormat(value: unknown): InvoiceFormat | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const qty = amountPosition(row.qty), cost = amountPosition(row.cost);
  const total = row.total === undefined ? undefined : amountPosition(row.total);
  if (row.version !== 1 || typeof row.code !== 'boolean' || qty === undefined || cost === undefined || cost === MAX_AMOUNTS
    || (row.total !== undefined && (total === undefined || total === MAX_AMOUNTS))) return null;
  return { version: 1, code: row.code, qty, cost, ...(total !== undefined ? { total } : {}) };
}

export const sameInvoiceFormat = (a: InvoiceFormat, b: InvoiceFormat) => a.code === b.code && a.qty === b.qty && a.cost === b.cost && a.total === b.total;
