import { AlertTriangle, Check, RotateCcw, Building2, Monitor, Pencil, Plus, Trash2 } from 'lucide-react';
import { retail } from '../api';
import type { RegistersSettingsState } from './useRegistersSettings';

/** Cajas: lista, alta y edición. */
export function RegistersList({ state }: { state: RegistersSettingsState }) {
  const {
    storeId, branches, run, busy, branchId, editingRegisterId, setEditingRegisterId, deletingRegisterId,
    setDeletingRegisterId, scoped, activeRegisters, addBranches,
  } = state;
  return (
    <>
      <div className={scoped ? 'branch-modal-registers-body' : 'location-card-body'}>
        {/* Lista de cajas */}
        <div className="location-items-list">
          {activeRegisters.map((r) => {
            const branch = branches.find((b) => b.id === r.branch_id);
            const isEditing = editingRegisterId === r.id;
            const isDeleting = deletingRegisterId === r.id;

            if (isEditing) {
              return (
                <form
                  key={r.id}
                  className="location-inline-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const newName = String(f.get('name')).trim();
                    const newBranch = String(f.get('branch_id') || '');
                    if (!newName) return;
                    const success = await run(
                      () => retail.saveRegister(storeId, r.id, newName, newBranch || null),
                      'Caja actualizada',
                    );
                    if (success) setEditingRegisterId(null);
                  }}
                >
                  <div className="store-field-group">
                    <label className="store-field-label" htmlFor={`register-name-${r.id}`}>
                      Nombre de la caja
                    </label>
                    <input
                      id={`register-name-${r.id}`}
                      name="name"
                      required
                      maxLength={80}
                      defaultValue={r.name}
                      className="store-text-input"
                      autoFocus
                    />
                  </div>
                  {branches.length > 0 && (
                    <div className="store-field-group">
                      <label className="store-field-label" htmlFor={`register-branch-${r.id}`}>
                        Sucursal asignada
                      </label>
                      <select
                        id={`register-branch-${r.id}`}
                        name="branch_id"
                        defaultValue={r.branch_id || ''}
                        className="store-text-input"
                      >
                        <option value="">Sin sucursal asignada</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="location-edit-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => setEditingRegisterId(null)}
                    >
                      <RotateCcw size={14} /> Cancelar
                    </button>
                    <button className="primary-button" disabled={busy}>
                      <Check size={15} /> Guardar cambios
                    </button>
                  </div>
                </form>
              );
            }

            if (isDeleting) {
              return (
                <div key={r.id} className="location-confirm-box">
                  <span>
                    ¿Desactivar la caja <strong>"{r.name}"</strong>? (No borra el historial de turnos).
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busy}
                      onClick={async () => {
                        await run(
                          () => retail.deleteRegister(storeId, r.id),
                          `Caja "${r.name}" eliminada`,
                        );
                        setDeletingRegisterId(null);
                      }}
                    >
                      Sí, desactivar
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => setDeletingRegisterId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={r.id} className="location-item-row">
                <div className="location-item-left">
                  <div className="location-item-icon">
                    <Monitor size={18} />
                  </div>
                  <div className="location-item-info">
                    <strong className="location-item-name">{r.name}</strong>
                    <div className="location-item-meta">
                      {!branchId && (
                        <span className="location-pill-badge">
                          <Building2 size={11} /> {branch?.name || 'Sin sucursal'}
                        </span>
                      )}
                      <span className="location-pill-badge active">Activa</span>
                    </div>
                  </div>
                </div>
                <div className="location-item-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      setEditingRegisterId(r.id);
                      setDeletingRegisterId(null);
                    }}
                    title={`Editar ${r.name}`}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    type="button"
                    className="danger-button-outline"
                    disabled={busy}
                    onClick={() => {
                      setDeletingRegisterId(r.id);
                      setEditingRegisterId(null);
                    }}
                    title={`Eliminar ${r.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {!activeRegisters.length && branches.length > 0 && (
            <div className="location-empty-notice">
              <Monitor size={24} />
              <p>{branchId ? 'Este local todavía no tiene cajas. Agregá la primera para comenzar a vender.' : 'No tenés cajas registradas en este comercio. Creá la primera caja para comenzar a vender.'}</p>
            </div>
          )}

          {!branches.length && !scoped && (
            <div className="location-empty-notice warning">
              <AlertTriangle size={24} />
              <p>Agregá primero una sucursal en el panel de la izquierda para poder habilitar cajas.</p>
            </div>
          )}
        </div>

        {/* Sección Agregar Caja */}
        {addBranches.length > 0 && branchId !== null && (
          <div className="location-add-section">
            <div className="location-add-header">
              <div className="location-add-title">
                <Plus size={16} />
                <span>Nueva caja de cobro</span>
              </div>
            </div>

            <form
              className="location-add-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const formEl = e.currentTarget;
                const name = String(f.get('name')).trim();
                const branch = String(f.get('branch'));
                if (!name || !branch) return;
                const success = await run(
                  () => retail.addRegister(storeId, name, branch),
                  'Caja agregada',
                );
                if (success) formEl.reset();
              }}
            >
              <div className="store-fields-2col">
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-register-name">
                    Nombre de la caja
                  </label>
                  <input
                    id="new-register-name"
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Ej. Mostrador 2"
                    className="store-text-input"
                  />
                </div>

                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-register-branch">
                    Sucursal asignada
                  </label>
                  {addBranches.length === 1 ? (
                    <div className="location-single-branch-info">
                      <span>{addBranches[0].name}</span>
                      <input type="hidden" name="branch" value={addBranches[0].id} />
                    </div>
                  ) : (
                    <select
                      id="new-register-branch"
                      name="branch"
                      required
                      className="store-select-input"
                      defaultValue={addBranches[0]?.id}
                    >
                      {addBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="location-add-footer">
                <button className="primary-button" disabled={busy || !addBranches.length}>
                  <Plus size={16} /> Agregar caja
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
