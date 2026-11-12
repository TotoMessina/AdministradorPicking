import { useCatalogEditorState } from './catalogEditor/useCatalogEditorState';
import { useCatalogBulkPrice } from './catalogEditor/useCatalogBulkPrice';
import { useCatalogReplenish } from './catalogEditor/useCatalogReplenish';
import { useCatalogStockAi } from './catalogEditor/useCatalogStockAi';
import type { CatalogEditorProps } from './catalogEditor/catalogEditorProps';
export type { CatalogEditorProps };

/** Estado y acciones de la planilla de productos. Las vistas reciben el resultado como `s`. */
export function useCatalogEditor(props: CatalogEditorProps) {
  const s1 = useCatalogEditorState(props);
  const s2 = useCatalogBulkPrice({ ...props, ...s1 });
  const s3 = useCatalogReplenish({ ...props, ...s1, ...s2 });
  const s4 = useCatalogStockAi({ ...props, ...s1, ...s2, ...s3 });
  // Devuelve todo lo de cada parte: es lo que reciben las vistas como `s`.
  return { ...s1, ...s2, ...s3, ...s4 };
}

export type CatalogEditorState = ReturnType<typeof useCatalogEditor>;
