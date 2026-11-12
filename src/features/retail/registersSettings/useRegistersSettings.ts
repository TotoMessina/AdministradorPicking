import type { Register, Branch } from '../api';
import type { Run } from '../managementTypes';
import { useRegistersSettingsState } from './useRegistersSettingsState';

export type RegistersSettingsProps = {
  storeId: string;
  registers: Register[];
  branches: Branch[];
  run: Run;
  busy: boolean;
  /** Dentro del modal de una sucursal: solo sus cajas; `null` muestra las que no tienen sucursal válida. */
  branchId?: string | null;
};

/** Todo el estado y las acciones de RegistersSettings. */
export function useRegistersSettings(props: RegistersSettingsProps) {
  const s1 = useRegistersSettingsState(props);
  return { ...props, ...s1 };
}

export type RegistersSettingsState = ReturnType<typeof useRegistersSettings>;
