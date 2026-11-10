import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Table2, UserRound } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage, type Customer, type CustomerIva, type CustomerMovement } from './api';
import { CustomerSheet } from './CustomerSheet';
import type { Run } from './Management';
import './customers.css';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const methods = [['Efectivo', 'Efectivo'], ['QR', 'QR'], ['Transferencia', 'Transferencia'], ['Debito', 'Débito'], ['Credito', 'Crédito']] as const;
const kinds = { sale: 'Fiado', payment: 'Cobro', return: 'Devolución' };
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
  // Planilla para crear y editar clientes; `only` la limita al cliente que se está mirando.
  const [sheet, setSheet] = useState<{ only?: string[]; focusNew?: boolean } | null>(null);
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

  const open = (customer: Customer) => { setSelectedId(customer.id); setMovements(null); setAmount(''); setNote(''); setError(''); setSheet(null); };
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

  const sheetView = sheet && <CustomerSheet key={sheet.only?.join() || 'all'} storeId={storeId} customers={customers} only={sheet.only} focusNew={sheet.focusNew} busy={disabled} run={run}
    onSaved={async lastId => { await onChanged(); setSheet(null); if (lastId && !sheet.only) setSelectedId(lastId); }} onClose={() => setSheet(null)} />;

  if (selected) return <section className="retail-panel customers" aria-label={`Cuenta de ${selected.name}`}>
    <button type="button" className="text-button customers-back" onClick={() => setSelectedId('')}><ArrowLeft size={15} /> Todos los clientes</button>
    <div className="customers-head">
      <div><h2>{selected.name}</h2><small>{selected.phone || 'Sin teléfono'}{!selected.active ? ' · No se le fía' : ''}</small>
        {(selected.tax_id || selected.business_name || selected.iva_condition) && <small>{[selected.business_name, selected.tax_id ? `${selected.tax_id_type} ${selected.tax_id}` : '', selected.iva_condition ? ivaConditions[selected.iva_condition] : ''].filter(Boolean).join(' · ')}</small>}</div>
      <div className={`customers-balance ${selected.balance > 0 ? 'is-debt' : selected.balance < 0 ? 'is-credit' : ''}`}><small>{selected.balance < 0 ? 'Tiene a favor' : 'Debe'}</small><strong>{money(Math.abs(selected.balance))}</strong>
        <small>{selected.credit_limit === null ? 'Sin límite' : `Límite ${money(selected.credit_limit)}`}</small></div>
    </div>
    {canManage && !sheet && <button type="button" className="secondary-button" disabled={disabled} onClick={() => setSheet({ only: [selected.id] })}>Editar datos</button>}
    {sheetView}
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
      {error && <p role="alert" className="error-banner">{error}</p>}
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
      <div><h2 id="customers-title"><UserRound size={20} aria-hidden="true" /> Clientes</h2><small>Fiado y cobros de cada cliente</small></div>
      {canManage && !sheet && <div className="customers-head-actions">
        {!!customers.length && <button type="button" className="secondary-button" disabled={disabled} onClick={() => setSheet({})}><Table2 size={15} /> Editar en planilla</button>}
        <button type="button" className="primary-button" disabled={disabled} onClick={() => setSheet({ focusNew: true })}><Plus size={15} /> Nuevo cliente</button>
      </div>}
    </div>
    {sheetView}
    {!sheet && <>
    {/* Para qué sirve: abierto mientras no hay clientes; después queda plegado como ayuda. */}
    <details className="customers-guide" open={!customers.length}>
      <summary>¿Para qué sirven los clientes?</summary>
      <p>Para <strong>fiar</strong> y llevar la cuenta de cada uno sin cuaderno: qué se llevó, cuánto te pagó y cuánto debe.</p>
      <ol className="customers-steps">
        <li><strong>Cargalo una vez</strong><span>Nombre, teléfono y hasta cuánto le fiás. Vacío, sin límite.</span></li>
        <li><strong>Fiale en Vender</strong><span>Al cobrar elegí <em>Fiado</em> y el cliente. También se puede fiar solo una parte con <em>Mixto</em>.</span></li>
        <li><strong>Cobrale acá</strong><span>Entrá a su nombre y tocá <em>Registrar cobro</em>. Si paga de más, queda a favor para la próxima.</span></li>
      </ol>
      <p className="customers-guide-note">Con la facturación electrónica activa y su CUIT o DNI cargado, la factura sale a su nombre. Inicio te avisa quiénes te deben.</p>
    </details>
    {customers.length > 0 && <div className="customers-summary" role="group" aria-label="Resumen de clientes">
      <div className={owed > 0 ? 'is-debt' : ''}><small>Te deben</small><strong>{money(owed)}</strong><span>{customers.filter(customer => customer.balance > 0).length} con deuda</span></div>
      <div><small>Tienen a favor</small><strong>{money(customers.filter(customer => customer.balance < 0).reduce((sum, customer) => sum - customer.balance, 0))}</strong><span>pagaron de más</span></div>
      <div><small>Clientes</small><strong>{customers.length}</strong><span>{customers.filter(customer => !customer.active).length ? `${customers.filter(customer => !customer.active).length} sin fiado` : 'todos con fiado'}</span></div>
    </div>}
    <div className="customers-tools">
      <label>Buscar<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o teléfono" /></label>
      <label className="customers-check"><input type="checkbox" checked={onlyDebt} onChange={event => setOnlyDebt(event.target.checked)} /> Solo los que me deben</label>
    </div>
    {!customers.length ? <p className="customers-empty">{canManage ? 'Todavía no cargaste clientes. Con «Nuevo cliente» podés empezar a fiar.' : 'Todavía no hay clientes. Pedile a administración que los cargue.'}</p>
      : <ul className="customers-list">{shown.map(customer => <li key={customer.id}>
        <button type="button" disabled={disabled} onClick={() => open(customer)}>
          <span><strong>{customer.name}</strong><small>{customer.phone || 'Sin teléfono'}{!customer.active ? ' · No se le fía' : ''}</small>
            {customer.credit_limit !== null && customer.credit_limit > 0 && customer.balance > 0 && (() => {
              const used = Math.min(100, Math.round((customer.balance / customer.credit_limit) * 100));
              return <span className={`customers-limit ${used >= 100 ? 'is-full' : used >= 75 ? 'is-high' : ''}`} role="img" aria-label={`Usa el ${used}% de su límite`}>
                <span style={{ width: `${used}%` }} /><small>{used >= 100 ? 'Llegó al límite' : `Usa el ${used}% de su límite`}</small></span>;
            })()}</span>
          <span className={`customers-amount-cell ${customer.balance > 0 ? 'is-debt' : customer.balance < 0 ? 'is-credit' : ''}`}>{balanceText(customer.balance)}
            {customer.credit_limit !== null && <small>Límite {money(customer.credit_limit)}</small>}</span>
        </button>
      </li>)}</ul>}
    {!!customers.length && !shown.length && <p className="customers-empty">No hay clientes para esta búsqueda.</p>}
    </>}
  </section>;
}
