

export interface EanLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
  category_suggestion?: string;
  emoji?: string;
  source?: "ai" | "community" | "verified";
  confidence_score?: number;
}

export interface ProductSuggestion {
  name: string;
  emoji: string;
  category: string;
  brand?: string;
  supplier?: string;
  unitType?: "unit" | "kg" | "lt" | "pack" | "box";
  tags?: string[];
  estimatedPrice?: number | string;
  estimatedCost?: number | string;
  disclaimer?: string;
  source?: "ai" | "community" | "verified";
  confidenceScore?: number;
}

export interface PriceValidationAlert {
  alert: string;
  suggestion: number;
  reasoning: string;
}

export function cleanSuggestionNumber(val: unknown): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$ ]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num;
  }
  return 0;
}

export function extractJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.trim();
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      return JSON.parse(cleaned) as T;
    }
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match?.[1]) {
      return JSON.parse(match[1]) as T;
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
    }
  } catch {
    return null;
  }
  return null;
}

export type CatalogColumnId =
  | 'product'
  | 'code'
  | 'category'
  | 'brand'
  | 'supplier'
  | 'cost'
  | 'price'
  | 'margin'
  | 'stock'
  | 'minStock'
  | 'expiry';

export interface CatalogColumnDef {
  id: CatalogColumnId;
  label: string;
  defaultVisible: boolean;
}

export const CATALOG_COLUMNS: CatalogColumnDef[] = [
  { id: 'product', label: 'Producto', defaultVisible: true },
  { id: 'code', label: 'Código', defaultVisible: false },
  { id: 'category', label: 'Categoría', defaultVisible: true },
  { id: 'brand', label: 'Marca', defaultVisible: false },
  { id: 'supplier', label: 'Proveedor', defaultVisible: false },
  { id: 'cost', label: 'Costo', defaultVisible: false },
  { id: 'price', label: 'Precio', defaultVisible: true },
  { id: 'margin', label: '% Rentabilidad', defaultVisible: false },
  { id: 'stock', label: 'Stock', defaultVisible: true },
  { id: 'minStock', label: 'Avisar cuando queden', defaultVisible: false },
  { id: 'expiry', label: 'Vencimiento', defaultVisible: false },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<CatalogColumnId, boolean> = {
  product: true,
  code: false,
  category: true,
  brand: false,
  supplier: false,
  cost: false,
  price: true,
  margin: false,
  stock: true,
  minStock: false,
  expiry: false,
};

export function getStoredCatalogColumns(storeId: string): Record<CatalogColumnId, boolean> {
  try {
    const raw = localStorage.getItem(`kiosco_catalog_columns_${storeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_VISIBLE_COLUMNS,
          ...parsed,
        };
      }
    }
  } catch {
    // fallback a valores por defecto
  }
  return { ...DEFAULT_VISIBLE_COLUMNS };
}
