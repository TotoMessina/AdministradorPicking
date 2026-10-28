// Tipos y Modelos de Datos para Kiosco Express Standalone

export type KioscoCategory = string;
export type MarginGroup = 'standard' | 'low_margin';

export interface StockComponent { product_id: string; quantity: number }

export interface KioscoProduct {
  id: string;
  code: string; // Código de barras (EAN-13 o interno)
  name: string; // Descripción comercial
  category: KioscoCategory;
  price: number; // Precio de venta final al público
  sale_markup?: number | null; // Aumento porcentual sobre costo en la lista Principal; null conserva precio manual.
  pricingError?: string; // Missing cost/configuration: never substitute a fabricated sale price.
  cost?: number; // Costo de compra mayorista
  sellable?: boolean; // false: insumo con stock, no se vende directamente
  stock: number; // Total físico; en compuestos, disponibilidad calculada.
  depotStock?: number; // Parte del total guardada en depósito (0 si no se usa).
  branchStocks?: Record<string, number>; // Physical allocation when location inventory is active.
  stockBranchId?: string; // Sale context only; aggregate stock is never replaced.
  pack_size?: number | null; // Unidades individuales por bulto de compra.
  stock_components?: StockComponent[]; // Por venta: unidades consumidas de productos con stock propio.
  margin_group?: MarginGroup | null;
  minStock: number; // Umbral de reposición urgente (ej: 4 o 6)
  color?: string; // Color temático para la tarjeta táctil
  emoji?: string; // Ícono visual (🍫, 🥤, 🚬, 🍪, ⚡)
}

export interface KioscoCartItem {
  product: KioscoProduct;
  qty: number;
  subtotal: number;
}

export type PaymentMethod = "Efectivo" | "QR" | "Transferencia" | "Mixto" | "Debito" | "Credito";
export interface PaymentPart { method: Exclude<PaymentMethod, 'Mixto'>; amount: number }

export interface CashMovement {
  id: string;
  type: "INGRESO" | "RETIRO";
  amount: number;
  reason: string; // Ej: "Pago repartidor panadería", "Cambio billetes chicos"
  time: string;
}

export interface KioscoSale {
  shift_id?: string;
  store_id?: string;
  register_id?: string;
  created_by?: string;
  branchId?: string;
  branchName?: string;
  registerName?: string;
  priceListId?: string | null;
  priceListName?: string;
  ledgerId?: string;
  ledgerName?: string;
  invoiceReference?: string | null;
  cbteTipo?: number | null;
  cbteNro?: number | null;
  cae?: string | null;
  caeVto?: string | null;
  billingStatus?: 'none' | 'pending' | 'authorized' | 'error' | 'retry';
  billingError?: string | null;
  billingAttempts?: number;
  id: string;
  ticketNumber: string; // Ej: "T-0042"
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptMessage?: string;
  items: {
    productId?: string | null;
    name: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    marginGroup?: MarginGroup | null;
    unitCost?: number | null;
    stockComponents?: StockComponent[];
  }[];
  total: number;
  paymentMethod: PaymentMethod;
  payments?: PaymentPart[];
  syncStatus?: 'pending' | 'synced';
  amountPaid: number; // Con cuánto pagó el cliente
  change: number; // Vuelto entregado
  timestamp: string; // Hora de emisión (HH:mm:ss)
  date?: string; // Fecha (DD/MM/YYYY)
  created_at?: string; // ISO timestamp
  createdAt?: string; // ISO timestamp
}

export interface ShiftSummary {
  shiftId: string;
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  initialFund: number; // Fondo inicial al abrir turno
  cashSalesTotal: number; // Total recaudado en billetes
  qrSalesTotal: number; // Total recaudado en Mercado Pago / QR
  cardSalesTotal: number; // Total recaudado en Débito / Crédito
  totalIngresos: number; // Entradas manuales de cambio
  totalRetiros: number; // Egresos manuales (gastos/proveedores)
  expectedCash: number; // initialFund + cashSales + ingresos - retiros
  countedCash?: number; // Dinero físico contado por el cajero
  difference?: number; // countedCash - expectedCash (0, >0, <0)
}

export interface SandboxChecklist {
  scanner: boolean;
  vuelto: boolean;
  qr: boolean;
  ticket: boolean;
  arqueo: boolean;
  stock: boolean;
}

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
  createdAt: string;
  type: "unitario" | "csv";
  supplier?: string;
  notes?: string;
  totalUnits: number;
  itemsCount: number;
  items: StockReplenishmentItem[];
}

