import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, Ban, RefreshCw, RotateCcw } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { NumberInput } from '../../components/NumberInput';
import { supabase } from '../../lib/supabase';
import { date, dateTime, Feedback, money, number, readError, Stat, usePlatformData } from './platformShared';
import { PlatformBilling, StoreSubscription, subscriptionStatus } from './PlatformBilling';
import { PlatformNotices } from './PlatformNotices';
import { PlatformAds } from './PlatformAds';
import { SectionNav } from './SectionNav';
import { GlobalCatalog } from './GlobalCatalog';
import type { Run } from './managementTypes';
import './platform-admin.css';

type View = 'summary' | 'stores' | 'billing' | 'notices' | 'ads' | 'users' | 'ai' | 'catalog';
type Status = 'prueba' | 'activo' | 'atencion' | 'baja';
interface Overview {
  stores: number; new_stores: number; suspended_stores?: number; stores_with_sales: number; users: number; new_users: number; active_users: number; members: number;
  sales_count: number; sales_total: number; products: number; billing_stores: number; ai_requests: number; ai_errors: number; ai_tokens: number;
  catalog_total: number; catalog_pending: number; platform_admins: number;
}
interface StoreRow {
  id: string; name: string; created_at: string; owner_email: string | null; members: number; branches: number; products: number;
  sales_count: number; sales_total: number; last_sale_at: string | null; ai_requests: number; ai_tokens: number; billing_enabled: boolean; status: Status; note: string; suspended_at: string | null; plan_name?: string | null; subscription_status?: string | null;
}
interface Usage { requests: number; tokens: number; errors: number }
interface StoreDetail {
  id: string; name: string; address: string; phone: string; created_at: string; owner_email: string | null; billing_enabled: boolean;
  branch_inventory_enabled: boolean; depot_enabled: boolean; status: Status; note: string; note_updated_at: string | null;
  members: { email: string; role: string; last_sign_in_at: string | null }[]; invitations: number; branches: { name: string; is_default: boolean }[];
  registers: number; products: number; open_shifts: number; sales_count: number; sales_total: number; last_sale_at: string | null;
  ai_by_feature: (Usage & { feature: string })[];
  suspension: { reason: string; suspended_at: string; by: string | null } | null;
  suspension_log: { action: 'suspend' | 'reactivate'; reason: string | null; created_at: string; by: string | null }[];
}
interface UserRow {
  user_id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean;
  stores: { id: string; name: string; role: string }[]; is_platform_admin: boolean;
}
interface AiUsage {
  requests: number; errors: number; prompt_tokens: number; completion_tokens: number; users: number;
  by_day: (Usage & { day: string })[]; by_feature: (Usage & { feature: string })[]; by_model: (Usage & { model: string })[];
  by_store: (Usage & { store_id: string | null; name: string })[];
  recent_errors: { created_at: string; store: string | null; feature: string; model: string; error_code: string | null }[];
}

const statuses: Record<Status, string> = { prueba: 'En prueba', activo: 'Activo', atencion: 'Requiere atención', baja: 'Dado de baja' };
const roles: Record<string, string> = { owner: 'Dueño', admin: 'Administrador', supervisor: 'Supervisor', cashier: 'Cajero' };
const features: Record<string, string> = {
  home: 'Inicio', pos: 'Vender', cash: 'Caja', catalog: 'Productos y stock', suppliers: 'Proveedores y facturas', finance: 'Ganancias',
  customers: 'Clientes', settings: 'Mi comercio', ai: 'Asistente', remito: 'Remito', otro: 'Otra pantalla',
};

function UsageBars({ rows, label }: { rows: { name: string; requests: number; tokens: number; errors: number }[]; label: string }) {
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

function Summary({ days, active }: { days: number; active: boolean }) {
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

function StoreDetailView({ storeId, days, run, busy, onBack, onSaved }: { storeId: string; days: number; run: Run; busy: boolean; onBack: () => void; onSaved: () => void }) {
  const detail = usePlatformData<StoreDetail>('retail_admin_store_detail', { p_store: storeId, p_days: days }, true);
  const [status, setStatus] = useState<Status>('activo');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const d = detail.data;
  useEffect(() => { if (d) { setStatus(d.status); setNote(d.note); } }, [d]);
  const loadedId = d?.id;
  useEffect(() => { if (loadedId) requestAnimationFrame(() => title.current?.focus()); }, [loadedId]);
  const save = async () => {
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_save_store_note', { p_store: storeId, p_status: status, p_note: note });
      if (error) throw new Error(readError(error));
    }, 'Seguimiento guardado');
    if (ok) { void detail.reload(); onSaved(); }
  };
  const suspend = async () => {
    if (!d) return;
    if (!reason.trim()) { setReasonError('Escribí el motivo: lo ven las personas del comercio.'); document.getElementById('platform-suspend-reason')?.focus(); return; }
    setReasonError('');
    if (!await askConfirm(`¿Suspender «${d.name}»? Nadie del comercio podrá entrar ni vender hasta que lo reactives. Los datos no se borran.`)) return;
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_suspend_store', { p_store: storeId, p_reason: reason.trim() });
      if (error) throw new Error(readError(error));
    }, 'Comercio suspendido');
    if (ok) { setReason(''); void detail.reload(); onSaved(); }
  };
  const reactivate = async () => {
    if (!d || !await askConfirm(`¿Reactivar «${d.name}»? Sus personas vuelven a tener el acceso que tenían.`)) return;
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_reactivate_store', { p_store: storeId });
      if (error) throw new Error(readError(error));
    }, 'Comercio reactivado');
    if (ok) { void detail.reload(); onSaved(); }
  };
  return <div className="platform-stack">
    <div className="platform-toolbar"><button type="button" className="secondary-button" onClick={onBack}><ArrowLeft size={15} /> Volver a comercios</button></div>
    <Feedback loading={detail.loading && !d} error={detail.error} />
    {d && <>
      <div>
        <h3 ref={title} tabIndex={-1} className="platform-detail-title">{d.name}</h3>
        <p className="platform-muted">Dueño: {d.owner_email || '—'} · Alta {date(d.created_at)}{d.address ? ` · ${d.address}` : ''}{d.phone ? ` · ${d.phone}` : ''}</p>
        <p className="platform-muted platform-id">ID {d.id}</p>
      </div>
      {d.suspension && <p role="status" className="platform-suspended-banner"><Ban size={15} aria-hidden="true" /> Suspendido desde el {dateTime(d.suspension.suspended_at)}{d.suspension.by ? ` por ${d.suspension.by}` : ''}. Motivo: {d.suspension.reason}</p>}
      <div className="platform-stats">
        <Stat label="Ventas" value={number(d.sales_count)} detail={`${money(d.sales_total)} en ${days} días`} />
        <Stat label="Última venta" value={date(d.last_sale_at)} />
        <Stat label="Productos activos" value={number(d.products)} />
        <Stat label="Cajas activas" value={number(d.registers)} detail={`${number(d.open_shifts)} turnos abiertos`} />
        <Stat label="Opciones" value={d.billing_enabled ? 'Factura ARCA' : 'Sin ARCA'} detail={`${d.branch_inventory_enabled ? 'Stock por sucursal' : 'Stock compartido'} · ${d.depot_enabled ? 'con depósito' : 'sin depósito'}`} />
      </div>
      <form className="platform-card platform-note" onSubmit={event => { event.preventDefault(); void save(); }}>
        <h4>Seguimiento interno</h4>
        <p className="platform-muted">Solo lo ven los administradores de plataforma. No bloquea ni habilita nada en el comercio.</p>
        <label>Estado<select value={status} onChange={event => setStatus(event.target.value as Status)}>
          {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Nota<textarea rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Plan, acuerdos, contacto, pendientes de soporte…" /></label>
        {d.note_updated_at && <small className="platform-muted">Última actualización: {dateTime(d.note_updated_at)}</small>}
        <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy || (status === d.status && note === d.note)}>Guardar seguimiento</button></div>
      </form>
      <section className="platform-card" aria-labelledby="platform-access-title">
        <h4 id="platform-access-title">Acceso al comercio</h4>
        {d.suspension ? <>
          <p className="platform-muted">Nadie del comercio puede entrar ni operar. Las ventas guardadas sin conexión quedan pendientes en sus dispositivos y se envían al reactivar.</p>
          <div className="platform-form-actions"><button type="button" className="primary-button" disabled={busy} onClick={() => void reactivate()}><RotateCcw size={15} /> Reactivar comercio</button></div>
        </> : <>
          <p className="platform-muted">Suspender bloquea la entrada y todas las operaciones de sus personas, sin borrar datos. Los administradores de plataforma siguen pudiendo entrar.</p>
          <label className="platform-field">Motivo (lo ven las personas del comercio)<input id="platform-suspend-reason" value={reason} maxLength={300} autoComplete="off"
            aria-invalid={reasonError ? true : undefined} aria-describedby={reasonError ? 'platform-suspend-error' : undefined} onChange={event => setReason(event.target.value)} placeholder="Ej.: falta de pago del abono de octubre" /></label>
          {reasonError && <p id="platform-suspend-error" role="alert" className="error-banner">{reasonError}</p>}
          <div className="platform-form-actions"><button type="button" className="danger-button" disabled={busy} onClick={() => void suspend()}><Ban size={15} /> Suspender comercio</button></div>
        </>}
        {(d.suspension_log || []).length > 0 && <details className="platform-history"><summary>Historial de suspensiones</summary>
          <ul className="platform-plain-list">{d.suspension_log.map((item, index) => <li key={`${item.created_at}-${index}`}>
            <strong>{item.action === 'suspend' ? 'Suspendido' : 'Reactivado'}</strong><small> · {dateTime(item.created_at)}{item.by ? ` · ${item.by}` : ''}{item.reason ? ` · ${item.reason}` : ''}</small></li>)}</ul>
        </details>}
      </section>
      <div className="platform-columns">
        <section className="platform-card" aria-labelledby="platform-members-title">
          <h4 id="platform-members-title">Personas con acceso ({d.members.length}){d.invitations ? ` · ${d.invitations} invitaciones pendientes` : ''}</h4>
          <ul className="platform-plain-list">{d.members.map(member => <li key={member.email}>
            <strong>{member.email}</strong><small> · {roles[member.role] || member.role} · último ingreso {dateTime(member.last_sign_in_at)}</small></li>)}</ul>
        </section>
        <section className="platform-card" aria-labelledby="platform-branches-title">
          <h4 id="platform-branches-title">Sucursales ({d.branches.length})</h4>
          <ul className="platform-plain-list">{d.branches.map(branch => <li key={branch.name}>{branch.name}{branch.is_default && <small> · principal</small>}</li>)}</ul>
        </section>
      </div>
      <StoreSubscription storeId={storeId} run={run} busy={busy} onSaved={onSaved} />
      <StoreAiLimit storeId={storeId} run={run} busy={busy} />
      <section className="platform-card" aria-labelledby="platform-store-ai-title">
        <h4 id="platform-store-ai-title">Uso de IA en {days} días</h4>
        <UsageBars label="Pantalla" rows={d.ai_by_feature.map(row => ({ ...row, name: features[row.feature] || row.feature }))} />
      </section>
    </>}
  </div>;
}

function Stores({ days, active, run, busy, selected, setSelected }: { days: number; active: boolean; run: Run; busy: boolean; selected: string | null; setSelected: (id: string | null) => void }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'suspended' | Status>('all');
  const trigger = useRef<HTMLButtonElement | null>(null);
  const list = usePlatformData<StoreRow[]>('retail_admin_stores', { p_search: search || null, p_days: days }, active);
  const rows = (list.data || []).filter(row => statusFilter === 'all' || (statusFilter === 'suspended' ? Boolean(row.suspended_at) : row.status === statusFilter));
  const back = () => { setSelected(null); requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus(); }); };
  if (selected) return <StoreDetailView storeId={selected} days={days} run={run} busy={busy} onBack={back} onSaved={() => void list.reload()} />;
  return <div className="platform-stack">
    <form className="platform-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label className="platform-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, correo del dueño o ID" />
        <button className="secondary-button" disabled={list.loading}>Buscar</button></span></label>
      <label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}>
        <option value="all">Todos</option><option value="suspended">Suspendidos</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className="secondary-button" disabled={list.loading} onClick={() => void list.reload()}><RefreshCw size={15} /> Actualizar</button>
    </form>
    <Feedback loading={list.loading} error={list.error} />
    {list.data && <p className="platform-muted">{rows.length === 1 ? '1 comercio' : `${number(rows.length)} comercios`}{list.data.length >= 500 ? ' (se muestran los 500 más recientes; buscá para acotar)' : ''}.</p>}
    {list.data && !rows.length && <p className="platform-muted">No hay comercios con estos filtros.</p>}
    {rows.length > 0 && <div className="platform-table-wrap"><table className="platform-table">
      <thead><tr><th scope="col">Comercio</th><th scope="col">Abono y seguimiento</th><th scope="col">Personas · sucursales · productos</th><th scope="col">Ventas ({days} días)</th><th scope="col">Última venta</th><th scope="col">IA (tokens)</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <th scope="row"><strong>{row.name}</strong><small>{row.owner_email || 'Sin dueño'} · alta {date(row.created_at)}{row.billing_enabled ? ' · ARCA' : ''}</small></th>
        <td>{row.plan_name ? <small>{row.plan_name} · {subscriptionStatus[row.subscription_status || ''] || row.subscription_status}</small> : <small>Sin abono</small>}<span className={`platform-pill is-${row.status}`}>{statuses[row.status] || row.status}</span>{row.suspended_at && <span className="platform-pill is-suspended"><Ban size={11} aria-hidden="true" /> Suspendido</span>}</td>
        <td>{number(row.members)} · {number(row.branches)} · {number(row.products)}</td>
        <td>{number(row.sales_count)}<small>{money(row.sales_total)}</small></td>
        <td>{date(row.last_sale_at)}</td>
        <td>{number(row.ai_tokens)}<small>{number(row.ai_requests)} consultas</small></td>
        <td><button type="button" className="secondary-button" aria-label={`Ver detalle de ${row.name}`} onClick={event => { trigger.current = event.currentTarget; setSelected(row.id); }}>Ver detalle</button></td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}

function Users({ active }: { active: boolean }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const list = usePlatformData<UserRow[]>('retail_admin_users', { p_search: search || null }, active);
  return <div className="platform-stack">
    <form className="platform-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label className="platform-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Correo o ID de usuario" />
        <button className="secondary-button" disabled={list.loading}>Buscar</button></span></label>
    </form>
    <Feedback loading={list.loading} error={list.error} />
    {list.data && !list.data.length && <p className="platform-muted">No hay usuarios con esa búsqueda.</p>}
    {list.data && list.data.length > 0 && <>
      <p className="platform-muted">{list.data.length >= 200 ? 'Se muestran los 200 más recientes; buscá por correo para acotar.' : `${number(list.data.length)} usuarios.`}</p>
      <div className="platform-table-wrap"><table className="platform-table">
        <thead><tr><th scope="col">Usuario</th><th scope="col">Alta</th><th scope="col">Último ingreso</th><th scope="col">Comercios</th></tr></thead>
        <tbody>{list.data.map(user => <tr key={user.user_id}>
          <th scope="row"><strong>{user.email}{user.is_platform_admin && <span className="platform-pill is-admin"><BadgeCheck size={12} aria-hidden="true" /> Plataforma</span>}</strong>
            <small>{user.confirmed ? 'Correo confirmado' : 'Correo sin confirmar'}</small></th>
          <td>{date(user.created_at)}</td>
          <td>{dateTime(user.last_sign_in_at)}</td>
          <td>{user.stores.length ? user.stores.map(store => `${store.name} (${roles[store.role] || store.role})`).join(', ') : <span className="platform-muted">Sin comercio</span>}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}

const tokensDraft = (value: number | null | undefined) => value === null || value === undefined ? '' : String(value);
const tokensValue = (draft: string) => draft.trim() === '' ? null : Math.round(Number(draft));
const validTokens = (draft: string) => draft.trim() === '' || (Number.isFinite(Number(draft)) && Number(draft) >= 0 && Number(draft) <= 100000000);

/** Corte general y cupo diario por comercio. Lo aplica el servidor de IA (ai-proxy) en cada consulta. */
function AiSettingsCard({ active, run, busy }: { active: boolean; run: Run; busy: boolean }) {
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

function StoreAiLimit({ storeId, run, busy }: { storeId: string; run: Run; busy: boolean }) {
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

function AiPanel({ days, active, run, busy }: { days: number; active: boolean; run: Run; busy: boolean }) {
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

/**
 * Panel del proveedor del servicio: todos los comercios, usuarios, uso de IA y catálogo global.
 * Mostrarlo no da permisos: cada función vuelve a validar en la base que sea administrador de plataforma.
 */
export function PlatformAdmin({ run, busy, active }: { run: Run; busy: boolean; active: boolean }) {
  const [view, setView] = useState<View>('summary');
  const [days, setDays] = useState(30);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const openStore = (id: string) => { setSelectedStore(id); setView('stores'); };
  const sections = [
    { id: 'summary', label: 'Resumen' }, { id: 'stores', label: 'Comercios' }, { id: 'billing', label: 'Planes y abonos' }, { id: 'notices', label: 'Avisos' }, { id: 'ads', label: 'Publicidad' }, { id: 'users', label: 'Usuarios' },
    { id: 'ai', label: 'Uso de IA' }, { id: 'catalog', label: 'Catálogo global' },
  ];
  return <section className="retail-panel platform-admin" aria-labelledby="platform-admin-title">
    <div className="section-heading"><div><h2 id="platform-admin-title">Panel de plataforma</h2>
      <p>Lo que se administra como proveedor del servicio. No muestra tickets, clientes ni comprobantes de los comercios.</p></div>
      {!['catalog', 'users', 'billing', 'notices', 'ads'].includes(view) && <label className="platform-period">Período<select value={days} onChange={event => setDays(Number(event.target.value))}>
        <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option><option value={365}>Último año</option>
      </select></label>}
    </div>
    <SectionNav name="platform" label="Secciones del panel de plataforma" value={view} onChange={value => setView(value as View)} sections={sections} />
    {sections.map(section => <div key={section.id} role="tabpanel" id={`platform-panel-${section.id}`} aria-labelledby={`platform-tab-${section.id}`} hidden={view !== section.id}>
      {view === section.id && section.id === 'summary' && <Summary days={days} active={active} />}
      {view === section.id && section.id === 'stores' && <Stores days={days} active={active} run={run} busy={busy} selected={selectedStore} setSelected={setSelectedStore} />}
      {view === section.id && section.id === 'ads' && <PlatformAds active={active} run={run} busy={busy} />}
      {view === section.id && section.id === 'notices' && <PlatformNotices active={active} run={run} busy={busy} />}
      {view === section.id && section.id === 'billing' && <PlatformBilling active={active} run={run} busy={busy} onOpenStore={openStore} />}
      {view === section.id && section.id === 'users' && <Users active={active} />}
      {view === section.id && section.id === 'ai' && <AiPanel days={days} active={active} run={run} busy={busy} />}
      {view === section.id && section.id === 'catalog' && <GlobalCatalog run={run} busy={busy} active={active} />}
    </div>)}
  </section>;
}
