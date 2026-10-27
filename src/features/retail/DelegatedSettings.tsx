import { BranchSettings, LedgerSettings } from './BusinessSettings';
import { RegistersSettings, StoreGeneralSettingsForm, type Run } from './Management';
import { SectionNav } from './SectionNav';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import { CategoryLabelEditor } from './CategoryLabelEditor';
import { StaffAccessForm } from './StaffAccessForm';
import { CashierAccess } from './CashierAccess';
import { PermissionProfileSettings, StaffProfileAssignment, usePermissionProfiles } from './PermissionProfiles';
import { PushSettings } from './PushSettings';
import { MarginThresholdSettings } from './MarginThresholdSettings';
import { DepotSettings } from './DepotSettings';
import { BillingSettings } from './BillingSettings';
import { retail, type Store, type Branch, type Category, type Register, type SalesLedger, type Member, type Invitation } from './api';
import type { Permission } from './permissions';

/** Reuse the existing forms without granting the administrative base role. */
export function DelegatedSettings({ store, branches, categories, registers, ledgers, members, invitations, permissions, userId, view, onViewChange, busy, run, active, locationError }: {
  store: Store; branches: Branch[]; categories: Category[]; registers: Register[]; ledgers: SalesLedger[];
  members: Member[]; invitations: Invitation[]; permissions: Permission[]; userId: string; view: string;
  onViewChange: (view: string) => void; busy: boolean; run: Run; active: boolean; locationError?: string;
}) {
  const can = (action: Permission) => permissions.includes(action);
  const team = can('manage_staff') || can('manage_profiles');
  const profiles = usePermissionProfiles(store.id, active && team);
  const sections = [
    ...(can('manage_store') ? [{ id: 'general', label: 'Datos del comercio' }] : []),
    ...(can('manage_locations') ? [{ id: 'locations', label: 'Locales y cajas' }] : []),
    ...(team ? [{ id: 'team', label: 'Personas y perfiles' }] : []),
    ...(can('manage_categories') ? [{ id: 'categories', label: 'Categorías' }] : []),
    ...(can('manage_ledgers') ? [{ id: 'ledgers', label: 'Registros de ventas' }] : []),
    { id: 'app', label: 'App y avisos' },
  ];
  const selected = sections.some(section => section.id === view) ? view : sections[0].id;
  const grantableProfiles = profiles.profiles.filter(profile => profile.permissions.every(action => can(action)));
  return <SettingsEditorGroup><section className="retail-panel settings-workspace settings-workspace-sober">
    {locationError && <p role="alert">{locationError}</p>}
    <SectionNav name="delegated-settings" label="Mi comercio" sections={sections} value={selected} onChange={onViewChange} disabled={busy} />
    {can('manage_store') && <div hidden={selected !== 'general'}><StoreGeneralSettingsForm store={store} busy={busy} run={run} /><BillingSettings key={`billing-${store.id}`} store={store} busy={busy} run={run} active={active && selected === 'general'} /><MarginThresholdSettings key={`margin-${store.id}`} store={store} busy={busy} run={run} /><DepotSettings key={`depot-${store.id}`} store={store} busy={busy} run={run} active={active && selected === 'general'} /></div>}
    {can('manage_locations') && <div hidden={selected !== 'locations'}><BranchSettings storeId={store.id} branches={branches} run={run} busy={busy} /><RegistersSettings storeId={store.id} registers={registers} branches={branches} run={run} busy={busy} /></div>}
    {can('manage_ledgers') && <div hidden={selected !== 'ledgers'}><LedgerSettings storeId={store.id} ledgers={ledgers} run={run} busy={busy} /></div>}
    {can('manage_categories') && <div hidden={selected !== 'categories'}><h3>Categorías de productos</h3>{categories.map(category => <SettingsEditor key={category.id} label="Cambiar nombre" summary={<strong>{category.name}</strong>} busy={busy}>
      {close => <CategoryLabelEditor category={category} storeId={store.id} busy={busy} run={run} close={close} />}
    </SettingsEditor>)}</div>}
    {team && <div hidden={selected !== 'team'}>
      {profiles.error && <p role="alert">{profiles.error}</p>}
      <button type="button" className="text-button" onClick={profiles.reload} disabled={busy || profiles.loading}>Actualizar perfiles</button>
      {can('manage_profiles') && <PermissionProfileSettings storeId={store.id} profiles={profiles.profiles} busy={busy || profiles.loading} run={run} onSaved={profiles.reload} grantable={permissions} />}
      {can('manage_staff') && <>
        <SettingsEditor label="Agregar persona" busy={busy}>{() => <StaffAccessForm storeId={store.id} run={run} busy={busy} profiles={grantableProfiles} allowAdmin={false} />}</SettingsEditor>
        {members.filter(member => ['cashier', 'supervisor'].includes(member.role) && member.user_id !== userId).map(member => <SettingsEditor key={member.user_id} label="Editar acceso" summary={<strong>{member.email}</strong>} busy={busy}>
          {close => <>
            <StaffProfileAssignment storeId={store.id} targetId={member.user_id} role={member.role as 'cashier' | 'supervisor'} profileId={member.profile_id} profiles={grantableProfiles} busy={busy} run={run} close={close} />
            <CashierAccess storeId={store.id} targetId={member.user_id} email={member.email} branchId={member.branch_id} registerId={member.register_id} branches={branches} registers={registers} busy={busy} run={run} />
            <button type="button" className="text-button danger-text" disabled={busy} onClick={async () => { if (window.confirm(`¿Quitar el acceso de ${member.email}?`)) { if (await run(() => retail.removeMember(store.id, member.user_id), 'Acceso quitado')) close(); } }}>Quitar acceso</button>
          </>}
        </SettingsEditor>)}
        {invitations.filter(invite => ['cashier', 'supervisor'].includes(invite.role)).map(invite => <SettingsEditor key={invite.id} label="Editar acceso pendiente" summary={<strong>{invite.email}</strong>} busy={busy}>
          {close => <>
            <StaffProfileAssignment storeId={store.id} targetId={invite.id} role={invite.role as 'cashier' | 'supervisor'} profileId={invite.profile_id} profiles={grantableProfiles} pending busy={busy} run={run} close={close} />
            <CashierAccess storeId={store.id} targetId={invite.id} email={invite.email} branchId={invite.branch_id} registerId={invite.register_id} branches={branches} registers={registers} pending busy={busy} run={run} />
            <button type="button" className="text-button danger-text" disabled={busy} onClick={async () => { if (window.confirm(`¿Revocar el acceso pendiente de ${invite.email}?`)) { if (await run(() => retail.revokeInvite(store.id, invite.id), 'Acceso pendiente revocado')) close(); } }}>Revocar acceso</button>
          </>}
        </SettingsEditor>)}
      </>}
    </div>}
    <div hidden={selected !== 'app'}><PushSettings storeId={store.id} userId={userId} /></div>
  </section></SettingsEditorGroup>;
}
