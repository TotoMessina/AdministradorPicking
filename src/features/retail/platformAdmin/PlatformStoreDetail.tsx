import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, RotateCcw } from 'lucide-react';
import { askConfirm } from '../../../components/ConfirmHost';
import { supabase } from '../../../lib/supabase';
import { date, dateTime, Feedback, money, number, readError, Stat, usePlatformData } from '../platformShared';
import { StoreSubscription } from '../PlatformBilling';
import type { Run } from '../managementTypes';
import { type Status, type StoreDetail, statuses, roles, features } from './platformTypes';
import { UsageBars } from './PlatformSummary';
import { StoreAiLimit } from './PlatformAiSettings';

// Detalle de un comercio: estado, plan y uso.
export function StoreDetailView({ storeId, days, run, busy, onBack, onSaved }: { storeId: string; days: number; run: Run; busy: boolean; onBack: () => void; onSaved: () => void }) {
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
