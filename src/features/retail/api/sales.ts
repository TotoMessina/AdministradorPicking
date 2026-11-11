import { supabase } from '../../../lib/supabase';
import type { KioscoSale, PaymentPart } from '../../../types/kiosco';
import type { SalesLedger, SaleLedgerChange, SaleReturn, SaleRow } from './types';
import { result, allRows } from './request';
import { saleFromRow } from './saleFromRow';

/** Ventas, registros de ventas (libros), devoluciones y comprobantes de venta. */
export const salesApi = {
  async ledgers(store: string) {
    return result<SalesLedger[]>(supabase.from('retail_ledgers').select('*').eq('store_id', store).order('is_default', { ascending: false }).order('name'));
  },
  async saveLedger(store: string, name: string, id?: string, active = true) {
    const query = supabase.from('retail_ledgers');
    return result(id ? query.update({ name: name.trim(), active }).eq('store_id', store).eq('id', id).select('id').single() : query.insert({ store_id: store, name: name.trim() }));
  },
  async saveLedgerRouting(store: string, defaultId: string, rules: Record<string, string>) {
    return result(supabase.rpc('retail_save_ledger_routing', { p_store: store, p_default: defaultId, p_rules: rules }));
  },
  async prepareSalesLedgers(store: string) {
    return result(supabase.rpc('retail_prepare_sales_ledgers', { p_store: store }));
  },
  async moveSaleLedger(store: string, sale: string, target: string, expected: string, request: string) {
    const row = await result<SaleRow>(supabase.rpc('retail_move_sale_ledger', { p_store: store, p_sale: sale, p_target: target, p_expected: expected, p_request: request }));
    return saleFromRow(row);
  },
  async saleLedgerHistory(store: string, sale: string) {
    return allRows<SaleLedgerChange>((from, to) => supabase.from('retail_sale_ledger_changes').select('id,from_name,to_name,changed_by,changed_at')
      .eq('store_id', store).eq('sale_id', sale).order('changed_at', { ascending: false }).order('id').range(from, to));
  },
  async returnSale(store: string, sale: string, request: string, items: { index: number; qty: number }[] | null, reason: string, refund: PaymentPart[] | null, shift: string | null) {
    return result<{ id: string; returnedTotal: number; returnStatus: 'partial' | 'voided'; total: number; creditNoteRequired: boolean }>(supabase.rpc('retail_return_sale', {
      p_store: store, p_sale: sale, p_request: request, p_items: items, p_reason: reason, p_refund: refund, p_shift: shift }));
  },
  async saleReturns(store: string, sale: string) {
    return allRows<SaleReturn>((from, to) => supabase.from('retail_sale_returns').select('*')
      .eq('store_id', store).eq('sale_id', sale).order('created_at').order('id').range(from, to));
  },
  async sales(store: string, shift: string) {
    const rows = await allRows<SaleRow>((from, to) =>
      supabase
        .from("retail_sales")
        .select("*")
        .eq("store_id", store)
        .eq("shift_id", shift)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    return rows.map(saleFromRow);
  },
  async allSales(store: string, limit = 500) {
    const rows = await result<SaleRow[]>(
      supabase
        .from("retail_sales")
        .select("*")
        .eq("store_id", store)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
    return (rows || []).map(saleFromRow);
  },
  async checkout(store: string, shift: string, sale: KioscoSale) {
    const id = await result<string>(
      supabase.rpc("retail_checkout", {
        p_price_list: sale.priceListId || null,
        p_ledger: sale.ledgerId || null,
        p_shift: shift,
        p_request: sale.id,
        p_method: sale.paymentMethod,
        p_payments: sale.payments || null,
        p_paid: sale.amountPaid,
        p_items: sale.items.map((i) => ({
          product_id: i.productId || null,
          name: i.name,
          qty: i.qty,
          unit_price: i.unitPrice,
          stock_components: i.stockComponents || [],
        })),
      }),
    );
    const row = await result<SaleRow>(
      supabase
        .from("retail_sales")
        .select("*")
        .eq("store_id", store)
        .eq("id", id)
        .single(),
    );
    return saleFromRow(row);
  },
  async reportSales(store: string, fromDate: string, toDate: string) {
    const rows = await allRows<SaleRow>((from, to) => supabase.from('retail_sales').select('*').eq('store_id', store).gte('created_at', fromDate).lt('created_at', toDate).order('created_at').order('id').range(from, to));
    return rows.map(saleFromRow);
  },
  async attachInvoice(sale: string, reference: string) {
    return result(supabase.rpc('retail_attach_invoice', { p_sale: sale, p_reference: reference.trim() }));
  },
  /** Cliente a cuyo nombre sale la factura. Solo antes de facturar. */
  async setSaleReceptor(store: string, sale: string, customer: string | null) {
    return result(supabase.rpc('retail_set_sale_receptor', { p_store: store, p_sale: sale, p_customer: customer }));
  },
  async attachCreditNote(store: string, saleReturn: string, reference: string) {
    return result(supabase.rpc('retail_attach_credit_note', { p_store: store, p_return: saleReturn, p_reference: reference }));
  },
};
