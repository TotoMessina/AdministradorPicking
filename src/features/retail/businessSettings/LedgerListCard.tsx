import { Pencil, Plus, Check, RotateCcw, Receipt, Star, Sparkles, Info } from 'lucide-react';
import { retail } from '../api';
import type { LedgerSettingsState } from './useLedgerSettings';

/** Registros de ventas: lista, alta y edición. */
export function LedgerListCard({ state }: { state: LedgerSettingsState }) {
  const {
    storeId, ledgers, run, busy, editingId, setEditingId, isAdding, setIsAdding, hasGeneral, hasPruebas,
    activeCount, defaultLedger, getAssignedMethodsCount,
  } = state;
  return (
    <>
      {/* Tarjeta 1: Registros de ventas */}
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div className="store-settings-header-icon icon-ledgers">
            <Receipt size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Registros de ventas</h3>
            <p>Sirven para separar tus ventas en grupos, por ejemplo «Mostrador» y «Delivery», o «Kiosco» y «Librería». Antes de cobrar elegís en cuál va; todas suman al total y descuentan stock.</p>
          </div>
        </div>

        <div className="location-card-body">
          {/* Badges de estado general */}
          <div className="team-summary-badges">
            <span className="location-pill-badge active">
              {activeCount} {activeCount === 1 ? 'registro activo' : 'registros activos'}
            </span>
            {defaultLedger && (
              <span className="location-pill-badge active">
                <Star size={11} /> Principal: {defaultLedger.name}
              </span>
            )}
          </div>

          {/* Banner si faltan los registros estándar */}
          {(!hasGeneral || !hasPruebas) && (
            <div className="ledger-prepare-banner">
              <div className="ledger-prepare-text">
                <div className="ledger-prepare-title">
                  <Sparkles size={16} />
                  <strong>Registros estándar recomendados</strong>
                </div>
                <p>Configurá General como principal y Pruebas para ventas reales de prueba con un clic.</p>
              </div>
              <button
                type="button"
                className="secondary-button ledger-prepare-btn"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => retail.prepareSalesLedgers(storeId),
                    'Registros preparados. General es el principal.'
                  )
                }
              >
                Preparar General y Pruebas
              </button>
            </div>
          )}

          {/* Nota informativa */}
          <div className="ledger-info-box">
            <Info size={15} />
            <span>
              <strong>General</strong> y <strong>Pruebas</strong> registran ventas reales: ambos descuentan stock y afectan caja. Pruebas no es un entorno de simulación.
            </span>
          </div>

          {/* Lista de registros */}
          <div className="location-items-list">
            {ledgers.map((l) => {
              const isEditing = editingId === l.id;
              if (isEditing) {
                return (
                  <form
                    key={l.id}
                    className="location-inline-edit"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const success = await run(
                        () => retail.saveLedger(storeId, String(f.get('name')), l.id, l.active),
                        'Registro actualizado'
                      );
                      if (success) setEditingId(null);
                    }}
                  >
                    <div className="store-field-group">
                      <label className="store-field-label" htmlFor={`ledger-name-${l.id}`}>
                        Nombre del registro
                      </label>
                      <input
                        id={`ledger-name-${l.id}`}
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={l.name}
                        placeholder="Ej. Ventas mayoristas"
                        className="store-text-input"
                      />
                    </div>
                    <div className="location-edit-actions">
                      {!l.is_default && (
                        <button
                          type="button"
                          className="text-button text-button-danger"
                          disabled={busy}
                          onClick={async () => {
                            const ok = await run(
                              () => retail.saveLedger(storeId, l.name, l.id, !l.active),
                              l.active ? 'Registro desactivado' : 'Registro reactivado'
                            );
                            if (ok) setEditingId(null);
                          }}
                        >
                          {l.active ? 'Desactivar registro' : 'Reactivar registro'}
                        </button>
                      )}
                      <div className="location-edit-actions-right">
                        <button
                          type="button"
                          className="text-button"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                        >
                          <RotateCcw size={14} /> Cancelar
                        </button>
                        <button className="primary-button" disabled={busy}>
                          <Check size={15} /> Guardar
                        </button>
                      </div>
                    </div>
                  </form>
                );
              }

              const assignedCount = getAssignedMethodsCount(l.id);
              return (
                <div key={l.id} className="location-item-row">
                  <div className="location-item-left">
                    <div className="location-item-icon icon-ledger">
                      <Receipt size={18} />
                    </div>
                    <div className="location-item-info">
                      <strong className="location-item-name">{l.name}</strong>
                      <div className="location-item-meta">
                        {l.is_default && (
                          <span className="location-pill-badge active">
                            <Star size={11} /> Principal
                          </span>
                        )}
                        <span className={`location-pill-badge ${l.active ? 'active' : ''}`}>
                          {l.active ? 'Activo' : 'Inactivo'}
                        </span>
                        {assignedCount > 0 && (
                          <span className="location-pill-badge">
                            {assignedCount} {assignedCount === 1 ? 'medio asignado' : 'medios asignados'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="location-item-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(l.id);
                        setIsAdding(false);
                      }}
                      title={`Editar ${l.name}`}
                    >
                      <Pencil size={13} /> Editar
                    </button>
                  </div>
                </div>
              );
            })}

            {!ledgers.length && (
              <div className="location-empty-notice">
                <Receipt size={24} />
                <p>No tenés registros de ventas configurados. Creá uno nuevo o prepará los registros estándar.</p>
              </div>
            )}
          </div>

          {/* Sección Agregar Registro */}
          <div className="location-add-section">
            <div className="location-add-header">
              <div className="location-add-title">
                <Plus size={16} />
                <span>Nuevo registro</span>
              </div>
              {ledgers.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setIsAdding((v) => !v)}
                >
                  {isAdding ? 'Cerrar' : '+ Agregar'}
                </button>
              )}
            </div>

            {isAdding && (
              <form
                className="location-add-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  const name = String(f.get('name') || '').trim();
                  if (!name) return;
                  const ok = await run(
                    () => retail.saveLedger(storeId, name),
                    'Registro de ventas agregado'
                  );
                  if (ok) {
                    form.reset();
                    setIsAdding(false);
                  }
                }}
              >
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-ledger-name">
                    Nombre del registro
                  </label>
                  <div className="location-add-row">
                    <input
                      id="new-ledger-name"
                      name="name"
                      required
                      maxLength={80}
                      placeholder="Ej. Ventas mayoristas, Eventos"
                      className="store-text-input"
                    />
                    <button className="primary-button" disabled={busy}>
                      <Plus size={15} /> Crear registro
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
