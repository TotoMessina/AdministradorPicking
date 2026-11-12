import type { InvoiceItem } from '../InvoiceAnalyzer';
import type { Category, Product } from '../../features/retail/api';
import type { InvoiceCatalogCandidate } from '../../services/invoiceCatalogService';

// Props y formatos de la tabla de revisión de la factura.
export interface InvoiceReviewAttention {
  index: number;
  column: 'qty' | 'pack' | 'cost' | 'action' | 'name' | 'code' | 'minimum';
  sequence: number;
}

export interface Props {
  rows: { it: InvoiceItem; originalIndex: number }[];
  filterKey: string;
  products: Product[];
  categories: Category[];
  supplier: string;
  /** Descuento global del proveedor para esta factura; el costo ingresado es el facturado. */
  discountPercent: number;
  /** Costo final por unidad (descuento, IVA e internos) para la fila y el costo facturado dados. */
  finalCost: (index: number, unitCost: number) => number;
  /** Qué se aplicó para llegar al costo final, por ejemplo "+IVA 21% · +internos". */
  finalCostNote: string;
  mappingBusy: boolean;
  expandedItems: Set<number>;
  productSearch: Record<number, string>;
  attention: InvoiceReviewAttention | null;
  catalogSuggestions: { index: number; loading: boolean; candidates: InvoiceCatalogCandidate[]; notice: string } | null;
  onSearchCatalog: (index: number) => void;
  onUseCatalogCandidate: (index: number, candidateId: string) => void;
  onAddRow: () => void;
  isValidCode: (code: string) => boolean;
  onToggleDetails: (index: number) => void;
  onUpdate: (index: number, patch: Partial<InvoiceItem>) => void;
  onPackChange: (index: number, size: number) => void;
  onSelectProduct: (index: number, productId: string) => void;
  onConfirmMapping: (index: number) => void;
  onSearchProduct: (index: number, query: string) => void;
  onCodeChange: (index: number, code: string) => void;
  onGenerateCode: (index: number) => void;
  onFindCode: (index: number) => void;
  onFindCategory: (index: number) => void;
}

export const PAGE_SIZE = 50;
export const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
