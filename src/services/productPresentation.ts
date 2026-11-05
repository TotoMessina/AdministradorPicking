/**
 * Presentaciones de compra: unidad, display o bulto. El stock y el costo se guardan siempre por unidad;
 * la presentación solo traduce «2 bultos de 4 displays × 12» a 96 unidades y su costo a costo por unidad.
 */
export type Presentation = 'unit' | 'display' | 'pack';
export const presentationLabels: Record<Presentation, string> = { unit: 'Unidad', display: 'Display', pack: 'Bulto' };

export interface PresentationSizes { presentation: Presentation; displaysPerPack: string; unitsPerDisplay: string }

const whole = (value: string) => { const number = Number(value); return Number.isInteger(number) && number >= 1 ? number : null; };

/** Unidades que trae una presentación, o null si falta completar el contenido. Bulto sin displays: 1 display por bulto. */
export function unitsIn(sizes: PresentationSizes): number | null {
  if (sizes.presentation === 'unit') return 1;
  const perDisplay = whole(sizes.unitsPerDisplay);
  if (sizes.presentation === 'display') return perDisplay;
  const displays = sizes.displaysPerPack.trim() ? whole(sizes.displaysPerPack) : 1;
  return displays && perDisplay ? displays * perDisplay : null;
}

/** Lo que se guarda en el producto: unidades por bulto y por display. */
export function storedSizes(sizes: PresentationSizes, previous?: { pack_size?: number | null; display_size?: number | null }) {
  const perDisplay = whole(sizes.unitsPerDisplay);
  if (sizes.presentation === 'unit') return { pack_size: previous?.pack_size ?? null, display_size: previous?.display_size ?? null };
  if (sizes.presentation === 'display') {
    // Si ya tenía bulto y el display nuevo no entra exacto, el bulto se descarta para no dejar datos incoherentes.
    const pack = previous?.pack_size && perDisplay && previous.pack_size % perDisplay === 0 ? previous.pack_size : null;
    return { pack_size: pack, display_size: perDisplay };
  }
  const displays = sizes.displaysPerPack.trim() ? whole(sizes.displaysPerPack) : 1;
  return { pack_size: displays && perDisplay ? displays * perDisplay : null, display_size: displays && displays > 1 ? perDisplay : null };
}

/** Presentación con la que se muestra un producto ya guardado: la más grande que tenga. */
export function sizesOf(product: { pack_size?: number | null; display_size?: number | null }): PresentationSizes {
  const pack = product.pack_size && product.pack_size > 1 ? product.pack_size : null;
  const display = product.display_size && product.display_size >= 1 ? product.display_size : null;
  if (pack && display && pack % display === 0) return { presentation: 'pack', displaysPerPack: String(pack / display), unitsPerDisplay: String(display) };
  if (pack) return { presentation: 'pack', displaysPerPack: '1', unitsPerDisplay: String(pack) };
  if (display && display > 1) return { presentation: 'display', displaysPerPack: '', unitsPerDisplay: String(display) };
  return { presentation: 'unit', displaysPerPack: '', unitsPerDisplay: '' };
}

/** Costo por unidad con centavos, como lo guarda la base. */
export const unitCost = (cost: number, units: number) => Math.round((cost / units) * 100) / 100;

/** Texto corto del contenido, por ejemplo «4 displays × 12 u. = 48 u.». */
export function describe(sizes: PresentationSizes) {
  const units = unitsIn(sizes);
  if (sizes.presentation === 'unit' || !units) return '';
  if (sizes.presentation === 'display') return `${units} u. por display`;
  const displays = Number(sizes.displaysPerPack || 1);
  return displays > 1 ? `${displays} displays × ${sizes.unitsPerDisplay} u. = ${units} u.` : `${units} u. por bulto`;
}
