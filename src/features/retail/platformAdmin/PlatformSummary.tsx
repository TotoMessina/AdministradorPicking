import { RefreshCw } from 'lucide-react';
import { date, Feedback, money, number, Stat, usePlatformData } from '../platformShared';
import type { Overview } from './platformTypes';

// Resumen general y barras de uso.
export function UsageBars({ rows, label }: { rows: { name: string; requests: number; tokens: number; errors: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map(row => row.tokens));
  if (!rows.length) return <p className="platform-muted">Sin uso registrado en el período.</p>;
  return <table className="platform-table platform-usage-table">
    <caption className="sr-only">{label}</caption>
    <thead><tr><th scope="col">{label}</th><th scope="col">Consultas</th><th scope="col">Tokens</th><th scope="col">Errores</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.name}>
      <th scope="row"><span>{row.name}</span><span className="platform-bar" aria-hidden="true"><span style={{ width: `${Math.max(2, (row.tokens / max) * 100)}%` }} /></span></th>
      <td>{number(row.requests)}</td><td>{number(row.tokens)}</td><td className={row.errors ? 'platform-danger' : undefined}>{number(row.errors)}</td>
    </tr>)}</tbody>
  </table>;
}

export function Summary({ days, active }: { days: number; active: boolean }) {
  const overview = usePlatformData<Overview>('retail_admin_overview', { p_days: days }, active);
  const admins = usePlatformData<{ email: string | null; note: string | null; created_at: string }[]>('retail_admin_platform_admins', {}, active);
  const o = overview.data;
  return <div className="platform-stack">
    <div className="platform-toolbar"><button type="button" className="secondary-button" disabled={overview.loading} onClick={() => { void overview.reload(); void admins.reload(); }}><RefreshCw size={15} /> Actualizar</button></div>
    <Feedback loading={overview.loading && !o} error={overview.error} />
    {o && <>
      <h3>Comercios y personas</h3>
      <div className="platform-stats">
        <Stat label="Comercios" value={number(o.stores)} detail={`${number(o.new_stores)} nuevos en ${days} días${o.suspended_stores ? ` · ${number(o.suspended_stores)} suspendidos` : ''}`} />
        <Stat label="Comercios con ventas" value={number(o.stores_with_sales)} detail={`en los últimos ${days} días`} />
        <Stat label="Usuarios" value={number(o.users)} detail={`${number(o.new_users)} nuevos · ${number(o.active_users)} ingresaron`} />
        <Stat label="Accesos a comercios" value={number(o.members)} detail="personas con rol en algún comercio" />
        <Stat label="Con facturación ARCA" value={number(o.billing_stores)} />
      </div>
      <h3>Actividad</h3>
      <div className="platform-stats">
        <Stat label="Ventas registradas" value={number(o.sales_count)} detail={`últimos ${days} días`} />
        <Stat label="Importe vendido" value={money(o.sales_total)} detail="todos los comercios, sin descontar devoluciones" />
        <Stat label="Productos activos" value={number(o.products)} />
        <Stat label="Consultas de IA" value={number(o.ai_requests)} detail={`${number(o.ai_tokens)} tokens · ${number(o.ai_errors)} con error`} />
        <Stat label="Catálogo global" value={number(o.catalog_total)} detail={`${number(o.catalog_pending)} sin verificar`} />
      </div>
    </>}
    <section className="platform-card" aria-labelledby="platform-admins-title">
      <h3 id="platform-admins-title">Administradores de plataforma</h3>
      <p className="platform-muted">Se agregan o quitan solo desde el SQL Editor de Supabase (tabla retail_private.platform_admins). La app no puede otorgar este permiso.</p>
      <Feedback loading={admins.loading && !admins.data} error={admins.error} />
      {admins.data && <ul className="platform-plain-list">{admins.data.map(admin => <li key={`${admin.email}-${admin.created_at}`}>
        <strong>{admin.email || 'Usuario eliminado'}</strong>{admin.note && <small> · {admin.note}</small>}<small> · desde {date(admin.created_at)}</small></li>)}</ul>}
    </section>
  </div>;
}
