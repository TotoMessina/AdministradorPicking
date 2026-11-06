import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { NumberInput } from '../../components/NumberInput';
import type { Run } from './managementTypes';
import { supabase } from '../../lib/supabase';
import { errorMessage } from './api';

// Piezas comunes del panel de plataforma.
export const number = (value: number) => Number(value || 0).toLocaleString('es-AR');
export const money = (value: number) => Number(value || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const date = (value: string | null) => value ? new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const readError = (error: unknown) => {
  const message = errorMessage(error);
  if (/retail_admin_(delete_campaign|delete_announcement|purge_ended)/.test(message)) return 'Falta aplicar la actualización 202611060008_delete_campaigns_and_notices.sql en Supabase.';
  if (/retail_admin_(advertisers|save_advertiser|campaigns?|save_campaign|set_campaign_paused)/.test(message) || /ads_free|p_ads_free/.test(message)) return 'Falta aplicar la actualización 202611060007_advertising.sql en Supabase.';
  if (/retail_admin_(announcement|send_announcement|announcements|cancel_announcement)/.test(message)) return 'Falta aplicar la actualización 202611060005_platform_announcements.sql en Supabase.';
  if (/retail_admin_(plans|save_plan|billing_|save_billing|store_subscription|set_store_plan|record_payment)|retail_my_subscription/.test(message)) return 'Falta aplicar la actualización 202611060004_plans_and_subscriptions.sql en Supabase.';
  if (/retail_admin_(save_)?(store_)?ai_(settings|limit)/.test(message)) return 'Falta aplicar la actualización 202611060003_ai_server_limits.sql en Supabase.';
  if (/retail_admin_(suspend|reactivate)_store/.test(message)) return 'Falta aplicar la actualización 202611060002_store_suspension.sql en Supabase.';
  return /retail_admin_|retail_log_ai_usage|schema cache|PGRST202/.test(message) ? 'Falta aplicar la actualización 202611060001_platform_admin_panel.sql en Supabase.' : message;
};

/** Lee una función del panel cuando la vista está activa. La base valida en cada llamada que sea administrador de plataforma. */
export function usePlatformData<T>(fn: string, args: Record<string, unknown>, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(args);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    const { data: result, error: rpcError } = await supabase.rpc(fn, JSON.parse(key));
    if (id !== request.current) return;
    if (rpcError) setError(readError(rpcError)); else { setData(result as T); setError(''); }
    setLoading(false);
  }, [fn, key]);
  useEffect(() => { if (enabled) void load(); }, [enabled, load]);
  return { data, error, loading, reload: load };
}

export function Feedback({ loading, error }: { loading: boolean; error: string }) {
  return <>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && <p role="status" className="platform-muted"><Loader2 size={15} className="spin" /> Cargando…</p>}
  </>;
}

export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="platform-stat"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

/** Borra imágenes de publicidad que quedaron sin uso. Si falla, quedan en el bucket sin afectar a la app. */
export const removeAdImages = async (paths: unknown) => {
  const list = Array.isArray(paths) ? paths.filter((path): path is string => typeof path === 'string') : [];
  if (list.length) await supabase.storage.from('retail-ads').remove(list).then(() => undefined, () => undefined);
};

/** Limpieza de lo terminado: primero cuenta, después pide confirmación y borra. */
export function PurgeEnded({ kind, run, busy, onDone }: { kind: 'campaigns' | 'announcements'; run: Run; busy: boolean; onDone: () => void }) {
  const [days, setDays] = useState('30');
  const [error, setError] = useState('');
  const what = kind === 'campaigns' ? { plural: 'campañas terminadas', detail: 'con sus vistas, contactos e imágenes sin uso' } : { plural: 'avisos vencidos o cancelados', detail: 'con sus lecturas y envíos push' };
  const purge = async () => {
    const span = Math.round(Number(days));
    if (days.trim() === '' || !Number.isFinite(span) || span < 0 || span > 3650) { setError('Indicá desde hace cuántos días, de 0 a 3.650.'); return; }
    setError('');
    const { data: preview, error: previewError } = await supabase.rpc('retail_admin_purge_ended', { p_kind: kind, p_days: span, p_preview: true });
    if (previewError) { setError(readError(previewError)); return; }
    const total = Number((preview as { count?: number })?.count || 0);
    if (!total) { setError(`No hay ${what.plural} hace más de ${span} días.`); return; }
    if (!await askConfirm(`¿Eliminar ${number(total)} ${what.plural} hace más de ${span} días, ${what.detail}? No se puede deshacer.`)) return;
    const ok = await run(async () => {
      const { data, error: rpcError } = await supabase.rpc('retail_admin_purge_ended', { p_kind: kind, p_days: span, p_preview: false });
      if (rpcError) throw new Error(readError(rpcError));
      await removeAdImages((data as { images?: unknown })?.images);
    }, 'Limpieza hecha');
    if (ok) onDone();
  };
  return <form className="platform-card platform-note" noValidate onSubmit={event => { event.preventDefault(); void purge(); }}>
    <h4>Limpiar {what.plural}</h4>
    <p className="platform-muted">Borra {what.plural} {what.detail}. Si algo se factura o se audita, descargá antes lo que necesites.</p>
    <div className="platform-fields">
      <label className="platform-field">Terminados hace más de (días)<NumberInput value={days} onValueChange={setDays} min={0} max={3650} step={1} inputMode="numeric" /></label>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="platform-form-actions"><button type="submit" className="danger-button" disabled={busy}><Trash2 size={15} /> Revisar y limpiar</button></div>
  </form>;
}
