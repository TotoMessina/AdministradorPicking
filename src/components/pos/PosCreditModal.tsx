import { X, UserRound } from 'lucide-react';
import { money } from './posHelpers';
import type { PosTabState } from './usePosTab';

/** Elegir el cliente de la venta fiada. */
export function PosCreditModal({ state }: { state: PosTabState }) {
  const {
    customers, creditCustomerId, setCreditCustomerId, creditQuery, setCreditQuery, setCreditOverOk,
    customerModal, setCustomerModal, activeCustomers, creditMatches, creditCustomer, balanceLabel,
  } = state;
  return (
    <>
      {customerModal && customers && (
        <div className="receipt-modal-backdrop credit-modal-backdrop" onClick={() => setCustomerModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="credit-modal-title" className="manual-amount-modal credit-customer-modal" onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setCustomerModal(false); } }}>
            <div className="manual-modal-header">
              <div className="manual-modal-icon"><UserRound size={20} /></div>
              <div className="manual-modal-titles"><h3 id="credit-modal-title">Elegir cliente</h3><small>Se ve cuánto debe o tiene a favor</small></div>
              <button type="button" className="icon-button manual-modal-close" aria-label="Cerrar ventana" onClick={() => setCustomerModal(false)}><X size={18} /></button>
            </div>
            <label className="credit-modal-search">Buscar<input autoFocus value={creditQuery} onChange={e => setCreditQuery(e.target.value)} placeholder="Nombre" /></label>
            <ul className="credit-modal-list" aria-label="Clientes">
              {creditMatches.map(customer => <li key={customer.id}>
                <button type="button" aria-pressed={customer.id === creditCustomerId} onClick={() => { setCreditCustomerId(customer.id); setCreditOverOk(false); setCustomerModal(false); setCreditQuery(''); }}>
                  <span><strong>{customer.name}</strong>{customer.credit_limit !== null && <small>Límite {money(customer.credit_limit)}</small>}</span>
                  <span className={`sale-customer-balance ${customer.balance > 0 ? 'is-debt' : customer.balance < 0 ? 'is-credit' : ''}`}>{balanceLabel(customer.balance)}</span>
                </button>
              </li>)}
              {!creditMatches.length && <li className="credit-modal-empty">{activeCustomers.length ? 'No hay clientes con ese nombre.' : 'Todavía no hay clientes. Cargalos en la pantalla Clientes.'}</li>}
            </ul>
            {creditCustomer && <button type="button" className="text-button" onClick={() => { setCreditCustomerId(''); setCreditOverOk(false); setCustomerModal(false); }}>Quitar cliente de esta venta</button>}
          </div>
        </div>
      )}
    </>
  );
}
