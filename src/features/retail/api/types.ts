import type { KioscoProduct, KioscoSale, PaymentPart } from '../../../types/kiosco';
import type { CashDenominations } from '../../../services/cashDenominations';
import type { SupplierInvoiceRules } from '../../../services/supplierInvoiceRules';
import type { SupplierProfile } from '../../../services/supplierProfile';
import type { PurchaseAmountField } from '../../../services/purchaseInvoiceFields';
import type { BillingStatus, CondicionIva } from '../billing';

export type Role = "owner" | "admin" | "supervisor" | "cashier";
export interface Store {
  id: string;
  name: string;
  owner_id: string;
  address: string;
  phone: string;
  receipt_message: string;
  accent_color: string;
  currency: string;
  low_margin_threshold?: number;
  /** Redondeo de los precios por costo (0, 1, 5, 10, 50 o 100). Sin la actualización 202611030007 no viene. */
  price_rounding?: number;
  /** Ganancia por defecto sobre costo para productos nuevos. */
  default_markup?: number;
  depot_enabled?: boolean;
  branch_inventory_enabled?: boolean;
  cuit?: string | null;
  razon_social?: string | null;
  condicion_iva?: CondicionIva | null;
  punto_venta_afip?: number | null;
  iibb?: string | null;
  inicio_actividades?: string | null;
  billing_enabled?: boolean;
}
export interface Category {
  id: string;
  store_id: string;
  name: string;
  canonicalName?: string;
}
export interface Register {
  id: string;
  store_id: string;
  name: string;
  active: boolean;
  branch_id: string;
}
export interface Branch { id: string; store_id: string; name: string; address: string; is_default: boolean; latitude?: number | null; longitude?: number | null }
export interface StockTransferItem { product_id: string; product_name: string; qty: number }
export type DepotAction = 'to_salon' | 'to_depot' | 'receive';
export interface DepotMovement {
  id: string; product_id: string; product_name: string; action: DepotAction; quantity: number;
  total_after: number; depot_after: number; actor_email: string | null; created_at: string;
}
export interface StockTransfer {
  id: string;
  store_id: string;
  from_branch_id: string;
  to_branch_id: string;
  created_by: string;
  created_at: string;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  items: StockTransferItem[];
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}
export interface PriceRule { scope: 'category' | 'brand' | 'product'; target: string; adjustment: number }
export interface PriceList {
  id: string; store_id: string; name: string; adjustment: number; active: boolean; branch_id?: string | null;
  is_primary?: boolean;
  base_kind?: 'cost' | 'catalog' | 'list'; parent_id?: string | null; pricing_rules?: PriceRule[]; revision?: number;
}
export interface PriceOverride { list_id: string; product_id: string; price: number }
export interface SalesLedger { id: string; store_id: string; name: string; is_default: boolean; active: boolean; payment_methods?: import('../../../types/kiosco').PaymentMethod[] }
export interface SaleLedgerChange { id: string; from_name: string; to_name: string; changed_by: string; changed_at: string }
export interface Shift {
  id: string;
  store_id: string;
  register_id: string;
  opened_by: string;
  opened_at: string;
  opening_cash: number;
  closed_at: string | null;
  counted_cash: number | null;
  expected_cash: number | null;
  closing_denominations?: CashDenominations | null;
  ticket_count?: number | null;
}
export interface Product extends KioscoProduct {
  categoryId: string;
  cost: number;
  active: boolean;
  brand?: string;
  supplier?: string;
  supplierCode?: string;
  tags?: string[];
  unitType?: string;
  pack_size?: number | null;
  /** Unidades por display (202611040005). Un bulto con displays trae pack_size = displays × display_size. */
  display_size?: number | null;
  /** Códigos del display (EAN-13) y del bulto (DUN-14) y bultos por pallet (202611060009). La unidad usa `code`. */
  display_code?: string | null;
  pack_code?: string | null;
  pallet_packs?: number | null;
  margin_group?: 'standard' | 'low_margin' | null;
  expiry_date?: string | null;
  last_restocked_at?: string | null;
}
export interface ProductDeletionRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  event_type: 'deleted' | 'restored' | 'prior';
  occurred_at: string | null;
  recorded_at: string;
  actor_email: string | null;
  reason: string | null;
  currentActive: boolean | null;
}
export interface Movement {
  shift_id?: string;
  store_id?: string;
  register_id?: string;
  created_by?: string;
  id: string;
  type: "INGRESO" | "RETIRO";
  amount: number;
  reason: string;
  created_at: string;
  category?: string;
  voucher_url?: string | null;
  supplier_name?: string | null;
  /** Número del recibo de ingreso o de pago (202611060010). Los anteriores no tienen. */
  receipt_number?: number | null;
  actor_email?: string | null;
}
export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  supplier_key: string;
  /** Descuento habitual del comercio con este proveedor, sobre el costo facturado. */
  discount_percent: number;
  notes: string | null;
  revision: number;
  /** 11 dígitos sin guiones; reconoce sus facturas. Null antes de la migración o sin cargar. */
  cuit: string | null;
  invoice_rules: SupplierInvoiceRules;
  /** Datos fiscales, de contacto y de pago; vacíos antes de la migración 202610290006. */
  profile: SupplierProfile;
}
export type SupplierPaymentMethod = 'cash' | 'transfer' | 'check' | 'other';
export interface SupplierPaymentAllocation { payment_id: string; invoice_id: string; amount: number }
export interface SupplierPayment {
  id: string;
  store_id: string;
  issuer_cuit: string;
  supplier_name: string;
  paid_on: string;
  method: SupplierPaymentMethod;
  /** Dinero entregado; las retenciones también cancelan deuda. */
  amount: number;
  ret_vat: number;
  ret_income: number;
  ret_iibb: number;
  ret_suss: number;
  retention_certificate: string | null;
  reference: string | null;
  notes: string | null;
  movement_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
  actor_email: string | null;
  created_at: string;
  allocations: SupplierPaymentAllocation[];
}
export interface CostAdjustmentProduct {
  id: string;
  name: string;
  code: string;
  cost: number;
  price: number;
  sale_markup: number | null;
  stock_components: unknown[] | null;
}
export interface PurchaseInvoice extends Record<PurchaseAmountField, number> {
  id: string;
  store_id: string;
  supplier_id: string | null;
  supplier_name: string;
  issuer_cuit: string;
  receiver_cuit: string | null;
  voucher_type: number;
  point_of_sale: number;
  number: number;
  issue_date: string;
  authorization_type: 'E' | 'A' | null;
  authorization_code: string | null;
  balanced: boolean;
  qr_verified: boolean;
  notes: string | null;
  actor_email: string | null;
  created_at: string;
  /** Seguimiento (cuenta corriente). Nulos antes de la migración 202610290007. */
  due_date: string | null;
  review_reason: string | null;
  accepted_at: string | null;
  applies_to: string | null;
}
export interface Member {
  profile_id?: string | null;
  user_id: string;
  role: Role;
  email: string;
  branch_id: string | null;
  register_id: string | null;
}
export interface Invitation {
  profile_id?: string | null;
  id: string;
  email: string;
  role: Role;
  branch_id: string | null;
  register_id: string | null;
}
export type CustomerIva = 'CF' | 'RI' | 'MO' | 'EX';
export interface CustomerBilling { business_name: string | null; tax_id_type: 'CUIT' | 'CUIL' | 'DNI' | null; tax_id: string | null; iva_condition: CustomerIva | null; address: string | null; email: string | null }
export interface Customer extends Partial<CustomerBilling> { id: string; name: string; phone: string | null; credit_limit: number | null; active: boolean; balance: number; last_movement: string | null }
export interface CustomerMovement {
  id: string; kind: 'sale' | 'payment' | 'return'; amount: number; method: string | null; sale_id: string | null; note: string | null; actor_email: string | null; created_at: string;
}
export interface SaleReturn {
  id: string; kind: 'void' | 'partial'; total: number | string; cash_amount: number | string; payments: PaymentPart[];
  items: { index: number; productId?: string | null; name: string; qty: number; unitPrice: number; subtotal: number }[];
  reason: string; credit_note_required: boolean; credit_note_reference: string | null; actor_email: string | null; created_at: string;
  credit_note_status?: 'none' | 'pending' | 'authorized' | 'error' | 'retry'; credit_note_error?: string | null; cae?: string | null;
}
export interface SaleRow {
  customer_id?: string | null;
  customer_name?: string | null;
  returned_total?: number | string;
  return_status?: KioscoSale['returnStatus'];
  shift_id?: string;
  store_id?: string;
  created_by?: string;
  payments?: KioscoSale['payments'];
  branch_id: string;
  branch_name: string;
  register_name: string;
  price_list_id: string | null;
  price_list_name: string;
  ledger_id: string;
  ledger_name: string;
  invoice_reference: string | null;
  cbte_tipo?: number | null;
  cbte_nro?: number | null;
  cae?: string | null;
  cae_vto?: string | null;
  billing_status?: BillingStatus;
  billing_error?: string | null;
  billing_attempts?: number;
  receptor_doc_tipo?: number | null;
  receptor_doc_nro?: number | string | null;
  receptor_name?: string | null;
  id: string;
  ticket_number: number;
  items: KioscoSale["items"];
  total: number;
  payment_method: KioscoSale["paymentMethod"];
  amount_paid: number;
  change: number;
  created_at: string;
}
export interface EanLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
  category_suggestion?: string;
  emoji?: string;
  source?: "ai" | "community" | "verified";
  confidence_score?: number;
}
/** Los textos en inglés de la base o del navegador no le sirven a quien usa la app. */
