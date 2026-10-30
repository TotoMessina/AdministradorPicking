import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage } from './api';
import { defaultPermissions, permissionOptions, type PermissionProfile, type Permission, type StaffBaseRole } from './permissions';
import type { Run } from './Management';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import './permission-profiles.css';

const shortLabels: Record<Permission, string> = {
  sell: 'Vender y cobrar',
  cash_income: 'Ingresos',
  cash_withdrawal: 'Retiros',
  move_sale_ledger: 'Cambiar registro',
  submit_remito: 'Enviar remitos',
  view_sales: 'Ver ventas e informes',
  replenish_stock: 'Reponer stock',
  edit_prices: 'Editar precios',
  manage_quick_products: 'Personalizar botonera',
  manage_products: 'Crear y editar productos',
  manage_compositions: 'Combos y sueltos',
  delete_products: 'Eliminar y restaurar',
  manage_price_lists: 'Listas de precios',
  review_remitos: 'Revisar remitos',
  manage_transfers: 'Transferencias',
  manage_funds: 'Fondos por ubicación',
  manage_supplier_accounts: 'Cuenta corriente de proveedores',
  attach_invoice: 'Asociar comprobantes',
  manage_store: 'Datos, ticket y margen',
  manage_locations: 'Locales y cajas',
  manage_categories: 'Nombres de categorías',
  manage_ledgers: 'Configurar registros',
  manage_staff: 'Personas y asignaciones',
  manage_profiles: 'Perfiles de permisos',
  use_ai: 'Análisis con IA',
};

const permissionGroups: { label: string; permissions: Permission[] }[] = [
  { label: 'Caja y ventas', permissions: ['sell', 'cash_income', 'cash_withdrawal', 'move_sale_ledger', 'view_sales', 'attach_invoice'] },
  { label: 'Productos y stock', permissions: ['manage_products', 'replenish_stock', 'edit_prices', 'manage_compositions', 'delete_products', 'manage_quick_products', 'manage_price_lists'] },
  { label: 'Mercadería y fondos', permissions: ['submit_remito', 'review_remitos', 'manage_transfers', 'manage_funds', 'manage_supplier_accounts'] },
  { label: 'Mi comercio', permissions: ['manage_store', 'manage_locations', 'manage_categories', 'manage_ledgers'] },
  { label: 'Personas y análisis', permissions: ['manage_staff', 'manage_profiles', 'use_ai'] },
];

export function usePermissionProfiles(storeId: string, active: boolean) {
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!active) return;
    let alive = true; setLoading(true); setError('');
    retail.permissionProfiles(storeId).then(rows => { if (alive) setProfiles(rows); })
      .catch(e => { if (alive) setError(errorMessage(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, active, revision]);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  return { profiles, error, loading, reload };
}

function ProfileForm({ storeId, profile, busy, run, onSaved, grantable }: { storeId: string; profile?: PermissionProfile; busy: boolean; run: Run; onSaved: () => void; grantable?: Permission[] }) {
  const [snapshot] = useState(profile);
  const requestId = useRef(profile?.id || randomUUID());
  const saving = useRef(false);
  const [role, setRole] = useState<StaffBaseRole>(profile?.base_role || 'cashier');
  const [permissions, setPermissions] = useState<Permission[]>(profile?.permissions || defaultPermissions(role).filter(action => !grantable || grantable.includes(action)));
  return <form className="retail-form permission-form" onSubmit={async event => {
    event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') || '');
    if (busy || saving.current) return;
    saving.current = true;
    try {
      if (await run(() => retail.savePermissionProfile(storeId, { name, base_role: role, permissions }, snapshot?.id, requestId.current, snapshot?.revision ?? 0), 'Perfil guardado')) onSaved();
    } finally { saving.current = false; }
  }}>
    <div className="permission-form-heading">
    <label>Nombre del perfil<input name="name" required disabled={busy} maxLength={80} defaultValue={profile?.name} placeholder="Ej. Cajero repositor" /></label>
    {profile ? <span className="permission-role">{role === 'supervisor' ? 'Supervisor' : 'Cajero'}</span> : <label>Rol<select disabled={busy} value={role} onChange={event => {
      setRole(event.target.value as StaffBaseRole);
    }}><option value="cashier">Cajero</option><option value="supervisor">Supervisor</option></select></label>}
    </div>
    <div className="permission-section-heading"><strong>Permisos</strong><span>{permissions.length} de {permissionOptions.length} activos</span></div>
    <div className="permission-groups">
      {permissionGroups.map(group => <fieldset key={group.label} disabled={busy} className="permission-group">
        <legend>{group.label}</legend>
        {group.permissions.map(id => <label key={id} className="permission-switch" title={permissionOptions.find(option => option.id === id)?.label}>
          <span className="permission-switch-label">{shortLabels[id]}</span>
          <span className="permission-switch-control">
            <input type="checkbox" role="switch" aria-label={`${shortLabels[id]}: ${permissionOptions.find(option => option.id === id)?.label}`}
              disabled={!!grantable && !grantable.includes(id) && !permissions.includes(id)}
              checked={permissions.includes(id)} onChange={event => {
                const enabled = event.target.checked;
                setPermissions(previous => enabled ? [...previous, id] : previous.filter(value => value !== id));
              }} />
            <span className="permission-switch-track" aria-hidden="true" />
          </span>
        </label>)}
      </fieldset>)}
    </div>
    {profile && <p className="permission-save-note">Los cambios se aplican a todas las personas con este perfil.</p>}
    <details className="permission-help"><summary>Alcance de los permisos</summary>
      <p>Abrir y cerrar el turno propio y consultar su actividad siempre está disponible. El cajero cierra contando el efectivo, sin ver el esperado. Los movimientos de otras personas siguen siendo privados.</p>
      <p>Ver ventas respeta las sucursales y cajas asignadas. La botonera se limita a las sucursales asignadas. Cambiar registro se limita a ventas propias. Los remitos se envían para revisión.</p>
      <p>Crear y editar productos incluye alta manual, importación de facturas/CSV y edición de atributos, costos y stock. Combos, eliminación, listas y transferencias tienen permisos separados. El stock y los precios base son compartidos por el comercio.</p>
      <p>Personas y perfiles son permisos sensibles. Una persona delegada solo puede conceder permisos que ya tiene y no puede cambiar su propio acceso ni el de administradores. El titular conserva sus atribuciones exclusivas.</p>
      <p>Abrir/cerrar el turno propio, tickets, búsqueda/lector, pagos, sincronización, instalación y preferencias personales de avisos no requieren un permiso adicional. No se delega el efectivo esperado del arqueo ni la consulta de movimientos privados de otras personas.</p>
      <p>Sin perfil se usan los permisos habituales del rol. Para recibir cambios, cada persona debe actualizar sus datos. Las operaciones offline se vuelven a validar al sincronizar.</p>
    </details>
    <button className="primary-button" disabled={busy}>Guardar perfil</button>
  </form>;
}

export function PermissionProfileSettings({ storeId, profiles, busy, run, onSaved, grantable }: { storeId: string; profiles: PermissionProfile[]; busy: boolean; run: Run; onSaved: () => void; grantable?: Permission[] }) {
  return <section className="permission-profiles">
    <SettingsEditorGroup>
      <div className="permission-profile-new-wrapper">
        <SettingsEditor key="new" busy={busy} label="+ Nuevo perfil">
          {close => <ProfileForm storeId={storeId} busy={busy} run={run} grantable={grantable} onSaved={() => { close(); onSaved(); }} />}
        </SettingsEditor>
      </div>
      {profiles.map(profile => <SettingsEditor key={profile.id} busy={busy}
        label="Editar"
        summary={<div className="permission-profile-summary"><strong>{profile.name}</strong><small>{profile.base_role === 'supervisor' ? 'Supervisor' : 'Cajero'} · {profile.permissions.length} acciones</small></div>}>
        {close => <ProfileForm storeId={storeId} profile={profile} busy={busy} run={run} grantable={grantable} onSaved={() => { close(); onSaved(); }} />}
      </SettingsEditor>)}
    </SettingsEditorGroup>
  </section>;
}

export function StaffProfileAssignment({ storeId, targetId, role, profileId, profiles, pending = false, busy, run, close }: {
  storeId: string; targetId: string; role: StaffBaseRole; profileId?: string | null; profiles: PermissionProfile[];
  pending?: boolean; busy: boolean; run: Run; close: () => void;
}) {
  const [nextRole, setRole] = useState(role);
  const [selected, setSelected] = useState(profileId || '');
  const assignedPermissions = profiles.find(profile => profile.id === selected)?.permissions || defaultPermissions(nextRole);
  return <form className="retail-form" onSubmit={async event => {
    event.preventDefault(); if (await run(() => retail.setStaffProfile(storeId, targetId, nextRole, selected, pending), 'Rol y perfil guardados')) close();
  }}>
    <label>Rol<select disabled={busy} value={nextRole} onChange={event => { setRole(event.target.value as StaffBaseRole); setSelected(''); }}><option value="cashier">Cajero</option><option value="supervisor">Supervisor</option></select></label>
    <label>Perfil<select disabled={busy} value={selected} onChange={event => setSelected(event.target.value)}>
      <option value="">Predeterminado del rol</option>{profiles.filter(profile => profile.base_role === nextRole).map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
    </select></label>
    <details className="permission-help"><summary>Ver permisos · {assignedPermissions.length}</summary>
      <ul>{permissionOptions.filter(option => assignedPermissions.includes(option.id)).map(option => <li key={option.id}>{option.label}</li>)}</ul>
      <p>Siempre puede abrir y cerrar su turno y consultar su actividad.</p>
    </details>
    <button className="secondary-button" disabled={busy || (nextRole === role && selected === (profileId || ''))}>Guardar rol y perfil</button>
  </form>;
}
