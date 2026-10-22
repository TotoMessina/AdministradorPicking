import { useState } from 'react';
import { retail, type Branch, type Register } from './api';
import type { Run } from './Management';

export function CashierAccess({ storeId, targetId, email, branchId, registerId, branches, registers, pending = false, busy, run }: {
  storeId: string; targetId: string; email: string; branchId: string | null; registerId: string | null;
  branches: Branch[]; registers: Register[]; pending?: boolean; busy: boolean; run: Run;
}) {
  const [branch, setBranch] = useState(branchId || '');
  const [register, setRegister] = useState(registerId || '');
  const changed = branch !== (branchId || '') || register !== (registerId || '');
  return <form className="cashier-access retail-form" aria-label={`Acceso de ${email}`} onSubmit={event => {
    event.preventDefault();
    if (!busy && changed) void run(() => retail.setCashierAccess(storeId, targetId, branch, register, pending), 'Asignación guardada');
  }}>
    <label>Sucursal<select aria-label={`Sucursal de ${email}`} value={branch} disabled={busy} onChange={event => { setBranch(event.target.value); setRegister(''); }}>
      <option value="">Todas las sucursales</option>
      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select></label>
    <label>Caja de cobro<select aria-label={`Caja de ${email}`} value={register} disabled={busy} onChange={event => {
      const next = event.target.value; setRegister(next);
      if (next) setBranch(registers.find(r => r.id === next)?.branch_id || '');
    }}>
      <option value="">{branch ? 'Todas las cajas de esta sucursal' : 'Todas las cajas'}</option>
      {registers.filter(r => (!branch || r.branch_id === branch) && (r.active || r.id === registerId)).map(r =>
        <option key={r.id} value={r.id} disabled={!r.active}>{!branch ? `${branches.find(b => b.id === r.branch_id)?.name} · ` : ''}{r.name}{!r.active ? ' (inactiva)' : ''}</option>)}
    </select></label>
    <button type="submit" className="secondary-button" disabled={busy || !changed}>Guardar asignación</button>
    <small>{register ? 'Solo podrá trabajar en esta caja.' : branch ? 'Podrá elegir una caja de esta sucursal.' : 'Podrá elegir cualquier sucursal y caja.'} Los movimientos de otras personas siguen siendo privados. Consultar otras ventas requiere que su perfil lo habilite y respeta esta asignación.</small>
  </form>;
}
