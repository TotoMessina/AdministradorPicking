import { useState } from 'react';
import type { KioscoSale } from '../../types/kiosco';
import { retail, errorMessage, type Customer, type Store } from './api';
import type { Run } from './Management';
import { retrySaleBilling } from '../../services/billingService';

/**
 * Cliente de la factura en una venta que todavía no tiene CAE (por ejemplo, un consumidor final desde $10.000.000
 * que ARCA exige identificar). Guarda el cliente y vuelve a pedir la factura.
 */
export function SaleReceptorPicker({ store, sale, run, busy, onBilled }: {
  store: Store; sale: KioscoSale; run: Run; busy: boolean; onBilled: (result: Partial<KioscoSale>) => void;
}) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [customerId, setCustomerId] = useState(sale.customerId || '');

  if (!store.billing_enabled || !['pending', 'retry', 'error'].includes(sale.billingStatus || '') || sale.returnStatus === 'voided') return null;

  const load = () => {
    if (customers || loadError) return;
    retail.customers(store.id)
      .then(rows => setCustomers(rows.filter(c => c.active && c.tax_id)))
      .catch(err => setLoadError(`No se pudieron cargar los clientes. ${errorMessage(err)}`));
  };

  const save = () => run(async () => {
    await retail.setSaleReceptor(store.id, sale.id, customerId || null);
    const res = await retrySaleBilling(store, { ...sale, customerId: customerId || null });
    onBilled({ customerId: customerId || null, ...res });
    if (res.billingStatus !== 'authorized') throw new Error(res.billingError || 'El cliente quedó guardado, pero ARCA todavía no autorizó la factura');
  }, 'Factura emitida a nombre del cliente.');

  return (
    <details onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) load(); }}>
      <summary>Factura a nombre de un cliente</summary>
      {loadError && <p role="alert">{loadError}</p>}
      {!customers && !loadError && <p role="status">Cargando clientes…</p>}
      {customers && (
        <form className="retail-form" onSubmit={e => { e.preventDefault(); void save(); }}>
          <label>
            Cliente con DNI, CUIL o CUIT
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} required>
              <option value="">Elegí un cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.business_name || c.name} · {c.tax_id_type} {c.tax_id}</option>)}
            </select>
          </label>
          {!customers.length && <p>No hay clientes con documento cargado. Cargalo en Clientes.</p>}
          <button className="secondary-button" disabled={busy || !customerId}>Guardar y facturar</button>
        </form>
      )}
    </details>
  );
}
