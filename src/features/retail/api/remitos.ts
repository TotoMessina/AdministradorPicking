import { supabase, isValidUUID } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import { voucherMimeType } from '../vouchers';
import { REMITO_BUCKET, remitoExtension, remitoPath, remitoReference, type PendingReplenishment, type PendingReplenishmentItem } from '../remitos';
import { result, allRows } from './request';

/** Remitos: fotos y reposiciones pendientes de aprobar. */
export const remitosApi = {
  async uploadRemito(store: string, file: File): Promise<string> {
    const extension = remitoExtension(file);
    if (!isValidUUID(store)) throw new Error('Comercio inválido.');
    if (navigator.onLine === false) throw new Error('Necesitás conexión para enviar la foto. El borrador sigue en esta pantalla.');
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Iniciá sesión antes de enviar el remito.');
    const path = `${store}/${data.user.id}/${randomUUID()}.${extension}`;
    await result(supabase.storage.from(REMITO_BUCKET).upload(path, file, { contentType: voucherMimeType(file), upsert: false, cacheControl: '0' }));
    return remitoReference(path);
  },
  async getRemitoUrl(store: string, reference: string): Promise<string> {
    const path = remitoPath(store, reference);
    const signed = await result<{ signedUrl: string }>(supabase.storage.from(REMITO_BUCKET).createSignedUrl(path, 300));
    return signed.signedUrl;
  },
  async submitPendingReplenishment(store: string, branchId: string | null, imageUrl: string, extractedText: string | null, items: PendingReplenishmentItem[], notes: string): Promise<string> {
    remitoPath(store, imageUrl);
    return result<string>(supabase.rpc('retail_submit_pending_replenishment', {
      p_store: store, p_branch: branchId || null, p_image_url: imageUrl, p_extracted_text: extractedText || null, p_items: items, p_notes: notes.trim() || null,
    }));
  },
  async approvePendingReplenishment(store: string, id: string, items?: PendingReplenishmentItem[], branchId?: string): Promise<string> {
    if (branchId) return result<string>(supabase.rpc('retail_approve_replenishment_at_branch', { p_store: store, p_id: id, p_items: items ?? null, p_branch: branchId }));
    return result<string>(supabase.rpc('retail_approve_replenishment', { p_store: store, p_id: id, p_items: items ?? null }));
  },
  async rejectPendingReplenishment(store: string, id: string, reason: string): Promise<string> {
    return result<string>(supabase.rpc('retail_reject_replenishment', { p_store: store, p_id: id, p_reason: reason.trim() }));
  },
  async pendingReplenishments(store: string): Promise<PendingReplenishment[]> {
    return allRows<PendingReplenishment>((from, to) => supabase.from('retail_pending_replenishments').select('*').eq('store_id', store).eq('status', 'pending').order('submitted_at').order('id').range(from, to));
  },
};
