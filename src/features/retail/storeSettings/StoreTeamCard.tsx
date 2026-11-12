import { askConfirm } from '../../../components/ConfirmHost';
import { StaffAccessForm } from '../StaffAccessForm';
import { StaffMemberAccessEditor } from '../StaffMemberAccessEditor';
import { SettingsEditor } from '../SettingsEditor';
import { Building2, Users, SlidersHorizontal, ShieldCheck, Clock, Mail } from 'lucide-react';
import { retail } from '../api';
import type { StoreSettingsState } from './useStoreSettings';

/** Personas del equipo, invitaciones y sus accesos. */
export function StoreTeamCard({ state }: { state: StoreSettingsState }) {
  const {
    store, registers, branches, members, invitations, role, userId, run, busy, staffProfiles,
    editingMemberId, setEditingMemberId, editingInviteId, setEditingInviteId,
  } = state;
  return (
    <>
      {/* Tarjeta Izquierda: Equipo y accesos */}
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div className="store-settings-header-icon">
            <Users size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Equipo y permisos</h3>
            <p>Quién puede entrar a tu comercio y qué puede hacer.</p>
          </div>
        </div>

        <div className="location-card-body">
          {/* Alta de nueva persona */}
          {(role === 'owner' || role === 'admin') ? (
            <div className="team-add-member-wrapper">
              <SettingsEditor
                label="Agregar persona"
                busy={busy || staffProfiles.loading || !!staffProfiles.error}
              >
                {() => (
                  <div className="team-add-form-container">
                    <StaffAccessForm
                      storeId={store.id}
                      run={run}
                      busy={busy}
                      profiles={staffProfiles.profiles}
                      allowAdmin={role === 'owner'}
                    />
                  </div>
                )}
              </SettingsEditor>
            </div>
          ) : (
            <div className="team-helper-notice">
              <ShieldCheck size={16} />
              <span>El propietario puede agregar personas. Vos podés administrar perfiles y asignaciones de cajeros y supervisores.</span>
            </div>
          )}

          {/* Invitaciones pendientes */}
          {invitations.length > 0 && (
            <div className="team-section-block">
              <div className="team-section-header">
                <Clock size={15} />
                <h4>Todavía no entraron ({invitations.length})</h4>
              </div>
              <div className="team-members-list">
                {invitations.map((i) => {
                  const branchName = branches.find((b) => b.id === i.branch_id)?.name;
                  const registerName = registers.find((r) => r.id === i.register_id)?.name;
                  const profileName = staffProfiles.profiles.find((p) => p.id === i.profile_id)?.name;
                  const roleLabel = i.role === 'admin' ? 'Administrador' : i.role === 'supervisor' ? 'Supervisor' : 'Cajero';

                  const isEditing = editingInviteId === i.id;

                  return (
                    <div className={`team-member-item${isEditing ? ' is-editing' : ''}`} key={i.id}>
                      <div className="team-member-main">
                        <div className="team-avatar team-avatar-pending">
                          <Mail size={16} />
                        </div>
                        <div className="team-member-details">
                          <div className="team-member-email-row">
                            <strong className="team-member-email">{i.email}</strong>
                            <span className="team-role-badge role-pending">Pendiente</span>
                            <span className={`team-role-badge role-${i.role}`}>{roleLabel}</span>
                          </div>
                          <div className="team-member-meta">
                            {(i.role === 'cashier' || i.role === 'supervisor') && (
                              <span className="team-sub-badge">
                                <Building2 size={11} /> {branchName || 'Todas las sucursales'} · {registerName || 'Todas las cajas'}
                              </span>
                            )}
                            {profileName && (
                              <span className="team-sub-badge">
                                <ShieldCheck size={11} /> {profileName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="team-member-actions">
                          {(i.role === 'cashier' || i.role === 'supervisor') && (
                            <button
                              type="button"
                              disabled={busy}
                              className={`team-action-btn ${isEditing ? 'active' : ''}`}
                              onClick={() => setEditingInviteId(isEditing ? null : i.id)}
                              aria-expanded={isEditing}
                              title={`Configurar acceso de ${i.email}`}
                            >
                              <SlidersHorizontal size={14} />
                              <span>{isEditing ? 'Cerrar' : 'Editar acceso'}</span>
                            </button>
                          )}
                          {role === 'owner' && (
                            <button
                              type="button"
                              disabled={busy}
                              className="danger-button-outline"
                              onClick={() =>
                                void run(
                                  () => retail.revokeInvite(store.id, i.id),
                                  'Acceso pendiente eliminado',
                                )
                              }
                              title={`Revocar acceso de ${i.email}`}
                            >
                              Revocar
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && (i.role === 'cashier' || i.role === 'supervisor') && (
                        <StaffMemberAccessEditor
                          storeId={store.id}
                          targetId={i.id}
                          email={i.email}
                          role={i.role as 'cashier' | 'supervisor'}
                          profileId={i.profile_id}
                          profiles={staffProfiles.profiles}
                        roles={staffProfiles.roles}
                          branchId={i.branch_id}
                          registerId={i.register_id}
                          branches={branches}
                          registers={registers}
                          pending
                          busy={busy}
                          run={run}
                          onClose={() => setEditingInviteId(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Miembros activos */}
          <div className="team-section-block">
            <div className="team-section-header">
              <h4>Personas ({members.length})</h4>
            </div>
            <div className="team-members-list">
              {members.map((m) => {
                const branchName = branches.find((b) => b.id === m.branch_id)?.name;
                const registerName = registers.find((r) => r.id === m.register_id)?.name;
                const profileName = staffProfiles.profiles.find((p) => p.id === m.profile_id)?.name;
                const roleLabel = {
                  owner: 'Propietario',
                  admin: 'Administrador',
                  supervisor: 'Supervisor',
                  cashier: 'Cajero',
                }[m.role] || m.role;

                const roleHint = {
                  owner: 'Puede hacer todo',
                  admin: 'Maneja productos y configuración',
                  supervisor: 'Cobra y consulta ventas',
                  cashier: 'Cobra y maneja su caja',
                }[m.role];

                const emailDisplay = m.email || 'Email no disponible';
                const initial = (emailDisplay[0] || 'U').toUpperCase();
                const isCurrentUser = m.user_id === userId;
                const isEditing = editingMemberId === m.user_id;

                return (
                  <div className={`team-member-item${isEditing ? ' is-editing' : ''}`} key={m.user_id}>
                    <div className="team-member-main">
                      <div className={`team-avatar avatar-${m.role}`}>
                        {initial}
                      </div>
                      <div className="team-member-details">
                        <div className="team-member-email-row">
                          <strong className="team-member-email">{emailDisplay}</strong>
                          {isCurrentUser && (
                            <span className="team-you-badge">Vos</span>
                          )}
                          <span className={`team-role-badge role-${m.role}`}>{roleLabel}</span>
                        </div>
                        <div className="team-member-meta">
                          {roleHint && <span className="team-role-hint">{roleHint}</span>}
                          {(m.role === 'cashier' || m.role === 'supervisor') && (
                            <span className="team-sub-badge">
                              <Building2 size={11} /> {branchName || 'Todas las sucursales'} · {registerName || 'Todas las cajas'}
                            </span>
                          )}
                          {profileName && (
                            <span className="team-sub-badge">
                              <ShieldCheck size={11} /> {profileName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="team-member-actions">
                        {(m.role === 'cashier' || m.role === 'supervisor') && (
                          <button
                            type="button"
                            disabled={busy}
                            className={`team-action-btn ${isEditing ? 'active' : ''}`}
                            onClick={() => setEditingMemberId(isEditing ? null : m.user_id)}
                            aria-expanded={isEditing}
                            title={`Configurar acceso de ${emailDisplay}`}
                          >
                            <SlidersHorizontal size={14} />
                            <span>{isEditing ? 'Cerrar' : 'Editar acceso'}</span>
                          </button>
                        )}
                        {role === 'owner' && m.role !== 'owner' && (
                          <button
                            type="button"
                            disabled={busy}
                            className="danger-button-outline"
                            onClick={async () => {
                              if (
                                await askConfirm(
                                  '¿Quitar el acceso de este usuario al comercio?',
                                )
                              )
                                void run(
                                  () => retail.removeMember(store.id, m.user_id),
                                  'Acceso revocado',
                                );
                            }}
                            title={`Quitar acceso a ${m.email}`}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (m.role === 'cashier' || m.role === 'supervisor') && (
                      <StaffMemberAccessEditor
                        storeId={store.id}
                        targetId={m.user_id}
                        email={emailDisplay}
                        role={m.role as 'cashier' | 'supervisor'}
                        profileId={m.profile_id}
                        profiles={staffProfiles.profiles}
                        roles={staffProfiles.roles}
                        branchId={m.branch_id}
                        registerId={m.register_id}
                        branches={branches}
                        registers={registers}
                        busy={busy}
                        run={run}
                        onClose={() => setEditingMemberId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
