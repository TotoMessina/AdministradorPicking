import { accountKinds, accountMethodLabels } from '../MoneyAccountEditor';
import { money } from './transferHelpers';
import type { LocationTransfersState } from './useLocationTransfers';

/** Planilla de cuentas de plata. */
export function TransferFundSheet({ state }: { state: LocationTransfersState }) {
  const {
    mode, composing, fundsLoaded, openCash, setAccountEditor, disabled, moneyPlaces, accountOf,
    balanceOf, openFund,
  } = state;
  return (
    <>
      {mode === 'money' && !composing && <div className="location-fund-sheet" role="region" aria-label="Saldos por ubicación" tabIndex={0}>
        <table>
          <caption className="sr-only">Saldo de cada ubicación y efectivo en cajas abiertas</caption>
          <thead><tr><th scope="col">Ubicación</th><th scope="col" className="is-number">Plata</th><th scope="col" className="is-number">En cajas abiertas</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{moneyPlaces.map(place => {
            const account = accountOf(place.id);
            const balance = balanceOf(place.id), open = openCash.find(row => row.location === place.id);
            return <tr key={place.id} className={account ? 'is-account' : undefined}>
              <th scope="row">{place.name}{account && <small className="money-account-tag">{accountKinds[account.kind]}{account.methods.length ? ` · cobra ${account.methods.map(method => accountMethodLabels[method]).join(', ')}` : ' · sin cobros asignados'}</small>}</th>
              <td className={`is-number${balance < 0 ? ' is-negative' : ''}`}>{fundsLoaded ? money(balance) : '—'}{account && account.inflow !== 0 && <small className="money-account-tag">{money(account.inflow)} cobrados</small>}</td>
              <td className="is-number">{open ? `${money(open.cash)} · ${open.shifts} ${open.shifts === 1 ? 'caja' : 'cajas'}` : '—'}</td>
              <td><div className="location-fund-actions">
                <button type="button" className="secondary-button" disabled={disabled} onClick={() => openFund('income', place.id)}>Ingreso</button>
                <button type="button" className="secondary-button" disabled={disabled || balance <= 0} onClick={() => openFund('transfer', place.id)}>Enviar</button>
                <button type="button" className="secondary-button" disabled={disabled || balance <= 0} onClick={() => openFund('withdrawal', place.id)}>Salida</button>
                {account && <button type="button" className="text-button" disabled={disabled} onClick={() => setAccountEditor(account)}>Editar</button>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </>
  );
}
