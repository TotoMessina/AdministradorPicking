import { supabase } from '../../../lib/supabase';
import { toInvoiceFormat, type InvoiceFormat, type StoredInvoiceFormat } from '../../../services/invoiceFormatService';
import { toSupplierInvoiceRules, type SupplierInvoiceRules } from '../../../services/supplierInvoiceRules';
import type { SupplierProfile } from '../../../services/supplierProfile';
import { PURCHASE_AMOUNT_FIELDS } from '../../../services/purchaseInvoiceFields';
import type { Supplier, SupplierPaymentAllocation, SupplierPayment, CostAdjustmentProduct, PurchaseInvoice } from './types';
import { result, allRows } from './request';
import { toSupplier } from './toSupplier';

/** Proveedores, facturas de compra, pagos y ajuste de costos. */
export const suppliersApi = {
  async suppliers(storeId: string): Promise<Supplier[]> {
    const rows = await allRows<Supplier>((from, to) =>
      supabase.from("retail_suppliers").select("*").eq("store_id", storeId).order("name").range(from, to),
    );
    return rows.map(toSupplier);
  },
  /** Sin `cuit`/`invoice_rules`/`profile` se conservan los guardados; `cuit: ''` lo quita. */
  async saveSupplier(storeId: string, supplier: { id?: string; name: string; discount_percent: number; notes?: string | null; revision?: number; cuit?: string; invoice_rules?: SupplierInvoiceRules; profile?: SupplierProfile }) {
    const saved = await result<Supplier>(supabase.rpc("retail_save_supplier", {
      p_store: storeId, p_id: supplier.id || null, p_name: supplier.name,
      p_discount: supplier.discount_percent, p_notes: supplier.notes?.trim() || null, p_expected: supplier.revision ?? null,
      ...(supplier.cuit !== undefined ? { p_cuit: supplier.cuit } : {}),
      ...(supplier.invoice_rules !== undefined ? { p_rules: toSupplierInvoiceRules(supplier.invoice_rules) } : {}),
      ...(supplier.profile !== undefined ? { p_profile: supplier.profile } : {}),
    }));
    return toSupplier(saved);
  },
  async deleteSupplier(storeId: string, supplier: Supplier) {
    return result(supabase.rpc("retail_delete_supplier", { p_store: storeId, p_id: supplier.id, p_expected: supplier.revision }));
  },
  /** Comprobantes de compra del período (fechas AAAA-MM-DD, inclusive). */
  async purchaseInvoices(storeId: string, from: string, to: string): Promise<PurchaseInvoice[]> {
    const rows = await allRows<PurchaseInvoice>((start, end) =>
      supabase.from("retail_purchase_invoices").select("*").eq("store_id", storeId).gte("issue_date", from).lte("issue_date", to)
        .order("issue_date", { ascending: false }).order("created_at", { ascending: false }).range(start, end),
    );
    return rows.map((row) => ({ ...row, ...Object.fromEntries(PURCHASE_AMOUNT_FIELDS.map((field) => [field.id, Number(row[field.id])])) }));
  },
  /** Comprobante ya registrado con la misma clave fiscal, para avisar antes de cargar dos veces la mercadería. */
  async findPurchaseInvoice(storeId: string, key: { issuer_cuit: string; voucher_type: number; point_of_sale: number; number: number }) {
    const rows = await result<PurchaseInvoice[]>(supabase.from("retail_purchase_invoices").select("*").eq("store_id", storeId)
      .eq("issuer_cuit", key.issuer_cuit).eq("voucher_type", key.voucher_type).eq("point_of_sale", key.point_of_sale).eq("number", key.number).limit(1));
    return rows[0] ?? null;
  },
  async savePurchaseInvoice(storeId: string, id: string, invoice: Record<string, unknown>) {
    return result<string>(supabase.rpc("retail_save_purchase_invoice", { p_store: storeId, p_request: id, p_invoice: invoice }));
  },
  /** Pagos con sus aplicaciones. Sin la migración o sin permiso devuelve vacío: los saldos no descuentan pagos. */
  async supplierPayments(storeId: string): Promise<SupplierPayment[]> {
    const [payments, allocations] = await Promise.all([
      allRows<SupplierPayment>((from, to) => supabase.from("retail_supplier_payments").select("*").eq("store_id", storeId)
        .order("paid_on", { ascending: false }).order("created_at", { ascending: false }).range(from, to)),
      allRows<SupplierPaymentAllocation>((from, to) => supabase.from("retail_supplier_payment_allocations").select("payment_id,invoice_id,amount").eq("store_id", storeId).order("payment_id").range(from, to)),
    ]);
    return payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount), ret_vat: Number(payment.ret_vat), ret_income: Number(payment.ret_income), ret_iibb: Number(payment.ret_iibb), ret_suss: Number(payment.ret_suss),
      allocations: allocations.filter((item) => item.payment_id === payment.id).map((item) => ({ ...item, amount: Number(item.amount) })),
    }));
  },
  async saveSupplierPayment(storeId: string, id: string, payment: Record<string, unknown>) {
    return result<string>(supabase.rpc("retail_save_supplier_payment", { p_store: storeId, p_request: id, p_payment: payment }));
  },
  async applySupplierPayment(storeId: string, id: string, allocations: { invoice_id: string; amount: number }[]) {
    return result(supabase.rpc("retail_apply_supplier_payment", { p_store: storeId, p_id: id, p_allocations: allocations }));
  },
  async voidSupplierPayment(storeId: string, id: string, reason: string) {
    return result(supabase.rpc("retail_void_supplier_payment", { p_store: storeId, p_id: id, p_reason: reason }));
  },
  /** Vencimiento, revisión, aceptación de nota de débito o vínculo con su factura. No cambia importes. */
  async updatePurchaseInvoiceTracking(storeId: string, id: string, changes: { due_date?: string; review_reason?: string | null; accept?: boolean; applies_to?: string | null }) {
    return result<PurchaseInvoice>(supabase.rpc("retail_update_purchase_invoice_tracking", { p_store: storeId, p_id: id, p_changes: changes }));
  },
  async deletePurchaseInvoice(storeId: string, id: string) {
    return result(supabase.rpc("retail_delete_purchase_invoice", { p_store: storeId, p_id: id }));
  },
  /** Learned invoice layouts; rows with an unknown shape are ignored, so those invoices use AI. */
  async supplierInvoiceFormats(storeId: string): Promise<StoredInvoiceFormat[]> {
    const rows = await allRows<StoredInvoiceFormat>((from, to) =>
      supabase.from("retail_supplier_invoice_formats").select("supplier_key,supplier_name,format,samples,local_reads")
        .eq("store_id", storeId).order("supplier_key").range(from, to),
    );
    return rows.flatMap((row) => {
      const format = toInvoiceFormat(row.format);
      return format ? [{ ...row, format, samples: Number(row.samples), local_reads: Number(row.local_reads) }] : [];
    });
  },
  async saveSupplierInvoiceFormat(storeId: string, supplier: string, format: InvoiceFormat, samples: number, localRead: boolean) {
    return result(supabase.rpc("retail_save_supplier_invoice_format", {
      p_store: storeId, p_supplier: supplier, p_format: format, p_samples: samples, p_local_read: localRead,
    }));
  },
  async deleteSupplierInvoiceFormat(storeId: string, supplier: string) {
    return result(supabase.rpc("retail_delete_supplier_invoice_format", { p_store: storeId, p_supplier: supplier }));
  },
  /** Productos activos de un proveedor, con lo necesario para previsualizar un ajuste de costos. */
  async productsForCostAdjustment(storeId: string, supplier: string): Promise<CostAdjustmentProduct[]> {
    const rows = await allRows<CostAdjustmentProduct>((from, to) =>
      supabase.from("retail_products").select("id,name,code,cost,price,sale_markup,stock_components")
        .eq("store_id", storeId).eq("supplier", supplier).eq("active", true).order("name").range(from, to),
    );
    return rows.map((row) => ({ ...row, cost: Number(row.cost), price: Number(row.price), sale_markup: row.sale_markup == null ? null : Number(row.sale_markup) }));
  },
  /** Todo o nada: si algún costo cambió desde la vista previa, no se ajusta ninguno. */
  async adjustProductCosts(storeId: string, changes: { id: string; expected: number; cost: number }[]) {
    return result<number>(supabase.rpc("retail_adjust_product_costs", { p_store: storeId, p_changes: changes }));
  },
};
