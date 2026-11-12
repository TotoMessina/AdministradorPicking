import type { Product, Category } from '../features/retail/api';
import type { CondicionIva } from '../features/retail/billing';
import type { SupplierMapping } from '../services/supplierMappingService';

// Partes de este servicio, reexportadas para no cambiar los imports.
export * from './invoiceAnalyzer/productNameHelpers';
export * from './invoiceAnalyzer/buildParsePrompt';

/** Vínculo pendiente sin dudas: confianza alta, costo leído y sin conflicto de código ni de presentación. */
export const isSureLink = (item: InvoiceItem) => {
  const product = item.matchedProduct;
  if (!product || item.action === 'skip' || item.linkStatus !== 'pending') return false;
  const code = item.rawCode?.trim().toLowerCase();
  const codeConflict = !!code && !!product.code?.trim() && code !== product.code.trim().toLowerCase();
  const packConflict = !!item.mapping?.pack_size_detected && item.mapping.pack_size_detected !== item.unitsPerPack;
  return item.matchConfidence >= 0.85 && item.costKnown && Number.isFinite(item.qty) && item.qty > 0 && item.qty <= 1000000 && !codeConflict && !packConflict;
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  invoiceLine: string;
  linkStatus: 'auto' | 'pending' | 'confirmed';
  linkReason: string;
  mapping?: SupplierMapping;
  mappingInvoiceText?: string;
  divisionReason?: string;
  costKnown: boolean;
  /** Nombre original tal como aparece en la factura */
  rawName: string;
  /** Código EAN/barcode si figura */
  rawCode?: string;
  /** Cantidad de bultos o cajas facturadas */
  rawQty: number;
  /** Costo facturado para ese renglón (precio por bulto/caja) */
  rawCost: number;
  /** Unidades individuales que contiene cada display/caja (1 si es suelto) */
  unitsPerPack: number;
  quantityUnit?: 'unit' | 'pack';
  /** Indica si se detectó o configuró como display/caja cerrada */
  isPack: boolean;
  /** Cantidad total de unidades individuales que ingresarán al stock (rawQty * unitsPerPack) */
  qty: number;
  /** Costo unitario real por producto suelto para vender en kiosco (rawCost / unitsPerPack) */
  unitCost: number;
  /** Producto del catálogo local emparejado (puede ser null = no encontrado) */
  matchedProduct: Product | null;
  /** Confianza del match: 0-1 */
  matchConfidence: number;
  /** Acción a realizar al importar */
  action: "add_stock" | "update_cost" | "both" | "create_new" | "skip";
  /** Nombre sugerido por el análisis / IA */
  suggestedName: string;
  /** Nombre editable si se crea como nuevo */
  newName: string;
  /** Código de barras / interno para producto nuevo */
  newCode: string;
  newMinStock: number;
  manual?: boolean;
  /** Si el código de barras es un EAN real detectado */
  codeDetected?: boolean;
  /** Origen del código de barras */
  codeSource?: 'invoice' | 'catalog' | 'manual' | 'none';
  /** Precio de venta sugerido y editable para producto nuevo */
  newPrice: number;
  /** Margen de ganancia porcentual sobre costo (ej: 40 para +40%) */
  customMargin?: number;
  /** Indica si el usuario fijó un precio exacto manual en lugar de calcular por margen */
  isManualPrice?: boolean;
  /** Categoría seleccionada si es nuevo */
  newCategoryId: string;
  /** Origen de la categoría asignada */
  categorySource?: 'ai' | 'catalog' | 'manual';
}

export function isRealBarcode(code?: string | null): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  return /^\d{8,14}$/.test(trimmed);
}

export function isInvoiceProductCode(code: string): boolean {
  return isRealBarcode(code) || /^INT-\d{6,20}$/i.test(code.trim());
}

export interface InvoiceAnalyzerProps {
  storeId: string;
  stockBranchId?: string;
  stockBranchName?: string;
  products: Product[];
  categories?: Category[];
  onClose: () => void;
  onImportDone?: (updatedCount: number) => void | Promise<void>;
  onPricesUpdated?: () => void | Promise<void>;
  /** Lo que entró por esta factura, para compararlo con el pedido: unidades y costo final por unidad. */
  onReceived?: (receipt: { supplierName: string; branchId?: string; lines: { product_id: string; name: string; qty: number; unit_cost: number | null }[] }) => void | Promise<void>;
  catalogBusy?: boolean;
  /** CUIT del comercio, para avisar si la factura está a nombre de otra sociedad. */
  storeCuit?: string | null;
  /** Condición frente al IVA: si no se conoce el tipo de factura, decide si los precios vienen sin IVA. */
  storeCondition?: CondicionIva | null;
  /** Nombre y razón social del comercio: la IA a veces los toma como proveedor. */
  storeNames?: string[];
}

// ─── Code and Emoji Helpers ─────────────────────────────────────────────────

/**
 * Limpia y formatea un nombre sugerido comercial listo para el catálogo de kiosco:
 * - Elimina códigos y números iniciales del renglón (ej: "3182300 Cos18 3 ...")
 * - Expande abreviaturas típicas de distribuidoras (CIG. -> Cigarrillos, ALF. -> Alfajor, etc.)
 * - Remueve sufijos de empaque repetidos al final si ya están como bulto (ej: (25), (10), x10 ATADOS)
 * - Convierte a Title Case legible respetando siglas comunes (KS, BOX, etc.)
 */
