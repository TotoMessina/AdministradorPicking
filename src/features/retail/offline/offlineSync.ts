import { supabase } from '../../../lib/supabase';
import { reportSyncConflict } from '../../../lib/errorReporting';
import type { KioscoSale } from '../../../types/kiosco';
import type { Shift } from '../api';
import { type PendingOperation, event, transaction } from './offlineStore';
import { activeUser, offlineSupported, backgroundAuth } from './offlineSession';
import { reads, backgroundRead } from './offlineReads';
import { put } from './offlineLocal';

// Estado, copia de seguridad y envío de la cola de operaciones pendientes.
let syncing = false;
export async function offlineStatus() {
  if (!activeUser || !offlineSupported()) return { queue: [] as PendingOperation[], supported: offlineSupported(), syncing };
  const queue = await transaction(activeUser, s => s.queue);
  return { queue, supported: true, syncing };
}
export async function exportOfflineBackup() {
  if (!activeUser) return;
  const data = await transaction(activeUser, state => ({ version: 1, user: activeUser, exportedAt: new Date().toISOString(), operations: state.queue }));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `operaciones-pendientes-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function syncOffline() {
  const user = activeUser;
  if (!user || !offlineSupported() || syncing || navigator.onLine === false) return;
  const hasQueue = await transaction(user, s => s.queue.length > 0);
  if (!hasQueue) return;
  syncing = true; event();
  let syncedAny = false;
  try {
    // Serial server receipts make concurrent tabs/retries harmless; the local snapshot
    // is reconciled by operation ID after the transaction has committed remotely.
    for (;;) {
      if (activeUser !== user || !navigator.onLine) break;
      const entry = await transaction(user, s => s.queue[0]);
      if (!entry || entry.error) break;
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id !== user) break;
      await backgroundAuth(session.session);
      const { data, error } = await supabase.rpc('retail_sync_operation', { p_operation: entry.operation }).setHeader('Authorization', `Bearer ${session.session.access_token}`);
      if (error) {
        // Transport failures stay retryable. Business/authorization failures are explicit conflicts.
        // RS001: comercio suspendido. La operación queda pendiente, sin error, y se envía al reactivarlo.
        if (error.code && !['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003', 'RS001'].includes(error.code)) {
          reportSyncConflict(entry.operation.kind, error.code);
          await transaction(user, s => { const current = s.queue.find(q => q.operation.id === entry.operation.id); if (current) current.error = entry.operation.kind === 'close_details' && error.message === 'Operación no admitida'
            ? 'Falta actualizar el cierre con billetes en Supabase. Aplicá schema.sql con 202610240001_shift_closing_details.sql y reintentá. El cierre y su detalle siguen guardados en este dispositivo.' : error.message; }, true);
        }
        break;
      }
      syncedAny = true;
      await transaction(user, s => {
        s.revision++;
        s.queue = s.queue.filter(q => q.operation.id !== entry.operation.id);
        if (entry.operation.kind === 'sale') for (const [k, value] of Object.entries(s.cache)) {
          if (Array.isArray(value) && ['sales', 'allSales'].includes(JSON.parse(k)[0])) {
            s.cache[k] = (value as KioscoSale[]).map(sale => sale.id === entry.operation.id ? { ...sale, ticketNumber: data.ticketNumber, syncStatus: 'synced' } : sale);
          }
        }
        if (['close', 'close_details'].includes(entry.operation.kind) && Number.isInteger(data.ticketCount)) {
          put(s, 'shiftTicketCount', [entry.operation.shift], data.ticketCount);
          for (const [cacheKey, value] of Object.entries(s.cache)) if (JSON.parse(cacheKey)[0] === 'shifts' && Array.isArray(value))
            (value as Shift[]).forEach(shift => { if (shift.id === entry.operation.shift) shift.ticket_count = data.ticketCount; });
        }
      }, true);
      event();
    }
    const state = await transaction(user, s => s);
    if (syncedAny && !state.queue.length && activeUser === user) for (const k of Object.keys(state.cache)) {
      // Movimientos y saldo se releen siempre: el servidor les asigna datos propios (número de recibo) al sincronizar.
      const [method, args] = JSON.parse(k); if (reads.has(method)) backgroundRead(user, method, args, method === 'movements' || method === 'shiftBalance');
    }
  } catch { /* Durable queue remains intact; online event/timer/manual retry resumes. */ }
  finally { syncing = false; event(); }
}
export async function retryOffline() {
  if (!activeUser || !offlineSupported()) return;
  await transaction(activeUser, s => { s.queue.forEach(q => delete q.error); }, true);
  await syncOffline();
}
