import { MapPin, Pencil, Check, RotateCcw, AlertTriangle, X, Trash2 } from 'lucide-react';
import { BranchLocationPicker } from '../BranchMap';
import { retail } from '../api';
import type { BranchSettingsState } from './useBranchSettings';

/** Editar una sucursal: datos, ubicación y cajas. */
export function BranchEditorModal({ state }: { state: BranchSettingsState }) {
  const {
    storeId, run, busy, renderRegisters, openId, setOpenId, isEditing, setIsEditing, isDeleting,
    setIsDeleting, titleId, close, dialog, openBranch,
  } = state;
  return (
    <>
      {openId !== undefined && (openId === null || openBranch) && (
        <div className="branch-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div
            className="branch-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-busy={busy}
            tabIndex={-1}
            ref={dialog}
          >
            <div className="branch-modal-header">
              <span className="branch-map-marker" aria-hidden="true">
                {openBranch ? <MapPin size={20} /> : <AlertTriangle size={18} />}
              </span>
              <div className="branch-modal-title">
                <h2 id={titleId}>{openBranch ? openBranch.name : 'Cajas sin sucursal'}</h2>
                <p>{openBranch ? openBranch.address || 'Sin dirección asignada' : 'Editá cada caja para asignarla a un local.'}</p>
              </div>
              {openBranch && !isEditing && (
                <button type="button" className="secondary-button" disabled={busy} onClick={() => setIsEditing(true)}>
                  <Pencil size={13} /> Editar local
                </button>
              )}
              <button type="button" className="icon-button branch-modal-close" onClick={close} disabled={busy} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="branch-modal-body">
              {openBranch && isEditing && (
                <form
                  className="location-inline-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const success = await run(
                      () =>
                        retail.saveBranch(
                          storeId,
                          String(f.get('name')),
                          String(f.get('address')),
                          openBranch.id,
                        ),
                      'Sucursal actualizada',
                    );
                    if (success) setIsEditing(false);
                  }}
                >
                  <div className="store-field-group">
                    <label className="store-field-label" htmlFor={`branch-name-${openBranch.id}`}>
                      Sucursal
                    </label>
                    <input
                      id={`branch-name-${openBranch.id}`}
                      name="name"
                      required
                      maxLength={80}
                      defaultValue={openBranch.name}
                      placeholder="Ej. Centro"
                      className="store-text-input"
                      autoFocus
                    />
                  </div>
                  <div className="store-field-group">
                    <label className="store-field-label" htmlFor={`branch-addr-${openBranch.id}`}>
                      Dirección
                    </label>
                    <input
                      id={`branch-addr-${openBranch.id}`}
                      name="address"
                      maxLength={300}
                      defaultValue={openBranch.address || ''}
                      placeholder="Ej. Av. San Martín 100"
                      className="store-text-input"
                    />
                  </div>
                  <div className="location-edit-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => setIsEditing(false)}
                    >
                      <RotateCcw size={14} /> Cancelar
                    </button>
                    <button className="primary-button" disabled={busy}>
                      <Check size={15} /> Guardar sucursal
                    </button>
                  </div>
                </form>
              )}
              {openBranch && !isEditing && (
                <BranchLocationPicker
                  key={`${openBranch.id}:${openBranch.latitude}:${openBranch.longitude}`}
                  branch={openBranch}
                  busy={busy}
                  onSave={(point) => run(
                    () => retail.saveBranchLocation(storeId, openBranch.id, point?.latitude ?? null, point?.longitude ?? null),
                    point ? 'Ubicación guardada' : 'Sucursal quitada del mapa',
                  )}
                />
              )}
              {renderRegisters(openId)}
              {openBranch && !openBranch.is_default && (
                isDeleting ? (
                  <div className="location-confirm-box">
                    <span>
                      ¿Eliminar la sucursal <strong>"{openBranch.name}"</strong>? Solo es posible si no tiene cajas activas ni historial de ventas, cierres de caja, stock o transferencias.
                    </span>
                    <div className="location-edit-actions-right">
                      <button
                        type="button"
                        className="danger-button"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await run(() => retail.deleteBranch(storeId, openBranch.id), `Sucursal "${openBranch.name}" eliminada`);
                          if (ok) { setOpenId(undefined); setIsDeleting(false); setIsEditing(false); }
                        }}
                      >
                        Sí, eliminar
                      </button>
                      <button type="button" className="secondary-button" disabled={busy} onClick={() => setIsDeleting(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="branch-modal-danger">
                    <button type="button" className="text-button text-button-danger" disabled={busy} onClick={() => setIsDeleting(true)}>
                      <Trash2 size={14} /> Eliminar sucursal
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
