/**
 * Presentaciones de compra: unidad, display o bulto. El stock y el costo se guardan siempre por unidad;
 * la presentación solo traduce «2 bultos de 48» a 96 unidades y su costo a costo por unidad.
 * Display y bulto se cargan por separado, cada uno con cuántas unidades trae: un bulto con displays
 * trae un múltiplo de las unidades del display (4 displays de 12 = bulto de 48).
 */
export type Presentation = 'unit' | 'display' | 'pack';
export const presentationLabels: Record<Presentation, string> = { unit: 'Unidad', display: 'Display', pack: 'Bulto' };

/** `presentation` es cómo se compra: la cantidad y el costo de la fila se escriben por esa presentación. */
export interface PresentationSizes { presentation: Presentation; packUnits: string; displayUnits: string }

const whole = (value: string) => { const number = Number(value); return value.trim() && Number.isInteger(number) && number >= 1 ? number : null; };

/** Unidades que trae la presentación con la que se compra, o null si falta completar cuántas trae. */
export function unitsIn(sizes: PresentationSizes): number | null {
  if (sizes.presentation === 'unit') return 1;
  return whole(sizes.presentation === 'display' ? sizes.displayUnits : sizes.packUnits);
}

/** Lo que se guarda en el producto: unidades por bulto y por display. */
export function storedSizes(sizes: PresentationSizes) {
  return { pack_size: whole(sizes.packUnits), display_size: whole(sizes.displayUnits) };
}

/** Error si el bulto no se arma con displays enteros (la base lo exige). */
export function sizesError(sizes: PresentationSizes) {
  const pack = whole(sizes.packUnits), display = whole(sizes.displayUnits);
  return pack && display && pack % display !== 0 ? `El bulto (${pack} u.) no se arma con displays de ${display} u.: tiene que ser un múltiplo de ${display}.` : '';
}

/** Presentación con la que se muestra un producto ya guardado: la más grande que tenga. */
export function sizesOf(product: { pack_size?: number | null; display_size?: number | null }): PresentationSizes {
  const pack = product.pack_size && product.pack_size >= 1 ? product.pack_size : null;
  const display = product.display_size && product.display_size >= 1 ? product.display_size : null;
  return { presentation: pack && pack > 1 ? 'pack' : display && display > 1 ? 'display' : 'unit', packUnits: pack ? String(pack) : '', displayUnits: display ? String(display) : '' };
}

/** Costo por unidad con centavos, como lo guarda la base. */
export const unitCost = (cost: number, units: number) => Math.round((cost / units) * 100) / 100;

/** Texto corto del contenido, por ejemplo «48 u. por bulto (4 displays × 12 u.)». */
export function describe(sizes: PresentationSizes) {
  const units = unitsIn(sizes);
  if (sizes.presentation === 'unit' || !units) return '';
  if (sizes.presentation === 'display') return `${units} u. por display`;
  const display = whole(sizes.displayUnits);
  return display && display > 1 && units % display === 0 && units > display ? `${units} u. por bulto (${units / display} displays × ${display} u.)` : `${units} u. por bulto`;
}

/** Código de barras GTIN (EAN-8/EAN-13/DUN-14) con dígito verificador correcto. */
export function validGtin(code: string) {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Aviso (no bloquea) cuando el código del display o del bulto no parece un EAN-13 / DUN-14 válido. */
export function presentationCodeWarning(code: string, kind: 'display' | 'pack') {
  const value = code.trim();
  if (!value || !/^\d+$/.test(value)) return '';
  const expected = kind === 'display' ? 13 : 14;
  if (value.length !== expected && !(kind === 'pack' && value.length === 13)) return `Un ${kind === 'display' ? 'EAN-13 tiene 13' : 'DUN-14 tiene 14'} dígitos; este tiene ${value.length}.`;
  return validGtin(value) ? '' : 'El dígito verificador no coincide: revisá el número.';
}

interface CodedProduct { id: string; code: string; active?: boolean; pack_size?: number | null; display_size?: number | null; display_code?: string | null; pack_code?: string | null }

/**
 * Producto y presentación que corresponden a un código leído en una reposición, remito o factura: el EAN de la unidad,
 * el del display o el DUN del bulto. `units` es cuántas unidades trae esa presentación (1 para la unidad).
 * Un display o bulto sin contenido cargado no se puede convertir y se ignora.
 */
export function presentationForCode<T extends CodedProduct>(products: T[], rawCode: string | null | undefined): { product: T; presentation: Presentation; units: number } | null {
  const code = rawCode?.trim().replace(/^'|'$/g, '');
  if (!code) return null;
  const lower = code.toLowerCase();
  const active = products.filter(product => product.active !== false);
  const display = active.find(product => product.display_code?.toLowerCase() === lower);
  if (display && (display.display_size ?? 0) >= 1) return { product: display, presentation: 'display', units: display.display_size! };
  const pack = active.find(product => product.pack_code?.toLowerCase() === lower);
  if (pack && (pack.pack_size ?? 0) >= 1) return { product: pack, presentation: 'pack', units: pack.pack_size! };
  const unit = active.find(product => product.code?.trim().toLowerCase() === lower);
  return unit ? { product: unit, presentation: 'unit', units: 1 } : null;
}

type CodeField = 'code' | 'display_code' | 'pack_code';
/** Código de presentación (display o bulto) que ya usa otro producto, o repetido entre presentaciones del mismo. */
export function presentationCodeConflict(products: (CodedProduct & { name?: string })[], current: { id?: string; code: string; display_code?: string | null; pack_code?: string | null }): { message: string; field: CodeField } | null {
  const fields: CodeField[] = ['code', 'display_code', 'pack_code'];
  const own = fields.map(field => current[field]?.trim().toLowerCase() || '');
  if (own[1] && (own[1] === own[0] || own[1] === own[2])) return { message: 'El código del display tiene que ser distinto del de la unidad y del bulto.', field: 'display_code' };
  if (own[2] && own[2] === own[0]) return { message: 'El código del bulto tiene que ser distinto del de la unidad.', field: 'pack_code' };
  for (const product of products) {
    if (product.active === false || product.id === current.id) continue;
    const presentation = [product.display_code, product.pack_code].map(value => value?.trim().toLowerCase() || '');
    for (const [index, value] of own.entries()) {
      // El código de la unidad puede repetirse entre productos como antes; solo choca con displays y bultos.
      if (value && (presentation.includes(value) || (index > 0 && product.code?.trim().toLowerCase() === value)))
        return { message: `El código ${current[fields[index]]?.trim()} ya está en «${product.name ?? 'otro producto'}».`, field: fields[index] };
    }
  }
  return null;
}
