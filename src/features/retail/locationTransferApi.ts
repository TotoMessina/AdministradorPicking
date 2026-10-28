import { supabase } from '../../lib/supabase';
import { offlineStatus } from './offline';
import type { StockTransferItem } from './api';

export interface LocationTransfer {
  id: string; from_location: string; to_location: string; items: StockTransferItem[];
  status: 'pending' | 'confirmed' | 'cancelled'; notes: string | null;
  created_at: string; actor_email?: string | null; reviewed_at?: string | null;
}
export interface FundTransfer {
  id: string; from_location: string | null; to_location: string | null; amount: number;
  note: string; created_at: string; actor_email: string | null;
}
export interface LocationFund { location: string; balance: number }
async function ready(requireClean: boolean) {
  if (navigator.onLine === false) throw new Error('Necesitás conexión para operar entre ubicaciones. Los borradores se conservan.');
  const state = await offlineStatus();
  if (requireClean && state.queue.length) throw new Error('Sincronizá las operaciones pendientes de este dispositivo antes de mover existencias.');
}
async function rpc(name: string, args: Record<string, unknown>, requireClean = true) {
  await ready(requireClean);
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (['PGRST202', 'PGRST205', '42P01', '42703'].includes(error.code)) throw new Error('Falta actualizar Supabase para las transferencias por ubicación. Aplicá las migraciones locales 202610280002 y 202610280003 con el historial correspondiente.');
    throw error;
  }
  return data;
}
export const locationTransfers = {
  enable: (store: string, branch: string) => rpc('retail_enable_branch_inventory', { p_store: store, p_branch: branch }),
  create: (store: string, from: string, to: string, items: { product_id: string; qty: number }[], notes: string, request: string) =>
    rpc('retail_create_location_transfer', { p_store: store, p_from: from, p_to: to, p_items: items, p_notes: notes, p_request: request }),
  review: (store: string, id: string, confirm: boolean) => rpc('retail_review_location_transfer', { p_store: store, p_id: id, p_confirm: confirm }),
  moveFunds: (store: string, from: string | null, to: string | null, amount: number, note: string, request: string) =>
    rpc('retail_move_location_funds', { p_store: store, p_from: from, p_to: to, p_amount: amount, p_note: note, p_request: request }, false),
  async stockHistory(store: string, before?: { created_at: string; id: string }) {
    if (navigator.onLine === false) throw new Error('Conectate para consultar el historial de transferencias.');
    let query = supabase.from('retail_location_transfers').select('*').eq('store_id', store).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
    if (before) query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
    const { data, error } = await query;
    if (error) throw error;
    return data as LocationTransfer[];
  },
  async stockSummary(store: string) {
    if (navigator.onLine === false) throw new Error('Conectate para consultar las existencias sincronizadas.');
    const { data, error } = await supabase.rpc('retail_location_stock_summary', { p_store: store });
    if (error) throw error;
    return (data || []) as { location: string; quantity: number }[];
  },
  async funds(store: string) {
    if (navigator.onLine === false) throw new Error('Conectate para consultar los fondos.');
    const { data, error } = await supabase.from('retail_location_funds').select('location,balance').eq('store_id', store);
    if (error) throw error;
    return (data || []).map(row => ({ ...row, balance: Number(row.balance) })) as LocationFund[];
  },
  async fundHistory(store: string, before?: { created_at: string; id: string }) {
    if (navigator.onLine === false) throw new Error('Conectate para consultar el historial de fondos.');
    let query = supabase.from('retail_fund_transfers').select('*').eq('store_id', store).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
    if (before) query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => ({ ...row, amount: Number(row.amount) })) as FundTransfer[];
  },
};
