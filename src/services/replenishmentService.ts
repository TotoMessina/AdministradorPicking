import type { Product } from "../features/retail/api";
import { unitsPerPack } from './inventoryUnits';

export interface StockReplenishmentItem {
  productId: string;
  code: string;
  name: string;
  quantityAdded: number;
  previousStock: number;
  newStock: number;
  cost?: number;
}

export interface StockReplenishment {
  id: string;
  storeId: string;
  createdAt: string; // ISO date string
  type: "unitario" | "csv";
  supplier?: string;
  notes?: string;
  totalUnits: number;
  itemsCount: number;
  items: StockReplenishmentItem[];
}

export interface CsvParsedRow {
  rawCode: string;
  rawName: string;
  quantityAdded: number;
  newCost?: number;
  product?: Product;
  status: "matched" | "not_found" | "invalid_qty";
  errorMessage?: string;
  rawQuantity?: number;
  interpretedAsPacks?: boolean;
  warning?: string;
}

export interface CsvParseResult {
  validRows: CsvParsedRow[];
  invalidRows: CsvParsedRow[];
  totalUnitsToAdd: number;
  matchedCount: number;
  notFoundCount: number;
}

const STORAGE_PREFIX = "kiosco_replenishments_";

export const replenishmentService = {
  getHistory(storeId: string): StockReplenishment[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${storeId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveRecord(record: StockReplenishment): void {
    try {
      const existing = this.getHistory(record.storeId);
      const updated = [record, ...existing].slice(0, 200); // Guardar hasta 200 registros
      localStorage.setItem(`${STORAGE_PREFIX}${record.storeId}`, JSON.stringify(updated));
    } catch (e) {
      console.error("Error guardando registro de reposición", e);
    }
  },

  /**
   * Genera el contenido de una planilla CSV compatible con Excel en español (UTF-8 con BOM)
   */
  generateCsvTemplate(products: Product[], emptyTemplate: boolean = false): string {
    // Encabezados estándar comprensibles para cualquier usuario de Excel
    const headers = ["codigo", "nombre", "stock_actual", "cantidad_a_sumar", "nuevo_costo"];

    if (emptyTemplate || products.length === 0) {
      const sampleRows = [
        ["7790895000997", "Alfajor Jorgito Chocolate", "10", "12", "650.00"],
        ["7791234567890", "Gaseosa Cola 500ml", "4", "24", "950.00"],
        ["7799876543210", "Chicle Menta", "0", "50", "180.00"],
      ];
      return (
        headers.join(";") +
        "\n" +
        sampleRows.map((row) => `${row[0]};"${row[1]}";${row[2]};${row[3]};${row[4]}`).join("\n")
      );
    }

    // Generar planilla con los productos activos actuales del comercio
    const rows = products.map((p) => {
      const code = p.code ? String(p.code).trim() : "";
      const name = p.name ? String(p.name).replace(/"/g, '""') : "Producto";
      const currentStock = p.stock ?? 0;
      const cost = p.cost ? Number(p.cost).toFixed(2) : "0.00";
      return `${code};"${name}";${currentStock};0;${cost}`;
    });

    return headers.join(";") + "\n" + rows.join("\n");
  },

  /**
   * Descarga la planilla CSV en el navegador
   */
  downloadCsv(content: string, filename: string): void {
    // \uFEFF es el BOM (Byte Order Mark) para que Microsoft Excel abra acentos y caracteres especiales sin romper codificación
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Parsea un archivo CSV proveniente de Excel y lo valida contra el catálogo de productos
   */
  parseCsv(content: string, catalog: Product[]): CsvParseResult {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return {
        validRows: [],
        invalidRows: [],
        totalUnitsToAdd: 0,
        matchedCount: 0,
        notFoundCount: 0,
      };
    }

    // Detectar separador (; o , o \t)
    const headerLine = lines[0];
    let separator = ",";
    if (headerLine.includes(";")) separator = ";";
    else if (headerLine.includes("\t")) separator = "\t";

    // Función auxiliar para parsear línea CSV respetando comillas
    const splitLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === separator && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headerCols = splitLine(headerLine).map((c) =>
      c.toLowerCase().replace(/[^a-z0-9_]/g, ""),
    );

    // Mapeo flexible de columnas
    let codeIndex = headerCols.findIndex((c) =>
      ["codigo", "code", "ean", "barcode", "sku", "cod"].includes(c),
    );
    let nameIndex = headerCols.findIndex((c) =>
      ["nombre", "name", "producto", "descripcion", "desc"].includes(c),
    );
    let qtyIndex = headerCols.findIndex((c) =>
      [
        "cantidada_sumar",
        "cantidadasumar",
        "cantidad_a_sumar",
        "cantidad",
        "cant",
        "qty",
        "unidades",
        "sumar",
        "reposicion",
        "ingreso",
      ].includes(c),
    );
    let costIndex = headerCols.findIndex((c) =>
      [
        "nuevocosto",
        "nuevo_costo",
        "costo",
        "cost",
        "preciocosto",
        "precio_costo",
      ].includes(c),
    );

    // Fallbacks si los nombres de columna no coinciden exactamente
    if (codeIndex === -1 && headerCols.length > 0) codeIndex = 0;
    if (qtyIndex === -1) {
      // Buscar la primera columna numérica después del nombre
      qtyIndex = headerCols.length >= 4 ? 3 : headerCols.length >= 3 ? 2 : 1;
    }
    if (nameIndex === -1 && headerCols.length > 1 && codeIndex !== 1) nameIndex = 1;

    const validRows: CsvParsedRow[] = [];
    const invalidRows: CsvParsedRow[] = [];
    let totalUnitsToAdd = 0;

    // Mapas de búsqueda rápida para el catálogo
    const productByCode = new Map<string, Product>();
    const productByName = new Map<string, Product>();

    for (const p of catalog) {
      if (p.code) productByCode.set(p.code.trim().toLowerCase(), p);
      if (p.name) productByName.set(p.name.trim().toLowerCase(), p);
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const rawCode = (codeIndex !== -1 && cols[codeIndex] ? cols[codeIndex] : "").replace(
        /^'|'$/g,
        "",
      );
      const rawName = nameIndex !== -1 && cols[nameIndex] ? cols[nameIndex] : "";
      const rawQty = qtyIndex !== -1 && cols[qtyIndex] ? cols[qtyIndex] : "0";
      const rawCost = costIndex !== -1 && cols[costIndex] ? cols[costIndex] : "";

      // Limpiar cantidad y costo de símbolos de moneda o espacios
      const cleanedQty = /^\+?\d+$/.test(rawQty.trim()) ? Number(rawQty) : NaN;
      const cleanedCost = rawCost ? parseFloat(rawCost.replace(/[^0-9.]/g, "")) : undefined;

      // Buscar producto por código o por nombre
      let matchedProduct = rawCode
        ? productByCode.get(rawCode.trim().toLowerCase())
        : undefined;

      if (!matchedProduct && rawName) {
        matchedProduct = productByName.get(rawName.trim().toLowerCase());
      }

      if (!Number.isSafeInteger(cleanedQty) || cleanedQty <= 0) {
        invalidRows.push({
          rawCode,
          rawName,
          quantityAdded: isNaN(cleanedQty) ? 0 : cleanedQty,
          newCost: cleanedCost,
          product: matchedProduct,
          status: "invalid_qty",
          errorMessage: "La cantidad debe ser un número entero mayor a 0, sin separadores de miles",
        });
        continue;
      }

      if (!matchedProduct) {
        invalidRows.push({
          rawCode,
          rawName,
          quantityAdded: cleanedQty,
          newCost: cleanedCost,
          status: "not_found",
          errorMessage: "Código o nombre no encontrado en el catálogo",
        });
        continue;
      }

      const packSize = unitsPerPack(matchedProduct.pack_size);
      const interpretedAsPacks = packSize > 1 && cleanedQty < packSize * 0.8;
      const quantityAdded = cleanedQty * (interpretedAsPacks ? packSize : 1);
      if (!Number.isSafeInteger(quantityAdded) || quantityAdded > 1000000) {
        invalidRows.push({ rawCode, rawName, quantityAdded, product: matchedProduct, status: 'invalid_qty', errorMessage: 'La reposición supera el máximo de 1.000.000 de unidades por producto' });
        continue;
      }
      totalUnitsToAdd += quantityAdded;
      validRows.push({
        rawCode,
        rawName: matchedProduct.name,
        quantityAdded,
        rawQuantity: cleanedQty,
        interpretedAsPacks,
        warning: interpretedAsPacks ? `Se interpretó como bultos y se multiplicó por pack_size (${packSize}): ${cleanedQty} × ${packSize} = ${quantityAdded} unidades.` : undefined,
        newCost: cleanedCost && cleanedCost > 0 ? cleanedCost : undefined,
        product: matchedProduct,
        status: "matched",
      });
    }

    return {
      validRows,
      invalidRows,
      totalUnitsToAdd,
      matchedCount: validRows.length,
      notFoundCount: invalidRows.length,
    };
  },
};
