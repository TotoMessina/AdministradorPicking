import { useEffect, useId, useRef, useState } from 'react';
import { deleteMapping, getMappings, type SupplierMapping } from '../services/supplierMappingService';

interface Props {
  storeId: string;
  supplier: string;
  disabled?: boolean;
  onDeleted: (mapping: SupplierMapping) => void;
}

/** Inline within the invoice dialog: no nested modal or global keyboard listener. */
export function SupplierAliasPanel({ storeId, supplier, disabled, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [mappings, setMappings] = useState<SupplierMapping[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const alive = useRef(true);
  const working = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (open) heading.current?.focus(); }, [open]);

  const load = async () => {
    if (working.current) return;
    working.current = true;
    setOpen(true);
    setBusy(true);
    setMessage('');
    try {
      const rows = await getMappings(storeId, supplier);
      if (alive.current) setMappings(rows);
    } catch {
      if (alive.current) setMessage('No se pudieron cargar los alias. Revisá la conexión y pulsá Actualizar.');
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const remove = async (mapping: SupplierMapping) => {
    if (working.current || !window.confirm(`¿Eliminar el alias «${mapping.invoice_text}» de ${supplier}? Dejará de usarse en futuras facturas. No modifica productos ni importaciones realizadas.`)) return;
    working.current = true;
    setBusy(true);
    setMessage('');
    try {
      const cacheCleared = await deleteMapping(storeId, supplier, mapping);
      if (!alive.current) return;
      setMappings(previous => previous.filter(row => row.id !== mapping.id));
      setMessage(cacheCleared ? 'Alias eliminado del comercio.' : 'Alias eliminado del comercio, pero no se pudo limpiar la memoria de este dispositivo. Revisá los permisos de almacenamiento del navegador y pulsá Actualizar con conexión.');
      onDeleted(mapping);
      heading.current?.focus();
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'No se pudo eliminar el alias. Revisá la conexión y los permisos del comercio e intentá nuevamente.');
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  };

  return <div className="invoice-alias-panel">
    <button type="button" ref={trigger} className="secondary-button" aria-expanded={open} aria-controls={id}
      disabled={disabled || busy || !supplier.trim()} onClick={() => {
        if (open) setOpen(false);
        else void load();
      }}>🔗 Ver alias del proveedor</button>
    {open && <section id={id} aria-labelledby={`${id}-title`} aria-busy={busy} className="invoice-link-summary">
      <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>Alias de {supplier}</h3>
      <p>Textos de factura vinculados con el catálogo de este comercio. Sin conexión se muestra la memoria disponible en este dispositivo. Para eliminar un alias necesitás conexión.</p>
      <div className="button-row">
        <button type="button" className="secondary-button" disabled={busy || disabled} onClick={() => void load()}>Actualizar</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => { setOpen(false); trigger.current?.focus(); }}>Cerrar alias</button>
      </div>
      {busy && <p role="status">Actualizando alias…</p>}
      {message && <p role="status">{message}</p>}
      {!busy && !mappings.length && <p>No hay alias disponibles para este proveedor. Elegí un producto en la factura y pulsá Confirmar y recordar para agregar uno.</p>}
      <ul className="invoice-alias-list">
        {mappings.map(mapping => <li key={mapping.id || mapping.invoice_text}>
          <div>
            <strong>{mapping.invoice_text} → {mapping.product_name}</strong>
            <p>Bulto: {mapping.pack_size_detected ? `${mapping.pack_size_detected} u.` : 'sin definir'} · Usos: {mapping.times_used ?? 'sin sincronizar'} · Última vez: {mapping.last_used_at && Number.isFinite(Date.parse(mapping.last_used_at)) ? new Date(mapping.last_used_at).toLocaleString('es-AR') : 'sin registro'}</p>
            {!mapping.id && <p>Pendiente de compartir. Conectate y pulsá Actualizar antes de eliminarlo.</p>}
          </div>
          <button type="button" className="secondary-button" disabled={busy || disabled || !mapping.id}
            aria-label={`Eliminar alias ${mapping.invoice_text}`} title="Eliminar alias" onClick={() => void remove(mapping)}>×</button>
        </li>)}
      </ul>
    </section>}
  </div>;
}
