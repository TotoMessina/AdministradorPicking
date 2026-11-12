import { CategoryLabelEditor } from '../CategoryLabelEditor';
import { SettingsEditor } from '../SettingsEditor';
import { Tag, FolderTree } from 'lucide-react';
import type { StoreSettingsState } from './useStoreSettings';
import { StoreMoreTools } from './StoreMoreTools';

/** Sección «Más»: herramientas, cuenta, comercios y categorías. */
export function StoreMoreSection({ state }: { state: StoreSettingsState }) {
  const { store, categories, run, busy, view } = state;
  return (
    <>
        {view === 'more' && (
          <div className="more-settings-container">
            <StoreMoreTools state={state} />

            {/* Categorías de consulta: provistas por la base de datos. */}
            <div className="more-settings-column">
              <div className="store-settings-card">
              <div className="store-settings-header">
                <div className="store-settings-header-icon">
                  <FolderTree size={22} />
                </div>
                <div className="store-settings-header-text">
                  <h3>Categorías de productos</h3>
                  <p>Vienen incluidas. Podés personalizar sus nombres para tu comercio.</p>
                </div>
              </div>

              <div className="location-card-body">
                <div className="team-summary-badges">
                  <span className="location-pill-badge active">
                    <Tag size={12} /> {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
                  </span>
                </div>

                <div className="location-items-list more-categories-list">
                  {categories.length === 0 ? (
                    <div className="location-empty-notice">
                      <Tag size={24} />
                      <p>No se cargaron las categorías. Actualizá los datos y verificá la migración de categorías estándar.</p>
                    </div>
                  ) : (
                    categories.map((c) => (
                      <div key={c.id} className="category-item-card">
                        <SettingsEditor label="Cambiar nombre" busy={busy} summary={<div className="category-summary-row">
                          <span className="category-pill-icon"><Tag size={13} /></span>
                          <strong>{c.name}</strong>
                          {c.canonicalName && c.canonicalName !== c.name && <small>{c.canonicalName}</small>}
                        </div>}>
                          {close => <CategoryLabelEditor storeId={store.id} category={c} busy={busy} run={run} close={close} />}
                        </SettingsEditor>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
