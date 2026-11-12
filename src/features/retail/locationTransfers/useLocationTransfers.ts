import type { Store, Branch, Product } from '../api';
import type { Run } from '../Management';
import { useTransferState } from './useTransferState';
import { useTransferActions } from './useTransferActions';
import { useTransferRoutes } from './useTransferRoutes';

export type LocationTransfersProps = {
  store: Store; branches: Branch[]; products: Product[]; run: Run; busy: boolean; active: boolean;
  canStock: boolean; canFunds: boolean; isAdmin: boolean;
  /** Mercadería (Productos → Mover mercadería) o plata (sección Plata): sin selector entre las dos. */
  only?: 'stock' | 'money';
};

/** Todo el estado y las acciones de LocationTransfers. */
export function useLocationTransfers(props: LocationTransfersProps) {
  const s1 = useTransferState(props);
  const s2 = useTransferActions({ ...props, ...s1 });
  const s3 = useTransferRoutes({ ...props, ...s1, ...s2 });
  return { ...props, ...s1, ...s2, ...s3 };
}

export type LocationTransfersState = ReturnType<typeof useLocationTransfers>;
