import { Building2, MapPin, Plus, Star, Monitor, AlertTriangle } from 'lucide-react';
import { BranchMap, locatedPoint } from '../BranchMap';
import { retail } from '../api';
import type { BranchSettingsState } from './useBranchSettings';

/** Lista de sucursales y alta de una nueva. */
export function BranchList({ state }: { state: BranchSettingsState }) {
  const {
    storeId, branches, run, busy, setOpenId, isAdding, setIsAdding, counts, countFor, openMap,
    orphanCount,
  } = state;
  return (
    <>
      <div className="location-card-body">
        {branches.length > 0 ? (
          <>
            <BranchMap branches={branches} counts={counts} onSelect={openMap} />
            <div className="branch-map-list" role="group" aria-label="Sucursales">
              {branches.map((b) => {
                const count = countFor(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    className="branch-map-chip"
                    onClick={() => setOpenId(b.id)}
                    aria-haspopup="dialog"
                  >
                    <MapPin size={14} />
                    <span className="branch-map-chip-text">
                      <strong>{b.is_default && <Star size={11} aria-label="Principal" />} {b.name}</strong>
                      <small>{b.address || 'Sin dirección asignada'}</small>
                    </span>
                    {!locatedPoint(b) && <span className="location-pill-badge">Sin ubicar</span>}
                    <span className={`location-pill-badge ${count ? 'active' : ''}`}>
                      <Monitor size={11} /> {count ? `${count} ${count === 1 ? 'caja' : 'cajas'}` : 'Sin cajas'}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="location-empty-notice">
            <Building2 size={24} />
            <p>Todavía no agregaste sucursales. Creá tu primer local para comenzar a operar cajas.</p>
          </div>
        )}

        {orphanCount > 0 && (
          <button type="button" className="branch-map-orphans" onClick={() => setOpenId(null)} aria-haspopup="dialog">
            <AlertTriangle size={15} />
            <span>
              {orphanCount} {orphanCount === 1 ? 'caja sin sucursal asignada' : 'cajas sin sucursal asignada'}. Asignalas a un local.
            </span>
          </button>
        )}

        {/* Sección Agregar Sucursal */}
        <div className="location-add-section">
          <div className="location-add-header">
            <div className="location-add-title">
              <Plus size={16} />
              <span>Nueva sucursal</span>
            </div>
            {branches.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setIsAdding(!isAdding)}
              >
                {isAdding ? 'Ocultar' : '+ Agregar otra'}
              </button>
            )}
          </div>

          {(isAdding || branches.length === 0) && (
            <form
              className="location-add-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const formEl = e.currentTarget;
                const success = await run(
                  () =>
                    retail.saveBranch(
                      storeId,
                      String(f.get('name')),
                      String(f.get('address')),
                      undefined,
                    ),
                  'Sucursal creada',
                );
                if (success) {
                  formEl.reset();
                  if (branches.length > 0) setIsAdding(false);
                }
              }}
            >
              <div className="store-fields-2col">
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-branch-name">
                    Nueva sucursal
                  </label>
                  <input
                    id="new-branch-name"
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Ej. Centro"
                    className="store-text-input"
                  />
                </div>
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-branch-address">
                    Dirección
                  </label>
                  <input
                    id="new-branch-address"
                    name="address"
                    maxLength={300}
                    placeholder="Ej. Av. San Martín 100"
                    className="store-text-input"
                  />
                </div>
              </div>
              <div className="location-add-footer">
                <button className="primary-button" disabled={busy}>
                  <Plus size={16} /> Crear sucursal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
