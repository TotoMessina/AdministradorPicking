import { supabase } from '../../lib/supabase';

export const countReasons = { rotura: 'Rotura', vencido: 'Vencido', robo: 'Robo', error_carga: 'Error de carga', otro: 'Otro' } as const;
export type CountReason = keyof typeof countReasons;
export interface StockCount {
  id: string; location: string; category_id: string | null; brand: string | null; status: 'open' | 'confirmed' | 'cancelled'; notes: string | null;
  actor_email: string | null; created_at: string; closed_email: string | null; closed_at: string | null;
}
export interface StockCountLine {
  product_id: string; counted: number; expected: number; reason: CountReason | null; note: string | null;
  counted_email: string | null; counted_at: string; adjustment: number | null; unit_cost: number | null;
}
export interface LineChange { product_id: string; counted: number | null; reason?: CountReason | null; note?: string | null }
export interface StockLosses { losses: number; surplus: number; uncosted_lines: number; by_reason: { reason: CountReason; amount: number; units: number }[] }

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const stockCounts = {
  async list(store: string) {
    const { data, error } = await supabase.from('retail_stock_counts').select('id,location,category_id,brand,status,notes,actor_email,created_at,closed_email,closed_at')
      .eq('store_id', store).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data || []) as StockCount[];
  },
  async lines(store: string, count: string) {
    const { data, error } = await supabase.from('retail_stock_count_lines').select('product_id,counted,expected,reason,note,counted_email,counted_at,adjustment,unit_cost')
      .eq('store_id', store).eq('count_id', count).limit(5000);
    if (error) throw error;
    return (data || []).map(row => ({ ...row, unit_cost: row.unit_cost === null ? null : Number(row.unit_cost) })) as StockCountLine[];
  },
  start: (store: string, id: string, location: string, category: string | null, brand: string | null, notes: string) =>
    rpc<string>('retail_start_stock_count', { p_store: store, p_id: id, p_location: location, p_category: category, p_notes: notes || null, p_brand: brand }),
  save: (store: string, count: string, lines: LineChange[]) => rpc<number>('retail_save_stock_count_lines', { p_store: store, p_count: count, p_lines: lines }),
  confirm: (store: string, count: string) => rpc<{ status: string; lines: number }>('retail_confirm_stock_count', { p_store: store, p_count: count }),
  cancel: (store: string, count: string) => rpc<void>('retail_cancel_stock_count', { p_store: store, p_count: count }),
  losses: (store: string, month: string) => rpc<StockLosses>('retail_month_stock_losses', { p_store: store, p_month: `${month}-01` }),
};

/** Planilla con código y cantidad por renglón, separados por punto y coma, coma o tabulación. */
export function parseCountSheet(text: string) {
  const rows: { code: string; qty: number }[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [code, amount] = line.split(/[;\t,]/).map(cell => cell.trim().replace(/^"|"$/g, ''));
    const qty = Number((amount || '').replace(/\./g, ''));
    if (!code || !Number.isInteger(qty) || qty < 0) { if (!/c[oó]digo/i.test(code || '')) invalid.push(line); continue; }
    rows.push({ code, qty });
  }
  return { rows, invalid };
}
