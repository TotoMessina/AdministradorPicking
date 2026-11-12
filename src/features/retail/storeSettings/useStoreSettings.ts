import type { Category, Store, Role, Register, Member, Invitation } from '../api';
import type { Run } from '../managementTypes';
import { useStoreSettingsState } from './useStoreSettingsState';

export type StoreSettingsProps = {
  store: Store;
  categories: Category[];
  registers: Register[];
  branches: import('../api').Branch[];
  ledgers: import('../api').SalesLedger[];
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
};

/** Props con los valores por defecto que tenía la firma original. */
export const storeSettingsProps = (props: StoreSettingsProps) => ({
  ...props,
  requestedView: props.view,
  active: (props.active === undefined ? true : props.active) as Exclude<StoreSettingsProps['active'], undefined>,
});

/** Todo el estado y las acciones de StoreSettings. */
export function useStoreSettings(props: StoreSettingsProps) {
  const base = storeSettingsProps(props);
  const s1 = useStoreSettingsState(base);
  return { ...base, ...s1 };
}

export type StoreSettingsState = ReturnType<typeof useStoreSettings>;
