import { useCallback, useEffect, useRef, useState } from 'react';
import { CatalogEditor, type Run } from './Management';
import { CashDesk } from './CashDesk';
import { retail, errorMessage, type Store, type Branch, type Register, type Category, type Product, type Shift } from './api';
import { onboarding, type OnboardingState } from './onboarding';

export function GuidedStart({ store, userId, branches, registers, register, shift, occupied, categories, products,
  busy, run, showResume, onStatus, onSell, onSettings, onRefresh, onRegisterChange, autoStart = true, hasPendingSale = false }: {
  store: Store; userId: string; branches: Branch[]; registers: Register[]; register?: Register; shift?: Shift;
  occupied: boolean; categories: Category[]; products: Product[]; busy: boolean; run: Run; showResume: boolean;
  onStatus: (ready: boolean, visible: boolean) => void; onSell: () => void;
  onSettings: () => void; onRefresh: () => void;
  onRegisterChange: (id: string) => void; autoStart?: boolean; hasPendingSale?: boolean;
}) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [productsVisited, setProductsVisited] = useState(false);
  const [name, setName] = useState(store.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [opened, setOpened] = useState('');
  const working = useRef(false);
  const initialized = useRef(false);
  const allowAutoStart = useRef(autoStart);
  allowAutoStart.current = autoStart && !hasPendingSale;
  const pendingSale = useRef(hasPendingSale);
  pendingSale.current = hasPendingSale;
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    try {
      const next = await onboarding.read(store.id);
      setState(next);
      if (!initialized.current) {
        initialized.current = true;
        setStep(next?.step || 1);
        setVisible(allowAutoStart.current && !!next && !next.dismissed_at && !next.completed_at);
      }
      setError(''); setReady(true);
    } catch (e) { setError(errorMessage(e)); }
  }, [store.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { onStatus(ready, visible); }, [ready, visible, onStatus]);
  useEffect(() => {
    if (visible) heading.current?.focus();
    if (step === 2) setProductsVisited(true);
  }, [step, visible]);

  const guidedRun: Run = async (action, message) => {
    let failure: unknown;
    const ok = await run(async () => {
      try {
        if (!navigator.onLine) throw new Error('Este paso necesita conexión. Conectate y reintentá; el borrador se conserva.');
        await action();
      } catch (e) { failure = e; throw e; }
    }, message);
    if (!ok) setError(failure ? errorMessage(failure) : 'Esperá a que termine la operación en curso y reintentá.');
    return ok;
  };
  const change = async (action: string, before?: () => Promise<boolean>) => {
    if (!state || working.current || busy) return false;
    if (action === 'resume' && hasPendingSale) return false;
    // Salir no acredita tareas y debe seguir disponible si se perdió la conexión.
    if (action === 'dismiss') setVisible(false);
    working.current = true; setSaving(true); setError('');
    try {
      if (before && !await before()) return false;
      const next = await onboarding.update(state, action);
      setState(next); setStep(next.step);
      if (action === 'dismiss' || action === 'finish') setVisible(false);
      if (action === 'resume') setVisible(!next.completed_at && !pendingSale.current);
      return true;
    } catch (e) {
      // Refresh the revision after a conflict/lost response; never replay a write automatically.
      try { setState(await onboarding.read(store.id)); } catch { /* Keep the last known checkpoint. */ }
      setError(action === 'dismiss' ? `Saliste del inicio guiado en este dispositivo. No se pudo guardar esta preferencia: ${errorMessage(e)} Retomalo desde Mi comercio cuando tengas conexión.` : errorMessage(e)); return false;
    } finally { working.current = false; setSaving(false); }
  };
  const finish = async () => { if (await change('finish')) { onRefresh(); onSell(); } };
  const ownShift = !!shift && shift.opened_by === userId && !!register?.active;
  const locked = busy || saving;
  const configuredProducts = products.filter(p => p.active).length;

  return <>
    {!visible && (showResume || (!ready && error)) && ((state && !state.completed_at) || error) && <section className="retail-panel">
      <h2>Inicio del comercio</h2>
      <p>{state?.details_confirmed_at ? 'Podés retomar los pasos pendientes. Omitirlos no los marca como realizados.' : 'Confirmá los datos, cargá tus productos y prepará tu turno.'}</p>
      {error && <p role="alert">{error}</p>}
      {state && !state.completed_at && <button className="secondary-button" disabled={locked || hasPendingSale} onClick={() => void change('resume')}>Retomar configuración</button>}
      {hasPendingSale && <p>Terminá o vaciá la venta antes de retomar la configuración. Tu carrito conserva su sucursal, caja y precios.</p>}
      <button className="text-button" disabled={locked} onClick={() => { void load(); onRefresh(); }}>Actualizar inicio</button>
    </section>}
    <section hidden={!visible} className="retail-panel" aria-label="Inicio guiado">
      <div className="section-heading">
        <h2 ref={heading} tabIndex={-1}>{step} de 3 · {step === 1 ? 'Tu comercio' : step === 2 ? 'Tus productos' : 'Empezar a vender'}</h2>
        <button className="text-button" disabled={locked} onClick={() => void change('dismiss')}>Configurar después</button>
      </div>
      <p>Estos pasos necesitan conexión. Podés retomarlos desde Mi comercio.</p>
      {error && <div className="error-banner" role="alert">{error}<button className="text-button" disabled={locked} onClick={() => { void load(); onRefresh(); }}>Actualizar y reintentar</button></div>}
      <div hidden={step !== 1}>
        <p>{branches.map(b => b.name).join(' · ') || 'Falta un local'} · {registers.filter(r => r.active).map(r => r.name).join(' · ') || 'Falta una caja'}</p>
        <form className="retail-form" onSubmit={e => {
          e.preventDefault();
          void change('details', () => guidedRun(() => retail.updateStore(store.id, {
            name: name.trim(), address: store.address, phone: store.phone,
            receipt_message: store.receipt_message, accent_color: store.accent_color,
          }), 'Datos confirmados'));
        }}>
          <label>Nombre del comercio<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
          <button className="primary-button" disabled={locked || !registers.some(r => r.active)}>Confirmar y continuar</button>
        </form>
        {(!branches.length || !registers.some(r => r.active) || !categories.length) && <button className="secondary-button" disabled={locked} onClick={async () => { if (await change('dismiss')) onSettings(); }}>Completar recursos faltantes en Mi comercio</button>}
      </div>
      <div hidden={step !== 2}>
        <p>{configuredProducts ? `${configuredProducts} productos guardados. Podés agregar más o continuar.` : 'Cargá tu primer producto. Si lo dejás para después, lo encontrás en Productos → Agregar producto.'}</p>
        {productsVisited && <CatalogEditor store={store} categories={categories} products={products} branches={branches} run={guidedRun} busy={locked} guided active={visible && step === 2} />}
        <button className="secondary-button" disabled={locked} onClick={() => void change('back_details')}>Volver a Tu comercio</button>
        <button className="primary-button" disabled={locked} onClick={() => void change('products')}>{configuredProducts ? 'Continuar' : 'Cargar productos después'}</button>
      </div>
      <div hidden={step !== 3}>
        <p>{branches.find(b => b.id === register?.branch_id)?.name} · {register?.name || 'Sin caja disponible'} · {ownShift || opened === register?.id ? 'Turno abierto' : occupied || shift ? 'Caja en uso' : 'Turno cerrado'}</p>
        {registers.filter(r => r.active).length > 1 && <label>Caja para trabajar<select disabled={locked || ownShift || !!opened} value={register?.id || ''} onChange={e => onRegisterChange(e.target.value)}>{registers.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{branches.find(b => b.id === r.branch_id)?.name} · {r.name}</option>)}</select></label>}
        {ownShift || opened === register?.id ? <button className="primary-button" disabled={locked} onClick={() => void finish()}>Continuar a Vender</button> : <CashDesk
          storeId={store.id} register={register} shift={undefined} shifts={[]} sales={[]} movements={[]}
          occupiedByOther={occupied || !!shift} canOperate={false} run={guidedRun} busy={locked}
          active={visible && step === 3} openFromSale openingOnly onTicket={() => {}} onRefresh={onRefresh}
          openShift={async (...args) => { const id = await retail.openOnboardingShift(...args); setOpened(args[1]); return id; }}
          onOpened={() => void finish()} />}
        <button className="secondary-button" disabled={locked} onClick={() => void change('back_products')}>Volver a Tus productos</button>
      </div>
    </section>
  </>;
}
