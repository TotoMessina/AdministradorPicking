import type { Store } from '../api';
import type { Run } from '../Management';
import { useBillingSettingsState } from './useBillingSettingsState';
import { useBillingSettingsActions } from './useBillingSettingsActions';

export type BillingSettingsProps = {
  store: Store;
  busy: boolean;
  run: Run;
  active?: boolean;
};

/** Props con los valores por defecto que tenía la firma original. */
export const billingSettingsProps = (props: BillingSettingsProps) => ({
  ...props,
  active: (props.active === undefined ? true : props.active) as Exclude<BillingSettingsProps['active'], undefined>,
});

/** Todo el estado y las acciones de BillingSettings. */
export function useBillingSettings(props: BillingSettingsProps) {
  const base = billingSettingsProps(props);
  const s1 = useBillingSettingsState(base);
  const s2 = useBillingSettingsActions({ ...base, ...s1 });
  return { ...base, ...s1, ...s2 };
}

export type BillingSettingsState = ReturnType<typeof useBillingSettings>;
