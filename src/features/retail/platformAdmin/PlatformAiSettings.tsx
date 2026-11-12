import { useEffect, useState } from 'react';
import { askConfirm } from '../../../components/ConfirmHost';
import { NumberInput } from '../../../components/NumberInput';
import { supabase } from '../../../lib/supabase';
import { Feedback, number, readError, usePlatformData } from '../platformShared';
import type { Run } from '../managementTypes';

// Límites de IA: generales y por comercio.
const tokensDraft = (value: number | null | undefined) => value === null || value === undefined ? '' : String(value);
const tokensValue = (draft: string) => draft.trim() === '' ? null : Math.round(Number(draft));
const validTokens = (draft: string) => draft.trim() === '' || (Number.isFinite(Number(draft)) && Number(draft) >= 0 && Number(draft) <= 100000000);

/** Corte general y cupo diario por comercio. Lo aplica el servidor de IA (ai-proxy) en cada consulta. */
export function AiSettingsCard({ active, run, busy }: { active: boolean; run: Run; busy: boolean }) {
  const settings = usePlatformData<{ enabled: boolean; default_daily_tokens: number | null; overrides: { store_id: string; name: string; enabled: boolean; daily_tokens: number | null; used_today: number }[] }>('retail_admin_ai_settings', {}, active);
  const [enabled, setEnabled] = useState(true);
  const [cap, setCap] = useState('');
  const [capError, setCapError] = useState('');
  const s = settings.data;
  useEffect(() => { if (s) { setEnabled(s.enabled); setCap(tokensDraft(s.default_daily_tokens)); } }, [s]);
  const save = async () => {
    if (!validTokens(cap)) { setCapError('Escribí un cupo entre 0 y 100.000.000 tokens, o dejalo vacío para no limitar.'); document.getElementById('platform-ai-cap')?.focus(); return; }
    setCapError('');
    if (s?.enabled && !enabled && !await askConfirm('¿Pausar la IA para todos los comercios? Lo demás de la app sigue funcionando.')) return;
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_save_ai_settings', { p_enabled: enabled, p_default_daily_tokens: tokensValue(cap) });
      if (error) throw new Error(readError(error));
    }, 'Configuración de IA guardada');
    if (ok) void settings.reload();
  };
  return <form className="platform-card platform-note" aria-labelledby="platform-ai-settings-title" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <h4 id="platform-ai-settings-title">Control de la IA</h4>
    <p className="platform-muted">Se aplica cuando la app usa el servidor de IA (sin VITE_GROQ_API_KEY). Cada comercio puede tener su propio cupo desde su detalle.</p>
    <Feedback loading={settings.loading && !s} error={settings.error} />
    {s && <>
      <label className="platform-check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
        <span><strong>IA activa para todos los comercios</strong><small>Sin marcar, ninguna herramienta de IA responde. Vender, cobrar y guardar siguen igual.</small></span></label>
      <label className="platform-field">Cupo diario por comercio (tokens, vacío = sin límite)
        <NumberInput id="platform-ai-cap" value={cap} onValueChange={setCap} min={0} step={1} inputMode="numeric" placeholder="Sin límite"
          aria-invalid={capError ? true : undefined} aria-describedby={capError ? 'platform-ai-cap-error' : undefined} /></label>
      {capError && <p id="platform-ai-cap-error" role="alert" className="error-banner">{capError}</p>}
      <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy || (enabled === s.enabled && cap === tokensDraft(s.default_daily_tokens))}>Guardar</button></div>
      {s.overrides.length > 0 && <details className="platform-history"><summary>Comercios con configuración propia ({s.overrides.length})</summary>
        <ul className="platform-plain-list">{s.overrides.map(item => <li key={item.store_id}><strong>{item.name}</strong>
          <small> · {item.enabled ? item.daily_tokens === null ? 'sin límite' : `cupo ${number(item.daily_tokens)} tokens` : 'IA deshabilitada'} · hoy {number(item.used_today)}</small></li>)}</ul>
      </details>}
    </>}
  </form>;
}

export function StoreAiLimit({ storeId, run, busy }: { storeId: string; run: Run; busy: boolean }) {
  const limit = usePlatformData<{ custom: boolean; enabled: boolean; daily_tokens: number | null; default_daily_tokens: number | null; global_enabled: boolean; used_today: number }>('retail_admin_store_ai_limit', { p_store: storeId }, true);
  const [custom, setCustom] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [cap, setCap] = useState('');
  const [capError, setCapError] = useState('');
  const l = limit.data;
  useEffect(() => { if (l) { setCustom(l.custom); setEnabled(l.enabled); setCap(tokensDraft(l.daily_tokens)); } }, [l]);
  const changed = l && (custom !== l.custom || (custom && (enabled !== l.enabled || cap !== tokensDraft(l.daily_tokens))));
  const save = async () => {
    if (custom && !validTokens(cap)) { setCapError('Escribí un cupo entre 0 y 100.000.000 tokens, o dejalo vacío para no limitar.'); document.getElementById('platform-store-ai-cap')?.focus(); return; }
    setCapError('');
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_save_store_ai_limit', { p_store: storeId, p_custom: custom, p_enabled: enabled, p_daily_tokens: tokensValue(cap) });
      if (error) throw new Error(readError(error));
    }, 'IA del comercio guardada');
    if (ok) void limit.reload();
  };
  const general = l ? `${l.global_enabled ? 'IA activa' : 'IA pausada para todos'} · ${l.default_daily_tokens === null ? 'sin límite diario' : `cupo general ${number(l.default_daily_tokens)} tokens`}` : '';
  return <form className="platform-card platform-note" aria-labelledby="platform-store-ai-limit-title" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <h4 id="platform-store-ai-limit-title">IA de este comercio</h4>
    <Feedback loading={limit.loading && !l} error={limit.error} />
    {l && <>
      <p className="platform-muted">Usó {number(l.used_today)} tokens hoy. Configuración general: {general}.</p>
      <label className="platform-check"><input type="checkbox" checked={custom} onChange={event => setCustom(event.target.checked)} />
        <span><strong>Configuración propia</strong><small>Sin marcar, sigue la configuración general.</small></span></label>
      {custom && <>
        <label className="platform-check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
          <span><strong>IA habilitada</strong><small>Sin marcar, sus herramientas de IA no responden. El resto de la app funciona igual.</small></span></label>
        <label className="platform-field">Cupo diario (tokens, vacío = sin límite)
          <NumberInput id="platform-store-ai-cap" value={cap} onValueChange={setCap} min={0} step={1} inputMode="numeric" placeholder="Sin límite" disabled={!enabled}
            aria-invalid={capError ? true : undefined} aria-describedby={capError ? 'platform-store-ai-cap-error' : undefined} /></label>
        {capError && <p id="platform-store-ai-cap-error" role="alert" className="error-banner">{capError}</p>}
      </>}
      <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy || !changed}>Guardar</button></div>
    </>}
  </form>;
}
