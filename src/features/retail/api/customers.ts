import { supabase } from '../../../lib/supabase';
import type { KioscoSale } from '../../../types/kiosco';
import type { CustomerBilling, Customer, CustomerMovement, SaleRow } from './types';
import { result, allRows } from './request';
import { saleFromRow } from './saleFromRow';

/** Clientes, cuenta corriente y ventas fiadas. */
export const customersApi = {
  async customers(store: string) {
    const rows = await result<Customer[]>(supabase.rpc('retail_customer_balances', { p_store: store }));
    return (rows || []).map(row => ({ ...row, balance: Number(row.balance), credit_limit: row.credit_limit === null ? null : Number(row.credit_limit) }));
  },
  async saveCustomer(store: string, id: string, customer: { name: string; phone: string; credit_limit: string; active: boolean } & Record<keyof CustomerBilling, string>) {
    return result<string>(supabase.rpc('retail_save_customer', { p_store: store, p_id: id, p_customer: customer }));
  },
  async customerMovements(store: string, customer: string) {
    const rows = await allRows<CustomerMovement>((from, to) => supabase.from('retail_customer_movements').select('id,kind,amount,method,sale_id,note,actor_email,created_at')
      .eq('store_id', store).eq('customer_id', customer).order('created_at', { ascending: false }).order('id').range(from, to));
    return rows.map(row => ({ ...row, amount: Number(row.amount) }));
  },
  async customerPayment(store: string, customer: string, request: string, amount: number, method: string, shift: string | null, note: string) {
    return result<{ id: string; balance: number }>(supabase.rpc('retail_customer_payment', { p_store: store, p_customer: customer, p_request: request, p_amount: amount, p_method: method, p_shift: shift, p_note: note || null }));
  },
  /** Venta fiada, completa o con el resto fiado: va directo al servidor porque necesita el saldo y el límite del momento. */
  async checkoutOnCredit(shift: string, sale: KioscoSale & { priceListId?: string | null; ledgerId?: string }) {
    const mixed = sale.paymentMethod === 'Mixto';
    await result(supabase.rpc('retail_checkout', { p_shift: shift, p_request: sale.id, p_method: mixed ? 'Mixto' : 'Fiado', p_paid: mixed ? sale.amountPaid : 0,
      p_items: sale.items.map(item => item.productId ? { product_id: item.productId, qty: item.qty, unit_price: item.unitPrice, ...(item.stockComponents?.length ? { stock_components: item.stockComponents } : {}) } : { name: item.name, qty: item.qty, unit_price: item.unitPrice }),
      p_price_list: sale.priceListId || null, p_ledger: sale.ledgerId || null, p_payments: mixed ? sale.payments : null, p_customer: sale.customerId, p_over_limit: !!sale.creditOverLimit }));
    const row = await result<SaleRow>(supabase.from('retail_sales').select('*').eq('id', sale.id).single());
    return saleFromRow(row);
  },
};
