// Tipos y Modelos de Datos para Kiosco Express Standalone

export type KioscoCategory = string;
export type MarginGroup = 'standard' | 'low_margin';

export interface KioscoProduct {
  id: string;
  code: string; // Código de barras (EAN-13 o interno)
  name: string; // Descripción comercial
  category: KioscoCategory;
  price: number; // Precio de venta final al público
  cost?: number; // Costo de compra mayorista
  stock: number; // Unidades actuales en mostrador
  pack_size?: number | null; // Unidades individuales por bulto de compra.
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

