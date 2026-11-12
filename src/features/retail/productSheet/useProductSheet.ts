import type { Category, Product, Store } from '../api';
import type { Run } from '../Management';
import { useProductSheetRows } from './useProductSheetRows';
import { useProductSheetActions } from './useProductSheetActions';

export type ProductSheetProps = {
  mode: 'new' | 'edit'; store: Store; products: Product[]; categories: Category[]; initial?: Product[];
  busy: boolean; run: Run; operationBranch?: string;
  /** Abre los componentes de un combo o paquete (su costo sale de ahí). */
  onEditComposition?: (product: Product) => void;
  onClose: () => void;
};

/** Todo el estado y las acciones de ProductSheet. */
export function useProductSheet(props: ProductSheetProps) {
  const s1 = useProductSheetRows(props);
  const s2 = useProductSheetActions({ ...props, ...s1 });
  return { ...props, ...s1, ...s2 };
}

export type ProductSheetState = ReturnType<typeof useProductSheet>;
