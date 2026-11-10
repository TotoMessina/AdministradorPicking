import { askConfirm } from '../../components/ConfirmHost';
import { AiIcon } from '../../components/AiIcon';
import { useState, useEffect, useRef } from "react";
import { BranchSettings, LedgerSettings } from './BusinessSettings';
import { SectionNav } from './SectionNav';
import { PushSettings } from './PushSettings';
import { FailureAlertTest } from './FailureAlertTest';
import { StaffAccessForm } from './StaffAccessForm';
import { StaffMemberAccessEditor } from './StaffMemberAccessEditor';
import { PermissionProfileSettings, usePermissionProfiles } from './PermissionProfiles';
import { CategoryLabelEditor } from './CategoryLabelEditor';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import { History, Loader2, Tag, ChevronRight, Receipt, RotateCcw, Building2, Users, SlidersHorizontal, Settings2, Plus, Store as StoreIcon, UserCheck, ShieldCheck, Clock, Mail, ArrowLeft, Smartphone, FolderTree, LogOut, RefreshCw, Globe } from "lucide-react";
import type { Category, Store, Role, Register, Member, Invitation } from "./api";
import { retail } from "./api";
import { ActivityLog } from "./ActivityLog";
import { PlatformAdmin } from "./PlatformAdmin";
import { StoreConfiguration } from "./StoreConfiguration";
import { supabase } from "../../lib/supabase";
import type { Run } from './managementTypes';
import { RegistersSettings } from './RegistersSettings';
import { StoreGeneralSettingsForm } from './StoreGeneralSettingsForm';

export function StoreSettings({
  store,
  categories,
  registers,
  branches,
  ledgers,
  members,
  invitations,
  role,
  userId,
  run,
  busy,
  view: requestedView,
  onViewChange,
  onOpenPrices,
  stores,
  onSelectStore,
  onCreateStore,
  onRefreshAccess,
  onSignOut,
  userEmail,
  onOpenAi,
  active = true,
}: {
  store: Store;
  categories: Category[];
  registers: Register[];
  branches: import('./api').Branch[];
  ledgers: import('./api').SalesLedger[];
  members: Member[];
  invitations: Invitation[];
  role: Role;
  userId: string;
  run: Run;
  busy: boolean;
  view: string;
  onViewChange: (view: string) => void;
  onOpenPrices: () => void;
  stores?: Store[];
  onSelectStore?: (storeId: string) => void;
  onCreateStore?: () => void;
  onRefreshAccess?: () => void;
  onSignOut?: () => void;
  userEmail?: string;
  onOpenAi?: () => void;
  active?: boolean;
}) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  useEffect(() => {
    let current = true;
    // Solo decide si se muestra el panel de plataforma; cada cambio vuelve a validar el permiso en la base.
    void supabase.rpc('retail_is_platform_admin').then(({ data, error }) => { if (current) setIsPlatformAdmin(!error && data === true); });
    return () => { current = false; };
  }, [userId]);
  // «Registros de ventas» ahora vive en Ventas y precios: los enlaces viejos llevan ahí.
  const view = requestedView === 'ledgers' ? 'config' : ['general', 'config', 'locations', 'team', 'activity', 'more', 'app', ...(isPlatformAdmin ? ['platform'] : [])].includes(requestedView) ? requestedView : 'general';
  const setView = onViewChange;
  const staffProfiles = usePermissionProfiles(store.id, view === 'team' && (role === 'owner' || role === 'admin'));
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingInviteId, setEditingInviteId] = useState<string | null>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openMoreSection = (next: 'app' | 'ledgers' | 'platform', trigger: HTMLButtonElement) => {
    moreTriggerRef.current = trigger;
    setView(next);
    requestAnimationFrame(() => {
      const region = morePanelRef.current?.querySelector<HTMLElement>(`[data-settings-view="${next}"]`);
      if (region?.getClientRects().length) region.focus();
    });
  };
  const returnToMore = () => {
    setView('more');
    requestAnimationFrame(() => {
      if (!morePanelRef.current?.getClientRects().length) return;
      if (moreTriggerRef.current?.getClientRects().length) moreTriggerRef.current.focus();
      else morePanelRef.current.querySelector<HTMLButtonElement>('section:not([hidden]) button')?.focus();
    });
  };
  const [appVisited, setAppVisited] = useState(view === 'app');
  useEffect(() => { if (view === 'app') setAppVisited(true); }, [view]);
  const isDirectPrimary = ['general', 'config', 'locations', 'team', 'activity'].includes(view);
  const isMoreSub = ['more', 'app', 'ledgers', 'platform'].includes(view);
  const primaryView = isDirectPrimary ? view : (isMoreSub ? 'more' : '');
  if (role !== 'owner' && role !== 'admin') return null;
  return (
    <SettingsEditorGroup><div className="settings-workspace settings-workspace-compact settings-workspace-sober">
      <SectionNav name="settings" label="Secciones de Mi comercio" value={primaryView} onChange={setView} disabled={busy}
        sections={[
          { id: 'general', label: 'Datos del comercio', icon: <StoreIcon size={16} /> },
          { id: 'config', label: 'Ventas y precios', icon: <Settings2 size={16} /> },
          { id: 'locations', label: 'Locales y cajas', icon: <Building2 size={16} /> },
          { id: 'team', label: 'Equipo y permisos', icon: <Users size={16} /> },
          { id: 'activity', label: 'Actividad', icon: <History size={16} /> },
          { id: 'more', label: 'App y cuenta', icon: <SlidersHorizontal size={16} /> },
        ]} />
      <div hidden={view !== 'activity'} role="tabpanel" id="settings-panel-activity" aria-labelledby="settings-tab-activity">
        {view === 'activity' && <ActivityLog storeId={store.id} branches={branches} active={view === 'activity'} />}
      </div>
      <div
        ref={morePanelRef}
        hidden={primaryView !== 'more'}
        role="tabpanel"
        id="settings-panel-more"
        aria-labelledby="settings-tab-more"
      >
        {view !== 'more' && (
          <div className="more-subview-header">
            <button
              type="button"
              className="secondary-button more-back-button"
              disabled={busy}
              onClick={returnToMore}
            >
              <ArrowLeft size={16} /> Volver a App y cuenta
            </button>
            <div className="more-subview-breadcrumb">
              <span>App y cuenta</span>
              <ChevronRight size={14} />
              <strong>{view === 'ledgers' ? 'Registros de ventas' : view === 'platform' ? 'Panel de plataforma' : 'App y avisos'}</strong>
            </div>
          </div>
        )}

        {view === 'more' && (
          <div className="more-settings-container">
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

            {/* Categorías de consulta: provistas por la base de datos. */}
            <div className="more-settings-column">
              <div className="store-settings-card">
              <div className="store-settings-header">
                <div className="store-settings-header-icon">
                  <FolderTree size={22} />
                </div>
                <div className="store-settings-header-text">
                  <h3>Categorías de productos</h3>
                  <p>Vienen incluidas. Podés personalizar sus nombres para tu comercio.</p>
                </div>
              </div>

              <div className="location-card-body">
                <div className="team-summary-badges">
                  <span className="location-pill-badge active">
                    <Tag size={12} /> {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
                  </span>
                </div>

                <div className="location-items-list more-categories-list">
                  {categories.length === 0 ? (
                    <div className="location-empty-notice">
                      <Tag size={24} />
                      <p>No se cargaron las categorías. Actualizá los datos y verificá la migración de categorías estándar.</p>
                    </div>
                  ) : (
                    categories.map((c) => (
                      <div key={c.id} className="category-item-card">
                        <SettingsEditor label="Cambiar nombre" busy={busy} summary={<div className="category-summary-row">
                          <span className="category-pill-icon"><Tag size={13} /></span>
                          <strong>{c.name}</strong>
                          {c.canonicalName && c.canonicalName !== c.name && <small>{c.canonicalName}</small>}
                        </div>}>
                          {close => <CategoryLabelEditor storeId={store.id} category={c} busy={busy} run={run} close={close} />}
                        </SettingsEditor>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

        <div
          hidden={view !== 'app'}
          data-settings-view="app"
          tabIndex={-1}
          role="region"
          aria-label="App y avisos"
          className="more-subview-panel"
        >
          {(appVisited || view === 'app') && (
            <>
              <PushSettings key={store.id + userId} storeId={store.id} userId={userId} />
              <FailureAlertTest storeId={store.id} />
            </>
          )}
        </div>
        {isPlatformAdmin && (
          <div
            hidden={view !== 'platform'}
            data-settings-view="platform"
            tabIndex={-1}
            role="region"
            aria-label="Panel de plataforma"
            className="more-subview-panel"
          >
            {view === 'platform' && <PlatformAdmin run={run} busy={busy} active={active && view === 'platform'} />}
          </div>
        )}
      </div>
      <div className="settings-data settings-data-wide" hidden={view !== 'general'} role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general">
        <StoreGeneralSettingsForm store={store} busy={busy} run={run} />
      </div>
      <div className="settings-data settings-data-wide" hidden={view !== 'config'} role="tabpanel" id="settings-panel-config" aria-labelledby="settings-tab-config">
        <StoreConfiguration store={store} ledgers={ledgers} busy={busy} run={run} active={active && view === 'config'} onOpenPrices={onOpenPrices} />
      </div>
      <div hidden={view !== 'locations'} role="tabpanel" id="settings-panel-locations" aria-labelledby="settings-tab-locations">
        <div className="locations-settings-container is-map">
          <BranchSettings storeId={store.id} branches={branches} registers={registers} run={run} busy={busy}
            renderRegisters={(branchId) => <RegistersSettings storeId={store.id} registers={registers} branches={branches} run={run} busy={busy} branchId={branchId} />} />
        </div>
      </div>
      {(role === "owner" || role === "admin") && (
        <div
          hidden={view !== 'team'}
          role="tabpanel"
          id="settings-panel-team"
          aria-labelledby="settings-tab-team"
        >
          <div className="team-settings-container">
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
    </div></SettingsEditorGroup>
  );
}
