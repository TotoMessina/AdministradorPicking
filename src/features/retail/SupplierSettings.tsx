import { useCallback, useEffect, useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { retail, errorMessage, type Supplier } from './api';
import type { Run } from './Management';
import type { StoredInvoiceFormat } from '../../services/invoiceFormatService';
import { SupplierSheet } from './SupplierSheet';

/** Fichas de proveedores, editadas en planilla. */
export function SupplierSettings({ storeId, busy, run, active = true }: { storeId: string; busy: boolean; run: Run; active?: boolean }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formats, setFormats] = useState<StoredInvoiceFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // The layouts are optional: before their migration the discounts still work.
      const [rows, layouts] = await Promise.all([retail.suppliers(storeId), retail.supplierInvoiceFormats(storeId).catch(() => [])]);
      setSuppliers(rows); setFormats(layouts); setLoaded(value => value + 1);
    }
    catch (e) { setError(`No se pudieron cargar los proveedores: ${errorMessage(e)}`); }
    finally { setLoading(false); }
  }, [storeId]);
  useEffect(() => { if (active) void load(); }, [active, load]);
  return <div className="store-settings-card">
    <div className="store-settings-header">
      <div className="store-settings-header-icon"><Truck size={22} /></div>
      <div className="store-settings-header-text">
        <h3>Proveedores</h3>
        <p>Una fila por proveedor, como en Excel. Con el CUIT sus facturas se reconocen solas; el descuento se resta del costo al cargarlas (costo $1.000 con 10% → $900). Los que aparecen con «Factura conocida» se aprendieron de facturas y se leen sin IA.</p>
      </div>
    </div>
    <div className="location-card-body">
      {error && <p role="alert">{error} <button type="button" className="text-button" disabled={loading} onClick={() => void load()}>Reintentar</button></p>}
      {loading && !loaded && <p role="status"><Loader2 size={15} className="spin" /> Cargando proveedores…</p>}
      {/* Al guardar se vuelve a armar con los datos del servidor (revisiones nuevas). */}
      {loaded > 0 && <SupplierSheet key={loaded} storeId={storeId} suppliers={suppliers} formats={formats} busy={busy || loading} run={run} onSaved={() => void load()} />}
    </div>
  </div>;
}
