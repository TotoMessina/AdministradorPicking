import { PermissionProfileSettings } from '../PermissionProfiles';
import { Loader2, RotateCcw } from 'lucide-react';
import type { StoreSettingsState } from './useStoreSettings';
import { StoreTeamCard } from './StoreTeamCard';

/** Sección Equipo: personas, accesos y perfiles. */
export function StoreTeamPanel({ state }: { state: StoreSettingsState }) {
  const { store, members, invitations, role, run, busy, view, staffProfiles } = state;
  return (
    <>
      {(role === "owner" || role === "admin") && (
        <div
          hidden={view !== 'team'}
          role="tabpanel"
          id="settings-panel-team"
          aria-labelledby="settings-tab-team"
        >
          <div className="team-settings-container">
            <StoreTeamCard state={state} />

            {/* Perfiles: uso ocasional, plegados debajo de las personas */}
            <details className="team-profiles-more" key={staffProfiles.profiles.length ? 'with-profiles' : 'no-profiles'} open={staffProfiles.profiles.length > 0}>
              <summary><span><strong>Roles y permisos</strong><small>{staffProfiles.profiles.length ? `${staffProfiles.profiles.length} ${staffProfiles.profiles.length === 1 ? 'perfil creado' : 'perfiles creados'}` : 'Qué puede hacer cada rol'}</small></span></summary>
              <div className="location-card-body team-profiles-body">
                <p className="team-profiles-intro">Cambiá lo que puede hacer cada rol, o creá un perfil para una persona en particular.</p>

                {staffProfiles.loading && (
                  <div className="location-empty-state">
                    <Loader2 className="spinning-icon" size={20} />
                    <span>Cargando perfiles…</span>
                  </div>
                )}
                {staffProfiles.error && (
                  <div className="location-confirm-box">
                    <span role="alert">{staffProfiles.error}</span>
                    <button type="button" className="secondary-button" onClick={staffProfiles.reload}>
                      <RotateCcw size={14} /> Reintentar
                    </button>
                  </div>
                )}
                {!staffProfiles.loading && !staffProfiles.error && (
                  <PermissionProfileSettings
                    storeId={store.id}
                    profiles={staffProfiles.profiles}
                    roles={staffProfiles.roles}
                    busy={busy}
                    run={run}
                    onSaved={staffProfiles.reload}
                    peopleWith={id => members.filter(member => member.profile_id === id).length + invitations.filter(invite => invite.profile_id === id).length}
                  />
                )}
                <button type="button" className="text-button team-refresh-profiles-btn" disabled={busy || staffProfiles.loading} onClick={staffProfiles.reload}>
                  <RotateCcw size={13} /> Actualizar perfiles
                </button>
              </div>
            </details>
          </div>
        </div>
      )}
    </>
  );
}
