import type { Store } from '../api';
import type { Run } from '../managementTypes';
import { useStoreGeneralForm } from './useStoreGeneralForm';

export type StoreGeneralSettingsFormProps = {
  store: Store;
  busy: boolean;
  run: Run;
};

/** Todo el estado y las acciones de StoreGeneralSettingsForm. */
export function useStoreGeneralSettings(props: StoreGeneralSettingsFormProps) {
  const s1 = useStoreGeneralForm(props);
  return { ...props, ...s1 };
}

export type StoreGeneralSettingsState = ReturnType<typeof useStoreGeneralSettings>;
