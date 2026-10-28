import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Truck } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { retail, errorMessage, type Supplier } from './api';
import { SettingsEditor } from './SettingsEditor';
import type { Run } from './Management';
import type { StoredInvoiceFormat } from '../../services/invoiceFormatService';

const percent = (value: number) => `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

function SupplierForm({ storeId, supplier, initialName, format, busy, run, close, onSaved }: {
  storeId: string; supplier?: Supplier; initialName?: string; format?: StoredInvoiceFormat; busy: boolean; run: Run; close: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name ?? initialName ?? '');
  const [discount, setDiscount] = useState(String(supplier?.discount_percent ?? 0));
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [error, setError] = useState('');
  const value = Number(discount);
  const valid = name.trim() !== '' && discount.trim() !== '' && Number.isFinite(value) && value >= 0 && value < 100;
  return <form className="retail-form" onSubmit={async event => {
    event.preventDefault();
    if (busy || !valid) return;
    setError('');
    const ok = await run(async () => {
      try { await retail.saveSupplier(storeId, { id: supplier?.id, name, discount_percent: value, notes, revision: supplier?.revision }); }
      catch (e) { setError(errorMessage(e)); throw e; }
    }, supplier ? 'Proveedor actualizado' : 'Proveedor guardado');
    if (ok) { onSaved(); close(); }
  }}>
    <label>Nombre<input required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Como figura en sus facturas" /></label>
    <label>Descuento que te hace (%)<NumberInput type="number" required min="0" max="99.99" step="0.01" value={discount} disabled={busy} onValueChange={setDiscount} /></label>
    <p>Se resta del costo de cada producto al cargar sus facturas: costo $1.000 con 10% → $900. Dejalo en 0 si los precios de la factura ya vienen con el descuento.</p>
    <label>Notas (opcional)<input maxLength={300} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} placeholder="Ej.: descuento por pago contado" /></label>
    {format && <p>
      <FileCheck2 size={14} aria-hidden="true" /> Formato de factura conocido ({format.samples} renglones confirmados): las facturas que coinciden se leen sin IA.{' '}
      <button type="button" className="text-button" disabled={busy} onClick={async () => {
        if (!window.confirm(`¿Olvidar el formato de factura de ${format.supplier_name}? La próxima factura se lee con IA y se vuelve a aprender al aplicarla.`)) return;
        if (await run(() => retail.deleteSupplierInvoiceFormat(storeId, format.supplier_name), 'Formato olvidado')) { onSaved(); close(); }
      }}>Olvidar formato</button>
    </p>}
    {error && <p role="alert">{error}</p>}
    <div className="button-row">
      <button className="primary-button" disabled={busy || !valid}>{supplier ? 'Guardar cambios' : 'Guardar proveedor'}</button>
      {supplier && <button type="button" className="text-button danger-text" disabled={busy} onClick={async () => {
        if (!window.confirm(`¿Eliminar ${supplier.name}? Los productos conservan el nombre del proveedor; solo se deja de proponer su descuento.`)) return;
        if (await run(() => retail.deleteSupplier(storeId, supplier), 'Proveedor eliminado')) { onSaved(); close(); }
      }}>Eliminar proveedor</button>}
    </div>
  </form>;
}

/** Store suppliers: discount and learned invoice layout. Requires connection. */
export function SupplierSettings({ storeId, busy, run, active = true }: { storeId: string; busy: boolean; run: Run; active?: boolean }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formats, setFormats] = useState<StoredInvoiceFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // The layouts are optional: before their migration the discounts still work.
      const [rows, layouts] = await Promise.all([retail.suppliers(storeId), retail.supplierInvoiceFormats(storeId).catch(() => [])]);
      setSuppliers(rows); setFormats(layouts);
    }
    catch (e) { setError(`No se pudieron cargar los proveedores: ${errorMessage(e)}`); }
    finally { setLoading(false); }
  }, [storeId]);
  useEffect(() => { if (active) void load(); }, [active, load]);
  const formatOf = (key: string) => formats.find(format => format.supplier_key === key);
  // Suppliers learned from invoices but without a saved discount appear too, ready to complete.
  const learnedOnly = formats.filter(format => !suppliers.some(supplier => supplier.supplier_key === format.supplier_key));
  const formatBadge = (format?: StoredInvoiceFormat) => format && <span className="location-pill-badge active" title="Las facturas que coinciden con este formato se leen sin IA">
    <FileCheck2 size={12} /> Factura conocida{format.local_reads > 0 ? ` · ${format.local_reads} leída${format.local_reads === 1 ? '' : 's'} sin IA` : ''}
  </span>;
  const total = suppliers.length + learnedOnly.length;
  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><Truck size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Proveedores</h3>
        <p>El descuento que te hace cada uno y el formato de sus facturas. Al aplicar una factura se aprende su formato; las siguientes que coinciden se leen sin IA.</p>
      </div>
    </div>
    <div className="location-card-body">
      {!loading && !error && total > 0 && <div className="team-summary-badges">
        <span className="location-pill-badge active"><Truck size={12} /> {total} {total === 1 ? 'proveedor' : 'proveedores'}</span>
      </div>}
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      <SettingsEditor label="Agregar proveedor" busy={busy || loading}>
        {close => <SupplierForm storeId={storeId} busy={busy} run={run} close={close} onSaved={() => void load()} />}
      </SettingsEditor>
      {!loading && !error && total === 0 && <div className="location-empty-notice">
        <Truck size={24} />
        <p>Todavía no hay proveedores. Aparecen al aplicar sus facturas; agregalos acá si te hacen un descuento.</p>
      </div>}
      {suppliers.map(supplier => <SettingsEditor key={`${supplier.id}:${supplier.revision}`} label="Editar" busy={busy || loading}
        summary={<div className="category-summary-row supplier-summary-row">
          <strong>{supplier.name}</strong>
          <span className={`location-pill-badge${supplier.discount_percent > 0 ? ' active' : ''}`}>{supplier.discount_percent > 0 ? `Descuento ${percent(supplier.discount_percent)}` : 'Sin descuento'}</span>
          {formatBadge(formatOf(supplier.supplier_key))}
          {supplier.notes && <small>{supplier.notes}</small>}
        </div>}>
        {close => <SupplierForm storeId={storeId} supplier={supplier} format={formatOf(supplier.supplier_key)} busy={busy} run={run} close={close} onSaved={() => void load()} />}
      </SettingsEditor>)}
      {learnedOnly.map(format => <SettingsEditor key={`format:${format.supplier_key}`} label="Agregar descuento" busy={busy || loading}
        summary={<div className="category-summary-row supplier-summary-row">
          <strong>{format.supplier_name}</strong>
          <span className="location-pill-badge">Sin descuento</span>
          {formatBadge(format)}
        </div>}>
        {close => <SupplierForm storeId={storeId} initialName={format.supplier_name} format={format} busy={busy} run={run} close={close} onSaved={() => void load()} />}
      </SettingsEditor>)}
    </div>
  </div>;
}
