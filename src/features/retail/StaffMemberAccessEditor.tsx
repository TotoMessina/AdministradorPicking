import { useState, type FormEvent } from 'react';
import { ShieldCheck, Building2, SlidersHorizontal, Check, X } from 'lucide-react';
import { retail, type Branch, type Register } from './api';
import {
  defaultPermissions,
  permissionOptions,
  type PermissionProfile,
  type StaffBaseRole,
} from './permissions';
import type { Run } from './Management';

export interface StaffMemberAccessEditorProps {
  storeId: string;
  targetId: string;
  email: string;
  role: StaffBaseRole;
  profileId?: string | null;
  profiles: PermissionProfile[];
  branchId?: string | null;
  registerId?: string | null;
  branches: Branch[];
  registers: Register[];
  pending?: boolean;
  busy: boolean;
  run: Run;
  onClose: () => void;
}

export function StaffMemberAccessEditor({
  storeId,
  targetId,
  email,
  role,
  profileId,
  profiles,
  branchId,
  registerId,
  branches,
  registers,
  pending = false,
  busy,
  run,
  onClose,
}: StaffMemberAccessEditorProps) {
  const [nextRole, setNextRole] = useState<StaffBaseRole>(role);
  const [nextProfileId, setNextProfileId] = useState<string>(profileId || '');
  const [nextBranchId, setNextBranchId] = useState<string>(branchId || '');
  const [nextRegisterId, setNextRegisterId] = useState<string>(registerId || '');
  const [saving, setSaving] = useState(false);

  const roleChanged = nextRole !== role;
  const profileChanged = nextProfileId !== (profileId || '');
  const branchChanged = nextBranchId !== (branchId || '');
  const registerChanged = nextRegisterId !== (registerId || '');
  const hasChanges = roleChanged || profileChanged || branchChanged || registerChanged;

  const assignedPermissions =
    profiles.find((p) => p.id === nextProfileId)?.permissions ||
    defaultPermissions(nextRole);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || saving || !hasChanges) return;
    setSaving(true);
    try {
      const ok = await run(async () => {
        const calls: Promise<unknown>[] = [];
        if (roleChanged || profileChanged) {
          calls.push(
            retail.setStaffProfile(storeId, targetId, nextRole, nextProfileId, pending),
          );
        }
        if (branchChanged || registerChanged) {
          calls.push(
            retail.setCashierAccess(storeId, targetId, nextBranchId, nextRegisterId, pending),
          );
        }
        if (calls.length > 0) {
          await Promise.all(calls);
        }
      }, 'Acceso actualizado');

      if (ok) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-unified-editor-wrapper">
      <form
        className="retail-form team-unified-editor"
        onSubmit={handleSubmit}
        aria-label={`Configurar acceso de ${email}`}
      >
        <div className="team-editor-header">
          <div className="team-editor-badge-icon">
            <SlidersHorizontal size={14} />
          </div>
          <div className="team-editor-header-info">
            <strong>Configuración de acceso</strong>
            <span>{email}</span>
          </div>
        </div>

        <div className="team-editor-grid">
          {/* Columna 1: Rol y perfil de permisos */}
          <div className="team-editor-col">
            <div className="team-editor-col-header">
              <ShieldCheck size={14} />
              <span>Rol y permisos</span>
            </div>

            <div className="team-editor-field">
              <label htmlFor={`role-${targetId}`}>Rol</label>
              <select
                id={`role-${targetId}`}
                disabled={busy || saving}
                value={nextRole}
                onChange={(e) => {
                  const newRole = e.target.value as StaffBaseRole;
                  setNextRole(newRole);
                  const curProf = profiles.find((p) => p.id === nextProfileId);
                  if (curProf && curProf.base_role !== newRole) {
                    setNextProfileId('');
                  }
                }}
              >
                <option value="cashier">Cajero</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>

            <div className="team-editor-field">
              <label htmlFor={`profile-${targetId}`}>Perfil de acciones</label>
              <select
                id={`profile-${targetId}`}
                disabled={busy || saving}
                value={nextProfileId}
                onChange={(e) => setNextProfileId(e.target.value)}
              >
                <option value="">Predeterminado del rol</option>
                {profiles
                  .filter((p) => p.base_role === nextRole)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <details className="permission-help team-editor-permissions-details">
              <summary>Ver permisos activos ({assignedPermissions.length})</summary>
              <ul>
                {permissionOptions
                  .filter((option) => assignedPermissions.includes(option.id))
                  .map((option) => (
                    <li key={option.id}>{option.label}</li>
                  ))}
              </ul>
              <p>Siempre puede abrir y cerrar su propio turno y consultar su actividad.</p>
            </details>
          </div>

          {/* Columna 2: Sucursal y Caja */}
          <div className="team-editor-col">
            <div className="team-editor-col-header">
              <Building2 size={14} />
              <span>Lugar de trabajo</span>
            </div>

            <div className="team-editor-field">
              <label htmlFor={`branch-${targetId}`}>Sucursal asignada</label>
              <select
                id={`branch-${targetId}`}
                value={nextBranchId}
                disabled={busy || saving}
                onChange={(e) => {
                  const b = e.target.value;
                  setNextBranchId(b);
                  if (nextRegisterId) {
                    const reg = registers.find((r) => r.id === nextRegisterId);
                    if (reg && reg.branch_id !== b) {
                      setNextRegisterId('');
                    }
                  }
                }}
              >
                <option value="">Todas las sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="team-editor-field">
              <label htmlFor={`register-${targetId}`}>Caja de cobro</label>
              <select
                id={`register-${targetId}`}
                value={nextRegisterId}
                disabled={busy || saving}
                onChange={(e) => {
                  const regId = e.target.value;
                  setNextRegisterId(regId);
                  if (regId) {
                    const reg = registers.find((r) => r.id === regId);
                    if (reg && reg.branch_id) {
                      setNextBranchId(reg.branch_id);
                    }
                  }
                }}
              >
                <option value="">
                  {nextBranchId ? 'Todas las cajas de esta sucursal' : 'Todas las cajas permitidas'}
                </option>
                {registers
                  .filter(
                    (r) =>
                      (!nextBranchId || r.branch_id === nextBranchId) &&
                      (r.active || r.id === registerId),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id} disabled={!r.active}>
                      {!nextBranchId
                        ? `${branches.find((b) => b.id === r.branch_id)?.name || ''} · `
                        : ''}
                      {r.name}
                      {!r.active ? ' (inactiva)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <p className="team-editor-help-text">
              {nextRegisterId
                ? 'Solo podrá cobrar en esta caja.'
                : nextBranchId
                  ? 'Podrá operar en cualquier caja de la sucursal elegida.'
                  : 'Podrá operar en cualquier sucursal y caja.'}{' '}
              Los arqueos y movimientos de otras personas siguen siendo privados.
            </p>
          </div>
        </div>

        <div className="team-editor-footer">
          <button
            type="submit"
            className="primary-button"
            disabled={busy || saving || !hasChanges}
          >
            <Check size={14} />
            <span>Guardar cambios</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy || saving}
            onClick={onClose}
          >
            <X size={14} />
            <span>Cancelar</span>
          </button>
        </div>
      </form>
    </div>
  );
}
