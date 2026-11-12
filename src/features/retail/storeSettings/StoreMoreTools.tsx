import { AiIcon } from '../../../components/AiIcon';
import { ChevronRight, SlidersHorizontal, Plus, Store as StoreIcon, UserCheck, ShieldCheck, Smartphone, LogOut, RefreshCw, Globe } from 'lucide-react';
import type { StoreSettingsState } from './useStoreSettings';

/** Columna de herramientas, cuenta y comercios. */
export function StoreMoreTools({ state }: { state: StoreSettingsState }) {
  const {
    store, role, busy, stores, onSelectStore, onCreateStore, onRefreshAccess, onSignOut, userEmail,
    onOpenAi, isPlatformAdmin, openMoreSection,
  } = state;
  return (
    <>
      {/* Columna Izquierda: Opciones y herramientas + Cuenta y comercios */}
      <div className="more-settings-column">
        {/* Tarjeta 1: Opciones y herramientas */}
        <div className="store-settings-card">
          <div className="store-settings-header">
            <div className="store-settings-header-icon">
              <SlidersHorizontal size={22} />
            </div>
            <div className="store-settings-header-text">
              <h3>App y avisos</h3>
              <p>Instalar la app en tus dispositivos y elegir qué avisos te llegan.</p>
            </div>
          </div>

          <div className="location-card-body">
            <div className="more-nav-cards-list">
              <button
                type="button"
                className="more-nav-card"
                disabled={busy}
                onClick={(event) => openMoreSection('app', event.currentTarget)}
              >
                <div className="more-nav-card-icon icon-app">
                  <Smartphone size={20} />
                </div>
                <div className="more-nav-card-info">
                  <div className="more-nav-card-top">
                    <strong>App y avisos</strong>
                    <span className="location-pill-badge">PWA & Notificaciones</span>
                  </div>
                  <small>Instalación en tu dispositivo, notificaciones push y alertas de stock bajo.</small>
                </div>
                <ChevronRight size={18} className="more-nav-arrow" aria-hidden="true" />
              </button>

              {isPlatformAdmin && (
                <button
                  type="button"
                  className="more-nav-card"
                  disabled={busy}
                  onClick={(event) => openMoreSection('platform', event.currentTarget)}
                >
                  <div className="more-nav-card-icon">
                    <Globe size={20} />
                  </div>
                  <div className="more-nav-card-info">
                    <div className="more-nav-card-top">
                      <strong>Panel de plataforma</strong>
                      <span className="location-pill-badge">Plataforma</span>
                    </div>
                    <small>Todos los comercios, usuarios, uso de IA y catálogo global compartido.</small>
                  </div>
                  <ChevronRight size={18} className="more-nav-arrow" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Cuenta y comercios */}
        <div className="store-settings-card account-settings-card">
          <div className="store-settings-header">
            <div className="store-settings-header-icon icon-account">
              <UserCheck size={22} />
            </div>
            <div className="store-settings-header-text">
              <h3>Cuenta y comercios</h3>
              <p>Cambiá de comercio, gestioná accesos o cerrá tu sesión de trabajo.</p>
            </div>
          </div>

          <div className="location-card-body account-settings-body">
            {/* Selector / Indicador de comercio */}
            <div className="account-store-section">
              <span className="store-field-label">Comercio activo</span>
              <div className="account-store-row">
                {stores && stores.length > 1 ? (
                  <div className="account-select-wrap">
                    <StoreIcon size={16} className="account-select-icon" aria-hidden="true" />
                    <select
                      id="more-store-select"
                      className="store-select-field account-store-select"
                      disabled={busy}
                      value={store.id}
                      onChange={(e) => onSelectStore?.(e.target.value)}
                      aria-label="Seleccionar comercio"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="account-store-info">
                    <span className="account-store-name">
                      <StoreIcon size={15} /> {store.name}
                    </span>
                    <span className="location-pill-badge active">Activo</span>
                  </div>
                )}

                {onCreateStore && (
                  <button
                    type="button"
                    className="secondary-button account-btn-create"
                    disabled={busy}
                    onClick={onCreateStore}
                  >
                    <Plus size={15} /> Crear otro comercio
                  </button>
                )}
              </div>
            </div>

            <hr className="account-divider" />

            {/* Perfil de usuario y rol */}
            <div className="account-user-card">
              <div className="account-avatar" aria-hidden="true">
                {(userEmail ? userEmail.charAt(0) : 'U').toUpperCase()}
              </div>
              <div className="account-user-details">
                <div className="account-user-role-row">
                  <span className="account-role-badge">
                    <ShieldCheck size={13} />
                    {{
                      owner: 'Propietario',
                      admin: 'Administrador',
                      supervisor: 'Supervisor',
                      cashier: 'Cajero',
                    }[role] || role}
                  </span>
                </div>
                <span className="account-user-email" title={userEmail}>
                  {userEmail || 'Usuario'}
                </span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="account-actions-list">
              {onRefreshAccess && (
                <button
                  type="button"
                  className="account-action-btn"
                  disabled={busy}
                  onClick={onRefreshAccess}
                >
                  <RefreshCw size={16} />
                  <span>Actualizar accesos</span>
                </button>
              )}

              {onOpenAi && (
                <button
                  type="button"
                  className="account-action-btn ai-action"
                  disabled={busy}
                  onClick={onOpenAi}
                >
                  <AiIcon />
                  <span>Consultar al asistente</span>
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  className="account-action-btn logout-btn"
                  disabled={busy}
                  onClick={onSignOut}
                >
                  <LogOut size={16} />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
