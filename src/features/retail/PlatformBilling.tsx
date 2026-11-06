import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { supabase } from '../../lib/supabase';
import { randomUUID } from '../../utils/uuid';
import type { Run } from './managementTypes';
import { date, dateTime, Feedback, money, number, readError, Stat, usePlatformData } from './platformShared';

interface Plan {
  id: string; name: string; price: number; max_branches: number | null; max_registers: number | null; max_users: number | null;
  ai_enabled: boolean; ai_daily_tokens: number | null; active: boolean; stores: number; ads_free?: boolean;
}
interface PlanDraft { id: string | null; name: string; price: string; max_branches: string; max_registers: string; max_users: string; ai_enabled: boolean; ai_daily_tokens: string; active: boolean; ads_free: boolean }
interface Summary {
  without_plan: number; by_status: Record<string, number>; monthly_revenue: number; collected_30d: number;
  attention: { store_id: string; name: string; plan: string; status: string; access_until: string | null; blocks_at: string | null }[];
}
interface StoreBilling {
  subscription: { plan_id: string; plan: string; price: number; exempt: boolean; trial_until: string | null; paid_until: string | null; grace_days: number; status: string; access_until: string | null } | null;
  used: { branches: number; registers: number; users: number; invitations: number };
  payments: { paid_at: string; amount: number; months: number; method: string; reference: string | null; period_to: string; by: string | null }[];
}

export const subscriptionStatus: Record<string, string> = { prueba: 'En prueba', al_dia: 'Al día', vencido: 'Vencido (en gracia)', bloqueado: 'Bloqueado por abono', bonificado: 'Bonificado' };
const methods: Record<string, string> = { transferencia: 'Transferencia', efectivo: 'Efectivo', mercado_pago: 'Mercado Pago', tarjeta: 'Tarjeta', otro: 'Otro' };
const draftOf = (value: number | null | undefined) => value === null || value === undefined ? '' : String(value);
const optional = (draft: string) => draft.trim() === '' ? null : Math.round(Number(draft));
const validOptional = (draft: string, min: number, max: number) => draft.trim() === '' || (Number.isFinite(Number(draft)) && Number(draft) >= min && Number(draft) <= max);
const limitText = (value: number | null) => value === null ? 'sin límite' : number(value);
const emptyPlan: PlanDraft = { id: null, name: '', price: '', max_branches: '', max_registers: '', max_users: '', ai_enabled: true, ai_daily_tokens: '', active: true, ads_free: false };

function PlanEditor({ draft, onChange, onCancel, onSave, busy, error }: {
  draft: PlanDraft; onChange: (draft: PlanDraft) => void; onCancel: () => void; onSave: () => void; busy: boolean; error: string;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { requestAnimationFrame(() => title.current?.focus()); }, []);
  const set = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => onChange({ ...draft, [key]: value });
  return <form className="platform-card platform-note" noValidate aria-labelledby="platform-plan-editor-title" onSubmit={event => { event.preventDefault(); onSave(); }}>
    <h4 id="platform-plan-editor-title" ref={title} tabIndex={-1} className="platform-detail-title">{draft.id ? `Editar ${draft.name || 'plan'}` : 'Nuevo plan'}</h4>
    <div className="platform-fields">
      <label className="platform-field">Nombre<input id="platform-plan-name" value={draft.name} maxLength={60} autoComplete="off" onChange={event => set('name', event.target.value)} /></label>
      <label className="platform-field">Precio mensual ($)<NumberInput id="platform-plan-price" value={draft.price} onValueChange={value => set('price', value)} min={0} step="0.01" /></label>
      <label className="platform-field">Sucursales (vacío = sin límite)<NumberInput value={draft.max_branches} onValueChange={value => set('max_branches', value)} min={1} step={1} inputMode="numeric" placeholder="Sin límite" /></label>
      <label className="platform-field">Cajas activas<NumberInput value={draft.max_registers} onValueChange={value => set('max_registers', value)} min={1} step={1} inputMode="numeric" placeholder="Sin límite" /></label>
      <label className="platform-field">Personas con acceso<NumberInput value={draft.max_users} onValueChange={value => set('max_users', value)} min={1} step={1} inputMode="numeric" placeholder="Sin límite" /></label>
      <label className="platform-field">IA: tokens por día<NumberInput value={draft.ai_daily_tokens} onValueChange={value => set('ai_daily_tokens', value)} min={0} step={1} inputMode="numeric" placeholder="Sin límite" disabled={!draft.ai_enabled} /></label>
    </div>
    <label className="platform-check"><input type="checkbox" checked={draft.ai_enabled} onChange={event => set('ai_enabled', event.target.checked)} />
      <span><strong>Incluye IA</strong><small>Sin marcar, las herramientas de IA no responden en los comercios de este plan.</small></span></label>
    <label className="platform-check"><input type="checkbox" checked={draft.ads_free} onChange={event => set('ads_free', event.target.checked)} />
      <span><strong>Sin publicidad</strong><small>Los comercios de este plan no ven ninguna publicidad.</small></span></label>
    <label className="platform-check"><input type="checkbox" checked={draft.active} onChange={event => set('active', event.target.checked)} />
      <span><strong>Disponible para asignar</strong><small>Un plan inactivo se conserva en los comercios que ya lo tienen.</small></span></label>
    <p className="platform-muted">Los límites rigen al agregar sucursales, cajas o personas. Lo que un comercio ya tiene no se borra si supera el límite.</p>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="platform-form-actions">
      <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Cancelar</button>
      <button type="submit" className="primary-button" disabled={busy}>Guardar plan</button>
    </div>
  </form>;
}

/** Pestaña Planes y abonos: cobranza, planes y configuración para comercios nuevos. */
export function PlatformBilling({ active, run, busy, onOpenStore }: { active: boolean; run: Run; busy: boolean; onOpenStore: (id: string) => void }) {
  const summary = usePlatformData<Summary>('retail_admin_billing_summary', {}, active);
  const plans = usePlatformData<Plan[]>('retail_admin_plans', {}, active);
  const settings = usePlatformData<{ new_store_plan_id: string | null; trial_days: number; grace_days: number }>('retail_admin_billing_settings', {}, active);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [draftError, setDraftError] = useState('');
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [trial, setTrial] = useState('14');
  const [grace, setGrace] = useState('5');
  const [settingsError, setSettingsError] = useState('');
  const st = settings.data;
  useEffect(() => { if (st) { setNewPlan(st.new_store_plan_id || ''); setTrial(String(st.trial_days)); setGrace(String(st.grace_days)); } }, [st]);
  const s = summary.data;
  const reload = () => { void summary.reload(); void plans.reload(); void settings.reload(); };

  const openPlan = (trigger: HTMLButtonElement, plan?: Plan) => {
    editTrigger.current = trigger; setDraftError('');
    setDraft(plan ? { id: plan.id, name: plan.name, price: String(plan.price), max_branches: draftOf(plan.max_branches), max_registers: draftOf(plan.max_registers),
      max_users: draftOf(plan.max_users), ai_enabled: plan.ai_enabled, ai_daily_tokens: draftOf(plan.ai_daily_tokens), active: plan.active, ads_free: Boolean(plan.ads_free) } : emptyPlan);
  };
  const closePlan = () => { setDraft(null); requestAnimationFrame(() => { if (editTrigger.current?.isConnected) editTrigger.current.focus(); }); };
  const savePlan = async () => {
    if (!draft) return;
    const problem = !draft.name.trim() ? ['Escribí el nombre del plan.', 'platform-plan-name']
      : draft.price.trim() === '' || !validOptional(draft.price, 0, 999999999) ? ['Escribí el precio mensual (0 si es gratis).', 'platform-plan-price']
      : ![draft.max_branches, draft.max_registers, draft.max_users].every(value => validOptional(value, 1, 10000)) ? ['Los límites van de 1 a 10.000, o vacíos para no limitar.', '']
      : !validOptional(draft.ai_daily_tokens, 0, 100000000) ? ['El cupo de IA va de 0 a 100.000.000 tokens, o vacío para no limitar.', ''] : null;
    if (problem) { setDraftError(problem[0]); if (problem[1]) document.getElementById(problem[1])?.focus(); return; }
    setDraftError('');
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_save_plan', {
        p_id: draft.id, p_name: draft.name.trim(), p_price: Math.round(Number(draft.price) * 100) / 100, p_max_branches: optional(draft.max_branches),
        p_max_registers: optional(draft.max_registers), p_max_users: optional(draft.max_users), p_ai_enabled: draft.ai_enabled,
        p_ai_daily_tokens: draft.ai_enabled ? optional(draft.ai_daily_tokens) : null, p_active: draft.active, p_ads_free: draft.ads_free,
      });
      if (error) throw new Error(readError(error));
    }, draft.id ? 'Plan actualizado' : 'Plan creado');
    if (ok) { closePlan(); reload(); }
  };
  const saveSettings = async () => {
    if (!validOptional(trial, 0, 365) || trial.trim() === '') { setSettingsError('La prueba gratis va de 0 a 365 días.'); return; }
    if (!validOptional(grace, 0, 60) || grace.trim() === '') { setSettingsError('Los días de gracia van de 0 a 60.'); return; }
    setSettingsError('');
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_save_billing_settings', { p_new_store_plan: newPlan || null, p_trial_days: Math.round(Number(trial)), p_grace_days: Math.round(Number(grace)) });
      if (error) throw new Error(readError(error));
    }, 'Configuración de abonos guardada');
    if (ok) void settings.reload();
  };
  const activePlans = (plans.data || []).filter(plan => plan.active);

  return <div className="platform-stack">
    <div className="platform-toolbar">
      <p className="platform-muted">Los pagos se registran a mano por ahora. Un comercio sin abono no se controla: no tiene límites ni vencimiento.</p>
      <button type="button" className="secondary-button" disabled={summary.loading} onClick={reload}><RefreshCw size={15} /> Actualizar</button>
    </div>
    <Feedback loading={summary.loading && !s} error={summary.error} />
    {s && <>
      <div className="platform-stats">
        <Stat label="Ingreso mensual estimado" value={money(s.monthly_revenue)} detail="abonos al día o en gracia" />
        <Stat label="Cobrado en 30 días" value={money(s.collected_30d)} />
        <Stat label="Al día" value={number(s.by_status.al_dia || 0)} detail={`${number(s.by_status.bonificado || 0)} bonificados`} />
        <Stat label="En prueba" value={number(s.by_status.prueba || 0)} />
        <Stat label="Vencidos o bloqueados" value={number((s.by_status.vencido || 0) + (s.by_status.bloqueado || 0))} detail={`${number(s.by_status.bloqueado || 0)} sin acceso`} />
        <Stat label="Sin abono" value={number(s.without_plan)} detail="no se controlan" />
      </div>
      <section className="platform-card" aria-labelledby="platform-attention-title">
        <h4 id="platform-attention-title">Para revisar (vencidos o que vencen en 7 días)</h4>
        {s.attention.length ? <div className="platform-table-wrap"><table className="platform-table">
          <thead><tr><th scope="col">Comercio</th><th scope="col">Estado</th><th scope="col">Vence</th><th scope="col">Se bloquea</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{s.attention.map(item => <tr key={item.store_id}>
            <th scope="row"><strong>{item.name}</strong><small>{item.plan}</small></th>
            <td><span className={`platform-pill is-sub-${item.status}`}>{subscriptionStatus[item.status] || item.status}</span></td>
            <td>{date(item.access_until)}</td><td>{date(item.blocks_at)}</td>
            <td><button type="button" className="secondary-button" aria-label={`Ver abono de ${item.name}`} onClick={() => onOpenStore(item.store_id)}>Ver comercio</button></td>
          </tr>)}</tbody>
        </table></div> : <p className="platform-muted">Nada para revisar.</p>}
      </section>
    </>}

    <section className="platform-card" aria-labelledby="platform-plans-title">
      <div className="platform-toolbar"><h4 id="platform-plans-title">Planes</h4>
        <button type="button" className="primary-button" disabled={busy || Boolean(draft)} onClick={event => openPlan(event.currentTarget)}><Plus size={15} /> Nuevo plan</button></div>
      <Feedback loading={plans.loading && !plans.data} error={plans.error} />
      {draft && <PlanEditor draft={draft} onChange={setDraft} onCancel={closePlan} onSave={() => void savePlan()} busy={busy} error={draftError} />}
      {plans.data && !plans.data.length && !draft && <p className="platform-muted">Todavía no hay planes. Creá el primero para empezar a asignar abonos.</p>}
      {plans.data && plans.data.length > 0 && <div className="platform-table-wrap"><table className="platform-table">
        <thead><tr><th scope="col">Plan</th><th scope="col">Precio</th><th scope="col">Sucursales · cajas · personas</th><th scope="col">IA por día</th><th scope="col">Comercios</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{plans.data.map(plan => <tr key={plan.id}>
          <th scope="row"><strong>{plan.name}</strong>{!plan.active && <small>Inactivo</small>}{plan.ads_free && <small>Sin publicidad</small>}</th>
          <td>{money(plan.price)}</td>
          <td>{limitText(plan.max_branches)} · {limitText(plan.max_registers)} · {limitText(plan.max_users)}</td>
          <td>{plan.ai_enabled ? plan.ai_daily_tokens === null ? 'sin límite' : `${number(plan.ai_daily_tokens)} tokens` : 'Sin IA'}</td>
          <td>{number(plan.stores)}</td>
          <td><button type="button" className="secondary-button" disabled={busy || Boolean(draft)} aria-label={`Editar ${plan.name}`} onClick={event => openPlan(event.currentTarget, plan)}><Pencil size={15} /> Editar</button></td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    <form className="platform-card platform-note" noValidate aria-labelledby="platform-billing-settings-title" onSubmit={event => { event.preventDefault(); void saveSettings(); }}>
      <h4 id="platform-billing-settings-title">Comercios nuevos y vencimientos</h4>
      <Feedback loading={settings.loading && !st} error={settings.error} />
      {st && <>
        <div className="platform-fields">
          <label className="platform-field">Plan al crear un comercio<select value={newPlan} onChange={event => setNewPlan(event.target.value)}>
            <option value="">Ninguno (sin abono, no se controla)</option>
            {activePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select></label>
          <label className="platform-field">Prueba gratis (días)<NumberInput value={trial} onValueChange={setTrial} min={0} max={365} step={1} inputMode="numeric" /></label>
          <label className="platform-field">Días de gracia después del vencimiento<NumberInput value={grace} onValueChange={setGrace} min={0} max={60} step={1} inputMode="numeric" /></label>
        </div>
        <p className="platform-muted">Pasados los días de gracia, el comercio se bloquea solo hasta que se registre el pago. Los cambios valen para comercios nuevos; los existentes conservan sus días de gracia.</p>
        {settingsError && <p role="alert" className="error-banner">{settingsError}</p>}
        <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy || (newPlan === (st.new_store_plan_id || '') && trial === String(st.trial_days) && grace === String(st.grace_days))}>Guardar</button></div>
      </>}
    </form>
  </div>;
}

/** Abono de un comercio en su detalle: plan, vencimiento, límites usados y pagos. */
export function StoreSubscription({ storeId, run, busy, onSaved }: { storeId: string; run: Run; busy: boolean; onSaved: () => void }) {
  const billing = usePlatformData<StoreBilling>('retail_admin_store_subscription', { p_store: storeId }, true);
  const plans = usePlatformData<Plan[]>('retail_admin_plans', {}, true);
  const [plan, setPlan] = useState('');
  const [exempt, setExempt] = useState(false);
  const [trialDays, setTrialDays] = useState('');
  const [grace, setGrace] = useState('5');
  const [planError, setPlanError] = useState('');
  const [months, setMonths] = useState('1');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('transferencia');
  const [reference, setReference] = useState('');
  const [payError, setPayError] = useState('');
  // Un mismo pago reintentado no se registra dos veces; se renueva después de guardarlo.
  const paymentId = useRef(randomUUID());
  const b = billing.data;
  const sub = b?.subscription;
  useEffect(() => { if (b) { setPlan(b.subscription?.plan_id || ''); setExempt(b.subscription?.exempt || false); setGrace(String(b.subscription?.grace_days ?? 5)); setTrialDays(''); } }, [b]);
  const selectedPlan = plans.data?.find(item => item.id === plan);
  useEffect(() => { if (sub) setAmount(String(Math.round(sub.price * Math.max(1, Number(months) || 1) * 100) / 100)); }, [sub, months]);

  const savePlan = async () => {
    if (plan && (grace.trim() === '' || !validOptional(grace, 0, 60))) { setPlanError('Los días de gracia van de 0 a 60.'); return; }
    if (plan && !validOptional(trialDays, 0, 365)) { setPlanError('La prueba gratis va de 0 a 365 días, o vacía para no cambiarla.'); return; }
    setPlanError('');
    const ok = await run(async () => {
      const { error } = await supabase.rpc('retail_admin_set_store_plan', { p_store: storeId, p_plan: plan || null, p_exempt: exempt,
        p_trial_days: optional(trialDays), p_grace_days: Math.round(Number(grace) || 0) });
      if (error) throw new Error(readError(error));
    }, plan ? 'Abono guardado' : 'Abono quitado: el comercio ya no se controla');
    if (ok) { void billing.reload(); onSaved(); }
  };
  const recordPayment = async () => {
    if (!validOptional(months, 1, 36) || months.trim() === '') { setPayError('Elegí entre 1 y 36 meses.'); return; }
    if (amount.trim() === '' || !validOptional(amount, 0, 999999999)) { setPayError('Escribí el importe cobrado.'); return; }
    setPayError('');
    const ok = await run(async () => {
      const { data, error } = await supabase.rpc('retail_admin_record_payment', { p_request: paymentId.current, p_store: storeId,
        p_amount: Math.round(Number(amount) * 100) / 100, p_months: Math.round(Number(months)), p_method: method, p_reference: reference.trim() || null });
      if (error) throw new Error(readError(error));
      return data;
    }, 'Pago registrado');
    if (ok) {
      paymentId.current = randomUUID(); setReference(''); setMonths('1');
      void billing.reload(); onSaved();
    }
  };
  const planChanged = b && (plan !== (sub?.plan_id || '') || (plan && (exempt !== (sub?.exempt || false) || grace !== String(sub?.grace_days ?? 5) || trialDays.trim() !== '')));
  const usage = (label: string, used: number, cap: number | null | undefined) => `${label}: ${number(used)} de ${cap === null || cap === undefined ? 'sin límite' : number(cap)}`;

  return <section className="platform-card" aria-labelledby="platform-store-billing-title">
    <h4 id="platform-store-billing-title">Abono</h4>
    <Feedback loading={billing.loading && !b} error={billing.error || plans.error} />
    {b && <>
      {sub ? <p className="platform-muted"><span className={`platform-pill is-sub-${sub.status}`}>{subscriptionStatus[sub.status] || sub.status}</span>{' '}
        {sub.plan} · {money(sub.price)} por mes{sub.exempt ? '' : ` · acceso hasta ${date(sub.access_until)}${sub.trial_until && !sub.paid_until ? ' (prueba)' : ''} · ${sub.grace_days} días de gracia`}</p>
        : <p className="platform-muted">Sin abono: no tiene límites ni vencimiento.</p>}
      <p className="platform-muted">{usage('Sucursales', b.used.branches, selectedPlan?.max_branches)} · {usage('Cajas activas', b.used.registers, selectedPlan?.max_registers)} · {usage('Personas', b.used.users, selectedPlan?.max_users)}{b.used.invitations ? ` (+${b.used.invitations} invitaciones)` : ''}</p>
      <form className="platform-note" noValidate onSubmit={event => { event.preventDefault(); void savePlan(); }}>
        <div className="platform-fields">
          <label className="platform-field">Plan<select value={plan} onChange={event => setPlan(event.target.value)}>
            <option value="">Sin abono (no se controla)</option>
            {(plans.data || []).filter(item => item.active || item.id === sub?.plan_id).map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.price)}</option>)}
          </select></label>
          {plan && <>
            <label className="platform-field">Dar prueba gratis (días desde hoy)<NumberInput value={trialDays} onValueChange={setTrialDays} min={0} max={365} step={1} inputMode="numeric" placeholder={sub ? 'No cambiar' : 'Sin prueba'} /></label>
            <label className="platform-field">Días de gracia<NumberInput value={grace} onValueChange={setGrace} min={0} max={60} step={1} inputMode="numeric" /></label>
          </>}
        </div>
        {plan && <label className="platform-check"><input type="checkbox" checked={exempt} onChange={event => setExempt(event.target.checked)} />
          <span><strong>Bonificado</strong><small>No vence ni tiene límites del plan. Útil para comercios propios o acuerdos especiales.</small></span></label>}
        {plan && !sub && !trialDays.trim() && !exempt && <p className="platform-muted">Sin prueba ni pago, el comercio queda vencido desde hoy: registrá un pago o dale días de prueba.</p>}
        {planError && <p role="alert" className="error-banner">{planError}</p>}
        <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy || !planChanged}>Guardar abono</button></div>
      </form>
      {sub && !sub.exempt && <form className="platform-note platform-payment" noValidate onSubmit={event => { event.preventDefault(); void recordPayment(); }}>
        <h5>Registrar pago</h5>
        <div className="platform-fields">
          <label className="platform-field">Meses<NumberInput value={months} onValueChange={setMonths} min={1} max={36} step={1} inputMode="numeric" /></label>
          <label className="platform-field">Importe ($)<NumberInput value={amount} onValueChange={setAmount} min={0} step="0.01" /></label>
          <label className="platform-field">Medio<select value={method} onChange={event => setMethod(event.target.value)}>
            {Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="platform-field">Referencia (opcional)<input value={reference} maxLength={120} autoComplete="off" onChange={event => setReference(event.target.value)} placeholder="N.º de operación" /></label>
        </div>
        <p className="platform-muted">Extiende el acceso desde la fecha más lejana entre hoy, lo ya pagado y el fin de la prueba. Si estaba bloqueado, vuelve a tener acceso en el acto.</p>
        {payError && <p role="alert" className="error-banner">{payError}</p>}
        <div className="platform-form-actions"><button type="submit" className="primary-button" disabled={busy}>Registrar pago</button></div>
      </form>}
      {b.payments.length > 0 && <details className="platform-history"><summary>Pagos registrados ({b.payments.length})</summary>
        <ul className="platform-plain-list">{b.payments.map((item, index) => <li key={`${item.paid_at}-${index}`}>
          <strong>{money(item.amount)}</strong><small> · {item.months} {item.months === 1 ? 'mes' : 'meses'} · {methods[item.method] || item.method} · {dateTime(item.paid_at)} · cubre hasta {date(item.period_to)}{item.reference ? ` · ${item.reference}` : ''}{item.by ? ` · ${item.by}` : ''}</small></li>)}</ul>
      </details>}
    </>}
  </section>;
}
