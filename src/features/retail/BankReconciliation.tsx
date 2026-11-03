import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NumberInput } from '../../components/NumberInput';
import { askConfirm } from '../../components/ConfirmHost';
import { randomUUID } from '../../utils/uuid';
import { errorMessage } from './api';
import type { Run } from './Management';
import './bank-reconciliation.css';

type Method = 'QR' | 'Debito' | 'Credito' | 'Transferencia';
interface MethodRow { method: Method; sold: number; net: number; commission: number; taxes: number; deposits: number; difference: number }
interface Deposit { id: string; method: Method; provider: string | null; deposited_on: string; sales_from: string; sales_to: string; net: number; commission: number; taxes: number; reference: string | null; note: string | null; actor_email: string | null; voided_at: string | null; void_reason: string | null }
interface Report { methods: MethodRow[]; deposits: Deposit[] }

const labels: Record<Method, string> = { QR: 'QR / billeteras', Debito: 'Débito', Credito: 'Crédito', Transferencia: 'Transferencias' };
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const zone = 'America/Argentina/Buenos_Aires';
const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const emptyDraft = (today: string) => ({ method: 'QR' as Method, provider: '', deposited_on: today, sales_from: today, sales_to: today, net: '', commission: '', taxes: '', reference: '', note: '' });
// Diferencias menores a un peso no se marcan: son redondeos.
const TOLERANCE = 1;

/**
 * Conciliación: lo que entró al banco o a la billetera contra lo vendido por QR, tarjetas y transferencias.
 * El efectivo sigue en el arqueo de cada caja; esta pantalla no lo muestra.
 */
export function BankReconciliation({ storeId, run, busy, active }: { storeId: string; run: Run; busy: boolean; active: boolean }) {
  const today = day(new Date());
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(today));
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voiding, setVoiding] = useState<{ id: string; reason: string } | null>(null);

  const load = useCallback(async () => {
    if (to < from) { setError('«Hasta» no puede ser anterior a «Desde».'); return; }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('retail_bank_reconciliation', { p_store: storeId, p_from: from, p_to: to });
      if (rpcError) throw rpcError;
      const value = data as Report;
      setReport({ methods: value.methods.map(row => ({ ...row, sold: Number(row.sold), net: Number(row.net), commission: Number(row.commission), taxes: Number(row.taxes), difference: Number(row.difference) })),
        deposits: value.deposits.map(row => ({ ...row, net: Number(row.net), commission: Number(row.commission), taxes: Number(row.taxes) })) });
      setError('');
    } catch (e) { setError(/retail_bank_reconciliation|schema cache/.test(errorMessage(e)) ? 'Falta aplicar la actualización 202611030001 en Supabase.' : errorMessage(e)); }
    finally { setLoading(false); }
  }, [storeId, from, to]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const save = async () => {
    if (!(Number(draft.net) + Number(draft.commission || 0) + Number(draft.taxes || 0) > 0)) { setError('Cargá lo que acreditaron.'); return; }
    const id = editing && editing !== 'new' ? editing : randomUUID();
    if (await run(async () => { const { error: rpcError } = await supabase.rpc('retail_save_bank_deposit', { p_store: storeId, p_id: id, p_deposit: draft }); if (rpcError) throw rpcError; }, 'Liquidación guardada')) {
      setEditing(null); setDraft(emptyDraft(today)); await load();
    }
  };
  const voidDeposit = async (deposit: Deposit) => {
    const reason = voiding?.id === deposit.id ? voiding.reason.trim() : '';
    if (!reason) { setError('Escribí por qué se anula.'); return; }
    if (!await askConfirm(`¿Anular la liquidación de ${labels[deposit.method]} por ${money(deposit.net)}?`)) return;
    if (await run(async () => { const { error: rpcError } = await supabase.rpc('retail_void_bank_deposit', { p_store: storeId, p_id: deposit.id, p_reason: reason }); if (rpcError) throw rpcError; }, 'Liquidación anulada')) { setVoiding(null); await load(); }
  };
  const startEdit = (deposit?: Deposit) => {
    setEditing(deposit?.id || 'new'); setError('');
    setDraft(deposit ? { method: deposit.method, provider: deposit.provider || '', deposited_on: deposit.deposited_on, sales_from: deposit.sales_from, sales_to: deposit.sales_to,
      net: String(deposit.net), commission: String(deposit.commission), taxes: String(deposit.taxes), reference: deposit.reference || '', note: deposit.note || '' } : emptyDraft(today));
  };
  const set = (key: keyof typeof draft) => (value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const totals = report?.methods.reduce((sum, row) => ({ commission: sum.commission + row.commission, taxes: sum.taxes + row.taxes }), { commission: 0, taxes: 0 });

  return <section className="retail-panel bank-reconciliation" aria-labelledby="bank-title">
    <div className="section-heading"><div><h2 id="bank-title">Conciliación</h2>
      <p>Lo que entró al banco o a la billetera contra lo vendido por QR, tarjetas y transferencias. El efectivo se controla en el arqueo de cada caja.</p></div>
      <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
    </div>
    <div className="bank-period">
      <label>Ventas desde<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
      <label>Hasta<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Calculando…</p>}
    {report && <div className="bank-methods">{report.methods.map(row => {
      const off = Math.abs(row.difference) >= TOLERANCE;
      return <article key={row.method} className={`bank-method ${off ? 'is-off' : ''}`}>
        <h3>{labels[row.method]}</h3>
        <dl>
          <div><dt>Vendido</dt><dd>{money(row.sold)}</dd></div>
          <div><dt>Acreditado</dt><dd>{money(row.net)}</dd></div>
          <div><dt>Comisiones</dt><dd>{money(row.commission)}</dd></div>
          {row.taxes > 0 && <div><dt>Retenciones</dt><dd>{money(row.taxes)}</dd></div>}
        </dl>
        <p className="bank-difference">{!row.sold && !row.deposits ? 'Sin ventas ni liquidaciones.' : !off ? 'Coincide.' : row.difference < 0 ? <><AlertTriangle size={14} aria-hidden="true" /> Falta acreditar {money(-row.difference)}</> : <><AlertTriangle size={14} aria-hidden="true" /> Liquidaron {money(row.difference)} de más</>}</p>
        <small>{row.deposits} {row.deposits === 1 ? 'liquidación' : 'liquidaciones'} con días de venta dentro del período.</small>
      </article>;
    })}</div>}
    {totals && (totals.commission > 0 || totals.taxes > 0) && <p className="bank-note">Comisiones del período: <strong>{money(totals.commission)}</strong>{totals.taxes ? ` · Retenciones: ${money(totals.taxes)} (no se restan en Ganancias: son impuestos a cuenta)` : ''}. Ganancias toma las comisiones de estas liquidaciones: no las cargues también como gasto.</p>}

    <div className="bank-deposits-head"><h3>Liquidaciones</h3>{!editing && <button type="button" className="primary-button" disabled={busy || !active} onClick={() => startEdit()}><Plus size={15} /> Cargar liquidación</button>}</div>
    {editing && <form className="retail-form bank-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy}>
        <label>Medio<select value={draft.method} onChange={event => set('method')(event.target.value)}>{(Object.keys(labels) as Method[]).map(method => <option key={method} value={method}>{labels[method]}</option>)}</select></label>
        <label>Quién liquida (opcional)<input maxLength={80} value={draft.provider} onChange={event => set('provider')(event.target.value)} placeholder="Banco, billetera, posnet" /></label>
        <label>Fecha en que entró<input type="date" required value={draft.deposited_on} onChange={event => set('deposited_on')(event.target.value)} /></label>
        <label>Ventas desde<input type="date" required value={draft.sales_from} max={draft.sales_to} onChange={event => set('sales_from')(event.target.value)} /></label>
        <label>Ventas hasta<input type="date" required value={draft.sales_to} min={draft.sales_from} onChange={event => set('sales_to')(event.target.value)} /></label>
        <label>Acreditado ($)<NumberInput min={0} step={0.01} value={draft.net} onValueChange={set('net')} /></label>
        <label>Comisión ($)<NumberInput min={0} step={0.01} value={draft.commission} onValueChange={set('commission')} /></label>
        <label>Retenciones e impuestos ($)<NumberInput min={0} step={0.01} value={draft.taxes} onValueChange={set('taxes')} /></label>
        <label>Referencia (opcional)<input maxLength={120} value={draft.reference} onChange={event => set('reference')(event.target.value)} /></label>
      </fieldset>
      <small>Acreditado + comisión + retenciones debería ser igual a lo vendido por ese medio en esos días.</small>
      <div className="location-transfer-record-actions"><button className="primary-button" disabled={busy}>Guardar</button><button type="button" className="secondary-button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button></div>
    </form>}
    {report && !report.deposits.length && <p className="bank-note">Todavía no hay liquidaciones en este período.</p>}
    {report && report.deposits.length > 0 && <ul className="bank-deposits">{report.deposits.map(deposit => <li key={deposit.id} className={deposit.voided_at ? 'is-voided' : undefined}>
      <div><strong>{labels[deposit.method]} · {money(deposit.net)}</strong><small>Entró el {new Date(`${deposit.deposited_on}T12:00:00`).toLocaleDateString('es-AR')} · ventas del {new Date(`${deposit.sales_from}T12:00:00`).toLocaleDateString('es-AR')} al {new Date(`${deposit.sales_to}T12:00:00`).toLocaleDateString('es-AR')}{deposit.provider ? ` · ${deposit.provider}` : ''}</small>
        <small>Comisión {money(deposit.commission)}{deposit.taxes ? ` · retenciones ${money(deposit.taxes)}` : ''}{deposit.reference ? ` · ${deposit.reference}` : ''}{deposit.actor_email ? ` · ${deposit.actor_email}` : ''}</small>
        {deposit.voided_at && <small>Anulada: {deposit.void_reason}</small>}</div>
      {!deposit.voided_at && <div className="location-transfer-record-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => startEdit(deposit)}>Editar</button><button type="button" className="text-button" disabled={busy} onClick={() => setVoiding({ id: deposit.id, reason: '' })}>Anular</button></div>}
      {voiding?.id === deposit.id && <form className="bank-void" onSubmit={event => { event.preventDefault(); void voidDeposit(deposit); }}>
        <label>¿Por qué se anula?<input autoFocus maxLength={300} value={voiding.reason} onChange={event => setVoiding({ id: deposit.id, reason: event.target.value })} /></label>
        <button className="secondary-button" disabled={busy}>Anular liquidación</button><button type="button" className="text-button" onClick={() => setVoiding(null)}>Cancelar</button>
      </form>}
    </li>)}</ul>}
  </section>;
}
