import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { Building2, MapPin, Pencil, Plus, Check, RotateCcw, Star, Monitor, AlertTriangle, X, Trash2 } from 'lucide-react';
import { BranchLocationPicker, BranchMap, locatedPoint } from './BranchMap';
import { retail, type Branch, type Register } from './api';
import { useDialogFocus } from './useDialogFocus';
import type { Run } from './Management';

/** Sucursales: alta, edición, ubicación y cajas. */
export function BranchSettings({
  storeId,
  branches,
  registers,
  run,
  busy,
  renderRegisters,
}: {
  storeId: string;
  branches: Branch[];
  registers: Register[];
  run: Run;
  busy: boolean;
  /** Contenido de cajas del modal; `null` muestra las cajas sin sucursal válida. */
  renderRegisters: (branchId: string | null) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(branches.length === 0);
  const titleId = useId();
  const close = () => {
    if (busy) return;
    setOpenId(undefined);
    setIsEditing(false);
    setIsDeleting(false);
  };
  const dialog = useDialogFocus(openId !== undefined, close);

  const active = registers.filter((r) => r.active);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const r of registers) if (r.active) result[r.branch_id] = (result[r.branch_id] || 0) + 1;
    return result;
  }, [registers]);
  const countFor = (branchId: string) => counts[branchId] || 0;
  const openMap = useCallback((id: string) => setOpenId(id), []);
  const orphanCount = active.filter((r) => !branches.some((b) => b.id === r.branch_id)).length;
  const openBranch = openId ? branches.find((b) => b.id === openId) : undefined;

  return (
    <div className="store-settings-card">
      <div className="store-settings-header">
        <div className="store-settings-header-icon">
          <Building2 size={22} />
        </div>
        <div className="store-settings-header-text">
          <h3>Locales y sucursales</h3>
          <p>Elegí un local en el mapa o en la lista para ver sus cajas, ubicarlo o eliminarlo.</p>
        </div>
      </div>

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
    </div>
  );
}
