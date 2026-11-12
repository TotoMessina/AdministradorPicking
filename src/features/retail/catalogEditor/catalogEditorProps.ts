import type { KioscoSale } from '../../../types/kiosco';
import type { Category, Product, Store, Role, Branch, PendingReplenishment } from '../api';
import type { Run } from '../managementTypes';

export type CatalogEditorProps = {
  store: Store;
  categories: Category[];
  products: Product[];
  run: Run;
  busy: boolean;
  allSales?: KioscoSale[];
  role?: Role;
  pendingRemitos?: PendingReplenishment[];
  pendingRemitoError?: string;
  branches?: Branch[];
  initialBranchId?: string;
  onRefreshRemitos?: () => void;
  onReviewedRemito?: (id: string) => void;
  guided?: boolean;
  active?: boolean;
  allowRestock?: boolean;
  allowPriceEdit?: boolean;
  permissions?: import('../permissions').Permission[];
  /** Cambia cuando Proveedores pide subir una factura; al cerrarla se avisa para volver. */
  invoiceRequest?: number;
  onInvoiceRequestClosed?: () => void;
};
