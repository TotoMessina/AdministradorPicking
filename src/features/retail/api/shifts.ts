import { supabase, isValidUUID } from '../../../lib/supabase';
import { randomUUID } from '../../../utils/uuid';
import { closingCashDenominations, type CashDenominations } from '../../../services/cashDenominations';
import { syncOffline } from '../offline';
import { onboarding } from '../onboarding';
import { movementDetails, VOUCHER_BUCKET, voucherExtension, voucherMimeType, voucherPath, voucherReference } from '../vouchers';
import type { Shift, Movement } from './types';
import { result, allRows } from './request';

/** Turnos de caja, movimientos y comprobantes de movimientos. */
export const shiftsApi = {
  async shifts(store: string) {
    const [opened, closed] = await Promise.all([
      result<Shift[]>(
        supabase
          .from("retail_shifts")
          .select("*")
          .eq("store_id", store)
          .is("closed_at", null)
          .order("opened_at", { ascending: false }),
      ),
      result<Shift[]>(
        supabase
          .from("retail_shifts")
          .select("*")
          .eq("store_id", store)
          .not("closed_at", "is", null)
          .order("closed_at", { ascending: false })
          .limit(200),
      ),
    ]);
    return [...opened, ...closed];
  },
  async movements(store: string, shift: string) {
    const rows = await allRows<Movement>((from, to) =>
      supabase
        .rpc('retail_movement_details', { p_store: store, p_shift: shift })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    return rows.map(row => ({ ...row, store_id: store, shift_id: shift }));
  },
  async shiftBalance(shift: string) {
    return Number(await result<number>(supabase.rpc('retail_shift_balance', { p_shift: shift })));
  },
  async shiftTicketCount(shift: string) {
    return Number(await result<number>(supabase.rpc('retail_shift_ticket_count', { p_shift: shift })));
  },
  async openShift(store: string, register: string, opening: number) {
    return result<string>(
      supabase.rpc("retail_open_shift", {
        p_store: store,
        p_register: register,
        p_opening: opening,
      }),
    );
  },
  async openOnboardingShift(store: string, register: string, opening: number) {
    await syncOffline();
    return onboarding.open(store, register, opening);
  },
  async closeShift(shift: string, counted: number, denominations?: CashDenominations | null) {
    const detail = closingCashDenominations(denominations, counted);
    return result<number>(
      supabase.rpc("retail_close_shift", {
        p_shift: shift,
        p_counted: counted,
        ...(detail ? { p_denominations: detail } : {}),
      }),
    );
  },
  async addMovement(
    shift: string,
    type: string,
    amount: number,
    reason: string,
    request: string,
    category = 'general',
    voucherUrl?: string | null,
    supplierName?: string | null,
  ) {
    const details = movementDetails(type, category, voucherUrl, supplierName);
    return result(
      supabase.rpc("retail_add_movement", {
        p_shift: shift,
        p_type: type,
        p_amount: amount,
        p_reason: reason,
        p_request: request,
        p_category: details.category,
        p_voucher_url: details.voucherUrl,
        p_supplier_name: details.supplierName,
      }),
    );
  },
  async uploadVoucher(store: string, shiftId: string, file: File): Promise<string> {
    const extension = voucherExtension(file);
    if (!isValidUUID(store) || !isValidUUID(shiftId)) throw new Error('Comercio o turno inválido.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Necesitás conexión para subir el comprobante. Conservá el archivo y reintentá cuando vuelva internet.');
    await syncOffline();
    const shift = await result<{ id: string } | null>(supabase.from('retail_shifts').select('id').eq('id', shiftId).eq('store_id', store).is('closed_at', null).maybeSingle());
    if (!shift) throw new Error('El turno no está disponible en el servidor. Sincronizá o actualizá el turno y reintentá.');
    const path = `${store}/${shiftId}/${randomUUID()}.${extension}`;
    await result(supabase.storage.from(VOUCHER_BUCKET).upload(path, file, { contentType: voucherMimeType(file), upsert: false, cacheControl: '0' }));
    return voucherReference(path);
  },
  async getVoucherUrl(store: string, shiftId: string, reference: string): Promise<string> {
    const path = voucherPath(store, shiftId, reference);
    // Storage SELECT policy authorizes managers only, including when called outside the UI.
    const signed = await result<{ signedUrl: string }>(supabase.storage.from(VOUCHER_BUCKET).createSignedUrl(path, 60));
    return signed.signedUrl;
  },
  /** Turnos abiertos del comercio, para elegir de cuál sale el efectivo. No incluye importes de caja. */
  async openShifts(storeId: string): Promise<{ id: string; label: string }[]> {
    const [shifts, registers] = await Promise.all([
      result<{ id: string; register_id: string; opened_at: string }[]>(supabase.from("retail_shifts").select("id,register_id,opened_at").eq("store_id", storeId).is("closed_at", null).order("opened_at", { ascending: false })),
      result<{ id: string; name: string }[]>(supabase.from("retail_registers").select("id,name").eq("store_id", storeId)),
    ]);
    return shifts.map((shift) => ({ id: shift.id, label: `${registers.find((register) => register.id === shift.register_id)?.name ?? 'Caja'} · abierto el ${new Date(shift.opened_at).toLocaleDateString('es-AR')}` }));
  },
};
