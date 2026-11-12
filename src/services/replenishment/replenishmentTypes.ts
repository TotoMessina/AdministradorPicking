import type { Product } from '../../features/retail/api';

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
  /** La cantidad del archivo se tomó como displays (display_size unidades cada uno). */
  interpretedAsDisplays?: boolean;
  warning?: string;
}

export interface CsvParseResult {
  validRows: CsvParsedRow[];
  invalidRows: CsvParsedRow[];
  totalUnitsToAdd: number;
  matchedCount: number;
  notFoundCount: number;
}
