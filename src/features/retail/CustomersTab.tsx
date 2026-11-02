import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Plus, UserRound } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage, type Customer, type CustomerIva, type CustomerMovement } from './api';
import type { Run } from './Management';
import './customers.css';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const methods = [['Efectivo', 'Efectivo'], ['QR', 'QR'], ['Transferencia', 'Transferencia'], ['Debito', 'Débito'], ['Credito', 'Crédito']] as const;
const kinds = { sale: 'Fiado', payment: 'Cobro', return: 'Devolución' };
const emptyDraft = { name: '', phone: '', credit_limit: '', active: true, business_name: '', tax_id_type: '', tax_id: '', iva_condition: '', address: '', email: '' };
const ivaConditions: Record<CustomerIva, string> = { CF: 'Consumidor final', RI: 'Responsable inscripto', MO: 'Monotributo', EX: 'Exento' };
const balanceText = (balance: number) => balance > 0 ? `Debe ${money(balance)}` : balance < 0 ? `A favor ${money(-balance)}` : 'Al día';

/**
 * Clientes y cuenta corriente. Fiar suma deuda; cobrar la baja. El efectivo cobrado entra a la caja
 * abierta de quien cobra; los otros medios no tocan la caja.
 */
export function CustomersTab({ storeId, customers, shiftId, canManage, run, busy, active, onChanged }: {
  storeId: string; customers: Customer[]; shiftId?: string; canManage: boolean; run: Run; busy: boolean; active: boolean; onChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [onlyDebt, setOnlyDebt] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [movements, setMovements] = useState<CustomerMovement[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<typeof methods[number][0]>('Efectivo');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const payment = useRef({ signature: '', id: '' });
  const disabled = busy || !active;
  const selected = customers.find(customer => customer.id === selectedId);
  const owed = customers.filter(customer => customer.balance > 0).reduce((sum, customer) => sum + customer.balance, 0);
  const shown = customers.filter(customer => (!onlyDebt || customer.balance > 0)
    && `${customer.name} ${customer.phone || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!selectedId) return;
    let current = true;
    retail.customerMovements(storeId, selectedId).then(rows => { if (current) { setMovements(rows); setLoadError(''); } })
      .catch(e => { if (current) setLoadError(errorMessage(e)); });
    return () => { current = false; };
  }, [storeId, selectedId, selected?.balance]);

  const open = (customer: Customer) => { setSelectedId(customer.id); setMovements(null); setAmount(''); setNote(''); setError(''); setEditing(null); };
  const startEdit = (customer?: Customer) => {
    setEditing(customer?.id || 'new'); setError('');
    setDraft(customer ? { name: customer.name, phone: customer.phone || '', credit_limit: customer.credit_limit === null ? '' : String(customer.credit_limit), active: customer.active,
      business_name: customer.business_name || '', tax_id_type: customer.tax_id_type || '', tax_id: customer.tax_id || '', iva_condition: customer.iva_condition || '', address: customer.address || '', email: customer.email || '' } : emptyDraft);
  };
  const save = async () => {
    if (!draft.name.trim()) { setError('Escribí el nombre del cliente.'); return; }
    const id = editing === 'new' || !editing ? randomUUID() : editing;
    if (await run(() => retail.saveCustomer(storeId, id, draft), 'Cliente guardado')) {
      setEditing(null); await onChanged(); setSelectedId(id);
    }
  };
  const collect = async () => {
    if (!selected) return;
    const value = Number(amount);
    if (!(value > 0)) { setError('Escribí cuánto te pagó.'); return; }
    if (method === 'Efectivo' && !shiftId) { setError('Abrí tu caja para cobrar en efectivo, o elegí otro medio.'); return; }
    // El mismo identificador se reusa si se reintenta el mismo cobro, así no se registra dos veces.
    const signature = JSON.stringify([selected.id, value, method, note]);
    if (payment.current.signature !== signature) payment.current = { signature, id: randomUUID() };
    setError('');
    if (await run(() => retail.customerPayment(storeId, selected.id, payment.current.id, value, method, method === 'Efectivo' ? shiftId || null : null, note), 'Cobro registrado')) {
      payment.current = { signature: '', id: '' }; setAmount(''); setNote(''); await onChanged();
    }
  };

  const form = editing && <form className="retail-form customers-form" onSubmit={event => { event.preventDefault(); void save(); }}>
    <h3>{editing === 'new' ? 'Nuevo cliente' : `Editar ${draft.name}`}</h3>
    <fieldset disabled={disabled}>
      <label>Nombre<input required maxLength={120} value={draft.name} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} /></label>
      <label>Teléfono (opcional)<input type="tel" maxLength={40} value={draft.phone} onChange={event => setDraft(previous => ({ ...previous, phone: event.target.value }))} /></label>
      <label>Límite de deuda (opcional)<NumberInput min={0} step={0.01} value={draft.credit_limit} placeholder="Sin límite" onValueChange={value => setDraft(previous => ({ ...previous, credit_limit: value }))} /></label>
      <details className="customers-billing" open={!!(draft.tax_id || draft.business_name || draft.iva_condition)}>
        <summary>Datos para facturar (opcional)</summary>
        <div className="customers-billing-fields">
          <label>Razón social<input maxLength={160} value={draft.business_name} onChange={event => setDraft(previous => ({ ...previous, business_name: event.target.value }))} placeholder="Si es distinta del nombre" /></label>
          <label>Documento<select value={draft.tax_id_type} onChange={event => setDraft(previous => ({ ...previous, tax_id_type: event.target.value }))}><option value="">Según la cantidad de números</option><option value="CUIT">CUIT</option><option value="CUIL">CUIL</option><option value="DNI">DNI</option></select></label>
          <label>Número<input inputMode="numeric" maxLength={14} value={draft.tax_id} onChange={event => setDraft(previous => ({ ...previous, tax_id: event.target.value }))} placeholder="Sin guiones" /></label>
          <label>Condición frente al IVA<select value={draft.iva_condition} onChange={event => setDraft(previous => ({ ...previous, iva_condition: event.target.value }))}><option value="">Sin indicar</option>{(Object.keys(ivaConditions) as CustomerIva[]).map(key => <option key={key} value={key}>{ivaConditions[key]}</option>)}</select></label>
          <label>Domicilio<input maxLength={200} value={draft.address} onChange={event => setDraft(previous => ({ ...previous, address: event.target.value }))} /></label>
          <label>Email<input type="email" maxLength={254} value={draft.email} onChange={event => setDraft(previous => ({ ...previous, email: event.target.value }))} /></label>
        </div>
      </details>
      {editing !== 'new' && <label className="customers-check"><input type="checkbox" checked={!draft.active} onChange={event => setDraft(previous => ({ ...previous, active: !event.target.checked }))} /> No fiarle más (queda en la lista con su saldo)</label>}
    </fieldset>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="customers-actions"><button className="primary-button" disabled={disabled}>Guardar</button><button type="button" className="secondary-button" disabled={disabled} onClick={() => setEditing(null)}>Cancelar</button></div>
  </form>;

  if (selected) return <section className="retail-panel customers" aria-label={`Cuenta de ${selected.name}`}>
    <button type="button" className="text-button customers-back" onClick={() => setSelectedId('')}><ArrowLeft size={15} /> Todos los clientes</button>
    <div className="customers-head">
      <div><h2>{selected.name}</h2><small>{selected.phone || 'Sin teléfono'}{!selected.active ? ' · No se le fía' : ''}</small>
        {(selected.tax_id || selected.business_name || selected.iva_condition) && <small>{[selected.business_name, selected.tax_id ? `${selected.tax_id_type} ${selected.tax_id}` : '', selected.iva_condition ? ivaConditions[selected.iva_condition] : ''].filter(Boolean).join(' · ')}</small>}</div>
      <div className={`customers-balance ${selected.balance > 0 ? 'is-debt' : selected.balance < 0 ? 'is-credit' : ''}`}><small>{selected.balance < 0 ? 'Tiene a favor' : 'Debe'}</small><strong>{money(Math.abs(selected.balance))}</strong>
        <small>{selected.credit_limit === null ? 'Sin límite' : `Límite ${money(selected.credit_limit)}`}</small></div>
    </div>
    {canManage && !editing && <button type="button" className="secondary-button" disabled={disabled} onClick={() => startEdit(selected)}>Editar datos</button>}
    {form}
    {<form className="retail-form customers-form" onSubmit={event => { event.preventDefault(); void collect(); }}>
      <h3>{selected.balance > 0 ? 'Registrar cobro' : 'Dejar plata a cuenta'}</h3>
      <fieldset disabled={disabled}>
        <label>¿Cuánto te pagó?<span className="customers-amount"><NumberInput min={0.01} step={0.01} value={amount} onValueChange={setAmount} />
          {selected.balance > 0 && <button type="button" className="secondary-button" onClick={() => setAmount(String(selected.balance))}>Todo ({money(selected.balance)})</button>}</span></label>
        <label>¿Cómo te pagó?<select value={method} onChange={event => setMethod(event.target.value as typeof method)}>{methods.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Nota (opcional)<input maxLength={300} value={note} onChange={event => setNote(event.target.value)} /></label>
      </fieldset>
      {Number(amount) > 0 && <small>{Number(amount) > Math.max(selected.balance, 0) ? `Queda a favor ${money(Number(amount) - Math.max(selected.balance, 0))} para próximas compras.` : `Queda debiendo ${money(selected.balance - Number(amount))}.`}</small>}
      {method === 'Efectivo' && <small>{shiftId ? 'El efectivo entra a tu caja abierta.' : 'Para cobrar en efectivo tenés que tener tu caja abierta.'}</small>}
      {error && !editing && <p role="alert" className="error-banner">{error}</p>}
      <div className="customers-actions"><button className="primary-button" disabled={disabled}>{selected.balance > 0 ? 'Registrar cobro' : 'Guardar a cuenta'}</button></div>
    </form>}
    <h3>Movimientos</h3>
    {loadError && <p role="alert" className="error-banner">{loadError}</p>}
    {!movements ? <p role="status"><Loader2 size={15} className="spin" /> Cargando…</p> : !movements.length ? <p className="customers-empty">Todavía no hay movimientos.</p>
      : <div className="table-scroll"><table className="customers-table"><thead><tr><th scope="col">Fecha</th><th scope="col">Qué</th><th scope="col" className="is-number">Importe</th></tr></thead>
        <tbody>{movements.map(row => <tr key={row.id}>
          <td>{new Date(row.created_at).toLocaleString('es-AR')}<small>{row.actor_email || ''}</small></td>
          <td>{kinds[row.kind]}{row.method ? ` · ${methods.find(([id]) => id === row.method)?.[1] || row.method}` : ''}{row.note ? <small>{row.note}</small> : null}</td>
          <td className={`is-number ${row.amount > 0 ? 'is-debt' : 'is-paid'}`}>{row.amount > 0 ? '+' : '−'}{money(Math.abs(row.amount))}</td>
        </tr>)}</tbody></table></div>}
  </section>;

  return <section className="retail-panel customers" aria-labelledby="customers-title">
    <div className="customers-head">
      <div><h2 id="customers-title"><UserRound size={20} aria-hidden="true" /> Clientes</h2><small>Te deben en total {money(owed)}</small></div>
      {canManage && !editing && <button type="button" className="primary-button" disabled={disabled} onClick={() => startEdit()}><Plus size={15} /> Nuevo cliente</button>}
    </div>
    {form}
    <div className="customers-tools">
      <label>Buscar<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o teléfono" /></label>
      <label className="customers-check"><input type="checkbox" checked={onlyDebt} onChange={event => setOnlyDebt(event.target.checked)} /> Solo los que me deben</label>
    </div>
    {!customers.length ? <p className="customers-empty">{canManage ? 'Todavía no cargaste clientes. Con «Nuevo cliente» podés empezar a fiar.' : 'Todavía no hay clientes. Pedile a administración que los cargue.'}</p>
      : <ul className="customers-list">{shown.map(customer => <li key={customer.id}>
        <button type="button" disabled={disabled} onClick={() => open(customer)}>
          <span><strong>{customer.name}</strong><small>{customer.phone || 'Sin teléfono'}{!customer.active ? ' · No se le fía' : ''}</small></span>
          <span className={`customers-amount-cell ${customer.balance > 0 ? 'is-debt' : customer.balance < 0 ? 'is-credit' : ''}`}>{balanceText(customer.balance)}
            {customer.credit_limit !== null && <small>Límite {money(customer.credit_limit)}</small>}</span>
        </button>
      </li>)}</ul>}
    {!!customers.length && !shown.length && <p className="customers-empty">No hay clientes para esta búsqueda.</p>}
  </section>;
}
