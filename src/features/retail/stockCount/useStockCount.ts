import type { Store, Branch, Product, Category } from '../api';
import type { Run } from '../Management';
import { useStockCountState } from './useStockCountState';
import { useStockCountSheet } from './useStockCountSheet';

export type StockCountProps = {
  store: Store; branches: Branch[]; products: Product[]; categories: Category[]; run: Run; busy: boolean; active: boolean; canConfirm: boolean;
};

/** Todo el estado y las acciones de StockCount. */
export function useStockCount(props: StockCountProps) {
  const s1 = useStockCountState(props);
  const s2 = useStockCountSheet({ ...props, ...s1 });
  return { ...props, ...s1, ...s2 };
}

export type StockCountState = ReturnType<typeof useStockCount>;
