import type { ReactNode } from 'react';
import type { Branch, Register } from '../api';
import type { Run } from '../Management';
import { useBranchSettingsState } from './useBranchSettingsState';

export type BranchSettingsProps = {
  storeId: string;
  branches: Branch[];
  registers: Register[];
  run: Run;
  busy: boolean;
  /** Contenido de cajas del modal; `null` muestra las cajas sin sucursal válida. */
  renderRegisters: (branchId: string | null) => ReactNode;
};

/** Todo el estado y las acciones de BranchSettings. */
export function useBranchSettings(props: BranchSettingsProps) {
  const s1 = useBranchSettingsState(props);
  return { ...props, ...s1 };
}

export type BranchSettingsState = ReturnType<typeof useBranchSettings>;
