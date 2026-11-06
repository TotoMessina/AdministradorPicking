import { useRef, useState } from 'react';
import { Megaphone, RefreshCw, Send, Trash2, XCircle } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { NumberInput } from '../../components/NumberInput';
import { supabase } from '../../lib/supabase';
import { randomUUID } from '../../utils/uuid';
import type { Run } from './managementTypes';
import { dateTime, Feedback, number, PurgeEnded, readError, usePlatformData } from './platformShared';

type Audience = 'all' | 'managers' | 'plan' | 'store';
type Level = 'info' | 'importante' | 'urgente';
interface SentNotice {
  id: string; title: string; body: string; level: Level; audience: Audience; plan: string | null; store: string | null; push: boolean;
  created_at: string; ends_at: string; canceled_at: string | null; by: string | null; reads: number; push_total: number; push_sent: number; push_failed: number;
}

const audiences: Record<Audience, string> = { all: 'Todos los usuarios', managers: 'Dueños y administradores', plan: 'Comercios de un plan', store: 'Un comercio' };
const levels: Record<Level, string> = { info: 'Informativo', importante: 'Importante', urgente: 'Urgente (se ve también en Vender)' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const target = (item: SentNotice) => item.audience === 'plan' ? `Plan ${item.plan || '—'}` : item.audience === 'store' ? item.store || 'Comercio eliminado' : audiences[item.audience];

/** Pestaña Avisos: mensajes del proveedor a los usuarios, dentro de la app y, si se elige, por push. */
export function PlatformNotices({ active, run, busy }: { active: boolean; run: Run; busy: boolean }) {
  const sent = usePlatformData<SentNotice[]>('retail_admin_announcements', {}, active);
  const plans = usePlatformData<{ id: string; name: string; active: boolean }[]>('retail_admin_plans', {}, active);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [level, setLevel] = useState<Level>('info');
  const [audience, setAudience] = useState<Audience>('all');
  const [plan, setPlan] = useState('');
  const [store, setStore] = useState('');
  const [days, setDays] = useState('7');
  const [push, setPush] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState('');
  // Reintentar el mismo envío no lo duplica; se renueva después de enviarlo.
  const requestId = useRef(randomUUID());

  const fail = (message: string, field?: string) => { setFormError(message); if (field) document.getElementById(field)?.focus(); };
  const send = async () => {
    setResult('');
    if (!title.trim()) return fail('Escribí el título.', 'notice-title');
    if (!body.trim()) return fail('Escribí el mensaje.', 'notice-body');
    if (audience === 'plan' && !plan) return fail('Elegí el plan.', 'notice-plan');
    if (audience === 'store' && !uuid.test(store.trim())) return fail('Pegá el ID del comercio (está en su detalle, en Comercios).', 'notice-store');
    const span = Math.round(Number(days));
    if (!Number.isFinite(span) || span < 1 || span > 60) return fail('El aviso puede quedar visible de 1 a 60 días.', 'notice-days');
    setFormError('');
    const recipients = { p_audience: audience, p_plan: audience === 'plan' ? plan : null, p_store: audience === 'store' ? store.trim() : null };
    const { data: reach, error: reachError } = await supabase.rpc('retail_admin_announcement_reach', recipients);
    if (reachError) return fail(readError(reachError));
    const people = Number((reach as { users?: number })?.users || 0);
    const devices = Number((reach as { devices?: number })?.devices || 0);
    if (!await askConfirm(`¿Enviar «${title.trim()}» a ${number(people)} ${people === 1 ? 'usuario' : 'usuarios'}${push ? ` y por push a ${number(devices)} ${devices === 1 ? 'dispositivo' : 'dispositivos'}` : ''}? Se ve dentro de la app durante ${span} ${span === 1 ? 'día' : 'días'}.`)) return;
    let summary = '';
    const ok = await run(async () => {
      const { data, error } = await supabase.rpc('retail_admin_send_announcement', { p_request: requestId.current, p_title: title.trim(), p_body: body.trim(),
        p_level: level, ...recipients, p_days: span, p_push: push });
      if (error) throw new Error(readError(error));
      const queued = Number((data as { push_queued?: number })?.push_queued || 0);
      summary = push ? `Aviso publicado. ${number(queued)} push en cola: salen en los próximos minutos.` : 'Aviso publicado dentro de la app.';
    }, 'Aviso enviado');
    if (ok) {
      requestId.current = randomUUID();
      setTitle(''); setBody(''); setLevel('info'); setPush(false); setResult(summary);
      void sent.reload();
    }
  };
  const cancel = async (item: SentNotice) => {
    if (!await askConfirm(`¿Cancelar «${item.title}»? Deja de mostrarse en la app y no salen los push pendientes. Los ya entregados no se pueden retirar.`)) return;
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_cancel_announcement', { p_announcement: item.id });
      if (error) throw new Error(readError(error));
    }, 'Aviso cancelado');
    if (ok) void sent.reload();
  };
  const remove = async (item: SentNotice) => {
    if (!await askConfirm(`¿Eliminar el aviso «${item.title}»? ${live(item) ? 'Deja de mostrarse y no salen los push pendientes. ' : ''}Se borran también sus lecturas y envíos. No se puede deshacer.`)) return;
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_delete_announcement', { p_id: item.id });
      if (error) throw new Error(readError(error));
    }, 'Aviso eliminado');
    if (ok) void sent.reload();
  };
  const live = (item: SentNotice) => !item.canceled_at && new Date(item.ends_at).getTime() > Date.now();

  return <div className="platform-stack">
    <form className="platform-card platform-note" noValidate aria-labelledby="notice-form-title" onSubmit={event => { event.preventDefault(); void send(); }}>
      <h4 id="notice-form-title"><Megaphone size={15} aria-hidden="true" /> Nuevo aviso</h4>
      <p className="platform-muted">Aparece dentro de la app a cada usuario alcanzado hasta que toca «Entendido» o vence. Con push, también llega a los dispositivos de quienes activaron los avisos.</p>
      <div className="platform-fields">
        <label className="platform-field">Título<input id="notice-title" value={title} maxLength={80} autoComplete="off" onChange={event => setTitle(event.target.value)} placeholder="Ej.: Mantenimiento programado" /></label>
        <label className="platform-field">Importancia<select value={level} onChange={event => setLevel(event.target.value as Level)}>
          {Object.entries(levels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className="platform-field">Mensaje<textarea id="notice-body" rows={3} maxLength={500} value={body} onChange={event => setBody(event.target.value)}
        placeholder="Ej.: El domingo de 2 a 4 h la app puede no responder. Las ventas sin conexión se guardan igual." /></label>
      <small className="platform-muted">{body.length}/500</small>
      <div className="platform-fields">
        <label className="platform-field">Para<select value={audience} onChange={event => setAudience(event.target.value as Audience)}>
          {Object.entries(audiences).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {audience === 'plan' && <label className="platform-field">Plan<select id="notice-plan" value={plan} onChange={event => setPlan(event.target.value)}>
          <option value="">Elegí un plan</option>{(plans.data || []).map(item => <option key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (inactivo)'}</option>)}</select></label>}
        {audience === 'store' && <label className="platform-field">ID del comercio<input id="notice-store" value={store} autoComplete="off" spellCheck={false} onChange={event => setStore(event.target.value)} placeholder="Copialo desde su detalle" /></label>}
        <label className="platform-field">Visible durante (días)<NumberInput id="notice-days" value={days} onValueChange={setDays} min={1} max={60} step={1} inputMode="numeric" /></label>
      </div>
      <label className="platform-check"><input type="checkbox" checked={push} onChange={event => setPush(event.target.checked)} />
        <span><strong>Enviar también por push</strong><small>Se despacha en lotes cada minuto. Usalo para lo importante: muchos avisos hacen que la gente los desactive.</small></span></label>
      {formError && <p role="alert" className="error-banner">{formError}</p>}
      {result && <p role="status" className="platform-muted"><strong>{result}</strong></p>}
      <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy}><Send size={15} /> Revisar y enviar</button></div>
    </form>

    <section className="platform-card" aria-labelledby="notice-list-title">
      <div className="platform-toolbar"><h4 id="notice-list-title">Avisos enviados</h4>
        <button type="button" className="secondary-button" disabled={sent.loading} onClick={() => void sent.reload()}><RefreshCw size={15} /> Actualizar</button></div>
      <Feedback loading={sent.loading && !sent.data} error={sent.error} />
      {sent.data && !sent.data.length && <p className="platform-muted">Todavía no se envió ningún aviso.</p>}
      {sent.data && sent.data.length > 0 && <div className="platform-table-wrap"><table className="platform-table">
        <thead><tr><th scope="col">Aviso</th><th scope="col">Para</th><th scope="col">Leído por</th><th scope="col">Push</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{sent.data.map(item => <tr key={item.id}>
          <th scope="row"><strong>{item.title}</strong><small>{levels[item.level]?.split(' (')[0]} · {dateTime(item.created_at)}{item.by ? ` · ${item.by}` : ''}</small><small>{item.body}</small></th>
          <td>{target(item)}</td>
          <td>{number(item.reads)}</td>
          <td>{item.push ? <>{number(item.push_sent)} de {number(item.push_total)}{item.push_failed ? <small className="platform-danger">{number(item.push_failed)} fallaron</small> : null}</> : 'No'}</td>
          <td>{item.canceled_at ? `Cancelado ${dateTime(item.canceled_at)}` : live(item) ? `Visible hasta ${dateTime(item.ends_at)}` : 'Vencido'}</td>
          <td className="platform-row-actions">{live(item) && <button type="button" className="secondary-button" disabled={busy} aria-label={`Cancelar ${item.title}`} onClick={() => void cancel(item)}><XCircle size={15} /> Cancelar</button>}
            <button type="button" className="text-button danger-text" disabled={busy} aria-label={`Eliminar ${item.title}`} onClick={() => void remove(item)}><Trash2 size={14} /> Eliminar</button></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <PurgeEnded kind="announcements" run={run} busy={busy} onDone={() => void sent.reload()} />
  </div>;
}
