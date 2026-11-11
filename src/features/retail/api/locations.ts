import { supabase } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import { locationTransfers } from '../locationTransferApi';
import type { Register, Branch, StockTransferItem, DepotAction, DepotMovement, StockTransfer } from './types';
import { result, allRows } from './request';

/** Sucursales, depósito y transferencias entre ubicaciones. */
export const locationsApi = {
  enableBranchInventory: locationTransfers.enable,
  reviewLocationTransfer: locationTransfers.review,
  async branches(store: string) {
    return result<Branch[]>(supabase.from('retail_branches').select('*').eq('store_id', store).order('is_default', { ascending: false }).order('name'));
  },
  async saveBranch(store: string, name: string, address: string, id?: string) {
    return result(supabase.rpc('retail_write_branch', { p_store: store, p_name: name.trim(), p_address: address, p_id: id || null }));
  },
  async saveBranchLocation(store: string, id: string, latitude: number | null, longitude: number | null) {
    return result(supabase.rpc('retail_set_branch_location', { p_store: store, p_id: id, p_latitude: latitude, p_longitude: longitude }));
  },
  async deleteBranch(store: string, id: string) {
    return result(supabase.rpc('retail_delete_branch', { p_store: store, p_id: id }));
  },
  async managementLocations(store: string) {
    return result<{ branches: Branch[]; registers: Register[] }>(supabase.rpc('retail_management_locations', { p_store: store }));
  },
  async createTransfer(store: string, fromBranch: string, toBranch: string, items: StockTransferItem[], notes: string, requestId?: string): Promise<string> {
    if (!fromBranch || !toBranch || fromBranch === toBranch) throw new Error('Elegí sucursales de origen y destino diferentes.');
    return result<string>(supabase.rpc('retail_create_transfer', {
      p_store: store, p_from_branch: fromBranch, p_to_branch: toBranch, p_items: items, p_notes: notes.trim() || null, p_request: requestId || randomUUID(),
    }));
  },
  async setDepot(store: string, enabled: boolean) {
    return result(supabase.rpc('retail_set_depot', { p_store: store, p_enabled: enabled }));
  },
  async depotOperation(store: string, product: string, quantity: number, action: DepotAction, request: string, cost?: number, note?: string, stockBranch?: string) {
    return result<string>(supabase.rpc(stockBranch ? 'retail_depot_operation_at_branch' : 'retail_depot_operation', {
      ...(stockBranch ? { p_branch: stockBranch } : {}),
      p_store: store, p_product: product, p_quantity: quantity, p_action: action, p_request: request,
      p_cost: cost ?? null, p_note: note?.trim() || null,
    }));
  },
  async depotMovements(store: string, product: string): Promise<DepotMovement[]> {
    return result<DepotMovement[]>(supabase.from('retail_depot_movements')
      .select('id,product_id,product_name,action,quantity,total_after,depot_after,actor_email,created_at')
      .eq('store_id', store).eq('product_id', product).order('created_at', { ascending: false }).order('id').limit(30));
  },
  async confirmTransfer(store: string, transferId: string): Promise<string> {
    return result<string>(supabase.rpc('retail_confirm_transfer', { p_store: store, p_transfer_id: transferId }));
  },
  async cancelTransfer(store: string, transferId: string): Promise<string> {
    return result<string>(supabase.rpc('retail_cancel_transfer', { p_store: store, p_transfer_id: transferId }));
  },
  async stockTransfers(store: string): Promise<StockTransfer[]> {
    return allRows<StockTransfer>((from, to) => supabase.from('retail_stock_transfers').select('*').eq('store_id', store).order('created_at', { ascending: false }).order('id').range(from, to));
  },
};
