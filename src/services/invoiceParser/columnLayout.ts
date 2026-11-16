// Armado de renglones con columnas a partir de las posiciones horizontales del PDF o del OCR.

/** Separador de columnas en el texto leído. La IA lo recibe explicado; los lectores locales lo ignoran. */
export const COLUMN_SEPARATOR = ' | ';

export interface LayoutPiece {
  text: string;
  /** Borde izquierdo y derecho en la misma unidad que la altura de letra del renglón. */
  x0: number;
  x1: number;
}

export interface LayoutRow {
  pieces: LayoutPiece[];
  /** Altura de letra del renglón. */
  height: number;
}

type Cell = LayoutPiece;

/**
 * Agrupa los textos de un renglón de izquierda a derecha en celdas.
 * Un hueco mayor a ~1,2 veces la altura de letra es un cambio de columna;
 * los pegados sin hueco (números partidos en varios trozos) se unen sin espacio.
 */
function lineCells(pieces: LayoutPiece[], height: number): Cell[] {
  const sorted = pieces
    .filter(piece => piece.text.trim() && Number.isFinite(piece.x0) && Number.isFinite(piece.x1))
    .sort((a, b) => a.x0 - b.x0);
  const size = height > 0 ? height : 10;
  const cells: Cell[] = [];
  // A trailing space inside a PDF piece is part of its width: the gap looks like zero but it is a word break.
  let spaced = false;
  for (const piece of sorted) {
    const text = piece.text.trim();
    const last = cells[cells.length - 1];
    const gap = last ? piece.x0 - last.x1 : Infinity;
    if (!last || gap > size * 1.2) cells.push({ text, x0: piece.x0, x1: piece.x1 });
    else {
      last.text += gap < size * 0.08 && !spaced && !/^\s/.test(piece.text) ? text : ` ${text}`;
      last.x1 = Math.max(last.x1, piece.x1);
    }
    spaced = /\s$/.test(piece.text);
  }
  return cells;
}

/** Une un renglón marcando con " | " los huecos grandes entre textos. */
export function joinLinePieces(pieces: LayoutPiece[], height: number): string {
  return lineCells(pieces, height).map(cell => cell.text).join(COLUMN_SEPARATOR);
}

// Títulos habituales de columnas en facturas y remitos de proveedores.
const HEADER_WORD = /^(?:c[oó]d(?:igo)?\b|c[oó]d\.|art[ií]culo|art\.|descripci[oó]n|detalle|producto|cant(?:idad)?\b|cant\.|unid(?:ades)?\b|u\.?\s?m\.?$|precio|p\.?\s?unit|pr\.?\s?unit|unitario|p\.?\s?lista|importe|sub\s?total|total|bonif|dto|desc\.|descuento|%|iva|alic|neto)/i;
const AMOUNT = /\d[.,]\d{2}\b/;
// The product table ends at the totals.
const TABLE_END = /^(?:sub\s*total|total|son\s+pesos|neto\s+gravado|importe\s+neto)\b/i;

function isHeader(cells: Cell[]): boolean {
  if (cells.length < 3 || cells.some(cell => AMOUNT.test(cell.text))) return false;
  return cells.filter(cell => HEADER_WORD.test(cell.text.trim())).length >= 3;
}

/** Puts each cell under the header column it overlaps most; empty columns stay as empty cells. */
function alignToHeader(cells: Cell[], header: Cell[]): string {
  const regions = header.map((column, index) => ({
    from: index === 0 ? -Infinity : (header[index - 1].x1 + column.x0) / 2,
    to: index === header.length - 1 ? Infinity : (column.x1 + header[index + 1].x0) / 2,
  }));
  const columns: string[] = header.map(() => '');
  for (const cell of cells) {
    let best = 0, bestOverlap = -Infinity;
    regions.forEach((region, index) => {
      // Zero-width cells (a single OCR character) still fall in the region that holds them.
      const overlap = Math.min(cell.x1, region.to) - Math.max(cell.x0, region.from);
      if (overlap > bestOverlap) { best = index; bestOverlap = overlap; }
    });
    columns[best] = columns[best] ? `${columns[best]} ${cell.text}` : cell.text;
  }
  while (columns.length && !columns[columns.length - 1]) columns.pop();
  return columns.join(COLUMN_SEPARATOR).trim();
}

/**
 * Renglones de una página con columnas marcadas. Si hay un renglón de títulos
 * (Código, Descripción, Cantidad, P. Unit., Importe…), los renglones siguientes se ubican
 * bajo esos títulos hasta los totales: así una columna vacía no corre las demás.
 * Sin títulos reconocibles, cada renglón se separa solo por sus huecos.
 */
export function layoutRows(rows: LayoutRow[]): string[] {
  const lines: string[] = [];
  let header: Cell[] | null = null;
  for (const row of rows) {
    const cells = lineCells(row.pieces, row.height);
    if (!cells.length) continue;
    const plain = cells.map(cell => cell.text).join(COLUMN_SEPARATOR);
    if (isHeader(cells)) { header = cells; lines.push(plain); continue; }
    if (header && TABLE_END.test(cells[0].text)) header = null;
    lines.push(header && cells.length >= 2 ? alignToHeader(cells, header) : plain);
  }
  return lines;
}
