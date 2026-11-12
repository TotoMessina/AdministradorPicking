// Tipos de la API de PickingUp.
export interface PickingUpCategory {
  code: string;
  name: string;
  enabled: boolean;
}

export interface PickingUpProduct {
  code: string; // SKU del ERP — mapea al `code` (EAN) de KioscoProduct
  name: string; // mapea a KioscoProduct.name
  enabled: boolean; // mapea a Product.active
  ean_code?: string; // código EAN-13 alternativo
  category_code: string; // referencia a Category.code
  stock_control: boolean; // true si manejamos stock
  stock_available?: number; // mapea a KioscoProduct.stock
  stock_min?: number; // mapea a KioscoProduct.minStock
  min_units?: number;
  selling_factor?: number;
  ref_externa?: string; // ID interno Supabase del producto para trazabilidad
}

export interface PickingUpPricelist {
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface PickingUpPriceEntry {
  item_code: string;
  price: number; // Costo mayorista / neto
  final_price: number; // Precio de venta final al público
}

export interface PickingUpOrderItem {
  id?: number;
  sku: string;
  name: string;
  quantity: number;
  net_amount?: number;
  final_amount?: number;
}

export interface PickingUpOrder {
  id: number;
  status: string; // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  notes?: string | null;
  net_amount?: number;
  final_amount?: number;
  created_at?: string;
  updated_at?: string;
  exported_at?: string | null;
  customer?: {
    code: string;
    document?: string;
  };
  pricelist?: {
    code: string;
  };
  items: PickingUpOrderItem[];
}

export interface PickingUpSyncResult {
  synced: number;
  errors: string[];
  skipped?: number;
}

export interface PickingUpPagination {
  current_page: number;
  per_page: number;
  total: number;
}

export interface PickingUpPaginatedResponse<T> {
  data?: T[];
  items?: T[];
  pagination?: PickingUpPagination;
}
