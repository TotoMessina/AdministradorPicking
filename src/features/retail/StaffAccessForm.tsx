import { useRef, useState } from 'react';
import { authorizeStaff, createStaffAccount, type StaffRole, type StaffAccountResult } from './staffAccounts';
import type { Run } from './Management';
import type { PermissionProfile } from './permissions';

export function StaffAccessForm({ storeId, run, busy, profiles = [] }: { storeId: string; run: Run; busy: boolean; profiles?: PermissionProfile[] }) {
  const [staffRole, setStaffRole] = useState<StaffRole>('cashier');
  const [profileId, setProfileId] = useState('');
  const [existingAccount, setExistingAccount] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const running = useRef(false);
  return <>
    <p>Creá la cuenta de la persona con su email y una contraseña inicial. Si ya usa el sistema, autorizá su cuenta existente.</p>
    <form className="retail-form staff-access-form" onSubmit={async event => {
      event.preventDefault();
      if (running.current || busy) return;
      const form = event.currentTarget;
      const values = new FormData(form);
      const password = String(values.get('password') || '');
      setError(''); setNotice('');
      if (!existingAccount && password !== values.get('confirmPassword')) { setError('Las contraseñas no coinciden.'); return; }
      running.current = true; setSaving(true);
      const email = String(values.get('email')).trim().toLowerCase();
      const role = values.get('role') as StaffRole;
      const reuse = existingAccount;
      let outcome: StaffAccountResult | undefined;
      try {
        const ok = await run(async () => {
          if (reuse) await authorizeStaff(storeId, email, role, profileId);
          else outcome = await createStaffAccount(storeId, email, role, password, profileId);
        }, reuse ? 'Acceso autorizado' : 'Alta procesada');
        if (ok) {
          form.reset();
          setStaffRole('cashier'); setProfileId('');
          setNotice(reuse || outcome === 'existing'
            ? `Acceso autorizado para ${email}. Debe ingresar con su cuenta y contraseña habituales, o usar “Olvidé mi contraseña” si no la recuerda. La contraseña existente no se cambia.`
            : outcome === 'confirmation'
              ? `Cuenta creada para ${email}. Debe abrir el correo de confirmación y luego ingresar con la contraseña inicial que elegiste. El comercio se vincula al iniciar sesión.`
              : `Cuenta creada para ${email}. Ya puede ingresar con el email y la contraseña inicial que elegiste. El comercio se vincula al iniciar sesión.`);
        }
      } finally {
        // Do not retain passwords in the form after a network attempt, even on failure.
        const field = form.elements.namedItem('password') as HTMLInputElement | null;
        const confirmation = form.elements.namedItem('confirmPassword') as HTMLInputElement | null;
        if (field) field.value = '';
        if (confirmation) confirmation.value = '';
        running.current = false; setSaving(false);
      }
    }}>
      <fieldset disabled={busy || saving} className="staff-fields">
        <label>Email del colaborador<input name="email" type="email" autoComplete="off" required maxLength={254} /></label>
        <label>Rol<select name="role" value={staffRole} onChange={event => { setStaffRole(event.target.value as StaffRole); setProfileId(''); }}><option value="cashier">Cajero: ventas y caja</option><option value="supervisor">Supervisor: operación y consulta de ventas asignadas</option><option value="admin">Administrador: catálogo y configuración</option></select></label>
        {staffRole !== 'admin' && <label>Perfil de acciones<select value={profileId} onChange={event => setProfileId(event.target.value)}>
          <option value="">Permisos habituales del rol</option>{profiles.filter(profile => profile.base_role === staffRole).map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select></label>}
        <small>El perfil se aplica desde el primer ingreso. Después podés limitar su sucursal y caja en la asignación de la persona.</small>
        <label className="staff-existing"><input type="checkbox" checked={existingAccount} onChange={event => { setExistingAccount(event.target.checked); setNotice(''); setError(''); }} />Ya tiene una cuenta en el sistema</label>
        {!existingAccount && <>
          <label>Contraseña inicial<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
          <label>Repetir contraseña<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
          <small>Al menos 8 caracteres. Compartí los datos con el colaborador. Si se solicita, deberá confirmar su email antes de entrar.</small>
        </>}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <button className="primary-button" type="submit">{saving ? 'Guardando…' : existingAccount ? 'Autorizar cuenta existente' : 'Crear cuenta y dar acceso'}</button>
      </fieldset>
    </form>
    {notice && <div className="info-banner" role="status">{notice}</div>}
  </>;
}
