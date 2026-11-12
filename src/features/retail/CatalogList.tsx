import type { CatalogEditorState } from './useCatalogEditor';
import { CatalogToolbar } from './catalogList/CatalogToolbar';
import { CatalogTable } from './catalogList/CatalogTable';
import { CatalogPagination } from './catalogList/CatalogPagination';

/** Búsqueda, tabla y paginación de productos. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogList({ s }: { s: CatalogEditorState }) {
  const { guided, productEditing, deletionEditing, compositionEditing, priceEditing } = s;
  return (
    <>
      <div className="catalog-list" hidden={guided || productEditing || priceEditing || compositionEditing || deletionEditing}>
      <CatalogToolbar s={s} />
      <CatalogTable s={s} />
      <CatalogPagination s={s} />
      </div>
    </>
  );
}
