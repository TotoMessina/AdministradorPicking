import type { Supplier } from '../features/retail/api';
import { invoiceNumber, type ExtractedInvoiceItem } from './invoiceExtractionService';

/** Cómo factura cada proveedor. Sin reglas, la lectura funciona como siempre. */
export interface SupplierInvoiceRules {
  /** `unit`: la cantidad es por unidad suelta y el "X60" de la descripción es el tamaño de la caja. */
  quantity_unit?: 'auto' | 'unit';
  /** El importe de cada renglón ya suma el IVA (por ejemplo, Supdrink). */
  amount_includes_vat?: boolean;
  /** Bonificaciones en renglón aparte: se agrupan los renglones con el mismo código. */
  merge_repeated_codes?: boolean;
  /** Columna de la factura a usar como costo (por ejemplo, "Final C/Dto."). */
  cost_column?: string;
  /** `final`: el costo tomado ya incluye IVA e impuestos internos; no se suman al calcular el costo final. */
  price_basis?: 'auto' | 'final';
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Solo conserva valores conocidos: una regla desconocida no cambia la lectura. */
export function toSupplierInvoiceRules(value: unknown): SupplierInvoiceRules {
  if (!record(value)) return {};
  const rules: SupplierInvoiceRules = {};
  if (value.quantity_unit === 'unit') rules.quantity_unit = 'unit';
  if (value.amount_includes_vat === true) rules.amount_includes_vat = true;
  if (value.merge_repeated_codes === true) rules.merge_repeated_codes = true;
  const column = typeof value.cost_column === 'string' ? value.cost_column.trim().slice(0, 60) : '';
  if (column) rules.cost_column = column;
  if (value.price_basis === 'final') rules.price_basis = 'final';
  return rules;
}

export const hasInvoiceRules = (rules: SupplierInvoiceRules) => Object.keys(toSupplierInvoiceRules(rules)).length > 0;

export const cuitDigits = (value: string) => value.replace(/\D/g, '');

/** Dígito verificador de ARCA (módulo 11). */
export function validCuit(value: string): boolean {
  const digits = cuitDigits(value);
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const total = weights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0);
  let check = 11 - (total % 11);
  if (check === 11) check = 0;
  return check < 10 && check === Number(digits[10]);
}

export function formatCuit(value: string): string {
  const digits = cuitDigits(value);
  return digits.length === 11 ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits[10]}` : value;
}

/** CUIT válidos que aparecen en el texto: "30-70817362-9", "30708173629" o "30 70817362 9". */
export function cuitsInText(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/(?<!\d)(\d{2})[\s.-]?(\d{8})[\s.-]?(\d)(?!\d)/g)) {
    const digits = match[1] + match[2] + match[3];
    if (validCuit(digits)) found.add(digits);
  }
  return [...found];
}

/** Proveedor registrado cuyo CUIT figura en la factura; null si no hay uno solo. */
export function findSupplierByCuit(suppliers: Supplier[], text: string): Supplier | null {
  const cuits = new Set(cuitsInText(text));
  const matches = suppliers.filter(supplier => supplier.cuit && cuits.has(supplier.cuit));
  return matches.length === 1 ? matches[0] : null;
}

const plainName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\b(?:s\.?\s?a\.?|s\.?\s?r\.?\s?l\.?|s\.?\s?a\.?\s?s\.?)(?=\s|$)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** El nombre leído como proveedor es en realidad el del propio comercio (el comprador). */
export function isStoreName(name: string, storeNames: string[]): boolean {
  const value = plainName(name);
  if (!value) return false;
  const words = new Set(value.split(' '));
  return storeNames.some(store => {
    const own = plainName(store);
    if (!own) return false;
    if (value === own || value.includes(own) || own.includes(value)) return true;
    // Tolera errores de OCR ("PICKING 8 DELIVERING" por "PICKING & DELIVERING"): casi todas sus palabras largas coinciden.
    const ownWords = own.split(' ').filter(word => word.length >= 3);
    return ownWords.length >= 2 && ownWords.filter(word => words.has(word)).length / ownWords.length >= 0.75;
  });
}

/** Proveedor registrado cuyo nombre figura en el texto de la factura; null si no hay uno solo. */
const oneEditApart = (a: string, b: string) => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

/**
 * Proveedor registrado cuyo nombre se parece al leído por la IA, con una letra de diferencia como máximo
 * ("Castila Distribuidora" → "Castilla"). Se compara la primera palabra de 5 letras o más; null si no hay uno solo.
 */
export function findSupplierBySimilarName(suppliers: Supplier[], name: string): Supplier | null {
  const read = plainName(name).split(' ').filter(word => word.length >= 5);
  if (!read.length) return null;
  const matches = suppliers.filter(supplier => {
    const first = plainName(supplier.name).split(' ').find(word => word.length >= 5);
    return !!first && read.some(word => oneEditApart(word, first));
  });
  return matches.length === 1 ? matches[0] : null;
}

export function findSupplierByName(suppliers: Supplier[], text: string, storeNames: string[] = []): Supplier | null {
  const haystack = ` ${plainName(text)} `;
  const matches = suppliers.filter(supplier => {
    const name = plainName(supplier.name);
    // Nombres muy cortos ("CLAN") aparecen en otras palabras: se exige palabra completa y al menos 4 letras.
    return name.length >= 4 && !isStoreName(supplier.name, storeNames) && haystack.includes(` ${name} `);
  });
  return matches.length === 1 ? matches[0] : null;
}

/** Indicaciones para la IA según cómo factura el proveedor. */
export function invoiceRulesPrompt(rules: SupplierInvoiceRules): string {
  const lines: string[] = [];
  if (rules.cost_column) lines.push(`- cost: tomalo de la columna «${rules.cost_column}» de cada renglón.`);
  if (rules.amount_includes_vat) lines.push('- El importe total de cada renglón ya incluye IVA. Para cost usá el precio unitario sin IVA; si solo figura el importe, calculá importe ÷ cantidad ÷ 1,21.');
  if (rules.quantity_unit === 'unit') lines.push('- Este proveedor factura por unidad suelta: el "X60" o "54X44G" de la descripción es el tamaño de la caja, no la cantidad comprada. Poné unitsPerPack 1 y quantityUnit "unit".');
  if (rules.merge_repeated_codes) lines.push('- Las bonificaciones vienen en renglones aparte con el mismo código. Extraé cada renglón; si tiene bonificación 100% o importe 0, poné cost 0.');
  return lines.length ? `\nReglas de este proveedor:\n${lines.join('\n')}` : '';
}

/**
 * "x1 un" indica que se factura la unidad suelta, aunque la descripción traiga "54X44G".
 * El OCR suele leer el 1 como "i", "l" o "|" ("xi un"). Una "u" sola no alcanza: LYGA tiene la columna
 * "1 x 1u." en todos los renglones, también en los displays ("x1 ds").
 */
export const invoicedAsSingleUnit = (line: string) => /\bx\s*[1il|]\s*(?:un|und|unid|unidad)\b\.?/i.test(line);

/**
 * Ajustes deterministas tras la lectura: unidad de facturación y bonificaciones en renglón aparte.
 * Agrupar promedia el costo: 1 pack a $11.061,67 + 1 bonificado a $0 → 2 packs a $5.530,84.
 */
/**
 * Control aritmético del costo: cantidad × costo debe dar el importe del renglón. Si no da y otro precio
 * del mismo renglón sí lo da, se usa ese (por ejemplo, la IA tomó el "Sugerido" en vez del "Pr Unit").
 * Tolera el separador decimal perdido por el OCR ("$306964" por $3.069,64), también en el precio ("$135773"
 * por $1.357,73): entre los precios que cierran, elige el más cercano al leído. Sin coincidencia, no cambia nada.
 */
export function reconcileLineCost(item: ExtractedInvoiceItem, sourceLine = item.invoice_line, vatInAmount = false): ExtractedInvoiceItem {
  const qty = item.qty;
  if (item.unread || !qty || qty <= 0 || item.cost === undefined) return item;
  // Solo importes sueltos ("$767.41", "3.069,64"); "40GX80" o "0.00%" no cuentan.
  const tokens = sourceLine.replace(/\$\s+/g, '$').split(/\s+/).filter(token => /^\$?\d[\d.,]*$/.test(token));
  const toNumbers = (list: string[]) => list.map(token => invoiceNumber(token)).filter((value): value is number => value !== undefined && value > 0);
  const numbers = toNumbers(tokens);
  // Importes con centavos ("13384.6", "1.820,73"): descarta códigos de producto ("00197161") al buscar el importe.
  const amounts = toNumbers(tokens.filter(token => /[.,]\d{1,2}$/.test(token)));
  // Importes de al menos $10: con números chicos cualquier cuenta "cierra" por casualidad.
  // Con IVA en el importe solo cuenta el importe (el mayor número): si no, un neto descontado dos veces
  // "cierra" contra el precio unitario neto (9.141,88 × 1,21 = 11.061,67).
  const totals = (vatInAmount && amounts.length ? [Math.max(...amounts)] : numbers)
    .flatMap(value => [value, value / 100]).filter(total => total >= 10);
  // Si el importe del renglón trae IVA (Supdrink), el neto × 1,21 es el que debe coincidir.
  const factor = vatInAmount ? 1.21 : 1;
  const matches = (price: number) => totals.some(total => Math.abs(qty * price * factor - total) <= Math.max(0.05, total * 0.005));
  if (matches(item.cost)) return item;
  const cost = item.cost;
  const candidates = numbers.flatMap(value => [value, value / 100])
    // El reemplazo debe ser plausible: entre 1/5 y 5 veces el precio leído (el sugerido ronda 1,3 a 2 veces el costo).
    .filter(value => value !== qty && value !== cost && value >= 1 && (cost <= 0 || (value >= cost / 5 && value <= cost * 5)) && matches(value));
  if (!candidates.length) return item;
  // El precio leído (aunque sea el sugerido) está en la misma escala que el costo real: gana el más cercano.
  const distance = (value: number) => cost > 0 ? Math.abs(Math.log(value / cost)) : value;
  const candidate = candidates.reduce((best, value) => distance(value) < distance(best) ? value : best);
  return { ...item, cost: Math.round(candidate * 100) / 100, unitCost: undefined };
}

const collapse = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

/** Renglón del texto original que contiene la descripción devuelta por la IA (que suele omitir los precios). */
function sourceLineOf(item: ExtractedInvoiceItem, sourceLines: string[]): string {
  const description = collapse(item.invoice_line);
  if (description.length < 4) return item.invoice_line;
  const found = sourceLines.filter(line => collapse(line).includes(description));
  return found.length === 1 ? found[0] : item.invoice_line;
}

/**
 * Cigarrillos: el atado es la unidad. "x20u.", "KS 20" o "BOX 20" son cigarrillos por atado y no dividen el costo;
 * "x10 ATADOS" es un cartón de 10 atados. Devuelve los atados por bulto, 1 para un atado suelto o null si no es cigarrillo.
 */
export function cigaretteAtadosPerPack(line: string): number | null {
  const atados = line.match(/\bx\s*(\d{1,3})\s*atados?\b/i);
  if (atados && Number(atados[1]) > 1) return Number(atados[1]);
  // "CIG." o marcas habituales (CLAN no antepone "CIG": "MARLBORO (RED FWD) KS BOX 12").
  return /\bcig(?:arrillos?)?\b|\bcig\.|\b(?:marlboro|philip\s*morris|chesterfield|lucky\s*strike|l\.\s*strike|camel|parliament|red\s*point|benson|pall\s*mall|winston|viceroy)\b/i.test(line) ? 1 : null;
}

export function applyInvoiceRules(items: ExtractedInvoiceItem[], rules: SupplierInvoiceRules, sourceLines: string[] = []): ExtractedInvoiceItem[] {
  // Con columna de costo elegida o precios finales, el costo no debe coincidir con el importe neto.
  const reconcile = !rules.cost_column && rules.price_basis !== 'final';
  let result = items.map(item => reconcile ? reconcileLineCost(item, sourceLineOf(item, sourceLines), !!rules.amount_includes_vat) : item).map(item => {
    const atados = cigaretteAtadosPerPack(item.invoice_line);
    if (atados && atados > 1) return { ...item, quantityUnit: 'pack' as const, unitsPerPack: atados };
    return atados === 1 || rules.quantity_unit === 'unit' || invoicedAsSingleUnit(item.invoice_line)
      ? { ...item, quantityUnit: 'unit' as const, unitsPerPack: 1 }
      : item;
  });
  if (!rules.merge_repeated_codes) return result;
  const groups = new Map<string, ExtractedInvoiceItem[]>();
  for (const item of result) {
    const code = item.code?.trim();
    if (code) groups.set(code, [...(groups.get(code) || []), item]);
  }
  const merged = new Map<ExtractedInvoiceItem, ExtractedInvoiceItem | null>();
  for (const group of groups.values()) {
    // Solo se agrupa con cantidades y costos conocidos; un renglón ilegible queda para revisión manual.
    if (group.length < 2 || group.some(item => item.unread || !item.qty || item.cost === undefined)) continue;
    const qty = group.reduce((sum, item) => sum + item.qty!, 0);
    const total = group.reduce((sum, item) => sum + item.qty! * item.cost!, 0);
    const [first, ...rest] = group;
    merged.set(first, { ...first, qty, cost: Math.round((total / qty) * 100) / 100, unitCost: undefined });
    for (const item of rest) merged.set(item, null);
  }
  result = result.flatMap(item => {
    if (!merged.has(item)) return [item];
    const replacement = merged.get(item);
    return replacement ? [replacement] : [];
  });
  return result;
}
