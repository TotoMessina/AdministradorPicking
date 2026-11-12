import type { SalesLedger } from '../api';
import type { Run } from '../Management';
import { useLedgerSettingsState } from './useLedgerSettingsState';

export type LedgerSettingsProps = {
  storeId: string;
  ledgers: SalesLedger[];
  run: Run;
  busy: boolean;
};

/** Todo el estado y las acciones de LedgerSettings. */
export function useLedgerSettings(props: LedgerSettingsProps) {
  const s1 = useLedgerSettingsState(props);
  return { ...props, ...s1 };
}

export type LedgerSettingsState = ReturnType<typeof useLedgerSettings>;
