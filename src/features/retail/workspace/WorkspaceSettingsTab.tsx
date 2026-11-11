import { retail, errorMessage } from '../api';
import { StoreSettings } from '../Management';
import type { WorkspaceState } from './useWorkspace';

/** Pestaña Configuración del dueño o administrador. */
export function WorkspaceSettingsTab({ state }: { state: WorkspaceState }) {
  const {
    session, store, stores, setSelected, onCreate, onSignOut, notify, role, tab, setTab, setCatalogView,
    settingsView, setSettingsView, guiding, categories, registers, branches, ledgers, members,
    invitations, setIsAiOpen, busy, manager, run, confirmLeave,
  } = state;
  return (
    <>
      {manager && <div hidden={tab !== 'settings'}>
        <StoreSettings
          active={!guiding && tab === 'settings'}
          view={settingsView}
          onViewChange={setSettingsView}
          onOpenPrices={() => { setCatalogView('prices'); setTab('catalog'); }}
          store={store}
          categories={categories}
          registers={registers}
          branches={branches}
          ledgers={ledgers}
          members={members}
          invitations={invitations}
          role={role}
          userId={session.user.id}
          run={run}
          busy={busy}
          stores={stores}
          onSelectStore={(storeId) => {
            void confirmLeave().then(ok => { if (ok) setSelected(storeId); });
          }}
          onCreateStore={() => {
            if (!guiding) void confirmLeave().then(ok => { if (ok) onCreate(); });
          }}
          onRefreshAccess={() =>
            void run(async () => {
              await retail.acceptInvitations();
            }, "Accesos actualizados")
          }
          onSignOut={() => {
            void confirmLeave().then(ok => { if (ok) void onSignOut().catch((e) => notify("error", errorMessage(e))); });
          }}
          userEmail={session.user.email}
          onOpenAi={() => setIsAiOpen(true)}
        />
      </div>}
    </>
  );
}
