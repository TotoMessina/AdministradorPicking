import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Truck } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { retail, errorMessage, type Supplier } from './api';
import { SettingsEditor } from './SettingsEditor';
import type { Run } from './Management';
import type { StoredInvoiceFormat } from '../../services/invoiceFormatService';
import { cuitDigits, formatCuit, hasInvoiceRules, validCuit, type SupplierInvoiceRules } from '../../services/supplierInvoiceRules';
import {
  VAT_CONDITION_LABELS, emptySupplierProfile, sameSupplierProfile, supplierProfileErrors, type SupplierProfile,
} from '../../services/supplierProfile';

const percent = (value: number) => `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

function SupplierForm({ storeId, supplier, initialName, format, busy, run, close, onSaved }: {
  storeId: string; supplier?: Supplier; initialName?: string; format?: StoredInvoiceFormat; busy: boolean; run: Run; close: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name ?? initialName ?? '');
  const [discount, setDiscount] = useState(String(supplier?.discount_percent ?? 0));
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [cuit, setCuit] = useState(supplier?.cuit ? formatCuit(supplier.cuit) : '');
  const [rules, setRules] = useState<SupplierInvoiceRules>(supplier?.invoice_rules ?? {});
  const saved = supplier?.profile ?? emptySupplierProfile();
  const [profile, setProfile] = useState<SupplierProfile>(saved);
  const [error, setError] = useState('');
  const profileErrors = supplierProfileErrors(profile);
  const setField = <K extends keyof SupplierProfile>(field: K, value: SupplierProfile[K]) => setProfile(previous => ({ ...previous, [field]: value }));
  const textField = (field: keyof SupplierProfile) => (event: { target: { value: string } }) => setField(field, (event.target.value || null) as never);
  const hasAny = (...fields: (keyof SupplierProfile)[]) => fields.some(field => saved[field] !== null);
  const value = Number(discount);
  const cuitValid = cuitDigits(cuit) === '' || validCuit(cuit);
  const valid = name.trim() !== '' && discount.trim() !== '' && Number.isFinite(value) && value >= 0 && value < 100 && cuitValid;
  const updateRules = (patch: SupplierInvoiceRules) => setRules(previous => ({ ...previous, ...patch }));
  // Solo se envían si cambiaron: así guardar un descuento sigue funcionando antes de la migración.
  const cuitChanged = cuitDigits(cuit) !== (supplier?.cuit ?? '');
  const rulesChanged = JSON.stringify(rules) !== JSON.stringify(supplier?.invoice_rules ?? {});
  const profileChanged = !sameSupplierProfile(profile, saved);
  return <form className="retail-form" onSubmit={async event => {
    event.preventDefault();
    if (busy || !valid) return;
    // Un error dentro de una sección plegada se revela y se enfoca.
    const invalid = Object.keys(profileErrors)[0];
    if (invalid) {
      const field = event.currentTarget.querySelector<HTMLInputElement>(`[data-profile-field="${invalid}"]`);
      const section = field?.closest('details');
      if (section) section.open = true;
      field?.focus();
      return;
    }
    setError('');
    const ok = await run(async () => {
      try {
        await retail.saveSupplier(storeId, {
          id: supplier?.id, name, discount_percent: value, notes, revision: supplier?.revision,
          ...(cuitChanged ? { cuit: cuitDigits(cuit) } : {}),
          ...(rulesChanged ? { invoice_rules: rules } : {}),
          ...(profileChanged ? { profile } : {}),
        });
      }
      catch (e) { setError(errorMessage(e)); throw e; }
    }, supplier ? 'Proveedor actualizado' : 'Proveedor guardado');
    if (ok) { onSaved(); close(); }
  }}>
    <label>Nombre<input required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Como figura en sus facturas" /></label>
    <label>Descuento que te hace (%)<NumberInput type="number" required min="0" max="99.99" step="0.01" value={discount} disabled={busy} onValueChange={setDiscount} /></label>
    <p>Se resta del costo de cada producto al cargar sus facturas: costo $1.000 con 10% → $900. Dejalo en 0 si los precios de la factura ya vienen con el descuento.</p>
    <label>CUIT (opcional)<input inputMode="numeric" autoComplete="off" maxLength={13} value={cuit} disabled={busy}
      aria-invalid={!cuitValid} aria-describedby="supplier-cuit-help"
      onChange={event => setCuit(event.target.value)} onBlur={() => { if (validCuit(cuit)) setCuit(formatCuit(cuit)); }} placeholder="Ej.: 30-70817362-9" /></label>
    <p id="supplier-cuit-help" role={cuitValid ? undefined : 'alert'}>{cuitValid
      ? 'Con el CUIT, el proveedor se reconoce solo al leer sus facturas, aunque la IA lea mal el nombre.'
      : 'El CUIT no es válido: revisá los 11 números.'}</p>
    <label>Notas (opcional)<input maxLength={300} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} placeholder="Ej.: descuento por pago contado" /></label>
    <details className="supplier-rules" open={hasAny('legal_name', 'vat_condition', 'fiscal_address', 'commercial_address')}>
      <summary>Datos fiscales <small>{profile.legal_name ?? 'Razón social, IVA y domicilios'}</small></summary>
      <label>Razón social<input maxLength={160} value={profile.legal_name ?? ''} disabled={busy} onChange={textField('legal_name')} placeholder="Ej.: Castilla Distribuidora S.A." /></label>
      <label>Condición frente al IVA
        <select value={profile.vat_condition ?? ''} disabled={busy} onChange={event => setField('vat_condition', (event.target.value || null) as SupplierProfile['vat_condition'])}>
          <option value="">Sin indicar</option>
          {Object.entries(VAT_CONDITION_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </label>
      <label>Domicilio fiscal<input maxLength={300} value={profile.fiscal_address ?? ''} disabled={busy} onChange={textField('fiscal_address')} /></label>
      <label>Domicilio comercial<input maxLength={300} value={profile.commercial_address ?? ''} disabled={busy} onChange={textField('commercial_address')} placeholder="Si es distinto del fiscal" /></label>
    </details>
    <details className="supplier-rules" open={hasAny('phone', 'email', 'collections_contact', 'purchasing_contact') || !!profileErrors.email}>
      <summary>Contacto <small>{profile.phone ?? profile.email ?? 'Administración, cobranzas y compras'}</small></summary>
      <label>Teléfono de administración<input type="tel" maxLength={40} value={profile.phone ?? ''} disabled={busy} onChange={textField('phone')} /></label>
      <label>Correo de administración<input type="email" data-profile-field="email" maxLength={160} value={profile.email ?? ''} disabled={busy}
        aria-invalid={!!profileErrors.email} aria-describedby="supplier-email-error" onChange={textField('email')} /></label>
      {profileErrors.email && <small id="supplier-email-error" role="alert">{profileErrors.email}</small>}
      <label>Contacto de cobranzas<input maxLength={160} value={profile.collections_contact ?? ''} disabled={busy} onChange={textField('collections_contact')} placeholder="Nombre y teléfono o correo" /></label>
      <label>Ejecutivo de compra<input maxLength={160} value={profile.purchasing_contact ?? ''} disabled={busy} onChange={textField('purchasing_contact')} placeholder="Preventista o vendedor que te atiende" /></label>
    </details>
    <details className="supplier-rules" open={hasAny('bank_cbu', 'bank_alias', 'payment_terms', 'payment_days') || !!profileErrors.bank_cbu || !!profileErrors.bank_alias || !!profileErrors.payment_days}>
      <summary>Pago <small>{profile.payment_days !== null ? `A ${profile.payment_days} días` : 'CBU, alias y plazo'}</small></summary>
      <label>CBU<input inputMode="numeric" autoComplete="off" data-profile-field="bank_cbu" maxLength={26} value={profile.bank_cbu ?? ''} disabled={busy}
        aria-invalid={!!profileErrors.bank_cbu} aria-describedby="supplier-cbu-error" onChange={event => setField('bank_cbu', event.target.value.replace(/[^\d\s]/g, '') || null)} /></label>
      {profileErrors.bank_cbu && <small id="supplier-cbu-error" role="alert">{profileErrors.bank_cbu}</small>}
      <label>Alias<input autoComplete="off" data-profile-field="bank_alias" maxLength={20} value={profile.bank_alias ?? ''} disabled={busy}
        aria-invalid={!!profileErrors.bank_alias} aria-describedby="supplier-alias-error" onChange={textField('bank_alias')} placeholder="Ej.: castilla.pagos" /></label>
      {profileErrors.bank_alias && <small id="supplier-alias-error" role="alert">{profileErrors.bank_alias}</small>}
      <label>Plazo de pago (días)<NumberInput data-profile-field="payment_days" min="0" max="365" step="1" value={profile.payment_days ?? ''} disabled={busy}
        aria-invalid={!!profileErrors.payment_days} aria-describedby="supplier-days-help"
        onValueChange={value => setField('payment_days', value === '' ? null : Number(value))} placeholder="Ej.: 30" /></label>
      <small id="supplier-days-help" role={profileErrors.payment_days ? 'alert' : undefined}>{profileErrors.payment_days
        ?? 'Días desde la emisión de la factura hasta su vencimiento. 0 = contado.'}</small>
      <label>Condiciones de pago<input maxLength={300} value={profile.payment_terms ?? ''} disabled={busy} onChange={textField('payment_terms')} placeholder="Ej.: contado contra entrega; 5% por pago anticipado" /></label>
    </details>
    <details className="supplier-rules" open={hasInvoiceRules(supplier?.invoice_rules ?? {})}>
      <summary>Cómo factura este proveedor <small>{hasInvoiceRules(rules) ? 'Reglas activas' : 'Lectura automática'}</small></summary>
      <p>Ayudan a leer bien sus facturas. Dejalas como están si sus facturas ya se cargan correctamente.</p>
      <label>Cantidad facturada
        <select value={rules.quantity_unit ?? 'auto'} disabled={busy} onChange={event => updateRules({ quantity_unit: event.target.value === 'unit' ? 'unit' : undefined })}>
          <option value="auto">Detectar automáticamente</option>
          <option value="unit">Siempre por unidad suelta</option>
        </select>
      </label>
      <small>Usá "por unidad suelta" si el "X60" o "54X44G" de la descripción es el tamaño de la caja y el precio es de cada unidad.</small>
      <label className="checkbox-label"><input type="checkbox" checked={!!rules.amount_includes_vat} disabled={busy}
        onChange={event => updateRules({ amount_includes_vat: event.target.checked || undefined })} /> El importe de cada renglón ya incluye IVA</label>
      <label className="checkbox-label"><input type="checkbox" checked={!!rules.merge_repeated_codes} disabled={busy}
        onChange={event => updateRules({ merge_repeated_codes: event.target.checked || undefined })} /> Bonificaciones en renglón aparte: agrupar renglones con el mismo código</label>
      <label>Columna de costo (opcional)<input maxLength={60} value={rules.cost_column ?? ''} disabled={busy}
        onChange={event => updateRules({ cost_column: event.target.value || undefined })} placeholder="Ej.: Final C/Dto." /></label>
      <small>Si la completás, la IA toma el costo de esa columna. Sin completar, usa el precio unitario.</small>
      <label>Precios de la factura
        <select value={rules.price_basis ?? 'auto'} disabled={busy} onChange={event => updateRules({ price_basis: event.target.value === 'final' ? 'final' : undefined })}>
          <option value="auto">Según el tipo de factura (A sin IVA; B y C con IVA)</option>
          <option value="final">Ya incluyen IVA e impuestos internos</option>
        </select>
      </label>
      <small>Define qué se suma para llegar al costo final. Usá "Ya incluyen…" si la columna de costo es, por ejemplo, «Final C/Dto.».</small>
    </details>
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
        <p>Ficha de cada proveedor: CUIT, datos fiscales, contacto, pago y cómo factura. Con el CUIT sus facturas se reconocen solas; al aplicar una factura se aprende su formato y las siguientes que coinciden se leen sin IA.</p>
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
          {supplier.cuit && <span className="location-pill-badge">CUIT {formatCuit(supplier.cuit)}</span>}
          {supplier.profile.vat_condition && <span className="location-pill-badge">{VAT_CONDITION_LABELS[supplier.profile.vat_condition]}</span>}
          {supplier.profile.payment_days !== null && <span className="location-pill-badge">{supplier.profile.payment_days === 0 ? 'Contado' : `A ${supplier.profile.payment_days} días`}</span>}
          {hasInvoiceRules(supplier.invoice_rules) && <span className="location-pill-badge active">Reglas de lectura</span>}
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
