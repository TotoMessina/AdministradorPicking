import { Fragment, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileCheck2, Loader2, Plus, Trash2 } from 'lucide-react';
import { askConfirm } from '../../components/ConfirmHost';
import { NumberInput } from '../../components/NumberInput';
import { retail, errorMessage, type Supplier } from './api';
import type { Run } from './Management';
import type { StoredInvoiceFormat } from '../../services/invoiceFormatService';
import { cuitDigits, formatCuit, validCuit, type SupplierInvoiceRules } from '../../services/supplierInvoiceRules';
import { VAT_CONDITION_LABELS, emptySupplierProfile, sameSupplierProfile, supplierProfileErrors, type SupplierProfile } from '../../services/supplierProfile';
import { moveInColumn } from './sheetKeys';
import './product-sheet.css';

interface Row {
  key: string; original?: Supplier; format?: StoredInvoiceFormat;
  name: string; cuit: string; discount: string; notes: string; profile: SupplierProfile; rules: SupplierInvoiceRules;
  open: boolean; error: string;
}

let counter = 0;
const nextKey = () => `supplier-${Date.now()}-${counter++}`;
const blank = (): Row => ({ key: nextKey(), name: '', cuit: '', discount: '0', notes: '', profile: emptySupplierProfile(), rules: {}, open: false, error: '' });
const fromSupplier = (supplier: Supplier, format?: StoredInvoiceFormat): Row => ({ key: supplier.id, original: supplier, format, name: supplier.name,
  cuit: supplier.cuit ? formatCuit(supplier.cuit) : '', discount: String(supplier.discount_percent ?? 0), notes: supplier.notes ?? '',
  profile: supplier.profile ?? emptySupplierProfile(), rules: supplier.invoice_rules ?? {}, open: false, error: '' });
// Proveedor aprendido de sus facturas, todavía sin ficha: se guarda solo si se completa algo.
const fromFormat = (format: StoredInvoiceFormat): Row => ({ ...blank(), key: `format:${format.supplier_key}`, format, name: format.supplier_name });
const snapshot = (row: Row) => JSON.stringify([row.name.trim(), cuitDigits(row.cuit), Number(row.discount), row.notes.trim(), row.profile, row.rules]);

/**
 * Proveedores en planilla, como en Excel: una fila por proveedor con lo de todos los días a la vista y el resto
 * (datos fiscales, contactos, pago y cómo factura) en «Más datos». Guarda cada fila con el mismo `saveSupplier`.
 */
export function SupplierSheet({ storeId, suppliers, formats, busy, run, onSaved }: {
  storeId: string; suppliers: Supplier[]; formats: StoredInvoiceFormat[]; busy: boolean; run: Run; onSaved: () => void;
}) {
  const formatOf = (key: string) => formats.find(format => format.supplier_key === key);
  const initial = () => [...suppliers.map(supplier => fromSupplier(supplier, formatOf(supplier.supplier_key))),
    ...formats.filter(format => !suppliers.some(supplier => supplier.supplier_key === format.supplier_key)).map(fromFormat), blank()];
  const [rows, setRows] = useState<Row[]>(initial);
  const [base] = useState(() => new Map(rows.map(row => [row.key, snapshot(row)])));
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [query, setQuery] = useState('');
  const disabled = busy || Boolean(saving);

  const update = (key: string, change: Partial<Row>) => setRows(previous => {
    const next = previous.map(row => row.key === key ? { ...row, ...change, error: '' } : row);
    // Escribir en la última fila agrega otra vacía debajo.
    if (next.at(-1)?.name.trim()) next.push(blank());
    return next;
  });
  const setProfile = (row: Row, patch: Partial<SupplierProfile>) => update(row.key, { profile: { ...row.profile, ...patch } });
  const setRules = (row: Row, patch: SupplierInvoiceRules) => update(row.key, { rules: { ...row.rules, ...patch } });
  const text = (row: Row, field: keyof SupplierProfile) => (event: { target: { value: string } }) => setProfile(row, { [field]: event.target.value || null });
  const changed = (row: Row) => base.has(row.key) ? base.get(row.key) !== snapshot(row) : !!row.name.trim();
  const pending = rows.filter(changed);

  const validate = (row: Row) => {
    const discount = Number(row.discount);
    if (!row.name.trim()) return 'Falta el nombre.';
    if (rows.some(other => other.key !== row.key && other.name.trim().toLowerCase() === row.name.trim().toLowerCase())) return `«${row.name.trim()}» está repetido en la planilla.`;
    if (!row.discount.trim() || !Number.isFinite(discount) || discount < 0 || discount >= 100) return 'El descuento va de 0 a 99,99%.';
    if (cuitDigits(row.cuit) !== '' && !validCuit(row.cuit)) return 'El CUIT no es válido: revisá los 11 números.';
    const profileError = Object.values(supplierProfileErrors(row.profile))[0];
    return profileError ?? '';
  };

  const save = async () => {
    const checked = pending.map(row => ({ row, error: validate(row) }));
    if (checked.some(item => item.error)) {
      setRows(previous => previous.map(row => ({ ...row, error: checked.find(item => item.row.key === row.key)?.error ?? row.error, open: row.open || !!checked.find(item => item.row.key === row.key && item.error && /CBU|alias|plazo|correo/i.test(item.error)) })));
      return;
    }
    setSaving({ done: 0, total: checked.length });
    const failed = new Map<string, string>();
    await run(async () => {
      for (const { row } of checked) {
        const original = row.original;
        try {
          await retail.saveSupplier(storeId, {
            id: original?.id, name: row.name.trim(), discount_percent: Number(row.discount), notes: row.notes, revision: original?.revision,
            // Solo se envían si cambiaron: así guardar un descuento sigue funcionando antes de cada migración.
            ...(cuitDigits(row.cuit) !== (original?.cuit ?? '') ? { cuit: cuitDigits(row.cuit) } : {}),
            ...(JSON.stringify(row.rules) !== JSON.stringify(original?.invoice_rules ?? {}) ? { invoice_rules: row.rules } : {}),
            ...(!sameSupplierProfile(row.profile, original?.profile ?? emptySupplierProfile()) ? { profile: row.profile } : {}),
          });
        } catch (e) { failed.set(row.key, errorMessage(e)); }
        setSaving(current => current && { ...current, done: current.done + 1 });
      }
      if (failed.size) throw new Error(`${checked.length - failed.size} guardados; ${failed.size} con error: revisá las filas marcadas.`);
    }, checked.length === 1 ? 'Proveedor guardado' : `${checked.length} proveedores guardados`);
    setSaving(null);
    if (failed.size) setRows(previous => previous.map(row => failed.has(row.key) ? { ...row, error: failed.get(row.key)! } : row));
    if (failed.size < checked.length) onSaved();
  };

  const remove = async (row: Row) => {
    if (!row.original) { setRows(previous => previous.filter(item => item.key !== row.key)); return; }
    if (!await askConfirm(`¿Eliminar ${row.original.name}? Los productos conservan el nombre del proveedor; solo se deja de proponer su descuento.`)) return;
    if (await run(() => retail.deleteSupplier(storeId, row.original!), 'Proveedor eliminado')) onSaved();
  };
  const forget = async (format: StoredInvoiceFormat) => {
    if (!await askConfirm(`¿Olvidar el formato de factura de ${format.supplier_name}? La próxima factura se lee con IA y se vuelve a aprender al aplicarla.`)) return;
    if (await run(() => retail.deleteSupplierInvoiceFormat(storeId, format.supplier_name), 'Formato olvidado')) onSaved();
  };

  const search = query.trim().toLowerCase();
  const shown = rows.filter(row => !search || !row.original && !row.format && !row.name.trim() || `${row.name} ${row.cuit} ${row.profile.legal_name ?? ''}`.toLowerCase().includes(search));
  const errors = rows.filter(row => row.error).length;

  return <div className="product-sheet supplier-sheet">
    <div className="supplier-sheet-tools">
      <label>Buscar<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, CUIT o razón social" /></label>
      <small>Escribí en la última fila para agregar un proveedor. La flecha de cada fila abre datos fiscales, contacto, pago y cómo factura.</small>
    </div>
    <div className="product-sheet-scroll" role="region" aria-label="Planilla de proveedores" tabIndex={-1}>
      <table>
        <thead><tr>
          <th scope="col" className="col-n">#</th>
          <th scope="col" className="col-name">Nombre</th>
          <th scope="col">CUIT</th>
          <th scope="col" className="num" title="Se resta del costo de cada producto al cargar sus facturas">Descuento %</th>
          <th scope="col">IVA</th>
          <th scope="col" className="num" title="Días desde la factura hasta su vencimiento. 0 = contado">Paga a (días)</th>
          <th scope="col">Teléfono</th>
          <th scope="col">Correo</th>
          <th scope="col">Notas</th>
          <th scope="col"><span className="visually-hidden">Acciones</span></th>
        </tr></thead>
        <tbody>{shown.map((row, index) => {
          const label = row.name.trim() || `fila ${index + 1}`;
          const profileErrors = supplierProfileErrors(row.profile);
          return <Fragment key={row.key}>
            <tr className={`${row.error ? 'has-error' : ''} ${row.original && changed(row) ? 'is-changed' : ''}`}>
              <td className="col-n">{row.error ? <AlertTriangle size={14} aria-label="Con error" /> : index + 1}</td>
              <td data-col="name" className="col-name"><span className="supplier-sheet-name"><input value={row.name} maxLength={120} autoComplete="off" placeholder={row.original || row.format ? '' : 'Nuevo proveedor'} aria-label={`Nombre de ${label}`} disabled={disabled}
                onKeyDown={moveInColumn} onChange={event => update(row.key, { name: event.target.value })} />
                {row.format && <span className="supplier-sheet-badge" title="Factura conocida: las que coinciden con este formato se leen sin IA"><FileCheck2 size={12} aria-label="Factura conocida" /></span>}</span></td>
              <td data-col="cuit"><input value={row.cuit} inputMode="numeric" autoComplete="off" maxLength={13} placeholder="30-00000000-0" aria-label={`CUIT de ${label}`} disabled={disabled}
                aria-invalid={cuitDigits(row.cuit) !== '' && !validCuit(row.cuit)} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { cuit: event.target.value })} onBlur={() => { if (validCuit(row.cuit)) update(row.key, { cuit: formatCuit(row.cuit) }); }} /></td>
              <td data-col="discount" className="num"><NumberInput min={0} max={99.99} step={0.01} value={row.discount} aria-label={`Descuento de ${label}`} disabled={disabled}
                onKeyDown={moveInColumn} onValueChange={value => update(row.key, { discount: value })} /></td>
              <td data-col="vat"><select value={row.profile.vat_condition ?? ''} aria-label={`Condición frente al IVA de ${label}`} disabled={disabled} onKeyDown={moveInColumn}
                onChange={event => setProfile(row, { vat_condition: (event.target.value || null) as SupplierProfile['vat_condition'] })}>
                <option value="">—</option>{Object.entries(VAT_CONDITION_LABELS).map(([code, text]) => <option key={code} value={code}>{text}</option>)}</select></td>
              <td data-col="days" className="num"><NumberInput min={0} max={365} step={1} value={row.profile.payment_days ?? ''} placeholder="—" aria-label={`Días de pago de ${label}`} disabled={disabled}
                aria-invalid={!!profileErrors.payment_days} onKeyDown={moveInColumn} onValueChange={value => setProfile(row, { payment_days: value === '' ? null : Number(value) })} /></td>
              <td data-col="phone"><input type="tel" value={row.profile.phone ?? ''} maxLength={40} aria-label={`Teléfono de ${label}`} disabled={disabled} onKeyDown={moveInColumn} onChange={text(row, 'phone')} /></td>
              <td data-col="email"><input type="email" value={row.profile.email ?? ''} maxLength={160} aria-label={`Correo de ${label}`} disabled={disabled}
                aria-invalid={!!profileErrors.email} onKeyDown={moveInColumn} onChange={text(row, 'email')} /></td>
              <td data-col="notes"><input value={row.notes} maxLength={300} aria-label={`Notas de ${label}`} disabled={disabled} onKeyDown={moveInColumn} onChange={event => update(row.key, { notes: event.target.value })} /></td>
              <td className="col-actions">
                <button type="button" className="icon-button" aria-expanded={row.open} aria-label={`Más datos de ${label}`} title="Más datos" disabled={disabled}
                  onClick={() => setRows(previous => previous.map(item => item.key === row.key ? { ...item, open: !item.open } : item))}>{row.open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                {(row.original || row.name.trim()) && <button type="button" className="icon-button" aria-label={row.original ? `Eliminar ${label}` : `Quitar ${label}`} title={row.original ? 'Eliminar proveedor' : 'Quitar fila'} disabled={disabled} onClick={() => void remove(row)}><Trash2 size={15} /></button>}
              </td>
            </tr>
            {row.error && <tr className="product-sheet-error-row"><td /><td colSpan={9} role="alert">{row.error}</td></tr>}
            {row.open && <tr className="product-sheet-more"><td /><td colSpan={9}>
              <div className="supplier-sheet-more">
                <div className="product-sheet-presentations" role="group" aria-label={`Datos fiscales de ${label}`}>
                  <strong>Datos fiscales</strong>
                  <label>Razón social<input maxLength={160} value={row.profile.legal_name ?? ''} disabled={disabled} onChange={text(row, 'legal_name')} placeholder="Ej.: Castilla Distribuidora S.A." /></label>
                  <label>Domicilio fiscal<input maxLength={300} value={row.profile.fiscal_address ?? ''} disabled={disabled} onChange={text(row, 'fiscal_address')} /></label>
                  <label>Domicilio comercial<input maxLength={300} value={row.profile.commercial_address ?? ''} disabled={disabled} onChange={text(row, 'commercial_address')} placeholder="Si es distinto del fiscal" /></label>
                </div>
                <div className="product-sheet-presentations" role="group" aria-label={`Contacto y pago de ${label}`}>
                  <strong>Contacto y pago</strong>
                  <label>Contacto de cobranzas<input maxLength={160} value={row.profile.collections_contact ?? ''} disabled={disabled} onChange={text(row, 'collections_contact')} placeholder="Nombre y teléfono o correo" /></label>
                  <label>Ejecutivo de compra<input maxLength={160} value={row.profile.purchasing_contact ?? ''} disabled={disabled} onChange={text(row, 'purchasing_contact')} placeholder="Preventista o vendedor" /></label>
                  <label>CBU<input inputMode="numeric" autoComplete="off" maxLength={26} value={row.profile.bank_cbu ?? ''} disabled={disabled} aria-invalid={!!profileErrors.bank_cbu}
                    onChange={event => setProfile(row, { bank_cbu: event.target.value.replace(/[^\d\s]/g, '') || null })} />{profileErrors.bank_cbu && <small role="alert">{profileErrors.bank_cbu}</small>}</label>
                  <label>Alias<input autoComplete="off" maxLength={20} value={row.profile.bank_alias ?? ''} disabled={disabled} aria-invalid={!!profileErrors.bank_alias} onChange={text(row, 'bank_alias')} placeholder="Ej.: castilla.pagos" />
                    {profileErrors.bank_alias && <small role="alert">{profileErrors.bank_alias}</small>}</label>
                  <label>Condiciones de pago<input maxLength={300} value={row.profile.payment_terms ?? ''} disabled={disabled} onChange={text(row, 'payment_terms')} placeholder="Ej.: 5% por pago anticipado" /></label>
                </div>
                <div className="product-sheet-presentations" role="group" aria-label={`Cómo factura ${label}`}>
                  <strong>Cómo factura (dejalo así si sus facturas ya se cargan bien)</strong>
                  <label>Cantidad facturada<select value={row.rules.quantity_unit ?? 'auto'} disabled={disabled} onChange={event => setRules(row, { quantity_unit: event.target.value === 'unit' ? 'unit' : undefined })}>
                    <option value="auto">Detectar sola</option><option value="unit">Siempre por unidad suelta</option></select></label>
                  <label>Precios de la factura<select value={row.rules.price_basis ?? 'auto'} disabled={disabled} onChange={event => setRules(row, { price_basis: event.target.value === 'final' ? 'final' : undefined })}>
                    <option value="auto">Según el tipo (A sin IVA; B y C con IVA)</option><option value="final">Ya incluyen IVA e impuestos</option></select></label>
                  <label>Columna de costo<input maxLength={60} value={row.rules.cost_column ?? ''} disabled={disabled} onChange={event => setRules(row, { cost_column: event.target.value || undefined })} placeholder="Ej.: Final C/Dto." /></label>
                  <label className="checkbox-label"><input type="checkbox" checked={!!row.rules.amount_includes_vat} disabled={disabled} onChange={event => setRules(row, { amount_includes_vat: event.target.checked || undefined })} /> El importe de cada renglón ya incluye IVA</label>
                  <label className="checkbox-label"><input type="checkbox" checked={!!row.rules.merge_repeated_codes} disabled={disabled} onChange={event => setRules(row, { merge_repeated_codes: event.target.checked || undefined })} /> Agrupar renglones con el mismo código (bonificaciones aparte)</label>
                </div>
                {row.format && <p className="supplier-sheet-format"><FileCheck2 size={14} aria-hidden="true" /> Factura conocida ({row.format.samples} renglones confirmados{row.format.local_reads > 0 ? `, ${row.format.local_reads} leídas sin IA` : ''}): las que coinciden se leen sin IA.{' '}
                  <button type="button" className="text-button" disabled={disabled} onClick={() => void forget(row.format!)}>Olvidar formato</button></p>}
              </div>
            </td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
    <div className="product-sheet-footer">
      <button type="button" className="text-button" disabled={disabled} onClick={() => setRows(previous => [...previous, blank()])}><Plus size={15} /> Agregar fila</button>
      <small>Enter o las flechas pasan a la misma columna de la fila de abajo. Se guardan solo las filas que cambiaron, resaltadas.</small>
      {errors > 0 && <p role="alert" className="product-sheet-errors">{errors} {errors === 1 ? 'fila tiene' : 'filas tienen'} errores: revisalas antes de guardar.</p>}
      {saving && <p role="status"><Loader2 size={15} className="spin" /> Guardando {saving.done} de {saving.total}…</p>}
      <div className="product-sheet-actions">
        <button type="button" className="secondary-button" disabled={disabled || !pending.length} onClick={() => { setRows(initial()); }}>Descartar cambios</button>
        <button type="button" className="primary-button" disabled={disabled || !pending.length} onClick={() => void save()}>
          {pending.length ? `Guardar ${pending.length} ${pending.length === 1 ? 'proveedor' : 'proveedores'}` : 'Sin cambios'}</button>
      </div>
    </div>
  </div>;
}
