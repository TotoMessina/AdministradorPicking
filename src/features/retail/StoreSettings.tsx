import { BranchSettings } from './BusinessSettings';
import { SectionNav } from './SectionNav';
import { PushSettings } from './PushSettings';
import { FailureAlertTest } from './FailureAlertTest';
import { SettingsEditorGroup } from './SettingsEditor';
import { History, ChevronRight, Building2, Users, SlidersHorizontal, Settings2, Store as StoreIcon, ArrowLeft } from 'lucide-react';
import { ActivityLog } from './ActivityLog';
import { PlatformAdmin } from './PlatformAdmin';
import { StoreConfiguration } from './StoreConfiguration';
import { RegistersSettings } from './RegistersSettings';
import { StoreGeneralSettingsForm } from './StoreGeneralSettingsForm';
import { useStoreSettings, type StoreSettingsProps } from './storeSettings/useStoreSettings';
import { StoreMoreSection } from './storeSettings/StoreMoreSection';
import { StoreTeamPanel } from './storeSettings/StoreTeamPanel';

export function StoreSettings(props: StoreSettingsProps) {
  const state = useStoreSettings(props);
  const {
    store, registers, branches, ledgers, role, userId, run, busy, onOpenPrices, active, isPlatformAdmin,
    view, setView, morePanelRef, returnToMore, appVisited, primaryView,
  } = state;
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

        <StoreMoreSection state={state} />

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
      <StoreTeamPanel state={state} />
    </div></SettingsEditorGroup>
  );
}
