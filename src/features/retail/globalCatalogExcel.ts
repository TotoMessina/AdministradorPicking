import type { CellValue } from 'exceljs';
import { supabase } from '../../lib/supabase';

/** Fila del catálogo global tal como la lee la pantalla y la planilla. */
export interface CatalogRow { ean_code: string; name: string; brand: string | null; category_suggestion: string | null; emoji: string | null; description: string | null; source: string; confidence_score: number; contributor_count: number; updated_at: string }
export const catalogFields = 'ean_code,name,brand,category_suggestion,emoji,description,source,confidence_score,contributor_count,updated_at';
export const isVerified = (row: Pick<CatalogRow, 'source' | 'confidence_score'>) => row.source === 'verified' || Number(row.confidence_score) >= 0.9;

type Field = 'code' | 'name' | 'brand' | 'category' | 'emoji' | 'description' | 'verified';
/** Una fila de la planilla: solo trae las columnas que tenía el archivo. Sin la columna, se conserva el dato actual. */
export interface ImportRow { row: number; code: string; name?: string; brand?: string; category?: string; emoji?: string; description?: string; verified?: boolean }
export interface ImportChange { row: ImportRow; status: 'new' | 'changed' | 'unchanged'; fields: string[] }
export interface ImportPreview { fileName: string; changes: ImportChange[]; errors: { row: number; message: string }[]; columns: Field[] }

const sheetName = 'Catálogo global';
const columns: { field: Field | null; header: string; width: number }[] = [
  { field: 'code', header: 'Código', width: 18 }, { field: 'name', header: 'Nombre', width: 42 }, { field: 'brand', header: 'Marca', width: 20 },
  { field: 'category', header: 'Categoría', width: 22 }, { field: 'emoji', header: 'Emoji', width: 8 }, { field: 'description', header: 'Descripción', width: 40 },
  { field: 'verified', header: 'Verificado', width: 11 }, { field: null, header: 'Aportes', width: 9 }, { field: null, header: 'Confianza %', width: 12 },
];
const aliases: Record<string, Field> = {
  codigo: 'code', 'codigo de barras': 'code', ean: 'code', nombre: 'name', marca: 'brand', categoria: 'category', 'categoria sugerida': 'category',
  emoji: 'emoji', descripcion: 'description', verificado: 'verified',
};
const labels: Record<Exclude<Field, 'code'>, string> = { name: 'Nombre', brand: 'Marca', category: 'Categoría', emoji: 'Emoji', description: 'Descripción', verified: 'Verificado' };
const limits: Partial<Record<Field, number>> = { name: 160, brand: 80, category: 80, emoji: 16, description: 500 };
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

async function excel() {
  const module = await import('exceljs');
  return ((module as unknown as { default?: typeof module }).default ?? module);
}

function text(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ('richText' in value) return value.richText.map(part => part.text).join('').trim();
  if ('text' in value) return String(value.text).trim();
  if ('result' in value) return value.result === undefined || typeof value.result === 'object' ? '' : String(value.result).trim();
  return '';
}

/** Un código guardado como número pierde ceros adelante y, si es largo, dígitos: se acepta solo si sigue siendo exacto. */
function codeText(value: CellValue): string | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  return text(value);
}

function verifiedValue(raw: string): boolean | undefined | null {
  const value = normalize(raw);
  if (!value) return undefined;
  if (['si', 's', 'x', 'true', 'verdadero', '1'].includes(value)) return true;
  if (['no', 'n', 'false', 'falso', '0'].includes(value)) return false;
  return null;
}

/** Todo el catálogo, de a 1.000 filas, ordenado por código. */
async function allRows(): Promise<CatalogRow[]> {
  const rows: CatalogRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('retail_global_catalog').select(catalogFields).order('ean_code').range(offset, offset + 999);
    if (error) throw error;
    rows.push(...((data || []) as CatalogRow[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function downloadCatalog(): Promise<number> {
  const [ExcelJS, rows] = await Promise.all([excel(), allRows()]);
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map(column => ({ header: column.header, width: column.width }));
  sheet.getColumn(1).numFmt = '@';
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow([row.ean_code, row.name, row.brand || '', row.category_suggestion || '', row.emoji || '', row.description || '',
    isVerified(row) ? 'Sí' : 'No', row.contributor_count, Math.round(Number(row.confidence_score) * 100)]);
  const help = book.addWorksheet('Instrucciones');
  help.getColumn(1).width = 110;
  [
    'Editá esta hoja y subila desde Catálogo global → Subir Excel. Antes de guardar, la app muestra qué cambia.',
    'Código identifica el producto: no lo cambies. Para agregar productos, sumá filas con código y nombre.',
    'Una celda vacía borra ese dato (salvo Nombre, que es obligatorio). Si quitás una columna entera, ese dato no cambia.',
    'Verificado: Sí deja el producto oficial y los comercios ya no pueden cambiarlo. No lo vuelve comunitario. Vacío no cambia el estado.',
    'Aportes y Confianza % son informativos: se ignoran al subir.',
    'Dejá la columna Código como texto para no perder ceros adelante.',
  ].forEach(line => help.addRow([line]));
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url; link.download = `catalogo_global_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
  return rows.length;
}

/** Lee la planilla, valida cada fila y la compara con lo guardado. No cambia nada. */
export async function previewCatalogFile(file: File): Promise<ImportPreview> {
  if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera 10 MB.');
  const ExcelJS = await excel();
  const book = new ExcelJS.Workbook();
  try { await book.xlsx.load(await file.arrayBuffer()); } catch { throw new Error('No se pudo leer el archivo. Guardalo como Excel (.xlsx) y volvé a intentar.'); }
  const sheet = book.getWorksheet(sheetName) ?? book.worksheets.find(item => item.name !== 'Instrucciones');
  if (!sheet) throw new Error('El archivo no tiene hojas.');

  const map = new Map<number, Field>();
  sheet.getRow(1).eachCell((cell, index) => { const field = aliases[normalize(text(cell.value))]; if (field && ![...map.values()].includes(field)) map.set(index, field); });
  const present = [...map.values()];
  if (!present.includes('code')) throw new Error('Falta la columna «Código» en la primera fila.');
  if (present.length === 1) throw new Error('Además de «Código», la planilla necesita al menos otra columna, como «Nombre».');

  const rows: ImportRow[] = [];
  const errors: ImportPreview['errors'] = [];
  const seen = new Map<string, number>();
  sheet.eachRow((line, number) => {
    if (number === 1) return;
    const row: ImportRow = { row: number, code: '' };
    let empty = true, problem = '';
    map.forEach((field, index) => {
      const value = line.getCell(index).value;
      if (field === 'code') { const code = codeText(value); if (code === null) problem ||= 'El código quedó como número y perdió dígitos. Formateá la columna Código como texto.'; else { row.code = code; if (code) empty = false; } return; }
      const raw = text(value);
      if (raw) empty = false;
      if (field === 'verified') { const verified = verifiedValue(raw); if (verified === null) problem ||= 'Verificado debe ser Sí o No.'; else if (verified !== undefined) row.verified = verified; return; }
      if (raw.length > (limits[field] ?? Infinity)) problem ||= `${labels[field]} admite hasta ${limits[field]} caracteres.`;
      row[field] = raw;
    });
    if (empty && !problem) return;
    if (!problem && (row.code.length < 4 || row.code.length > 20)) problem = 'El código debe tener entre 4 y 20 caracteres.';
    if (!problem && seen.has(row.code)) problem = `El código ${row.code} ya está en la fila ${seen.get(row.code)}.`;
    if (!problem && row.name !== undefined && !row.name) problem = 'Falta el nombre.';
    if (problem) { errors.push({ row: number, message: problem }); return; }
    seen.set(row.code, number);
    rows.push(row);
  });
  if (!rows.length && !errors.length) throw new Error('La planilla no tiene filas con datos.');

  const existing = new Map<string, CatalogRow>();
  for (let index = 0; index < rows.length; index += 200) {
    const { data, error } = await supabase.from('retail_global_catalog').select(catalogFields).in('ean_code', rows.slice(index, index + 200).map(row => row.code));
    if (error) throw error;
    for (const item of (data || []) as CatalogRow[]) existing.set(item.ean_code, item);
  }

  const changes: ImportChange[] = [];
  for (const row of rows) {
    const prior = existing.get(row.code);
    if (!prior) {
      if (!row.name) { errors.push({ row: row.row, message: `El código ${row.code} es nuevo y le falta el nombre.` }); continue; }
      changes.push({ row, status: 'new', fields: [] });
      continue;
    }
    const current: Record<Exclude<Field, 'code'>, string | boolean> = { name: prior.name, brand: prior.brand || '', category: prior.category_suggestion || '', emoji: prior.emoji || '📦', description: prior.description || '', verified: isVerified(prior) };
    const fields = (Object.keys(labels) as Exclude<Field, 'code'>[]).filter(field => {
      const next = row[field];
      if (next === undefined) return false;
      return (field === 'emoji' ? next || '📦' : next) !== current[field];
    }).map(field => labels[field]);
    changes.push({ row, status: fields.length ? 'changed' : 'unchanged', fields });
  }
  errors.sort((a, b) => a.row - b.row);
  return { fileName: file.name, changes, errors, columns: present };
}

/** Manda las filas nuevas o con cambios de a 500. Cada lote entra completo o no entra; repetir no duplica. */
export async function applyCatalogImport(rows: ImportRow[], onProgress: (done: number) => void): Promise<{ inserted: number; updated: number }> {
  const total = { inserted: 0, updated: 0 };
  for (let index = 0; index < rows.length; index += 500) {
    const { data, error } = await supabase.rpc('retail_admin_import_catalog', { p_rows: rows.slice(index, index + 500) });
    if (error) throw Object.assign(new Error(error.message), { applied: index });
    const result = data as { inserted: number; updated: number };
    total.inserted += result.inserted; total.updated += result.updated;
    onProgress(Math.min(index + 500, rows.length));
  }
  return total;
}
