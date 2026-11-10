import { useState } from 'react';
import { askConfirm } from '../../components/ConfirmHost';
import { randomUUID } from '../../utils/uuid';
import { locationTransfers, type AccountMethod, type MoneyAccount } from './locationTransferApi';

export const accountKinds: Record<MoneyAccount['kind'], string> = { bank: 'Banco', wallet: 'Billetera virtual', other: 'Otra' };
export const accountMethodLabels: Record<AccountMethod, string> = { QR: 'QR', Debito: 'Débito', Credito: 'Crédito', Transferencia: 'Transferencias', Link: 'Links de pago' };

/**
 * Alta y edición de una cuenta de banco o billetera, y qué medios de pago caen en ella.
 * Un medio está en una sola cuenta: elegirlo acá lo saca de la otra desde ahora, sin mover lo ya cobrado.
 */
export function MoneyAccountEditor({ storeId, account, accounts, disabled, execute, onClose }: {
  storeId: string; account?: MoneyAccount; accounts: MoneyAccount[]; disabled: boolean;
  execute: (key: string, action: () => Promise<unknown>, message: string) => Promise<boolean>; onClose: () => void;
}) {
  const [name, setName] = useState(account?.name || '');
  const [kind, setKind] = useState<MoneyAccount['kind']>(account?.kind || 'bank');
  const [methods, setMethods] = useState<AccountMethod[]>(account?.methods || []);
  const [error, setError] = useState('');
  const elsewhere = (method: AccountMethod) => accounts.find(other => other.id !== account?.id && other.methods.includes(method));
  const toggle = (method: AccountMethod) => setMethods(previous => previous.includes(method) ? previous.filter(item => item !== method) : [...previous, method]);

  const save = async () => {
    if (!name.trim()) { setError('Escribí el nombre de la cuenta.'); return; }
    const moved = methods.filter(method => elsewhere(method) && !account?.methods.includes(method));
    if (moved.length && !await askConfirm(`${moved.map(method => `${accountMethodLabels[method]} está en ${elsewhere(method)!.name}`).join('. ')}. ¿Pasarlo a esta cuenta desde ahora? Lo cobrado antes queda en la otra.`)) return;
    if (await execute('account', () => locationTransfers.saveAccount(storeId, account?.id || randomUUID(), name.trim(), kind, methods), account ? 'Cuenta actualizada' : 'Cuenta creada')) onClose();
  };
  const archive = async () => {
    if (!account || !await askConfirm(`¿Archivar ${account.name}? Deja de recibir cobros. El historial se conserva.`)) return;
    if (await execute('account', () => locationTransfers.archiveAccount(storeId, account.id), 'Cuenta archivada')) onClose();
  };

  return <form className="retail-form money-account-editor" onSubmit={event => { event.preventDefault(); void save(); }}>
    <h3>{account ? `Editar ${account.name}` : 'Nueva cuenta'}</h3>
    <fieldset disabled={disabled}>
      <label>Nombre<input value={name} maxLength={80} placeholder="Ej. Banco Galicia, Mercado Pago" onChange={event => { setName(event.target.value); setError(''); }} /></label>
      <label>Tipo<select value={kind} onChange={event => setKind(event.target.value as MoneyAccount['kind'])}>
        {Object.entries(accountKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="money-account-methods" role="group" aria-label="Cobros que entran en esta cuenta">
        <span>Cobros que entran acá</span>
        {(Object.keys(accountMethodLabels) as AccountMethod[]).map(method => <label key={method} className="money-account-method">
          <input type="checkbox" checked={methods.includes(method)} onChange={() => toggle(method)} />
          {accountMethodLabels[method]}{elsewhere(method) && !methods.includes(method) && <small> · hoy en {elsewhere(method)!.name}</small>}
        </label>)}
      </div>
    </fieldset>
    <small>Las ventas y los cobros de fiado por esos medios suman solos al saldo desde ahora. Las devoluciones por esos medios restan. El saldo inicial se carga con «Ingreso».</small>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="location-transfer-actions">
      <button className="primary-button" disabled={disabled}>Guardar cuenta</button>
      <button type="button" className="secondary-button" disabled={disabled} onClick={onClose}>Cancelar</button>
      {account && <button type="button" className="text-button danger-text" disabled={disabled} onClick={() => void archive()}>Archivar cuenta</button>}
    </div>
  </form>;
}
