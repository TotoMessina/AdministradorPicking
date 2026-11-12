import { retail } from './api';
import { useStoreGeneralSettings, type StoreGeneralSettingsFormProps } from './storeGeneral/useStoreGeneralSettings';
import { StoreGeneralCard } from './storeGeneral/StoreGeneralCard';
import { StoreGeneralPreview } from './storeGeneral/StoreGeneralPreview';

export function StoreGeneralSettingsForm(props: StoreGeneralSettingsFormProps) {
  const state = useStoreGeneralSettings(props);
  const { store, run, setIsDirty } = state;
  return (
    <form
      className="retail-form store-settings-container"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const success = await run(
          () =>
            retail.updateStore(store.id, {
              name: String(f.get("name")).trim(),
              address: String(f.get("address")),
              phone: String(f.get("phone")),
              receipt_message: String(f.get("message")),
              accent_color: String(f.get("color")),
            }),
          "Comercio actualizado",
        );
        if (success) {
          setIsDirty(false);
        }
      }}
    >
      <StoreGeneralCard state={state} />

      <StoreGeneralPreview state={state} />
    </form>
  );
}
