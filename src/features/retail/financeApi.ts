import { supabase } from '../../lib/supabase';

export const expenseCategories = {
  alquiler: 'Alquiler', servicios: 'Luz, agua e internet', sueldos: 'Sueldos', impuestos: 'Impuestos', mantenimiento: 'Mantenimiento', otros: 'Otros',
} as const;
export type ExpenseCategory = keyof typeof expenseCategories;
export interface Expense {
  id: string; branch_id: string | null; spent_on: string; category: ExpenseCategory; description: string; amount: number; fixed: boolean;
}
export type ExpenseDraft = Omit<Expense, 'id'>;
export interface MonthResult {
  sales: number; returns?: number; tickets: number; cost: number; uncosted_lines: number; expenses: number; shared_expenses: number;
  by_category: { category: ExpenseCategory; amount: number }[];
  branches: { branch_id: string; sales: number; cost: number; expenses: number }[];
}

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}
const nextMonth = (month: string) => {
  const [year, number] = month.split('-').map(Number);
  return number === 12 ? `${year + 1}-01-01` : `${year}-${String(number + 1).padStart(2, '0')}-01`;
};

export const finance = {
  result: (store: string, month: string) => rpc<MonthResult>('retail_month_result', { p_store: store, p_month: `${month}-01` }),
  save: (store: string, id: string, expense: ExpenseDraft) => rpc('retail_save_expense', { p_store: store, p_id: id, p_expense: expense }),
  remove: (store: string, id: string) => rpc('retail_delete_expense', { p_store: store, p_id: id }),
  async fixedExpenses(store: string, from: string, to: string) {
    const { data, error } = await supabase.from('retail_expenses').select('id,branch_id,spent_on,category,description,amount,fixed')
      .eq('store_id', store).eq('fixed', true).is('voided_at', null).gte('spent_on', `${from}-01`).lt('spent_on', nextMonth(to));
    if (error) throw error;
    return (data || []).map(row => ({ ...row, amount: Number(row.amount) })) as Expense[];
  },
  async expenses(store: string, month: string) {
    const { data, error } = await supabase.from('retail_expenses').select('id,branch_id,spent_on,category,description,amount,fixed')
      .eq('store_id', store).is('voided_at', null).gte('spent_on', `${month}-01`).lt('spent_on', nextMonth(month)).order('spent_on', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({ ...row, amount: Number(row.amount) })) as Expense[];
  },
};
