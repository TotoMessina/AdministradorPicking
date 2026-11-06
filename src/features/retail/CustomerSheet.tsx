import { Fragment, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Plus, Trash2, X } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage, type Customer, type CustomerIva } from './api';
import type { Run } from './Management';
import { moveInColumn } from './sheetKeys';
import './product-sheet.css';

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const ivaConditions: Record<CustomerIva, string> = { CF: 'Consumidor final', RI: 'Responsable inscripto', MO: 'Monotributo', EX: 'Exento' };

interface Row {
  key: string; original?: Customer;
  name: string; phone: string; credit_limit: string; active: boolean;
  business_name: string; tax_id_type: string; tax_id: string; iva_condition: string; address: string; email: string;
  open: boolean; error: string;
}
type Draft = Omit<Row, 'key' | 'original' | 'open' | 'error'>;
const fields: (keyof Draft)[] = ['name', 'phone', 'credit_limit', 'active', 'business_name', 'tax_id_type', 'tax_id', 'iva_condition', 'address', 'email'];

// El id nuevo se genera una vez por fila: reintentar el guardado no crea un cliente repetido.
const blank = (): Row => ({ key: randomUUID(), name: '', phone: '', credit_limit: '', active: true, business_name: '', tax_id_type: '', tax_id: '', iva_condition: '', address: '', email: '', open: false, error: '' });
const fromCustomer = (customer: Customer): Row => ({ key: customer.id, original: customer, name: customer.name, phone: customer.phone || '',
  credit_limit: customer.credit_limit === null ? '' : String(customer.credit_limit), active: customer.active,
  business_name: customer.business_name || '', tax_id_type: customer.tax_id_type || '', tax_id: customer.tax_id || '', iva_condition: customer.iva_condition || '',
  address: customer.address || '', email: customer.email || '', open: false, error: '' });

/**
 * Clientes en planilla: nombre, teléfono, límite de fiado y si se le fía, con los datos para facturar en «Más datos».
 * El saldo se ve pero no se edita: cambia solo con ventas fiadas, cobros y devoluciones.
 */
export function CustomerSheet({ storeId, customers, only, focusNew, busy, run, onSaved, onClose }: {
  storeId: string; customers: Customer[]; /** Abre solo estos clientes (por ejemplo, el que se está mirando). */ only?: string[];
  /** «Nuevo cliente»: el foco va a la fila vacía del final. */ focusNew?: boolean;
  busy: boolean; run: Run; onSaved: (lastId?: string) => Promise<void>; onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => [...customers.filter(customer => !only || only.includes(customer.id)).map(fromCustomer), ...(only ? [] : [blank()])]);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [query, setQuery] = useState('');
  const disabled = busy || Boolean(saving);
  const table = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const inputs = table.current?.querySelectorAll<HTMLInputElement>('td[data-col="name"] input');
    (focusNew ? inputs?.[inputs.length - 1] : inputs?.[0])?.focus();
    if (focusNew) inputs?.[inputs.length - 1]?.scrollIntoView({ block: 'nearest' });
  }, [focusNew]);

  const update = (key: string, change: Partial<Row>) => setRows(previous => {
    const next = previous.map(row => row.key === key ? { ...row, ...change, error: '' } : row);
    if (!only && next.at(-1)?.name.trim()) next.push(blank());
    return next;
  });
  const changed = (row: Row) => {
    if (!row.original) return !!row.name.trim();
    const fresh = fromCustomer(row.original);
    return fields.some(field => String(row[field]) !== String(fresh[field]));
  };
  const pending = rows.filter(changed);
  const validate = (row: Row) => {
    if (!row.name.trim()) return 'Falta el nombre.';
    if (row.credit_limit.trim() && !(Number(row.credit_limit) >= 0)) return 'Revisá el límite de fiado.';
    if (row.tax_id.trim() && !/^\d{7,11}$/.test(row.tax_id.trim())) return 'El documento va sin puntos ni guiones (7 a 11 números).';
    if (row.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email.trim())) return 'Revisá el correo.';
    return '';
  };

  const save = async () => {
    const checked = pending.map(row => ({ row, error: validate(row) }));
    if (checked.some(item => item.error)) {
      setRows(previous => previous.map(row => ({ ...row, error: checked.find(item => item.row.key === row.key)?.error || row.error })));
      return;
    }
    setSaving({ done: 0, total: checked.length });
    const failed = new Map<string, string>();
    await run(async () => {
      for (const { row } of checked) {
        try {
          await retail.saveCustomer(storeId, row.key, { name: row.name.trim(), phone: row.phone.trim(), credit_limit: row.credit_limit.trim(), active: row.active,
            business_name: row.business_name.trim(), tax_id_type: row.tax_id_type, tax_id: row.tax_id.trim(), iva_condition: row.iva_condition, address: row.address.trim(), email: row.email.trim() });
        } catch (e) { failed.set(row.key, errorMessage(e)); }
        setSaving(current => current && { ...current, done: current.done + 1 });
      }
      if (failed.size) throw new Error(`${checked.length - failed.size} guardados; ${failed.size} con error: revisá las filas marcadas.`);
    }, checked.length === 1 ? 'Cliente guardado' : `${checked.length} clientes guardados`);
    setSaving(null);
    if (failed.size) { setRows(previous => previous.map(row => failed.has(row.key) ? { ...row, error: failed.get(row.key)! } : row)); if (failed.size < checked.length) await onSaved(); return; }
    await onSaved(checked.length === 1 ? checked[0].row.key : undefined);
  };

  const search = query.trim().toLowerCase();
  const shown = rows.filter(row => !search || !row.original || `${row.name} ${row.phone} ${row.business_name} ${row.tax_id}`.toLowerCase().includes(search));
  const errors = rows.filter(row => row.error).length;

  return <section className="product-sheet customer-sheet" aria-labelledby="customer-sheet-title">
    <div className="product-sheet-head">
      <div>
        <h3 id="customer-sheet-title">{only?.length === 1 ? `Editar ${rows[0]?.name || 'cliente'}` : 'Clientes en planilla'}</h3>
        <p>Escribí en la última fila para agregar un cliente. El límite es hasta cuánto le podés fiar; vacío, sin límite. «Le fiás» en No: no se le fía más, pero queda con su saldo. El saldo cambia solo con ventas fiadas, cobros y devoluciones.</p>
      </div>
      <button type="button" className="icon-button" aria-label="Cerrar planilla" disabled={Boolean(saving)} onClick={onClose}><X size={18} /></button>
    </div>
    {!only && <div className="supplier-sheet-tools"><label>Buscar<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, teléfono o documento" /></label></div>}
    <div className="product-sheet-scroll" role="region" aria-label="Planilla de clientes" tabIndex={-1}>
      <table ref={table}>
        <thead><tr>
          <th scope="col" className="col-n">#</th>
          <th scope="col" className="col-name">Nombre</th>
          <th scope="col">Teléfono</th>
          <th scope="col" className="num" title="Hasta cuánto le podés fiar">Límite de fiado</th>
          <th scope="col">Le fiás</th>
          <th scope="col" className="num">Saldo</th>
          <th scope="col">Documento</th>
          <th scope="col">IVA</th>
          <th scope="col"><span className="visually-hidden">Acciones</span></th>
        </tr></thead>
        <tbody>{shown.map((row, index) => {
          const label = row.name.trim() || `fila ${index + 1}`;
          const balance = row.original?.balance ?? 0;
          return <Fragment key={row.key}>
            <tr className={`${row.error ? 'has-error' : ''} ${row.original && changed(row) ? 'is-changed' : ''}`}>
              <td className="col-n">{row.error ? <AlertTriangle size={14} aria-label="Con error" /> : index + 1}</td>
              <td data-col="name" className="col-name"><input value={row.name} maxLength={120} autoComplete="off" placeholder={row.original ? '' : 'Nuevo cliente'} aria-label={`Nombre de ${label}`} disabled={disabled}
                onKeyDown={moveInColumn} onChange={event => update(row.key, { name: event.target.value })} /></td>
              <td data-col="phone"><input type="tel" value={row.phone} maxLength={40} aria-label={`Teléfono de ${label}`} disabled={disabled} onKeyDown={moveInColumn} onChange={event => update(row.key, { phone: event.target.value })} /></td>
              <td data-col="limit" className="num"><NumberInput min={0} step={0.01} value={row.credit_limit} placeholder="Sin límite" aria-label={`Límite de fiado de ${label}`} disabled={disabled}
                onKeyDown={moveInColumn} onValueChange={value => update(row.key, { credit_limit: value })} /></td>
              <td data-col="active"><select value={row.active ? 'yes' : 'no'} aria-label={`¿Le fiás a ${label}?`} disabled={disabled} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { active: event.target.value === 'yes' })}><option value="yes">Sí</option><option value="no">No, ya no</option></select></td>
              <td className={`num calc customer-sheet-balance ${balance > 0 ? 'is-debt' : balance < 0 ? 'is-credit' : ''}`}>{!row.original ? '—' : balance > 0 ? `Debe ${money(balance)}` : balance < 0 ? `A favor ${money(-balance)}` : 'Al día'}</td>
              <td data-col="taxid"><input value={row.tax_id} inputMode="numeric" maxLength={14} placeholder="DNI o CUIT" aria-label={`Documento de ${label}`} disabled={disabled}
                onKeyDown={moveInColumn} onChange={event => update(row.key, { tax_id: event.target.value.replace(/\D/g, '') })} /></td>
              <td data-col="iva"><select value={row.iva_condition} aria-label={`Condición frente al IVA de ${label}`} disabled={disabled} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { iva_condition: event.target.value })}><option value="">—</option>
                {(Object.keys(ivaConditions) as CustomerIva[]).map(key => <option key={key} value={key}>{ivaConditions[key]}</option>)}</select></td>
              <td className="col-actions">
                <button type="button" className="icon-button" aria-expanded={row.open} aria-label={`Más datos de ${label}`} title="Datos para facturar" disabled={disabled}
                  onClick={() => setRows(previous => previous.map(item => item.key === row.key ? { ...item, open: !item.open } : item))}>{row.open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                {!row.original && row.name.trim() && <button type="button" className="icon-button" aria-label={`Quitar ${label}`} title="Quitar fila" disabled={disabled}
                  onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))}><Trash2 size={15} /></button>}
              </td>
            </tr>
            {row.error && <tr className="product-sheet-error-row"><td /><td colSpan={8} role="alert">{row.error}</td></tr>}
            {row.open && <tr className="product-sheet-more"><td /><td colSpan={8}>
              <div className="product-sheet-presentations" role="group" aria-label={`Datos para facturar a ${label}`}>
                <strong>Datos para facturar (opcional)</strong>
                <label>Razón social<input maxLength={160} value={row.business_name} disabled={disabled} placeholder="Si es distinta del nombre" onChange={event => update(row.key, { business_name: event.target.value })} /></label>
                <label>Tipo de documento<select value={row.tax_id_type} disabled={disabled} onChange={event => update(row.key, { tax_id_type: event.target.value })}>
                  <option value="">Según la cantidad de números</option><option value="CUIT">CUIT</option><option value="CUIL">CUIL</option><option value="DNI">DNI</option></select></label>
                <label>Domicilio<input maxLength={200} value={row.address} disabled={disabled} onChange={event => update(row.key, { address: event.target.value })} /></label>
                <label>Correo<input type="email" maxLength={254} value={row.email} disabled={disabled} onChange={event => update(row.key, { email: event.target.value })} /></label>
              </div>
            </td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
    <div className="product-sheet-footer">
      {!only && <button type="button" className="text-button" disabled={disabled} onClick={() => setRows(previous => [...previous, blank()])}><Plus size={15} /> Agregar fila</button>}
      <small>Enter o las flechas pasan a la misma columna de la fila de abajo. Se guardan solo las filas que cambiaron, resaltadas.</small>
      {errors > 0 && <p role="alert" className="product-sheet-errors">{errors} {errors === 1 ? 'fila tiene' : 'filas tienen'} errores: revisalas antes de guardar.</p>}
      {saving && <p role="status"><Loader2 size={15} className="spin" /> Guardando {saving.done} de {saving.total}…</p>}
      <div className="product-sheet-actions">
        <button type="button" className="secondary-button" disabled={Boolean(saving)} onClick={onClose}>Cancelar</button>
        <button type="button" className="primary-button" disabled={disabled || !pending.length} onClick={() => void save()}>
          {pending.length ? `Guardar ${pending.length} ${pending.length === 1 ? 'cliente' : 'clientes'}` : 'Sin cambios'}</button>
      </div>
    </div>
  </section>;
}
