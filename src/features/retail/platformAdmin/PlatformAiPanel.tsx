import { RefreshCw } from 'lucide-react';
import { date, dateTime, Feedback, number, Stat, usePlatformData } from '../platformShared';
import type { Run } from '../managementTypes';
import { type AiUsage, features } from './platformTypes';
import { UsageBars } from './PlatformSummary';
import { AiSettingsCard } from './PlatformAiSettings';

// Uso de IA por comercio y configuración.
export function AiPanel({ days, active, run, busy }: { days: number; active: boolean; run: Run; busy: boolean }) {
  const usage = usePlatformData<AiUsage>('retail_admin_ai_usage', { p_days: days }, active);
  const u = usage.data;
  const maxDay = Math.max(1, ...(u?.by_day || []).map(day => day.tokens));
  return <div className="platform-stack">
    <div className="platform-toolbar">
      <p className="platform-muted">Con el servidor de IA, el uso lo registra el servidor en cada consulta. Si la app todavía tiene VITE_GROQ_API_KEY, lo informa cada dispositivo y es orientativo.</p>
      <button type="button" className="secondary-button" disabled={usage.loading} onClick={() => void usage.reload()}><RefreshCw size={15} /> Actualizar</button>
    </div>
    <AiSettingsCard active={active} run={run} busy={busy} />
    <Feedback loading={usage.loading && !u} error={usage.error} />
    {u && <>
      <div className="platform-stats">
        <Stat label="Consultas" value={number(u.requests)} detail={`${number(u.users)} usuarios`} />
        <Stat label="Tokens enviados" value={number(u.prompt_tokens)} />
        <Stat label="Tokens recibidos" value={number(u.completion_tokens)} />
        <Stat label="Con error" value={number(u.errors)} detail={u.requests ? `${Math.round((u.errors / u.requests) * 100)}% de las consultas` : undefined} />
      </div>
      <section className="platform-card" aria-labelledby="platform-ai-days-title">
        <h4 id="platform-ai-days-title">Tokens por día</h4>
        {u.by_day.length ? <ol className="platform-days">{u.by_day.map(day => <li key={day.day}>
          <span className="platform-day-bar" aria-hidden="true"><span style={{ height: `${Math.max(2, (day.tokens / maxDay) * 100)}%` }} /></span>
          <span className="sr-only">{date(`${day.day}T12:00:00`)}: {number(day.tokens)} tokens, {number(day.requests)} consultas, {number(day.errors)} con error</span>
          <small aria-hidden="true">{day.day.slice(8, 10)}/{day.day.slice(5, 7)}</small>
        </li>)}</ol> : <p className="platform-muted">Sin uso registrado en el período.</p>}
      </section>
      <div className="platform-columns">
        <section className="platform-card"><h4>Por comercio (los 20 de más uso)</h4>
          <UsageBars label="Comercio" rows={u.by_store.map(row => ({ ...row, name: row.name }))} /></section>
        <section className="platform-card"><h4>Por pantalla</h4>
          <UsageBars label="Pantalla" rows={u.by_feature.map(row => ({ ...row, name: features[row.feature] || row.feature }))} /></section>
      </div>
      <section className="platform-card"><h4>Por modelo</h4>
        <UsageBars label="Modelo" rows={u.by_model.map(row => ({ ...row, name: row.model }))} /></section>
      <section className="platform-card" aria-labelledby="platform-ai-errors-title">
        <h4 id="platform-ai-errors-title">Últimos errores</h4>
        {u.recent_errors.length ? <ul className="platform-plain-list">{u.recent_errors.map((item, index) => <li key={`${item.created_at}-${index}`}>
          <strong>{item.error_code || 'Sin código'}</strong><small> · {dateTime(item.created_at)} · {item.store || 'Sin comercio'} · {features[item.feature] || item.feature} · {item.model}</small>
        </li>)}</ul> : <p className="platform-muted">Sin errores en el período.</p>}
      </section>
    </>}
  </div>;
}
